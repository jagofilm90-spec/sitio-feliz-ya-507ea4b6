import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { cobro_id } = await req.json();
    if (!cobro_id) return respond(400, { error: "cobro_id requerido" });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: cobro } = await supabase.from("cobros").select("*").eq("id", cobro_id).single();
    if (!cobro) return respond(404, { error: "Cobro no encontrado" });

    // Get applied invoices that are PPD
    const { data: aplicaciones } = await supabase
      .from("cobros_facturas")
      .select("*, facturas:factura_id(folio, cfdi_uuid, metodo_pago)")
      .eq("cobro_id", cobro_id);

    const doctosPPD = (aplicaciones || []).filter((a: any) => a.facturas?.metodo_pago === "PPD");
    if (doctosPPD.length === 0) return respond(200, { exitoso: true, mensaje: "Sin facturas PPD, no requiere REP" });

    // Create complemento_pago
    const { data: rep, error } = await supabase.from("complementos_pago").insert({
      folio: "",
      cliente_id: cobro.cliente_id,
      fecha_pago: cobro.fecha_deposito || new Date().toISOString().split("T")[0],
      forma_pago: cobro.forma_pago_sat,
      monto: doctosPPD.reduce((s: number, d: any) => s + d.monto_aplicado, 0),
      num_operacion: cobro.numero_operacion,
      nom_banco_emisor: cobro.banco_emisor,
      cfdi_estado: "pendiente",
      created_by: cobro.capturado_por,
    }).select().single();

    if (error) throw error;

    // Create doctos relacionados
    for (const d of doctosPPD) {
      await supabase.from("complementos_pago_doctos").insert({
        complemento_id: rep.id,
        factura_id: d.factura_id,
        uuid_factura: d.facturas?.cfdi_uuid,
        folio: d.facturas?.folio,
        num_parcialidad: d.num_parcialidad,
        imp_saldo_ant: d.saldo_antes,
        imp_pagado: d.monto_aplicado,
        imp_saldo_insoluto: d.saldo_despues,
      });
    }

    // Link REP to cobro
    await supabase.from("cobros").update({ complemento_pago_id: rep.id, rep_generado_at: new Date().toISOString() }).eq("id", cobro_id);

    return respond(200, { exitoso: true, complemento_pago_id: rep.id, folio: rep.folio });
  } catch (error) {
    return respond(500, { error: error.message });
  }
});

function respond(s: number, b: any) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
