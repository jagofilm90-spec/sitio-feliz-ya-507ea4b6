import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// ─── Dashboard KPIs ──────────────────────────────────────────────────────────

export function useDashboardLaCorona() {
  return useQuery({
    queryKey: ["la-corona-dashboard"],
    queryFn: async () => {
      const [anomalias, discrepancias, hojasPendientes, scores] = await Promise.all([
        (supabase as any).from("anomalias_la_corona").select("id", { count: "exact", head: true }).eq("estado", "abierta"),
        (supabase as any).from("discrepancias_la_corona").select("id", { count: "exact", head: true }).eq("estado_investigacion", "pendiente"),
        (supabase as any).from("hojas_salida").select("id", { count: "exact", head: true }).eq("reconciliacion_estado", "pendiente"),
        (supabase as any).from("score_confianza_empleado").select("score_actual"),
      ]);

      const scoreValues = (scores.data || []).map((s: any) => s.score_actual || 100);
      const avgScore = scoreValues.length > 0 ? scoreValues.reduce((a: number, b: number) => a + b, 0) / scoreValues.length : 100;

      return {
        anomaliasAbiertas: anomalias.count || 0,
        discrepanciasPendientes: discrepancias.count || 0,
        hojasPendientes: hojasPendientes.count || 0,
        scorePromedio: Math.round(avgScore * 10) / 10,
        totalEmpleadosConScore: scoreValues.length,
      };
    },
  });
}

// ─── Discrepancias ───────────────────────────────────────────────────────────

export function useDiscrepancias(filtros?: { estado?: string }) {
  return useQuery({
    queryKey: ["discrepancias", filtros],
    queryFn: async () => {
      let query = (supabase as any)
        .from("discrepancias_la_corona")
        .select("*, hojas_salida:hoja_salida_id(folio, cliente_razon_social), empleados:empleado_responsable_id(nombre_completo), productos:producto_id(nombre)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (filtros?.estado) query = query.eq("estado_investigacion", filtros.estado);
      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useResolverDiscrepancia() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, resolucion, estado }: { id: string; resolucion: string; estado: string }) => {
      const user = (await supabase.auth.getUser()).data.user;
      await (supabase as any)
        .from("discrepancias_la_corona")
        .update({
          estado_investigacion: estado,
          resolucion,
          resolucion_at: new Date().toISOString(),
          resolucion_por: user?.id,
        })
        .eq("id", id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["discrepancias"] });
      qc.invalidateQueries({ queryKey: ["la-corona-dashboard"] });
      toast({ title: "Discrepancia actualizada" });
    },
  });
}

// ─── Scores ──────────────────────────────────────────────────────────────────

export function useScoresConfianza() {
  return useQuery({
    queryKey: ["scores-confianza"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("score_confianza_empleado")
        .select("*, empleados:empleado_id(nombre_completo, puesto)")
        .order("score_actual", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });
}

// ─── Anomalías ───────────────────────────────────────────────────────────────

export function useAnomalias(soloAbiertas?: boolean) {
  return useQuery({
    queryKey: ["anomalias", soloAbiertas],
    queryFn: async () => {
      let query = (supabase as any)
        .from("anomalias_la_corona")
        .select("*, empleados:empleado_id(nombre_completo), hojas_salida:hoja_salida_id(folio)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (soloAbiertas) query = query.eq("estado", "abierta");
      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useCerrarAnomalia() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, resolucion }: { id: string; resolucion: string }) => {
      const user = (await supabase.auth.getUser()).data.user;
      await (supabase as any)
        .from("anomalias_la_corona")
        .update({ estado: "cerrada", cerrada_at: new Date().toISOString(), cerrada_por: user?.id, resolucion })
        .eq("id", id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["anomalias"] });
      qc.invalidateQueries({ queryKey: ["la-corona-dashboard"] });
    },
  });
}

// ─── Feed tiempo real ────────────────────────────────────────────────────────

export function useFeedEventos() {
  return useQuery({
    queryKey: ["feed-eventos-24h"],
    queryFn: async () => {
      const desde = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const { data, error } = await (supabase as any)
        .from("eventos_conciliacion")
        .select("*, momentos_clave:momento_id(nombre), hojas_salida:hoja_salida_id(folio)")
        .gte("created_at", desde)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data as any[];
    },
    refetchInterval: 30000, // 30s auto-refresh
  });
}

// ─── Momentos clave (catálogo) ───────────────────────────────────────────────

export function useMomentosClave() {
  return useQuery({
    queryKey: ["momentos-clave"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("momentos_clave")
        .select("*")
        .order("orden_secuencia");
      if (error) throw error;
      return data as any[];
    },
  });
}
