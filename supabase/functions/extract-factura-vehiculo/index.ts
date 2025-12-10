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
        JSON.stringify({ error: 'Se requiere el PDF de la factura en base64' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY no está configurada');
      return new Response(
        JSON.stringify({ error: 'Error de configuración del servidor' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine MIME type
    let mimeType = 'application/pdf';
    if (pdfBase64.startsWith('data:')) {
      const match = pdfBase64.match(/^data:([^;]+);base64,/);
      if (match) {
        mimeType = match[1];
      }
    }

    // Clean base64 if it has data URI prefix
    const cleanBase64 = pdfBase64.replace(/^data:[^;]+;base64,/, '');

    console.log('Enviando factura a Lovable AI para extracción...');

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
            content: `Eres un experto en extracción de datos de facturas de vehículos en México. 
Tu tarea es analizar la imagen/PDF de una factura de compra de vehículo y extraer los datos relevantes.

IMPORTANTE: Debes responder ÚNICAMENTE con un objeto JSON válido, sin markdown, sin explicaciones adicionales.

Los campos a extraer son:
- marca: Marca del vehículo (ej: NISSAN, TOYOTA, CHEVROLET)
- modelo: Modelo del vehículo (ej: NP300, HILUX, SILVERADO)
- anio: Año del modelo (número de 4 dígitos)
- vin: Número de Identificación Vehicular (17 caracteres alfanuméricos)
- numero_motor: Número de motor/serie del motor
- color: Color del vehículo
- placas: Placas si aparecen (pueden no estar en factura nueva)
- capacidad_carga_kg: Capacidad de carga en kg si se menciona
- tipo_combustible: gasolina, diesel, hibrido, electrico
- folio_factura: Folio o número de la factura
- fecha_factura: Fecha de la factura en formato YYYY-MM-DD
- valor_factura: Valor total de la factura (solo número, sin símbolos)
- vendedor: Nombre del vendedor/agencia

Si un campo no se puede determinar, usa null.

Ejemplo de respuesta esperada:
{
  "marca": "NISSAN",
  "modelo": "NP300 FRONTIER",
  "anio": 2024,
  "vin": "3N6AD33A4PK123456",
  "numero_motor": "QR25123456",
  "color": "BLANCO",
  "placas": null,
  "capacidad_carga_kg": 1150,
  "tipo_combustible": "gasolina",
  "folio_factura": "A-12345",
  "fecha_factura": "2024-12-01",
  "valor_factura": 485000,
  "vendedor": "Nissan Automotriz del Valle"
}`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extrae los datos de esta factura de vehículo. Responde SOLO con el JSON, sin markdown ni explicaciones.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${cleanBase64}`
                }
              }
            ]
          }
        ],
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
          JSON.stringify({ error: 'Créditos de AI insuficientes.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Error al procesar la factura con AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    console.log('Respuesta de AI recibida');

    const content = aiResponse.choices?.[0]?.message?.content;
    if (!content) {
      return new Response(
        JSON.stringify({ error: 'No se pudo extraer información de la factura' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse JSON from response, handling potential markdown wrapping
    let extractedData;
    try {
      let jsonStr = content.trim();
      // Remove markdown code blocks if present
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      extractedData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Error parsing AI response:', content);
      return new Response(
        JSON.stringify({ error: 'Error al interpretar la respuesta de AI', raw: content }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Datos extraídos exitosamente:', extractedData);

    return new Response(
      JSON.stringify(extractedData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error en extract-factura-vehiculo:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
