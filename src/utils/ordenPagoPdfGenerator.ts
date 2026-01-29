import jsPDF from "jspdf";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { COMPANY_DATA } from "@/constants/companyData";

// Professional color palette (RGB)
const COLORS = {
  brandRed: { r: 139, g: 35, b: 50 },
  success: { r: 34, g: 139, b: 34 },
  accent: { r: 70, g: 130, b: 180 },
  dark: { r: 33, g: 37, b: 41 },
  gray: { r: 100, g: 100, b: 100 },
  lightGray: { r: 150, g: 150, b: 150 },
  lightBg: { r: 248, g: 248, b: 248 },
  successBg: { r: 240, g: 255, b: 240 },
  dangerBg: { r: 255, g: 240, b: 240 },
  infoBg: { r: 240, g: 248, b: 255 },
  white: { r: 255, g: 255, b: 255 },
};

/**
 * Normaliza una fecha que puede venir como:
 * - "2026-01-15" (solo fecha)
 * - "2026-01-15T18:30:00.000Z" (timestamp ISO)
 * - null/undefined
 * Retorna un Date válido o la fecha actual como fallback
 */
const parseFechaSafe = (fecha: string | null | undefined): Date => {
  if (!fecha) return new Date();
  
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return new Date(fecha + "T12:00:00");
    }
    const parsed = new Date(fecha);
    if (isNaN(parsed.getTime())) {
      return new Date();
    }
    return parsed;
  } catch {
    return new Date();
  }
};

export interface OrdenPagoData {
  ordenCompra: {
    id: string;
    folio: string;
    proveedor_nombre: string;
    fecha_creacion: string;
    total: number;
    monto_devoluciones: number;
    total_ajustado: number;
  };
  productosRecibidos: Array<{
    codigo: string;
    nombre: string;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
  }>;
  devoluciones: Array<{
    codigo: string;
    nombre: string;
    cantidad: number;
    motivo: string;
    monto: number;
  }>;
  datosBancarios?: {
    banco?: string;
    cuenta?: string;
    clabe?: string;
    beneficiario?: string;
  } | null;
}

const MOTIVO_LABELS: Record<string, string> = {
  roto: "Empaque roto",
  rechazado_calidad: "Calidad rechazada",
  no_llego: "Faltante",
  faltante: "Faltante",
  dañado: "Dañado",
  vencido: "Vencido",
  error_cantidad: "Error cantidad",
};

const loadImageAsBase64 = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error loading image:", error);
    return null;
  }
};

// Draw professional footer
const drawProfessionalFooter = (doc: jsPDF) => {
  const pageHeight = doc.internal.pageSize.height;
  
  // Separator line
  doc.setDrawColor(COLORS.brandRed.r, COLORS.brandRed.g, COLORS.brandRed.b);
  doc.setLineWidth(0.5);
  doc.line(40, pageHeight - 28, 170, pageHeight - 28);
  
  // Company name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);
  doc.text(COMPANY_DATA.razonSocialLarga, 105, pageHeight - 22, { align: "center" });
  
  // Contact info
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(COLORS.gray.r, COLORS.gray.g, COLORS.gray.b);
  doc.text(`${COMPANY_DATA.emails.compras} | Tel: ${COMPANY_DATA.telefonos.principal}`, 105, pageHeight - 17, { align: "center" });
  
  // Generation date
  const fecha = format(new Date(), "dd/MM/yyyy HH:mm", { locale: es });
  doc.text(`Documento generado el ${fecha} - USO INTERNO`, 105, pageHeight - 12, { align: "center" });
  
  // Bottom bar
  doc.setFillColor(COLORS.brandRed.r, COLORS.brandRed.g, COLORS.brandRed.b);
  doc.rect(0, pageHeight - 8, 210, 8, "F");
};

