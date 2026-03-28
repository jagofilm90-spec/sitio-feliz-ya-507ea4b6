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

interface ModificacionProducto {
  producto: string;
  cantidadOriginal: number;
  cantidadNueva: number;
}

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
    vehiculoNombre?: string;
    horaEstimada?: string;
    horaEntrega?: string;
    nombreReceptor?: string;
    fechaEntrega?: string;
    diasCredito?: string;
    mensaje?: string;
    modificaciones?: ModificacionProducto[];
    totalAnterior?: number;
    totalNuevo?: number;
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
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:24px 0;font-family:Arial,Helvetica,sans-serif"><tr><td align="center"><table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;background:#fff;border-radius:4px;overflow:hidden;border:1px solid #e0e0e0">
<tr><td style="padding:28px 36px;border-bottom:1px solid #eee;text-align:center"><p style="margin:0 0 0;color:#999;font-size:11px;font-style:italic;letter-spacing:1px">Desde 1904</p><img src="${LOGO_URL}" alt="ALMASA" width="180" style="display:inline-block;max-width:180px;height:auto"/><p style="margin:4px 0 0;font-size:10px;color:#888;text-transform:uppercase;letter-spacing:2px;font-weight:600">Trabajando por un México mejor</p></td></tr>
<tr><td style="padding:28px 36px">
<h2 style="margin:0 0 20px;font-size:18px;color:#222;font-weight:700">${title}</h2>
${bodyContent}
</td></tr>
<tr><td style="padding:20px 36px;border-top:1px solid #eee"><p style="margin:0 0 4px;color:#666;font-size:11px;font-weight:600">Departamento de Pedidos</p><p style="margin:0;color:#999;font-size:10px;line-height:1.6">Melchor Ocampo #59, Col. Magdalena Mixiuhca, C.P. 15850, CDMX<br>Tel: 55 5552-0168 / 55 5552-7887 &bull; pedidos@almasa.com.mx</p><p style="margin:6px 0 0;color:#bbb;font-size:10px">Correo generado automáticamente. No responder.</p></td></tr>
</table></td></tr></table>`;
}

function generateEmailContent(tipo: NotificationType, data: NotificationRequest["data"], clienteNombre: string): { subject: string; html: string } {
  switch (tipo) {
    case "pedido_confirmado":
      return {
        subject: `Pedido Confirmado — ${data.pedidoFolio} — ALMASA`,
        html: wrapEmailTemplate("Pedido Confirmado", `
          <p style="font-size:14px;color:#444;margin:0 0 6px;">${data.pedidoFolio}</p>
          <p style="font-size:14px;color:#444;line-height:1.6;margin:0 0 20px;">Estimado/a <strong>${clienteNombre}</strong>, su pedido ha sido confirmado y será programado para entrega.</p>
          ${data.total ? `<table width="100%" style="margin:0 0 20px"><tr><td style="border-top:2px solid #222;padding:12px 0"><table width="100%"><tr><td style="font-size:18px;font-weight:800;color:#222">Total</td><td style="text-align:right;font-size:18px;font-weight:800;color:#222">$${data.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td></tr></table></td></tr></table>` : ''}
          <p style="font-size:13px;color:#555;margin:0 0 8px;">Se le notificará vía correo electrónico cuando su pedido haya salido a ruta.</p>
          <p style="font-size:13px;color:#888;margin:0;">Si tiene alguna pregunta sobre su pedido, no dude en contactarnos.</p>
        `),
      };

    case "en_ruta": {
      const hasModificaciones = data.modificaciones && data.modificaciones.length > 0;
      const formatMoney = (n?: number) => n ? `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2 })}` : "";

      let modificacionesHtml = "";
      if (hasModificaciones) {
        const rows = data.modificaciones!.map((m, i) =>
          `<tr style="${i%2 ? "background:#fafafa;" : ""}">
            <td style="padding:7px 10px;border-bottom:1px solid #eee;font-size:13px">${m.producto}</td>
            <td style="padding:7px 10px;border-bottom:1px solid #eee;font-size:13px;text-align:center">${m.cantidadOriginal}</td>
            <td style="padding:7px 10px;border-bottom:1px solid #eee;font-size:13px;text-align:center;font-weight:600">${m.cantidadNueva}</td>
            <td style="padding:7px 10px;border-bottom:1px solid #eee;font-size:13px;text-align:center;font-weight:600">${m.cantidadNueva - m.cantidadOriginal}</td>
          </tr>`
        ).join("");

        modificacionesHtml = `
          <p style="font-size:13px;font-weight:600;color:#222;margin:0 0 8px">Ajustes en su pedido:</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 16px">
            <thead><tr style="border-bottom:2px solid #222">
              <th style="padding:8px 10px;text-align:left;font-size:11px;color:#888;text-transform:uppercase;font-weight:600">Producto</th>
              <th style="padding:8px 10px;text-align:center;font-size:11px;color:#888;text-transform:uppercase;font-weight:600">Original</th>
              <th style="padding:8px 10px;text-align:center;font-size:11px;color:#888;text-transform:uppercase;font-weight:600">Enviado</th>
              <th style="padding:8px 10px;text-align:center;font-size:11px;color:#888;text-transform:uppercase;font-weight:600">Dif.</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
          ${data.totalAnterior && data.totalNuevo ? `
          <table width="100%" style="margin:0 0 16px"><tr><td style="border-top:2px solid #222;padding:12px 0"><table width="100%">
            <tr><td style="color:#888;font-size:13px;padding:2px 0">Total anterior</td><td style="text-align:right;font-size:13px;color:#888;padding:2px 0;text-decoration:line-through">${formatMoney(data.totalAnterior)}</td></tr>
            <tr><td style="font-size:16px;font-weight:800;color:#222;padding:4px 0">Nuevo total</td><td style="text-align:right;font-size:16px;font-weight:800;color:#222;padding:4px 0">${formatMoney(data.totalNuevo)}</td></tr>
          </table></td></tr></table>` : ""}
        `;
      }

      return {
        subject: hasModificaciones
          ? `Pedido ${data.pedidoFolio} en camino (con ajustes) — ALMASA`
          : `Pedido ${data.pedidoFolio} en camino — ALMASA`,
        html: wrapEmailTemplate("Su pedido está en camino", `
          <p style="font-size:14px;color:#444;margin:0 0 6px;">${data.pedidoFolio}</p>
          <p style="font-size:14px;color:#444;line-height:1.6;margin:0 0 20px;">Estimado/a <strong>${clienteNombre}</strong>, su pedido ya salió de nuestro almacén y va en camino.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 20px">
            <tr><td style="padding:6px 0;color:#888;font-size:13px;border-bottom:1px solid #f0f0f0;width:140px">Folio</td><td style="padding:6px 0;color:#222;font-size:14px;border-bottom:1px solid #f0f0f0;font-weight:700">${data.pedidoFolio}</td></tr>
            ${data.choferNombre ? `<tr><td style="padding:6px 0;color:#888;font-size:13px;border-bottom:1px solid #f0f0f0">Chofer</td><td style="padding:6px 0;color:#222;font-size:14px;border-bottom:1px solid #f0f0f0">${data.choferNombre}</td></tr>` : ''}
            ${data.vehiculoNombre ? `<tr><td style="padding:6px 0;color:#888;font-size:13px;border-bottom:1px solid #f0f0f0">Unidad</td><td style="padding:6px 0;color:#222;font-size:14px;border-bottom:1px solid #f0f0f0">${data.vehiculoNombre}</td></tr>` : ''}
            ${data.horaEstimada ? `<tr><td style="padding:6px 0;color:#888;font-size:13px;border-bottom:1px solid #f0f0f0">Hora estimada</td><td style="padding:6px 0;color:#222;font-size:14px;border-bottom:1px solid #f0f0f0">${data.horaEstimada}</td></tr>` : ''}
          </table>
          ${modificacionesHtml}
          <p style="font-size:13px;color:#555;margin:0 0 8px;">Por favor asegúrese de tener a alguien disponible para recibir el pedido.</p>
          <p style="font-size:13px;color:#888;margin:0;">¡Gracias por su preferencia!</p>
        `),
      };
    }

    case "entregado":
      return {
        subject: `Pedido ${data.pedidoFolio} entregado — ALMASA`,
        html: wrapEmailTemplate("Pedido Entregado", `
          <p style="font-size:14px;color:#444;margin:0 0 6px;">${data.pedidoFolio}</p>
          <p style="font-size:14px;color:#444;line-height:1.6;margin:0 0 20px;">Estimado/a <strong>${clienteNombre}</strong>, confirmamos que su pedido ha sido entregado.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 20px">
            ${data.nombreReceptor ? `<tr><td style="padding:6px 0;color:#888;font-size:13px;border-bottom:1px solid #f0f0f0;width:140px">Recibió</td><td style="padding:6px 0;color:#222;font-size:14px;border-bottom:1px solid #f0f0f0">${data.nombreReceptor}</td></tr>` : ''}
            ${data.horaEntrega ? `<tr><td style="padding:6px 0;color:#888;font-size:13px;border-bottom:1px solid #f0f0f0">Hora</td><td style="padding:6px 0;color:#222;font-size:14px;border-bottom:1px solid #f0f0f0">${new Date(data.horaEntrega).toLocaleString('es-MX')}</td></tr>` : ''}
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 20px">
            <tr><td style="padding:8px 0;font-size:13px;font-weight:600;color:#222;border-bottom:1px solid #eee">Datos Bancarios para Pago</td></tr>
            <tr><td style="padding:4px 0;font-size:12px;color:#555"><strong>Beneficiario:</strong> ABARROTES LA MANITA, S.A. DE C.V.</td></tr>
            <tr><td style="padding:4px 0;font-size:12px;color:#555"><strong>Banco:</strong> BBVA BANCOMER, S.A.</td></tr>
            <tr><td style="padding:4px 0;font-size:12px;color:#555"><strong>Cuenta:</strong> 0442413388</td></tr>
            <tr><td style="padding:4px 0;font-size:12px;color:#555"><strong>CLABE:</strong> 012180004424133881</td></tr>
            <tr><td style="padding:4px 0;font-size:11px;color:#888">Enviar comprobante a: pagos@almasa.com.mx</td></tr>
          </table>
          <p style="font-size:13px;color:#888;margin:0;">¡Gracias por su preferencia!</p>
        `),
      };

    case "pedido_conciliado":
      return {
        subject: `Pedido ${data.pedidoFolio} entregado — ALMASA`,
        html: wrapEmailTemplate("Pedido Entregado y Conciliado", `
          <p style="font-size:14px;color:#444;margin:0 0 6px;">${data.pedidoFolio}</p>
          <p style="font-size:14px;color:#444;line-height:1.6;margin:0 0 20px;">Estimado/a <strong>${clienteNombre}</strong>, su pedido ya fue entregado. Adjuntamos su documento final con precios, cantidades y el total definitivo.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 16px">
            ${data.total ? `<tr><td style="padding:6px 0;color:#888;font-size:13px;border-bottom:1px solid #f0f0f0;width:140px">Total</td><td style="padding:6px 0;color:#222;font-size:14px;border-bottom:1px solid #f0f0f0;font-weight:700">$${data.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td></tr>` : ''}
            ${data.fechaEntrega ? `<tr><td style="padding:6px 0;color:#888;font-size:13px;border-bottom:1px solid #f0f0f0">Fecha entrega</td><td style="padding:6px 0;color:#222;font-size:14px;border-bottom:1px solid #f0f0f0">${data.fechaEntrega}</td></tr>` : ''}
            ${data.diasCredito ? `<tr><td style="padding:6px 0;color:#888;font-size:13px;border-bottom:1px solid #f0f0f0">Días de crédito</td><td style="padding:6px 0;color:#222;font-size:14px;border-bottom:1px solid #f0f0f0">${data.diasCredito}</td></tr>` : ''}
          </table>
          <p style="font-size:13px;color:#555;margin:0 0 16px;">A partir de la fecha de entrega comienzan a contar los días de crédito acordados.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 20px">
            <tr><td style="padding:8px 0;font-size:13px;font-weight:600;color:#222;border-bottom:1px solid #eee">Datos Bancarios para Pago</td></tr>
            <tr><td style="padding:4px 0;font-size:12px;color:#555"><strong>Beneficiario:</strong> ABARROTES LA MANITA, S.A. DE C.V.</td></tr>
            <tr><td style="padding:4px 0;font-size:12px;color:#555"><strong>Banco:</strong> BBVA BANCOMER, S.A.</td></tr>
            <tr><td style="padding:4px 0;font-size:12px;color:#555"><strong>Cuenta:</strong> 0442413388</td></tr>
            <tr><td style="padding:4px 0;font-size:12px;color:#555"><strong>CLABE:</strong> 012180004424133881</td></tr>
            <tr><td style="padding:4px 0;font-size:11px;color:#888">Enviar comprobante a: pagos@almasa.com.mx</td></tr>
          </table>
          <p style="font-size:13px;color:#888;margin:0;">¡Gracias por confiar en Almasa!</p>
        `),
      };

    case "pedido_conciliado_ajustado":
      return {
        subject: `Pedido ${data.pedidoFolio} ajustado — ALMASA`,
        html: wrapEmailTemplate("Pedido Ajustado tras Entrega", `
          <p style="font-size:14px;color:#444;margin:0 0 6px;">${data.pedidoFolio}</p>
          <p style="font-size:14px;color:#444;line-height:1.6;margin:0 0 20px;">Estimado/a <strong>${clienteNombre}</strong>, su pedido fue ajustado de acuerdo a la devolución o faltante registrado durante la entrega. Adjuntamos el documento con el detalle actualizado.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 16px">
            ${data.total ? `<tr><td style="padding:6px 0;color:#888;font-size:13px;border-bottom:1px solid #f0f0f0;width:140px">Total ajustado</td><td style="padding:6px 0;color:#222;font-size:14px;border-bottom:1px solid #f0f0f0;font-weight:700">$${data.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td></tr>` : ''}
            ${data.fechaEntrega ? `<tr><td style="padding:6px 0;color:#888;font-size:13px;border-bottom:1px solid #f0f0f0">Fecha entrega</td><td style="padding:6px 0;color:#222;font-size:14px;border-bottom:1px solid #f0f0f0">${data.fechaEntrega}</td></tr>` : ''}
            ${data.diasCredito ? `<tr><td style="padding:6px 0;color:#888;font-size:13px;border-bottom:1px solid #f0f0f0">Días de crédito</td><td style="padding:6px 0;color:#222;font-size:14px;border-bottom:1px solid #f0f0f0">${data.diasCredito}</td></tr>` : ''}
          </table>
          <p style="font-size:13px;color:#555;margin:0 0 16px;">A partir de la fecha de entrega comienzan a contar los días de crédito acordados.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 20px">
            <tr><td style="padding:8px 0;font-size:13px;font-weight:600;color:#222;border-bottom:1px solid #eee">Datos Bancarios para Pago</td></tr>
            <tr><td style="padding:4px 0;font-size:12px;color:#555"><strong>Beneficiario:</strong> ABARROTES LA MANITA, S.A. DE C.V.</td></tr>
            <tr><td style="padding:4px 0;font-size:12px;color:#555"><strong>Banco:</strong> BBVA BANCOMER, S.A.</td></tr>
            <tr><td style="padding:4px 0;font-size:12px;color:#555"><strong>Cuenta:</strong> 0442413388</td></tr>
            <tr><td style="padding:4px 0;font-size:12px;color:#555"><strong>CLABE:</strong> 012180004424133881</td></tr>
            <tr><td style="padding:4px 0;font-size:11px;color:#888">Enviar comprobante a: pagos@almasa.com.mx</td></tr>
          </table>
          <p style="font-size:13px;color:#888;margin:0;">¡Gracias por confiar en Almasa!</p>
        `),
      };

    case "vencimiento_proximo":
      return {
        subject: `Factura ${data.facturaFolio} vence en ${data.diasRestantes} días — ALMASA`,
        html: wrapEmailTemplate("Recordatorio de Pago", `
          <p style="font-size:14px;color:#444;line-height:1.6;margin:0 0 20px;">Estimado/a <strong>${clienteNombre}</strong>, le recordamos que su factura está próxima a vencer.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 20px">
            <tr><td style="padding:6px 0;color:#888;font-size:13px;border-bottom:1px solid #f0f0f0;width:140px">Factura</td><td style="padding:6px 0;color:#222;font-size:14px;border-bottom:1px solid #f0f0f0;font-weight:700">${data.facturaFolio}</td></tr>
            <tr><td style="padding:6px 0;color:#888;font-size:13px;border-bottom:1px solid #f0f0f0">Monto</td><td style="padding:6px 0;color:#222;font-size:14px;border-bottom:1px solid #f0f0f0">$${data.total?.toLocaleString('es-MX', { minimumFractionDigits: 2 }) || '0.00'}</td></tr>
            <tr><td style="padding:6px 0;color:#888;font-size:13px;border-bottom:1px solid #f0f0f0">Vencimiento</td><td style="padding:6px 0;color:#222;font-size:14px;border-bottom:1px solid #f0f0f0">${data.fechaVencimiento}</td></tr>
            <tr><td style="padding:6px 0;color:#888;font-size:13px;border-bottom:1px solid #f0f0f0">Días restantes</td><td style="padding:6px 0;color:#222;font-size:14px;border-bottom:1px solid #f0f0f0;font-weight:700">${data.diasRestantes}</td></tr>
          </table>
          <p style="font-size:13px;color:#555;margin:0 0 8px;">Le invitamos a realizar su pago antes de la fecha de vencimiento.</p>
          <p style="font-size:13px;color:#888;margin:0;">Si ya realizó su pago, por favor ignore este mensaje.</p>
        `),
      };

    default:
      return {
        subject: "Notificación — ALMASA",
        html: wrapEmailTemplate("Notificación", `<p style="font-size:14px;color:#444;">Notificación del sistema.</p>`),
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
    // Ensure FROM has whatsapp: prefix
    const fromNumber = FROM.startsWith("whatsapp:") ? FROM : `whatsapp:${FROM}`;
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: "Basic " + btoa(`${SID}:${TOKEN}`),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ From: fromNumber, To: to, Body: message }),
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
    case "en_ruta": {
      let msg = `${saludo},\n\n🚚 ¡Su pedido *${data.pedidoFolio}* va en camino!${data.choferNombre ? `\nChofer: ${data.choferNombre}` : ""}${data.vehiculoNombre ? `\nUnidad: ${data.vehiculoNombre}` : ""}${data.horaEstimada ? `\nHora estimada: ${data.horaEstimada}` : ""}`;
      if (data.modificaciones && data.modificaciones.length > 0) {
        msg += `\n\n⚠️ *Ajustes en su pedido:*`;
        for (const m of data.modificaciones) {
          const diff = m.cantidadNueva - m.cantidadOriginal;
          msg += `\n• ${m.producto}: ${m.cantidadOriginal} → ${m.cantidadNueva} (${diff > 0 ? "+" : ""}${diff})`;
        }
        if (data.totalAnterior && data.totalNuevo) {
          msg += `\n\nTotal anterior: ~${formatMoney(data.totalAnterior)}~\n*Nuevo total: ${formatMoney(data.totalNuevo)}*`;
        }
      }
      msg += `\n\nPor favor tenga a alguien disponible para recibirlo.${firma}`;
      return msg;
    }
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
        // Send WhatsApp messages in parallel for efficiency
        const waPromises = phones.map(async (phone) => {
          const result = await sendTwilioWhatsApp(phone, waMessage);
          console.log(`WhatsApp to ${phone}: ${result.success ? "sent" : result.error}`);
          return { phone, ...result };
        });
        const waResults = await Promise.all(waPromises);
        whatsappData = {
          sent: true,
          results: waResults,
        };
      } else {
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
