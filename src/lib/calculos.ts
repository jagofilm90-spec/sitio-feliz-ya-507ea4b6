/**
 * SISTEMA CENTRALIZADO DE CÁLCULOS NUMÉRICOS
 * 
 * Este módulo es la única fuente de verdad para TODOS los cálculos numéricos del sistema.
 * REGLAS NO NEGOCIABLES:
 * 1. Toda operación matemática debe pasar por estas funciones
 * 2. Cero tolerancia a errores - validaciones estrictas en cada paso
 * 3. Logs completos de auditoría para trazabilidad
 * 4. Redondeo consistente a 2 decimales en todos los casos
 */

import { auditoriaCalculos } from './auditoria-calculos';

// ==================== CONSTANTES ====================
const IVA_RATE = 0.16; // 16%
const IEPS_RATE = 0.08; // 8%
const DECIMAL_PRECISION = 2;

// ==================== PRODUCTOS BOLSAS 5KG (ANÍS / CANELA MOLIDA) ====================
export const PRODUCTOS_BOLSAS_5KG = ['anís', 'anis', 'canela molida'];
export const KG_POR_BOLSA = 5;

// ==================== ORDENAMIENTO DE PRODUCTOS (AZÚCARES PRIMERO) ====================
/**
 * Orden de prioridad para productos de azúcar
 * Azúcares van primero, luego el resto (avío) en orden alfabético
 */
const ORDEN_AZUCAR: Record<string, number> = {
  'azucar estandar': 1,
  'azucar estándar': 1,
  'azúcar estándar': 1,
  'azúcar estandar': 1,
  'azucar refinada': 2,
  'azúcar refinada': 2,
  'azucar glas': 3,
  'azúcar glas': 3,
};

/**
 * Ordena productos poniendo azúcares primero (Estándar, Refinada, Glas)
 * y luego el resto en orden alfabético
 */
export function ordenarProductosAzucarPrimero<T>(
  productos: T[],
  getNombre: (p: T) => string
): T[] {
  return [...productos].sort((a, b) => {
    const nombreA = getNombre(a).toLowerCase();
    const nombreB = getNombre(b).toLowerCase();
    
    // Buscar orden de azúcar
    const ordenA = Object.entries(ORDEN_AZUCAR).find(([key]) => nombreA.includes(key))?.[1] || 999;
    const ordenB = Object.entries(ORDEN_AZUCAR).find(([key]) => nombreB.includes(key))?.[1] || 999;
    
    // Si alguno es azúcar, ordenar por prioridad
    if (ordenA !== ordenB) {
      return ordenA - ordenB;
    }
    
    // Si ambos son avío (o mismo tipo de azúcar), ordenar alfabéticamente
    return nombreA.localeCompare(nombreB);
  });
}

/**
 * Detecta si un producto es Anís o Canela Molida (que se venden en bolsas de 5kg)
 */
export function esProductoBolsas5kg(nombre: string): boolean {
  const nombreLower = nombre?.toLowerCase() || '';
  return PRODUCTOS_BOLSAS_5KG.some(p => nombreLower.includes(p));
}

/**
 * Redondea una cantidad de kg hacia arriba a bolsas completas
 * REGLA: Siempre redondear hacia ARRIBA a múltiplos de kgPorBolsa
 * Ejemplos con 5kg: 1kg→5kg, 6kg→10kg, 11kg→15kg, 17kg→20kg
 */
export function redondearABolsasCompletas(cantidadKg: number, kgPorBolsa: number = 5): number {
  const bolsas = Math.ceil(cantidadKg / kgPorBolsa);
  return bolsas * kgPorBolsa;
}

/**
 * Calcula el número de bolsas necesarias para una cantidad de kg
 */
export function calcularNumeroBolsas(cantidadKg: number, kgPorBolsa: number = 5): number {
  return Math.ceil(cantidadKg / kgPorBolsa);
}

