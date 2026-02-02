import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";
import { format, isBefore } from "date-fns";
import { es } from "date-fns/locale";
import { 
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  Eye,
  FileText,
  Loader2,
  MoreVertical,
  Printer,
  RefreshCw,
  Send
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Cotizacion {
  id: string;
  folio: string;
  nombre: string | null;
  cliente_id: string;
  cliente: { nombre: string; codigo: string };
  sucursal: { nombre: string } | null;
  fecha_creacion: string;
  fecha_vigencia: string;
  status: string;
  total: number;
  notas?: string;
  tipo_cotizacion?: string;
  mes_vigencia?: string;
}

interface CotizacionCardMobileProps {
  cotizacion: Cotizacion;
  isAdmin: boolean;
  isSelected: boolean;
  sendingToAuth: string | null;
  onSelect: (id: string, selected: boolean) => void;
  onView: (id: string) => void;
  onEnviar: (cotizacion: Cotizacion) => void;
  onAutorizar: (cotizacion: Cotizacion) => void;
  onAutorizarDirecto: (cotizacion: Cotizacion) => void;
  onEnviarAAutorizacion: (cotizacion: Cotizacion) => void;
  onImprimir: (id: string) => void;
  onEditar: (id: string) => void;
  onEliminar: (cotizacion: Cotizacion) => void;
}

const getTipoBadge = (tipo: string | undefined) => {
  if (!tipo || tipo === 'general') return null;
  const badges: Record<string, { icon: string; label: string; className: string }> = {
    avio: { icon: '🍞', label: 'Avío', className: 'bg-yellow-500/20 text-yellow-700' },
    azucar: { icon: '🍬', label: 'Azúcar', className: 'bg-blue-500/20 text-blue-700' },
    rosticeria: { icon: '🍗', label: 'Rosticería', className: 'bg-orange-500/20 text-orange-700' },
  };
  const badge = badges[tipo];
  if (!badge) return null;
  return (
    <Badge className={cn("text-[10px]", badge.className)}>
      {badge.icon} {badge.label}
    </Badge>
  );
};

const getStatusBadge = (status: string, fechaVigencia: string) => {
  const hoy = new Date();
  const vigencia = new Date(fechaVigencia);

  if (status === "aceptada") {
    return <Badge className="bg-green-500/20 text-green-700 text-[10px]">Aceptada</Badge>;
  }
  if (status === "rechazada") {
    return <Badge variant="destructive" className="text-[10px]">Rechazada</Badge>;
  }
  if (status === "pendiente_autorizacion") {
    return (
      <Badge className="bg-amber-500/20 text-amber-700 flex items-center gap-1 text-[10px]">
        <Clock className="h-3 w-3" />
        Pend. autorización
      </Badge>
    );
  }
  if (status === "autorizada") {
    return (
      <Badge className="bg-green-500/20 text-green-700 flex items-center gap-1 text-[10px]">
        <CheckCircle className="h-3 w-3" />
        Autorizada
      </Badge>
    );
  }
  if (status === "enviada" && isBefore(vigencia, hoy)) {
    return <Badge className="bg-red-500/20 text-red-700 text-[10px]">Vencida</Badge>;
  }
  if (status === "enviada") {
    return <Badge className="bg-blue-500/20 text-blue-700 text-[10px]">Enviada</Badge>;
  }
  return <Badge variant="secondary" className="text-[10px]">Borrador</Badge>;
};

export const CotizacionCardMobile = ({
  cotizacion,
  isAdmin,
  isSelected,
  sendingToAuth,
  onView,
  onEnviar,
  onAutorizar,
  onAutorizarDirecto,
  onEnviarAAutorizacion,
  onImprimir,
  onEditar,
  onEliminar,
}: CotizacionCardMobileProps) => {
  const isPending = sendingToAuth === cotizacion.id;
  const tipoBadge = getTipoBadge(cotizacion.tipo_cotizacion);
  const statusBadge = getStatusBadge(cotizacion.status, cotizacion.fecha_vigencia);
  const isSoloPrecios = cotizacion.total === 0 || cotizacion.notas?.includes('[Solo precios]');

  return (
    <Card className={cn(
      "border-l-4",
      cotizacion.status === "borrador" && "border-l-muted-foreground",
      cotizacion.status === "pendiente_autorizacion" && "border-l-amber-500",
      cotizacion.status === "autorizada" && "border-l-green-500",
      cotizacion.status === "enviada" && "border-l-blue-500",
      cotizacion.status === "aceptada" && "border-l-green-600",
      cotizacion.status === "rechazada" && "border-l-destructive",
      isSelected && "ring-2 ring-primary"
    )}>
      <CardContent className="p-4 space-y-3">
        {/* Header: Folio y badges */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-semibold text-sm">{cotizacion.folio}</span>
              {tipoBadge}
            </div>
            {cotizacion.nombre && (
              <p className="text-sm font-medium text-primary truncate">{cotizacion.nombre}</p>
            )}
          </div>
          {statusBadge}
        </div>

        {/* Cliente y sucursal */}
        <div className="flex items-center gap-2 text-sm">
          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="truncate">
            <span className="font-medium">{cotizacion.cliente.nombre}</span>
            {cotizacion.sucursal && (
              <span className="text-muted-foreground"> - {cotizacion.sucursal.nombre}</span>
            )}
          </div>
        </div>

        {/* Info: Total y vigencia */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-muted-foreground text-xs">Total:</span>
              <p className={cn("font-mono font-semibold", isSoloPrecios && "text-muted-foreground text-xs")}>
                {isSoloPrecios ? "Solo precios" : `$${formatCurrency(cotizacion.total)}`}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span className="text-xs">Vigencia:</span>
            </div>
            <p className="text-xs font-medium">
              {format(new Date(cotizacion.fecha_vigencia), "dd/MMM/yyyy", { locale: es })}
            </p>
          </div>
        </div>

        {/* Mes vigencia para cotizaciones mensuales */}
        {cotizacion.mes_vigencia && (
          <div className="text-xs text-muted-foreground">
            Mes: {format(new Date(cotizacion.mes_vigencia + "-01"), "MMMM yyyy", { locale: es })}
          </div>
        )}

        {/* Acciones */}
        <div className="flex gap-2 pt-2 border-t">
          {/* Acción principal según estado */}
          {cotizacion.status === "autorizada" && (
            <Button 
              size="sm" 
              onClick={() => onEnviar(cotizacion)}
              className="flex-1 h-8 text-xs gap-1"
            >
              <Send className="h-3.5 w-3.5" />
              Enviar
            </Button>
          )}
          {cotizacion.status === "enviada" && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onEnviar(cotizacion)}
              className="flex-1 h-8 text-xs gap-1"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reenviar
            </Button>
          )}
          {isAdmin && cotizacion.status === "pendiente_autorizacion" && (
            <Button 
              size="sm" 
              variant="secondary"
              onClick={() => onAutorizar(cotizacion)}
              className="flex-1 h-8 text-xs gap-1"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Autorizar
            </Button>
          )}
          {cotizacion.status === "borrador" && isAdmin && (
            <Button 
              size="sm" 
              variant="secondary"
              onClick={() => onAutorizarDirecto(cotizacion)}
              className="flex-1 h-8 text-xs gap-1"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Autorizar
            </Button>
          )}
          {cotizacion.status === "borrador" && !isAdmin && (
            <Button 
              size="sm" 
              variant="secondary"
              onClick={() => onEnviarAAutorizacion(cotizacion)}
              disabled={isPending}
              className="flex-1 h-8 text-xs gap-1"
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              Enviar a autorizar
            </Button>
          )}

          {/* Botón ver detalles */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1"
            onClick={() => onView(cotizacion.id)}
          >
            <Eye className="h-3.5 w-3.5" />
            Ver
          </Button>

          {/* Menú de más acciones */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" disabled={isPending}>
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MoreVertical className="h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onImprimir(cotizacion.id)}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimir PDF
              </DropdownMenuItem>
              {(cotizacion.status === "borrador" || cotizacion.status === "autorizada") && (
                <DropdownMenuItem onClick={() => onEditar(cotizacion.id)}>
                  <FileText className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onEliminar(cotizacion)}
                className="text-destructive focus:text-destructive"
              >
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
};
