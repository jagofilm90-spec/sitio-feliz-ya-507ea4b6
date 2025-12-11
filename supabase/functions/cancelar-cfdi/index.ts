import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { factura_id, motivo, folioSustitucion } = await req.json();
    
    if (!factura_id) {
      throw new Error('factura_id es requerido');
    }

    if (!motivo) {
      throw new Error('motivo de cancelación es requerido');
    }

    console.log('Iniciando cancelación CFDI para factura:', factura_id);

    // Configuración de Facturama
    const apiUser = Deno.env.get('FACTURAMA_API_USER');
    const apiPassword = Deno.env.get('FACTURAMA_API_PASSWORD');
    const apiUrl = Deno.env.get('FACTURAMA_API_URL') || 'https://api.facturama.mx';
    
    if (!apiUser || !apiPassword) {
      throw new Error('Credenciales de Facturama no configuradas');
    }

    // Conectar a Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Obtener factura
    const { data: factura, error: facturaError } = await supabase
      .from('facturas')
      .select('id, folio, cfdi_uuid, cfdi_xml_url, cfdi_estado')
      .eq('id', factura_id)
      .single();

    if (facturaError || !factura) {
      throw new Error('Factura no encontrada');
    }

    if (factura.cfdi_estado !== 'timbrada') {
      throw new Error('Solo se pueden cancelar facturas timbradas');
    }

    if (!factura.cfdi_xml_url) {
      throw new Error('La factura no tiene ID de Facturama');
    }

    console.log('Cancelando CFDI:', factura.cfdi_uuid);

    // Motivos de cancelación SAT:
    // 01 - Comprobante emitido con errores con relación
    // 02 - Comprobante emitido con errores sin relación
    // 03 - No se llevó a cabo la operación
    // 04 - Operación nominativa relacionada en una factura global

    const auth = btoa(`${apiUser}:${apiPassword}`);
    
    // Construir URL de cancelación
    let cancelUrl = `${apiUrl}/2/cfdis/${factura.cfdi_xml_url}?motive=${motivo}`;
    if (motivo === '01' && folioSustitucion) {
      cancelUrl += `&uuidReplacement=${folioSustitucion}`;
    }

    const response = await fetch(cancelUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });

    const responseText = await response.text();
    console.log('Respuesta cancelación:', response.status, responseText);

    if (!response.ok) {
      let errorMessage = 'Error al cancelar CFDI';
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.Message || errorData.message || JSON.stringify(errorData);
      } catch {
        errorMessage = responseText;
      }
      throw new Error(errorMessage);
    }

    // Actualizar factura
    const { error: updateError } = await supabase
      .from('facturas')
      .update({
        cfdi_estado: 'cancelada',
        cfdi_error: `Cancelada - Motivo: ${motivo}`
      })
      .eq('id', factura_id);

    if (updateError) {
      console.error('Error actualizando factura:', updateError);
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'CFDI cancelado exitosamente'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Error en cancelar-cfdi:', errorMessage);
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
