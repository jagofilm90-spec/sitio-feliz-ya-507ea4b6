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

    // Prompts para diseños de camioneta ALMASA
    const prompts: Record<string, string> = {
      // === VISTA LATERAL ===
      'elegante-lateral': `Photorealistic white commercial box truck wrap mockup, professional side view on neutral background.

LOGO ALMASA (EXACT STYLE - CRITICAL):
- Text "ALMASA" in large elegant RED SERIF typography (#C41E3A crimson red)
- Classic serif font with decorative serifs, similar to Times New Roman or elegant Garamond style
- NO rectangle, NO border, NO background around the logo - JUST the red serif letters floating
- Logo positioned centered-upper on the truck box, large and prominent
- Below logo: "Desde 1904" in smaller elegant red serif text (same font family)
- Below that: "almasa.com.mx" in small red text

DESIGN ELEMENTS:
- Elegant flowing red curved decorative line running along the bottom edge of the truck box
- The curve is smooth and graceful, swooping gently
- Clean white truck body, pristine finish
- Modern white commercial box truck

REGULATORY INFO (driver door area only, small dark gray text, grouped compactly in vertical list):
SERVICIO MERCANTIL DE TRANSPORTE DE CARGA
ABARROTES LA MANITA, S.A. DE C.V.
Melchor Campo #59, Col. Centro, CDMX
TEL: 55-XXXX-XXXX
PLACA: XXX-000 | DIESEL

The regulatory text should be small and discrete, positioned on the driver's door area, NOT interfering with the main elegant design.

STYLE: Premium minimalist, sophisticated fleet branding. Photorealistic mockup with soft studio lighting and subtle shadows. White background or very light gray studio backdrop. The overall impression should be elegant, modern, and professional.
`,

      'minimalista-lateral': `Photorealistic white commercial box truck wrap mockup, side view. Professional fleet design for Mexican food distributor.

CRITICAL - ALMASA LOGO (EXACT DESIGN - DO NOT DEVIATE):
- Logo is inside a ROUNDED RECTANGLE (pill/capsule shape, horizontal orientation)
- The rounded rectangle has a RED BORDER/OUTLINE (#C41E3A crimson red, 3-4px thick)
- INSIDE the rounded rectangle: WHITE/cream background
- Text "ALMASA" in elegant RED SERIF typography (#C41E3A) INSIDE the white rounded rectangle
- Typography: Classic elegant serif font with decorative serifs, similar to classic logotype style
- All letters are the same height, well-spaced, professional corporate logo appearance
- The logo looks like a badge or seal - rectangular with rounded corners containing the brand name
- Logo size: Large and prominent, centered on the truck box side

ADDITIONAL ELEMENTS:
- Small "almasa.com.mx" in red below the logo badge
- Small text on driver door: "PLACA: XXX-000 | DIESEL"

STYLE: Clean white truck, professional appearance. Photorealistic studio mockup with soft shadows.`,

      'reglamentario-lateral': `Photorealistic white commercial truck wrap mockup, side view. Mexican commercial vehicle with regulatory compliance.

CRITICAL - ALMASA LOGO (EXACT DESIGN - DO NOT DEVIATE):
- Logo is inside a ROUNDED RECTANGLE (pill/capsule shape, horizontal orientation)
- The rounded rectangle has a RED BORDER/OUTLINE (#C41E3A crimson red)
- INSIDE the rounded rectangle: WHITE background
- Text "ALMASA" in elegant RED SERIF typography (#C41E3A) INSIDE the white rounded rectangle
- Typography: Classic elegant serif font with decorative serifs
- The logo looks like a corporate badge - rounded rectangle containing the red text on white
- Logo centered prominently on main truck box

REGULATORY INFO (driver door area, small dark gray text):
"SERVICIO MERCANTIL DE CARGA
PLACA: XXX-000 | DIESEL
ABARROTES LA MANITA S.A. DE C.V.
Melchor Campo #59, Col. Centro, CDMX
TEL: 55-XXXX-XXXX"

ADDITIONAL: "almasa.com.mx" in red below logo badge, thin red accent line at bottom edge.

STYLE: Professional Mexican commercial truck. Photorealistic mockup.`,

      'premium-lateral': `Photorealistic white commercial truck wrap mockup, side view. Premium sophisticated fleet design.

CRITICAL - ALMASA LOGO (EXACT DESIGN - DO NOT DEVIATE):
- Logo is inside a ROUNDED RECTANGLE (pill/capsule shape, horizontal orientation)
- The rounded rectangle has a RED BORDER/OUTLINE (#C41E3A crimson red)
- INSIDE the rounded rectangle: WHITE background
- Text "ALMASA" in elegant RED SERIF typography (#C41E3A) INSIDE the white rounded rectangle
- Typography: Classic elegant serif font, corporate logo style
- The logo looks like a premium badge/seal - rounded rectangle with red border containing red text on white
- Logo centered prominently on truck box

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

CRITICAL - ALMASA LOGO (EXACT DESIGN - DO NOT DEVIATE):
- Logo is inside a ROUNDED RECTANGLE (pill/capsule shape, horizontal orientation)
- The rounded rectangle has a RED BORDER/OUTLINE (#C41E3A crimson red)
- INSIDE the rounded rectangle: WHITE background
- Text "ALMASA" in elegant RED SERIF typography (#C41E3A) INSIDE the white rounded rectangle
- Typography: Classic elegant serif font with decorative serifs
- The logo looks like a corporate badge - rounded rectangle containing red text on white
- Logo centered on truck rear doors

ADDITIONAL:
- Small "almasa.com.mx" in red below logo badge
- Bottom edge: small gray text "QUEJAS: 55-XXXX-XXXX | PLACA: XXX-000"

STYLE: Clean professional appearance. Photorealistic mockup.`,

      'reglamentario-trasera': `Photorealistic white truck rear doors wrap mockup. Mexican commercial vehicle back view with regulatory info.

CRITICAL - ALMASA LOGO (EXACT DESIGN - DO NOT DEVIATE):
- Logo is inside a ROUNDED RECTANGLE (pill/capsule shape, horizontal orientation)
- The rounded rectangle has a RED BORDER/OUTLINE (#C41E3A crimson red)
- INSIDE the rounded rectangle: WHITE background
- Text "ALMASA" in elegant RED SERIF typography (#C41E3A) INSIDE the white rounded rectangle
- Typography: Classic elegant serif font
- The logo looks like a badge/seal - rounded rectangle with red border, white fill, red text
- Logo centered on doors

REGULATORY INFO (below logo, small dark gray text):
"¿Cómo manejo? 55-XXXX-XXXX
QUEJAS: 55-XXXX-XXXX
PLACA: XXX-000 | VEL. MÁX: 90 km/h"

- Diagonal safety stripes at bottom bumper area

STYLE: Professional Mexican commercial truck. Photorealistic mockup.`,

      'premium-trasera': `Photorealistic white truck rear doors wrap mockup. Premium sophisticated back view.

CRITICAL - ALMASA LOGO (EXACT DESIGN - DO NOT DEVIATE):
- Logo is inside a ROUNDED RECTANGLE (pill/capsule shape, horizontal orientation)
- The rounded rectangle has a RED BORDER/OUTLINE (#C41E3A crimson red)
- INSIDE the rounded rectangle: WHITE background
- Text "ALMASA" in elegant RED SERIF typography (#C41E3A) INSIDE the white rounded rectangle
- Typography: Classic elegant serif font, premium corporate logo style
- The logo looks like an elegant badge - rounded rectangle containing red serif text on white
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
