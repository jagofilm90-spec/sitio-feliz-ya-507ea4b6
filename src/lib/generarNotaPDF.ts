import jsPDF from "jspdf";
import { COMPANY_DATA } from "@/constants/companyData";
import { toTitleCase, normalizeAddress } from "./textNormalization";

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
  sucursalNombre?: string;
  terminoCredito: string;
  total: number;
  subtotal?: number;
  impuestos?: number;
  pesoTotalKg?: number;
  numProductos?: number;
  productos: ProductoNota[];
}

const $ = (n: number) => `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const plazoLetras: Record<string, string> = { contado: "Contado", "8_dias": "Ocho", "15_dias": "Quince", "30_dias": "Treinta", "60_dias": "Sesenta" };
const plazoLabel: Record<string, string> = { contado: "Contado", "8_dias": "8 días", "15_dias": "15 días", "30_dias": "30 días", "60_dias": "60 días" };

async function loadImg(url: string): Promise<string | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const b = await r.blob();
    return new Promise(res => { const rd = new FileReader(); rd.onloadend = () => res(rd.result as string); rd.onerror = () => res(null); rd.readAsDataURL(b); });
  } catch { return null; }
}

// ================================================================
// NOTA INTERNA — 2 páginas: ORIGINAL + CLIENTE
// ================================================================
export async function generarNotaPDF(datos: DatosNota): Promise<{ base64: string; filename: string }> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });

  // Load images once
  const logoB64 = await loadImg("/logo-almasa-pdf.png");
  let qrB64: string | null = null;
  try { qrB64 = await loadImg(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(datos.folio)}`); } catch {}

  // Page 1: ORIGINAL
  renderNotaPage(doc, datos, logoB64, qrB64, "ORIGINAL");
  // Page 2: CLIENTE
  doc.addPage();
  renderNotaPage(doc, datos, logoB64, qrB64, "COPIA CLIENTE");

  const out = doc.output("datauristring");
  return { base64: out.split(",")[1], filename: `Nota_${datos.folio}.pdf` };
}

