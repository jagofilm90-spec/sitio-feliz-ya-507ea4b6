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
    const { designType } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Prompts usando el logo REAL de ALMASA - tipografía serif elegante con "A" estilizada
    // Logo ALMASA: Letras serif rojas (#C41E3A) con la "A" inicial grande y decorativa, estilo clásico/tradicional
    const prompts: Record<string, string> = {
      // === VISTA LATERAL ===
      'minimalista-lateral': `Photorealistic white commercial box truck wrap mockup, side view. Professional fleet design for Mexican food distributor.

CRITICAL - LOGO ALMASA (must match exactly):
- The word "ALMASA" in elegant RED SERIF typography (#C41E3A crimson red)
- The first letter "A" is larger and decorative with classic flourishes
- Typography style: Traditional serif font similar to Times New Roman or Garamond but with decorative capital letters
- NOT sans-serif, NOT modern/minimalist font - it's a CLASSIC ELEGANT SERIF typeface
- Logo centered prominently on truck box side

ADDITIONAL ELEMENTS:
- Small "almasa.com.mx" below logo in matching red
- Small text on driver door: "PLACA: XXX-000 | DIESEL"

STYLE: Clean white truck, professional appearance. Photorealistic studio mockup with soft shadows.`,

      'reglamentario-lateral': `Photorealistic white commercial truck wrap mockup, side view. Mexican commercial vehicle with regulatory compliance.

CRITICAL - LOGO ALMASA (must match exactly):
- The word "ALMASA" in elegant RED SERIF typography (#C41E3A crimson red)
- The first letter "A" is larger and decorative with classic flourishes  
- Typography: Traditional elegant serif font (like Times/Garamond with decorative capitals)
- NOT sans-serif - it's a CLASSIC SERIF typeface
- Logo centered on main truck box

REGULATORY INFO (driver door area, small dark gray text):
"SERVICIO MERCANTIL DE CARGA
PLACA: XXX-000 | DIESEL
ABARROTES LA MANITA S.A. DE C.V.
Melchor Campo #59, Col. Centro, CDMX
TEL: 55-XXXX-XXXX"

ADDITIONAL: "almasa.com.mx" in red below logo, thin red accent line at bottom edge.

STYLE: Professional Mexican commercial truck. Photorealistic mockup.`,

      'premium-lateral': `Photorealistic white commercial truck wrap mockup, side view. Premium sophisticated fleet design.

CRITICAL - LOGO ALMASA (must match exactly):
- The word "ALMASA" in elegant RED SERIF typography (#C41E3A crimson red)
- The first letter "A" is larger and decorative with classic flourishes
- Typography: Traditional elegant serif font with decorative capital letters
- NOT sans-serif - CLASSIC ELEGANT SERIF typeface
- Logo centered prominently

DESIGN ELEMENTS:
- Elegant dark charcoal gray band at bottom third of truck box
- "Desde 1904" tagline in white on the gray band
- "almasa.com.mx" in white on gray band
- Door area regulatory text in white on charcoal:
  "SERVICIO MERCANTIL | PLACA: XXX-000 | DIESEL
  ABARROTES LA MANITA S.A. DE C.V.
  Melchor Campo #59, Col. Centro, CDMX | 55-XXXX-XXXX"

STYLE: Premium two-tone white and charcoal. Photorealistic mockup.`,

      // === VISTA TRASERA ===
      'minimalista-trasera': `Photorealistic white truck rear doors wrap mockup. Professional back view design.

CRITICAL - LOGO ALMASA (must match exactly):
- The word "ALMASA" in elegant RED SERIF typography (#C41E3A crimson red)
- The first letter "A" is larger and decorative with classic flourishes
- Typography: Traditional elegant serif font (Times/Garamond style with decorative capitals)
- NOT sans-serif - CLASSIC SERIF typeface
- Logo centered on doors

ADDITIONAL:
- Small "almasa.com.mx" in red below logo
- Bottom edge: small gray text "QUEJAS: 55-XXXX-XXXX | PLACA: XXX-000"

STYLE: Clean professional appearance. Photorealistic mockup.`,

      'reglamentario-trasera': `Photorealistic white truck rear doors wrap mockup. Mexican commercial vehicle back view with regulatory info.

CRITICAL - LOGO ALMASA (must match exactly):
- The word "ALMASA" in elegant RED SERIF typography (#C41E3A crimson red)
- The first letter "A" is larger and decorative with classic flourishes
- Typography: Traditional elegant serif font with decorative capitals
- NOT sans-serif - CLASSIC SERIF typeface
- Logo centered on doors

REGULATORY INFO (below logo, small dark gray text):
"¿Cómo manejo? 55-XXXX-XXXX
QUEJAS: 55-XXXX-XXXX
PLACA: XXX-000 | VEL. MÁX: 90 km/h"

- Diagonal safety stripes at bottom bumper area

STYLE: Professional Mexican commercial truck. Photorealistic mockup.`,

      'premium-trasera': `Photorealistic white truck rear doors wrap mockup. Premium sophisticated back view.

CRITICAL - LOGO ALMASA (must match exactly):
- The word "ALMASA" in elegant RED SERIF typography (#C41E3A crimson red)
- The first letter "A" is larger and decorative with classic flourishes
- Typography: Traditional elegant serif font with decorative capitals
- NOT sans-serif - CLASSIC ELEGANT SERIF typeface
- Logo centered on doors

DESIGN ELEMENTS:
- Dark charcoal gray band at bottom third of doors
- Regulatory info in white on charcoal:
  "¿Cómo manejo? 55-XXXX-XXXX | QUEJAS: 55-XXXX-XXXX
  PLACA: XXX-000 | VEL. MÁX: 90 km/h"
- Subtle red accent line between white and charcoal

STYLE: Premium two-tone design. Photorealistic mockup.`
    };

    const prompt = prompts[designType];
    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Tipo de diseño no válido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating design: ${designType}`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        modalities: ['image', 'text']
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
        JSON.stringify({ error: 'Error al generar la imagen' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    console.log('AI response received');

    const imageUrl = aiResponse.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    const textContent = aiResponse.choices?.[0]?.message?.content;

    if (!imageUrl) {
      console.error('No image in response:', JSON.stringify(aiResponse));
      return new Response(
        JSON.stringify({ error: 'No se pudo generar la imagen', details: textContent }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        imageUrl,
        description: textContent,
        designType
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-truck-design:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
