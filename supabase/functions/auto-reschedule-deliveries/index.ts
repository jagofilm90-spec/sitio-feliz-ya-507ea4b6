import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Calculate Mexican official holidays for a given year
function getMexicanHolidays(year: number): string[] {
  const holidays: string[] = []
  
  // Fixed holidays
  holidays.push(`${year}-01-01`) // Año Nuevo
  holidays.push(`${year}-05-01`) // Día del Trabajo
  holidays.push(`${year}-09-16`) // Día de la Independencia
  holidays.push(`${year}-12-25`) // Navidad
  
  // First Monday of February (Día de la Constitución)
  const feb1 = new Date(year, 1, 1)
  const dayOfWeekFeb = feb1.getDay()
  const daysUntilMondayFeb = dayOfWeekFeb === 0 ? 1 : (dayOfWeekFeb === 1 ? 0 : 8 - dayOfWeekFeb)
  const firstMondayFeb = new Date(year, 1, 1 + daysUntilMondayFeb)
  holidays.push(firstMondayFeb.toISOString().split('T')[0])
  
  // Third Monday of March (Natalicio de Benito Juárez)
  const mar1 = new Date(year, 2, 1)
  const dayOfWeekMar = mar1.getDay()
  const daysUntilMondayMar = dayOfWeekMar === 0 ? 1 : (dayOfWeekMar === 1 ? 0 : 8 - dayOfWeekMar)
  const firstMondayMar = new Date(year, 2, 1 + daysUntilMondayMar)
  const thirdMondayMar = new Date(firstMondayMar)
  thirdMondayMar.setDate(firstMondayMar.getDate() + 14)
  holidays.push(thirdMondayMar.toISOString().split('T')[0])
  
  // Third Monday of November (Día de la Revolución)
  const nov1 = new Date(year, 10, 1)
  const dayOfWeekNov = nov1.getDay()
  const daysUntilMondayNov = dayOfWeekNov === 0 ? 1 : (dayOfWeekNov === 1 ? 0 : 8 - dayOfWeekNov)
  const firstMondayNov = new Date(year, 10, 1 + daysUntilMondayNov)
  const thirdMondayNov = new Date(firstMondayNov)
  thirdMondayNov.setDate(firstMondayNov.getDate() + 14)
  holidays.push(thirdMondayNov.toISOString().split('T')[0])
  
  return holidays
}

