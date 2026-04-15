import { ChevronLeft, Loader2, AlertTriangle, CheckCircle2, Truck, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, cn } from "@/lib/utils";
import { getDisplayName } from "@/lib/productUtils";
import type { LineaPedido, ClienteConFrecuencia, Sucursal, TotalesCalculados } from "./types";
import { CREDIT_OPTIONS } from "./types";

interface PasoConfirmarProps {
  cliente: ClienteConFrecuencia | undefined;
  sucursal: Sucursal | undefined;
  lineas: LineaPedido[];
  terminoCredito: string;
  notasEntrega: string;
  requiereFactura: boolean;
  totales: TotalesCalculados;
  vendedorNombre: string;
  submitting: boolean;
  onSubmit: () => void;
  onBack: () => void;
  onCancelar?: () => void;
}

export function PasoConfirmar({
  cliente,
  sucursal,
  lineas,
  terminoCredito,
  notasEntrega,
  requiereFactura,
  totales,
  vendedorNombre,
  submitting,
  onSubmit,
  onBack,
  onCancelar,
}: PasoConfirmarProps) {
  const bajoPisoCount = lineas.filter((l) => {
    const piso = l.precioLista - (l.producto.descuento_maximo || 0);
    return l.precioUnitario < piso;
  }).length;

  const requiereAutorizacion = lineas.some(
    (l) => l.requiereAutorizacion && l.autorizacionStatus !== "aprobado"
  );

  const plazoLabel =
    CREDIT_OPTIONS.find((o) => o.value === terminoCredito)?.label ||
    terminoCredito.replace("_", " ");

  const direccion = sucursal?.direccion || cliente?.direccion || cliente?.zona?.nombre || null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-3 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-serif text-2xl font-light text-ink-900">
              Resumen del <em className="italic text-crimson-500">pedido.</em>
            </h2>
            <p className="font-serif italic text-sm text-ink-500 mt-1">
              Revisa que todo esté correcto antes de enviar.
            </p>
          </div>
          {onCancelar && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-ink-400 hover:text-red-500 shrink-0" onClick={onCancelar}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Info card */}
        <Card className="border-ink-100">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-ink-400 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-ink-800">{cliente?.nombre || "—"}</p>
                {direccion && <p className="text-xs text-ink-500">{direccion}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-ink-500">
              <span>Vendedor: {vendedorNombre}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs">{plazoLabel}</Badge>
              {requiereFactura && (
                <Badge variant="outline" className="text-xs border-blue-200 text-blue-700 bg-blue-50">
                  Con factura
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Products */}
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-2">
            Productos ({lineas.length})
          </div>
          <Card className="border-ink-100">
            <CardContent className="p-0 divide-y divide-ink-100">
              {lineas.map((l) => {
                const esPorKilo = l.producto.precio_por_kilo;
                const piso = l.precioLista - (l.producto.descuento_maximo || 0);
                const esBajoPiso = l.precioUnitario < piso;
                return (
                  <div key={l.producto.id} className={cn("px-4 py-2.5", esBajoPiso && "bg-red-50/50")}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-ink-800 block truncate">
                          {getDisplayName(l.producto)}
                        </span>
                        <span className="text-xs text-ink-400 tabular-nums">
                          {l.cantidad} {l.producto.unidad} × {formatCurrency(l.precioUnitario)}
                          {esPorKilo && "/kg"}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-ink-800 tabular-nums shrink-0">
                        {formatCurrency(l.subtotal)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Totals */}
        <Card className="border-ink-100">
          <CardContent className="p-4 space-y-1.5">
            <div className="flex justify-between text-sm text-ink-600">
              <span>
                Productos ({lineas.length})
                {totales.totalUnidades > 0 && (
                  <span className="text-ink-400 ml-1">({totales.totalUnidades} bultos)</span>
                )}
              </span>
              <span className="tabular-nums">{formatCurrency(totales.subtotal)}</span>
            </div>
            {totales.iva > 0 && (
              <div className="flex justify-between text-sm text-ink-500">
                <span>IVA 16%</span>
                <span className="tabular-nums">{formatCurrency(totales.iva)}</span>
              </div>
            )}
            {totales.ieps > 0 && (
              <div className="flex justify-between text-sm text-ink-500">
                <span>IEPS 8%</span>
                <span className="tabular-nums">{formatCurrency(totales.ieps)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-ink-500">
              <span>Peso total</span>
              <span className="tabular-nums">{totales.pesoTotalKg.toFixed(2)} kg</span>
            </div>
            <div className="flex justify-between items-baseline pt-2 border-t border-ink-100">
              <span className="font-serif text-lg font-medium text-ink-800">Total</span>
              <span className="font-sans text-2xl font-bold text-crimson-500 tabular-nums">
                {formatCurrency(totales.total)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        {(bajoPisoCount > 0 || requiereAutorizacion) && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              {bajoPisoCount > 0
                ? `${bajoPisoCount} producto${bajoPisoCount > 1 ? "s" : ""} bajo piso. `
                : ""}
              Este pedido requerirá tu autorización.
            </p>
          </div>
        )}

        {/* Delivery notes */}
        <div className="rounded-lg border border-ink-100 p-3">
          <div className="flex items-center gap-1.5 text-xs text-ink-400 mb-1">
            <Truck className="h-3.5 w-3.5" />
            Notas de entrega
          </div>
          <p className="text-sm text-ink-600">
            {notasEntrega || <span className="italic text-ink-400">Sin notas de entrega</span>}
          </p>
        </div>

        {/* Confirmation question */}
        <p className="text-center text-sm font-medium text-ink-500 pt-2">
          ¿Revisaste bien tu pedido?
        </p>
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-ink-100 bg-white p-3 flex gap-2">
        <Button variant="outline" onClick={onBack} className="h-12 px-4" disabled={submitting}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Regresar
        </Button>
        <Button
          onClick={onSubmit}
          disabled={submitting}
          className={cn(
            "flex-1 h-12 text-base font-bold",
            "bg-crimson-500 hover:bg-crimson-600 text-white"
          )}
        >
          {submitting ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Enviando...
            </>
          ) : requiereAutorizacion ? (
            <>
              <AlertTriangle className="h-5 w-5 mr-2" />
              Enviar para autorización
            </>
          ) : (
            <>
              <CheckCircle2 className="h-5 w-5 mr-2" />
              Enviar pedido
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
