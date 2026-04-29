import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  ProveedorEnriquecido,
  ProveedorScore,
  PulseStats,
  RatingValue,
} from "@/types/proveedor-v3";

const RATING_FALLBACK: ProveedorScore = {
  score: null,
  rating: "sin_historial",
  total_ocs: 0,
  porcentaje_completas: null,
  peso_correcto: null,
  lead_time_promedio: null,
};

async function fetchProveedoresConScore(): Promise<ProveedorEnriquecido[]> {
  // 1. Proveedores (incluimos inactivos para filtro Estado; filtramos por defecto activos en UI)
  const { data: proveedores, error } = await supabase
    .from("proveedores")
    .select("id, nombre, nombre_comercial, rfc, categoria, nombre_contacto, telefono, email, activo, created_at, notas_operativas")
    .order("nombre", { ascending: true });

  if (error) throw error;
  if (!proveedores || proveedores.length === 0) return [];

  const ids = proveedores.map((p) => p.id);

  // 2. Conteo productos por proveedor
  const { data: prodRows } = await supabase
    .from("proveedor_productos")
    .select("proveedor_id")
    .in("proveedor_id", ids);

  const productosCount = new Map<string, number>();
  (prodRows || []).forEach((r: any) => {
    productosCount.set(r.proveedor_id, (productosCount.get(r.proveedor_id) || 0) + 1);
  });

  // 3. OCs (para última actividad, saldos, próximo pago)
  const { data: ocRows } = await supabase
    .from("ordenes_compra")
    .select("proveedor_id, total, status_pago, fecha_pago_calculada, created_at, status")
    .in("proveedor_id", ids);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const ultimaOC = new Map<string, string>();
  const saldoTotal = new Map<string, number>();
  const saldoVencido = new Map<string, number>();
  const diasVencidoMax = new Map<string, number>();
  const proximoPago = new Map<string, string>();

  (ocRows || []).forEach((oc: any) => {
    const pid = oc.proveedor_id as string;
    if (!ultimaOC.has(pid) || (oc.created_at && oc.created_at > (ultimaOC.get(pid) || ""))) {
      ultimaOC.set(pid, oc.created_at);
    }
    if (oc.status_pago === "pendiente" || oc.status_pago === "parcial") {
      saldoTotal.set(pid, (saldoTotal.get(pid) || 0) + Number(oc.total || 0));
      if (oc.fecha_pago_calculada) {
        const fp = new Date(oc.fecha_pago_calculada);
        fp.setHours(0, 0, 0, 0);
        if (fp.getTime() < today.getTime()) {
          saldoVencido.set(pid, (saldoVencido.get(pid) || 0) + Number(oc.total || 0));
          const dias = Math.floor((today.getTime() - fp.getTime()) / 86400000);
          if (dias > (diasVencidoMax.get(pid) || 0)) diasVencidoMax.set(pid, dias);
        } else {
          const cur = proximoPago.get(pid);
          if (!cur || oc.fecha_pago_calculada < cur) proximoPago.set(pid, oc.fecha_pago_calculada);
        }
      }
    }
  });

  // 4. Faltantes pendientes últimos 30d
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const { data: faltRows } = await supabase
    .from("faltantes_proveedor")
    .select("proveedor_id, status, created_at")
    .in("proveedor_id", ids)
    .eq("status", "pendiente")
    .gte("created_at", since.toISOString());

  const faltantes30 = new Map<string, number>();
  (faltRows || []).forEach((f: any) => {
    faltantes30.set(f.proveedor_id, (faltantes30.get(f.proveedor_id) || 0) + 1);
  });

  // 5. Score por proveedor (en paralelo)
  const scores = await Promise.all(
    proveedores.map(async (p) => {
      try {
        const { data, error: rpcError } = await supabase.rpc("get_proveedor_score" as any, {
          p_proveedor_id: p.id,
        });
        if (rpcError || !data) return RATING_FALLBACK;
        return data as unknown as ProveedorScore;
      } catch {
        return RATING_FALLBACK;
      }
    })
  );

  return proveedores.map((p, i) => ({
    id: p.id,
    nombre: p.nombre,
    nombre_comercial: p.nombre_comercial,
    rfc: p.rfc,
    categoria: p.categoria,
    nombre_contacto: p.nombre_contacto,
    telefono: p.telefono,
    email: p.email,
    activo: p.activo,
    created_at: p.created_at,
    notas_operativas: p.notas_operativas,
    score: scores[i] || RATING_FALLBACK,
    productos_count: productosCount.get(p.id) || 0,
    ultima_oc_fecha: ultimaOC.get(p.id) || null,
    saldo_total: saldoTotal.get(p.id) || 0,
    saldo_vencido: saldoVencido.get(p.id) || 0,
    dias_vencido_max: diasVencidoMax.get(p.id) || 0,
    faltantes_pendientes_30d: faltantes30.get(p.id) || 0,
    fecha_pago_proxima: proximoPago.get(p.id) || null,
  }));
}

async function fetchPulseStats(): Promise<PulseStats> {
  const today = new Date().toISOString().slice(0, 10);

  // Saldos vencidos
  const { data: vencidas } = await supabase
    .from("ordenes_compra")
    .select("proveedor_id, total, fecha_pago_calculada, status_pago")
    .in("status_pago", ["pendiente", "parcial"])
    .lt("fecha_pago_calculada", today);

  const provVencidos = new Set<string>();
  let monto = 0;
  (vencidas || []).forEach((o: any) => {
    if (o.proveedor_id) provVencidos.add(o.proveedor_id);
    monto += Number(o.total || 0);
  });

  // Faltantes pendientes
  const { count: faltantesCount } = await supabase
    .from("faltantes_proveedor")
    .select("*", { count: "exact", head: true })
    .eq("status", "pendiente");

  // OCs en tránsito
  const { count: ocsTransitoCount } = await supabase
    .from("ordenes_compra")
    .select("*", { count: "exact", head: true })
    .in("status", ["confirmada", "enviada"]);

  return {
    saldosVencidosCount: provVencidos.size,
    saldosVencidosMonto: monto,
    faltantesCount: faltantesCount || 0,
    ocsTransitoCount: ocsTransitoCount || 0,
  };
}

export function useProveedoresV3() {
  return useQuery({
    queryKey: ["proveedores-v3"],
    queryFn: fetchProveedoresConScore,
    staleTime: 60_000,
  });
}

export function usePulseStatsV3() {
  return useQuery({
    queryKey: ["proveedores-v3-pulse"],
    queryFn: fetchPulseStats,
    staleTime: 60_000,
  });
}

export const RATING_ORDER: Record<RatingValue, number> = {
  excelente: 5,
  bueno: 4,
  regular: 3,
  bajo: 2,
  critico: 1,
  sin_historial: 0,
};
