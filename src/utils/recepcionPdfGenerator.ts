import jsPDF from "jspdf";
import { format, differenceInMinutes } from "date-fns";
import { es } from "date-fns/locale";
import { getDisplayName } from "@/lib/productUtils";
import { COMPANY_DATA } from "@/constants/companyData";

interface EvidenciaConTipo {
  url: string;
  tipo: string;
}

interface RecepcionData {
  recepcion: {
    id: string;
    numero_entrega: number;
    cantidad_bultos: number;
    fecha_programada: string | null;
    fecha_entrega_real: string | null;
    status: string;
    notas: string | null;
    firma_chofer_conformidad?: string | null;
    firma_almacenista?: string | null;
    recibido_por_profile: {
      full_name: string;
    } | null;
    orden_compra: {
      id: string;
      folio: string;
      proveedor: {
        nombre: string;
      } | null;
      proveedor_nombre_manual: string | null;
    };
  };
  productos: Array<{
    id: string;
    cantidad_ordenada: number;
    cantidad_recibida: number;
    razon_diferencia?: string | null;
    notas_diferencia?: string | null;
    producto: {
      codigo: string;
      nombre: string;
      marca?: string | null;
      especificaciones?: string | null;
      contenido_empaque?: string | null;
      peso_kg?: number | null;
    };
  }>;
  evidenciasConTipos?: EvidenciaConTipo[];
  firmaChofer?: string | null;
  firmaAlmacenista?: string | null;
  llegadaRegistradaEn?: string | null;
  recepcionFinalizadaEn?: string | null;
  placasVehiculo?: string | null;
  nombreChoferProveedor?: string | null;
  numeroRemisionProveedor?: string | null;
}

// Map tipo codes to descriptive labels
const TIPO_EVIDENCIA_LABELS: Record<string, string> = {
  sello_1: "Sello Puerta 1",
  sello_2: "Sello Puerta 2",
  sello: "Sello",
  identificacion: "Identificación Chofer",
  placas: "Placas Vehículo",
  remision_proveedor: "Remisión Proveedor",
  caja_vacia: "Caja Vacía",
  producto_danado: "Producto Dañado",
  producto_rechazado: "Producto Rechazado",
  documento: "Documento",
  vehiculo: "Vehículo",
  producto: "Producto",
  otro: "Otro",
};

