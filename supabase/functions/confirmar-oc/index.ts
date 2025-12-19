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

// HMAC-SHA256 signing for form submission
async function hmacSha256(secret: string, message: string): Promise<string> {
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
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const ordenId = url.searchParams.get("id");
    const action = url.searchParams.get("action");
    const entregaIds = url.searchParams.get("entregas");
    const expiresAt = url.searchParams.get("exp");
    const signature = url.searchParams.get("sig");
    const fechaOriginal = url.searchParams.get("fecha_original");
    
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
        .is("email_leido_en", null);
      
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
    const requiresSignature = ["confirm", "confirm-entregas", "propose-date"].includes(action || "");
    if (confirmationSecret && requiresSignature) {
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

      // Build message to verify based on action
      let messageToVerify = `${ordenId}:${action}:${expiresAt}`;
      if (action === "confirm-entregas" && entregaIds) {
        messageToVerify += `:${entregaIds}`;
      }
      if (action === "propose-date" && fechaOriginal) {
        messageToVerify += `:${fechaOriginal}`;
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
      .select("folio, proveedores(nombre), fecha_entrega")
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

    // Extract proveedor nombre (handle both object and array cases)
    const proveedorData = orden.proveedores as any;
    const proveedorNombre = Array.isArray(proveedorData) 
      ? proveedorData[0]?.nombre 
      : proveedorData?.nombre;

    // Handle propose-date action - show form
    if (action === "propose-date") {
      console.log(`Showing date proposal form for OC: ${ordenId}`);
      
      const fechaOriginalDisplay = fechaOriginal || orden.fecha_entrega || "No especificada";
      
      return new Response(generateProposeDateForm(
        ordenId,
        orden.folio,
        proveedorNombre || "Proveedor",
        fechaOriginalDisplay,
        expiresAt!,
        signature!,
        fechaOriginal || ""
      ), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Handle submit-proposal action (POST from form)
    if (action === "submit-proposal" && req.method === "POST") {
      console.log(`Processing date proposal for OC: ${ordenId}`);
      
      const formData = await req.formData();
      const fechaPropuesta = formData.get("fecha_propuesta") as string;
      const motivo = formData.get("motivo") as string;
      const fechaOriginalForm = formData.get("fecha_original") as string;
      const expForm = formData.get("exp") as string;
      const sigForm = formData.get("sig") as string;

      // Verify the signature from the form
      if (confirmationSecret) {
        const messageToVerify = `${ordenId}:propose-date:${expForm}:${fechaOriginalForm}`;
        const isValid = await verifyHmac(confirmationSecret, messageToVerify, sigForm);
        
        if (!isValid) {
          console.log(`Invalid form signature for OC: ${ordenId}`);
          return new Response(generateHtmlPage(
            "Error de Seguridad",
            "La solicitud no pudo ser verificada.",
            "Por favor intente de nuevo desde el enlace original.",
            "#ef4444"
          ), {
            headers: { "Content-Type": "text/html; charset=utf-8" },
          });
        }

        // Check expiration
        const expirationTime = parseInt(expForm);
        const currentTime = Math.floor(Date.now() / 1000);
        if (currentTime > expirationTime) {
          return new Response(generateHtmlPage(
            "Enlace Expirado",
            "Este enlace ha expirado.",
            "Por favor solicite un nuevo enlace.",
            "#f59e0b"
          ), {
            headers: { "Content-Type": "text/html; charset=utf-8" },
          });
        }
      }

      if (!fechaPropuesta) {
        return new Response(generateHtmlPage(
          "Fecha Requerida",
          "Por favor seleccione una fecha propuesta.",
          "Vuelva atrás e intente de nuevo.",
          "#f59e0b"
        ), {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }

      // Insert the proposal into the database
      const { error: insertError } = await supabase
        .from("ordenes_compra_respuestas_proveedor")
        .insert({
          orden_compra_id: ordenId,
          tipo_respuesta: "propuesta_fecha",
          fecha_original: fechaOriginalForm || null,
          fecha_propuesta: fechaPropuesta,
          motivo: motivo || null,
          ip_address: ipAddress,
          user_agent: userAgent,
        });

      if (insertError) {
        console.error("Error inserting proposal:", insertError);
        throw insertError;
      }

      // Create notification for the purchasing team
      await supabase
        .from("notificaciones")
        .insert({
          tipo: "propuesta_fecha_oc",
          titulo: `📅 Propuesta de fecha: ${orden.folio}`,
          descripcion: `El proveedor ${proveedorNombre} propone cambiar la fecha de entrega al ${new Date(fechaPropuesta).toLocaleDateString('es-MX')}${motivo ? `. Motivo: ${motivo}` : ''}`,
          orden_compra_id: ordenId,
          leida: false,
        });

      console.log(`Date proposal recorded for OC: ${ordenId}, new date: ${fechaPropuesta}`);

      return new Response(generateHtmlPage(
        "¡Propuesta Enviada!",
        `Su propuesta de nueva fecha (${new Date(fechaPropuesta).toLocaleDateString('es-MX')}) ha sido enviada.`,
        `Abarrotes La Manita revisará su propuesta y le contactará para confirmar. Gracias por su comunicación.`,
        "#3b82f6"
      ), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Handle delivery-specific confirmation
    if (action === "confirm-entregas" && entregaIds) {
      console.log(`Confirming deliveries for OC: ${ordenId}, entregas: ${entregaIds}`);
      
      const ids = entregaIds.split(",");
      
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

      const { error: updateError } = await supabase
        .from("ordenes_compra_entregas")
        .update({ status: "confirmado" })
        .in("id", ids);

      if (updateError) {
        console.error("Error updating deliveries:", updateError);
        throw updateError;
      }

      // Record the confirmation in responses table
      await supabase
        .from("ordenes_compra_respuestas_proveedor")
        .insert({
          orden_compra_id: ordenId,
          tipo_respuesta: "confirmado",
          ip_address: ipAddress,
          user_agent: userAgent,
        });

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

      return new Response(generateHtmlPage(
        "¡Entregas Confirmadas!",
        `Gracias por confirmar las entregas ${entregasText} de la Orden de Compra ${orden.folio}`,
        `Abarrotes La Manita ha sido notificado de su confirmación.`,
        "#22c55e"
      ), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Standard order confirmation
    console.log(`Confirmation received for OC: ${ordenId}`);

    const { data: existing } = await supabase
      .from("ordenes_compra_confirmaciones")
      .select("id, confirmado_en")
      .eq("orden_compra_id", ordenId)
      .not("confirmado_en", "is", null)
      .single();

    if (existing) {
      return new Response(generateHtmlPage(
        "Ya Confirmada",
        "Esta orden de compra ya fue confirmada anteriormente.",
        `Confirmada el: ${new Date(existing.confirmado_en).toLocaleString("es-MX")}`,
        "#f59e0b"
      ), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

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

    // Also record in responses table for unified tracking
    await supabase
      .from("ordenes_compra_respuestas_proveedor")
      .insert({
        orden_compra_id: ordenId,
        tipo_respuesta: "confirmado",
        fecha_original: orden.fecha_entrega || null,
        ip_address: ipAddress,
        user_agent: userAgent,
      });

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
      "Ocurrió un error al procesar su solicitud.",
      "Por favor intente de nuevo o contacte al proveedor.",
      "#ef4444"
    ), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
});

function generateProposeDateForm(
  ordenId: string,
  folio: string,
  proveedorNombre: string,
  fechaOriginal: string,
  exp: string,
  sig: string,
  fechaOriginalValue: string
): string {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const formAction = `${supabaseUrl}/functions/v1/confirmar-oc?id=${ordenId}&action=submit-proposal`;
  
  // Calculate min date (tomorrow)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];
  
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Proponer Nueva Fecha - ${folio}</title>
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
      width: 100%;
    }
    .icon {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: #3b82f6;
      margin: 0 auto 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .icon svg { width: 30px; height: 30px; fill: white; }
    h1 {
      color: #1f2937;
      font-size: 22px;
      margin-bottom: 8px;
      text-align: center;
    }
    .subtitle {
      color: #6b7280;
      font-size: 14px;
      text-align: center;
      margin-bottom: 24px;
    }
    .info-box {
      background: #f3f4f6;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .info-row:last-child { margin-bottom: 0; }
    .info-label { color: #6b7280; font-size: 14px; }
    .info-value { color: #1f2937; font-weight: 500; font-size: 14px; }
    .form-group {
      margin-bottom: 20px;
    }
    label {
      display: block;
      color: #374151;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 8px;
    }
    input[type="date"], textarea {
      width: 100%;
      padding: 12px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 16px;
      transition: border-color 0.2s;
    }
    input[type="date"]:focus, textarea:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
    textarea {
      min-height: 80px;
      resize: vertical;
    }
    .btn {
      display: block;
      width: 100%;
      padding: 14px;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.1s, box-shadow 0.1s;
    }
    .btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .btn-primary {
      background: #3b82f6;
      color: white;
    }
    .btn-primary:hover {
      background: #2563eb;
    }
    .logo {
      margin-top: 24px;
      color: #9ca3af;
      font-size: 12px;
      text-align: center;
    }
    .required { color: #ef4444; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"/>
      </svg>
    </div>
    <h1>Proponer Nueva Fecha de Entrega</h1>
    <p class="subtitle">Orden de Compra: ${folio}</p>
    
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Proveedor:</span>
        <span class="info-value">${proveedorNombre}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Fecha original:</span>
        <span class="info-value">${fechaOriginal}</span>
      </div>
    </div>
    
    <form method="POST" action="${formAction}">
      <input type="hidden" name="fecha_original" value="${fechaOriginalValue}">
      <input type="hidden" name="exp" value="${exp}">
      <input type="hidden" name="sig" value="${sig}">
      
      <div class="form-group">
        <label for="fecha_propuesta">
          Nueva fecha propuesta <span class="required">*</span>
        </label>
        <input type="date" id="fecha_propuesta" name="fecha_propuesta" min="${minDate}" required>
      </div>
      
      <div class="form-group">
        <label for="motivo">Motivo del cambio (opcional)</label>
        <textarea id="motivo" name="motivo" placeholder="Ej: Retraso en producción, falta de insumos, etc."></textarea>
      </div>
      
      <button type="submit" class="btn btn-primary">
        📅 Enviar Propuesta
      </button>
    </form>
    
    <p class="logo">Abarrotes La Manita SA de CV</p>
  </div>
</body>
</html>
  `;
}

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
          color === "#3b82f6" ? '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>' :
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
