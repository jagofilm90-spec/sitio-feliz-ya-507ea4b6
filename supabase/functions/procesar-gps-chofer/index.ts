import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const DESVIACION_RUTA_KM = 2;
const VELOCIDAD_EXCESIVA_KMH = 120;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { user_id, latitud, longitud, velocidad, ruta_id } = await req.json();
    if (!user_id || !latitud || !longitud) return respond(400, { error: "user_id, latitud, longitud requeridos" });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const lat = parseFloat(latitud);
    const lng = parseFloat(longitud);
    const vel = parseFloat(velocidad || "0");

    // Get employee name
    const { data: emp } = await supabase
      .from("empleados")
      .select("id, nombre_completo")
      .eq("user_id", user_id)
      .maybeSingle();

    const empNombre = emp?.nombre_completo || "Chofer";
    const alertas: any[] = [];
    const desviaciones: any[] = [];

    // 1. VELOCIDAD EXCESIVA
    if (vel > VELOCIDAD_EXCESIVA_KMH) {
      const sev = vel > 140 ? "critica" : "alta";
      const { data: desv } = await supabase.from("desviaciones_ruta").insert({
        ruta_id, user_id, tipo_desviacion: "velocidad_excesiva",
        lat, lng, velocidad_kmh: vel, iniciada_at: new Date().toISOString(), severidad: sev,
      }).select().single();
      desviaciones.push(desv);

      const { data: alerta } = await supabase.from("alertas_la_corona").insert({
        tipo_alerta: "velocidad_excesiva", severidad: sev,
        titulo: `Velocidad excesiva: ${vel.toFixed(0)} km/h`,
        mensaje: `${empNombre} circula a ${vel.toFixed(0)} km/h`,
        user_id, desviacion_id: desv?.id, lat, lng,
        destinatarios_roles: ["admin", "secretaria"],
        requiere_sonido: vel > 140,
      }).select().single();
      alertas.push(alerta);
    }

    // 2. GEO-FENCES
    const { data: geofences } = await supabase
      .from("geo_fences")
      .select("*")
      .eq("activo", true);

    for (const gf of geofences || []) {
      const dist = haversineMetros(lat, lng, parseFloat(gf.centro_lat), parseFloat(gf.centro_lng));
      const dentro = dist <= gf.radio_metros;

      const { data: ultimo } = await supabase
        .from("eventos_geofence")
        .select("tipo_evento")
        .eq("geofence_id", gf.id)
        .eq("user_id", user_id)
        .order("detectado_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const prevEstado = ultimo?.tipo_evento;

      if (dentro && prevEstado !== "entrada") {
        await supabase.from("eventos_geofence").insert({
          geofence_id: gf.id, user_id, tipo_evento: "entrada", lat, lng, velocidad_kmh: vel,
        });
        if (gf.trigger_entrada_alerta) {
          const { data: alerta } = await supabase.from("alertas_la_corona").insert({
            tipo_alerta: "entrada_geofence", severidad: gf.severidad_alerta || "info",
            titulo: `${empNombre} llegó a ${gf.nombre || "zona"}`,
            mensaje: `Entrada geo-fence ${gf.tipo}: ${gf.nombre || gf.descripcion || ""}`,
            user_id, lat, lng, destinatarios_roles: ["admin"],
          }).select().single();
          alertas.push(alerta);
        }
      }

      if (!dentro && prevEstado === "entrada") {
        await supabase.from("eventos_geofence").insert({
          geofence_id: gf.id, user_id, tipo_evento: "salida", lat, lng, velocidad_kmh: vel,
        });
        if (gf.trigger_salida_alerta) {
          const { data: alerta } = await supabase.from("alertas_la_corona").insert({
            tipo_alerta: "salida_geofence", severidad: "media",
            titulo: `${empNombre} salió de ${gf.nombre || "zona"}`,
            mensaje: `Salida geo-fence ${gf.tipo}`,
            user_id, lat, lng, destinatarios_roles: ["admin"],
          }).select().single();
          alertas.push(alerta);
        }
      }
    }

    // 3. DESVIACIÓN DE RUTA (if on active route)
    if (ruta_id) {
      const { data: entregas } = await supabase
        .from("entregas")
        .select("id")
        .eq("ruta_id", ruta_id);

      // Check distance to nearest geofence of type 'cliente' or 'almacen'
      let minDist = Infinity;
      for (const gf of geofences || []) {
        if (gf.tipo === "cliente" || gf.tipo === "almacen") {
          const d = haversineMetros(lat, lng, parseFloat(gf.centro_lat), parseFloat(gf.centro_lng)) / 1000;
          if (d < minDist) minDist = d;
        }
      }

      if (minDist > DESVIACION_RUTA_KM && minDist !== Infinity) {
        const sev = minDist > 5 ? "critica" : "alta";
        const { data: desv } = await supabase.from("desviaciones_ruta").insert({
          ruta_id, user_id, tipo_desviacion: "fuera_de_ruta",
          lat, lng, distancia_del_waypoint_km: minDist,
          iniciada_at: new Date().toISOString(), severidad: sev,
        }).select().single();
        desviaciones.push(desv);

        const { data: alerta } = await supabase.from("alertas_la_corona").insert({
          tipo_alerta: "desviacion_ruta", severidad: sev,
          titulo: `Desviación de ruta: ${minDist.toFixed(1)}km`,
          mensaje: `${empNombre} a ${minDist.toFixed(1)}km del punto más cercano de su ruta`,
          user_id, desviacion_id: desv?.id, lat, lng,
          destinatarios_roles: ["admin", "secretaria"], requiere_sonido: true,
        }).select().single();
        alertas.push(alerta);
      }
    }

    return respond(200, {
      exitoso: true,
      alertas_creadas: alertas.length,
      desviaciones_creadas: desviaciones.length,
    });
  } catch (error) {
    return respond(500, { error: error.message });
  }
});

function haversineMetros(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const p = Math.PI / 180;
  const a = Math.sin((lat2 - lat1) * p / 2) ** 2 +
    Math.cos(lat1 * p) * Math.cos(lat2 * p) * Math.sin((lon2 - lon1) * p / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function respond(status: number, body: any) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
