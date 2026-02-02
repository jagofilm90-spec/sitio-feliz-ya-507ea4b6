import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Eye, Package, User, Warehouse } from "lucide-react";

interface LoteCardMobileProps {
  lote: {
    id: string;
    fecha_entrada: string;
    cantidad_disponible: number;
    lote_referencia: string | null;
    fecha_caducidad: string | null;
    orden_compra_id: string | null;
    productos?: {
      codigo: string;
      nombre: string;
      unidad: string;
    };
    bodegas?: {
      nombre: string;
    };
    ordenes_compra?: {
      folio: string;
    };
    recibido_por?: {
      full_name: string;
    };
  };
  entregaId: string | null;
  onVerRecepcion: (entregaId: string) => void;
}

export const LoteCardMobile = ({ lote, entregaId, onVerRecepcion }: LoteCardMobileProps) => {
  const getCaducidadBadge = (fechaCaducidad: string | null) => {
    if (!fechaCaducidad) return null;
    
    const fecha = new Date(fechaCaducidad);
    const hoy = new Date();
    const diasRestantes = Math.ceil((fecha.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diasRestantes < 0) {
      return <Badge variant="destructive">Vencido hace {Math.abs(diasRestantes)} días</Badge>;
    } else if (diasRestantes <= 30) {
      return <Badge variant="outline" className="border-orange-500 text-orange-600">Vence en {diasRestantes} días</Badge>;
    } else {
      return <Badge variant="secondary">{fecha.toLocaleDateString('es-MX')}</Badge>;
    }
  };

  const isAgotado = lote.cantidad_disponible === 0;

  return (
    <Card className={isAgotado ? "opacity-60" : ""}>
      <CardContent className="p-3 space-y-2">
        {/* Header: Fecha y OC */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-mono">
            📅 {new Date(lote.fecha_entrada).toLocaleDateString('es-MX')}
          </span>
          {lote.ordenes_compra?.folio ? (
            <Badge variant="outline" className="text-xs">
              {lote.ordenes_compra.folio}
            </Badge>
          ) : null}
        </div>

        {/* Producto */}
        <div className="border-t pt-2">
          <p className="font-mono text-sm font-semibold">{lote.productos?.codigo}</p>
          <p className="text-sm text-muted-foreground truncate">{lote.productos?.nombre}</p>
        </div>

        {/* Detalles */}
        <div className="border-t pt-2 space-y-1.5 text-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Package className="h-3.5 w-3.5 text-muted-foreground" />
              <span className={`font-semibold ${isAgotado ? 'text-muted-foreground' : ''}`}>
                {lote.cantidad_disponible} {lote.productos?.unidad || 'uds'}
              </span>
              {isAgotado && <Badge variant="secondary" className="ml-1 text-xs">Agotado</Badge>}
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Warehouse className="h-3.5 w-3.5" />
              <span className="text-xs">{lote.bodegas?.nombre || "Sin asignar"}</span>
            </div>
          </div>

          {lote.lote_referencia && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <span className="text-xs">🏷️ Lote:</span>
              <span className="font-mono text-xs">{lote.lote_referencia}</span>
            </div>
          )}

          {lote.fecha_caducidad && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              {getCaducidadBadge(lote.fecha_caducidad)}
            </div>
          )}

          {lote.recibido_por?.full_name && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              <span className="text-xs">{lote.recibido_por.full_name}</span>
            </div>
          )}
        </div>

        {/* Acción */}
        {entregaId && (
          <div className="border-t pt-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => onVerRecepcion(entregaId)}
            >
              <Eye className="h-4 w-4 mr-1" />
              Ver recepción
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
