import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ProductoEmail {
  cantidad: number;
  unidad: string;
  nombre: string;
  precioUnitario: number;
  importe: number;
}

interface PedidoInternoPayload {
  folio: string;
  clienteNombre: string;
  vendedorNombre: string;
  terminoCredito: string;
  direccionEntrega: string;
  sucursalNombre?: string;
  total: number;
  subtotal?: number;
  impuestos?: number;
  fecha?: string;
  pedidoId?: string;
  productos?: ProductoEmail[];
  pdfBase64?: string;
  pdfFilename?: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(amount);
}

function formatCreditTerm(term: string): string {
  const labels: Record<string, string> = {
    contado: "Contado", "8_dias": "8 días", "15_dias": "15 días",
    "30_dias": "30 días", "60_dias": "60 días",
  };
  return labels[term] || term.replace(/_/g, " ");
}

// --- Gmail helpers ---
async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  const GMAIL_CLIENT_ID = Deno.env.get("GMAIL_CLIENT_ID");
  const GMAIL_CLIENT_SECRET = Deno.env.get("GMAIL_CLIENT_SECRET");
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: GMAIL_CLIENT_ID!, client_secret: GMAIL_CLIENT_SECRET!,
        refresh_token: refreshToken, grant_type: "refresh_token",
      }),
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

