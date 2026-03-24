import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface SendOrderAuthorizedRequest {
  clienteEmail: string;
  clienteNombre: string;
  pedidoFolio: string;
  total: number;
  fechaEntrega: string;
  ajustesPrecio: number;
  detalles: Array<{
    producto: string;
    cantidad: number;
    unidad: string;
    precioUnitario: number;
    subtotal: number;
    precioAnterior?: number;
    fueAjustado: boolean;
  }>;
}

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  const GMAIL_CLIENT_ID = Deno.env.get("GMAIL_CLIENT_ID");
  const GMAIL_CLIENT_SECRET = Deno.env.get("GMAIL_CLIENT_SECRET");
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: GMAIL_CLIENT_ID!, client_secret: GMAIL_CLIENT_SECRET!, refresh_token: refreshToken, grant_type: "refresh_token" }),
    });
    if (!response.ok) { console.error("Failed to refresh token:", await response.text()); return null; }
    return response.json();
  } catch (error: any) { console.error("Token refresh error:", error.message); return null; }
}

async function getValidAccessToken(supabase: any, cuenta: any): Promise<string | null> {
  const now = new Date();
  const tokenExpiry = new Date(cuenta.token_expires_at);
  if (tokenExpiry > new Date(now.getTime() + 5 * 60 * 1000)) return cuenta.access_token;
  if (!cuenta.refresh_token) { console.error("No refresh token for:", cuenta.email); return null; }
  const newTokens = await refreshAccessToken(cuenta.refresh_token);
  if (!newTokens) return null;
  const newExpiry = new Date(Date.now() + newTokens.expires_in * 1000);
  await supabase.from("gmail_cuentas").update({ access_token: newTokens.access_token, token_expires_at: newExpiry.toISOString() }).eq("id", cuenta.id);
  return newTokens.access_token;
}

