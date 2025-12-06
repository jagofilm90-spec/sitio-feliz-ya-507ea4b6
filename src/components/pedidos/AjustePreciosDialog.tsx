import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Split, Save, DollarSign, AlertTriangle } from "lucide-react";
import { calcularSubtotalLinea } from "@/lib/calculos";

interface DetalleLinea {
  id: string;
  producto_id: string;
  producto_nombre: string;
  producto_codigo: string;
  cantidad: number;
  precio_unitario: number;
  precio_original: number | null;
  subtotal: number;
  notas_ajuste: string | null;
  linea_dividida_de: string | null;
}

interface AjustePreciosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedidoId: string;
  pedidoFolio: string;
  onPreciosAjustados: () => void;
}

export const AjustePreciosDialog = ({
  open,
  onOpenChange,
  pedidoId,
  pedidoFolio,
  onPreciosAjustados
}: AjustePreciosDialogProps) => {
  const [lineas, setLineas] = useState<DetalleLinea[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dividirLineaId, setDividirLineaId] = useState<string | null>(null);
  const [dividirCantidad, setDividirCantidad] = useState<number>(0);
  const [dividirPrecioNuevo, setDividirPrecioNuevo] = useState<number>(0);

  useEffect(() => {
    if (open && pedidoId) {
      loadLineas();
    }
  }, [open, pedidoId]);

  const loadLineas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("pedidos_detalles")
        .select(`
          id,
          producto_id,
          cantidad,
          precio_unitario,
          precio_original,
          subtotal,
          notas_ajuste,
          linea_dividida_de,
          producto:productos(id, nombre, codigo)
        `)
        .eq("pedido_id", pedidoId);

      if (error) throw error;

      const lineasFormateadas: DetalleLinea[] = (data || []).map((d: any) => ({
        id: d.id,
        producto_id: d.producto_id,
        producto_nombre: d.producto?.nombre || "Producto",
        producto_codigo: d.producto?.codigo || "",
        cantidad: d.cantidad,
        precio_unitario: d.precio_unitario,
        precio_original: d.precio_original,
        subtotal: d.subtotal,
        notas_ajuste: d.notas_ajuste,
        linea_dividida_de: d.linea_dividida_de
      }));

      setLineas(lineasFormateadas);
    } catch (error) {
      console.error("Error loading lines:", error);
      toast.error("Error al cargar líneas del pedido");
    } finally {
      setLoading(false);
    }
  };

  const handlePrecioChange = (lineaId: string, nuevoPrecio: number) => {
    setLineas(prev => prev.map(l => {
      if (l.id === lineaId) {
        const subtotal = calcularSubtotalLinea(l.cantidad, nuevoPrecio);
        return {
          ...l,
          precio_unitario: nuevoPrecio,
          subtotal,
          precio_original: l.precio_original ?? l.precio_unitario
        };
      }
      return l;
    }));
  };

  const handleNotasChange = (lineaId: string, notas: string) => {
    setLineas(prev => prev.map(l => 
      l.id === lineaId ? { ...l, notas_ajuste: notas } : l
    ));
  };

  const iniciarDivision = (linea: DetalleLinea) => {
    setDividirLineaId(linea.id);
    setDividirCantidad(Math.floor(linea.cantidad / 2));
    setDividirPrecioNuevo(linea.precio_unitario);
  };

  const ejecutarDivision = async () => {
    if (!dividirLineaId) return;
    
    const lineaOriginal = lineas.find(l => l.id === dividirLineaId);
    if (!lineaOriginal) return;

    if (dividirCantidad <= 0 || dividirCantidad >= lineaOriginal.cantidad) {
      toast.error("La cantidad a dividir debe ser mayor a 0 y menor a la cantidad total");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      // Crear nueva línea con la cantidad dividida y nuevo precio
      const cantidadRestante = lineaOriginal.cantidad - dividirCantidad;
      const subtotalNuevaLinea = calcularSubtotalLinea(dividirCantidad, dividirPrecioNuevo);

      const { data: nuevaLinea, error: insertError } = await supabase
        .from("pedidos_detalles")
        .insert({
          pedido_id: pedidoId,
          producto_id: lineaOriginal.producto_id,
          cantidad: dividirCantidad,
          precio_unitario: dividirPrecioNuevo,
          subtotal: subtotalNuevaLinea,
          precio_original: lineaOriginal.precio_unitario,
          precio_ajustado_por: user.id,
          fecha_ajuste_precio: new Date().toISOString(),
          linea_dividida_de: lineaOriginal.id,
          notas_ajuste: `División de línea - Cantidad: ${dividirCantidad} al nuevo precio`
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Actualizar línea original con cantidad restante
      const subtotalOriginalActualizado = calcularSubtotalLinea(cantidadRestante, lineaOriginal.precio_unitario);
      
      const { error: updateError } = await supabase
        .from("pedidos_detalles")
        .update({
          cantidad: cantidadRestante,
          subtotal: subtotalOriginalActualizado
        })
        .eq("id", lineaOriginal.id);

      if (updateError) throw updateError;

      toast.success("Línea dividida exitosamente");
      setDividirLineaId(null);
      loadLineas();
      
      // Recalcular totales del pedido
      await recalcularTotalesPedido();
      
    } catch (error) {
      console.error("Error dividing line:", error);
      toast.error("Error al dividir la línea");
    }
  };

  const recalcularTotalesPedido = async () => {
    try {
      const { data: detalles } = await supabase
        .from("pedidos_detalles")
        .select("subtotal")
        .eq("pedido_id", pedidoId);

      const subtotal = (detalles || []).reduce((sum, d) => sum + (d.subtotal || 0), 0);
      
      // Por ahora asumimos IVA 16% sobre el total
      const impuestos = subtotal * 0.16;
      const total = subtotal + impuestos;

      await supabase
        .from("pedidos")
        .update({ subtotal, impuestos, total })
        .eq("id", pedidoId);
    } catch (error) {
      console.error("Error recalculating totals:", error);
    }
  };

  const handleGuardar = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      for (const linea of lineas) {
        // Solo actualizar si hubo cambio de precio
        const originalPrecio = linea.precio_original ?? linea.precio_unitario;
        const precioModificado = linea.precio_unitario !== originalPrecio;

        await supabase
          .from("pedidos_detalles")
          .update({
            precio_unitario: linea.precio_unitario,
            subtotal: linea.subtotal,
            precio_original: precioModificado ? (linea.precio_original ?? originalPrecio) : linea.precio_original,
            precio_ajustado_por: precioModificado ? user.id : null,
            fecha_ajuste_precio: precioModificado ? new Date().toISOString() : null,
            notas_ajuste: linea.notas_ajuste
          })
          .eq("id", linea.id);
      }

      await recalcularTotalesPedido();

      toast.success("Precios actualizados");
      onPreciosAjustados();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Error al guardar los cambios");
    } finally {
      setSaving(false);
    }
  };

  const totalOriginal = lineas.reduce((sum, l) => {
    const precioOrig = l.precio_original ?? l.precio_unitario;
    return sum + (l.cantidad * precioOrig);
  }, 0);

  const totalNuevo = lineas.reduce((sum, l) => sum + l.subtotal, 0);
  const diferencia = totalNuevo - totalOriginal;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Ajustar Precios - {pedidoFolio}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Líneas del pedido */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2 text-left">Producto</th>
                    <th className="p-2 text-center w-20">Cant.</th>
                    <th className="p-2 text-right w-28">P. Original</th>
                    <th className="p-2 text-right w-32">P. Nuevo</th>
                    <th className="p-2 text-right w-28">Subtotal</th>
                    <th className="p-2 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {lineas.map((linea) => (
                    <tr key={linea.id} className="border-t">
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">
                            {linea.producto_codigo}
                          </span>
                          <span className="font-medium">{linea.producto_nombre}</span>
                          {linea.linea_dividida_de && (
                            <Badge variant="outline" className="text-xs">Dividida</Badge>
                          )}
                        </div>
                        {linea.notas_ajuste && (
                          <p className="text-xs text-muted-foreground mt-1">{linea.notas_ajuste}</p>
                        )}
                      </td>
                      <td className="p-2 text-center">{linea.cantidad}</td>
                      <td className="p-2 text-right text-muted-foreground">
                        ${(linea.precio_original ?? linea.precio_unitario).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          value={linea.precio_unitario}
                          onChange={(e) => handlePrecioChange(linea.id, Number(e.target.value))}
                          className="w-full text-right"
                          step="0.01"
                          min={0}
                        />
                      </td>
                      <td className="p-2 text-right font-medium">
                        ${linea.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => iniciarDivision(linea)}
                          title="Dividir línea"
                        >
                          <Split className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* División de línea */}
            {dividirLineaId && (
              <div className="border rounded-lg p-4 bg-amber-50 dark:bg-amber-950/20">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Split className="h-4 w-4" />
                  Dividir Línea
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Cantidad al nuevo precio</Label>
                    <Input
                      type="number"
                      value={dividirCantidad}
                      onChange={(e) => setDividirCantidad(Number(e.target.value))}
                      min={1}
                    />
                  </div>
                  <div>
                    <Label>Nuevo precio unitario</Label>
                    <Input
                      type="number"
                      value={dividirPrecioNuevo}
                      onChange={(e) => setDividirPrecioNuevo(Number(e.target.value))}
                      step="0.01"
                      min={0}
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <Button onClick={ejecutarDivision} size="sm">
                      Dividir
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setDividirLineaId(null)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <Separator />

            {/* Resumen */}
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                {diferencia !== 0 && (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Diferencia: 
                    <span className={diferencia > 0 ? "text-green-600" : "text-red-600"}>
                      {diferencia > 0 ? "+" : ""}${diferencia.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">
                  Original: ${totalOriginal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-lg font-bold">
                  Nuevo Total: ${totalNuevo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleGuardar} disabled={saving || loading}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Guardar Cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
