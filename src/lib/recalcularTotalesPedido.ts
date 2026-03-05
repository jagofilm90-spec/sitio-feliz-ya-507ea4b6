/**
 * Recalcula los totales de un pedido consultando sus detalles y los impuestos de cada producto.
 * Actualiza subtotal, impuestos, total y saldo_pendiente en la tabla pedidos.
 * Opcionalmente registra el cambio en pedidos_historial_cambios.
 */
import { supabase } from "@/integrations/supabase/client";
import { calcularDesgloseImpuestos, redondear } from "@/lib/calculos";

interface RecalcularResult {
  subtotal: number;
  impuestos: number;
  total: number;
}

export async function recalcularTotalesPedido(
  pedidoId: string,
  opts?: {
    tipoCambio?: string;
    cambiosJson?: any;
    totalAnterior?: number;
    usuarioId?: string;
  }
): Promise<RecalcularResult> {
  // Fetch all detalles with product tax flags
  const { data: detalles } = await supabase
    .from("pedidos_detalles")
    .select(`
      id, subtotal, es_cortesia,
      productos:productos!pedidos_detalles_producto_id_fkey(
        aplica_iva, aplica_ieps
      )
    `)
    .eq("pedido_id", pedidoId);

  let baseTotal = 0;
  let ivaTotal = 0;
  let iepsTotal = 0;

  for (const d of detalles || []) {
    if (d.es_cortesia) continue;
    const lineSubtotal = d.subtotal || 0;
    const prod = d.productos as any;
    const aplicaIva = prod?.aplica_iva ?? true;
    const aplicaIeps = prod?.aplica_ieps ?? false;

    const desglose = calcularDesgloseImpuestos({
      precio_con_impuestos: lineSubtotal,
      aplica_iva: aplicaIva,
      aplica_ieps: aplicaIeps,
    });

    baseTotal += desglose.base;
    ivaTotal += desglose.iva;
    iepsTotal += desglose.ieps;
  }

  const subtotal = redondear(baseTotal);
  const impuestos = redondear(ivaTotal + iepsTotal);
  const total = redondear(subtotal + impuestos);

  // Get current pedido to calculate saldo adjustment
  const { data: pedidoActual } = await supabase
    .from("pedidos")
    .select("total, saldo_pendiente")
    .eq("id", pedidoId)
    .single();

  const totalViejo = pedidoActual?.total || 0;
  const saldoViejo = pedidoActual?.saldo_pendiente ?? totalViejo;
  // Adjust saldo proportionally: if total changed, adjust saldo by the same delta
  const deltaTotals = total - totalViejo;
  const nuevoSaldo = redondear(Math.max(0, saldoViejo + deltaTotals));

  await supabase.from("pedidos").update({
    subtotal,
    impuestos,
    total,
    saldo_pendiente: nuevoSaldo,
    updated_at: new Date().toISOString(),
  }).eq("id", pedidoId);

  // Record audit trail if requested
  if (opts?.tipoCambio) {
    await supabase.from("pedidos_historial_cambios" as any).insert({
      pedido_id: pedidoId,
      tipo_cambio: opts.tipoCambio,
      cambios: opts.cambiosJson || {},
      total_anterior: opts.totalAnterior ?? totalViejo,
      total_nuevo: total,
      usuario_id: opts.usuarioId || null,
    });
  }

  return { subtotal, impuestos, total };
}
