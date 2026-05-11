import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { entrega_id } = await req.json();
    if (!entrega_id) return respond(400, { error: "entrega_id requerido" });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Load entrega with pedido + cliente + detalles
    const { data: entrega } = await supabase
      .from("entregas")
      .select(`
        id, orden_entrega, notas,
        pedidos:pedido_id(
          id, folio, fecha_pedido,
          clientes:cliente_id(nombre, razon_social, rfc, direccion, telefono),
          pedidos_detalles(
            cantidad,
            productos:producto_id(nombre, codigo, unidad)
          )
        ),
        rutas:ruta_id(folio, fecha_ruta)
      `)
      .eq("id", entrega_id)
      .single();

    if (!entrega) return respond(404, { error: "Entrega no encontrada" });

    const pedido = entrega.pedidos as any;
    const cliente = pedido?.clientes;
    const detalles = pedido?.pedidos_detalles || [];
    const ruta = entrega.rutas as any;

    // Generate HTML for the physical sheet
    const html = buildHojaFisicaHTML({
      pedidoFolio: pedido?.folio || "—",
      rutaFolio: ruta?.folio || "—",
      fechaRuta: ruta?.fecha_ruta || new Date().toISOString().slice(0, 10),
      clienteNombre: cliente?.razon_social || cliente?.nombre || "—",
      clienteRFC: cliente?.rfc || "—",
      clienteDireccion: cliente?.direccion || "—",
      clienteTelefono: cliente?.telefono || "—",
      ordenEntrega: entrega.orden_entrega,
      detalles: detalles.map((d: any) => ({
        producto: d.productos?.nombre || "—",
        codigo: d.productos?.codigo || "—",
        cantidad: d.cantidad,
        unidad: d.productos?.unidad || "pz",
      })),
    });

    // Upload HTML as a "PDF-ready" file to storage
    const encoder = new TextEncoder();
    const fileName = `hoja-${pedido?.folio || entrega_id}.html`;
    await supabase.storage
      .from("hojas-fisicas")
      .upload(`pdfs/${fileName}`, encoder.encode(html), {
        contentType: "text/html",
        upsert: true,
      });

    const { data: urlData } = supabase.storage
      .from("hojas-fisicas")
      .getPublicUrl(`pdfs/${fileName}`);

    // Create hoja_fisica record
    const { data: hoja, error: hojaErr } = await supabase
      .from("hojas_fisicas")
      .insert({ entrega_id, pdf_url: urlData.publicUrl })
      .select()
      .single();

    if (hojaErr) throw hojaErr;

    // Register conciliation event
    await supabase.from("eventos_conciliacion").insert({
      entrega_id,
      momento_id: "sistema_imprime_hoja",
      notas: `Hoja física generada: ${hoja.pdf_folio}`,
      metadata: { hoja_fisica_id: hoja.id, pdf_url: urlData.publicUrl },
    });

    return respond(200, {
      exitoso: true,
      hoja_fisica_id: hoja.id,
      pdf_folio: hoja.pdf_folio,
      pdf_url: urlData.publicUrl,
      html,
    });
  } catch (error) {
    return respond(500, { error: error.message });
  }
});

function respond(status: number, body: any) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface HojaData {
  pedidoFolio: string;
  rutaFolio: string;
  fechaRuta: string;
  clienteNombre: string;
  clienteRFC: string;
  clienteDireccion: string;
  clienteTelefono: string;
  ordenEntrega: number;
  detalles: { producto: string; codigo: string; cantidad: number; unidad: string }[];
}

