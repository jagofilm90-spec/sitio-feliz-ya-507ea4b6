import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { nombre, especificaciones, marca, peso_kg, unidad } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompt = `Analiza este producto de una distribuidora de alimentos y sugiere cómo separar sus datos correctamente.

Datos actuales:
- Nombre: "${nombre}"
- Especificaciones: "${especificaciones || 'vacío'}"
- Marca: "${marca || 'vacío'}"
- Peso: ${peso_kg || 'no especificado'}kg
- Unidad: ${unidad}

REGLAS ESTRICTAS:
1. El NOMBRE debe ser SOLO el producto base sin calibres ni formatos (ej: "Ciruela Pasa", "Azúcar Estándar", "Girasol Argentino")
2. Las ESPECIFICACIONES deben incluir:
   - Calibre si existe (ej: 50/60, 22/64, H1, 4/0, Jumbo, Extra Grande)
   - Formato/Presentación (ej: Deshuesada, Con Hueso, Pelada)
   - Peso en kg si está en el nombre (ej: 25kg, 5kg)
3. La MARCA es el fabricante/proveedor (déjala como está si ya existe)
4. Extrae del nombre actual: calibres, formatos, pesos y muévelos a especificaciones

EJEMPLOS:
- "Girasol Argentino Jumbo 22/64" → nombre: "Girasol Argentino", especificaciones: "Jumbo 22/64"
- "Ciruela Pasa 50/60 Deshuesada" → nombre: "Ciruela Pasa", especificaciones: "50/60 Deshuesada"
- "Azúcar Estándar" (con espec: "25") → nombre: "Azúcar Estándar", especificaciones: "25kg"
- "Arandano Deshidratado Endulzado" → nombre: "Arándano", especificaciones: "Deshidratado Endulzado"

Responde ÚNICAMENTE con un JSON válido (sin markdown, sin texto adicional):
{
  "nombre_sugerido": "nombre limpio del producto base",
  "especificaciones_sugerida": "calibre formato peso",
  "marca_sugerida": "marca o null",
  "cambios_detectados": true o false,
  "explicacion": "breve explicación de los cambios realizados"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "Eres un experto en catalogación de productos alimenticios. Tu tarea es normalizar nombres de productos separando correctamente nombre base, especificaciones y marca. Responde SOLO con JSON válido."
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Límite de solicitudes excedido. Intenta de nuevo en unos segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Contacta al administrador." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    // Parse the JSON response, handling potential markdown code blocks
    let cleanedContent = content.trim();
    if (cleanedContent.startsWith("```")) {
      cleanedContent = cleanedContent.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();
    }

    const suggestion = JSON.parse(cleanedContent);

    return new Response(JSON.stringify(suggestion), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in normalize-product:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
