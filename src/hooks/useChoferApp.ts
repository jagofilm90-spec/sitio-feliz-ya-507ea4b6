import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useMisEntregasDia() {
  return useQuery({
    queryKey: ["mis-entregas-dia"],
    queryFn: async () => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const hoy = new Date().toISOString().split("T")[0];

      const { data, error } = await (supabase as any)
        .from("hojas_salida")
        .select(`*, cuadrilla_hoja_salida(empleado_id, rol_en_entrega, empleados:empleado_id(user_id, nombre_completo))`)
        .gte("fecha_emision", `${hoy}T00:00:00Z`)
        .lte("fecha_emision", `${hoy}T23:59:59Z`)
        .order("fecha_emision");
      if (error) throw error;

      return (data || []).filter((h: any) =>
        h.cuadrilla_hoja_salida?.some((c: any) => c.empleados?.user_id === userId && c.rol_en_entrega === "chofer")
      );
    },
    refetchInterval: 60000,
  });
}

export function useHojaChofer(hojaId: string | undefined) {
  return useQuery({
    queryKey: ["hoja-chofer", hojaId],
    queryFn: async () => {
      if (!hojaId) return null;
      const { data, error } = await (supabase as any)
        .from("hojas_salida")
        .select(`*, hojas_salida_lineas(*, productos:producto_id(codigo, nombre, unidad)), cuadrilla_hoja_salida(empleado_id, rol_en_entrega, nombre_snapshot)`)
        .eq("id", hojaId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!hojaId,
  });
}

export function useIniciarEntrega() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ hojaId, lat, lng }: { hojaId: string; lat: number; lng: number }) => {
      await (supabase as any).from("hojas_salida").update({
        estado: "en_transito", chofer_inicio_at: new Date().toISOString(),
        salida_bodega_at: new Date().toISOString(), gps_inicio_lat: lat, gps_inicio_lng: lng,
      }).eq("id", hojaId);

      await (supabase as any).from("eventos_conciliacion").insert({
        hoja_salida_id: hojaId, momento_id: "chofer_sale", estado: "completado",
        completado_at: new Date().toISOString(), gps_lat: lat, gps_lng: lng,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mis-entregas-dia"] }); qc.invalidateQueries({ queryKey: ["hoja-chofer"] }); },
  });
}

export function useMarcarLlegada() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ hojaId, lat, lng }: { hojaId: string; lat: number; lng: number }) => {
      await (supabase as any).from("hojas_salida").update({
        chofer_llegada_at: new Date().toISOString(), gps_entrega_lat: lat, gps_entrega_lng: lng,
      }).eq("id", hojaId);

      await (supabase as any).from("eventos_conciliacion").insert({
        hoja_salida_id: hojaId, momento_id: "en_ruta", estado: "completado",
        completado_at: new Date().toISOString(), gps_lat: lat, gps_lng: lng,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hoja-chofer"] }),
  });
}

export function useSubirFirma() {
  return useMutation({
    mutationFn: async ({ hojaId, tipo, dataUrl }: { hojaId: string; tipo: "chofer" | "cliente"; dataUrl: string }) => {
      const resp = await fetch(dataUrl);
      const blob = await resp.blob();
      const name = `firma_${tipo}_${hojaId}_${Date.now()}.png`;
      const { error } = await supabase.storage.from("hojas-salida").upload(name, blob, { contentType: "image/png", upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("hojas-salida").getPublicUrl(name);
      const field = tipo === "chofer" ? "firma_chofer_url" : "firma_cliente_url";
      await (supabase as any).from("hojas_salida").update({ [field]: publicUrl }).eq("id", hojaId);
      return publicUrl;
    },
  });
}

export function useConfirmarEntrega() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (params: {
      hojaId: string; recibeNombre: string; recibeCargo?: string;
      firmaClienteUrl?: string; firmaChoferUrl?: string; fotoHojaUrl?: string; notas?: string;
    }) => {
      await (supabase as any).from("hojas_salida").update({
        estado: "entregada", entregada_cliente_at: new Date().toISOString(),
        recibe_nombre: params.recibeNombre, recibe_cargo: params.recibeCargo,
        firma_cliente_url: params.firmaClienteUrl, firma_chofer_url: params.firmaChoferUrl,
        foto_sellada_url: params.fotoHojaUrl, notas_chofer: params.notas,
      }).eq("id", params.hojaId);

      await (supabase as any).from("eventos_conciliacion").insert({
        hoja_salida_id: params.hojaId, momento_id: "cliente_sella_firma", estado: "completado",
        completado_at: new Date().toISOString(), foto_url: params.fotoHojaUrl,
      });

      if (params.fotoHojaUrl) {
        await supabase.functions.invoke("procesar-hoja-fisica", {
          body: { hoja_salida_id: params.hojaId, foto_url: params.fotoHojaUrl },
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mis-entregas-dia"] });
      qc.invalidateQueries({ queryKey: ["hoja-chofer"] });
      toast({ title: "Entrega completada", description: "IA procesando hoja..." });
    },
  });
}

export function useEntregaFallida() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ hojaId, motivo, notas }: { hojaId: string; motivo: string; notas?: string }) => {
      await (supabase as any).from("hojas_salida").update({
        estado: "rechazada", motivo_no_entrega: motivo, notas_chofer: notas,
      }).eq("id", hojaId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mis-entregas-dia"] }),
  });
}

export function useMetricasChoferDia() {
  return useQuery({
    queryKey: ["metricas-chofer-dia"],
    queryFn: async () => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const hoy = new Date().toISOString().split("T")[0];

      const { data } = await (supabase as any)
        .from("hojas_salida")
        .select("estado, cuadrilla_hoja_salida(empleado_id, rol_en_entrega, empleados:empleado_id(user_id))")
        .gte("fecha_emision", `${hoy}T00:00:00Z`).lte("fecha_emision", `${hoy}T23:59:59Z`);

      const propias = (data || []).filter((h: any) =>
        h.cuadrilla_hoja_salida?.some((c: any) => c.empleados?.user_id === userId && c.rol_en_entrega === "chofer")
      );
      return {
        total: propias.length,
        entregadas: propias.filter((h: any) => ["entregada", "reconciliada"].includes(h.estado)).length,
        enTransito: propias.filter((h: any) => h.estado === "en_transito").length,
        pendientes: propias.filter((h: any) => ["generada", "impresa", "surtida"].includes(h.estado)).length,
        fallidas: propias.filter((h: any) => h.estado === "rechazada").length,
      };
    },
    refetchInterval: 60000,
  });
}
