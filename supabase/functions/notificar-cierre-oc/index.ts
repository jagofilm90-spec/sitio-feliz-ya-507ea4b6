import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface ProductoRecibido {
  codigo: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

interface Devolucion {
  codigo: string;
  nombre: string;
  cantidad: number;
  motivo: string;
  monto: number;
}

interface RequestBody {
  orden_compra_id: string;
  pdf_base64?: string;
  pdf_filename?: string;
  productos_recibidos?: ProductoRecibido[];
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
    const { 
      orden_compra_id, 
      pdf_base64, 
      pdf_filename,
      productos_recibidos = [],
      devoluciones = []
    } = body;

    if (!orden_compra_id) {
      return new Response(
        JSON.stringify({ error: 'orden_compra_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Obtener datos de la OC con proveedor
    const { data: ordenCompra, error: ocError } = await supabase
      .from('ordenes_compra')
      .select(`
        id,
        folio,
        total,
        monto_devoluciones,
        total_ajustado,
        proveedor_id,
        proveedor_nombre_manual,
        fecha_creacion,
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

    // Obtener contactos del proveedor que reciben logística o devoluciones
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
        // Priorizar contactos que reciben devoluciones si hay devoluciones
        if (devoluciones.length > 0) {
          const contactosDevoluciones = contactos.filter(c => c.recibe_devoluciones);
          if (contactosDevoluciones.length > 0) {
            emailsDestinatarios = contactosDevoluciones.map(c => c.email!);
          }
        }
        
        // Si no hay contactos de devoluciones, usar los de logística
        if (emailsDestinatarios.length === 0) {
          const contactosLogistica = contactos.filter(c => c.recibe_logistica);
          if (contactosLogistica.length > 0) {
            emailsDestinatarios = contactosLogistica.map(c => c.email!);
          }
        }
        
        // Si aún no hay, usar el primer contacto con email
        if (emailsDestinatarios.length === 0 && contactos[0]?.email) {
          emailsDestinatarios = [contactos[0].email];
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

    // Construir HTML del correo
    const tieneDevoluciiones = devoluciones.length > 0;
    const montoFinal = ordenCompra.total_ajustado ?? ordenCompra.total ?? 0;

    // Tabla de productos recibidos
    let productosRecibidosHTML = '';
    if (productos_recibidos.length > 0) {
      const rows = productos_recibidos.map(p => `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">${p.codigo}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${p.nombre}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${p.cantidad.toLocaleString()}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">$${p.precio_unitario.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">$${p.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
        </tr>
      `).join('');

      productosRecibidosHTML = `
        <h3 style="color: #228B22; margin-top: 25px;">✓ Productos Recibidos</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
          <tr style="background: #f0fff0;">
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Código</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Producto</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">Cantidad</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">P.U.</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Subtotal</th>
          </tr>
          ${rows}
        </table>
      `;
    }

    // Tabla de devoluciones
    let devolucionesHTML = '';
    if (tieneDevoluciiones) {
      const rows = devoluciones.map(d => `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">${d.nombre}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${d.cantidad}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${formatMotivo(d.motivo)}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right; color: #dc2626;">-$${d.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
        </tr>
      `).join('');

      devolucionesHTML = `
        <h3 style="color: #dc2626; margin-top: 25px;">⚠️ Productos Devueltos</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
          <tr style="background: #fef2f2;">
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Producto</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">Cantidad</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Motivo</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Descuento</th>
          </tr>
          ${rows}
          <tr style="background: #fef2f2; font-weight: bold;">
            <td colspan="3" style="padding: 8px; border: 1px solid #ddd; text-align: right;">Total Devoluciones:</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right; color: #dc2626;">-$${(ordenCompra.monto_devoluciones || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
          </tr>
        </table>
      `;
    }

    // Correo completo
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Estado de Cuenta - Orden de Compra</h1>
        </div>
        
        <div style="padding: 20px; background: #f9fafb;">
          <p>Estimado proveedor,</p>
          <p>Le enviamos el estado de cuenta correspondiente a la siguiente orden de compra:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; background: #f5f5f5; font-weight: bold; width: 150px;">Folio OC:</td>
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; font-size: 16px;">${ordenCompra.folio}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; background: #f5f5f5; font-weight: bold;">Proveedor:</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${proveedorNombre}</td>
            </tr>
          </table>
          
          ${productosRecibidosHTML}
          ${devolucionesHTML}
          
          <div style="background: #f0f4ff; border: 2px solid #3b82f6; padding: 20px; margin-top: 25px; border-radius: 8px;">
            <h3 style="color: #1e40af; margin-top: 0;">Resumen Financiero</h3>
            <table style="width: 100%;">
              ${tieneDevoluciiones ? `
              <tr>
                <td style="padding: 6px 0;">Total Original:</td>
                <td style="padding: 6px 0; text-align: right; font-weight: bold;">$${(ordenCompra.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #dc2626;">(-) Devoluciones:</td>
                <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #dc2626;">-$${(ordenCompra.monto_devoluciones || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr><td colspan="2"><hr style="border: 1px solid #3b82f6;"></td></tr>
              ` : ''}
              <tr>
                <td style="padding: 8px 0; font-size: 18px; font-weight: bold; color: #16a34a;">TOTAL A PAGAR:</td>
                <td style="padding: 8px 0; text-align: right; font-size: 20px; font-weight: bold; color: #16a34a;">$${montoFinal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
              </tr>
            </table>
          </div>
          
          ${pdf_base64 ? '<p style="margin-top: 20px;">Adjuntamos el Estado de Cuenta detallado en formato PDF para su referencia.</p>' : ''}
          
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

    const asunto = tieneDevoluciiones 
      ? `Estado de Cuenta con Devoluciones - ${ordenCompra.folio}`
      : `Estado de Cuenta - ${ordenCompra.folio}`;

    // Preparar payload del email
    const emailPayload: Record<string, unknown> = {
      action: 'send',
      email: 'compras@almasa.com.mx',
      to: emailsDestinatarios[0], // Primer destinatario principal
      cc: emailsDestinatarios.slice(1).join(',') || undefined, // Resto como CC
      subject: asunto,
      body: emailBody
    };

    // Agregar PDF como adjunto si existe
    if (pdf_base64 && pdf_filename) {
      emailPayload.attachments = [{
        filename: pdf_filename,
        content: pdf_base64,
        mimeType: 'application/pdf'
      }];
    }

    // Enviar email
    const { error: sendError } = await supabase.functions.invoke('gmail-api', {
      body: emailPayload
    });

    if (sendError) {
      console.error('Error sending email:', sendError);
      throw sendError;
    }

    console.log(`Estado de Cuenta enviado exitosamente para ${ordenCompra.folio} a ${emailsDestinatarios.join(', ')}`);

    // Registrar en correos_enviados
    await supabase.from('correos_enviados').insert({
      tipo: 'cierre_oc',
      referencia_id: orden_compra_id,
      destinatario: emailsDestinatarios.join(', '),
      asunto: asunto,
      contenido_preview: `Estado de Cuenta ${ordenCompra.folio}. Total: $${montoFinal.toLocaleString('es-MX')}`,
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        folio: ordenCompra.folio,
        emails: emailsDestinatarios,
        tiene_devoluciones: tieneDevoluciiones
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
