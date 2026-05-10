import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { PACFactory } from "../_shared/pac-factory.ts";
import { buildCFDITrasladoXML, CartaPorteData } from "../_shared/cfdi-xml-builder.ts";
import { PACConfig } from "../_shared/pac-types.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { carta_porte_id } = await req.json();
    if (!carta_porte_id) {
      return respond(400, { exitoso: false, error: "carta_porte_id requerido" });
    }

    // 1. Carta Porte principal
    const { data: cp, error: cpErr } = await supabase
      .from("cartas_porte")
      .select("*")
      .eq("id", carta_porte_id)
      .single();

    if (cpErr || !cp) return respond(404, { exitoso: false, error: "Carta Porte no encontrada" });

    if (cp.estado !== "validado") {
      return respond(400, {
        exitoso: false,
        error: `Solo cartas porte validadas pueden timbrarse. Estado actual: ${cp.estado}`,
      });
    }

    // 2. Sub-documentos
    const [ubicRes, mercRes, autoRes, figRes] = await Promise.all([
      supabase.from("cp_ubicaciones").select("*").eq("carta_porte_id", carta_porte_id).order("orden_secuencia"),
      supabase.from("cp_mercancias").select("*").eq("carta_porte_id", carta_porte_id),
      supabase.from("cp_autotransporte").select("*").eq("carta_porte_id", carta_porte_id).maybeSingle(),
      supabase.from("cp_figura_transporte").select("*").eq("carta_porte_id", carta_porte_id),
    ]);

    const ubics = ubicRes.data || [];
    const mercs = mercRes.data || [];
    const auto = autoRes.data;
    const figs = figRes.data || [];

    if (!auto || figs.length === 0 || mercs.length === 0 || ubics.length === 0) {
      return respond(400, { exitoso: false, error: "Datos incompletos. Revisa wizard." });
    }

    // 3. Config PAC activa
    const { data: pacConfig } = await supabase
      .from("pac_configurations")
      .select("*")
      .eq("activo", true)
      .maybeSingle();

    if (!pacConfig) {
      return respond(400, {
        exitoso: false,
        error: "No hay PAC configurado. Ve a Configuración → PAC.",
      });
    }

    // 4. Construir XML
    const cartaPorteData: CartaPorteData = {
      folio: cp.folio,
      idCCP: cp.id_ccp,
      fecha: new Date().toISOString().slice(0, 19),
      emisor: {
        rfc: pacConfig.rfc_emisor,
        nombre: pacConfig.razon_social_emisor,
        regimenFiscal: pacConfig.regimen_fiscal_emisor,
        codigoPostal: "83000", // ALMASA Hermosillo
      },
      receptor: {
        rfc: "XAXX010101000",
        nombre: pacConfig.razon_social_emisor,
        domicilioFiscal: "83000",
        usoCFDI: "S01",
      },
      mercancias: mercs.map((m: any) => ({
        bienesTransp: m.bienes_transp,
        descripcion: m.descripcion,
        cantidad: parseFloat(m.cantidad),
        claveUnidad: m.clave_unidad,
        pesoEnKg: parseFloat(m.peso_en_kg),
        materialPeligroso: m.material_peligroso || false,
        cveMaterialPeligroso: m.cve_material_peligroso || undefined,
      })),
      ubicaciones: ubics.map((u: any) => ({
        tipo: u.tipo as "Origen" | "Destino",
        rfc: u.rfc,
        nombreRemitenteDestinatario: u.nombre_remitente_destinatario,
        domicilio: {
          calle: u.calle || undefined,
          numeroExterior: u.numero_exterior || undefined,
          colonia: u.colonia || undefined,
          municipio: u.municipio || undefined,
          estado: u.estado || "SON",
          pais: u.pais || "MEX",
          codigoPostal: u.codigo_postal,
        },
        fechaHoraSalidaLlegada: new Date(u.fecha_hora_estimada).toISOString().slice(0, 19),
        distanciaRecorrida: u.distancia_recorrida ? parseFloat(u.distancia_recorrida) : undefined,
      })),
      autotransporte: {
        permSCT: auto.perm_sct,
        numPermisoSCT: auto.num_permiso_sct,
        configVehicular: auto.config_vehicular,
        placaVM: auto.placa_vm,
        anioModeloVM: auto.anio_modelo_vm,
        pesoBrutoVehicular: parseFloat(auto.peso_bruto_vehicular || "0"),
        aseguradoraRC: auto.asegura_resp_civil,
        polizaRC: auto.poliza_resp_civil,
      },
      figura: {
        tipoFigura: figs[0].tipo_figura,
        rfcFigura: figs[0].rfc_figura,
        nombreFigura: figs[0].nombre_figura,
        numLicencia: figs[0].num_licencia || undefined,
      },
      totalDistRecorrida: cp.total_dist_recorrida ? parseFloat(cp.total_dist_recorrida) : undefined,
    };

    const xmlSinTimbrar = buildCFDITrasladoXML(cartaPorteData);

    // 5. Timbrar
    const provider = PACFactory.createProvider(pacConfig.pac_provider_id);
    const config: PACConfig = {
      providerId: pacConfig.pac_provider_id,
      modo: pacConfig.modo,
      rfcEmisor: pacConfig.rfc_emisor,
      razonSocialEmisor: pacConfig.razon_social_emisor,
      regimenFiscalEmisor: pacConfig.regimen_fiscal_emisor,
      credentials: {
        apiKey: pacConfig.api_key || undefined,
        apiSecret: pacConfig.api_secret || undefined,
        username: pacConfig.username || undefined,
        password: pacConfig.password_encrypted || undefined,
      },
    };

    const startTime = Date.now();
    const result = await provider.timbrar(config, { cartaPorteId: cp.id, xmlSinTimbrar });
    const duracion = Date.now() - startTime;

    // 6. Log transacción
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      userId = user?.id || null;
    }

    await supabase.from("pac_transacciones_log").insert({
      carta_porte_id: cp.id,
      pac_provider_id: pacConfig.pac_provider_id,
      tipo_operacion: "timbrar",
      request_payload: { xml_length: xmlSinTimbrar.length, folio: cp.folio },
      response_payload: result.rawResponse || {},
      exitoso: result.exitoso,
      codigo_error: result.codigoError || null,
      mensaje_error: result.mensajeError || null,
      duracion_ms: duracion,
      created_by: userId,
    });

    if (result.exitoso && result.uuid) {
      // 7. Storage XML/PDF
      let xmlUrl: string | null = null;
      let pdfUrl: string | null = null;

      if (result.xmlTimbrado) {
        const xmlPath = `${cp.folio}.xml`;
        const encoder = new TextEncoder();
        await supabase.storage
          .from("cartas-porte")
          .upload(xmlPath, encoder.encode(result.xmlTimbrado), {
            contentType: "application/xml",
            upsert: true,
          });
        const { data: urlData } = supabase.storage.from("cartas-porte").getPublicUrl(xmlPath);
        xmlUrl = urlData.publicUrl;
      }

      if (result.pdfBase64) {
        const pdfPath = `${cp.folio}.pdf`;
        const raw = atob(result.pdfBase64);
        const bytes = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
        await supabase.storage
          .from("cartas-porte")
          .upload(pdfPath, bytes, { contentType: "application/pdf", upsert: true });
        const { data: urlData } = supabase.storage.from("cartas-porte").getPublicUrl(pdfPath);
        pdfUrl = urlData.publicUrl;
      }

      // 8. Update carta porte
      await supabase
        .from("cartas_porte")
        .update({
          estado: "timbrado",
          uuid_sat: result.uuid,
          xml_url: xmlUrl,
          pdf_url: pdfUrl,
          fecha_timbrado: result.fechaTimbrado || new Date().toISOString(),
          pac_usado: pacConfig.pac_provider_id,
          pac_response: result.rawResponse,
        })
        .eq("id", cp.id);

      // 9. Auditoría
      await supabase.from("cp_eventos").insert({
        carta_porte_id: cp.id,
        tipo_evento: "timbrado_exitoso",
        usuario_id: userId,
        detalle: { uuid: result.uuid, pac: pacConfig.pac_provider_id, duracion_ms: duracion },
      });

      return respond(200, { exitoso: true, uuid: result.uuid, xmlUrl, pdfUrl });
    } else {
      // Registrar error
      await supabase.from("cp_eventos").insert({
        carta_porte_id: cp.id,
        tipo_evento: "timbrado_fallido",
        usuario_id: userId,
        detalle: { error: result.mensajeError, codigo: result.codigoError },
      });

      return respond(400, {
        exitoso: false,
        error: result.mensajeError,
        codigo: result.codigoError,
        detalles: result.detalles,
      });
    }
  } catch (error) {
    return respond(500, { exitoso: false, error: error.message });
  }
});

function respond(status: number, body: any) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
