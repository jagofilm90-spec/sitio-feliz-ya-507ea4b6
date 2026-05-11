import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useRemisiones(filtros?: { estado?: string }) {
  return useQuery({
    queryKey: ["remisiones", filtros],
    queryFn: async () => {
      let q = (supabase as any).from("remisiones")
        .select("*, clientes:cliente_id(nombre, razon_social), facturas:factura_id(folio)")
        .order("created_at", { ascending: false }).limit(50);
      if (filtros?.estado) q = q.eq("estado", filtros.estado);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useCrearRemision() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (params: { pedido_id: string; cliente_id: string; subtotal: number; impuestos: number; total: number; notas?: string }) => {
      const user = (await supabase.auth.getUser()).data.user;
      const { data, error } = await (supabase as any).from("remisiones").insert({ ...params, folio: "", created_by: user?.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["remisiones"] });
      toast({ title: "Remisión creada", description: `Folio: ${data.folio}` });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useConvertirRemisionFactura() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (remisionId: string) => {
      const { data, error } = await supabase.functions.invoke("convertir-remision-factura", { body: { remision_id: remisionId } });
      if (error) throw error;
      if (!data.exitoso) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["remisiones"] });
      qc.invalidateQueries({ queryKey: ["facturas"] });
      toast({ title: "Convertida a factura", description: data.mensaje });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}
