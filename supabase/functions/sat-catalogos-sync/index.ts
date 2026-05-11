import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Report current catalog state
    // FUTURO: descargar desde http://www.sat.gob.mx/sitio_internet/cfd/catalogos/CartaPorte/
    const { data: rows } = await supabase
      .from("sat_catalogos")
      .select("catalogo");

    const counts: Record<string, number> = {};
    (rows || []).forEach((r: any) => {
      counts[r.catalogo] = (counts[r.catalogo] || 0) + 1;
    });

    const result = {
      exitoso: true,
      ultimo_sync: new Date().toISOString(),
      catalogos: counts,
      total_claves: rows?.length || 0,
      mensaje: "Catálogos verificados. Sync remoto SAT pendiente para futuro.",
    };

    console.log("SAT Catálogos Sync:", JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ exitoso: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