function buildHojaFisicaHTML(data: HojaData): string {
  const rows = data.detalles
    .map(
      (d, i) =>
        `<tr>
      <td>${i + 1}</td>
      <td>${d.codigo}</td>
      <td>${d.producto}</td>
      <td style="text-align:center">${d.cantidad}</td>
      <td style="text-align:center">${d.unidad}</td>
      <td style="width:80px"></td>
    </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Hoja Entrega ${data.pedidoFolio}</title>
<style>
  @page { size: letter; margin: 15mm; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #222; margin: 0; padding: 15px; }
  .header { display: flex; justify-content: space-between; border-bottom: 3px solid #c41e3a; padding-bottom: 8px; margin-bottom: 10px; }
  .logo { font-size: 20px; font-weight: bold; color: #c41e3a; }
  .folio { font-size: 14px; font-weight: bold; text-align: right; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
  .info-box { border: 1px solid #ddd; padding: 6px 8px; border-radius: 3px; }
  .info-box label { font-size: 9px; color: #888; display: block; }
  .info-box span { font-size: 11px; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
  th { background: #c41e3a; color: white; padding: 6px; font-size: 10px; text-align: left; }
  td { padding: 5px 6px; border: 1px solid #ddd; font-size: 10px; }
  tr:nth-child(even) { background: #fafafa; }
  .stamp-area { border: 2px dashed #c41e3a; border-radius: 8px; padding: 15px; text-align: center; min-height: 100px; margin-bottom: 12px; }
  .stamp-area h4 { color: #c41e3a; margin: 0 0 5px 0; font-size: 12px; }
  .stamp-area p { color: #999; font-size: 9px; margin: 0; }
  .sig-row { display: flex; gap: 15px; margin-bottom: 12px; }
  .sig-box { flex: 1; border: 1px solid #ddd; border-radius: 5px; padding: 10px; min-height: 60px; }
  .sig-box label { font-size: 9px; color: #888; display: block; margin-bottom: 30px; }
  .sig-box .line { border-top: 1px solid #333; margin-top: 5px; }
  .obs-area { border: 1px solid #ddd; border-radius: 5px; padding: 10px; min-height: 80px; margin-bottom: 10px; }
  .obs-area label { font-size: 9px; color: #888; display: block; margin-bottom: 5px; }
  .obs-lines { border-bottom: 1px dotted #ccc; height: 20px; margin-bottom: 2px; }
  .footer { text-align: center; font-size: 8px; color: #999; border-top: 1px solid #eee; padding-top: 8px; }
  .important { background: #fff3cd; border: 1px solid #ffc107; padding: 6px; border-radius: 3px; font-size: 9px; text-align: center; margin-bottom: 10px; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">ALMASA</div>
      <div style="font-size:9px;color:#666">Abarrotes La Manita SA de CV</div>
    </div>
    <div class="folio">
      <div>HOJA DE ENTREGA</div>
      <div style="font-size:11px;color:#666">Pedido: ${data.pedidoFolio}</div>
      <div style="font-size:11px;color:#666">Ruta: ${data.rutaFolio}</div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-box"><label>Cliente</label><span>${data.clienteNombre}</span></div>
    <div class="info-box"><label>RFC</label><span>${data.clienteRFC}</span></div>
    <div class="info-box"><label>Dirección</label><span>${data.clienteDireccion}</span></div>
    <div class="info-box"><label>Fecha Ruta</label><span>${data.fechaRuta}</span></div>
  </div>

  <table>
    <thead>
      <tr><th>#</th><th>Código</th><th>Producto</th><th>Cant.</th><th>Unidad</th><th>Recibido</th></tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <div class="important">
    INSTRUCCIONES: Sellar, firmar y anotar cualquier observación. Devolver al chofer.
  </div>

  <div class="stamp-area">
    <h4>SELLO DEL CLIENTE</h4>
    <p>Colocar sello aquí</p>
  </div>

  <div class="sig-row">
    <div class="sig-box">
      <label>Firma del cliente (quien recibe)</label>
      <div class="line"></div>
      <div style="font-size:8px;color:#999;text-align:center;margin-top:3px">Nombre y firma</div>
    </div>
    <div class="sig-box">
      <label>Firma del chofer (quien entrega)</label>
      <div class="line"></div>
      <div style="font-size:8px;color:#999;text-align:center;margin-top:3px">Nombre y firma</div>
    </div>
  </div>

  <div class="obs-area">
    <label>OBSERVACIONES (anotar cualquier faltante, daño o comentario)</label>
    <div class="obs-lines"></div>
    <div class="obs-lines"></div>
    <div class="obs-lines"></div>
    <div class="obs-lines"></div>
  </div>

  <div class="footer">
    Documento generado por ALMASA-OS · Entrega #${data.ordenEntrega} · ${new Date().toLocaleString("es-MX")}
    <br>Este documento debe ser sellado y firmado por el cliente al momento de la entrega.
  </div>
</body>
</html>`;
}
