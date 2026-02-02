import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowDown, ArrowUp, Minus, Pencil, Trash2, User } from "lucide-react";

interface MovimientoCardMobileProps {
  movimiento: {
    id: string;
    created_at: string;
    tipo_movimiento: string;
    cantidad: number;
    stock_anterior: number | null;
    stock_nuevo: number | null;
    lote: string | null;
    fecha_caducidad: string | null;
    referencia: string | null;
    productos?: {
      codigo: string;
      nombre: string;
    };
    profiles?: {
      full_name: string;
    };
  };
  onEdit: (movimiento: any) => void;
  onDelete: (movimiento: any) => void;
}

export const MovimientoCardMobile = ({ movimiento, onEdit, onDelete }: MovimientoCardMobileProps) => {
  const getTipoMovimientoBadge = (tipo: string) => {
    const config: Record<string, { variant: "default" | "destructive" | "secondary" | "outline"; label: string }> = {
      entrada: { variant: "default", label: "Entrada" },
      salida: { variant: "destructive", label: "Salida" },
      ajuste: { variant: "secondary", label: "Ajuste" },
      consumo_interno: { variant: "outline", label: "Consumo" },
      merma: { variant: "destructive", label: "Merma" },
      transferencia: { variant: "secondary", label: "Transfer." },
    };

    const { variant, label } = config[tipo] || { variant: "default" as const, label: tipo };
    return <Badge variant={variant}>{label}</Badge>;
  };

  const getStockChangeIndicator = () => {
    if (movimiento.stock_anterior === null || movimiento.stock_nuevo === null) return null;
    
    const diferencia = movimiento.stock_nuevo - movimiento.stock_anterior;
    
    if (diferencia > 0) {
      return (
        <div className="flex items-center gap-1 text-green-600">
          <ArrowUp className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">+{diferencia}</span>
        </div>
      );
    } else if (diferencia < 0) {
      return (
        <div className="flex items-center gap-1 text-red-600">
          <ArrowDown className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">{diferencia}</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-1 text-yellow-600">
          <Minus className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">0</span>
        </div>
      );
    }
  };

  return (
    <Card>
      <CardContent className="p-3 space-y-2">
        {/* Header: Fecha y Tipo */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-mono">
            {new Date(movimiento.created_at).toLocaleDateString('es-MX')}{' '}
            {new Date(movimiento.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
          </span>
          {getTipoMovimientoBadge(movimiento.tipo_movimiento)}
        </div>

        {/* Producto */}
        <div className="border-t pt-2">
          <p className="text-sm font-medium truncate">
            {movimiento.productos?.codigo} - {movimiento.productos?.nombre}
          </p>
        </div>

        {/* Detalles de cantidad y stock */}
        <div className="border-t pt-2 grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground text-xs">Cantidad:</span>
            <p className="font-semibold">
              {movimiento.tipo_movimiento === 'entrada' ? '+' : '-'}{movimiento.cantidad}
            </p>
          </div>
          <div className="text-right">
            <span className="text-muted-foreground text-xs">Stock:</span>
            <div className="flex items-center justify-end gap-1">
              <span className="font-semibold">{movimiento.stock_nuevo ?? "—"}</span>
              {getStockChangeIndicator()}
            </div>
            {movimiento.stock_anterior !== null && (
              <span className="text-xs text-muted-foreground">(antes: {movimiento.stock_anterior})</span>
            )}
          </div>
        </div>

        {/* Info adicional */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {movimiento.lote && (
            <span>🏷️ {movimiento.lote}</span>
          )}
          {movimiento.referencia && (
            <span>📎 {movimiento.referencia}</span>
          )}
          {movimiento.fecha_caducidad && (
            <span>📅 {new Date(movimiento.fecha_caducidad).toLocaleDateString('es-MX')}</span>
          )}
        </div>

        {/* Usuario */}
        {movimiento.profiles?.full_name && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span>{movimiento.profiles.full_name}</span>
          </div>
        )}

        {/* Acciones */}
        <div className="border-t pt-2 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onEdit(movimiento)}
          >
            <Pencil className="h-3.5 w-3.5 mr-1" />
            Editar
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="flex-1"
            onClick={() => onDelete(movimiento)}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Eliminar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
