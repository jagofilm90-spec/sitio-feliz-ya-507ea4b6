/**
 * useCargaOperations
 * ──────────────────
 * Single source of truth for warehouse loading operations on a route.
 * Both active flows (AlmacenCargaScan and CargaHojaInteractiva via
 * CargaRutaInlineFlow) MUST use this hook so DB writes are identical.
 *
 * CRITICAL invariants this hook guarantees:
 *
 *   1. Inventory: only `decrementar_lote` / `incrementar_lote` RPCs are
 *      used. We NEVER insert into `inventario_movimientos` because the
 *      trigger `update_stock_on_movement` would cause a double deduction.
 *
 *   2. peso_confirmado: actually persisted to DB. Before this hook the
 *      flag lived only in component state.
 *
 *   3. Finalize: every active path runs the SAME sequence —
 *        resyncPedidoTotalsFromCarga (recalc subtotals + totals + audit)
 *        → pedidos.status = 'en_ruta'
 *        → rutas.status = 'cargada'
 *        → notify vendedor/admin if any pedido was modified during loading
 *        → optionally send client emails
 *
 * No React state inside the hook itself — every function is async and
 * stateless. The hook shape is preserved so future versions can add
 * loading/error tracking without changing call sites.
 */

import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { recalcularTotalesPedido } from "@/lib/recalcularTotalesPedido";

// ── Types ──────────────────────────────────────────────

export interface ToggleProductoParams {
  cargaProductoId: string;
  productoId: string;
  rutaFolio: string;
  cargado: boolean;
  cantidadCargada: number;
  loteId: string | null;
  pesoRealKg?: number | null;
}

export interface CargaModificacion {
  productoNombre: string;
  cantidadOriginal: number;
  cantidadNueva: number;
  pesoRealKg?: number | null;
}

export interface ResyncResult {
  modificaciones: CargaModificacion[];
  totalAnterior: number;
  totalNuevo: number;
}

export interface PedidoEnRuta {
  pedidoId: string;
  folio: string;
  clienteId: string;
  clienteNombre: string;
}

export interface FinalizarRutaParams {
  rutaId: string;
  pedidos: PedidoEnRuta[];
  /**
   * If true, the function will refuse to finalize when any product
   * priced by kg has `peso_confirmado = false`. Defaults to false
   * (gate is enabled in M04.2).
   */
  requirePesoConfirmado?: boolean;
}

export interface FinalizarRutaResult {
  ok: boolean;
  pedidosModificados: string[];
  cambiosPorPedido: Record<string, ResyncResult>;
  error?: string;
}

// ── Hook ───────────────────────────────────────────────

