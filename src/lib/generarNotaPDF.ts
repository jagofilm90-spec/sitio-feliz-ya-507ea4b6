import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { PedidoPrintTemplate, type DatosPedidoPrint, type VariantePrint } from "@/components/pedidos/PedidoPrintTemplate";

// Render React element to canvas (same pattern as VendedorNuevoPedidoTab)
async function renderToCanvas(element: React.ReactElement, scale = 2): Promise<HTMLCanvasElement> {
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "8.5in";
  container.style.backgroundColor = "#ffffff";
  document.body.appendChild(container);

  const root = createRoot(container);
  flushSync(() => { root.render(element); });
  await new Promise(resolve => setTimeout(resolve, 500));

  const canvas = await html2canvas(container, {
    scale, useCORS: true, logging: false, backgroundColor: "#ffffff",
  });

  root.unmount();
  document.body.removeChild(container);
  return canvas;
}

function canvasToPage(pdf: jsPDF, canvas: HTMLCanvasElement) {
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const ratio = Math.min(pdfWidth / canvas.width, pdfHeight / canvas.height);
  const imgX = (pdfWidth - canvas.width * ratio) / 2;
  const imgData = canvas.toDataURL("image/jpeg", 0.85);
  pdf.addImage(imgData, "JPEG", imgX, 5, canvas.width * ratio, canvas.height * ratio);
}

/**
 * Genera PDF interno (pedidos@): ORIGINAL + COPIA CLIENTE (2 páginas)
 */
export async function generarNotaPDF(datos: DatosPedidoPrint): Promise<{ base64: string; filename: string }> {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });

  // Página 1: ORIGINAL
  const canvas1 = await renderToCanvas(
    React.createElement(PedidoPrintTemplate, { datos, variante: "original" }), 2
  );
  canvasToPage(pdf, canvas1);

  // Página 2: COPIA CLIENTE
  pdf.addPage();
  const canvas2 = await renderToCanvas(
    React.createElement(PedidoPrintTemplate, { datos, variante: "copia_cliente" }), 2
  );
  canvasToPage(pdf, canvas2);

  const out = pdf.output("datauristring");
  return { base64: out.split(",")[1], filename: `Nota_${datos.folio}.pdf` };
}

/**
 * Genera PDF de confirmación para el cliente (1 página)
 */
export async function generarConfirmacionClientePDF(datos: DatosPedidoPrint): Promise<{ base64: string; filename: string }> {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });

  const canvas = await renderToCanvas(
    React.createElement(PedidoPrintTemplate, { datos, variante: "confirmacion_cliente" }), 2
  );
  canvasToPage(pdf, canvas);

  const out = pdf.output("datauristring");
  return { base64: out.split(",")[1], filename: `Confirmacion_${datos.folio}.pdf` };
}

/**
 * Genera hoja de carga para almacén (sin precios, 1 página)
 */
export async function generarHojaCargaPDF(datos: DatosPedidoPrint): Promise<{ base64: string; filename: string }> {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });

  const canvas = await renderToCanvas(
    React.createElement(PedidoPrintTemplate, { datos, variante: "almacen" }), 2
  );
  canvasToPage(pdf, canvas);

  const out = pdf.output("datauristring");
  return { base64: out.split(",")[1], filename: `Carga_${datos.folio}.pdf` };
}
