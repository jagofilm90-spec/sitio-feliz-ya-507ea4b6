import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { cobro_id, facturas_aplicar } = await req.json();
    if (!cobro_id || !facturas_aplicar?.length) return respond(400, { error: "cobro_id y facturas_aplicar requeridos" });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: cobro } = await supabase.from("cobros").select("*").eq("id", cobro_id).single();
    if (!cobro) return respond(404, { error: "Cobro no encontrado" });

    // Validate sum
    const sumaAplicar = facturas_aplicar.reduce((s: number, f: any) => s + (f.monto || 0), 0);
    if (Math.abs(sumaAplicar - cobro.monto_total) > 0.01) {
      return respond(400, { error: `Suma aplicaciones ($${sumaAplicar}) != monto cobro ($${cobro.monto_total})` });
    }

    let requiereRep = false;

    for (const fa of facturas_aplicar) {
      const { data: factura } = await supabase.from("facturas").select("*").eq("id", fa.factura_id).single();
      if (!factura) continue;

      const saldoAntes = factura.saldo_pendiente ?? factura.total;
      if (fa.monto > saldoAntes + 0.01) {
        return respond(400, { error: `Monto $${fa.monto} excede saldo $${saldoAntes} de factura ${factura.folio}` });
      }

      const saldoDespues = Math.max(0, saldoAntes - fa.monto);

      // Count existing parcialidades
      const { count: parcialidades } = await supabase
        .from("cobros_facturas")
        .select("id", { count: "exact", head: true })
        .eq("factura_id", fa.factura_id);

      await supabase.from("cobros_facturas").insert({
        cobro_id,
        factura_id: fa.factura_id,
        monto_aplicado: fa.monto,
        saldo_antes: saldoAntes,
        saldo_despues: saldoDespues,
        num_parcialidad: (parcialidades || 0) + 1,
      });

      const updates: any = { saldo_pendiente: saldoDespues };
      if (saldoDespues <= 0.01) {
        updates.pagada = true;
        updates.pagada_at = new Date().toISOString();
      }
      await supabase.from("facturas").update(updates).eq("id", fa.factura_id);

      // Check if PPD → requires REP
      if (factura.metodo_pago === "PPD") requiereRep = true;
    }

    await supabase.from("cobros").update({ requiere_rep: requiereRep }).eq("id", cobro_id);

    return respond(200, { exitoso: true, requiere_rep: requiereRep, facturas_aplicadas: facturas_aplicar.length });
  } catch (error) {
    return respond(500, { error: error.message });
  }
});

function respond(s: number, b: any) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
