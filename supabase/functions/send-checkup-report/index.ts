import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Category labels for the checklist
const CATEGORY_LABELS: Record<string, string> = {
  sistema_luces: "Sistema de Luces",
  parte_externa: "Parte Externa",
  parte_interna: "Parte Interna",
  estado_llantas: "Estado de Llantas",
  accesorios_seguridad: "Accesorios de Seguridad",
  tapas_otros: "Tapas y Otros",
};

// Item labels
const ITEM_LABELS: Record<string, string> = {
  luz_delantera_alta: "Luz Delantera Alta",
  luz_delantera_baja: "Luz Delantera Baja",
  luces_emergencia: "Luces de Emergencia",
  luces_neblineros: "Luces Neblineros",
  luz_direccional: "Luz Direccional",
  luz_freno_posterior: "Luz de Freno Posterior",
  luces_faros_piratas: "Luces de Faros Piratas",
  parabrisas_delantero: "Parabrisas Delantero",
  parabrisas_posterior: "Parabrisas Posterior",
  limpia_parabrisas: "Limpia Parabrisas",
  vidrio_parabrisas: "Vidrio Parabrisas",
  espejo_retrovisor: "Espejo Retrovisor",
  espejos_laterales: "Espejos Laterales",
  tablero_indicadores: "Tablero / Indicadores",
  freno_mano: "Freno de Mano",
  freno_servicio: "Freno de Servicio",
  cinturon_chofer: "Cinturón Chofer",
  cinturon_copiloto: "Cinturón Copiloto",
  cinturon_posterior: "Cinturón Posterior",
  espejo_antideslumbrante: "Espejo Antideslumbrante",
  linterna_mano: "Linterna de Mano",
  orden_limpieza_cabina: "Orden y Limpieza Cabina",
  direccion: "Dirección",
  orden_limpieza_caja: "Orden y Limpieza Caja",
  llanta_delantera_derecha: "Llanta Delantera Derecha",
  llanta_delantera_izquierda: "Llanta Delantera Izquierda",
  llanta_posterior_derecha: "Llanta Posterior Derecha",
  llanta_posterior_izquierda: "Llanta Posterior Izquierda",
  llanta_repuesto: "Llanta de Repuesto",
  conos_seguridad: "Conos de Seguridad",
  extintor: "Extintor",
  alarma_retrocesos: "Alarma de Retrocesos",
  claxon: "Claxon",
  cunas_seguridad: "Cuñas de Seguridad",
  tapa_tanque_gasolina: "Tapa Tanque Gasolina",
  gata_hidraulica: "Gata Hidráulica",
  herramientas_palanca: "Herramientas / Palanca",
  cable_cadena_estrobo: "Cable / Cadena / Estrobo",
  refrigeracion_thermo: "Refrigeración / Thermo King",
};

// NN (No Negociable) items
const NN_ITEMS = [
  "luz_delantera_alta", "luz_delantera_baja", "luces_emergencia",
  "freno_mano", "freno_servicio", 
  "cinturon_chofer", "cinturon_copiloto", "cinturon_posterior",
  "espejo_antideslumbrante", "direccion",
  "alarma_retrocesos", "claxon"
];

// Damage type configuration
const DANO_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  golpe: { label: "Golpe", color: "#dc2626", icon: "🔴" },
  raspadura: { label: "Raspadura", color: "#d97706", icon: "🟡" },
  grieta: { label: "Grieta", color: "#2563eb", icon: "🔵" },
};

// Helper to determine area label from coordinates
function getAreaLabel(x: number, y: number): string {
  let vertical = "";
  let horizontal = "";
  
  if (y < 30) vertical = "Frente";
  else if (y > 70) vertical = "Trasera";
  else vertical = "Centro";
  
  if (x < 35) horizontal = "Izquierda";
  else if (x > 65) horizontal = "Derecha";
  else horizontal = "";
  
  return `${vertical}${horizontal ? ` ${horizontal}` : ""}`;
}

