import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ProductoEmail { cantidad: number; unidad: string; nombre: string; precioUnitario: number; importe: number; }

interface PedidoInternoPayload {
  folio: string; clienteNombre: string; vendedorNombre: string;
  terminoCredito: string; direccionEntrega: string; sucursalNombre?: string;
  total: number; subtotal?: number; impuestos?: number; fecha?: string;
  pedidoId?: string; productos?: ProductoEmail[];
  pdfBase64?: string; pdfFilename?: string;
}

const LOGO = "https://vrcyjmfpteoccqdmdmqn.supabase.co/storage/v1/object/public/email-assets/logo-almasa.png";
const fmt = (n: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
const fmtTerm = (t: string) => ({ contado: "Contado", "8_dias": "8 días", "15_dias": "15 días", "30_dias": "30 días", "60_dias": "60 días" }[t] || t.replace(/_/g, " "));

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

function rawEmail(from: string, to: string, subj: string, html: string, pdf64?: string, pdfName?: string) {
  const enc = new TextEncoder();
  const s64 = btoa(String.fromCharCode(...enc.encode(subj)));
  const b64 = btoa(String.fromCharCode(...enc.encode(html)));
  const bnd = `b_${Date.now()}`;
  const p = [`From: Pedidos ALMASA <${from}>`,`To: ${to}`,`Subject: =?UTF-8?B?${s64}?=`,`MIME-Version: 1.0`,`Content-Type: multipart/mixed; boundary="${bnd}"`,``,`--${bnd}`,`Content-Type: text/html; charset=UTF-8`,`Content-Transfer-Encoding: base64`,``,b64];
  if (pdf64 && pdfName) p.push(`--${bnd}`,`Content-Type: application/pdf; name="${pdfName}"`,`Content-Disposition: attachment; filename="${pdfName}"`,`Content-Transfer-Encoding: base64`,``,pdf64);
  p.push(`--${bnd}--`);
  return btoa(p.join("\r\n")).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}

function buildHtml(d: PedidoInternoPayload): string {
  const fecha = d.fecha ? new Date(d.fecha).toLocaleDateString("es-MX",{weekday:"short",day:"numeric",month:"short",year:"numeric"}) : new Date().toLocaleDateString("es-MX",{weekday:"short",day:"numeric",month:"short",year:"numeric"});
  const row = (label: string, val: string, bold = false) => `<tr><td style="padding:8px 0;color:#888;font-size:13px;border-bottom:1px solid #f0f0f0;width:140px">${label}</td><td style="padding:8px 0;color:#222;font-size:14px;border-bottom:1px solid #f0f0f0;${bold?"font-weight:700":""}"> ${val}</td></tr>`;
  let prodHtml = "";
  if (d.productos?.length) {
    const rows = d.productos.map((p,i) => `<tr style="${i%2?"background:#fafafa":""}"><td style="padding:7px 10px;border-bottom:1px solid #eee;font-size:13px;text-align:center">${p.cantidad} ${p.unidad}</td><td style="padding:7px 10px;border-bottom:1px solid #eee;font-size:13px">${p.nombre}</td><td style="padding:7px 10px;border-bottom:1px solid #eee;font-size:13px;text-align:right">${fmt(p.precioUnitario)}</td><td style="padding:7px 10px;border-bottom:1px solid #eee;font-size:13px;text-align:right;font-weight:600">${fmt(p.importe)}</td></tr>`).join("");
    prodHtml = `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:20px 0"><thead><tr style="border-bottom:2px solid #C8102E"><th style="padding:8px 10px;text-align:center;font-size:11px;color:#888;text-transform:uppercase;font-weight:600">Cant.</th><th style="padding:8px 10px;text-align:left;font-size:11px;color:#888;text-transform:uppercase;font-weight:600">Producto</th><th style="padding:8px 10px;text-align:right;font-size:11px;color:#888;text-transform:uppercase;font-weight:600">P. Unit.</th><th style="padding:8px 10px;text-align:right;font-size:11px;color:#888;text-transform:uppercase;font-weight:600">Importe</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:24px 0;font-family:Arial,Helvetica,sans-serif"><tr><td align="center"><table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;background:#fff;border-radius:4px;overflow:hidden;border:1px solid #e0e0e0">
<tr><td style="padding:28px 36px;border-bottom:1px solid #eee"><table width="100%"><tr><td><img src="${LOGO}" alt="ALMASA" width="120" style="display:block;max-width:120px;height:auto"/></td><td style="text-align:right;vertical-align:bottom"><p style="margin:0;color:#888;font-size:11px">Abarrotes la Manita SA de CV</p></td></tr></table></td></tr>
<tr><td style="padding:28px 36px">
<h2 style="margin:0 0 20px;font-size:18px;color:#222;font-weight:700">Nuevo Pedido ${d.folio}</h2>
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
${row("Cliente",d.clienteNombre,true)}${row("Vendedor",d.vendedorNombre)}${row("Sucursal",d.sucursalNombre||d.direccionEntrega)}${row("Plazo",fmtTerm(d.terminoCredito))}${row("Fecha",fecha)}
</table>
${prodHtml}
<table width="100%" style="margin-top:16px"><tr><td style="border-top:2px solid #222;padding:12px 0"><table width="100%">
${d.subtotal?`<tr><td style="color:#888;font-size:13px;padding:2px 0">Subtotal</td><td style="text-align:right;font-size:13px;color:#444;padding:2px 0">${fmt(d.subtotal)}</td></tr>`:""}
${d.impuestos?`<tr><td style="color:#888;font-size:13px;padding:2px 0">Impuestos</td><td style="text-align:right;font-size:13px;color:#444;padding:2px 0">${fmt(d.impuestos)}</td></tr>`:""}
<tr><td style="font-size:18px;font-weight:800;color:#222;padding:4px 0">Total</td><td style="text-align:right;font-size:18px;font-weight:800;color:#222;padding:4px 0">${fmt(d.total)}</td></tr>
</table></td></tr></table>
<p style="margin:20px 0 0;padding:10px 14px;background:#f9f9f9;border-left:3px solid #C8102E;font-size:13px;color:#555">Favor de imprimir el PDF adjunto para su entrega.</p>
</td></tr>
<tr><td style="padding:16px 36px;border-top:1px solid #eee"><p style="margin:0;color:#aaa;font-size:11px">ALMASA — Correo generado automaticamente. No responder.</p></td></tr>
</table></td></tr></table>`;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const payload: PedidoInternoPayload = await req.json();
    if (!payload.folio || !payload.clienteNombre) return new Response(JSON.stringify({ error: "Payload invalido" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    console.log(`[enviar-pedido-interno] ${payload.folio} → ${payload.clienteNombre}, ${payload.productos?.length||0} productos, total: ${payload.total}`);
    const sender = "pedidos@almasa.com.mx";
    const { data: gc, error: ge } = await sb.from("gmail_cuentas").select("*").eq("email", sender).eq("activo", true).single();
    if (ge || !gc) throw new Error(`Gmail ${sender} no configurada`);
    const at = await getToken(sb, gc);
    if (!at) throw new Error(`No token para ${sender}`);
    const html = buildHtml(payload);
    const subj = `Nuevo Pedido ${payload.folio} — ${payload.clienteNombre} — ${fmt(payload.total)}`;
    const raw = rawEmail(sender, "pedidos@almasa.com.mx", subj, html, payload.pdfBase64, payload.pdfFilename);
    const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", { method: "POST", headers: { Authorization: `Bearer ${at}`, "Content-Type": "application/json" }, body: JSON.stringify({ raw }) });
    if (!res.ok) { const e = await res.text(); throw new Error(`Gmail: ${e}`); }
    const r = await res.json();
    console.log(`[enviar-pedido-interno] Enviado ${payload.folio}, msgId: ${r.id}`);
    await sb.from("correos_enviados").insert({ tipo: "pedido_interno", referencia_id: payload.folio, destinatario: "pedidos@almasa.com.mx", asunto: subj, contenido_preview: `Pedido ${payload.folio} - ${payload.clienteNombre}`, fecha_envio: new Date().toISOString(), gmail_cuenta_id: gc.id, gmail_message_id: r.id, error: null });
    return new Response(JSON.stringify({ success: true, id: r.id }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (err: any) {
    console.error("[enviar-pedido-interno] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});
