import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { hoja_fisica_id, foto_url } = await req.json();
    if (!hoja_fisica_id || !foto_url) {
      return respond(400, { error: "hoja_fisica_id y foto_url requeridos" });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return respond(400, { error: "ANTHROPIC_API_KEY no configurada. Configura en Supabase → Edge Functions → Secrets." });
    }

    // Load hoja_fisica
    const { data: hoja } = await supabase
      .from("hojas_fisicas")
      .select("*, entregas:entrega_id(id, pedido_id)")
      .eq("id", hoja_fisica_id)
      .single();

    if (!hoja) return respond(404, { error: "Hoja física no encontrada" });

    // Download image for Claude Vision
    const imageResponse = await fetch(foto_url);
    if (!imageResponse.ok) {
      return respond(400, { error: "No se pudo descargar la imagen" });
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = btoa(
      String.fromCharCode(...new Uint8Array(imageBuffer))
    );

    // Determine media type
    const contentType = imageResponse.headers.get("content-type") || "image/jpeg";
    const mediaType = contentType.startsWith("image/") ? contentType : "image/jpeg";

    // Call Claude Vision API
    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: base64Image,
                },
              },
              {
                type: "text",
                text: `Esta es una fotografía de una hoja de entrega de mercancías (abarrotes mayoreo).
La hoja tiene espacios para: sello del cliente, firma del cliente, firma del chofer, y observaciones manuscritas.

Analiza la imagen y responde en JSON exacto (sin markdown):
{
  "sello_detectado": true/false,
  "sello_confianza": 0-100,
  "firma_detectada": true/false,
  "firma_confianza": 0-100,
  "observaciones_texto": "transcripción de texto manuscrito en observaciones, o vacío",
  "clasificacion": "completo" | "faltante" | "no_llego" | "otro",
  "items_faltantes": ["lista de items faltantes mencionados"] o [],
  "notas_adicionales": "cualquier detalle relevante"
}

Reglas:
- Si no hay escritura en observaciones, observaciones_texto = ""
- Si observaciones dice "recibí completo" o similar → clasificacion = "completo"
- Si menciona faltantes ("faltó X", "no llegó Y") → clasificacion = "faltante" + lista items
- Si dice "no llegó nada", "no se entregó" → clasificacion = "no_llego"
- Confianza 0-100 (100 = muy seguro)`,
              },
            ],
          },
        ],
      }),
    });

    if (!claudeResponse.ok) {
      const errText = await claudeResponse.text();
      return respond(500, { error: `Claude API error: ${claudeResponse.status} ${errText}` });
    }

    const claudeData = await claudeResponse.json();
    const rawText = claudeData.content?.[0]?.text || "{}";

    // Parse Claude's JSON response
    let iaResult: any;
    try {
      // Extract JSON from response (handle possible markdown wrapping)
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      iaResult = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
    } catch {
      iaResult = {
        sello_detectado: false,
        sello_confianza: 0,
        firma_detectada: false,
        firma_confianza: 0,
        observaciones_texto: rawText,
        clasificacion: "otro",
        items_faltantes: [],
      };
    }

    // Update hoja_fisica with IA results
    await supabase
      .from("hojas_fisicas")
      .update({
        foto_sellada_url: foto_url,
        foto_capturada_at: new Date().toISOString(),
        ia_procesada_at: new Date().toISOString(),
        ia_sello_detectado: iaResult.sello_detectado ?? false,
        ia_sello_confianza: iaResult.sello_confianza ?? 0,
        ia_firma_detectada: iaResult.firma_detectada ?? false,
        ia_firma_confianza: iaResult.firma_confianza ?? 0,
        ia_observaciones_texto: iaResult.observaciones_texto || null,
        ia_clasificacion: iaResult.clasificacion || "otro",
        ia_items_faltantes: iaResult.items_faltantes || [],
        ia_raw_response: claudeData,
      })
      .eq("id", hoja_fisica_id);

    // Register conciliation events
    await supabase.from("eventos_conciliacion").insert([
      {
        entrega_id: hoja.entrega_id,
        momento_id: "cliente_recibe_fisico",
        notas: `Foto hoja sellada subida`,
        foto_url,
        metadata: { hoja_fisica_id },
      },
      {
        entrega_id: hoja.entrega_id,
        momento_id: "ia_procesa_hoja",
        notas: `IA clasificó: ${iaResult.clasificacion}. Sello: ${iaResult.sello_detectado ? "sí" : "no"}. Firma: ${iaResult.firma_detectada ? "sí" : "no"}.`,
        metadata: {
          hoja_fisica_id,
          clasificacion: iaResult.clasificacion,
          sello: iaResult.sello_detectado,
          firma: iaResult.firma_detectada,
          items_faltantes: iaResult.items_faltantes,
        },
      },
    ]);

    // If discrepancy detected, create one
    if (iaResult.clasificacion === "faltante" || iaResult.clasificacion === "no_llego") {
      await supabase.from("discrepancias_la_corona").insert({
        entrega_id: hoja.entrega_id,
        tipo: iaResult.clasificacion === "no_llego" ? "entrega_no_realizada" : "faltante_mercancia",
        severidad: iaResult.clasificacion === "no_llego" ? "critica" : "alta",
        descripcion: iaResult.observaciones_texto || `IA detectó: ${iaResult.clasificacion}`,
        evidencia_digital: { pedido_id: (hoja.entregas as any)?.pedido_id },
        evidencia_fisica: {
          hoja_fisica_id,
          foto_url,
          items_faltantes: iaResult.items_faltantes,
          clasificacion: iaResult.clasificacion,
        },
      });
    }

    return respond(200, {
      exitoso: true,
      clasificacion: iaResult.clasificacion,
      sello_detectado: iaResult.sello_detectado,
      firma_detectada: iaResult.firma_detectada,
      observaciones_texto: iaResult.observaciones_texto,
      items_faltantes: iaResult.items_faltantes,
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