function buildRawEmailWithAttachment(from: string, to: string, subject: string, htmlBody: string, pdfBase64?: string, pdfFilename?: string): string {
  const encoder = new TextEncoder();
  const subjectB64 = btoa(String.fromCharCode(...encoder.encode(subject)));
  const bodyB64 = btoa(String.fromCharCode(...encoder.encode(htmlBody)));
  const boundary = `boundary_${Date.now()}`;

  const parts = [
    `From: Pedidos ALMASA <${from}>`, `To: ${to}`,
    `Subject: =?UTF-8?B?${subjectB64}?=`, `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`, ``,
    `--${boundary}`, `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`, ``, bodyB64,
  ];

  if (pdfBase64 && pdfFilename) {
    parts.push(`--${boundary}`,
      `Content-Type: application/pdf; name="${pdfFilename}"`,
      `Content-Disposition: attachment; filename="${pdfFilename}"`,
      `Content-Transfer-Encoding: base64`, ``, pdfBase64);
  }

  parts.push(`--${boundary}--`);
  const email = parts.join("\r\n");
  return btoa(email).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function buildEmailHtml(data: PedidoInternoPayload): string {
  const fecha = data.fecha
    ? new Date(data.fecha).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
    : new Date().toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

  let productosHtml = "";
  if (data.productos && data.productos.length > 0) {
    const rows = data.productos.map((p, i) => {
      const bg = i % 2 === 0 ? "" : ' style="background:#f8fafc"';
      return `<tr${bg}>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:13px">${p.cantidad} ${p.unidad}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:13px">${p.nombre}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-size:13px">${formatCurrency(p.precioUnitario)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-size:13px;font-weight:600">${formatCurrency(p.importe)}</td>
      </tr>`;
    }).join("");

    productosHtml = `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:20px 0">
      <thead><tr style="background:#1e3a5f">
        <th style="padding:10px 12px;text-align:center;color:#fff;font-size:12px;font-weight:600">Cant.</th>
        <th style="padding:10px 12px;text-align:left;color:#fff;font-size:12px;font-weight:600">Producto</th>
        <th style="padding:10px 12px;text-align:right;color:#fff;font-size:12px;font-weight:600">P. Unit.</th>
        <th style="padding:10px 12px;text-align:right;color:#fff;font-size:12px;font-weight:600">Importe</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  }

  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0f0;padding:20px 0;font-family:Arial,Helvetica,sans-serif">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden">
      <tr><td style="background:#C8102E;padding:28px 40px;text-align:center">
        <h1 style="margin:0;color:#ffffff;font-size:32px;font-weight:800;letter-spacing:3px;font-family:Arial,Helvetica,sans-serif">ALMASA</h1>
        <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:12px;letter-spacing:1px;text-transform:uppercase">Abarrotes la Manita SA de CV</p>
      </td></tr>
      <tr><td style="background:#1e3a5f;padding:14px 40px;text-align:center">
        <p style="margin:0;color:#ffffff;font-size:17px;font-weight:700;letter-spacing:0.5px">NUEVO PEDIDO &mdash; ${data.folio}</p>
      </td></tr>
      <tr><td style="padding:28px 32px">
        <p style="color:#374151;font-size:15px;margin:0 0 20px;line-height:1.5">Se ha registrado un nuevo pedido en el sistema.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:24px">
          <tr style="background:#f8fafc">
            <td style="padding:10px 14px;border:1px solid #e2e8f0;color:#64748b;font-size:11px;width:35%;text-transform:uppercase;letter-spacing:0.5px;font-weight:700">CLIENTE</td>
            <td style="padding:10px 14px;border:1px solid #e2e8f0;color:#1e293b;font-size:14px;font-weight:700">${data.clienteNombre}</td>
          </tr>
          <tr>
            <td style="padding:10px 14px;border:1px solid #e2e8f0;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;font-weight:700">VENDEDOR</td>
            <td style="padding:10px 14px;border:1px solid #e2e8f0;color:#1e293b;font-size:14px">${data.vendedorNombre}</td>
          </tr>
          <tr style="background:#f8fafc">
            <td style="padding:10px 14px;border:1px solid #e2e8f0;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;font-weight:700">SUCURSAL</td>
            <td style="padding:10px 14px;border:1px solid #e2e8f0;color:#1e293b;font-size:14px">${data.sucursalNombre || data.direccionEntrega}</td>
          </tr>
          <tr>
            <td style="padding:10px 14px;border:1px solid #e2e8f0;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;font-weight:700">PLAZO</td>
            <td style="padding:10px 14px;border:1px solid #e2e8f0;color:#1e293b;font-size:14px">${formatCreditTerm(data.terminoCredito)}</td>
          </tr>
          <tr style="background:#f8fafc">
            <td style="padding:10px 14px;border:1px solid #e2e8f0;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;font-weight:700">FECHA</td>
            <td style="padding:10px 14px;border:1px solid #e2e8f0;color:#1e293b;font-size:14px">${fecha}</td>
          </tr>
        </table>
        <!-- Productos -->
        ${productosHtml}
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0">
          ${data.subtotal ? `<tr><td style="padding:6px 0;font-size:14px;color:#64748b">Subtotal</td><td style="padding:6px 0;text-align:right;font-size:14px;color:#374151">${formatCurrency(data.subtotal)}</td></tr>` : ""}
          ${data.impuestos ? `<tr><td style="padding:6px 0;font-size:14px;color:#64748b">Impuestos</td><td style="padding:6px 0;text-align:right;font-size:14px;color:#374151">${formatCurrency(data.impuestos)}</td></tr>` : ""}
          <tr><td colspan="2" style="padding:0"><div style="border-top:2px solid #C8102E;margin:8px 0"></div></td></tr>
          <tr><td style="padding:8px 0;font-size:22px;font-weight:800;color:#1e293b">TOTAL</td><td style="padding:8px 0;text-align:right;font-size:22px;font-weight:800;color:#C8102E">${formatCurrency(data.total)}</td></tr>
        </table>
        <p style="color:#64748b;font-size:13px;margin:20px 0 0;padding:12px 16px;background:#f0fdf4;border-left:3px solid #16a34a;border-radius:4px"><strong style="color:#15803d">Favor de imprimir PDF adjunto para su entrega.</strong></p>
      </td></tr>
      <tr><td style="background:#1e3a5f;padding:20px 32px;text-align:center">
        <p style="margin:0;color:rgba(255,255,255,0.7);font-size:11px;letter-spacing:0.5px">ALMASA &mdash; Abarrotes la Manita SA de CV</p>
        <p style="margin:4px 0 0;color:rgba(255,255,255,0.5);font-size:10px">Correo generado automaticamente &bull; No responder</p>
      </td></tr>
    </table>
  </td></tr>
</table>`;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: PedidoInternoPayload = await req.json();

    if (!payload.folio || !payload.clienteNombre) {
      return new Response(JSON.stringify({ error: "Payload invalido" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`[enviar-pedido-interno] Procesando pedido ${payload.folio} para ${payload.clienteNombre}, ${payload.productos?.length || 0} productos`);

    const senderEmail = "pedidos@almasa.com.mx";
    const { data: gmailCuenta, error: gmailError } = await supabase
      .from("gmail_cuentas").select("*").eq("email", senderEmail).eq("activo", true).single();

    if (gmailError || !gmailCuenta) throw new Error(`Cuenta de Gmail ${senderEmail} no configurada`);

    const accessToken = await getValidAccessToken(supabase, gmailCuenta);
    if (!accessToken) throw new Error(`No se pudo obtener token para ${senderEmail}`);

    const html = buildEmailHtml(payload);
    const subject = `Nuevo Pedido ${payload.folio} — ${payload.clienteNombre} — ${formatCurrency(payload.total)}`;

    const rawEmail = buildRawEmailWithAttachment(
      senderEmail, "pedidos@almasa.com.mx", subject, html,
      payload.pdfBase64, payload.pdfFilename
    );

    const sendResponse = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ raw: rawEmail }),
    });

    if (!sendResponse.ok) {
      const errorText = await sendResponse.text();
      console.error("Gmail API error:", errorText);
      throw new Error(`Error enviando email: ${errorText}`);
    }

    const sendResult = await sendResponse.json();
    console.log(`[enviar-pedido-interno] Email enviado para pedido ${payload.folio}, messageId: ${sendResult.id}`);

    await supabase.from("correos_enviados").insert({
      tipo: "pedido_interno", referencia_id: payload.folio,
      destinatario: "pedidos@almasa.com.mx", asunto: subject,
      contenido_preview: `Pedido ${payload.folio} - ${payload.clienteNombre}`,
      fecha_envio: new Date().toISOString(), gmail_cuenta_id: gmailCuenta.id,
      gmail_message_id: sendResult.id, error: null,
    });

    return new Response(JSON.stringify({ success: true, id: sendResult.id }), {
      status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err: any) {
    console.error("[enviar-pedido-interno] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
