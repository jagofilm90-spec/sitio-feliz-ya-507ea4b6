import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// ─── Aging Report ────────────────────────────────────────────────────────────

export function useAgingReport() {
  return useQuery({
    queryKey: ["aging-report"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("generar-aging-report");
      if (error) throw error;
      return data as { clientes: any[]; totales: any; generado_at: string };
    },
    refetchInterval: 60000,
  });
}

// ─── Cobros ──────────────────────────────────────────────────────────────────

export function useCobros(filtros?: { estado?: string }) {
  return useQuery({
    queryKey: ["cobros", filtros],
    queryFn: async () => {
      let q = (supabase as any).from("cobros")
        .select("*, clientes:cliente_id(nombre, razon_social)")
        .order("capturado_at", { ascending: false }).limit(50);
      if (filtros?.estado) q = q.eq("estado", filtros.estado);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useFacturasPendientesCliente(clienteId: string | undefined) {
  return useQuery({
    queryKey: ["facturas-pendientes", clienteId],
    queryFn: async () => {
      if (!clienteId) return [];
      const { data, error } = await (supabase as any).from("facturas")
        .select("id, folio, total, saldo_pendiente, fecha_vencimiento, metodo_pago, cfdi_estado")
        .eq("cliente_id", clienteId)
        .gt("saldo_pendiente", 0)
        .eq("cfdi_estado", "timbrada")
        .order("fecha_vencimiento", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!clienteId,
  });
}

export function useCrearCobro() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (params: {
      cliente_id: string;
      monto_total: number;
      forma_pago_sat: string;
      facturas_aplicar: { factura_id: string; monto: number }[];
      foto_comprobante_url?: string;
      notas_cobrador?: string;
      gps_lat?: number;
      gps_lng?: number;
      numero_operacion?: string;
      numero_cheque?: string;
      banco_emisor?: string;
    }) => {
      const user = (await supabase.auth.getUser()).data.user;
      const { facturas_aplicar, ...cobroData } = params;
      const { data: cobro, error } = await (supabase as any).from("cobros")
        .insert({ ...cobroData, capturado_por: user?.id, estado: "capturado" })
        .select().single();
      if (error) throw error;

      const { data: aplicar, error: aErr } = await supabase.functions.invoke("aplicar-cobro", {
        body: { cobro_id: cobro.id, facturas_aplicar },
      });
      if (aErr) throw aErr;
      return { ...cobro, ...aplicar };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["cobros"] });
      qc.invalidateQueries({ queryKey: ["facturas-pendientes"] });
      qc.invalidateQueries({ queryKey: ["aging-report"] });
      toast({ title: "Cobro registrado", description: `Folio: ${data.folio}` });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useValidarCobro() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ cobro_id, notas }: { cobro_id: string; notas?: string }) => {
      const user = (await supabase.auth.getUser()).data.user;
      await (supabase as any).from("cobros").update({
        estado: "validado", validado_por: user?.id, validado_at: new Date().toISOString(), notas_validacion: notas,
      }).eq("id", cobro_id);

      const { data: cobro } = await (supabase as any).from("cobros").select("requiere_rep, complemento_pago_id").eq("id", cobro_id).single();
      if (cobro?.requiere_rep && !cobro.complemento_pago_id) {
        await supabase.functions.invoke("crear-rep-from-cobro", { body: { cobro_id } });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cobros"] });
      toast({ title: "Cobro validado" });
    },
  });
}

export function useRechazarCobro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ cobro_id, motivo }: { cobro_id: string; motivo: string }) => {
      const user = (await supabase.auth.getUser()).data.user;
      await (supabase as any).from("cobros").update({
        estado: "rechazado", validado_por: user?.id, validado_at: new Date().toISOString(), motivo_rechazo: motivo,
      }).eq("id", cobro_id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cobros"] }),
  });
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export function useDashboardCobranza() {
  return useQuery({
    queryKey: ["dashboard-cobranza"],
    queryFn: async () => {
      const [facturas, cobrosHoy] = await Promise.all([
        (supabase as any).from("facturas").select("saldo_pendiente, fecha_vencimiento").gt("saldo_pendiente", 0).eq("cfdi_estado", "timbrada"),
        (supabase as any).from("cobros").select("id", { count: "exact", head: true }).gte("capturado_at", new Date().toISOString().split("T")[0]),
      ]);
      const datos = facturas.data || [];
      const totalCartera = datos.reduce((s: number, f: any) => s + (f.saldo_pendiente || 0), 0);
      const vencida = datos.filter((f: any) => f.fecha_vencimiento && new Date(f.fecha_vencimiento) < new Date())
        .reduce((s: number, f: any) => s + (f.saldo_pendiente || 0), 0);
      return {
        totalCartera,
        carteraVencida: vencida,
        porcentajeVencido: totalCartera > 0 ? (vencida / totalCartera) * 100 : 0,
        cobrosHoy: cobrosHoy.count || 0,
      };
    },
    refetchInterval: 60000,
  });
}
