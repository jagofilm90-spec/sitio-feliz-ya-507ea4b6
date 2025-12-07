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
  tiempo_estimado_minutos?: number;
  entregas_count?: number;
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

// Calculate estimated route time in minutes
function calcularTiempoRuta(pedidos: any[], puntoBodega: { lat: number; lng: number }): number {
  const TIEMPO_ENTREGA_MINUTOS = 25; // Time per delivery (unload + signature)
  const VELOCIDAD_PROMEDIO_KMH = 25; // Average speed in CDMX traffic
  
  const conCoords = pedidos.filter(p => p.sucursal?.latitud && p.sucursal?.longitud);
  
  // Base time for deliveries
  let tiempoTotal = pedidos.length * TIEMPO_ENTREGA_MINUTOS;
  
  if (conCoords.length >= 2) {
    // Calculate travel time between stops
    let lastLat = puntoBodega.lat;
    let lastLng = puntoBodega.lng;
    
    for (const p of conCoords) {
      const distKm = haversineDistance(lastLat, lastLng, p.sucursal.latitud, p.sucursal.longitud);
      tiempoTotal += (distKm / VELOCIDAD_PROMEDIO_KMH) * 60;
      lastLat = p.sucursal.latitud;
      lastLng = p.sucursal.longitud;
    }
    
    // Return trip to warehouse
    const distRegreso = haversineDistance(lastLat, lastLng, puntoBodega.lat, puntoBodega.lng);
    tiempoTotal += (distRegreso / VELOCIDAD_PROMEDIO_KMH) * 60;
  } else {
    // Estimate based on number of deliveries (45 min avg per delivery including travel)
    tiempoTotal = pedidos.length * 45;
  }
  
  return Math.round(tiempoTotal);
}

// Nearest-neighbor algorithm to optimize delivery order using GPS coordinates
function optimizarOrdenEntrega(pedidos: any[], puntoOrigen: { lat: number; lng: number }): any[] {
  if (pedidos.length <= 2) return pedidos;
  
  const conCoords = pedidos.filter(p => p.sucursal?.latitud && p.sucursal?.longitud);
  const sinCoords = pedidos.filter(p => !p.sucursal?.latitud || !p.sucursal?.longitud);
  
  if (conCoords.length <= 1) {
    return pedidos;
  }
  
  const ordenados: any[] = [];
  const restantes = [...conCoords];
  
  let currentLat = puntoOrigen.lat;
  let currentLng = puntoOrigen.lng;
  
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
  
  return [...ordenados, ...sinCoords];
}

