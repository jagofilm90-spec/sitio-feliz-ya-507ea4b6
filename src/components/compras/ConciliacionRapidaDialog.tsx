import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle2, FileCheck, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ConciliacionRapidaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ordenCompra: {
    id: string;
    folio: string;
  } | null;
}

export const ConciliacionRapidaDialog = ({
  open,
  onOpenChange,
  ordenCompra,
}: ConciliacionRapidaDialogProps) => {
  const queryClient = useQueryClient();

  // Fetch productos de la OC
  const { data: productosOC = [], isLoading } = useQuery({
    queryKey: ["productos-oc-conciliacion-rapida", ordenCompra?.id],
    queryFn: async () => {
      if (!ordenCompra?.id) return [];

      const { data, error } = await supabase
        .from("ordenes_compra_detalles")
        .select(`
          producto_id,
          cantidad_ordenada,
          cantidad_recibida,
          precio_unitario_compra,
          subtotal,
          producto:productos(codigo, nombre)
        `)
        .eq("orden_compra_id", ordenCompra.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!ordenCompra?.id && open,
  });

  // Fetch lotes no conciliados de esta OC
  const { data: lotesPendientes = [] } = useQuery({
    queryKey: ["lotes-pendientes-conciliacion", ordenCompra?.id],
    queryFn: async () => {
      if (!ordenCompra?.id) return [];

      const { data, error } = await supabase
        .from("inventario_lotes")
        .select("id, producto_id, cantidad_disponible, precio_compra, conciliado")
        .eq("orden_compra_id", ordenCompra.id)
        .eq("conciliado", false);

      if (error) throw error;
      return data || [];
    },
    enabled: !!ordenCompra?.id && open,
  });

  const tieneLotesPendientes = lotesPendientes.length > 0;

  const confirmarCostosMutation = useMutation({
    mutationFn: async () => {
      if (!ordenCompra?.id) throw new Error("No hay orden seleccionada");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      // 1. Actualizar ultimo_costo_compra de cada producto
      for (const prod of productosOC) {
        const precioCompra = (prod as any).precio_unitario_compra || 0;
        if (precioCompra > 0) {
          const { data: productoActual } = await supabase
            .from("productos")
            .select("ultimo_costo_compra")
            .eq("id", (prod as any).producto_id)
            .single();

          const costoAnterior = productoActual?.ultimo_costo_compra || 0;

          await supabase
            .from("productos")
            .update({ ultimo_costo_compra: precioCompra })
            .eq("id", (prod as any).producto_id);

          // Registrar en historial si cambió
          if (costoAnterior !== precioCompra) {
            await supabase.from("productos_historial_costos").insert({
              producto_id: (prod as any).producto_id,
              costo_anterior: costoAnterior,
              costo_nuevo: precioCompra,
              fuente: "conciliacion_rapida",
              referencia_id: ordenCompra.id,
              usuario_id: user.id,
              notas: `Confirmación de costos OC ${ordenCompra.folio} (sin factura)`
            });
          }
        }
      }

      // 2. Marcar lotes como conciliados
      await supabase
        .from("inventario_lotes")
        .update({ conciliado: true })
        .eq("orden_compra_id", ordenCompra.id);

      // 3. Actualizar entregas
      await supabase
        .from("ordenes_compra_entregas")
        .update({ 
          status_conciliacion: 'conciliada',
          conciliado_por: user.id,
          conciliado_en: new Date().toISOString()
        })
        .eq("orden_compra_id", ordenCompra.id)
        .eq("status", "recibida");

      // 4. Actualizar OC
      await supabase
        .from("ordenes_compra")
        .update({ status_conciliacion: 'conciliada' })
        .eq("id", ordenCompra.id);
    },
    onSuccess: () => {
      toast.success("Costos confirmados correctamente");
      queryClient.invalidateQueries({ queryKey: ["ordenes_compra"] });
      queryClient.invalidateQueries({ queryKey: ["productos"] });
      queryClient.invalidateQueries({ queryKey: ["inventario-lotes"] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error("Error al confirmar costos: " + error.message);
    },
  });

  if (!ordenCompra) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Confirmar Costos - {ordenCompra.folio}
          </DialogTitle>
          <DialogDescription>
            Confirma que los costos de la OC son los costos finales (sin factura)
          </DialogDescription>
        </DialogHeader>

        <Alert className="border-amber-300 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700">
            <strong>Importante:</strong> Esta acción marcará los costos de la OC como finales y actualizará el catálogo de productos. 
            Usa esta opción solo si no recibirás factura del proveedor o el costo de la OC es el definitivo.
          </AlertDescription>
        </Alert>

        <ScrollArea className="flex-1 min-h-[200px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Costo OC</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productosOC.map((producto: any) => {
                  const loteConciliado = !lotesPendientes.some(l => l.producto_id === producto.producto_id);
                  return (
                    <TableRow key={producto.producto_id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{producto.producto?.nombre}</div>
                          <div className="text-xs text-muted-foreground">{producto.producto?.codigo}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {producto.cantidad_recibida ?? producto.cantidad_ordenada}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${(producto.precio_unitario_compra || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-center">
                        {loteConciliado ? (
                          <Badge className="bg-green-100 text-green-700 border-green-300">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Conciliado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 border-amber-300">
                            Pendiente
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </ScrollArea>

        <div className="p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {tieneLotesPendientes 
                ? `${lotesPendientes.length} lote(s) pendientes de conciliar`
                : "Todos los lotes están conciliados"
              }
            </span>
            <span className="font-bold">
              {productosOC.length} productos
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => confirmarCostosMutation.mutate()}
            disabled={confirmarCostosMutation.isPending || !tieneLotesPendientes}
          >
            {confirmarCostosMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Confirmando...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Confirmar Costos
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConciliacionRapidaDialog;
