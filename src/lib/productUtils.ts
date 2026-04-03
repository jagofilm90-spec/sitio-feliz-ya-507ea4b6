/**
 * Utility functions for product display and calculations
 */

/**
 * Catálogo de unidades de producto para formularios
 * Sincronizado con el enum unit_type de la base de datos
 */
export const UNIDADES_PRODUCTO = [
  { value: 'bulto',   label: 'Bulto'   },
  { value: 'balon',   label: 'Balón'   },
  { value: 'caja',    label: 'Caja'    },
  { value: 'cubeta',  label: 'Cubeta'  },
  { value: 'paquete', label: 'Paquete' },
  { value: 'pieza',   label: 'Pieza'   },
  { value: 'churla',  label: 'Churla'  },
] as const;

/**
 * Unidades legacy que ya no se permiten al crear, pero se muestran si existen en BD
 */
export const UNIDADES_LEGACY = [
  { value: 'costal', label: 'Costal' },
  { value: 'kg', label: 'Kilogramo' },
  { value: 'litro', label: 'Litro' },
  { value: 'balón', label: 'Balón' },
] as const;

export type UnidadProductoValue = typeof UNIDADES_PRODUCTO[number]['value'];

/**
 * Obtiene el label de una unidad por su valor
 */
export function getUnidadLabel(value: string | null | undefined): string {
  if (!value) return '';
  const unidad = UNIDADES_PRODUCTO.find(u => u.value === value);
  return unidad?.label || value;
}

/**
 * Pluraliza una unidad en español
 */
export function pluralizarUnidad(unidad: string, cantidad: number): string {
  if (cantidad === 1) return unidad;
  if (unidad === 'balón') return 'balones';
  if (unidad.endsWith('z')) return unidad.slice(0, -1) + 'ces';
  return unidad + 's';
}

export interface ProductoBase {
  nombre: string;
  marca?: string | null;
  especificaciones?: string | null;
  unidad?: string | null;
  contenido_empaque?: string | null;
  peso_kg?: number | null;
  es_promocion?: boolean;
  descripcion_promocion?: string | null;
}

/**
 * Genera el Display Name completo del producto siguiendo el formato:
 * {Nombre base} {Especificaciones} {Marca} — {Unidad} {Contenido} (PROMO: descripción)
 *
 * Ejemplos:
 * - Ciruela Pasa 30/40 Huertos Monserrat — Caja 10 kg
 * - Veladora Santo Cristo Cono Rosa San Felipe — Caja 40 pz
 * - Azúcar Estándar — Costal 50 kg
 * - Arroz Uruguayo Cinta Azul Saman — Bulto 25 kg
 * 
 * @param producto - Objeto con datos del producto
 * @param options - Opciones adicionales
 * @param options.includePromo - Si es true, incluye indicador de promoción en el nombre
 */
export function getDisplayName(
  producto: ProductoBase,
  options?: { includePromo?: boolean }
): string {
  const parts: string[] = [producto.nombre];

  // Agregar especificaciones/variantes primero (ej: "30/40", "Cono Rosa")
  if (producto.especificaciones) {
    parts.push(producto.especificaciones);
  }

  // Agregar marca después (ej: "Huertos Monserrat", "San Felipe")
  if (producto.marca) {
    parts.push(producto.marca);
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
  
  // Agregar indicador de promoción si está habilitado
  if (options?.includePromo && producto.es_promocion && producto.descripcion_promocion) {
    parts.push(`(${producto.descripcion_promocion})`);
  } else if (options?.includePromo && producto.es_promocion) {
    parts.push('(PROMO)');
  }
  
  return parts.join(' ');
}

/**
 * Genera el nombre para remisiones/documentos, incluyendo texto de promoción si aplica
 */
export function getDisplayNameForRemision(producto: ProductoBase): string {
  return getDisplayName(producto, { includePromo: true });
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
 * {Nombre base} {Especificaciones} {Marca} {Contenido}
 * Sin el separador "—"
 */
export function getCompactDisplayName(producto: ProductoBase): string {
  const parts: string[] = [producto.nombre];

  if (producto.especificaciones) {
    parts.push(producto.especificaciones);
  }

  if (producto.marca) {
    parts.push(producto.marca);
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
