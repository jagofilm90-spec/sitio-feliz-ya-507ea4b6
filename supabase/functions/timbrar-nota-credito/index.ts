import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { PACFactory } from "../_shared/pac-factory.ts";
import { PACConfig } from "../_shared/pac-types.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { nota_credito_id } = await req.json();
    if (!nota_credito_id) return respond(400, { error: "nota_credito_id requerido" });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: nc } = await supabase.from("notas_credito").select("*, facturas:factura_original_id(cfdi_uuid, folio), clientes:cliente_id(nombre, razon_social, rfc)").eq("id", nota_credito_id).single();
    if (!nc) return respond(404, { error: "Nota de crédito no encontrada" });
    if (nc.cfdi_estado === "timbrada") return respond(400, { error: "Ya está timbrada" });

    const { data: pacConfig } = await supabase.from("pac_configurations").select("*").eq("activo", true).maybeSingle();
    if (!pacConfig) return respond(400, { error: "No hay PAC configurado" });

    // Build CFDI tipo E (Egreso)
    const cfdiPayload = {
      Receiver: {
        Rfc: nc.clientes?.rfc || "XAXX010101000",
        Name: nc.clientes?.razon_social || nc.clientes?.nombre || "",
        CfdiUse: nc.uso_cfdi || "G02",
        FiscalRegime: "616",
        TaxZipCode: "83000",
      },
      CfdiType: "E",
      PaymentForm: nc.forma_pago || "99",
      PaymentMethod: nc.metodo_pago || "PUE",
      Currency: "MXN",
      Folio: nc.folio,
      // Relación con factura original
      Relations: nc.facturas?.cfdi_uuid ? {
        Type: "01",
        Cfdis: [{ Uuid: nc.facturas.cfdi_uuid }],
      } : undefined,
      Items: [{
        ProductCode: "84111506",
        Description: `Nota de crédito - ${nc.motivo || nc.tipo}`,
        Quantity: 1,
        UnitCode: "ACT",
        UnitPrice: nc.subtotal,
        Subtotal: nc.subtotal,
        Total: nc.total,
        TaxObject: "02",
        Taxes: [{
          Name: "IVA",
          Rate: 0.16,
          Total: nc.impuestos || 0,
          Base: nc.subtotal,
          IsRetention: false,
        }],
      }],
    };

    const provider = PACFactory.createProvider(pacConfig.pac_provider_id);
    const config: PACConfig = {
      providerId: pacConfig.pac_provider_id,
      modo: pacConfig.modo,
      rfcEmisor: pacConfig.rfc_emisor,
      razonSocialEmisor: pacConfig.razon_social_emisor,
      regimenFiscalEmisor: pacConfig.regimen_fiscal_emisor,
      credentials: { username: pacConfig.username, password: pacConfig.password_encrypted },
    };

    const startTime = Date.now();
    const result = await provider.timbrar(config, { cartaPorteId: nc.id, xmlSinTimbrar: JSON.stringify(cfdiPayload) });
    const duracion = Date.now() - startTime;

    await supabase.from("pac_transacciones_log").insert({
      nota_credito_id: nc.id,
      pac_provider_id: pacConfig.pac_provider_id,
      tipo_operacion: "timbrar_nota_credito",
      request_payload: { folio: nc.folio },
      response_payload: result.rawResponse || {},
      exitoso: result.exitoso,
      codigo_error: result.codigoError,
      mensaje_error: result.mensajeError,
      duracion_ms: duracion,
    });

    if (result.exitoso && result.uuid) {
      await supabase.from("notas_credito").update({
        cfdi_uuid: result.uuid,
        cfdi_estado: "timbrada",
        cfdi_fecha_timbrado: result.fechaTimbrado || new Date().toISOString(),
      }).eq("id", nc.id);
      return respond(200, { exitoso: true, uuid: result.uuid });
    } else {
      await supabase.from("notas_credito").update({ cfdi_error: result.mensajeError, cfdi_estado: "error" }).eq("id", nc.id);
      return respond(400, { exitoso: false, error: result.mensajeError });
    }
  } catch (error) {
    return respond(500, { error: error.message });
  }
});

function respond(s: number, b: any) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
