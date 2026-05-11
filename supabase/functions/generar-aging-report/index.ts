import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: facturas } = await supabase
      .from("facturas")
      .select("id, folio, cliente_id, total, saldo_pendiente, fecha_vencimiento, fecha_emision, clientes:cliente_id(id, nombre, razon_social, rfc, limite_credito)")
      .gt("saldo_pendiente", 0)
      .eq("cfdi_estado", "timbrada");

    const hoy = new Date();
    const clienteMap = new Map<string, any>();

    for (const f of facturas || []) {
      const clienteId = f.cliente_id;
      if (!clienteMap.has(clienteId)) {
        clienteMap.set(clienteId, {
          cliente_id: clienteId,
          razon_social: (f.clientes as any)?.razon_social || (f.clientes as any)?.nombre || "",
          rfc: (f.clientes as any)?.rfc || "",
          limite_credito: (f.clientes as any)?.limite_credito || 0,
          corriente: 0,
          d1_30: 0,
          d31_60: 0,
          d61_90: 0,
          d90_plus: 0,
          total: 0,
          facturas_count: 0,
          dias_max: 0,
        });
      }

      const cliente = clienteMap.get(clienteId)!;
      const saldo = f.saldo_pendiente || 0;
      const venc = f.fecha_vencimiento ? new Date(f.fecha_vencimiento) : new Date(f.fecha_emision);
      const diasVencido = Math.floor((hoy.getTime() - venc.getTime()) / 86400000);

      if (diasVencido <= 0) cliente.corriente += saldo;
      else if (diasVencido <= 30) cliente.d1_30 += saldo;
      else if (diasVencido <= 60) cliente.d31_60 += saldo;
      else if (diasVencido <= 90) cliente.d61_90 += saldo;
      else cliente.d90_plus += saldo;

      cliente.total += saldo;
      cliente.facturas_count++;
      if (diasVencido > cliente.dias_max) cliente.dias_max = diasVencido;
    }

    const clientes = Array.from(clienteMap.values()).sort((a, b) => b.dias_max - a.dias_max);

    // Totals
    const totales = {
      corriente: clientes.reduce((s, c) => s + c.corriente, 0),
      d1_30: clientes.reduce((s, c) => s + c.d1_30, 0),
      d31_60: clientes.reduce((s, c) => s + c.d31_60, 0),
      d61_90: clientes.reduce((s, c) => s + c.d61_90, 0),
      d90_plus: clientes.reduce((s, c) => s + c.d90_plus, 0),
      total: clientes.reduce((s, c) => s + c.total, 0),
    };

    return new Response(JSON.stringify({ exitoso: true, clientes, totales, generado_at: hoy.toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
