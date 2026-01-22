import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tipos de documentos que podemos detectar
const DOCUMENT_TYPES = [
  { id: 'contrato_laboral', name: 'Contrato Laboral', fields: ['fecha_contrato', 'puesto', 'salario'] },
  { id: 'constancia_situacion_fiscal', name: 'Constancia de Situación Fiscal (CSF)', fields: ['rfc', 'nombre', 'direccion'] },
  { id: 'carta_seguro_social', name: 'Carta del IMSS', fields: ['numero_seguro_social', 'nombre'] },
  { id: 'ine', name: 'INE/IFE', fields: ['curp', 'nombre', 'fecha_nacimiento', 'direccion'] },
  { id: 'curp', name: 'CURP', fields: ['curp', 'nombre', 'fecha_nacimiento', 'sexo', 'estado_nacimiento'] },
  { id: 'comprobante_domicilio', name: 'Comprobante de Domicilio', fields: ['calle', 'numero', 'colonia', 'codigo_postal', 'municipio', 'estado'] },
  { id: 'acta_nacimiento', name: 'Acta de Nacimiento', fields: ['fecha_nacimiento', 'lugar_nacimiento', 'nombre_padre', 'nombre_madre'] },
  { id: 'licencia_conducir', name: 'Licencia de Conducir', fields: ['numero_licencia', 'fecha_vencimiento', 'tipo_licencia'] },
  { id: 'aviso_privacidad', name: 'Aviso de Privacidad', fields: [] },
  { id: 'otro', name: 'Otro Documento', fields: [] },
];

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfBase64, empleadoNombre } = await req.json();

    if (!pdfBase64) {
      return new Response(
        JSON.stringify({ error: 'Se requiere el PDF en base64' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key no configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Analizando expediente de empleado:', empleadoNombre || 'Sin nombre');
    console.log('Tamaño del PDF base64:', pdfBase64.length);

    // Detectar el tipo MIME
    let mimeType = 'application/pdf';
    if (pdfBase64.startsWith('/9j/')) {
      mimeType = 'image/jpeg';
    } else if (pdfBase64.startsWith('iVBOR')) {
      mimeType = 'image/png';
    }

    const prompt = `Analiza este documento escaneado que puede contener MÚLTIPLES documentos de un empleado mexicano en diferentes páginas.

Tu tarea es:
1. Identificar CADA documento diferente que aparezca (pueden estar en páginas consecutivas)
2. Determinar en qué páginas está cada documento (aproximado si no es claro)
3. Extraer los datos relevantes de cada documento

TIPOS DE DOCUMENTOS A DETECTAR:
- contrato_laboral: Contrato de trabajo (puede ser varias páginas)
- constancia_situacion_fiscal: CSF del SAT (1 página generalmente)
- carta_seguro_social: Documento del IMSS con NSS (1-2 páginas)
- ine: Credencial de elector INE/IFE (frente y vuelta)
- curp: Documento CURP oficial
- comprobante_domicilio: Recibo de luz, agua, teléfono, estado de cuenta bancario
- acta_nacimiento: Acta de nacimiento
- licencia_conducir: Licencia de manejo
- aviso_privacidad: Aviso de privacidad firmado
- otro: Cualquier otro documento

RESPONDE EN ESTE FORMATO JSON EXACTO:
{
  "documentos_detectados": [
    {
      "tipo": "constancia_situacion_fiscal",
      "nombre_documento": "Constancia de Situación Fiscal",
      "paginas": "1",
      "confianza": "alta",
      "datos_extraidos": {
        "rfc": "XXXX000000XXX",
        "nombre_completo": "Nombre del empleado",
        "direccion": "Dirección completa"
      }
    },
    {
      "tipo": "carta_seguro_social",
      "nombre_documento": "Carta del IMSS",
      "paginas": "2-3",
      "confianza": "alta",
      "datos_extraidos": {
        "numero_seguro_social": "12345678901"
      }
    }
  ],
  "total_paginas_estimadas": 5,
  "notas": "Cualquier observación relevante sobre el análisis"
}

CAMPOS A EXTRAER POR TIPO:
- constancia_situacion_fiscal: rfc, nombre_completo, direccion, regimen_fiscal
- carta_seguro_social: numero_seguro_social, nombre_completo
- ine: curp, nombre_completo, fecha_nacimiento, direccion, clave_elector
- curp: curp, nombre_completo, fecha_nacimiento, sexo, lugar_nacimiento
- comprobante_domicilio: calle, numero_exterior, numero_interior, colonia, codigo_postal, municipio, estado
- licencia_conducir: numero_licencia, fecha_vencimiento, tipo_licencia
- contrato_laboral: fecha_contrato, puesto, tipo_contrato
- acta_nacimiento: fecha_nacimiento, lugar_nacimiento, nombre_padre, nombre_madre

Si no puedes leer algún dato, usa null. Si no detectas ningún documento reconocible, responde con un array vacío.
Sé preciso en la extracción de datos, especialmente en RFC, CURP y NSS que tienen formatos específicos.`;

    console.log('Enviando a Lovable AI para análisis...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${pdfBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error de Lovable AI:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Límite de solicitudes excedido. Intenta de nuevo en unos minutos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Se requiere agregar créditos a la cuenta de IA.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Error al analizar el documento con IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    console.log('Respuesta de IA recibida');

    const content = aiResponse.choices?.[0]?.message?.content;
    if (!content) {
      console.error('No se recibió contenido de la IA');
      return new Response(
        JSON.stringify({ error: 'No se pudo analizar el documento' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Contenido de IA:', content.substring(0, 500));

    // Limpiar y parsear el JSON de la respuesta
    let parsedData;
    try {
      // Intentar extraer JSON del contenido
      let jsonStr = content;
      
      // Si viene envuelto en markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }
      
      // Limpiar caracteres problemáticos
      jsonStr = jsonStr.trim();
      
      parsedData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Error parseando JSON:', parseError);
      console.log('Contenido que falló:', content);
      
      // Intentar extraer información básica si el JSON falló
      return new Response(
        JSON.stringify({ 
          error: 'Error al procesar la respuesta del análisis',
          raw_response: content.substring(0, 1000)
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar y enriquecer los datos
    const documentosEnriquecidos = (parsedData.documentos_detectados || []).map((doc: any) => ({
      ...doc,
      tipo_info: DOCUMENT_TYPES.find(t => t.id === doc.tipo) || { id: doc.tipo, name: doc.nombre_documento || 'Documento', fields: [] }
    }));

    console.log(`Se detectaron ${documentosEnriquecidos.length} documentos`);

    return new Response(
      JSON.stringify({
        success: true,
        documentos_detectados: documentosEnriquecidos,
        total_paginas_estimadas: parsedData.total_paginas_estimadas || documentosEnriquecidos.length,
        notas: parsedData.notas || null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error en analyze-employee-file-bundle:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error desconocido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
