import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfBase64 } = await req.json();

    if (!pdfBase64) {
      return new Response(
        JSON.stringify({ error: 'Se requiere el archivo en base64' }),
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

    // Determine MIME type
    let mimeType = 'application/pdf';
    if (pdfBase64.startsWith('/9j/') || pdfBase64.startsWith('iVBOR')) {
      mimeType = pdfBase64.startsWith('/9j/') ? 'image/jpeg' : 'image/png';
    }

    console.log('Processing tarjeta de circulación document...');

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
            role: 'system',
            content: `Eres un experto en extraer datos de tarjetas de circulación mexicanas. 
            
Existen DOS tipos de tarjetas:

TIPO 1 - TARJETA FEDERAL (SICT/SCT):
- Emitida por la Secretaría de Infraestructura, Comunicaciones y Transportes (SICT) o Dirección General de Autotransporte Federal
- Dice "TARJETA DE CIRCULACIÓN" con logo del gobierno federal
- Incluye campos especiales: peso vehicular, número de ejes, número de llantas, dimensiones, capacidad en toneladas, tipo de suspensión, permiso de ruta, clase federal (C2, C3, T3S2, etc.)
- Generalmente NO tiene fecha de vigencia (solo fecha de expedición)
- Las placas suelen tener formato federal (diferente al estatal)

TIPO 2 - TARJETA ESTATAL:
- Emitida por la Secretaría de Movilidad de algún estado (CDMX, Estado de México, etc.)
- Incluye: cilindros, clave vehicular, fecha de vigencia
- NO tiene campos de peso vehicular, ejes, llantas, dimensiones, etc.

Analiza la imagen/documento y extrae los siguientes campos según el tipo de tarjeta:

CAMPOS COMUNES (ambos tipos):
- tipo_tarjeta: "federal" o "estatal" (IMPORTANTE: determina esto primero)
- serie_vehicular: El NIV o número de serie del vehículo (17 caracteres alfanuméricos)
- numero_motor: El número de motor
- modelo: El año/modelo del vehículo (ej: "2020", "2021")
- combustible: Tipo de combustible (Gasolina, Diésel, Gas LP, etc.)
- clase_tipo: Clase y tipo de vehículo (ej: "Camioneta Pick Up", "Automóvil Sedán", "Camión Unitario")
- placa: Las placas del vehículo
- fecha_expedicion: Fecha de expedición en formato YYYY-MM-DD
- marca: Marca del vehículo (ej: "Nissan", "Chevrolet", "Ford", "HINO", "INTERNATIONAL")
- nombre_propietario: Nombre del propietario si es visible

CAMPOS SOLO PARA TARJETAS ESTATALES:
- cilindros: Número de cilindros (ej: "4", "6", "8")
- clave_vehicular: La clave vehicular oficial
- fecha_vigencia: Fecha de vigencia/vencimiento en formato YYYY-MM-DD (null para federales)

CAMPOS SOLO PARA TARJETAS FEDERALES:
- peso_vehicular_ton: Peso vehicular en toneladas (ej: 6.0, 11.0)
- numero_ejes: Número de ejes (ej: 2, 3, 5)
- numero_llantas: Número de llantas (ej: 6, 10, 18)
- capacidad_toneladas: Capacidad de carga en toneladas (ej: 11.0, 15.0, 30.0)
- clase_federal: Clasificación federal del vehículo (ej: "C2", "C3", "T3S2", "T3S3")
- tipo_suspension: Tipo de suspensión (ej: "Mecánica", "Neumática", "Mixta")
- permiso_ruta: Número de permiso de ruta federal si existe
- dimensiones_alto: Altura del vehículo en metros
- dimensiones_ancho: Ancho del vehículo en metros
- dimensiones_largo: Largo del vehículo en metros

IMPORTANTE:
- Si un campo no es legible o no está presente, usa null
- Las fechas DEBEN estar en formato YYYY-MM-DD
- Los números decimales usan punto, no coma (ej: 6.0, no 6,0)
- Responde ÚNICAMENTE con un objeto JSON válido, sin markdown ni explicaciones
- Es CRÍTICO determinar correctamente si es federal o estatal para extraer los campos correctos`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extrae todos los datos de esta tarjeta de circulación mexicana. Primero identifica si es tarjeta FEDERAL (SICT) o ESTATAL, luego extrae los campos correspondientes. Devuelve el resultado en formato JSON.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${pdfBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Límite de solicitudes excedido. Intenta de nuevo en unos momentos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos de IA agotados. Contacta al administrador.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Error al procesar el documento con IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    console.log('AI response received');

    const content = aiResponse.choices?.[0]?.message?.content;
    if (!content) {
      console.error('No content in AI response');
      return new Response(
        JSON.stringify({ error: 'No se pudo extraer información del documento' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse JSON from response (handle potential markdown code blocks)
    let extractedData;
    try {
      let jsonString = content.trim();
      // Remove markdown code blocks if present
      if (jsonString.startsWith('```json')) {
        jsonString = jsonString.slice(7);
      } else if (jsonString.startsWith('```')) {
        jsonString = jsonString.slice(3);
      }
      if (jsonString.endsWith('```')) {
        jsonString = jsonString.slice(0, -3);
      }
      jsonString = jsonString.trim();
      
      extractedData = JSON.parse(jsonString);
      console.log('Extracted data:', extractedData);
      console.log('Card type detected:', extractedData.tipo_tarjeta);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', content);
      return new Response(
        JSON.stringify({ error: 'Error al interpretar la respuesta de IA', raw: content }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: extractedData 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in extract-tarjeta-circulacion:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
