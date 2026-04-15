/**
 * useOfflineSync — automatic sync of offline orders when connection returns.
 *
 * Replicates the core of handleSubmit (pedidos + pedidos_detalles INSERT)
 * for each queued PedidoPendiente. Background tasks (PDFs, emails) are
 * skipped during sync — they can be triggered later from the admin panel.
 */

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useOnlineStatus } from "./useOnlineStatus";
import {
  contarPedidosPendientes,
  obtenerPedidosPendientes,
  eliminarPedidoPendiente,
  guardarPedidoPendiente,
  type PedidoPendiente,
} from "@/lib/offlineQueue";
import { redondear } from "@/lib/calculos";

async function syncPedidoToSupabase(pedido: PedidoPendiente): Promise<void> {
  const folio = `PED-V-${Date.now().toString().slice(-6)}`;

  // Resolve vendedor_id: use stored value, fall back to current session
  let vendedorId = pedido.vendedor_id;
  if (!vendedorId) {
    const { data: { session } } = await supabase.auth.getSession();
    vendedorId = session?.user?.id || "";
  }
  if (!vendedorId) throw new Error("No se pudo resolver vendedor_id para sync");

  console.log("[OfflineSync] Syncing pedido:", pedido.id, pedido.cliente_nombre, "vendedor:", vendedorId);

  const { data: inserted, error: pedidoError } = await supabase
    .from("pedidos")
    .insert({
      folio,
      cliente_id: pedido.cliente_id,
      vendedor_id: vendedorId,
      sucursal_id: pedido.sucursal_id || null,
      fecha_pedido: pedido.created_at,
      fecha_entrega_estimada: null,
      subtotal: pedido.totales.subtotal,
      impuestos: redondear(pedido.totales.iva + pedido.totales.ieps),
      total: pedido.totales.total,
      peso_total_kg: pedido.totales.peso_total,
      status: "pendiente",
      notas: pedido.notas || null,
      notas_entrega: pedido.notas_entrega || null,
      es_directo: pedido.es_directo,
      termino_credito: pedido.termino_credito as any,
      requiere_factura: pedido.requiere_factura,
    } as any)
    .select("id")
    .single();

  if (pedidoError) {
    console.error("[OfflineSync] pedidos INSERT failed:", pedidoError);
    throw pedidoError;
  }

  console.log("[OfflineSync] pedido inserted:", inserted.id);

  const { error: detallesError } = await supabase
    .from("pedidos_detalles")
    .insert(
      pedido.lineas.map((l) => ({
        pedido_id: inserted.id,
        producto_id: l.producto_id,
        cantidad: l.cantidad,
        precio_unitario: l.precio_unitario,
        subtotal: l.subtotal,
      }))
    );

  if (detallesError) {
    console.error("[OfflineSync] pedidos_detalles INSERT failed:", detallesError);
    throw detallesError;
  }

  console.log("[OfflineSync] Synced OK:", pedido.id, "→", folio);

  // Fire-and-forget notification
  try {
    await supabase.from("notificaciones").insert({
      tipo: "nuevo_pedido_vendedor",
      titulo: `Pedido ${folio} (offline sync)`,
      descripcion: `Pedido para ${pedido.cliente_nombre} sincronizado desde cola offline`,
      leida: false,
    });
  } catch { /* non-critical */ }
}

export function useOfflineSync() {
  const isOnline = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refreshCount = useCallback(async () => {
    const n = await contarPedidosPendientes().catch(() => 0);
    setPendingCount(n);
  }, []);

  const syncPendientes = useCallback(async () => {
    setSyncing(true);
    let syncedCount = 0;

    try {
      const pendientes = await obtenerPedidosPendientes();
      console.log("[OfflineSync] Starting sync, pendientes:", pendientes.length);

      for (const pedido of pendientes) {
        try {
          await syncPedidoToSupabase(pedido);
          await eliminarPedidoPendiente(pedido.id);
          syncedCount++;
        } catch (e: any) {
          pedido.intentos_sync++;
          pedido.ultimo_error = e?.message || "Error desconocido";
          await guardarPedidoPendiente(pedido).catch(() => {});
          console.error("Sync failed for pedido:", pedido.id, e);
        }
      }
    } catch (e) {
      console.error("Error reading offline queue:", e);
    }

    await refreshCount();
    setSyncing(false);

    if (syncedCount > 0) {
      toast.success(
        `${syncedCount} pedido${syncedCount > 1 ? "s" : ""} sincronizado${syncedCount > 1 ? "s" : ""} ✓`
      );
    }
  }, [refreshCount]);

  // Count on mount + poll every 3s when online
  useEffect(() => {
    refreshCount();
    if (isOnline) {
      const interval = setInterval(refreshCount, 3000);
      return () => clearInterval(interval);
    }
  }, [isOnline, refreshCount]);

  // Sync when connection returns
  useEffect(() => {
    console.log("[OfflineSync] Status:", { isOnline, pendingCount, syncing });
    if (isOnline && pendingCount > 0 && !syncing) {
      syncPendientes();
    }
  }, [isOnline, pendingCount]);

  return { isOnline, pendingCount, syncing, syncPendientes, refreshCount };
}
