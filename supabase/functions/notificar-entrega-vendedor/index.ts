import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { entregaId, status } = await req.json();

    if (!entregaId) {
      return new Response(JSON.stringify({ error: "entregaId requerido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Obtener datos de la entrega + pedido + cliente
    const { data: entrega, error: entregaError } = await supabase
      .from("entregas")
      .select(`
        id,
        nombre_receptor,
        hora_entrega_real,
        motivo_rechazo,
        notas,
        pedido_id,
        pedidos(
          id,
          folio,
          total,
          vendedor_id,
          cliente_id,
          clientes(nombre, codigo),
          sucursal_id,
          cliente_sucursales:sucursal_id(nombre)
        )
      `)
      .eq("id", entregaId)
      .single();

    if (entregaError || !entrega) {
      console.error("Error obteniendo entrega:", entregaError);
      return new Response(JSON.stringify({ error: "Entrega no encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pedido = entrega.pedidos as any;
    if (!pedido) {
      return new Response(JSON.stringify({ error: "Pedido no encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Obtener detalles del pedido (productos)
    const { data: detalles } = await supabase
      .from("pedidos_detalles")
      .select(`
        cantidad,
        precio_unitario,
        subtotal,
        kilos_totales,
        productos(nombre, codigo, unidad_venta, kilos_por_unidad)
      `)
      .eq("pedido_id", pedido.id);

    // 3. Obtener email del vendedor
    const { data: vendedorProfile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", pedido.vendedor_id)
      .maybeSingle();

    if (!vendedorProfile?.email) {
      console.log("Vendedor sin email configurado, omitiendo notificación");
      // Aún así inicializar saldo si aplica
    }

    // 4. Calcular totales de kg
    const totalKg = (detalles || []).reduce((sum: number, d: any) => {
      return sum + (d.kilos_totales || 0);
    }, 0);

    // 5. Construir HTML del email
    const clienteNombre = pedido.clientes?.nombre || "Cliente";
    const sucursalNombre = (pedido.cliente_sucursales as any)?.nombre;
    const destinatario = sucursalNombre ? `${clienteNombre} — ${sucursalNombre}` : clienteNombre;

    const statusLabel =
      status === "entregado"
        ? "✅ Entrega Completa"
        : status === "parcial"
        ? "⚠️ Entrega Parcial"
        : "❌ Entrega Rechazada";

    const statusColor =
      status === "entregado"
        ? "#16a34a"
        : status === "parcial"
        ? "#d97706"
        : "#dc2626";

    const productosRows = (detalles || [])
      .map((d: any) => {
        const prod = d.productos;
        const kg = d.kilos_totales > 0 ? `${d.kilos_totales.toFixed(2)} kg` : "-";
        return `
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px 12px; font-size: 14px;">${prod?.nombre || "Producto"}</td>
            <td style="padding: 10px 12px; text-align: center; font-size: 14px;">${d.cantidad}</td>
            <td style="padding: 10px 12px; text-align: center; font-size: 14px; color: #6b7280;">${kg}</td>
            <td style="padding: 10px 12px; text-align: right; font-size: 14px;">$${(d.subtotal || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
          </tr>`;
      })
      .join("");

    const horaEntrega = entrega.hora_entrega_real
      ? new Date(entrega.hora_entrega_real).toLocaleString("es-MX", {
          dateStyle: "long",
          timeStyle: "short",
          timeZone: "America/Mexico_City",
        })
      : "—";

    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    
    <!-- Header -->
    <div style="background: ${statusColor}; padding: 24px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 700;">${statusLabel}</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 6px 0 0; font-size: 16px;">Pedido ${pedido.folio}</p>
    </div>

    <!-- Body -->
    <div style="padding: 24px;">

      <!-- Info cliente -->
      <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
        <table width="100%">
          <tr>
            <td style="font-size: 13px; color: #6b7280; padding-bottom: 6px;">Cliente</td>
            <td style="font-size: 14px; font-weight: 600; text-align: right;">${destinatario}</td>
          </tr>
          <tr>
            <td style="font-size: 13px; color: #6b7280; padding-bottom: 6px;">Receptor</td>
            <td style="font-size: 14px; text-align: right;">${entrega.nombre_receptor || "—"}</td>
          </tr>
          <tr>
            <td style="font-size: 13px; color: #6b7280; padding-bottom: 6px;">Hora de entrega</td>
            <td style="font-size: 14px; text-align: right;">${horaEntrega}</td>
          </tr>
          <tr>
            <td style="font-size: 13px; color: #6b7280;">Total KG</td>
            <td style="font-size: 14px; font-weight: 700; text-align: right; color: ${statusColor};">${totalKg.toFixed(2)} kg</td>
          </tr>
        </table>
      </div>

      <!-- Tabla de productos -->
      <h3 style="font-size: 15px; font-weight: 600; margin: 0 0 12px; color: #111827;">Productos entregados</h3>
      <table width="100%" style="border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background: #f3f4f6;">
            <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #6b7280; font-weight: 600;">PRODUCTO</th>
            <th style="padding: 10px 12px; text-align: center; font-size: 12px; color: #6b7280; font-weight: 600;">CANT.</th>
            <th style="padding: 10px 12px; text-align: center; font-size: 12px; color: #6b7280; font-weight: 600;">KG</th>
            <th style="padding: 10px 12px; text-align: right; font-size: 12px; color: #6b7280; font-weight: 600;">SUBTOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${productosRows}
        </tbody>
        <tfoot>
          <tr style="background: #f9fafb; border-top: 2px solid #e5e7eb;">
            <td colspan="2" style="padding: 12px; font-size: 14px; font-weight: 700; color: #111827;">TOTAL</td>
            <td style="padding: 12px; text-align: center; font-size: 14px; font-weight: 700; color: ${statusColor};">${totalKg.toFixed(2)} kg</td>
            <td style="padding: 12px; text-align: right; font-size: 14px; font-weight: 700; color: #111827;">$${(pedido.total || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
          </tr>
        </tfoot>
      </table>

      ${entrega.motivo_rechazo ? `
      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; margin-top: 16px;">
        <p style="font-size: 13px; color: #991b1b; margin: 0;"><strong>Motivo:</strong> ${entrega.motivo_rechazo}</p>
      </div>` : ""}

      ${entrega.notas ? `
      <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px; margin-top: 16px;">
        <p style="font-size: 13px; color: #1e40af; margin: 0;"><strong>Notas:</strong> ${entrega.notas}</p>
      </div>` : ""}
    </div>

    <!-- Footer -->
    <div style="background: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="font-size: 12px; color: #9ca3af; margin: 0;">ALMASA — Sistema de Gestión de Entregas</p>
    </div>
  </div>
</body>
</html>`;

    // 6. Enviar email si hay vendedor con email
    if (vendedorProfile?.email) {
      const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

      const emailSubject = `${status === "entregado" ? "✅" : status === "parcial" ? "⚠️" : "❌"} Pedido ${pedido.folio} ${
        status === "entregado" ? "entregado" : status === "parcial" ? "entregado parcialmente" : "rechazado"
      } — ${clienteNombre}`;

      await resend.emails.send({
        from: "ALMASA Entregas <noreply@almasa.com.mx>",
        to: [vendedorProfile.email],
        subject: emailSubject,
        html: htmlBody,
      });

      console.log(`Email enviado a ${vendedorProfile.email} para pedido ${pedido.folio}`);
    }

    // 7. Si entrega completa o parcial, inicializar saldo_pendiente en el pedido
    if (status === "entregado" || status === "parcial") {
      const { error: updateError } = await supabase
        .from("pedidos")
        .update({ saldo_pendiente: pedido.total })
        .eq("id", pedido.id)
        .is("saldo_pendiente", null);

      if (updateError) {
        console.error("Error actualizando saldo_pendiente:", updateError);
      } else {
        console.log(`saldo_pendiente inicializado en $${pedido.total} para pedido ${pedido.folio}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, emailEnviado: !!vendedorProfile?.email }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error en notificar-entrega-vendedor:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
