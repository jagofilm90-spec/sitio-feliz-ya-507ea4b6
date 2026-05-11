import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useConteosCiegos(filtros?: { estado?: string }) {
  return useQuery({
    queryKey: ["conteos-ciegos", filtros],
    queryFn: async () => {
      let query = (supabase as any)
        .from("conteos_ciegos")
        .select("*, empleados:asignado_a(nombre_completo)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (filtros?.estado) query = query.eq("estado", filtros.estado);
      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useConteoCiego(id: string | undefined) {
  return useQuery({
    queryKey: ["conteo-ciego", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await (supabase as any)
        .from("conteos_ciegos")
        .select("*, empleados:asignado_a(nombre_completo)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useConteoDetalles(conteoId: string | undefined) {
  return useQuery({
    queryKey: ["conteo-detalles", conteoId],
    queryFn: async () => {
      if (!conteoId) return [];
      const { data, error } = await (supabase as any)
        .from("conteos_ciegos_detalles")
        .select("*")
        .eq("conteo_id", conteoId)
        .order("codigo_producto");
      if (error) throw error;
      return data as any[];
    },
    enabled: !!conteoId,
  });
}

export function useGenerarConteoCiego() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: { asignado_a: string; tipo?: string; motivo?: string; producto_ids?: string[] }) => {
      const { data, error } = await supabase.functions.invoke("generar-conteo-ciego", { body: params });
      if (error) throw error;
      if (!data.exitoso) throw new Error(data.error);
      return data as { conteo_id: string; folio: string; total_productos: number };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["conteos-ciegos"] });
      toast({ title: "Conteo ciego creado", description: `${data.folio} — ${data.total_productos} productos` });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });
}

export function useRegistrarCantidad() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ detalleId, cantidad }: { detalleId: string; cantidad: number }) => {
      const { error } = await (supabase as any)
        .from("conteos_ciegos_detalles")
        .update({ cantidad_contada: cantidad, contado_at: new Date().toISOString() })
        .eq("id", detalleId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conteo-detalles"] });
    },
  });
}

export function useFinalizarConteo() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (conteoId: string) => {
      const { data, error } = await supabase.functions.invoke("finalizar-conteo-ciego", {
        body: { conteo_id: conteoId },
      });
      if (error) throw error;
      if (!data.exitoso) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["conteos-ciegos"] });
      qc.invalidateQueries({ queryKey: ["conteo-ciego"] });
      qc.invalidateQueries({ queryKey: ["scores-confianza"] });
      toast({
        title: data.anomalia_generada ? "Conteo con anomalía" : "Conteo finalizado",
        description: `Shrinkage: ${data.shrinkage_rate?.toFixed(2)}% · ${data.productos_con_diferencia} con diferencia`,
        variant: data.anomalia_generada ? "destructive" : "default",
      });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });
}

// Score historial
export function useScoreHistorial(empleadoId: string | undefined) {
  return useQuery({
    queryKey: ["score-historial", empleadoId],
    queryFn: async () => {
      if (!empleadoId) return [];
      const { data, error } = await (supabase as any)
        .from("score_confianza_historial")
        .select("*")
        .eq("empleado_id", empleadoId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!empleadoId,
  });
}

export function useRecalcularScore() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (empleadoId?: string) => {
      const { data, error } = await supabase.functions.invoke("calcular-score-empleado", {
        body: empleadoId ? { empleado_id: empleadoId } : {},
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scores-confianza"] });
      qc.invalidateQueries({ queryKey: ["la-corona-dashboard"] });
      toast({ title: "Scores recalculados" });
    },
  });
}
