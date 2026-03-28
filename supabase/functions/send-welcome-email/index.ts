import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOGO = "https://vrcyjmfpteoccqdmdmqn.supabase.co/storage/v1/object/public/email-assets/logo-almasa.png";

interface WelcomeEmailRequest {
  empleado_id: string;
  email: string;
  nombre: string;
  puesto: string;
  fecha_ingreso: string;
  contrato_url: string | null;
  aviso_url: string | null;
}

// ═══ Gmail helpers — SAME as send-order-authorized-email ═══

async function refreshToken(rt: string) {
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: Deno.env.get("GMAIL_CLIENT_ID")!, client_secret: Deno.env.get("GMAIL_CLIENT_SECRET")!, refresh_token: rt, grant_type: "refresh_token" }) });
  return r.ok ? r.json() : null;
}

async function getToken(sb: any, c: any) {
  if (new Date(c.token_expires_at) > new Date(Date.now() + 300000)) return c.access_token;
  const t = await refreshToken(c.refresh_token);
  if (!t) return null;
  await sb.from("gmail_cuentas").update({ access_token: t.access_token, token_expires_at: new Date(Date.now() + t.expires_in * 1000).toISOString() }).eq("id", c.id);
  return t.access_token;
}

function rawEmail(from: string, to: string, subj: string, html: string) {
  const enc = new TextEncoder();
  const s64 = btoa(String.fromCharCode(...enc.encode(subj)));
  const b64 = btoa(String.fromCharCode(...enc.encode(html)));
  const bnd = `b_${Date.now()}`;
  const p = [`From: ALMASA <${from}>`,`To: ${to}`,`Subject: =?UTF-8?B?${s64}?=`,`MIME-Version: 1.0`,`Content-Type: multipart/mixed; boundary="${bnd}"`,``,`--${bnd}`,`Content-Type: text/html; charset=UTF-8`,`Content-Transfer-Encoding: base64`,``,b64];
  p.push(`--${bnd}--`);
  return btoa(p.join("\r\n")).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}

// ═══ HTML Template ═══

function buildHtml(d: WelcomeEmailRequest): string {
  const fecha = new Date(d.fecha_ingreso);
  const fechaFmt = fecha.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const fechaPrueba = new Date(fecha);
  fechaPrueba.setDate(fechaPrueba.getDate() + 90);
  const fechaPruebaFmt = fechaPrueba.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });

  const docsLinks = (d.contrato_url || d.aviso_url) ? `
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 20px">
<tr><td style="padding:8px 0;font-size:13px;font-weight:600;color:#222;border-bottom:1px solid #eee">Documentos firmados</td></tr>
${d.contrato_url ? `<tr><td style="padding:6px 0;font-size:13px"><a href="${d.contrato_url}" style="color:#222;text-decoration:underline">Descargar Contrato Individual</a></td></tr>` : ""}
${d.aviso_url ? `<tr><td style="padding:6px 0;font-size:13px"><a href="${d.aviso_url}" style="color:#222;text-decoration:underline">Descargar Aviso de Privacidad</a></td></tr>` : ""}
<tr><td style="padding:4px 0;font-size:11px;color:#888">Los enlaces son válidos por 7 días.</td></tr>
</table>` : "";

  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:24px 0;font-family:Arial,Helvetica,sans-serif"><tr><td align="center"><table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;background:#fff;border-radius:4px;overflow:hidden;border:1px solid #e0e0e0">
