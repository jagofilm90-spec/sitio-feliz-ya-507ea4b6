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
    firma_chofer_diferencia?: string | null;
    sin_sellos?: boolean;
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
  firmaChoferDiferencia?: string | null;
  firmaSinSellos?: string | null;
  sinSellos?: boolean;
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

// Brand colors (RGB)
const BRAND_RED = { r: 180, g: 30, b: 30 };
const BRAND_DARK = { r: 40, g: 40, b: 40 };
const BRAND_GRAY = { r: 100, g: 100, b: 100 };

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

// Detect image format from base64 string
const getImageFormat = (base64: string): "JPEG" | "PNG" => {
  if (base64.includes("data:image/png")) return "PNG";
  return "JPEG";
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

// Get status display info
const getStatusDisplay = (status: string): { text: string; color: { r: number; g: number; b: number } } => {
  const statusMap: Record<string, { text: string; color: { r: number; g: number; b: number } }> = {
    recibida: { text: "✓ RECIBIDA", color: { r: 34, g: 139, b: 34 } },
    en_descarga: { text: "⏳ EN DESCARGA", color: { r: 255, g: 140, b: 0 } },
    programada: { text: "📅 PROGRAMADA", color: { r: 70, g: 130, b: 180 } },
    cancelada: { text: "✕ CANCELADA", color: { r: 178, g: 34, b: 34 } },
  };
  return statusMap[status] || { text: status.toUpperCase(), color: BRAND_GRAY };
};

// Función interna que genera el documento PDF y lo retorna
const generarDocumentoPDF = async (data: RecepcionData): Promise<{ doc: jsPDF; fileName: string }> => {
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
    firmaChoferDiferencia,
    firmaSinSellos,
    sinSellos,
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
  
  // ================ HEADER WITH BRAND BAR ================
  // Red top bar
  doc.setFillColor(BRAND_RED.r, BRAND_RED.g, BRAND_RED.b);
  doc.rect(0, 0, 210, 8, "F");
  
  // Load and add logo
  let logoLoaded = false;
  try {
    const logoUrl = `${window.location.origin}/logo-almasa-pdf.png`;
    const logoBase64 = await loadImageAsBase64(logoUrl);
    if (logoBase64) {
      doc.addImage(logoBase64, "PNG", 15, 12, 35, 14);
      logoLoaded = true;
    }
  } catch (logoError) {
    console.warn("No se pudo cargar el logo:", logoError);
  }
  
  // Title and company info - right aligned
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(BRAND_DARK.r, BRAND_DARK.g, BRAND_DARK.b);
  doc.text("COMPROBANTE DE RECEPCIÓN", 195, 18, { align: "right" });
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(BRAND_GRAY.r, BRAND_GRAY.g, BRAND_GRAY.b);
  doc.text(COMPANY_DATA.razonSocial, 195, 24, { align: "right" });
  doc.setFontSize(7);
  doc.text(`RFC: ${COMPANY_DATA.rfc}`, 195, 28, { align: "right" });
  
  // Horizontal line
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.line(15, 34, 195, 34);
  
  // ================ DOCUMENT INFO SECTION ================
  let yPos = 42;
  
  // OC Folio badge (larger, prominent)
  doc.setFillColor(BRAND_RED.r, BRAND_RED.g, BRAND_RED.b);
  doc.roundedRect(15, yPos - 5, 55, 12, 2, 2, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(recepcion.orden_compra.folio, 42.5, yPos + 2, { align: "center" });
  
  // Entrega badge
  doc.setFillColor(70, 130, 180);
  doc.roundedRect(75, yPos - 5, 35, 12, 2, 2, "F");
  doc.setFontSize(10);
  doc.text(`Entrega #${recepcion.numero_entrega}`, 92.5, yPos + 2, { align: "center" });
  
  // Status badge
  const statusInfo = getStatusDisplay(recepcion.status);
  doc.setFillColor(statusInfo.color.r, statusInfo.color.g, statusInfo.color.b);
  doc.roundedRect(145, yPos - 5, 50, 12, 2, 2, "F");
  doc.setFontSize(9);
  doc.text(statusInfo.text, 170, yPos + 2, { align: "center" });
  
  yPos += 18;
  doc.setTextColor(BRAND_DARK.r, BRAND_DARK.g, BRAND_DARK.b);
  
  // ================ MAIN INFO BOX ================
  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(230, 230, 230);
  doc.roundedRect(15, yPos, 180, 42, 3, 3, "FD");
  
  yPos += 8;
  
  // Left column
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(BRAND_GRAY.r, BRAND_GRAY.g, BRAND_GRAY.b);
  doc.text("PROVEEDOR", 20, yPos);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(BRAND_DARK.r, BRAND_DARK.g, BRAND_DARK.b);
  // Truncar proveedor si es muy largo
  const proveedorTruncado = proveedorNombre.length > 35 
    ? proveedorNombre.substring(0, 32) + "..." 
    : proveedorNombre;
  doc.text(proveedorTruncado, 20, yPos + 5);
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(BRAND_GRAY.r, BRAND_GRAY.g, BRAND_GRAY.b);
  doc.text("RECIBIDO POR", 20, yPos + 14);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold"); // Importante destacar
  doc.setTextColor(BRAND_DARK.r, BRAND_DARK.g, BRAND_DARK.b);
  const recibidoPorNombre = recepcion.recibido_por_profile?.full_name || "—";
  doc.text(recibidoPorNombre.length > 30 ? recibidoPorNombre.substring(0, 27) + "..." : recibidoPorNombre, 20, yPos + 19);
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(BRAND_GRAY.r, BRAND_GRAY.g, BRAND_GRAY.b);
  doc.text("BULTOS", 20, yPos + 28);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(BRAND_DARK.r, BRAND_DARK.g, BRAND_DARK.b);
  doc.text(recepcion.cantidad_bultos?.toLocaleString() || "—", 20, yPos + 34);
  
  // Right column
  // Fecha recepción usando timestamp correcto
  const fechaRecepcionDisplay = recepcionFinalizadaEn 
    ? format(new Date(recepcionFinalizadaEn), "dd/MM/yyyy")
    : recepcion.fecha_entrega_real 
      ? format(new Date(recepcion.fecha_entrega_real + "T12:00:00"), "dd/MM/yyyy")
      : "—";
  
  const horaRecepcion = recepcionFinalizadaEn 
    ? format(new Date(recepcionFinalizadaEn), "HH:mm")
    : "—";
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(BRAND_GRAY.r, BRAND_GRAY.g, BRAND_GRAY.b);
  doc.text("FECHA RECEPCIÓN", 120, yPos);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(BRAND_DARK.r, BRAND_DARK.g, BRAND_DARK.b);
  doc.text(fechaRecepcionDisplay, 120, yPos + 7);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(BRAND_GRAY.r, BRAND_GRAY.g, BRAND_GRAY.b);
  doc.text(`a las ${horaRecepcion}`, 120, yPos + 13);
  
  // Tiempo de descarga (si existe)
  if (llegadaRegistradaEn && recepcionFinalizadaEn) {
    const duracionMin = differenceInMinutes(new Date(recepcionFinalizadaEn), new Date(llegadaRegistradaEn));
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(BRAND_GRAY.r, BRAND_GRAY.g, BRAND_GRAY.b);
    doc.text("TIEMPO DESCARGA", 120, yPos + 22);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(BRAND_DARK.r, BRAND_DARK.g, BRAND_DARK.b);
    doc.text(formatDuration(duracionMin), 120, yPos + 28);
  }
  
  yPos += 48;
  
  // ================ DATOS DE LLEGADA (si existen) ================
  const hasTimingData = placasVehiculo || nombreChoferProveedor || numeroRemisionProveedor;
  
  if (hasTimingData) {
    doc.setFillColor(255, 248, 240);
    doc.setDrawColor(255, 200, 150);
    doc.roundedRect(15, yPos, 180, 24, 3, 3, "FD");
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(180, 100, 40);
    doc.text("🚛 DATOS DEL TRANSPORTE", 20, yPos + 7);
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(BRAND_DARK.r, BRAND_DARK.g, BRAND_DARK.b);
    
    let xInfo = 20;
    if (placasVehiculo) {
      doc.setFont("helvetica", "bold");
      doc.text("Placas:", xInfo, yPos + 16);
      doc.setFont("helvetica", "normal");
      doc.text(placasVehiculo, xInfo + 18, yPos + 16);
      xInfo += 50;
    }
    
    if (nombreChoferProveedor) {
      doc.setFont("helvetica", "bold");
      doc.text("Chofer:", xInfo, yPos + 16);
      doc.setFont("helvetica", "normal");
      const nombreTruncado = nombreChoferProveedor.length > 20 
        ? nombreChoferProveedor.substring(0, 17) + "..." 
        : nombreChoferProveedor;
      doc.text(nombreTruncado, xInfo + 18, yPos + 16);
      xInfo += 55;
    }
    
    if (numeroRemisionProveedor) {
      doc.setFont("helvetica", "bold");
      doc.text("Remisión:", xInfo, yPos + 16);
      doc.setFont("helvetica", "normal");
      doc.text(numeroRemisionProveedor, xInfo + 22, yPos + 16);
    }
    
    yPos += 30;
  }
  
  // ================ PRODUCTOS TABLE ================
  yPos += 5;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(BRAND_DARK.r, BRAND_DARK.g, BRAND_DARK.b);
  doc.text("PRODUCTOS RECIBIDOS", 15, yPos);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(BRAND_GRAY.r, BRAND_GRAY.g, BRAND_GRAY.b);
  doc.text(`(${productos.length} productos)`, 72, yPos);
  
  yPos += 8;
  
  // Table header
  doc.setFillColor(BRAND_RED.r, BRAND_RED.g, BRAND_RED.b);
  doc.rect(15, yPos - 4, 180, 8, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("CÓDIGO", 17, yPos + 1);
  doc.text("PRODUCTO", 42, yPos + 1);
  doc.text("ORD.", 142, yPos + 1, { align: "right" });
  doc.text("REC.", 162, yPos + 1, { align: "right" });
  doc.text("DIF.", 182, yPos + 1, { align: "right" });
  
  // Table rows
  yPos += 8;
  
  productos.forEach((p, index) => {
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
      doc.text("PRODUCTO", 42, yPos + 1);
      doc.text("ORD.", 142, yPos + 1, { align: "right" });
      doc.text("REC.", 162, yPos + 1, { align: "right" });
      doc.text("DIF.", 182, yPos + 1, { align: "right" });
      yPos += 8;
    }
    
    const diferencia = p.cantidad_recibida - p.cantidad_ordenada;
    const hasDiferencia = diferencia !== 0;
    
    // Alternating row colors - highlight differences
    if (hasDiferencia) {
      doc.setFillColor(255, 240, 240);
    } else if (index % 2 === 0) {
      doc.setFillColor(250, 250, 250);
    } else {
      doc.setFillColor(255, 255, 255);
    }
    doc.rect(15, yPos - 3, 180, 7, "F");
    
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(BRAND_DARK.r, BRAND_DARK.g, BRAND_DARK.b);
    doc.text(p.producto?.codigo || "", 17, yPos + 1);
    
    // Use getDisplayName for consistent product formatting
    const nombreProducto = p.producto ? getDisplayName(p.producto) : "";
    const nombreTruncado = nombreProducto.length > 48 
      ? nombreProducto.substring(0, 45) + "..." 
      : nombreProducto;
    doc.text(nombreTruncado, 42, yPos + 1);
    
    doc.text(String(p.cantidad_ordenada), 142, yPos + 1, { align: "right" });
    
    // Received with color if different
    if (hasDiferencia) {
      doc.setTextColor(180, 30, 30);
      doc.setFont("helvetica", "bold");
    }
    doc.text(String(p.cantidad_recibida), 162, yPos + 1, { align: "right" });
    
    // Difference column
    if (diferencia !== 0) {
      const difText = diferencia > 0 ? `+${diferencia}` : String(diferencia);
      doc.text(difText, 182, yPos + 1, { align: "right" });
      
      // Show razón if exists
      if (p.razon_diferencia) {
        doc.setFontSize(6);
        doc.setTextColor(150, 100, 50);
        doc.text(`(${RAZON_LABELS[p.razon_diferencia] || p.razon_diferencia})`, 188, yPos + 1);
      }
    }
    
    doc.setTextColor(BRAND_DARK.r, BRAND_DARK.g, BRAND_DARK.b);
    doc.setFont("helvetica", "normal");
    
    yPos += 7;
  });
  
  // ================ NOTES SECTION ================
  if (recepcion.notas) {
    yPos += 8;
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFillColor(245, 245, 255);
    doc.setDrawColor(200, 200, 230);
    
    // Calculate height needed
    doc.setFontSize(8);
    const notasLines = doc.splitTextToSize(recepcion.notas, 168);
    const notasHeight = 12 + (notasLines.length * 4);
    
    doc.roundedRect(15, yPos, 180, notasHeight, 3, 3, "FD");
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(70, 70, 130);
    doc.text("📝 NOTAS", 20, yPos + 7);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(BRAND_DARK.r, BRAND_DARK.g, BRAND_DARK.b);
    
    let notaY = yPos + 14;
    notasLines.forEach((line: string) => {
      doc.text(line, 20, notaY);
      notaY += 4;
    });
    
    yPos += notasHeight + 5;
  }
  
  // ================ EVIDENCIAS FOTOGRÁFICAS ================
  if (evidenciasConTipos && evidenciasConTipos.length > 0) {
    doc.addPage();
    
    // Header bar for photos page
    doc.setFillColor(BRAND_RED.r, BRAND_RED.g, BRAND_RED.b);
    doc.rect(0, 0, 210, 8, "F");
    
    let photoY = 18;
    
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(BRAND_DARK.r, BRAND_DARK.g, BRAND_DARK.b);
    doc.text("EVIDENCIAS FOTOGRÁFICAS", 105, photoY, { align: "center" });
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(BRAND_GRAY.r, BRAND_GRAY.g, BRAND_GRAY.b);
    doc.text(`${recepcion.orden_compra.folio} - Entrega #${recepcion.numero_entrega}`, 105, photoY + 6, { align: "center" });
    
    photoY += 18;
    
    const imgWidth = 85;
    const imgHeight = 65;
    const margin = 15;
    const colWidth = imgWidth + 10;
    
    let col = 0;
    let startY = photoY;
    
    // Pre-load all images in parallel for faster PDF generation
    const imagePromises = evidenciasConTipos.map(({ url }) => loadImageAsBase64(url));
    const imagesBase64 = await Promise.all(imagePromises);
    
    for (let i = 0; i < evidenciasConTipos.length; i++) {
      const { tipo } = evidenciasConTipos[i];
      const base64Image = imagesBase64[i];
      
      // Check if we need a new page
      if (startY + imgHeight + 20 > 285) {
        doc.addPage();
        doc.setFillColor(BRAND_RED.r, BRAND_RED.g, BRAND_RED.b);
        doc.rect(0, 0, 210, 8, "F");
        startY = 20;
        col = 0;
      }
      
      const xPos = margin + (col * colWidth);
      
      try {
        if (base64Image) {
          // Shadow effect
          doc.setFillColor(230, 230, 230);
          doc.roundedRect(xPos + 2, startY + 2, imgWidth, imgHeight, 3, 3, "F");
          
          // Image container with border
          doc.setFillColor(255, 255, 255);
          doc.setDrawColor(200, 200, 200);
          doc.roundedRect(xPos - 2, startY - 2, imgWidth + 4, imgHeight + 4, 3, 3, "FD");
          
          // Add image with auto-detect format
          const imgFormat = getImageFormat(base64Image);
          doc.addImage(base64Image, imgFormat, xPos, startY, imgWidth, imgHeight);
          
          // Label badge below image
          const label = TIPO_EVIDENCIA_LABELS[tipo] || tipo;
          doc.setFillColor(BRAND_DARK.r, BRAND_DARK.g, BRAND_DARK.b);
          const labelWidth = Math.min(label.length * 2.5 + 8, imgWidth);
          doc.roundedRect(xPos + (imgWidth - labelWidth) / 2, startY + imgHeight + 4, labelWidth, 7, 2, 2, "F");
          
          doc.setFontSize(7);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(255, 255, 255);
          doc.text(label, xPos + (imgWidth / 2), startY + imgHeight + 9, { align: "center" });
          doc.setTextColor(BRAND_DARK.r, BRAND_DARK.g, BRAND_DARK.b);
          doc.setFont("helvetica", "normal");
        } else {
          // Draw placeholder if image failed to load
          doc.setFillColor(245, 245, 245);
          doc.setDrawColor(200, 200, 200);
          doc.roundedRect(xPos, startY, imgWidth, imgHeight, 3, 3, "FD");
          doc.setFontSize(8);
          doc.setTextColor(BRAND_GRAY.r, BRAND_GRAY.g, BRAND_GRAY.b);
          doc.text("Imagen no disponible", xPos + (imgWidth / 2), startY + (imgHeight / 2), { align: "center" });
        }
      } catch (error) {
        console.error("Error adding image to PDF:", error);
        // Draw placeholder
        doc.setFillColor(255, 240, 240);
        doc.setDrawColor(200, 150, 150);
        doc.roundedRect(xPos, startY, imgWidth, imgHeight, 3, 3, "FD");
        doc.setFontSize(8);
        doc.setTextColor(180, 100, 100);
        doc.text("Error cargando imagen", xPos + (imgWidth / 2), startY + (imgHeight / 2), { align: "center" });
      }
      
      col++;
      if (col >= 2) {
        col = 0;
        startY += imgHeight + 25;
      }
    }
    
    yPos = startY + imgHeight + 30;
  }
  
  // ================ DECLARACIÓN SIN SELLOS (si aplica) ================
  const hayDiferencias = productos.some(p => p.cantidad_recibida !== p.cantidad_ordenada);
  
  if (sinSellos && firmaSinSellos) {
    if (yPos > 200 || evidenciasConTipos.length > 0) {
      doc.addPage();
      doc.setFillColor(BRAND_RED.r, BRAND_RED.g, BRAND_RED.b);
      doc.rect(0, 0, 210, 8, "F");
      yPos = 30;
    } else {
      yPos += 15;
    }
    
    // Warning box for sin sellos
    doc.setFillColor(255, 245, 230);
    doc.setDrawColor(255, 180, 100);
    doc.roundedRect(15, yPos, 180, 50, 3, 3, "FD");
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(180, 100, 40);
    doc.text("⚠️ DECLARACIÓN: VEHÍCULO SIN SELLOS DE SEGURIDAD", 105, yPos + 10, { align: "center" });
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(BRAND_DARK.r, BRAND_DARK.g, BRAND_DARK.b);
    doc.text("El transportista declara que el vehículo llegó sin sellos de seguridad.", 105, yPos + 18, { align: "center" });
    
    // Firma sin sellos
    const sinSellosSignWidth = 50;
    const sinSellosSignHeight = 25;
    try {
      doc.addImage(firmaSinSellos, "PNG", 80, yPos + 22, sinSellosSignWidth, sinSellosSignHeight);
    } catch (e) {
      console.error("Error adding sin sellos signature:", e);
    }
    
    doc.setDrawColor(BRAND_DARK.r, BRAND_DARK.g, BRAND_DARK.b);
    doc.line(80, yPos + 45, 80 + sinSellosSignWidth, yPos + 45);
    doc.setFontSize(7);
    doc.text("Firma Transportista", 80 + sinSellosSignWidth / 2, yPos + 49, { align: "center" });
    
    yPos += 58;
  }

  // ================ SIGNATURES SECTION ================
  // Start on new page or continue if space
  if (yPos > 200 || (evidenciasConTipos.length > 0 && !sinSellos)) {
    doc.addPage();
    doc.setFillColor(BRAND_RED.r, BRAND_RED.g, BRAND_RED.b);
    doc.rect(0, 0, 210, 8, "F");
    yPos = 30;
  } else {
    yPos += 20;
  }
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(BRAND_DARK.r, BRAND_DARK.g, BRAND_DARK.b);
  doc.text("FIRMAS DE CONFORMIDAD", 105, yPos, { align: "center" });
  
  yPos += 15;
  
  // Determinar número de firmas a mostrar
  const mostrarFirmaDiferencia = hayDiferencias && firmaChoferDiferencia;
  const signatureWidth = mostrarFirmaDiferencia ? 55 : 65;
  const signatureHeight = 35;
  
  // Calcular posiciones X según número de firmas
  const xAlmacenista = mostrarFirmaDiferencia ? 15 : 25;
  const xChofer = mostrarFirmaDiferencia ? 75 : 115;
  const xDiferencia = 135;
  
  // Firma Almacenista box
  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(220, 220, 220);
  doc.roundedRect(xAlmacenista, yPos, signatureWidth + 10, signatureHeight + 25, 3, 3, "FD");
  
  if (firmaAlmacenista) {
    try {
      doc.addImage(firmaAlmacenista, "PNG", xAlmacenista + 5, yPos + 5, signatureWidth, signatureHeight);
    } catch (e) {
      console.error("Error adding almacenista signature:", e);
    }
  }
  
  doc.setDrawColor(BRAND_DARK.r, BRAND_DARK.g, BRAND_DARK.b);
  doc.line(xAlmacenista + 5, yPos + signatureHeight + 8, xAlmacenista + 5 + signatureWidth, yPos + signatureHeight + 8);
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(BRAND_DARK.r, BRAND_DARK.g, BRAND_DARK.b);
  doc.text("ALMACENISTA", xAlmacenista + 5 + signatureWidth / 2, yPos + signatureHeight + 15, { align: "center" });
  
  // Nombre del almacenista debajo
  if (recepcion.recibido_por_profile?.full_name) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(BRAND_GRAY.r, BRAND_GRAY.g, BRAND_GRAY.b);
    const nombreTruncado = recepcion.recibido_por_profile.full_name.length > 20 
      ? recepcion.recibido_por_profile.full_name.substring(0, 17) + "..." 
      : recepcion.recibido_por_profile.full_name;
    doc.text(nombreTruncado, xAlmacenista + 5 + signatureWidth / 2, yPos + signatureHeight + 20, { align: "center" });
  }
  
  // Firma Proveedor/Transportista box
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(xChofer, yPos, signatureWidth + 10, signatureHeight + 25, 3, 3, "FD");
  
  if (firmaChofer) {
    try {
      doc.addImage(firmaChofer, "PNG", xChofer + 5, yPos + 5, signatureWidth, signatureHeight);
    } catch (e) {
      console.error("Error adding driver signature:", e);
    }
  }
  
  doc.line(xChofer + 5, yPos + signatureHeight + 8, xChofer + 5 + signatureWidth, yPos + signatureHeight + 8);
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(BRAND_DARK.r, BRAND_DARK.g, BRAND_DARK.b);
  doc.text("TRANSPORTISTA", xChofer + 5 + signatureWidth / 2, yPos + signatureHeight + 15, { align: "center" });
  
  // Nombre del chofer debajo
  if (nombreChoferProveedor) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(BRAND_GRAY.r, BRAND_GRAY.g, BRAND_GRAY.b);
    const nombreTruncado = nombreChoferProveedor.length > 20 
      ? nombreChoferProveedor.substring(0, 17) + "..." 
      : nombreChoferProveedor;
    doc.text(nombreTruncado, xChofer + 5 + signatureWidth / 2, yPos + signatureHeight + 20, { align: "center" });
  }
  
  // Firma de Aceptación de Diferencia (solo si hay diferencias)
  if (mostrarFirmaDiferencia) {
    doc.setFillColor(255, 240, 240);
    doc.setDrawColor(220, 180, 180);
    doc.roundedRect(xDiferencia, yPos, signatureWidth + 10, signatureHeight + 25, 3, 3, "FD");
    
    try {
      doc.addImage(firmaChoferDiferencia!, "PNG", xDiferencia + 5, yPos + 5, signatureWidth, signatureHeight);
    } catch (e) {
      console.error("Error adding diferencia signature:", e);
    }
    
    doc.setDrawColor(180, 100, 100);
    doc.line(xDiferencia + 5, yPos + signatureHeight + 8, xDiferencia + 5 + signatureWidth, yPos + signatureHeight + 8);
    
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(180, 80, 80);
    doc.text("ACEPTO DIFERENCIA", xDiferencia + 5 + signatureWidth / 2, yPos + signatureHeight + 15, { align: "center" });
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.text("(Transportista)", xDiferencia + 5 + signatureWidth / 2, yPos + signatureHeight + 20, { align: "center" });
  }
  
  // ================ FOOTER ================
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Footer line
    doc.setDrawColor(220, 220, 220);
    doc.line(15, 285, 195, 285);
    
    // Footer text
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(BRAND_GRAY.r, BRAND_GRAY.g, BRAND_GRAY.b);
    doc.text(`Generado: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}`, 15, 290);
    doc.text(`Página ${i} de ${pageCount}`, 195, 290, { align: "right" });
    doc.text(COMPANY_DATA.direccionCompleta, 105, 290, { align: "center" });
  }
  
  // Generate filename
  const fileName = `Recepcion_${recepcion.orden_compra.folio}_E${recepcion.numero_entrega}_${format(new Date(), "yyyyMMdd")}.pdf`;
  
  return { doc, fileName };
};

