import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOGO_URL = "https://vrcyjmfpteoccqdmdmqn.supabase.co/storage/v1/object/public/email-assets/logo-almasa.png";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { rutaId } = await req.json();
    console.log("Sending route email for rutaId:", rutaId);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get route with chofer, vehicle, entregas
    const { data: ruta, error: rutaError } = await supabaseAdmin
      .from("rutas")
      .select(`
        id, folio, fecha_ruta, peso_total_kg, hora_salida_sugerida,
        chofer:empleados!rutas_chofer_id_fkey(id, nombre_completo, email),
        vehiculo:vehiculos(nombre, placa),
        entregas(
          id, orden_entrega,
          pedido:pedidos(
            folio, peso_total_kg, notas,
            cliente:clientes(nombre),
            sucursal:cliente_sucursales(nombre, direccion, telefono, horario_entrega),
            detalles:pedidos_detalles(cantidad, producto:productos(nombre, unidad))
          )
        )
      `)
      .eq("id", rutaId)
      .single();

    if (rutaError || !ruta) throw new Error("Ruta not found: " + rutaError?.message);

    const chofer = (ruta as any).chofer;
    if (!chofer?.email) {
      console.log("Chofer has no email, skipping");
      return new Response(
        JSON.stringify({ success: true, message: "Chofer sin correo, no se envió email" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const vehiculo = (ruta as any).vehiculo;
    const entregas = ((ruta as any).entregas || []).sort((a: any, b: any) => (a.orden_entrega || 0) - (b.orden_entrega || 0));

    // Build entregas HTML
    let entregasHtml = "";
    for (const entrega of entregas) {
      const pedido = entrega.pedido;
      const cliente = pedido?.cliente?.nombre || "Cliente";
      const sucursal = pedido?.sucursal;
      const direccion = sucursal?.direccion || "";
      const telefono = sucursal?.telefono || "";
      const horario = sucursal?.horario_entrega || "";
      const peso = pedido?.peso_total_kg || 0;
      const productosCount = pedido?.detalles?.length || 0;

      entregasHtml += `
        <tr>
          <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:center;font-weight:bold;font-size:18px;color:#B22234;">
            ${entrega.orden_entrega || "—"}
          </td>
          <td style="padding:12px;border-bottom:1px solid #e5e7eb;">
            <div style="font-weight:600;font-size:15px;">${cliente}</div>
            ${sucursal?.nombre ? `<div style="font-size:13px;color:#666;">${sucursal.nombre}</div>` : ""}
            ${direccion ? `<div style="font-size:12px;color:#888;">📍 ${direccion}</div>` : ""}
            ${telefono ? `<div style="font-size:12px;color:#888;">📞 ${telefono}</div>` : ""}
            ${horario ? `<div style="font-size:12px;color:#888;">🕐 ${horario}</div>` : ""}
          </td>
          <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:center;">
            ${productosCount} prod.<br>
            <span style="font-size:12px;color:#666;">${peso} kg</span>
          </td>
        </tr>
      `;
    }

    const emailHtml = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f5;">
    <tr><td align="center" style="padding:30px 15px;">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#B22234 0%,#8B0000 100%);padding:28px 30px;text-align:center;">
          <img src="${LOGO_URL}" alt="ALMASA" width="180" style="display:block;margin:0 auto;max-width:180px;height:auto;" />
          <p style="color:rgba(255,255,255,0.85);margin:10px 0 0;font-size:13px;letter-spacing:0.5px;">Abarrotes La Manita, S.A. de C.V.</p>
        </td></tr>
        <tr><td style="background:#1f2937;padding:14px 30px;text-align:center;">
          <p style="color:#ffffff;margin:0;font-size:16px;font-weight:600;">🚛 Tu Ruta del Día — ${ruta.folio}</p>
        </td></tr>
        <tr><td style="padding:30px;">
          <p style="font-size:15px;color:#333;margin:0 0 16px;">Hola <strong>${chofer.nombre_completo}</strong>,</p>
          <p style="font-size:14px;color:#555;margin:0 0 20px;">Tu ruta ha sido despachada. Aquí tienes el resumen:</p>
          
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8f9fa;border-radius:8px;margin:0 0 20px;">
            <tr><td style="padding:16px 20px;">
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding:4px 0;font-size:14px;"><strong>Vehículo:</strong></td>
                  <td style="padding:4px 0;font-size:14px;text-align:right;">${vehiculo?.nombre || "—"} ${vehiculo?.placa ? `(${vehiculo.placa})` : ""}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;font-size:14px;"><strong>Entregas:</strong></td>
                  <td style="padding:4px 0;font-size:14px;text-align:right;">${entregas.length} clientes</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;font-size:14px;"><strong>Peso Total:</strong></td>
                  <td style="padding:4px 0;font-size:14px;text-align:right;">${ruta.peso_total_kg || 0} kg</td>
                </tr>
              </table>
            </td></tr>
          </table>

          <h3 style="margin:0 0 10px;font-size:16px;color:#333;">Orden de Entregas</h3>
          <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
            <thead>
              <tr style="background-color:#f8f9fa;">
                <th style="padding:10px;text-align:center;border-bottom:2px solid #dee2e6;width:40px;">#</th>
                <th style="padding:10px;text-align:left;border-bottom:2px solid #dee2e6;">Cliente</th>
                <th style="padding:10px;text-align:center;border-bottom:2px solid #dee2e6;width:80px;">Detalle</th>
              </tr>
            </thead>
            <tbody>
              ${entregasHtml}
            </tbody>
          </table>

          <p style="color:#888;font-size:13px;margin-top:24px;">Recuerda escanear el código QR de cada hoja de carga al momento de entregar. ¡Buen viaje! 🚛</p>
        </td></tr>
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

    const emailResponse = await resend.emails.send({
      from: "ALMASA <onboarding@resend.dev>",
      to: [chofer.email],
      subject: `🚛 Tu Ruta ${ruta.folio} — ${entregas.length} entregas`,
      html: emailHtml,
    });

    console.log("Email sent to chofer:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "Email enviado al chofer" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-chofer-route-email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
