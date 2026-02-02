import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Package, DollarSign } from "lucide-react";

interface ProductoRentabilidad {
  id: string;
  codigo: string;
  nombre: string;
  marca: string | null;
  precio_compra: number;
  precio_venta: number;
  margen_pesos: number;
  margen_porcentaje: number;
  stock_actual: number;
  valor_inventario: number;
}

interface RentabilidadCardMobileProps {
  producto: ProductoRentabilidad;
}

export function RentabilidadCardMobile({ producto }: RentabilidadCardMobileProps) {
  
  const getMargenBadge = (porcentaje: number) => {
    if (porcentaje < 10) {
      return (
        <Badge variant="destructive" className="gap-1">
          <TrendingDown className="h-3 w-3" />
          Bajo ({porcentaje.toFixed(1)}%)
        </Badge>
      );
    } else if (porcentaje < 30) {
      return (
        <Badge variant="secondary" className="gap-1">
          Medio ({porcentaje.toFixed(1)}%)
        </Badge>
      );
    } else {
      return (
        <Badge className="gap-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          <TrendingUp className="h-3 w-3" />
          Alto ({porcentaje.toFixed(1)}%)
        </Badge>
      );
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-sm leading-tight">{producto.codigo}</p>
            {getMargenBadge(producto.margen_porcentaje)}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">{producto.nombre}</p>
          {producto.marca && (
            <p className="text-xs text-muted-foreground">Marca: {producto.marca}</p>
          )}
        </div>

        {/* Precios */}
        <div className="flex items-center gap-3 text-sm bg-muted/50 rounded-lg p-2">
          <div className="flex-1 text-center">
            <p className="text-xs text-muted-foreground">Compra</p>
            <p className="font-medium">${producto.precio_compra.toFixed(2)}</p>
          </div>
          <div className="text-muted-foreground">→</div>
          <div className="flex-1 text-center">
            <p className="text-xs text-muted-foreground">Venta</p>
            <p className="font-medium">${producto.precio_venta.toFixed(2)}</p>
          </div>
        </div>

        {/* Margen */}
        <div className="flex items-center justify-center gap-2 text-sm">
          <DollarSign className="h-4 w-4 text-green-600" />
          <span className="font-semibold text-green-600">
            +${producto.margen_pesos.toFixed(2)} de margen
          </span>
        </div>

        {/* Stock y Valor */}
        <div className="flex items-center justify-between text-sm border-t pt-2">
          <div className="flex items-center gap-1">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span>Stock: {producto.stock_actual}</span>
          </div>
          <span className="text-muted-foreground">
            Valor: ${producto.valor_inventario.toLocaleString()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
