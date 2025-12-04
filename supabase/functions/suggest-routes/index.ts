import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Vehiculo {
  id: string;
  nombre: string;
  tipo: string;
  peso_maximo_local_kg: number;
  peso_maximo_foraneo_kg: number;
}

interface RutaSugerida {
  vehiculo: Vehiculo;
  tipo_ruta: "local" | "foranea";
  pedidos: any[];
  peso_total: number;
  capacidad_maxima: number;
  porcentaje_carga: number;
  regiones: string[];
  zonas: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { fecha } = await req.json();
    const fechaRuta = fecha || new Date().toISOString().split("T")[0];

    console.log(`[suggest-routes] Generating routes for date: ${fechaRuta}`);

    // 1. Get pending orders with priority, client and branch info
    const { data: pedidos, error: pedidosError } = await supabase
      .from("pedidos")
      .select(`
        id,
        folio,
        peso_total_kg,
        total,
        fecha_entrega_estimada,
        prioridad_entrega,
        deadline_dias_habiles,
        dia_fijo_semanal,
        cliente:cliente_id (
          nombre,
          direccion
        ),
        sucursal:sucursal_id (
          nombre,
          direccion,
          horario_entrega,
          restricciones_vehiculo,
          dias_sin_entrega,
          no_combinar_pedidos,
          zona:zona_id (
            id,
            nombre,
            region,
            es_foranea
          )
        )
      `)
      .eq("status", "pendiente")
      .order("fecha_pedido");

    if (pedidosError) {
      console.error("[suggest-routes] Error fetching pedidos:", pedidosError);
      throw pedidosError;
    }

    console.log(`[suggest-routes] Found ${pedidos?.length || 0} pending orders`);

    // 2. Get available vehicles
    const { data: vehiculos, error: vehiculosError } = await supabase
      .from("vehiculos")
      .select("id, nombre, tipo, peso_maximo_local_kg, peso_maximo_foraneo_kg")
      .eq("activo", true)
      .eq("status", "disponible")
      .order("peso_maximo_local_kg", { ascending: false });

    if (vehiculosError) {
      console.error("[suggest-routes] Error fetching vehicles:", vehiculosError);
      throw vehiculosError;
    }

    console.log(`[suggest-routes] Found ${vehiculos?.length || 0} available vehicles`);

