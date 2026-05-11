import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// Shrinkage > 2% → anomalía automática (estándar industria)
const SHRINKAGE_THRESHOLD = 2.0;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { conteo_id } = await req.json();
    if (!conteo_id) return respond(400, { error: "conteo_id requerido" });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Load conteo + detalles
    const { data: conteo } = await supabase
      .from("conteos_ciegos")
      .select("*")
      .eq("id", conteo_id)
      .single();

    if (!conteo) return respond(404, { error: "Conteo no encontrado" });
    if (conteo.estado === "finalizado") return respond(400, { error: "Conteo ya finalizado" });

    const { data: detalles } = await supabase
      .from("conteos_ciegos_detalles")
      .select("*")
      .eq("conteo_id", conteo_id);

    if (!detalles?.length) return respond(400, { error: "Sin líneas de conteo" });

    // Check all counted
    const sinContar = detalles.filter((d: any) => d.cantidad_contada === null);
    if (sinContar.length > 0) {
      return respond(400, { error: `Faltan ${sinContar.length} productos por contar` });
    }

    // Calculate differences
    let totalValorTeorico = 0;
    let totalValorDiferencia = 0;
    let conDiferencia = 0;

    for (const d of detalles) {
      const diff = (d.cantidad_contada || 0) - (d.cantidad_teorica || 0);
      const valorDiff = diff * (d.precio_unitario || 0);
      totalValorTeorico += (d.cantidad_teorica || 0) * (d.precio_unitario || 0);
      totalValorDiferencia += Math.abs(valorDiff);

      if (Math.abs(diff) > 0.01) conDiferencia++;

      // Update detail with calculated difference
      await supabase
        .from("conteos_ciegos_detalles")
        .update({
          diferencia: diff,
          valor_diferencia: valorDiff,
        })
        .eq("id", d.id);
    }

    // Shrinkage Rate = ((Cost Recorded - Cost Physical) / Cost Recorded) × 100
    const shrinkageRate = totalValorTeorico > 0
      ? (totalValorDiferencia / totalValorTeorico) * 100
      : 0;

    // Update conteo
    await supabase
      .from("conteos_ciegos")
      .update({
        estado: "finalizado",
        fin_at: new Date().toISOString(),
        productos_contados: detalles.length,
        productos_con_diferencia: conDiferencia,
        shrinkage_rate: shrinkageRate,
        valor_diferencia: totalValorDiferencia,
      })
      .eq("id", conteo_id);

    // Auto-anomalía if shrinkage > threshold
    if (shrinkageRate > SHRINKAGE_THRESHOLD) {
      await supabase.from("anomalias_la_corona").insert({
        tipo_anomalia: "shrinkage_alto",
        empleado_id: conteo.asignado_a,
        severidad: shrinkageRate > 5 ? "critica" : "alta",
        detalle: {
          conteo_id,
          folio: conteo.folio,
          shrinkage_rate: shrinkageRate,
          valor_diferencia: totalValorDiferencia,
          productos_con_diferencia: conDiferencia,
          threshold: SHRINKAGE_THRESHOLD,
        },
      });
    }

    // Create discrepancias for each product with difference
    for (const d of detalles) {
      const diff = (d.cantidad_contada || 0) - (d.cantidad_teorica || 0);
      if (Math.abs(diff) > 0.01) {
        await supabase.from("discrepancias_la_corona").insert({
          tipo_discrepancia: diff < 0 ? "faltante_inventario" : "sobrante_inventario",
          producto_id: d.producto_id,
          cantidad_esperada: d.cantidad_teorica,
          cantidad_real: d.cantidad_contada,
          diferencia: diff,
          valor_monetario: Math.abs(diff * (d.precio_unitario || 0)),
          detectado_por: "conteo_ciego",
          empleado_responsable_id: conteo.asignado_a,
          severidad: Math.abs(diff) > 10 ? "alta" : "media",
        });
      }
    }

    // Trigger score recalculation
    await supabase.functions.invoke("calcular-score-empleado", {
      body: { empleado_id: conteo.asignado_a },
    });

    return respond(200, {
      exitoso: true,
      folio: conteo.folio,
      shrinkage_rate: shrinkageRate,
      valor_diferencia: totalValorDiferencia,
      productos_con_diferencia: conDiferencia,
      anomalia_generada: shrinkageRate > SHRINKAGE_THRESHOLD,
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
