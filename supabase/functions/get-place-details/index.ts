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
    const placeId = url.searchParams.get('place_id');
    
    if (!placeId) {
      return new Response(
        JSON.stringify({ error: 'place_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[get-place-details] Fetching details for place_id: ${placeId}`);

    // Call NEW Google Places API (Place Details)
    const response = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}?languageCode=es`,
      {
        method: 'GET',
        headers: {
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'location,formattedAddress',
        },
      }
    );

    const data = await response.json();

    console.log(`[get-place-details] Response status: ${response.status}`);

    if (!response.ok) {
      console.error(`[get-place-details] Error: ${JSON.stringify(data)}`);
      return new Response(
        JSON.stringify({ error: data.error?.message || 'Error obteniendo detalles' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const location = data.location;

    if (!location) {
      return new Response(
        JSON.stringify({ error: 'No se encontraron coordenadas' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[get-place-details] Success: lat=${location.latitude}, lng=${location.longitude}`);

    return new Response(
      JSON.stringify({
        lat: location.latitude,
        lng: location.longitude,
        formatted_address: data.formattedAddress,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[get-place-details] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
