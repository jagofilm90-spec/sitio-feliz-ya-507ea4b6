import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Clock,
  Package,
  Eye,
  CheckCircle2,
  Truck,
  XCircle,
  FileText,
} from "lucide-react";

interface PedidoCardMobileSecretariaProps {
  folio: string;
  clienteNombre: string;
  sucursalNombre?: string;
  fechaPedido: string;
  pesoKg?: number | null;
  total: number;
  status: string;
  tieneFactura: boolean;
  facturaStatus?: "timbrada" | "por_timbrar" | null;
  onVerDetalle: () => void;
}

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }
> = {
  por_autorizar: { label: "Por autorizar", variant: "secondary", icon: Clock },
  pendiente: { label: "Pendiente", variant: "default", icon: Package },
  en_ruta: { label: "En ruta", variant: "outline", icon: Truck },
  entregado: { label: "Entregado", variant: "default", icon: CheckCircle2 },
  cancelado: { label: "Cancelado", variant: "destructive", icon: XCircle },
};

export function PedidoCardMobileSecretaria({
  folio,
  clienteNombre,
  sucursalNombre,
  fechaPedido,
  pesoKg,
  total,
  status,
  tieneFactura,
  facturaStatus,
  onVerDetalle,
}: PedidoCardMobileSecretariaProps) {
  const config = statusConfig[status] || statusConfig.pendiente;
  const StatusIcon = config.icon;

  return (
    <Card className="transition-all active:scale-[0.98]">
      <CardContent className="p-4 space-y-3">
        {/* Header: Cliente + Status */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-bold text-base leading-tight truncate">{clienteNombre}</p>
            {sucursalNombre && (
              <p className="text-xs text-muted-foreground truncate">{sucursalNombre}</p>
            )}
          </div>
          <Badge variant={config.variant} className="gap-1 text-xs shrink-0">
            <StatusIcon className="h-3 w-3" />
            {config.label}
          </Badge>
        </div>

        {/* Folio */}
        <div>
          <span className="font-mono text-xs text-muted-foreground">{folio}</span>
        </div>

        {/* Info row */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {format(new Date(fechaPedido), "dd MMM", { locale: es })}
          </span>
          {pesoKg !== undefined && pesoKg !== null && pesoKg > 0 && (
            <span className="font-mono text-muted-foreground">
              {pesoKg.toLocaleString()} kg
            </span>
          )}
        </div>

        {/* Total y factura */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            {tieneFactura ? (
              <Badge
                variant="outline"
                className={`text-xs gap-1 ${
                  facturaStatus === "timbrada"
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30"
                    : ""
                }`}
              >
                <FileText className="h-3 w-3" />
                {facturaStatus === "timbrada" ? "Timbrada" : "Por timbrar"}
              </Badge>
            ) : (
              <span className="text-xs text-muted-foreground">Sin factura</span>
            )}
          </div>
          <span className="font-mono font-bold text-lg">
            ${formatCurrency(total)}
          </span>
        </div>

        {/* Action */}
        <Button variant="outline" className="w-full" onClick={onVerDetalle}>
          <Eye className="h-4 w-4 mr-2" />
          Ver detalle
        </Button>
      </CardContent>
    </Card>
  );
}
