import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GmailCuenta {
  id: string;
  email: string;
  access_token: string;
  refresh_token: string;
  token_expiry: string;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
}

interface CorreosEnviados {
  id?: string;
  tipo: string;
  destinatario: string;
  asunto: string;
  contenido_preview: string;
  referencia_id: string;
  gmail_cuenta_id: string;
  gmail_message_id: string;
  fecha_envio: string;
}

interface SecretaryNotificationRequest {
  tipo: 'nuevo_pedido' | 'pedido_urgente';
  pedidoId: string;
  folio: string;
  vendedor: string;
  cliente: string;
  total: number;
  requiereFactura?: boolean;
}

async function refreshAccessToken(supabase: any, cuentaId: string, refreshToken: string): Promise<string | null> {
  const clientId = Deno.env.get('GMAIL_CLIENT_ID');
  const clientSecret = Deno.env.get('GMAIL_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    console.error("Missing Gmail OAuth credentials");
    return null;
  }

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    const data = await response.json();

    if (data.access_token) {
      await supabase
        .from('gmail_cuentas')
        .update({
          access_token: data.access_token,
          token_expiry: new Date(Date.now() + (data.expires_in * 1000)).toISOString(),
        })
        .eq('id', cuentaId);

      return data.access_token;
    }

    return null;
  } catch (error) {
    console.error("Error refreshing token:", error);
    return null;
  }
}

async function getValidAccessToken(supabase: any, cuenta: any): Promise<string | null> {
  const now = new Date();
  const expiry = cuenta.token_expiry ? new Date(cuenta.token_expiry) : null;

  if (cuenta.access_token && expiry && expiry > new Date(now.getTime() + 5 * 60 * 1000)) {
    return cuenta.access_token;
  }

  if (cuenta.refresh_token) {
    return await refreshAccessToken(supabase, cuenta.id, cuenta.refresh_token);
  }

  return null;
}

function buildRawEmail(to: string, from: string, subject: string, htmlContent: string): string {
  const boundary = "boundary_" + Date.now();
  
  const emailLines = [
    `From: ALMASA-OS <${from}>`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    btoa(unescape(encodeURIComponent(htmlContent))),
    `--${boundary}--`,
  ];

  const rawEmail = emailLines.join('\r\n');
  return btoa(rawEmail).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount);
}

function generateEmailContent(data: SecretaryNotificationRequest, appUrl: string): { subject: string; html: string } {
  const subject = `📦 Nuevo Pedido ${data.folio} - ${data.cliente}`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 25px; border-radius: 12px 12px 0 0; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">📦 NUEVO PEDIDO PARA PROCESAR</h1>
    </div>
    
    <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
            <span style="color: #666; font-size: 14px;">Folio:</span>
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid #eee; text-align: right;">
            <strong style="font-size: 18px; color: #dc2626;">${data.folio}</strong>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
            <span style="color: #666; font-size: 14px;">Vendedor:</span>
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid #eee; text-align: right;">
            <strong>${data.vendedor}</strong>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
            <span style="color: #666; font-size: 14px;">Cliente:</span>
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid #eee; text-align: right;">
            <strong>${data.cliente}</strong>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
            <span style="color: #666; font-size: 14px;">Total:</span>
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid #eee; text-align: right;">
            <strong style="font-size: 20px; color: #16a34a;">${formatCurrency(data.total)}</strong>
          </td>
        </tr>
      </table>
      
      ${data.requiereFactura ? `
      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 25px; border-radius: 0 8px 8px 0;">
        <p style="margin: 0; color: #92400e; font-weight: 600;">⚡ Este cliente requiere FACTURA</p>
      </div>
      ` : `
      <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin-bottom: 25px; border-radius: 0 8px 8px 0;">
        <p style="margin: 0; color: #1e40af; font-weight: 600;">📄 Preparar nota de venta / remisión</p>
      </div>
      `}
      
      <div style="text-align: center; margin-top: 30px;">
        <a href="${appUrl}/pedidos?pedido=${data.pedidoId}" 
           style="display: inline-block; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4);">
          👆 VER PEDIDO Y PROCESAR
        </a>
      </div>
      
      <p style="text-align: center; color: #999; font-size: 12px; margin-top: 30px;">
        Fecha: ${new Date().toLocaleDateString('es-MX', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </p>
    </div>
    
    <p style="text-align: center; color: #666; font-size: 11px; margin-top: 20px;">
      Este correo fue enviado automáticamente por el sistema ALMASA-OS.<br>
      Por favor no responda a este correo.
    </p>
  </div>
</body>
</html>`;

  return { subject, html };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const requestData: SecretaryNotificationRequest = await req.json();
    console.log("Request data:", requestData);

    const productionAppUrl = "https://almasa-erp.lovable.app";

    // Get sender account (pedidos@almasa.com.mx)
    const { data: gmailCuenta, error: cuentaError } = await supabase
      .from('gmail_cuentas')
      .select('*')
      .eq('email', 'pedidos@almasa.com.mx')
      .eq('activo', true)
      .single();

    if (cuentaError || !gmailCuenta) {
      console.error("Gmail account not found:", cuentaError);
      return new Response(
        JSON.stringify({ error: "Gmail account not configured", details: cuentaError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accessToken = await getValidAccessToken(supabase, gmailCuenta);
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: "Could not get valid Gmail access token" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // FIX: Use lowercase 'secretaria' to match the app_role enum
    const { data: secretariaRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'secretaria');

    if (rolesError || !secretariaRoles || secretariaRoles.length === 0) {
      console.log("No secretaria users found:", rolesError);
      return new Response(
        JSON.stringify({ success: true, message: "No secretaria users to notify" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userIds = secretariaRoles.map(r => r.user_id);

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', userIds);

    if (profilesError || !profiles || profiles.length === 0) {
      console.log("No profiles found for secretarias:", profilesError);
      return new Response(
        JSON.stringify({ success: true, message: "No secretary emails found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { subject, html } = generateEmailContent(requestData, productionAppUrl);

    const results: any[] = [];

    for (const profile of profiles) {
      if (!profile.email) continue;

      try {
        const rawEmail = buildRawEmail(profile.email, gmailCuenta.email, subject, html);

        const gmailResponse = await fetch(
          'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ raw: rawEmail }),
          }
        );

        const gmailResult = await gmailResponse.json();

        if (gmailResponse.ok) {
          await supabase.from('correos_enviados').insert({
            tipo: 'notificacion_secretaria',
            destinatario: profile.email,
            asunto: subject,
            contenido_preview: `Nuevo pedido ${requestData.folio}`,
            referencia_id: requestData.pedidoId,
            gmail_cuenta_id: gmailCuenta.id,
            gmail_message_id: gmailResult.id,
            fecha_envio: new Date().toISOString(),
          });

          results.push({ email: profile.email, success: true, messageId: gmailResult.id });
          console.log(`Email sent to ${profile.email}`);
        } else {
          console.error(`Failed to send to ${profile.email}:`, gmailResult);
          results.push({ email: profile.email, success: false, error: gmailResult });
        }
      } catch (emailError) {
        console.error(`Error sending to ${profile.email}:`, emailError);
        results.push({ email: profile.email, success: false, error: String(emailError) });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Notified ${results.filter(r => r.success).length} secretarias`,
        results 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in send-secretary-notification:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

