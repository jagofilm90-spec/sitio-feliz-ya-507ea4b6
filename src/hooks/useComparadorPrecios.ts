import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ProveedorScore, RatingValue } from "@/types/proveedor-v3";

export interface ComparadorRow {
  proveedor_id: string;
  proveedor_nombre: string;
  termino_pago: string | null;
  producto_nombre: string;
  precio_por_kilo: boolean;
  aplica_iva: boolean;
  aplica_ieps: boolean;
  costo_proveedor: number | null;
  ultimo_precio: number | null;
  ultimo_precio_fecha: string | null;
  score: ProveedorScore;
  saldo_total: number;
  saldo_vencido: number;
  isBestPrice: boolean;
}

const RATING_FALLBACK: ProveedorScore = {
  score: null,
  rating: "sin_historial" as RatingValue,
  total_ocs: 0,
  porcentaje_completas: null,
  peso_correcto: null,
  lead_time_promedio: null,
};

async function fetchComparador(productoId: string): Promise<ComparadorRow[]> {
  // Proveedores que tienen este producto asociado
  const { data: pps, error } = await supabase
    .from("proveedor_productos")
    .select(
      "proveedor_id, costo_proveedor, proveedores:proveedor_id(id, nombre, termino_pago, activo), productos:producto_id(nombre, precio_por_kilo, aplica_iva, aplica_ieps)"
    )
    .eq("producto_id", productoId);

  if (error) throw error;
  const valid = (pps || []).filter((r: any) => r.proveedores?.activo);
  if (valid.length === 0) return [];

  const proveedorIds = valid.map((r: any) => r.proveedor_id);

  // Últimas OCs (created_at) para todos los proveedores
  const { data: ocs } = await supabase
    .from("ordenes_compra")
    .select("id, proveedor_id, created_at, total, status_pago, fecha_pago_calculada")
    .in("proveedor_id", proveedorIds);

  const ocDateMap = new Map<string, string>();
  const ocProvMap = new Map<string, string>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const saldoTotalMap = new Map<string, number>();
  const saldoVencidoMap = new Map<string, number>();

  (ocs || []).forEach((o: any) => {
    ocDateMap.set(o.id, o.created_at);
    ocProvMap.set(o.id, o.proveedor_id);
    if (o.status_pago === "pendiente" || o.status_pago === "parcial") {
      saldoTotalMap.set(o.proveedor_id, (saldoTotalMap.get(o.proveedor_id) || 0) + Number(o.total || 0));
      if (o.fecha_pago_calculada && new Date(o.fecha_pago_calculada) < today) {
        saldoVencidoMap.set(o.proveedor_id, (saldoVencidoMap.get(o.proveedor_id) || 0) + Number(o.total || 0));
      }
    }
  });

  const ocIds = Array.from(ocDateMap.keys());
  const ultimoPrecioByProv = new Map<string, { precio: number; fecha: string }>();

  if (ocIds.length > 0) {
    const { data: dets } = await supabase
      .from("ordenes_compra_detalles")
      .select("orden_compra_id, producto_id, precio_unitario_compra")
      .in("orden_compra_id", ocIds)
      .eq("producto_id", productoId);

    (dets || []).forEach((d: any) => {
      const provId = ocProvMap.get(d.orden_compra_id);
      const fecha = ocDateMap.get(d.orden_compra_id);
      if (!provId || !fecha) return;
      const cur = ultimoPrecioByProv.get(provId);
      if (!cur || fecha > cur.fecha) {
        ultimoPrecioByProv.set(provId, { precio: Number(d.precio_unitario_compra || 0), fecha });
      }
    });
  }

  // Scores en paralelo
  const scores = await Promise.all(
    valid.map(async (r: any) => {
      try {
        const { data, error: e } = await supabase.rpc("get_proveedor_score" as any, {
          p_proveedor_id: r.proveedor_id,
        });
        if (e || !data) return RATING_FALLBACK;
        return data as unknown as ProveedorScore;
      } catch {
        return RATING_FALLBACK;
      }
    })
  );

  const rows: ComparadorRow[] = valid.map((r: any, i: number) => {
    const last = ultimoPrecioByProv.get(r.proveedor_id);
    return {
      proveedor_id: r.proveedor_id,
      proveedor_nombre: r.proveedores?.nombre || "—",
      termino_pago: r.proveedores?.termino_pago ?? null,
      producto_nombre: r.productos?.nombre || "—",
      precio_por_kilo: !!r.productos?.precio_por_kilo,
      aplica_iva: !!r.productos?.aplica_iva,
      aplica_ieps: !!r.productos?.aplica_ieps,
      costo_proveedor: r.costo_proveedor !== null ? Number(r.costo_proveedor) : null,
      ultimo_precio: last?.precio ?? null,
      ultimo_precio_fecha: last?.fecha ?? null,
      score: scores[i] || RATING_FALLBACK,
      saldo_total: saldoTotalMap.get(r.proveedor_id) || 0,
      saldo_vencido: saldoVencidoMap.get(r.proveedor_id) || 0,
      isBestPrice: false,
    };
  });

  // Ordenar por último precio ASC, NULLS LAST
  rows.sort((a, b) => {
    if (a.ultimo_precio === null && b.ultimo_precio === null) return 0;
    if (a.ultimo_precio === null) return 1;
    if (b.ultimo_precio === null) return -1;
    return a.ultimo_precio - b.ultimo_precio;
  });

  // Marcar mejor precio (primer item con precio)
  const firstWithPrice = rows.find((r) => r.ultimo_precio !== null);
  if (firstWithPrice) firstWithPrice.isBestPrice = true;

  return rows;
}

export function useComparadorPrecios(productoId: string | null) {
  return useQuery({
    queryKey: ["comparador-precios", productoId],
    queryFn: () => fetchComparador(productoId as string),
    enabled: !!productoId,
    staleTime: 30_000,
  });
}

// ============================================================
// Selector: productos con 2+ proveedores
// ============================================================
export interface ProductoMultiProveedor {
  id: string;
  nombre: string;
  precio_por_kilo: boolean;
  proveedores_count: number;
}

async function fetchProductosMultiV2(): Promise<ProductoMultiProveedor[]> {
  const { data, error } = await supabase
    .from("proveedor_productos")
    .select("producto_id, proveedor_id, productos:producto_id(id, nombre, precio_por_kilo, activo)");
  if (error) throw error;

  const map = new Map<string, { provs: Set<string>; nombre: string; ppk: boolean; activo: boolean }>();
  (data || []).forEach((r: any) => {
    if (!r.productos) return;
    const cur = map.get(r.producto_id) || {
      provs: new Set<string>(),
      nombre: r.productos.nombre,
      ppk: !!r.productos.precio_por_kilo,
      activo: !!r.productos.activo,
    };
    cur.provs.add(r.proveedor_id);
    map.set(r.producto_id, cur);
  });

  const result: ProductoMultiProveedor[] = [];
  map.forEach((v, id) => {
    if (v.activo && v.provs.size >= 2) {
      result.push({ id, nombre: v.nombre, precio_por_kilo: v.ppk, proveedores_count: v.provs.size });
    }
  });
  result.sort((a, b) => a.nombre.localeCompare(b.nombre));
  return result;
}

export function useProductosMultiProveedor(enabled: boolean) {
  return useQuery({
    queryKey: ["productos-multi-proveedor"],
    queryFn: fetchProductosMultiV2,
    enabled,
    staleTime: 60_000,
  });
}
