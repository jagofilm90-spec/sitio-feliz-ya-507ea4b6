/**
 * Parser for Lecaroz order formats (panaderías HTML/text, rosticerías)
 */

export interface ParsedProducto {
  codigo_lecaroz: number;
  nombre: string;
  cantidad: number;
  presentacion: string;
  cantidad_kilos: number;
}

export interface ParsedSucursal {
  numero: number;
  nombre: string;
  productos: ParsedProducto[];
  rfc?: string;
  razon_social?: string;
}

export interface ParseResult {
  tipo_cotizacion: "avio_panaderias" | "avio_rosticerias" | "azucar";
  sucursales: ParsedSucursal[];
}

/**
 * Strip HTML tags for plain text parsing
 */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/td>/gi, "\t")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');
}

/**
 * Detect if text is rosticería format
 */
function isRosticerias(text: string): boolean {
  return /SUCURSAL:\s*\d+\s*ROST/i.test(text);
}

/**
 * Parse panadería format (the main format)
 * 
 * Format:
 * 1 LAGO
 * Producto    Pedido       Entregar
 * 3   AZUCAR REFINADA  675    KILOS  27   BULTOS DE 25 KILOS
 */
function parsePanaderias(text: string): ParseResult {
  const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  
  const sucursales: ParsedSucursal[] = [];
  let current: ParsedSucursal | null = null;

  // Header pattern: starts with number, then uppercase name
  const headerRegex = /^(\d+)\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s\.\(\)0-9\-]+)$/;
  // Skip patterns
  const skipRegex = /^(Producto|PRODUCTO|No\.|Pedido|Entregar|={3,}|-{3,}|_{3,}|\s*$)/i;
  
  for (const line of lines) {
    const headerMatch = line.match(headerRegex);
    if (headerMatch) {
      if (current && current.productos.length > 0) {
        sucursales.push(current);
      }
      current = {
        numero: parseInt(headerMatch[1]),
        nombre: headerMatch[2].trim(),
        productos: [],
      };
      continue;
    }

    if (skipRegex.test(line)) continue;
    if (!current) continue;

    // Product line: split by multiple spaces or tabs
    const parts = line.split(/\t+|\s{2,}/).map(p => p.trim()).filter(p => p.length > 0);
    
    if (parts.length < 2) continue;

    // Try to extract: codigo nombre cant_kilos unidad cant_piezas presentacion
    // The first token may be just the code, or code+name combined
    let codigo = 0;
    let nombre = "";
    let cantKilos = 0;
    let cantPiezas = 0;
    let presentacion = "";

    // Check if first part starts with a number (code)
    const firstMatch = parts[0].match(/^(\d+)\s*(.*)/);
    if (firstMatch) {
      codigo = parseInt(firstMatch[1]);
      nombre = firstMatch[2] || (parts.length > 1 ? parts[1] : "");
      
      // Parse remaining parts
      // Expected: nombre, cant_kilos, KILOS, cant_piezas, PRESENTACION
      let remainingParts: string[];
      if (firstMatch[2]) {
        // Code and name in same field
        remainingParts = parts.slice(1);
      } else {
        // Code alone, name is next field
        nombre = parts[1] || "";
        remainingParts = parts.slice(2);
      }

      // Look for numeric values in remaining parts
      const numericParts: { value: number; text: string }[] = [];
      const textParts: string[] = [];
      
      for (const p of remainingParts) {
        const num = parseFloat(p.replace(/,/g, ""));
        if (!isNaN(num) && /^\d/.test(p)) {
          numericParts.push({ value: num, text: p });
        } else {
          textParts.push(p);
        }
      }

      // Pattern: cant_kilos KILOS cant_piezas PRESENTACION
      if (numericParts.length >= 2) {
        cantKilos = numericParts[0].value;
        cantPiezas = numericParts[1].value;
      } else if (numericParts.length === 1) {
        cantPiezas = numericParts[0].value;
      }

      // Build presentacion from text parts after the quantity
      // Look for pattern like "BULTOS DE 25 KILOS"
      const allText = remainingParts.join(" ");
      const presMatch = allText.match(/(\d+)\s+(BULTOS?|CAJAS?|BOLSAS?|BALON(?:ES)?|KILOS?)\s*(DE\s+\d+\s+KILOS?)?/i);
      if (presMatch) {
        // cantPiezas is the number before BULTOS/CAJAS
        cantPiezas = parseInt(presMatch[1]);
        presentacion = presMatch[0];
      } else {
        // Fallback: join non-numeric text parts
        presentacion = textParts.filter(t => !/^KILOS?$/i.test(t)).join(" ");
      }
    }

    if (codigo > 0 && nombre) {
      current.productos.push({
        codigo_lecaroz: codigo,
        nombre: nombre.toUpperCase(),
        cantidad: cantPiezas || cantKilos,
        presentacion: presentacion || "UNIDAD",
        cantidad_kilos: cantKilos,
      });
    }
  }

  // Push last sucursal
  if (current && current.productos.length > 0) {
    sucursales.push(current);
  }

  // Detect if this is azúcar-only (all products are azúcar codes 3, 4, 952)
  const azucarCodes = new Set([3, 4, 952]);
  const allAzucar = sucursales.every(s => 
    s.productos.every(p => azucarCodes.has(p.codigo_lecaroz))
  );

  return {
    tipo_cotizacion: allAzucar ? "azucar" : "avio_panaderias",
    sucursales,
  };
}

