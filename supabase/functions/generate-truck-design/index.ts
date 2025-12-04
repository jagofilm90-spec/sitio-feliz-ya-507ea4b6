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
      // === VISTA LATERAL ===
      'minimalista-lateral': `Professional vehicle wrap design mockup for a white commercial closed-box delivery truck (side view). Ultra minimalist elegant design with:
- Large "ALMASA" logo text in bold red (#C41E3A) centered on the truck side
- Below the logo: "Desde 1904" in elegant black serif typography
- At the bottom: "almasa.com.mx" in small black text
- Clean white background with subtle red accent line
- No icons, no services listed, pure minimalist branding
- Modern, premium, sophisticated look
- 16:9 aspect ratio, photorealistic mockup`,

      'reglamentario-lateral': `Professional vehicle wrap design mockup for a white commercial closed-box delivery truck (side view). Elegant minimalist design that complies with Mexico City commercial vehicle regulations:
- Large "ALMASA" logo text in bold red (#C41E3A) centered on the truck side
- Below the logo: "Desde 1904" in elegant black serif typography
- Text "SERVICIO MERCANTIL DE TRANSPORTE DE CARGA" in formal black letters
- Rectangular space labeled "No. DE PLACA" with placeholder text
- Text "COMBUSTIBLE: DIESEL" in small formal black typography
- Text "QUEJAS: 55-1234-5678" in small black text
- At the bottom: "almasa.com.mx" in small black text
- On the rear bumper and front bumper: diagonal yellow and red safety stripes (franjas diagonales reglamentarias)
- Clean white background maintaining elegant minimalist aesthetic
- All regulatory text positioned professionally without cluttering the design
- Modern, premium, sophisticated look while being 100% compliant with regulations
- 16:9 aspect ratio, photorealistic mockup`,

      'premium-lateral': `Professional vehicle wrap design mockup for a white commercial closed-box delivery truck (side view). Premium executive elegant design with:
- Clean white truck body as base
- Large "ALMASA" logo in bold red (#C41E3A) with elegant styling
- "Desde 1904" in sophisticated gold/champagne metallic typography
- Subtle geometric accent lines in gold creating elegant depth
- "almasa.com.mx" in elegant black text at bottom
- Luxurious, sophisticated, premium brand appearance on white
- Modern elegant white aesthetic with red and gold accents
- 16:9 aspect ratio, photorealistic mockup`,

      // === VISTA TRASERA ===
      'minimalista-trasera': `Professional vehicle wrap design mockup for a white commercial delivery truck (rear view, back doors closed). Clean elegant minimalist design with:
- Large "ALMASA" logo in bold red (#C41E3A) centered on the back doors
- "Desde 1904" below the logo in elegant black serif typography
- "almasa.com.mx" prominently displayed below
- Clean white background, ultra minimalist
- No additional text or elements, pure brand focus
- Modern, premium, sophisticated look
- 16:9 aspect ratio, photorealistic mockup showing rear of truck`,

      'reglamentario-trasera': `Professional vehicle wrap design mockup for a white commercial delivery truck (rear view, back doors closed). Elegant design with regulatory compliance elements:
- Large "ALMASA" logo in bold red (#C41E3A) centered on the back doors
- "Desde 1904" below the logo in elegant black typography
- "almasa.com.mx" prominently displayed
- "UNIDAD No. ___" in formal black text (unit number placeholder)
- "¿Cómo manejo? Llama al: 55-1234-5678" in visible black text
- "Velocidad máxima: 90 km/h" text clearly visible
- Diagonal yellow and red safety stripes on rear bumper (franjas diagonales reglamentarias)
- Space for license plate at bottom
- Clean white background maintaining elegant aesthetic
- All regulatory text positioned professionally
- 16:9 aspect ratio, photorealistic mockup showing rear of truck`,

      'premium-trasera': `Professional vehicle wrap design mockup for a white commercial delivery truck (rear view, back doors closed). Premium executive elegant design with:
- Large "ALMASA" logo in bold red (#C41E3A) with elegant styling centered on doors
- "Desde 1904" in sophisticated gold/champagne metallic typography
- "almasa.com.mx" in elegant gold text
- "UNIDAD No. ___" in refined gold text
- "¿Cómo manejo? Llama al: 55-1234-5678" in elegant black text
- "Velocidad máxima: 90 km/h" in refined typography
- Elegant diagonal gold and red stripes on rear bumper
- Subtle geometric gold accent details
- Clean white background with premium sophisticated appearance
- Luxurious brand presentation with red and gold accents
- 16:9 aspect ratio, photorealistic mockup showing rear of truck`
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
