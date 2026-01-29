import jsPDF from "jspdf";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { COMPANY_DATA } from "@/constants/companyData";

// Brand colors (RGB)
const BRAND_RED = { r: 180, g: 30, b: 30 };
const BRAND_DARK = { r: 40, g: 40, b: 40 };
const BRAND_GRAY = { r: 100, g: 100, b: 100 };

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
    // Si es solo fecha (YYYY-MM-DD), agregar hora del mediodía para evitar problemas de timezone
    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return new Date(fecha + "T12:00:00");
    }
    // Si ya es timestamp completo, usarlo directamente
    const parsed = new Date(fecha);
    if (isNaN(parsed.getTime())) {
      return new Date(); // Fallback si aún es inválida
    }
    return parsed;
  } catch {
    return new Date();
  }
};

export interface CierreOCData {
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
    precio_unitario: number;
    monto: number;
  }>;
}

// Map motivo codes to labels
const MOTIVO_LABELS: Record<string, string> = {
  roto: "Empaque roto",
  rechazado_calidad: "Calidad rechazada",
  no_llego: "Faltante",
  faltante: "Faltante",
  dañado: "Dañado",
  vencido: "Vencido",
  error_cantidad: "Error cantidad",
};

// Helper function to load image as base64
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

// Función interna que genera el documento PDF y lo retorna
const generarDocumentoPDF = async (data: CierreOCData): Promise<{ doc: jsPDF; fileName: string }> => {
  const { ordenCompra, productosRecibidos, devoluciones } = data;
  const doc = new jsPDF();
  
  // ================ HEADER WITH BRAND BAR ================
  // Red top bar
  doc.setFillColor(BRAND_RED.r, BRAND_RED.g, BRAND_RED.b);
  doc.rect(0, 0, 210, 8, "F");
  
  // Load and add logo
  try {
    const logoUrl = `${window.location.origin}/logo-almasa-pdf.png`;
    const logoBase64 = await loadImageAsBase64(logoUrl);
    if (logoBase64) {
      doc.addImage(logoBase64, "PNG", 15, 12, 35, 14);
    }
  } catch (logoError) {
    console.warn("No se pudo cargar el logo:", logoError);
  }
  
  // Title and company info - right aligned
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(BRAND_DARK.r, BRAND_DARK.g, BRAND_DARK.b);
  doc.text("ESTADO DE CUENTA", 195, 18, { align: "right" });
  doc.setFontSize(12);
  doc.text("ORDEN DE COMPRA", 195, 25, { align: "right" });
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(BRAND_GRAY.r, BRAND_GRAY.g, BRAND_GRAY.b);
  doc.text(COMPANY_DATA.razonSocial, 195, 31, { align: "right" });
  
  // Horizontal line
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.line(15, 38, 195, 38);
  
  // ================ DOCUMENT INFO SECTION ================
  let yPos = 46;
  
  // OC Folio badge
  doc.setFillColor(BRAND_RED.r, BRAND_RED.g, BRAND_RED.b);
  doc.roundedRect(15, yPos - 5, 60, 12, 2, 2, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(ordenCompra.folio, 45, yPos + 2, { align: "center" });
  
  // Fecha
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(BRAND_GRAY.r, BRAND_GRAY.g, BRAND_GRAY.b);
  const fechaFormateada = format(parseFechaSafe(ordenCompra.fecha_creacion), "dd/MM/yyyy", { locale: es });
  doc.text(`Fecha: ${fechaFormateada}`, 195, yPos + 1, { align: "right" });
  
  yPos += 18;
  
  // ================ PROVEEDOR INFO BOX ================
  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(230, 230, 230);
  doc.roundedRect(15, yPos, 180, 14, 3, 3, "FD");
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(BRAND_GRAY.r, BRAND_GRAY.g, BRAND_GRAY.b);
  doc.text("PROVEEDOR", 20, yPos + 6);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(BRAND_DARK.r, BRAND_DARK.g, BRAND_DARK.b);
  const proveedorTruncado = ordenCompra.proveedor_nombre.length > 60 
    ? ordenCompra.proveedor_nombre.substring(0, 57) + "..." 
    : ordenCompra.proveedor_nombre;
  doc.text(proveedorTruncado, 55, yPos + 6);
  
  yPos += 22;
  
  // ================ PRODUCTOS RECIBIDOS TABLE ================
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(BRAND_DARK.r, BRAND_DARK.g, BRAND_DARK.b);
  doc.text("PRODUCTOS RECIBIDOS", 15, yPos);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(BRAND_GRAY.r, BRAND_GRAY.g, BRAND_GRAY.b);
  doc.text(`(${productosRecibidos.length} productos)`, 72, yPos);
  
  yPos += 8;
  
  // Table header
  doc.setFillColor(34, 139, 34); // Green for received
  doc.rect(15, yPos - 4, 180, 8, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("CÓDIGO", 17, yPos + 1);
  doc.text("PRODUCTO", 45, yPos + 1);
  doc.text("CANT.", 135, yPos + 1, { align: "right" });
  doc.text("P.U.", 160, yPos + 1, { align: "right" });
  doc.text("SUBTOTAL", 192, yPos + 1, { align: "right" });
  
  yPos += 8;
  
  let totalProductosRecibidos = 0;
  
  productosRecibidos.forEach((p, index) => {
    // Check if we need a new page
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
      
      // Repeat header on new page
      doc.setFillColor(34, 139, 34);
      doc.rect(15, yPos - 4, 180, 8, "F");
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text("CÓDIGO", 17, yPos + 1);
      doc.text("PRODUCTO", 45, yPos + 1);
      doc.text("CANT.", 135, yPos + 1, { align: "right" });
      doc.text("P.U.", 160, yPos + 1, { align: "right" });
      doc.text("SUBTOTAL", 192, yPos + 1, { align: "right" });
      yPos += 8;
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
    doc.setTextColor(BRAND_DARK.r, BRAND_DARK.g, BRAND_DARK.b);
    
    const codigoTruncado = p.codigo.length > 12 ? p.codigo.substring(0, 10) + ".." : p.codigo;
    doc.text(codigoTruncado, 17, yPos + 1);
    
    const nombreTruncado = p.nombre.length > 45 ? p.nombre.substring(0, 42) + "..." : p.nombre;
    doc.text(nombreTruncado, 45, yPos + 1);
    
    doc.text(p.cantidad.toLocaleString("es-MX"), 135, yPos + 1, { align: "right" });
    doc.text(`$${p.precio_unitario.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`, 160, yPos + 1, { align: "right" });
    doc.text(`$${p.subtotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`, 192, yPos + 1, { align: "right" });
    
    totalProductosRecibidos += p.subtotal;
    yPos += 7;
  });
  
  // Subtotal productos recibidos
  doc.setFillColor(240, 255, 240);
  doc.rect(15, yPos - 2, 180, 7, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(34, 139, 34);
  doc.text("Subtotal Productos Recibidos:", 135, yPos + 2, { align: "right" });
  doc.text(`$${totalProductosRecibidos.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`, 192, yPos + 2, { align: "right" });
  yPos += 12;
  
  // ================ PRODUCTOS DEVUELTOS TABLE ================
  if (devoluciones.length > 0) {
    // Check if we need a new page
    if (yPos > 200) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(BRAND_RED.r, BRAND_RED.g, BRAND_RED.b);
    doc.text("PRODUCTOS DEVUELTOS", 15, yPos);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(BRAND_GRAY.r, BRAND_GRAY.g, BRAND_GRAY.b);
    doc.text(`(${devoluciones.length} productos)`, 72, yPos);
    
    yPos += 8;
    
    // Table header - red for returns
    doc.setFillColor(BRAND_RED.r, BRAND_RED.g, BRAND_RED.b);
    doc.rect(15, yPos - 4, 180, 8, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("CÓDIGO", 17, yPos + 1);
    doc.text("PRODUCTO", 45, yPos + 1);
    doc.text("CANT.", 115, yPos + 1, { align: "right" });
    doc.text("MOTIVO", 145, yPos + 1);
    doc.text("DESCUENTO", 192, yPos + 1, { align: "right" });
    
    yPos += 8;
    
    devoluciones.forEach((d, index) => {
      // Check if we need a new page
      if (yPos > 265) {
        doc.addPage();
        yPos = 20;
        
        // Repeat header on new page
        doc.setFillColor(BRAND_RED.r, BRAND_RED.g, BRAND_RED.b);
        doc.rect(15, yPos - 4, 180, 8, "F");
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text("CÓDIGO", 17, yPos + 1);
        doc.text("PRODUCTO", 45, yPos + 1);
        doc.text("CANT.", 115, yPos + 1, { align: "right" });
        doc.text("MOTIVO", 145, yPos + 1);
        doc.text("DESCUENTO", 192, yPos + 1, { align: "right" });
        yPos += 8;
      }
      
      // Alternating row colors - pinkish for returns
      if (index % 2 === 0) {
        doc.setFillColor(255, 245, 245);
      } else {
        doc.setFillColor(255, 255, 255);
      }
      doc.rect(15, yPos - 3, 180, 7, "F");
      
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(BRAND_DARK.r, BRAND_DARK.g, BRAND_DARK.b);
      
      const codigoTruncado = d.codigo.length > 12 ? d.codigo.substring(0, 10) + ".." : d.codigo;
      doc.text(codigoTruncado, 17, yPos + 1);
      
      const nombreTruncado = d.nombre.length > 35 ? d.nombre.substring(0, 32) + "..." : d.nombre;
      doc.text(nombreTruncado, 45, yPos + 1);
      
      doc.text(d.cantidad.toLocaleString("es-MX"), 115, yPos + 1, { align: "right" });
      
      const motivoLabel = MOTIVO_LABELS[d.motivo] || d.motivo;
      doc.setFontSize(6);
      doc.text(motivoLabel.substring(0, 15), 145, yPos + 1);
      
      doc.setFontSize(7);
      doc.setTextColor(BRAND_RED.r, BRAND_RED.g, BRAND_RED.b);
      doc.setFont("helvetica", "bold");
      doc.text(`-$${d.monto.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`, 192, yPos + 1, { align: "right" });
      
      doc.setTextColor(BRAND_DARK.r, BRAND_DARK.g, BRAND_DARK.b);
      doc.setFont("helvetica", "normal");
      
      yPos += 7;
    });
    
    // Total devoluciones
    doc.setFillColor(255, 235, 235);
    doc.rect(15, yPos - 2, 180, 7, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(BRAND_RED.r, BRAND_RED.g, BRAND_RED.b);
    doc.text("Total Devoluciones:", 145, yPos + 2, { align: "right" });
    doc.text(`-$${ordenCompra.monto_devoluciones.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`, 192, yPos + 2, { align: "right" });
    yPos += 12;
  }
  
  // ================ RESUMEN FINANCIERO ================
  // Check if we need a new page
  if (yPos > 230) {
    doc.addPage();
    yPos = 20;
  }
  
  yPos += 5;
  
  // Box para resumen
  const resumenHeight = devoluciones.length > 0 ? 40 : 25;
  doc.setFillColor(248, 248, 255);
  doc.setDrawColor(200, 200, 220);
  doc.setLineWidth(1);
  doc.roundedRect(15, yPos, 180, resumenHeight, 4, 4, "FD");
  
  yPos += 10;
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(BRAND_DARK.r, BRAND_DARK.g, BRAND_DARK.b);
  
  if (devoluciones.length > 0) {
    // Total original
    doc.text("Total Original:", 20, yPos);
    doc.setFont("helvetica", "bold");
    doc.text(`$${ordenCompra.total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`, 190, yPos, { align: "right" });
    yPos += 8;
    
    // Devoluciones
    doc.setFont("helvetica", "normal");
    doc.setTextColor(BRAND_RED.r, BRAND_RED.g, BRAND_RED.b);
    doc.text("(-) Devoluciones:", 20, yPos);
    doc.setFont("helvetica", "bold");
    doc.text(`-$${ordenCompra.monto_devoluciones.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`, 190, yPos, { align: "right" });
    yPos += 4;
    
    // Línea divisoria
    doc.setDrawColor(150, 150, 180);
    doc.setLineWidth(0.5);
    doc.line(90, yPos, 190, yPos);
    yPos += 8;
  }
  
  // Total a pagar - destacado
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(34, 139, 34); // Green
  doc.text("TOTAL A PAGAR:", 20, yPos);
  doc.setFontSize(14);
  doc.text(`$${ordenCompra.total_ajustado.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`, 190, yPos, { align: "right" });
  
  yPos += resumenHeight - 5;
  
  // ================ FOOTER ================
  yPos += 15;
  
  // Fecha de generación
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(BRAND_GRAY.r, BRAND_GRAY.g, BRAND_GRAY.b);
  const fechaGeneracion = format(new Date(), "dd/MM/yyyy HH:mm", { locale: es });
  doc.text(`Documento generado el ${fechaGeneracion}`, 105, yPos, { align: "center" });
  
  // Red bottom bar
  doc.setFillColor(BRAND_RED.r, BRAND_RED.g, BRAND_RED.b);
  doc.rect(0, 289, 210, 8, "F");
  
  const fileName = `Estado_Cuenta_${ordenCompra.folio}.pdf`;
  
  return { doc, fileName };
};

/**
 * Genera y descarga el PDF de Estado de Cuenta de OC
 */
export const generarCierreOCPDF = async (data: CierreOCData): Promise<void> => {
  try {
    const { doc, fileName } = await generarDocumentoPDF(data);
    doc.save(fileName);
    console.log("PDF de cierre OC generado:", fileName);
  } catch (error) {
    console.error("Error generando PDF de cierre OC:", error);
    throw error;
  }
};

/**
 * Genera el PDF y retorna el base64 para adjuntar a emails
 */
export const generarCierreOCPDFBase64 = async (data: CierreOCData): Promise<{
  base64: string;
  fileName: string;
}> => {
  try {
    const { doc, fileName } = await generarDocumentoPDF(data);
    
    // Obtener el PDF como base64
    const pdfOutput = doc.output("datauristring");
    // El formato es: data:application/pdf;base64,XXXXX
    // Necesitamos solo la parte base64
    const base64 = pdfOutput.split(",")[1];
    
    console.log("PDF de cierre OC generado en base64:", fileName);
    
    return { base64, fileName };
  } catch (error) {
    console.error("Error generando PDF de cierre OC base64:", error);
    throw error;
  }
};
