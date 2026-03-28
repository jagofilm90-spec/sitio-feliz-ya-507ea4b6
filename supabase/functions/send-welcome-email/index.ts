const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOGO_URL = "https://vrcyjmfpteoccqdmdmqn.supabase.co/storage/v1/object/public/email-assets/logo-almasa.png";

interface WelcomeEmailRequest {
  empleado_id: string;
  email: string;
  nombre: string;
  puesto: string;
  fecha_ingreso: string;
  contrato_url: string | null;
  aviso_url: string | null;
}

function generarHTML(datos: WelcomeEmailRequest): string {
  const fecha = new Date(datos.fecha_ingreso);
  const fechaFormateada = fecha.toLocaleDateString("es-MX", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const fechaPrueba = new Date(fecha);
  fechaPrueba.setDate(fechaPrueba.getDate() + 90);
  const fechaPruebaFormateada = fechaPrueba.toLocaleDateString("es-MX", {
    day: "numeric", month: "long", year: "numeric",
  });

  const docsLinks = (datos.contrato_url || datos.aviso_url)
    ? `
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:8px;border-left:4px solid #22c55e;margin:0 0 24px">
        <tr><td style="padding:16px 20px">
          <p style="margin:0 0 10px;font-size:14px;font-weight:700;color:#166534">Tus documentos firmados:</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:#14532d">
            ${datos.contrato_url ? `<tr><td style="padding:4px 0"><a href="${datos.contrato_url}" style="color:#166534;text-decoration:underline;font-weight:600">Descargar Contrato Individual</a></td></tr>` : ""}
            ${datos.aviso_url ? `<tr><td style="padding:4px 0"><a href="${datos.aviso_url}" style="color:#166534;text-decoration:underline;font-weight:600">Descargar Aviso de Privacidad</a></td></tr>` : ""}
            <tr><td style="padding:6px 0 0;font-size:11px;color:#777">Los enlaces son válidos por 7 días.</td></tr>
          </table>
        </td></tr>
      </table>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0">
  <tr><td align="center">
    <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e0e0e0">

      <!-- Header -->
      <tr><td style="padding:28px 36px;border-bottom:1px solid #eee;text-align:center">
        <p style="margin:0;color:#999;font-size:11px;font-style:italic;letter-spacing:1px">Desde 1904</p>
        <img src="${LOGO_URL}" alt="ALMASA" width="180" style="display:inline-block;max-width:180px;height:auto" />
        <p style="margin:4px 0 0;font-size:10px;color:#888;text-transform:uppercase;letter-spacing:2px;font-weight:600">Trabajando por un México mejor</p>
      </td></tr>

      <!-- Contenido -->
      <tr><td style="padding:32px 36px">
        <h1 style="margin:0 0 8px;font-size:24px;color:#C8102E;font-weight:800">¡Bienvenido/a a la familia ALMASA!</h1>
        <p style="font-size:15px;color:#333;margin:0 0 20px;line-height:1.6">Estimado/a <strong>${datos.nombre}</strong>,</p>
        <p style="font-size:14px;color:#555;margin:0 0 24px;line-height:1.6">Nos da mucho gusto que te incorpores a nuestro equipo como <strong>${datos.puesto}</strong>. Estamos seguros de que tu talento y dedicación contribuirán al crecimiento de nuestra empresa.</p>

        <!-- Puntos importantes -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef3c7;border-radius:8px;border-left:4px solid #f59e0b;margin:0 0 24px">
          <tr><td style="padding:16px 20px">
            <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#92400e">Información importante:</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="padding:4px 0;font-size:13px;color:#78350f"><strong>Fecha de inicio:</strong> ${fechaFormateada}</td></tr>
              <tr><td style="padding:4px 0;font-size:13px;color:#78350f"><strong>Horario:</strong> Lunes a sábado de 8:00 a 18:00 hrs</td></tr>
              <tr><td style="padding:4px 0;font-size:13px;color:#78350f"><strong>Periodo de prueba:</strong> 90 días (vence el ${fechaPruebaFormateada})</td></tr>
              <tr><td style="padding:4px 0;font-size:13px;color:#78350f"><strong>Presentarse con:</strong> Identificación oficial vigente (INE)</td></tr>
            </table>
          </td></tr>
        </table>

        <!-- Documentos firmados -->
        ${docsLinks}

        <!-- Documentos requeridos -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9ff;border-radius:8px;border-left:4px solid #3b82f6;margin:0 0 24px">
          <tr><td style="padding:16px 20px">
            <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#1e40af">Documentos que necesitarás:</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:#1e3a5f">
              <tr><td style="padding:3px 0">• Acta de nacimiento (original y copia)</td></tr>
              <tr><td style="padding:3px 0">• CURP</td></tr>
              <tr><td style="padding:3px 0">• RFC (Constancia de Situación Fiscal)</td></tr>
              <tr><td style="padding:3px 0">• Comprobante de domicilio reciente</td></tr>
              <tr><td style="padding:3px 0">• Número de Seguro Social (NSS / IMSS)</td></tr>
              <tr><td style="padding:3px 0">• Cuenta bancaria para depósito de nómina</td></tr>
              <tr><td style="padding:3px 0">• 2 fotografías tamaño infantil</td></tr>
            </table>
          </td></tr>
        </table>

        <p style="font-size:14px;color:#555;margin:0 0 8px;line-height:1.6">Si tienes alguna duda, no dudes en contactarnos.</p>
        <p style="font-size:16px;color:#C8102E;font-weight:700;margin:24px 0 0">¡Trabajando por un México mejor!</p>
      </td></tr>

      <!-- Footer -->
      <tr><td style="padding:20px 36px;border-top:1px solid #eee;background:#fafafa">
        <p style="margin:0 0 4px;color:#666;font-size:11px;font-weight:600">ABARROTES LA MANITA, S.A. DE C.V.</p>
        <p style="margin:0;color:#999;font-size:10px;line-height:1.6">Desde 1904<br>Melchor Ocampo #59, Col. Magdalena Mixiuhca, C.P. 15850, CDMX<br>Tel: 55 5552-0168 / 55 5552-7887</p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: WelcomeEmailRequest = await req.json();
    console.log("[send-welcome-email] To:", body.email, "Nombre:", body.nombre);

    if (!body.email || !body.nombre) {
      throw new Error("email y nombre son requeridos");
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      console.warn("[send-welcome-email] RESEND_API_KEY no configurada");
      return new Response(
        JSON.stringify({ success: true, email_sent: false, reason: "resend_not_configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const html = generarHTML(body);
    const subject = `¡Bienvenido/a a la familia ALMASA! — ${body.nombre}`;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "ALMASA <1904@almasa.com.mx>",
        to: [body.email],
        subject,
        html,
      }),
    });

    if (!resendResponse.ok) {
      const errorBody = await resendResponse.text();
      console.error("[send-welcome-email] Resend error:", resendResponse.status, errorBody);
      throw new Error(`Resend API error ${resendResponse.status}: ${errorBody}`);
    }

    const resendData = await resendResponse.json();
    console.log("[send-welcome-email] Enviado:", resendData.id, "→", body.email);

    return new Response(
      JSON.stringify({ success: true, email_sent: true, resend_id: resendData.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[send-welcome-email] Error:", error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
