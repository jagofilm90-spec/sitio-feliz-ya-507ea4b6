/**
 * Generador de PDF para Reporte de Recepciones del Día
 * Genera un documento con resumen de KPIs y detalle de cada recepción
 */

import jsPDF from "jspdf";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { COMPANY_DATA } from "@/constants/companyData";

interface ProductoRecibido {
  id: string;
  codigo: string;
  nombre: string;
  marca?: string | null;
  cantidadOrdenada: number;
  cantidadRecibida: number;
  diferencia: number;
  razonDiferencia?: string | null;
}

interface RecepcionDelDia {
  id: string;
  folio: string;
  proveedor: string;
  numeroEntrega: number | null;
  bultos: number;
  productos: ProductoRecibido[];
  recibidoPor: string;
  horaLlegada: string;
  horaFinRecepcion: string;
  duracionMinutos: number;
  tieneDiferencias: boolean;
}

interface ReporteStats {
  totalRecepciones: number;
  tiempoPromedioMinutos: number;
  conDiferencias: number;
  personalActivo: string[];
}

const RAZON_LABELS: Record<string, string> = {
  faltante: "Faltante",
  danado: "Dañado",
  no_solicitado: "No solicitado",
  diferencia_peso: "Diferencia de peso",
  otro: "Otro",
};

const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

