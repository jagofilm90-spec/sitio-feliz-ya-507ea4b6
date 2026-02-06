import { Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { getDisplayName } from "@/lib/productUtils";
import { Producto, LineaPedido } from "./types";

interface ProductoItemMobileProps {
  producto: Producto;
  cantidadEnCarrito: number;
  onAgregarProducto: (producto: Producto) => void;
  onActualizarCantidad: (productoId: string, cantidad: number) => void;
}

const StockBadgeMobile = ({ producto }: { producto: Producto }) => {
  const stockMinimo = producto.stock_minimo || 10;

  if (producto.stock_actual <= 0) {
    return (
      <Badge variant="destructive" className="text-xs gap-1">
        <AlertCircle className="h-3 w-3" />
        Sin stock
      </Badge>
    );
  }

  if (producto.stock_actual <= stockMinimo) {
    return (
      <Badge variant="outline" className="text-xs text-amber-600 border-amber-400 bg-amber-50 dark:bg-amber-950/30">
        Stock bajo
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="text-xs text-green-600 border-green-400 bg-green-50 dark:bg-green-950/30">
      {producto.stock_actual} disp.
    </Badge>
  );
};

export function ProductoItemMobile({
  producto,
  cantidadEnCarrito,
  onAgregarProducto,
  onActualizarCantidad,
}: ProductoItemMobileProps) {
  const enCarrito = cantidadEnCarrito > 0;

  return (
    <div
      className={`p-3 rounded-lg transition-colors ${
        enCarrito
          ? "bg-primary/10 border border-primary"
          : "border border-border"
      }`}
    >
      {/* Row 1: Name */}
      <p className="font-medium text-sm line-clamp-2 leading-snug">
        {getDisplayName(producto)}
      </p>

      {/* Row 2: Code + Stock + Price */}
      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
        <span className="text-xs text-muted-foreground">{producto.codigo}</span>
        <StockBadgeMobile producto={producto} />
        <span className="font-bold text-sm text-primary ml-auto">
          {formatCurrency(producto.precio_venta)}
        </span>
      </div>

      {/* Row 3: Quantity controls */}
      <div className="mt-2">
        {enCarrito ? (
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="outline"
              className="h-9 w-9 shrink-0"
              onClick={() => onActualizarCantidad(producto.id, cantidadEnCarrito - 1)}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-10 text-center text-base font-semibold">
              {cantidadEnCarrito}
            </span>
            <Button
              size="icon"
              variant="outline"
              className="h-9 w-9 shrink-0"
              onClick={() => onActualizarCantidad(producto.id, cantidadEnCarrito + 1)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full h-9 gap-1.5"
            onClick={() => onAgregarProducto(producto)}
          >
            <Plus className="h-4 w-4" />
            Agregar
          </Button>
        )}
      </div>
    </div>
  );
}
