import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/cors.ts";

const formatCurrency = (n: number) => `$${n.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

// Email template helpers (same style as frontend emailTemplates.ts)
const emailWrapper = (bannerColor: string, bannerIcon: string, bannerTitle: string, body: string) => `
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:20px 0;font-family:Arial,sans-serif;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)">
      <tr><td style="background:#1e3a5f;padding:30px 40px;text-align:center">
        <h1 style="color:#fff;margin:0;font-size:28px;font-weight:bold;letter-spacing:2px">ALMASA</h1>
        <p style="color:#94b8d9;margin:5px 0 0;font-size:13px">Abarrotes la Manita SA de CV</p>
      </td></tr>
      <tr><td style="background:${bannerColor};padding:15px 40px;text-align:center">
        <p style="margin:0;color:#fff;font-size:18px;font-weight:bold">${bannerIcon} ${bannerTitle}</p>
      </td></tr>
      <tr><td style="padding:30px 40px">${body}</td></tr>
      <tr><td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center">
        <p style="margin:0;color:#94a3b8;font-size:12px">Este es un correo automático del sistema ALMASA.<br>Por favor no responda a este mensaje.</p>
      </td></tr>
    </table>
  </td></tr>
</table>`;

const kpiCard = (icon: string, title: string, items: string[]) => `
<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:16px;">
  <h3 style="margin:0 0 10px;font-size:15px;color:#1e293b;">${icon} ${title}</h3>
  ${items.map(i => `<p style="margin:4px 0;font-size:14px;color:#475569;">${i}</p>`).join("")}