<tr><td style="padding:28px 36px;border-bottom:1px solid #eee;text-align:center"><p style="margin:0 0 0;color:#999;font-size:11px;font-style:italic;letter-spacing:1px">Desde 1904</p><img src="${LOGO}" alt="ALMASA" width="180" style="display:inline-block;max-width:180px;height:auto"/><p style="margin:4px 0 0;font-size:10px;color:#888;text-transform:uppercase;letter-spacing:2px;font-weight:600">Trabajando por un México mejor</p></td></tr>
<tr><td style="padding:28px 36px">
<h2 style="margin:0 0 20px;font-size:18px;color:#222;font-weight:700">¡Bienvenido/a a la familia ALMASA!</h2>
<p style="color:#444;font-size:14px;line-height:1.6;margin:0 0 20px">Estimado/a <strong>${d.nombre}</strong>, nos da mucho gusto que te incorpores a nuestro equipo como <strong>${d.puesto}</strong>.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 20px">
<tr><td style="padding:6px 0;color:#888;font-size:13px;border-bottom:1px solid #f0f0f0;width:140px">Fecha de inicio</td><td style="padding:6px 0;color:#222;font-size:14px;border-bottom:1px solid #f0f0f0;font-weight:700">${fechaFmt}</td></tr>
<tr><td style="padding:6px 0;color:#888;font-size:13px;border-bottom:1px solid #f0f0f0">Horario</td><td style="padding:6px 0;color:#222;font-size:14px;border-bottom:1px solid #f0f0f0">Lunes a sábado de 8:00 a 18:00 hrs</td></tr>
<tr><td style="padding:6px 0;color:#888;font-size:13px;border-bottom:1px solid #f0f0f0">Periodo de prueba</td><td style="padding:6px 0;color:#222;font-size:14px;border-bottom:1px solid #f0f0f0">90 días (vence el ${fechaPruebaFmt})</td></tr>
<tr><td style="padding:6px 0;color:#888;font-size:13px;border-bottom:1px solid #f0f0f0">Presentarse con</td><td style="padding:6px 0;color:#222;font-size:14px;border-bottom:1px solid #f0f0f0">Identificación oficial vigente (INE)</td></tr>
</table>
${docsLinks}
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 20px">
<tr><td style="padding:8px 0;font-size:13px;font-weight:600;color:#222;border-bottom:1px solid #eee">Documentos que necesitarás</td></tr>
<tr><td style="padding:4px 0;font-size:12px;color:#555">• Acta de nacimiento (original y copia)</td></tr>
<tr><td style="padding:4px 0;font-size:12px;color:#555">• CURP</td></tr>
<tr><td style="padding:4px 0;font-size:12px;color:#555">• RFC (Constancia de Situación Fiscal)</td></tr>
<tr><td style="padding:4px 0;font-size:12px;color:#555">• Comprobante de domicilio reciente</td></tr>
<tr><td style="padding:4px 0;font-size:12px;color:#555">• Número de Seguro Social (NSS / IMSS)</td></tr>
<tr><td style="padding:4px 0;font-size:12px;color:#555">• Cuenta bancaria para depósito de nómina</td></tr>
<tr><td style="padding:4px 0;font-size:12px;color:#555">• 2 fotografías tamaño infantil</td></tr>
</table>
<p style="color:#555;font-size:13px;margin:0 0 8px;line-height:1.5">Si tienes alguna duda, no dudes en contactarnos.</p>
<p style="color:#222;font-size:16px;font-weight:700;margin:16px 0 0">¡Trabajando por un México mejor!</p>
</td></tr>
<tr><td style="padding:20px 36px;border-top:1px solid #eee"><p style="margin:0 0 4px;color:#666;font-size:11px;font-weight:600">Recursos Humanos — ALMASA</p><p style="margin:0;color:#999;font-size:10px;line-height:1.6">Melchor Ocampo #59, Col. Magdalena Mixiuhca, C.P. 15850, CDMX<br>Tel: 55 5552-0168 / 55 5552-7887</p><p style="margin:6px 0 0;color:#bbb;font-size:10px">Correo generado automáticamente. No responder.</p></td></tr>
</table></td></tr></table>`;
}

// ═══ Main handler ═══

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body: WelcomeEmailRequest = await req.json();
    console.log("[send-welcome-email] To:", body.email, "Nombre:", body.nombre);
    if (!body.email || !body.nombre) throw new Error("email y nombre son requeridos");

    // Try 1904@almasa.com.mx first, then any active account
    const sender = "1904@almasa.com.mx";
    let gc: any = null;
    const { data: gc1 } = await sb.from("gmail_cuentas").select("*").eq("email", sender).eq("activo", true).single();
    if (gc1) { gc = gc1; } else {
      const { data: gc2 } = await sb.from("gmail_cuentas").select("*").eq("activo", true).limit(1).single();
      gc = gc2;
    }
    if (!gc) {
      console.warn("[send-welcome-email] No hay cuenta Gmail activa");
      return new Response(JSON.stringify({ success: true, email_sent: false, reason: "no_gmail_account" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const at = await getToken(sb, gc);
    if (!at) throw new Error(`No token para ${gc.email}`);

    const subj = `¡Bienvenido/a a la familia ALMASA! — ${body.nombre}`;
    const html = buildHtml(body);
    const raw = rawEmail(gc.email, body.email, subj, html);

    const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", { method: "POST", headers: { Authorization: `Bearer ${at}`, "Content-Type": "application/json" }, body: JSON.stringify({ raw }) });
    if (!res.ok) { const e = await res.text(); throw new Error(`Gmail: ${e}`); }
    const r = await res.json();
    console.log(`[send-welcome-email] Enviado via ${gc.email} → ${body.email}, msgId: ${r.id}`);

    return new Response(JSON.stringify({ success: true, email_sent: true, gmail_message_id: r.id, via: gc.email }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("[send-welcome-email] Error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