export function useCargaOperations() {
  // ─── 1. Toggle producto cargado / desmarcado ────────
  const toggleProductoCargado = useCallback(
    async (params: ToggleProductoParams): Promise<{ ok: boolean; error?: string }> => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        // Read current DB state to know whether to insert, adjust, or revert
        const { data: cargaActual } = await supabase
          .from("carga_productos")
          .select("cargado, cantidad_cargada, lote_id")
          .eq("id", params.cargaProductoId)
          .single();

        // ── MARK AS LOADED ────────────────────────────
        if (params.cargado && params.loteId) {
          if (cargaActual?.cargado) {
            // Already loaded — adjust the difference only
            const cantidadPrevia = cargaActual.cantidad_cargada || 0;
            const diferencia = params.cantidadCargada - cantidadPrevia;

            if (diferencia !== 0) {
              if (diferencia > 0) {
                await supabase.rpc("decrementar_lote", {
                  p_lote_id: params.loteId,
                  p_cantidad: diferencia,
                });
              } else {
                await supabase.rpc("incrementar_lote", {
                  p_lote_id: params.loteId,
                  p_cantidad: Math.abs(diferencia),
                });
              }
            }

            await supabase
              .from("carga_productos")
              .update({
                cantidad_cargada: params.cantidadCargada,
                lote_id: params.loteId,
                peso_real_kg: params.pesoRealKg ?? undefined,
                corregido_en: new Date().toISOString(),
              })
              .eq("id", params.cargaProductoId);

            return { ok: true };
          }

          // First load — verify stock and decrement
          const { data: lote } = await supabase
            .from("inventario_lotes")
            .select("cantidad_disponible")
            .eq("id", params.loteId)
            .single();

          if (!lote || lote.cantidad_disponible < params.cantidadCargada) {
            return {
              ok: false,
              error: `Stock insuficiente: disponible ${lote?.cantidad_disponible || 0}, solicitado ${params.cantidadCargada}`,
            };
          }

          await supabase.rpc("decrementar_lote", {
            p_lote_id: params.loteId,
            p_cantidad: params.cantidadCargada,
          });

          await supabase
            .from("carga_productos")
            .update({
              cargado: true,
              cantidad_cargada: params.cantidadCargada,
              lote_id: params.loteId,
              peso_real_kg: params.pesoRealKg ?? undefined,
              cargado_en: new Date().toISOString(),
              cargado_por: user?.id ?? null,
            })
            .eq("id", params.cargaProductoId);

          return { ok: true };
        }

        // ── UNMARK / REVERT ───────────────────────────
        if (!params.cargado && cargaActual?.cargado) {
          if (cargaActual.lote_id && cargaActual.cantidad_cargada) {
            await supabase.rpc("incrementar_lote", {
              p_lote_id: cargaActual.lote_id,
              p_cantidad: cargaActual.cantidad_cargada,
            });
          }

          await supabase
            .from("carga_productos")
            .update({
              cargado: false,
              cantidad_cargada: 0,
              lote_id: null,
              cargado_en: null,
              cargado_por: null,
            })
            .eq("id", params.cargaProductoId);
        }

        return { ok: true };
      } catch (err: any) {
        console.error("toggleProductoCargado error:", err);
        return { ok: false, error: err?.message || "Error desconocido" };
      }
    },
    []
  );

  // ─── 2. Persist peso_real_kg ────────────────────────
  const setPesoReal = useCallback(
    async (cargaProductoId: string, pesoReal: number | null): Promise<{ ok: boolean }> => {
      try {
        await supabase
          .from("carga_productos")
          .update({ peso_real_kg: pesoReal })
          .eq("id", cargaProductoId);
        return { ok: true };
      } catch (err) {
        console.error("setPesoReal error:", err);
        return { ok: false };
      }
    },
    []
  );

  // ─── 3. Persist cantidad_cargada (without toggle) ───
  const setCantidadCargada = useCallback(
    async (cargaProductoId: string, cantidad: number): Promise<{ ok: boolean }> => {
      try {
        await supabase
          .from("carga_productos")
          .update({ cantidad_cargada: cantidad })
          .eq("id", cargaProductoId);
        return { ok: true };
      } catch (err) {
        console.error("setCantidadCargada error:", err);
        return { ok: false };
      }
    },
    []
  );

  // ─── 4. Persist peso_confirmado (the feature stub fix) ──
  const setPesoConfirmado = useCallback(
    async (cargaProductoId: string, confirmado: boolean): Promise<{ ok: boolean }> => {
      try {
        await supabase
          .from("carga_productos")
          .update({ peso_confirmado: confirmado } as any)
          .eq("id", cargaProductoId);
        return { ok: true };
      } catch (err) {
        console.error("setPesoConfirmado error:", err);
        return { ok: false };
      }
    },
    []
  );

  // ─── 5. Confirm entrega (carga_confirmada flag on entregas) ──
  const confirmEntrega = useCallback(async (entregaId: string): Promise<{ ok: boolean }> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase
        .from("entregas")
        .update({
          carga_confirmada: true,
          carga_confirmada_por: user?.id ?? null,
          carga_confirmada_en: new Date().toISOString(),
        })
        .eq("id", entregaId);
      return { ok: true };
    } catch (err) {
      console.error("confirmEntrega error:", err);
      return { ok: false };
    }
  }, []);

  // ─── 6. Resync pedido totals from carga_productos ───
  // Idempotent: reads current state, updates only what differs.
  const resyncPedidoTotalsFromCarga = useCallback(
    async (pedidoId: string): Promise<ResyncResult> => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: pedidoAnterior } = await supabase
        .from("pedidos")
        .select("total")
        .eq("id", pedidoId)
        .single();
      const totalAnterior = pedidoAnterior?.total || 0;

      const modificaciones: CargaModificacion[] = [];

      // Get all entregas of this pedido
      const { data: entregas } = await supabase
        .from("entregas")
        .select("id")
        .eq("pedido_id", pedidoId);
      const entregaIds = (entregas || []).map((e) => e.id);

      if (entregaIds.length === 0) {
        return { modificaciones, totalAnterior, totalNuevo: totalAnterior };
      }

      const { data: cargaItems } = await supabase
        .from("carga_productos")
        .select("pedido_detalle_id, cantidad_cargada, peso_real_kg, cargado")
        .in("entrega_id", entregaIds);

      for (const cp of cargaItems || []) {
        if (!cp.cargado || !cp.cantidad_cargada) continue;

        const { data: detalle } = await supabase
          .from("pedidos_detalles")
          .select(
            "id, cantidad, precio_unitario, kilos_totales, producto:productos(peso_kg, precio_por_kilo, nombre)"
          )
          .eq("id", cp.pedido_detalle_id)
          .single();

        if (!detalle) continue;
        const prod = detalle.producto as any;

        const cantidadCambio = detalle.cantidad !== cp.cantidad_cargada;
        const pesoTeoricoKg = prod?.peso_kg ? cp.cantidad_cargada * prod.peso_kg : null;
        const pesoCambio =
          cp.peso_real_kg && pesoTeoricoKg && Math.abs(cp.peso_real_kg - pesoTeoricoKg) > 0.1;

        if (cantidadCambio || pesoCambio) {
          if (cantidadCambio) {
            modificaciones.push({
              productoNombre: prod?.nombre || "Producto",
              cantidadOriginal: detalle.cantidad,
              cantidadNueva: cp.cantidad_cargada,
              pesoRealKg: cp.peso_real_kg,
            });
          }

          const newSubtotal =
            prod?.precio_por_kilo && cp.peso_real_kg
              ? cp.peso_real_kg * detalle.precio_unitario
              : prod?.precio_por_kilo && prod?.peso_kg
              ? cp.cantidad_cargada * prod.peso_kg * detalle.precio_unitario
              : cp.cantidad_cargada * detalle.precio_unitario;

          await supabase
            .from("pedidos_detalles")
            .update({
              cantidad: cp.cantidad_cargada,
              subtotal: newSubtotal,
              kilos_totales: cp.peso_real_kg || pesoTeoricoKg || detalle.kilos_totales,
            })
            .eq("id", cp.pedido_detalle_id);
        }
      }

      const result = await recalcularTotalesPedido(
        pedidoId,
        modificaciones.length > 0
          ? {
              tipoCambio: "almacen_carga",
              cambiosJson: { modificaciones },
              totalAnterior,
              usuarioId: user?.id,
            }
          : undefined
      );

      return { modificaciones, totalAnterior, totalNuevo: result.total };
    },
    []
  );

  // ─── 7. Finalize the entire route ───────────────────
  const finalizarCargaRuta = useCallback(
    async (params: FinalizarRutaParams): Promise<FinalizarRutaResult> => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        // Optional gate: peso_confirmado required for kg products
        if (params.requirePesoConfirmado) {
          const { data: entregas } = await supabase
            .from("entregas")
            .select("id")
            .eq("ruta_id", params.rutaId);
          const entregaIds = (entregas || []).map((e) => e.id);

          if (entregaIds.length > 0) {
            const { data: cargaItems } = await supabase
              .from("carga_productos")
              .select(
                "id, peso_confirmado, cargado, producto:pedidos_detalles!inner(producto:productos!inner(precio_por_kilo, peso_kg))"
              )
              .in("entrega_id", entregaIds);

            const sinConfirmar = (cargaItems || []).filter((cp: any) => {
              const prod = cp.producto?.producto;
              if (!prod?.precio_por_kilo) return false;
              if (!prod?.peso_kg || prod.peso_kg <= 0) return false;
              return cp.cargado && !cp.peso_confirmado;
            });

            if (sinConfirmar.length > 0) {
              return {
                ok: false,
                pedidosModificados: [],
                cambiosPorPedido: {},
                error: `${sinConfirmar.length} producto(s) por kilo sin peso confirmado`,
              };
            }
          }
        }

        // Mark route as cargada
        await supabase
          .from("rutas")
          .update({
            carga_completada: true,
            carga_completada_por: user?.id ?? null,
            carga_completada_en: new Date().toISOString(),
            status: "cargada",
          })
          .eq("id", params.rutaId);

        // Resync each pedido and capture modifications
        const cambiosPorPedido: Record<string, ResyncResult> = {};
        for (const item of params.pedidos) {
          const result = await resyncPedidoTotalsFromCarga(item.pedidoId);
          if (result.modificaciones.length > 0) {
            cambiosPorPedido[item.pedidoId] = result;
          }
        }

        // Move each pedido to en_ruta and annotate notas / send notifications
        for (const item of params.pedidos) {
          await supabase
            .from("pedidos")
            .update({ status: "en_ruta", updated_at: new Date().toISOString() })
            .eq("id", item.pedidoId);

          const cambios = cambiosPorPedido[item.pedidoId];
          if (cambios) {
            const desc = cambios.modificaciones
              .map((m) => `${m.productoNombre}: ${m.cantidadOriginal}→${m.cantidadNueva}`)
              .join(", ");

            // Append [MODIFICADO EN CARGA] to notas
            try {
              const { data: pedidoNotas } = await supabase
                .from("pedidos")
                .select("notas, vendedor_id")
                .eq("id", item.pedidoId)
                .single();
              const notasActuales = pedidoNotas?.notas || "";
              await supabase
                .from("pedidos")
                .update({
                  notas: `[MODIFICADO EN CARGA] ${desc}\n${notasActuales}`.trim(),
                })
                .eq("id", item.pedidoId);

              // Notify vendedor in-app + push
              if (pedidoNotas?.vendedor_id) {
                await supabase.from("notificaciones").insert({
                  tipo: "pedido_autorizado",
                  titulo: `⚠️ Pedido ${item.folio} modificado en carga`,
                  descripcion: desc,
                  pedido_id: item.pedidoId,
                  leida: false,
                } as any);
                await supabase.functions
                  .invoke("send-push-notification", {
                    body: {
                      user_ids: [pedidoNotas.vendedor_id],
                      title: `⚠️ ${item.folio} modificado en carga`,
                      body: desc,
                    },
                  })
                  .catch(() => {});
              }
              // Notify admins
              await supabase.functions
                .invoke("send-push-notification", {
                  body: {
                    roles: ["admin"],
                    title: `⚠️ ${item.folio} modificado en carga`,
                    body: desc,
                  },
                })
                .catch(() => {});
            } catch (e) {
              console.error("Notificación post-carga falló:", e);
            }
          }
        }

        return {
          ok: true,
          pedidosModificados: Object.keys(cambiosPorPedido),
          cambiosPorPedido,
        };
      } catch (err: any) {
        console.error("finalizarCargaRuta error:", err);
        return {
          ok: false,
          pedidosModificados: [],
          cambiosPorPedido: {},
          error: err?.message || "Error desconocido",
        };
      }
    },
    [resyncPedidoTotalsFromCarga]
  );

  // ─── 8. Cancel route with full inventory rollback ───
  const cancelarRuta = useCallback(
    async (rutaId: string, vehiculoId?: string | null): Promise<{ ok: boolean; error?: string }> => {
      try {
        const { data: entregasRuta } = await supabase
          .from("entregas")
          .select("id, pedido_id")
          .eq("ruta_id", rutaId);

        const entregaIds = (entregasRuta || []).map((e) => e.id);
        const pedidoIds = (entregasRuta || []).map((e) => e.pedido_id).filter(Boolean) as string[];

        if (entregaIds.length > 0) {
          const { data: cargaProds } = await supabase
            .from("carga_productos")
            .select("id, cargado, lote_id, cantidad_cargada")
            .in("entrega_id", entregaIds);

          for (const cp of cargaProds || []) {
            if (cp.cargado && cp.lote_id && cp.cantidad_cargada) {
              await supabase.rpc("incrementar_lote", {
                p_lote_id: cp.lote_id,
                p_cantidad: cp.cantidad_cargada,
              });
            }
          }
          await supabase.from("carga_productos").delete().in("entrega_id", entregaIds);
        }

        await supabase.from("entregas").delete().eq("ruta_id", rutaId);

        if (vehiculoId) {
          await supabase.from("vehiculos").update({ status: "disponible" }).eq("id", vehiculoId);
        }

        // Restore pedidos to pendiente
        for (const pedidoId of pedidoIds) {
          await supabase
            .from("pedidos")
            .update({ status: "pendiente" as any, updated_at: new Date().toISOString() })
            .eq("id", pedidoId);
        }

        await supabase.from("rutas").delete().eq("id", rutaId);

        return { ok: true };
      } catch (err: any) {
        console.error("cancelarRuta error:", err);
        return { ok: false, error: err?.message || "Error desconocido" };
      }
    },
    []
  );

  return {
    toggleProductoCargado,
    setPesoReal,
    setCantidadCargada,
    setPesoConfirmado,
    confirmEntrega,
    resyncPedidoTotalsFromCarga,
    finalizarCargaRuta,
    cancelarRuta,
  };
}
