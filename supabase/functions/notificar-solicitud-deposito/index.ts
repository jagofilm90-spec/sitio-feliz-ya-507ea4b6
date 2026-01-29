import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Bank details - centralized data
const DATOS_BANCARIOS = {
  beneficiario: "ABARROTES LA MANITA, S.A. DE C.V.",
  banco: "BBVA BANCOMER, S.A.",
  plaza: "JAMAICA",
  sucursal: "0122",
  cuenta: "0442413388",
  clabe: "012180004424133881",
  emailPagos: "pagos@almasa.com.mx",
};

interface SolicitudDepositoRequest {
  credito_id: string;
  proveedor_id?: string;
  proveedor_nombre: string;
  proveedor_email?: string;
  monto: number;
  producto_nombre: string;
  oc_folio: string;
  motivo: string;
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth validation
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: authError } = await supabaseClient.auth.getClaims(token);
    if (authError || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claims.claims.sub;

    const body: SolicitudDepositoRequest = await req.json();
    const { credito_id, proveedor_id, proveedor_nombre, monto, producto_nombre, oc_folio, motivo } = body;

    console.log("Solicitud de depósito recibida:", {
      credito_id,
      proveedor_nombre,
      monto,
      oc_folio,
    });

    // Get provider email from database
    let destinatarioEmail = body.proveedor_email;
    if (!destinatarioEmail && proveedor_id) {
      // Try to get email from proveedor_contactos first (proposito = pagos)
      const { data: contactoPagos } = await supabaseClient
        .from("proveedor_contactos")
        .select("email")
        .eq("proveedor_id", proveedor_id)
        .eq("proposito", "pagos")
        .eq("activo", true)
        .limit(1)
        .maybeSingle();

      if (contactoPagos?.email) {
        destinatarioEmail = contactoPagos.email;
      } else {
        // Fallback to main proveedor email
        const { data: proveedor } = await supabaseClient
          .from("proveedores")
          .select("email")
          .eq("id", proveedor_id)
          .single();

        destinatarioEmail = proveedor?.email;
      }
    }

    if (!destinatarioEmail) {
      console.error("No se encontró email del proveedor");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "No se encontró email del proveedor para enviar la solicitud" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format amount
    const montoFormateado = monto.toLocaleString("es-MX", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    // Get motivo label
    const motivoLabel = motivo === "faltante" 
      ? "Faltante" 
      : motivo === "roto" 
        ? "Producto Dañado" 
        : motivo === "saldo_oc_anticipada"
          ? "Saldo OC Anticipada"
          : motivo;

    // Build email HTML
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1e40af; margin-bottom: 20px;">📋 Datos para Depósito - Crédito Pendiente</h2>
        
        <p style="color: #374151; font-size: 16px;">
          Estimado <strong>${proveedor_nombre}</strong>,
        </p>
        
        <p style="color: #374151; font-size: 15px;">
          Le enviamos los datos bancarios para realizar el depósito correspondiente al siguiente crédito pendiente:
        </p>
        
        <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #f59e0b;">
          <p style="margin: 0; font-size: 16px; color: #92400e;">
            <strong>MONTO A DEPOSITAR:</strong>
          </p>
          <p style="margin: 8px 0 0 0; font-size: 28px; font-weight: bold; color: #b45309;">
            $${montoFormateado} MXN
          </p>
          <p style="margin: 12px 0 0 0; color: #78350f; font-size: 14px;">
            <strong>Referencia:</strong> ${oc_folio} / ${producto_nombre}
            ${motivoLabel ? `<br><strong>Motivo:</strong> ${motivoLabel}` : ""}
          </p>
        </div>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 25px 0;">
          <h3 style="margin: 0 0 15px 0; color: #374151; font-size: 18px;">🏦 DATOS BANCARIOS</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 8px 0; color: #6b7280; width: 140px;"><strong>Beneficiario:</strong></td>
              <td style="padding: 8px 0; color: #111827;">${DATOS_BANCARIOS.beneficiario}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 8px 0; color: #6b7280;"><strong>Banco:</strong></td>
              <td style="padding: 8px 0; color: #111827;">${DATOS_BANCARIOS.banco}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 8px 0; color: #6b7280;"><strong>Sucursal:</strong></td>
              <td style="padding: 8px 0; color: #111827;">${DATOS_BANCARIOS.sucursal} (Plaza ${DATOS_BANCARIOS.plaza})</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 8px 0; color: #6b7280;"><strong>Cuenta:</strong></td>
              <td style="padding: 8px 0; color: #111827; font-family: monospace; font-size: 16px;">${DATOS_BANCARIOS.cuenta}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;"><strong>CLABE:</strong></td>
              <td style="padding: 8px 0; color: #1e40af; font-family: monospace; font-size: 16px; font-weight: bold;">${DATOS_BANCARIOS.clabe}</td>
            </tr>
          </table>
        </div>
        
        <div style="background: #fef2f2; padding: 20px; border-radius: 8px; border-left: 4px solid #dc2626; margin: 25px 0;">
          <p style="margin: 0; color: #991b1b; font-size: 15px;">
            ⚠️ <strong>IMPORTANTE:</strong> Una vez realizado el depósito o transferencia, favor de enviar el comprobante a:
          </p>
          <p style="margin: 12px 0 0 0; font-size: 20px;">
            📧 <a href="mailto:${DATOS_BANCARIOS.emailPagos}" style="color: #dc2626; text-decoration: none; font-weight: bold;">
              ${DATOS_BANCARIOS.emailPagos}
            </a>
          </p>
          <p style="margin: 10px 0 0 0; color: #7f1d1d; font-size: 14px;">
            Indicando como referencia: <strong>${oc_folio}</strong>
          </p>
        </div>
        
        <p style="color: #374151; font-size: 15px;">
          Quedamos atentos a su comprobante.
        </p>
        
        <p style="color: #374151; font-size: 15px;">
          Saludos cordiales.
        </p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          Este es un correo automático del sistema de gestión de ALMASA.<br>
          Por favor no responda a este correo.
        </p>
      </div>
    `;

    const asunto = `📋 Datos para Depósito - Crédito Pendiente ${oc_folio}`;

    // Send email via Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(resendApiKey);
    
    const { data: emailResult, error: emailError } = await resend.emails.send({
      from: "ALMASA Compras <compras@almasa.com.mx>",
      to: [destinatarioEmail],
      subject: asunto,
      html: emailHtml,
    });

    if (emailError) {
      console.error("Error enviando email:", emailError);
      
      // Log the failed email
      await supabaseClient.from("correos_enviados").insert({
        tipo: "solicitud_deposito_credito",
        referencia_id: credito_id,
        destinatario: destinatarioEmail,
        asunto: asunto,
        contenido_preview: `Solicitud de depósito por $${montoFormateado} - ${oc_folio}`,
        error: emailError.message || "Error al enviar",
        enviado_por: userId,
      });

      return new Response(
        JSON.stringify({ success: false, error: emailError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Email enviado exitosamente:", emailResult);

    // Log the successful email
    await supabaseClient.from("correos_enviados").insert({
      tipo: "solicitud_deposito_credito",
      referencia_id: credito_id,
      destinatario: destinatarioEmail,
      asunto: asunto,
      contenido_preview: `Solicitud de depósito por $${montoFormateado} - ${oc_folio}`,
      fecha_envio: new Date().toISOString(),
      enviado_por: userId,
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email enviado correctamente",
        email_to: destinatarioEmail 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error en notificar-solicitud-deposito:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
