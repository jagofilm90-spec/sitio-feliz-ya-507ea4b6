import { FileCheck, ChevronLeft, Loader2, Store, MapPin, CreditCard, AlertTriangle, Clock, Package, Truck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import { getDisplayName } from "@/lib/productUtils";
import { LineaPedido, Cliente, Sucursal, TotalesCalculados } from "./types";
import { supabase } from "@/integrations/supabase/client";

export async function enviarEmailPedido(payload: {
  folio: string;
  clienteNombre: string;
  sucursalNombre?: string;
  vendedorNombre: string;
  terminoCredito: string;
  notas?: string;
  lineas: LineaPedido[];
  totales: TotalesCalculados;
  fechaPedido: string;
}) {
  try {
    const body = {
      folio: payload.folio,
      clienteNombre: payload.clienteNombre,
      sucursalNombre: payload.sucursalNombre,
      vendedorNombre: payload.vendedorNombre,
      terminoCredito: payload.terminoCredito,
      notas: payload.notas,
      fechaPedido: payload.fechaPedido,
      lineas: payload.lineas.map(l => ({
        producto: getDisplayName(l.producto),
        cantidad: l.cantidad,
        precioUnitario: l.precioUnitario,
        subtotal: l.subtotal,
        esPorKilo: l.producto.precio_por_kilo,
        pesoKg: l.producto.peso_kg || 0,
        descuento: l.descuento,
      })),
      subtotal: payload.totales.subtotal,
      iva: payload.totales.iva,
      ieps: payload.totales.ieps,
      total: payload.totales.total,
      pesoTotalKg: payload.totales.pesoTotalKg,
      totalUnidades: payload.totales.totalUnidades,
    };
    await supabase.functions.invoke("enviar-pedido-interno", { body });
  } catch (err) {
    console.warn("Email de pedido no enviado:", err);
  }
}

interface PasoConfirmarProps {
  cliente: Cliente | undefined;
  sucursal: Sucursal | undefined;
  lineas: LineaPedido[];
  terminoCredito: string;
  notas: string;
  totales: TotalesCalculados;
  submitting: boolean;
  onSubmit: () => void;
  onBack: () => void;
}

export function PasoConfirmar({
  cliente,
  sucursal,
  lineas,
  terminoCredito,
  notas,
  totales,
  submitting,
  onSubmit,
  onBack,
}: PasoConfirmarProps) {
  const productosConDescuentoPendiente = lineas.filter(
    l => l.requiereAutorizacion && l.autorizacionStatus === 'pendiente'
  );
  const productosSinStock = lineas.filter(l => l.producto.stock_actual <= 0);

  const formatCreditTerm = (term: string) => {
    if (term === 'contado') return 'Contado';
    return term.replace('_', ' ');
  };

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
          <FileCheck className="h-6 w-6 text-primary" />
          Revisa tu pedido
        </h2>
        <p className="text-muted-foreground">
          Verifica que toda la información esté correcta
        </p>
      </div>

      {/* Client & Branch Info */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-start gap-4">
            <Store className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-lg">{cliente?.nombre}</p>
              {sucursal && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{sucursal.nombre}</span>
                  {sucursal.direccion && (
                    <span className="truncate">- {sucursal.direccion}</span>
                  )}
                </div>
              )}
            </div>
            <Badge variant="outline" className="shrink-0">
              <CreditCard className="h-3 w-3 mr-1" />
              {formatCreditTerm(terminoCredito)}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {(productosConDescuentoPendiente.length > 0 || productosSinStock.length > 0) && (
        <div className="space-y-2">
          {productosConDescuentoPendiente.length > 0 && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
              <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200 text-sm">
                  {productosConDescuentoPendiente.length} producto(s) con descuento pendiente de revisión
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  El pedido se creará como "Por Autorizar"
                </p>
              </div>
            </div>
          )}
          {productosSinStock.length > 0 && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
              <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-orange-800 dark:text-orange-200 text-sm">
                  {productosSinStock.length} producto(s) sin stock disponible
                </p>
                <p className="text-xs text-orange-700 dark:text-orange-300">
                  Se surtirán cuando haya disponibilidad
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Products List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Productos
            </span>
            <Badge variant="secondary">{lineas.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[300px]">
            <div className="divide-y">
              {lineas.map((linea) => {
                const esPorKilo = linea.producto.precio_por_kilo;
                const presentacionKg = linea.producto.peso_kg || 0;
                const kilosTotales = esPorKilo && presentacionKg > 0 ? linea.cantidad * presentacionKg : 0;
                const tieneDescuento = linea.descuento > 0;

                return (
                  <div key={linea.producto.id} className="p-3 flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{getDisplayName(linea.producto)}</p>
                      <div className="flex items-center gap-2 flex-wrap mt-0.5">
                        <span className="text-xs text-muted-foreground">
                          {linea.cantidad} × {formatCurrency(linea.precioUnitario)}
                        </span>
                        {esPorKilo && presentacionKg > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {kilosTotales} kg
                          </Badge>
                        )}
                        {tieneDescuento && (
                          <Badge variant="secondary" className="text-xs text-green-600">
                            -{formatCurrency(linea.descuento * linea.cantidad)}
                          </Badge>
                        )}
                        {linea.producto.stock_actual <= 0 && (
                          <Badge variant="destructive" className="text-xs">Sin stock</Badge>
                        )}
                        {linea.autorizacionStatus === 'pendiente' && (
                          <Badge variant="outline" className="text-xs text-amber-600 border-amber-400">
                            <Clock className="h-3 w-3 mr-1" />
                            Pendiente
                          </Badge>
                        )}
                        {linea.autorizacionStatus === 'aprobado' && (
                          <Badge variant="outline" className="text-xs text-green-600 border-green-400">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Aprobado
                          </Badge>
                        )}
                      </div>
                    </div>
                    <span className="font-bold text-sm shrink-0">
                      {formatCurrency(linea.subtotal)}
                    </span>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Notes */}
      {notas && (
        <Card>
          <CardContent className="py-3">
            <p className="text-sm">
              <span className="font-medium text-muted-foreground">Notas: </span>
              {notas}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Totals Summary */}
      <Card className="bg-muted/30">
        <CardContent className="py-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(totales.subtotal)}</span>
          </div>
          {totales.iva > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">IVA (16%)</span>
              <span>{formatCurrency(totales.iva)}</span>
            </div>
          )}
          {totales.ieps > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">IEPS (8%)</span>
              <span>{formatCurrency(totales.ieps)}</span>
            </div>
          )}
          {totales.ahorroDescuentos > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Descuentos aplicados</span>
              <span>-{formatCurrency(totales.ahorroDescuentos)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {totales.totalUnidades} unidades • {totales.pesoTotalKg.toLocaleString()} kg
              </span>
            </div>
          </div>
          <div className="flex justify-between font-bold text-xl pt-2">
            <span>Total</span>
            <span className="text-primary">{formatCurrency(totales.total)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex gap-3">
        <Button 
          variant="outline" 
          onClick={onBack} 
          size="lg" 
          className="h-14"
          disabled={submitting}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Anterior
        </Button>
        <Button 
          onClick={onSubmit} 
          size="lg"
          className="flex-1 h-14 text-lg font-bold"
          disabled={submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Creando pedido...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-5 w-5 mr-2" />
              Crear Pedido
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
