import { calcularDesgloseImpuestos, redondear } from "@/lib/calculos";

/**
 * Input: any line item that has a pre-calculated subtotal (precio_con_impuestos)
 * plus tax flags. Works with all 3 "Nuevo Pedido" flows.
 */
export interface LineaParaTotales {
  subtotal: number;         // precio_con_impuestos (pre-calculated: qty × unit_price)
  aplica_iva: boolean;
  aplica_ieps: boolean;
  nombre?: string;          // optional, for desglose formula tracking
}

export interface TotalesPedido {
  subtotal: number;
  iva: number;
  ieps: number;
  impuestos: number;        // iva + ieps
  total: number;            // subtotal + impuestos
}

/**
 * Calculates order totals from line items using tax desglose.
 * Extracts base/iva/ieps from each line's precio_con_impuestos,
 * accumulates, and rounds at the end.
 *
 * Used by: NuevoPedidoDialog, VendedorNuevoPedidoTab, ClienteNuevoPedido
 */
export function calcularTotalesPedido(lineas: LineaParaTotales[]): TotalesPedido {
  let subtotal = 0;
  let iva = 0;
  let ieps = 0;

  for (const linea of lineas) {
    const resultado = calcularDesgloseImpuestos({
      precio_con_impuestos: linea.subtotal,
      aplica_iva: linea.aplica_iva,
      aplica_ieps: linea.aplica_ieps,
      nombre_producto: linea.nombre,
    });
    subtotal += resultado.base;
    iva += resultado.iva;
    ieps += resultado.ieps;
  }

  subtotal = redondear(subtotal);
  iva = redondear(iva);
  ieps = redondear(ieps);
  const impuestos = redondear(iva + ieps);

  return {
    subtotal,
    iva,
    ieps,
    impuestos,
    total: redondear(subtotal + impuestos),
  };
}
