import { Badge } from "@/components/ui/badge";
import { 
  calcularEstadoCredito, 
  getCreditoColorClasses,
  CREDITO_LABELS 
} from "@/lib/creditoUtils";
import { 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  CalendarClock,
  Truck,
  CreditCard
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface CreditoStatusBadgeProps {
  terminoCredito: string;
  fechaCreacion: string;
  fechaEntregaReal: string | null;
  pagado: boolean;
  showTermino?: boolean;
  className?: string;
}

export function CreditoStatusBadge({ 
  terminoCredito,
  fechaCreacion,
  fechaEntregaReal,
  pagado,
  showTermino = false,
  className = ""
}: CreditoStatusBadgeProps) {
  const estado = calcularEstadoCredito({
    terminoCredito,
    fechaCreacion: new Date(fechaCreacion),
    fechaEntregaReal: fechaEntregaReal ? new Date(fechaEntregaReal) : null,
    pagado
  });
  
  const getIcon = () => {
    switch (estado.tipo) {
      case 'pagado':
        return <CheckCircle className="h-3 w-3" />;
      case 'vencido':
        return <AlertTriangle className="h-3 w-3" />;
      case 'por_vencer':
        return <CalendarClock className="h-3 w-3" />;
      case 'no_entregado':
        return <Truck className="h-3 w-3" />;
      case 'contado':
        return <CreditCard className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const tooltipContent = () => {
    const lines: string[] = [];
    
    lines.push(`Crédito: ${CREDITO_LABELS[terminoCredito] || terminoCredito}`);
    lines.push(`Creado: ${format(new Date(fechaCreacion), "d 'de' MMMM yyyy", { locale: es })}`);
    
    if (fechaEntregaReal) {
      lines.push(`Entregado: ${format(new Date(fechaEntregaReal), "d 'de' MMMM yyyy", { locale: es })}`);
    }
    
    if (estado.fechaVencimiento) {
      lines.push(`Vencimiento: ${format(estado.fechaVencimiento, "d 'de' MMMM yyyy", { locale: es })}`);
    }
    
    return lines.join('\n');
  };
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline"
            className={`${getCreditoColorClasses(estado.color)} flex items-center gap-1 cursor-help ${className}`}
          >
            {getIcon()}
            <span>{estado.mensaje}</span>
            {showTermino && terminoCredito !== 'contado' && (
              <span className="opacity-70">
                ({CREDITO_LABELS[terminoCredito]})
              </span>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="whitespace-pre-line">
          {tooltipContent()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
