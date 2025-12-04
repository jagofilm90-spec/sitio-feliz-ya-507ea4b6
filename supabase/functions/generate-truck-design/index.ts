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

    const prompts: Record<string, string> = {
      'ultra-minimalista': `Professional vehicle wrap design mockup for a white commercial delivery truck (side view). Ultra minimalist elegant design with:
- Large "ALMASA" logo text in bold red (#C41E3A) centered on the truck side
- Below the logo: "Desde 1904" in elegant black serif typography
- At the bottom: "almasa.com.mx" in small black text
- Clean white background with subtle red accent line
- No icons, no services listed, pure minimalist branding
- Modern, premium, sophisticated look
- 16:9 aspect ratio, photorealistic mockup`,

      'con-iconos': `Professional vehicle wrap design mockup for a white commercial delivery truck (side view). Minimalist elegant design with icons:
- Large "ALMASA" logo text in bold red (#C41E3A) on the truck side
- Four small elegant line icons in black representing: wheat/grains, bread/bakery, factory/industry, dog food bowl
- "Desde 1904" in elegant typography
- "almasa.com.mx" at the bottom
- Clean layout with red and black color scheme on white
- Modern, professional, balanced composition
- 16:9 aspect ratio, photorealistic mockup`,

      'lateral-completo': `Professional vehicle wrap design mockup for a white commercial delivery truck (side view). Full side elegant design with:
- Dynamic diagonal red (#C41E3A) stripe flowing from front to back
- Large "ALMASA" logo in white on the red stripe
- Black section with services listed elegantly: "Abarrotes y Semillas • Panaderías • Industrias • Alimento para Mascotas"
- "121 Años de Tradición | 1904-2025" in gold/cream text
- "almasa.com.mx" prominently displayed
- Bold, modern, eye-catching but elegant design
- 16:9 aspect ratio, photorealistic mockup`,

      'premium-ejecutivo': `Professional vehicle wrap design mockup for a commercial delivery truck (side view). Premium executive design with:
- Matte black truck body as base
- "ALMASA" logo in vibrant red (#C41E3A) with subtle glow effect
- "Desde 1904" in elegant gold/champagne metallic typography
- Subtle geometric lines in dark gray creating depth
- "almasa.com.mx" in silver/white at bottom
- Luxurious, sophisticated, premium brand appearance
- Dark elegant aesthetic with red and gold accents
- 16:9 aspect ratio, photorealistic mockup`
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
