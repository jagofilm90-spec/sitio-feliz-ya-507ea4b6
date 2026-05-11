import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { hoja_salida_id, momento_id, evidencia } = await req.json() as {
      hoja_salida_id: string;
      momento_id: string;
      evidencia?: {
        firma_url?: string;
        foto_url?: string;
        gps_lat?: number;
        gps_lng?: number;
        gps_accuracy?: number;
        notas?: string;
      };
    };

    if (!hoja_salida_id || !momento_id) {
      return respond(400, { error: "hoja_salida_id y momento_id requeridos" });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate momento
    const { data: momento } = await supabase
      .from("momentos_clave")
      .select("*")
      .eq("id", momento_id)
      .single();
    if (!momento) return respond(404, { error: `Momento '${momento_id}' no encontrado` });

    // Load hoja
    const { data: hoja } = await supabase
      .from("hojas_salida")
      .select("id, entrega_id, estado")
      .eq("id", hoja_salida_id)
      .single();
    if (!hoja) return respond(404, { error: "Hoja de Salida no encontrada" });

    // Check sequence - bloqueante moments must be completed first
    const warnings: string[] = [];
    if (momento.orden_secuencia > 1) {
      const { data: prevBloqueantes } = await supabase
        .from("momentos_clave")
        .select("id")
        .lt("orden_secuencia", momento.orden_secuencia)
        .eq("bloqueante", true);

      const prevIds = (prevBloqueantes || []).map((m: any) => m.id);
      if (prevIds.length > 0) {
        const { data: completed } = await supabase
          .from("eventos_conciliacion")
          .select("momento_id")
          .eq("hoja_salida_id", hoja_salida_id)
          .eq("estado", "completado")
          .in("momento_id", prevIds);

        const doneSet = new Set((completed || []).map((e: any) => e.momento_id));
        const missing = prevIds.filter((id: string) => !doneSet.has(id));
        if (missing.length > 0) {
          warnings.push(`Momentos bloqueantes previos pendientes: ${missing.join(", ")}`);
        }
      }
    }

    // Calculate duration from previous moment
    let duracion: number | null = null;
    const { data: prevEvento } = await supabase
      .from("eventos_conciliacion")
      .select("completado_at")
      .eq("hoja_salida_id", hoja_salida_id)
      .lt("completado_at", new Date().toISOString())
      .order("completado_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (prevEvento?.completado_at) {
      duracion = Math.round((Date.now() - new Date(prevEvento.completado_at).getTime()) / 1000);
    }

    // Detect anomalies
    let tieneAnomalia = false;
    let anomaliaTipo: string | null = null;
    let anomaliaDetalle: string | null = null;

    // Geo-fence check for bodega moments
    const ev = evidencia || {};
    if ((momento_id === "chofer_sale" || momento_id === "chofer_regresa") && ev.gps_lat && ev.gps_lng) {
      const BODEGA_LAT = 29.0729;
      const BODEGA_LNG = -110.9559;
      const RADIO_KM = 0.5;
      const dist = haversine(ev.gps_lat, ev.gps_lng, BODEGA_LAT, BODEGA_LNG);
      if (dist > RADIO_KM) {
        tieneAnomalia = true;
        anomaliaTipo = "fuera_geofence_bodega";
        anomaliaDetalle = `${momento_id} a ${dist.toFixed(2)}km de bodega (radio: ${RADIO_KM}km)`;
      }
    }

    // Get auth user
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    let userName: string | null = null;
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      userId = user?.id || null;
      userName = user?.email || null;
    }

    // Insert event
    const { data: evento, error } = await supabase
      .from("eventos_conciliacion")
      .insert({
        hoja_salida_id,
        entrega_id: hoja.entrega_id,
        momento_id,
        estado: "completado",
        usuario_id: userId,
        usuario_nombre: userName,
        firma_url: ev.firma_url || null,
        foto_url: ev.foto_url || null,
        gps_lat: ev.gps_lat || null,
        gps_lng: ev.gps_lng || null,
        gps_accuracy: ev.gps_accuracy || null,
        dentro_geo_fence: tieneAnomalia ? false : (ev.gps_lat ? true : null),
        completado_at: new Date().toISOString(),
        duracion_segundos: duracion,
        tiene_anomalia: tieneAnomalia,
        anomalia_tipo: anomaliaTipo,
        anomalia_detalle: anomaliaDetalle,
        notas: ev.notas || null,
        metadata: { warnings },
      })
      .select()
      .single();

    if (error) throw error;

    // If anomaly → insert into anomalias_la_corona
    if (tieneAnomalia) {
      await supabase.from("anomalias_la_corona").insert({
        tipo_anomalia: anomaliaTipo!,
        hoja_salida_id,
        entrega_id: hoja.entrega_id,
        severidad: "media",
        detalle: { momento_id, gps_lat: ev.gps_lat, gps_lng: ev.gps_lng, detalle: anomaliaDetalle },
      });
    }

    // Update hoja_salida estado based on momento
    const estadoMap: Record<string, string> = {
      sistema_genera_hoja: "generada",
      chofer_recibe: "surtida",
      chofer_sale: "en_transito",
      cliente_sella_firma: "entregada",
      reconciliacion_final: "reconciliada",
    };
    const tsMap: Record<string, string> = {
      chofer_recibe: "entregada_chofer_at",
      chofer_sale: "salida_bodega_at",
      cliente_sella_firma: "entregada_cliente_at",
      chofer_regresa: "regresada_bodega_at",
      reconciliacion_final: "reconciliada_at",
    };

    const updates: any = {};
    if (estadoMap[momento_id]) updates.estado = estadoMap[momento_id];
    if (tsMap[momento_id]) updates[tsMap[momento_id]] = new Date().toISOString();
    if (momento_id === "cliente_sella_firma" && ev.foto_url) updates.foto_sellada_url = ev.foto_url;
    if (Object.keys(updates).length > 0) {
      await supabase.from("hojas_salida").update(updates).eq("id", hoja_salida_id);
    }

    return respond(200, { exitoso: true, evento_id: evento.id, warnings, tiene_anomalia: tieneAnomalia });
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
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
