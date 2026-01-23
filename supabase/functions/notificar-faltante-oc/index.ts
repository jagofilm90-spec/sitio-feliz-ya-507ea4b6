import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface ProductoFaltante {
  producto_id: string | null;
  nombre: string;
  cantidad_faltante: number;
}

interface RequestBody {
  tipo: 'faltante_creado' | 'fecha_modificada' | 'faltante_cancelado' | 'recordatorio';
  entrega_id: string;
  orden_folio: string;
  proveedor_email: string;
  proveedor_nombre: string;
  productos_faltantes?: ProductoFaltante[];
  fecha_programada?: string;
  fecha_anterior?: string;
  fecha_nueva?: string;
  motivo_cancelacion?: string;
}

const formatFecha = (fechaStr: string | undefined): string => {
  if (!fechaStr) return 'Sin fecha';
  try {
    const fecha = new Date(fechaStr + 'T12:00:00');
    return fecha.toLocaleDateString('es-MX', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return fechaStr;
  }
};

const getProductosHTML = (productos: ProductoFaltante[] | undefined): string => {
  if (!productos || productos.length === 0) {
    return '<li>Ver detalles en la orden</li>';
  }
  return productos.map(p => 
    `<li><strong>${p.cantidad_faltante}</strong> x ${p.nombre}</li>`
  ).join('');
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const { 
      tipo, 
      orden_folio, 
      proveedor_email, 
      proveedor_nombre,
      productos_faltantes,
      fecha_programada,
      fecha_anterior,
      fecha_nueva,
      motivo_cancelacion
    } = body;

    if (!proveedor_email) {
      return new Response(
        JSON.stringify({ error: 'No email provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get gmail account
    const { data: gmailAccount } = await supabase
      .from('gmail_cuentas')
      .select('email')
      .eq('email', 'compras@almasa.com.mx')
      .eq('activo', true)
      .single();

    if (!gmailAccount) {
      console.log('No active Gmail account found for compras@almasa.com.mx');
      return new Response(
        JSON.stringify({ error: 'No Gmail account configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let asunto = '';
    let cuerpoHTML = '';

    const headerHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Abarrotes La Manita</h1>
        </div>
        <div style="padding: 20px; background: #f9fafb;">
    `;

    const footerHTML = `
        </div>
        <div style="background: #374151; padding: 15px; text-align: center;">
          <p style="color: #9ca3af; margin: 0; font-size: 12px;">
            Este correo fue enviado automáticamente. Por favor no responder directamente.
          </p>
          <p style="color: #9ca3af; margin: 5px 0 0; font-size: 12px;">
            Para cualquier duda, contactar a compras@almasa.com.mx
          </p>
        </div>
      </div>
    `;

    switch (tipo) {
      case 'faltante_creado':
        asunto = `⚠️ Producto faltante en entrega - ${orden_folio}`;
        cuerpoHTML = `
          ${headerHTML}
          <h2 style="color: #dc2626; margin-top: 0;">Notificación de Producto Faltante</h2>
          <p>Estimado ${proveedor_nombre},</p>
          <p>Durante la recepción de mercancía de la orden <strong>${orden_folio}</strong>, los siguientes productos <strong>no fueron entregados</strong>:</p>
          
          <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
            <p style="font-weight: bold; color: #991b1b; margin: 0 0 10px;">Productos faltantes:</p>
            <ul style="margin: 0; padding-left: 20px; color: #991b1b;">
              ${getProductosHTML(productos_faltantes)}
            </ul>
          </div>
          
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
            <p style="font-weight: bold; color: #92400e; margin: 0;">
              📅 Se ha programado la entrega para: <strong>${formatFecha(fecha_programada)}</strong>
            </p>
          </div>
          
          <p>Por favor confirme si puede realizar la entrega en la fecha indicada o contacte a nuestro departamento de compras si necesita proponer una fecha diferente.</p>
          
          <p style="margin-top: 30px;">Saludos cordiales,<br><strong>Departamento de Compras</strong></p>
          ${footerHTML}
        `;
        break;

      case 'fecha_modificada':
        asunto = `📅 Cambio de fecha de entrega - ${orden_folio}`;
        cuerpoHTML = `
          ${headerHTML}
          <h2 style="color: #2563eb; margin-top: 0;">Cambio de Fecha de Entrega</h2>
          <p>Estimado ${proveedor_nombre},</p>
          <p>Le informamos que la fecha de entrega para los productos faltantes de la orden <strong>${orden_folio}</strong> ha sido modificada.</p>
          
          <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
            <p style="margin: 0 0 10px;"><strong>Productos pendientes:</strong></p>
            <ul style="margin: 0 0 15px; padding-left: 20px;">
              ${getProductosHTML(productos_faltantes)}
            </ul>
            <p style="margin: 0; text-decoration: line-through; color: #6b7280;">
              Fecha anterior: ${formatFecha(fecha_anterior)}
            </p>
            <p style="margin: 5px 0 0; font-weight: bold; color: #1d4ed8;">
              ✅ Nueva fecha: ${formatFecha(fecha_nueva)}
            </p>
          </div>
          
          <p>Por favor tome nota de la nueva fecha de entrega.</p>
          
          <p style="margin-top: 30px;">Saludos cordiales,<br><strong>Departamento de Compras</strong></p>
          ${footerHTML}
        `;
        break;

      case 'faltante_cancelado':
        asunto = `❌ Cancelación de entrega pendiente - ${orden_folio}`;
        cuerpoHTML = `
          ${headerHTML}
          <h2 style="color: #dc2626; margin-top: 0;">Cancelación de Entrega Pendiente</h2>
          <p>Estimado ${proveedor_nombre},</p>
          <p>Le informamos que <strong>ya no requerimos</strong> la entrega de los siguientes productos de la orden <strong>${orden_folio}</strong>:</p>
          
          <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
            <p style="margin: 0 0 10px; font-weight: bold; color: #991b1b;">Productos cancelados:</p>
            <ul style="margin: 0; padding-left: 20px; color: #991b1b;">
              ${getProductosHTML(productos_faltantes)}
            </ul>
          </div>
          
          ${motivo_cancelacion ? `
          <div style="background: #f3f4f6; padding: 15px; margin: 20px 0; border-radius: 8px;">
            <p style="margin: 0; font-weight: bold;">Motivo:</p>
            <p style="margin: 5px 0 0; color: #4b5563;">${motivo_cancelacion}</p>
          </div>
          ` : ''}
          
          <p>Por favor ignore cualquier comunicación anterior respecto a estos productos.</p>
          
          <p style="margin-top: 30px;">Saludos cordiales,<br><strong>Departamento de Compras</strong></p>
          ${footerHTML}
        `;
        break;

      case 'recordatorio':
        asunto = `🔔 Recordatorio: Entrega pendiente mañana - ${orden_folio}`;
        cuerpoHTML = `
          ${headerHTML}
          <h2 style="color: #f59e0b; margin-top: 0;">Recordatorio de Entrega Pendiente</h2>
          <p>Estimado ${proveedor_nombre},</p>
          <p>Le recordamos que tiene una <strong>entrega pendiente</strong> programada para la orden <strong>${orden_folio}</strong>.</p>
          
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
            <p style="margin: 0 0 10px; font-weight: bold; color: #92400e;">
              📅 Fecha de entrega: ${formatFecha(fecha_programada)}
            </p>
            <p style="margin: 10px 0 0; font-weight: bold; color: #92400e;">Productos a entregar:</p>
            <ul style="margin: 5px 0 0; padding-left: 20px; color: #92400e;">
              ${getProductosHTML(productos_faltantes)}
            </ul>
          </div>
          
          <p>Por favor asegúrese de contar con los productos para la fecha indicada.</p>
          
          <p style="margin-top: 30px;">Saludos cordiales,<br><strong>Departamento de Compras</strong></p>
          ${footerHTML}
        `;
        break;

      default:
        return new Response(
          JSON.stringify({ error: 'Tipo de notificación no válido' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // Send email using gmail-api
    const { error: sendError } = await supabase.functions.invoke('gmail-api', {
      body: {
        action: 'send',
        email: 'compras@almasa.com.mx',
        to: proveedor_email,
        subject: asunto,
        body: cuerpoHTML
      }
    });

    if (sendError) {
      console.error('Error sending email:', sendError);
      throw sendError;
    }

    console.log(`Email sent successfully: ${tipo} to ${proveedor_email}`);

    return new Response(
      JSON.stringify({ success: true, tipo, email: proveedor_email }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in notificar-faltante-oc:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
