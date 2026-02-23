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
          let estado = firstPlace.state || "";
          // Normalize CDMX name
          if (estado === "Distrito Federal") estado = "Ciudad de México";
          const municipio = extractMunicipio(firstPlace, estado, codigo_postal);
          
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

// CDMX alcaldías by postal code range
function getAlcaldiaCDMX(cp: string): string {
  const n = parseInt(cp, 10);
  if (n >= 1000 && n <= 1999) return "Centro / Cuauhtémoc";
  if (n >= 2000 && n <= 2999) return "Azcapotzalco";
  if (n >= 3000 && n <= 3999) return "Coyoacán";
  if (n >= 4000 && n <= 4999) return "Cuajimalpa de Morelos";
  if (n >= 5000 && n <= 5999) return "Gustavo A. Madero";
  if (n >= 6000 && n <= 6999) return "Cuauhtémoc";
  if (n >= 7000 && n <= 7999) return "Iztapalapa";
  if (n >= 8000 && n <= 8999) return "Iztacalco";
  if (n >= 9000 && n <= 9999) return "Iztapalapa";
  if (n >= 10000 && n <= 10999) return "Álvaro Obregón";
  if (n >= 11000 && n <= 11999) return "Miguel Hidalgo";
  if (n >= 12000 && n <= 12999) return "Tlalpan";
  if (n >= 13000 && n <= 13999) return "Tláhuac";
  if (n >= 14000 && n <= 14999) return "Tlalpan";
  if (n >= 15000 && n <= 15999) return "Venustiano Carranza";
  if (n >= 16000 && n <= 16999) return "Xochimilco";
  return "Ciudad de México";
}

// Helper to extract municipio from Zippopotam data
function extractMunicipio(place: { state: string; "place name": string; "state abbreviation"?: string }, estado: string, codigoPostal: string): string {
  // For CDMX, use postal code ranges to determine alcaldía
  if (estado === "Distrito Federal" || estado === "Ciudad de Mexico" || estado === "Ciudad de México") {
    return getAlcaldiaCDMX(codigoPostal);
  }
  
  // For other states, the state abbreviation is usually the state code (not useful as municipio)
  // Return the state name as fallback - the real municipio isn't available from Zippopotam
  return place["state abbreviation"] || estado;
}
