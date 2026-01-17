import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Catálogo de unidades SAT comunes para sugerencias
const UNIDADES_SAT_SUGERENCIAS = [
  { clave: 'XSA', palabras: ['costal', 'saco', 'bulto'] },
  { clave: 'XBX', palabras: ['caja'] },
  { clave: 'KGM', palabras: ['kg', 'kilogramo', 'kilo'] },
  { clave: 'XCU', palabras: ['cubeta'] },
  { clave: 'H87', palabras: ['pieza', 'pza'] },
  { clave: 'XPK', palabras: ['paquete', 'pack'] },
  { clave: 'XBA', palabras: ['bolsa'] },
  { clave: 'XBT', palabras: ['botella'] },
  { clave: 'LTR', palabras: ['litro', 'lt'] },
];

function suggestUnidadSAT(unidad: string | undefined, nombre: string): string {
  const text = `${unidad || ''} ${nombre}`.toLowerCase();
  
  for (const sat of UNIDADES_SAT_SUGERENCIAS) {
    if (sat.palabras.some(p => text.includes(p))) {
      return sat.clave;
    }
  }
  
  // Default based on common product types
  if (text.includes('azúcar') || text.includes('azucar') || text.includes('harina')) {
    return 'XSA'; // Saco/Costal para granos
  }
  
  return 'XSA'; // Default para productos a granel
}

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

    // Sugerir unidad SAT basada en el producto
    const unidadSATSugerida = suggestUnidadSAT(unidad, nombre);

    const prompt = `Analiza este producto de una distribuidora de alimentos mexicana y sugiere cómo separar sus datos correctamente para facturación CFDI 4.0.

Datos actuales:
- Nombre: "${nombre}"
- Especificaciones: "${especificaciones || 'vacío'}"
- Marca: "${marca || 'vacío'}"
- Peso: ${peso_kg || 'no especificado'}kg
- Unidad de venta: ${unidad || 'no especificada'}

REGLAS ESTRICTAS:

1. **NOMBRE (nombre_sugerido)**: 
   - SOLO el producto base, SIN calibres, formatos ni pesos
   - Ejemplos correctos: "Ciruela Pasa", "Girasol Argentino", "Azúcar Estándar"
   - Ejemplos incorrectos: "Ciruela Pasa 50/60", "Girasol 22/64 25kg"

2. **ESPECIFICACIONES (especificaciones_sugerida)**: 
   - ⚠️ NUNCA incluir peso aquí (kg, g, ml, lt) - eso va en contenido_empaque
   - SOLO usar para: Calibre (50/60, 22/64), Tipo (Deshuesada, Pelada), Variedad (Jumbo, Extra)
   - Si el campo actual solo tiene peso como "25kg" o "10 kg" → dejar NULL
   - Si tiene "Original 20kg" → extraer solo "Original"
   - Ejemplos CORRECTOS: "50/60 Deshuesada", "Jumbo 22/64", "Original", null
   - Ejemplos INCORRECTOS: "25kg", "25 kg", "Original 20kg"

3. **MARCA (marca_sugerida)**: 
   - Fabricante/proveedor (déjala como está si ya existe y es correcta)

4. **CONTENIDO DE EMPAQUE (contenido_empaque_sugerido)**:
   - TODO el peso va aquí, formateado legiblemente
   - Formato: número + espacio + unidad (ej: "25 kg", "10 kg", "500 g")
   - Para múltiples: "24×800 g", "12×500 ml"
   - OBLIGATORIO si hay peso en cualquier campo

5. **PESO EN KG (peso_kg_sugerido)**:
   - Número decimal del peso total en kilogramos
   - Extraer de donde esté (nombre, especificaciones, peso_kg)

6. **UNIDAD SAT (unidad_sat_sugerida)**:
   - Clave SAT: XSA (Saco/Bulto), XBX (Caja), KGM (Kilogramo), XCU (Cubeta), H87 (Pieza)

EJEMPLOS DE SEPARACIÓN:

| Entrada | especificaciones_sugerida | contenido_empaque_sugerido |
|---------|---------------------------|----------------------------|
| espec: "25kg" | null | "25 kg" |
| espec: "Original 20kg" | "Original" | "20 kg" |
| espec: "50/60" | "50/60" | (usar peso_kg) |
| espec: "Deshuesada" | "Deshuesada" | (usar peso_kg) |
| nombre: "Azúcar 25kg" | null | "25 kg" |

Responde ÚNICAMENTE con JSON válido (sin markdown):
{
  "nombre_sugerido": "producto base sin peso ni calibre",
  "especificaciones_sugerida": "SOLO calibre/tipo/variedad, SIN PESO, o null",
  "marca_sugerida": "marca o null",
  "contenido_empaque_sugerido": "peso formateado (OBLIGATORIO si hay peso)",
  "peso_kg_sugerido": numero_decimal_o_null,
  "unidad_sat_sugerida": "${unidadSATSugerida}",
  "cambios_detectados": true_o_false,
  "explicacion": "breve explicación"
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
            content: "Eres un experto en catalogación de productos alimenticios para facturación electrónica CFDI 4.0 en México. Tu tarea es normalizar nombres de productos separando correctamente nombre base, especificaciones (calibres/formatos), marca, contenido de empaque, peso y unidad SAT. Responde SOLO con JSON válido."
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

    const responseText = await response.text();
    console.log("AI Gateway raw response:", responseText.substring(0, 500));
    
    if (!responseText || responseText.trim() === "") {
      throw new Error("Empty response from AI gateway");
    }

    let aiResponse;
    try {
      aiResponse = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse AI gateway response:", responseText.substring(0, 200));
      throw new Error("Invalid JSON from AI gateway");
    }

    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      console.error("No content in AI response:", JSON.stringify(aiResponse).substring(0, 300));
      throw new Error("No response from AI");
    }

    // Parse the JSON response, handling potential markdown code blocks
    let cleanedContent = content.trim();
    if (cleanedContent.startsWith("```")) {
      cleanedContent = cleanedContent.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();
    }

    let suggestion;
    try {
      suggestion = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error("Failed to parse AI content:", cleanedContent.substring(0, 200));
      throw new Error("Invalid JSON in AI content");
    }

    // Ensure unidad_sat is always present
    if (!suggestion.unidad_sat_sugerida) {
      suggestion.unidad_sat_sugerida = unidadSATSugerida;
    }

    // Format contenido_empaque if we have peso_kg but no contenido
    if (!suggestion.contenido_empaque_sugerido && suggestion.peso_kg_sugerido) {
      suggestion.contenido_empaque_sugerido = `${suggestion.peso_kg_sugerido} kg`;
    }

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
