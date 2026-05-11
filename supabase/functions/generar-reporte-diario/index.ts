import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const fecha = body.fecha || new Date().toISOString().split("T")[0];
    const fi = `${fecha}T00:00:00Z`;
    const ff = `${fecha}T23:59:59Z`;
    const mi = `${fecha.substring(0, 7)}-01T00:00:00Z`;
    const yi = `${fecha.substring(0, 4)}-01-01T00:00:00Z`;

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // All queries in parallel
    const [pDia, pMes, pYTD, pPend, pComp, eDia, eOk, hsGen, hsIA, fTimb, fMonto, ncDia, repDia, cDia, cMonto, cart, aDay, aCrit, dNew, dvGps, scores, bRojas] = await Promise.all([
      sb.from("pedidos").select("total").gte("fecha_pedido", fi).lte("fecha_pedido", ff),
      sb.from("pedidos").select("total").gte("fecha_pedido", mi).lte("fecha_pedido", ff),
      sb.from("pedidos").select("total").gte("fecha_pedido", yi).lte("fecha_pedido", ff),
      sb.from("pedidos").select("id", { count: "exact", head: true }).eq("estado_surtido", "pendiente"),
      sb.from("pedidos").select("id", { count: "exact", head: true }).gte("surtido_fin_at", fi).lte("surtido_fin_at", ff),
      sb.from("hojas_salida").select("id", { count: "exact", head: true }).gte("entregada_cliente_at", fi).lte("entregada_cliente_at", ff),
      sb.from("hojas_salida").select("id", { count: "exact", head: true }).eq("ia_clasificacion", "completo").gte("entregada_cliente_at", fi),
      sb.from("hojas_salida").select("id", { count: "exact", head: true }).gte("generada_at", fi).lte("generada_at", ff),
      sb.from("hojas_salida").select("id", { count: "exact", head: true }).not("ia_procesada_at", "is", null).gte("ia_procesada_at", fi),
      sb.from("facturas").select("id", { count: "exact", head: true }).eq("cfdi_estado", "timbrada").gte("cfdi_fecha_timbrado", fi),
      sb.from("facturas").select("total").eq("cfdi_estado", "timbrada").gte("cfdi_fecha_timbrado", fi).lte("cfdi_fecha_timbrado", ff),
      sb.from("notas_credito").select("id", { count: "exact", head: true }).gte("created_at", fi).lte("created_at", ff),
      sb.from("complementos_pago").select("id", { count: "exact", head: true }).gte("created_at", fi).lte("created_at", ff),
      sb.from("cobros").select("id", { count: "exact", head: true }).gte("capturado_at", fi).lte("capturado_at", ff),
      sb.from("cobros").select("monto_total").gte("capturado_at", fi).lte("capturado_at", ff),
      sb.from("facturas").select("saldo_pendiente, fecha_vencimiento").gt("saldo_pendiente", 0),
      sb.from("alertas_la_corona").select("id", { count: "exact", head: true }).gte("created_at", fi),
      sb.from("alertas_la_corona").select("id", { count: "exact", head: true }).eq("severidad", "critica").gte("created_at", fi),
      sb.from("discrepancias_la_corona").select("id", { count: "exact", head: true }).gte("detectado_at", fi),
      sb.from("desviaciones_ruta").select("id", { count: "exact", head: true }).gte("iniciada_at", fi),
      sb.from("score_confianza_empleado").select("score_actual"),
      sb.from("score_confianza_empleado").select("id", { count: "exact", head: true }).eq("bandera_roja", true),
    ]);

    const sum = (arr: any[] | null) => (arr || []).reduce((s: number, x: any) => s + (x.total || x.monto_total || x.saldo_pendiente || 0), 0);
    const ventasDia = sum(pDia.data);
    const carteraTotal = sum(cart.data);
    const carteraVencida = (cart.data || []).filter((f: any) => f.fecha_vencimiento && new Date(f.fecha_vencimiento) < new Date()).reduce((s: number, f: any) => s + (f.saldo_pendiente || 0), 0);
    const scAvg = scores.data?.length ? scores.data.reduce((s: number, x: any) => s + (x.score_actual || 0), 0) / scores.data.length : 0;
    const onTime = (eDia.count || 0) > 0 ? ((eOk.count || 0) / (eDia.count || 1)) * 100 : 0;

    const data = {
      fecha,
      ventas_dia: ventasDia, ventas_mes: sum(pMes.data), ventas_ytd: sum(pYTD.data),
      pedidos_dia: pDia.data?.length || 0, pedidos_pendientes: pPend.count || 0, pedidos_completados: pComp.count || 0,
      ticket_promedio: pDia.data?.length ? ventasDia / pDia.data.length : 0,
      entregas_dia: eDia.count || 0, entregas_exitosas: eOk.count || 0,
      hojas_salida_generadas: hsGen.count || 0, hojas_procesadas_ia: hsIA.count || 0, porcentaje_on_time: onTime,
      facturas_timbradas: fTimb.count || 0, monto_facturado_dia: sum(fMonto.data),
      notas_credito_dia: ncDia.count || 0, reps_generados: repDia.count || 0,
      cobros_dia: cDia.count || 0, monto_cobrado_dia: sum(cMonto.data),
      cartera_total: carteraTotal, cartera_vencida: carteraVencida,
      porcentaje_vencido: carteraTotal > 0 ? (carteraVencida / carteraTotal) * 100 : 0,
      alertas_dia: aDay.count || 0, alertas_criticas: aCrit.count || 0,
      discrepancias_nuevas: dNew.count || 0, desviaciones_gps: dvGps.count || 0,
      score_promedio_empleados: scAvg, empleados_bandera_roja: bRojas.count || 0,
    };

    const { data: reporte, error } = await sb.from("reportes_diarios").upsert(data, { onConflict: "fecha" }).select().single();
    if (error) throw error;

    return new Response(JSON.stringify({ exitoso: true, reporte }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
