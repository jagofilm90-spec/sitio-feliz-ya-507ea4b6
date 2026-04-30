import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ProveedorScore } from "@/types/proveedor-v3";

export interface ProveedorDetalleRow {
  id: string;
  nombre: string;
  nombre_comercial: string | null;
  rfc: string | null;
  categoria: string | null;
  nombre_contacto: string | null;
  telefono: string | null;
  email: string | null;
  activo: boolean;
  created_at: string;
  notas_operativas: string | null;
  municipio: string | null;
  estado: string | null;
  termino_pago: string | null;
}

export interface KpisProveedor {
  compras_30d: number;
  trend_compras: number | null;
  saldo_total: number;
  saldo_vencido: number;
  score: ProveedorScore;
}

export interface ComprasMensuales {
  mes: string;
  total: number;
}

export interface OCResumen {
  id: string;
  folio: string;
  total: number;
  status: string;
  created_at: string;
  fecha_entrega_real: string | null;
  productos_count: number;
}

export interface PrecioPunto {
  mes: string;
  precio: number;
}

export interface ProveedorDetalleData {
  proveedor: ProveedorDetalleRow;
  kpis: KpisProveedor;
  comprasMensuales: ComprasMensuales[];
  ultimasOCs: OCResumen[];
  productosCount: number;
  ocsTotalCount: number;
  faltantesPendientesCount: number;
  productoPrincipal: { id: string; nombre: string } | null;
  precioEvolucion: PrecioPunto[];
  eventosCount: number;
}

