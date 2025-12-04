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

// Post-AI validation: Split routes that exceed capacity
function validarYDividirRutas(
  rutasOriginales: any[], 
  vehiculos: Vehiculo[], 
  pedidosMap: Map<string, any>
): { rutasValidadas: any[], pedidosNoAsignados: string[] } {
  const rutasValidadas: any[] = [];
  const vehiculosUsados = new Set<string>();
  const pedidosNoAsignados: string[] = [];

  for (const ruta of rutasOriginales) {
    const vehiculo = vehiculos.find(v => v.id === ruta.vehiculo_id);
    if (!vehiculo) {
      // Vehiculo not found, mark orders as unassigned
      pedidosNoAsignados.push(...(ruta.pedido_ids || []));
      continue;
    }

    const tipoRuta = ruta.tipo_ruta === "foranea" ? "foranea" : "local";
    const capacidadMax = tipoRuta === "foranea" 
      ? vehiculo.peso_maximo_foraneo_kg 
      : vehiculo.peso_maximo_local_kg;

    // Get pedidos for this route with their weights
    const pedidosRuta = (ruta.pedido_ids || [])
      .map((id: string) => pedidosMap.get(id))
      .filter(Boolean);

    // Calculate total weight
    const pesoTotal = pedidosRuta.reduce((sum: number, p: any) => sum + (p.peso_total_kg || 0), 0);

    console.log(`[suggest-routes] Validating route ${vehiculo.nombre}: ${pesoTotal}kg / ${capacidadMax}kg (${((pesoTotal/capacidadMax)*100).toFixed(0)}%)`);

    // If route is within capacity, add it directly
    if (pesoTotal <= capacidadMax) {
      rutasValidadas.push({
        vehiculo_id: vehiculo.id,
        tipo_ruta: tipoRuta,
        pedido_ids: pedidosRuta.map((p: any) => p.id),
        peso_total: pesoTotal,
        capacidad_maxima: capacidadMax,
      });
      vehiculosUsados.add(vehiculo.id);
    } else {
      // Route exceeds capacity - need to split
      console.log(`[suggest-routes] Route exceeds capacity, splitting...`);
      
      // Sort by priority (VIP first) and weight (larger first for better bin packing)
      const prioridadOrden: Record<string, number> = {
        vip_mismo_dia: 0,
        deadline: 1,
        dia_fijo_recurrente: 2,
        fecha_sugerida: 3,
        flexible: 4,
      };
      
      pedidosRuta.sort((a: any, b: any) => {
        const prioA = prioridadOrden[a.prioridad_entrega || "flexible"] || 4;
        const prioB = prioridadOrden[b.prioridad_entrega || "flexible"] || 4;
        if (prioA !== prioB) return prioA - prioB;
        return (b.peso_total_kg || 0) - (a.peso_total_kg || 0);
      });

      let rutaActual = {
        vehiculo_id: vehiculo.id,
        tipo_ruta: tipoRuta,
        pedido_ids: [] as string[],
        peso_total: 0,
        capacidad_maxima: capacidadMax,
      };

      for (const pedido of pedidosRuta) {
        const pesoPedido = pedido.peso_total_kg || 0;
        
        if (rutaActual.peso_total + pesoPedido <= capacidadMax) {
          rutaActual.pedido_ids.push(pedido.id);
          rutaActual.peso_total += pesoPedido;
        } else if (rutaActual.pedido_ids.length > 0) {
          // Save current route and try to find another vehicle
          rutasValidadas.push({ ...rutaActual });
          vehiculosUsados.add(rutaActual.vehiculo_id);
          
          // Find next available vehicle with sufficient capacity
          const siguienteVehiculo = vehiculos.find(v => 
            !vehiculosUsados.has(v.id) && 
            (tipoRuta === "foranea" ? v.peso_maximo_foraneo_kg : v.peso_maximo_local_kg) >= pesoPedido
          );
          
          if (siguienteVehiculo) {
            const nuevaCapacidad = tipoRuta === "foranea" 
              ? siguienteVehiculo.peso_maximo_foraneo_kg 
              : siguienteVehiculo.peso_maximo_local_kg;
            
            rutaActual = {
              vehiculo_id: siguienteVehiculo.id,
              tipo_ruta: tipoRuta,
              pedido_ids: [pedido.id],
              peso_total: pesoPedido,
              capacidad_maxima: nuevaCapacidad,
            };
          } else {
            // No more vehicles available
            pedidosNoAsignados.push(pedido.id);
          }
        } else {
          // Single order exceeds vehicle capacity - mark as unassigned
          pedidosNoAsignados.push(pedido.id);
        }
      }

      // Add the last route if it has orders
      if (rutaActual.pedido_ids.length > 0) {
        rutasValidadas.push(rutaActual);
        vehiculosUsados.add(rutaActual.vehiculo_id);
      }
    }
  }

  return { rutasValidadas, pedidosNoAsignados };
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

    // Create pedidos map for quick lookup
    const pedidosMap = new Map(pedidos.map(p => [p.id, p]));

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
      capacidad_local_kg: v.peso_maximo_local_kg,
      capacidad_foranea_kg: v.peso_maximo_foraneo_kg,
    }));

    // Calculate totals for context
    const pesoTotalPedidos = pedidosSimplificados.reduce((sum, p) => sum + p.peso_kg, 0);
    const capacidadTotalLocal = vehiculosSimplificados.reduce((sum, v) => sum + v.capacidad_local_kg, 0);

    const systemPrompt = `Eres un experto en logística de entregas. Tu tarea es asignar pedidos a vehículos de forma ÓPTIMA.

## REGLA CRÍTICA - CAPACIDAD (MUY IMPORTANTE):
- NUNCA, BAJO NINGUNA CIRCUNSTANCIA, asignes más peso del permitido a un vehículo
- Cada vehículo tiene DOS capacidades:
  - capacidad_local_kg: para rutas locales (CDMX)
  - capacidad_foranea_kg: para rutas foráneas (fuera de CDMX)
- La SUMA de peso_kg de los pedidos asignados a un vehículo DEBE SER MENOR O IGUAL a su capacidad
- Si un pedido no cabe en ningún vehículo disponible, ponlo en "sin_asignar"
- Utilización ideal: 70-95% de la capacidad

## EJEMPLO DE VALIDACIÓN:
- Vehículo "Torton 22": capacidad_local_kg=20000
- Si asignas pedidos de 15000kg + 8000kg = 23000kg → ¡INCORRECTO! Excede 20000kg
- Correcto: Asignar 15000kg al Torton 22, y 8000kg a otro vehículo

## PRIORIDADES DE ENTREGA:
1. vip_mismo_dia: DEBE entregarse hoy sin excepción
2. deadline: Tiene X días hábiles (ver deadline_dias)
3. dia_fijo_recurrente: Día específico de la semana
4. fecha_sugerida: Flexible +/- 1 día
5. flexible: Sin urgencia, usar para llenar capacidad

## REGLAS DE OPTIMIZACIÓN:
1. Agrupar pedidos de la misma zona/región
2. es_foranea=true → usar capacidad_foranea_kg
3. es_foranea=false → usar capacidad_local_kg
4. Pedidos con no_combinar=true van en ruta exclusiva
5. Tortons para cargas pesadas, Camionetas para ligeras
6. VIP siempre tienen prioridad máxima

## FORMATO DE RESPUESTA (JSON exacto):
{
  "rutas": [
    {
      "vehiculo_id": "uuid-del-vehiculo",
      "tipo_ruta": "local",
      "pedido_ids": ["uuid1", "uuid2"],
      "peso_total_kg": 15000,
      "razon": "Zona Norte CDMX, 75% capacidad"
    }
  ],
  "sin_asignar": ["uuid-pedido"],
  "notas": "Observaciones"
}`;

    const userPrompt = `Fecha: ${fechaRuta}

## VEHÍCULOS DISPONIBLES (${vehiculosSimplificados.length}):
${vehiculosSimplificados.map(v => `- ${v.nombre} (${v.tipo}): Local=${v.capacidad_local_kg}kg, Foráneo=${v.capacidad_foranea_kg}kg`).join('\n')}

## PEDIDOS PENDIENTES (${pedidosSimplificados.length}, Total: ${pesoTotalPedidos.toLocaleString()}kg):
${JSON.stringify(pedidosSimplificados, null, 2)}

## CAPACIDAD TOTAL DISPONIBLE: ${capacidadTotalLocal.toLocaleString()}kg (local)

Genera rutas óptimas. RECUERDA: La suma de pesos en cada ruta NO debe exceder la capacidad del vehículo.`;

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
        temperature: 0.2,
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
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in AI response");
      }
    } catch (parseError) {
      console.error("[suggest-routes] Failed to parse AI response:", aiContent);
      aiResult = { rutas: [], sin_asignar: pedidosSimplificados.map((p: any) => p.id), notas: "Error parsing AI response" };
    }

    // 4. CRITICAL: Validate and split routes that exceed capacity
    console.log("[suggest-routes] Validating routes for capacity limits...");
    const { rutasValidadas, pedidosNoAsignados } = validarYDividirRutas(
      aiResult.rutas || [],
      vehiculos,
      pedidosMap
    );

    // Combine unassigned from AI and from validation
    const todosNoAsignados = new Set([
      ...(aiResult.sin_asignar || []),
      ...pedidosNoAsignados
    ]);

    // 5. Build detailed route suggestions
    const rutasSugeridas: RutaSugerida[] = [];
    const pedidosAsignados = new Set<string>();

    for (const ruta of rutasValidadas) {
      const vehiculo = vehiculos.find((v: any) => v.id === ruta.vehiculo_id);
      if (!vehiculo) continue;

      const pedidosRuta = ruta.pedido_ids
        .map((id: string) => pedidosMap.get(id))
        .filter(Boolean);
      
      if (!pedidosRuta.length) continue;

      const tipoRuta = ruta.tipo_ruta === "foranea" ? "foranea" : "local";
      const capacidadMax = ruta.capacidad_maxima;
      const pesoTotal = ruta.peso_total;
      
      const regiones = [...new Set(pedidosRuta
        .map((p: any) => p.sucursal?.zona?.region)
        .filter(Boolean))] as string[];
      
      const zonas = [...new Set(pedidosRuta
        .map((p: any) => p.sucursal?.zona?.nombre)
        .filter(Boolean))] as string[];

      // Final safety check
      if (pesoTotal > capacidadMax) {
        console.error(`[suggest-routes] ERROR: Route still exceeds capacity after validation! ${pesoTotal} > ${capacidadMax}`);
        // Mark these as unassigned
        pedidosRuta.forEach((p: any) => todosNoAsignados.add(p.id));
        continue;
      }

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
    const pedidosSinAsignar = pedidos.filter((p: any) => 
      !pedidosAsignados.has(p.id) || todosNoAsignados.has(p.id)
    );

    console.log(`[suggest-routes] Generated ${rutasSugeridas.length} validated routes, ${pedidosSinAsignar.length} unassigned`);
    
    // Log route summaries
    rutasSugeridas.forEach((r, i) => {
      console.log(`[suggest-routes] Route ${i+1}: ${r.vehiculo.nombre} - ${r.peso_total}/${r.capacidad_maxima}kg (${r.porcentaje_carga.toFixed(0)}%) - ${r.pedidos.length} orders`);
    });

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
