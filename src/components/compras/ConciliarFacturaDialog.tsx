import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle, Calculator, CheckCircle, FileText, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ConciliarFacturaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  factura: {
    id: string;
    numero_factura: string;
    monto_total: number;
    orden_compra_id?: string;
  } | null;
  ordenCompra: {
    id: string;
    folio: string;
    total?: number;
  } | null;
  onConciliacionCompletada?: () => void;
}

interface ProductoOC {
  producto_id: string;
  cantidad: number;
  cantidad_recibida: number | null;
  precio_unitario: number;
  precio_unitario_compra: number;
  subtotal: number;
  producto: {
    codigo: string;
    nombre: string;
  };
}

interface ProductoConciliacion extends ProductoOC {
  precioFacturado: number;
  diferencia: number;
}

const ConciliarFacturaDialog = ({
  open,
  onOpenChange,
  factura,
  ordenCompra,
  onConciliacionCompletada,
}: ConciliarFacturaDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [productos, setProductos] = useState<ProductoConciliacion[]>([]);

  // Fetch productos de la OC
  const { data: productosOC = [], isLoading } = useQuery({
    queryKey: ["productos-oc-conciliar", ordenCompra?.id],
    queryFn: async () => {
      if (!ordenCompra?.id) return [];

      const { data, error } = await supabase
        .from("ordenes_compra_detalles")
        .select(`
          producto_id,
          cantidad_ordenada,
          cantidad_recibida,
          precio_unitario,
          precio_unitario_compra,
          subtotal,
          producto:productos(codigo, nombre)
        `)
        .eq("orden_compra_id", ordenCompra.id);

      if (error) throw error;
      return (data || []).map((d: any) => ({
        ...d,
        cantidad: d.cantidad_ordenada, // Map to expected field name
      })) as unknown as ProductoOC[];
    },
    enabled: !!ordenCompra?.id && open,
  });

  // Initialize productos with prices from OC when data loads
  useEffect(() => {
    if (productosOC.length > 0) {
      setProductos(
        productosOC.map((p) => ({
          ...p,
          precioFacturado: p.precio_unitario_compra || p.precio_unitario,
          diferencia: 0,
        }))
      );
    }
  }, [productosOC]);

  // Calculate totals
  const totalOC = ordenCompra?.total || 0;
  const totalFacturado = factura?.monto_total || 0;
  const diferenciaOriginal = totalOC - totalFacturado;

  const totalConciliado = productos.reduce((sum, p) => {
    const cantidad = p.cantidad_recibida ?? p.cantidad;
    return sum + cantidad * p.precioFacturado;
  }, 0);

  const diferenciaTotal = productos.reduce((sum, p) => sum + p.diferencia, 0);

  // Update precio facturado for a product
  const handlePrecioChange = (productoId: string, nuevoPrecio: number) => {
    setProductos((prev) =>
      prev.map((p) => {
        if (p.producto_id === productoId) {
          const precioOriginal = p.precio_unitario_compra || p.precio_unitario;
          const cantidad = p.cantidad_recibida ?? p.cantidad;
          const diferencia = (precioOriginal - nuevoPrecio) * cantidad;
          return {
            ...p,
            precioFacturado: nuevoPrecio,
            diferencia,
          };
        }
        return p;
      })
    );
  };

  // Apply reconciliation
  const conciliarMutation = useMutation({
    mutationFn: async () => {
      if (!factura?.id) throw new Error("No hay factura seleccionada");

      // Get current user for audit trail
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      // Prepare productos data for the RPC function
      const productosData = productos.map((p) => ({
        producto_id: p.producto_id,
        precio_facturado: p.precioFacturado,
        cantidad: p.cantidad_recibida ?? p.cantidad,
      }));

      // Insert detalle de conciliación
      for (const p of productos) {
        const cantidad = p.cantidad_recibida ?? p.cantidad;
        const precioOriginal = p.precio_unitario_compra || p.precio_unitario;
        
        await supabase.from("proveedor_factura_detalles").insert({
          factura_id: factura.id,
          producto_id: p.producto_id,
          cantidad_facturada: cantidad,
          precio_unitario_facturado: p.precioFacturado,
          subtotal_facturado: cantidad * p.precioFacturado,
          precio_original_oc: precioOriginal,
          diferencia: (precioOriginal - p.precioFacturado) * cantidad,
        });

        // ===== NUEVO: Actualizar ultimo_costo_compra del producto (COSTO FINAL CONFIRMADO) =====
        const { data: productoActual } = await supabase
          .from("productos")
          .select("ultimo_costo_compra")
          .eq("id", p.producto_id)
          .single();

        const costoAnterior = productoActual?.ultimo_costo_compra || 0;

        await supabase
          .from("productos")
          .update({ ultimo_costo_compra: p.precioFacturado })
          .eq("id", p.producto_id);

        // Registrar en historial de costos
        if (costoAnterior !== p.precioFacturado && p.precioFacturado > 0) {
          await supabase.from("productos_historial_costos").insert({
            producto_id: p.producto_id,
            costo_anterior: costoAnterior,
            costo_nuevo: p.precioFacturado,
            fuente: "conciliacion_factura",
            referencia_id: factura.id,
            usuario_id: user.id,
            notas: `Conciliación factura ${factura.numero_factura} - OC ${ordenCompra?.folio || ''}`
          });
        }
      }

      // Call the RPC function to update costs in inventory lots
      const { error } = await supabase.rpc("conciliar_factura_proveedor", {
        p_factura_id: factura.id,
        p_productos: productosData,
      });

      if (error) throw error;

      // Update factura diferencia_total
      await supabase
        .from("proveedor_facturas")
        .update({
          diferencia_total: diferenciaTotal,
          requiere_conciliacion: false,
        })
        .eq("id", factura.id);

      // ===== NUEVO: Marcar lotes de inventario como conciliados =====
      if (ordenCompra?.id) {
        await supabase
          .from("inventario_lotes")
          .update({ conciliado: true })
          .eq("orden_compra_id", ordenCompra.id);

        // Marcar entregas como conciliadas
        await supabase
          .from("ordenes_compra_entregas")
          .update({ 
            status_conciliacion: 'conciliada',
            conciliado_por: user.id,
            conciliado_en: new Date().toISOString()
          })
          .eq("orden_compra_id", ordenCompra.id)
          .eq("status", "recibida");

        // Actualizar status_conciliacion de la OC
        await supabase
          .from("ordenes_compra")
          .update({ status_conciliacion: 'conciliada' })
          .eq("id", ordenCompra.id);
      }
    },
    onSuccess: () => {
      toast({
        title: "Conciliación aplicada",
        description: "Los costos de inventario y catálogo han sido actualizados.",
      });
      queryClient.invalidateQueries({ queryKey: ["proveedor-facturas"] });
      queryClient.invalidateQueries({ queryKey: ["ordenes-compra"] });
      queryClient.invalidateQueries({ queryKey: ["productos"] });
      queryClient.invalidateQueries({ queryKey: ["inventario-lotes"] });
      onConciliacionCompletada?.();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error al conciliar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!factura || !ordenCompra) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Conciliar Factura - {factura.numero_factura}
          </DialogTitle>
        </DialogHeader>

        {/* Difference Alert */}
        <Alert variant={diferenciaOriginal > 0 ? "default" : "destructive"}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {diferenciaOriginal > 0 ? (
              <>
                La factura es <strong>${Math.abs(diferenciaOriginal).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</strong> menor que la OC.
                Captura el precio real por producto para ajustar los costos.
              </>
            ) : diferenciaOriginal < 0 ? (
              <>
                La factura es <strong>${Math.abs(diferenciaOriginal).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</strong> mayor que la OC.
                Verifica los precios y ajusta según corresponda.
              </>
            ) : (
              <>Los montos coinciden. Puedes ajustar precios individuales si es necesario.</>
            )}
          </AlertDescription>
        </Alert>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-muted-foreground">Total OC Original</div>
            <div className="text-lg font-bold">
              ${totalOC.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-muted-foreground">Monto Factura</div>
            <div className="text-lg font-bold text-blue-600">
              ${totalFacturado.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-muted-foreground">Total Conciliado</div>
            <div className={`text-lg font-bold ${Math.abs(totalConciliado - totalFacturado) < 1 ? 'text-green-600' : 'text-amber-600'}`}>
              ${totalConciliado.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <Separator />

        {/* Products Table */}
        <ScrollArea className="flex-1 min-h-[200px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <span className="text-muted-foreground">Cargando productos...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Cant.</TableHead>
                  <TableHead className="text-right">Precio OC</TableHead>
                  <TableHead className="text-right">Precio Factura</TableHead>
                  <TableHead className="text-right">Diferencia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productos.map((producto) => {
                  const cantidad = producto.cantidad_recibida ?? producto.cantidad;
                  const precioOriginal = producto.precio_unitario_compra || producto.precio_unitario;
                  
                  return (
                    <TableRow key={producto.producto_id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{producto.producto?.nombre}</div>
                          <div className="text-xs text-muted-foreground">
                            {producto.producto?.codigo}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{cantidad}</TableCell>
                      <TableCell className="text-right">
                        ${precioOriginal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className="w-28 text-right"
                          value={producto.precioFacturado}
                          onChange={(e) =>
                            handlePrecioChange(
                              producto.producto_id,
                              parseFloat(e.target.value) || 0
                            )
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={producto.diferencia > 0 ? "default" : producto.diferencia < 0 ? "destructive" : "secondary"}
                          className={producto.diferencia > 0 ? "bg-green-100 text-green-800" : ""}
                        >
                          {producto.diferencia >= 0 ? "-" : "+"}$
                          {Math.abs(producto.diferencia).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </ScrollArea>

        <Separator />

        {/* Total Difference Summary */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            <span className="font-medium">Al aplicar conciliación:</span>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">
              Se actualizará el costo de {productos.length} producto(s) en inventario
            </div>
            <div className="text-lg font-bold">
              Diferencia Total:{" "}
              <span className={diferenciaTotal >= 0 ? "text-green-600" : "text-destructive"}>
                {diferenciaTotal >= 0 ? "-" : "+"}$
                {Math.abs(diferenciaTotal).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => conciliarMutation.mutate()}
            disabled={conciliarMutation.isPending}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {conciliarMutation.isPending ? "Aplicando..." : "Aplicar Conciliación"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConciliarFacturaDialog;
