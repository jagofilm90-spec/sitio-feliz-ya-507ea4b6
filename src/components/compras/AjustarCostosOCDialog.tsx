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
import { DollarSign, Loader2, Save, AlertTriangle } from "lucide-react";
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
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
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

                  return (
                    <TableRow
                      key={producto.producto_id}
                      className={cambiado ? "bg-amber-50 dark:bg-amber-950/20" : ""}
                    >
                      <TableCell>
                        <div>
                          <div className="font-medium">{producto.nombre}</div>
                          <div className="text-xs text-muted-foreground">
                            {producto.codigo}
                          </div>
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
                          className="w-28 text-right ml-auto"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            diferencia > 0
                              ? "text-red-600"
                              : diferencia < 0
                              ? "text-green-600"
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
