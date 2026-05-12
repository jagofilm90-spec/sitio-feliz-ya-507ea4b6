import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface HierarchyNode {
  cliente_id: string;
  parent_id: string | null;
  nombre: string;
  tipo_cliente: string;
  nivel: number;
  hereda_credito: boolean;
}

export function useClienteHierarchy(clienteId: string | undefined) {
  return useQuery({
    queryKey: ["cliente-hierarchy", clienteId],
    queryFn: async () => {
      if (!clienteId) return [];
      const { data, error } = await supabase.rpc("get_cliente_hierarchy", { p_cliente_id: clienteId });
      if (error) throw error;
      return (data || []) as HierarchyNode[];
    },
    enabled: !!clienteId,
  });
}

export function useBalanceConsolidado(matrizId: string | undefined) {
  return useQuery({
    queryKey: ["balance-consolidado", matrizId],
    queryFn: async () => {
      if (!matrizId) return null;
      const { data, error } = await supabase.rpc("get_balance_consolidado", { p_matriz_id: matrizId });
      if (error) throw error;
      return (data as any)?.[0] || null;
    },
    enabled: !!matrizId,
  });
}

export function useAsignarPadre() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ clienteId, parentId }: { clienteId: string; parentId: string | null }) => {
      const { error } = await (supabase as any).from("clientes").update({ parent_cliente_id: parentId }).eq("id", clienteId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cliente-hierarchy"] });
      toast({ title: "Jerarquía actualizada" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}
