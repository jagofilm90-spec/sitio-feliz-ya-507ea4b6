import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface Devolucion {
  codigo: string;
  nombre: string;
  cantidad: number;
  motivo: string;
  monto?: number;
}

interface RequestBody {
  orden_compra_id: string;
  devoluciones?: Devolucion[];
}

const MOTIVO_LABELS: Record<string, string> = {
  roto: "Empaque roto",
  rechazado_calidad: "Calidad rechazada",
  no_llego: "Faltante",
  faltante: "Faltante",
  dañado: "Dañado",
  vencido: "Vencido",
  error_cantidad: "Error cantidad",
};

const formatMotivo = (motivo: string): string => {
  return MOTIVO_LABELS[motivo] || motivo;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const { orden_compra_id, devoluciones = [] } = body;

    if (!orden_compra_id) {
      return new Response(
        JSON.stringify({ error: 'orden_compra_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Si no hay devoluciones, no hay nada que notificar
    if (devoluciones.length === 0) {
      console.log('No hay devoluciones para notificar');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No hay devoluciones para notificar'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Obtener datos de la OC con proveedor
    const { data: ordenCompra, error: ocError } = await supabase
      .from('ordenes_compra')
      .select(`
        id,
        folio,
        proveedor_id,
        proveedor_nombre_manual,
        proveedores (
          id,
          nombre
        )
      `)
      .eq('id', orden_compra_id)
      .single();

    if (ocError || !ordenCompra) {
      console.error('Error fetching OC:', ocError);
      return new Response(
        JSON.stringify({ error: 'Orden de compra no encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const proveedorData = ordenCompra.proveedores as unknown as { id: string; nombre: string } | null;
    const proveedorNombre = proveedorData?.nombre || ordenCompra.proveedor_nombre_manual || 'Proveedor';

    // Obtener contactos del proveedor que reciben devoluciones o logística
    let emailsDestinatarios: string[] = [];
    
    if (ordenCompra.proveedor_id) {
      const { data: contactos } = await supabase
        .from('proveedor_contactos')
        .select('email, recibe_logistica, recibe_devoluciones')
        .eq('proveedor_id', ordenCompra.proveedor_id)
        .eq('activo', true)
        .not('email', 'is', null)
        .neq('email', '');

      if (contactos && contactos.length > 0) {
        // Priorizar contactos que reciben devoluciones
        const contactosDevoluciones = contactos.filter(c => c.recibe_devoluciones);
        if (contactosDevoluciones.length > 0) {
          emailsDestinatarios = contactosDevoluciones.map(c => c.email!);
        } else {
          // Si no hay, usar los de logística
          const contactosLogistica = contactos.filter(c => c.recibe_logistica);
          if (contactosLogistica.length > 0) {
            emailsDestinatarios = contactosLogistica.map(c => c.email!);
          } else if (contactos[0]?.email) {
            // Si no hay ninguno, usar el primer contacto con email
            emailsDestinatarios = [contactos[0].email];
          }
        }
      }
    }

    if (emailsDestinatarios.length === 0) {
      console.log('No email recipients found for OC:', ordenCompra.folio);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'No se encontraron contactos para notificar',
          folio: ordenCompra.folio
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Construir HTML del correo - SOLO DEVOLUCIONES, SIN MONTOS
    const devolucionesRows = devoluciones.map(d => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${d.nombre}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${d.cantidad}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${formatMotivo(d.motivo)}</td>
      </tr>
    `).join('');

    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px;">Notificación de Devoluciones</h1>
        </div>
        
        <div style="padding: 20px; background: #f9fafb;">
          <p>Estimado proveedor,</p>
          
          <p>Le notificamos que durante la recepción de la <strong>Orden de Compra ${ordenCompra.folio}</strong>, 
          los siguientes productos fueron devueltos:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background: #fef2f2;">
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Producto</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Cantidad</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Motivo</th>
            </tr>
            ${devolucionesRows}
          </table>
          
          <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 6px; margin-top: 20px;">
            <p style="margin: 0; color: #856404;">
              <strong>Nota:</strong> Esta notificación es únicamente para su registro. 
              El ajuste correspondiente se aplicará al momento del pago.
            </p>
          </div>
          
          <p style="margin-top: 30px;">Saludos cordiales,</p>
          <p><strong>Abarrotes La Manita S.A. de C.V.</strong><br>
          Departamento de Compras</p>
        </div>
        
        <div style="background: #374151; padding: 15px; text-align: center;">
          <p style="color: #9ca3af; margin: 0; font-size: 12px;">
            Este correo fue enviado automáticamente. Para cualquier duda, contactar a compras@almasa.com.mx
          </p>
        </div>
      </div>
    `;

    const asunto = `Notificación de Devoluciones - ${ordenCompra.folio}`;

    // Preparar payload del email
    const emailPayload: Record<string, unknown> = {
      action: 'send',
      email: 'compras@almasa.com.mx',
      to: emailsDestinatarios[0],
      cc: emailsDestinatarios.slice(1).join(',') || undefined,
      subject: asunto,
      body: emailBody
    };

    // Enviar email
    const { error: sendError } = await supabase.functions.invoke('gmail-api', {
      body: emailPayload
    });

    if (sendError) {
      console.error('Error sending email:', sendError);
      throw sendError;
    }

    console.log(`Notificación de devoluciones enviada para ${ordenCompra.folio} a ${emailsDestinatarios.join(', ')}`);

    // Registrar en correos_enviados
    await supabase.from('correos_enviados').insert({
      tipo: 'devoluciones_oc',
      referencia_id: orden_compra_id,
      destinatario: emailsDestinatarios.join(', '),
      asunto: asunto,
      contenido_preview: `Notificación de ${devoluciones.length} productos devueltos`,
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        folio: ordenCompra.folio,
        emails: emailsDestinatarios,
        devoluciones_notificadas: devoluciones.length
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in notificar-cierre-oc:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
