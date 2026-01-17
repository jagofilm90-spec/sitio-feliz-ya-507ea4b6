/**
 * Utility functions for product display and calculations
 */

export interface ProductoBase {
  nombre: string;
  marca?: string | null;
  especificaciones?: string | null;
  unidad?: string | null;
  contenido_empaque?: string | null;
  peso_kg?: number | null;
}

/**
 * Genera el Display Name completo del producto siguiendo el formato:
 * {Nombre base} {Marca} {Variantes} — {Unidad} {Contenido}
 * 
 * Ejemplos:
 * - Azúcar refinada Potrero — Bulto 25 kg
 * - Ciruela pasa Huertos Monserrat 30/40 — Caja 10 kg
 * - Piña rodaja en almíbar Agrover (14 rodajas) — Caja 24×800 g
 */
export function getDisplayName(producto: ProductoBase): string {
  const parts: string[] = [producto.nombre];
  
  // Agregar marca si existe
  if (producto.marca) {
    parts.push(producto.marca);
  }
  
  // Agregar especificaciones/variantes si existen
  if (producto.especificaciones) {
    parts.push(producto.especificaciones);
  }
  
  // Construir parte del empaque
  const empaque = producto.contenido_empaque || 
    (producto.peso_kg ? `${producto.peso_kg} kg` : null);
  
  if (empaque && producto.unidad) {
    const unidadLabel = capitalizeFirst(producto.unidad);
    parts.push(`— ${unidadLabel} ${empaque}`);
  } else if (empaque) {
    parts.push(`— ${empaque}`);
  }
  
  return parts.join(' ');
}

/**
 * Genera una versión corta del nombre del producto para espacios reducidos:
 * {Nombre base} {Especificaciones}
 */
export function getShortDisplayName(producto: ProductoBase): string {
  const parts: string[] = [producto.nombre];
  
  if (producto.especificaciones) {
    parts.push(producto.especificaciones);
  }
  
  return parts.join(' ');
}

/**
 * Genera el nombre con marca para mostrar en listas:
 * {Nombre base} {Especificaciones} ({Marca})
 */
export function getDisplayNameWithBrand(producto: ProductoBase): string {
  let name = producto.nombre;
  
  if (producto.especificaciones) {
    name += ` ${producto.especificaciones}`;
  }
  
  if (producto.marca) {
    name += ` (${producto.marca})`;
  }
  
  return name;
}

/**
 * Genera una versión compacta del nombre para espacios muy reducidos (tablets, listas móviles):
 * {Nombre base} {Marca} {Especificaciones} {Contenido}
 * Sin el separador "—"
 */
export function getCompactDisplayName(producto: ProductoBase): string {
  const parts: string[] = [producto.nombre];
  
  if (producto.marca) {
    parts.push(producto.marca);
  }
  
  if (producto.especificaciones) {
    parts.push(producto.especificaciones);
  }
  
  // Agregar empaque compacto
  const empaque = producto.contenido_empaque || 
    (producto.peso_kg ? `${producto.peso_kg}kg` : null);
  
  if (empaque) {
    parts.push(empaque);
  }
  
  return parts.join(' ');
}

function capitalizeFirst(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Catálogo de unidades SAT más comunes para productos
 */
export const UNIDADES_SAT = [
  { clave: 'H87', descripcion: 'Pieza' },
  { clave: 'KGM', descripcion: 'Kilogramo' },
  { clave: 'LTR', descripcion: 'Litro' },
  { clave: 'XBX', descripcion: 'Caja' },
  { clave: 'XSA', descripcion: 'Saco/Costal' },
  { clave: 'XPK', descripcion: 'Paquete' },
  { clave: 'XCU', descripcion: 'Cubeta' },
  { clave: 'XUN', descripcion: 'Unidad' },
  { clave: 'GRM', descripcion: 'Gramo' },
  { clave: 'MLT', descripcion: 'Mililitro' },
  { clave: 'XRO', descripcion: 'Rollo' },
  { clave: 'XBA', descripcion: 'Bolsa' },
  { clave: 'XBT', descripcion: 'Botella' },
  { clave: 'XLT', descripcion: 'Lata' },
  { clave: 'XFR', descripcion: 'Frasco' },
  { clave: 'TNE', descripcion: 'Tonelada' },
] as const;

export type UnidadSATClave = typeof UNIDADES_SAT[number]['clave'];

/**
 * Obtiene la descripción de una unidad SAT por su clave
 */
export function getUnidadSATDescripcion(clave: string | null | undefined): string {
  if (!clave) return '';
  const unidad = UNIDADES_SAT.find(u => u.clave === clave);
  return unidad?.descripcion || clave;
}
