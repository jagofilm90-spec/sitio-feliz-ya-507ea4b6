import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get tomorrow's day of week
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDayIndex = tomorrow.getDay();
    const tomorrowDayName = DIAS_SEMANA[tomorrowDayIndex];
    
    const tomorrowFormatted = tomorrow.toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });

    console.log(`Checking programaciones for: ${tomorrowDayName} (${tomorrowFormatted})`);

    // Fetch all active programaciones for tomorrow
    const { data: programaciones, error: progError } = await supabase
      .from('cliente_programacion_pedidos')
      .select(`
        id,
        cliente_id,
        sucursal_id,
        dia_semana,
        notas,
        clientes (
          id,
          nombre,
          codigo,
          vendedor_asignado
        ),
        cliente_sucursales (
          id,
          nombre,
          codigo_sucursal
        )
      `)
      .eq('dia_semana', tomorrowDayName)
      .eq('activo', true);

    if (progError) {
      console.error('Error fetching programaciones:', progError);
      throw progError;
    }

    console.log(`Found ${programaciones?.length || 0} programaciones for ${tomorrowDayName}`);

    if (!programaciones || programaciones.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `No hay programaciones para ${tomorrowDayName}`,
          count: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const notificationsCreated: string[] = [];
    const pushNotificationsSent: string[] = [];

    for (const prog of programaciones) {
      const cliente = prog.clientes as any;
      const sucursal = prog.cliente_sucursales as any;
      
      if (!cliente) continue;

      const sucursalInfo = sucursal 
        ? ` - Sucursal: ${sucursal.nombre}` 
        : '';
      
      const notasInfo = prog.notas 
        ? ` (${prog.notas})` 
        : '';

      // Create notification in the notificaciones table
      const { error: notifError } = await supabase
        .from('notificaciones')
        .insert({
          tipo: 'pedido_programado',
          titulo: `Pedido programado: ${cliente.nombre}`,
          descripcion: `Recordatorio: ${cliente.nombre} (${cliente.codigo}) tiene pedido programado para mañana ${tomorrowFormatted}${sucursalInfo}${notasInfo}`,
          leida: false
        });

      if (notifError) {
        console.error(`Error creating notification for ${cliente.nombre}:`, notifError);
      } else {
        notificationsCreated.push(cliente.nombre);
      }

      // If there's an assigned vendor, send push notification
      if (cliente.vendedor_asignado) {
        try {
          // Get device tokens for the vendor
          const { data: tokens } = await supabase
            .from('device_tokens')
            .select('token')
            .eq('user_id', cliente.vendedor_asignado);

          if (tokens && tokens.length > 0) {
            // Call the send-push-notification function
            const { error: pushError } = await supabase.functions.invoke('send-push-notification', {
              body: {
                userId: cliente.vendedor_asignado,
                title: '📅 Pedido Programado para Mañana',
                body: `${cliente.nombre}${sucursalInfo} tiene pedido programado`,
                data: {
                  type: 'pedido_programado',
                  clienteId: cliente.id,
                  sucursalId: sucursal?.id || null
                }
              }
            });

            if (pushError) {
              console.error(`Error sending push for ${cliente.nombre}:`, pushError);
            } else {
              pushNotificationsSent.push(cliente.nombre);
            }
          }
        } catch (pushErr) {
          console.error(`Push notification error for ${cliente.nombre}:`, pushErr);
        }
      }
    }

    console.log(`Created ${notificationsCreated.length} notifications`);
    console.log(`Sent ${pushNotificationsSent.length} push notifications`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Procesadas ${programaciones.length} programaciones para ${tomorrowDayName}`,
        notificationsCreated: notificationsCreated.length,
        pushNotificationsSent: pushNotificationsSent.length,
        details: {
          notifications: notificationsCreated,
          pushNotifications: pushNotificationsSent
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in notificar-pedidos-programados:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
