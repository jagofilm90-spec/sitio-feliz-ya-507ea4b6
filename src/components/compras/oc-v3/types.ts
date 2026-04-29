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
}

export interface LineaOC {
  uid: string; // local id
  producto_id: string;
  producto: ProductoLite;
  cantidad: number;
  precio_unitario: number;
}

export type TipoPlazo = "contado" | "8" | "15" | "30" | "anticipado" | "otro";
