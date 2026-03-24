import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

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

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      clienteEmail, clienteNombre, pedidoFolio, total,
      fechaEntrega, ajustesPrecio, detalles
    }: SendOrderAuthorizedRequest = await req.json();

    console.log("Sending order authorized email to:", clienteEmail, "folio:", pedidoFolio);

    if (!clienteEmail || !pedidoFolio) {
      throw new Error("Email del cliente y folio del pedido son requeridos");
    }

    const formattedTotal = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(total);
    const formattedDate = new Date(fechaEntrega).toLocaleDateString('es-MX', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    let subject = `Pedido Programado - ${pedidoFolio}`;
    if (ajustesPrecio > 0) {
      subject = `Pedido Programado - ${ajustesPrecio} ajuste${ajustesPrecio > 1 ? 's' : ''} de precio - ${pedidoFolio}`;
    }

    let alertBanner = '';
    if (ajustesPrecio > 0) {
      alertBanner = `<div style="background:#FEF3C7;border:1px solid #F59E0B;border-radius:8px;padding:15px;margin:20px 0;">
        <p style="margin:0;color:#92400E;font-weight:600;">Hubo ${ajustesPrecio} ajuste${ajustesPrecio > 1 ? 's' : ''} de precio en su pedido</p>
        <p style="margin:8px 0 0;color:#92400E;font-size:14px;">Los productos ajustados estan marcados en la tabla.</p>
      </div>`;
    }

    const productosHtml = `<table style="width:100%;border-collapse:collapse;margin:20px 0;">
      <thead><tr style="background:#f8f9fa;">
        <th style="padding:12px;text-align:left;border-bottom:2px solid #dee2e6;">Producto</th>
        <th style="padding:12px;text-align:center;border-bottom:2px solid #dee2e6;">Cantidad</th>
        <th style="padding:12px;text-align:right;border-bottom:2px solid #dee2e6;">Precio</th>
        <th style="padding:12px;text-align:right;border-bottom:2px solid #dee2e6;">Subtotal</th>
      </tr></thead>
      <tbody>${detalles.map(d => {
        const rowStyle = d.fueAjustado ? 'background-color:#FEF9C3;' : '';
        const priceCell = d.fueAjustado && d.precioAnterior
          ? `<span style="text-decoration:line-through;color:#999;font-size:12px;">$${d.precioAnterior.toFixed(2)}</span><br><strong style="color:#B45309;">$${d.precioUnitario.toFixed(2)}</strong>`
          : `$${d.precioUnitario.toFixed(2)}`;
        return `<tr style="${rowStyle}">
          <td style="padding:10px;border-bottom:1px solid #dee2e6;">${d.producto}${d.fueAjustado ? ' <span style="color:#B45309;font-size:11px;">(ajustado)</span>' : ''}</td>
          <td style="padding:10px;text-align:center;border-bottom:1px solid #dee2e6;">${d.cantidad} ${d.unidad}</td>
          <td style="padding:10px;text-align:right;border-bottom:1px solid #dee2e6;">${priceCell}</td>
          <td style="padding:10px;text-align:right;border-bottom:1px solid #dee2e6;">$${d.subtotal.toFixed(2)}</td>
        </tr>`;
      }).join('')}</tbody></table>`;

    const emailHtml = `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:20px 0;font-family:Arial,sans-serif;">
      <tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)">
          <tr><td style="background:#1e3a5f;padding:30px 40px;text-align:center">
            <h1 style="color:#fff;margin:0;font-size:28px;font-weight:bold;letter-spacing:2px">ALMASA</h1>
            <p style="color:#94b8d9;margin:5px 0 0;font-size:13px">Abarrotes la Manita SA de CV</p>
          </td></tr>
          <tr><td style="background:#16a34a;padding:15px 40px;text-align:center">
            <p style="margin:0;color:#fff;font-size:18px;font-weight:bold">PEDIDO PROGRAMADO</p>
          </td></tr>
          <tr><td style="padding:30px 40px">
            ${alertBanner}
            <p style="color:#374151;font-size:15px;margin:0 0 16px">Estimado(a) <strong>${clienteNombre}</strong>,</p>
            <p style="color:#374151;font-size:15px;margin:0 0 20px">Su pedido ha sido autorizado y programado para entrega:</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;margin:0 0 20px;border-collapse:collapse">
              <tr><td style="padding:12px 20px;border-bottom:1px solid #e2e8f0"><strong>Folio:</strong></td><td style="padding:12px 20px;text-align:right;border-bottom:1px solid #e2e8f0">${pedidoFolio}</td></tr>
              <tr><td style="padding:12px 20px;border-bottom:1px solid #e2e8f0"><strong>Fecha de entrega:</strong></td><td style="padding:12px 20px;text-align:right;border-bottom:1px solid #e2e8f0">${formattedDate}</td></tr>
              <tr><td style="padding:12px 20px"><strong style="font-size:18px">Total:</strong></td><td style="padding:12px 20px;text-align:right;font-size:18px;font-weight:bold;color:#16a34a">${formattedTotal}</td></tr>
            </table>
            ${productosHtml}
            <p style="color:#888;font-size:13px;margin-top:24px;">Si tiene alguna pregunta sobre su pedido, no dude en contactarnos.</p>
          </td></tr>
          <tr><td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center">
            <p style="margin:0;color:#94a3b8;font-size:12px">Este es un correo automatico del sistema ALMASA.<br>Por favor no responda a este mensaje.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>`;

    // Enviar via Gmail API (consistente con el resto del sistema)
    const { data: emailResult, error: emailError } = await supabase.functions.invoke("gmail-api", {
      body: {
        action: "send",
        email: "pedidos@almasa.com.mx",
        to: clienteEmail,
        subject,
        body: emailHtml,
      }
    });

    if (emailError) {
      console.error("Gmail API error:", emailError);
      throw new Error(`Error enviando email: ${emailError.message}`);
    }

    console.log("Email sent successfully via Gmail API:", emailResult?.messageId);

    return new Response(
      JSON.stringify({ success: true, message: "Correo enviado", emailId: emailResult?.messageId }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-order-authorized-email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
