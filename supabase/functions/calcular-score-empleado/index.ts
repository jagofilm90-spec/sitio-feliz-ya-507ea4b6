import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// ═══════════════════════════════════════════════════
// ALGORITMO SCORE CONFIANZA LA CORONA
// Parametrizable — constantes arriba
// ═══════════════════════════════════════════════════

const W_ENTREGA_EXITOSA = 0.5;
const W_CONTEO_EXACTO = 1.0;
const W_ANTIGUEDAD_6M = 2.0;
const P_DISCREPANCIA = -3;
const P_ROBO_SOSPECHADO = -15;
const P_HOJA_SIN_FIRMA = -1;
const P_HOJA_SIN_SELLO = -2;
const P_CONTEO_INCORRECTO = -2;

const BANDERA_AMARILLA = 80;
const BANDERA_ROJA = 60;
const SCORE_BASE_NUEVO = 80;
const SCORE_BASE_PROBADO = 100;
const MESES_PROBADO = 6;

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

    // Get employees
    const empIds: string[] = [];
    if (empleado_id) {
      empIds.push(empleado_id);
    } else {
      const { data } = await supabase.from("empleados").select("id").eq("activo", true);
      (data || []).forEach((e: any) => empIds.push(e.id));
    }

    const results: any[] = [];

    for (const eid of empIds) {
      // Employee info (for antigüedad)
      const { data: emp } = await supabase
        .from("empleados")
        .select("id, fecha_ingreso")
        .eq("id", eid)
        .single();

      // Antigüedad en meses
      const ingreso = emp?.fecha_ingreso ? new Date(emp.fecha_ingreso) : new Date();
      const mesesAntiguedad = Math.floor((Date.now() - ingreso.getTime()) / (30 * 86400000));
      const esNuevo = mesesAntiguedad < MESES_PROBADO;
      const scoreBase = esNuevo ? SCORE_BASE_NUEVO : SCORE_BASE_PROBADO;

      // ── Factores positivos ──
      // Entregas exitosas (cuadrilla 30d)
      const { count: entregas } = await supabase
        .from("cuadrilla_hoja_salida")
        .select("id", { count: "exact", head: true })
        .eq("empleado_id", eid)
        .gte("created_at", d30);

      // Hojas reconciliadas como "completo"
      const { count: entregasExitosas } = await supabase
        .from("hojas_salida")
        .select("id", { count: "exact", head: true })
        .eq("reconciliacion_estado", "completo")
        .in("id", (await supabase
          .from("cuadrilla_hoja_salida")
          .select("hoja_salida_id")
          .eq("empleado_id", eid)
          .gte("created_at", d30)
        ).data?.map((c: any) => c.hoja_salida_id) || ["00000000-0000-0000-0000-000000000000"]);

      // Conteos exactos
      const { count: conteosExactos } = await supabase
        .from("conteos_ciegos")
        .select("id", { count: "exact", head: true })
        .eq("asignado_a", eid)
        .eq("estado", "finalizado")
        .eq("productos_con_diferencia", 0)
        .gte("created_at", d30);

      // Antigüedad bonus
      const periodos6m = Math.floor(mesesAntiguedad / 6);

      // ── Factores negativos ──
      const { data: discs } = await supabase
        .from("discrepancias_la_corona")
        .select("severidad, es_robo_sospechado")
        .eq("empleado_responsable_id", eid)
        .gte("created_at", d30);

      const discCount = discs?.length || 0;
      const robos = discs?.filter((d: any) => d.es_robo_sospechado).length || 0;

      // Hojas sin firma/sello (where this employee was in cuadrilla)
      const { count: sinFirma } = await supabase
        .from("hojas_salida")
        .select("id", { count: "exact", head: true })
        .eq("ia_firma_detectada", false)
        .not("ia_procesada_at", "is", null)
        .in("id", (await supabase
          .from("cuadrilla_hoja_salida")
          .select("hoja_salida_id")
          .eq("empleado_id", eid)
          .gte("created_at", d30)
        ).data?.map((c: any) => c.hoja_salida_id) || ["00000000-0000-0000-0000-000000000000"]);

      const { count: sinSello } = await supabase
        .from("hojas_salida")
        .select("id", { count: "exact", head: true })
        .eq("ia_sello_detectado", false)
        .not("ia_procesada_at", "is", null)
        .in("id", (await supabase
          .from("cuadrilla_hoja_salida")
          .select("hoja_salida_id")
          .eq("empleado_id", eid)
          .gte("created_at", d30)
        ).data?.map((c: any) => c.hoja_salida_id) || ["00000000-0000-0000-0000-000000000000"]);

      // Conteos incorrectos
      const { count: conteosIncorrectos } = await supabase
        .from("conteos_ciegos")
        .select("id", { count: "exact", head: true })
        .eq("asignado_a", eid)
        .eq("estado", "finalizado")
        .gt("productos_con_diferencia", 0)
        .gte("created_at", d30);

      // ── CÁLCULO FINAL ──
      const positivos =
        (entregasExitosas || 0) * W_ENTREGA_EXITOSA +
        (conteosExactos || 0) * W_CONTEO_EXACTO +
        periodos6m * W_ANTIGUEDAD_6M;

      const negativos =
        discCount * P_DISCREPANCIA +
        robos * P_ROBO_SOSPECHADO +
        (sinFirma || 0) * P_HOJA_SIN_FIRMA +
        (sinSello || 0) * P_HOJA_SIN_SELLO +
        (conteosIncorrectos || 0) * P_CONTEO_INCORRECTO;

      const score = Math.max(0, Math.min(100, scoreBase + positivos + negativos));
      const banderaAmarilla = score < BANDERA_AMARILLA;
      const banderaRoja = score < BANDERA_ROJA;

      // Get previous
      const { data: prev } = await supabase
        .from("score_confianza_empleado")
        .select("score_actual")
        .eq("empleado_id", eid)
        .maybeSingle();

      const prevScore = prev?.score_actual ?? scoreBase;
      const cambio = score - prevScore;
      const tendencia = cambio > 3 ? "mejorando" : cambio < -3 ? "empeorando" : "estable";

      const factores = {
        score_base: scoreBase,
        es_nuevo: esNuevo,
        meses_antiguedad: mesesAntiguedad,
        positivos: {
          entregas_exitosas: entregasExitosas || 0,
          conteos_exactos: conteosExactos || 0,
          periodos_antiguedad: periodos6m,
          total: positivos,
        },
        negativos: {
          discrepancias: discCount,
          robos_sospechados: robos,
          sin_firma: sinFirma || 0,
          sin_sello: sinSello || 0,
          conteos_incorrectos: conteosIncorrectos || 0,
          total: negativos,
        },
      };

      // Upsert score
      await supabase.from("score_confianza_empleado").upsert({
        empleado_id: eid,
        score_actual: score,
        factor_entregas_exitosas: (entregasExitosas || 0) * W_ENTREGA_EXITOSA,
        factor_discrepancias_30d: discCount,
        factor_robos_sospechados: robos,
        score_anterior: prevScore,
        tendencia,
        bandera_amarilla: banderaAmarilla,
        bandera_roja: banderaRoja,
        ultimo_calculo: new Date().toISOString(),
      }, { onConflict: "empleado_id" });

      // Historial
      await supabase.from("score_confianza_historial").insert({
        empleado_id: eid,
        score_anterior: prevScore,
        score_nuevo: score,
        cambio,
        factores_aplicados: factores,
      });

      // Auto-anomalía si bandera roja nueva
      if (banderaRoja && prevScore >= BANDERA_ROJA) {
        await supabase.from("anomalias_la_corona").insert({
          tipo_anomalia: "bandera_roja_activada",
          empleado_id: eid,
          severidad: "critica",
          detalle: { score, score_anterior: prevScore, factores },
        });
      }

      results.push({ empleado_id: eid, score, tendencia, bandera_amarilla: banderaAmarilla, bandera_roja: banderaRoja, factores });
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
