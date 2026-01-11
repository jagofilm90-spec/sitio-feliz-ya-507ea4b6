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
  };
}

// Map notification type to email purposes
const TIPO_TO_PROPOSITOS: Record<NotificationType, string[]> = {
  pedido_confirmado: ["todo", "pedidos"],
  en_ruta: ["todo", "en_ruta", "entregas"],
  entregado: ["todo", "entregado", "entregas"],
  vencimiento_proximo: ["todo", "cobranza"],
};

// Map notification type to sender email
const TIPO_TO_REMITENTE: Record<NotificationType, string> = {
  pedido_confirmado: "pedidos@almasa.com.mx",
  en_ruta: "pedidos@almasa.com.mx",
  entregado: "pedidos@almasa.com.mx",
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
function buildRawEmail(from: string, to: string, subject: string, htmlBody: string): string {
  const boundary = `boundary_${Date.now()}`;
  
  const email = [
    `From: Almasa <${from}>`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    btoa(unescape(encodeURIComponent(htmlBody))),
    `--${boundary}--`,
  ].join("\r\n");

  // Base64 URL-safe encoding
  return btoa(email).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function generateEmailContent(tipo: NotificationType, data: NotificationRequest["data"], clienteNombre: string): { subject: string; html: string } {
  const baseStyles = `
    <style>
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
      .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
      .footer { background: #1f2937; color: #9ca3af; padding: 20px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px; }
      .highlight { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #f59e0b; }
      .success { background: #d1fae5; border-left-color: #10b981; }
      .warning { background: #fee2e2; border-left-color: #ef4444; }
      .btn { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
    </style>
  `;

  switch (tipo) {
    case "pedido_confirmado":
      return {
        subject: `✅ Pedido ${data.pedidoFolio} confirmado - Almasa`,
        html: `
          ${baseStyles}
          <div class="container">
            <div class="header">
              <h1>🛒 Pedido Confirmado</h1>
            </div>
            <div class="content">
              <p>Estimado/a <strong>${clienteNombre}</strong>,</p>
              <p>Su pedido ha sido confirmado exitosamente.</p>
              <div class="highlight success">
                <strong>Folio:</strong> ${data.pedidoFolio}<br>
                ${data.total ? `<strong>Total:</strong> $${data.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : ''}
              </div>
              <p>Le notificaremos cuando su pedido esté en camino.</p>
              <p>¡Gracias por su preferencia!</p>
            </div>
            <div class="footer">
              <p>Almasa - Distribuidora de Alimentos</p>
              <p>Este es un correo automático, por favor no responda directamente.</p>
            </div>
          </div>
        `,
      };

    case "en_ruta":
      return {
        subject: `🚚 Tu pedido ${data.pedidoFolio} está en camino - Almasa`,
        html: `
          ${baseStyles}
          <div class="container">
            <div class="header">
              <h1>🚚 ¡Tu Pedido Está en Camino!</h1>
            </div>
            <div class="content">
              <p>Estimado/a <strong>${clienteNombre}</strong>,</p>
              <p>¡Buenas noticias! Su pedido ya salió de nuestro almacén y va en camino.</p>
              <div class="highlight">
                <strong>Folio:</strong> ${data.pedidoFolio}<br>
                ${data.choferNombre ? `<strong>Chofer:</strong> ${data.choferNombre}<br>` : ''}
                ${data.horaEstimada ? `<strong>Hora estimada de llegada:</strong> ${data.horaEstimada}` : ''}
              </div>
              <p>Por favor asegúrese de tener a alguien disponible para recibir el pedido.</p>
              <p>¡Gracias por su preferencia!</p>
            </div>
            <div class="footer">
              <p>Almasa - Distribuidora de Alimentos</p>
              <p>Este es un correo automático, por favor no responda directamente.</p>
            </div>
          </div>
        `,
      };

    case "entregado":
      return {
        subject: `✓ Pedido ${data.pedidoFolio} entregado - Almasa`,
        html: `
          ${baseStyles}
          <div class="container">
            <div class="header">
              <h1>✓ Pedido Entregado</h1>
            </div>
            <div class="content">
              <p>Estimado/a <strong>${clienteNombre}</strong>,</p>
              <p>Confirmamos que su pedido ha sido entregado exitosamente.</p>
              <div class="highlight success">
                <strong>Folio:</strong> ${data.pedidoFolio}<br>
                ${data.nombreReceptor ? `<strong>Recibió:</strong> ${data.nombreReceptor}<br>` : ''}
                ${data.horaEntrega ? `<strong>Hora de entrega:</strong> ${new Date(data.horaEntrega).toLocaleString('es-MX')}` : ''}
              </div>
              <p>Si tiene alguna duda o comentario sobre su pedido, no dude en contactarnos.</p>
              <p>¡Gracias por su preferencia!</p>
            </div>
            <div class="footer">
              <p>Almasa - Distribuidora de Alimentos</p>
              <p>Este es un correo automático, por favor no responda directamente.</p>
            </div>
          </div>
        `,
      };

    case "vencimiento_proximo":
      return {
        subject: `⚠️ Factura ${data.facturaFolio} vence en ${data.diasRestantes} días - Almasa`,
        html: `
          ${baseStyles}
          <div class="container">
            <div class="header" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
              <h1>⚠️ Recordatorio de Pago</h1>
            </div>
            <div class="content">
              <p>Estimado/a <strong>${clienteNombre}</strong>,</p>
              <p>Le recordamos que su factura está próxima a vencer.</p>
              <div class="highlight warning">
                <strong>Factura:</strong> ${data.facturaFolio}<br>
                <strong>Monto:</strong> $${data.total?.toLocaleString('es-MX', { minimumFractionDigits: 2 }) || '0.00'}<br>
                <strong>Fecha de vencimiento:</strong> ${data.fechaVencimiento}<br>
                <strong>Días restantes:</strong> ${data.diasRestantes}
              </div>
              <p>Le invitamos a realizar su pago antes de la fecha de vencimiento para evitar cargos adicionales.</p>
              <p>Si ya realizó su pago, por favor ignore este mensaje.</p>
              <p>¡Gracias por su preferencia!</p>
            </div>
            <div class="footer">
              <p>Almasa - Distribuidora de Alimentos</p>
              <p>Este es un correo automático, por favor no responda directamente.</p>
            </div>
          </div>
        `,
      };

    default:
      return {
        subject: "Notificación de Almasa",
        html: `<p>Notificación del sistema</p>`,
      };
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

    const { clienteId, tipo, data }: NotificationRequest = await req.json();

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

    // Get client emails that match the notification purpose
    const propositos = TIPO_TO_PROPOSITOS[tipo];
    const { data: correos, error: correosError } = await supabase
      .from("cliente_correos")
      .select("email, nombre_contacto")
      .eq("cliente_id", clienteId)
      .eq("activo", true)
      .in("proposito", propositos);

    if (correosError) {
      throw new Error("Error fetching client emails");
    }

    if (!correos || correos.length === 0) {
      console.log(`No emails configured for client ${clienteId} with purposes: ${propositos.join(", ")}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No emails configured for this notification type",
          emailsSent: 0 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate email content
    const { subject, html } = generateEmailContent(tipo, data, cliente.nombre);

    // Send emails to all matching recipients via Gmail API
    const results = [];
    for (const correo of correos) {
      try {
        // Build raw email
        const rawEmail = buildRawEmail(senderEmail, correo.email, subject, html);

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
        results 
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
