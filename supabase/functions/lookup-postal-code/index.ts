import { corsHeaders } from "../_shared/cors.ts";

// Primary: Sepomex IcaliaLabs (free, accurate for Mexico - returns municipio)
// Fallback: Zippopotam.us (less accurate for municipio but reliable)

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

    // Try Sepomex IcaliaLabs first (accurate municipio data)
    try {
      const sepomexUrl = `https://sepomex.icalialabs.com/api/v1/zip_codes?zip_code=${codigo_postal}`;
      const response = await fetch(sepomexUrl, {
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.zip_codes && data.zip_codes.length > 0) {
          const colonias = data.zip_codes.map((z: { d_asenta: string }) => z.d_asenta);
          const first = data.zip_codes[0];
          
          let estado = first.d_estado || "";
          if (estado === "Distrito Federal") estado = "Ciudad de México";
          
          return new Response(
            JSON.stringify({
              codigo_postal,
              municipio: first.d_mnpio || "",
              estado,
              ciudad: first.d_ciudad || first.d_mnpio || "",
              colonias,
              colonia_sugerida: colonias.length === 1 ? colonias[0] : null,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    } catch (e) {
      console.log("Sepomex IcaliaLabs failed, trying Zippopotam:", e);
    }

    // Fallback: Zippopotam.us
    try {
      const zippoUrl = `https://api.zippopotam.us/MX/${codigo_postal}`;
      const response = await fetch(zippoUrl, {
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.places && data.places.length > 0) {
          const colonias = data.places.map((p: { "place name": string }) => p["place name"]);
          const firstPlace = data.places[0];
          
          let estado = firstPlace.state || "";
          if (estado === "Distrito Federal") estado = "Ciudad de México";
          
          // Zippopotam doesn't return real municipio for Mexico
          // Use CP-based lookup for CDMX, otherwise return estado
          const municipio = getAlcaldiaCDMX(estado, codigo_postal);
          
          return new Response(
            JSON.stringify({
              codigo_postal,
              municipio,
              estado,
              ciudad: municipio,
              colonias,
              colonia_sugerida: colonias.length === 1 ? colonias[0] : null,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    } catch (e) {
      console.log("Zippopotam failed:", e);
    }

    // If all APIs fail
    return new Response(
      JSON.stringify({ 
        error: "No se encontró información para este código postal. Por favor ingresa los datos manualmente.",
        codigo_postal,
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

// Fallback CDMX alcaldía lookup by CP range (only used if Sepomex API fails)
function getAlcaldiaCDMX(estado: string, cp: string): string {
  if (estado !== "Ciudad de México") return estado;
  
  const n = parseInt(cp, 10);
  if (n >= 1000 && n <= 1999) return "Cuauhtémoc";
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
