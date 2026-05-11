import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// ─── List Hojas de Salida ────────────────────────────────────────────────────

export function useHojasSalida(filtros?: { estado?: string; reconciliacion?: string }) {
  return useQuery({
    queryKey: ["hojas-salida", filtros],
    queryFn: async () => {
      let query = (supabase as any)
        .from("hojas_salida")
        .select(`
          *,
          cuadrilla_hoja_salida(empleado_id, rol_en_entrega, nombre_snapshot)
        `)
        .order("fecha_emision", { ascending: false })
        .limit(50);
      if (filtros?.estado) query = query.eq("estado", filtros.estado);
      if (filtros?.reconciliacion) query = query.eq("reconciliacion_estado", filtros.reconciliacion);
      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
  });
}

// ─── Single Hoja ─────────────────────────────────────────────────────────────

export function useHojaSalida(id: string | undefined) {
  return useQuery({
    queryKey: ["hoja-salida", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await (supabase as any)
        .from("hojas_salida")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

// ─── Lines ───────────────────────────────────────────────────────────────────

export function useHojaSalidaLineas(hojaId: string | undefined) {
  return useQuery({
    queryKey: ["hoja-salida-lineas", hojaId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("hojas_salida_lineas")
        .select("*")
        .eq("hoja_salida_id", hojaId)
        .order("orden_linea");
      if (error) throw error;
      return data as any[];
    },
    enabled: !!hojaId,
  });
}

// ─── Cuadrilla ───────────────────────────────────────────────────────────────

export function useCuadrilla(hojaId: string | undefined) {
  return useQuery({
    queryKey: ["cuadrilla-hoja", hojaId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("cuadrilla_hoja_salida")
        .select("*, empleados:empleado_id(nombre_completo)")
        .eq("hoja_salida_id", hojaId)
        .order("rol_en_entrega")
        .order("orden_ayudante");
      if (error) throw error;
      return data as any[];
    },
    enabled: !!hojaId,
  });
}

// ─── Generate Hoja ───────────────────────────────────────────────────────────

export function useGenerarHojaSalida() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      entregaId: string;
      cuadrilla: { empleado_id: string; rol: "chofer" | "ayudante"; orden_ayudante?: number }[];
    }) => {
      const { data, error } = await supabase.functions.invoke("generar-hoja-salida", {
        body: { entrega_id: params.entregaId, cuadrilla: params.cuadrilla },
      });
      if (error) throw error;
      if (!data.exitoso) throw new Error(data.error);
      return data as { hoja_salida_id: string; folio: string; pdf_url: string; html: string };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["hojas-salida"] });
      toast({ title: "Hoja de Salida generada", description: `Folio: ${data.folio}` });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });
}

// ─── Upload foto sellada (chofer) ────────────────────────────────────────────

export function useSubirFotoSellada() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ hojaId, file }: { hojaId: string; file: File }) => {
      const path = `fotos/${hojaId}-${Date.now()}.${file.name.split(".").pop()}`;
      const { error: upErr } = await supabase.storage.from("hojas-salida").upload(path, file, { upsert: true });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from("hojas-salida").getPublicUrl(path);
      const fotoUrl = urlData.publicUrl;

      // Update hoja
      await (supabase as any)
        .from("hojas_salida")
        .update({ foto_sellada_url: fotoUrl, entregada_cliente_at: new Date().toISOString() })
        .eq("id", hojaId);

      // Register conciliation moment
      await supabase.functions.invoke("conciliar-momento", {
        body: {
          hoja_salida_id: hojaId,
          momento_id: "cliente_sella_firma",
          evidencia: { foto_url: fotoUrl },
        },
      });

      return fotoUrl;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["hoja-salida", vars.hojaId] });
      qc.invalidateQueries({ queryKey: ["hojas-salida"] });
      toast({ title: "Foto subida", description: "Pendiente reconciliación admin." });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });
}

// ─── Reconciliar (admin) ─────────────────────────────────────────────────────

export function useReconciliarHoja() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      hojaId: string;
      estado: string;
      observaciones: string;
      itemsFaltantes?: any[];
    }) => {
      const user = (await supabase.auth.getUser()).data.user;
      await (supabase as any)
        .from("hojas_salida")
        .update({
          reconciliacion_estado: params.estado,
          reconciliacion_observaciones: params.observaciones,
          reconciliacion_items_faltantes: params.itemsFaltantes || null,
          reconciliada_at: new Date().toISOString(),
          reconciliada_por: user?.id,
          estado: params.estado === "completo" ? "reconciliada" : "parcial",
        })
        .eq("id", params.hojaId);

      // Register conciliation moment
      await supabase.functions.invoke("conciliar-momento", {
        body: {
          hoja_salida_id: params.hojaId,
          momento_id: "reconciliacion_final",
          evidencia: { notas: params.observaciones },
        },
      });

      // If faltante → create discrepancia
      if (params.estado === "faltante" && params.itemsFaltantes?.length) {
        for (const item of params.itemsFaltantes) {
          await (supabase as any).from("discrepancias_la_corona").insert({
            hoja_salida_id: params.hojaId,
            tipo_discrepancia: "faltante_mercancia",
            producto_id: item.producto_id || null,
            cantidad_esperada: item.cantidad_esperada,
            cantidad_real: item.cantidad_real,
            diferencia: (item.cantidad_esperada || 0) - (item.cantidad_real || 0),
            detectado_por: "reconciliacion_manual",
            severidad: "alta",
          });
        }
      }
    },
    onSuccess: (_, params) => {
      qc.invalidateQueries({ queryKey: ["hoja-salida", params.hojaId] });
      qc.invalidateQueries({ queryKey: ["hojas-salida"] });
      qc.invalidateQueries({ queryKey: ["discrepancias"] });
      toast({ title: "Reconciliación completada" });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });
}

// ─── Eventos timeline ────────────────────────────────────────────────────────

export function useEventosConciliacion(hojaId: string | undefined) {
  return useQuery({
    queryKey: ["eventos-conciliacion", hojaId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("eventos_conciliacion")
        .select("*, momentos_clave:momento_id(nombre, orden_secuencia, rol_responsable)")
        .eq("hoja_salida_id", hojaId)
        .order("completado_at", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!hojaId,
  });
}
