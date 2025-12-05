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

    // Call Google Place Details API
    const googleUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    googleUrl.searchParams.set('place_id', placeId);
    googleUrl.searchParams.set('key', apiKey);
    googleUrl.searchParams.set('fields', 'geometry,formatted_address');
    googleUrl.searchParams.set('language', 'es');

    const response = await fetch(googleUrl.toString());
    const data = await response.json();

    console.log(`[get-place-details] Google response status: ${data.status}`);

    if (data.status !== 'OK') {
      let errorMessage = 'Error obteniendo detalles';
      
      switch (data.status) {
        case 'INVALID_REQUEST':
          errorMessage = 'place_id inválido';
          break;
        case 'NOT_FOUND':
          errorMessage = 'Lugar no encontrado';
          break;
        case 'REQUEST_DENIED':
          errorMessage = data.error_message || 'API Key sin permisos de Places';
          console.error(`[get-place-details] REQUEST_DENIED: ${data.error_message}`);
          break;
        case 'OVER_QUERY_LIMIT':
          errorMessage = 'Límite de consultas excedido';
          break;
      }
      
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = data.result;
    const location = result?.geometry?.location;

    if (!location) {
      return new Response(
        JSON.stringify({ error: 'No se encontraron coordenadas' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[get-place-details] Success: lat=${location.lat}, lng=${location.lng}`);

    return new Response(
      JSON.stringify({
        lat: location.lat,
        lng: location.lng,
        formatted_address: result.formatted_address,
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
