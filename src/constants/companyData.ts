/**
 * DATOS FISCALES CENTRALIZADOS DE LA EMPRESA
 * ============================================
 * IMPORTANTE: Este archivo contiene la información fiscal oficial
 * según la Constancia de Situación Fiscal (CSF) vigente.
 * 
 * ⚠️ NO MODIFICAR sin verificar contra el CSF actualizado.
 * Cualquier cambio aquí se reflejará en TODOS los documentos
 * del sistema: OCs, Cotizaciones, Remisiones, Facturas, etc.
 * 
 * Última actualización: Enero 2026
 * Fuente: CSF - ABARROTES LA MANITA SA DE CV
 */

export const COMPANY_DATA = {
  // Datos Fiscales Oficiales (según CSF)
  razonSocial: "ABARROTES LA MANITA SA DE CV",
  razonSocialLarga: "ABARROTES LA MANITA, S.A. DE C.V.",
  rfc: "AMA700701GI8",
  regimenFiscal: "601",
  regimenFiscalDescripcion: "General de Ley Personas Morales",
  
  // Dirección Fiscal
  direccion: {
    calle: "MELCHOR OCAMPO",
    numeroExterior: "59",
    colonia: "MAGDALENA MIXIUHCA",
    municipio: "VENUSTIANO CARRANZA",
    codigoPostal: "15850",
    ciudad: "Ciudad de México",
    estado: "CDMX",
    pais: "México",
  },
  
  // Formatos de dirección para diferentes usos
  direccionCompleta: "Melchor Ocampo #59, Col. Magdalena Mixiuhca, Venustiano Carranza, C.P. 15850, CDMX",
  direccionCorta: "Melchor Ocampo #59, Magdalena Mixiuhca, Venustiano Carranza, 15850, CDMX",
  direccionMultilinea: [
    "Calle: MELCHOR OCAMPO No.Ext: 59",
    "Colonia: MAGDALENA MIXIUHCA",
    "Municipio: VENUSTIANO CARRANZA C.P.: 15850"
  ],
  
  // Teléfonos
  telefonos: {
    principal: "55 5552-0168",
    secundario: "55 5552-7887",
    alterno1: "(55) 56-00-77-81",
    alterno2: "(55) 56-94-97-92",
  },
  telefonosFormateados: "55 5552-0168 / 55 5552-7887",
  telefonosAlternos: "(55) 56-00-77-81 / (55) 56-94-97-92",
  
  // Correos Corporativos
  emails: {
    compras: "compras@almasa.com.mx",
    ventas: "1904@almasa.com.mx",
    pedidos: "pedidos@almasa.com.mx",
    contacto: "contacto@almasa.com.mx",
    pagos: "pagos@almasa.com.mx",
  },
  
  // Datos Bancarios para Pagos
  datosBancarios: {
    banco: "BBVA BANCOMER, S.A.",
    plaza: "JAMAICA",
    sucursal: "0122",
    cuenta: "0442413388",
    clabe: "012180004424133881",
    beneficiario: "ABARROTES LA MANITA, S.A. DE C.V.",
  },
  
  // Datos para documentos
  nombreComercial: "ALMASA",
  sitioWeb: "https://almasa.com.mx",
  
  // Rutas de logos
  logos: {
    header: "/logo-almasa-header.png",
    pdf: "/logo-almasa-pdf.png",
    favicon: "/logo-almasa-favicon.png",
  }
} as const;

// Type para autocompletado
export type CompanyData = typeof COMPANY_DATA;

/**
 * Helper: Generar encabezado HTML para PDFs de OC
 * Uso: ${getCompanyHeaderHTML(logoBase64)}
 */
export const getCompanyHeaderHTML = (logoBase64?: string) => `
  ${logoBase64 ? `<img src="${logoBase64}" alt="Almasa" style="max-width: 180px; margin-bottom: 10px;">` : '<div class="company-logo">ALMASA</div>'}
  <div class="company-subtitle">${COMPANY_DATA.razonSocial}</div>
  <div class="company-details">
    <strong>RFC:</strong> ${COMPANY_DATA.rfc}<br>
    <strong>Dirección:</strong> ${COMPANY_DATA.direccionCompleta}<br>
    <strong>Tel:</strong> ${COMPANY_DATA.telefonosFormateados} | <strong>Email:</strong> ${COMPANY_DATA.emails.compras}
  </div>
`;

/**
 * Helper: Generar datos de empresa para PDFs (formato compacto)
 */
export const getCompanyInfoHTML = (logoBase64?: string) => `
  ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" style="height: 70px; margin-bottom: 10px;">` : ''}
  <div class="company-details">
    <strong>${COMPANY_DATA.razonSocial}</strong><br>
    RFC: ${COMPANY_DATA.rfc}<br>
    ${COMPANY_DATA.direccionCorta}<br>
    Tel: ${COMPANY_DATA.telefonosFormateados}<br>
    ${COMPANY_DATA.emails.compras}
  </div>
`;

/**
 * Helper: Generar pie de página HTML para PDFs
 */
export const getCompanyFooterHTML = () => `
  <p><strong>${COMPANY_DATA.razonSocial}</strong> | ${COMPANY_DATA.emails.compras} | Tel: ${COMPANY_DATA.telefonos.principal}</p>
`;

/**
 * Helper: Generar pie de página para cotizaciones
 */
export const getCotizacionFooterHTML = () => `
  <p><strong>${COMPANY_DATA.razonSocialLarga}</strong></p>
  <p>Email: ${COMPANY_DATA.emails.ventas} | Tel: ${COMPANY_DATA.telefonos.alterno1}</p>
`;

/**
 * Helper: Generar bloque HTML con datos bancarios para PDFs
 */
export const getBankInfoHTML = (referencia?: string) => `
  <div class="bank-info">
    <p><strong>Para Depósito o Transferencia Bancaria:</strong></p>
    <p><strong>Beneficiario:</strong> ${COMPANY_DATA.datosBancarios.beneficiario}</p>
    <p><strong>Banco:</strong> ${COMPANY_DATA.datosBancarios.banco}</p>
    <p><strong>Sucursal:</strong> ${COMPANY_DATA.datosBancarios.sucursal} (Plaza ${COMPANY_DATA.datosBancarios.plaza})</p>
    <p><strong>Cuenta:</strong> ${COMPANY_DATA.datosBancarios.cuenta}</p>
    <p><strong>CLABE:</strong> ${COMPANY_DATA.datosBancarios.clabe}</p>
    ${referencia ? `<p><strong>Referencia:</strong> ${referencia}</p>` : ''}
    <p style="margin-top: 8px; font-size: 10px;">Enviar comprobante a: ${COMPANY_DATA.emails.pagos}</p>
  </div>
`;
