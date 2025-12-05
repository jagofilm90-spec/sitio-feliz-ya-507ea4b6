import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Google Maps API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const input = url.searchParams.get('input');
    
    if (!input || input.length < 3) {
      return new Response(
        JSON.stringify({ predictions: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Autocomplete request for:', input);

    // Call NEW Google Places Autocomplete API
    const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
      },
      body: JSON.stringify({
        input: input,
        includedRegionCodes: ['mx'],
        languageCode: 'es',
        includedPrimaryTypes: ['street_address', 'route', 'locality', 'sublocality', 'neighborhood', 'premise'],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Google Places API error:', JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: data.error?.message || 'Google API error', predictions: [] }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Transform new API response to match our expected format
    const predictions = (data.suggestions || []).map((s: any) => {
      const place = s.placePrediction;
      if (!place) return null;
      
      return {
        place_id: place.placeId,
        description: place.text?.text || '',
        main_text: place.structuredFormat?.mainText?.text || '',
        secondary_text: place.structuredFormat?.secondaryText?.text || '',
      };
    }).filter(Boolean);

    console.log(`Returning ${predictions.length} predictions`);

    return new Response(
      JSON.stringify({ predictions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in google-places-autocomplete:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', predictions: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
