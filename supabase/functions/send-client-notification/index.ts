import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type NotificationType = 
  | "pedido_confirmado" 
  | "en_ruta" 
  | "entregado" 
  | "pedido_conciliado"
  | "pedido_conciliado_ajustado"
  | "vencimiento_proximo";

interface NotificationRequest {
  clienteId: string;
  tipo: NotificationType;
  data: {
    pedidoFolio?: string;
    facturaFolio?: string;
    fechaVencimiento?: string;
    diasRestantes?: number;
    total?: number;
    choferNombre?: string;
    horaEstimada?: string;
    horaEntrega?: string;
    nombreReceptor?: string;
    fechaEntrega?: string;
    diasCredito?: string;
    mensaje?: string;
  };
  pdfBase64?: string;
  pdfFilename?: string;
}

// Map notification type to email purposes
const TIPO_TO_PROPOSITOS: Record<NotificationType, string[]> = {
  pedido_confirmado: ["todo", "pedidos"],
  en_ruta: ["todo", "en_ruta", "entregas"],
  entregado: ["todo", "entregado", "entregas"],
  pedido_conciliado: ["todo", "entregas", "entregado"],
  pedido_conciliado_ajustado: ["todo", "entregas", "entregado"],
  vencimiento_proximo: ["todo", "cobranza"],
};

// Map notification type to sender email
const TIPO_TO_REMITENTE: Record<NotificationType, string> = {
  pedido_confirmado: "pedidos@almasa.com.mx",
  en_ruta: "pedidos@almasa.com.mx",
  entregado: "pedidos@almasa.com.mx",
  pedido_conciliado: "pedidos@almasa.com.mx",
  pedido_conciliado_ajustado: "pedidos@almasa.com.mx",
  vencimiento_proximo: "pagos@almasa.com.mx",
};

// Refresh Gmail access token
async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  const GMAIL_CLIENT_ID = Deno.env.get("GMAIL_CLIENT_ID");
  const GMAIL_CLIENT_SECRET = Deno.env.get("GMAIL_CLIENT_SECRET");

  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: GMAIL_CLIENT_ID!,
        client_secret: GMAIL_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      console.error("Failed to refresh token:", await response.text());
      return null;
    }

    return response.json();
  } catch (error: any) {
    console.error("Token refresh error:", error.message);
    return null;
  }
}

// Get valid access token, refreshing if needed
async function getValidAccessToken(supabase: any, cuenta: any): Promise<string | null> {
  const now = new Date();
  const tokenExpiry = new Date(cuenta.token_expires_at);

  // Token still valid (with 5 min buffer)
  if (tokenExpiry > new Date(now.getTime() + 5 * 60 * 1000)) {
    return cuenta.access_token;
  }

  if (!cuenta.refresh_token) {
    console.error("No refresh token available for:", cuenta.email);
    return null;
  }

  const newTokens = await refreshAccessToken(cuenta.refresh_token);
  if (!newTokens) {
    return null;
  }

  const newExpiry = new Date(Date.now() + newTokens.expires_in * 1000);
  await supabase
    .from("gmail_cuentas")
    .update({
      access_token: newTokens.access_token,
      token_expires_at: newExpiry.toISOString(),
    })
    .eq("id", cuenta.id);

  return newTokens.access_token;
}

