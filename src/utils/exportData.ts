/**
 * Utilidades para exportación de datos a Excel y CSV
 * 
 * MÓDULO CRÍTICO: Sistema de respaldos externos
 * Permite exportar datos críticos del ERP para backup manual
 */

import * as XLSX from 'xlsx';

interface ExportColumn {
  key: string;
  header: string;
  transform?: (value: any, row: any) => any;
}

/**
 * Exporta datos a archivo Excel (.xlsx)
 */
export const exportToExcel = (
  data: any[],
  fileName: string,
  columns: ExportColumn[],
  sheetName: string = 'Datos'
): void => {
  // Transformar datos según columnas definidas
  const exportData = data.map(row => {
    const newRow: Record<string, any> = {};
    columns.forEach(col => {
      const value = getNestedValue(row, col.key);
      newRow[col.header] = col.transform ? col.transform(value, row) : (value ?? '');
    });
    return newRow;
  });

  // Crear workbook y worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(exportData);

  // Ajustar ancho de columnas
  const colWidths = columns.map(col => ({
    wch: Math.max(col.header.length, 15)
  }));
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Generar archivo con fecha
  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `${fileName}_${dateStr}.xlsx`);
};

/**
 * Exporta datos a archivo CSV
 */
export const exportToCSV = (
  data: any[],
  fileName: string,
  columns: ExportColumn[]
): void => {
  // Transformar datos según columnas definidas
  const exportData = data.map(row => {
    const newRow: Record<string, any> = {};
    columns.forEach(col => {
      const value = getNestedValue(row, col.key);
      newRow[col.header] = col.transform ? col.transform(value, row) : (value ?? '');
    });
    return newRow;
  });

  // Crear workbook y worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(exportData);

  XLSX.utils.book_append_sheet(wb, ws, 'Datos');

  // Generar archivo CSV con fecha
  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `${fileName}_${dateStr}.csv`, { bookType: 'csv' });
};

/**
 * Obtiene valor anidado de un objeto usando notación de punto
 */
const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};

// ============= Definiciones de columnas por entidad =============

export const clientesColumns: ExportColumn[] = [
  { key: 'codigo', header: 'Código' },
  { key: 'nombre', header: 'Nombre' },
  { key: 'rfc', header: 'RFC' },
  { key: 'razon_social', header: 'Razón Social' },
  { key: 'direccion', header: 'Dirección' },
  { key: 'telefono', header: 'Teléfono' },
  { key: 'email', header: 'Email' },
  { key: 'termino_credito', header: 'Término Crédito' },
  { key: 'limite_credito', header: 'Límite Crédito' },
  { key: 'saldo_pendiente', header: 'Saldo Pendiente' },
  { key: 'preferencia_facturacion', header: 'Pref. Facturación' },
  { key: 'activo', header: 'Activo', transform: (v) => v ? 'Sí' : 'No' },
];

export const sucursalesColumns: ExportColumn[] = [
  { key: 'cliente.nombre', header: 'Cliente' },
  { key: 'nombre', header: 'Sucursal' },
  { key: 'codigo_sucursal', header: 'Código' },
  { key: 'cl', header: 'CL' },
  { key: 'direccion', header: 'Dirección' },
  { key: 'telefono', header: 'Teléfono' },
  { key: 'contacto', header: 'Contacto' },
  { key: 'zona.nombre', header: 'Zona' },
  { key: 'latitud', header: 'Latitud' },
  { key: 'longitud', header: 'Longitud' },
  { key: 'horario_entrega', header: 'Horario Entrega' },
  { key: 'rfc', header: 'RFC Sucursal' },
  { key: 'razon_social', header: 'Razón Social Sucursal' },
  { key: 'activo', header: 'Activo', transform: (v) => v ? 'Sí' : 'No' },
];

export const productosColumns: ExportColumn[] = [
  { key: 'codigo', header: 'Código' },
  { key: 'nombre', header: 'Nombre' },
  { key: 'categoria', header: 'Categoría' },
  { key: 'unidad_comercial', header: 'Unidad' },
  { key: 'precio_unitario', header: 'Precio Unitario' },
  { key: 'kg_por_unidad', header: 'Kg por Unidad' },
  { key: 'piezas_por_unidad', header: 'Piezas por Unidad' },
  { key: 'precio_por_kilo', header: 'Precio por Kilo', transform: (v) => v ? 'Sí' : 'No' },
  { key: 'stock_actual', header: 'Stock Actual' },
  { key: 'stock_minimo', header: 'Stock Mínimo' },
  { key: 'aplica_iva', header: 'Aplica IVA', transform: (v) => v ? 'Sí' : 'No' },
  { key: 'aplica_ieps', header: 'Aplica IEPS', transform: (v) => v ? 'Sí' : 'No' },
  { key: 'requiere_fumigacion', header: 'Req. Fumigación', transform: (v) => v ? 'Sí' : 'No' },
  { key: 'activo', header: 'Activo', transform: (v) => v ? 'Sí' : 'No' },
];

export const pedidosColumns: ExportColumn[] = [
  { key: 'folio', header: 'Folio' },
  { key: 'fecha_pedido', header: 'Fecha', transform: (v) => v ? new Date(v).toLocaleDateString('es-MX') : '' },
  { key: 'cliente.nombre', header: 'Cliente' },
  { key: 'sucursal.nombre', header: 'Sucursal' },
  { key: 'status', header: 'Status' },
  { key: 'subtotal', header: 'Subtotal' },
  { key: 'impuestos', header: 'Impuestos' },
  { key: 'total', header: 'Total' },
  { key: 'requiere_factura', header: 'Req. Factura', transform: (v) => v ? 'Sí' : 'No' },
  { key: 'facturado', header: 'Facturado', transform: (v) => v ? 'Sí' : 'No' },
  { key: 'notas', header: 'Notas' },
];

export const lotesColumns: ExportColumn[] = [
  { key: 'producto.codigo', header: 'Código Producto' },
  { key: 'producto.nombre', header: 'Producto' },
  { key: 'lote_referencia', header: 'Lote' },
  { key: 'cantidad_disponible', header: 'Cantidad Disponible' },
  { key: 'precio_compra', header: 'Precio Compra' },
  { key: 'fecha_entrada', header: 'Fecha Entrada', transform: (v) => v ? new Date(v).toLocaleDateString('es-MX') : '' },
  { key: 'fecha_caducidad', header: 'Fecha Caducidad', transform: (v) => v ? new Date(v).toLocaleDateString('es-MX') : '' },
  { key: 'bodega.nombre', header: 'Bodega' },
  { key: 'notas', header: 'Notas' },
];

export const proveedoresColumns: ExportColumn[] = [
  { key: 'codigo', header: 'Código' },
  { key: 'nombre', header: 'Nombre' },
  { key: 'rfc', header: 'RFC' },
  { key: 'razon_social', header: 'Razón Social' },
  { key: 'contacto', header: 'Contacto' },
  { key: 'telefono', header: 'Teléfono' },
  { key: 'email', header: 'Email' },
  { key: 'direccion', header: 'Dirección' },
  { key: 'activo', header: 'Activo', transform: (v) => v ? 'Sí' : 'No' },
];