    if (!pedidos?.length || !vehiculos?.length) {
      return new Response(
        JSON.stringify({
          rutas_sugeridas: [],
          pedidos_sin_asignar: pedidos || [],
          mensaje: !vehiculos?.length 
            ? "No hay vehículos disponibles" 
            : "No hay pedidos pendientes",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Use AI to optimize route assignment
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Prepare data for AI
    const pedidosSimplificados = pedidos.map((p: any) => ({
      id: p.id,
      folio: p.folio,
      peso_kg: p.peso_total_kg || 0,
      prioridad: p.prioridad_entrega || "fecha_sugerida",
      deadline_dias: p.deadline_dias_habiles,
      dia_fijo: p.dia_fijo_semanal,
      cliente: p.cliente?.nombre || "Sin cliente",
      sucursal: p.sucursal?.nombre || null,
      zona: p.sucursal?.zona?.nombre || "Sin zona",
      region: p.sucursal?.zona?.region || null,
      es_foranea: p.sucursal?.zona?.es_foranea || false,
      restricciones_vehiculo: p.sucursal?.restricciones_vehiculo || null,
      no_combinar: p.sucursal?.no_combinar_pedidos || false,
    }));

    const vehiculosSimplificados = vehiculos.map((v: any) => ({
      id: v.id,
      nombre: v.nombre,
      tipo: v.tipo,
      capacidad_local: v.peso_maximo_local_kg,
      capacidad_foranea: v.peso_maximo_foraneo_kg,
    }));

    const systemPrompt = `Eres un experto en logística de entregas para una distribuidora de abarrotes en México. 
Tu tarea es optimizar la asignación de pedidos a vehículos considerando:

PRIORIDADES DE ENTREGA (de mayor a menor urgencia):
1. vip_mismo_dia: DEBE entregarse hoy sin excepción
2. deadline: Tiene X días hábiles para entregar (ver deadline_dias)
3. dia_fijo_recurrente: Entregar en día específico de la semana (ver dia_fijo)
4. fecha_sugerida: Flexible +/- 1 día
5. flexible: Sin urgencia, usar para llenar capacidad

REGLAS DE OPTIMIZACIÓN:
1. Agrupar pedidos de la misma región geográfica
2. Rutas foráneas (es_foranea=true) usan capacidad_foranea del vehículo
3. Rutas locales usan capacidad_local del vehículo
4. Respetar restricciones_vehiculo de sucursales
5. Pedidos con no_combinar=true van en ruta exclusiva
6. Maximizar utilización de vehículos (80-95% ideal)
7. Tortons para cargas pesadas, Camionetas para ligeras
8. Los pedidos VIP siempre van primero

RESPONDE EN JSON con este formato exacto:
{
  "rutas": [
    {
      "vehiculo_id": "uuid",
      "tipo_ruta": "local" o "foranea",
      "pedido_ids": ["uuid1", "uuid2"],
      "razon": "breve explicación"
    }
  ],
  "sin_asignar": ["uuid de pedidos que no caben"],
  "notas": "observaciones importantes"
}`;

    const userPrompt = `Fecha de entrega: ${fechaRuta}

VEHÍCULOS DISPONIBLES:
${JSON.stringify(vehiculosSimplificados, null, 2)}

PEDIDOS PENDIENTES:
${JSON.stringify(pedidosSimplificados, null, 2)}

Genera las rutas óptimas para hoy.`;

    console.log("[suggest-routes] Calling Lovable AI...");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[suggest-routes] AI API error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Límite de solicitudes excedido. Intenta en unos minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de AI insuficientes." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || "";
    
    console.log("[suggest-routes] AI response received");

    // Parse AI response
    let aiResult;
    try {
      // Extract JSON from response (may be wrapped in markdown code blocks)
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in AI response");
      }
    } catch (parseError) {
      console.error("[suggest-routes] Failed to parse AI response:", aiContent);
      // Fallback: simple assignment
      aiResult = { rutas: [], sin_asignar: pedidosSimplificados.map((p: any) => p.id), notas: "Error parsing AI response" };
    }

    // 4. Build detailed route suggestions
    const rutasSugeridas: RutaSugerida[] = [];
    const pedidosAsignados = new Set<string>();

    for (const ruta of aiResult.rutas || []) {
      const vehiculo = vehiculos.find((v: any) => v.id === ruta.vehiculo_id);
      if (!vehiculo) continue;

      const pedidosRuta = pedidos.filter((p: any) => ruta.pedido_ids?.includes(p.id));
      if (!pedidosRuta.length) continue;

      const tipoRuta = ruta.tipo_ruta === "foranea" ? "foranea" : "local";
      const capacidadMax = tipoRuta === "foranea" 
        ? vehiculo.peso_maximo_foraneo_kg 
        : vehiculo.peso_maximo_local_kg;

      const pesoTotal = pedidosRuta.reduce((sum: number, p: any) => sum + (p.peso_total_kg || 0), 0);
      
      const regiones = [...new Set(pedidosRuta
        .map((p: any) => p.sucursal?.zona?.region)
        .filter(Boolean))] as string[];
      
      const zonas = [...new Set(pedidosRuta
        .map((p: any) => p.sucursal?.zona?.nombre)
        .filter(Boolean))] as string[];

      rutasSugeridas.push({
        vehiculo,
        tipo_ruta: tipoRuta,
        pedidos: pedidosRuta,
        peso_total: pesoTotal,
        capacidad_maxima: capacidadMax,
        porcentaje_carga: capacidadMax > 0 ? (pesoTotal / capacidadMax) * 100 : 0,
        regiones,
        zonas,
      });

      pedidosRuta.forEach((p: any) => pedidosAsignados.add(p.id));
    }

    // Find unassigned orders
    const pedidosSinAsignar = pedidos.filter((p: any) => !pedidosAsignados.has(p.id));

    console.log(`[suggest-routes] Generated ${rutasSugeridas.length} routes, ${pedidosSinAsignar.length} unassigned`);

    return new Response(
      JSON.stringify({
        rutas_sugeridas: rutasSugeridas,
        pedidos_sin_asignar: pedidosSinAsignar,
        notas_ai: aiResult.notas || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[suggest-routes] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