// ==================== REDONDEO ====================

/**
 * Redondea un número a 2 decimales
 * CRÍTICO: Esta es la única forma válida de redondear en todo el sistema
 */
export function redondear(valor: number): number {
  return Math.round(valor * 100) / 100;
}

// ==================== PRECIO UNITARIO DE VENTA ====================

export interface ProductoPrecioParams {
  precio_venta: number;
  precio_por_kilo?: boolean;
  peso_kg?: string | number | null;
}

/**
 * Obtiene el precio unitario de venta real para un producto.
 * Si el producto tiene precio_por_kilo=true, multiplica por los kg de la presentación.
 * 
 * REGLA: Si precio_por_kilo=true → precio_unitario = precio_venta × kilos_presentacion
 * REGLA: Si precio_por_kilo=false → precio_unitario = precio_venta (sin cambios)
 * 
 * Ejemplo: Alpiste 25kg a $13/kg → precio_unitario = $13 × 25 = $325/bulto
 * 
 * @param producto - Objeto con datos del producto
 * @returns Precio unitario por unidad comercial (bulto, caja, etc.)
 */
export function obtenerPrecioUnitarioVenta(producto: ProductoPrecioParams): number {
  // Si no es precio por kilo, devolver el precio de venta directamente
  if (!producto.precio_por_kilo) {
    return producto.precio_venta;
  }
  
  // Usar SOLO peso_kg para obtener los kilos
  const kilos = typeof producto.peso_kg === 'number'
    ? producto.peso_kg
    : parseFloat(producto.peso_kg || "0");
  
  if (!kilos || kilos <= 0) {
    console.warn(
      `Producto con precio_por_kilo=true pero sin peso_kg definido. ` +
      `Usando precio_venta sin multiplicar: ${producto.precio_venta}`
    );
    return producto.precio_venta;
  }
  
  const precioCalculado = redondear(producto.precio_venta * kilos);
  
  auditoriaCalculos.registrar('precio_unitario_venta', {
    entrada: { 
      precio_venta: producto.precio_venta, 
      precio_por_kilo: producto.precio_por_kilo,
      peso_kg: kilos 
    },
    salida: { precio_calculado: precioCalculado },
    valido: true,
    contexto: { formula: `${producto.precio_venta}/kg × ${kilos} kg = ${precioCalculado}` }
  });
  
  return precioCalculado;
}

// ==================== CONVERSIÓN DE UNIDADES ====================

export interface ConversionUnidadParams {
  cantidad_kilos: number;
  kg_por_unidad: number | null;
  precio_por_kilo: boolean;
  unidad_comercial: string;
  nombre_producto: string;
}

export interface ResultadoConversion {
  cantidad_final: number;
  unidad_final: string;
  formula_usada: string;
  valido: boolean;
  error?: string;
}

/**
 * Convierte kilos a unidades comerciales según configuración del producto
 * REGLAS:
 * 1. Si precio_por_kilo = true → SIEMPRE trabajar en kilos, NO convertir
 * 2. Si precio_por_kilo = false → convertir kilos a unidades usando presentacion (peso en kg)
 * 3. Si falta presentacion para conversión → ERROR, no asumir valores
 */
