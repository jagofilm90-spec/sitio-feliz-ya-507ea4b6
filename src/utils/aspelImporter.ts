import * as XLSX from 'xlsx';

// ============================================
// INTERFACES
// ============================================

export interface AspelCliente {
  clave: string;
  nombre: string;
  rfc: string;
  direccion: string;
  colonia: string;
  codigoPostal: string;
  poblacion: string;
  telefonos: string;
  diasCredito: number;
  estatus: string;
  ultimaVenta: string | null;
  ultimoPago: string | null;
}

export interface DireccionParseada {
  tipo_vialidad: string | null;
  nombre_vialidad: string | null;
  numero_exterior: string | null;
  numero_interior: string | null;
  nombre_colonia: string | null;
  codigo_postal: string | null;
  direccion_completa: string;
}

export interface ClienteImportado {
  codigo: string;
  nombre: string;
  razon_social: string;
  rfc: string | null;
  direccion: string | null;
  tipo_vialidad: string | null;
  nombre_vialidad: string | null;
  numero_exterior: string | null;
  numero_interior: string | null;
  nombre_colonia: string | null;
  nombre_localidad: string | null;
  codigo_postal: string | null;
  telefono: string | null;
  termino_credito: 'contado' | '8_dias' | '15_dias' | '30_dias';
  limite_credito: number;
  activo: boolean;
  ultimaVenta: string | null;
  ultimoPago: string | null;
  tieneActividadReciente?: boolean;
  esDuplicado?: boolean;
  duplicadoCon?: string;
  esGrupoConSucursales?: boolean;
  cantidadSucursales?: number;
}

export interface ResultadoParseo {
  clientes: ClienteImportado[];
  totalDetectados: number;
  errores: string[];
  advertencias: string[];
}

export interface ClienteExistente {
  id: string;
  codigo: string;
  nombre: string;
  rfc: string | null;
  cantidadSucursales?: number;
}

export interface ReporteCalidad {
  totalClientes: number;
  conRfcValido: number;
  conCodigoPostal: number;
  conTelefono: number;
  conNombreVialidad: number;
  conNumeroExterior: number;
  conColonia: number;
  direccionesNoParseables: number;
  porcentajes: {
    rfc: number;
    codigoPostal: number;
    telefono: number;
    nombreVialidad: number;
    numeroExterior: number;
    colonia: number;
  };
  muestraAleatoria: ClienteImportado[];
  anomalias: AnomaliaCliente[];
}

export interface AnomaliaCliente {
  codigo: string;
  nombre: string;
  problemas: string[];
}

// ============================================
// CONSTANTES Y UTILIDADES
// ============================================

// Mapeo de meses en español a número
const MESES_ES: Record<string, string> = {
  'ene': '01', 'feb': '02', 'mar': '03', 'abr': '04',
  'may': '05', 'jun': '06', 'jul': '07', 'ago': '08',
  'sep': '09', 'oct': '10', 'nov': '11', 'dic': '12'
};

/**
 * Parsea una fecha en formato ASPEL (DD/Mes/AAAA) a ISO
 */
function parsearFechaAspel(fechaStr: string): string | null {
  if (!fechaStr || typeof fechaStr !== 'string') return null;
  
  // Formato: "19/Nov/2025" o "08/Dic/2025"
  const match = fechaStr.match(/(\d{1,2})\/([A-Za-z]{3})\/(\d{4})/);
  if (match) {
    const [, dia, mesStr, anio] = match;
    const mes = MESES_ES[mesStr.toLowerCase()];
    if (mes) {
      return `${anio}-${mes}-${dia.padStart(2, '0')}`;
    }
  }
  
  // Formato alternativo: DD/MM/YYYY
  const matchNumerico = fechaStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (matchNumerico) {
    const [, dia, mes, anio] = matchNumerico;
    return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
  }
  
  return null;
}

/**
 * Verifica si una fila es encabezado, pie de página o separador
 */
