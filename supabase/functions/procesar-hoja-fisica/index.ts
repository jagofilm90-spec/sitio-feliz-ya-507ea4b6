import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { hoja_salida_id, foto_url } = await req.json();
    if (!hoja_salida_id || !foto_url) {
      return respond(400, { error: "hoja_salida_id y foto_url requeridos" });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return respond(400, { error: "ANTHROPIC_API_KEY no configurada" });
    }

    // Cargar hoja_salida + líneas para contexto IA
    const { data: hoja } = await supabase
      .from("hojas_salida")
      .select(`
        id, folio, entrega_id, pedido_id,
        cliente_razon_social,
        hojas_salida_lineas(
          codigo_producto,
          descripcion_producto,
          cantidad_surtida,
          unidad
        )
      `)
      .eq("id", hoja_salida_id)
      .single();

    if (!hoja) return respond(404, { error: "Hoja de Salida no encontrada" });

    // Lista de productos esperados (contexto para IA)
    const productosEsperados = (hoja.hojas_salida_lineas || [])
      .map((l: any) => `${l.cantidad_surtida} ${l.unidad || ""} de ${l.descripcion_producto}`)
      .join("\n");

    // Descargar imagen
    const imageResponse = await fetch(foto_url);
    if (!imageResponse.ok) {
      return respond(400, { error: "No se pudo descargar la imagen" });
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));

    const contentType = imageResponse.headers.get("content-type") || "image/jpeg";
    const mediaType = contentType.startsWith("image/") ? contentType : "image/jpeg";

    // Prompt mejorado con contexto productos
    const prompt = `Esta es una fotografía de una HOJA DE SALIDA de ALMASA (distribuidor abarrotes mayoreo).

La hoja tiene espacios para:
- Sello del cliente (recuadro)
- Firma del cliente (recuadro)
- Observaciones manuscritas (líneas)
- Firmas internas almacenista/chofer

PRODUCTOS QUE DEBÍA RECIBIR EL CLIENTE (Hoja ${hoja.folio}):
${productosEsperados || "(sin productos especificados)"}

CLIENTE: ${hoja.cliente_razon_social || "No especificado"}

Analiza la imagen y responde en JSON exacto (sin markdown, sin texto adicional):
{
  "sello_detectado": true/false,
  "sello_confianza": 0-100,
  "firma_detectada": true/false,
  "firma_confianza": 0-100,
  "observaciones_texto": "transcripción exacta del texto manuscrito en sección observaciones, o vacío si no hay",
  "clasificacion": "completo" | "faltante" | "no_llego" | "rechazado" | "otro",
  "items_faltantes": [
    {"descripcion": "nombre producto", "cantidad": "cantidad faltante", "razon": "motivo si está escrito"}
  ],
  "items_dañados": [
    {"descripcion": "nombre producto", "detalle": "qué pasó"}
  ],
  "notas_adicionales": "cualquier observación relevante"
}

REGLAS DE CLASIFICACIÓN:
- Si observaciones vacías + sello y firma presentes → "completo"
- Si dice "recibí completo", "todo bien", "ok" → "completo"
- Si menciona "faltó", "no llegó X", "menos Y" → "faltante" + items_faltantes
- Si dice "no llegó nada", "no se entregó" → "no_llego"
- Si dice "rechazado", "no acepto", "regreso" → "rechazado"
- Confianza 0-100 (100 = muy seguro)
- Si la foto está borrosa: confianza baja (<50)
- Si no se ve la hoja: clasificacion="otro" + notas_adicionales explicando`;

    // Claude Vision API
    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mediaType, data: base64Image },
              },
              { type: "text", text: prompt },
            ],
          },
        ],
      }),
    });

    if (!claudeResponse.ok) {
      const errText = await claudeResponse.text();
      return respond(500, { error: `Claude API: ${claudeResponse.status} ${errText}` });
    }

    const claudeData = await claudeResponse.json();
    const rawText = claudeData.content?.[0]?.text || "{}";

    // Parse JSON
    let iaResult: any;
    try {
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
        items_dañados: [],
        notas_adicionales: "Error parsing IA response",
      };
    }

    // Update hoja_salida con resultados IA
    await supabase
      .from("hojas_salida")
      .update({
        foto_sellada_url: foto_url,
        ia_procesada_at: new Date().toISOString(),
        ia_sello_detectado: iaResult.sello_detectado ?? false,
        ia_firma_detectada: iaResult.firma_detectada ?? false,
        ia_observaciones_texto: iaResult.observaciones_texto || null,
        ia_clasificacion: iaResult.clasificacion || "otro",
        ia_raw_response: {
          ...claudeData,
          sello_confianza: iaResult.sello_confianza,
          firma_confianza: iaResult.firma_confianza,
          items_faltantes: iaResult.items_faltantes,
          items_dañados: iaResult.items_dañados,
          notas_adicionales: iaResult.notas_adicionales,
        },
      })
      .eq("id", hoja_salida_id);

    // Registrar eventos LA CORONA V4
    const isAnomalia =
      iaResult.clasificacion === "faltante" ||
      iaResult.clasificacion === "no_llego" ||
      iaResult.clasificacion === "rechazado";

    await supabase.from("eventos_conciliacion").insert([
      {
        hoja_salida_id,
        entrega_id: hoja.entrega_id,
        momento_id: "cliente_sella_firma",
        estado: "completado",
        foto_url,
        completado_at: new Date().toISOString(),
      },
      {
        hoja_salida_id,
        entrega_id: hoja.entrega_id,
        momento_id: "ia_procesa",
        estado: "completado",
        completado_at: new Date().toISOString(),
        tiene_anomalia: isAnomalia,
        anomalia_tipo: isAnomalia ? `clasificacion_${iaResult.clasificacion}` : null,
        anomalia_detalle: iaResult.observaciones_texto || null,
        notas: `IA: ${iaResult.clasificacion}. Sello: ${iaResult.sello_detectado ? "sí" : "no"}. Firma: ${iaResult.firma_detectada ? "sí" : "no"}.`,
      },
    ]);

    // Auto-crear discrepancia si IA detecta problema
    if (isAnomalia) {
      const tipoMap: Record<string, string> = {
        faltante: "faltante_mercancia",
        no_llego: "entrega_no_realizada",
        rechazado: "entrega_rechazada",
      };

      await supabase.from("discrepancias_la_corona").insert({
        hoja_salida_id,
        entrega_id: hoja.entrega_id,
        tipo_discrepancia: tipoMap[iaResult.clasificacion] || "otro",
        severidad: iaResult.clasificacion === "no_llego" ? "critica" : iaResult.clasificacion === "rechazado" ? "alta" : "media",
        detectado_por: "ia_claude_vision",
        estado_investigacion: "pendiente",
        es_robo_sospechado: iaResult.clasificacion === "no_llego",
      });
    }

    return respond(200, {
      exitoso: true,
      clasificacion: iaResult.clasificacion,
      sello_detectado: iaResult.sello_detectado,
      sello_confianza: iaResult.sello_confianza,
      firma_detectada: iaResult.firma_detectada,
      firma_confianza: iaResult.firma_confianza,
      observaciones_texto: iaResult.observaciones_texto,
      items_faltantes: iaResult.items_faltantes,
      items_dañados: iaResult.items_dañados,
      notas_adicionales: iaResult.notas_adicionales,
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