// Función pública que genera y descarga el PDF
export const generarRecepcionPDF = async (data: RecepcionData): Promise<string> => {
  const { doc, fileName } = await generarDocumentoPDF(data);
  
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

// Nueva función que retorna el PDF como base64 para adjuntar a correos
export const generarRecepcionPDFBase64 = async (data: RecepcionData): Promise<{
  base64: string;
  fileName: string;
}> => {
  console.log("Generando PDF como base64 para email...");
  
  const { doc, fileName } = await generarDocumentoPDF(data);
  
  // Obtener como data URI y extraer solo el base64
  const dataUri = doc.output('datauristring');
  const base64 = dataUri.split(',')[1]; // Remover "data:application/pdf;base64,"
  
  console.log("PDF base64 generado:", fileName, "longitud:", base64.length);
  
  return { base64, fileName };
};

// Nueva función que retorna el PDF como Blob URL para vista previa (más eficiente para archivos grandes)
export const generarRecepcionPDFBlobUrl = async (data: RecepcionData): Promise<string> => {
  console.log("Generando PDF como Blob URL para preview...");
  
  const { doc } = await generarDocumentoPDF(data);
  
  // Usar blob en lugar de datauristring - más eficiente para archivos grandes en iframes
  const pdfBlob = doc.output('blob');
  const blobUrl = URL.createObjectURL(pdfBlob);
  
  console.log("PDF Blob URL generado para preview");
  return blobUrl;
};
