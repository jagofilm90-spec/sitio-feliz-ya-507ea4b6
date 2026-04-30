export interface ProveedorLite {
  id: string;
  nombre: string;
  rfc: string | null;
  termino_pago: string | null;
}

export interface ProductoLite {
  id: string;
  codigo: string;
  nombre: string;
  precio_compra: number | null;
  costo_proveedor: number | null;
  aplica_iva: boolean;
  aplica_ieps: boolean;
  tasa_ieps: number | null;
  precio_por_kilo: boolean;
  peso_kg: number | null;
}

export type PrecioOrigen = 'oc' | 'cotizacion' | 'manual' | 'fallback_catalogo' | 'primera_vez';

export interface LineaOC {
  uid: string; // local id
  producto_id: string;
  producto: ProductoLite;
  cantidad: number;
  cantidadStr: string;
  precio_unitario: number;
  precioStr: string;

  // M02.5 Pilar I — metadata de pre-fill temporal
  precio_origen: PrecioOrigen;
  precio_sugerido_inicial: number;
  precio_vigente_desde: string | null;
  precio_oc_folio: string | null;
}

export type TipoPlazo = "contado" | "8" | "15" | "30" | "anticipado" | "otro";

export function calcularPesoLinea(l: { cantidad: number; producto: ProductoLite }): number {
  return (Number(l.cantidad) || 0) * (Number(l.producto.peso_kg) || 0);
}

export function calcularSubtotalLinea(l: { cantidad: number; precio_unitario: number; producto: ProductoLite }): number {
  const cant = Number(l.cantidad) || 0;
  const precio = Number(l.precio_unitario) || 0;
  if (l.producto.precio_por_kilo) {
    const peso = Number(l.producto.peso_kg) || 0;
    return cant * peso * precio;
  }
  return cant * precio;
}