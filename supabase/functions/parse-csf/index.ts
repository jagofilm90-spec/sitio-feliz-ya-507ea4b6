import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfBase64 } = await req.json();
    
    if (!pdfBase64) {
      throw new Error('No PDF data provided');
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Parsing CSF PDF with AI...");
    console.log("PDF base64 length:", pdfBase64.length);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analiza esta Constancia de Situación Fiscal (CSF) del SAT de México y extrae los siguientes datos en formato JSON.

IMPORTANTE: Responde SOLO con el JSON, sin markdown, sin backticks, sin explicaciones.

Campos a extraer:
- rfc: El RFC del contribuyente
- razon_social: La denominación o razón social (sin el régimen de capital)
- regimen_capital: El tipo de sociedad (S.A. de C.V., S. de R.L., etc.) si aplica
- codigo_postal: Código postal del domicilio fiscal
- tipo_vialidad: Tipo de vialidad (Calle, Avenida, Boulevard, etc.)
- nombre_vialidad: Nombre de la calle/avenida
- numero_exterior: Número exterior
- numero_interior: Número interior (si existe)
- nombre_colonia: Nombre de la colonia
- nombre_localidad: Nombre de la localidad
- nombre_municipio: Nombre del municipio o alcaldía
- nombre_entidad_federativa: Nombre del estado
- entre_calle: Entre calle (si existe)
- y_calle: Y calle (si existe)

Responde ÚNICAMENTE con un objeto JSON válido. Si un campo no se encuentra, usa null.

Ejemplo de respuesta esperada:
{"rfc":"ABC123456XY1","razon_social":"EMPRESA EJEMPLO","regimen_capital":"S.A. DE C.V.","codigo_postal":"06600","tipo_vialidad":"Calle","nombre_vialidad":"Reforma","numero_exterior":"123","numero_interior":null,"nombre_colonia":"Juárez","nombre_localidad":"Ciudad de México","nombre_municipio":"Cuauhtémoc","nombre_entidad_federativa":"Ciudad de México","entre_calle":null,"y_calle":null}`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${pdfBase64}`
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
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI Gateway error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    console.log("AI response content:", content);

    if (!content) {
      throw new Error("No response from AI");
    }

    // Clean up the response - remove markdown code blocks if present
    let cleanContent = content.trim();
    
    // Remove markdown code block markers
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.slice(7);
    } else if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.slice(3);
    }
    if (cleanContent.endsWith('```')) {
      cleanContent = cleanContent.slice(0, -3);
    }
    cleanContent = cleanContent.trim();

    // Extract JSON from the response
    let parsedData;
    try {
      // Try direct parse first
      parsedData = JSON.parse(cleanContent);
    } catch (directParseError) {
      console.log("Direct parse failed, trying to find JSON in response...");
      // Try to find JSON object in the response
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsedData = JSON.parse(jsonMatch[0]);
        } catch (matchParseError) {
          console.error("Failed to parse extracted JSON:", matchParseError);
          console.error("Extracted content:", jsonMatch[0]);
          throw new Error("Failed to parse CSF data - invalid JSON structure");
        }
      } else {
        console.error("No JSON found in response. Full content:", content);
        throw new Error("Failed to parse CSF data - no JSON found in AI response");
      }
    }

    console.log("Parsed CSF data:", JSON.stringify(parsedData, null, 2));

    return new Response(JSON.stringify({ data: parsedData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in parse-csf function:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
