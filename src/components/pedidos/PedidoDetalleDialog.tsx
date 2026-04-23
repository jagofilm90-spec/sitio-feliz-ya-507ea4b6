import { useEffect, useState } from "react";
import { AlmasaLoading } from "@/components/brand/AlmasaLoading";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, cn } from "@/lib/utils";
import { esProductoBolsas5kg, redondearABolsasCompletas, calcularNumeroBolsas, KG_POR_BOLSA, ordenarProductosAzucarPrimero, calcularDesgloseImpuestos, redondear } from "@/lib/calculos";
import { CreditCard, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import logoAlmasa from "@/assets/logo-almasa.png";
import { getDisplayName } from "@/lib/productUtils";
import { CreditoStatusBadge } from "./CreditoStatusBadge";
import { PedidoHistorialCambios } from "./PedidoHistorialCambios";
import { CREDITO_LABELS } from "@/lib/creditoUtils";
import { useIsMobile } from "@/hooks/use-mobile";
import { PedidoDetalleProductCards } from "./PedidoDetalleProductCards";
import { usePermissions } from "@/hooks/usePermissions";

interface PedidoDetalleDialogProps {
  pedidoId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigateNext?: () => void;
  onNavigatePrevious?: () => void;
  canNavigateNext?: boolean;
  canNavigatePrevious?: boolean;
}

interface PedidoDetalle {
  id: string;
  folio: string;
  fecha_pedido: string;
  subtotal: number;
  impuestos: number;
  total: number;
  status: string;
  notas: string | null;
  termino_credito: string;
  fecha_entrega_real: string | null;
  pagado: boolean;
  vendedor_id?: string;
  alertas_precio?: any[];
  clientes: { nombre: string; codigo: string } | null;
  profiles: { full_name: string } | null;
  cliente_sucursales: { nombre: string } | null;
  pedidos_detalles: Array<{
    id: string;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
    kilos_totales: number | null;
    unidades_manual: number | null;
    precio_original?: number | null;
    productos: {
      id?: string;
      codigo: string;
      nombre: string;
      marca: string | null;
      especificaciones: string | null;
      contenido_empaque: string | null;
      unidad: string;
      precio_por_kilo: boolean;
      peso_kg: number | null;
      aplica_iva?: boolean;
      aplica_ieps?: boolean;
      precio_venta?: number;
      descuento_maximo?: number;
    };
  }>;
}

export default function PedidoDetalleDialog({
  pedidoId,
  open,
  onOpenChange,
  onNavigateNext,
  onNavigatePrevious,
  canNavigateNext = false,
  canNavigatePrevious = false}: PedidoDetalleDialogProps) {
  const [pedido, setPedido] = useState<PedidoDetalle | null>(null);
  const [loading, setLoading] = useState(false);
  const isMobile = useIsMobile();
  const hasEditPriceRole = usePermissions('pedidos', 'edit_price');
  const canEditPrice = hasEditPriceRole && pedido != null && ["pendiente", "por_autorizar", "borrador"].includes(pedido.status);

  useEffect(() => {
    if (pedidoId && open) {
      setPedido(null);
      loadPedido();
    }
  }, [pedidoId, open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" && canNavigateNext && onNavigateNext) {
        e.preventDefault();
        onNavigateNext();
      } else if (e.key === "ArrowLeft" && canNavigatePrevious && onNavigatePrevious) {
        e.preventDefault();
        onNavigatePrevious();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, canNavigateNext, canNavigatePrevious, onNavigateNext, onNavigatePrevious]);

  const loadPedido = async () => {
    if (!pedidoId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("pedidos")
        .select(`
          id, folio, fecha_pedido, subtotal, impuestos, total, status, notas,
          termino_credito, fecha_entrega_real, pagado, vendedor_id, alertas_precio,
          clientes (nombre, codigo),
          profiles:vendedor_id (full_name),
          cliente_sucursales:sucursal_id (nombre),
          pedidos_detalles (
            id, cantidad, precio_unitario, subtotal, kilos_totales, unidades_manual, precio_original,
            productos (id, codigo, nombre, marca, especificaciones, contenido_empaque, unidad, precio_por_kilo, peso_kg, aplica_iva, aplica_ieps, precio_venta, descuento_maximo)
          )
        `)
        .eq("id", pedidoId)
        .maybeSingle();
      if (error) throw error;
      setPedido(data as any);
    } catch (error: any) {
      console.error("Error loading pedido:", error);
      toast.error(`Error al cargar pedido: ${error?.message || "Error desconocido"}`);
      setPedido(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePriceUpdate = async (detalleId: string, newPrice: number, oldPrice: number) => {
    if (!pedido || newPrice === oldPrice) return;

    const detalle = pedido.pedidos_detalles.find(d => d.id === detalleId);
    if (!detalle) return;

    const prod = detalle.productos;
    const newSubtotal = prod.precio_por_kilo && prod.peso_kg
      ? redondear(detalle.cantidad * prod.peso_kg * newPrice)
      : redondear(detalle.cantidad * newPrice);

    // 1. Update the line
    const { error } = await supabase.from("pedidos_detalles").update({
      precio_unitario: newPrice,
      subtotal: newSubtotal,
      precio_ajustado_por: (await supabase.auth.getUser()).data.user?.id || null,
      fecha_ajuste_precio: new Date().toISOString(),
    } as any).eq("id", detalleId);

    if (error) { toast.error("Error al actualizar precio"); return; }

    // 2. Recalculate pedido totals
    const updatedDetalles = pedido.pedidos_detalles.map(d =>
      d.id === detalleId ? { ...d, precio_unitario: newPrice, subtotal: newSubtotal } : d
    );
    let baseTotal = 0, ivaTotal = 0, iepsTotal = 0;
    for (const d of updatedDetalles) {
      const aplicaIva = d.productos.aplica_iva ?? true;
      const aplicaIeps = d.productos.aplica_ieps ?? false;
      const desglose = calcularDesgloseImpuestos({
        precio_con_impuestos: d.subtotal,
        aplica_iva: aplicaIva,
        aplica_ieps: aplicaIeps,
      });
      baseTotal += desglose.base;
      ivaTotal += desglose.iva;
      iepsTotal += desglose.ieps;
    }
    const newTotal = redondear(baseTotal + ivaTotal + iepsTotal);

    await supabase.from("pedidos").update({
      subtotal: redondear(baseTotal),
      impuestos: redondear(ivaTotal + iepsTotal),
      total: newTotal,
      updated_at: new Date().toISOString(),
    }).eq("id", pedido.id);

    // 3. Update alertas_precio if applicable
    const alertas: any[] = (pedido as any).alertas_precio || [];
    if (alertas.length > 0) {
      const prodId = prod.id || (prod as any).producto_id;
      const updatedAlertas = alertas.filter((a: any) => a.producto_id !== prodId);
      await supabase.from("pedidos").update({ alertas_precio: updatedAlertas } as any).eq("id", pedido.id);
    }

    // 4. Notify vendedor
    try {
      const productoNombre = getDisplayName(prod);
      await supabase.from("notificaciones").insert({
        tipo: "precio_ajustado_admin",
        titulo: `Precio ajustado en ${pedido.folio}`,
        descripcion: `${productoNombre}: ${formatCurrency(oldPrice)} → ${formatCurrency(newPrice)}`,
        leida: false,
      });
    } catch { /* non-critical */ }

    toast.success("Precio actualizado");
    loadPedido(); // refresh
  };

  const getStatusBadge = (status: string) => {
    const labels: Record<string, string> = {
      pendiente: "Pendiente", en_ruta: "En Ruta", entregado: "Entregado", cancelado: "Cancelado"};
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pendiente: "secondary", en_ruta: "default", entregado: "default", cancelado: "destructive"};
    return <Badge variant={variants[status] || "default"}>{labels[status] || status}</Badge>;
  };

  const sortedDetalles = pedido ? ordenarProductosAzucarPrimero(pedido.pedidos_detalles, (d) => d.productos.nombre) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-4xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <img src={logoAlmasa} alt="ALMASA" className="h-7 object-contain hidden sm:block" />
            Detalle del Pedido {pedido?.folio}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <AlmasaLoading size={48} />
        ) : pedido ? (
          <div className="space-y-6">
            {/* Información general */}
            <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Cliente</p>
                <p className="font-medium">{pedido.clientes?.nombre || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sucursal</p>
                <p className="font-medium">{pedido.cliente_sucursales?.nombre || "Principal"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vendedor</p>
                <p className="font-medium">{pedido.profiles?.full_name || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fecha</p>
                <p className="font-medium">{new Date(pedido.fecha_pedido).toLocaleDateString("es-MX")}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estado</p>
                {getStatusBadge(pedido.status)}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Plazo de Crédito</p>
                <Select value={pedido.termino_credito || "contado"} onValueChange={async (val) => {
                  const { error } = await supabase.from("pedidos").update({ termino_credito: val as any }).eq("id", pedido.id);
                  if (error) { toast.error("Error al cambiar crédito"); return; }
                  setPedido({ ...pedido, termino_credito: val });
                  toast.success(`Crédito cambiado a ${CREDITO_LABELS[val] || val}`);
                }}>
                  <SelectTrigger className="h-8 w-auto text-sm mt-0.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contado">Contado</SelectItem>
                    <SelectItem value="8_dias">8 días</SelectItem>
                    <SelectItem value="15_dias">15 días</SelectItem>
                    <SelectItem value="30_dias">30 días</SelectItem>
                    <SelectItem value="60_dias">60 días</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {pedido.status !== 'cancelado' && (
                <div>
                  <p className="text-sm text-muted-foreground">Estado de Pago</p>
                  <CreditoStatusBadge
                    terminoCredito={pedido.termino_credito || 'contado'}
                    fechaCreacion={pedido.fecha_pedido}
                    fechaEntregaReal={pedido.fecha_entrega_real}
                    pagado={pedido.pagado || false}
                  />
                </div>
              )}
            </div>

            {/* Notas */}
            {pedido.notas && (
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Notas</p>
                <p className="text-sm">{pedido.notas}</p>
              </div>
            )}

            {/* Productos - Mobile: Cards, Desktop: Table */}
            {isMobile ? (
              <PedidoDetalleProductCards
                detalles={sortedDetalles}
                clienteNombre={pedido.clientes?.nombre || undefined}
              />
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-center">Presentación</TableHead>
                      <TableHead className="text-right">P. Unitario</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedDetalles.map((detalle) => {
                      const producto = detalle.productos;
                      const nombreLower = producto.nombre.toLowerCase();
                      let unidadComercial = producto.unidad || "pza";
                      const esLecaroz = pedido.clientes?.nombre?.toLowerCase().includes('lecaroz');

                      if (esLecaroz && (nombreLower.includes('anís') || nombreLower.includes('anis') || nombreLower.includes('canela molida'))) {
                        unidadComercial = 'bolsa';
                      }

                      let presentacionDisplay = "";
                      if (esProductoBolsas5kg(producto.nombre)) {
                        const numBolsas = calcularNumeroBolsas(detalle.cantidad, KG_POR_BOLSA);
                        presentacionDisplay = `${numBolsas} bolsa${numBolsas !== 1 ? 's' : ''}`;
                      } else if (detalle.kilos_totales && producto.peso_kg) {
                        const plural = detalle.cantidad !== 1 ? 's' : '';
                        presentacionDisplay = `${detalle.cantidad.toLocaleString()} ${unidadComercial}${plural} de ${producto.peso_kg} kg`;
                      } else if (detalle.kilos_totales) {
                        presentacionDisplay = `${detalle.kilos_totales.toLocaleString()} kg total`;
                      } else if (producto.peso_kg) {
                        const plural = detalle.cantidad !== 1 ? 's' : '';
                        presentacionDisplay = `${detalle.cantidad.toLocaleString()} ${unidadComercial}${plural} de ${producto.peso_kg} kg`;
                      } else {
                        presentacionDisplay = "-";
                      }

                      return (
                        <TableRow key={detalle.id}>
                          <TableCell className="font-mono text-sm">{producto.codigo}</TableCell>
                          <TableCell>{getDisplayName(producto)}</TableCell>
                          <TableCell className="text-right">
                            {producto.peso_kg && producto.precio_por_kilo
                              ? `${detalle.cantidad} ${unidadComercial}${detalle.cantidad !== 1 ? 's' : ''}`
                              : producto.precio_por_kilo
                                ? `${detalle.cantidad} kg`
                                : `${detalle.cantidad} ${unidadComercial}${detalle.cantidad !== 1 ? 's' : ''}`
                            }
                            {detalle.kilos_totales && (
                              <span className="text-muted-foreground text-xs ml-1">
                                ({detalle.kilos_totales.toLocaleString()} kg)
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-center font-semibold text-primary">
                            {presentacionDisplay}
                          </TableCell>
                          <TableCell className="text-right">
                            {canEditPrice ? (
                              <EditablePriceCell
                                detalleId={detalle.id}
                                price={detalle.precio_unitario}
                                esPorKilo={producto.precio_por_kilo}
                                precioLista={producto.precio_venta || detalle.precio_unitario}
                                piso={(producto.precio_venta || detalle.precio_unitario) - (producto.descuento_maximo || 0)}
                                wasEdited={detalle.precio_original != null && detalle.precio_original !== detalle.precio_unitario}
                                onSave={(newPrice) => handlePriceUpdate(detalle.id, newPrice, detalle.precio_unitario)}
                              />
                            ) : (
                              <span className="font-mono">
                                {formatCurrency(detalle.precio_unitario)}
                                {producto.precio_por_kilo && <span className="text-xs text-muted-foreground">/kg</span>}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(detalle.subtotal)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Totales */}
            <div className={isMobile ? "" : "flex justify-end"}>
              <div className={`${isMobile ? "w-full" : "w-64"} space-y-2`}>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-mono">{formatCurrency(pedido.subtotal || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Impuestos:</span>
                  <span className="font-mono">{formatCurrency(pedido.impuestos || 0)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span className="font-mono">{formatCurrency(pedido.total)}</span>
                </div>
              </div>
            </div>

            {/* Historial de modificaciones */}
            <PedidoHistorialCambios pedidoId={pedidoId} />
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No se pudo cargar el pedido.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={loadPedido}>Reintentar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Editable price cell (admin only) ──

function EditablePriceCell({
  detalleId,
  price,
  esPorKilo,
  precioLista,
  piso,
  wasEdited,
  onSave,
}: {
  detalleId: string;
  price: number;
  esPorKilo: boolean;
  precioLista: number;
  piso: number;
  wasEdited: boolean;
  onSave: (newPrice: number) => void;
}) {
  const [localPrice, setLocalPrice] = useState(price.toFixed(2));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setLocalPrice(price.toFixed(2));
  }, [price, focused]);

  const handleBlur = () => {
    setFocused(false);
    const val = parseFloat(localPrice) || 0;
    setLocalPrice(val.toFixed(2));
    if (val !== price && val > 0) {
      onSave(val);
    }
  };

  return (
    <div>
    <div className="flex items-center gap-1 justify-end">
      <span className="text-ink-400 text-sm">$</span>
      <input
        type="text"
        inputMode="decimal"
        value={localPrice}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "" || /^\d*\.?\d{0,2}$/.test(v)) setLocalPrice(v);
        }}
        onFocus={() => setFocused(true)}
        onBlur={handleBlur}
        className={cn(
          "w-20 text-right font-mono text-sm tabular-nums bg-transparent outline-none transition-colors",
          focused
            ? "border border-crimson-400 rounded px-1 py-0.5"
            : "border-b border-dashed border-ink-300 hover:border-crimson-400 cursor-text"
        )}
      />
      {esPorKilo && <span className="text-xs text-muted-foreground">/kg</span>}
      {wasEdited && <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 ml-1 text-amber-600 border-amber-300">editado</Badge>}
    </div>
    <div className="text-[10px] text-ink-400 mt-0.5 tabular-nums text-right">
      Lista {formatCurrency(precioLista)} · <span className={price < piso ? "text-red-500 font-medium" : ""}>Piso {formatCurrency(piso)}</span>
    </div>
    </div>
  );
}