function esFilaIgnorable(valores: any[]): boolean {
  if (!valores || valores.length === 0) return true;
  
  const primerValor = String(valores[0] || '').trim().toLowerCase();
  const segundoValor = String(valores[1] || '').trim().toLowerCase();
  
  // Patrones a ignorar
  const patronesIgnorar = [
    'clave', 'usuario:', 'dirección', 'teléfonos', 'atención ventas',
    'abarrotes la manita', 'catálogo de clientes', 'pág.', 'página',
    'almasa', 's.a. de c.v.', 'reporte', 'fecha:', 'hora:',
    'cliente', 'rfc', 'estatus', 'población', 'colonia', 'c.p.',
    'vendedor', 'clasificación', 'días crédito', 'saldo'
  ];
  
  for (const patron of patronesIgnorar) {
    if (primerValor.includes(patron) || segundoValor.includes(patron)) {
      return true;
    }
  }
  
  // Fila vacía o solo espacios
  const tieneContenido = valores.some(v => 
    v !== null && v !== undefined && String(v).trim() !== ''
  );
  if (!tieneContenido) return true;
  
  return false;
}

/**
 * Verifica si un valor es una clave de cliente válida (número de 1-6 dígitos)
 */
function esClaveCliente(valor: any): boolean {
  if (valor === null || valor === undefined) return false;
  const str = String(valor).trim();
  // Debe ser número puro de 1-6 dígitos, no puede ser 0 o 00
  return /^[1-9]\d{0,5}$/.test(str) || /^0[1-9]\d{0,4}$/.test(str);
}

/**
 * Normaliza teléfonos eliminando guiones y espacios extra
 */
function normalizarTelefono(telefono: string): string {
  if (!telefono) return '';
  
  // Separar por múltiples delimitadores
  const partes = telefono.split(/[,|\/]+/).map(t => {
    // Eliminar guiones y espacios, mantener solo dígitos
    return t.replace(/[-\s()]+/g, '').replace(/[^\d]/g, '').trim();
  });
  
  // Filtrar números válidos (7-10 dígitos)
  const telefonosValidos = partes.filter(t => t.length >= 7 && t.length <= 10);
  
  return telefonosValidos.join(', ');
}

/**
 * Convierte días de crédito numérico a enum del sistema
 */
function convertirTerminoCredito(dias: number): 'contado' | '8_dias' | '15_dias' | '30_dias' {
  if (dias <= 0) return 'contado';
  if (dias <= 8) return '8_dias';
  if (dias <= 15) return '15_dias';
  return '30_dias';
}

/**
 * Extrae el código postal de un texto
 */
function extraerCodigoPostal(texto: string): string | null {
  if (!texto) return null;
  const match = String(texto).match(/\b(\d{5})\b/);
  return match ? match[1] : null;
}

/**
 * Valida formato de RFC mexicano
 */
function validarRFC(rfc: string): boolean {
  if (!rfc) return false;
  const rfcLimpio = rfc.trim().toUpperCase();
  // RFC persona moral (12 chars) o física (13 chars)
  return /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(rfcLimpio);
}

/**
 * Parsea la dirección completa de ASPEL en componentes
 */
