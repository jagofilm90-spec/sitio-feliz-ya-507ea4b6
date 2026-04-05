import { jsPDF } from "jspdf";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ordenarProductosAzucarPrimero } from "@/lib/calculos";
import { COMPANY_DATA } from "@/constants/companyData";
import { getDisplayName } from "@/lib/productUtils";
import type { ProductoPrecio } from "@/hooks/useListaPrecios";

type PdfVersion = "cliente" | "interno";

interface ListaPreciosPdfOptions {
  productos: ProductoPrecio[];
  version: PdfVersion;
  categoriaFilter?: string | null;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(amount);

const loadImageAsBase64 = async (url: string): Promise<string> => {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const getProductName = (p: ProductoPrecio) =>
  getDisplayName({
    nombre: p.nombre,
    marca: p.marca,
    especificaciones: p.especificaciones,
    unidad: p.unidad,
    contenido_empaque: p.contenido_empaque,
    peso_kg: p.peso_kg,
    es_promocion: p.es_promocion ?? false,
    descripcion_promocion: p.descripcion_promocion,
  });

export async function generarListaPreciosPDF(options: ListaPreciosPdfOptions): Promise<string> {
  const { productos, version, categoriaFilter } = options;

  const isInterno = version === "interno";
  const fechaHoy = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es });

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  let y = 10;

  // Colors
  const brandRed: [number, number, number] = [139, 35, 50];
  const darkText: [number, number, number] = [33, 37, 41];
  const grayText: [number, number, number] = [100, 100, 100];
  const white: [number, number, number] = [255, 255, 255];
  const lightBg: [number, number, number] = [245, 245, 245];
  const catBg: [number, number, number] = [230, 230, 230];

