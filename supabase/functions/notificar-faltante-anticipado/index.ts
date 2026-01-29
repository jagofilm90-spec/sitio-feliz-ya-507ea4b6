import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FaltanteData {
  producto_id: string;
  producto_nombre: string;
  cantidad_faltante: number;
  precio_unitario: number;
  monto_total: number;
  motivo: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const { orden_compra_id, faltantes, entrega_id } = await req.json();

    if (!orden_compra_id || !faltantes || faltantes.length === 0) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Get OC data
    const { data: oc, error: ocError } = await supabase
      .from('ordenes_compra')
      .select(`
        id, folio, tipo_pago,
        proveedor_id,
        proveedor_nombre_manual,
        proveedores (
          id, nombre, email,
          proveedor_contactos (email, proposito)
        )
      `)
      .eq('id', orden_compra_id)
      .single();

    if (ocError || !oc) {
      console.error('Error fetching OC:', ocError);
      return new Response(JSON.stringify({ error: 'OC not found' }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Only process for prepaid orders
    if (oc.tipo_pago !== 'anticipado') {
      return new Response(JSON.stringify({ message: 'Not a prepaid order, skipping credit registration' }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Register credits for each missing item
    const creditsToInsert = (faltantes as FaltanteData[]).map(f => ({
      proveedor_id: oc.proveedor_id,
      proveedor_nombre_manual: oc.proveedor_nombre_manual,
      orden_compra_origen_id: orden_compra_id,
      entrega_id: entrega_id || null,
      producto_id: f.producto_id,
      producto_nombre: f.producto_nombre,
      cantidad: f.cantidad_faltante,
      precio_unitario: f.precio_unitario,
      monto_total: f.monto_total,
      motivo: f.motivo || 'faltante',
      status: 'pendiente'
    }));

    const { error: insertError } = await supabase
      .from('proveedor_creditos_pendientes')
      .insert(creditsToInsert);

    if (insertError) {
      console.error('Error inserting credits:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to register credits' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Calculate total
    const totalFaltantes = (faltantes as FaltanteData[]).reduce((sum, f) => sum + f.monto_total, 0);

    // Get provider email
    let proveedorEmail: string | null = null;
    const proveedorData = oc.proveedores as any;
    if (proveedorData) {
      // Check for logistics contact first
      const logisticaContacto = proveedorData.proveedor_contactos?.find(
        (c: any) => c.proposito === 'recibe_logistica'
      );
      if (logisticaContacto?.email) {
        proveedorEmail = logisticaContacto.email;
      } else {
        proveedorEmail = proveedorData.email;
      }
    }

    // Send email notification if we have an email
    if (proveedorEmail) {
      const proveedorNombre = proveedorData?.nombre || oc.proveedor_nombre_manual || 'Proveedor';
      
      const faltantesRows = (faltantes as FaltanteData[]).map(f => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${f.producto_nombre}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${f.cantidad_faltante}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${f.monto_total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${f.motivo === 'faltante' ? 'No llegó' : f.motivo === 'roto' ? 'Dañado' : 'Rechazado'}</td>
        </tr>
      `).join('');

      const emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2 style="color: #dc2626;">⚠️ Notificación de Faltante en Orden Pagada</h2>
          
          <p>Estimado <strong>${proveedorNombre}</strong>,</p>
          
          <p>Le informamos que la orden de compra <strong>${oc.folio}</strong>, que fue pagada anticipadamente, 
          presenta los siguientes faltantes en la entrega recibida:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background-color: #f3f4f6;">
                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Producto</th>
                <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">Cantidad</th>
                <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Valor</th>
                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Motivo</th>
              </tr>
            </thead>
            <tbody>
              ${faltantesRows}
            </tbody>
            <tfoot>
              <tr style="background-color: #fef2f2;">
                <td colspan="2" style="padding: 10px; font-weight: bold;">Total Pendiente:</td>
                <td style="padding: 10px; text-align: right; font-weight: bold; color: #dc2626;">
                  $${totalFaltantes.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
          
          <p><strong>Por favor indique cómo procederá:</strong></p>
          <ul>
            <li>Reembolso del monto correspondiente</li>
            <li>Reposición en la siguiente entrega</li>
            <li>Aplicar como crédito en próxima orden de compra</li>
          </ul>
          
          <p>Quedamos atentos a su respuesta.</p>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            Este es un correo automático generado por el sistema de gestión de compras de ALMASA.
          </p>
        </div>
      `;

      // Send email via gmail-api
      try {
        const { error: emailError } = await supabase.functions.invoke('gmail-api', {
          body: {
            action: 'send',
            email: 'compras@almasa.com.mx',
            to: proveedorEmail,
            subject: `⚠️ Faltante en OC Pagada ${oc.folio} - Solicitud de Resolución`,
            body: emailBody
          }
        });

        if (emailError) {
          console.error('Error sending email:', emailError);
        } else {
          console.log('Email sent successfully to:', proveedorEmail);
          
          // Log the email
          await supabase.from('correos_enviados').insert({
            tipo: 'faltante_anticipado',
            referencia_id: orden_compra_id,
            destinatario: proveedorEmail,
            asunto: `Faltante en OC Pagada ${oc.folio}`,
            contenido_preview: `Faltantes por $${totalFaltantes.toLocaleString('es-MX')} en orden anticipada`,
            fecha_envio: new Date().toISOString(),
            gmail_cuenta_id: null
          });
        }
      } catch (emailErr) {
        console.error('Exception sending email:', emailErr);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      credits_registered: creditsToInsert.length,
      total_faltantes: totalFaltantes,
      email_sent: !!proveedorEmail
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in notificar-faltante-anticipado:', error);
    return new Response(JSON.stringify({ error: errorMessage }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