</div>`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));

    // Calcular fecha México (UTC-6)
    const now = new Date();
    const mexicoOffset = -6 * 60;
    const mexicoTime = new Date(now.getTime() + (mexicoOffset + now.getTimezoneOffset()) * 60000);
    const fecha = body.fecha || mexicoTime.toISOString().split("T")[0];
    const inicioDia = `${fecha}T00:00:00`;
    const finDia = `${fecha}T23:59:59`;

    console.log(`Generando resumen del día: ${fecha}`);

    // =================== QUERIES ===================
    const [
      recepcionesRes,
      rutasRes,
      entregasRutaRes,
      ventasRes,
      cobrosRes,
      porAutorizarRes,
      atrasadasRes,
      devolucionesRes,
    ] = await Promise.all([
      // COMPRAS: recepciones completadas hoy
      supabase.from("ordenes_compra_entregas")
        .select("id, cantidad_bultos")
        .eq("status", "recibida")
        .gte("recepcion_finalizada_en", inicioDia)
        .lte("recepcion_finalizada_en", finDia),
      // RUTAS completadas hoy
      supabase.from("rutas")
        .select("id", { count: "exact", head: true })
        .eq("fecha_ruta", fecha)
        .eq("status", "completada"),
      // ENTREGAS de rutas hoy
      supabase.from("rutas")
        .select("id, entregas(id, status_entrega)")
        .eq("fecha_ruta", fecha),
      // VENTAS del día
      supabase.from("pedidos")
        .select("id, total")
        .gte("created_at", inicioDia)
        .in("status", ["entregado", "en_ruta"]),
      // COBROS del día
      supabase.from("pagos_cliente")
        .select("monto_total")
        .gte("fecha_registro", inicioDia)
        .neq("status", "rechazado"),
      // PEDIDOS por autorizar
      supabase.from("pedidos")
        .select("id", { count: "exact", head: true })
        .eq("status", "por_autorizar"),
      // ENTREGAS atrasadas
      supabase.from("ordenes_compra_entregas")
        .select("id", { count: "exact", head: true })
        .eq("status", "programada")
        .lt("fecha_programada", fecha),
      // DEVOLUCIONES del día
      supabase.from("devoluciones_proveedor" as any)
        .select("id", { count: "exact", head: true })
        .gte("created_at", inicioDia),
    ]);

    // =================== CALCULAR ===================
    const recepciones = (recepcionesRes.data as any[]) || [];
    const recepcionesCount = recepciones.length;
    const bultosRecibidos = recepciones.reduce((s: number, r: any) => s + (r.cantidad_bultos || 0), 0);

    const rutasCompletadas = rutasRes.count || 0;

    let entregasCompletadas = 0;
    let entregasPendientes = 0;
    ((entregasRutaRes.data as any[]) || []).forEach((ruta: any) => {
      (ruta.entregas || []).forEach((e: any) => {
        if (e.status_entrega === "entregado" || e.status_entrega === "completo") entregasCompletadas++;
        else entregasPendientes++;
      });
    });

    const ventas = (ventasRes.data as any[]) || [];
    const ventasTotal = ventas.reduce((s: number, p: any) => s + (p.total || 0), 0);
    const ventasCount = ventas.length;

    const cobrosTotal = ((cobrosRes.data as any[]) || []).reduce((s: number, p: any) => s + (Number(p.monto_total) || 0), 0);

    const porAutorizar = porAutorizarRes.count || 0;
    const atrasadas = atrasadasRes.count || 0;
    const devoluciones = devolucionesRes.count || 0;

    const datos = {
      fecha,
      compras: { recepciones: recepcionesCount, bultos: bultosRecibidos },
      rutas: { completadas: rutasCompletadas, entregasCompletadas, entregasPendientes },
      ventas: { total: ventasTotal, count: ventasCount },
      cobros: { total: cobrosTotal },
      devoluciones: { count: devoluciones },
      pendientes: { porAutorizar, atrasadas },
    };

    console.log("Resumen calculado:", JSON.stringify(datos));

    // =================== GUARDAR ===================
    await supabase.from("resumenes_diarios" as any).upsert({
      fecha,
      datos,
      enviado_en: new Date().toISOString(),
    } as any, { onConflict: "fecha" });

    // =================== PUSH NOTIFICATION ===================
    const pushBody = `Ventas: ${formatCurrency(ventasTotal)} · Cobros: ${formatCurrency(cobrosTotal)} · ${recepcionesCount} recepciones`;
    try {
      await supabase.functions.invoke("send-push-notification", {
        body: {
          roles: ["admin"],
          title: "📊 Tu resumen del día está listo",
          body: pushBody,
        },
      });
    } catch (pushErr) {
      console.error("Error enviando push:", pushErr);
    }

    // =================== EMAIL ===================
    try {
      const htmlBody = emailWrapper("#1e3a5f", "📊", `RESUMEN DEL DÍA — ${fecha}`,
        `<p style="color:#374151;font-size:15px;margin:0 0 25px">Aquí está el resumen de operaciones del día.</p>
        ${kpiCard("📦 COMPRAS", "Recepciones", [
          `<strong>${recepcionesCount}</strong> recepciones completadas`,
          `<strong>${bultosRecibidos.toLocaleString()}</strong> bultos recibidos`,
        ])}
        ${kpiCard("🚛 RUTAS Y ENTREGAS", "Logística", [
          `<strong>${rutasCompletadas}</strong> rutas completadas`,
          `<strong>${entregasCompletadas}</strong> pedidos entregados`,
          entregasPendientes > 0 ? `<span style="color:#d97706"><strong>${entregasPendientes}</strong> pedidos pendientes</span>` : "Sin pedidos pendientes",
        ])}
        ${kpiCard("💰 VENTAS Y COBROS", "Finanzas", [
          `Vendido hoy: <strong>${formatCurrency(ventasTotal)}</strong> (${ventasCount} pedidos)`,
          `Cobrado hoy: <strong>${formatCurrency(cobrosTotal)}</strong>`,
        ])}
        ${devoluciones > 0 ? kpiCard("↩️ DEVOLUCIONES", "Proveedores", [
          `<strong>${devoluciones}</strong> devoluciones registradas`,
        ]) : ""}
        ${(porAutorizar > 0 || atrasadas > 0) ? kpiCard("⚠️ PENDIENTES", "Requieren atención", [
          porAutorizar > 0 ? `<span style="color:#dc2626"><strong>${porAutorizar}</strong> pedidos por autorizar</span>` : "",
          atrasadas > 0 ? `<span style="color:#dc2626"><strong>${atrasadas}</strong> entregas de proveedor atrasadas</span>` : "",
        ].filter(Boolean)) : ""}
        <p style="color:#374151;font-size:14px;margin:25px 0 0">Atentamente,<br><strong>Sistema ALMASA</strong></p>`
      );

      // Enviar a admin emails
      const { data: adminEmails } = await supabase
        .from("user_roles")
        .select("user_id, profiles:user_id(email)")
        .eq("role", "admin");

      const emails = ((adminEmails as any[]) || [])
        .map((u: any) => u.profiles?.email)
        .filter(Boolean);

      if (emails.length > 0) {
        await supabase.functions.invoke("gmail-api", {
          body: {
            action: "send",
            email: "compras@almasa.com.mx",
            to: emails[0],
            cc: emails.slice(1).join(",") || undefined,
            subject: `📊 Resumen del día — ${fecha}`,
            body: htmlBody,
          },
        });
        console.log("Email de resumen enviado a:", emails.join(", "));
      }
    } catch (emailErr) {
      console.error("Error enviando email de resumen:", emailErr);
    }

    return new Response(
      JSON.stringify({ success: true, datos }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error en resumen-diario:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