async function fetchDetalle(proveedorId: string): Promise<ProveedorDetalleData> {
  // 1. Proveedor
  const { data: prov, error: provErr } = await supabase
    .from("proveedores")
    .select(
      "id, nombre, nombre_comercial, rfc, categoria, nombre_contacto, telefono, email, activo, created_at, notas_operativas, municipio, estado, termino_pago"
    )
    .eq("id", proveedorId)
    .maybeSingle();

  if (provErr) throw provErr;
  if (!prov) throw new Error("Proveedor no encontrado");

  // 2. KPIs RPC
  const { data: kpisRaw } = await supabase.rpc("get_proveedor_kpis" as any, {
    p_proveedor_id: proveedorId,
  });

  const kpis: KpisProveedor =
    (kpisRaw as any) || {
      compras_30d: 0,
      trend_compras: null,
      saldo_total: 0,
      saldo_vencido: 0,
      score: {
        score: null,
        rating: "sin_historial",
        total_ocs: 0,
        porcentaje_completas: null,
        peso_correcto: null,
        lead_time_promedio: null,
      },
    };

  // 3. Compras mensuales
  const { data: cmRaw } = await supabase.rpc("get_proveedor_compras_mensuales" as any, {
    p_proveedor_id: proveedorId,
  });
  const comprasMensuales: ComprasMensuales[] = Array.isArray(cmRaw) ? (cmRaw as any) : [];

  // 4. Últimas 5 OCs
  const { data: ocs } = await supabase
    .from("ordenes_compra")
    .select("id, folio, total, status, created_at, fecha_entrega_real")
    .eq("proveedor_id", proveedorId)
    .neq("status", "cancelada")
    .order("created_at", { ascending: false })
    .limit(5);

  // 5. Counts en paralelo
  const [
    { count: productosCount },
    { count: ocsTotalCount },
    { count: faltantesCount },
    { count: eventosCount },
  ] = await Promise.all([
    supabase
      .from("proveedor_productos")
      .select("*", { count: "exact", head: true })
      .eq("proveedor_id", proveedorId)
      .eq("activo", true),
    supabase
      .from("ordenes_compra")
      .select("*", { count: "exact", head: true })
      .eq("proveedor_id", proveedorId),
    supabase
      .from("faltantes_proveedor")
      .select("*", { count: "exact", head: true })
      .eq("proveedor_id", proveedorId)
      .eq("status", "pendiente"),
    supabase
      .from("eventos_proveedor" as any)
      .select("*", { count: "exact", head: true })
      .eq("proveedor_id", proveedorId),
  ]);

  // 6. Productos por OC para conteo de líneas y producto principal
  const ocIds = (ocs || []).map((o) => o.id);
  const productosPorOC = new Map<string, number>();
  if (ocIds.length > 0) {
    const { data: detalles } = await supabase
      .from("ordenes_compra_detalles")
      .select("orden_compra_id")
      .in("orden_compra_id", ocIds);
    (detalles || []).forEach((d: any) => {
      productosPorOC.set(d.orden_compra_id, (productosPorOC.get(d.orden_compra_id) || 0) + 1);
    });
  }

  // 7. Producto principal: el más frecuente en OCs del proveedor (últimos 6m)
  const sinceISO = new Date(Date.now() - 1000 * 60 * 60 * 24 * 180).toISOString();
  const { data: ocsHist } = await supabase
    .from("ordenes_compra")
    .select("id, created_at")
    .eq("proveedor_id", proveedorId)
    .gte("created_at", sinceISO);

  let productoPrincipal: { id: string; nombre: string } | null = null;
  let precioEvolucion: PrecioPunto[] = [];

  if (ocsHist && ocsHist.length > 0) {
    const histIds = ocsHist.map((o) => o.id);
    const { data: dets } = await supabase
      .from("ordenes_compra_detalles")
      .select("producto_id, precio_unitario_compra, orden_compra_id")
      .in("orden_compra_id", histIds);

    if (dets && dets.length > 0) {
      const freq = new Map<string, number>();
      dets.forEach((d: any) => {
        if (d.producto_id) freq.set(d.producto_id, (freq.get(d.producto_id) || 0) + 1);
      });
      let bestId: string | null = null;
      let bestN = 0;
      freq.forEach((n, id) => {
        if (n > bestN) {
          bestN = n;
          bestId = id;
        }
      });

      if (bestId) {
        const { data: prod } = await supabase
          .from("productos")
          .select("id, nombre")
          .eq("id", bestId)
          .maybeSingle();
        if (prod) productoPrincipal = { id: prod.id, nombre: prod.nombre };

        // Construir evolución por mes (último precio de cada mes)
        const ocDateMap = new Map<string, string>();
        ocsHist.forEach((o) => ocDateMap.set(o.id, o.created_at));
        const byMonth = new Map<string, { fecha: string; precio: number }>();
        dets
          .filter((d: any) => d.producto_id === bestId)
          .forEach((d: any) => {
            const fecha = ocDateMap.get(d.orden_compra_id);
            if (!fecha) return;
            const mes = fecha.slice(0, 7); // YYYY-MM
            const cur = byMonth.get(mes);
            if (!cur || fecha > cur.fecha) {
              byMonth.set(mes, { fecha, precio: Number(d.precio_unitario_compra || 0) });
            }
          });
        precioEvolucion = Array.from(byMonth.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([mes, v]) => ({
            mes: new Date(mes + "-01").toLocaleDateString("es-MX", {
              month: "short",
              year: "2-digit",
            }),
            precio: v.precio,
          }));
      }
    }
  }

  const ultimasOCs: OCResumen[] = (ocs || []).map((o) => ({
    id: o.id,
    folio: o.folio,
    total: Number(o.total || 0),
    status: o.status,
    created_at: o.created_at,
    fecha_entrega_real: o.fecha_entrega_real,
    productos_count: productosPorOC.get(o.id) || 0,
  }));

  return {
    proveedor: prov as ProveedorDetalleRow,
    kpis,
    comprasMensuales,
    ultimasOCs,
    productosCount: productosCount || 0,
    ocsTotalCount: ocsTotalCount || 0,
    faltantesPendientesCount: faltantesCount || 0,
    productoPrincipal,
    precioEvolucion,
    eventosCount: eventosCount || 0,
  };
}

export function useProveedorDetalle(proveedorId: string | undefined) {
  return useQuery({
    queryKey: ["proveedor-detalle", proveedorId],
    queryFn: () => fetchDetalle(proveedorId as string),
    enabled: !!proveedorId,
    staleTime: 60_000,
  });
}
