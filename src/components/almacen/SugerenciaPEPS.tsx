import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { AlertTriangle, Calendar, Package2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Lote {
  id: string;
  lote_referencia: string | null;
  cantidad_disponible: number;
  fecha_caducidad: string | null;
  fecha_entrada: string;
  precio_compra: number;
}

interface SugerenciaPEPSProps {
  lote: Lote;
}

export const SugerenciaPEPS = ({ lote }: SugerenciaPEPSProps) => {
  const diasParaCaducidad = lote.fecha_caducidad 
    ? differenceInDays(new Date(lote.fecha_caducidad), new Date())
    : null;

  const getEstadoCaducidad = () => {
    if (diasParaCaducidad === null) return null;
    if (diasParaCaducidad < 0) return { label: "Vencido", variant: "destructive" as const };
    if (diasParaCaducidad <= 30) return { label: `${diasParaCaducidad}d`, variant: "destructive" as const };
    if (diasParaCaducidad <= 60) return { label: `${diasParaCaducidad}d`, variant: "secondary" as const };
    return null;
  };

  const estadoCaducidad = getEstadoCaducidad();

  return (
    <div className="flex items-center gap-2 mt-1 flex-wrap">
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="text-xs cursor-help flex items-center gap-1">
            <Package2 className="h-3 w-3" />
            PEPS: {lote.lote_referencia || "Sin ref."}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1 text-xs">
            <p><strong>Lote sugerido (PEPS)</strong></p>
            <p>Disponible: {lote.cantidad_disponible} unidades</p>
            <p>Entrada: {format(new Date(lote.fecha_entrada), "d MMM yyyy", { locale: es })}</p>
            {lote.fecha_caducidad && (
              <p>Caducidad: {format(new Date(lote.fecha_caducidad), "d MMM yyyy", { locale: es })}</p>
            )}
            <p>Costo: ${lote.precio_compra.toFixed(2)}</p>
          </div>
        </TooltipContent>
      </Tooltip>

      {estadoCaducidad && (
        <Badge variant={estadoCaducidad.variant} className="text-xs flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          {estadoCaducidad.label}
        </Badge>
      )}

      {lote.fecha_caducidad && !estadoCaducidad && (
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {format(new Date(lote.fecha_caducidad), "d MMM yy", { locale: es })}
        </span>
      )}
    </div>
  );
};