/**
 * Parse rosticería format
 * 
 * SUCURSAL: 301 ROST. CRUCERO
 * RFC: PCA0406117X8
 * RAZON SOCIAL: PANIFICADORA CHALMA
 * PRODUCTO | PEDIDO | UNIDAD MEDIDA | ENTREGAR
 * 417 BOL.ROLLO POLIPAPEL | 10 | KILO | 10 KILO DE 1 KILOS
 */
function parseRosticerias(text: string): ParseResult {
  const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  
  const sucursales: ParsedSucursal[] = [];
  let current: ParsedSucursal | null = null;

  const sucursalRegex = /^SUCURSAL:\s*(\d+)\s+(.+)/i;
  const rfcRegex = /^RFC:\s*(.+)/i;
  const razonRegex = /^RAZON\s*SOCIAL:\s*(.+)/i;
  const headerRegex = /^PRODUCTO\s*\|/i;

  for (const line of lines) {
    const sucMatch = line.match(sucursalRegex);
    if (sucMatch) {
      if (current && current.productos.length > 0) {
        sucursales.push(current);
      }
      current = {
        numero: parseInt(sucMatch[1]),
        nombre: sucMatch[2].trim(),
        productos: [],
      };
      continue;
    }

    if (!current) continue;

    const rfcMatch = line.match(rfcRegex);
    if (rfcMatch) { current.rfc = rfcMatch[1].trim(); continue; }

    const razonMatch = line.match(razonRegex);
    if (razonMatch) { current.razon_social = razonMatch[1].trim(); continue; }

    if (headerRegex.test(line)) continue;

    // Product line with pipes
    if (line.includes("|")) {
      const parts = line.split("|").map(p => p.trim());
      if (parts.length >= 4) {
        const prodMatch = parts[0].match(/^(\d+)\s+(.+)/);
        if (prodMatch) {
          const cant = parseFloat(parts[1]) || 0;
          // Parse entregar column: "10 KILO DE 1 KILOS"
          const entregarMatch = parts[3]?.match(/^(\d+)\s+(.+)/);
          current.productos.push({
            codigo_lecaroz: parseInt(prodMatch[1]),
            nombre: prodMatch[2].trim().toUpperCase(),
            cantidad: entregarMatch ? parseInt(entregarMatch[1]) : cant,
            presentacion: entregarMatch ? entregarMatch[2] : parts[2] || "UNIDAD",
            cantidad_kilos: cant,
          });
        }
      }
    }
  }

  if (current && current.productos.length > 0) {
    sucursales.push(current);
  }

  return {
    tipo_cotizacion: "avio_rosticerias",
    sucursales,
  };
}

/**
 * Main parser entry point — auto-detects format
 */
export function parseLecarozText(input: string): ParseResult {
  // Strip HTML if present
  const text = input.includes("<") ? stripHtml(input) : input;
  
  if (isRosticerias(text)) {
    return parseRosticerias(text);
  }
  
  return parsePanaderias(text);
}
