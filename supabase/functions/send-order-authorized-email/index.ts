import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface SendOrderAuthorizedRequest {
  clienteEmail: string; clienteNombre: string; pedidoFolio: string;
  total: number; fechaEntrega?: string; ajustesPrecio: number;
  detalles: Array<{ producto: string; cantidad: number; unidad: string; precioUnitario: number; subtotal: number; precioAnterior?: number; fueAjustado: boolean; kgTotales?: number | null; precioPorKilo?: boolean; }>;
}

const LOGO = "https://vrcyjmfpteoccqdmdmqn.supabase.co/storage/v1/object/public/email-assets/logo-almasa.png";
const fmt = (n: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);

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
  const p = [`From: Pedidos ALMASA <${from}>`,`To: ${to}`,`Subject: =?UTF-8?B?${s64}?=`,`MIME-Version: 1.0`,`Content-Type: multipart/mixed; boundary="${bnd}"`,``,`--${bnd}`,`Content-Type: text/html; charset=UTF-8`,`Content-Transfer-Encoding: base64`,``,b64,`--${bnd}--`];
  return btoa(p.join("\r\n")).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { clienteEmail, clienteNombre, pedidoFolio, total, ajustesPrecio, detalles }: SendOrderAuthorizedRequest = await req.json();
    console.log("[send-order-authorized-email] To:", clienteEmail, "Folio:", pedidoFolio, "Total:", total);
    if (!clienteEmail || !pedidoFolio) throw new Error("Email y folio requeridos");

    const sender = "pedidos@almasa.com.mx";
    const { data: gc, error: ge } = await sb.from("gmail_cuentas").select("*").eq("email", sender).eq("activo", true).single();
    if (ge || !gc) throw new Error(`Gmail ${sender} no configurada`);
    const at = await getToken(sb, gc);
    if (!at) throw new Error(`No token para ${sender}`);

    let subj = `Pedido Confirmado — ${pedidoFolio}`;
    if (ajustesPrecio > 0) subj = `Pedido Confirmado (${ajustesPrecio} ajuste${ajustesPrecio > 1 ? "s" : ""}) — ${pedidoFolio}`;

    let alertHtml = "";
    if (ajustesPrecio > 0) alertHtml = `<p style="margin:16px 0;padding:10px 14px;background:#fafafa;border-left:3px solid #C8102E;font-size:13px;color:#555">Se realizaron ${ajustesPrecio} ajuste${ajustesPrecio > 1 ? "s" : ""} de precio. Los productos ajustados estan marcados abajo.</p>`;

    const hasKg = detalles.some(d => d.kgTotales && d.kgTotales > 0);
    const rows = detalles.map((d, i) => {
      const bg = d.fueAjustado ? "background:#fff8f0;" : (i % 2 ? "background:#fafafa;" : "");
      const price = d.fueAjustado && d.precioAnterior ? `<span style="text-decoration:line-through;color:#bbb;font-size:12px">${fmt(d.precioAnterior)}</span> ${fmt(d.precioUnitario)}` : `${fmt(d.precioUnitario)}${d.precioPorKilo ? "/kg" : ""}`;
      const kgCell = hasKg ? `<td style="padding:7px 10px;border-bottom:1px solid #eee;font-size:13px;text-align:right;color:#666">${d.kgTotales ? d.kgTotales.toLocaleString("es-MX") + " kg" : ""}</td>` : "";
      return `<tr style="${bg}"><td style="padding:7px 10px;border-bottom:1px solid #eee;font-size:13px">${d.producto}${d.fueAjustado ? " *" : ""}</td><td style="padding:7px 10px;border-bottom:1px solid #eee;font-size:13px;text-align:center">${d.cantidad} ${d.unidad}</td>${kgCell}<td style="padding:7px 10px;border-bottom:1px solid #eee;font-size:13px;text-align:right">${price}</td><td style="padding:7px 10px;border-bottom:1px solid #eee;font-size:13px;text-align:right;font-weight:600">${fmt(d.subtotal)}</td></tr>`;
    }).join("");
    const kgHeader = hasKg ? `<th style="padding:8px 10px;text-align:right;font-size:11px;color:#888;text-transform:uppercase;font-weight:600">Kg</th>` : "";

    const emailHtml = `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:24px 0;font-family:Arial,Helvetica,sans-serif"><tr><td align="center"><table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;background:#fff;border-radius:4px;overflow:hidden;border:1px solid #e0e0e0">
<tr><td style="padding:28px 36px;border-bottom:1px solid #eee"><table width="100%"><tr><td><img src="${LOGO}" alt="ALMASA" width="120" style="display:block;max-width:120px;height:auto"/></td><td style="text-align:right;vertical-align:bottom"><p style="margin:0;color:#444;font-size:12px;font-weight:600">Abarrotes la Manita SA de CV</p><p style="margin:2px 0 0;color:#999;font-size:11px;font-style:italic">Desde 1904</p></td></tr></table></td></tr>
<tr><td style="padding:28px 36px">
<h2 style="margin:0 0 6px;font-size:18px;color:#222;font-weight:700">Pedido Confirmado</h2>
<p style="margin:0 0 20px;color:#888;font-size:14px">${pedidoFolio}</p>
<p style="color:#444;font-size:14px;line-height:1.6;margin:0 0 20px">Estimado(a) <strong>${clienteNombre}</strong>, su pedido ha sido confirmado y sera programado para entrega.</p>
${alertHtml}
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:20px 0"><thead><tr style="border-bottom:2px solid #C8102E"><th style="padding:8px 10px;text-align:left;font-size:11px;color:#888;text-transform:uppercase;font-weight:600">Producto</th><th style="padding:8px 10px;text-align:center;font-size:11px;color:#888;text-transform:uppercase;font-weight:600">Cant.</th>${kgHeader}<th style="padding:8px 10px;text-align:right;font-size:11px;color:#888;text-transform:uppercase;font-weight:600">Precio</th><th style="padding:8px 10px;text-align:right;font-size:11px;color:#888;text-transform:uppercase;font-weight:600">Importe</th></tr></thead><tbody>${rows}</tbody></table>
<table width="100%" style="margin-top:8px"><tr><td style="border-top:2px solid #222;padding:12px 0"><table width="100%"><tr><td style="font-size:18px;font-weight:800;color:#222">Total</td><td style="text-align:right;font-size:18px;font-weight:800;color:#222">${fmt(total)}</td></tr></table></td></tr></table>
<p style="color:#888;font-size:13px;margin:24px 0 0;line-height:1.5">Si tiene alguna pregunta sobre su pedido, no dude en contactarnos.</p>
</td></tr>
<tr><td style="padding:20px 36px;border-top:1px solid #eee"><p style="margin:0 0 4px;color:#666;font-size:11px;font-weight:600">Departamento de Pedidos</p><p style="margin:0;color:#999;font-size:10px;line-height:1.6">Melchor Ocampo #59, Col. Magdalena Mixiuhca, C.P. 15850, CDMX<br>Tel: 55 5552-0168 / 55 5552-7887 &bull; 1904@almasa.com.mx</p><p style="margin:6px 0 0;color:#bbb;font-size:10px">Correo generado automaticamente. No responder.</p></td></tr>
</table></td></tr></table>`;

    const raw = rawEmail(sender, clienteEmail, subj, emailHtml);
    const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", { method: "POST", headers: { Authorization: `Bearer ${at}`, "Content-Type": "application/json" }, body: JSON.stringify({ raw }) });
    if (!res.ok) { const e = await res.text(); throw new Error(`Gmail: ${e}`); }
    const r = await res.json();
    console.log(`[send-order-authorized-email] Enviado a ${clienteEmail}, msgId: ${r.id}`);
    await sb.from("correos_enviados").insert({ tipo: "pedido_autorizado_cliente", referencia_id: pedidoFolio, destinatario: clienteEmail, asunto: subj, contenido_preview: `Pedido ${pedidoFolio} confirmado - ${clienteNombre}`, fecha_envio: new Date().toISOString(), gmail_cuenta_id: gc.id, gmail_message_id: r.id, error: null });
    return new Response(JSON.stringify({ success: true, emailId: r.id }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (error: any) {
    console.error("[send-order-authorized-email] Error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});
