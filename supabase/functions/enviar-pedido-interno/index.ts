import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PedidoInternoPayload {
  folio: string;
  clienteNombre: string;
  vendedorNombre: string;
  terminoCredito: string;
  direccionEntrega: string;
  total: number;
  pedidoId?: string;
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
  return labels[term] || term.replace("_", " ");
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
    `From: Pedidos ALMASA <${from}>`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${subjectB64}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    bodyB64,
  ];

  if (pdfBase64 && pdfFilename) {
    parts.push(
      `--${boundary}`,
      `Content-Type: application/pdf; name="${pdfFilename}"`,
      `Content-Disposition: attachment; filename="${pdfFilename}"`,
      `Content-Transfer-Encoding: base64`,
      ``,
      pdfBase64,
    );
  }

  parts.push(`--${boundary}--`);
  const email = parts.join("\r\n");
  return btoa(email).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function buildEmailHtml(data: PedidoInternoPayload): string {
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f9fafb;">
<div style="max-width:600px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
  <div style="background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);padding:28px 32px;color:#fff;">
    <h1 style="margin:0 0 4px;font-size:22px;font-weight:700;">ALMASA — Nuevo Pedido</h1>
    <p style="margin:0;font-size:18px;font-weight:700;">${data.folio}</p>
  </div>
  <div style="padding:28px 32px;font-size:15px;color:#333;line-height:1.7;">
    <p>Estimado Abarrotes La Manita,</p>
    <p>El vendedor <strong>${data.vendedorNombre}</strong> ha creado un nuevo pedido para el cliente <strong>${data.clienteNombre}</strong> con dirección de entrega en <strong>${data.direccionEntrega}</strong> con un plazo de <strong>${formatCreditTerm(data.terminoCredito)}</strong>.</p>
    <p style="margin-top:12px;padding:14px;background:#fef3c7;border-radius:8px;border-left:4px solid #f59e0b;font-weight:600;">
      Total del pedido: ${formatCurrency(data.total)}
    </p>
    <p style="margin-top:16px;font-weight:600;">Favor de imprimir el PDF adjunto.</p>
  </div>
  <div style="background:#f3f4f6;padding:16px 32px;text-align:center;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">Este mensaje fue generado automáticamente por el sistema de pedidos ALMASA</p>
  </div>
</div>
</body></html>`;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: PedidoInternoPayload = await req.json();

    if (!payload.folio || !payload.clienteNombre) {
      return new Response(JSON.stringify({ error: "Payload inválido" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`[enviar-pedido-interno] Procesando pedido ${payload.folio} para ${payload.clienteNombre}`);

    const senderEmail = "pedidos@almasa.com.mx";
    const { data: gmailCuenta, error: gmailError } = await supabase
      .from("gmail_cuentas").select("*").eq("email", senderEmail).eq("activo", true).single();

    if (gmailError || !gmailCuenta) throw new Error(`Cuenta de Gmail ${senderEmail} no configurada`);

    const accessToken = await getValidAccessToken(supabase, gmailCuenta);
    if (!accessToken) throw new Error(`No se pudo obtener token para ${senderEmail}`);

    const html = buildEmailHtml(payload);
    const subject = `📦 Nuevo Pedido ${payload.folio} — ${payload.clienteNombre} — ${formatCurrency(payload.total)}`;

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
