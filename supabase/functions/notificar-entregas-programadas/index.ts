import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface EntregaProgramada {
  numero: number;
  bultos: number;
  fecha: string;
}

interface EntregaPendiente {
  numero: number;
  bultos: number;
}

interface RequestBody {
  tipo: 'nuevas_fechas' | 'recordatorio_pendientes';
  orden_id: string;
  orden_folio: string;
  proveedor_email: string;
  proveedor_nombre: string;
  entregas_programadas: EntregaProgramada[];
  entregas_pendientes: EntregaPendiente[];
  total_bultos: number;
  gmail_cuenta?: string;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Validate JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: authError } = await supabase.auth.getClaims(token);
    if (authError || !claims?.claims) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: RequestBody = await req.json();
    const {
      tipo,
      orden_id,
      orden_folio,
      proveedor_email,
      proveedor_nombre,
      entregas_programadas,
      entregas_pendientes,
      total_bultos,
      gmail_cuenta = "compras@almasa.com.mx"
    } = body;

    // Validate required fields
    if (!proveedor_email || !orden_folio) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: proveedor_email, orden_folio" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build the email subject based on type
    const subject = tipo === 'nuevas_fechas'
      ? `Fechas de entrega programadas - ${orden_folio}`
      : `Recordatorio: Entregas pendientes de programar - ${orden_folio}`;

    // Build the HTML email
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">
            ${tipo === 'nuevas_fechas' ? '📅 Fechas de Entrega Actualizadas' : '⏳ Recordatorio de Entregas Pendientes'}
          </h1>
          <p style="color: rgba(255,255,255,0.85); margin: 5px 0 0 0; font-size: 14px;">
            Orden de Compra: <strong>${orden_folio}</strong>
          </p>
        </div>
        
        <div style="padding: 25px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="margin: 0 0 20px 0;">
            Estimado <strong>${proveedor_nombre}</strong>,
          </p>
          
          <p style="margin: 0 0 20px 0; color: #555;">
            ${tipo === 'nuevas_fechas' 
              ? 'Le informamos las fechas programadas para la entrega de su mercancía:' 
              : 'Le recordamos que existen entregas pendientes de programar en su orden:'}
          </p>
          
          ${entregas_programadas.length > 0 ? `
            <div style="background-color: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 0 0 20px 0; border-radius: 0 4px 4px 0;">
              <h3 style="margin: 0 0 12px 0; color: #155724; font-size: 15px;">
                ✅ Entregas Programadas (${entregas_programadas.length})
              </h3>
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background: rgba(0,0,0,0.05);">
                    <th style="padding: 8px; text-align: left; font-size: 12px; color: #155724;">#</th>
                    <th style="padding: 8px; text-align: right; font-size: 12px; color: #155724;">Bultos</th>
                    <th style="padding: 8px; text-align: right; font-size: 12px; color: #155724;">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  ${entregas_programadas.map(e => `
                    <tr>
                      <td style="padding: 8px; border-bottom: 1px solid rgba(0,0,0,0.1); font-size: 13px;">Tráiler ${e.numero}</td>
                      <td style="padding: 8px; border-bottom: 1px solid rgba(0,0,0,0.1); text-align: right; font-size: 13px;">${e.bultos.toLocaleString()}</td>
                      <td style="padding: 8px; border-bottom: 1px solid rgba(0,0,0,0.1); text-align: right; font-size: 13px; font-weight: bold;">${e.fecha}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}
          
          ${entregas_pendientes.length > 0 ? `
            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 0 0 20px 0; border-radius: 0 4px 4px 0;">
              <h3 style="margin: 0 0 12px 0; color: #856404; font-size: 15px;">
                ⏳ Entregas Pendientes de Programar (${entregas_pendientes.length})
              </h3>
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background: rgba(0,0,0,0.05);">
                    <th style="padding: 8px; text-align: left; font-size: 12px; color: #856404;">#</th>
                    <th style="padding: 8px; text-align: right; font-size: 12px; color: #856404;">Bultos</th>
                    <th style="padding: 8px; text-align: right; font-size: 12px; color: #856404;">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  ${entregas_pendientes.map(e => `
                    <tr>
                      <td style="padding: 8px; border-bottom: 1px solid rgba(0,0,0,0.1); font-size: 13px;">Tráiler ${e.numero}</td>
                      <td style="padding: 8px; border-bottom: 1px solid rgba(0,0,0,0.1); text-align: right; font-size: 13px;">${e.bultos.toLocaleString()}</td>
                      <td style="padding: 8px; border-bottom: 1px solid rgba(0,0,0,0.1); text-align: right; font-size: 13px; color: #856404;">Fecha por confirmar</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              <p style="margin: 12px 0 0 0; font-size: 12px; font-style: italic; color: #856404;">
                Le notificaremos cuando se asignen las fechas de estas entregas.
              </p>
            </div>
          ` : ''}
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
            <h4 style="margin: 0 0 10px 0; color: #1e3a5f; font-size: 14px;">📊 Resumen de la Orden</h4>
            <table style="width: 100%; font-size: 13px;">
              <tr>
                <td style="padding: 4px 0; color: #666;">Total de entregas:</td>
                <td style="padding: 4px 0; text-align: right; font-weight: bold;">${entregas_programadas.length + entregas_pendientes.length}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #666;">Programadas:</td>
                <td style="padding: 4px 0; text-align: right; color: #28a745; font-weight: bold;">${entregas_programadas.length}</td>
              </tr>
              ${entregas_pendientes.length > 0 ? `
              <tr>
                <td style="padding: 4px 0; color: #666;">Pendientes:</td>
                <td style="padding: 4px 0; text-align: right; color: #ffc107; font-weight: bold;">${entregas_pendientes.length}</td>
              </tr>
              ` : ''}
              <tr style="border-top: 1px solid #dee2e6;">
                <td style="padding: 8px 0 4px 0; color: #666;">Total bultos:</td>
                <td style="padding: 8px 0 4px 0; text-align: right; font-weight: bold; font-size: 15px;">${total_bultos.toLocaleString()}</td>
              </tr>
            </table>
          </div>
          
          <p style="margin: 0; color: #555;">
            Saludos cordiales,<br>
            <strong>Abarrotes La Manita</strong>
          </p>
        </div>
        
        <div style="text-align: center; padding: 15px; color: #999; font-size: 11px;">
          Este correo fue enviado automáticamente. Para cualquier aclaración, favor de contactarnos.
        </div>
      </div>
    `;

    // Send email via gmail-api edge function
    const { data: emailData, error: emailError } = await supabase.functions.invoke("gmail-api", {
      body: {
        action: "send",
        email: gmail_cuenta,
        to: proveedor_email,
        subject,
        body: htmlBody
      }
    });

    if (emailError) {
      console.error("Error sending email:", emailError);
      throw new Error(`Failed to send email: ${emailError.message}`);
    }

    // Log the email in correos_enviados
    const { error: logError } = await supabase
      .from("correos_enviados")
      .insert({
        tipo: "orden_compra",
        referencia_id: orden_id,
        destinatario: proveedor_email,
        asunto: subject,
        gmail_message_id: emailData?.messageId || null,
        enviado_por: claims.claims.sub,
        contenido_preview: `${entregas_programadas.length} programadas, ${entregas_pendientes.length} pendientes - ${total_bultos.toLocaleString()} bultos total`,
      });

    if (logError) {
      console.error("Error logging email:", logError);
    }

    console.log("Email sent successfully:", {
      tipo,
      orden_folio,
      proveedor_email,
      programadas: entregas_programadas.length,
      pendientes: entregas_pendientes.length
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: emailData?.messageId,
        summary: {
          programadas: entregas_programadas.length,
          pendientes: entregas_pendientes.length,
          total_bultos
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in notificar-entregas-programadas:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