export function convertirUnidades(params: ConversionUnidadParams): ResultadoConversion {
  const { cantidad_kilos, kg_por_unidad, precio_por_kilo, unidad_comercial, nombre_producto } = params;
  
  // kg_por_unidad ahora es peso_kg
  const pesoKg = kg_por_unidad;

  // Validación inicial
  if (cantidad_kilos <= 0) {
    return {
      cantidad_final: 0,
      unidad_final: 'kg',
      formula_usada: 'ERROR',
      valido: false,
      error: `Cantidad inválida: ${cantidad_kilos}. Debe ser mayor a 0.`
    };
  }

  // REGLA 1: Productos por kilo NO se convierten
  if (precio_por_kilo) {
    const resultado = {
      cantidad_final: redondear(cantidad_kilos),
      unidad_final: 'kg',
      formula_usada: `cantidad_kilos=${cantidad_kilos} → ${cantidad_kilos} kg (precio_por_kilo=true, NO CONVERTIR)`,
      valido: true
    };

    auditoriaCalculos.registrar('conversion_unidades', {
      entrada: { cantidad_kilos, precio_por_kilo, unidad_comercial },
      salida: resultado,
      valido: true,
      contexto: { producto: nombre_producto }
    });

    return resultado;
  }

  // REGLA 2: Productos por unidad comercial requieren peso_kg
  if (!pesoKg || pesoKg <= 0) {
    return {
      cantidad_final: 0,
      unidad_final: unidad_comercial,
      formula_usada: 'ERROR',
      valido: false,
      error: `Falta peso (peso_kg) para producto "${nombre_producto}". No se puede convertir ${cantidad_kilos} kg a ${unidad_comercial}.`
    };
  }

  // REGLA 3: Convertir kilos → unidades comerciales
  const cantidad_unidades = cantidad_kilos / pesoKg;
  const cantidad_redondeada = Math.round(cantidad_unidades); // Redondear a entero

  const resultado = {
    cantidad_final: cantidad_redondeada,
    unidad_final: unidad_comercial,
    formula_usada: `${cantidad_kilos} kg / ${pesoKg} kg = ${cantidad_unidades.toFixed(4)} → ${cantidad_redondeada} ${unidad_comercial}`,
    valido: true
  };

  auditoriaCalculos.registrar('conversion_unidades', {
    entrada: { cantidad_kilos, peso_kg: pesoKg, unidad_comercial },
    salida: resultado,
    valido: true,
    contexto: { producto: nombre_producto }
  });

  return resultado;
}

// ==================== CÁLCULO DE SUBTOTALES ====================

export interface CalculoSubtotalParams {
  cantidad: number;
  precio_unitario: number;
  nombre_producto: string;
}

export interface ResultadoSubtotal {
  subtotal: number;
  formula_usada: string;
  valido: boolean;
  error?: string;
}

/**
 * Calcula subtotal de línea de pedido
 * FÓRMULA: subtotal = cantidad × precio_unitario
 * SIN EXCEPCIONES, SIN VALORES OCULTOS
 */
export function calcularSubtotal(params: CalculoSubtotalParams): ResultadoSubtotal {
  const { cantidad, precio_unitario, nombre_producto } = params;

  // Validaciones
  if (cantidad <= 0) {
    return {
      subtotal: 0,
      formula_usada: 'ERROR',
      valido: false,
      error: `Cantidad inválida: ${cantidad}`
    };
  }

  if (precio_unitario < 0) {
    return {
      subtotal: 0,
      formula_usada: 'ERROR',
      valido: false,
      error: `Precio inválido: ${precio_unitario}`
    };
  }

  // Cálculo exacto
  const subtotal_crudo = cantidad * precio_unitario;
  const subtotal = redondear(subtotal_crudo);

  const resultado = {
    subtotal,
    formula_usada: `${cantidad} × ${precio_unitario} = ${subtotal}`,
    valido: true
  };

  auditoriaCalculos.registrar('calculo_subtotal', {
    entrada: { cantidad, precio_unitario },
    salida: resultado,
    valido: true,
    contexto: { producto: nombre_producto }
  });

  return resultado;
}

// ==================== CÁLCULO DE IMPUESTOS ====================

export interface CalculoImpuestosParams {
  precio_con_impuestos: number;
  aplica_iva: boolean;
  aplica_ieps: boolean;
  nombre_producto?: string;
}

export interface ResultadoImpuestos {
  base: number;
  iva: number;
  ieps: number;
  total: number;
  formula_usada: string;
  valido: boolean;
  error?: string;
}