// Generate damage section HTML
function generateDanosSection(observacionesGolpes: string | null): string {
  if (!observacionesGolpes) return '';
  
  // Try to parse as JSON (new format)
  try {
    const data = JSON.parse(observacionesGolpes);
    const danos = data.danos || [];
    const notas = data.notas || '';
    
    if (danos.length === 0 && !notas) return '';
    
    let html = `
    <div class="section">
      <div class="section-title">🚗 Golpes y Raspaduras</div>
    `;
    
    if (danos.length > 0) {
      html += `
      <p style="margin:0 0 10px 0;font-size:14px;"><strong>${danos.length} daño(s) documentado(s):</strong></p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:8px;text-align:left;border-bottom:2px solid #e5e7eb;">#</th>
            <th style="padding:8px;text-align:left;border-bottom:2px solid #e5e7eb;">Tipo</th>
            <th style="padding:8px;text-align:left;border-bottom:2px solid #e5e7eb;">Ubicación Aprox.</th>
          </tr>
        </thead>
        <tbody>
      `;
      
      danos.forEach((dano: { tipo: string; posicionX: number; posicionY: number }, index: number) => {
        const config = DANO_CONFIG[dano.tipo] || DANO_CONFIG.golpe;
        const ubicacion = getAreaLabel(dano.posicionX, dano.posicionY);
        html += `
          <tr>
            <td style="padding:6px;border-bottom:1px solid #e5e7eb;">${index + 1}</td>
            <td style="padding:6px;border-bottom:1px solid #e5e7eb;">
              <span style="color:${config.color};font-weight:bold;">${config.icon} ${config.label}</span>
            </td>
            <td style="padding:6px;border-bottom:1px solid #e5e7eb;">${ubicacion}</td>
          </tr>
        `;
      });
      
      html += `
        </tbody>
      </table>
      `;
    }
    
    if (notas) {
      html += `<p style="margin:10px 0 0 0;font-style:italic;color:#6b7280;">Notas: ${notas}</p>`;
    }
    
    html += `</div>`;
    return html;
    
  } catch {
    // Legacy format - plain text
    return `
    <div class="section">
      <div class="section-title">🚗 Golpes y Raspaduras</div>
      <p style="margin:0;">${observacionesGolpes}</p>
    </div>
    `;
  }
}