// IMPROVED: Bin-packing with geographical clustering
function generarRutasSimples(
  pedidos: any[],
  vehiculos: Vehiculo[]
): { rutas: any[], noAsignados: string[] } {
  const rutas: any[] = [];
  const noAsignados: string[] = [];
  const vehiculosUsados = new Set<string>();
  
  // STEP 1: Group pedidos by region for geographical clustering
  const pedidosPorRegion = new Map<string, any[]>();
  
  for (const pedido of pedidos) {
    const region = pedido.sucursal?.zona?.region || 'sin_region';
    if (!pedidosPorRegion.has(region)) {
      pedidosPorRegion.set(region, []);
    }
    pedidosPorRegion.get(region)!.push(pedido);
  }
  
  console.log(`[suggest-routes] Fallback: Clustering by region:`);
  for (const [region, regionPedidos] of pedidosPorRegion) {
    const pesoTotal = regionPedidos.reduce((s, p) => s + (p.peso_total_kg || 0), 0);
    console.log(`  - ${region}: ${regionPedidos.length} pedidos, ${pesoTotal.toLocaleString()}kg`);
  }
  
  // Sort regions by priority (VIP first, then by total weight)
  const prioridadOrden: Record<string, number> = {
    vip_mismo_dia: 0,
    deadline: 1,
    dia_fijo_recurrente: 2,
    fecha_sugerida: 3,
    flexible: 4,
  };
  
  const regionesOrdenadas = [...pedidosPorRegion.entries()].sort((a, b) => {
    const prioA = Math.min(...a[1].map(p => prioridadOrden[p.prioridad_entrega || 'flexible'] || 4));
    const prioB = Math.min(...b[1].map(p => prioridadOrden[p.prioridad_entrega || 'flexible'] || 4));
    if (prioA !== prioB) return prioA - prioB;
    const pesoA = a[1].reduce((s, p) => s + (p.peso_total_kg || 0), 0);
    const pesoB = b[1].reduce((s, p) => s + (p.peso_total_kg || 0), 0);
    return pesoB - pesoA;
  });
  
  // Sort vehicles by capacity (largest first)
  const vehiculosOrdenados = [...vehiculos].sort((a, b) => 
    b.peso_maximo_local_kg - a.peso_maximo_local_kg
  );
  
  // STEP 2: For each region, fill vehicles with MULTIPLE orders
  for (const [region, pedidosRegion] of regionesOrdenadas) {
    // Sort orders within region by priority, then by weight (largest first)
    const ordenados = [...pedidosRegion].sort((a, b) => {
      const prioA = prioridadOrden[a.prioridad_entrega || 'flexible'] || 4;
      const prioB = prioridadOrden[b.prioridad_entrega || 'flexible'] || 4;
      if (prioA !== prioB) return prioA - prioB;
      return (b.peso_total_kg || 0) - (a.peso_total_kg || 0);
    });
    
    // Determine route type based on region
    const esForanea = region.includes('morelos') || region.includes('queretaro') || 
                      region.includes('hidalgo') || region.includes('puebla') ||
                      region.includes('tlaxcala') || region.includes('toluca');
    
    while (ordenados.length > 0) {
      // Find available vehicle
      const vehiculo = vehiculosOrdenados.find(v => !vehiculosUsados.has(v.id));
      
      if (!vehiculo) {
        // No more vehicles, mark remaining as unassigned
        noAsignados.push(...ordenados.map(p => p.id));
        break;
      }
      
      const capacidad = esForanea ? vehiculo.peso_maximo_foraneo_kg : vehiculo.peso_maximo_local_kg;
      const pedidosRuta: string[] = [];
      let pesoRuta = 0;
      
      // FILL the vehicle with MULTIPLE orders from this region cluster
      // First-fit decreasing but keeping orders together by region
      for (let i = ordenados.length - 1; i >= 0; i--) {
        const pedido = ordenados[i];
        const peso = pedido.peso_total_kg || 0;
        
        if (pesoRuta + peso <= capacidad) {
          pedidosRuta.push(pedido.id);
          pesoRuta += peso;
          ordenados.splice(i, 1);
        }
      }
      
      // Also try larger orders that might fit
      for (let i = 0; i < ordenados.length; i++) {
        const pedido = ordenados[i];
        const peso = pedido.peso_total_kg || 0;
        
        if (pesoRuta + peso <= capacidad) {
          pedidosRuta.push(pedido.id);
          pesoRuta += peso;
          ordenados.splice(i, 1);
          i--; // Adjust index after splice
        }
      }
      
      if (pedidosRuta.length > 0) {
        rutas.push({
          vehiculo_id: vehiculo.id,
          tipo_ruta: esForanea ? 'foranea' : 'local',
          pedido_ids: pedidosRuta,
          peso_total: pesoRuta,
          capacidad_maxima: capacidad,
          region: region,
        });
        vehiculosUsados.add(vehiculo.id);
        
        console.log(`[suggest-routes] Fallback route: ${vehiculo.nombre} - ${region} - ${pedidosRuta.length} entregas, ${pesoRuta.toLocaleString()}kg (${((pesoRuta/capacidad)*100).toFixed(0)}%)`);
      }
    }
  }
  
  return { rutas, noAsignados };
}