/**
 * Desglosa impuestos de un precio que YA incluye IVA/IEPS
 * LÓGICA: precio_con_impuestos = base × (1 + tasas)
 * Por lo tanto: base = precio_con_impuestos / divisor
 */
export function calcularDesgloseImpuestos(params: CalculoImpuestosParams): ResultadoImpuestos {
  const { precio_con_impuestos, aplica_iva, aplica_ieps, nombre_producto } = params;

  if (precio_con_impuestos < 0) {
    return {
      base: 0,
      iva: 0,
      ieps: 0,
      total: 0,
      formula_usada: 'ERROR',
      valido: false,
      error: `Precio inválido: ${precio_con_impuestos}`
    };
  }

  // Calcular divisor
  let divisor = 1;
  if (aplica_iva) divisor += IVA_RATE;
  if (aplica_ieps) divisor += IEPS_RATE;

  // Desagregar base
  const base_cruda = precio_con_impuestos / divisor;
  const base = redondear(base_cruda);

  // Calcular impuestos sobre la base
  const iva = aplica_iva ? redondear(base * IVA_RATE) : 0;
  const ieps = aplica_ieps ? redondear(base * IEPS_RATE) : 0;

  // Total debe ser igual a precio_con_impuestos (o muy cercano)
  const total_calculado = redondear(base + iva + ieps);
  const diferencia = Math.abs(total_calculado - precio_con_impuestos);

  // Validar consistencia (diferencia máxima de 1 centavo por redondeo)
  const es_valido = diferencia <= 0.02;

  const resultado = {
    base,
    iva,
    ieps,
    total: precio_con_impuestos,
    formula_usada: `Base: ${precio_con_impuestos} / ${divisor} = ${base}, IVA: ${iva}, IEPS: ${ieps}, Total: ${total_calculado} (diff: ${diferencia.toFixed(4)})`,
    valido: es_valido,
    error: es_valido ? undefined : `Inconsistencia en desglose: diff=${diferencia}`
  };

  auditoriaCalculos.registrar('calculo_impuestos', {
    entrada: { precio_con_impuestos, aplica_iva, aplica_ieps },
    salida: resultado,
    valido: es_valido,
    contexto: { producto: nombre_producto || 'N/A' }
  });

  if (!es_valido) {
    console.error('❌ INCONSISTENCIA EN IMPUESTOS:', resultado);
  }

  return resultado;
}

// ==================== CÁLCULO DE TOTALES DE PEDIDO ====================

export interface LineaPedido {
  producto_id: string;
  nombre_producto: string;
  cantidad: number;
  precio_unitario: number;
  aplica_iva: boolean;
  aplica_ieps: boolean;
}

export interface ResultadoTotales {
  subtotal: number;
  iva: number;
  ieps: number;
  impuestos_totales: number;
  total: number;
  num_lineas: number;
  formula_usada: string;
  valido: boolean;
  errores: string[];
  detalles_lineas: Array<{
    producto: string;
    subtotal_linea: number;
    base: number;
    iva: number;
    ieps: number;
  }>;
}

/**
 * Calcula totales de un pedido completo
 * PROCESO:
 * 1. Calcular subtotal por cada línea: cantidad × precio
 * 2. Desagregar impuestos de cada subtotal
 * 3. Sumar todos los componentes
 * 4. Validar consistencia final
 */
