import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { PACFactory } from "../_shared/pac-factory.ts";
import { PACConfig } from "../_shared/pac-types.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { carta_porte_id, motivo, uuid_sustituto } = await req.json();

    if (!carta_porte_id || !motivo) {
      return respond(400, { exitoso: false, error: "carta_porte_id y motivo requeridos" });
    }

    if (!["01", "02", "03", "04"].includes(motivo)) {
      return respond(400, { exitoso: false, error: "Motivo inválido. Use 01, 02, 03 o 04" });
    }

    if (motivo === "01" && !uuid_sustituto) {
      return respond(400, { exitoso: false, error: "Motivo 01 requiere uuid_sustituto" });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: cp } = await supabase
      .from("cartas_porte")
      .select("*")
      .eq("id", carta_porte_id)
      .single();

    if (!cp) return respond(404, { exitoso: false, error: "Carta Porte no encontrada" });
    if (cp.estado !== "timbrado") {
      return respond(400, { exitoso: false, error: `Solo timbradas pueden cancelarse. Estado: ${cp.estado}` });
    }
    if (!cp.uuid_sat) return respond(400, { exitoso: false, error: "Sin UUID SAT" });

    const { data: pacConfig } = await supabase
      .from("pac_configurations")
      .select("*")
      .eq("activo", true)
      .maybeSingle();

    if (!pacConfig) return respond(400, { exitoso: false, error: "No hay PAC configurado" });

    const provider = PACFactory.createProvider(pacConfig.pac_provider_id);
    const config: PACConfig = {
      providerId: pacConfig.pac_provider_id,
      modo: pacConfig.modo,
      rfcEmisor: pacConfig.rfc_emisor,
      razonSocialEmisor: pacConfig.razon_social_emisor,
      regimenFiscalEmisor: pacConfig.regimen_fiscal_emisor,
      credentials: {
        username: pacConfig.username || undefined,
        password: pacConfig.password_encrypted || undefined,
        apiKey: pacConfig.api_key || undefined,
      },
    };

    const startTime = Date.now();
    const result = await provider.cancelar(config, {
      uuid: cp.uuid_sat,
      motivo,
      uuidSustituto: uuid_sustituto,
    });
    const duracion = Date.now() - startTime;

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      userId = user?.id || null;
    }

    // Log
    await supabase.from("pac_transacciones_log").insert({
      carta_porte_id: cp.id,
      pac_provider_id: pacConfig.pac_provider_id,
      tipo_operacion: "cancelar",
      request_payload: { uuid: cp.uuid_sat, motivo, uuid_sustituto },
      response_payload: result,
      exitoso: result.exitoso,
      codigo_error: result.codigoError || null,
      mensaje_error: result.mensajeError || null,
      duracion_ms: duracion,
      created_by: userId,
    });

    if (result.exitoso) {
      await supabase
        .from("cartas_porte")
        .update({
          estado: "cancelado",
          uuid_cancelacion: result.uuidCancelacion,
          fecha_cancelacion: result.fechaCancelacion || new Date().toISOString(),
          motivo_cancelacion: motivo,
        })
        .eq("id", cp.id);

      await supabase.from("cp_eventos").insert({
        carta_porte_id: cp.id,
        tipo_evento: "cancelado",
        usuario_id: userId,
        detalle: { motivo, uuid_cancelacion: result.uuidCancelacion },
      });

      return respond(200, { exitoso: true, uuid_cancelacion: result.uuidCancelacion });
    } else {
      await supabase.from("cp_eventos").insert({
        carta_porte_id: cp.id,
        tipo_evento: "cancelacion_fallida",
        usuario_id: userId,
        detalle: { motivo, error: result.mensajeError },
      });

      return respond(400, { exitoso: false, error: result.mensajeError || "Error de cancelación" });
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
