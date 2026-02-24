// Types for the Order Wizard

export interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  especificaciones: string | null;
  marca: string | null;
  contenido_empaque: string | null;
  unidad: string;
  precio_venta: number;
  stock_actual: number;
  stock_minimo: number | null;
  aplica_iva: boolean;
  aplica_ieps: boolean;
  precio_por_kilo: boolean;
  peso_kg: number | null;
  descuento_maximo: number;
}

export interface LineaPedido {
  producto: Producto;
  cantidad: number;
  precioLista: number;
  precioUnitario: number;
  descuento: number;
  subtotal: number;
  requiereAutorizacion: boolean;
  autorizacionStatus?: 'pendiente' | 'aprobado' | 'rechazado' | null;
  solicitudId?: string;
}

export interface Cliente {
  id: string;
  codigo: string;
  nombre: string;
  termino_credito: string;
  preferencia_facturacion?: string | null;
  csf_archivo_url?: string | null;
  zona?: {
    nombre: string;
    region: string | null;
  } | null;
}

export interface Sucursal {
  id: string;
  nombre: string;
  direccion: string | null;
}

export interface WizardState {
  step: 1 | 2 | 3;
  clienteId: string;
  sucursalId: string;
  lineas: LineaPedido[];
  terminoCredito: string;
  notas: string;
}

export interface CartDraft {
  clienteId: string;
  sucursalId: string;
  lineas: Array<{
    productoId: string;
    cantidad: number;
    precioLista: number;
    precioUnitario: number;
    descuento: number;
    requiereAutorizacion: boolean;
    autorizacionStatus?: 'pendiente' | 'aprobado' | 'rechazado' | null;
  }>;
  terminoCredito: string;
  notas: string;
  savedAt: string;
}

export interface TotalesCalculados {
  subtotal: number;
  iva: number;
  ieps: number;
  impuestos: number;
  total: number;
  pesoTotalKg: number;
  totalUnidades: number;
  ahorroDescuentos: number;
  productosConIva: number;
  productosConIeps: number;
}
