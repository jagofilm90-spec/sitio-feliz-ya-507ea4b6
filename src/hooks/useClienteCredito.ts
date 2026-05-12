import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CreditoStatus {
  cliente_id: string;
  credito_limite: number;
  credito_balance: number;
  credito_disponible: number;
  hold_activo: boolean;
  hold_motivo: string | null;
  porcentaje_usado: number;
  estado: string;
}

export function useClienteCreditoStatus(clienteId: string | undefined) {
  return useQuery({
    queryKey: ["cliente-credito", clienteId],
    queryFn: async () => {
      if (!clienteId) return null;
      const { data, error } = await supabase.rpc("get_cliente_credito_status", { p_cliente_id: clienteId });
      if (error) throw error;
      return (data as any)?.[0] as CreditoStatus | null;
    },
    enabled: !!clienteId,
  });
}

export function useVerificarCredito() {
  return useMutation({
    mutationFn: async ({ clienteId, monto }: { clienteId: string; monto: number }) => {
      const { data, error } = await supabase.rpc("verificar_credito_para_pedido", { p_cliente_id: clienteId, p_monto: monto });
      if (error) throw error;
      return (data as any)?.[0] as { permitido: boolean; razon: string; credito_disponible: number };
    },
  });
}

export function useCambiarLimiteCredito() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ clienteId, nuevoLimite, motivo }: { clienteId: string; nuevoLimite: number; motivo: string }) => {
      const { error } = await supabase.rpc("cambiar_credito_limite", { p_cliente_id: clienteId, p_nuevo_limite: nuevoLimite, p_motivo: motivo });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cliente-credito"] }); toast({ title: "Límite actualizado" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useAplicarCreditHold() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ clienteId, motivo }: { clienteId: string; motivo: string }) => {
      const { error } = await supabase.rpc("aplicar_credit_hold", { p_cliente_id: clienteId, p_motivo: motivo });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cliente-credito"] }); toast({ title: "Credit hold activado" }); },
  });
}

export function useLiberarCreditHold() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ clienteId, motivo }: { clienteId: string; motivo?: string }) => {
      const { error } = await supabase.rpc("liberar_credit_hold", { p_cliente_id: clienteId, p_motivo: motivo || "Liberación manual" });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cliente-credito"] }); toast({ title: "Credit hold liberado" }); },
  });
}

export function useCreditoLog(clienteId: string | undefined) {
  return useQuery({
    queryKey: ["credito-log", clienteId],
    queryFn: async () => {
      if (!clienteId) return [];
      const { data, error } = await (supabase as any).from("cliente_credito_log").select("*").eq("cliente_id", clienteId).order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!clienteId,
  });
}
