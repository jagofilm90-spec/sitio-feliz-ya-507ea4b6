import { corsHeaders } from "../_shared/cors.ts";

// Using Zippopotam.us - a free, reliable postal code API
// Falls back to a Mexican postal codes API

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { codigo_postal } = await req.json();

    if (!codigo_postal || codigo_postal.length !== 5) {
      return new Response(
        JSON.stringify({ error: "Código postal inválido. Debe tener 5 dígitos." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try Zippopotam.us first (reliable, fast)
    const zippoUrl = `https://api.zippopotam.us/MX/${codigo_postal}`;
    
    try {
      const response = await fetch(zippoUrl, {
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.places && data.places.length > 0) {
          const colonias = data.places.map((p: { "place name": string }) => p["place name"]);
          const firstPlace = data.places[0];
          
          // Extract state and municipality from the data
          // Zippopotam returns state in "state" and municipality info in place name
          const estado = firstPlace.state || "";
          // For Mexico, the "state abbreviation" often contains useful info
          const municipio = extractMunicipio(firstPlace, estado);
          
          return new Response(
            JSON.stringify({
              codigo_postal: codigo_postal,
              municipio: municipio,
              estado: estado,
              ciudad: municipio,
              colonias: colonias,
              colonia_sugerida: colonias.length === 1 ? colonias[0] : null,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    } catch (e) {
      console.log("Zippopotam failed, trying fallback:", e);
    }

    // Fallback: Try el-ccp.com API (Mexican postal codes)
    try {
      const elccpUrl = `https://api.el-ccp.com/codigo-postal/${codigo_postal}`;
      const response = await fetch(elccpUrl, {
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.colonias) {
          return new Response(
            JSON.stringify({
              codigo_postal: codigo_postal,
              municipio: data.municipio || data.delegacion || "",
              estado: data.estado || "",
              ciudad: data.ciudad || data.municipio || "",
              colonias: data.colonias || [],
              colonia_sugerida: data.colonias?.length === 1 ? data.colonias[0] : null,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    } catch (e) {
      console.log("el-ccp failed:", e);
    }

    // If all APIs fail, return a helpful response
    return new Response(
      JSON.stringify({ 
        error: "No se encontró información para este código postal. Por favor ingresa los datos manualmente.",
        codigo_postal,
        // Return empty but valid structure so UI can still work
        municipio: "",
        estado: "",
        colonias: [],
      }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in lookup-postal-code:", error);
    return new Response(
      JSON.stringify({ 
        error: "Error al consultar código postal. Por favor ingresa los datos manualmente.",
        municipio: "",
        estado: "",
        colonias: [],
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper to extract municipio from Zippopotam data
function extractMunicipio(place: { state: string; "place name": string; "state abbreviation"?: string }, estado: string): string {
  // For CDMX, the state abbreviation often contains the delegación/alcaldía
  if (estado === "Distrito Federal" || estado === "Ciudad de Mexico" || estado === "Ciudad de México") {
    // The place name might contain the colonia, try to get delegación from other sources
    // Common CDMX alcaldías based on postal code ranges
    return place["state abbreviation"] || "Ciudad de México";
  }
  
  // For other states, try to get municipio from the place data
  return place["state abbreviation"] || estado;
}
