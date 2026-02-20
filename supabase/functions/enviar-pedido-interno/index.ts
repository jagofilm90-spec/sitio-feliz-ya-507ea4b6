import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY") as string);

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
    const payload: PedidoEmailPayload = await req.json();

    if (!payload.folio || !payload.clienteNombre || !payload.lineas?.length) {
      return new Response(JSON.stringify({ error: "Payload inválido" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const html = buildEmailHtml(payload);

    const { data, error } = await resend.emails.send({
      from: "Pedidos ALMASA <noreply@almasa.com.mx>",
      to: ["pedidos@almasa.com.mx"],
      subject: `Nuevo Pedido ${payload.folio} — ${payload.clienteNombre} — ${formatCurrency(payload.total)}`,
      html,
    });

    if (error) {
      console.error("Resend error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`Email enviado para pedido ${payload.folio}:`, data);

    return new Response(JSON.stringify({ success: true, id: data?.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err: any) {
    console.error("Error en enviar-pedido-interno:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
