import { Trash2, Percent, AlertTriangle, Send, Clock, Plus, Minus, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { formatCurrency } from "@/lib/utils";
import { LineaPedido } from "./types";
import { cn } from "@/lib/utils";

interface CarritoPanelProps {
  lineas: LineaPedido[];
  totales: { total: number; pesoTotalKg: number; totalUnidades: number };
  onActualizarCantidad: (productoId: string, cantidad: number) => void;
  onActualizarDescuento: (productoId: string, descuento: number) => void;
  onSolicitarAutorizacion: (linea: LineaPedido) => void;
  onMarcarParaRevision: (productoId: string) => void;
  compact?: boolean;
}

export function CarritoPanel({
  lineas,
  totales,
  onActualizarCantidad,
  onActualizarDescuento,
  onSolicitarAutorizacion,
  onMarcarParaRevision,
  compact = false,
}: CarritoPanelProps) {
  if (lineas.length === 0) {
    return (
      <Card className="h-full">
        <CardContent className="flex flex-col items-center justify-center h-full py-12 text-center">
          <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">
            Agrega productos para comenzar
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("h-full flex flex-col", compact && "border-0 shadow-none")}>
      {!compact && (
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Carrito</span>
            <Badge variant="secondary">{lineas.length} productos</Badge>
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={cn("flex-1 overflow-auto space-y-3", compact && "px-0")}>
        {lineas.map((linea) => {
          const descuentoMaximo = linea.producto.descuento_maximo || 0;
          const excedeLimite = linea.descuento > descuentoMaximo;
          const tieneDescuento = linea.descuento > 0;
          const esPorKilo = linea.producto.precio_por_kilo;
          const presentacionKg = linea.producto.peso_kg || 0;
          const kilosTotales = esPorKilo && presentacionKg > 0 ? linea.cantidad * presentacionKg : 0;

          // Determine discount status for color coding
          let statusColor = "border-border";
          let statusBg = "bg-muted/30";
          if (linea.autorizacionStatus === 'aprobado') {
            statusColor = "border-green-300 dark:border-green-700";
            statusBg = "bg-green-50 dark:bg-green-950/30";
          } else if (excedeLimite && linea.autorizacionStatus === 'pendiente') {
            statusColor = "border-amber-300 dark:border-amber-700";
            statusBg = "bg-amber-50 dark:bg-amber-950/30";
          } else if (excedeLimite) {
            statusColor = "border-red-300 dark:border-red-700";
            statusBg = "bg-red-50 dark:bg-red-950/30";
          }

          return (
            <div 
              key={linea.producto.id} 
              className={cn("p-3 rounded-lg border", statusColor, statusBg)}
            >
              {/* Header: Name + Delete */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {linea.producto.nombre}
                  </p>
                  <p className="text-xs text-muted-foreground">{linea.producto.codigo}</p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => onActualizarCantidad(linea.producto.id, 0)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Quantity Controls */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-7 w-7"
                    onClick={() => onActualizarCantidad(linea.producto.id, linea.cantidad - 1)}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <Input
                    className="w-12 h-7 text-center text-sm"
                    value={linea.cantidad}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      onActualizarCantidad(linea.producto.id, val);
                    }}
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-7 w-7"
                    onClick={() => onActualizarCantidad(linea.producto.id, linea.cantidad + 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <span className="font-bold text-sm">{formatCurrency(linea.subtotal)}</span>
              </div>

              {/* Kilos info for precio_por_kilo */}
              {esPorKilo && presentacionKg > 0 && (
                <div className="text-xs text-muted-foreground mb-2 bg-blue-50 dark:bg-blue-950/30 p-1.5 rounded">
                  {linea.cantidad} × {presentacionKg}kg = <span className="font-medium text-blue-700 dark:text-blue-400">{kilosTotales}kg</span>
                </div>
              )}

              {/* Discount Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Percent className="h-3 w-3" />
                    Descuento
                  </Label>
                  <span className={cn(
                    "font-medium",
                    tieneDescuento && !excedeLimite && "text-green-600",
                    excedeLimite && "text-red-600"
                  )}>
                    {formatCurrency(linea.descuento)}
                    {descuentoMaximo > 0 && (
                      <span className="text-muted-foreground font-normal"> / {formatCurrency(descuentoMaximo)}</span>
                    )}
                  </span>
                </div>
                <Slider
                  value={[linea.descuento]}
                  max={Math.max(descuentoMaximo * 2, linea.precioLista * 0.5)}
                  step={1}
                  onValueChange={([value]) => onActualizarDescuento(linea.producto.id, value)}
                  className="w-full"
                />
                {/* Price display */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {esPorKilo ? "Precio/kg" : "Precio/pza"}
                  </span>
                  <div>
                    {tieneDescuento && (
                      <span className="line-through text-muted-foreground mr-1">
                        {formatCurrency(linea.precioLista)}
                      </span>
                    )}
                    <span className={tieneDescuento ? "text-green-600 font-medium" : ""}>
                      {formatCurrency(linea.precioUnitario)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Authorization Warning */}
              {excedeLimite && linea.autorizacionStatus !== 'aprobado' && (
                <div className="mt-2 pt-2 border-t space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      Descuento excede límite ({formatCurrency(descuentoMaximo)})
                    </p>
                  </div>
                  {linea.autorizacionStatus === 'pendiente' ? (
                    <Badge variant="outline" className="text-xs gap-1 text-amber-600 border-amber-400">
                      <Clock className="h-3 w-3" />
                      Pendiente revisión
                    </Badge>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs flex-1"
                        onClick={() => onSolicitarAutorizacion(linea)}
                      >
                        <Send className="h-3 w-3 mr-1" />
                        Solicitar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => onMarcarParaRevision(linea.producto.id)}
                      >
                        Revisar después
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Approved badge */}
              {linea.autorizacionStatus === 'aprobado' && (
                <Badge variant="outline" className="text-xs mt-2 gap-1 text-green-600 border-green-400 bg-green-50 dark:bg-green-950/30">
                  ✓ Descuento aprobado
                </Badge>
              )}
            </div>
          );
        })}
      </CardContent>

      {/* Summary Footer */}
      <div className={cn("border-t p-3 bg-muted/30 space-y-1", compact && "px-0")}>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{totales.totalUnidades} unidades</span>
          <span className="text-muted-foreground">{totales.pesoTotalKg.toLocaleString()} kg</span>
        </div>
        <div className="flex justify-between font-bold text-lg">
          <span>Total</span>
          <span className="text-primary">{formatCurrency(totales.total)}</span>
        </div>
      </div>
    </Card>
  );
}
