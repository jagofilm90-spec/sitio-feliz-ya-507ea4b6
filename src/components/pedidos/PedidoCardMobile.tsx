import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Clock,
  Package,
  AlertTriangle,
  Eye,
  CheckCircle2,
  Truck,
  XCircle,
} from "lucide-react";

interface PedidoCardMobileProps {
  folio: string;
  clienteNombre: string;
  sucursalNombre?: string;
  fechaPedido: string;
  numProductos: number;
  pesoKg?: number;
  total: number;
  status: string;
  onAction: () => void;
  actionLabel?: string;
  showStatus?: boolean;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any; bgClass: string }> = {
  por_autorizar: { label: "Por autorizar", variant: "secondary", icon: Clock, bgClass: "bg-amber-50 dark:bg-amber-950/20 border-amber-200" },
  pendiente: { label: "Pendiente", variant: "default", icon: Package, bgClass: "bg-blue-50 dark:bg-blue-950/20 border-blue-200" },
  en_ruta: { label: "En ruta", variant: "outline", icon: Truck, bgClass: "bg-violet-50 dark:bg-violet-950/20 border-violet-200" },
  entregado: { label: "Entregado", variant: "default", icon: CheckCircle2, bgClass: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200" },
  cancelado: { label: "Cancelado", variant: "destructive", icon: XCircle, bgClass: "bg-rose-50 dark:bg-rose-950/20 border-rose-200" },
};

export function PedidoCardMobile({
  folio,
  clienteNombre,
  sucursalNombre,
  fechaPedido,
  numProductos,
  pesoKg,
  total,
  status,
  onAction,
  actionLabel = "Ver detalle",
  showStatus = true,
}: PedidoCardMobileProps) {
  const config = statusConfig[status] || statusConfig.pendiente;
  const StatusIcon = config.icon;
  const excedePeso = pesoKg && pesoKg > 15500;

  return (
    <Card className={`${showStatus ? config.bgClass : ""} transition-all active:scale-[0.98]`}>
      <CardContent className="p-4 space-y-3">
        {/* Header: Folio + Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusIcon className={`h-4 w-4 ${status === "por_autorizar" ? "text-amber-600" : "text-muted-foreground"}`} />
            <span className="font-mono font-bold text-base">{folio}</span>
          </div>
          {showStatus && (
            <Badge variant={config.variant} className="gap-1 text-xs">
              {config.label}
            </Badge>
          )}
        </div>

        {/* Cliente info */}
        <div className="space-y-0.5">
          <p className="font-medium text-sm leading-tight">{clienteNombre}</p>
          {sucursalNombre && (
            <p className="text-xs text-muted-foreground">{sucursalNombre}</p>
          )}
        </div>

        {/* Productos y peso */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Package className="h-3.5 w-3.5" />
            {numProductos} productos
          </span>
          {pesoKg !== undefined && pesoKg > 0 && (
            <span className={`font-mono ${excedePeso ? "text-red-600 font-semibold" : ""}`}>
              {pesoKg.toLocaleString()} kg
              {excedePeso && <AlertTriangle className="h-3 w-3 inline ml-1" />}
            </span>
          )}
        </div>

        {/* Fecha y total */}
        <div className="flex items-center justify-between pt-1 border-t border-border/50">
          <span className="text-xs text-muted-foreground">
            {format(new Date(fechaPedido), "dd MMM yyyy", { locale: es })}
          </span>
          <span className="font-mono font-bold text-lg text-primary">
            ${formatCurrency(total)}
          </span>
        </div>

        {/* Action button */}
        <Button 
          onClick={onAction} 
          className="w-full mt-1"
          variant={status === "por_autorizar" ? "default" : "outline"}
        >
          {status === "por_autorizar" ? (
            <>
              <Eye className="h-4 w-4 mr-2" />
              Revisar precios
            </>
          ) : (
            <>
              <Eye className="h-4 w-4 mr-2" />
              {actionLabel}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
