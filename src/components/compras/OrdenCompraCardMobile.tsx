import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { 
  CalendarCheck,
  CalendarX,
  CheckCircle,
  MoreVertical,
  PackageX,
  Receipt, 
  Send,
  Trash2, 
  Truck
} from "lucide-react";

interface OrdenCompra {
  id: string;
  folio: string;
  fecha_orden: string;
  total: number;
  status: string;
  status_pago: string;
  tipo_pago: string;
  proveedor_id: string | null;
  proveedor_nombre_manual?: string | null;
  proveedores?: { nombre: string } | null;
  ordenes_compra_detalles?: Array<{
    cantidad_ordenada: number;
    cantidad_recibida: number;
  }>;
  monto_pagado?: number;
}

interface EntregaOC {
  id: string;
  numero_entrega: number;
  cantidad_bultos: number;
  fecha_programada: string | null;
  status: string;
  recepcion_finalizada_en: string | null;
}

interface EntregasStatus {
  total: number;
  programadas: number;
  recibidas: number;
}

interface OrdenCompraCardMobileProps {
  orden: OrdenCompra;
  faltantesPendientes: number;
  entregas?: EntregaOC[];
  entregasStatus?: EntregasStatus;
  onOpenAcciones: (orden: OrdenCompra) => void;
  onOpenFacturas: (orden: OrdenCompra) => void;
  onReenviar: (orden: OrdenCompra) => void;
  onEliminar: (orden: OrdenCompra) => void;
  onNavigatePago?: (ordenId: string) => void;
}

const getStatusBadge = (status: string) => {
  const statusConfig: Record<string, { label: string; variant: any; className?: string }> = {
    pendiente: { label: "Pendiente", variant: "secondary" },
    pendiente_pago: { label: "💳 Pend. Pago", variant: "outline", className: "bg-amber-100 text-amber-700 border-amber-300" },
    pendiente_autorizacion: { label: "Por Autorizar", variant: "outline" },
    autorizada: { label: "Autorizada", variant: "default" },
    rechazada: { label: "Rechazada", variant: "destructive" },
    enviada: { label: "Enviada", variant: "default" },
    parcial: { label: "Recep. Parcial", variant: "secondary" },
    recibida: { label: "Recibida", variant: "default" },
    devuelta: { label: "Devuelta", variant: "destructive" },
  };
  const config = statusConfig[status] || { label: status, variant: "secondary" };
  return <Badge variant={config.variant} className={cn("text-[10px] px-1.5 py-0", config.className)}>{config.label}</Badge>;
};

const calcularPorcentajeRecepcion = (orden: OrdenCompra): number => {
  const detalles = orden.ordenes_compra_detalles || [];
  if (detalles.length === 0) return 0;
  
  const totalOrdenado = detalles.reduce((sum, d) => sum + (d.cantidad_ordenada || 0), 0);
  const totalRecibido = detalles.reduce((sum, d) => sum + (d.cantidad_recibida || 0), 0);
  
  if (totalOrdenado === 0) return 0;
  return Math.round((totalRecibido / totalOrdenado) * 100);
};

const getProgressColor = (porcentaje: number): string => {
  if (porcentaje === 0) return "bg-gray-400";
  if (porcentaje < 50) return "bg-orange-500";
  if (porcentaje < 100) return "bg-blue-500";
  return "bg-green-500";
};

