import { ChevronLeft, Loader2, Store, MapPin, CreditCard, AlertTriangle, Clock, CheckCircle2, FileText, Receipt, Truck, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
  requiereFactura: boolean;
  onRequiereFacturaChange: (value: boolean) => void;
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
  requiereFactura,
  onRequiereFacturaChange,
  onSubmit,
  onBack,
}: PasoConfirmarProps) {
  const tieneCSF = !!(cliente?.csf_archivo_url || cliente?.preferencia_facturacion === 'siempre_factura');

  const productosConDescuentoPendiente = lineas.filter(
    l => l.requiereAutorizacion && l.autorizacionStatus === 'pendiente'
  );
  const productosSinStock = lineas.filter(l => l.producto.stock_actual <= 0);
  const requiereAutorizacionPedido = productosConDescuentoPendiente.length > 0;

  const formatCreditTerm = (term: string) => {
    if (term === 'contado') return 'Contado';
    return term.replace('_', ' ');
  };

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      {/* Compact header */}
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold flex items-center justify-center gap-2">
          <Send className="h-5 w-5 text-primary" />
          Confirmar y Enviar
        </h2>
      </div>

      {/* Client + delivery compact row */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center gap-3">
            <Store className="h-4 w-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{cliente?.nombre}</p>
              {sucursal && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                  <MapPin className="h-3 w-3 shrink-0" />
                  {sucursal.nombre}{sucursal.direccion ? ` — ${sucursal.direccion}` : ''}
                </p>
              )}
            </div>
            <Badge variant="outline" className="shrink-0 text-xs">
              <CreditCard className="h-3 w-3 mr-1" />
              {formatCreditTerm(terminoCredito)}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Alerts — only if needed */}
      {(productosConDescuentoPendiente.length > 0 || productosSinStock.length > 0) && (
        <div className="space-y-2">
          {productosConDescuentoPendiente.length > 0 && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
              <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200 text-sm">
                  {productosConDescuentoPendiente.length} producto(s) pendiente de autorización
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  El pedido quedará como "Por Autorizar"
                </p>
              </div>
            </div>
          )}
          {productosSinStock.length > 0 && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
              <AlertTriangle className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
              <p className="font-medium text-orange-800 dark:text-orange-200 text-sm">
                {productosSinStock.length} producto(s) sin stock — se surtirán después
              </p>
            </div>
          )}
        </div>
      )}

      {/* Invoice Toggle */}
      {tieneCSF && (
        <Card className={requiereFactura ? "border-primary/50 bg-primary/5" : ""}>
          <CardContent className="py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                {requiereFactura ? (
                  <FileText className="h-4 w-4 text-primary" />
                ) : (
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="font-medium text-sm">
                  {requiereFactura ? "Con Factura" : "Solo Remisión"}
                </span>
              </div>
              <Switch
                id="factura-switch"
                checked={requiereFactura}
                onCheckedChange={onRequiereFacturaChange}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {notas && (
        <p className="text-sm text-muted-foreground px-1">
          <span className="font-medium">Notas:</span> {notas}
        </p>
      )}

      {/* Compact Totals */}
      <Card className="bg-muted/30">
        <CardContent className="py-4 space-y-1.5">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{lineas.length} productos • {totales.totalUnidades} uds • {totales.pesoTotalKg.toLocaleString()} kg</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(totales.subtotal)}</span>
          </div>
          {totales.iva > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">IVA</span>
              <span>{formatCurrency(totales.iva)}</span>
            </div>
          )}
          {totales.ieps > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">IEPS</span>
              <span>{formatCurrency(totales.ieps)}</span>
            </div>
          )}
          {totales.ahorroDescuentos > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Descuentos</span>
              <span>-{formatCurrency(totales.ahorroDescuentos)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-bold text-xl pt-1">
            <span>Total</span>
            <span className="text-primary">{formatCurrency(totales.total)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <Button 
          variant="outline" 
          onClick={onBack} 
          size="lg" 
          className="h-14"
          disabled={submitting}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Atrás
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
              {requiereAutorizacionPedido ? "Enviando..." : "Creando..."}
            </>
          ) : requiereAutorizacionPedido ? (
            <>
              <AlertTriangle className="h-5 w-5 mr-2" />
              Enviar para Autorización
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