export function calcularTotalesPedido(lineas: LineaPedido[]): ResultadoTotales {
  let subtotal_acumulado = 0;
  let iva_acumulado = 0;
  let ieps_acumulado = 0;
  const errores: string[] = [];
  const detalles_lineas: Array<any> = [];

  // Procesar cada línea
  lineas.forEach((linea, index) => {
    // 1. Calcular subtotal de línea
    const resultadoSubtotal = calcularSubtotal({
      cantidad: linea.cantidad,
      precio_unitario: linea.precio_unitario,
      nombre_producto: linea.nombre_producto
    });

    if (!resultadoSubtotal.valido) {
      errores.push(`Línea ${index + 1} (${linea.nombre_producto}): ${resultadoSubtotal.error}`);
      return;
    }

    // 2. Desagregar impuestos del subtotal
    const resultadoImpuestos = calcularDesgloseImpuestos({
      precio_con_impuestos: resultadoSubtotal.subtotal,
      aplica_iva: linea.aplica_iva,
      aplica_ieps: linea.aplica_ieps,
      nombre_producto: linea.nombre_producto
    });

    if (!resultadoImpuestos.valido) {
      errores.push(`Línea ${index + 1} (${linea.nombre_producto}): ${resultadoImpuestos.error}`);
    }

    // 3. Acumular
    subtotal_acumulado += resultadoImpuestos.base;
    iva_acumulado += resultadoImpuestos.iva;
    ieps_acumulado += resultadoImpuestos.ieps;

    detalles_lineas.push({
      producto: linea.nombre_producto,
      subtotal_linea: resultadoSubtotal.subtotal,
      base: resultadoImpuestos.base,
      iva: resultadoImpuestos.iva,
      ieps: resultadoImpuestos.ieps
    });
  });

  // Redondear totales
  const subtotal = redondear(subtotal_acumulado);
  const iva = redondear(iva_acumulado);
  const ieps = redondear(ieps_acumulado);
  const impuestos_totales = redondear(iva + ieps);
  const total = redondear(subtotal + iva + ieps);

  // Validación final: total debe ser suma exacta
  const suma_verificacion = redondear(subtotal + impuestos_totales);
  const es_valido = Math.abs(suma_verificacion - total) < 0.01 && errores.length === 0;

  if (!es_valido && errores.length === 0) {
    errores.push(`Inconsistencia en total final: ${subtotal} + ${impuestos_totales} = ${suma_verificacion} ≠ ${total}`);
  }

  const resultado = {
    subtotal,
    iva,
    ieps,
    impuestos_totales,
    total,
    num_lineas: lineas.length,
    formula_usada: `Subtotal: ${subtotal}, IVA: ${iva}, IEPS: ${ieps}, Total: ${total}`,
    valido: es_valido,
    errores,
    detalles_lineas
  };

  auditoriaCalculos.registrar('calculo_totales_pedido', {
    entrada: { num_lineas: lineas.length },
    salida: resultado,
    valido: es_valido
  });

  if (!es_valido) {
    console.error('❌ ERRORES EN TOTALES DE PEDIDO:', errores);
    console.table(detalles_lineas);
  }

  return resultado;
}

// ==================== VALIDACIÓN PRE-GUARDADO ====================

export interface ValidacionPedido {
  valido: boolean;
  errores: string[];
  advertencias: string[];
  puede_guardar: boolean;
}

/**
 * Validación obligatoria antes de guardar cualquier pedido
 * BLOQUEA el guardado si encuentra errores críticos
 */
export function validarAntesDeGuardar(lineas: LineaPedido[]): ValidacionPedido {
  const errores: string[] = [];
  const advertencias: string[] = [];

  // Validación 1: Debe haber al menos una línea
  if (lineas.length === 0) {
    errores.push('El pedido debe tener al menos un producto');
  }

  // Validación 2: Cada línea debe tener datos válidos
  lineas.forEach((linea, index) => {
    if (linea.cantidad <= 0) {
      errores.push(`Línea ${index + 1}: Cantidad inválida (${linea.cantidad})`);
    }
    if (linea.precio_unitario < 0) {
      errores.push(`Línea ${index + 1}: Precio inválido (${linea.precio_unitario})`);
    }
    if (!linea.producto_id) {
      errores.push(`Línea ${index + 1}: Falta ID de producto`);
    }
  });

  // Validación 3: Calcular totales y verificar consistencia
  const totales = calcularTotalesPedido(lineas);
  if (!totales.valido) {
    errores.push(...totales.errores);
  }

  // Validación 4: Total debe ser mayor a 0
  if (totales.total <= 0) {
    errores.push('El total del pedido debe ser mayor a $0.00');
  }

  const valido = errores.length === 0;
  const puede_guardar = valido;

  auditoriaCalculos.registrar('validacion_pre_guardado', {
    entrada: { num_lineas: lineas.length },
    salida: { valido, num_errores: errores.length, num_advertencias: advertencias.length },
    valido
  });

  return {
    valido,
    errores,
    advertencias,
    puede_guardar
  };
}

