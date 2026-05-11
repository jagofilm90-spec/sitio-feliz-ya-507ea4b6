import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { empleado_id } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const d30 = new Date(Date.now() - 30 * 86400000).toISOString();

    // Get employees to process
    const empIds: string[] = [];
    if (empleado_id) {
      empIds.push(empleado_id);
    } else {
      const { data } = await supabase.from("empleados").select("id").eq("activo", true);
      (data || []).forEach((e: any) => empIds.push(e.id));
    }

    const results: any[] = [];

    for (const eid of empIds) {
      // Count successful deliveries (cuadrilla entries in last 30 days)
      const { count: entregas } = await supabase
        .from("cuadrilla_hoja_salida")
        .select("id", { count: "exact", head: true })
        .eq("empleado_id", eid)
        .gte("created_at", d30);

      // Count discrepancies
      const { data: discs } = await supabase
        .from("discrepancias_la_corona")
        .select("severidad, es_robo_sospechado")
        .eq("empleado_responsable_id", eid)
        .gte("created_at", d30);

      const discCount = discs?.length || 0;
      const robos = discs?.filter((d: any) => d.es_robo_sospechado).length || 0;

      // Calculate score
      const totalEntregas = entregas || 0;
      const exitosas = Math.max(0, totalEntregas - discCount);
      const factorExitosas = totalEntregas > 0 ? (exitosas / totalEntregas) * 100 : 100;
      const penaltyDisc = discCount * 5;
      const penaltyRobos = robos * 20;
      const score = Math.max(0, Math.min(100, factorExitosas - penaltyDisc - penaltyRobos));

      // Get previous score for tendency
      const { data: prev } = await supabase
        .from("score_confianza_empleado")
        .select("score_actual")
        .eq("empleado_id", eid)
        .maybeSingle();

      const prevScore = prev?.score_actual || 100;
      const diff = score - prevScore;
      const tendencia = diff > 5 ? "mejorando" : diff < -5 ? "empeorando" : "estable";

      // Upsert
      await supabase.from("score_confianza_empleado").upsert({
        empleado_id: eid,
        score_actual: score,
        factor_entregas_exitosas: factorExitosas,
        factor_discrepancias_30d: discCount,
        factor_robos_sospechados: robos,
        score_anterior: prevScore,
        tendencia,
        bandera_amarilla: score < 70,
        bandera_roja: score < 40,
        ultimo_calculo: new Date().toISOString(),
      }, { onConflict: "empleado_id" });

      // Auto-anomaly if score dropped sharply
      if (diff < -20) {
        await supabase.from("anomalias_la_corona").insert({
          tipo_anomalia: "score_baja_brusca",
          empleado_id: eid,
          severidad: "alta",
          detalle: { score_anterior: prevScore, score_nuevo: score, diferencia: diff },
        });
      }

      results.push({ empleado_id: eid, score, tendencia, entregas: totalEntregas, discrepancias: discCount });
    }

    return new Response(JSON.stringify({ exitoso: true, resultados: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
