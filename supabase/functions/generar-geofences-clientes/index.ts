import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Also accept manual geo-fence creation
    const body = await req.json().catch(() => ({}));
    if (body.centro_lat && body.centro_lng) {
      // Manual creation
      const { data, error } = await supabase.from("geo_fences").insert({
        tipo: body.tipo || "manual",
        cliente_id: body.cliente_id || null,
        centro_lat: body.centro_lat,
        centro_lng: body.centro_lng,
        radio_metros: body.radio_metros || 100,
        nombre: body.nombre || "Geo-fence manual",
        descripcion: body.descripcion,
        activo: true,
        trigger_entrada_alerta: body.trigger_entrada ?? true,
        severidad_alerta: body.severidad || "info",
      }).select().single();
      if (error) throw error;
      return respond(200, { exitoso: true, geofence_id: data.id, modo: "manual" });
    }

    // Auto-generate: create almacen geo-fence if not exists
    const { data: existeAlmacen } = await supabase
      .from("geo_fences")
      .select("id")
      .eq("tipo", "almacen")
      .maybeSingle();

    let creados = 0;
    if (!existeAlmacen) {
      // ALMASA Hermosillo coordinates (approximate)
      await supabase.from("geo_fences").insert({
        tipo: "almacen",
        centro_lat: 29.0729,
        centro_lng: -110.9559,
        radio_metros: 200,
        nombre: "Bodega ALMASA Hermosillo",
        descripcion: "Geo-fence principal almacén",
        activo: true,
        trigger_entrada_alerta: true,
        trigger_salida_alerta: true,
        severidad_alerta: "info",
      });
      creados++;
    }

    // Note: clientes don't have lat/lng yet — when they do, this function
    // will auto-generate geo-fences for each client with coordinates.
    // For now, admin can create manual geo-fences via the UI.

    return respond(200, {
      exitoso: true,
      geofences_creados: creados,
      nota: "Geo-fences por cliente se generarán cuando clientes tengan coordenadas (lat/lng).",
    });
  } catch (error) {
    return respond(500, { error: error.message });
  }
});

function respond(status: number, body: any) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
