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

    for (const item of addresses) {
      if (!item.address) {
        results.push({ id: item.id, lat: null, lng: null });
        continue;
      }

      try {
        const encodedAddress = encodeURIComponent(`${item.address}, México`);
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${GOOGLE_MAPS_API_KEY}`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === "OK" && data.results?.[0]?.geometry?.location) {
          const location = data.results[0].geometry.location;
          results.push({
            id: item.id,
            lat: location.lat,
            lng: location.lng,
            formatted_address: data.results[0].formatted_address,
          });
        } else {
          console.warn(`[geocode-addresses] No results for: ${item.address}`);
          results.push({ id: item.id, lat: null, lng: null });
        }
      } catch (err) {
        console.error(`[geocode-addresses] Error geocoding ${item.address}:`, err);
        results.push({ id: item.id, lat: null, lng: null });
      }

      // Small delay to avoid rate limiting
      await new Promise((r) => setTimeout(r, 50));
    }

    console.log(`[geocode-addresses] Successfully geocoded ${results.filter(r => r.lat).length}/${addresses.length}`);

    return new Response(
      JSON.stringify({ results }),
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