// Helper to parse dates without timezone shift
const parseDateLocal = (dateStr: string): Date => {
  if (dateStr.includes('T')) {
    return new Date(dateStr);
  }
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const OrdenCompraCardMobile = ({ 
  orden, 
  faltantesPendientes,
  entregas,
  entregasStatus,
  onOpenAcciones,
  onOpenFacturas,
  onReenviar,
  onEliminar,
  onNavigatePago
}: OrdenCompraCardMobileProps) => {
  const proveedorNombre = orden.proveedor_id 
    ? orden.proveedores?.nombre 
    : orden.proveedor_nombre_manual;
    
  const porcentajeRecepcion = calcularPorcentajeRecepcion(orden);
  const progressColor = getProgressColor(porcentajeRecepcion);
  
  const esManual = !orden.proveedor_id;
  const pagoPendiente = orden.tipo_pago === 'anticipado' && orden.status_pago === 'pendiente';

  return (
    <Card className={cn(
      "border-l-4",
      orden.status === "recibida" && "border-l-green-500",
      orden.status === "enviada" && "border-l-blue-500",
      orden.status === "parcial" && "border-l-amber-500",
      orden.status === "pendiente" && "border-l-muted",
      orden.status === "rechazada" && "border-l-destructive",
      pagoPendiente && "border-l-amber-500"
    )}>
      <CardContent className="p-4 space-y-3">
        {/* Header: Folio, proveedor, estado */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-mono font-semibold text-sm">{orden.folio}</span>
              {getStatusBadge(orden.status)}
              {faltantesPendientes > 0 && (
                <Badge 
                  variant="outline" 
                  className="bg-orange-100 text-orange-700 border-orange-300 text-[10px] px-1.5 py-0"
                >
                  <PackageX className="h-3 w-3 mr-0.5" />
                  Faltante
                </Badge>
              )}
            </div>
            <p className="text-sm font-medium truncate flex items-center gap-1">
              {proveedorNombre}
              {esManual && (
                <Badge variant="outline" className="text-[10px] px-1 py-0">Manual</Badge>
              )}
            </p>
          </div>
        </div>

        {/* Info principal */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          <div className="flex justify-between">
            <span className="text-muted-foreground text-xs">Fecha:</span>
            <span className="text-xs">{format(new Date(orden.fecha_orden), "dd/MM/yyyy")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground text-xs">Total:</span>
            <span className="font-mono text-xs font-medium">{formatCurrency(orden.total)}</span>
          </div>
        </div>

        {/* Barra de progreso recepción */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Recepción:</span>
            <span className={cn(
              "font-medium",
              porcentajeRecepcion === 100 && "text-green-600",
              porcentajeRecepcion > 0 && porcentajeRecepcion < 100 && "text-blue-600"
            )}>
              {porcentajeRecepcion}%
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className={cn("h-2 rounded-full transition-all", progressColor)}
              style={{ width: `${porcentajeRecepcion}%` }}
            />
          </div>
        </div>

        {/* Estado de pago */}
        <div className="flex items-center justify-between pt-1 border-t">
          <span className="text-muted-foreground text-xs">Pago:</span>
          {pagoPendiente ? (
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-[10px] text-primary"
              onClick={() => onNavigatePago?.(orden.id)}
            >
              Ir a Pago
            </Button>
          ) : orden.status_pago === 'pagado' ? (
            <Badge className="bg-green-600 text-[10px] px-1.5 py-0">✓ Pagado</Badge>
          ) : orden.status_pago === 'parcial' ? (
            <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-[10px] px-1.5 py-0">
              🟡 Parcial {orden.monto_pagado ? `($${orden.monto_pagado.toLocaleString()})` : ""}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground text-[10px] px-1.5 py-0">
              <Truck className="h-3 w-3 mr-0.5" />
              Contra Entrega
            </Badge>
          )}
        </div>

        {/* Sección de Entregas */}
        {entregas && entregas.length > 0 && (
          <div className="pt-2 border-t space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs flex items-center gap-1">
                <Truck className="h-3 w-3" />
                Entregas:
              </span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {entregasStatus?.recibidas || 0}/{entregasStatus?.total || entregas.length}
              </Badge>
            </div>
            
            {/* Lista compacta de entregas */}
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {entregas.map((entrega) => (
                <div 
                  key={entrega.id}
                  className="flex items-center justify-between text-xs p-1.5 rounded bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    {/* Icono de status */}
                    {entrega.status === "recibida" || entrega.recepcion_finalizada_en ? (
                      <CheckCircle className="h-3 w-3 text-green-600" />
                    ) : entrega.fecha_programada ? (
                      <CalendarCheck className="h-3 w-3 text-amber-500" />
                    ) : (
                      <CalendarX className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span>#{entrega.numero_entrega}</span>
                    <span className="text-muted-foreground">
                      {entrega.cantidad_bultos} bultos
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {entrega.fecha_programada ? (
                      <span className={cn(
                        "font-medium",
                        (entrega.status === "recibida" || entrega.recepcion_finalizada_en) && "text-green-600",
                        entrega.status !== "recibida" && !entrega.recepcion_finalizada_en && "text-amber-600"
                      )}>
                        {format(parseDateLocal(entrega.fecha_programada), "dd/MM")}
                      </span>
                    ) : (
                      <span className="text-muted-foreground italic">Sin fecha</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Acciones */}
        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 text-xs"
            onClick={() => onOpenAcciones(orden)}
          >
            <MoreVertical className="h-3.5 w-3.5 mr-1" />
            Acciones
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onOpenFacturas(orden)}
          >
            <Receipt className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onReenviar(orden)}
          >
            <Send className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => onEliminar(orden)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
