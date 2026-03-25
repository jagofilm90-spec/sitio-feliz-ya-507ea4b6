/**
 * Generador de PDFs de pedidos usando PedidoPrintTemplate + html2canvas + jsPDF.
 * Mismo método probado que usa VendedorNuevoPedidoTab.
 */
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { PedidoPrintTemplate, type DatosPedidoPrint, type VariantePrint } from "@/components/pedidos/PedidoPrintTemplate";

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
  await new Promise(r => setTimeout(r, 600));

  const canvas = await html2canvas(container, { scale, useCORS: true, logging: false, backgroundColor: "#ffffff" });
  root.unmount();
  document.body.removeChild(container);
  return canvas;
}

function addPage(pdf: jsPDF, canvas: HTMLCanvasElement) {
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const ratio = Math.min(pw / canvas.width, ph / canvas.height);
  const x = (pw - canvas.width * ratio) / 2;
  pdf.addImage(canvas.toDataURL("image/jpeg", 0.85), "JPEG", x, 3, canvas.width * ratio, canvas.height * ratio);
}

function el(variante: VariantePrint, datos: DatosPedidoPrint) {
  return React.createElement(PedidoPrintTemplate, { datos, variante, hideQR: false });
}

/**
 * PDF interno (2 hojas): ORIGINAL + HOJA DE CARGA (almacén)
 * Se adjunta al email a pedidos@almasa.com.mx
 */
export async function generarNotaInternaPDF(datos: DatosPedidoPrint): Promise<{ base64: string; filename: string }> {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });

  const c1 = await renderToCanvas(el("original", datos));
  addPage(pdf, c1);

  pdf.addPage();
  const c2 = await renderToCanvas(el("almacen", datos));
  addPage(pdf, c2);

  const out = pdf.output("datauristring");
  return { base64: out.split(",")[1], filename: `Nota_${datos.folio}.pdf` };
}

/**
 * PDF confirmación cliente (1 hoja)
 * Se adjunta al email al cliente
 */
export async function generarConfirmacionClientePDF(datos: DatosPedidoPrint): Promise<{ base64: string; filename: string }> {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });

  const c = await renderToCanvas(el("confirmacion_cliente", datos));
  addPage(pdf, c);

  const out = pdf.output("datauristring");
  return { base64: out.split(",")[1], filename: `Confirmacion_${datos.folio}.pdf` };
}

// Re-export for backward compat
export const generarNotaPDF = generarNotaInternaPDF;

// Re-export types
export type { DatosPedidoPrint, VariantePrint };