function renderNotaPage(doc: jsPDF, d: DatosNota, logo: string | null, qr: string | null, marca: string) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 12;
  const CW = W - 2 * M;
  let y = M;

  const BLK: [number, number, number] = [30, 30, 30];
  const GRY: [number, number, number] = [110, 110, 110];
  const LGRY: [number, number, number] = [190, 190, 190];
  const RED: [number, number, number] = [200, 16, 46];

  // ===== HEADER =====
  if (logo) { try { doc.addImage(logo, "PNG", W / 2 - 18, y, 36, 14); } catch {} }
  y += 16;
  doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(...BLK);
  doc.text("ABARROTES LA MANITA SA DE CV", W / 2, y, { align: "center" });
  y += 3.5;
  doc.setFontSize(6.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...GRY);
  doc.text(`RFC: ${COMPANY_DATA.rfc} | Tel: ${COMPANY_DATA.telefonosFormateados}`, W / 2, y, { align: "center" });
  y += 3;
  doc.text(COMPANY_DATA.direccionCortaMayusculas, W / 2, y, { align: "center" });
  y += 4;
  doc.setDrawColor(...RED); doc.setLineWidth(0.4); doc.line(M, y, W - M, y);
  y += 4;

  // ===== DATOS DEL PEDIDO (recuadro) =====
  const boxY = y;
  doc.setDrawColor(...LGRY); doc.setLineWidth(0.3);
  doc.roundedRect(M, boxY, CW, 28, 2, 2);

  // QR inside box (top-right)
  if (qr) { try { doc.addImage(qr, "PNG", W - M - 24, boxY + 2, 20, 20); } catch {} }
  doc.setFontSize(5.5); doc.setFont("helvetica", "bold"); doc.setTextColor(...RED);
  doc.text(d.folio, W - M - 14, boxY + 24, { align: "center" });

  const dataW = CW - 30; // leave space for QR
  doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(...GRY);
  const lx = M + 3;
  const vx = M + 28;
  let dy = boxY + 5;

  const field = (label: string, val: string, yy: number) => {
    doc.setFont("helvetica", "normal"); doc.setTextColor(...GRY); doc.text(label, lx, yy);
    doc.setFont("helvetica", "bold"); doc.setTextColor(...BLK);
    doc.text(toTitleCase(val).substring(0, 50), vx, yy);
  };

  field("NOMBRE:", d.clienteNombre, dy); dy += 5;
  field("DOMICILIO:", normalizeAddress(d.direccionEntrega) || d.sucursalNombre || "—", dy); dy += 5;
  field("VENDEDOR:", d.vendedorNombre, dy); dy += 5;

  // Row with multiple fields
  doc.setFont("helvetica", "normal"); doc.setTextColor(...GRY);
  doc.text("CREDITO:", lx, dy);
  doc.setFont("helvetica", "bold"); doc.setTextColor(...BLK);
  doc.text(plazoLabel[d.terminoCredito] || d.terminoCredito || "—", vx, dy);

  const pesoTotal = d.pesoTotalKg || d.productos.reduce((s, p) => s + (p.kgTotales || 0), 0);
  if (pesoTotal > 0) {
    doc.setFont("helvetica", "normal"); doc.setTextColor(...GRY);
    doc.text("PESO:", lx + 55, dy);
    doc.setFont("helvetica", "bold"); doc.setTextColor(...BLK);
    doc.text(`${Math.round(pesoTotal).toLocaleString()} kg`, lx + 68, dy);
  }
  doc.setFont("helvetica", "normal"); doc.setTextColor(...GRY);
  doc.text("PROD:", lx + 95, dy);
  doc.setFont("helvetica", "bold"); doc.setTextColor(...BLK);
  doc.text(`${d.numProductos || d.productos.length}`, lx + 107, dy);

  y = boxY + 32;

  // ===== TABLA PRODUCTOS =====
  const hasKg = d.productos.some(p => (p.kgTotales || 0) > 0);
  const colDefs = hasKg
    ? [{ l: "CANT.", w: 20, a: "center" as const }, { l: "DETALLE", w: CW - 20 - 22 - 24 - 24, a: "left" as const }, { l: "PESO", w: 22, a: "right" as const }, { l: "PRECIO U.", w: 24, a: "right" as const }, { l: "IMPORTE", w: 24, a: "right" as const }]
    : [{ l: "CANT.", w: 22, a: "center" as const }, { l: "DETALLE", w: CW - 22 - 26 - 26, a: "left" as const }, { l: "PRECIO U.", w: 26, a: "right" as const }, { l: "IMPORTE", w: 26, a: "right" as const }];

  // Header
  doc.setFillColor(40, 40, 40); doc.rect(M, y, CW, 6, "F");
  doc.setFontSize(6); doc.setFont("helvetica", "bold"); doc.setTextColor(255, 255, 255);
  let cx = M;
  for (const c of colDefs) {
    const tx = c.a === "center" ? cx + c.w / 2 : c.a === "right" ? cx + c.w - 2 : cx + 2;
    doc.text(c.l, tx, y + 4, { align: c.a }); cx += c.w;
  }
  y += 6;

  // Rows
  doc.setFontSize(7);
  for (let i = 0; i < d.productos.length; i++) {
    if (y > H - 55) { doc.addPage(); y = M; }
    const p = d.productos[i];
    if (i % 2 === 1) { doc.setFillColor(248, 248, 248); doc.rect(M, y, CW, 5.5, "F"); }
    doc.setTextColor(...BLK); doc.setFont("helvetica", "normal");
    cx = M;
    // Cant
    doc.text(`${p.cantidad} ${p.unidad}`, cx + colDefs[0].w / 2, y + 4, { align: "center" }); cx += colDefs[0].w;
    // Detalle
    doc.text(p.nombre.substring(0, 45), cx + 2, y + 4); cx += colDefs[1].w;
    // Peso (if column exists)
    if (hasKg) { doc.setTextColor(...GRY); doc.text(p.kgTotales ? `${p.kgTotales.toLocaleString("es-MX")} kg` : "—", cx + colDefs[2].w - 2, y + 4, { align: "right" }); cx += colDefs[2].w; doc.setTextColor(...BLK); }
    // Precio
    doc.text(`${$(p.precioUnitario)}${p.precioPorKilo ? "/kg" : ""}`, cx + colDefs[hasKg ? 3 : 2].w - 2, y + 4, { align: "right" }); cx += colDefs[hasKg ? 3 : 2].w;
    // Importe
    doc.setFont("helvetica", "bold");
    doc.text($(p.importe), cx + colDefs[hasKg ? 4 : 3].w - 2, y + 4, { align: "right" });
    doc.setDrawColor(230, 230, 230); doc.line(M, y + 5.5, W - M, y + 5.5);
    y += 5.5;
  }
  y += 3;

  // ===== TOTALES =====
  const tx = W - M - 55;
  if (d.subtotal) { doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...GRY); doc.text("Subtotal", tx, y); doc.setTextColor(...BLK); doc.text($(d.subtotal), W - M, y, { align: "right" }); y += 4; }
  if (d.impuestos) { doc.setTextColor(...GRY); doc.text("Impuestos", tx, y); doc.setTextColor(...BLK); doc.text($(d.impuestos), W - M, y, { align: "right" }); y += 4; }
  doc.setDrawColor(...RED); doc.setLineWidth(0.4); doc.line(tx, y, W - M, y); y += 4;
  doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(...BLK);
  doc.text("TOTAL", tx, y); doc.text($(d.total), W - M, y, { align: "right" });
  y += 8;

  // ===== DATOS BANCARIOS =====
  doc.setFontSize(6.5); doc.setFont("helvetica", "bold"); doc.setTextColor(...BLK);
  doc.text("DATOS BANCARIOS PARA PAGO", M, y); y += 3.5;
  doc.setFont("helvetica", "normal"); doc.setTextColor(...GRY); doc.setFontSize(6);
  const b = COMPANY_DATA.datosBancarios;
  doc.text(`Beneficiario: ${b.beneficiario} | Banco: ${b.banco} | Cuenta: ${b.cuenta}`, M, y); y += 3;
  doc.text(`CLABE: ${b.clabe} | Comprobante a: ${COMPANY_DATA.emails.pagos}`, M, y); y += 5;

  // ===== AVISO + PAGARÉ =====
  doc.setDrawColor(...LGRY); doc.line(M, y, W - M, y); y += 3;
  const midX = W / 2;

  // Left: aviso
  doc.setFontSize(5.5); doc.setFont("helvetica", "bold"); doc.setTextColor(...RED);
  doc.text("AVISO IMPORTANTE", M, y);
  doc.setFont("helvetica", "normal"); doc.setTextColor(...GRY); doc.setFontSize(5);
  const aviso = "FAVOR DE REVISAR SU PEDIDO COMPLETO A LA LLEGADA. RECIBIDA LA MERCANCIA NO SE ADMITEN RECLAMACIONES NI CAMBIOS.";
  const avisoLines = doc.splitTextToSize(aviso, midX - M - 5);
  doc.text(avisoLines, M, y + 3);
  doc.text(`Quejas: ${COMPANY_DATA.telefonos.principal}`, M, y + 3 + avisoLines.length * 2.5);

  // Right: pagaré
  doc.setFont("helvetica", "bold"); doc.setTextColor(...BLK); doc.setFontSize(5.5);
  doc.text("PAGARE", midX + 3, y);
  doc.setFont("helvetica", "normal"); doc.setFontSize(4.5); doc.setTextColor(...GRY);
  const pagare = `Debo(emos) y pagare(mos) incondicionalmente a la orden de ${COMPANY_DATA.razonSocial} la cantidad arriba mencionada a ${plazoLetras[d.terminoCredito] || "—"} dias de la fecha de recepcion de la mercancia.`;
  const pagareLines = doc.splitTextToSize(pagare, midX - M - 5);
  doc.text(pagareLines, midX + 3, y + 3);

  y += 18;

  // ===== FIRMA =====
  doc.setDrawColor(...BLK); doc.setLineWidth(0.2);
  doc.line(M + 10, y, M + 60, y);
  doc.line(midX + 5, y, midX + 55, y);
  doc.line(W - M - 50, y, W - M - 5, y);
  y += 3;
  doc.setFontSize(5); doc.setTextColor(...GRY);
  doc.text("Nombre y firma", M + 35, y, { align: "center" });
  doc.text("Fecha de recepcion", midX + 30, y, { align: "center" });
  doc.text("Sello del cliente", W - M - 27.5, y, { align: "center" });

  y += 6;

  // ===== FOOTER =====
  doc.setDrawColor(...LGRY); doc.line(M, y, W - M, y); y += 3;
  doc.setFontSize(5); doc.setTextColor(...GRY);
  doc.text(`${COMPANY_DATA.razonSocialLarga} | RFC: ${COMPANY_DATA.rfc} | ${COMPANY_DATA.regimenFiscalDescripcion}`, W / 2, y, { align: "center" }); y += 2.5;
  doc.text(`${COMPANY_DATA.direccionCortaMayusculas} | Tel: ${COMPANY_DATA.telefonosFormateados} | ${COMPANY_DATA.emails.ventas}`, W / 2, y, { align: "center" });

  y += 4;
  doc.setFontSize(5); doc.setTextColor(180, 180, 180);
  doc.text(`${marca} — Generado por ALMASA ERP`, W / 2, y, { align: "center" });
}

