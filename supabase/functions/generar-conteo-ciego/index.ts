import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { asignado_a, tipo, motivo, producto_ids } = await req.json();
    if (!asignado_a) return respond(400, { error: "asignado_a requerido" });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      userId = user?.id || null;
    }

    // Select products to count
    let productos: any[];
    if (producto_ids?.length) {
      // Specific products
      const { data } = await supabase
        .from("productos")
        .select("id, codigo, nombre, stock_actual, precio_compra")
        .in("id", producto_ids)
        .eq("activo", true);
      productos = data || [];
    } else {
      // Random selection (20 products)
      const { data } = await supabase
        .from("productos")
        .select("id, codigo, nombre, stock_actual, precio_compra")
        .eq("activo", true)
        .gt("stock_actual", 0)
        .limit(100);

      // Shuffle and take 20
      const shuffled = (data || []).sort(() => Math.random() - 0.5);
      productos = shuffled.slice(0, 20);
    }

    if (productos.length === 0) return respond(400, { error: "No hay productos activos con stock" });

    // Create conteo ciego
    const { data: conteo, error: cErr } = await supabase
      .from("conteos_ciegos")
      .insert({
        folio: "", // trigger fills
        tipo: tipo || "aleatorio",
        estado: "programado",
        motivo: motivo || "Conteo ciego programado",
        programado_por: userId,
        asignado_a,
        total_productos: productos.length,
      })
      .select()
      .single();

    if (cErr) throw cErr;

    // Create detail lines (cantidad_teorica from stock_actual)
    const detalles = productos.map((p: any) => ({
      conteo_id: conteo.id,
      producto_id: p.id,
      codigo_producto: p.codigo,
      nombre_producto: p.nombre,
      cantidad_teorica: p.stock_actual,
      precio_unitario: p.precio_compra || 0,
    }));

    await supabase.from("conteos_ciegos_detalles").insert(detalles);

    return respond(200, {
      exitoso: true,
      conteo_id: conteo.id,
      folio: conteo.folio,
      total_productos: productos.length,
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
