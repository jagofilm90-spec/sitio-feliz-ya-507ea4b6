/**
 * Generador de PDFs de pedidos — LANDSCAPE
 * Usa PedidoPrintTemplate (React) + html2canvas + jsPDF.
 */
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { PedidoPrintTemplate, type DatosPedidoPrint, type VariantePrint } from "@/components/pedidos/PedidoPrintTemplate";

async function renderToCanvas(element: React.ReactElement, containerWidth: string, scale = 2): Promise<HTMLCanvasElement> {
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = containerWidth;
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
 * PDF interno (2 hojas): ORIGINAL (carta landscape) + HOJA DE CARGA (media carta landscape)
 */
export async function generarNotaInternaPDF(datos: DatosPedidoPrint): Promise<{ base64: string; filename: string }> {
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "letter" });

  // Page 1: Original — carta landscape (279.4 x 215.9 mm)
  const c1 = await renderToCanvas(el("original", datos), "11in");
  addPage(pdf, c1);

  // Page 2: Hoja de carga — media carta landscape (215.9 x 177.8 mm = 8.5 x 7 in)
  pdf.addPage([215.9, 177.8], "landscape");
  const c2 = await renderToCanvas(el("almacen", datos), "8.5in");
  addPage(pdf, c2);

  const out = pdf.output("datauristring");
  return { base64: out.split(",")[1], filename: `Nota_${datos.folio}.pdf` };
}

/**
 * PDF confirmación cliente (1 hoja carta landscape)
 */
export async function generarConfirmacionClientePDF(datos: DatosPedidoPrint): Promise<{ base64: string; filename: string }> {
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "letter" });

  const c = await renderToCanvas(el("confirmacion_cliente", datos), "11in");
  addPage(pdf, c);

  const out = pdf.output("datauristring");
  return { base64: out.split(",")[1], filename: `Confirmacion_${datos.folio}.pdf` };
}

// Backward compat alias
export const generarNotaPDF = generarNotaInternaPDF;

export type { DatosPedidoPrint, VariantePrint };