  // ==================== HEADER ====================
  const logoWidth = 40;
  const logoHeight = 11;
  try {
    const logoBase64 = await loadImageAsBase64("/logo-almasa-pdf.png");
    doc.addImage(logoBase64, "PNG", margin, y, logoWidth, logoHeight);
  } catch {
    doc.setTextColor(...brandRed);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("ALMASA", margin, y + 8);
  }

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...brandRed);
  doc.text("LISTA DE PRECIOS", margin + logoWidth + 5, y + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...grayText);
  doc.text(COMPANY_DATA.razonSocial, margin + logoWidth + 5, y + 12);

  // Badge
  const badgeText = isInterno ? "USO INTERNO" : "PARA CLIENTE";
  const badgeWidth = 38;
  const badgeX = pageWidth - margin - badgeWidth;
  doc.setFillColor(...brandRed);
  doc.roundedRect(badgeX, y, badgeWidth, 10, 2, 2, "F");
  doc.setTextColor(...white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(badgeText, badgeX + badgeWidth / 2, y + 7, { align: "center" });

  // Date
  y += 13;
  doc.setTextColor(...grayText);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Fecha: ${fechaHoy}`, pageWidth - margin, y, { align: "right" });
  if (categoriaFilter && categoriaFilter !== "all" && categoriaFilter !== "todas") {
    doc.text(`Categoría: ${categoriaFilter}`, margin, y);
  }

  // Red line
  y += 4;
  doc.setDrawColor(...brandRed);
  doc.setLineWidth(0.6);
  doc.line(margin, y, pageWidth - margin, y);

  y += 5;

  // ==================== GROUP BY CATEGORY ====================
  const grouped: Record<string, ProductoPrecio[]> = {};
  for (const p of productos) {
    const cat = p.categoria || "Sin categoría";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(p);
  }
  const sortedCategories = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));

  // ==================== TABLE COLUMNS ====================
  // Client: Código | Producto | Unidad | Precio | IVA/IEPS
  // Internal: Código | Producto | Unidad | Precio | Desc. Máx | Precio Mín | IVA/IEPS

  const colCode = margin;
  const colCodeW = 18;
  const colProduct = colCode + colCodeW;
  const colUnitW = 16;
  const colPriceW = 22;
  const colDescW = isInterno ? 18 : 0;
  const colMinW = isInterno ? 22 : 0;
  const colTaxW = 16;

  const colProductW = pageWidth - margin * 2 - colCodeW - colUnitW - colPriceW - colDescW - colMinW - colTaxW;
  const colUnit = colProduct + colProductW;
  const colPrice = colUnit + colUnitW;
  const colDesc = colPrice + colPriceW;
  const colMin = colDesc + colDescW;
  const colTax = isInterno ? colMin + colMinW : colDesc;

  const rowHeight = 5;
  const headerHeight = 6;

  // Draw table header
  const drawTableHeader = () => {
    doc.setFillColor(...brandRed);
    doc.rect(margin, y, pageWidth - margin * 2, headerHeight, "F");
    doc.setTextColor(...white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);

    const headerY = y + 4.2;
    doc.text("Código", colCode + 1, headerY);
    doc.text("Producto", colProduct + 1, headerY);
    doc.text("Unidad", colUnit + 1, headerY);
    doc.text("Precio", colPrice + colPriceW - 1, headerY, { align: "right" });
    if (isInterno) {
      doc.text("Desc. Máx", colDesc + colDescW - 1, headerY, { align: "right" });
      doc.text("Precio Mín", colMin + colMinW - 1, headerY, { align: "right" });
    }
    doc.text("Imp.", colTax + 1, headerY);

    y += headerHeight;
  };

  // Check page break
  const checkPageBreak = (needed: number) => {
    if (y + needed > pageHeight - 18) {
      // Footer
      drawFooter();
      doc.addPage();
      y = 12;
      drawTableHeader();
    }
  };

  // Footer
  const drawFooter = () => {
    const footerY = pageHeight - 8;
    doc.setDrawColor(...brandRed);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(...grayText);
    doc.text(
      `${COMPANY_DATA.razonSocial}  |  Tel: ${COMPANY_DATA.telefonos.principal}  |  ${COMPANY_DATA.emails.ventas}`,
      margin,
      footerY
    );
    doc.text(
      `Página ${doc.getNumberOfPages()}`,
      pageWidth - margin,
      footerY,
      { align: "right" }
    );
  };

  // ==================== RENDER TABLE ====================
  drawTableHeader();

  for (const [categoria, prods] of sortedCategories) {
    // Order within category
    const ordered = ordenarProductosAzucarPrimero(prods, (p) => p.nombre);

    // Category header
    checkPageBreak(rowHeight + 2);
    doc.setFillColor(...catBg);
    doc.rect(margin, y, pageWidth - margin * 2, rowHeight + 0.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...darkText);
    doc.text(`${categoria.toUpperCase()} (${ordered.length})`, margin + 2, y + 3.8);
    y += rowHeight + 0.5;

    // Products
    for (let i = 0; i < ordered.length; i++) {
      const p = ordered[i];
      checkPageBreak(rowHeight);

      // Alternate row background
      if (i % 2 === 0) {
        doc.setFillColor(...lightBg);
        doc.rect(margin, y, pageWidth - margin * 2, rowHeight, "F");
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(...darkText);

      const rowY = y + 3.5;

      // Code
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...grayText);
      doc.text(p.codigo || "", colCode + 1, rowY);

      // Product name (truncate if needed)
      doc.setTextColor(...darkText);
      const name = getProductName(p);
      const maxNameWidth = colProductW - 2;
      const truncated = doc.getTextWidth(name) > maxNameWidth
        ? name.substring(0, Math.floor(maxNameWidth / doc.getTextWidth("a") * name.length)) + "..."
        : name;
      doc.text(truncated, colProduct + 1, rowY);

      // Unit
      doc.setTextColor(...grayText);
      doc.text(p.unidad || "", colUnit + 1, rowY);

      // Price
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...darkText);
      const priceText = formatCurrency(p.precio_venta || 0) + (p.precio_por_kilo ? "/kg" : "");
      doc.text(priceText, colPrice + colPriceW - 1, rowY, { align: "right" });

      if (isInterno) {
        // Discount max
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...grayText);
        doc.text(
          p.descuento_maximo ? formatCurrency(p.descuento_maximo) : "—",
          colDesc + colDescW - 1,
          rowY,
          { align: "right" }
        );

        // Minimum price
        const pisoMinimo = (p.precio_venta || 0) - (p.descuento_maximo || 0);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(pisoMinimo > 0 ? 34 : 200, pisoMinimo > 0 ? 139 : 50, pisoMinimo > 0 ? 34 : 50);
        doc.text(
          p.descuento_maximo ? formatCurrency(pisoMinimo) : "—",
          colMin + colMinW - 1,
          rowY,
          { align: "right" }
        );
      }

      // Tax badges
      doc.setFont("helvetica", "normal");
      doc.setFontSize(5.5);
      const taxes: string[] = [];
      if (p.aplica_iva) taxes.push("IVA");
      if (p.aplica_ieps) taxes.push("IEPS");
      doc.setTextColor(...grayText);
      doc.text(taxes.join("+") || "—", colTax + 1, rowY);

      y += rowHeight;
    }
  }

  // Final footer
  drawFooter();

  // ==================== SAVE ====================
  const suffix = isInterno ? "Interno" : "Cliente";
  const fileName = `Lista_Precios_${suffix}_${format(new Date(), "yyyy-MM-dd")}.pdf`;
  doc.save(fileName);
  return fileName;
}
