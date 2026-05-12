import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const MODEL = "claude-sonnet-4-20250514";

const SYSTEM_PROMPT = `Eres JOSAN, el asistente de IA de ALMASA-OS.
ALMASA es una distribuidora de abarrotes mayorista fundada en 1904 en Hermosillo, Sonora.

PERSONALIDAD:
- Profesional pero cercano (tutea)
- Respondes SIEMPRE en español de México
- Conciso: respuestas cortas, números claros
- Cifras MXN formateadas ($1,234.56)

REGLAS:
1. SIEMPRE usa tools para datos reales. Nunca inventes números.
2. Si no hay tool para algo, dilo honestamente.
3. Para "cómo va el día" usa get_dashboard_resumen.
4. Acompaña números con interpretación útil.
5. Si hay alertas críticas, menciónalas.`;

const TOOLS = [
  {
    name: "get_ventas",
    description: "Ventas totales en un período. Usar para ventas/ingresos del día/semana/mes.",
    input_schema: {
      type: "object" as const,
      properties: { periodo: { type: "string", enum: ["hoy", "ayer", "semana", "mes", "ytd"] } },
      required: ["periodo"],
    },
  },
  {
    name: "get_top_clientes",
    description: "Top clientes por ventas o cartera vencida.",
    input_schema: {
      type: "object" as const,
      properties: {
        ordenar_por: { type: "string", enum: ["ventas_mes", "cartera_vencida", "cartera_total"] },
        limit: { type: "integer" },
      },
      required: ["ordenar_por"],
    },
  },
  {
    name: "get_pedidos_pendientes",
    description: "Pedidos pendientes de surtir o entregar.",
    input_schema: {
      type: "object" as const,
      properties: { estado: { type: "string", enum: ["todos", "sin_surtir", "en_transito"] } },
    },
  },
  {
    name: "get_alertas_criticas",
    description: "Alertas críticas activas LA CORONA: GPS, anti-robo, discrepancias.",
    input_schema: { type: "object" as const, properties: {} },
  },
  {
    name: "get_score_empleados",
    description: "Score confianza empleados. Detecta banderas rojas (score < 60).",
    input_schema: {
      type: "object" as const,
      properties: { solo_banderas_rojas: { type: "boolean" } },
    },
  },
  {
    name: "get_inventario_bajo",
    description: "Productos con inventario por debajo del mínimo.",
    input_schema: {
      type: "object" as const,
      properties: { limit: { type: "integer" } },
    },
  },
  {
    name: "get_cobros_pendientes",
    description: "Resumen cartera por antigüedad. Total vencido, cobros del día.",
    input_schema: { type: "object" as const, properties: {} },
  },
  {
    name: "get_dashboard_resumen",
    description: "Resumen ejecutivo completo del día. Usar para 'cómo va el día' o 'dame un resumen'.",
    input_schema: { type: "object" as const, properties: {} },
  },
  {
    name: "buscar_cliente",
    description: "Busca cliente por nombre o RFC con facturas pendientes.",
    input_schema: {
      type: "object" as const,
      properties: { query: { type: "string", description: "Nombre o RFC" } },
      required: ["query"],
    },
  },
  {
    name: "get_top_productos",
    description: "Top productos más vendidos por cantidad o monto.",
    input_schema: {
      type: "object" as const,
      properties: {
        ordenar_por: { type: "string", enum: ["cantidad", "monto"] },
        periodo: { type: "string", enum: ["mes", "ytd"] },
        limit: { type: "integer" },
      },
    },
  },
];

