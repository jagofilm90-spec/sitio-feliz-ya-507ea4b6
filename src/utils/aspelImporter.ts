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

export interface ClienteImportado {
  codigo: string;
  nombre: string;
  razon_social: string;
  rfc: string | null;
  direccion: string | null;
  codigo_postal: string | null;
  nombre_colonia: string | null;
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
}

export interface ResultadoParseo {
  clientes: ClienteImportado[];
  totalDetectados: number;
  errores: string[];
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
  
  return {
    codigo: aspel.clave.padStart(4, '0'),
    nombre: aspel.nombre || `Cliente ${aspel.clave}`,
    razon_social: aspel.nombre || '',
    rfc,
    direccion: aspel.direccion || null,
    codigo_postal: aspel.codigoPostal || null,
    nombre_colonia: aspel.colonia || null,
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
    
    // Si no, buscar por RFC
    if (!duplicado && cliente.rfc) {
      duplicado = clientesExistentes.find(
        e => e.rfc && e.rfc.toLowerCase() === cliente.rfc.toLowerCase()
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
      return {
        ...cliente,
        esDuplicado: true,
        duplicadoCon: `${duplicado.codigo} - ${duplicado.nombre}`
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
