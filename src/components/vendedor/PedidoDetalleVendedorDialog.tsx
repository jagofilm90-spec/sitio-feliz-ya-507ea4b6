import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Package, Calendar, FileText } from "lucide-react";
import { getDisplayName } from "@/lib/productUtils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedidoId: string;
}

interface PedidoDetalle {
  id: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  producto: {
    nombre: string;
    marca: string | null;
    especificaciones: string | null;
    contenido_empaque: string | null;
    unidad: string;
    peso_kg: number | null;
  };
}

interface Pedido {
  id: string;
  folio: string;
  fecha_pedido: string;
  subtotal: number;
  impuestos: number;
  total: number;
  status: string;
  notas: string | null;
  cliente: {
    nombre: string;
  };
  sucursal?: {
    nombre: string;
  } | null;
  detalles: PedidoDetalle[];
}

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  por_autorizar: { label: "Por autorizar", variant: "secondary" },
  pendiente: { label: "Pendiente", variant: "secondary" },
  autorizado: { label: "Autorizado", variant: "default" },
  en_ruta: { label: "En ruta", variant: "default" },
  entregado: { label: "Entregado", variant: "outline" },
  facturado: { label: "Facturado", variant: "outline" },
  cancelado: { label: "Cancelado", variant: "destructive" }
};

export function PedidoDetalleVendedorDialog({ open, onOpenChange, pedidoId }: Props) {
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && pedidoId) {
      fetchPedido();
    }
  }, [open, pedidoId]);

  const fetchPedido = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("pedidos")
        .select(`
          id, folio, fecha_pedido, subtotal, impuestos, total, status, notas,
          cliente:clientes(nombre),
          sucursal:cliente_sucursales(nombre),
          detalles:pedidos_detalles(
            id, cantidad, precio_unitario, subtotal,
            producto:productos(nombre, marca, especificaciones, contenido_empaque, unidad, peso_kg)
          )
        `)
        .eq("id", pedidoId)
        .single();

      if (error) throw error;

      setPedido({
        ...data,
        cliente: data.cliente || { nombre: "Sin cliente" },
        detalles: (data.detalles || []).map((d: any) => ({
          ...d,
          producto: d.producto || { nombre: "Producto", marca: null, especificaciones: null, contenido_empaque: null, unidad: "", peso_kg: null }
        }))
      } as Pedido);
    } catch (error) {
      console.error("Error fetching pedido:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Detalle del Pedido
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : pedido ? (
          <div className="space-y-4">
            {/* Header info */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl font-bold">{pedido.folio}</span>
                  <Badge variant={statusLabels[pedido.status]?.variant || "secondary"}>
                    {statusLabels[pedido.status]?.label || pedido.status}
                  </Badge>
                </div>
                <p className="text-base text-muted-foreground">{pedido.cliente.nombre}</p>
                {pedido.sucursal && (
                  <p className="text-sm text-muted-foreground">→ {pedido.sucursal.nombre}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{formatCurrency(pedido.total)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {format(new Date(pedido.fecha_pedido), "d 'de' MMMM yyyy, HH:mm", { locale: es })}
            </div>

            {/* Products */}
            <div>
              <h4 className="font-medium mb-2">Productos ({pedido.detalles.length})</h4>
              <ScrollArea className="h-[200px] border rounded-lg">
                <div className="p-3 space-y-3">
                  {pedido.detalles.map((detalle) => (
                    <div key={detalle.id} className="flex justify-between items-start text-sm">
                      <div className="flex-1">
                        <p className="font-medium">{getDisplayName(detalle.producto)}</p>
                        <p className="text-xs text-muted-foreground">
                          {detalle.cantidad} × {formatCurrency(detalle.precio_unitario)}
                        </p>
                      </div>
                      <p className="font-medium">{formatCurrency(detalle.subtotal)}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Totals */}
            <div className="border-t pt-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(pedido.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Impuestos</span>
                <span>{formatCurrency(pedido.impuestos)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{formatCurrency(pedido.total)}</span>
              </div>
            </div>

            {/* Notes */}
            {pedido.notas && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 text-sm font-medium mb-1">
                  <FileText className="h-4 w-4" />
                  Notas
                </div>
                <p className="text-sm text-muted-foreground">{pedido.notas}</p>
              </div>
            )}

            <Button className="w-full" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            No se encontró el pedido
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
