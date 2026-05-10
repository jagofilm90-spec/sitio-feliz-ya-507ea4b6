import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface ValidationResult {
  valida: boolean;
  errores: string[];
  warnings: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { carta_porte_id } = await req.json();
    if (!carta_porte_id) {
      return new Response(JSON.stringify({ error: "carta_porte_id requerido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch carta porte principal
    const { data: cp, error: cpErr } = await supabase
      .from("cartas_porte")
      .select("*")
      .eq("id", carta_porte_id)
      .single();

    if (cpErr || !cp) {
      return new Response(JSON.stringify({ error: "Carta Porte no encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch sub-documents
    const [ubicaciones, mercancias, autotransporte, figuras] = await Promise.all([
      supabase.from("cp_ubicaciones").select("*").eq("carta_porte_id", carta_porte_id),
      supabase.from("cp_mercancias").select("*").eq("carta_porte_id", carta_porte_id),
      supabase.from("cp_autotransporte").select("*").eq("carta_porte_id", carta_porte_id).maybeSingle(),
      supabase.from("cp_figura_transporte").select("*").eq("carta_porte_id", carta_porte_id),
    ]);

    const ubics = ubicaciones.data || [];
    const mercs = mercancias.data || [];
    const auto = autotransporte.data;
    const figs = figuras.data || [];

    // ═══════════════════════════════════════════════════
    // 12 REGLAS DE VALIDACIÓN SAT CARTA PORTE 3.1
    // ═══════════════════════════════════════════════════

    const errores: string[] = [];
    const warnings: string[] = [];

    // REGLA 1: Debe tener al menos 1 origen
    const origenes = ubics.filter((u: any) => u.tipo === "Origen");
    if (origenes.length === 0) {
      errores.push("R01: Se requiere al menos una ubicación de tipo Origen");
    }

    // REGLA 2: Debe tener al menos 1 destino
    const destinos = ubics.filter((u: any) => u.tipo === "Destino");
    if (destinos.length === 0) {
      errores.push("R02: Se requiere al menos una ubicación de tipo Destino");
    }

    // REGLA 3: Todas las ubicaciones deben tener RFC y CP
    for (const u of ubics) {
      if (!u.rfc) errores.push(`R03: Ubicación #${u.orden_secuencia} (${u.tipo}) sin RFC`);
      if (!u.codigo_postal) errores.push(`R03: Ubicación #${u.orden_secuencia} (${u.tipo}) sin código postal`);
      if (!u.fecha_hora_estimada) errores.push(`R03: Ubicación #${u.orden_secuencia} (${u.tipo}) sin fecha/hora estimada`);
    }

    // REGLA 4: Debe tener al menos 1 mercancía
    if (mercs.length === 0) {
      errores.push("R04: Se requiere al menos una mercancía");
    }

    // REGLA 5: Cada mercancía debe tener BienesTransp, cantidad, peso, clave_unidad
    for (let i = 0; i < mercs.length; i++) {
      const m = mercs[i];
      if (!m.bienes_transp) errores.push(`R05: Mercancía ${i + 1} sin clave BienesTransp`);
      if (!m.cantidad || m.cantidad <= 0) errores.push(`R05: Mercancía ${i + 1} sin cantidad válida`);
      if (!m.peso_en_kg || m.peso_en_kg <= 0) errores.push(`R05: Mercancía ${i + 1} sin peso válido`);
      if (!m.clave_unidad) errores.push(`R05: Mercancía ${i + 1} sin clave unidad`);
      if (m.material_peligroso && !m.cve_material_peligroso) {
        errores.push(`R05: Mercancía ${i + 1} marcada como peligrosa sin clave de material`);
      }
    }

    // REGLA 6: Debe tener nodo Autotransporte
    if (!auto) {
      errores.push("R06: Se requiere información de Autotransporte");
    }

    // REGLA 7: Autotransporte campos obligatorios
    if (auto) {
      if (!auto.perm_sct) errores.push("R07: Autotransporte sin tipo de permiso SCT");
      if (!auto.num_permiso_sct) errores.push("R07: Autotransporte sin número de permiso SCT");
      if (!auto.config_vehicular) errores.push("R07: Autotransporte sin configuración vehicular");
      if (!auto.placa_vm) errores.push("R07: Autotransporte sin placa");
      if (!auto.anio_modelo_vm) errores.push("R07: Autotransporte sin año modelo");
      if (!auto.asegura_resp_civil) errores.push("R07: Autotransporte sin aseguradora responsabilidad civil");
      if (!auto.poliza_resp_civil) errores.push("R07: Autotransporte sin póliza responsabilidad civil");
    }

    // REGLA 8: Debe tener al menos 1 Figura del Transporte
    if (figs.length === 0) {
      errores.push("R08: Se requiere al menos una Figura del Transporte (operador)");
    }

    // REGLA 9: Figura tipo 01 (Operador) requiere licencia
    for (const f of figs) {
      if (!f.rfc_figura) errores.push(`R09: Figura ${f.nombre_figura || ""} sin RFC`);
      if (!f.nombre_figura) errores.push(`R09: Figura sin nombre`);
      if (f.tipo_figura === "01" && !f.num_licencia) {
        errores.push("R09: Operador (tipo 01) requiere número de licencia");
      }
    }

    // REGLA 10: Peso total mercancías > 0
    const pesoTotal = mercs.reduce((acc: number, m: any) => acc + (parseFloat(m.peso_en_kg) || 0), 0);
    if (mercs.length > 0 && pesoTotal <= 0) {
      errores.push("R10: El peso total de mercancías debe ser mayor a 0");
    }

    // REGLA 11: RFC formato válido (persona física 13 chars, moral 12 chars)
    const rfcRegex = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;
    for (const u of ubics) {
      if (u.rfc && !rfcRegex.test(u.rfc) && u.rfc !== "XAXX010101000" && u.rfc !== "XEXX010101000") {
        warnings.push(`R11: RFC "${u.rfc}" en ubicación #${u.orden_secuencia} puede no ser válido`);
      }
    }
    for (const f of figs) {
      if (f.rfc_figura && !rfcRegex.test(f.rfc_figura)) {
        warnings.push(`R11: RFC "${f.rfc_figura}" del operador puede no ser válido`);
      }
    }

    // REGLA 12: Código postal formato 5 dígitos
    for (const u of ubics) {
      if (u.codigo_postal && !/^\d{5}$/.test(u.codigo_postal)) {
        errores.push(`R12: CP "${u.codigo_postal}" en ubicación #${u.orden_secuencia} debe ser de 5 dígitos`);
      }
    }

    // ═══════════════════════════════════════════════════
    // WARNINGS (no bloquean)
    // ═══════════════════════════════════════════════════

    if (mercs.length > 0 && pesoTotal > 0 && auto?.peso_bruto_vehicular) {
      if (pesoTotal > parseFloat(auto.peso_bruto_vehicular)) {
        warnings.push(`Peso mercancías (${pesoTotal.toFixed(0)}kg) excede peso bruto vehicular (${auto.peso_bruto_vehicular}kg)`);
      }
    }

    if (!cp.total_dist_recorrida) {
      warnings.push("Distancia total recorrida no capturada en la carta porte");
    }

    // ═══════════════════════════════════════════════════
    // UPDATE ESTADO
    // ═══════════════════════════════════════════════════

    const valida = errores.length === 0;

    // Update carta porte estado + errores
    await supabase
      .from("cartas_porte")
      .update({
        estado: valida ? "validado" : "borrador",
        errores_validacion: errores.length > 0 ? errores : [],
        total_dist_recorrida: valida && !cp.total_dist_recorrida
          ? destinos.reduce((acc: number, d: any) => acc + (parseFloat(d.distancia_recorrida) || 0), 0) || null
          : cp.total_dist_recorrida,
      })
      .eq("id", carta_porte_id);

    // Registrar evento de auditoría
    const authHeader = req.headers.get("Authorization");
    let userId = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id;
    }

    await supabase.from("cp_eventos").insert({
      carta_porte_id,
      tipo_evento: valida ? "validacion_exitosa" : "validacion_fallida",
      usuario_id: userId,
      detalle: { errores_count: errores.length, warnings_count: warnings.length, peso_total: pesoTotal },
    });

    const result: ValidationResult = { valida, errores, warnings };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
