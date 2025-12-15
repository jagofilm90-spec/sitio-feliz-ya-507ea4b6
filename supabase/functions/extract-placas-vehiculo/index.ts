import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { imageBase64 } = await req.json();
    
    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "imageBase64 is required", placas: null }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Extracting license plates from image...");

    // Use Lovable AI (Gemini) for OCR
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured", placas: null }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean base64 string (remove data:image/... prefix if present)
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

    const response = await fetch('https://api.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Eres un experto en reconocimiento de placas vehiculares mexicanas. 
Tu tarea es extraer SOLO el número de placas visible en la imagen.

REGLAS:
- Las placas mexicanas tienen formato: 3 letras + 3-4 números (ej: ABC-123, XYZ-1234) o 2 letras + 2 números + 3 letras (ej: AB-12-CDE)
- También pueden ser placas de carga: formatos variados
- Responde SOLO con el texto de las placas, sin explicaciones
- Si hay múltiples placas, responde solo la más visible
- Si no puedes leer claramente las placas, responde exactamente: NO_DETECTADO
- No agregues prefijos, explicaciones ni formatos adicionales`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extrae el número de placas de esta imagen de vehículo. Responde SOLO con el número de placas o NO_DETECTADO.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${cleanBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 50,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", errorText);
      return new Response(
        JSON.stringify({ error: "AI processing failed", placas: null }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const extractedText = data.choices?.[0]?.message?.content?.trim() || "";
    
    console.log("AI extracted text:", extractedText);

    // Clean and validate the result
    const placas = extractedText.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    
    // Check if it looks like a valid plate or NO_DETECTADO
    if (placas === "NO_DETECTADO" || placas === "NODETECTADO") {
      return new Response(
        JSON.stringify({ placas: null, message: "No se pudo detectar las placas automáticamente" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate that it looks like a Mexican plate (at least 5 characters with letters and numbers)
    const hasLetters = /[A-Z]/.test(placas);
    const hasNumbers = /[0-9]/.test(placas);
    
    if (placas.length >= 5 && hasLetters && hasNumbers) {
      console.log("Detected plates:", placas);
      return new Response(
        JSON.stringify({ placas, message: "Placas detectadas exitosamente" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Invalid format
    return new Response(
      JSON.stringify({ placas: null, message: "Formato de placas no reconocido" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in extract-placas-vehiculo:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage, placas: null }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
