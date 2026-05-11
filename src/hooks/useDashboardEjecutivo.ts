import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useDashboardEjecutivo() {
  return useQuery({
    queryKey: ["dashboard-ejecutivo"],
    queryFn: async () => {
      const hoy = new Date().toISOString().split("T")[0];
      const fi = `${hoy}T00:00:00Z`;
      const mi = `${hoy.substring(0, 7)}-01T00:00:00Z`;

      const [pDia, pMes, eDia, hsIA, fMes, cDia, cart, alertas, scores] = await Promise.all([
        (supabase as any).from("pedidos").select("total").gte("fecha_pedido", fi),
        (supabase as any).from("pedidos").select("total").gte("fecha_pedido", mi),
        (supabase as any).from("hojas_salida").select("id", { count: "exact", head: true }).gte("entregada_cliente_at", fi),
        (supabase as any).from("hojas_salida").select("id", { count: "exact", head: true }).not("ia_procesada_at", "is", null).gte("ia_procesada_at", fi),
        (supabase as any).from("facturas").select("total").eq("cfdi_estado", "timbrada").gte("cfdi_fecha_timbrado", mi),
        (supabase as any).from("cobros").select("id", { count: "exact", head: true }).gte("capturado_at", fi),
        (supabase as any).from("facturas").select("saldo_pendiente, fecha_vencimiento").gt("saldo_pendiente", 0),
        (supabase as any).from("alertas_la_corona").select("id", { count: "exact", head: true }).eq("estado", "activa"),
        (supabase as any).from("score_confianza_empleado").select("score_actual, bandera_roja"),
      ]);

      const sum = (d: any) => (d?.data || []).reduce((s: number, x: any) => s + (x.total || x.saldo_pendiente || 0), 0);
      const ventasDia = sum(pDia);
      const ventasMes = sum(pMes);
      const carteraTotal = sum(cart);
      const carteraVencida = (cart.data || []).filter((f: any) => f.fecha_vencimiento && new Date(f.fecha_vencimiento) < new Date()).reduce((s: number, f: any) => s + (f.saldo_pendiente || 0), 0);
      const sc = scores.data || [];
      const scoreAvg = sc.length ? sc.reduce((s: number, x: any) => s + (x.score_actual || 0), 0) / sc.length : 100;

      return {
        ventasDia, ventasMes,
        pedidosDia: pDia.data?.length || 0,
        entregasDia: eDia.count || 0,
        hojasIA: hsIA.count || 0,
        facturadoMes: sum(fMes),
        cobrosDia: cDia.count || 0,
        carteraTotal, carteraVencida,
        pctVencido: carteraTotal > 0 ? (carteraVencida / carteraTotal) * 100 : 0,
        alertasActivas: alertas.count || 0,
        scorePromedio: scoreAvg,
        banderasRojas: sc.filter((s: any) => s.bandera_roja).length,
      };
    },
    refetchInterval: 30000,
  });
}

export function useReportesDiarios() {
  return useQuery({
    queryKey: ["reportes-diarios"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("reportes_diarios").select("*").order("fecha", { ascending: false }).limit(30);
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useGenerarReporte() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (fecha?: string) => {
      const { data, error } = await supabase.functions.invoke("generar-reporte-diario", {
        body: { fecha: fecha || new Date().toISOString().split("T")[0] },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reportes-diarios"] });
      toast({ title: "Reporte generado" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useEnviarReporte() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (fecha: string) => {
      const { data, error } = await supabase.functions.invoke("enviar-reporte-diario", { body: { fecha } });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast({ title: "Reporte enviado", description: `${data.enviados} email(s)` });
    },
  });
}

export function useUserDashPrefs() {
  return useQuery({
    queryKey: ["user-dash-prefs"],
    queryFn: async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return null;
      const { data } = await (supabase as any).from("user_dashboard_prefs").select("*").eq("user_id", user.id).maybeSingle();
      return data;
    },
  });
}

export function useUpdateDashPrefs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (prefs: any) => {
      const user = (await supabase.auth.getUser()).data.user;
      await (supabase as any).from("user_dashboard_prefs").upsert({ ...prefs, user_id: user?.id }, { onConflict: "user_id" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user-dash-prefs"] }),
  });
}
