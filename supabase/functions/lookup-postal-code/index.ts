import { corsHeaders } from "../_shared/cors.ts";

interface SepomexResponse {
  error: boolean;
  code_error: number;
  error_message: string | null;
  response: {
    cp: string;
    asentamiento: string;
    tipo_asentamiento: string;
    municipio: string;
    estado: string;
    ciudad: string;
    pais: string;
  }[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
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

    // Query SEPOMEX API
    const sepomexUrl = `https://api-sepomex.hckdrk.mx/query/info_cp/${codigo_postal}`;
    
    const response = await fetch(sepomexUrl, {
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      // Try alternative API if first fails
      const altUrl = `https://api.copomex.com/query/info_cp/${codigo_postal}?token=pruebas`;
      const altResponse = await fetch(altUrl);
      
      if (!altResponse.ok) {
        return new Response(
          JSON.stringify({ 
            error: "No se encontró información para este código postal",
            codigo_postal 
          }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const altData = await altResponse.json();
      return new Response(
        JSON.stringify(processData(altData)),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data: SepomexResponse = await response.json();

    if (data.error || !data.response || data.response.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: "No se encontró información para este código postal",
          codigo_postal 
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = processData(data);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in lookup-postal-code:", error);
    return new Response(
      JSON.stringify({ error: "Error al consultar código postal" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function processData(data: SepomexResponse) {
  const locations = data.response;
  
  // Get unique colonias
  const colonias = [...new Set(locations.map(l => l.asentamiento))].sort();
  
  // All locations share the same municipio and estado
  const firstLocation = locations[0];
  
  return {
    codigo_postal: firstLocation.cp,
    municipio: firstLocation.municipio,
    estado: firstLocation.estado,
    ciudad: firstLocation.ciudad || firstLocation.municipio,
    colonias: colonias,
    // For convenience, include primera colonia
    colonia_sugerida: colonias.length === 1 ? colonias[0] : null,
  };
}
