import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { 
  CheckCircle2,
  Clock,
  Eye, 
  FileCheck,
  FileText, 
  Link2,
  Printer, 
  Receipt
} from "lucide-react";

interface PedidoConCotizacion {
  id: string;
  folio: string;
  fecha_pedido: string;
  total: number;
  peso_total_kg: number | null;
  status: string;
  termino_credito: string | null;
  requiere_factura: boolean;
  facturado: boolean;
  factura_enviada_al_cliente: boolean;
  clientes: { id: string; nombre: string; email: string | null; rfc: string | null; razon_social: string | null } | null;
  profiles: { full_name: string } | null;
  cotizacion_origen?: { id: string; folio: string } | null;
  sucursal?: { nombre: string; email_facturacion: string | null; codigo_sucursal: string | null; rfc: string | null; razon_social: string | null } | null;
}

interface PedidoHistorialCardMobileProps {
  pedido: PedidoConCotizacion;
  isSelected: boolean;
  onSelect: (pedidoId: string, checked: boolean) => void;
  onViewDetalle: (pedidoId: string) => void;
  onPrintRemision: (pedidoId: string) => void;
  onGenerarFactura: (pedido: PedidoConCotizacion) => void;
  onFacturarEnviar: (pedido: PedidoConCotizacion) => void;
  onViewCotizacion?: (cotizacionId: string) => void;
}

const getStatusBadge = (status: string) => {
  const variants: Record<string, any> = {
    por_autorizar: "outline",
    pendiente: "secondary",
    en_ruta: "default",
    entregado: "default",
    cancelado: "destructive",
  };

  const labels: Record<string, string> = {
    por_autorizar: "Por Autorizar",
    pendiente: "Pendiente",
    en_ruta: "En Ruta",
    entregado: "Entregado",
    cancelado: "Cancelado",
  };

  return (
    <Badge 
      variant={variants[status] || "default"} 
      className={cn(
        "text-[10px] px-1.5 py-0",
        status === "por_autorizar" && "border-amber-500 text-amber-600"
      )}
    >
      {labels[status] || status}
    </Badge>
  );
};

const getFacturaBadge = (pedido: PedidoConCotizacion) => {
  if (pedido.factura_enviada_al_cliente) {
    return (
      <Badge variant="default" className="gap-0.5 bg-green-600 text-[10px] px-1.5 py-0">
        <CheckCircle2 className="h-3 w-3" />
        Enviada
      </Badge>
    );
  }
  if (pedido.facturado) {
    return (
      <Badge variant="secondary" className="gap-0.5 text-[10px] px-1.5 py-0">
        <Clock className="h-3 w-3" />
        Por enviar
      </Badge>
    );
  }
  if (pedido.requiere_factura) {
    return (
      <Badge variant="outline" className="gap-0.5 text-[10px] px-1.5 py-0">
        <FileText className="h-3 w-3" />
        Pendiente
      </Badge>
    );
  }
  return (
    <span className="text-muted-foreground text-[10px]">Remisión</span>
  );
};

export const PedidoHistorialCardMobile = ({ 
  pedido, 
  isSelected,
  onSelect,
  onViewDetalle,
  onPrintRemision,
  onGenerarFactura,
  onFacturarEnviar,
  onViewCotizacion
}: PedidoHistorialCardMobileProps) => {
  return (
    <Card className={cn(
      "border-l-4",
      pedido.status === "entregado" && "border-l-green-500",
      pedido.status === "en_ruta" && "border-l-blue-500",
      pedido.status === "pendiente" && "border-l-amber-500",
      pedido.status === "por_autorizar" && "border-l-orange-500",
      pedido.status === "cancelado" && "border-l-destructive"
    )}>
      <CardContent className="p-4 space-y-3">
        {/* Header con checkbox, folio y status */}
        <div className="flex items-start gap-3">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelect(pedido.id, !!checked)}
            className="mt-1"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono font-semibold text-sm">{pedido.folio}</span>
              {getStatusBadge(pedido.status)}
            </div>
            <p className="text-sm font-medium truncate">{pedido.clientes?.nombre || "—"}</p>
            {pedido.sucursal?.nombre && (
              <p className="text-xs text-muted-foreground truncate">{pedido.sucursal.nombre}</p>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground text-xs">Fecha:</span>
            <span className="text-xs">{new Date(pedido.fecha_pedido).toLocaleDateString("es-MX")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground text-xs">Total:</span>
            <span className="font-mono text-xs font-medium">{formatCurrency(pedido.total)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground text-xs">Peso:</span>
            <span className="text-xs">
              {pedido.peso_total_kg ? `${Math.round(pedido.peso_total_kg).toLocaleString()} kg` : "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground text-xs">Vendedor:</span>
            <span className="text-xs truncate max-w-[100px]">{pedido.profiles?.full_name || "—"}</span>
          </div>
        </div>

        {/* Factura y Origen */}
        <div className="flex items-center justify-between pt-1 border-t">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">Factura:</span>
            {getFacturaBadge(pedido)}
          </div>
          
          {pedido.cotizacion_origen ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 text-primary hover:text-primary/80 p-1"
              onClick={() => onViewCotizacion?.(pedido.cotizacion_origen!.id)}
            >
              <Link2 className="h-3 w-3" />
              <span className="font-mono text-[10px]">{pedido.cotizacion_origen.folio}</span>
            </Button>
          ) : (
            <span className="text-muted-foreground text-[10px]">Directo</span>
          )}
        </div>

        {/* Acciones */}
        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 text-xs"
            onClick={() => onViewDetalle(pedido.id)}
          >
            <Eye className="h-3.5 w-3.5 mr-1" />
            Ver
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 text-xs"
            onClick={() => onPrintRemision(pedido.id)}
          >
            <Printer className="h-3.5 w-3.5 mr-1" />
            Remisión
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs text-blue-600 hover:text-blue-700"
            onClick={() => onGenerarFactura(pedido)}
          >
            <FileCheck className="h-3.5 w-3.5" />
          </Button>
          {pedido.requiere_factura && !pedido.factura_enviada_al_cliente && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs text-green-600 hover:text-green-700"
              onClick={() => onFacturarEnviar(pedido)}
            >
              <Receipt className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
