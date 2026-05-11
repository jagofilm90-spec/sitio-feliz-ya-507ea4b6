import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

// ─── Geo-fences ──────────────────────────────────────────────────────────────

export function useGeofences() {
  return useQuery({
    queryKey: ["geofences"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("geo_fences")
        .select("*")
        .eq("activo", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useCrearGeofence() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (params: { centro_lat: number; centro_lng: number; radio_metros?: number; nombre: string; tipo?: string }) => {
      const { data, error } = await supabase.functions.invoke("generar-geofences-clientes", { body: params });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["geofences"] });
      toast({ title: "Geo-fence creado" });
    },
  });
}

export function useGenerarGeofencesAuto() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("generar-geofences-clientes", { body: {} });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["geofences"] });
      toast({ title: "Geo-fences generados", description: `${data.geofences_creados} creados` });
    },
  });
}

// ─── Desviaciones ────────────────────────────────────────────────────────────

export function useDesviaciones(filtros?: { estado?: string }) {
  return useQuery({
    queryKey: ["desviaciones", filtros],
    queryFn: async () => {
      let q = (supabase as any)
        .from("desviaciones_ruta")
        .select("*")
        .order("iniciada_at", { ascending: false })
        .limit(50);
      if (filtros?.estado) q = q.eq("estado", filtros.estado);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useResolverDesviacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, estado, notas }: { id: string; estado: string; notas?: string }) => {
      const user = (await supabase.auth.getUser()).data.user;
      await (supabase as any).from("desviaciones_ruta").update({
        estado,
        resolucion_notas: notas,
        resuelta_por: user?.id,
        resuelta_at: new Date().toISOString(),
      }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["desviaciones"] }),
  });
}

// ─── Alertas con Realtime ────────────────────────────────────────────────────

export function useAlertasActivas() {
  const qc = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    const channel = supabase
      .channel("alertas-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "alertas_la_corona" }, (payload) => {
        const nueva = payload.new as any;
        qc.invalidateQueries({ queryKey: ["alertas-activas"] });
        toast({
          title: nueva.titulo,
          description: nueva.mensaje,
          variant: nueva.severidad === "critica" || nueva.severidad === "alta" ? "destructive" : "default",
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return useQuery({
    queryKey: ["alertas-activas"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("alertas_la_corona")
        .select("*")
        .eq("estado", "activa")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as any[];
    },
    refetchInterval: 30000,
  });
}

export function useMarcarAlertaVista() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const user = (await supabase.auth.getUser()).data.user;
      await (supabase as any).from("alertas_la_corona").update({
        estado: "vista", vista_por: user?.id, vista_at: new Date().toISOString(),
      }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alertas-activas"] }),
  });
}

export function useResolverAlerta() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, notas }: { id: string; notas?: string }) => {
      const user = (await supabase.auth.getUser()).data.user;
      await (supabase as any).from("alertas_la_corona").update({
        estado: "resuelta", resuelta_por: user?.id, resuelta_at: new Date().toISOString(), resolucion_notas: notas,
      }).eq("id", id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alertas-activas"] });
      toast({ title: "Alerta resuelta" });
    },
  });
}

// ─── Dashboard Analytics ─────────────────────────────────────────────────────

export function useLaCoronaAnalytics() {
  return useQuery({
    queryKey: ["la-corona-analytics"],
    queryFn: async () => {
      const d30 = new Date(Date.now() - 30 * 86400000).toISOString();
      const [alertas, desviaciones, discs, hojas, scores] = await Promise.all([
        (supabase as any).from("alertas_la_corona").select("id", { count: "exact", head: true }).eq("estado", "activa"),
        (supabase as any).from("desviaciones_ruta").select("id", { count: "exact", head: true }).eq("estado", "detectada"),
        (supabase as any).from("discrepancias_la_corona").select("id", { count: "exact", head: true }).eq("estado_investigacion", "pendiente"),
        (supabase as any).from("hojas_salida").select("id", { count: "exact", head: true }).gte("created_at", d30),
        (supabase as any).from("score_confianza_empleado").select("score_actual"),
      ]);
      const vals = (scores.data || []).map((s: any) => s.score_actual || 100);
      const avg = vals.length > 0 ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : 100;
      return {
        alertasActivas: alertas.count || 0,
        desviacionesDetectadas: desviaciones.count || 0,
        discrepanciasPendientes: discs.count || 0,
        hojas30d: hojas.count || 0,
        scorePromedio: Math.round(avg * 10) / 10,
      };
    },
    refetchInterval: 60000,
  });
}