// ================================================================
// CONFIRMACIÓN PARA CLIENTE — PDF simple y limpio
// ================================================================
export async function generarConfirmacionClientePDF(datos: DatosNota): Promise<{ base64: string; filename: string }> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const W = doc.internal.pageSize.getWidth();
  const M = 15;
  const CW = W - 2 * M;
  let y = M;
  const BLK: [number, number, number] = [30, 30, 30];
  const GRY: [number, number, number] = [110, 110, 110];
  const RED: [number, number, number] = [200, 16, 46];

  // Header
  let logo: string | null = null;
  try { logo = await loadImg("/logo-almasa-pdf.png"); } catch {}
  if (logo) { try { doc.addImage(logo, "PNG", W / 2 - 18, y, 36, 14); } catch {} }
  y += 17;
  doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(...BLK);
  doc.text("ABARROTES LA MANITA SA DE CV — Desde 1904", W / 2, y, { align: "center" });
  y += 8;

  doc.setDrawColor(...RED); doc.setLineWidth(0.4); doc.line(M, y, W - M, y); y += 8;

  // Title
  doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.setTextColor(...BLK);
  doc.text("Pedido Confirmado", M, y); y += 6;
  doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(...GRY);
  doc.text(datos.folio, M, y); y += 8;

  doc.setFontSize(9); doc.setTextColor(...BLK);
  doc.text(`Estimado(a) ${toTitleCase(datos.clienteNombre)}, su pedido ha sido confirmado.`, M, y); y += 10;

  // Products table
  doc.setFillColor(40, 40, 40); doc.rect(M, y, CW, 7, "F");
  doc.setFontSize(7); doc.setFont("helvetica", "bold"); doc.setTextColor(255, 255, 255);
  doc.text("PRODUCTO", M + 2, y + 5);
  doc.text("CANT.", M + CW - 70, y + 5, { align: "right" });
  doc.text("PRECIO", M + CW - 35, y + 5, { align: "right" });
  doc.text("IMPORTE", M + CW - 2, y + 5, { align: "right" });
  y += 7;

  doc.setFontSize(8);
  for (let i = 0; i < datos.productos.length; i++) {
    const p = datos.productos[i];
    if (i % 2 === 1) { doc.setFillColor(248, 248, 248); doc.rect(M, y, CW, 6, "F"); }
    doc.setFont("helvetica", "normal"); doc.setTextColor(...BLK);
    doc.text(p.nombre.substring(0, 40), M + 2, y + 4);
    doc.text(`${p.cantidad} ${p.unidad}`, M + CW - 70, y + 4, { align: "right" });
    doc.text($(p.precioUnitario), M + CW - 35, y + 4, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.text($(p.importe), M + CW - 2, y + 4, { align: "right" });
    doc.setDrawColor(230, 230, 230); doc.line(M, y + 6, W - M, y + 6);
    y += 6;
  }

  y += 4;
  doc.setDrawColor(...RED); doc.setLineWidth(0.4); doc.line(M + CW - 60, y, W - M, y); y += 5;
  doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(...BLK);
  doc.text("TOTAL", M + CW - 60, y);
  doc.text($(datos.total), W - M, y, { align: "right" });
  y += 10;

  // Bank details
  doc.setFontSize(7); doc.setFont("helvetica", "bold"); doc.setTextColor(...BLK);
  doc.text("DATOS BANCARIOS PARA PAGO", M, y); y += 4;
  doc.setFont("helvetica", "normal"); doc.setTextColor(...GRY); doc.setFontSize(7);
  const b = COMPANY_DATA.datosBancarios;
  doc.text(`Beneficiario: ${b.beneficiario}`, M, y); y += 3.5;
  doc.text(`Banco: ${b.banco} | Cuenta: ${b.cuenta} | CLABE: ${b.clabe}`, M, y); y += 3.5;
  doc.text(`Enviar comprobante a: ${COMPANY_DATA.emails.pagos}`, M, y); y += 8;

  // Disclaimer
  doc.setFillColor(255, 249, 235);
  doc.roundedRect(M, y, CW, 14, 2, 2, "F");
  doc.setFontSize(6); doc.setFont("helvetica", "bold"); doc.setTextColor(146, 64, 14);
  const disclaimer = "AVISO: Este documento es una confirmacion de pedido. Las cantidades y el total pueden variar hasta el momento de la entrega debido a diferencias de peso en bascula u otros ajustes.";
  const dLines = doc.splitTextToSize(disclaimer, CW - 8);
  doc.text(dLines, M + 4, y + 5);

  y += 20;

  // Footer
  doc.setFontSize(5.5); doc.setTextColor(160, 160, 160);
  doc.text(`${COMPANY_DATA.razonSocialLarga} | RFC: ${COMPANY_DATA.rfc}`, W / 2, y, { align: "center" }); y += 2.5;
  doc.text(`${COMPANY_DATA.direccionCorta} | Tel: ${COMPANY_DATA.telefonosFormateados}`, W / 2, y, { align: "center" });

  const out = doc.output("datauristring");
  return { base64: out.split(",")[1], filename: `Confirmacion_${datos.folio}.pdf` };
}
