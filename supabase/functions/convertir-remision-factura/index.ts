import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { remision_id } = await req.json();
    if (!remision_id) return respond(400, { error: "remision_id requerido" });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: rem } = await supabase.from("remisiones").select("*").eq("id", remision_id).single();
    if (!rem) return respond(404, { error: "Remisión no encontrada" });
    if (rem.convertida_a_factura) return respond(400, { error: "Ya convertida a factura" });

    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      userId = user?.id || null;
    }

    // Create factura from remision data
    const { data: factura, error } = await supabase.from("facturas").insert({
      pedido_id: rem.pedido_id,
      cliente_id: rem.cliente_id,
      remision_id: rem.id,
      subtotal: rem.subtotal,
      impuestos: rem.impuestos,
      total: rem.total,
      cfdi_estado: "pendiente",
      uso_cfdi: "G03",
      forma_pago: "99",
      metodo_pago: "PUE",
      notas: `Convertida desde remisión ${rem.folio}`,
    }).select().single();

    if (error) throw error;

    // Mark remision as converted
    await supabase.from("remisiones").update({
      convertida_a_factura: true,
      convertida_at: new Date().toISOString(),
      factura_id: factura.id,
      estado: "facturada",
    }).eq("id", remision_id);

    return respond(200, {
      exitoso: true,
      factura_id: factura.id,
      factura_folio: factura.folio,
      mensaje: `Remisión ${rem.folio} convertida a factura ${factura.folio}`,
    });
  } catch (error) {
    return respond(500, { error: error.message });
  }
});

function respond(s: number, b: any) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