const generarDocumentoPDF = async (data: OrdenPagoData): Promise<{ doc: jsPDF; fileName: string }> => {
  const { ordenCompra, productosRecibidos, devoluciones, datosBancarios } = data;
  const doc = new jsPDF();
  
  // ================ PROFESSIONAL HEADER ================
  // Top red bar
  doc.setFillColor(COLORS.brandRed.r, COLORS.brandRed.g, COLORS.brandRed.b);
  doc.rect(0, 0, 210, 10, "F");
  
  // Load and add logo
  try {
    const logoUrl = `${window.location.origin}/logo-almasa-pdf.png`;
    const logoBase64 = await loadImageAsBase64(logoUrl);
    if (logoBase64) {
      doc.addImage(logoBase64, "PNG", 15, 14, 45, 16);
    }
  } catch (logoError) {
    console.warn("No se pudo cargar el logo:", logoError);
  }
  
  // Document badge (right side)
  doc.setFillColor(COLORS.brandRed.r, COLORS.brandRed.g, COLORS.brandRed.b);
  doc.roundedRect(130, 14, 65, 16, 3, 3, "F");
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("ORDEN DE PAGO", 162.5, 21, { align: "center" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("DOCUMENTO INTERNO", 162.5, 27, { align: "center" });
  
  // Company info
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.gray.r, COLORS.gray.g, COLORS.gray.b);
  doc.text(COMPANY_DATA.razonSocial, 15, 36);
  doc.text(`RFC: ${COMPANY_DATA.rfc} | Tel: ${COMPANY_DATA.telefonos.principal}`, 15, 41);
  
  // Elegant separator
  doc.setDrawColor(COLORS.brandRed.r, COLORS.brandRed.g, COLORS.brandRed.b);
  doc.setLineWidth(0.8);
  doc.line(15, 46, 195, 46);
  
  // ================ FOLIO AND DATE SECTION ================
  let yPos = 56;
  
  // Folio badge
  doc.setFillColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);
  doc.roundedRect(15, yPos - 6, 70, 14, 3, 3, "F");
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(ordenCompra.folio, 50, yPos + 2, { align: "center" });
  
  // Date
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.gray.r, COLORS.gray.g, COLORS.gray.b);
  const fechaFormateada = format(parseFechaSafe(ordenCompra.fecha_creacion), "dd 'de' MMMM 'de' yyyy", { locale: es });
  doc.text(`Fecha OC: ${fechaFormateada}`, 195, yPos + 1, { align: "right" });
  
  yPos += 20;
  
  // ================ PROVEEDOR INFO BOX ================
  doc.setFillColor(COLORS.lightBg.r, COLORS.lightBg.g, COLORS.lightBg.b);
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.roundedRect(15, yPos, 180, 18, 4, 4, "FD");
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.gray.r, COLORS.gray.g, COLORS.gray.b);
  doc.text("PROVEEDOR", 22, yPos + 7);
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);
  const proveedorTruncado = ordenCompra.proveedor_nombre.length > 55 
    ? ordenCompra.proveedor_nombre.substring(0, 52) + "..." 
    : ordenCompra.proveedor_nombre;
  doc.text(proveedorTruncado, 22, yPos + 14);
  
  yPos += 26;
  
  // ================ RESUMEN FINANCIERO PANEL ================
  const montoAPagar = ordenCompra.total_ajustado ?? ordenCompra.total;
  const tieneDevoluciones = ordenCompra.monto_devoluciones > 0;
  const panelHeight = tieneDevoluciones ? 42 : 28;
  
  // Shadow effect (double border)
  doc.setFillColor(200, 220, 200);
  doc.roundedRect(17, yPos + 2, 178, panelHeight, 5, 5, "F");
  
  // Main panel
  doc.setFillColor(COLORS.successBg.r, COLORS.successBg.g, COLORS.successBg.b);
  doc.setDrawColor(COLORS.success.r, COLORS.success.g, COLORS.success.b);
  doc.setLineWidth(2);
  doc.roundedRect(15, yPos, 180, panelHeight, 5, 5, "FD");
  
  // Panel title
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.success.r, COLORS.success.g, COLORS.success.b);
  doc.text("RESUMEN FINANCIERO", 22, yPos + 9);
  
  if (tieneDevoluciones) {
    // Total original
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);
    doc.text("Total Original:", 22, yPos + 19);
    doc.setFont("helvetica", "bold");
    doc.text(`$${ordenCompra.total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`, 95, yPos + 19, { align: "right" });
    
    // Devoluciones
    doc.setFont("helvetica", "normal");
    doc.setTextColor(COLORS.brandRed.r, COLORS.brandRed.g, COLORS.brandRed.b);
    doc.text("(-) Devoluciones:", 22, yPos + 27);
    doc.setFont("helvetica", "bold");
    doc.text(`-$${ordenCompra.monto_devoluciones.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`, 95, yPos + 27, { align: "right" });
    
    // Badge for amount to pay
    doc.setFillColor(COLORS.success.r, COLORS.success.g, COLORS.success.b);
    doc.roundedRect(105, yPos + 12, 85, 24, 4, 4, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("MONTO A PAGAR", 147.5, yPos + 22, { align: "center" });
    doc.setFontSize(14);
    doc.text(`$${montoAPagar.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`, 147.5, yPos + 32, { align: "center" });
    
    yPos += panelHeight + 8;
  } else {
    // Badge for amount to pay (centered)
    doc.setFillColor(COLORS.success.r, COLORS.success.g, COLORS.success.b);
    doc.roundedRect(105, yPos + 4, 85, 20, 4, 4, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("MONTO A PAGAR", 147.5, yPos + 12, { align: "center" });
    doc.setFontSize(14);
    doc.text(`$${montoAPagar.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`, 147.5, yPos + 21, { align: "center" });
    
    yPos += panelHeight + 8;
  }
  
  // ================ PRODUCTOS RECIBIDOS TABLE ================
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);
  doc.text("DETALLE DE PRODUCTOS", 15, yPos);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.gray.r, COLORS.gray.g, COLORS.gray.b);
  doc.text(`(${productosRecibidos.length} productos)`, 78, yPos);
  
  yPos += 7;
  
  // Table header
  doc.setFillColor(COLORS.success.r, COLORS.success.g, COLORS.success.b);
  doc.roundedRect(15, yPos - 4, 180, 9, 2, 2, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("CÓDIGO", 18, yPos + 2);
  doc.text("PRODUCTO", 48, yPos + 2);
  doc.text("CANT.", 135, yPos + 2, { align: "right" });
  doc.text("P.U.", 160, yPos + 2, { align: "right" });
  doc.text("SUBTOTAL", 192, yPos + 2, { align: "right" });
  
  yPos += 9;
  
  productosRecibidos.forEach((p, index) => {
    if (yPos > 240) {
      drawProfessionalFooter(doc);
      doc.addPage();
      yPos = 20;
      
      // Repeat header
      doc.setFillColor(COLORS.success.r, COLORS.success.g, COLORS.success.b);
      doc.roundedRect(15, yPos - 4, 180, 9, 2, 2, "F");
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text("CÓDIGO", 18, yPos + 2);
      doc.text("PRODUCTO", 48, yPos + 2);
      doc.text("CANT.", 135, yPos + 2, { align: "right" });
      doc.text("P.U.", 160, yPos + 2, { align: "right" });
      doc.text("SUBTOTAL", 192, yPos + 2, { align: "right" });
      yPos += 9;
    }
    
    // Alternating row colors
    if (index % 2 === 0) {
      doc.setFillColor(250, 255, 250);
    } else {
      doc.setFillColor(255, 255, 255);
    }
    doc.rect(15, yPos - 3, 180, 7, "F");
    
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);
    
    const codigoTruncado = p.codigo.length > 14 ? p.codigo.substring(0, 12) + ".." : p.codigo;
    doc.text(codigoTruncado, 18, yPos + 1);
    
    const nombreTruncado = p.nombre.length > 45 ? p.nombre.substring(0, 42) + "..." : p.nombre;
    doc.text(nombreTruncado, 48, yPos + 1);
    
    doc.text(p.cantidad.toLocaleString("es-MX"), 135, yPos + 1, { align: "right" });
    doc.text(`$${p.precio_unitario.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`, 160, yPos + 1, { align: "right" });
    doc.text(`$${p.subtotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`, 192, yPos + 1, { align: "right" });
    
    yPos += 7;
  });
  
  yPos += 5;
  
  // ================ DEVOLUCIONES TABLE ================
  if (devoluciones.length > 0) {
    if (yPos > 190) {
      drawProfessionalFooter(doc);
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(COLORS.brandRed.r, COLORS.brandRed.g, COLORS.brandRed.b);
    doc.text("DEVOLUCIONES APLICADAS", 15, yPos);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(COLORS.gray.r, COLORS.gray.g, COLORS.gray.b);
    doc.text(`(${devoluciones.length} productos)`, 80, yPos);
    
    yPos += 7;
    
    // Table header - red
    doc.setFillColor(COLORS.brandRed.r, COLORS.brandRed.g, COLORS.brandRed.b);
    doc.roundedRect(15, yPos - 4, 180, 9, 2, 2, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("CÓDIGO", 18, yPos + 2);
    doc.text("PRODUCTO", 48, yPos + 2);
    doc.text("CANT.", 115, yPos + 2, { align: "right" });
    doc.text("MOTIVO", 140, yPos + 2);
    doc.text("DESCUENTO", 192, yPos + 2, { align: "right" });
    
    yPos += 9;
    
    devoluciones.forEach((d, index) => {
      if (yPos > 250) {
        drawProfessionalFooter(doc);
        doc.addPage();
        yPos = 20;
        
        doc.setFillColor(COLORS.brandRed.r, COLORS.brandRed.g, COLORS.brandRed.b);
        doc.roundedRect(15, yPos - 4, 180, 9, 2, 2, "F");
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text("CÓDIGO", 18, yPos + 2);
        doc.text("PRODUCTO", 48, yPos + 2);
        doc.text("CANT.", 115, yPos + 2, { align: "right" });
        doc.text("MOTIVO", 140, yPos + 2);
        doc.text("DESCUENTO", 192, yPos + 2, { align: "right" });
        yPos += 9;
      }
      
      // Alternating row colors - pinkish
      if (index % 2 === 0) {
        doc.setFillColor(255, 248, 248);
      } else {
        doc.setFillColor(255, 255, 255);
      }
      doc.rect(15, yPos - 3, 180, 7, "F");
      
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);
      
      const codigoTruncado = d.codigo.length > 14 ? d.codigo.substring(0, 12) + ".." : d.codigo;
      doc.text(codigoTruncado, 18, yPos + 1);
      
      const nombreTruncado = d.nombre.length > 35 ? d.nombre.substring(0, 32) + "..." : d.nombre;
      doc.text(nombreTruncado, 48, yPos + 1);
      
      doc.text(d.cantidad.toLocaleString("es-MX"), 115, yPos + 1, { align: "right" });
      
      const motivoLabel = MOTIVO_LABELS[d.motivo] || d.motivo;
      doc.setFontSize(6);
      doc.text(motivoLabel.substring(0, 18), 140, yPos + 1);
      
      doc.setFontSize(7);
      doc.setTextColor(COLORS.brandRed.r, COLORS.brandRed.g, COLORS.brandRed.b);
      doc.setFont("helvetica", "bold");
      doc.text(`-$${d.monto.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`, 192, yPos + 1, { align: "right" });
      
      doc.setTextColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);
      doc.setFont("helvetica", "normal");
      
      yPos += 7;
    });
    
    yPos += 6;
  }
  
  // ================ DATOS BANCARIOS DEL PROVEEDOR ================
  if (datosBancarios && (datosBancarios.banco || datosBancarios.clabe)) {
    if (yPos > 215) {
      drawProfessionalFooter(doc);
      doc.addPage();
      yPos = 20;
    }
    
    // Shadow effect
    doc.setFillColor(200, 210, 230);
    doc.roundedRect(17, yPos + 2, 178, 34, 4, 4, "F");
    
    // Main panel
    doc.setFillColor(COLORS.infoBg.r, COLORS.infoBg.g, COLORS.infoBg.b);
    doc.setDrawColor(COLORS.accent.r, COLORS.accent.g, COLORS.accent.b);
    doc.setLineWidth(1.5);
    doc.roundedRect(15, yPos, 180, 34, 4, 4, "FD");
    
    // Panel title
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(COLORS.accent.r, COLORS.accent.g, COLORS.accent.b);
    doc.text("DATOS BANCARIOS DEL PROVEEDOR", 22, yPos + 9);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);
    
    let bankY = yPos + 18;
    
    if (datosBancarios.beneficiario) {
      doc.setFont("helvetica", "bold");
      doc.text("Beneficiario:", 22, bankY);
      doc.setFont("helvetica", "normal");
      doc.text(datosBancarios.beneficiario, 55, bankY);
      bankY += 7;
    }
    
    if (datosBancarios.banco) {
      doc.setFont("helvetica", "bold");
      doc.text("Banco:", 22, bankY);
      doc.setFont("helvetica", "normal");
      doc.text(datosBancarios.banco, 42, bankY);
    }
    if (datosBancarios.cuenta) {
      doc.setFont("helvetica", "bold");
      doc.text("Cuenta:", 100, bankY);
      doc.setFont("helvetica", "normal");
      doc.text(datosBancarios.cuenta, 122, bankY);
    }
    if (datosBancarios.clabe) {
      doc.setFont("helvetica", "bold");
      doc.text("CLABE:", 155, bankY);
      doc.setFont("helvetica", "normal");
      const clabeText = datosBancarios.clabe.length > 12 
        ? datosBancarios.clabe.substring(0, 12) + "..." 
        : datosBancarios.clabe;
      doc.text(clabeText, 175, bankY);
    }
    
    yPos += 42;
  }
  
  // ================ REFERENCIA DE PAGO ================
  if (yPos > 225) {
    drawProfessionalFooter(doc);
    doc.addPage();
    yPos = 20;
  }
  
  doc.setDrawColor(COLORS.lightGray.r, COLORS.lightGray.g, COLORS.lightGray.b);
  doc.setLineWidth(0.8);
  doc.roundedRect(15, yPos, 180, 28, 4, 4, "D");
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);
  doc.text("REFERENCIA DE PAGO (completar manualmente)", 22, yPos + 9);
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.gray.r, COLORS.gray.g, COLORS.gray.b);
  doc.text("Fecha: ____________________", 22, yPos + 18);
  doc.text("No. Transferencia: ____________________", 85, yPos + 18);
  doc.text("Monto: ____________________", 22, yPos + 25);
  doc.text("Autorizado por: ____________________", 85, yPos + 25);
  
  // ================ FOOTER ================
  drawProfessionalFooter(doc);
  
  const fileName = `Orden_Pago_${ordenCompra.folio}.pdf`;
  
  return { doc, fileName };
};

/**
 * Genera y descarga el PDF de Orden de Pago Interna
 */
export const generarOrdenPagoPDF = async (data: OrdenPagoData): Promise<void> => {
  try {
    const { doc, fileName } = await generarDocumentoPDF(data);
    doc.save(fileName);
    console.log("PDF de orden de pago generado:", fileName);
  } catch (error) {
    console.error("Error generando PDF de orden de pago:", error);
    throw error;
  }
};

/**
 * Genera el PDF y retorna el base64
 */
export const generarOrdenPagoPDFBase64 = async (data: OrdenPagoData): Promise<{
  base64: string;
  fileName: string;
}> => {
  try {
    const { doc, fileName } = await generarDocumentoPDF(data);
    
    const pdfOutput = doc.output("datauristring");
    const base64 = pdfOutput.split(",")[1];
    
    console.log("PDF de orden de pago generado en base64:", fileName);
    
    return { base64, fileName };
  } catch (error) {
    console.error("Error generando PDF de orden de pago base64:", error);
    throw error;
  }
};
