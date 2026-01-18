/**
 * UTILIDADES PARA PROVEEDORES
 * ===========================
 * Funciones helper para formatear datos de proveedores en PDFs y documentos
 */

import { getRegimenDescripcion } from "@/constants/catalogoSAT";

interface ProveedorFiscal {
  nombre?: string | null;
  rfc?: string | null;
  regimen_fiscal?: string | null;
  calle?: string | null;
  numero_exterior?: string | null;
  numero_interior?: string | null;
  colonia?: string | null;
  municipio?: string | null;
  estado?: string | null;
  codigo_postal?: string | null;
  direccion?: string | null; // Campo legacy
  email?: string | null;
  telefono?: string | null;
}

/**
 * Formatea la dirección fiscal del proveedor para mostrar en documentos
 * Usa los campos estructurados si existen, de lo contrario usa el campo direccion legacy
 */
export const formatDireccionFiscal = (proveedor: ProveedorFiscal | null | undefined): string => {
  if (!proveedor) return '';
  
  const partes: string[] = [];
  
  // Línea 1: Calle y números
  if (proveedor.calle) {
    let linea = proveedor.calle;
    if (proveedor.numero_exterior) linea += ` #${proveedor.numero_exterior}`;
    if (proveedor.numero_interior) linea += `, Int. ${proveedor.numero_interior}`;
    partes.push(linea);
  }
  
  // Línea 2: Colonia
  if (proveedor.colonia) partes.push(`Col. ${proveedor.colonia}`);
  
  // Línea 3: Municipio, Estado, CP
  const linea3: string[] = [];
  if (proveedor.municipio) linea3.push(proveedor.municipio);
  if (proveedor.estado) linea3.push(proveedor.estado);
  if (proveedor.codigo_postal) linea3.push(`C.P. ${proveedor.codigo_postal}`);
  if (linea3.length > 0) partes.push(linea3.join(', '));
  
  // Fallback al campo direccion si no hay datos estructurados
  if (partes.length === 0 && proveedor.direccion) {
    return proveedor.direccion;
  }
  
  return partes.join(', ');
};

/**
 * Formatea la dirección fiscal del proveedor con saltos de línea HTML
 * Para uso en PDFs donde se quiere mostrar en múltiples líneas
 */
export const formatDireccionFiscalHTML = (proveedor: ProveedorFiscal | null | undefined): string => {
  if (!proveedor) return '';
  
  const partes: string[] = [];
  
  // Línea 1: Calle y números
  if (proveedor.calle) {
    let linea = proveedor.calle;
    if (proveedor.numero_exterior) linea += ` #${proveedor.numero_exterior}`;
    if (proveedor.numero_interior) linea += `, Int. ${proveedor.numero_interior}`;
    partes.push(linea);
  }
  
  // Línea 2: Colonia
  if (proveedor.colonia) partes.push(`Col. ${proveedor.colonia}`);
  
  // Línea 3: Municipio, Estado, CP
  const linea3: string[] = [];
  if (proveedor.municipio) linea3.push(proveedor.municipio);
  if (proveedor.estado) linea3.push(proveedor.estado);
  if (proveedor.codigo_postal) linea3.push(`C.P. ${proveedor.codigo_postal}`);
  if (linea3.length > 0) partes.push(linea3.join(', '));
  
  // Fallback al campo direccion si no hay datos estructurados
  if (partes.length === 0 && proveedor.direccion) {
    return proveedor.direccion;
  }
  
  return partes.join('<br>');
};

/**
 * Genera el bloque HTML completo de datos fiscales del proveedor para PDFs de OC
 */
export const getProveedorFiscalHTML = (proveedor: ProveedorFiscal | null | undefined): string => {
  if (!proveedor) return '<p>Proveedor no especificado</p>';
  
  const direccion = formatDireccionFiscalHTML(proveedor);
  const regimenDesc = proveedor.regimen_fiscal ? getRegimenDescripcion(proveedor.regimen_fiscal) : null;
  
  return `
    <p><strong>${proveedor.nombre || 'Sin nombre'}</strong></p>
    ${proveedor.rfc ? `<p style="margin: 2px 0;"><strong>RFC:</strong> ${proveedor.rfc}</p>` : ''}
    ${regimenDesc ? `<p style="margin: 2px 0; font-size: 10px;"><strong>Régimen:</strong> ${regimenDesc}</p>` : ''}
    ${direccion ? `<p style="margin: 5px 0; font-size: 10px;">${direccion}</p>` : ''}
    ${proveedor.telefono ? `<p style="margin: 2px 0;">📞 ${proveedor.telefono}</p>` : ''}
    ${proveedor.email ? `<p style="margin: 2px 0;">📧 ${proveedor.email}</p>` : ''}
  `;
};
