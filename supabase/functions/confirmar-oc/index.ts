import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// HMAC-SHA256 verification
async function verifyHmac(secret: string, message: string, providedSignature: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  const expectedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return expectedSignature === providedSignature;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const ordenId = url.searchParams.get("id");
    const action = url.searchParams.get("action"); // "confirm", "track", or "confirm-entregas"
    const entregaIds = url.searchParams.get("entregas"); // comma-separated entrega IDs
    const expiresAt = url.searchParams.get("exp"); // Expiration timestamp
    const signature = url.searchParams.get("sig"); // HMAC signature
    
    if (!ordenId) {
      return new Response("ID de orden no proporcionado", { status: 400 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const confirmationSecret = Deno.env.get("OC_CONFIRMATION_SECRET");
    const supabase = createClient(supabaseUrl, supabaseKey);

    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    // Tracking pixel - no signature required (low risk, read-only)
    if (action === "track") {
      console.log(`Tracking pixel accessed for OC: ${ordenId}`);
      
      await supabase
        .from("ordenes_compra")
        .update({ email_leido_en: new Date().toISOString() })
        .eq("id", ordenId)
        .is("email_leido_en", null); // Only update if not already read
      
      // Return a 1x1 transparent pixel
      const pixel = new Uint8Array([
        0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00,
        0x80, 0x00, 0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21,
        0xf9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00,
        0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44,
        0x01, 0x00, 0x3b
      ]);
      
      return new Response(pixel, {
        headers: {
          "Content-Type": "image/gif",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    }

    // For confirmation actions, verify signature if secret is configured
    if (confirmationSecret && (action === "confirm" || action === "confirm-entregas")) {
      // Validate required parameters
      if (!expiresAt || !signature) {
        console.log(`Missing security parameters for OC: ${ordenId}`);
        return new Response(generateHtmlPage(
          "Enlace Inválido",
          "El enlace de confirmación no es válido.",
          "Por favor solicite un nuevo enlace al proveedor.",
          "#ef4444"
        ), {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }

      // Check expiration
      const expirationTime = parseInt(expiresAt);
      const currentTime = Math.floor(Date.now() / 1000);
      if (currentTime > expirationTime) {
        console.log(`Expired link for OC: ${ordenId}, expired at: ${expirationTime}, current: ${currentTime}`);
        return new Response(generateHtmlPage(
          "Enlace Expirado",
          "Este enlace de confirmación ha expirado.",
          "Por favor solicite un nuevo enlace al proveedor.",
          "#f59e0b"
        ), {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }

      // Build message to verify
      let messageToVerify = `${ordenId}:${action}:${expiresAt}`;
      if (action === "confirm-entregas" && entregaIds) {
        messageToVerify += `:${entregaIds}`;
      }

      // Verify HMAC signature
      const isValid = await verifyHmac(confirmationSecret, messageToVerify, signature);
      if (!isValid) {
        console.log(`Invalid signature for OC: ${ordenId}`);
        return new Response(generateHtmlPage(
          "Enlace Inválido",
          "El enlace de confirmación no es válido.",
          "Por favor solicite un nuevo enlace al proveedor.",
          "#ef4444"
        ), {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }

      console.log(`Valid signature verified for OC: ${ordenId}, action: ${action}`);
    }

    // Get order details
    const { data: orden, error: ordenError } = await supabase
      .from("ordenes_compra")
      .select("folio, proveedores(nombre)")
      .eq("id", ordenId)
      .single();

    if (ordenError || !orden) {
      console.error("Order not found:", ordenError);
      return new Response(generateHtmlPage(
        "Error",
        "No se encontró la orden de compra.",
        "Por favor contacte al proveedor.",
        "#ef4444"
      ), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Handle delivery-specific confirmation
    if (action === "confirm-entregas" && entregaIds) {
      console.log(`Confirming deliveries for OC: ${ordenId}, entregas: ${entregaIds}`);
      
      const ids = entregaIds.split(",");
      
      // Get the deliveries to confirm
      const { data: entregas } = await supabase
        .from("ordenes_compra_entregas")
        .select("id, numero_entrega, fecha_programada, status")
        .in("id", ids);

      if (!entregas || entregas.length === 0) {
        return new Response(generateHtmlPage(
          "Error",
          "No se encontraron las entregas especificadas.",
          "Por favor contacte al proveedor.",
          "#ef4444"
        ), {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }

      // Check if already confirmed
      const alreadyConfirmed = entregas.filter(e => e.status === "confirmado");
      if (alreadyConfirmed.length === entregas.length) {
        return new Response(generateHtmlPage(
          "Ya Confirmadas",
          `Las entregas de la orden ${orden.folio} ya fueron confirmadas anteriormente.`,
          `Total entregas confirmadas: ${alreadyConfirmed.length}`,
          "#f59e0b"
        ), {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }

      // Update delivery status to confirmed
      const { error: updateError } = await supabase
        .from("ordenes_compra_entregas")
        .update({ status: "confirmado" })
        .in("id", ids);

      if (updateError) {
        console.error("Error updating deliveries:", updateError);
        throw updateError;
      }

      // Create notification for the user
      const entregasText = entregas.map(e => `#${e.numero_entrega}`).join(", ");
      await supabase
        .from("notificaciones")
        .insert({
          tipo: "entrega_confirmada",
          titulo: `Entregas confirmadas: ${orden.folio}`,
          descripcion: `El proveedor confirmó las entregas ${entregasText} de la orden ${orden.folio}`,
          orden_compra_id: ordenId,
          leida: false,
        });

      // Return success page
      return new Response(generateHtmlPage(
        "¡Entregas Confirmadas!",
        `Gracias por confirmar las entregas ${entregasText} de la Orden de Compra ${orden.folio}`,
        `Abarrotes La Manita ha sido notificado de su confirmación.`,
        "#22c55e"
      ), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Standard order confirmation (legacy)
    console.log(`Confirmation received for OC: ${ordenId}`);

    // Check if already confirmed
    const { data: existing } = await supabase
      .from("ordenes_compra_confirmaciones")
      .select("id, confirmado_en")
      .eq("orden_compra_id", ordenId)
      .not("confirmado_en", "is", null)
      .single();

    if (existing) {
      // Already confirmed - show thank you page
      return new Response(generateHtmlPage(
        "Ya Confirmada",
        "Esta orden de compra ya fue confirmada anteriormente.",
        `Confirmada el: ${new Date(existing.confirmado_en).toLocaleString("es-MX")}`,
        "#f59e0b"
      ), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Insert confirmation
    const { error: insertError } = await supabase
      .from("ordenes_compra_confirmaciones")
      .insert({
        orden_compra_id: ordenId,
        confirmado_en: new Date().toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent,
      });

    if (insertError) {
      console.error("Error inserting confirmation:", insertError);
      throw insertError;
    }

    // Return success page
    return new Response(generateHtmlPage(
      "¡Confirmación Recibida!",
      `Gracias por confirmar la recepción de la Orden de Compra ${orden.folio}`,
      `Abarrotes La Manita ha sido notificado de su confirmación.`,
      "#22c55e"
    ), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });

  } catch (error) {
    console.error("Error in confirmar-oc:", error);
    return new Response(generateHtmlPage(
      "Error",
      "Ocurrió un error al procesar su confirmación.",
      "Por favor intente de nuevo o contacte al proveedor.",
      "#ef4444"
    ), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
});

function generateHtmlPage(title: string, message: string, details: string, color: string): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Abarrotes La Manita</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
      padding: 40px;
      max-width: 500px;
      text-align: center;
    }
    .icon {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: ${color};
      margin: 0 auto 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .icon svg { width: 40px; height: 40px; fill: white; }
    h1 {
      color: #1f2937;
      font-size: 24px;
      margin-bottom: 16px;
    }
    p {
      color: #4b5563;
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 12px;
    }
    .details {
      color: #6b7280;
      font-size: 14px;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
    .logo {
      margin-top: 30px;
      color: #9ca3af;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        ${color === "#22c55e" ? '<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>' : 
          color === "#f59e0b" ? '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>' :
          '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>'}
      </svg>
    </div>
    <h1>${title}</h1>
    <p>${message}</p>
    <p class="details">${details}</p>
    <p class="logo">Abarrotes La Manita SA de CV</p>
  </div>
</body>
</html>
  `;
}
