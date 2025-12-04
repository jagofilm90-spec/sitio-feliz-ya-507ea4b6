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

    // Modern minimalist prompts - Tesla/FedEx/Amazon fleet aesthetic
    const prompts: Record<string, string> = {
      // === VISTA LATERAL ===
      'minimalista-lateral': `Ultra modern minimalist white commercial box truck wrap mockup, side view. Clean contemporary fleet design.

DESIGN ELEMENTS:
- Large "ALMASA" in flat bold red (#C41E3A), modern sans-serif font (Helvetica/Gotham style), centered on truck box
- Small "almasa.com.mx" in light gray below
- Driver door: tiny text "PLACA: XXX-000 | DIESEL" in dark gray

STYLE: Maximum white space, no borders, no decorative elements, no patterns. Ultra clean like Tesla Semi or Apple delivery trucks. Flat colors only. Photorealistic studio mockup, soft shadows.`,

      'reglamentario-lateral': `Modern clean white commercial truck wrap mockup, side view. Contemporary fleet design with regulatory compliance.

DESIGN ELEMENTS:
- Large "ALMASA" in flat bold red (#C41E3A), modern sans-serif typography, centered on main box
- Small "almasa.com.mx" in gray below logo
- Subtle thin red horizontal line accent at bottom edge of box
- Driver door area - compact regulatory block in small dark gray sans-serif:
  "SERVICIO MERCANTIL DE CARGA
  PLACA: XXX-000 | DIESEL
  ABARROTES LA MANITA S.A. DE C.V.
  Melchor Campo #59, CDMX
  TEL: 55-XXXX-XXXX"

STYLE: Clean modern fleet aesthetic like FedEx or Amazon trucks. Minimal decorative elements. Photorealistic mockup.`,

      'premium-lateral': `Premium contemporary white commercial truck wrap mockup, side view. Sophisticated modern fleet design.

DESIGN ELEMENTS:
- Large "ALMASA" in bold red (#C41E3A), premium sans-serif typography, centered
- Elegant dark charcoal gray gradient band at bottom third of truck box
- "Desde 1904" small tagline in white on the gray band
- "almasa.com.mx" in white on gray band
- Door area - regulatory text in white on charcoal background:
  "SERVICIO MERCANTIL | PLACA: XXX-000 | DIESEL
  ABARROTES LA MANITA S.A. DE C.V.
  Melchor Campo #59, CDMX | 55-XXXX-XXXX"

STYLE: Premium contemporary fleet like luxury brand delivery. Sophisticated two-tone white and charcoal. Photorealistic mockup.`,

      // === VISTA TRASERA ===
      'minimalista-trasera': `Ultra modern minimalist white truck rear doors wrap mockup. Clean contemporary back view.

DESIGN ELEMENTS:
- Large "ALMASA" in flat bold red (#C41E3A), modern sans-serif font, centered on doors
- Small "almasa.com.mx" in light gray below
- Bottom edge only: small gray text "QUEJAS: 55-XXXX-XXXX | PLACA: XXX-000"

STYLE: Maximum white space, ultra clean, no borders or decorative elements. Tesla/Apple fleet aesthetic. Photorealistic mockup.`,

      'reglamentario-trasera': `Modern clean white truck rear doors wrap mockup. Contemporary fleet design with regulatory info.

DESIGN ELEMENTS:
- Large "ALMASA" in flat bold red (#C41E3A), modern sans-serif, centered on doors
- Below logo: compact regulatory block in small dark gray sans-serif:
  "¿Cómo manejo? 55-XXXX-XXXX
  QUEJAS: 55-XXXX-XXXX
  PLACA: XXX-000 | VEL. MÁX: 90 km/h"
- Minimal diagonal safety stripes only at very bottom bumper area

STYLE: Clean modern fleet aesthetic, regulatory compliant but contemporary. Photorealistic mockup.`,

      'premium-trasera': `Premium contemporary white truck rear doors wrap mockup. Sophisticated modern back view.

DESIGN ELEMENTS:
- Large "ALMASA" in bold red (#C41E3A), premium sans-serif typography, centered
- Elegant dark charcoal gray band at bottom third of doors
- Regulatory info in white text on charcoal band:
  "¿Cómo manejo? 55-XXXX-XXXX | QUEJAS: 55-XXXX-XXXX
  PLACA: XXX-000 | VEL. MÁX: 90 km/h"
- Subtle red accent line between white and charcoal areas

STYLE: Premium contemporary two-tone design, sophisticated and modern. Photorealistic mockup.`
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
