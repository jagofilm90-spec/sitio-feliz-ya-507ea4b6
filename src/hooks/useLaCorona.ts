import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// ─── Momentos clave ──────────────────────────────────────────────────────────

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

// ─── Eventos de una entrega (timeline) ───────────────────────────────────────

export function useEventosConciliacion(entregaId: string | undefined) {
  return useQuery({
    queryKey: ["eventos-conciliacion", entregaId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("eventos_conciliacion")
        .select("*, momentos_clave:momento_id(nombre, orden_secuencia, rol_responsable)")
        .eq("entrega_id", entregaId)
        .order("timestamp_evento", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!entregaId,
  });
}

// ─── Discrepancias ───────────────────────────────────────────────────────────

export function useDiscrepancias(filtros?: { estado?: string }) {
  return useQuery({
    queryKey: ["discrepancias", filtros],
    queryFn: async () => {
      let query = (supabase as any)
        .from("discrepancias_la_corona")
        .select("*, entregas:entrega_id(pedido_id, pedidos:pedido_id(folio, clientes:cliente_id(nombre)))")
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
      const { error } = await (supabase as any)
        .from("discrepancias_la_corona")
        .update({
          estado_investigacion: estado,
          resolucion,
          investigado_por: user?.id,
          investigado_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["discrepancias"] });
      toast({ title: "Discrepancia actualizada" });
    },
  });
}

// ─── Anomalías ───────────────────────────────────────────────────────────────

export function useAnomalias(soloNoRevisadas?: boolean) {
  return useQuery({
    queryKey: ["anomalias", soloNoRevisadas],
    queryFn: async () => {
      let query = (supabase as any)
        .from("anomalias_la_corona")
        .select("*, empleados:empleado_id(nombre_completo)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (soloNoRevisadas) query = query.eq("revisada", false);
      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useMarcarAnomaliaRevisada() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const user = (await supabase.auth.getUser()).data.user;
      await (supabase as any)
        .from("anomalias_la_corona")
        .update({ revisada: true, revisada_por: user?.id, revisada_at: new Date().toISOString() })
        .eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["anomalias"] }),
  });
}

// ─── Scores ──────────────────────────────────────────────────────────────────

export function useScoresConfianza(periodo?: string) {
  return useQuery({
    queryKey: ["scores-confianza", periodo],
    queryFn: async () => {
      const p = periodo || new Date().toISOString().slice(0, 7);
      const { data, error } = await (supabase as any)
        .from("score_confianza")
        .select("*, empleados:empleado_id(nombre_completo, puesto)")
        .eq("periodo", p)
        .order("score", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });
}

// ─── Hojas Físicas ───────────────────────────────────────────────────────────

export function useHojasFisicas(filtros?: { estado?: string }) {
  return useQuery({
    queryKey: ["hojas-fisicas", filtros],
    queryFn: async () => {
      let query = (supabase as any)
        .from("hojas_fisicas")
        .select("*, entregas:entrega_id(pedido_id, pedidos:pedido_id(folio, clientes:cliente_id(nombre)))")
        .order("created_at", { ascending: false })
        .limit(50);
      if (filtros?.estado) query = query.eq("reconciliacion_estado", filtros.estado);
      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useGenerarHojaFisica() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (entregaId: string) => {
      const { data, error } = await supabase.functions.invoke("generar-hoja-fisica-pdf", {
        body: { entrega_id: entregaId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["hojas-fisicas"] });
      toast({ title: "Hoja generada", description: `Folio: ${data.pdf_folio}` });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });
}

export function useProcesarHojaFisica() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ hojaFisicaId, fotoUrl }: { hojaFisicaId: string; fotoUrl: string }) => {
      const { data, error } = await supabase.functions.invoke("procesar-hoja-fisica", {
        body: { hoja_fisica_id: hojaFisicaId, foto_url: fotoUrl },
      });
      if (error) throw error;
      if (!data.exitoso) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["hojas-fisicas"] });
      qc.invalidateQueries({ queryKey: ["anomalias"] });
      qc.invalidateQueries({ queryKey: ["discrepancias"] });
      toast({
        title: data.clasificacion === "completo" ? "Entrega completa" : "Discrepancia detectada",
        description: `IA: ${data.clasificacion}. Sello: ${data.sello_detectado ? "sí" : "no"}. Firma: ${data.firma_detectada ? "sí" : "no"}.`,
        variant: data.clasificacion === "completo" ? "default" : "destructive",
      });
    },
    onError: (e: any) => {
      toast({ title: "Error procesando", description: e.message, variant: "destructive" });
    },
  });
}

export function useConciliarMomento() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      entregaId: string;
      momentoId: string;
      empleadoId?: string;
      latitud?: number;
      longitud?: number;
      firmaBase64?: string;
      fotoUrl?: string;
      notas?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("conciliar-momento", {
        body: {
          entrega_id: params.entregaId,
          momento_id: params.momentoId,
          empleado_id: params.empleadoId,
          latitud: params.latitud,
          longitud: params.longitud,
          firma_base64: params.firmaBase64,
          foto_url: params.fotoUrl,
          notas: params.notas,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, params) => {
      qc.invalidateQueries({ queryKey: ["eventos-conciliacion", params.entregaId] });
    },
  });
}
