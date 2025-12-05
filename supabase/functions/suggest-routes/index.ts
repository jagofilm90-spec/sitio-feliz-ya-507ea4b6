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

// Haversine formula to calculate distance between two GPS coordinates in km
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Nearest-neighbor algorithm to optimize delivery order using GPS coordinates
function optimizarOrdenEntrega(pedidos: any[]): any[] {
  if (pedidos.length <= 2) return pedidos;
  
  // Filter pedidos with valid coordinates
  const conCoords = pedidos.filter(p => p.sucursal?.latitud && p.sucursal?.longitud);
  const sinCoords = pedidos.filter(p => !p.sucursal?.latitud || !p.sucursal?.longitud);
  
  if (conCoords.length <= 1) {
    // Not enough coordinates to optimize, return original order
    return pedidos;
  }
  
  // Start from warehouse (CDMX center as default origin)
  const origen = { lat: 19.4326, lng: -99.1332 };
  const ordenados: any[] = [];
  const restantes = [...conCoords];
  
  let currentLat = origen.lat;
  let currentLng = origen.lng;
  
  // Greedy nearest-neighbor
  while (restantes.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Infinity;
    
    for (let i = 0; i < restantes.length; i++) {
      const p = restantes[i];
      const dist = haversineDistance(
        currentLat, currentLng,
        p.sucursal.latitud, p.sucursal.longitud
      );
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    }
    
    const nearest = restantes.splice(nearestIdx, 1)[0];
    ordenados.push(nearest);
    currentLat = nearest.sucursal.latitud;
    currentLng = nearest.sucursal.longitud;
  }
  
  // Append pedidos without coordinates at the end
  return [...ordenados, ...sinCoords];
}