// ==================== EXPORTAR FUNCIONES LEGACY ====================

/**
 * Compatibilidad con código existente que usa calcularDesgloseImpuestos directamente
 */
export function calcularDesgloseImpuestosLegacy(
  precio_con_impuestos: number,
  aplica_iva: boolean,
  aplica_ieps: boolean
) {
  const resultado = calcularDesgloseImpuestos({
    precio_con_impuestos,
    aplica_iva,
    aplica_ieps
  });

  return {
    base: resultado.base,
    iva: resultado.iva,
    ieps: resultado.ieps,
    total: resultado.total
  };
}

/**
 * Función de validación simple para código existente
 */
export function validarTotalesLegacy(subtotal: number, iva: number, ieps: number, total: number): boolean {
  const calculado = redondear(subtotal + iva + ieps);
  const diferencia = Math.abs(calculado - total);
  return diferencia < 0.02;
}

/**
 * Calcula desglose de impuestos para un array de productos con subtotales.
 * Cada item debe tener: subtotal (con impuestos incluidos), aplica_iva, aplica_ieps
 */
export function calcularTotalesConImpuestos(items: { subtotal: number; aplica_iva: boolean; aplica_ieps: boolean }[]): { subtotal: number; iva: number; ieps: number; total: number } {
  let totalBase = 0, totalIva = 0, totalIeps = 0, totalBruto = 0;
  for (const item of items) {
    const d = calcularDesgloseImpuestos({ precio_con_impuestos: item.subtotal, aplica_iva: item.aplica_iva, aplica_ieps: item.aplica_ieps });
    totalBase += d.base;
    totalIva += d.iva;
    totalIeps += d.ieps;
    totalBruto += item.subtotal;
  }
  return { subtotal: redondear(totalBase), iva: redondear(totalIva), ieps: redondear(totalIeps), total: redondear(totalBruto) };
}

// ==================== ANÁLISIS DE MARGEN Y COSTOS ====================

export interface AnalisisMargenParams {
  costo_promedio: number;
  costo_ultimo: number;
  precio_venta: number;
  descuento_maximo: number;
}

export interface ResultadoAnalisisMargen {
  costo_referencia: number;          // Costo que usamos para cálculos (promedio si hay, sino último)
  precio_venta: number;
  piso_minimo: number;               // precio_venta - descuento_maximo
  margen_bruto: number;              // precio_venta - costo_referencia
  margen_porcentaje: number;         // (margen_bruto / precio_venta) * 100
  espacio_negociacion: number;       // piso_minimo - costo_referencia
  estado_margen: 'perdida' | 'critico' | 'bajo' | 'saludable';
  puede_dar_descuento_maximo: boolean;
}

/**
 * Analiza el margen de un producto para decisiones de precio
 * REGLAS:
 * - Margen % = (precio_venta - costo) / precio_venta × 100
 * - Piso mínimo = precio_venta - descuento_máximo
 * - Espacio = piso_mínimo - costo (cuánto queda si da el máximo descuento)
 * - Estado según margen: pérdida (<0), crítico (0-5%), bajo (5-10%), saludable (>10%)
 */