function buildRawEmail(from: string, to: string, subject: string, htmlBody: string): string {
  const encoder = new TextEncoder();
  const subjectB64 = btoa(String.fromCharCode(...encoder.encode(subject)));
  const bodyB64 = btoa(String.fromCharCode(...encoder.encode(htmlBody)));
  const boundary = `boundary_${Date.now()}`;
  const parts = [
    `From: Pedidos ALMASA <${from}>`, `To: ${to}`,
    `Subject: =?UTF-8?B?${subjectB64}?=`, `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`, ``,
    `--${boundary}`, `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`, ``, bodyB64, `--${boundary}--`,
  ];
  return btoa(parts.join("\r\n")).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fmt(amount: number): string {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(amount);
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { clienteEmail, clienteNombre, pedidoFolio, total, fechaEntrega, ajustesPrecio, detalles }: SendOrderAuthorizedRequest = await req.json();
    console.log("[send-order-authorized-email] To:", clienteEmail, "Folio:", pedidoFolio);
    if (!clienteEmail || !pedidoFolio) throw new Error("Email y folio requeridos");

    const senderEmail = "pedidos@almasa.com.mx";
    const { data: gmailCuenta, error: gmailError } = await supabase.from("gmail_cuentas").select("*").eq("email", senderEmail).eq("activo", true).single();
    if (gmailError || !gmailCuenta) throw new Error(`Gmail ${senderEmail} no configurada`);
    const accessToken = await getValidAccessToken(supabase, gmailCuenta);
    if (!accessToken) throw new Error(`No se pudo obtener token para ${senderEmail}`);

    const formattedTotal = fmt(total);
    const formattedDate = new Date(fechaEntrega).toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    let subject = `Pedido Programado - ${pedidoFolio}`;
    if (ajustesPrecio > 0) subject = `Pedido Programado (${ajustesPrecio} ajuste${ajustesPrecio > 1 ? "s" : ""}) - ${pedidoFolio}`;

    let alertBanner = "";
    if (ajustesPrecio > 0) alertBanner = `<div style="background:#FEF3C7;border:1px solid #F59E0B;border-radius:8px;padding:15px;margin:20px 0"><p style="margin:0;color:#92400E;font-weight:600">Hubo ${ajustesPrecio} ajuste${ajustesPrecio > 1 ? "s" : ""} de precio en su pedido</p></div>`;

    const rows = detalles.map((d, i) => {
      const bg = d.fueAjustado ? "background:#FEF9C3;" : (i % 2 ? "background:#f8fafc;" : "");
      const price = d.fueAjustado && d.precioAnterior ? `<span style="text-decoration:line-through;color:#999;font-size:12px">${fmt(d.precioAnterior)}</span><br><strong style="color:#B45309">${fmt(d.precioUnitario)}</strong>` : fmt(d.precioUnitario);
      return `<tr style="${bg}"><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:13px">${d.producto}${d.fueAjustado ? " <span style='color:#B45309;font-size:11px'>(ajustado)</span>" : ""}</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:13px">${d.cantidad} ${d.unidad}</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-size:13px">${price}</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-size:13px;font-weight:600">${fmt(d.subtotal)}</td></tr>`;
    }).join("");

    const emailHtml = `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0f0;padding:20px 0;font-family:Arial,Helvetica,sans-serif">
<tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:8px;overflow:hidden">
  <tr><td style="background:#C8102E;padding:28px 40px;text-align:center">
    <h1 style="margin:0;color:#fff;font-size:32px;font-weight:800;letter-spacing:3px">ALMASA</h1>
    <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:12px;letter-spacing:1px;text-transform:uppercase">Abarrotes la Manita SA de CV</p>
  </td></tr>
  <tr><td style="background:#16a34a;padding:14px 40px;text-align:center">
    <p style="margin:0;color:#fff;font-size:17px;font-weight:700;letter-spacing:0.5px">PEDIDO PROGRAMADO</p>
  </td></tr>
  <tr><td style="padding:28px 32px">
    ${alertBanner}
    <p style="color:#374151;font-size:15px;margin:0 0 16px;line-height:1.5">Estimado(a) <strong>${clienteNombre}</strong>,</p>
    <p style="color:#374151;font-size:15px;margin:0 0 20px;line-height:1.5">Su pedido ha sido autorizado y programado para entrega:</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 20px">
      <tr style="background:#f8fafc"><td style="padding:10px 14px;border:1px solid #e2e8f0;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;font-weight:700">FOLIO</td><td style="padding:10px 14px;border:1px solid #e2e8f0;color:#1e293b;font-size:14px;font-weight:700">${pedidoFolio}</td></tr>
      <tr><td style="padding:10px 14px;border:1px solid #e2e8f0;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;font-weight:700">ENTREGA</td><td style="padding:10px 14px;border:1px solid #e2e8f0;color:#1e293b;font-size:14px">${formattedDate}</td></tr>
      <tr style="background:#f8fafc"><td style="padding:10px 14px;border:1px solid #e2e8f0;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;font-weight:700">TOTAL</td><td style="padding:10px 14px;border:1px solid #e2e8f0;font-size:20px;font-weight:800;color:#16a34a">${formattedTotal}</td></tr>
    </table>
    <table style="width:100%;border-collapse:collapse;margin:20px 0"><thead><tr style="background:#1e3a5f"><th style="padding:10px 12px;text-align:left;color:#fff;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">Producto</th><th style="padding:10px 12px;text-align:center;color:#fff;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">Cant.</th><th style="padding:10px 12px;text-align:right;color:#fff;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">Precio</th><th style="padding:10px 12px;text-align:right;color:#fff;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">Subtotal</th></tr></thead><tbody>${rows}</tbody></table>
    <p style="color:#64748b;font-size:13px;margin-top:24px;line-height:1.5">Si tiene alguna pregunta sobre su pedido, no dude en contactarnos.</p>
  </td></tr>
  <tr><td style="background:#1e3a5f;padding:20px 32px;text-align:center">
    <p style="margin:0;color:rgba(255,255,255,0.7);font-size:11px;letter-spacing:0.5px">ALMASA &mdash; Abarrotes la Manita SA de CV</p>
    <p style="margin:4px 0 0;color:rgba(255,255,255,0.5);font-size:10px">Correo generado automaticamente &bull; No responder</p>
  </td></tr>
</table></td></tr></table>`;

    const rawEmail = buildRawEmail(senderEmail, clienteEmail, subject, emailHtml);
    const sendResponse = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ raw: rawEmail }),
    });

    if (!sendResponse.ok) { const e = await sendResponse.text(); console.error("Gmail API error:", e); throw new Error(`Gmail error: ${e}`); }
    const sendResult = await sendResponse.json();
    console.log(`[send-order-authorized-email] Enviado a ${clienteEmail}, msgId: ${sendResult.id}`);

    await supabase.from("correos_enviados").insert({ tipo: "pedido_autorizado_cliente", referencia_id: pedidoFolio, destinatario: clienteEmail, asunto: subject, contenido_preview: `Pedido ${pedidoFolio} autorizado - ${clienteNombre}`, fecha_envio: new Date().toISOString(), gmail_cuenta_id: gmailCuenta.id, gmail_message_id: sendResult.id, error: null });

    return new Response(JSON.stringify({ success: true, emailId: sendResult.id }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (error: any) {
    console.error("[send-order-authorized-email] Error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});
