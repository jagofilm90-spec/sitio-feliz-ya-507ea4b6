import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Power, RotateCcw } from "lucide-react";

interface ProductoCardMobileProps {
  producto: any;
  onEdit: (producto: any) => void;
  onDeactivate: (producto: any) => void;
  onReactivate?: (producto: any) => void;
  isInactive?: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(value);
};

const ProductoCardMobile = ({
  producto,
  onEdit,
  onDeactivate,
  onReactivate,
  isInactive = false,
}: ProductoCardMobileProps) => {
  const stockBajo = producto.stock_actual <= (producto.stock_minimo || 0);
  const sinStock = producto.stock_actual <= 0;

  return (
    <div className={`border rounded-lg p-3 space-y-2 bg-card ${isInactive ? "opacity-60" : ""}`}>
      {/* Line 1: Code + Name + Brand */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="secondary" className="text-xs shrink-0 font-mono">{producto.codigo}</Badge>
            <span className="font-semibold text-sm truncate">{producto.nombre}</span>
            {producto.marca && <span className="text-xs text-muted-foreground">{producto.marca}</span>}
          </div>
        </div>
      </div>

      {/* Line 2: Unidad · Peso · Tipo */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
        <span className="capitalize">{producto.unidad}</span>
        {producto.peso_kg && (
          <>
            <span>·</span>
            <span>{producto.peso_kg}kg</span>
          </>
        )}
        {producto.contenido_empaque && (
          <>
            <span>·</span>
            <span>{producto.contenido_empaque}</span>
          </>
        )}
        <span>·</span>
        {producto.precio_por_kilo ? (
          <Badge className="text-[10px] px-1.5 py-0 h-4 bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800">
            Por kilo
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
            Por unidad
          </Badge>
        )}
      </div>

      {/* Line 3: Price with kilo equivalent */}
      <div className="text-sm">
        {producto.precio_por_kilo ? (
          <div>
            <span className="font-semibold">{formatCurrency(producto.precio_venta || 0)}/kg</span>
            {producto.peso_kg ? (
              <span className="text-muted-foreground text-xs ml-1">
                = {formatCurrency((producto.precio_venta || 0) * producto.peso_kg)}/{producto.unidad}
              </span>
            ) : null}
          </div>
        ) : (
          <span className="font-semibold">
            {formatCurrency(producto.precio_venta || 0)}/{producto.unidad}
          </span>
        )}
      </div>

      {/* Line 4: Stock with min */}
      <div className="flex items-center gap-3 text-xs">
        <span className={`font-medium ${sinStock ? "text-destructive" : stockBajo ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"}`}>
          Stock: {producto.stock_actual ?? 0}
          {producto.peso_kg ? ` (${((producto.stock_actual || 0) * producto.peso_kg).toFixed(0)}kg)` : ""}
        </span>
        <span className="text-muted-foreground">
          Mín: {producto.stock_minimo || 0}
        </span>
        {sinStock && <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">Sin stock</Badge>}
      </div>

      {/* Line 5: Tax + status badges */}
      <div className="flex items-center gap-1 flex-wrap">
        {producto.aplica_iva && (
          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800">
            IVA
          </Badge>
        )}
        {producto.aplica_ieps && (
          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800">
            IEPS
          </Badge>
        )}
        {producto.es_promocion && (
          <Badge className="text-[10px] px-1.5 py-0 h-4 bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-400">
            PROMO
          </Badge>
        )}
        {producto.bloqueado_venta && (
          <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
            Bloqueado
          </Badge>
        )}
        {producto.solo_uso_interno && (
          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
            Interno
          </Badge>
        )}
      </div>

      {/* Line 6: Actions */}
      <div className="flex gap-2 pt-1 border-t">
        <Button variant="outline" size="sm" className="flex-1 h-9" onClick={() => onEdit(producto)}>
          <Edit className="h-3.5 w-3.5 mr-1" /> Editar
        </Button>
        {isInactive && onReactivate ? (
          <Button variant="outline" size="sm" className="flex-1 h-9 text-green-600 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-950" onClick={() => onReactivate(producto)}>
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
