import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { EventoProveedor } from "@/lib/eventos-proveedor-utils";

export function useNotasOperativas(proveedorId: string | undefined) {
  return useQuery({
    queryKey: ["proveedor-notas", proveedorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proveedores")
        .select("notas_operativas")
        .eq("id", proveedorId as string)
        .maybeSingle();
      if (error) throw error;
      return (data?.notas_operativas as string | null) ?? "";
    },
    enabled: !!proveedorId,
    staleTime: 30_000,
  });
}

export function useUpdateNotasOperativas(proveedorId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (notas: string) => {
      const { error } = await supabase
        .from("proveedores")
        .update({ notas_operativas: notas })
        .eq("id", proveedorId as string);
      if (error) throw error;
      return notas;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proveedor-notas", proveedorId] });
    },
    onError: (e: any) => {
      toast.error("Error al guardar notas: " + (e?.message || "desconocido"));
    },
  });
}

export function useEventosProveedor(proveedorId: string | undefined) {
  return useQuery({
    queryKey: ["proveedor-eventos", proveedorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eventos_proveedor" as any)
        .select("*")
        .eq("proveedor_id", proveedorId as string)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as unknown as EventoProveedor[];
    },
    enabled: !!proveedorId,
    staleTime: 30_000,
  });
}

export interface NuevoEventoInput {
  tipo_evento: string;
  titulo: string;
  descripcion: string | null;
}

export function useCreateEvento(proveedorId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NuevoEventoInput) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id ?? null;
      const { error } = await supabase.from("eventos_proveedor" as any).insert({
        proveedor_id: proveedorId,
        tipo_evento: input.tipo_evento,
        titulo: input.titulo,
        descripcion: input.descripcion,
        origen: "manual",
        created_by: userId,
        metadata: null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proveedor-eventos", proveedorId] });
      qc.invalidateQueries({ queryKey: ["proveedor-detalle", proveedorId] });
      toast.success("Evento agregado");
    },
    onError: (e: any) => {
      toast.error("Error al guardar evento: " + (e?.message || ""));
    },
  });
}

export function useDeleteEvento(proveedorId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (eventoId: string) => {
      const { error } = await supabase
        .from("eventos_proveedor" as any)
        .delete()
        .eq("id", eventoId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proveedor-eventos", proveedorId] });
      qc.invalidateQueries({ queryKey: ["proveedor-detalle", proveedorId] });
      toast.success("Evento eliminado");
    },
    onError: (e: any) => {
      toast.error("No se pudo eliminar: " + (e?.message || ""));
    },
  });
}
