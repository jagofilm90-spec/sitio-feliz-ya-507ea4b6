// Plantillas de email compartidas para todo el sistema ALMASA

export const emailWrapper = (bannerColor: string, bannerIcon: string, bannerTitle: string, bodyContent: string) => `
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:20px 0;font-family:Arial,sans-serif;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)">
      <tr><td style="background:#1e3a5f;padding:30px 40px;text-align:center">
        <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:bold;letter-spacing:2px">ALMASA</h1>
        <p style="color:#94b8d9;margin:5px 0 0;font-size:13px">Abarrotes la Manita SA de CV</p>
      </td></tr>
      <tr><td style="background:${bannerColor};padding:15px 40px;text-align:center">
        <p style="margin:0;color:#ffffff;font-size:18px;font-weight:bold">${bannerIcon} ${bannerTitle}</p>
      </td></tr>
      <tr><td style="padding:30px 40px">${bodyContent}</td></tr>
      <tr><td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center">
        <p style="margin:0;color:#94a3b8;font-size:12px">Este es un correo automático del sistema ALMASA.<br>Por favor no responda a este mensaje.</p>
      </td></tr>
    </table>
  </td></tr>
</table>`;

export const emailRow = (label: string, value: string, highlight?: boolean, alt?: boolean) =>
  `<tr${alt ? ' style="background:#f8fafc"' : ''}><td style="padding:12px 15px;border:1px solid #e2e8f0;color:#64748b;font-size:13px;width:40%"><strong>${label}</strong></td><td style="padding:12px 15px;border:1px solid #e2e8f0;color:${highlight ? '#f97316' : '#1e293b'};font-size:14px;${highlight ? 'font-weight:bold' : ''}">${value}</td></tr>`;

export const emailTable = (rows: string) =>
  `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:25px">${rows}</table>`;

export const emailNote = (color: string, borderColor: string, text: string) =>
  `<div style="background:${color};border-left:4px solid ${borderColor};padding:15px;border-radius:4px;margin-bottom:25px"><p style="margin:0;color:#92400e;font-size:13px">${text}</p></div>`;

export const emailSignature = (dept: string) =>
  `<p style="color:#374151;font-size:14px;margin:0">Atentamente,<br><strong>${dept}</strong><br>Abarrotes la Manita SA de CV</p>`;

export const emailDiferenciasTable = (rows: string) => `
<div style="margin-top:25px;border-top:2px solid #d97706;padding-top:15px;">
  <h3 style="color:#d97706;margin-bottom:10px;">⚠️ Productos con Diferencia</h3>
  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:10px 0;">
    <thead>
      <tr style="background:#fef3c7;">
        <th style="padding:10px;border:1px solid #e2e8f0;text-align:left;font-size:13px;color:#92400e">Producto</th>
        <th style="padding:10px;border:1px solid #e2e8f0;text-align:center;font-size:13px;color:#92400e">Esperados</th>
        <th style="padding:10px;border:1px solid #e2e8f0;text-align:center;font-size:13px;color:#92400e">Recibidos</th>
        <th style="padding:10px;border:1px solid #e2e8f0;text-align:center;font-size:13px;color:#92400e">Diferencia</th>
        <th style="padding:10px;border:1px solid #e2e8f0;text-align:left;font-size:13px;color:#92400e">Razón</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</div>`;

export const emailDiferenciaRow = (nombre: string, esperado: number, recibido: number, diferencia: number, razon: string) =>
  `<tr><td style="padding:8px 10px;border:1px solid #e2e8f0;font-size:13px">${nombre}</td><td style="padding:8px;border:1px solid #e2e8f0;text-align:center;font-size:13px">${esperado}</td><td style="padding:8px;border:1px solid #e2e8f0;text-align:center;font-size:13px">${recibido}</td><td style="padding:8px;border:1px solid #e2e8f0;text-align:center;color:#dc2626;font-weight:bold;font-size:13px">${diferencia}</td><td style="padding:8px 10px;border:1px solid #e2e8f0;font-size:13px">${razon}</td></tr>`;
