import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useComplementosPago(filtros?: { estado?: string }) {
  return useQuery({
    queryKey: ["complementos-pago", filtros],
    queryFn: async () => {
      let q = (supabase as any).from("complementos_pago")
        .select("*, clientes:cliente_id(nombre, razon_social)")
        .order("created_at", { ascending: false }).limit(50);
      if (filtros?.estado) q = q.eq("cfdi_estado", filtros.estado);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useCrearComplementoPago() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (params: {
      cliente_id: string; fecha_pago: string; forma_pago: string; monto: number;
      num_operacion?: string; nom_banco_emisor?: string;
      doctos: { factura_id: string; uuid_factura: string; folio: string; num_parcialidad: number; imp_saldo_ant: number; imp_pagado: number; imp_saldo_insoluto: number }[];
    }) => {
      const user = (await supabase.auth.getUser()).data.user;
      const { doctos, ...repData } = params;
      const { data: rep, error } = await (supabase as any).from("complementos_pago").insert({ ...repData, folio: "", created_by: user?.id }).select().single();
      if (error) throw error;
      if (doctos?.length) {
        await (supabase as any).from("complementos_pago_doctos").insert(
          doctos.map((d) => ({ ...d, complemento_id: rep.id }))
        );
      }
      return rep;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["complementos-pago"] });
      toast({ title: "Complemento de pago creado", description: `Folio: ${data.folio}` });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useTimbrarComplementoPago() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (repId: string) => {
      const { data, error } = await supabase.functions.invoke("timbrar-complemento-pago", { body: { complemento_id: repId } });
      if (error) throw error;
      if (!data.exitoso) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["complementos-pago"] });
      toast({ title: "REP timbrado" });
    },
    onError: (e: any) => toast({ title: "Error timbrado REP", description: e.message, variant: "destructive" }),
  });
}

export function useDoctosPago(complementoId: string | undefined) {
  return useQuery({
    queryKey: ["doctos-pago", complementoId],
    queryFn: async () => {
      if (!complementoId) return [];
      const { data, error } = await (supabase as any).from("complementos_pago_doctos").select("*, facturas:factura_id(folio)").eq("complemento_id", complementoId);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!complementoId,
  });
}
