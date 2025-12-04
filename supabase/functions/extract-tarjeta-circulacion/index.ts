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
            
Analiza la imagen/documento y extrae los siguientes campos EXACTAMENTE como aparecen en el documento:
- serie_vehicular: El NIV o número de serie del vehículo (17 caracteres alfanuméricos)
- numero_motor: El número de motor
- cilindros: Número de cilindros (ej: "4", "6", "8")
- modelo: El año/modelo del vehículo (ej: "2020", "2021")
- clave_vehicular: La clave vehicular oficial
- combustible: Tipo de combustible (Gasolina, Diésel, Gas LP, etc.)
- clase_tipo: Clase y tipo de vehículo (ej: "Camioneta Pick Up", "Automóvil Sedán")
- placa: Las placas del vehículo
- fecha_expedicion: Fecha de expedición en formato YYYY-MM-DD
- fecha_vigencia: Fecha de vigencia/vencimiento en formato YYYY-MM-DD
- marca: Marca del vehículo (ej: "Nissan", "Chevrolet", "Ford")
- nombre_propietario: Nombre del propietario si es visible

IMPORTANTE:
- Si un campo no es legible o no está presente, usa null
- Las fechas DEBEN estar en formato YYYY-MM-DD
- Responde ÚNICAMENTE con un objeto JSON válido, sin markdown ni explicaciones`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extrae todos los datos de esta tarjeta de circulación mexicana y devuélvelos en formato JSON.'
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
        max_tokens: 1000,
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
