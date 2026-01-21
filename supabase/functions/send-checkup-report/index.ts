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

    const { checkupId, emailMecanico } = await req.json();

    if (!checkupId || !emailMecanico) {
      throw new Error("checkupId y emailMecanico son requeridos");
    }

    console.log(`Enviando reporte de checkup ${checkupId} a ${emailMecanico}`);

    // Obtener datos del checkup
    const { data: checkup, error: checkupError } = await supabase
      .from("vehiculos_checkups")
      .select(`
        *,
        vehiculos:vehiculo_id (nombre, placa, marca, modelo, anio),
        chofer:chofer_id (nombre_completo, telefono),
        realizado:realizado_por (nombre_completo)
      `)
      .eq("id", checkupId)
      .single();

    if (checkupError || !checkup) {
      throw new Error(`Checkup no encontrado: ${checkupError?.message}`);
    }

    // Preparar lista de items con fallas
    const items = [
      { key: "frenos_ok", label: "Sistema de Frenos", ok: checkup.frenos_ok },
      { key: "luces_ok", label: "Luces", ok: checkup.luces_ok },
      { key: "llantas_ok", label: "Llantas", ok: checkup.llantas_ok },
      { key: "aceite_ok", label: "Aceite", ok: checkup.aceite_ok },
      { key: "anticongelante_ok", label: "Anticongelante", ok: checkup.anticongelante_ok },
      { key: "espejos_ok", label: "Espejos", ok: checkup.espejos_ok },
      { key: "limpiadores_ok", label: "Limpiadores", ok: checkup.limpiadores_ok },
      { key: "bateria_ok", label: "Batería", ok: checkup.bateria_ok },
      { key: "direccion_ok", label: "Dirección", ok: checkup.direccion_ok },
      { key: "suspension_ok", label: "Suspensión", ok: checkup.suspension_ok },
      { key: "escape_ok", label: "Escape", ok: checkup.escape_ok },
      { key: "cinturones_ok", label: "Cinturones", ok: checkup.cinturones_ok },
    ];

    const itemsConFalla = items.filter(item => !item.ok);
    const itemsOk = items.filter(item => item.ok);

    const vehiculo = checkup.vehiculos as any;
    const chofer = checkup.chofer as any;
    const realizado = checkup.realizado as any;

    const prioridadColorMap: Record<string, string> = {
      urgente: '#dc2626',
      alta: '#ea580c',
      media: '#ca8a04',
      baja: '#6b7280'
    };
    const prioridadColor = prioridadColorMap[checkup.prioridad || 'media'] || '#6b7280';

    const prioridadTextoMap: Record<string, string> = {
      urgente: 'URGENTE - Atender hoy',
      alta: 'Alta - Atender esta semana',
      media: 'Media - Atender pronto',
      baja: 'Baja - Puede esperar'
    };
    const prioridadTexto = prioridadTextoMap[checkup.prioridad || 'media'] || 'Media';

    // Generar HTML del correo
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
    .header { background: #1e3a5f; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .section { margin-bottom: 20px; padding: 15px; background: #f9fafb; border-radius: 8px; }
    .section-title { font-weight: bold; margin-bottom: 10px; color: #1e3a5f; }
    .priority { display: inline-block; padding: 4px 12px; border-radius: 4px; color: white; font-weight: bold; }
    .falla { color: #dc2626; }
    .ok { color: #16a34a; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 8px; border-bottom: 1px solid #e5e7eb; }
    .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🔧 Reporte de Checkup - Requiere Reparación</h1>
  </div>
  
  <div class="content">
    <div class="section">
      <div class="section-title">📋 Información del Vehículo</div>
      <table>
        <tr>
          <td><strong>Unidad:</strong></td>
          <td>${vehiculo?.nombre || 'N/A'}</td>
        </tr>
        <tr>
          <td><strong>Placa:</strong></td>
          <td>${vehiculo?.placa || 'Sin placa'}</td>
        </tr>
        <tr>
          <td><strong>Marca/Modelo:</strong></td>
          <td>${vehiculo?.marca || ''} ${vehiculo?.modelo || ''} ${vehiculo?.anio || ''}</td>
        </tr>
        ${chofer ? `
        <tr>
          <td><strong>Chofer:</strong></td>
          <td>${chofer.nombre_completo}${chofer.telefono ? ` - Tel: ${chofer.telefono}` : ''}</td>
        </tr>
        ` : ''}
        <tr>
          <td><strong>Revisado por:</strong></td>
          <td>${realizado?.nombre_completo || 'N/A'}</td>
        </tr>
        <tr>
          <td><strong>Fecha:</strong></td>
          <td>${new Date(checkup.fecha_checkup).toLocaleString('es-MX')}</td>
        </tr>
      </table>
    </div>

    <div class="section">
      <div class="section-title">⚠️ Prioridad</div>
      <span class="priority" style="background-color: ${prioridadColor};">
        ${prioridadTexto}
      </span>
    </div>

    <div class="section">
      <div class="section-title">❌ Items con Falla (${itemsConFalla.length})</div>
      <ul>
        ${itemsConFalla.map(item => `<li class="falla"><strong>${item.label}</strong></li>`).join('')}
      </ul>
    </div>

    ${checkup.fallas_detectadas ? `
    <div class="section">
      <div class="section-title">📝 Descripción de Fallas</div>
      <p>${checkup.fallas_detectadas}</p>
    </div>
    ` : ''}

    <div class="section">
      <div class="section-title">✅ Items OK (${itemsOk.length})</div>
      <p class="ok">${itemsOk.map(item => item.label).join(', ')}</p>
    </div>
  </div>

  <div class="footer">
    <p>Este correo fue generado automáticamente por el Sistema de Gestión de Flotilla</p>
    <p>Abarrotes La Manita - Almasa</p>
  </div>
</body>
</html>
    `;

    // Enviar correo usando gmail-api
    const { error: emailError } = await supabase.functions.invoke("gmail-api", {
      body: {
        action: "send",
        email: "compras@almasa.com.mx",
        to: emailMecanico,
        subject: `🔧 [${checkup.prioridad?.toUpperCase() || 'MEDIA'}] Reporte de Checkup - ${vehiculo?.nombre || 'Vehículo'}`,
        body: htmlBody,
      }
    });

    if (emailError) {
      console.error("Error enviando email:", emailError);
      throw new Error(`Error al enviar correo: ${emailError.message}`);
    }

    // Marcar como notificado
    await supabase
      .from("vehiculos_checkups")
      .update({ 
        notificado_mecanico: true, 
        notificado_en: new Date().toISOString() 
      })
      .eq("id", checkupId);

    console.log("Reporte enviado exitosamente");

    return new Response(
      JSON.stringify({ success: true, message: "Reporte enviado" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error en send-checkup-report:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
