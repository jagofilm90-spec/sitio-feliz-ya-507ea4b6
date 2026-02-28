import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendOrderAuthorizedRequest {
  clienteEmail: string;
  clienteNombre: string;
  pedidoFolio: string;
  total: number;
  fechaEntrega: string;
  ajustesPrecio: number;
  detalles: Array<{
    producto: string;
    cantidad: number;
    unidad: string;
    precioUnitario: number;
    subtotal: number;
    precioAnterior?: number;
    fueAjustado: boolean;
  }>;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      clienteEmail, 
      clienteNombre, 
      pedidoFolio, 
      total, 
      fechaEntrega,
      ajustesPrecio,
      detalles 
    }: SendOrderAuthorizedRequest = await req.json();

    console.log("Sending order authorized email to:", clienteEmail);

    if (!clienteEmail || !pedidoFolio) {
      throw new Error("Email del cliente y folio del pedido son requeridos");
    }

    const formattedTotal = new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(total);

    const formattedDate = new Date(fechaEntrega).toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Build subject line
    let subject = `Pedido Programado - ${pedidoFolio}`;
    if (ajustesPrecio > 0) {
      subject = `Pedido Programado - ${ajustesPrecio} ajuste${ajustesPrecio > 1 ? 's' : ''} de precio - ${pedidoFolio}`;
    }

    // Build alert banner if there were adjustments
    let alertBanner = '';
    if (ajustesPrecio > 0) {
      alertBanner = `
        <div style="background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #92400E; font-weight: 600;">
            ⚠️ Hubo ${ajustesPrecio} ajuste${ajustesPrecio > 1 ? 's' : ''} de precio en su pedido
          </p>
          <p style="margin: 8px 0 0 0; color: #92400E; font-size: 14px;">
            Los productos ajustados están marcados en la tabla de abajo.
          </p>
        </div>
      `;
    }

    // Build products table with adjustment indicators
    let productosHtml = `
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background-color: #f8f9fa;">
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Producto</th>
            <th style="padding: 12px; text-align: center; border-bottom: 2px solid #dee2e6;">Cantidad</th>
            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #dee2e6;">Precio</th>
            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #dee2e6;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${detalles.map(d => {
            const rowStyle = d.fueAjustado ? 'background-color: #FEF9C3;' : '';
            const priceCell = d.fueAjustado && d.precioAnterior 
              ? `<span style="text-decoration: line-through; color: #999; font-size: 12px;">$${d.precioAnterior.toFixed(2)}</span><br><strong style="color: #B45309;">$${d.precioUnitario.toFixed(2)}</strong>`
              : `$${d.precioUnitario.toFixed(2)}`;
            return `
              <tr style="${rowStyle}">
                <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">
                  ${d.producto}
                  ${d.fueAjustado ? '<span style="color: #B45309; font-size: 11px;"> (ajustado)</span>' : ''}
                </td>
                <td style="padding: 10px; text-align: center; border-bottom: 1px solid #dee2e6;">${d.cantidad} ${d.unidad}</td>
                <td style="padding: 10px; text-align: right; border-bottom: 1px solid #dee2e6;">${priceCell}</td>
                <td style="padding: 10px; text-align: right; border-bottom: 1px solid #dee2e6;">$${d.subtotal.toFixed(2)}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;

    const LOGO_URL = "https://vrcyjmfpteoccqdmdmqn.supabase.co/storage/v1/object/public/email-assets/logo-almasa.png";

    const emailHtml = `<!DOCTYPE html>
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
        <!-- Title -->
        <tr><td style="background:#1f2937;padding:14px 30px;text-align:center;">
          <p style="color:#ffffff;margin:0;font-size:16px;font-weight:600;">✓ Pedido Programado</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:30px;">
          ${alertBanner}
          <p style="font-size:15px;color:#333;margin:0 0 16px;">Estimado/a <strong>${clienteNombre}</strong>,</p>
          <p style="font-size:14px;color:#555;margin:0 0 20px;">Su pedido ha sido autorizado y programado para entrega:</p>
          
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8f9fa;border-radius:8px;margin:0 0 20px;">
            <tr><td style="padding:16px 20px;">
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding:6px 0;font-size:14px;"><strong>Folio:</strong></td>
                  <td style="padding:6px 0;font-size:14px;text-align:right;">${pedidoFolio}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:14px;"><strong>Fecha de entrega:</strong></td>
                  <td style="padding:6px 0;font-size:14px;text-align:right;">${formattedDate}</td>
                </tr>
                <tr style="border-top:2px solid #B22234;">
                  <td style="padding:10px 0;font-size:18px;font-weight:700;">Total:</td>
                  <td style="padding:10px 0;font-size:18px;font-weight:700;text-align:right;color:#B22234;">${formattedTotal}</td>
                </tr>
              </table>
            </td></tr>
          </table>

          ${productosHtml}

          <p style="color:#888;font-size:13px;margin-top:24px;">Si tiene alguna pregunta sobre su pedido, no dude en contactarnos.</p>
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

    const emailResponse = await resend.emails.send({
      from: "ALMASA <onboarding@resend.dev>",
      to: [clienteEmail],
      subject: subject,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Correo de pedido autorizado enviado correctamente",
        emailId: (emailResponse as any).id || "sent"
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-order-authorized-email function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
