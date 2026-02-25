import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { entregaId, motivo, fotosStoragePaths } = await req.json()

    if (!entregaId) {
      return new Response(
        JSON.stringify({ error: 'entregaId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get entrega with OC and proveedor data
    const { data: entrega, error: entregaError } = await supabase
      .from('ordenes_compra_entregas')
      .select(`
        id,
        numero_entrega,
        fecha_programada,
        orden_compra:ordenes_compra (
          folio,
          proveedor_id,
          proveedor_nombre_manual,
          proveedor:proveedores (
            nombre,
            email
          )
        )
      `)
      .eq('id', entregaId)
      .single()

    if (entregaError || !entrega) {
      console.error('Entrega not found:', entregaError)
      return new Response(
        JSON.stringify({ error: 'Entrega not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const oc = entrega.orden_compra as any
    const proveedorEmail = oc?.proveedor?.email
    const proveedorNombre = oc?.proveedor?.nombre || oc?.proveedor_nombre_manual || 'Proveedor'
    const folio = oc?.folio || 'Sin folio'

    if (!proveedorEmail) {
      console.log('No provider email found, skipping notification')
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'No provider email' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const fechaFormateada = entrega.fecha_programada
      ? new Date(entrega.fecha_programada + 'T12:00:00').toLocaleDateString('es-MX', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : 'Sin fecha'

    const asunto = `⛔ Descarga Cancelada - Producto en mal estado - ${folio}`

    // Build photos HTML section using signed URLs (bucket is private)
    let fotosHTML = ''
    const storagePaths: string[] = fotosStoragePaths || []
    if (storagePaths.length > 0) {
      // Generate signed URLs valid for 7 days
      const signedItems: string[] = []
      for (let i = 0; i < storagePaths.length; i++) {
        const { data: signedData } = await supabase.storage
          .from('recepciones-evidencias')
          .createSignedUrl(storagePaths[i], 60 * 60 * 24 * 7) // 7 days

        if (signedData?.signedUrl) {
          signedItems.push(
            `<div style="display:inline-block;margin:5px;">
              <a href="${signedData.signedUrl}" target="_blank">
                <img src="${signedData.signedUrl}" alt="Evidencia ${i + 1}" style="width:180px;height:130px;object-fit:cover;border-radius:6px;border:1px solid #e5e7eb;" />
              </a>
            </div>`
          )
        }
      }

      if (signedItems.length > 0) {
        fotosHTML = `
          <div style="margin: 20px 0;">
            <p style="font-weight: bold; color: #374151; margin-bottom: 10px;">📷 Evidencia fotográfica:</p>
            <div style="text-align: center;">
              ${signedItems.join('')}
            </div>
          </div>
        `
      }
    }

    const cuerpoHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Abarrotes La Manita</h1>
        </div>
        <div style="padding: 20px; background: #f9fafb;">
          <h2 style="color: #dc2626; margin-top: 0;">Descarga Cancelada — Producto en mal estado</h2>
          <p>Estimado ${proveedorNombre},</p>
          <p>Le informamos que la descarga de la orden <strong>${folio}</strong> programada para el <strong>${fechaFormateada}</strong> ha sido <strong style="color: #dc2626;">cancelada</strong> debido a que el producto se encontró en mal estado.</p>
          
          <div style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
            <p style="font-weight: bold; color: #dc2626; margin: 0 0 10px;">Motivo de cancelación:</p>
            <p style="color: #7f1d1d; margin: 0;">${motivo}</p>
          </div>

          ${fotosHTML}
          
          <p>Se requiere coordinación para la devolución del producto y reprogramar la entrega. Por favor comuníquese con nuestro departamento de compras.</p>
          
          <p style="margin-top: 30px;">Saludos cordiales,<br><strong>Departamento de Compras</strong></p>
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
    `

    // Send email via gmail-api
    const { error: sendError } = await supabase.functions.invoke('gmail-api', {
      body: {
        action: 'send',
        email: 'compras@almasa.com.mx',
        to: proveedorEmail,
        subject: asunto,
        body: cuerpoHTML,
      },
    })

    if (sendError) {
      console.error('Error sending email:', sendError)
      throw sendError
    }

    // Log the email
    await supabase.from('correos_enviados').insert({
      tipo: 'cancelacion_descarga',
      destinatario: proveedorEmail,
      asunto,
      contenido_preview: `Descarga cancelada: ${motivo}`,
      referencia_id: entregaId,
      gmail_cuenta_id: null,
    })

    console.log(`Cancelación descarga email sent to ${proveedorEmail} for ${folio}`)

    return new Response(
      JSON.stringify({ success: true, email: proveedorEmail }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Error in notificar-cancelacion-descarga:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
