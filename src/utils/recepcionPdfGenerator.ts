import jsPDF from "jspdf";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface RecepcionData {
  recepcion: {
    id: string;
    numero_entrega: number;
    cantidad_bultos: number;
    fecha_programada: string | null;
    fecha_entrega_real: string | null;
    status: string;
    notas: string | null;
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
    producto: {
      codigo: string;
      nombre: string;
    };
  }>;
  evidenciasUrls?: string[];
}

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

export const generarRecepcionPDF = async (data: RecepcionData) => {
  const { recepcion, productos, evidenciasUrls = [] } = data;
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
  doc.text("ABARROTES LA MANITA SA DE CV", 105, 28, { align: "center" });
  
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
  
  // Products table
  let yPos = 95;
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
    
    // Alternating row colors
    if (index % 2 === 0) {
      doc.setFillColor(248, 248, 248);
      doc.rect(15, yPos - 4, 180, 7, "F");
    }
    
    doc.setFontSize(8);
    doc.text(p.producto?.codigo || "", 17, yPos);
    
    // Truncate product name if too long
    const nombreProducto = p.producto?.nombre || "";
    const nombreTruncado = nombreProducto.length > 50 
      ? nombreProducto.substring(0, 47) + "..." 
      : nombreProducto;
    doc.text(nombreTruncado, 45, yPos);
    
    doc.text(String(p.cantidad_ordenada), 140, yPos, { align: "right" });
    doc.text(String(p.cantidad_recibida), 175, yPos, { align: "right" });
    
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
  if (evidenciasUrls && evidenciasUrls.length > 0) {
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
    
    for (let i = 0; i < evidenciasUrls.length; i++) {
      const url = evidenciasUrls[i];
      
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
          
          // Add label
          doc.setFontSize(8);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(100, 100, 100);
          doc.text(`Evidencia ${i + 1}`, xPos + (imgWidth / 2), startY + imgHeight + 8, { align: "center" });
          doc.setTextColor(0, 0, 0);
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
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.setDrawColor(150, 150, 150);
  doc.line(20, yPos + 15, 80, yPos + 15);
  doc.line(120, yPos + 15, 180, yPos + 15);
  
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text("Firma Almacenista", 50, yPos + 22, { align: "center" });
  doc.text("Firma Proveedor/Transportista", 150, yPos + 22, { align: "center" });
  
  // Generate filename
  const fileName = `Recepcion_${recepcion.orden_compra.folio}_E${recepcion.numero_entrega}_${format(new Date(), "yyyyMMdd")}.pdf`;
  
  // Download
  doc.save(fileName);
  
  return fileName;
};
