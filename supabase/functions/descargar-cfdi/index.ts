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
    const { factura_id, formato } = await req.json();
    
    if (!factura_id) {
      throw new Error('factura_id es requerido');
    }

    const tipoFormato = formato || 'pdf'; // pdf o xml
    console.log('Descargando', tipoFormato, 'para factura:', factura_id);

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
      .select('id, folio, cfdi_xml_url, cfdi_estado')
      .eq('id', factura_id)
      .single();

    if (facturaError || !factura) {
      throw new Error('Factura no encontrada');
    }

    if (!factura.cfdi_xml_url) {
      throw new Error('La factura no tiene CFDI timbrado');
    }

    const auth = btoa(`${apiUser}:${apiPassword}`);
    
    // Descargar archivo de Facturama
    const downloadUrl = tipoFormato === 'xml' 
      ? `${apiUrl}/cfdi/xml/${factura.cfdi_xml_url}`
      : `${apiUrl}/cfdi/pdf/${factura.cfdi_xml_url}`;

    console.log('Descargando desde:', downloadUrl);

    const response = await fetch(downloadUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error descargando:', response.status, errorText);
      throw new Error(`Error al descargar ${tipoFormato}: ${response.status}`);
    }

    // Facturama retorna el archivo en base64
    const fileContent = await response.text();
    
    // Determinar content type
    const contentType = tipoFormato === 'xml' 
      ? 'application/xml' 
      : 'application/pdf';

    const fileName = tipoFormato === 'xml'
      ? `${factura.folio}.xml`
      : `${factura.folio}.pdf`;

    return new Response(JSON.stringify({
      success: true,
      content: fileContent,
      contentType,
      fileName,
      isBase64: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Error en descargar-cfdi:', errorMessage);
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
