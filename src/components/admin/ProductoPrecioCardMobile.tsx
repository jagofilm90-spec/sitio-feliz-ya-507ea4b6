import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDisplayName } from "@/lib/productUtils";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  History,
  Pencil,
  TrendingDown,
  XCircle
} from "lucide-react";

interface ProductoConAnalisis {
  id: string;
  codigo: string;
  nombre: string;
  especificaciones: string | null;
  marca: string | null;
  categoria: string | null;
  peso_kg: number | null;
  contenido_empaque: string | null;
  unidad: string;
  precio_venta: number;
  precio_por_kilo: boolean;
  descuento_maximo: number | null;
  aplica_iva: boolean | null;
  aplica_ieps: boolean | null;
  es_promocion: boolean | null;
  descripcion_promocion: string | null;
  bloqueado_venta: boolean | null;
  analisis: {
    costo_referencia: number;
    precio_venta: number;
    piso_minimo: number;
    margen_bruto: number;
    margen_porcentaje: number;
    espacio_negociacion: number;
    estado_margen: 'perdida' | 'critico' | 'bajo' | 'saludable';
    puede_dar_descuento_maximo: boolean;
  };
}

interface ProductoPrecioCardMobileProps {
  producto: ProductoConAnalisis;
  onSimular: (producto: ProductoConAnalisis) => void;
  onEditar: (producto: ProductoConAnalisis) => void;
  onHistorial?: (producto: ProductoConAnalisis) => void;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount);
};

const getEstadoBadge = (estado: 'perdida' | 'critico' | 'bajo' | 'saludable') => {
  switch (estado) {
    case 'perdida':
      return (
        <Badge variant="destructive" className="text-[10px] px-2 py-0.5 flex items-center gap-1 font-bold animate-pulse">
          <XCircle className="h-3.5 w-3.5" />
          PÉRDIDA
        </Badge>
      );
    case 'critico':
      return (
        <Badge className="text-[10px] px-1.5 py-0 bg-orange-500 hover:bg-orange-600 flex items-center gap-0.5">
          <AlertTriangle className="h-3 w-3" />
          Crítico
        </Badge>
      );
    case 'bajo':
      return (
        <Badge className="text-[10px] px-1.5 py-0 bg-amber-500 hover:bg-amber-600 flex items-center gap-0.5">
          <TrendingDown className="h-3 w-3" />
          Bajo
        </Badge>
      );
    case 'saludable':
      return (
        <Badge className="text-[10px] px-1.5 py-0 bg-green-600 hover:bg-green-700 flex items-center gap-0.5">
          <CheckCircle2 className="h-3 w-3" />
          OK
        </Badge>
      );
  }
};

export const ProductoPrecioCardMobile = ({
  producto,
  onSimular,
  onEditar,
  onHistorial
}: ProductoPrecioCardMobileProps) => {
  const { analisis } = producto;
  
  const cardClass = cn(
    "border-l-4",
    analisis.estado_margen === 'perdida' && "border-l-red-500 bg-red-100/80 ring-1 ring-red-300",
    analisis.estado_margen === 'critico' && "border-l-orange-500 bg-orange-100/60",
    analisis.estado_margen === 'bajo' && "border-l-amber-500 bg-amber-50/30",
    analisis.estado_margen === 'saludable' && "border-l-green-500"
  );

  return (
    <Card className={cardClass}>
      <CardContent className="p-3 space-y-2">
        {/* Header: Estado + Nombre */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {getEstadoBadge(analisis.estado_margen)}
              <span className="text-[10px] text-muted-foreground font-mono">
                {producto.codigo}
              </span>
            </div>
            <h3 className="font-medium text-sm leading-tight">
              {getDisplayName({
                nombre: producto.nombre,
                marca: producto.marca,
                especificaciones: producto.especificaciones,
                unidad: producto.unidad,
                contenido_empaque: producto.contenido_empaque,
                peso_kg: producto.peso_kg,
              })}
            </h3>
          </div>
        </div>

        {/* Métricas principales */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground text-xs">Costo:</span>
            <span className="font-medium text-xs">
              {analisis.costo_referencia > 0 ? formatCurrency(analisis.costo_referencia) : "-"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground text-xs">Precio:</span>
            <span className="font-semibold text-xs">{formatCurrency(producto.precio_venta)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground text-xs">Margen:</span>
            <span className={cn(
              "font-medium text-xs",
              analisis.margen_porcentaje < 0 && "text-red-600",
              analisis.margen_porcentaje >= 0 && analisis.margen_porcentaje < 5 && "text-orange-600",
              analisis.margen_porcentaje >= 5 && analisis.margen_porcentaje < 10 && "text-amber-600",
              analisis.margen_porcentaje >= 10 && "text-green-600"
            )}>
              {analisis.costo_referencia > 0 ? `${analisis.margen_porcentaje}%` : "-"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground text-xs">Piso:</span>
            <span className="text-xs text-muted-foreground">
              {formatCurrency(analisis.piso_minimo)}
            </span>
          </div>
        </div>

        {/* Espacio de negociación (si hay) */}
        {analisis.costo_referencia > 0 && (
          <div className="flex items-center justify-between pt-1 border-t">
            <span className="text-xs text-muted-foreground">Espacio negociación:</span>
            <span className={cn(
              "text-xs font-medium",
              analisis.espacio_negociacion < 0 && "text-red-600",
              analisis.espacio_negociacion >= 0 && "text-green-600"
            )}>
              {formatCurrency(analisis.espacio_negociacion)}
            </span>
          </div>
        )}

        {/* Acciones */}
        <div className="flex gap-2 pt-1">
          <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => onSimular(producto)}>
            <Calculator className="h-3.5 w-3.5 mr-1" /> Simular
          </Button>
          <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => onEditar(producto)}>
            <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
          </Button>
          {onHistorial && (
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => onHistorial(producto)}>
              <History className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
