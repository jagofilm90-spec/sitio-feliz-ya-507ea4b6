import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface LineaEmail {
  producto: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  esPorKilo: boolean;
  pesoKg: number;
  descuento: number;
}

interface PedidoEmailPayload {
  folio: string;
  clienteNombre: string;
  sucursalNombre?: string;
  vendedorNombre: string;
  terminoCredito: string;
  notas?: string;
  lineas: LineaEmail[];
  subtotal: number;
  iva: number;
  ieps: number;
  total: number;
  pesoTotalKg: number;
  totalUnidades: number;
  fechaPedido: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(amount);
}

function formatCreditTerm(term: string): string {
  const labels: Record<string, string> = {
    contado: "Contado",
    "8_dias": "8 días",
    "15_dias": "15 días",
    "30_dias": "30 días",
    "60_dias": "60 días",
  };
  return labels[term] || term.replace("_", " ");
}

// --- Gmail helpers (same pattern as gmail-api edge function) ---

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

async function getValidAccessToken(supabase: any, cuenta: any): Promise<string | null> {
  const now = new Date();
  const tokenExpiry = new Date(cuenta.token_expires_at);

  if (tokenExpiry > new Date(now.getTime() + 5 * 60 * 1000)) {
    return cuenta.access_token;
  }

  if (!cuenta.refresh_token) {
    console.error("No refresh token available for:", cuenta.email);
    return null;
  }

  const newTokens = await refreshAccessToken(cuenta.refresh_token);
  if (!newTokens) return null;

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

function buildRawEmail(from: string, to: string, subject: string, htmlBody: string): string {
  const encoder = new TextEncoder();

  const subjectB64 = btoa(String.fromCharCode(...encoder.encode(subject)));
  const bodyB64 = btoa(String.fromCharCode(...encoder.encode(htmlBody)));
  const boundary = `boundary_${Date.now()}`;

  const email = [
    `From: Pedidos ALMASA <${from}>`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${subjectB64}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    bodyB64,
    `--${boundary}--`,
  ].join("\r\n");

  return btoa(email).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// --- Email HTML builder (kept from original) ---

function buildEmailHtml(data: PedidoEmailPayload): string {
  const lineasHtml = data.lineas
    .map(
      (l) => `
      <tr style="border-bottom: 1px solid #f0f0f0;">
        <td style="padding: 8px 12px; font-size: 13px;">${l.producto}</td>
        <td style="padding: 8px 12px; text-align: center; font-size: 13px;">${l.cantidad}</td>
        ${l.esPorKilo && l.pesoKg > 0 ? `<td style="padding: 8px 12px; text-align: center; font-size: 13px; color: #6b7280;">${(l.cantidad * l.pesoKg).toFixed(1)} kg</td>` : '<td style="padding: 8px 12px; text-align: center; font-size: 13px; color: #6b7280;">-</td>'}
        <td style="padding: 8px 12px; text-align: right; font-size: 13px;">${formatCurrency(l.precioUnitario)}</td>
        ${l.descuento > 0 ? `<td style="padding: 8px 12px; text-align: right; font-size: 13px; color: #16a34a;">-${formatCurrency(l.descuento * l.cantidad)}</td>` : '<td style="padding: 8px 12px; text-align: right; font-size: 13px; color: #9ca3af;">-</td>'}
        <td style="padding: 8px 12px; text-align: right; font-size: 13px; font-weight: 600;">${formatCurrency(l.subtotal)}</td>
      </tr>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pedido ${data.folio}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb;">
  <div style="max-width: 700px; margin: 24px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); padding: 28px 32px; color: white;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <h1 style="margin: 0 0 4px 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">ALMASA</h1>
          <p style="margin: 0; font-size: 13px; opacity: 0.8;">Nuevo Pedido Registrado</p>
        </div>
        <div style="text-align: right;">
          <div style="background: rgba(255,255,255,0.15); border-radius: 8px; padding: 8px 16px; display: inline-block;">
            <p style="margin: 0; font-size: 18px; font-weight: 700;">${data.folio}</p>
            <p style="margin: 0; font-size: 11px; opacity: 0.8;">${new Date(data.fechaPedido).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Info General -->
    <div style="padding: 24px 32px; border-bottom: 1px solid #e5e7eb;">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
        <div>
          <p style="margin: 0 0 4px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280;">Cliente</p>
          <p style="margin: 0; font-size: 16px; font-weight: 700; color: #111827;">${data.clienteNombre}</p>
          ${data.sucursalNombre ? `<p style="margin: 2px 0 0 0; font-size: 13px; color: #6b7280;">📍 ${data.sucursalNombre}</p>` : ""}
        </div>
        <div>
          <p style="margin: 0 0 4px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280;">Vendedor</p>
          <p style="margin: 0; font-size: 15px; font-weight: 600; color: #111827;">${data.vendedorNombre}</p>
          <p style="margin: 2px 0 0 0; font-size: 13px; color: #6b7280;">💳 ${formatCreditTerm(data.terminoCredito)}</p>
        </div>
      </div>
      ${data.notas ? `<div style="margin-top: 12px; padding: 10px 14px; background: #fef9c3; border-radius: 6px; border-left: 3px solid #eab308;"><p style="margin: 0; font-size: 13px; color: #713f12;"><strong>Notas:</strong> ${data.notas}</p></div>` : ""}
    </div>

    <!-- Tabla de productos -->
    <div style="padding: 24px 32px;">
      <h2 style="margin: 0 0 16px 0; font-size: 14px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 0.5px;">Detalle del Pedido</h2>
      <table style="width: 100%; border-collapse: collapse; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
        <thead>
          <tr style="background: #f3f4f6;">
            <th style="padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; color: #4b5563; text-transform: uppercase;">Producto</th>
            <th style="padding: 10px 12px; text-align: center; font-size: 12px; font-weight: 600; color: #4b5563; text-transform: uppercase;">Cant.</th>
            <th style="padding: 10px 12px; text-align: center; font-size: 12px; font-weight: 600; color: #4b5563; text-transform: uppercase;">Kg</th>
            <th style="padding: 10px 12px; text-align: right; font-size: 12px; font-weight: 600; color: #4b5563; text-transform: uppercase;">Precio</th>
            <th style="padding: 10px 12px; text-align: right; font-size: 12px; font-weight: 600; color: #4b5563; text-transform: uppercase;">Dscto.</th>
            <th style="padding: 10px 12px; text-align: right; font-size: 12px; font-weight: 600; color: #4b5563; text-transform: uppercase;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${lineasHtml}
        </tbody>
      </table>
    </div>

    <!-- Totales y KG Summary -->
    <div style="padding: 0 32px 24px 32px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
      
      <!-- KG Summary -->
      <div style="background: #f0f9ff; border-radius: 8px; padding: 16px; border: 1px solid #bae6fd;">
        <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #0369a1;">🚚 Logística</p>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="font-size: 13px; color: #374151;">Total unidades</span>
          <span style="font-size: 13px; font-weight: 600; color: #111827;">${data.totalUnidades}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="font-size: 13px; color: #374151;">Peso total</span>
          <span style="font-size: 15px; font-weight: 700; color: #0369a1;">${data.pesoTotalKg.toLocaleString("es-MX", { maximumFractionDigits: 1 })} kg</span>
        </div>
      </div>

      <!-- Totales financieros -->
      <div style="background: #f9fafb; border-radius: 8px; padding: 16px; border: 1px solid #e5e7eb;">
        <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280;">💰 Resumen</p>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="font-size: 13px; color: #6b7280;">Subtotal</span>
          <span style="font-size: 13px; color: #374151;">${formatCurrency(data.subtotal)}</span>
        </div>
        ${data.iva > 0 ? `<div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span style="font-size: 13px; color: #6b7280;">IVA (16%)</span><span style="font-size: 13px; color: #374151;">${formatCurrency(data.iva)}</span></div>` : ""}
        ${data.ieps > 0 ? `<div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span style="font-size: 13px; color: #6b7280;">IEPS (8%)</span><span style="font-size: 13px; color: #374151;">${formatCurrency(data.ieps)}</span></div>` : ""}
        <div style="border-top: 1px solid #d1d5db; margin-top: 8px; padding-top: 8px; display: flex; justify-content: space-between;">
          <span style="font-size: 15px; font-weight: 700; color: #111827;">TOTAL</span>
          <span style="font-size: 18px; font-weight: 800; color: #1d4ed8;">${formatCurrency(data.total)}</span>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div style="background: #f3f4f6; padding: 16px 32px; text-align: center;">
      <p style="margin: 0; font-size: 12px; color: #9ca3af;">Este mensaje fue generado automáticamente por el sistema de pedidos ALMASA</p>
    </div>
  </div>
</body>
</html>`;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: PedidoEmailPayload = await req.json();

    if (!payload.folio || !payload.clienteNombre || !payload.lineas?.length) {
      return new Response(JSON.stringify({ error: "Payload inválido" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`[enviar-pedido-interno] Procesando pedido ${payload.folio} para ${payload.clienteNombre}`);

    // Get Gmail account for pedidos@almasa.com.mx
    const senderEmail = "pedidos@almasa.com.mx";
    const { data: gmailCuenta, error: gmailError } = await supabase
      .from("gmail_cuentas")
      .select("*")
      .eq("email", senderEmail)
      .eq("activo", true)
      .single();

    if (gmailError || !gmailCuenta) {
      console.error(`Gmail account ${senderEmail} not found:`, gmailError?.message);
      throw new Error(`Cuenta de Gmail ${senderEmail} no configurada o no activa`);
    }

    const accessToken = await getValidAccessToken(supabase, gmailCuenta);
    if (!accessToken) {
      throw new Error(`No se pudo obtener token para ${senderEmail}. Reconecte la cuenta.`);
    }

    const html = buildEmailHtml(payload);
    const subject = `Nuevo Pedido ${payload.folio} — ${payload.clienteNombre} — ${formatCurrency(payload.total)}`;

    // Send to pedidos@almasa.com.mx via Gmail API
    const rawEmail = buildRawEmail(senderEmail, "pedidos@almasa.com.mx", subject, html);

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
      console.error("Gmail API error:", errorText);
      throw new Error(`Error enviando email via Gmail: ${errorText}`);
    }

    const sendResult = await sendResponse.json();
    console.log(`[enviar-pedido-interno] Email enviado para pedido ${payload.folio}, messageId: ${sendResult.id}`);

    // Log to correos_enviados
    await supabase.from("correos_enviados").insert({
      tipo: "pedido_interno",
      referencia_id: payload.folio,
      destinatario: "pedidos@almasa.com.mx",
      asunto: subject,
      contenido_preview: `Pedido ${payload.folio} - ${payload.clienteNombre}`,
      fecha_envio: new Date().toISOString(),
      gmail_cuenta_id: gmailCuenta.id,
      gmail_message_id: sendResult.id,
      error: null,
    });

    return new Response(JSON.stringify({ success: true, id: sendResult.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err: any) {
    console.error("[enviar-pedido-interno] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