const loadLogoAsBase64 = async (): Promise<string | null> => {
  try {
    const response = await fetch("/logo-almasa-pdf.png");
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

export const generarReporteRecepcionesDiaPDF = async (
  fecha: Date,
  recepciones: RecepcionDelDia[],
  stats: ReporteStats
): Promise<void> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = margin;

  // Cargar logo
  const logoBase64 = await loadLogoAsBase64();

  // ========== HEADER ==========
  if (logoBase64) {
    doc.addImage(logoBase64, "PNG", margin, y, 40, 15);
  }

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Reporte de Recepciones", pageWidth - margin, y + 5, { align: "right" });

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(format(fecha, "EEEE, d 'de' MMMM yyyy", { locale: es }), pageWidth - margin, y + 12, {
    align: "right",
  });

  y += 25;

  // Línea separadora
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // ========== KPIs ==========
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, y, pageWidth - margin * 2, 25, "F");

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 100, 100);

  const kpiWidth = (pageWidth - margin * 2) / 4;
  const kpiY = y + 10;

  // KPI 1: Total Recepciones
  doc.text("RECEPCIONES", margin + kpiWidth * 0.5, kpiY - 3, { align: "center" });
  doc.setFontSize(18);
  doc.setTextColor(0, 0, 0);
  doc.text(stats.totalRecepciones.toString(), margin + kpiWidth * 0.5, kpiY + 8, { align: "center" });

  // KPI 2: Tiempo Promedio
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text("TIEMPO PROMEDIO", margin + kpiWidth * 1.5, kpiY - 3, { align: "center" });
  doc.setFontSize(18);
  doc.setTextColor(0, 0, 0);
  doc.text(formatDuration(stats.tiempoPromedioMinutos), margin + kpiWidth * 1.5, kpiY + 8, {
    align: "center",
  });

  // KPI 3: Con Diferencias
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text("CON DIFERENCIAS", margin + kpiWidth * 2.5, kpiY - 3, { align: "center" });
  doc.setFontSize(18);
  doc.setTextColor(stats.conDiferencias > 0 ? 200 : 0, stats.conDiferencias > 0 ? 100 : 0, 0);
  doc.text(stats.conDiferencias.toString(), margin + kpiWidth * 2.5, kpiY + 8, { align: "center" });

  // KPI 4: Personal Activo
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text("PERSONAL", margin + kpiWidth * 3.5, kpiY - 3, { align: "center" });
  doc.setFontSize(18);
  doc.setTextColor(0, 0, 0);
  doc.text(stats.personalActivo.length.toString(), margin + kpiWidth * 3.5, kpiY + 8, {
    align: "center",
  });

  y += 35;

  // ========== DETALLE DE RECEPCIONES ==========
  for (let i = 0; i < recepciones.length; i++) {
    const recepcion = recepciones[i];

    // Verificar si necesitamos nueva página
    const estimatedHeight = 50 + recepcion.productos.length * 8;
    if (y + estimatedHeight > pageHeight - 30) {
      doc.addPage();
      y = margin;
    }

    // Header de recepción
    doc.setFillColor(recepcion.tieneDiferencias ? 255 : 240, recepcion.tieneDiferencias ? 245 : 255, 245);
    doc.rect(margin, y, pageWidth - margin * 2, 18, "F");

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(
      `${recepcion.folio}${recepcion.numeroEntrega && recepcion.numeroEntrega > 1 ? ` - Entrega #${recepcion.numeroEntrega}` : ""}`,
      margin + 3,
      y + 7
    );

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(recepcion.proveedor, margin + 3, y + 13);

    // Info de tiempo
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(
      `Llegó: ${recepcion.horaLlegada} | Terminó: ${recepcion.horaFinRecepcion} | Duración: ${formatDuration(recepcion.duracionMinutos)}`,
      pageWidth - margin - 3,
      y + 7,
      { align: "right" }
    );
    doc.text(`Recibió: ${recepcion.recibidoPor}`, pageWidth - margin - 3, y + 13, { align: "right" });

    // Estado
    if (recepcion.tieneDiferencias) {
      doc.setFillColor(220, 53, 69);
      doc.setTextColor(255, 255, 255);
      doc.roundedRect(pageWidth - margin - 30, y + 1, 27, 5, 1, 1, "F");
      doc.setFontSize(7);
      doc.text("DIFERENCIAS", pageWidth - margin - 16.5, y + 4.5, { align: "center" });
    }

    y += 20;

    // Tabla de productos
    const colWidths = [25, 70, 20, 20, 20, 25];
    const headers = ["Código", "Producto", "Ordenado", "Recibido", "Dif.", "Razón"];

    // Header de tabla
    doc.setFillColor(230, 230, 230);
    doc.rect(margin, y, pageWidth - margin * 2, 7, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(60, 60, 60);

    let xPos = margin + 2;
    headers.forEach((header, idx) => {
      doc.text(header, xPos, y + 5);
      xPos += colWidths[idx];
    });

    y += 8;

    // Filas de productos
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);

    recepcion.productos.forEach((producto) => {
      if (y > pageHeight - 25) {
        doc.addPage();
        y = margin;
      }

      xPos = margin + 2;

      // Código
      doc.text(producto.codigo.substring(0, 10), xPos, y + 4);
      xPos += colWidths[0];

      // Nombre (truncado)
      const nombreDisplay = producto.marca
        ? `${producto.nombre} - ${producto.marca}`
        : producto.nombre;
      doc.text(nombreDisplay.substring(0, 35), xPos, y + 4);
      xPos += colWidths[1];

      // Ordenado
      doc.text(producto.cantidadOrdenada.toString(), xPos + 5, y + 4);
      xPos += colWidths[2];

      // Recibido
      doc.text(producto.cantidadRecibida.toString(), xPos + 5, y + 4);
      xPos += colWidths[3];

      // Diferencia
      if (producto.diferencia !== 0) {
        doc.setTextColor(producto.diferencia < 0 ? 220 : 40, producto.diferencia < 0 ? 53 : 167, producto.diferencia < 0 ? 69 : 69);
        doc.text(
          (producto.diferencia > 0 ? "+" : "") + producto.diferencia.toString(),
          xPos + 5,
          y + 4
        );
        doc.setTextColor(0, 0, 0);
      } else {
        doc.text("✓", xPos + 5, y + 4);
      }
      xPos += colWidths[4];

      // Razón
      if (producto.razonDiferencia) {
        doc.setFontSize(7);
        doc.text(RAZON_LABELS[producto.razonDiferencia] || producto.razonDiferencia, xPos, y + 4);
        doc.setFontSize(8);
      }

      y += 6;
    });

    y += 8;
  }

  // ========== FOOTER ==========
  const addFooter = () => {
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Generado el ${format(new Date(), "dd/MM/yyyy HH:mm")} | Página ${i} de ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      );
      doc.text(COMPANY_DATA.razonSocial, pageWidth / 2, pageHeight - 5, { align: "center" });
    }
  };

  addFooter();

  // Guardar
  const fileName = `Reporte_Recepciones_${format(fecha, "yyyy-MM-dd")}.pdf`;
  doc.save(fileName);
};
