import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Package } from "lucide-react";

interface InventarioItemMobileProps {
  codigo: string;
  nombre: string;
  stockActual: number;
  stockMinimo: number;
  unidad: string;
}

export function InventarioItemMobile({
  codigo,
  nombre,
  stockActual,
  stockMinimo,
  unidad,
}: InventarioItemMobileProps) {
  const isBajo = stockActual <= stockMinimo;

  return (
    <div
      className={`p-3 rounded-lg border ${
        isBajo
          ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
          : "bg-card border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-mono text-xs text-muted-foreground">{codigo}</p>
          <p className="font-medium text-sm leading-tight truncate">{nombre}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isBajo ? (
            <AlertTriangle className="h-4 w-4 text-red-500" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          )}
          <Badge
            variant={isBajo ? "destructive" : "secondary"}
            className="font-mono tabular-nums"
          >
            {stockActual}
          </Badge>
        </div>
      </div>
      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
        <Package className="h-3 w-3" />
        <span>Mínimo: {stockMinimo} {unidad}</span>
      </div>
    </div>
  );
}
