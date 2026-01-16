import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getDisplayName } from "@/lib/productUtils";

interface ProductoDetalle {
  id: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  es_cortesia: boolean;
  producto: {
    codigo: string;
    nombre: string;
    especificaciones: string | null;
    marca: string | null;
    contenido_empaque: string | null;
    unidad: string;
    peso_kg: number | null;
  };
}

interface PedidoPreviewPopoverProps {
  pedidoId: string;
  folio: string;
  children: React.ReactNode;
}

export const PedidoPreviewPopover = ({ pedidoId, folio, children }: PedidoPreviewPopoverProps) => {
  const [productos, setProductos] = useState<ProductoDetalle[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const loadProductos = async () => {
    if (loaded) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("pedidos_detalles")
        .select(`
          id,
          cantidad,
          precio_unitario,
          subtotal,
          es_cortesia,
          producto:producto_id (
            codigo,
            nombre,
            especificaciones,
            marca,
            contenido_empaque,
            unidad,
            peso_kg
          )
        `)
        .eq("pedido_id", pedidoId);

      if (!error && data) {
        setProductos(data as ProductoDetalle[]);
        setLoaded(true);
      }
    } catch (err) {
      console.error("Error loading productos:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatKg = (value: number) => {
    return Number(value || 0).toLocaleString("es-MX", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const totalPeso = productos.reduce((sum, p) => {
    const pesoKg = p.producto?.peso_kg || 0;
    return sum + (p.cantidad * pesoKg);
  }, 0);

  const totalMonto = productos.reduce((sum, p) => sum + (p.subtotal || 0), 0);

  return (
    <Popover onOpenChange={(open) => open && loadProductos()}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b bg-muted/50">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span className="font-medium">{folio}</span>
            <Badge variant="outline" className="ml-auto text-xs">
              {productos.length} productos
            </Badge>
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {loading ? (
            <div className="p-3 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : productos.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              Sin productos
            </div>
          ) : (
            <div className="divide-y">
              {productos.map((p) => (
                <div key={p.id} className="p-2 text-sm">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs text-muted-foreground">
                        {p.producto?.codigo}
                      </p>
                      <p className="truncate">
                        {p.producto ? getDisplayName(p.producto) : "Producto"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-medium">
                        {p.cantidad} {p.producto?.unidad || "u"}
                      </p>
                      {p.es_cortesia ? (
                        <Badge variant="secondary" className="text-xs">CORTESÍA</Badge>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          ${p.subtotal?.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {!loading && productos.length > 0 && (
          <div className="p-3 border-t bg-muted/50 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Peso total:</span>
              <span className="font-medium">{formatKg(totalPeso)} kg</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-medium">
                ${totalMonto.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
