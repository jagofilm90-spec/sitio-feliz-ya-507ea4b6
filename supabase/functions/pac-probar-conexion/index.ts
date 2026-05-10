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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get active PAC config
    const { data: pacConfig } = await supabase
      .from("pac_configurations")
      .select("*")
      .eq("activo", true)
      .maybeSingle();

    if (!pacConfig) {
      return new Response(
        JSON.stringify({ exitoso: false, mensaje: "No hay PAC configurado" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    const result = await provider.probarConexion(config);

    // Update test status
    await supabase
      .from("pac_configurations")
      .update({
        ultimo_test_conexion: new Date().toISOString(),
        ultimo_test_exitoso: result.exitoso,
        ultimo_test_mensaje: result.mensaje,
      })
      .eq("id", pacConfig.id);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ exitoso: false, mensaje: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
