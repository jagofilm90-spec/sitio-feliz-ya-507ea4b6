import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-zk-key",
};

const ZK_API_KEY = "almasa-zk-2026";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método no permitido" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Validar API key
  const zkKey = req.headers.get("x-zk-key");
  if (zkKey !== ZK_API_KEY) {
    return new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { registros } = await req.json();

    if (!Array.isArray(registros) || registros.length === 0) {
      return new Response(
        JSON.stringify({ error: "Se requiere un array 'registros' no vacío" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validar cada registro
    for (const r of registros) {
      if (!r.zk_user_id || !r.dispositivo || !r.fecha_hora) {
        return new Response(
          JSON.stringify({ error: "Cada registro requiere: zk_user_id, dispositivo, fecha_hora" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Collect unique zk_user_id + dispositivo pairs to lookup mappings
    const pairsSet = new Set<string>();
    for (const r of registros) {
      pairsSet.add(`${r.zk_user_id}||${r.dispositivo}`);
    }

    // Fetch all relevant mappings in one query
    const zkIds = [...new Set(registros.map((r: any) => r.zk_user_id))];
    const { data: mapeos } = await supabase
      .from("zk_mapeo")
      .select("zk_user_id,dispositivo,empleado_id")
      .in("zk_user_id", zkIds);

    // Build lookup map: "zkId||dispositivo" -> empleado_id
    const mapeoLookup = new Map<string, string>();
    if (mapeos) {
      for (const m of mapeos) {
        mapeoLookup.set(`${m.zk_user_id}||${m.dispositivo}`, m.empleado_id);
      }
    }

    // Fallback: fetch empleados with zk_id for unmapped records
    const { data: empleadosZk } = await supabase
      .from("empleados")
      .select("id,zk_id")
      .in("zk_id", zkIds);

    const zkIdToEmpleado = new Map<string, string>();
    if (empleadosZk) {
      for (const e of empleadosZk) {
        if (e.zk_id && !zkIdToEmpleado.has(e.zk_id)) {
          zkIdToEmpleado.set(e.zk_id, e.id);
        }
      }
    }

    const rows = registros.map((r: any) => {
      const key = `${r.zk_user_id}||${r.dispositivo}`;
      const empleadoId = mapeoLookup.get(key) || zkIdToEmpleado.get(r.zk_user_id) || null;
      return {
        zk_user_id: r.zk_user_id,
        dispositivo: r.dispositivo,
        fecha_hora: r.fecha_hora,
        fecha: r.fecha || null,
        hora: r.hora || null,
        tipo: r.tipo || null,
        zk_status: r.zk_status ?? null,
        empleado_id: empleadoId,
      };
    });

    const { data, error } = await supabase
      .from("asistencia")
      .upsert(rows, { onConflict: "zk_user_id,dispositivo,fecha_hora" })
      .select("id");

    if (error) {
      console.error("Error insertando registros:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ insertados: data?.length || 0 }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error en zk-attendance:", err);
    return new Response(
      JSON.stringify({ error: "Error interno del servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
