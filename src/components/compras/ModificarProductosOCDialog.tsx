import { useState, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Trash2, AlertTriangle, Mail, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

interface ModificarProductosOCDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ordenCompra: {
    id: string;
    folio: string;
    status: string;
    proveedor_id: string | null;
    proveedor_nombre: string;
    proveedor_email: string | null;
    subtotal: number;
    impuestos: number;
    total: number;
  } | null;
}

interface ProductoOC {
  id: string;
  producto_id: string;
  codigo: string;
  nombre: string;
  cantidad_ordenada: number;
  cantidad_recibida: number;
  precio_unitario_compra: number;
  subtotal: number;
}

export const ModificarProductosOCDialog = ({
  open,
  onOpenChange,
  ordenCompra,
}: ModificarProductosOCDialogProps) => {
  const queryClient = useQueryClient();
  const [productosSeleccionados, setProductosSeleccionados] = useState<Set<string>>(new Set());
  const [motivoCancelacion, setMotivoCancelacion] = useState("");

  // Fetch productos de la OC
  const { data: productosOC = [], isLoading } = useQuery({
    queryKey: ["productos-oc-modificar", ordenCompra?.id],
    queryFn: async () => {
      if (!ordenCompra?.id) return [];

      const { data, error } = await supabase
        .from("ordenes_compra_detalles")
        .select(`
          id,
          producto_id,
          cantidad_ordenada,
          cantidad_recibida,
          precio_unitario_compra,
          subtotal,
          producto:productos(codigo, nombre)
        `)
        .eq("orden_compra_id", ordenCompra.id);

      if (error) throw error;
      
      return (data || []).map((p: any) => ({
        id: p.id,
        producto_id: p.producto_id,
        codigo: p.producto?.codigo || "-",
        nombre: p.producto?.nombre || "Producto",
        cantidad_ordenada: p.cantidad_ordenada,
        cantidad_recibida: p.cantidad_recibida || 0,
        precio_unitario_compra: p.precio_unitario_compra || 0,
        subtotal: p.subtotal || 0,
      })) as ProductoOC[];
    },
    enabled: !!ordenCompra?.id && open,
  });

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setProductosSeleccionados(new Set());
      setMotivoCancelacion("");
    }
  }, [open]);

  // Productos que se pueden eliminar (cantidad_recibida = 0)
  const productosEliminables = productosOC.filter(p => p.cantidad_recibida === 0);
  
  // Check if OC was already sent to supplier
  const ocYaEnviada = ordenCompra?.status === 'enviada' || ordenCompra?.status === 'confirmada' || ordenCompra?.status === 'parcial';
  
  // Check if supplier has email
  const proveedorTieneEmail = !!ordenCompra?.proveedor_email;

  const toggleProducto = (productoId: string) => {
    setProductosSeleccionados(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productoId)) {
        newSet.delete(productoId);
      } else {
        newSet.add(productoId);
      }
      return newSet;
    });
  };

  // Calculate new totals after removal
  const productosRestantes = productosOC.filter(p => !productosSeleccionados.has(p.id));
  const nuevoSubtotal = productosRestantes.reduce((acc, p) => acc + p.subtotal, 0);
  const nuevoIVA = nuevoSubtotal * 0.16;
  const nuevoTotal = nuevoSubtotal + nuevoIVA;

  // Products being removed
  const productosAEliminar = productosOC.filter(p => productosSeleccionados.has(p.id));

  const modificarProductosMutation = useMutation({
    mutationFn: async () => {
      if (!ordenCompra?.id) throw new Error("No hay orden seleccionada");
      if (productosSeleccionados.size === 0) throw new Error("No hay productos seleccionados");
      if (productosRestantes.length === 0) throw new Error("No puedes eliminar todos los productos. Usa 'Eliminar OC' en su lugar.");
      if (ocYaEnviada && !motivoCancelacion.trim()) throw new Error("Debes especificar un motivo");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      // Delete selected products
      for (const detalleId of productosSeleccionados) {
        const { error } = await supabase
          .from("ordenes_compra_detalles")
          .delete()
          .eq("id", detalleId);
        
        if (error) throw error;
      }

      // Recalculate and update OC totals
      const { error: updateError } = await supabase
        .from("ordenes_compra")
        .update({
          subtotal: nuevoSubtotal,
          impuestos: nuevoIVA,
          total: nuevoTotal,
          total_ajustado: nuevoTotal,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ordenCompra.id);

      if (updateError) throw updateError;

      // If OC was already sent to supplier, notify them of the modification
      if (ocYaEnviada && proveedorTieneEmail) {
        try {
          await supabase.functions.invoke("notificar-faltante-oc", {
            body: {
              tipo: "productos_modificados",
              entrega_id: ordenCompra.id,
              orden_folio: ordenCompra.folio,
              proveedor_email: ordenCompra.proveedor_email,
              proveedor_nombre: ordenCompra.proveedor_nombre,
              productos_cancelados: productosAEliminar.map(p => ({
                producto_id: p.producto_id,
                nombre: p.nombre,
                cantidad_pendiente: p.cantidad_ordenada,
              })),
              motivo_cancelacion: motivoCancelacion,
            },
          });
        } catch (emailError) {
          console.error("Error notifying supplier:", emailError);
          // Don't fail the whole operation if email fails
        }
      }
    },
    onSuccess: () => {
      toast.success(
        ocYaEnviada && proveedorTieneEmail
          ? "Productos eliminados y proveedor notificado"
          : "Productos eliminados correctamente"
      );
      queryClient.invalidateQueries({ queryKey: ["ordenes_compra"] });
      queryClient.invalidateQueries({ queryKey: ["ordenes_calendario"] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error("Error: " + error.message);
    },
  });

  if (!ordenCompra) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-600" />
            Modificar Productos - {ordenCompra.folio}
          </DialogTitle>
          <DialogDescription>
            Selecciona los productos que deseas eliminar de esta orden
          </DialogDescription>
        </DialogHeader>

        {ocYaEnviada && (
          <Alert className="border-amber-300 bg-amber-50">
            <Mail className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-700">
              Esta orden ya fue enviada al proveedor. Al eliminar productos, se le 
              {proveedorTieneEmail ? " notificará automáticamente" : " deberás notificar manualmente (sin correo registrado)"}.
            </AlertDescription>
          </Alert>
        )}

        <ScrollArea className="flex-1 min-h-[200px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : productosEliminables.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-amber-500" />
              <p>No hay productos que se puedan eliminar.</p>
              <p className="text-sm">Todos los productos ya tienen recepciones registradas.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Recibido</TableHead>
                  <TableHead className="text-right">P. Unit.</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productosOC.map((producto) => {
                  const esEliminable = producto.cantidad_recibida === 0;
                  const estaSeleccionado = productosSeleccionados.has(producto.id);

                  return (
                    <TableRow
                      key={producto.id}
                      className={estaSeleccionado ? "bg-red-50" : esEliminable ? "" : "opacity-50"}
                    >
                      <TableCell>
                        {esEliminable ? (
                          <Checkbox
                            checked={estaSeleccionado}
                            onCheckedChange={() => toggleProducto(producto.id)}
                          />
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Recibido
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className={`font-medium ${estaSeleccionado ? "line-through text-red-600" : ""}`}>
                            {producto.nombre}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {producto.codigo}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {producto.cantidad_ordenada}
                      </TableCell>
                      <TableCell className="text-right">
                        {producto.cantidad_recibida}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(producto.precio_unitario_compra)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(producto.subtotal)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </ScrollArea>

        {productosSeleccionados.size > 0 && (
          <div className="space-y-3 border-t pt-3">
            {/* Summary of changes */}
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm font-medium text-red-700 mb-2">
                Se eliminarán {productosSeleccionados.size} producto(s):
              </p>
              <ul className="text-sm text-red-600 list-disc ml-4">
                {productosAEliminar.map(p => (
                  <li key={p.id}>{p.cantidad_ordenada} x {p.nombre}</li>
                ))}
              </ul>
            </div>

            {/* New totals */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex justify-between text-sm">
                <span>Nuevo subtotal:</span>
                <span>{formatCurrency(nuevoSubtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Nuevo IVA:</span>
                <span>{formatCurrency(nuevoIVA)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Nuevo total:</span>
                <span>{formatCurrency(nuevoTotal)}</span>
              </div>
            </div>

            {/* Motivo - required if OC was already sent */}
            {ocYaEnviada && (
              <div>
                <label className="text-sm font-medium">Motivo de la modificación *</label>
                <Textarea
                  value={motivoCancelacion}
                  onChange={(e) => setMotivoCancelacion(e.target.value)}
                  placeholder="Ej: Error de captura, producto ya no requerido, cambio en inventario..."
                  rows={2}
                  className="mt-1"
                />
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={() => modificarProductosMutation.mutate()}
            disabled={
              modificarProductosMutation.isPending || 
              productosSeleccionados.size === 0 ||
              (ocYaEnviada && !motivoCancelacion.trim())
            }
          >
            {modificarProductosMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar {productosSeleccionados.size} Producto(s)
                {ocYaEnviada && proveedorTieneEmail && (
                  <Send className="h-3 w-3 ml-1" />
                )}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ModificarProductosOCDialog;
