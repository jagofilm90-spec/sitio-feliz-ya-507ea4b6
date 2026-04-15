// Types for the Order Wizard (4-step version)

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
  direccion?: string | null;
  termino_credito: string;
  preferencia_facturacion?: string | null;
  csf_archivo_url?: string | null;
  zona?: {
    nombre: string;
    region: string | null;
  } | null;
}

/** Cliente enriched with frequency data for step 1 */
export interface ClienteConFrecuencia extends Cliente {
  numPedidos: number;
  ultimoPedidoFecha: string | null;
}

export interface Sucursal {
  id: string;
  nombre: string;
  direccion: string | null;
}

/** Last price the selected client paid for a product */
export interface UltimoPrecioCliente {
  productoId: string;
  precio: number;
  fecha: string;
}

export interface WizardState {
  step: 1 | 2 | 3 | 4;
  clienteId: string;
  sucursalId: string;
  lineas: LineaPedido[];
  terminoCredito: string;
  notas: string;
  notasEntrega: string;
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
  notasEntrega: string;
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

/** Credit term options */
export const CREDIT_OPTIONS = [
  { value: "contado", label: "Contado" },
  { value: "8_dias", label: "8 días" },
  { value: "15_dias", label: "15 días" },
  { value: "30_dias", label: "30 días" },
  { value: "60_dias", label: "60 días" },
] as const;