// Validate route logic - warn about suboptimal routes
function validarRutaLogica(ruta: RutaSugerida): { valid: boolean; warning?: string } {
  // Warn if only 1 delivery with lots of spare capacity
  if (ruta.pedidos.length === 1 && ruta.porcentaje_carga < 70) {
    return { 
      valid: true, 
      warning: `⚠️ Solo 1 entrega al ${ruta.porcentaje_carga.toFixed(0)}% - considerar agregar pedidos cercanos`
    };
  }
  
  // Warn if too many deliveries for time
  if (ruta.tiempo_estimado_minutos && ruta.tiempo_estimado_minutos > 600) {
    return { 
      valid: true, 
      warning: `⚠️ Ruta larga: ${ruta.pedidos.length} entregas = ${(ruta.tiempo_estimado_minutos/60).toFixed(1)} horas`
    };
  }
  
  // Check for incompatible region mixing
  const regiones = ruta.regiones;
  const incompatibles = [
    ['morelos', 'cdmx_norte'],
    ['morelos', 'edomex_norte'],
    ['queretaro', 'cdmx_sur'],
    ['puebla', 'cdmx_poniente'],
  ];
  
  for (const [r1, r2] of incompatibles) {
    if (regiones.some(r => r.includes(r1)) && regiones.some(r => r.includes(r2))) {
      return { 
        valid: true, 
        warning: `⚠️ Mezcla regiones lejanas: ${r1} + ${r2}`
      };
    }
  }
  
  return { valid: true };
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

  console.log(`[suggest-routes] Validating ${rutasOriginales.length} routes from AI`);
  console.log(`[suggest-routes] Available vehicles: ${vehiculos.map(v => `${v.nombre}(${v.id.substring(0,8)})`).join(', ')}`);

  for (const ruta of rutasOriginales) {
    console.log(`[suggest-routes] Processing route with vehiculo_id: "${ruta.vehiculo_id}"`);
    
    // Robust vehicle search: by ID, by nombre, or by string match
    const vehiculo = vehiculos.find(v => 
      v.id === ruta.vehiculo_id || 
      v.nombre === ruta.vehiculo_id || 
      v.nombre === String(ruta.vehiculo_id) ||
      v.id.startsWith(String(ruta.vehiculo_id))
    );
    
    if (!vehiculo) {
      console.warn(`[suggest-routes] ⚠️ Vehicle NOT FOUND for vehiculo_id: "${ruta.vehiculo_id}"`);
      pedidosNoAsignados.push(...(ruta.pedido_ids || []));
      continue;
    }
    
    console.log(`[suggest-routes] ✓ Matched vehicle: ${vehiculo.nombre} (${vehiculo.id.substring(0,8)})`);

    const tipoRuta = ruta.tipo_ruta === "foranea" ? "foranea" : "local";
    const capacidadMax = tipoRuta === "foranea" 
      ? vehiculo.peso_maximo_foraneo_kg 
      : vehiculo.peso_maximo_local_kg;

    const pedidoIdsProvided = ruta.pedido_ids || [];
    const pedidosNotFound = pedidoIdsProvided.filter((id: string) => !pedidosMap.has(id));
    if (pedidosNotFound.length > 0) {
      console.warn(`[suggest-routes] ⚠️ ${pedidosNotFound.length} pedido_ids not found in map: ${pedidosNotFound.slice(0,3).join(', ')}...`);
    }
    
    const pedidosRuta = pedidoIdsProvided
      .map((id: string) => pedidosMap.get(id))
      .filter(Boolean);

    const pesoTotal = pedidosRuta.reduce((sum: number, p: any) => sum + (p.peso_total_kg || 0), 0);

    console.log(`[suggest-routes] Validating route ${vehiculo.nombre}: ${pedidosRuta.length} entregas, ${pesoTotal}kg / ${capacidadMax}kg (${((pesoTotal/capacidadMax)*100).toFixed(0)}%)`);

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

    const { fecha, vehiculos_seleccionados } = await req.json();
    const fechaRuta = fecha || new Date().toISOString().split("T")[0];

    console.log(`[suggest-routes] Generating DAILY routes for date: ${fechaRuta}`);
    console.log(`[suggest-routes] Selected vehicles: ${vehiculos_seleccionados?.length || 'ALL'}`);

    // Get warehouse origin coordinates
    const DEFAULT_BODEGA = { lat: 19.408680132961802, lng: -99.12108443546356 };
    let puntoBodega = { ...DEFAULT_BODEGA };
    
    const { data: configBodega } = await supabase
      .from("configuracion_empresa")
      .select("valor")
      .eq("clave", "bodega_principal")
      .single();
    
    if (configBodega?.valor) {
      const bodegaData = configBodega.valor as { latitud?: number; longitud?: number };
      if (bodegaData.latitud && bodegaData.longitud) {
        puntoBodega = { lat: bodegaData.latitud, lng: bodegaData.longitud };
        console.log(`[suggest-routes] Using warehouse location: ${puntoBodega.lat}, ${puntoBodega.lng}`);
      }
    }

    // Get pending orders with full details
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

    // Get available vehicles
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

    // Calculate max vehicle capacity
    const maxCapacidadVehiculo = vehiculos?.reduce((max, v) => 
      Math.max(max, v.peso_maximo_local_kg, v.peso_maximo_foraneo_kg), 0
    ) || 0;

    // Separate oversized orders
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

    // Create pedidos map
    const pedidosMap = new Map(pedidosNormales.map(p => [p.id, p]));

    // Prepare data for AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

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

    // Analyze clusters by region for logging
    const clustersPorRegion = new Map<string, { pedidos: number; peso: number; nombres: string[] }>();
    for (const p of pedidosSimplificados) {
      const region = p.region || 'sin_region';
      if (!clustersPorRegion.has(region)) {
        clustersPorRegion.set(region, { pedidos: 0, peso: 0, nombres: [] });
      }
      const cluster = clustersPorRegion.get(region)!;
      cluster.pedidos++;
      cluster.peso += p.peso_kg;
      if (cluster.nombres.length < 3) cluster.nombres.push(p.sucursal || p.cliente);
    }
    
    console.log(`[suggest-routes] Geographic clusters for AI:`);
    for (const [region, data] of clustersPorRegion) {
      console.log(`  - ${region}: ${data.pedidos} pedidos, ${data.peso.toLocaleString()}kg (ej: ${data.nombres.join(', ')})`);
    }

    // Count pedidos with GPS
    const pedidosConCoords = pedidosSimplificados.filter(p => p.lat && p.lng).length;
    console.log(`[suggest-routes] Pedidos with GPS: ${pedidosConCoords}/${pedidosSimplificados.length}`);

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

    // IMPROVED AI PROMPT with explicit multi-delivery rules
    const systemPrompt = `Eres un experto en logística de entregas para CDMX y área metropolitana.

## REGLA CRÍTICA - MÚLTIPLES ENTREGAS POR RUTA:
Cada ruta DEBE tener MÚLTIPLES pedidos, no solo 1-2 grandes. Los vehículos hacen varias paradas:
- Tortón (18,000-20,000kg): 3-15 entregas típicas
- Rabón (9,000-10,000kg): 4-12 entregas típicas  
- Camioneta (7,000-7,800kg): 5-10 entregas típicas

EJEMPLO CORRECTO (Tortón en EdoMex Norte):
- Pedidos: VICKY (155kg), CALPULALPAN (175kg), EXP NEZA (200kg), MONTERREY (1,008kg), PRADO (625kg), LECAROZ (15,838kg)
- Total: ~18,000kg con 6 entregas en cluster geográfico cercano ✅

EJEMPLO INCORRECTO:
- Solo 1 pedido de 15,000kg cuando hay 5 pedidos cercanos de 500-2000kg que cabrían ❌

## RESTRICCIÓN DE TIEMPO (jornada 9am-8pm = 11 horas):
- Rutas CDMX/EdoMex cercano: máximo 15-20 entregas (25 min por entrega)
- Rutas foráneas (Morelos, Querétaro, Hidalgo): máximo 3-5 entregas

## CLUSTERS GEOGRÁFICOS (OBLIGATORIO):
1. AGRUPA pedidos de la MISMA REGIÓN primero (usa el campo "region")
2. Dentro de la región, agrupa por ZONA cercana
3. Usa las coordenadas GPS (lat, lng) para identificar clusters cercanos
4. NUNCA mezcles regiones incompatibles en la misma ruta:
   - ❌ Morelos + CDMX Norte
   - ❌ Querétaro + CDMX Sur
   - ✅ EdoMex Norte + CDMX Norte (cercanos)

## ESTRATEGIA DE LLENADO:
1. Identifica clusters de pedidos cercanos por región
2. SUMA los pesos del cluster
3. Asigna el cluster completo al vehículo que mejor se ajuste
4. Objetivo: 80-95% de capacidad utilizada
5. Los pedidos que no quepan hoy van a "para_despues" (NO es error)

## PRIORIDADES:
1. vip_mismo_dia: DEBE entregarse hoy sin excepción
2. deadline con pocos días restantes
3. dia_fijo_recurrente si hoy es el día
4. fecha_sugerida
5. flexible: usar para LLENAR capacidad restante

## FORMATO DE RESPUESTA JSON:
{
  "rutas": [
    {
      "vehiculo_id": "uuid-del-vehiculo",
      "tipo_ruta": "local",
      "pedido_ids": ["uuid1", "uuid2", "uuid3", "uuid4", "uuid5"],
      "peso_total_kg": 17500,
      "razon": "Cluster EdoMex Norte: 5 panaderías, 87% capacidad"
    }
  ],
  "para_despues": ["uuids-de-pedidos-para-otros-dias"],
  "notas": "Hoy: X pedidos en Y rutas. Para después: Z pedidos."
}

IMPORTANTE: Cada ruta debe tener MÚLTIPLES entregas (3-15 según vehículo), no solo 1-2.`;

    const userPrompt = `Fecha: ${fechaRuta}

## VEHÍCULOS DISPONIBLES HOY (${vehiculosSimplificados.length}):
${vehiculosSimplificados.map(v => `- ${v.nombre} (${v.tipo}): Local=${v.capacidad_local_kg.toLocaleString()}kg, Foráneo=${v.capacidad_foranea_kg.toLocaleString()}kg`).join('\n')}

## CAPACIDAD TOTAL HOY: ${capacidadHoy.toLocaleString()}kg

## CLUSTERS GEOGRÁFICOS DETECTADOS:
${[...clustersPorRegion.entries()].map(([region, data]) => 
  `- ${region}: ${data.pedidos} pedidos, ${data.peso.toLocaleString()}kg`
).join('\n')}

## PEDIDOS PENDIENTES (${pedidosSimplificados.length}, Total: ${pesoTotalPendiente.toLocaleString()}kg):
${JSON.stringify(pedidosSimplificados, null, 2)}

${clientesConDeadline.length > 0 ? `
## CLIENTES CON DEADLINE (distribuir a lo largo de los días):
${clientesConDeadline.map(c => `- ${c.cliente}: ${c.total_pedidos} pedidos, ${c.peso_total.toLocaleString()}kg, ${c.deadline_dias} días de plazo`).join('\n')}
` : ''}

RECUERDA: Agrupa MÚLTIPLES pedidos por ruta (3-15 entregas), no pongas 1 solo pedido por vehículo si hay espacio para más.`;

    console.log("[suggest-routes] Calling Lovable AI for daily planning with multi-delivery rules...");

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
      
      // Fallback with improved geographic clustering
      console.log("[suggest-routes] Using fallback with geographic clustering...");
      const { rutas: rutasFallback, noAsignados } = generarRutasSimples(pedidosNormales, vehiculos);
      
      const rutasSugeridas: RutaSugerida[] = rutasFallback.map(ruta => {
        const vehiculo = vehiculos.find(v => v.id === ruta.vehiculo_id)!;
        const pedidosRuta = ruta.pedido_ids.map((id: string) => pedidosMap.get(id)).filter(Boolean);
        const tiempoEstimado = calcularTiempoRuta(pedidosRuta, puntoBodega);
        
        return {
          vehiculo,
          tipo_ruta: ruta.tipo_ruta,
          pedidos: pedidosRuta,
          peso_total: ruta.peso_total,
          capacidad_maxima: ruta.capacidad_maxima,
          porcentaje_carga: (ruta.peso_total / ruta.capacidad_maxima) * 100,
          regiones: [ruta.region],
          zonas: [],
          tiempo_estimado_minutos: tiempoEstimado,
          entregas_count: pedidosRuta.length,
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
          notas_ai: "Rutas generadas con algoritmo de respaldo (clusters geográficos)",
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
        
        // Log AI route details
        if (aiResult.rutas && aiResult.rutas.length > 0) {
          console.log(`[suggest-routes] AI routes detail:`);
          aiResult.rutas.forEach((r: any, i: number) => {
            console.log(`  Route ${i+1}: vehiculo="${r.vehiculo_id}", entregas=${r.pedido_ids?.length || 0}, peso=${r.peso_total_kg || 'N/A'}kg, tipo=${r.tipo_ruta}`);
          });
        }
      } else {
        throw new Error("No JSON found in AI response");
      }
    } catch (parseError) {
      console.error("[suggest-routes] Failed to parse AI response, using fallback:", aiContent.substring(0, 500));
      
      const { rutas: rutasFallback, noAsignados } = generarRutasSimples(pedidosNormales, vehiculos);
      aiResult = { 
        rutas: rutasFallback, 
        para_despues: noAsignados, 
        notas: "Rutas generadas con algoritmo de respaldo (error parsing AI)" 
      };
    }

    // Validate and split routes
    console.log("[suggest-routes] Validating routes for capacity limits...");
    const { rutasValidadas, pedidosNoAsignados } = validarYDividirRutas(
      aiResult.rutas || [],
      vehiculos,
      pedidosMap
    );

    // Build detailed route suggestions
    const rutasSugeridas: RutaSugerida[] = [];
    const pedidosAsignados = new Set<string>();

    for (const ruta of rutasValidadas) {
      const vehiculo = vehiculos.find((v: any) => v.id === ruta.vehiculo_id);
      if (!vehiculo) continue;

      let pedidosRuta = ruta.pedido_ids
        .map((id: string) => pedidosMap.get(id))
        .filter(Boolean);
      
      if (!pedidosRuta.length) continue;

      // Optimize delivery order using GPS
      pedidosRuta = optimizarOrdenEntrega(pedidosRuta, puntoBodega);
      console.log(`[suggest-routes] Optimized delivery order for ${vehiculo.nombre}: ${pedidosRuta.length} entregas`);

      const tipoRuta = ruta.tipo_ruta === "foranea" ? "foranea" : "local";
      const capacidadMax = ruta.capacidad_maxima;
      const pesoTotal = ruta.peso_total;
      const tiempoEstimado = calcularTiempoRuta(pedidosRuta, puntoBodega);
      
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

      const rutaSugerida: RutaSugerida = {
        vehiculo,
        tipo_ruta: tipoRuta,
        pedidos: pedidosRuta,
        peso_total: pesoTotal,
        capacidad_maxima: capacidadMax,
        porcentaje_carga: capacidadMax > 0 ? (pesoTotal / capacidadMax) * 100 : 0,
        regiones,
        zonas,
        tiempo_estimado_minutos: tiempoEstimado,
        entregas_count: pedidosRuta.length,
      };

      // Validate route logic and log warnings
      const validacion = validarRutaLogica(rutaSugerida);
      if (validacion.warning) {
        console.log(`[suggest-routes] ${validacion.warning}`);
      }

      rutasSugeridas.push(rutaSugerida);
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

    console.log(`[suggest-routes] DAILY PLAN: ${rutasSugeridas.length} routes, ${pedidosParaHoy.length} orders today, ${pedidosParaDespues.length} for later`);
    
    rutasSugeridas.forEach((r, i) => {
      console.log(`[suggest-routes] Route ${i+1}: ${r.vehiculo.nombre} - ${r.entregas_count} entregas, ${r.peso_total.toLocaleString()}/${r.capacidad_maxima.toLocaleString()}kg (${r.porcentaje_carga.toFixed(0)}%), ~${Math.round((r.tiempo_estimado_minutos || 0)/60)}h`);
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
