/**
 * Template de email de bienvenida para nuevos empleados — ALMASA
 * Retorna HTML listo para enviar. NO envía el email.
 */

const LOGO_URL = "https://vrcyjmfpteoccqdmdmqn.supabase.co/storage/v1/object/public/email-assets/logo-almasa.png";

interface DatosBienvenida {
  nombre: string;
  puesto: string;
  fecha_ingreso: string; // yyyy-mm-dd
  sueldo_bruto?: number;
}

export function generarEmailBienvenida(datos: DatosBienvenida): { subject: string; html: string } {
  const fecha = new Date(datos.fecha_ingreso);
  const fechaFormateada = fecha.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  // Fecha de vencimiento del periodo de prueba (90 días)
  const fechaPrueba = new Date(fecha);
  fechaPrueba.setDate(fechaPrueba.getDate() + 90);
  const fechaPruebaFormateada = fechaPrueba.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });

  const subject = `¡Bienvenido/a a ALMASA! — ${datos.nombre}`;

  const html = `
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:24px 0;font-family:Arial,Helvetica,sans-serif">
  <tr><td align="center">
    <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e0e0e0">

      <!-- Header con logo -->
      <tr><td style="padding:28px 36px;border-bottom:1px solid #eee;text-align:center">
        <p style="margin:0 0 0;color:#999;font-size:11px;font-style:italic;letter-spacing:1px">Desde 1904</p>
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
            <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#92400e">📋 Puntos importantes:</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="padding:4px 0;font-size:13px;color:#78350f">📅 <strong>Fecha de inicio:</strong> ${fechaFormateada}</td></tr>
              <tr><td style="padding:4px 0;font-size:13px;color:#78350f">🕐 <strong>Horario:</strong> Lunes a sábado de 8:00 a 18:00 hrs</td></tr>
              <tr><td style="padding:4px 0;font-size:13px;color:#78350f">⏳ <strong>Periodo de prueba:</strong> 90 días (vence el ${fechaPruebaFormateada})</td></tr>
              <tr><td style="padding:4px 0;font-size:13px;color:#78350f">🪪 <strong>Presentarse con:</strong> Identificación oficial vigente (INE)</td></tr>
            </table>
          </td></tr>
        </table>

        <!-- Documentos requeridos -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9ff;border-radius:8px;border-left:4px solid #3b82f6;margin:0 0 24px">
          <tr><td style="padding:16px 20px">
            <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#1e40af">📄 Documentos que necesitarás:</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:#1e3a5f">
              <tr><td style="padding:3px 0">• Acta de nacimiento (original y copia)</td></tr>
              <tr><td style="padding:3px 0">• CURP</td></tr>
              <tr><td style="padding:3px 0">• RFC (Constancia de Situación Fiscal)</td></tr>
              <tr><td style="padding:3px 0">• Comprobante de domicilio reciente</td></tr>
              <tr><td style="padding:3px 0">• Número de Seguro Social (NSS/IMSS)</td></tr>
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
</table>`;

  return { subject, html };
}
