import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const results = { caducidad: { vencidos: 0, criticos: 0, notificaciones: 0, push: 0 }, fumigacion: { vencidas: 0, proximas: 0, sinFecha: 0, notificaciones: 0, push: 0 } };

    // ══════════════════════════════════════
    // 1. CADUCIDAD CHECK
    // ══════════════════════════════════════

    // Expired lots (fecha_caducidad < today)
    const { data: lotesVencidos } = await supabase
      .from("inventario_lotes")
      .select("id, producto_id, productos!inner(nombre, codigo, maneja_caducidad)")
      .eq("productos.maneja_caducidad", true)
      .gt("cantidad_disponible", 0)
      .lt("fecha_caducidad", today);

    const countVencidos = lotesVencidos?.length || 0;
    results.caducidad.vencidos = countVencidos;

    // Critical lots (today <= fecha_caducidad <= in7Days)
    const { data: lotesCriticos } = await supabase
      .from("inventario_lotes")
      .select("id, producto_id, productos!inner(nombre, codigo, maneja_caducidad)")
      .eq("productos.maneja_caducidad", true)
      .gt("cantidad_disponible", 0)
      .gte("fecha_caducidad", today)
      .lte("fecha_caducidad", in7Days);

    const countCriticos = lotesCriticos?.length || 0;
    results.caducidad.criticos = countCriticos;

    // Check for duplicate notifications today
    const { data: notifHoy } = await supabase
      .from("notificaciones")
      .select("tipo")
      .in("tipo", ["caducidad_vencida", "caducidad_critica"])
      .gte("created_at", today);

    const tiposEnviados = new Set(notifHoy?.map(n => n.tipo) || []);

    // Expired notification
    if (countVencidos > 0 && !tiposEnviados.has("caducidad_vencida")) {
      const productosUnicos = new Set(lotesVencidos?.map(l => (l.productos as any)?.codigo) || []);
      await supabase.from("notificaciones").insert({
        tipo: "caducidad_vencida",
        titulo: "🔴 Productos VENCIDOS en inventario",
        descripcion: `${countVencidos} lotes vencidos de ${productosUnicos.size} productos — requieren acción inmediata.`,
        leida: false,
      });
      results.caducidad.notificaciones++;

      // Push notification
      try {
        await supabase.functions.invoke("send-push-notification", {
          body: {
            roles: ["admin", "almacen", "gerente_almacen"],
            title: "🔴 Productos VENCIDOS en inventario",
            body: `${countVencidos} lotes vencidos — requieren acción inmediata`,
            data: { route: "/almacen-tablet", tab: "caducidad" },
          },
        });
        results.caducidad.push++;
      } catch (e) {
        console.error("Push error (caducidad vencida):", e);
      }
    }

    // Critical notification
    if (countCriticos > 0 && !tiposEnviados.has("caducidad_critica")) {
      const productosUnicos = new Set(lotesCriticos?.map(l => (l.productos as any)?.codigo) || []);
      await supabase.from("notificaciones").insert({
        tipo: "caducidad_critica",
        titulo: "⚠️ Productos próximos a vencer",
        descripcion: `${countCriticos} lotes de ${productosUnicos.size} productos vencen en menos de 7 días. Ver reporte FEFO en almacén.`,
        leida: false,
      });
      results.caducidad.notificaciones++;

      try {
        await supabase.functions.invoke("send-push-notification", {
          body: {
            roles: ["admin", "almacen", "gerente_almacen"],
            title: "⚠️ Productos próximos a vencer",
            body: `${countCriticos} lotes vencen en menos de 7 días`,
            data: { route: "/almacen-tablet", tab: "caducidad" },
          },
        });
        results.caducidad.push++;
      } catch (e) {
        console.error("Push error (caducidad critica):", e);
      }
    }

    // ══════════════════════════════════════
    // 2. FUMIGACIÓN CHECK
    // ══════════════════════════════════════

    const { data: productosFum } = await supabase
      .from("productos")
      .select("id, nombre, codigo, fecha_ultima_fumigacion")
      .eq("requiere_fumigacion", true)
      .eq("activo", true)
      .gt("stock_actual", 0);

    const vencidas: string[] = [];
    const proximas: string[] = [];
    const sinFecha: string[] = [];

    (productosFum || []).forEach((p: any) => {
      if (!p.fecha_ultima_fumigacion) {
        sinFecha.push(p.codigo);
        return;
      }
      const ultimaFum = new Date(p.fecha_ultima_fumigacion);
      const vencimiento = new Date(ultimaFum);
      vencimiento.setMonth(vencimiento.getMonth() + 6);
      const dosSemanasAntes = new Date(vencimiento);
      dosSemanasAntes.setDate(dosSemanasAntes.getDate() - 14);

      if (vencimiento < now) {
        vencidas.push(p.codigo);
      } else if (dosSemanasAntes <= now) {
        proximas.push(p.codigo);
      }
    });

    results.fumigacion = { vencidas: vencidas.length, proximas: proximas.length, sinFecha: sinFecha.length, notificaciones: 0, push: 0 };

    // Check duplicates for fumigacion
    const { data: fumNotifHoy } = await supabase
      .from("notificaciones")
      .select("tipo")
      .in("tipo", ["fumigacion_vencida", "fumigacion_proxima", "fumigacion_sin_fecha"])
      .gte("created_at", today);

    const fumTipos = new Set(fumNotifHoy?.map(n => n.tipo) || []);

    if (vencidas.length > 0 && !fumTipos.has("fumigacion_vencida")) {
      await supabase.from("notificaciones").insert({
        tipo: "fumigacion_vencida",
        titulo: "🔴 Fumigación vencida",
        descripcion: `${vencidas.length} productos requieren fumigación urgente: ${vencidas.slice(0, 5).join(", ")}${vencidas.length > 5 ? "..." : ""}`,
        leida: false,
      });
      results.fumigacion.notificaciones++;

      try {
        await supabase.functions.invoke("send-push-notification", {
          body: {
            roles: ["admin", "almacen", "gerente_almacen"],
            title: "🔴 Fumigación vencida",
            body: `${vencidas.length} productos requieren fumigación urgente`,
            data: { route: "/almacen-tablet", tab: "fumigaciones" },
          },
        });
        results.fumigacion.push++;
      } catch (e) {
        console.error("Push error (fumigacion vencida):", e);
      }
    }

    if (proximas.length > 0 && !fumTipos.has("fumigacion_proxima")) {
      await supabase.from("notificaciones").insert({
        tipo: "fumigacion_proxima",
        titulo: "⚠️ Fumigación próxima",
        descripcion: `${proximas.length} productos requieren fumigación en los próximos 14 días: ${proximas.slice(0, 5).join(", ")}${proximas.length > 5 ? "..." : ""}`,
        leida: false,
      });
      results.fumigacion.notificaciones++;

      try {
        await supabase.functions.invoke("send-push-notification", {
          body: {
            roles: ["admin", "gerente_almacen"],
            title: "⚠️ Fumigación próxima",
            body: `${proximas.length} productos requieren fumigación en los próximos 14 días`,
            data: { route: "/almacen-tablet", tab: "fumigaciones" },
          },
        });
        results.fumigacion.push++;
      } catch (e) {
        console.error("Push error (fumigacion proxima):", e);
      }
    }

    if (sinFecha.length > 0 && !fumTipos.has("fumigacion_sin_fecha")) {
      await supabase.from("notificaciones").insert({
        tipo: "fumigacion_sin_fecha",
        titulo: "⚠️ Productos sin fecha de fumigación",
        descripcion: `${sinFecha.length} productos con stock no tienen fecha de fumigación registrada.`,
        leida: false,
      });
      results.fumigacion.notificaciones++;
    }

    console.log("Check caducidad+fumigación completado:", results);

    return new Response(JSON.stringify({ success: true, ...results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error en check-caducidad-fumigacion:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
