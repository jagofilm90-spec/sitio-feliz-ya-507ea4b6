import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { fecha } = await req.json().catch(() => ({ fecha: new Date().toISOString().split("T")[0] }));

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: reporte } = await sb.from("reportes_diarios").select("*").eq("fecha", fecha).single();
    if (!reporte) return respond(404, { error: "Reporte no encontrado. Genera primero." });

    // Get subscribers
    const { data: subs } = await sb.from("user_dashboard_prefs").select("*, profiles:user_id(email)").eq("recibir_reporte_diario", true);

    if (!subs?.length) return respond(200, { exitoso: true, mensaje: "Sin suscriptores" });

    // Build HTML email
    const html = buildEmailHTML(reporte);
    let enviados = 0;

    for (const sub of subs) {
      const email = sub.email_notificaciones || (sub.profiles as any)?.email;
      if (!email) continue;

      // Use Gmail API if configured, otherwise log
      try {
        // Check if gmail is configured
        const { data: gmail } = await sb.from("gmail_cuentas").select("*").eq("activa", true).limit(1).maybeSingle();

        if (gmail) {
          // Send via existing gmail edge function pattern
          await sb.functions.invoke("send-invoice-email", {
            body: {
              to: email,
              subject: `ALMASA Reporte Diario ${fecha}`,
              html,
            },
          });
          enviados++;
        }
      } catch {
        console.log(`No se pudo enviar a ${email}`);
      }
    }

    await sb.from("reportes_diarios").update({ enviado_email: true }).eq("id", reporte.id);

    return respond(200, { exitoso: true, enviados, total_suscriptores: subs.length });
  } catch (error) {
    return respond(500, { error: error.message });
  }
});

function respond(s: number, b: any) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function buildEmailHTML(r: any): string {
  const fmt = (n: number) => `$${(n || 0).toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    body{font-family:'Inter',Arial,sans-serif;background:#fafaf9;margin:0;padding:20px;color:#333}
    .container{max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)}
    .header{background:#c41e3a;color:white;padding:20px 24px;text-align:center}
    .header h1{font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;margin:0}
    .header p{font-size:12px;opacity:0.8;margin:4px 0 0}
    .section{padding:16px 24px;border-bottom:1px solid #f0f0f0}
    .section-title{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#c41e3a;font-weight:700;margin-bottom:8px}
    .kpi-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .kpi{background:#fafaf9;border-radius:8px;padding:12px;text-align:center}
    .kpi-value{font-size:24px;font-weight:700;font-family:'JetBrains Mono',monospace;color:#222}
    .kpi-label{font-size:10px;color:#888;margin-top:2px}
    .alert-box{background:#fef2f2;border-left:3px solid #c41e3a;padding:8px 12px;margin-top:8px;border-radius:0 4px 4px 0}
    .footer{padding:16px 24px;text-align:center;font-size:10px;color:#999}
  </style></head><body>
  <div class="container">
    <div class="header">
      <h1>ALMASA</h1>
      <p>Reporte Diario · ${r.fecha}</p>
    </div>
    <div class="section">
      <div class="section-title">Ventas</div>
      <div class="kpi-grid">
        <div class="kpi"><div class="kpi-value">${fmt(r.ventas_dia)}</div><div class="kpi-label">Ventas del día</div></div>
        <div class="kpi"><div class="kpi-value">${fmt(r.ventas_mes)}</div><div class="kpi-label">Ventas del mes</div></div>
        <div class="kpi"><div class="kpi-value">${r.pedidos_dia}</div><div class="kpi-label">Pedidos hoy</div></div>
        <div class="kpi"><div class="kpi-value">${fmt(r.ticket_promedio)}</div><div class="kpi-label">Ticket promedio</div></div>
      </div>
    </div>
    <div class="section">
      <div class="section-title">Operación</div>
      <div class="kpi-grid">
        <div class="kpi"><div class="kpi-value">${r.entregas_dia}</div><div class="kpi-label">Entregas</div></div>
        <div class="kpi"><div class="kpi-value">${(r.porcentaje_on_time || 0).toFixed(0)}%</div><div class="kpi-label">On-time</div></div>
        <div class="kpi"><div class="kpi-value">${r.hojas_salida_generadas}</div><div class="kpi-label">Hojas Salida</div></div>
        <div class="kpi"><div class="kpi-value">${r.hojas_procesadas_ia}</div><div class="kpi-label">IA procesadas</div></div>
      </div>
    </div>
    <div class="section">
      <div class="section-title">Facturación</div>
      <div class="kpi-grid">
        <div class="kpi"><div class="kpi-value">${r.facturas_timbradas}</div><div class="kpi-label">Facturas timbradas</div></div>
        <div class="kpi"><div class="kpi-value">${fmt(r.monto_facturado_dia)}</div><div class="kpi-label">Monto facturado</div></div>
      </div>
    </div>
    <div class="section">
      <div class="section-title">Cobranza</div>
      <div class="kpi-grid">
        <div class="kpi"><div class="kpi-value">${fmt(r.cartera_total)}</div><div class="kpi-label">Cartera total</div></div>
        <div class="kpi"><div class="kpi-value">${fmt(r.cartera_vencida)}</div><div class="kpi-label">Vencida</div></div>
        <div class="kpi"><div class="kpi-value">${r.cobros_dia}</div><div class="kpi-label">Cobros hoy</div></div>
        <div class="kpi"><div class="kpi-value">${(r.porcentaje_vencido || 0).toFixed(1)}%</div><div class="kpi-label">% vencido</div></div>
      </div>
    </div>
    <div class="section">
      <div class="section-title">LA CORONA</div>
      <div class="kpi-grid">
        <div class="kpi"><div class="kpi-value">${r.alertas_dia}</div><div class="kpi-label">Alertas (${r.alertas_criticas} críticas)</div></div>
        <div class="kpi"><div class="kpi-value">${(r.score_promedio_empleados || 0).toFixed(0)}</div><div class="kpi-label">Score promedio</div></div>
      </div>
      ${r.empleados_bandera_roja > 0 ? `<div class="alert-box">⚠ ${r.empleados_bandera_roja} empleado(s) con bandera roja</div>` : ''}
      ${r.discrepancias_nuevas > 0 ? `<div class="alert-box">📋 ${r.discrepancias_nuevas} discrepancia(s) nueva(s)</div>` : ''}
    </div>
    <div class="footer">
      ALMASA-OS · Generado ${new Date().toLocaleString("es-MX")}<br>
      Este reporte se genera automáticamente a las 9pm.
    </div>
  </div></body></html>`;
}
