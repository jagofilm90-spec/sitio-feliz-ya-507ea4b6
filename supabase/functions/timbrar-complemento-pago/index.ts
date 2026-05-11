import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { PACFactory } from "../_shared/pac-factory.ts";
import { PACConfig } from "../_shared/pac-types.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { complemento_id } = await req.json();
    if (!complemento_id) return respond(400, { error: "complemento_id requerido" });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: rep } = await supabase.from("complementos_pago").select("*, clientes:cliente_id(nombre, razon_social, rfc)").eq("id", complemento_id).single();
    if (!rep) return respond(404, { error: "Complemento no encontrado" });
    if (rep.cfdi_estado === "timbrada") return respond(400, { error: "Ya timbrado" });

    // Load doctos relacionados
    const { data: doctos } = await supabase.from("complementos_pago_doctos").select("*").eq("complemento_id", complemento_id);

    const { data: pacConfig } = await supabase.from("pac_configurations").select("*").eq("activo", true).maybeSingle();
    if (!pacConfig) return respond(400, { error: "No hay PAC configurado" });

    // Build CFDI tipo P with Pago20 complement
    const cfdiPayload = {
      Receiver: {
        Rfc: rep.clientes?.rfc || "XAXX010101000",
        Name: rep.clientes?.razon_social || rep.clientes?.nombre || "",
        CfdiUse: "CP01",
        FiscalRegime: "616",
        TaxZipCode: "83000",
      },
      CfdiType: "P",
      Currency: "XXX",
      Folio: rep.folio,
      Items: [{
        ProductCode: "84111506",
        Description: "Pago",
        Quantity: 1,
        UnitCode: "ACT",
        UnitPrice: 0,
        Subtotal: 0,
        Total: 0,
        TaxObject: "01",
      }],
      Complement: {
        Payments20: [{
          PaymentDate: rep.fecha_pago,
          PaymentForm: rep.forma_pago,
          Currency: rep.moneda || "MXN",
          Amount: rep.monto,
          OperationNumber: rep.num_operacion,
          RfcIssuerAccount: rep.rfc_emisor_cta,
          IssuerBankName: rep.nom_banco_emisor,
          IssuerAccount: rep.cuenta_emisor,
          RelatedDocuments: (doctos || []).map((d: any) => ({
            Uuid: d.uuid_factura,
            Serie: d.serie,
            Folio: d.folio,
            PartialityNumber: d.num_parcialidad,
            PreviousBalanceAmount: d.imp_saldo_ant,
            AmountPaid: d.imp_pagado,
            ImpSaldoInsoluto: d.imp_saldo_insoluto,
            Currency: "MXN",
            PaymentMethod: "PUE",
          })),
        }],
      },
    };

    const provider = PACFactory.createProvider(pacConfig.pac_provider_id);
    const config: PACConfig = {
      providerId: pacConfig.pac_provider_id, modo: pacConfig.modo,
      rfcEmisor: pacConfig.rfc_emisor, razonSocialEmisor: pacConfig.razon_social_emisor,
      regimenFiscalEmisor: pacConfig.regimen_fiscal_emisor,
      credentials: { username: pacConfig.username, password: pacConfig.password_encrypted },
    };

    const startTime = Date.now();
    const result = await provider.timbrar(config, { cartaPorteId: rep.id, xmlSinTimbrar: JSON.stringify(cfdiPayload) });
    const duracion = Date.now() - startTime;

    await supabase.from("pac_transacciones_log").insert({
      complemento_pago_id: rep.id,
      pac_provider_id: pacConfig.pac_provider_id,
      tipo_operacion: "timbrar_rep",
      request_payload: { folio: rep.folio },
      response_payload: result.rawResponse || {},
      exitoso: result.exitoso,
      duracion_ms: duracion,
    });

    if (result.exitoso && result.uuid) {
      await supabase.from("complementos_pago").update({
        cfdi_uuid: result.uuid, cfdi_estado: "timbrada",
        cfdi_fecha_timbrado: result.fechaTimbrado || new Date().toISOString(),
      }).eq("id", rep.id);
      return respond(200, { exitoso: true, uuid: result.uuid });
    } else {
      await supabase.from("complementos_pago").update({ cfdi_error: result.mensajeError, cfdi_estado: "error" }).eq("id", rep.id);
      return respond(400, { exitoso: false, error: result.mensajeError });
    }
  } catch (error) {
    return respond(500, { error: error.message });
  }
});

function respond(s: number, b: any) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