export function parsearDireccionAspel(direccionCompleta: string): DireccionParseada {
  const resultado: DireccionParseada = {
    tipo_vialidad: null,
    nombre_vialidad: null,
    numero_exterior: null,
    numero_interior: null,
    nombre_colonia: null,
    codigo_postal: null,
    direccion_completa: direccionCompleta
  };

  if (!direccionCompleta) return resultado;

  const texto = direccionCompleta.trim();

  // Extraer código postal (5 dígitos)
  const cpMatch = texto.match(/\b(\d{5})\b/);
  if (cpMatch) {
    resultado.codigo_postal = cpMatch[1];
  }

  // Extraer colonia (después de "COL." o "COLONIA")
  const coloniaMatch = texto.match(/(?:COL\.?|COLONIA)\s+([^,\d]+)/i);
  if (coloniaMatch) {
    resultado.nombre_colonia = coloniaMatch[1].trim();
  }

  // Tipos de vialidad comunes
  const tiposVialidad = [
    'CALLE', 'AVENIDA', 'AV\\.?', 'CALZADA', 'CALZ\\.?',
    'BOULEVARD', 'BLVD\\.?', 'PRIVADA', 'PRIV\\.?',
    'CERRADA', 'CERR\\.?', 'ANDADOR', 'AND\\.?',
    'PROLONGACIÓN', 'PROL\\.?', 'CIRCUITO', 'CTO\\.?',
    'RETORNO', 'RET\\.?', 'CAMINO', 'CAM\\.?', 'CARRETERA', 'CARR\\.?'
  ];

  const tipoRegex = new RegExp(`^(${tiposVialidad.join('|')})\\s+`, 'i');
  const tipoMatch = texto.match(tipoRegex);
  
  if (tipoMatch) {
    const tipoRaw = tipoMatch[1].toUpperCase().replace(/\.$/, '');
    // Normalizar abreviaciones
    if (tipoRaw.startsWith('AV')) resultado.tipo_vialidad = 'AVENIDA';
    else if (tipoRaw.startsWith('BLVD')) resultado.tipo_vialidad = 'BOULEVARD';
    else if (tipoRaw.startsWith('CALZ')) resultado.tipo_vialidad = 'CALZADA';
    else if (tipoRaw.startsWith('PRIV')) resultado.tipo_vialidad = 'PRIVADA';
    else if (tipoRaw.startsWith('PROL')) resultado.tipo_vialidad = 'PROLONGACIÓN';
    else if (tipoRaw.startsWith('CERR')) resultado.tipo_vialidad = 'CERRADA';
    else if (tipoRaw.startsWith('AND')) resultado.tipo_vialidad = 'ANDADOR';
    else if (tipoRaw.startsWith('CTO')) resultado.tipo_vialidad = 'CIRCUITO';
    else if (tipoRaw.startsWith('RET')) resultado.tipo_vialidad = 'RETORNO';
    else if (tipoRaw.startsWith('CAM') || tipoRaw.startsWith('CARR')) resultado.tipo_vialidad = 'CARRETERA';
    else resultado.tipo_vialidad = tipoRaw;
  }

  // Extraer número exterior
  const numExtMatch = texto.match(/(?:#|No\.?|Número|N[°º]|NUM\.?)\s*(\d+[A-Z]?(?:\s*-\s*\d+)?)/i);
  if (numExtMatch) {
    resultado.numero_exterior = numExtMatch[1].trim();
  }

  // Extraer número interior
  const numIntMatch = texto.match(/(?:Int\.?|Interior|Depto\.?|Departamento|Local|Oficina|Of\.?|Piso)\s*([A-Z0-9\-]+)/i);
  if (numIntMatch) {
    resultado.numero_interior = numIntMatch[1].trim();
  }

  // Extraer nombre de vialidad
  if (resultado.tipo_vialidad) {
    let textoSinTipo = texto.replace(tipoRegex, '').trim();
    const finVialidadMatch = textoSinTipo.match(/^(.+?)(?:\s+(?:#|No\.?|Número|N[°º]|NUM\.?|Colonia|Col\.?)|\s+\d{5}|$)/i);
    if (finVialidadMatch) {
      resultado.nombre_vialidad = finVialidadMatch[1].trim();
    }
  }

  return resultado;
}

// ============================================
// PARSER PRINCIPAL - FORMATO VERTICAL ASPEL
// ============================================

/**
 * Parsea el archivo Excel de ASPEL con formato vertical (4 filas por cliente)
 * 
 * Estructura detectada del archivo:
 * - Fila 1: Clave (A) | Nombre (B) | ... | Estatus (G) | RFC (H) | ...
 * - Fila 2: Dirección (A) | ... | Población (J) | Colonia (K-L) | C.P. (M-N)
 * - Fila 3: Teléfonos (A) | ... 
 * - Fila 4: ... | Días crédito (I-K) | ... | Últ.Venta | Últ.Pago
 */
export function parseAspelExcel(workbook: XLSX.WorkBook): ResultadoParseo {
  const resultado: ResultadoParseo = {
    clientes: [],
    totalDetectados: 0,
    errores: [],
    advertencias: []
  };

  try {
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      resultado.errores.push('El archivo no contiene hojas de cálculo');
      return resultado;
    }

    const sheet = workbook.Sheets[sheetName];
    const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    
    if (data.length === 0) {
      resultado.errores.push('El archivo está vacío');
      return resultado;
    }

    let i = 0;
    
    while (i < data.length) {
      const fila1 = data[i];
      
      // Saltar filas ignorables
      if (esFilaIgnorable(fila1)) {
        i++;
        continue;
      }
      
      // Detectar inicio de cliente: columna A debe ser clave numérica
      const posibleClave = fila1[0];
      
      if (!esClaveCliente(posibleClave)) {
        i++;
        continue;
      }
      
      // Encontramos un cliente - procesar bloque de 4 filas
      resultado.totalDetectados++;
      
      const fila2 = data[i + 1] || [];
      const fila3 = data[i + 2] || [];
      const fila4 = data[i + 3] || [];
      
      try {
        const clienteImportado = procesarBloqueCliente(fila1, fila2, fila3, fila4, resultado);
        if (clienteImportado) {
          resultado.clientes.push(clienteImportado);
        }
      } catch (error) {
        resultado.errores.push(`Error procesando cliente en fila ${i + 1}: ${error}`);
      }
      
      // Avanzar al siguiente bloque (mínimo 4 filas)
      i += 4;
      
      // Saltar filas vacías entre bloques
      while (i < data.length && esFilaIgnorable(data[i])) {
        i++;
      }
    }
    
  } catch (error: any) {
    resultado.errores.push(`Error general al parsear: ${error.message}`);
  }

  return resultado;
}

/**
 * Procesa un bloque de 4 filas correspondiente a un cliente
 */
function procesarBloqueCliente(
  fila1: any[],
  fila2: any[],
  fila3: any[],
  fila4: any[],
  resultado: ResultadoParseo
): ClienteImportado | null {
  // Fila 1: Clave, Nombre, Estatus, RFC
  const clave = String(fila1[0]).trim();
  const nombre = String(fila1[1] || '').trim();
  
  // Omitir códigos especiales
  if (clave === '0' || clave === '00') {
    return null;
  }
  
  // Buscar estatus (columna ~G, índice ~6)
  let estatus = 'Activo';
  for (let col = 5; col <= 8; col++) {
    const valor = String(fila1[col] || '').trim().toUpperCase();
    if (valor === 'SUSPENDIDO' || valor === 'INACTIVO' || valor === 'BAJA') {
      estatus = valor;
      break;
    } else if (valor === 'ACTIVO' || valor === 'ALTA') {
      estatus = 'Activo';
      break;
    }
  }
  
  // Buscar RFC (columna ~H, índice ~7, pero puede variar)
  let rfc: string | null = null;
  for (let col = 6; col <= 12; col++) {
    const valor = String(fila1[col] || '').trim().toUpperCase();
    if (validarRFC(valor)) {
      rfc = valor;
      break;
    }
  }
  
  if (!rfc) {
    resultado.advertencias.push(`Cliente ${clave}: RFC no encontrado o inválido`);
  }
  
  // Fila 2: Dirección, Población, Colonia, C.P.
  const direccionCompleta = String(fila2[0] || '').trim();
  
  // Buscar población (columnas ~J-K, índices ~9-10)
  let poblacion = '';
  for (let col = 8; col <= 11; col++) {
    const valor = String(fila2[col] || '').trim();
    if (valor && valor.length > 2 && !valor.match(/^\d+$/)) {
      poblacion = valor;
      break;
    }
  }
  
  // Buscar colonia (columnas ~K-L, índices ~10-11)
  let colonia = '';
  for (let col = 10; col <= 13; col++) {
    const valor = String(fila2[col] || '').trim();
    if (valor && valor.length > 2 && !valor.match(/^\d{5}$/) && valor !== poblacion) {
      colonia = valor;
      break;
    }
  }
  
  // Buscar código postal (columnas ~M-N, índices ~12-13)
  let codigoPostal: string | null = null;
  for (let col = 11; col <= 15; col++) {
    const cp = extraerCodigoPostal(String(fila2[col] || ''));
    if (cp) {
      codigoPostal = cp;
      break;
    }
  }
  
  // Si no se encontró en columnas específicas, buscar en la dirección
  if (!codigoPostal) {
    codigoPostal = extraerCodigoPostal(direccionCompleta);
  }
  
  // Parsear dirección para componentes estructurados
  const direccionParseada = parsearDireccionAspel(direccionCompleta);
  
  // Si no se encontró colonia en columnas, intentar de la dirección
  if (!colonia && direccionParseada.nombre_colonia) {
    colonia = direccionParseada.nombre_colonia;
  }
  
  // Fila 3: Teléfonos
  const telefonosRaw = String(fila3[0] || '').trim();
  const telefonos = normalizarTelefono(telefonosRaw);
  
  // Fila 4: Días de crédito, fechas
  let diasCredito = 30; // Default
  for (let col = 7; col <= 14; col++) {
    const valor = fila4[col];
    if (valor !== null && valor !== undefined && valor !== '') {
      const num = parseInt(String(valor), 10);
      if (!isNaN(num) && num >= 0 && num <= 90) {
        diasCredito = num;
        break;
      }
    }
  }
  
  // Buscar fechas de última venta y último pago en fila 4
  let ultimaVenta: string | null = null;
  let ultimoPago: string | null = null;
  
  for (let col = 0; col < fila4.length; col++) {
    const valor = String(fila4[col] || '');
    const fechaParsed = parsearFechaAspel(valor);
    if (fechaParsed) {
      if (!ultimaVenta) {
        ultimaVenta = fechaParsed;
      } else if (!ultimoPago) {
        ultimoPago = fechaParsed;
        break; // Ya tenemos ambas fechas
      }
    }
  }
  
  // Determinar si está activo
  const activo = estatus === 'Activo' || estatus === 'ALTA';
  
  // Verificar actividad reciente
  const tieneActividadReciente = checkActividadReciente(ultimaVenta);
  
  // Crear cliente importado
  return {
    codigo: clave.padStart(4, '0'),
    nombre: nombre || `Cliente ${clave}`,
    razon_social: nombre,
    rfc: rfc,
    direccion: direccionCompleta || null,
    tipo_vialidad: direccionParseada.tipo_vialidad,
    nombre_vialidad: direccionParseada.nombre_vialidad,
    numero_exterior: direccionParseada.numero_exterior,
    numero_interior: direccionParseada.numero_interior,
    nombre_colonia: colonia || direccionParseada.nombre_colonia || null,
    nombre_localidad: poblacion || null,
    codigo_postal: codigoPostal || direccionParseada.codigo_postal || null,
    telefono: telefonos || null,
    termino_credito: convertirTerminoCredito(diasCredito),
    limite_credito: 0,
    activo: activo,
    ultimaVenta: ultimaVenta,
    ultimoPago: ultimoPago,
    tieneActividadReciente: tieneActividadReciente
  };
}

/**
 * Verifica si hubo actividad en el último año
 */
function checkActividadReciente(ultimaVenta: string | null): boolean {
  if (!ultimaVenta) return false;
  
  try {
    const fecha = new Date(ultimaVenta);
    if (isNaN(fecha.getTime())) return false;
    
    const haceUnAno = new Date();
    haceUnAno.setFullYear(haceUnAno.getFullYear() - 1);
    
    return fecha >= haceUnAno;
  } catch {
    return false;
  }
}

// ============================================
// DETECCIÓN DE DUPLICADOS
// ============================================

function normalizarNombre(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function normalizarRfc(rfc: string): string {
  return rfc
    .toUpperCase()
    .replace(/[^A-Z0-9&Ñ]/g, '')
    .trim();
}

/**
 * Detecta duplicados entre clientes a importar y existentes en el ERP
 */
export function detectarDuplicados(
  clientesImportar: ClienteImportado[],
  clientesExistentes: ClienteExistente[]
): ClienteImportado[] {
  return clientesImportar.map(cliente => {
    // Buscar por código exacto
    let duplicado = clientesExistentes.find(
      e => e.codigo.toLowerCase() === cliente.codigo.toLowerCase()
    );
    
    // Si no, buscar por RFC (normalizado)
    if (!duplicado && cliente.rfc) {
      const rfcNormalizado = normalizarRfc(cliente.rfc);
      duplicado = clientesExistentes.find(
        e => e.rfc && normalizarRfc(e.rfc) === rfcNormalizado
      );
    }
    
    // Si no, buscar por nombre similar (normalizado)
    if (!duplicado) {
      const nombreNormalizado = normalizarNombre(cliente.nombre);
      duplicado = clientesExistentes.find(
        e => normalizarNombre(e.nombre) === nombreNormalizado
      );
    }
    
    if (duplicado) {
      const esGrupo = (duplicado.cantidadSucursales || 0) > 0;
      return {
        ...cliente,
        esDuplicado: true,
        duplicadoCon: `${duplicado.codigo} - ${duplicado.nombre}`,
        esGrupoConSucursales: esGrupo,
        cantidadSucursales: duplicado.cantidadSucursales || 0
      };
    }
    
    return cliente;
  });
}

// ============================================
// REPORTE DE CALIDAD
// ============================================

/**
 * Genera reporte de calidad de los datos parseados
 */
export function generarReporteCalidad(clientes: ClienteImportado[]): ReporteCalidad {
  const total = clientes.length;
  
  let conRfcValido = 0;
  let conCodigoPostal = 0;
  let conTelefono = 0;
  let conNombreVialidad = 0;
  let conNumeroExterior = 0;
  let conColonia = 0;
  let direccionesNoParseables = 0;
  
  const anomalias: AnomaliaCliente[] = [];
  
  for (const cliente of clientes) {
    const problemas: string[] = [];
    
    if (cliente.rfc && validarRFC(cliente.rfc)) {
      conRfcValido++;
    } else {
      problemas.push('RFC inválido o faltante');
    }
    
    if (cliente.codigo_postal && /^\d{5}$/.test(cliente.codigo_postal)) {
      conCodigoPostal++;
    } else {
      problemas.push('Sin código postal');
    }
    
    if (cliente.telefono && cliente.telefono.length >= 7) {
      conTelefono++;
    } else {
      problemas.push('Sin teléfono');
    }
    
    if (cliente.nombre_vialidad) {
      conNombreVialidad++;
    }
    
    if (cliente.numero_exterior) {
      conNumeroExterior++;
    }
    
    if (cliente.nombre_colonia) {
      conColonia++;
    } else {
      problemas.push('Sin colonia');
    }
    
    // Dirección no parseable: tiene dirección pero sin componentes
    if (cliente.direccion && !cliente.nombre_vialidad && !cliente.numero_exterior) {
      direccionesNoParseables++;
    }
    
    if (problemas.length > 0) {
      anomalias.push({
        codigo: cliente.codigo,
        nombre: cliente.nombre,
        problemas
      });
    }
  }
  
  // Tomar muestra aleatoria de 15 clientes
  const shuffled = [...clientes].sort(() => Math.random() - 0.5);
  const muestraAleatoria = shuffled.slice(0, 15);
  
  return {
    totalClientes: total,
    conRfcValido,
    conCodigoPostal,
    conTelefono,
    conNombreVialidad,
    conNumeroExterior,
    conColonia,
    direccionesNoParseables,
    porcentajes: {
      rfc: total > 0 ? Math.round((conRfcValido / total) * 100) : 0,
      codigoPostal: total > 0 ? Math.round((conCodigoPostal / total) * 100) : 0,
      telefono: total > 0 ? Math.round((conTelefono / total) * 100) : 0,
      nombreVialidad: total > 0 ? Math.round((conNombreVialidad / total) * 100) : 0,
      numeroExterior: total > 0 ? Math.round((conNumeroExterior / total) * 100) : 0,
      colonia: total > 0 ? Math.round((conColonia / total) * 100) : 0
    },
    muestraAleatoria,
    anomalias: anomalias.slice(0, 50) // Limitar a 50 anomalías
  };
}

/**
 * Obtiene muestra aleatoria de clientes para validación
 */
export function obtenerMuestraAleatoria(
  clientes: ClienteImportado[],
  cantidad: number = 15
): ClienteImportado[] {
  const shuffled = [...clientes].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, cantidad);
}
