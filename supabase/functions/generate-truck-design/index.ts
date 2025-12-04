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
      'minimalista-lateral': `Professional vehicle wrap design mockup for a white commercial closed-box delivery truck (side view). Ultra minimalist elegant design with regulatory compliance:

MAIN BOX AREA:
- "ALMASA" logo in bold red serif typography (#C41E3A) inside a rounded rectangle with thin elegant border, centered on truck side
- Below the logo: "Desde 1904" in elegant black serif typography
- At the bottom of the box: "almasa.com.mx" in small black text

TOP OF BOX (near roof line):
- "PLACA: XXX-000" in small formal black text

DOOR AREA (driver's door, small formal text):
- "COMBUSTIBLE: DIESEL"

BUMPERS:
- Diagonal yellow and red safety stripes (franjas diagonales reglamentarias) on front and rear bumpers

Clean white background with ultra minimalist aesthetic. Modern, premium, sophisticated look while including minimum required regulatory information.
16:9 aspect ratio, photorealistic mockup`,

      'reglamentario-lateral': `Professional vehicle wrap design mockup for a white commercial closed-box delivery truck (side view). Elegant design fully compliant with Mexico City commercial vehicle regulations:

MAIN BOX AREA:
- "ALMASA" logo in bold red serif typography (#C41E3A) inside a rounded rectangle with thin elegant border, centered on truck side
- Below the logo: "Desde 1904" in elegant black serif typography
- At the bottom of the box: "almasa.com.mx" in small black text

TOP OF BOX (near roof line):
- "PLACA: XXX-000" in formal black text, clearly visible

DOOR AREA (driver's door, formal black text in organized layout):
- Header: "SERVICIO MERCANTIL DE TRANSPORTE DE CARGA"
- "No. PLACA: XXX-000"
- "ABARROTES LA MANITA, S.A. DE C.V."
- "Melchor Campo #59, Col. Centro, CDMX"
- "TEL: 55-XXXX-XXXX"

SIDE OF BOX (visible regulatory info):
- "COMBUSTIBLE: DIESEL" in small formal black text

BUMPERS:
- Diagonal yellow and red safety stripes (franjas diagonales reglamentarias) on front and rear bumpers

Clean white background maintaining elegant minimalist aesthetic while being 100% compliant with regulations. All regulatory text positioned professionally without cluttering the design.
16:9 aspect ratio, photorealistic mockup`,

      'premium-lateral': `Professional vehicle wrap design mockup for a white commercial closed-box delivery truck (side view). Premium executive elegant design with regulatory compliance:

MAIN BOX AREA:
- "ALMASA" logo in bold red (#C41E3A) inside a rounded rectangle with thin elegant border and subtle gold accent details, centered
- "Desde 1904" in sophisticated gold/champagne metallic typography below logo
- Subtle geometric accent lines in gold creating elegant depth
- "almasa.com.mx" in elegant black text at bottom

TOP OF BOX (near roof line):
- "PLACA: XXX-000" in refined gold metallic text

DOOR AREA (driver's door, elegant gold and black text):
- Header: "SERVICIO MERCANTIL DE TRANSPORTE DE CARGA" in refined black
- "No. PLACA: XXX-000" in gold
- "ABARROTES LA MANITA, S.A. DE C.V." in elegant black
- "Melchor Campo #59, Col. Centro, CDMX" in black
- "TEL: 55-XXXX-XXXX" in gold

SIDE OF BOX:
- "COMBUSTIBLE: DIESEL" in small elegant gold text

BUMPERS:
- Elegant diagonal gold and red stripes on front and rear bumpers

Clean white truck body with luxurious, sophisticated, premium brand appearance using red and gold accents.
16:9 aspect ratio, photorealistic mockup`,

      // === VISTA TRASERA ===
      'minimalista-trasera': `Professional vehicle wrap design mockup for a white commercial delivery truck (rear view, back doors closed). Clean elegant minimalist design with regulatory compliance:

BACK DOORS (center):
- "ALMASA" logo in bold red serif typography (#C41E3A) inside a rounded rectangle with thin elegant border, large and centered
- "Desde 1904" below the logo in elegant black serif typography
- "almasa.com.mx" prominently displayed below

UPPER AREA (near top of doors):
- "PLACA: XXX-000" in formal black text, clearly visible

LOWER AREA (above bumper):
- "QUEJAS: 55-XXXX-XXXX" in visible black text

REAR BUMPER:
- Diagonal yellow and red safety stripes (franjas diagonales reglamentarias)

LICENSE PLATE AREA:
- Space for physical license plate at standard position

Clean white background, ultra minimalist with only essential regulatory information. Modern, premium, sophisticated look.
16:9 aspect ratio, photorealistic mockup showing rear of truck`,

      'reglamentario-trasera': `Professional vehicle wrap design mockup for a white commercial delivery truck (rear view, back doors closed). Elegant design with full regulatory compliance:

BACK DOORS (center):
- "ALMASA" logo in bold red serif typography (#C41E3A) inside a rounded rectangle with thin elegant border, large and centered
- "Desde 1904" below the logo in elegant black typography
- "almasa.com.mx" prominently displayed

UPPER AREA (near top of doors):
- "UNIDAD No. ___" in formal black text
- "PLACA: XXX-000" clearly visible

CENTER-LOWER AREA (organized regulatory block):
- "¿Cómo manejo? Llama al: 55-XXXX-XXXX" in visible black text
- "QUEJAS Y SUGERENCIAS: 55-XXXX-XXXX" in formal black text
- "Velocidad máxima: 90 km/h" clearly visible

REAR BUMPER:
- Diagonal yellow and red safety stripes (franjas diagonales reglamentarias)

LICENSE PLATE AREA:
- Space for physical license plate at standard position

Clean white background maintaining elegant aesthetic while being 100% compliant with all rear vehicle regulations. All text positioned professionally.
16:9 aspect ratio, photorealistic mockup showing rear of truck`,

      'premium-trasera': `Professional vehicle wrap design mockup for a white commercial delivery truck (rear view, back doors closed). Premium executive elegant design with regulatory compliance:

BACK DOORS (center):
- "ALMASA" logo in bold red (#C41E3A) inside a rounded rectangle with thin elegant border and subtle gold accents, large and centered
- "Desde 1904" in sophisticated gold/champagne metallic typography
- "almasa.com.mx" in elegant gold text

UPPER AREA (near top of doors):
- "UNIDAD No. ___" in refined gold text
- "PLACA: XXX-000" in elegant gold metallic

CENTER-LOWER AREA (elegant regulatory block):
- "¿Cómo manejo? Llama al: 55-XXXX-XXXX" in elegant black text
- "QUEJAS Y SUGERENCIAS: 55-XXXX-XXXX" in refined black text
- "Velocidad máxima: 90 km/h" in elegant typography

REAR BUMPER:
- Elegant diagonal gold and red stripes

LICENSE PLATE AREA:
- Space for physical license plate with subtle gold frame accent

Clean white background with luxurious, sophisticated premium appearance. Red and gold accents throughout.
16:9 aspect ratio, photorealistic mockup showing rear of truck`
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