// Simple bin-packing algorithm as fallback
function generarRutasSimples(
  pedidos: any[],
  vehiculos: Vehiculo[]
): { rutas: any[], noAsignados: string[] } {
  const rutas: any[] = [];
  const noAsignados: string[] = [];
  const vehiculosUsados = new Set<string>();
  
  // Sort pedidos by priority and weight
  const prioridadOrden: Record<string, number> = {
    vip_mismo_dia: 0,
    deadline: 1,
    dia_fijo_recurrente: 2,
    fecha_sugerida: 3,
    flexible: 4,
  };
  
  const pedidosOrdenados = [...pedidos].sort((a, b) => {
    const prioA = prioridadOrden[a.prioridad_entrega || "flexible"] || 4;
    const prioB = prioridadOrden[b.prioridad_entrega || "flexible"] || 4;
    if (prioA !== prioB) return prioA - prioB;
    return (b.peso_total_kg || 0) - (a.peso_total_kg || 0);
  });

  // Assign pedidos to vehicles using first-fit decreasing
  for (const pedido of pedidosOrdenados) {
    const pesoPedido = pedido.peso_total_kg || 0;
    let asignado = false;

    // Try to fit in existing route
    for (const ruta of rutas) {
      const capacidad = ruta.capacidad_maxima;
      if (ruta.peso_total + pesoPedido <= capacidad) {
        ruta.pedido_ids.push(pedido.id);
        ruta.peso_total += pesoPedido;
        asignado = true;
        break;
      }
    }

    // If not assigned, try to create new route
    if (!asignado) {
      const vehiculoDisponible = vehiculos.find(v => {
        if (vehiculosUsados.has(v.id)) return false;
        const capacidad = v.peso_maximo_local_kg; // Default to local
        return capacidad >= pesoPedido;
      });

      if (vehiculoDisponible) {
        const capacidad = vehiculoDisponible.peso_maximo_local_kg;
        rutas.push({
          vehiculo_id: vehiculoDisponible.id,
          tipo_ruta: "local",
          pedido_ids: [pedido.id],
          peso_total: pesoPedido,
          capacidad_maxima: capacidad,
        });
        vehiculosUsados.add(vehiculoDisponible.id);
        asignado = true;
      }
    }

    if (!asignado) {
      noAsignados.push(pedido.id);
    }
  }

  return { rutas, noAsignados };
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
      pedidosNoAsignados.push(...(ruta.pedido_ids || []));
      continue;
    }

    const tipoRuta = ruta.tipo_ruta === "foranea" ? "foranea" : "local";
    const capacidadMax = tipoRuta === "foranea" 
      ? vehiculo.peso_maximo_foraneo_kg 
      : vehiculo.peso_maximo_local_kg;

    const pedidosRuta = (ruta.pedido_ids || [])
      .map((id: string) => pedidosMap.get(id))
      .filter(Boolean);

    const pesoTotal = pedidosRuta.reduce((sum: number, p: any) => sum + (p.peso_total_kg || 0), 0);

    console.log(`[suggest-routes] Validating route ${vehiculo.nombre}: ${pesoTotal}kg / ${capacidadMax}kg (${((pesoTotal/capacidadMax)*100).toFixed(0)}%)`);

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
      console.log(`[suggest-routes] Route exceeds capacity, splitting...`);
      
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
          rutasValidadas.push({ ...rutaActual });
          vehiculosUsados.add(rutaActual.vehiculo_id);
          
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
            pedidosNoAsignados.push(pedido.id);
          }
        } else {
          pedidosNoAsignados.push(pedido.id);
        }
      }

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

    // Accept optional vehiculos_seleccionados array for daily planning
    const { fecha, vehiculos_seleccionados } = await req.json();
    const fechaRuta = fecha || new Date().toISOString().split("T")[0];

    console.log(`[suggest-routes] Generating DAILY routes for date: ${fechaRuta}`);
    console.log(`[suggest-routes] Selected vehicles: ${vehiculos_seleccionados?.length || 'ALL'}`);

    // 1. Get pending orders with priority, client and branch info INCLUDING COORDINATES
    const { data: pedidos, error: pedidosError } = await supabase
      .from("pedidos")
      .select(`
        id,
        folio,
        peso_total_kg,
        total,
        fecha_entrega_estimada,
        fecha_pedido,
        prioridad_entrega,
        deadline_dias_habiles,
        dia_fijo_semanal,
        cliente:cliente_id (
          id,
          nombre,
          direccion
        ),
        sucursal:sucursal_id (
          nombre,
          direccion,
          latitud,
          longitud,
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

    // 2. Get available vehicles (filtered by selection if provided)
    let vehiculosQuery = supabase
      .from("vehiculos")
      .select("id, nombre, tipo, peso_maximo_local_kg, peso_maximo_foraneo_kg")
      .eq("activo", true)
      .eq("status", "disponible")
      .order("peso_maximo_local_kg", { ascending: false });

    if (vehiculos_seleccionados?.length > 0) {
      vehiculosQuery = vehiculosQuery.in("id", vehiculos_seleccionados);
    }

    const { data: vehiculos, error: vehiculosError } = await vehiculosQuery;

    if (vehiculosError) {
      console.error("[suggest-routes] Error fetching vehicles:", vehiculosError);
      throw vehiculosError;
    }

    console.log(`[suggest-routes] Using ${vehiculos?.length || 0} vehicles for today`);

    // Calculate max vehicle capacity for oversized detection
    const maxCapacidadVehiculo = vehiculos?.reduce((max, v) => 
      Math.max(max, v.peso_maximo_local_kg, v.peso_maximo_foraneo_kg), 0
    ) || 0;

    // 3. Separate oversized orders (exceed any vehicle capacity)
    const pedidosOversized = pedidos?.filter(p => 
      (p.peso_total_kg || 0) > maxCapacidadVehiculo
    ) || [];
    
    const pedidosNormales = pedidos?.filter(p => 
      (p.peso_total_kg || 0) <= maxCapacidadVehiculo
    ) || [];

    console.log(`[suggest-routes] Oversized orders: ${pedidosOversized.length}, Normal: ${pedidosNormales.length}`);

    // Calculate today's capacity
    const capacidadHoy = vehiculos?.reduce((sum, v) => sum + v.peso_maximo_local_kg, 0) || 0;
    const pesoTotalPendiente = pedidosNormales.reduce((sum, p) => sum + (p.peso_total_kg || 0), 0);

    if (!pedidosNormales.length || !vehiculos?.length) {
      return new Response(
        JSON.stringify({
          rutas_sugeridas: [],
          pedidos_para_hoy: [],
          pedidos_para_despues: pedidosNormales || [],
          pedidos_oversized: pedidosOversized,
          capacidad_hoy: capacidadHoy,
          peso_total_pendiente: pesoTotalPendiente,
          mensaje: !vehiculos?.length 
            ? "No hay vehículos disponibles para hoy" 
            : "No hay pedidos pendientes que quepan en los vehículos",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create pedidos map for quick lookup
    const pedidosMap = new Map(pedidosNormales.map(p => [p.id, p]));

    // 4. Use AI to optimize route assignment for TODAY's capacity only
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Prepare data for AI - only normal-sized orders, NOW WITH COORDINATES
    const pedidosSimplificados = pedidosNormales.map((p: any) => ({
      id: p.id,
      folio: p.folio,
      peso_kg: p.peso_total_kg || 0,
      prioridad: p.prioridad_entrega || "fecha_sugerida",
      deadline_dias: p.deadline_dias_habiles,
      dia_fijo: p.dia_fijo_semanal,
      cliente: p.cliente?.nombre || "Sin cliente",
      cliente_id: p.cliente?.id,
      sucursal: p.sucursal?.nombre || null,
      direccion: p.sucursal?.direccion || p.cliente?.direccion || null,
      lat: p.sucursal?.latitud || null,
      lng: p.sucursal?.longitud || null,
      zona: p.sucursal?.zona?.nombre || "Sin zona",
      region: p.sucursal?.zona?.region || null,
      es_foranea: p.sucursal?.zona?.es_foranea || false,
      restricciones_vehiculo: p.sucursal?.restricciones_vehiculo || null,
      no_combinar: p.sucursal?.no_combinar_pedidos || false,
      fecha_pedido: p.fecha_pedido,
    }));

    const vehiculosSimplificados = vehiculos.map((v: any) => ({
      id: v.id,
      nombre: v.nombre,
      tipo: v.tipo,
      capacidad_local_kg: v.peso_maximo_local_kg,
      capacidad_foranea_kg: v.peso_maximo_foraneo_kg,
    }));

    // Group pedidos by client for deadline context
    const pedidosPorCliente = pedidosSimplificados.reduce((acc: Record<string, any[]>, p) => {
      const clienteId = p.cliente_id || p.cliente;
      if (!acc[clienteId]) acc[clienteId] = [];
      acc[clienteId].push(p);
      return acc;
    }, {});

    const clientesConDeadline = Object.entries(pedidosPorCliente)
      .filter(([_, pedidos]) => pedidos.some(p => p.prioridad === "deadline"))
      .map(([clienteId, pedidos]) => ({
        cliente: pedidos[0].cliente,
        total_pedidos: pedidos.length,
        peso_total: pedidos.reduce((s, p) => s + p.peso_kg, 0),
        deadline_dias: pedidos[0].deadline_dias,
      }));

    // Count pedidos with GPS coordinates
    const pedidosConCoords = pedidosSimplificados.filter(p => p.lat && p.lng).length;
    console.log(`[suggest-routes] Pedidos with GPS coordinates: ${pedidosConCoords}/${pedidosSimplificados.length}`);

    const systemPrompt = `Eres un experto en logística de entregas. Tu tarea es asignar pedidos a vehículos para ENTREGAS DE HOY.

## MODELO DE PLANIFICACIÓN DIARIA:
- Estás planificando SOLO las entregas de HOY, no de todos los días
- Tu objetivo es LLENAR los vehículos disponibles de forma óptima
- Los pedidos que NO quepan hoy se entregarán en días siguientes (NO ES UN ERROR)
- Clientes como Lecaroz tienen 15 días hábiles para entregar todos sus pedidos

## REGLA CRÍTICA - CAPACIDAD:
- NUNCA asignes más peso del permitido a un vehículo
- Cada vehículo tiene DOS capacidades:
  - capacidad_local_kg: para rutas locales
  - capacidad_foranea_kg: para rutas foráneas
- Utilización ideal: 80-95% de la capacidad

## PRIORIDADES (qué entregar PRIMERO):
1. vip_mismo_dia: DEBE entregarse hoy sin excepción
2. deadline con pocos días restantes
3. dia_fijo_recurrente si hoy es el día
4. fecha_sugerida
5. flexible: usar para LLENAR capacidad restante

## OPTIMIZACIÓN GEOGRÁFICA:
- Los pedidos tienen coordenadas GPS (lat, lng) cuando están disponibles
- Agrupa pedidos CERCANOS geográficamente en la misma ruta
- Considera la zona y región para agrupar pedidos de la misma área
- El sistema optimizará el orden de entrega automáticamente después

## ESTRATEGIA PARA HOY:
1. Primero asigna TODOS los pedidos VIP
2. Luego los deadline más urgentes
3. Agrupa por PROXIMIDAD GEOGRÁFICA (usa lat/lng) y zona/región
4. Llena capacidad restante con pedidos flexibles cercanos
5. Los que NO quepan van a "para_despues" (NO es error)

## FORMATO DE RESPUESTA (JSON exacto):
{
  "rutas": [
    {
      "vehiculo_id": "uuid",
      "tipo_ruta": "local",
      "pedido_ids": ["uuid1", "uuid2"],
      "peso_total_kg": 15000,
      "razon": "Zona Norte, 85% capacidad, incluye 2 VIP"
    }
  ],
  "para_despues": ["uuid-pedidos-para-otros-dias"],
  "notas": "Hoy se entregan X pedidos. Quedan Y para días siguientes."
}`;

    const userPrompt = `Fecha: ${fechaRuta}

## VEHÍCULOS DISPONIBLES HOY (${vehiculosSimplificados.length}):
${vehiculosSimplificados.map(v => `- ${v.nombre} (${v.tipo}): Local=${v.capacidad_local_kg}kg, Foráneo=${v.capacidad_foranea_kg}kg`).join('\n')}

## CAPACIDAD TOTAL HOY: ${capacidadHoy.toLocaleString()}kg

## PEDIDOS PENDIENTES (${pedidosSimplificados.length}, Total: ${pesoTotalPendiente.toLocaleString()}kg):
${JSON.stringify(pedidosSimplificados, null, 2)}

${clientesConDeadline.length > 0 ? `
## CLIENTES CON DEADLINE (tienen varios días para entregar todos):
${clientesConDeadline.map(c => `- ${c.cliente}: ${c.total_pedidos} pedidos, ${c.peso_total.toLocaleString()}kg, ${c.deadline_dias} días de plazo`).join('\n')}
` : ''}

Genera rutas para HOY llenando los ${vehiculosSimplificados.length} vehículos de forma óptima.
Los pedidos que no quepan hoy van a "para_despues" - esto es NORMAL, no un error.`;

    console.log("[suggest-routes] Calling Lovable AI for daily planning...");

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
      
      // Fallback to simple bin-packing algorithm
      console.log("[suggest-routes] Using fallback bin-packing algorithm...");
      const { rutas: rutasFallback, noAsignados } = generarRutasSimples(pedidosNormales, vehiculos);
      
      const rutasSugeridas: RutaSugerida[] = rutasFallback.map(ruta => {
        const vehiculo = vehiculos.find(v => v.id === ruta.vehiculo_id)!;
        const pedidosRuta = ruta.pedido_ids.map((id: string) => pedidosMap.get(id)).filter(Boolean);
        return {
          vehiculo,
          tipo_ruta: ruta.tipo_ruta,
          pedidos: pedidosRuta,
          peso_total: ruta.peso_total,
          capacidad_maxima: ruta.capacidad_maxima,
          porcentaje_carga: (ruta.peso_total / ruta.capacidad_maxima) * 100,
          regiones: [],
          zonas: [],
        };
      });

      const pedidosParaDespues = pedidosNormales.filter(p => noAsignados.includes(p.id));
      const pedidosParaHoy = pedidosNormales.filter(p => !noAsignados.includes(p.id));

      return new Response(
        JSON.stringify({
          rutas_sugeridas: rutasSugeridas,
          pedidos_para_hoy: pedidosParaHoy,
          pedidos_para_despues: pedidosParaDespues,
          pedidos_oversized: pedidosOversized,
          capacidad_hoy: capacidadHoy,
          peso_total_pendiente: pesoTotalPendiente,
          notas_ai: "Rutas generadas con algoritmo de respaldo (AI no disponible)",
          usó_fallback: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || "";
    
    console.log("[suggest-routes] AI response received, parsing...");

    // Parse AI response
    let aiResult;
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiResult = JSON.parse(jsonMatch[0]);
        console.log(`[suggest-routes] AI generated ${aiResult.rutas?.length || 0} routes`);
      } else {
        throw new Error("No JSON found in AI response");
      }
    } catch (parseError) {
      console.error("[suggest-routes] Failed to parse AI response, using fallback:", aiContent.substring(0, 500));
      
      // Use fallback algorithm
      const { rutas: rutasFallback, noAsignados } = generarRutasSimples(pedidosNormales, vehiculos);
      aiResult = { 
        rutas: rutasFallback, 
        para_despues: noAsignados, 
        notas: "Rutas generadas con algoritmo de respaldo" 
      };
    }

    // 5. Validate and split routes that exceed capacity
    console.log("[suggest-routes] Validating routes for capacity limits...");
    const { rutasValidadas, pedidosNoAsignados } = validarYDividirRutas(
      aiResult.rutas || [],
      vehiculos,
      pedidosMap
    );

    // 6. Build detailed route suggestions
    const rutasSugeridas: RutaSugerida[] = [];
    const pedidosAsignados = new Set<string>();

    for (const ruta of rutasValidadas) {
      const vehiculo = vehiculos.find((v: any) => v.id === ruta.vehiculo_id);
      if (!vehiculo) continue;

      let pedidosRuta = ruta.pedido_ids
        .map((id: string) => pedidosMap.get(id))
        .filter(Boolean);
      
      if (!pedidosRuta.length) continue;

      // OPTIMIZE delivery order using GPS coordinates (nearest-neighbor algorithm)
      pedidosRuta = optimizarOrdenEntrega(pedidosRuta);
      console.log(`[suggest-routes] Optimized delivery order for ${vehiculo.nombre} using GPS coordinates`);

      const tipoRuta = ruta.tipo_ruta === "foranea" ? "foranea" : "local";
      const capacidadMax = ruta.capacidad_maxima;
      const pesoTotal = ruta.peso_total;
      
      const regiones = [...new Set(pedidosRuta
        .map((p: any) => p.sucursal?.zona?.region)
        .filter(Boolean))] as string[];
      
      const zonas = [...new Set(pedidosRuta
        .map((p: any) => p.sucursal?.zona?.nombre)
        .filter(Boolean))] as string[];

      if (pesoTotal > capacidadMax) {
        console.error(`[suggest-routes] ERROR: Route still exceeds capacity! ${pesoTotal} > ${capacidadMax}`);
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

    // Separate assigned from unassigned
    const todosNoAsignados = new Set([
      ...(aiResult.para_despues || aiResult.sin_asignar || []),
      ...pedidosNoAsignados
    ]);

    const pedidosParaHoy = pedidosNormales.filter(p => pedidosAsignados.has(p.id));
    const pedidosParaDespues = pedidosNormales.filter(p => 
      !pedidosAsignados.has(p.id) || todosNoAsignados.has(p.id)
    );

    console.log(`[suggest-routes] DAILY PLAN: ${rutasSugeridas.length} routes, ${pedidosParaHoy.length} orders today, ${pedidosParaDespues.length} for later, ${pedidosOversized.length} oversized`);
    
    rutasSugeridas.forEach((r, i) => {
      console.log(`[suggest-routes] Route ${i+1}: ${r.vehiculo.nombre} - ${r.peso_total}/${r.capacidad_maxima}kg (${r.porcentaje_carga.toFixed(0)}%) - ${r.pedidos.length} orders`);
    });

    return new Response(
      JSON.stringify({
        rutas_sugeridas: rutasSugeridas,
        pedidos_para_hoy: pedidosParaHoy,
        pedidos_para_despues: pedidosParaDespues,
        pedidos_oversized: pedidosOversized,
        capacidad_hoy: capacidadHoy,
        peso_total_pendiente: pesoTotalPendiente,
        notas_ai: aiResult.notas || null,
        usó_fallback: false,
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