export function analizarMargen(params: AnalisisMargenParams): ResultadoAnalisisMargen {
  const { costo_promedio, costo_ultimo, precio_venta, descuento_maximo } = params;
  
  // Usar costo promedio si está disponible, sino el último
  const costo_referencia = costo_promedio > 0 ? costo_promedio : costo_ultimo;
  
  // Calcular piso mínimo (precio más bajo permitido)
  const piso_minimo = redondear(precio_venta - (descuento_maximo || 0));
  
  // Margen bruto
  const margen_bruto = redondear(precio_venta - costo_referencia);
  
  // Margen porcentaje (evitar división por cero)
  const margen_porcentaje = precio_venta > 0 
    ? redondear((margen_bruto / precio_venta) * 100) 
    : 0;
  
  // Espacio de negociación (cuánto margen queda si da el máximo descuento)
  const espacio_negociacion = redondear(piso_minimo - costo_referencia);
  
  // Determinar estado del margen
  let estado_margen: 'perdida' | 'critico' | 'bajo' | 'saludable';
  if (margen_porcentaje < 0) {
    estado_margen = 'perdida';
  } else if (margen_porcentaje < 5) {
    estado_margen = 'critico';
  } else if (margen_porcentaje < 10) {
    estado_margen = 'bajo';
  } else {
    estado_margen = 'saludable';
  }
  
  // ¿Puede dar el descuento máximo sin perder dinero?
  const puede_dar_descuento_maximo = espacio_negociacion >= 0;
  
  auditoriaCalculos.registrar('analisis_margen', {
    entrada: { costo_promedio, costo_ultimo, precio_venta, descuento_maximo },
    salida: { costo_referencia, piso_minimo, margen_bruto, margen_porcentaje, espacio_negociacion, estado_margen },
    valido: true
  });
  
  return {
    costo_referencia,
    precio_venta,
    piso_minimo,
    margen_bruto,
    margen_porcentaje,
    espacio_negociacion,
    estado_margen,
    puede_dar_descuento_maximo
  };
}

/**
 * Calcula precio sugerido basado en costo y utilidad deseada
 * FÓRMULA: precio_sugerido = costo × (1 + utilidad%) + descuento_maximo
 * Esto garantiza que al dar el descuento máximo, aún se obtiene la utilidad deseada
 */
export function calcularPrecioSugerido(
  costo: number,
  utilidad_porcentaje: number = 10,
  descuento_maximo: number = 0
): number {
  const base_con_utilidad = costo * (1 + utilidad_porcentaje / 100);
  const precio_sugerido = redondear(base_con_utilidad + descuento_maximo);
  
  auditoriaCalculos.registrar('precio_sugerido', {
    entrada: { costo, utilidad_porcentaje, descuento_maximo },
    salida: { precio_sugerido },
    valido: true,
    contexto: { formula: `${costo} × 1.${utilidad_porcentaje} + ${descuento_maximo} = ${precio_sugerido}` }
  });
  
  return precio_sugerido;
}

/**
 * Simula el margen resultante de un precio propuesto
 */
export function simularPrecioPropuesto(
  costo: number,
  precio_propuesto: number,
  descuento_maximo: number = 0,
  precio_lista: number = 0
): {
  margen_pesos: number;
  margen_porcentaje: number;
  diferencia_vs_lista: number;
  requiere_autorizacion: boolean;
  es_perdida: boolean;
} {
  const margen_pesos = redondear(precio_propuesto - costo);
  const margen_porcentaje = precio_propuesto > 0 
    ? redondear((margen_pesos / precio_propuesto) * 100) 
    : 0;
  
  const diferencia_vs_lista = precio_lista > 0 
    ? redondear(precio_lista - precio_propuesto) 
    : 0;
  
  // Requiere autorización si el descuento rebasa el máximo permitido
  const requiere_autorizacion = diferencia_vs_lista > descuento_maximo;
  
  return {
    margen_pesos,
    margen_porcentaje,
    diferencia_vs_lista,
    requiere_autorizacion,
    es_perdida: margen_pesos < 0
  };
}