// Build RFC 2822 email message
function buildRawEmail(from: string, to: string, subject: string, htmlBody: string, pdfBase64?: string, pdfFilename?: string): string {
  const boundary = `boundary_${Date.now()}`;
  
  const parts = [
    `From: Almasa <${from}>`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    btoa(unescape(encodeURIComponent(htmlBody))),
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

  // Base64 URL-safe encoding
  return btoa(email).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const LOGO_URL = "https://vrcyjmfpteoccqdmdmqn.supabase.co/storage/v1/object/public/email-assets/logo-almasa.png";

function wrapEmailTemplate(title: string, bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f5;">
    <tr><td align="center" style="padding:30px 15px;">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Logo Header -->
        <tr><td style="background:linear-gradient(135deg,#B22234 0%,#8B0000 100%);padding:28px 30px;text-align:center;">
          <img src="${LOGO_URL}" alt="ALMASA" width="180" style="display:block;margin:0 auto;max-width:180px;height:auto;" />
          <p style="color:rgba(255,255,255,0.85);margin:10px 0 0;font-size:13px;letter-spacing:0.5px;">Abarrotes La Manita, S.A. de C.V.</p>
        </td></tr>
        <!-- Title bar -->
        <tr><td style="background:#1f2937;padding:14px 30px;text-align:center;">
          <p style="color:#ffffff;margin:0;font-size:16px;font-weight:600;letter-spacing:0.3px;">${title}</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:30px;">
          ${bodyContent}
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f9fafb;padding:20px 30px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:11px;text-align:center;line-height:1.5;">
            Este correo fue enviado automáticamente por ALMASA.<br>
            Por favor no responda directamente a este mensaje.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function generateEmailContent(tipo: NotificationType, data: NotificationRequest["data"], clienteNombre: string): { subject: string; html: string } {
  switch (tipo) {
    case "pedido_confirmado":
      return {
        subject: `✅ Pedido ${data.pedidoFolio} confirmado — ALMASA`,
        html: wrapEmailTemplate("🛒 Pedido Confirmado", `
          <p style="font-size:15px;color:#333;margin:0 0 16px;">Estimado/a <strong>${clienteNombre}</strong>,</p>
          <p style="font-size:14px;color:#555;margin:0 0 20px;">Su pedido ha sido confirmado exitosamente y está siendo preparado.</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ecfdf5;border-radius:8px;border-left:4px solid #10b981;margin:0 0 20px;">
            <tr><td style="padding:16px 20px;">
              <p style="margin:0 0 6px;font-size:14px;"><strong>Folio:</strong> ${data.pedidoFolio}</p>
              ${data.total ? `<p style="margin:0;font-size:14px;"><strong>Total:</strong> $${data.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>` : ''}
            </td></tr>
          </table>
          <p style="font-size:14px;color:#555;margin:0 0 8px;">Le notificaremos cuando su pedido esté en camino.</p>
          <p style="font-size:14px;color:#555;margin:0;">¡Gracias por su preferencia!</p>
        `),
      };

    case "en_ruta":
      return {
        subject: `🚚 Pedido ${data.pedidoFolio} en camino — ALMASA`,
        html: wrapEmailTemplate("🚚 ¡Su Pedido Está en Camino!", `
          <p style="font-size:15px;color:#333;margin:0 0 16px;">Estimado/a <strong>${clienteNombre}</strong>,</p>
          <p style="font-size:14px;color:#555;margin:0 0 20px;">¡Buenas noticias! Su pedido ya salió de nuestro almacén y va en camino hacia usted.</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fef3c7;border-radius:8px;border-left:4px solid #f59e0b;margin:0 0 20px;">
            <tr><td style="padding:16px 20px;">
              <p style="margin:0 0 6px;font-size:14px;"><strong>Folio:</strong> ${data.pedidoFolio}</p>
              ${data.choferNombre ? `<p style="margin:0 0 6px;font-size:14px;"><strong>Chofer:</strong> ${data.choferNombre}</p>` : ''}
              ${data.horaEstimada ? `<p style="margin:0;font-size:14px;"><strong>Hora estimada:</strong> ${data.horaEstimada}</p>` : ''}
            </td></tr>
          </table>
          <p style="font-size:14px;color:#555;margin:0 0 8px;">Por favor asegúrese de tener a alguien disponible para recibir el pedido.</p>
          <p style="font-size:14px;color:#555;margin:0;">¡Gracias por su preferencia!</p>
        `),
      };

    case "entregado":
      return {
        subject: `✓ Pedido ${data.pedidoFolio} entregado — ALMASA`,
        html: wrapEmailTemplate("✓ Pedido Entregado", `
          <p style="font-size:15px;color:#333;margin:0 0 16px;">Estimado/a <strong>${clienteNombre}</strong>,</p>
          <p style="font-size:14px;color:#555;margin:0 0 20px;">Confirmamos que su pedido ha sido entregado exitosamente. ¡Gracias por confiar en Almasa!</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ecfdf5;border-radius:8px;border-left:4px solid #10b981;margin:0 0 20px;">
            <tr><td style="padding:16px 20px;">
              <p style="margin:0 0 6px;font-size:14px;"><strong>Folio:</strong> ${data.pedidoFolio}</p>
              ${data.nombreReceptor ? `<p style="margin:0 0 6px;font-size:14px;"><strong>Recibió:</strong> ${data.nombreReceptor}</p>` : ''}
              ${data.horaEntrega ? `<p style="margin:0;font-size:14px;"><strong>Hora:</strong> ${new Date(data.horaEntrega).toLocaleString('es-MX')}</p>` : ''}
            </td></tr>
          </table>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f0f9ff;border-radius:8px;border-left:4px solid #3b82f6;margin:0 0 20px;">
            <tr><td style="padding:16px 20px;">
              <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#1e40af;">Datos Bancarios para Pago</p>
              <p style="margin:0 0 4px;font-size:12px;color:#555;"><strong>Beneficiario:</strong> ABARROTES LA MANITA, S.A. DE C.V.</p>
              <p style="margin:0 0 4px;font-size:12px;color:#555;"><strong>Banco:</strong> BBVA BANCOMER, S.A.</p>
              <p style="margin:0 0 4px;font-size:12px;color:#555;"><strong>Cuenta:</strong> 0442413388</p>
              <p style="margin:0 0 4px;font-size:12px;color:#555;"><strong>CLABE:</strong> 012180004424133881</p>
              <p style="margin:0;font-size:11px;color:#888;">Enviar comprobante a: pagos@almasa.com.mx</p>
            </td></tr>
          </table>
          <p style="font-size:14px;color:#555;margin:0;">¡Gracias por su preferencia!</p>
        `),
      };

    case "pedido_conciliado":
      return {
        subject: `📄 Su pedido ${data.pedidoFolio} ha sido entregado — ALMASA`,
        html: wrapEmailTemplate("📄 Pedido Entregado y Conciliado", `
          <p style="font-size:15px;color:#333;margin:0 0 16px;">Estimado/a <strong>${clienteNombre}</strong>,</p>
          <p style="font-size:14px;color:#555;margin:0 0 20px;">Su pedido ya fue entregado. Adjuntamos su documento final con precios, cantidades y el total definitivo.</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ecfdf5;border-radius:8px;border-left:4px solid #10b981;margin:0 0 20px;">
            <tr><td style="padding:16px 20px;">
              <p style="margin:0 0 6px;font-size:14px;"><strong>Folio:</strong> ${data.pedidoFolio}</p>
              ${data.total ? `<p style="margin:0 0 6px;font-size:14px;"><strong>Total:</strong> $${data.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>` : ''}
              ${data.fechaEntrega ? `<p style="margin:0 0 6px;font-size:14px;"><strong>Fecha de entrega:</strong> ${data.fechaEntrega}</p>` : ''}
              ${data.diasCredito ? `<p style="margin:0;font-size:14px;"><strong>Días de crédito:</strong> ${data.diasCredito}</p>` : ''}
            </td></tr>
          </table>
          <p style="font-size:13px;color:#555;margin:0 0 16px;">A partir de la fecha de entrega comienzan a contar los días de crédito acordados.</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f0f9ff;border-radius:8px;border-left:4px solid #3b82f6;margin:0 0 20px;">
            <tr><td style="padding:16px 20px;">
              <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#1e40af;">Datos Bancarios para Pago</p>
              <p style="margin:0 0 4px;font-size:12px;color:#555;"><strong>Beneficiario:</strong> ABARROTES LA MANITA, S.A. DE C.V.</p>
              <p style="margin:0 0 4px;font-size:12px;color:#555;"><strong>Banco:</strong> BBVA BANCOMER, S.A.</p>
              <p style="margin:0 0 4px;font-size:12px;color:#555;"><strong>Cuenta:</strong> 0442413388</p>
              <p style="margin:0 0 4px;font-size:12px;color:#555;"><strong>CLABE:</strong> 012180004424133881</p>
              <p style="margin:0;font-size:11px;color:#888;">Enviar comprobante a: pagos@almasa.com.mx</p>
            </td></tr>
          </table>
          <p style="font-size:14px;color:#555;margin:0;">¡Gracias por confiar en Almasa!</p>
        `),
      };

    case "pedido_conciliado_ajustado":
      return {
        subject: `📄 Su pedido ${data.pedidoFolio} ha sido ajustado — ALMASA`,
        html: wrapEmailTemplate("📄 Pedido Ajustado tras Entrega", `
          <p style="font-size:15px;color:#333;margin:0 0 16px;">Estimado/a <strong>${clienteNombre}</strong>,</p>
          <p style="font-size:14px;color:#555;margin:0 0 20px;">Su pedido fue ajustado de acuerdo a la devolución o faltante registrado durante la entrega. El total global ya está calculado y es el definitivo.</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fef3c7;border-radius:8px;border-left:4px solid #f59e0b;margin:0 0 20px;">
            <tr><td style="padding:16px 20px;">
              <p style="margin:0 0 6px;font-size:14px;"><strong>Folio:</strong> ${data.pedidoFolio}</p>
              ${data.total ? `<p style="margin:0 0 6px;font-size:14px;"><strong>Total ajustado:</strong> $${data.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>` : ''}
              ${data.fechaEntrega ? `<p style="margin:0 0 6px;font-size:14px;"><strong>Fecha de entrega:</strong> ${data.fechaEntrega}</p>` : ''}
              ${data.diasCredito ? `<p style="margin:0;font-size:14px;"><strong>Días de crédito:</strong> ${data.diasCredito}</p>` : ''}
            </td></tr>
          </table>
          <p style="font-size:13px;color:#555;margin:0 0 16px;">A partir de la fecha de entrega comienzan a contar los días de crédito acordados. Adjuntamos el documento con el detalle actualizado.</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f0f9ff;border-radius:8px;border-left:4px solid #3b82f6;margin:0 0 20px;">
            <tr><td style="padding:16px 20px;">
              <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#1e40af;">Datos Bancarios para Pago</p>
              <p style="margin:0 0 4px;font-size:12px;color:#555;"><strong>Beneficiario:</strong> ABARROTES LA MANITA, S.A. DE C.V.</p>
              <p style="margin:0 0 4px;font-size:12px;color:#555;"><strong>Banco:</strong> BBVA BANCOMER, S.A.</p>
              <p style="margin:0 0 4px;font-size:12px;color:#555;"><strong>Cuenta:</strong> 0442413388</p>
              <p style="margin:0 0 4px;font-size:12px;color:#555;"><strong>CLABE:</strong> 012180004424133881</p>
              <p style="margin:0;font-size:11px;color:#888;">Enviar comprobante a: pagos@almasa.com.mx</p>
            </td></tr>
          </table>
          <p style="font-size:14px;color:#555;margin:0;">¡Gracias por confiar en Almasa!</p>
        `),
      };

    case "vencimiento_proximo":
      return {
        subject: `⚠️ Factura ${data.facturaFolio} vence en ${data.diasRestantes} días — ALMASA`,
        html: wrapEmailTemplate("⚠️ Recordatorio de Pago", `
          <p style="font-size:15px;color:#333;margin:0 0 16px;">Estimado/a <strong>${clienteNombre}</strong>,</p>
          <p style="font-size:14px;color:#555;margin:0 0 20px;">Le recordamos que su factura está próxima a vencer.</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fee2e2;border-radius:8px;border-left:4px solid #ef4444;margin:0 0 20px;">
            <tr><td style="padding:16px 20px;">
              <p style="margin:0 0 6px;font-size:14px;"><strong>Factura:</strong> ${data.facturaFolio}</p>
              <p style="margin:0 0 6px;font-size:14px;"><strong>Monto:</strong> $${data.total?.toLocaleString('es-MX', { minimumFractionDigits: 2 }) || '0.00'}</p>
              <p style="margin:0 0 6px;font-size:14px;"><strong>Vencimiento:</strong> ${data.fechaVencimiento}</p>
              <p style="margin:0;font-size:14px;font-weight:600;color:#dc2626;"><strong>Días restantes:</strong> ${data.diasRestantes}</p>
            </td></tr>
          </table>
          <p style="font-size:14px;color:#555;margin:0 0 8px;">Le invitamos a realizar su pago antes de la fecha de vencimiento.</p>
          <p style="font-size:13px;color:#999;margin:0;">Si ya realizó su pago, por favor ignore este mensaje.</p>
        `),
      };

    default:
      return {
        subject: "Notificación de ALMASA",
        html: wrapEmailTemplate("Notificación", `<p style="font-size:14px;color:#555;">Notificación del sistema</p>`),
      };
  }
}

// Format phone for WhatsApp (Mexican numbers)
function formatPhoneForWhatsApp(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0")) cleaned = cleaned.slice(1);
  if (cleaned.length === 10) cleaned = "52" + cleaned;
  if (cleaned.startsWith("521") && cleaned.length === 13) cleaned = "52" + cleaned.slice(3);
  return cleaned;
}

// Send WhatsApp via Twilio API
async function sendTwilioWhatsApp(phone: string, message: string): Promise<{ success: boolean; sid?: string; error?: string }> {
  const SID = Deno.env.get("TWILIO_ACCOUNT_SID");
  const TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
  const FROM = Deno.env.get("TWILIO_WHATSAPP_NUMBER");

  if (!SID || !TOKEN || !FROM) {
    return { success: false, error: "Twilio not configured" };
  }

  try {
    const to = `whatsapp:+${formatPhoneForWhatsApp(phone)}`;
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: "Basic " + btoa(`${SID}:${TOKEN}`),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ From: FROM, To: to, Body: message }),
      }
    );
    const result = await response.json();
    if (!response.ok) {
      console.error("Twilio error:", result);
      return { success: false, error: result.message || "Twilio API error" };
    }
    return { success: true, sid: result.sid };
  } catch (err: any) {
    console.error("Twilio fetch error:", err);
    return { success: false, error: err.message };
  }
}

function generateWhatsAppPlainMessage(tipo: NotificationType, data: NotificationRequest["data"], clienteNombre: string): string {
  const saludo = `Estimado/a ${clienteNombre}`;
  const firma = "\n\n— ALMASA (Abarrotes La Manita, S.A. de C.V.)";
  const banco = `\n\n📌 *Datos Bancarios*\nBeneficiario: ABARROTES LA MANITA, S.A. DE C.V.\nBanco: BBVA BANCOMER\nCuenta: 0442413388\nCLABE: 012180004424133881\nComprobante a: pagos@almasa.com.mx`;

  const formatMoney = (n?: number) => n ? `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2 })}` : "";

  switch (tipo) {
    case "pedido_confirmado":
      return `${saludo},\n\n✅ Su pedido *${data.pedidoFolio}* ha sido confirmado y está siendo preparado.${data.total ? `\nTotal: ${formatMoney(data.total)}` : ""}\n\nLe notificaremos cuando esté en camino.${firma}`;
    case "en_ruta":
      return `${saludo},\n\n🚚 ¡Su pedido *${data.pedidoFolio}* va en camino!${data.choferNombre ? `\nChofer: ${data.choferNombre}` : ""}${data.horaEstimada ? `\nHora estimada: ${data.horaEstimada}` : ""}\n\nPor favor tenga a alguien disponible para recibirlo.${firma}`;
    case "entregado":
      return `${saludo},\n\n✓ Su pedido *${data.pedidoFolio}* ha sido entregado.${data.nombreReceptor ? `\nRecibió: ${data.nombreReceptor}` : ""}${data.horaEntrega ? `\nHora: ${data.horaEntrega}` : ""}${banco}${firma}`;
    case "pedido_conciliado":
      return `${saludo},\n\n📄 Su pedido *${data.pedidoFolio}* ha sido entregado y conciliado.${data.total ? `\nTotal: ${formatMoney(data.total)}` : ""}${data.fechaEntrega ? `\nFecha de entrega: ${data.fechaEntrega}` : ""}${data.diasCredito ? `\nDías de crédito: ${data.diasCredito}` : ""}${banco}${firma}`;
    case "pedido_conciliado_ajustado":
      return `${saludo},\n\n📄 Su pedido *${data.pedidoFolio}* fue ajustado (devolución/faltante).${data.total ? `\nTotal ajustado: ${formatMoney(data.total)}` : ""}${data.fechaEntrega ? `\nFecha de entrega: ${data.fechaEntrega}` : ""}${data.diasCredito ? `\nDías de crédito: ${data.diasCredito}` : ""}${banco}${firma}`;
    case "vencimiento_proximo":
      return `${saludo},\n\n⚠️ Recordatorio de pago:\nFactura: *${data.facturaFolio}*${data.total ? `\nMonto: ${formatMoney(data.total)}` : ""}${data.fechaVencimiento ? `\nVencimiento: ${data.fechaVencimiento}` : ""}${data.diasRestantes !== undefined ? `\nDías restantes: ${data.diasRestantes}` : ""}${banco}${firma}`;
    default:
      return `${saludo}, tiene una nueva notificación de ALMASA.${firma}`;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { clienteId, tipo, data, pdfBase64, pdfFilename }: NotificationRequest = await req.json();

    if (!clienteId || !tipo) {
      throw new Error("clienteId and tipo are required");
    }

    // Get sender email based on notification type
    const senderEmail = TIPO_TO_REMITENTE[tipo];
    console.log(`Notification type: ${tipo}, sender: ${senderEmail}`);

    // Get Gmail account for sending
    const { data: gmailCuenta, error: gmailError } = await supabase
      .from("gmail_cuentas")
      .select("*")
      .eq("email", senderEmail)
      .eq("activo", true)
      .single();

    if (gmailError || !gmailCuenta) {
      console.error(`Gmail account ${senderEmail} not found or not active`);
      throw new Error(`Cuenta de Gmail ${senderEmail} no configurada`);
    }

    // Get valid access token
    const accessToken = await getValidAccessToken(supabase, gmailCuenta);
    if (!accessToken) {
      throw new Error(`No se pudo obtener token para ${senderEmail}. Reconecte la cuenta.`);
    }

    // Get client info
    const { data: cliente, error: clienteError } = await supabase
      .from("clientes")
      .select("nombre, codigo")
      .eq("id", clienteId)
      .single();

    if (clienteError || !cliente) {
      throw new Error("Client not found");
    }

    // Get client phones for WhatsApp
    const { data: telefonos } = await supabase
      .from("cliente_telefonos")
      .select("telefono")
      .eq("cliente_id", clienteId)
      .eq("activo", true);

    const phones = (telefonos || []).map((t: any) => t.telefono).filter(Boolean);

    // Send WhatsApp via Twilio (automatic) or fallback to pending
    let whatsappData: { sent?: boolean; pending?: boolean; phones?: string[]; message?: string; results?: any[] } | null = null;
    if (phones.length > 0) {
      const waMessage = generateWhatsAppPlainMessage(tipo, data, cliente.nombre);
      const twilioConfigured = !!(Deno.env.get("TWILIO_ACCOUNT_SID") && Deno.env.get("TWILIO_AUTH_TOKEN") && Deno.env.get("TWILIO_WHATSAPP_NUMBER"));

      if (twilioConfigured) {
        const waResults = [];
        for (const phone of phones) {
          const result = await sendTwilioWhatsApp(phone, waMessage);
          waResults.push({ phone, ...result });
          console.log(`WhatsApp to ${phone}: ${result.success ? "sent" : result.error}`);
        }
        whatsappData = {
          sent: true,
          results: waResults,
        };
      } else {
        // Fallback: return pending for frontend to handle
        whatsappData = {
          pending: true,
          phones,
          message: waMessage,
        };
      }
    }

    // Get client emails that match the notification purpose
    const propositos = TIPO_TO_PROPOSITOS[tipo];
    let { data: correos, error: correosError } = await supabase
      .from("cliente_correos")
      .select("email, nombre_contacto")
      .eq("cliente_id", clienteId)
      .eq("activo", true)
      .in("proposito", propositos);

    if (correosError) {
      throw new Error("Error fetching client emails");
    }

    // Fallback: if no specific correos configured, try email from clientes table
    if (!correos || correos.length === 0) {
      console.log(`No client_correos for client ${clienteId} with purposes: ${propositos.join(", ")}. Trying fallback from clientes table...`);
      
      const { data: clienteEmail } = await supabase
        .from("clientes")
        .select("email")
        .eq("id", clienteId)
        .single();
      
      if (clienteEmail?.email) {
        console.log(`Fallback: using client email from clientes table: ${clienteEmail.email}`);
        correos = [{ email: clienteEmail.email, nombre_contacto: null }];
      } else {
        console.log(`No fallback email found for client ${clienteId}`);
        // If no emails but we have WhatsApp phones, return success with whatsapp data
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "No emails configured for this notification type",
            emailsSent: 0,
            whatsapp: whatsappData,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Generate email content
    const { subject, html } = generateEmailContent(tipo, data, cliente.nombre);

    // Send emails to all matching recipients via Gmail API
    const results = [];
    for (const correo of correos) {
      try {
        // Build raw email
        const rawEmail = buildRawEmail(senderEmail, correo.email, subject, html, pdfBase64, pdfFilename);

        // Send via Gmail API
        const sendResponse = await fetch(
          "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ raw: rawEmail }),
          }
        );

        if (!sendResponse.ok) {
          const errorText = await sendResponse.text();
          throw new Error(`Gmail API error: ${errorText}`);
        }

        const sendResult = await sendResponse.json();

        // Log to correos_enviados
        await supabase.from("correos_enviados").insert({
          tipo: `notificacion_${tipo}`,
          referencia_id: data.pedidoFolio || data.facturaFolio || null,
          destinatario: correo.email,
          asunto: subject,
          contenido_preview: tipo,
          fecha_envio: new Date().toISOString(),
          gmail_cuenta_id: gmailCuenta.id,
          gmail_message_id: sendResult.id,
          error: null,
        });

        results.push({ email: correo.email, success: true, id: sendResult.id });
        console.log(`Email sent to ${correo.email} from ${senderEmail} for ${tipo}`);
      } catch (emailError: any) {
        console.error(`Error sending to ${correo.email}:`, emailError);

        // Log error
        await supabase.from("correos_enviados").insert({
          tipo: `notificacion_${tipo}`,
          referencia_id: data.pedidoFolio || data.facturaFolio || null,
          destinatario: correo.email,
          asunto: subject,
          contenido_preview: tipo,
          fecha_envio: new Date().toISOString(),
          gmail_cuenta_id: gmailCuenta.id,
          error: emailError.message,
        });

        results.push({ email: correo.email, success: false, error: emailError.message });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sender: senderEmail,
        emailsSent: results.filter(r => r.success).length,
        results,
        whatsapp: whatsappData,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error: any) {
    console.error("Error in send-client-notification:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
