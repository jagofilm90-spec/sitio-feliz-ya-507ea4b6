import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GeocodeRequest {
  addresses: {
    id: string;
    address: string;
  }[];
}

interface GeocodeResult {
  id: string;
  lat: number | null;
  lng: number | null;
  formatted_address?: string;
  error?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!GOOGLE_MAPS_API_KEY) {
      throw new Error("GOOGLE_MAPS_API_KEY not configured");
    }

    const { addresses } = (await req.json()) as GeocodeRequest;

    if (!addresses?.length) {
      return new Response(
        JSON.stringify({ results: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[geocode-addresses] Geocoding ${addresses.length} addresses`);

    const results: GeocodeResult[] = [];
    let apiErrors: string[] = [];

    for (const item of addresses) {
      if (!item.address) {
        results.push({ id: item.id, lat: null, lng: null, error: "Sin dirección" });
        continue;
      }

      try {
        const encodedAddress = encodeURIComponent(`${item.address}, México`);
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${GOOGLE_MAPS_API_KEY}`;
        
        const response = await fetch(url);
        const data = await response.json();

        console.log(`[geocode-addresses] Google response for "${item.address.substring(0, 50)}...": status=${data.status}`);

        if (data.status === "OK" && data.results?.[0]?.geometry?.location) {
          const location = data.results[0].geometry.location;
          results.push({
            id: item.id,
            lat: location.lat,
            lng: location.lng,
            formatted_address: data.results[0].formatted_address,
          });
        } else {
          // Log detailed error info
          let errorMessage = "Ubicación no encontrada";
          
          switch (data.status) {
            case "ZERO_RESULTS":
              errorMessage = "Dirección no reconocida por Google";
              break;
            case "OVER_QUERY_LIMIT":
              errorMessage = "Límite de consultas excedido";
              break;
            case "REQUEST_DENIED":
              errorMessage = data.error_message || "API Key sin permisos de Geocoding";
              console.error(`[geocode-addresses] REQUEST_DENIED: ${data.error_message}`);
              break;
            case "INVALID_REQUEST":
              errorMessage = "Solicitud inválida";
              break;
            case "UNKNOWN_ERROR":
              errorMessage = "Error del servidor de Google";
              break;
          }
          
          if (data.error_message) {
            console.error(`[geocode-addresses] Google error: ${data.error_message}`);
            apiErrors.push(data.error_message);
          }
          
          console.warn(`[geocode-addresses] No results for: ${item.address} - ${errorMessage}`);
          results.push({ id: item.id, lat: null, lng: null, error: errorMessage });
        }
      } catch (err) {
        console.error(`[geocode-addresses] Error geocoding ${item.address}:`, err);
        results.push({ id: item.id, lat: null, lng: null, error: "Error de conexión" });
      }

      // Small delay to avoid rate limiting
      await new Promise((r) => setTimeout(r, 50));
    }

    const successCount = results.filter(r => r.lat).length;
    console.log(`[geocode-addresses] Successfully geocoded ${successCount}/${addresses.length}`);

    return new Response(
      JSON.stringify({ 
        results,
        apiError: apiErrors.length > 0 ? apiErrors[0] : null 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[geocode-addresses] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
