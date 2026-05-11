import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { carta_porte_id } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: cp } = await supabase
      .from("cartas_porte")
      .select("*")
      .eq("id", carta_porte_id)
      .single();

    if (!cp) {
      return new Response(
        JSON.stringify({ exitoso: false, error: "No encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const [ubicRes, mercRes, autoRes, figRes] = await Promise.all([
      supabase.from("cp_ubicaciones").select("*").eq("carta_porte_id", carta_porte_id).order("orden_secuencia"),
      supabase.from("cp_mercancias").select("*").eq("carta_porte_id", carta_porte_id),
      supabase.from("cp_autotransporte").select("*").eq("carta_porte_id", carta_porte_id).maybeSingle(),
      supabase.from("cp_figura_transporte").select("*").eq("carta_porte_id", carta_porte_id),
    ]);

    const ubicaciones = ubicRes.data || [];
    const mercancias = mercRes.data || [];
    const auto = autoRes.data;
    const figuras = figRes.data || [];
    const totalPeso = mercancias.reduce((s: number, m: any) => s + (parseFloat(m.peso_en_kg) || 0), 0);

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Carta Porte BORRADOR - ${cp.folio}</title>
  <style>
    body{font-family:'Inter',Arial,sans-serif;padding:20px;color:#333;position:relative;font-size:12px}
    .watermark{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-45deg);font-size:90px;color:rgba(196,30,58,0.08);font-weight:bold;z-index:-1;pointer-events:none}
    h1{color:#c41e3a;border-bottom:2px solid #c41e3a;padding-bottom:5px;font-size:18px}
    .header{display:flex;justify-content:space-between;align-items:flex-start}
    .section{margin-top:16px;padding:10px;border:1px solid #ddd;border-radius:5px}
    .section h3{margin:0 0 8px 0;color:#c41e3a;font-size:13px}
    table{width:100%;border-collapse:collapse;margin-top:6px}
    th,td{padding:5px 8px;border:1px solid #ddd;text-align:left;font-size:11px}
    th{background:#f5f5f5;font-weight:600}
    .badge{display:inline-block;padding:2px 8px;background:#fef3c7;color:#92400e;border-radius:4px;font-size:10px;font-weight:600}
    .total{font-weight:bold;background:#fef2f2;padding:4px 8px;margin-top:6px;display:inline-block;border-radius:3px}
    .footer{margin-top:24px;text-align:center;color:#999;font-size:9px;border-top:1px solid #eee;padding-top:10px}
  </style>
</head>
<body>
  <div class="watermark">BORRADOR</div>
  <div class="header">
    <div>
      <h1>Carta Porte 3.1</h1>
      <p><strong>Folio:</strong> ${cp.folio}</p>
      <p><strong>IdCCP:</strong> ${cp.id_ccp}</p>
      <p><strong>Tipo CFDI:</strong> ${cp.tipo_cfdi === "T" ? "Traslado" : "Ingreso"}</p>
      <span class="badge">${cp.estado.toUpperCase()}</span>
    </div>
    <div style="text-align:right">
      <p><strong>ALMASA</strong></p>
      <p style="font-size:10px">Abarrotes La Manita SA de CV</p>
      <p style="font-size:10px">${new Date(cp.created_at).toLocaleDateString("es-MX")}</p>
    </div>
  </div>

  <div class="section">
    <h3>Ubicaciones</h3>
    <table>
      <tr><th>Tipo</th><th>RFC</th><th>Nombre</th><th>CP</th><th>Estado</th><th>Fecha/Hora</th><th>Dist. (km)</th></tr>
      ${ubicaciones.map((u: any) => `<tr>
        <td>${u.tipo} #${u.orden_secuencia}</td>
        <td>${u.rfc}</td>
        <td>${u.nombre_remitente_destinatario || "-"}</td>
        <td>${u.codigo_postal}</td>
        <td>${u.estado || "-"}</td>
        <td>${u.fecha_hora_estimada ? new Date(u.fecha_hora_estimada).toLocaleString("es-MX") : "-"}</td>
        <td>${u.distancia_recorrida || "-"}</td>
      </tr>`).join("")}
    </table>
  </div>

  <div class="section">
    <h3>Mercancias (${mercancias.length})</h3>
    <table>
      <tr><th>Descripcion</th><th>BienesTransp</th><th>Cant.</th><th>Unidad</th><th>Peso (kg)</th><th>Mat. Pel.</th></tr>
      ${mercancias.map((m: any) => `<tr>
        <td>${m.descripcion}</td>
        <td>${m.bienes_transp}</td>
        <td>${m.cantidad}</td>
        <td>${m.clave_unidad}</td>
        <td>${m.peso_en_kg}</td>
        <td>${m.material_peligroso ? "SI" : "No"}</td>
      </tr>`).join("")}
    </table>
    <div class="total">Peso bruto total: ${totalPeso.toFixed(2)} kg</div>
  </div>

  ${auto ? `<div class="section">
    <h3>Autotransporte</h3>
    <table>
      <tr><th>Permiso</th><th>No. Permiso</th><th>Config</th><th>Placa</th><th>Año</th><th>Peso Bruto</th></tr>
      <tr>
        <td>${auto.perm_sct}</td>
        <td>${auto.num_permiso_sct}</td>
        <td>${auto.config_vehicular}</td>
        <td>${auto.placa_vm}</td>
        <td>${auto.anio_modelo_vm}</td>
        <td>${auto.peso_bruto_vehicular || "-"} kg</td>
      </tr>
    </table>
    <p style="margin-top:6px"><strong>Seguro RC:</strong> ${auto.asegura_resp_civil} / Poliza: ${auto.poliza_resp_civil}</p>
  </div>` : ""}

  ${figuras.length ? `<div class="section">
    <h3>Figura del Transporte</h3>
    <table>
      <tr><th>Tipo</th><th>Nombre</th><th>RFC</th><th>Licencia</th></tr>
      ${figuras.map((f: any) => `<tr>
        <td>${f.tipo_figura}</td>
        <td>${f.nombre_figura}</td>
        <td>${f.rfc_figura}</td>
        <td>${f.num_licencia || "-"}</td>
      </tr>`).join("")}
    </table>
  </div>` : ""}

  <div class="footer">
    BORRADOR - NO tiene validez fiscal hasta ser timbrado por un PAC autorizado por SAT.<br>
    Generado: ${new Date().toLocaleString("es-MX")}
  </div>
</body>
</html>`;

    return new Response(
      JSON.stringify({ exitoso: true, html, es_borrador: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ exitoso: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