// Map razón codes to labels
const RAZON_LABELS: Record<string, string> = {
  roto: "Dañado",
  no_llego: "Faltante",
  rechazado_calidad: "Calidad",
  otro: "Otro",
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

// Helper to format duration in hours and minutes
const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}min`;
  }
  return `${mins} minutos`;
};

export const generarRecepcionPDF = async (data: RecepcionData) => {
  console.log("Iniciando generación de PDF de recepción...", { 
    recepcionId: data.recepcion?.id, 
    productosCount: data.productos?.length,
    evidenciasCount: data.evidenciasConTipos?.length 
  });
  
  const { 
    recepcion, 
    productos, 
    evidenciasConTipos = [], 
    firmaChofer, 
    firmaAlmacenista,
    llegadaRegistradaEn,
    recepcionFinalizadaEn,
    placasVehiculo,
    nombreChoferProveedor,
    numeroRemisionProveedor
  } = data;
  const doc = new jsPDF();
  
  const proveedorNombre = recepcion.orden_compra?.proveedor?.nombre || 
                          recepcion.orden_compra?.proveedor_nombre_manual || 
                          "Proveedor";
  
  // Header
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("COMPROBANTE DE RECEPCIÓN", 105, 20, { align: "center" });
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(COMPANY_DATA.razonSocial, 105, 28, { align: "center" });
  doc.setFontSize(8);
  doc.text(`RFC: ${COMPANY_DATA.rfc} | ${COMPANY_DATA.direccionCompleta}`, 105, 33, { align: "center" });
  
  // Date and document info
  doc.setFontSize(9);
  doc.text(`Fecha de generación: ${format(new Date(), "PPP 'a las' HH:mm", { locale: es })}`, 15, 40);
  
  // Document details box
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(15, 48, 180, 35, 3, 3, "FD");
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Orden de Compra:", 20, 56);
  doc.setFont("helvetica", "normal");
  doc.text(recepcion.orden_compra.folio, 70, 56);
  
  doc.setFont("helvetica", "bold");
  doc.text("Proveedor:", 20, 63);
  doc.setFont("helvetica", "normal");
  doc.text(proveedorNombre, 70, 63);
  
  doc.setFont("helvetica", "bold");
  doc.text("Entrega #:", 20, 70);
  doc.setFont("helvetica", "normal");
  doc.text(String(recepcion.numero_entrega), 70, 70);
  
  doc.setFont("helvetica", "bold");
  doc.text("Estado:", 110, 56);
  doc.setFont("helvetica", "normal");
  doc.text(recepcion.status.toUpperCase(), 140, 56);
  
  if (recepcion.fecha_entrega_real) {
    doc.setFont("helvetica", "bold");
    doc.text("Fecha recepción:", 110, 63);
    doc.setFont("helvetica", "normal");
    doc.text(format(new Date(recepcion.fecha_entrega_real), "dd/MM/yyyy"), 155, 63);
  }
  
  doc.setFont("helvetica", "bold");
  doc.text("Bultos:", 110, 70);
  doc.setFont("helvetica", "normal");
  doc.text(recepcion.cantidad_bultos?.toLocaleString() || "N/A", 140, 70);
  
  doc.setFont("helvetica", "bold");
  doc.text("Recibido por:", 110, 77);
  doc.setFont("helvetica", "normal");
  doc.text(recepcion.recibido_por_profile?.full_name || "No registrado", 150, 77);
  
  // Arrival and timing data section
  let yPos = 95;
  
  const hasTimingData = llegadaRegistradaEn || recepcionFinalizadaEn || placasVehiculo || nombreChoferProveedor || numeroRemisionProveedor;
  
  if (hasTimingData) {
    doc.setFillColor(255, 250, 240);
    doc.roundedRect(15, yPos - 5, 180, 40, 3, 3, "FD");
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(180, 100, 0);
    doc.text("DATOS DE LLEGADA Y DESCARGA", 20, yPos + 2);
    doc.setTextColor(0, 0, 0);
    
    yPos += 10;
    doc.setFontSize(9);
    
    // Left column
    if (llegadaRegistradaEn) {
      doc.setFont("helvetica", "bold");
      doc.text("Hora llegada:", 20, yPos);
      doc.setFont("helvetica", "normal");
      doc.text(format(new Date(llegadaRegistradaEn), "dd/MM/yyyy HH:mm", { locale: es }), 55, yPos);
    }
    
    if (recepcionFinalizadaEn) {
      doc.setFont("helvetica", "bold");
      doc.text("Hora finalización:", 20, yPos + 7);
      doc.setFont("helvetica", "normal");
      doc.text(format(new Date(recepcionFinalizadaEn), "dd/MM/yyyy HH:mm", { locale: es }), 55, yPos + 7);
    }
    
    if (llegadaRegistradaEn && recepcionFinalizadaEn) {
      const duracionMin = differenceInMinutes(new Date(recepcionFinalizadaEn), new Date(llegadaRegistradaEn));
      doc.setFont("helvetica", "bold");
      doc.text("Tiempo descarga:", 20, yPos + 14);
      doc.setFont("helvetica", "normal");
      doc.text(formatDuration(duracionMin), 55, yPos + 14);
    }
    
    // Right column
    if (placasVehiculo) {
      doc.setFont("helvetica", "bold");
      doc.text("Placas:", 110, yPos);
      doc.setFont("helvetica", "normal");
      doc.text(placasVehiculo, 135, yPos);
    }
    
    if (nombreChoferProveedor) {
      doc.setFont("helvetica", "bold");
      doc.text("Chofer:", 110, yPos + 7);
      doc.setFont("helvetica", "normal");
      const nombreTruncado = nombreChoferProveedor.length > 25 
        ? nombreChoferProveedor.substring(0, 22) + "..." 
        : nombreChoferProveedor;
      doc.text(nombreTruncado, 135, yPos + 7);
    }
    
    if (numeroRemisionProveedor) {
      doc.setFont("helvetica", "bold");
      doc.text("Remisión:", 110, yPos + 14);
      doc.setFont("helvetica", "normal");
      doc.text(numeroRemisionProveedor, 135, yPos + 14);
    }
    
    yPos += 35;
  }
  
  // Products table
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("PRODUCTOS RECIBIDOS", 15, yPos);
  
  yPos += 8;
  
  // Table header
  doc.setFillColor(41, 128, 185);
  doc.setTextColor(255, 255, 255);
  doc.rect(15, yPos - 5, 180, 8, "F");
  doc.setFontSize(9);
  doc.text("Código", 17, yPos);
  doc.text("Producto", 45, yPos);
  doc.text("Ordenado", 135, yPos);
  doc.text("Recibido", 165, yPos);
  
  // Table rows
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  yPos += 8;
  
  productos.forEach((p, index) => {
    // Check if we need a new page
    if (yPos > 260) {
      doc.addPage();
      yPos = 20;
    }
    
    const hasDiferencia = p.cantidad_recibida < p.cantidad_ordenada;
    
    // Alternating row colors - highlight differences in red
    if (hasDiferencia) {
      doc.setFillColor(255, 235, 235);
    } else if (index % 2 === 0) {
      doc.setFillColor(248, 248, 248);
    } else {
      doc.setFillColor(255, 255, 255);
    }
    doc.rect(15, yPos - 4, 180, 7, "F");
    
    doc.setFontSize(8);
    doc.text(p.producto?.codigo || "", 17, yPos);
    
    // Use getDisplayName for consistent product formatting
    const nombreProducto = p.producto ? getDisplayName(p.producto) : "";
    const nombreTruncado = nombreProducto.length > 40 
      ? nombreProducto.substring(0, 37) + "..." 
      : nombreProducto;
    doc.text(nombreTruncado, 45, yPos);
    
    doc.text(String(p.cantidad_ordenada), 130, yPos, { align: "right" });
    
    // Show received with color if different
    if (hasDiferencia) {
      doc.setTextColor(200, 0, 0);
    }
    doc.text(String(p.cantidad_recibida), 150, yPos, { align: "right" });
    doc.setTextColor(0, 0, 0);
    
    // Show razón if exists
    if (p.razon_diferencia) {
      doc.setFontSize(7);
      doc.setTextColor(150, 100, 0);
      doc.text(RAZON_LABELS[p.razon_diferencia] || p.razon_diferencia, 160, yPos);
      doc.setTextColor(0, 0, 0);
    }
    
    yPos += 7;
  });
  
  // Notes section
  if (recepcion.notas) {
    yPos += 10;
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("NOTAS:", 15, yPos);
    yPos += 6;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    
    // Parse notes for key information
    const notasLines = doc.splitTextToSize(recepcion.notas, 170);
    notasLines.forEach((line: string) => {
      if (yPos > 280) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(line, 15, yPos);
      yPos += 5;
    });
  }
  
  // Evidencias fotográficas section
  if (evidenciasConTipos && evidenciasConTipos.length > 0) {
    doc.addPage();
    yPos = 20;
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("EVIDENCIAS FOTOGRÁFICAS", 105, yPos, { align: "center" });
    yPos += 15;
    
    const imgWidth = 85;
    const imgHeight = 65;
    const margin = 15;
    const colWidth = imgWidth + 5;
    
    let col = 0;
    let startY = yPos;
    
    for (let i = 0; i < evidenciasConTipos.length; i++) {
      const { url, tipo } = evidenciasConTipos[i];
      
      // Check if we need a new page
      if (startY + imgHeight > 280) {
        doc.addPage();
        startY = 20;
        yPos = 20;
        col = 0;
      }
      
      const xPos = margin + (col * colWidth);
      
      try {
        const base64Image = await loadImageAsBase64(url);
        
        if (base64Image) {
          // Draw border
          doc.setDrawColor(200, 200, 200);
          doc.rect(xPos - 2, startY - 2, imgWidth + 4, imgHeight + 4);
          
          // Add image
          doc.addImage(base64Image, "JPEG", xPos, startY, imgWidth, imgHeight);
          
          // Add descriptive label
          doc.setFontSize(8);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(60, 60, 60);
          const label = TIPO_EVIDENCIA_LABELS[tipo] || tipo;
          doc.text(label, xPos + (imgWidth / 2), startY + imgHeight + 8, { align: "center" });
          doc.setTextColor(0, 0, 0);
          doc.setFont("helvetica", "normal");
        } else {
          // Draw placeholder if image failed to load
          doc.setFillColor(240, 240, 240);
          doc.rect(xPos, startY, imgWidth, imgHeight, "F");
          doc.setFontSize(8);
          doc.text("Imagen no disponible", xPos + (imgWidth / 2), startY + (imgHeight / 2), { align: "center" });
        }
      } catch (error) {
        console.error("Error adding image to PDF:", error);
        // Draw placeholder
        doc.setFillColor(240, 240, 240);
        doc.rect(xPos, startY, imgWidth, imgHeight, "F");
        doc.setFontSize(8);
        doc.text("Error cargando imagen", xPos + (imgWidth / 2), startY + (imgHeight / 2), { align: "center" });
      }
      
      col++;
      if (col >= 2) {
        col = 0;
        startY += imgHeight + 20;
      }
    }
    
    yPos = startY + imgHeight + 25;
  }
  
  // Footer signature area
  yPos += 20;
  if (yPos > 220) {
    doc.addPage();
    yPos = 20;
  }
  
  const signatureWidth = 60;
  const signatureHeight = 30;
  
  // Firma Almacenista
  if (firmaAlmacenista) {
    try {
      doc.addImage(firmaAlmacenista, "PNG", 20, yPos, signatureWidth, signatureHeight);
    } catch (e) {
      console.error("Error adding almacenista signature:", e);
    }
  }
  doc.setDrawColor(150, 150, 150);
  doc.line(20, yPos + signatureHeight + 5, 80, yPos + signatureHeight + 5);
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text("Firma Almacenista", 50, yPos + signatureHeight + 12, { align: "center" });
  
  // Firma Proveedor/Transportista
  if (firmaChofer) {
    try {
      doc.addImage(firmaChofer, "PNG", 120, yPos, signatureWidth, signatureHeight);
    } catch (e) {
      console.error("Error adding driver signature:", e);
    }
  }
  doc.line(120, yPos + signatureHeight + 5, 180, yPos + signatureHeight + 5);
  doc.text("Firma Proveedor/Transportista", 150, yPos + signatureHeight + 12, { align: "center" });
  
  // Generate filename
  const fileName = `Recepcion_${recepcion.orden_compra.folio}_E${recepcion.numero_entrega}_${format(new Date(), "yyyyMMdd")}.pdf`;
  
  // Download using blob method (works in iframes)
  try {
    const pdfBlob = doc.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);
    
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
    
    console.log("PDF generado exitosamente:", fileName);
  } catch (saveError) {
    console.error("Error al guardar/descargar PDF:", saveError);
    // Fallback: open in new tab
    try {
      const pdfDataUri = doc.output('datauristring');
      window.open(pdfDataUri, '_blank');
      console.log("PDF abierto en nueva pestaña como fallback");
    } catch (fallbackError) {
      console.error("Error en fallback:", fallbackError);
      throw saveError;
    }
  }
  
  return fileName;
};
