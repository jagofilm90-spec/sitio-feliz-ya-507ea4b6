import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Loader2, History, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { HistorialPrecio } from "@/hooks/usePrecioHistorial";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

interface PrecioHistorialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productInfo: { codigo: string; nombre: string } | null;
  historial: HistorialPrecio[];
  isLoading: boolean;
}

export function PrecioHistorialDialog({
  open,
  onOpenChange,
  productInfo,
  historial,
  isLoading,
}: PrecioHistorialDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historial de Precios
          </DialogTitle>
          <DialogDescription>
            {productInfo && (
              <span className="font-medium text-foreground">
                {productInfo.codigo} - {productInfo.nombre}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : historial.length > 0 ? (
            <div className="space-y-3">
              {historial.map((registro) => {
                const diferencia = registro.precio_nuevo - registro.precio_anterior;
                const esAumento = diferencia > 0;
                const esMismo = diferencia === 0;

                return (
                  <div
                    key={registro.id}
                    className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(registro.created_at), "d 'de' MMMM yyyy, HH:mm", { locale: es })}
                        </p>
                        {registro.usuario_nombre && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Por: {registro.usuario_nombre}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <span className="text-sm text-muted-foreground font-mono">
                            {formatCurrency(registro.precio_anterior)}
                          </span>
                          <span className="text-muted-foreground">→</span>
                          <span className="font-semibold font-mono">
                            {formatCurrency(registro.precio_nuevo)}
                          </span>
                        </div>
                        <div className="mt-1">
                          {esMismo ? (
                            <Badge variant="outline" className="text-xs">
                              <Minus className="h-3 w-3 mr-1" />
                              Sin cambio
                            </Badge>
                          ) : esAumento ? (
                            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-xs">
                              <TrendingUp className="h-3 w-3 mr-1" />
                              +{formatCurrency(diferencia)}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400 text-xs">
                              <TrendingDown className="h-3 w-3 mr-1" />
                              {formatCurrency(diferencia)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>Sin cambios registrados aún</p>
              <p className="text-xs mt-1">Los cambios de precio se registrarán aquí</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