// Get next business day INCLUSIVE (includes today if it's a business day)
// Saturday (day 6) IS a working day for this company
function getNextBusinessDayInclusive(date: Date, holidays: string[]): Date {
  const current = new Date(date)
  
  // Loop until we find a valid business day (starting from today)
  while (true) {
    const dayOfWeek = current.getDay()
    const dateStr = current.toISOString().split('T')[0]
    
    // If it's a business day (not Sunday, not holiday), return it
    if (dayOfWeek !== 0 && !holidays.includes(dateStr)) {
      return current
    }
    
    // Otherwise, try the next day
    current.setDate(current.getDate() + 1)
  }
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]
    
    // Get Mexican holidays for current year (and next year if we're in December)
    const currentYear = today.getFullYear()
    const holidays = getMexicanHolidays(currentYear)
    if (today.getMonth() === 11) {
      holidays.push(...getMexicanHolidays(currentYear + 1))
    }
    
    // Calculate next business day considering holidays
    const nextBusinessDay = getNextBusinessDayInclusive(today, holidays)
    const nextBusinessDayStr = nextBusinessDay.toISOString().split('T')[0]

    console.log(`Running auto-reschedule check for ${todayStr}`)
    console.log(`Mexican holidays for ${currentYear}: ${holidays.join(', ')}`)
    console.log(`Next business day: ${nextBusinessDayStr}`)

    // 1. Find all SCHEDULED deliveries (ordenes_compra_entregas) where fecha_programada < today
    const { data: pendingDeliveries, error: deliveriesError } = await supabase
      .from('ordenes_compra_entregas')
      .select(`
        id,
        orden_compra_id,
        numero_entrega,
        fecha_programada,
        cantidad_bultos,
        status,
        ordenes_compra (
          folio,
          proveedor_id,
          proveedores (nombre, email)
        )
      `)
      .eq('status', 'programada')
      .lt('fecha_programada', todayStr)

    if (deliveriesError) {
      throw deliveriesError
    }

    console.log(`Found ${pendingDeliveries?.length || 0} overdue scheduled deliveries`)

    // 2. Find orders with single delivery (no entregas_multiples) that are overdue
    const { data: pendingOrders, error: ordersError } = await supabase
      .from('ordenes_compra')
      .select(`
        id,
        folio,
        fecha_entrega_programada,
        status,
        entregas_multiples,
        notas,
        proveedor_id,
        proveedores (nombre, email)
      `)
      .in('status', ['enviada', 'confirmada', 'parcial'])
      .eq('entregas_multiples', false)
      .lt('fecha_entrega_programada', todayStr)
      .not('fecha_entrega_programada', 'is', null)

    if (ordersError) {
      throw ordersError
    }

    console.log(`Found ${pendingOrders?.length || 0} overdue single-delivery orders`)

    const rescheduledItems: any[] = []

    // 3. Reschedule overdue multi-delivery entries
    for (const delivery of (pendingDeliveries || [])) {
      const { error: updateError } = await supabase
        .from('ordenes_compra_entregas')
        .update({ 
          fecha_programada: nextBusinessDayStr,
          notas: `[AUTO] Reprogramada de ${delivery.fecha_programada} a ${nextBusinessDayStr} por no recepción`
        })
        .eq('id', delivery.id)

      if (!updateError) {
        const ordenData = delivery.ordenes_compra as any
        const proveedorData = ordenData?.proveedores as any
        
        rescheduledItems.push({
          type: 'entrega_multiple',
          folio: ordenData?.folio,
          proveedor: proveedorData?.nombre,
          proveedor_email: proveedorData?.email,
          numero_entrega: delivery.numero_entrega,
          fecha_original: delivery.fecha_programada,
          fecha_nueva: nextBusinessDayStr,
          cantidad_bultos: delivery.cantidad_bultos
        })
      }
    }

    // 4. Reschedule overdue single-delivery orders
    for (const order of (pendingOrders || [])) {
      // Check if order has pending deliveries (programadas or en_transito)
      const { count: countPendientes } = await supabase
        .from('ordenes_compra_entregas')
        .select('id', { count: 'exact', head: true })
        .eq('orden_compra_id', order.id)
        .in('status', ['programada', 'en_transito'])

      // Check if order has received deliveries
      const { data: entregaRecibida } = await supabase
        .from('ordenes_compra_entregas')
        .select('id')
        .eq('orden_compra_id', order.id)
        .eq('status', 'recibida')
        .limit(1)
        .maybeSingle()

      // If there are pending AND received deliveries, ensure status is 'parcial'
      if (countPendientes && countPendientes > 0) {
        if (entregaRecibida) {
          console.log(`Order ${order.folio} has pending deliveries, ensuring status is 'parcial'`)
          await supabase
            .from('ordenes_compra')
            .update({ status: 'parcial' })
            .eq('id', order.id)
        }
        continue
      }

      // Only mark as completed if NO pending deliveries and HAS received deliveries
      if (entregaRecibida && (!countPendientes || countPendientes === 0)) {
        console.log(`Order ${order.folio} has all deliveries received, marking as completed`)
        await supabase
          .from('ordenes_compra')
          .update({ status: 'completada' })
          .eq('id', order.id)
        continue
      }

      // If we reach here, it's an order without multiple deliveries that needs rescheduling
      const currentNotas = (order as any).notas || ''
      const proveedorData = (order as any).proveedores as any
      
      const { error: updateError } = await supabase
        .from('ordenes_compra')
        .update({ 
          fecha_entrega_programada: nextBusinessDayStr,
          notas: currentNotas 
            ? `${currentNotas}\n[AUTO ${todayStr}] Reprogramada de ${order.fecha_entrega_programada} a ${nextBusinessDayStr} por no recepción`
            : `[AUTO ${todayStr}] Reprogramada de ${order.fecha_entrega_programada} a ${nextBusinessDayStr} por no recepción`
        })
        .eq('id', order.id)

      if (!updateError) {
        rescheduledItems.push({
          type: 'orden_simple',
          folio: order.folio,
          proveedor: proveedorData?.nombre,
          proveedor_email: proveedorData?.email,
          fecha_original: order.fecha_entrega_programada,
          fecha_nueva: nextBusinessDayStr
        })
      }
    }

    // 5. Create notifications for rescheduled items
    if (rescheduledItems.length > 0) {
      const notificaciones = rescheduledItems.map(item => ({
        tipo: 'entrega_reprogramada',
        titulo: `Entrega reprogramada: ${item.folio}`,
        descripcion: `La entrega de ${item.proveedor} programada para ${new Date(item.fecha_original).toLocaleDateString('es-MX')} fue reprogramada automáticamente para ${new Date(item.fecha_nueva).toLocaleDateString('es-MX')} por no recepción.`,
        leida: false
      }))

      await supabase
        .from('notificaciones')
        .insert(notificaciones)

      // 6. Optionally send email notifications to suppliers with email
      for (const item of rescheduledItems) {
        if (item.proveedor_email) {
          try {
            await supabase.functions.invoke('gmail-api', {
              body: {
                action: 'send',
                email: 'compras@almasa.com.mx',
                to: item.proveedor_email,
                subject: `Entrega reprogramada - ${item.folio}`,
                body: `
                  <div style="font-family: Arial, sans-serif;">
                    <h2>Notificación de Reprogramación</h2>
                    <p>Le informamos que la entrega programada para el <strong>${new Date(item.fecha_original).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}</strong> de la orden <strong>${item.folio}</strong> no fue recibida.</p>
                    <p>La entrega ha sido reprogramada automáticamente para el <strong>${new Date(item.fecha_nueva).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}</strong>.</p>
                    <p>Por favor confirme la nueva fecha de entrega.</p>
                    <hr>
                    <p style="color: #666; font-size: 12px;">Abarrotes La Manita - Sistema ERP</p>
                  </div>
                `
              }
            })
          } catch (emailError) {
            console.error(`Error sending email to ${item.proveedor_email}:`, emailError)
          }
        }
      }
    }

    console.log(`Rescheduled ${rescheduledItems.length} deliveries`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${rescheduledItems.length} overdue deliveries`,
        holidays: holidays,
        nextBusinessDay: nextBusinessDayStr,
        rescheduled: rescheduledItems
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error: any) {
    console.error('Error in auto-reschedule:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
