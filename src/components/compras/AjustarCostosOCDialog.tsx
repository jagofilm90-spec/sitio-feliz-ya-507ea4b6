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
import { Input } from "@/components/ui/input";
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
import { DollarSign, Loader2, Save, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AjustarCostosOCDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ordenCompra: {
    id: string;
    folio: string;
  } | null;
}

interface ProductoCosto {
  producto_id: string;
  codigo: string;
  nombre: string;
  cantidad_recibida: number;
  precio_original: number;
  precio_actual: number;
  precio_editado: number;
}

export const AjustarCostosOCDialog = ({
  open,
  onOpenChange,
  ordenCompra,
}: AjustarCostosOCDialogProps) => {
  const queryClient = useQueryClient();
  const [productosCostos, setProductosCostos] = useState<ProductoCosto[]>([]);

  // Fetch productos de la OC
  const { data: productosOC = [], isLoading } = useQuery({
    queryKey: ["productos-oc-ajuste", ordenCompra?.id],
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

  // Inicializar los costos editables cuando se cargan los productos
  useEffect(() => {
    if (productosOC.length > 0) {
      const costos: ProductoCosto[] = productosOC.map((p: any) => ({
        producto_id: p.producto_id,
        codigo: p.producto?.codigo || "-",
        nombre: p.producto?.nombre || "Producto",
        cantidad_recibida: p.cantidad_recibida ?? p.cantidad_ordenada,
        precio_original: p.precio_unitario_compra || 0,
        precio_actual: p.precio_unitario_compra || 0,
        precio_editado: p.precio_unitario_compra || 0,
      }));
      setProductosCostos(costos);
    }
  }, [productosOC]);

  const handlePrecioChange = (productoId: string, nuevoPrecio: number) => {
    setProductosCostos((prev) =>
      prev.map((p) =>
        p.producto_id === productoId
          ? { ...p, precio_editado: nuevoPrecio }
          : p
      )
    );
  };

  // Verificar si hay cambios
  const hayCambios = productosCostos.some(
    (p) => p.precio_editado !== p.precio_actual
  );

  // Calcular diferencia total
  const diferenciaTotalMonto = productosCostos.reduce((acc, p) => {
    const diferencia = (p.precio_editado - p.precio_actual) * p.cantidad_recibida;
    return acc + diferencia;
  }, 0);

  // Productos con incremento de costo
  const productosConIncremento = productosCostos.filter(
    (p) => p.precio_editado > p.precio_actual
  );

  const ajustarCostosMutation = useMutation({
    mutationFn: async () => {
      if (!ordenCompra?.id) throw new Error("No hay orden seleccionada");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      // Preparar productos con cambios
      const productosConCambios = productosCostos
        .filter((p) => p.precio_editado !== p.precio_actual)
        .map((p) => ({
          producto_id: p.producto_id,
          precio_facturado: p.precio_editado,
          cantidad: p.cantidad_recibida,
        }));

      if (productosConCambios.length === 0) {
        throw new Error("No hay cambios para guardar");
      }

      // Llamar a la función ajustar_costos_oc en la BD
      const { error: rpcError } = await supabase.rpc("ajustar_costos_oc", {
        p_oc_id: ordenCompra.id,
        p_productos: productosConCambios,
      });

      if (rpcError) throw rpcError;

      // Registrar en historial de costos para cada producto modificado
      for (const prod of productosConCambios) {
        const productoOriginal = productosCostos.find(
          (p) => p.producto_id === prod.producto_id
        );

        if (productoOriginal) {
          await supabase.from("productos_historial_costos").insert({
            producto_id: prod.producto_id,
            costo_anterior: productoOriginal.precio_actual,
            costo_nuevo: prod.precio_facturado,
            fuente: "ajuste_manual_oc",
            referencia_id: ordenCompra.id,
            usuario_id: user.id,
            notas: `Ajuste de costo en OC ${ordenCompra.folio}`,
          });
        }
      }

      // If there are cost increases, create a notification for admin
      const productosIncrementados = productosConCambios.filter((p) => {
        const original = productosCostos.find((x) => x.producto_id === p.producto_id);
        return original && p.precio_facturado > original.precio_actual;
      });

      if (productosIncrementados.length > 0) {
        const impactoTotal = productosIncrementados.reduce((acc, p) => {
          const original = productosCostos.find((x) => x.producto_id === p.producto_id);
          if (!original) return acc;
          return acc + (p.precio_facturado - original.precio_actual) * p.cantidad;
        }, 0);

        await supabase.from("notificaciones").insert({
          tipo: "costo_incrementado",
          titulo: `⚠️ Costo mayor: ${ordenCompra.folio}`,
          descripcion: `Se detectó incremento de costo en ${productosIncrementados.length} producto(s). Impacto: +$${impactoTotal.toFixed(2)}`,
          leida: false,
        });
      }
    },
    onSuccess: () => {
      toast.success("Costos ajustados correctamente");
      queryClient.invalidateQueries({ queryKey: ["ordenes_compra"] });
      queryClient.invalidateQueries({ queryKey: ["productos"] });
      queryClient.invalidateQueries({ queryKey: ["inventario-lotes"] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error("Error al ajustar costos: " + error.message);
    },
  });

  if (!ordenCompra) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Ajustar Costos - {ordenCompra.folio}
          </DialogTitle>
          <DialogDescription>
            Modifica los costos de compra de los productos recibidos
          </DialogDescription>
        </DialogHeader>

        <Alert className="border-blue-300 bg-blue-50 dark:bg-blue-950/30">
          <AlertTriangle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700 dark:text-blue-400">
            Los cambios actualizarán: lotes de inventario, último costo de compra
            y costo promedio ponderado de cada producto.
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
                  <TableHead className="text-right">Costo Actual</TableHead>
                  <TableHead className="text-right">Nuevo Costo</TableHead>
                  <TableHead className="text-right">Diferencia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productosCostos.map((producto) => {
                  const diferencia =
                    (producto.precio_editado - producto.precio_actual) *
                    producto.cantidad_recibida;
                  const cambiado = producto.precio_editado !== producto.precio_actual;
                  const esIncremento = producto.precio_editado > producto.precio_actual;
                  const porcentajeCambio = producto.precio_actual > 0
                    ? ((producto.precio_editado - producto.precio_actual) / producto.precio_actual * 100)
                    : 0;

                  return (
                    <TableRow
                      key={producto.producto_id}
                      className={cambiado ? (esIncremento ? "bg-red-50 dark:bg-red-950/20" : "bg-green-50 dark:bg-green-950/20") : ""}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="font-medium">{producto.nombre}</div>
                            <div className="text-xs text-muted-foreground">
                              {producto.codigo}
                            </div>
                          </div>
                          {/* Badge de alerta para incrementos de costo */}
                          {esIncremento && (
                            <Badge className="bg-red-100 text-red-700 border border-red-300 dark:bg-red-950/50 dark:text-red-400 dark:border-red-700">
                              <TrendingUp className="w-3 h-3 mr-1" />
                              +{porcentajeCambio.toFixed(1)}%
                            </Badge>
                          )}
                          {cambiado && !esIncremento && (
                            <Badge className="bg-green-100 text-green-700 border border-green-300 dark:bg-green-950/50 dark:text-green-400 dark:border-green-700">
                              <TrendingDown className="w-3 h-3 mr-1" />
                              {porcentajeCambio.toFixed(1)}%
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {producto.cantidad_recibida}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        $
                        {producto.precio_actual.toLocaleString("es-MX", {
                          minimumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={producto.precio_editado}
                          onChange={(e) =>
                            handlePrecioChange(
                              producto.producto_id,
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className={`w-28 text-right ml-auto ${esIncremento ? "border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950/30" : ""}`}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            diferencia > 0
                              ? "text-red-600 font-medium"
                              : diferencia < 0
                              ? "text-green-600 font-medium"
                              : "text-muted-foreground"
                          }
                        >
                          {diferencia !== 0 && (diferencia > 0 ? "+" : "")}
                          {diferencia !== 0
                            ? `$${diferencia.toLocaleString("es-MX", {
                                minimumFractionDigits: 2,
                              })}`
                            : "-"}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </ScrollArea>

        {/* Warning for cost increases */}
        {productosConIncremento.length > 0 && (
          <Alert className="border-red-300 bg-red-50 dark:bg-red-950/30">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700 dark:text-red-400">
              <strong>⚠️ Alerta de Costo:</strong> Se detectaron {productosConIncremento.length} producto(s) 
              con costo mayor al registrado. Se creará una notificación para el administrador al guardar.
            </AlertDescription>
          </Alert>
        )}

        {hayCambios && (
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                Impacto total en costos:
              </span>
              <span
                className={`font-bold ${
                  diferenciaTotalMonto > 0
                    ? "text-red-600"
                    : diferenciaTotalMonto < 0
                    ? "text-green-600"
                    : ""
                }`}
              >
                {diferenciaTotalMonto > 0 ? "+" : ""}$
                {diferenciaTotalMonto.toLocaleString("es-MX", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => ajustarCostosMutation.mutate()}
            disabled={ajustarCostosMutation.isPending || !hayCambios}
          >
            {ajustarCostosMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar Cambios
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AjustarCostosOCDialog;
