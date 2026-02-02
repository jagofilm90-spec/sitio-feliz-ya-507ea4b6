import { Card, CardContent } from "@/components/ui/card";
import { LotesDesglose } from "@/components/productos/LotesDesglose";

interface CategoriaProductoMobileProps {
  producto: {
    id: string;
    codigo: string;
    nombre: string;
    marca: string | null;
    stock_actual: number;
    precio_compra: number;
    precio_venta: number;
    unidad: string;
  };
}

export const CategoriaProductoMobile = ({ producto }: CategoriaProductoMobileProps) => {
  const valor = producto.stock_actual * producto.precio_compra;

  return (
    <Card>
      <CardContent className="p-3 space-y-2">
        {/* Código y nombre */}
        <div>
          <p className="font-mono text-sm font-semibold">{producto.codigo}</p>
          <p className="text-sm text-muted-foreground truncate">{producto.nombre}</p>
          {producto.marca && (
            <p className="text-xs text-muted-foreground">Marca: {producto.marca}</p>
          )}
        </div>

        {/* Datos de stock y precios */}
        <div className="border-t pt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Stock:</span>
            <span className={`font-semibold ${producto.stock_actual === 0 ? 'text-destructive' : ''}`}>
              {producto.stock_actual} {producto.unidad}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Costo:</span>
            <span>${producto.precio_compra.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Precio:</span>
            <span>${producto.precio_venta.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Valor:</span>
            <span className="font-semibold text-primary">
              ${valor.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Ver lotes */}
        <div className="border-t pt-2">
          <LotesDesglose
            productoId={producto.id}
            productoNombre={producto.nombre}
            stockTotal={producto.stock_actual}
          />
        </div>
      </CardContent>
    </Card>
  );
};
