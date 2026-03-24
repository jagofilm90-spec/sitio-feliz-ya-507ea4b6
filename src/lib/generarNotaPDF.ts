import jsPDF from "jspdf";

interface ProductoNota {
  cantidad: number;
  unidad: string;
  nombre: string;
  precioUnitario: number;
  importe: number;
  kgTotales?: number | null;
  precioPorKilo?: boolean;
}

interface DatosNota {
  folio: string;
  clienteNombre: string;
  vendedorNombre: string;
  direccionEntrega: string;
  terminoCredito: string;
  total: number;
  subtotal?: number;
  impuestos?: number;
  productos: ProductoNota[];
}

const fmt = (n: number) => `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const plazoLetras: Record<string, string> = { contado: "Contado", "8_dias": "Ocho", "15_dias": "Quince", "30_dias": "Treinta", "60_dias": "Sesenta" };

async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

export async function generarNotaPDF(datos: DatosNota): Promise<{ base64: string; filename: string }> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const W = doc.internal.pageSize.getWidth();
  const M = 15; // margin
  const CW = W - 2 * M; // content width
  let y = M;

  // Colors
  const RED: [number, number, number] = [200, 16, 46];
  const BLK: [number, number, number] = [34, 34, 34];
  const GRY: [number, number, number] = [120, 120, 120];
  const LGRY: [number, number, number] = [200, 200, 200];

  // ========== HEADER ==========
  // Try to load logo
  try {
    const logoB64 = await loadImageAsBase64("/logo-almasa-pdf.png");
    if (logoB64) doc.addImage(logoB64, "PNG", M, y, 32, 13);
  } catch {}

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BLK);
  doc.text("ABARROTES LA MANITA SA DE CV", M + 36, y + 5);
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...GRY);
  doc.text("Desde 1904", M + 36, y + 9);
  doc.setFont("helvetica", "normal");
  doc.text("RFC: AMA700701GI8", M + 36, y + 13);
  doc.setFontSize(6.5);
  doc.text("Melchor Ocampo No. 59, Col. Magdalena Mixiuhca, C.P. 15850, CDMX", M + 36, y + 17);
  doc.text("Tel: 55-5764-1433 / 55-5552-8750 / 55-5552-0168", M + 36, y + 21);

  // QR (right side)
  try {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(datos.folio)}`;
    const qrB64 = await loadImageAsBase64(qrUrl);
    if (qrB64) {
      doc.addImage(qrB64, "PNG", W - M - 22, y, 22, 22);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...RED);
      doc.text(datos.folio, W - M - 11, y + 25, { align: "center" });
    }
  } catch {}

  y += 30;
  doc.setDrawColor(...RED);
  doc.setLineWidth(0.5);
  doc.line(M, y, W - M, y);
  y += 6;

  // ========== CAMPOS ==========
  doc.setTextColor(...BLK);
  doc.setFontSize(8);

  const campo = (label: string, value: string, x: number, yy: number, w: number) => {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRY);
    doc.text(label, x, yy);
    doc.setTextColor(...BLK);
    doc.setFont("helvetica", "bold");
    const labelW = doc.getTextWidth(label) + 2;
    doc.text(value || "", x + labelW, yy);
    doc.setDrawColor(...LGRY);
    doc.line(x + labelW, yy + 1, x + w, yy + 1);
  };

  const col2X = M + CW * 0.6;
  campo("Nombre:", datos.clienteNombre, M, y, CW * 0.55);
  campo("Fecha:", "", col2X, y, CW * 0.4);
  y += 7;
  campo("Domicilio:", datos.direccionEntrega || "", M, y, CW * 0.55);
  campo("Unidad:", "", col2X, y, CW * 0.4);
  y += 7;
  campo("Sello vendedor:", datos.vendedorNombre, M, y, CW * 0.55);
  campo("N/N:", "", col2X, y, CW * 0.4);
  y += 10;

  // ========== TABLA PRODUCTOS ==========
  const cols = [
    { label: "CANTIDAD", w: 25, align: "center" as const },
    { label: "DETALLE", w: CW - 25 - 28 - 28, align: "left" as const },
    { label: "PRECIO U.", w: 28, align: "right" as const },
    { label: "IMPORTE", w: 28, align: "right" as const },
  ];

  // Header
  doc.setFillColor(51, 51, 51);
  doc.rect(M, y, CW, 7, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  let colX = M;
  for (const col of cols) {
    const tx = col.align === "center" ? colX + col.w / 2 : col.align === "right" ? colX + col.w - 2 : colX + 2;
    doc.text(col.label, tx, y + 5, { align: col.align });
    colX += col.w;
  }
  y += 7;

  // Rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  for (let i = 0; i < datos.productos.length; i++) {
    const p = datos.productos[i];
    if (y > 240) { doc.addPage(); y = M; } // page break

    if (i % 2 === 1) {
      doc.setFillColor(248, 248, 248);
      doc.rect(M, y, CW, 6, "F");
    }

    doc.setTextColor(...BLK);
    colX = M;
    // Cantidad
    doc.text(`${p.cantidad} ${p.unidad}`, colX + cols[0].w / 2, y + 4, { align: "center" });
    colX += cols[0].w;
    // Detalle
    const detalle = p.precioPorKilo && p.kgTotales ? `${p.nombre} (${p.kgTotales.toLocaleString("es-MX")} kg)` : p.nombre;
    doc.text(detalle.substring(0, 55), colX + 2, y + 4);
    colX += cols[1].w;
    // Precio
    doc.text(`${fmt(p.precioUnitario)}${p.precioPorKilo ? "/kg" : ""}`, colX + cols[2].w - 2, y + 4, { align: "right" });
    colX += cols[2].w;
    // Importe
    doc.setFont("helvetica", "bold");
    doc.text(fmt(p.importe), colX + cols[3].w - 2, y + 4, { align: "right" });
    doc.setFont("helvetica", "normal");

    // Row border
    doc.setDrawColor(...LGRY);
    doc.line(M, y + 6, W - M, y + 6);
    y += 6;
  }

  y += 4;

  // ========== TOTALES ==========
  const totX = W - M - 60;
  if (datos.subtotal) {
    doc.setFontSize(8);
    doc.setTextColor(...GRY);
    doc.text("Subtotal", totX, y);
    doc.setTextColor(...BLK);
    doc.text(fmt(datos.subtotal), W - M, y, { align: "right" });
    y += 5;
  }
  if (datos.impuestos) {
    doc.setTextColor(...GRY);
    doc.text("Impuestos", totX, y);
    doc.setTextColor(...BLK);
    doc.text(fmt(datos.impuestos), W - M, y, { align: "right" });
    y += 5;
  }
  doc.setDrawColor(...RED);
  doc.setLineWidth(0.5);
  doc.line(totX, y, W - M, y);
  y += 5;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BLK);
  doc.text("TOTAL", totX, y);
  doc.text(fmt(datos.total), W - M, y, { align: "right" });

  // Pagaré (left side)
  const plazo = plazoLetras[datos.terminoCredito] || datos.terminoCredito || "—";
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRY);
  doc.text(`Pagare a ${plazo} dias`, M, y - 5);

  y += 12;

  // ========== PIE ==========
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GRY);
  doc.text("RECIBIDA LA MERCANCIA NO SE ADMITEN RECLAMACIONES NI CAMBIOS", W / 2, y, { align: "center" });

  y += 14;
  doc.setDrawColor(...BLK);
  doc.setLineWidth(0.3);
  doc.line(M, y, M + 70, y);
  doc.line(W - M - 70, y, W - M, y);
  y += 4;
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.text("NOMBRE Y FIRMA DE CONFORMIDAD", M + 35, y, { align: "center" });
  doc.text("SELLO DE LA EMPRESA", W - M - 35, y, { align: "center" });

  y += 10;
  doc.setFontSize(6);
  doc.setTextColor(180, 180, 180);
  doc.text("ORIGINAL — Generado por ALMASA ERP", W / 2, y, { align: "center" });

  // Export
  const pdfOutput = doc.output("datauristring");
  const base64 = pdfOutput.split(",")[1]; // remove data:application/pdf;base64, prefix

  return {
    base64,
    filename: `Nota_${datos.folio}.pdf`,
  };
}
