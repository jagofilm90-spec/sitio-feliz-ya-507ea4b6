import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Checking vehicle document expiry dates...');

    // Get current date and date 30 days from now
    const today = new Date();
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const todayStr = today.toISOString().split('T')[0];
    const thirtyDaysStr = thirtyDaysFromNow.toISOString().split('T')[0];

    // Get active vehicles with expiring documents
    const { data: vehiculos, error: vehiculosError } = await supabase
      .from('vehiculos')
      .select('id, nombre, placa, poliza_seguro_vencimiento, tarjeta_circulacion_vencimiento, tipo_tarjeta_circulacion')
      .eq('activo', true);

    if (vehiculosError) {
      console.error('Error fetching vehicles:', vehiculosError);
      throw vehiculosError;
    }

    console.log(`Found ${vehiculos?.length || 0} active vehicles`);

    const notificationsToCreate: any[] = [];

    for (const vehiculo of vehiculos || []) {
      // Check insurance policy expiry
      if (vehiculo.poliza_seguro_vencimiento) {
        const polizaDate = new Date(vehiculo.poliza_seguro_vencimiento);
        const daysUntilExpiry = Math.ceil((polizaDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        // If expiring within 30 days (including already expired up to 30 days ago)
        if (daysUntilExpiry <= 30 && daysUntilExpiry >= -30) {
          // Check if notification already exists for this vehicle's policy
          const { data: existing } = await supabase
            .from('notificaciones')
            .select('id')
            .eq('tipo', 'poliza_vencimiento')
            .ilike('titulo', `%${vehiculo.nombre}%`)
            .gte('created_at', new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString())
            .limit(1);

          if (!existing || existing.length === 0) {
            const statusText = daysUntilExpiry < 0 
              ? `VENCIDA hace ${Math.abs(daysUntilExpiry)} días`
              : daysUntilExpiry === 0 
                ? 'VENCE HOY'
                : `vence en ${daysUntilExpiry} días`;

            notificationsToCreate.push({
              tipo: 'poliza_vencimiento',
              titulo: `Póliza de seguro: ${vehiculo.nombre}`,
              descripcion: `La póliza de seguro del vehículo "${vehiculo.nombre}" (${vehiculo.placa || 'Sin placa'}) ${statusText}. Fecha: ${new Date(vehiculo.poliza_seguro_vencimiento).toLocaleDateString('es-MX')}.`,
              fecha_vencimiento: vehiculo.poliza_seguro_vencimiento,
              leida: false,
            });
          }
        }
      }

      // Check circulation card expiry (only for state cards, federal cards don't expire)
      if (vehiculo.tarjeta_circulacion_vencimiento && vehiculo.tipo_tarjeta_circulacion !== 'federal') {
        const tarjetaDate = new Date(vehiculo.tarjeta_circulacion_vencimiento);
        const daysUntilExpiry = Math.ceil((tarjetaDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntilExpiry <= 30 && daysUntilExpiry >= -30) {
          const { data: existing } = await supabase
            .from('notificaciones')
            .select('id')
            .eq('tipo', 'tarjeta_circulacion_vencimiento')
            .ilike('titulo', `%${vehiculo.nombre}%`)
            .gte('created_at', new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString())
            .limit(1);

          if (!existing || existing.length === 0) {
            const statusText = daysUntilExpiry < 0 
              ? `VENCIDA hace ${Math.abs(daysUntilExpiry)} días`
              : daysUntilExpiry === 0 
                ? 'VENCE HOY'
                : `vence en ${daysUntilExpiry} días`;

            notificationsToCreate.push({
              tipo: 'tarjeta_circulacion_vencimiento',
              titulo: `Tarjeta de circulación: ${vehiculo.nombre}`,
              descripcion: `La tarjeta de circulación del vehículo "${vehiculo.nombre}" (${vehiculo.placa || 'Sin placa'}) ${statusText}. Fecha: ${new Date(vehiculo.tarjeta_circulacion_vencimiento).toLocaleDateString('es-MX')}.`,
              fecha_vencimiento: vehiculo.tarjeta_circulacion_vencimiento,
              leida: false,
            });
          }
        }
      }
    }

    // Insert all notifications
    if (notificationsToCreate.length > 0) {
      const { error: insertError } = await supabase
        .from('notificaciones')
        .insert(notificationsToCreate);

      if (insertError) {
        console.error('Error creating notifications:', insertError);
        throw insertError;
      }

      console.log(`Created ${notificationsToCreate.length} notifications for expiring documents`);
    } else {
      console.log('No new notifications needed');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        notificationsCreated: notificationsToCreate.length,
        vehiculosChecked: vehiculos?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in check-vehicle-documents-expiry:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