async function executeTool(sb: any, name: string, input: any): Promise<any> {
  const hoy = new Date().toISOString().split("T")[0];
  const fi = `${hoy}T00:00:00Z`;
  const mi = `${hoy.substring(0, 7)}-01T00:00:00Z`;
  const yi = `${hoy.substring(0, 4)}-01-01T00:00:00Z`;

  switch (name) {
    case "get_ventas": {
      const desde = { hoy: fi, ayer: new Date(Date.now() - 86400000).toISOString().split("T")[0] + "T00:00:00Z", semana: new Date(Date.now() - 7 * 86400000).toISOString(), mes: mi, ytd: yi }[input.periodo] || fi;
      const { data } = await sb.from("pedidos").select("total").gte("fecha_pedido", desde);
      const total = (data || []).reduce((s: number, p: any) => s + (p.total || 0), 0);
      return { periodo: input.periodo, total, pedidos: data?.length || 0, ticket_promedio: data?.length ? total / data.length : 0 };
    }
    case "get_top_clientes": {
      const limit = input.limit || 5;
      if (input.ordenar_por === "ventas_mes") {
        const { data } = await sb.from("pedidos").select("cliente_id, total, clientes:cliente_id(razon_social)").gte("fecha_pedido", mi);
        const agg: Record<string, any> = {};
        (data || []).forEach((p: any) => { if (p.cliente_id) { if (!agg[p.cliente_id]) agg[p.cliente_id] = { cliente: p.clientes?.razon_social, total: 0 }; agg[p.cliente_id].total += p.total || 0; } });
        return { top: Object.values(agg).sort((a: any, b: any) => b.total - a.total).slice(0, limit) };
      }
      const { data } = await sb.from("facturas").select("cliente_id, saldo_pendiente, fecha_vencimiento, clientes:cliente_id(razon_social)").gt("saldo_pendiente", 0);
      const agg: Record<string, any> = {};
      (data || []).forEach((f: any) => { if (!agg[f.cliente_id]) agg[f.cliente_id] = { cliente: f.clientes?.razon_social, total: 0, vencido: 0 }; agg[f.cliente_id].total += f.saldo_pendiente || 0; if (f.fecha_vencimiento && new Date(f.fecha_vencimiento) < new Date()) agg[f.cliente_id].vencido += f.saldo_pendiente || 0; });
      const key = input.ordenar_por === "cartera_vencida" ? "vencido" : "total";
      return { top: Object.values(agg).sort((a: any, b: any) => b[key] - a[key]).slice(0, limit) };
    }
    case "get_pedidos_pendientes": {
      let q = sb.from("pedidos").select("folio, total, estado_surtido, clientes:cliente_id(razon_social)", { count: "exact" });
      if (input.estado === "sin_surtir") q = q.eq("estado_surtido", "pendiente");
      else if (input.estado === "en_transito") q = q.eq("estado_surtido", "surtido");
      else q = q.in("estado_surtido", ["pendiente", "en_surtido"]);
      const { data, count } = await q.limit(15);
      return { total: count, pedidos: data };
    }
    case "get_alertas_criticas": {
      const { data } = await sb.from("alertas_la_corona").select("tipo_alerta, severidad, titulo, mensaje, created_at").eq("estado", "activa").order("created_at", { ascending: false }).limit(10);
      return { alertas: data, total: data?.length || 0 };
    }
    case "get_score_empleados": {
      let q = sb.from("score_confianza_empleado").select("score_actual, tendencia, bandera_roja, bandera_amarilla, empleados:empleado_id(nombre_completo, puesto)").order("score_actual");
      if (input.solo_banderas_rojas) q = q.eq("bandera_roja", true);
      const { data } = await q.limit(20);
      return { empleados: data };
    }
    case "get_inventario_bajo": {
      const { data } = await sb.from("productos").select("codigo, nombre, stock_actual, stock_minimo").lt("stock_actual", sb.rpc ? 0 : 999999).eq("activo", true).order("stock_actual").limit(input.limit || 10);
      // Filter client-side since we can't do column comparison in PostgREST easily
      const bajo = (data || []).filter((p: any) => p.stock_actual < p.stock_minimo);
      return { productos_bajo_minimo: bajo.slice(0, input.limit || 10) };
    }
    case "get_cobros_pendientes": {
      const { data: cart } = await sb.from("facturas").select("saldo_pendiente, fecha_vencimiento").gt("saldo_pendiente", 0);
      const total = (cart || []).reduce((s: number, f: any) => s + (f.saldo_pendiente || 0), 0);
      const vencida = (cart || []).filter((f: any) => f.fecha_vencimiento && new Date(f.fecha_vencimiento) < new Date()).reduce((s: number, f: any) => s + (f.saldo_pendiente || 0), 0);
      const { count } = await sb.from("cobros").select("id", { count: "exact", head: true }).gte("capturado_at", fi);
      return { cartera_total: total, cartera_vencida: vencida, porcentaje_vencido: total > 0 ? (vencida / total) * 100 : 0, cobros_hoy: count || 0 };
    }
    case "get_dashboard_resumen": {
      const [pDia, eDia, fTimb, alertas, scores] = await Promise.all([
        sb.from("pedidos").select("total").gte("fecha_pedido", fi),
        sb.from("hojas_salida").select("id", { count: "exact", head: true }).gte("entregada_cliente_at", fi),
        sb.from("facturas").select("id", { count: "exact", head: true }).eq("cfdi_estado", "timbrada").gte("cfdi_fecha_timbrado", fi),
        sb.from("alertas_la_corona").select("id", { count: "exact", head: true }).eq("estado", "activa"),
        sb.from("score_confianza_empleado").select("score_actual, bandera_roja"),
      ]);
      const ventasDia = (pDia.data || []).reduce((s: number, p: any) => s + (p.total || 0), 0);
      const sc = scores.data || [];
      return {
        ventas_dia: ventasDia, pedidos_dia: pDia.data?.length || 0,
        entregas_dia: eDia.count || 0, facturas_timbradas: fTimb.count || 0,
        alertas_activas: alertas.count || 0,
        score_promedio: sc.length ? sc.reduce((s: number, x: any) => s + (x.score_actual || 0), 0) / sc.length : 100,
        banderas_rojas: sc.filter((s: any) => s.bandera_roja).length,
      };
    }
    case "buscar_cliente": {
      const { data } = await sb.from("clientes").select("nombre, razon_social, rfc, direccion, telefono, limite_credito, saldo_pendiente").or(`razon_social.ilike.%${input.query}%,nombre.ilike.%${input.query}%,rfc.ilike.%${input.query}%`).limit(5);
      return { resultados: data };
    }
    case "get_top_productos": {
      const desde = input.periodo === "ytd" ? yi : mi;
      const { data } = await sb.from("pedidos_detalles").select("producto_id, cantidad, productos:producto_id(codigo, nombre)").gte("created_at", desde).limit(500);
      const agg: Record<string, any> = {};
      (data || []).forEach((l: any) => { const id = l.producto_id; if (!agg[id]) agg[id] = { codigo: l.productos?.codigo, nombre: l.productos?.nombre, cantidad: 0 }; agg[id].cantidad += l.cantidad || 0; });
      return { top: Object.values(agg).sort((a: any, b: any) => b.cantidad - a.cantidad).slice(0, input.limit || 10) };
    }
    default:
      return { error: `Tool no implementada: ${name}` };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { conversacion_id, mensaje } = await req.json();
    if (!mensaje) return respond(400, { error: "mensaje requerido" });

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) return respond(400, { error: "ANTHROPIC_API_KEY no configurada" });

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Get user from auth
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader) {
      const { data: { user } } = await sb.auth.getUser(authHeader.replace("Bearer ", ""));
      userId = user?.id || null;
    }
    if (!userId) return respond(401, { error: "No autenticado" });

    // Load or create conversation
    let conv: any = null;
    let mensajes: any[] = [];

    if (conversacion_id) {
      const { data } = await sb.from("josan_conversaciones").select("*").eq("id", conversacion_id).eq("user_id", userId).single();
      conv = data;
      mensajes = data?.mensajes || [];
    }

    mensajes.push({ role: "user", content: mensaje });

    // Tool use loop
    const toolsUsados: string[] = [];
    let respuestaFinal = "";
    let iter = 0;

    while (iter++ < 8) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": anthropicKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({
          model: MODEL, max_tokens: 2000, system: SYSTEM_PROMPT, tools: TOOLS,
          messages: mensajes.map((m: any) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) throw new Error(`Claude API: ${res.status} ${await res.text()}`);
      const data = await res.json();

      mensajes.push({ role: "assistant", content: data.content });

      if (data.stop_reason !== "tool_use") {
        respuestaFinal = data.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n");
        break;
      }

      const results: any[] = [];
      for (const block of data.content) {
        if (block.type === "tool_use") {
          toolsUsados.push(block.name);
          const result = await executeTool(sb, block.name, block.input);
          results.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(result) });
        }
      }
      mensajes.push({ role: "user", content: results });
    }

    // Save conversation
    if (!conv) {
      const { data: nueva } = await sb.from("josan_conversaciones").insert({
        user_id: userId, titulo: mensaje.substring(0, 80), mensajes,
        total_mensajes: mensajes.length, total_tools_usados: toolsUsados.length, tools_usados: toolsUsados,
      }).select().single();
      conv = nueva;
    } else {
      await sb.from("josan_conversaciones").update({
        mensajes, total_mensajes: mensajes.length,
        total_tools_usados: (conv.total_tools_usados || 0) + toolsUsados.length,
        tools_usados: [...new Set([...(conv.tools_usados || []), ...toolsUsados])],
        ultimo_mensaje_at: new Date().toISOString(),
      }).eq("id", conv.id);
    }

    return respond(200, { respuesta: respuestaFinal, conversacion_id: conv?.id, tools_usados: toolsUsados });
  } catch (error: any) {
    return respond(500, { error: error.message });
  }
});

function respond(s: number, b: any) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