// Generate signatures section HTML
function generateFirmasSection(firmaConductor: string | null, firmaSupervisor: string | null): string {
  if (!firmaConductor && !firmaSupervisor) return '';
  
  return `
    <div class="section">
      <div class="section-title">✍️ Firmas de Conformidad</div>
      <div style="display: flex; gap: 40px; flex-wrap: wrap;">
        ${firmaConductor ? `
        <div style="text-align: center;">
          <img src="${firmaConductor}" style="max-width: 200px; height: 80px; object-fit: contain; border: 1px solid #e5e7eb; border-radius: 4px; background: #fafafa;" />
          <p style="margin: 5px 0 0 0; font-size: 12px; color: #6b7280;">Firma del Conductor</p>
        </div>
        ` : ''}
        ${firmaSupervisor ? `
        <div style="text-align: center;">
          <img src="${firmaSupervisor}" style="max-width: 200px; height: 80px; object-fit: contain; border: 1px solid #e5e7eb; border-radius: 4px; background: #fafafa;" />
          <p style="margin: 5px 0 0 0; font-size: 12px; color: #6b7280;">Firma del Supervisor</p>
        </div>
        ` : ''}
      </div>
    </div>
  `;
}

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

    // Get checkup data
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

    const vehiculo = checkup.vehiculos as { nombre?: string; placa?: string; marca?: string; modelo?: string; anio?: number } | null;
    const chofer = checkup.chofer as { nombre_completo?: string; telefono?: string } | null;
    const realizado = checkup.realizado as { nombre_completo?: string } | null;

    // Determine priority styling
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

    // Generate checklist HTML based on new or legacy format
    let checklistHtml = '';
    let failedNNItems: string[] = [];
    let failedItems: string[] = [];
    
    if (checkup.checklist_detalle && typeof checkup.checklist_detalle === 'object') {
      // New professional format
      const checklist = checkup.checklist_detalle as Record<string, string>;
      
      for (const [key, value] of Object.entries(checklist)) {
        const label = ITEM_LABELS[key] || key;
        const isNN = NN_ITEMS.includes(key);
        
        if (value === 'M') {
          failedItems.push(label);
          if (isNN) {
            failedNNItems.push(label);
          }
        }
      }
      
      // Generate categorized HTML
      const categories = [
        { key: 'sistema_luces', items: ['luz_delantera_alta', 'luz_delantera_baja', 'luces_emergencia', 'luces_neblineros', 'luz_direccional', 'luz_freno_posterior', 'luces_faros_piratas'] },
        { key: 'parte_externa', items: ['parabrisas_delantero', 'parabrisas_posterior', 'limpia_parabrisas', 'vidrio_parabrisas', 'espejo_retrovisor', 'espejos_laterales'] },
        { key: 'parte_interna', items: ['tablero_indicadores', 'freno_mano', 'freno_servicio', 'cinturon_chofer', 'cinturon_copiloto', 'cinturon_posterior', 'espejo_antideslumbrante', 'linterna_mano', 'orden_limpieza_cabina', 'direccion', 'orden_limpieza_caja'] },
        { key: 'estado_llantas', items: ['llanta_delantera_derecha', 'llanta_delantera_izquierda', 'llanta_posterior_derecha', 'llanta_posterior_izquierda', 'llanta_repuesto'] },
        { key: 'accesorios_seguridad', items: ['conos_seguridad', 'extintor', 'alarma_retrocesos', 'claxon', 'cunas_seguridad'] },
        { key: 'tapas_otros', items: ['tapa_tanque_gasolina', 'gata_hidraulica', 'herramientas_palanca', 'cable_cadena_estrobo', 'refrigeracion_thermo'] },
      ];

      for (const cat of categories) {
        const catLabel = CATEGORY_LABELS[cat.key] || cat.key;
        const itemsHtml = cat.items.map(itemKey => {
          const value = checklist[itemKey] || 'NA';
          const label = ITEM_LABELS[itemKey] || itemKey;
          const isNN = NN_ITEMS.includes(itemKey);
          const statusColor = value === 'B' ? '#16a34a' : value === 'M' ? '#dc2626' : '#6b7280';
          const statusText = value === 'B' ? '✓' : value === 'M' ? '✗' : '○';
          const nnBadge = isNN ? '<span style="background:#fbbf24;color:#78350f;font-size:10px;padding:1px 4px;border-radius:3px;margin-left:4px;">NN</span>' : '';
          
          return `<tr>
            <td style="padding:6px;border-bottom:1px solid #e5e7eb;">${label}${nnBadge}</td>
            <td style="padding:6px;border-bottom:1px solid #e5e7eb;text-align:center;color:${statusColor};font-weight:bold;">${statusText} ${value}</td>
          </tr>`;
        }).join('');

        checklistHtml += `
          <div style="margin-bottom:15px;">
            <h4 style="margin:0 0 8px 0;color:#1e3a5f;font-size:14px;">${catLabel}</h4>
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
              ${itemsHtml}
            </table>
          </div>
        `;
      }
    } else {
      // Legacy format (12 boolean fields)
      const legacyItems = [
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

      failedItems = legacyItems.filter(item => !item.ok).map(item => item.label);
      
      checklistHtml = `
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          ${legacyItems.map(item => `
            <tr>
              <td style="padding:6px;border-bottom:1px solid #e5e7eb;">${item.label}</td>
              <td style="padding:6px;border-bottom:1px solid #e5e7eb;text-align:center;color:${item.ok ? '#16a34a' : '#dc2626'};font-weight:bold;">${item.ok ? '✓ OK' : '✗ FALLA'}</td>
            </tr>
          `).join('')}
        </table>
      `;
    }

    // Check if PDF exists and get download URL
    let pdfAttachment: { filename: string; content: string; mimeType: string } | null = null;
    if (checkup.pdf_path) {
      try {
        const { data: pdfData, error: pdfError } = await supabase.storage
          .from('checkups-reportes-pdf')
          .download(checkup.pdf_path);
        
        if (pdfData && !pdfError) {
          const arrayBuffer = await pdfData.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          let binary = '';
          for (let i = 0; i < uint8Array.length; i++) {
            binary += String.fromCharCode(uint8Array[i]);
          }
          const base64 = btoa(binary);
          
          const fecha = new Date(checkup.fecha_checkup).toISOString().split('T')[0];
          pdfAttachment = {
            filename: `Checkup_${vehiculo?.nombre?.replace(/\s+/g, '_') || 'Vehiculo'}_${fecha}.pdf`,
            content: base64,
            mimeType: 'application/pdf'
          };
          console.log("PDF adjunto preparado");
        }
      } catch (pdfError) {
        console.error("Error descargando PDF:", pdfError);
      }
    }

    // Generate HTML email
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #1e3a5f 0%, #2d5a8a 100%); color: white; padding: 20px; text-align: center; }
    .header img { max-height: 50px; margin-bottom: 10px; }
    .content { padding: 20px; }
    .section { margin-bottom: 20px; padding: 15px; background: #f9fafb; border-radius: 8px; }
    .section-title { font-weight: bold; margin-bottom: 10px; color: #1e3a5f; font-size: 15px; }
    .priority { display: inline-block; padding: 4px 12px; border-radius: 4px; color: white; font-weight: bold; }
    .alert-box { background: #fef2f2; border: 2px solid #dc2626; border-radius: 8px; padding: 15px; margin-bottom: 20px; }
    .alert-title { color: #dc2626; font-weight: bold; font-size: 16px; margin-bottom: 8px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .info-item { padding: 8px; background: white; border-radius: 4px; }
    .info-label { font-size: 11px; color: #6b7280; text-transform: uppercase; }
    .info-value { font-size: 14px; font-weight: 600; color: #1e3a5f; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 8px; border-bottom: 1px solid #e5e7eb; }
    .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 12px; background: #f3f4f6; }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0 0 5px 0; font-size: 20px;">🔧 Reporte de Checkup Vehicular</h1>
    <p style="margin: 0; opacity: 0.9; font-size: 14px;">
      ${checkup.tiene_items_nn_fallados ? '🚨 PUNTOS NO NEGOCIABLES FALLADOS' : 'Revisión de Salida de Unidad'}
    </p>
  </div>
  
  <div class="content">
    ${checkup.tiene_items_nn_fallados && failedNNItems.length > 0 ? `
    <div class="alert-box">
      <div class="alert-title">⚠️ ALERTA: Puntos No Negociables con Falla</div>
      <p style="margin:0 0 10px 0;font-size:14px;color:#7f1d1d;">El vehículo NO puede salir hasta corregir:</p>
      <ul style="margin:0;padding-left:20px;color:#991b1b;">
        ${failedNNItems.map(item => `<li><strong>${item}</strong></li>`).join('')}
      </ul>
    </div>
    ` : ''}

    <div class="section">
      <div class="section-title">📋 Información del Vehículo</div>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Unidad</div>
          <div class="info-value">${vehiculo?.nombre || 'N/A'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Placa</div>
          <div class="info-value">${vehiculo?.placa || 'Sin placa'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Marca/Modelo</div>
          <div class="info-value">${vehiculo?.marca || ''} ${vehiculo?.modelo || ''} ${vehiculo?.anio || ''}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Fecha</div>
          <div class="info-value">${new Date(checkup.fecha_checkup).toLocaleDateString('es-MX')}</div>
        </div>
        ${chofer ? `
        <div class="info-item">
          <div class="info-label">Chofer</div>
          <div class="info-value">${chofer.nombre_completo}${chofer.telefono ? ` - ${chofer.telefono}` : ''}</div>
        </div>
        ` : ''}
        <div class="info-item">
          <div class="info-label">Revisado por</div>
          <div class="info-value">${realizado?.nombre_completo || 'N/A'}</div>
        </div>
        ${checkup.kilometraje_inicial ? `
        <div class="info-item">
          <div class="info-label">Kilometraje</div>
          <div class="info-value">${checkup.kilometraje_inicial.toLocaleString()} km</div>
        </div>
        ` : ''}
        ${checkup.hora_inspeccion ? `
        <div class="info-item">
          <div class="info-label">Hora de Inspección</div>
          <div class="info-value">${checkup.hora_inspeccion}</div>
        </div>
        ` : ''}
      </div>
    </div>

    <div class="section">
      <div class="section-title">⚠️ Prioridad de Atención</div>
      <span class="priority" style="background-color: ${prioridadColor};">
        ${prioridadTexto}
      </span>
    </div>

    ${failedItems.length > 0 ? `
    <div class="section" style="background: #fef2f2;">
      <div class="section-title" style="color: #dc2626;">❌ Items con Falla (${failedItems.length})</div>
      <ul style="margin:0;padding-left:20px;">
        ${failedItems.map(item => `<li style="color:#b91c1c;"><strong>${item}</strong></li>`).join('')}
      </ul>
    </div>
    ` : ''}

    <div class="section">
      <div class="section-title">📝 Checklist Completo</div>
      ${checklistHtml}
    </div>

    ${checkup.fallas_detectadas ? `
    <div class="section" style="background: #fff7ed;">
      <div class="section-title" style="color: #c2410c;">📝 Observaciones / Fallas Detectadas</div>
      <p style="margin:0;">${checkup.fallas_detectadas}</p>
    </div>
    ` : ''}

    ${generateDanosSection(checkup.observaciones_golpes)}

    ${generateFirmasSection(checkup.firma_conductor, checkup.firma_supervisor)}
  </div>

  <div class="footer">
    <p style="margin: 0 0 5px 0;"><strong>ABARROTES LA MANITA SA DE CV</strong></p>
    <p style="margin: 0;">Sistema de Gestión de Flotilla | Este correo fue generado automáticamente</p>
    ${pdfAttachment ? '<p style="margin: 5px 0 0 0; color: #16a34a;">📎 PDF adjunto incluido</p>' : ''}
  </div>
</body>
</html>
    `;

    // Prepare email payload
    const emailPayload: {
      action: string;
      email: string;
      to: string;
      subject: string;
      body: string;
      attachments?: { filename: string; content: string; mimeType: string }[];
    } = {
      action: "send",
      email: "compras@almasa.com.mx",
      to: emailMecanico,
      subject: `🔧 [${(checkup.prioridad || 'MEDIA').toUpperCase()}]${checkup.tiene_items_nn_fallados ? ' 🚨 NN FALLADOS' : ''} Checkup - ${vehiculo?.nombre || 'Vehículo'} (${vehiculo?.placa || 'S/P'})`,
      body: htmlBody,
    };

    // Add PDF attachment if available
    if (pdfAttachment) {
      emailPayload.attachments = [pdfAttachment];
    }

    // Send email using gmail-api
    const { error: emailError } = await supabase.functions.invoke("gmail-api", {
      body: emailPayload
    });

    if (emailError) {
      console.error("Error enviando email:", emailError);
      throw new Error(`Error al enviar correo: ${emailError.message}`);
    }

    // Mark as notified
    await supabase
      .from("vehiculos_checkups")
      .update({ 
        notificado_mecanico: true, 
        notificado_en: new Date().toISOString() 
      })
      .eq("id", checkupId);

    console.log("Reporte enviado exitosamente");

    return new Response(
      JSON.stringify({ success: true, message: "Reporte enviado", pdfAdjunto: !!pdfAttachment }),
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
