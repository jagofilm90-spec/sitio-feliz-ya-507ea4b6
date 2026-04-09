import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Power, RotateCcw } from "lucide-react";

interface ProductoCardMobileProps {
  producto: any;
  onEdit: (producto: any) => void;
  onDeactivate: (producto: any) => void;
  onReactivate?: (producto: any) => void;
  isInactive?: boolean;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(value);

const ProductoCardMobile = ({
  producto,
  onEdit,
  onDeactivate,
  onReactivate,
  isInactive = false,
}: ProductoCardMobileProps) => {
  const stock = producto.stock_actual ?? 0;
  const stockMin = producto.stock_minimo || 0;
  const stockBajo = stock > 0 && stock <= stockMin;
  const sinStock = stock <= 0;
  const details = [producto.marca, producto.especificaciones].filter(Boolean).join(' · ');

  return (
    <div className={`border rounded-lg p-3 space-y-2 bg-card ${isInactive ? "opacity-60" : ""}`}>
      {/* Line 1: Code + Name */}
      <div className="flex items-start gap-2">
        <Badge variant="secondary" className="text-xs shrink-0 font-mono">{producto.codigo}</Badge>
        <div className="min-w-0 flex-1">
          <span className="font-semibold text-sm">{producto.nombre}</span>
          {details && <p className="text-xs text-muted-foreground truncate">{details}</p>}
        </div>
      </div>

      {/* Line 2: Unit · Type */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="capitalize">{producto.unidad}</span>
        <span>·</span>
        {producto.precio_por_kilo ? (
          <Badge className="text-[10px] px-1.5 py-0 h-4 bg-blue-100 text-blue-700 border-blue-200">Por kilo</Badge>
        ) : (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">Por unidad</Badge>
        )}
      </div>

      {/* Line 3: Price */}
      <div className="text-sm">
        {producto.precio_por_kilo ? (
          <div>
            <span className="font-semibold">{formatCurrency(producto.precio_venta || 0)}/kg</span>
            {producto.peso_kg > 0 && (
              <span className="text-muted-foreground text-xs ml-1.5">
                = {formatCurrency((producto.precio_venta || 0) * producto.peso_kg)}/{producto.unidad}
              </span>
            )}
          </div>
        ) : (
          <span className="font-semibold">{formatCurrency(producto.precio_venta || 0)}</span>
        )}
      </div>

      {/* Line 4: Stock */}
      <div className="flex items-center gap-3 text-xs">
        <span className={`font-medium ${sinStock ? "text-destructive" : stockBajo ? "text-amber-600" : "text-green-600"}`}>
          Stock: {stock} {sinStock ? "" : "✅"}
        </span>
        <span className="text-muted-foreground">Mín: {stockMin}</span>
        {sinStock && <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">Sin stock</Badge>}
      </div>

      {/* Line 5: Badges */}
      <div className="flex items-center gap-1 flex-wrap">
        {producto.aplica_iva && (
          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-blue-50 text-blue-700 border-blue-200">IVA</Badge>
        )}
        {producto.aplica_ieps && (
          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-amber-50 text-amber-700 border-amber-200">IEPS</Badge>
        )}
        {producto.bloqueado_venta && <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">🔒 Bloqueado</Badge>}
        {producto.es_promocion && <Badge className="text-[10px] px-1.5 py-0 h-4 bg-orange-100 text-orange-700 border-orange-200">🎁 Promo</Badge>}
        {producto.solo_uso_interno && <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">🔬 Interno</Badge>}
      </div>

      {/* Line 6: Actions */}
      <div className="flex gap-2 pt-1 border-t">
        <Button variant="outline" size="sm" className="flex-1 h-9" onClick={() => onEdit(producto)}>
          <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
        </Button>
        {isInactive && onReactivate ? (
          <Button variant="outline" size="sm" className="flex-1 h-9 text-green-600 border-green-200 hover:bg-green-50" onClick={() => onReactivate(producto)}>
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reactivar
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="flex-1 h-9 text-destructive" onClick={() => onDeactivate(producto)}>
            <Power className="h-3.5 w-3.5 mr-1" /> Desactivar
          </Button>
        )}
      </div>
    </div>
  );
};

export default ProductoCardMobile;
