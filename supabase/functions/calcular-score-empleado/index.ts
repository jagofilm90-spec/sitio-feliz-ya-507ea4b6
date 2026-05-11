import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { empleado_id, periodo } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Default periodo: current month YYYY-MM
    const periodoActual = periodo || new Date().toISOString().slice(0, 7);

    // If specific employee, calc for that one; otherwise all active
    const empleados: string[] = [];

    if (empleado_id) {
      empleados.push(empleado_id);
    } else {
      const { data: todos } = await supabase
        .from("empleados")
        .select("id")
        .eq("activo", true);
      (todos || []).forEach((e: any) => empleados.push(e.id));
    }

    const results: any[] = [];

    for (const empId of empleados) {
      // Count entregas assigned to this employee (as chofer via rutas)
      const { count: totalEntregas } = await supabase
        .from("eventos_conciliacion")
        .select("id", { count: "exact", head: true })
        .eq("empleado_id", empId)
        .gte("created_at", `${periodoActual}-01`)
        .lt("created_at", nextMonth(periodoActual));

      // Count discrepancies linked via entregas where employee was involved
      const { data: discrepancias } = await supabase
        .from("anomalias_la_corona")
        .select("severidad")
        .eq("empleado_id", empId)
        .gte("created_at", `${periodoActual}-01`)
        .lt("created_at", nextMonth(periodoActual));

      const leves = (discrepancias || []).filter((d: any) => d.severidad === "baja").length;
      const medias = (discrepancias || []).filter((d: any) => d.severidad === "media").length;
      const graves = (discrepancias || []).filter((d: any) =>
        d.severidad === "alta" || d.severidad === "critica"
      ).length;

      const total = totalEntregas || 0;
      const sinDisc = Math.max(0, total - leves - medias - graves);

      // Score: 100 base, -2 per leve, -5 per media, -15 per grave
      const score = Math.max(0, Math.min(100, 100 - leves * 2 - medias * 5 - graves * 15));

      // Determine tendency
      const { data: prevScore } = await supabase
        .from("score_confianza")
        .select("score")
        .eq("empleado_id", empId)
        .lt("periodo", periodoActual)
        .order("periodo", { ascending: false })
        .limit(1)
        .maybeSingle();

      let tendencia = "estable";
      if (prevScore) {
        const diff = score - (prevScore.score || 100);
        if (diff > 5) tendencia = "mejorando";
        else if (diff < -5) tendencia = "empeorando";
      }

      // Upsert score
      const { error } = await supabase
        .from("score_confianza")
        .upsert(
          {
            empleado_id: empId,
            periodo: periodoActual,
            entregas_totales: total,
            entregas_sin_discrepancia: sinDisc,
            discrepancias_leves: leves,
            discrepancias_medias: medias,
            discrepancias_graves: graves,
            score,
            tendencia,
            calculado_at: new Date().toISOString(),
          },
          { onConflict: "empleado_id,periodo" }
        );

      if (!error) {
        results.push({ empleado_id: empId, score, tendencia, entregas: total, discrepancias: leves + medias + graves });
      }
    }

    return new Response(
      JSON.stringify({ exitoso: true, periodo: periodoActual, resultados: results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function nextMonth(periodo: string): string {
  const [y, m] = periodo.split("-").map(Number);
  const d = new Date(y, m, 1); // month is 0-indexed, so m (1-indexed) = next month
  return d.toISOString().slice(0, 7) + "-01";
}
