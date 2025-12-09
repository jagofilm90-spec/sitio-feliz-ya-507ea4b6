import * as XLSX from 'xlsx';

export interface AspelCliente {
  clave: string;
  nombre: string;
  rfc: string;
  direccion: string;
  colonia: string;
  codigoPostal: string;
  telefonos: string;
  diasCredito: number;
  ultimaVenta: string;
  ultimoPago: string;
  estatus: string;
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
  // Campos estructurados de dirección
  tipo_vialidad: string | null;
  nombre_vialidad: string | null;
  numero_exterior: string | null;
  numero_interior: string | null;
  nombre_colonia: string | null;
  codigo_postal: string | null;
  telefono: string | null;
  termino_credito: 'contado' | '8_dias' | '15_dias' | '30_dias';
  limite_credito: number;
  activo: boolean;
  // Metadata para UI
  ultimaVenta: string;
  ultimoPago: string;
  esDuplicado?: boolean;
  duplicadoCon?: string;
  tieneActividadReciente?: boolean;
  // Nuevo: para grupos con sucursales
  esGrupoConSucursales?: boolean;
  cantidadSucursales?: number;
}

export interface ResultadoParseo {
  clientes: ClienteImportado[];
  totalDetectados: number;
  errores: string[];
}

/**
 * Parsea una dirección ASPEL en componentes estructurados
 * Formato típico: "Calle NOMBRE # NUM Colonia COLONIA" o variantes
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

  // Detectar tipo de vialidad al inicio
  const tiposVialidad = ['Calle', 'Avenida', 'Av\\.?', 'Boulevard', 'Blvd\\.?', 'Calzada', 'Calz\\.?', 'Privada', 'Priv\\.?', 'Cerrada', 'Circuito', 'Prolongación', 'Prol\\.?', 'Andador', 'Carretera', 'Carr\\.?'];
  const tipoRegex = new RegExp(`^(${tiposVialidad.join('|')})\\s+`, 'i');
  const tipoMatch = texto.match(tipoRegex);
  
  if (tipoMatch) {
    // Normalizar tipo de vialidad
    const tipoRaw = tipoMatch[1].toLowerCase();
    if (tipoRaw.startsWith('av')) resultado.tipo_vialidad = 'Avenida';
    else if (tipoRaw.startsWith('blvd') || tipoRaw.startsWith('boulevard')) resultado.tipo_vialidad = 'Boulevard';
    else if (tipoRaw.startsWith('calz')) resultado.tipo_vialidad = 'Calzada';
    else if (tipoRaw.startsWith('priv')) resultado.tipo_vialidad = 'Privada';
    else if (tipoRaw.startsWith('prol')) resultado.tipo_vialidad = 'Prolongación';
    else if (tipoRaw.startsWith('carr')) resultado.tipo_vialidad = 'Carretera';
    else resultado.tipo_vialidad = tipoMatch[1].charAt(0).toUpperCase() + tipoMatch[1].slice(1).toLowerCase();
  }

  // Extraer colonia - buscar después de "Colonia", "Col.", "Col"
  const coloniaMatch = texto.match(/(?:Colonia|Col\.?)\s+(.+?)(?:\s+C\.?P\.?|\s+\d{5}|$)/i);
  if (coloniaMatch) {
    resultado.nombre_colonia = coloniaMatch[1].trim()
      .replace(/^COL\.?\s*/i, '')
      .replace(/\s+\d{5}$/, '')
      .trim();
  }

  // Extraer número exterior - buscar "#", "No.", "Número", "N°", "Nº" seguido de número
  const numExtMatch = texto.match(/(?:#|No\.?|Número|N[°º])\s*(\d+[A-Z]?(?:\s*-\s*\d+)?)/i);
  if (numExtMatch) {
    resultado.numero_exterior = numExtMatch[1].trim();
  }

  // Extraer número interior - buscar "Int.", "Interior", "Depto", "Local", etc.
  const numIntMatch = texto.match(/(?:Int\.?|Interior|Depto\.?|Departamento|Local|Oficina|Of\.?|Piso)\s*([A-Z0-9\-]+(?:\s+[A-Z0-9\-]+)?)/i);
  if (numIntMatch) {
    resultado.numero_interior = numIntMatch[1].trim();
  }

  // Extraer nombre de vialidad - lo que está entre el tipo de vialidad y el número/colonia
  if (resultado.tipo_vialidad) {
    // Quitar el tipo de vialidad del inicio
    let textoSinTipo = texto.replace(tipoRegex, '').trim();
    
    // Buscar hasta donde empieza el número o colonia
    const finVialidadMatch = textoSinTipo.match(/^(.+?)(?:\s+(?:#|No\.?|Número|N[°º]|Colonia|Col\.?)|\s+\d{5}|$)/i);
    if (finVialidadMatch) {
      resultado.nombre_vialidad = finVialidadMatch[1].trim();
    }
  } else {
    // Si no hay tipo de vialidad, intentar extraer el nombre hasta el número o colonia
    const vialidadMatch = texto.match(/^(.+?)(?:\s+(?:#|No\.?|Número|N[°º]|Colonia|Col\.?)|\s+\d{5}|$)/i);
    if (vialidadMatch && vialidadMatch[1].length > 3) {
      resultado.nombre_vialidad = vialidadMatch[1].trim();
    }
  }

  // Limpiar nombre de vialidad de prefijos comunes si quedaron
  if (resultado.nombre_vialidad) {
    resultado.nombre_vialidad = resultado.nombre_vialidad
      .replace(/^(?:Calle|Av\.?|Avenida)\s*/i, '')
      .trim();
  }

  return resultado;
}

/**
 * Parsea el Excel de catálogo ASPEL SAE
 * El formato de ASPEL tiene múltiples líneas por cliente en formato reporte
 */
export function parseAspelExcel(workbook: XLSX.WorkBook): ResultadoParseo {
  const errores: string[] = [];
  const clientes: ClienteImportado[] = [];
  
  try {
    // Obtener primera hoja
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convertir a array de arrays para procesar línea por línea
    const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      defval: '' 
    });
    
    let currentCliente: Partial<AspelCliente> | null = null;
    let lineCount = 0;
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;
      
      const firstCell = String(row[0] || '').trim();
      
      // Detectar línea de encabezado/pie de página
      if (isHeaderOrFooter(firstCell, row)) {
        continue;
      }
      
      // Detectar inicio de nuevo cliente (línea con Clave)
      if (firstCell.match(/^\d+$/) && firstCell.length <= 6) {
        // Guardar cliente anterior si existe
        if (currentCliente && currentCliente.clave) {
          const clienteImportado = convertToClienteImportado(currentCliente as AspelCliente);
          if (clienteImportado) {
            clientes.push(clienteImportado);
          }
        }
        
        // Iniciar nuevo cliente
        currentCliente = {
          clave: firstCell,
          nombre: extractValue(row, 1),
          rfc: '',
          direccion: '',
          colonia: '',
          codigoPostal: '',
          telefonos: '',
          diasCredito: 0,
          ultimaVenta: '',
          ultimoPago: '',
          estatus: 'Activo'
        };
        lineCount = 1;
        
        // Extraer RFC si está en la misma línea
        const rfcMatch = row.find((cell: any) => String(cell).match(/^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/i));
        if (rfcMatch) {
          currentCliente.rfc = String(rfcMatch).toUpperCase();
        }
        
        // Buscar días de crédito en la línea
        for (let j = 0; j < row.length; j++) {
          const cellValue = String(row[j] || '');
          if (cellValue.match(/^\d+$/) && j > 1) {
            const num = parseInt(cellValue);
            if (num <= 90 && num >= 0) {
              currentCliente.diasCredito = num;
            }
          }
        }
        
      } else if (currentCliente && lineCount > 0) {
        // Líneas adicionales del cliente actual
        lineCount++;
        
        // Segunda línea típicamente tiene dirección
        if (lineCount === 2) {
          const direccionParts: string[] = [];
          for (let j = 0; j < Math.min(row.length, 5); j++) {
            const val = String(row[j] || '').trim();
            if (val && !isLabelField(val)) {
              direccionParts.push(val);
            }
          }
          if (direccionParts.length > 0) {
            currentCliente.direccion = direccionParts.join(' ');
          }
          
          // Buscar código postal
          for (const cell of row) {
            const cpMatch = String(cell).match(/\b\d{5}\b/);
            if (cpMatch) {
              currentCliente.codigoPostal = cpMatch[0];
            }
          }
        }
        
        // Buscar teléfonos en cualquier línea
        for (const cell of row) {
          const cellStr = String(cell);
          const telMatch = cellStr.match(/\b\d{7,10}\b/);
          if (telMatch && !currentCliente.telefonos) {
            currentCliente.telefonos = telMatch[0];
          }
        }
        
        // Buscar fechas (última venta, último pago)
        for (const cell of row) {
          const cellStr = String(cell);
          const fechaMatch = cellStr.match(/\d{2}\/\d{2}\/\d{4}/);
          if (fechaMatch) {
            if (!currentCliente.ultimaVenta) {
              currentCliente.ultimaVenta = fechaMatch[0];
            } else if (!currentCliente.ultimoPago) {
              currentCliente.ultimoPago = fechaMatch[0];
            }
          }
        }
        
        // Detectar estatus
        for (const cell of row) {
          const cellStr = String(cell).toLowerCase();
          if (cellStr.includes('suspendido') || cellStr.includes('inactivo')) {
            currentCliente.estatus = 'Inactivo';
          }
        }
      }
    }
    
    // No olvidar el último cliente
    if (currentCliente && currentCliente.clave) {
      const clienteImportado = convertToClienteImportado(currentCliente as AspelCliente);
      if (clienteImportado) {
        clientes.push(clienteImportado);
      }
    }
    
  } catch (error: any) {
    errores.push(`Error al parsear Excel: ${error.message}`);
  }
  
  return {
    clientes,
    totalDetectados: clientes.length,
    errores
  };
}

function isHeaderOrFooter(firstCell: string, row: any[]): boolean {
  const headerPatterns = [
    /^clave$/i,
    /^cliente$/i,
    /^catálogo/i,
    /^catalogo/i,
    /^reporte/i,
    /^página/i,
    /^pagina/i,
    /^fecha:/i,
    /^hora:/i,
    /^total/i,
    /^aspel/i,
    /^sistema/i,
  ];
  
  if (headerPatterns.some(p => p.test(firstCell))) {
    return true;
  }
  
  // Detectar líneas en blanco o con solo separadores
  const nonEmptyCells = row.filter((c: any) => String(c).trim() !== '');
  if (nonEmptyCells.length === 0) {
    return true;
  }
  
  return false;
}

function isLabelField(value: string): boolean {
  const labels = ['Calle', 'Colonia', 'C.P.', 'Tel.', 'RFC', 'Teléfono', 'Teléfonos'];
  return labels.some(l => value.toLowerCase().startsWith(l.toLowerCase()));
}

function extractValue(row: any[], index: number): string {
  if (index < row.length) {
    return String(row[index] || '').trim();
  }
  return '';
}

function convertToClienteImportado(aspel: AspelCliente): ClienteImportado | null {
  // Omitir códigos especiales como "00" (Venta Mostrador)
  if (aspel.clave === '00' || aspel.clave === '0') {
    return null;
  }
  
  // Mapear días de crédito a enum
  let terminoCredito: 'contado' | '8_dias' | '15_dias' | '30_dias' = 'contado';
  if (aspel.diasCredito >= 25) {
    terminoCredito = '30_dias';
  } else if (aspel.diasCredito >= 12) {
    terminoCredito = '15_dias';
  } else if (aspel.diasCredito >= 5) {
    terminoCredito = '8_dias';
  }
  
  // Validar RFC
  let rfc = aspel.rfc?.trim().toUpperCase() || null;
  if (rfc && !rfc.match(/^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/i)) {
    rfc = null; // RFC inválido, dejarlo vacío
  }

  // Parsear dirección estructurada
  const direccionParseada = parsearDireccionAspel(aspel.direccion || '');
  
  return {
    codigo: aspel.clave.padStart(4, '0'),
    nombre: aspel.nombre || `Cliente ${aspel.clave}`,
    razon_social: aspel.nombre || '',
    rfc,
    direccion: direccionParseada.direccion_completa || null,
    // Campos estructurados
    tipo_vialidad: direccionParseada.tipo_vialidad,
    nombre_vialidad: direccionParseada.nombre_vialidad,
    numero_exterior: direccionParseada.numero_exterior,
    numero_interior: direccionParseada.numero_interior,
    nombre_colonia: direccionParseada.nombre_colonia || aspel.colonia || null,
    codigo_postal: direccionParseada.codigo_postal || aspel.codigoPostal || null,
    telefono: aspel.telefonos || null,
    termino_credito: terminoCredito,
    limite_credito: 0,
    activo: aspel.estatus !== 'Inactivo',
    ultimaVenta: aspel.ultimaVenta,
    ultimoPago: aspel.ultimoPago,
    tieneActividadReciente: checkActividadReciente(aspel.ultimaVenta)
  };
}

function checkActividadReciente(ultimaVenta: string): boolean {
  if (!ultimaVenta) return false;
  
  try {
    // Formato DD/MM/YYYY
    const parts = ultimaVenta.split('/');
    if (parts.length !== 3) return false;
    
    const fecha = new Date(
      parseInt(parts[2]),
      parseInt(parts[1]) - 1,
      parseInt(parts[0])
    );
    
    const haceUnAno = new Date();
    haceUnAno.setFullYear(haceUnAno.getFullYear() - 1);
    
    return fecha >= haceUnAno;
  } catch {
    return false;
  }
}

export interface ClienteExistente {
  id: string;
  codigo: string;
  nombre: string;
  rfc: string | null;
  cantidadSucursales?: number;
}

/**
 * Detecta duplicados entre clientes a importar y existentes en el ERP
 * Ahora también detecta grupos con sucursales
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

function normalizarNombre(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    .replace(/[^a-z0-9]/g, '') // Solo alfanuméricos
    .trim();
}

function normalizarRfc(rfc: string): string {
  return rfc
    .toUpperCase()
    .replace(/[^A-Z0-9&Ñ]/g, '')
    .trim();
}
