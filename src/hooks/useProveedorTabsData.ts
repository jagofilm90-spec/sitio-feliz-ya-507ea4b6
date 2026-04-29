import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ============================================================
// TAB PRODUCTOS
// ============================================================
export interface ProveedorProductoRow {
  id: string;
  producto_id: string;
  costo_proveedor: number | null;
  precio_por_kilo_compra: boolean | null;
  tipo_carga_default: string | null;
  // Producto
  nombre: string;
  peso_kg: number | null;
  precio_por_kilo: boolean | null;
  aplica_iva: boolean | null;
  aplica_ieps: boolean | null;
  // Computed
  ultimo_precio: number | null;
  ultimo_precio_fecha: string | null;
  avg_3m: number | null;
}

async function fetchProductos(proveedorId: string): Promise<ProveedorProductoRow[]> {
  const { data: pps, error } = await supabase
    .from("proveedor_productos")
    .select(
      "id, producto_id, costo_proveedor, precio_por_kilo_compra, tipo_carga_default, productos:producto_id(nombre, peso_kg, precio_por_kilo, aplica_iva, aplica_ieps)"
    )
    .eq("proveedor_id", proveedorId);
  if (error) throw error;

  if (!pps || pps.length === 0) return [];

  const productoIds = pps.map((pp: any) => pp.producto_id);

  // Get all OC details for these products from this proveedor
  const { data: ocs } = await supabase
    .from("ordenes_compra")
    .select("id, created_at")
    .eq("proveedor_id", proveedorId)
    .neq("status", "cancelada");

  const ocIds = (ocs || []).map((o) => o.id);
  const ocDateMap = new Map<string, string>();
  (ocs || []).forEach((o) => ocDateMap.set(o.id, o.created_at));

  const detallesMap = new Map<string, { precio: number; fecha: string }[]>();
  if (ocIds.length > 0) {
    const { data: dets } = await supabase
      .from("ordenes_compra_detalles")
      .select("producto_id, precio_unitario_compra, orden_compra_id")
      .in("orden_compra_id", ocIds)
      .in("producto_id", productoIds);
    (dets || []).forEach((d: any) => {
      const fecha = ocDateMap.get(d.orden_compra_id);
      if (!fecha) return;
      const arr = detallesMap.get(d.producto_id) || [];
      arr.push({ precio: Number(d.precio_unitario_compra || 0), fecha });
      detallesMap.set(d.producto_id, arr);
    });
  }

  const threeMonthsAgo = Date.now() - 1000 * 60 * 60 * 24 * 90;

  return (pps as any[])
    .map((pp) => {
      const arr = (detallesMap.get(pp.producto_id) || []).sort((a, b) =>
        b.fecha.localeCompare(a.fecha)
      );
      const ultimo = arr[0];
      const recent = arr.filter((d) => new Date(d.fecha).getTime() > threeMonthsAgo);
      const avg =
        recent.length > 0
          ? recent.reduce((s, x) => s + x.precio, 0) / recent.length
          : null;
      return {
        id: pp.id,
        producto_id: pp.producto_id,
        costo_proveedor: pp.costo_proveedor,
        precio_por_kilo_compra: pp.precio_por_kilo_compra,
        tipo_carga_default: pp.tipo_carga_default,
        nombre: pp.productos?.nombre || "—",
        peso_kg: pp.productos?.peso_kg ?? null,
        precio_por_kilo: pp.productos?.precio_por_kilo ?? null,
        aplica_iva: pp.productos?.aplica_iva ?? null,
        aplica_ieps: pp.productos?.aplica_ieps ?? null,
        ultimo_precio: ultimo?.precio ?? null,
        ultimo_precio_fecha: ultimo?.fecha ?? null,
        avg_3m: avg,
      };
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

export function useProveedorProductos(proveedorId: string | undefined) {
  return useQuery({
    queryKey: ["proveedor-productos-tab", proveedorId],
    queryFn: () => fetchProductos(proveedorId as string),
    enabled: !!proveedorId,
    staleTime: 60_000,
  });
}

// ============================================================
// TAB HISTORICO OCS
// ============================================================
export interface OCHistoricoRow {
  id: string;
  folio: string;
  total: number;
  status: string;
  status_pago: string | null;
  created_at: string;
  fecha_entrega_real: string | null;
  fecha_entrega_programada: string | null;
  fecha_pago_calculada: string | null;
  plazo_pago_dias: number | null;
  total_productos: number;
  total_faltantes: number;
}

async function fetchHistoricoOCs(proveedorId: string): Promise<OCHistoricoRow[]> {
  const { data: ocs, error } = await supabase
    .from("ordenes_compra")
    .select(
      "id, folio, total, status, status_pago, created_at, fecha_entrega_real, fecha_entrega_programada, fecha_pago_calculada, plazo_pago_dias"
    )
    .eq("proveedor_id", proveedorId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const ocIds = (ocs || []).map((o) => o.id);
  const productosMap = new Map<string, number>();
  const faltantesMap = new Map<string, number>();

  if (ocIds.length > 0) {
    const [{ data: dets }, { data: falt }] = await Promise.all([
      supabase
        .from("ordenes_compra_detalles")
        .select("orden_compra_id")
        .in("orden_compra_id", ocIds),
      supabase
        .from("faltantes_proveedor")
        .select("orden_compra_id")
        .in("orden_compra_id", ocIds),
    ]);
    (dets || []).forEach((d: any) =>
      productosMap.set(d.orden_compra_id, (productosMap.get(d.orden_compra_id) || 0) + 1)
    );
    (falt || []).forEach((f: any) =>
      faltantesMap.set(f.orden_compra_id, (faltantesMap.get(f.orden_compra_id) || 0) + 1)
    );
  }

  return (ocs || []).map((o) => ({
    id: o.id,
    folio: o.folio,
    total: Number(o.total || 0),
    status: o.status,
    status_pago: o.status_pago,
    created_at: o.created_at,
    fecha_entrega_real: o.fecha_entrega_real,
    fecha_entrega_programada: o.fecha_entrega_programada,
    fecha_pago_calculada: o.fecha_pago_calculada,
    plazo_pago_dias: o.plazo_pago_dias,
    total_productos: productosMap.get(o.id) || 0,
    total_faltantes: faltantesMap.get(o.id) || 0,
  }));
}

export function useProveedorHistoricoOCs(proveedorId: string | undefined) {
  return useQuery({
    queryKey: ["proveedor-historico-ocs", proveedorId],
    queryFn: () => fetchHistoricoOCs(proveedorId as string),
    enabled: !!proveedorId,
    staleTime: 60_000,
  });
}

// ============================================================
// TAB FALTANTES
// ============================================================
export interface FaltanteRow {
  id: string;
  fecha_recepcion: string;
  orden_compra_id: string;
  folio: string | null;
  producto_id: string;
  producto_nombre: string;
  por_kilo: boolean | null;
  tipo_faltante: string;
  cantidad_faltante: number;
  peso_faltante: number | null;
  status: string;
  resolved_at: string | null;
  created_at: string;
}

async function fetchFaltantes(proveedorId: string): Promise<FaltanteRow[]> {
  const { data, error } = await supabase
    .from("faltantes_proveedor")
    .select(
      "id, fecha_recepcion, orden_compra_id, producto_id, tipo_faltante, cantidad_faltante, peso_faltante, status, resolved_at, created_at, ordenes_compra:orden_compra_id(folio), productos:producto_id(nombre, precio_por_kilo)"
    )
    .eq("proveedor_id", proveedorId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (data || []).map((f: any) => ({
    id: f.id,
    fecha_recepcion: f.fecha_recepcion,
    orden_compra_id: f.orden_compra_id,
    folio: f.ordenes_compra?.folio ?? null,
    producto_id: f.producto_id,
    producto_nombre: f.productos?.nombre || "—",
    por_kilo: f.productos?.precio_por_kilo ?? null,
    tipo_faltante: f.tipo_faltante || "cantidad",
    cantidad_faltante: Number(f.cantidad_faltante || 0),
    peso_faltante: f.peso_faltante !== null ? Number(f.peso_faltante) : null,
    status: f.status || "pendiente",
    resolved_at: f.resolved_at,
    created_at: f.created_at,
  }));
}

export function useProveedorFaltantes(proveedorId: string | undefined) {
  return useQuery({
    queryKey: ["proveedor-faltantes-tab", proveedorId],
    queryFn: () => fetchFaltantes(proveedorId as string),
    enabled: !!proveedorId,
    staleTime: 60_000,
  });
}

// ============================================================
// TAB CUENTA CORRIENTE
// ============================================================
export interface CuentaOCRow {
  id: string;
  folio: string;
  total: number;
  fecha_pago_calculada: string | null;
  plazo_pago_dias: number | null;
  created_at: string;
  status: string;
  status_pago: string | null;
}

async function fetchCuentaCorriente(proveedorId: string): Promise<CuentaOCRow[]> {
  const { data, error } = await supabase
    .from("ordenes_compra")
    .select(
      "id, folio, total, fecha_pago_calculada, plazo_pago_dias, created_at, status, status_pago"
    )
    .eq("proveedor_id", proveedorId)
    .eq("status_pago", "pendiente")
    .not("status", "in", "(cancelada,rechazada)")
    .order("fecha_pago_calculada", { ascending: true, nullsFirst: false });
  if (error) throw error;

  return (data || []).map((o) => ({
    id: o.id,
    folio: o.folio,
    total: Number(o.total || 0),
    fecha_pago_calculada: o.fecha_pago_calculada,
    plazo_pago_dias: o.plazo_pago_dias,
    created_at: o.created_at,
    status: o.status,
    status_pago: o.status_pago,
  }));
}

export function useProveedorCuentaCorriente(proveedorId: string | undefined) {
  return useQuery({
    queryKey: ["proveedor-cuenta-corriente", proveedorId],
    queryFn: () => fetchCuentaCorriente(proveedorId as string),
    enabled: !!proveedorId,
    staleTime: 60_000,
  });
}
