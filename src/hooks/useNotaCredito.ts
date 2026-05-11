import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useNotasCredito(filtros?: { estado?: string }) {
  return useQuery({
    queryKey: ["notas-credito", filtros],
    queryFn: async () => {
      let q = (supabase as any).from("notas_credito")
        .select("*, clientes:cliente_id(nombre, razon_social), facturas:factura_original_id(folio, cfdi_uuid)")
        .order("created_at", { ascending: false }).limit(50);
      if (filtros?.estado) q = q.eq("cfdi_estado", filtros.estado);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useCrearNotaCredito() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (params: { factura_original_id: string; cliente_id: string; tipo: string; motivo: string; subtotal: number; impuestos: number; total: number }) => {
      const user = (await supabase.auth.getUser()).data.user;
      const { data, error } = await (supabase as any).from("notas_credito").insert({ ...params, folio: "", created_by: user?.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["notas-credito"] });
      toast({ title: "Nota de crédito creada", description: `Folio: ${data.folio}` });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useTimbrarNotaCredito() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (ncId: string) => {
      const { data, error } = await supabase.functions.invoke("timbrar-nota-credito", { body: { nota_credito_id: ncId } });
      if (error) throw error;
      if (!data.exitoso) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notas-credito"] });
      toast({ title: "Nota de crédito timbrada" });
    },
    onError: (e: any) => toast({ title: "Error timbrado", description: e.message, variant: "destructive" }),
  });
}

export function useCancelarNotaCredito() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ ncId, motivo }: { ncId: string; motivo: string }) => {
      // Use same cancelar-cfdi pattern but update notas_credito
      await (supabase as any).from("notas_credito").update({ cfdi_estado: "cancelada" }).eq("id", ncId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notas-credito"] });
      toast({ title: "Nota de crédito cancelada" });
    },
  });
}
