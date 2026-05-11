import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { entrega_id, momento_id, empleado_id, latitud, longitud, firma_base64, foto_url, notas } = await req.json();

    if (!entrega_id || !momento_id) {
      return respond(400, { error: "entrega_id y momento_id requeridos" });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate momento exists
    const { data: momento } = await supabase
      .from("momentos_clave")
      .select("*")
      .eq("id", momento_id)
      .single();

    if (!momento) return respond(404, { error: `Momento '${momento_id}' no encontrado` });

    // Check required fields
    const warnings: string[] = [];
    if (momento.requiere_firma && !firma_base64) warnings.push("Firma requerida pero no proporcionada");
    if (momento.requiere_gps && (!latitud || !longitud)) warnings.push("GPS requerido pero no proporcionado");
    if (momento.requiere_foto && !foto_url) warnings.push("Foto requerida pero no proporcionada");

    // Check sequence (previous bloqueante moments should exist)
    if (momento.orden_secuencia > 1) {
      const { data: prevMomentos } = await supabase
        .from("momentos_clave")
        .select("id")
        .lt("orden_secuencia", momento.orden_secuencia)
        .eq("bloqueante", true);

      const prevIds = (prevMomentos || []).map((m: any) => m.id);

      if (prevIds.length > 0) {
        const { data: prevEventos } = await supabase
          .from("eventos_conciliacion")
          .select("momento_id")
          .eq("entrega_id", entrega_id)
          .in("momento_id", prevIds);

        const completedIds = new Set((prevEventos || []).map((e: any) => e.momento_id));
        const missing = prevIds.filter((id: string) => !completedIds.has(id));

        if (missing.length > 0) {
          warnings.push(`Momentos bloqueantes previos pendientes: ${missing.join(", ")}`);
        }
      }
    }

    // Insert event
    const { data: evento, error } = await supabase
      .from("eventos_conciliacion")
      .insert({
        entrega_id,
        momento_id,
        empleado_id: empleado_id || null,
        latitud: latitud || null,
        longitud: longitud || null,
        firma_base64: firma_base64 || null,
        foto_url: foto_url || null,
        notas: notas || null,
        metadata: { warnings },
      })
      .select()
      .single();

    if (error) throw error;

    // Geo-fence anomalies for bodega moments
    if ((momento_id === "chofer_sale_bodega" || momento_id === "chofer_regresa_bodega") && latitud && longitud) {
      // ALMASA bodega coords (Hermosillo approximate)
      const BODEGA_LAT = 29.0729;
      const BODEGA_LNG = -110.9559;
      const RADIO_KM = 0.5;

      const dist = haversine(latitud, longitud, BODEGA_LAT, BODEGA_LNG);
      if (dist > RADIO_KM) {
        await supabase.from("anomalias_la_corona").insert({
          tipo: "fuera_geofence_bodega",
          severidad: "media",
          descripcion: `${momento_id} registrado a ${dist.toFixed(2)}km de bodega (radio: ${RADIO_KM}km)`,
          entrega_id,
          empleado_id,
          datos_anomalia: { latitud, longitud, distancia_km: dist, radio_km: RADIO_KM },
        });
      }
    }

    return respond(200, {
      exitoso: true,
      evento_id: evento.id,
      momento: momento.nombre,
      warnings,
    });
  } catch (error) {
    return respond(500, { error: error.message });
  }
});

function respond(status: number, body: any) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
