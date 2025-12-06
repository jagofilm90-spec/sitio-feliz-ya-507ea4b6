import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, DollarSign, Search, CheckSquare } from "lucide-react";
import { calcularSubtotalLinea } from "@/lib/calculos";

interface LineaDetalle {
  id: string;
  pedido_id: string;
  pedido_folio: string;
  cliente_nombre: string;
  producto_id: string;
  producto_nombre: string;
  producto_codigo: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  selected: boolean;
}

interface Producto {
  id: string;
  nombre: string;
  codigo: string;
}

interface AjusteMasivoPreciosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export const AjusteMasivoPreciosDialog = ({
  open,
  onOpenChange,
  onComplete
}: AjusteMasivoPreciosDialogProps) => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [lineas, setLineas] = useState<LineaDetalle[]>([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState<string>("");
  const [nuevoPrecio, setNuevoPrecio] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchProducto, setSearchProducto] = useState("");

  useEffect(() => {
    if (open) {
      loadProductos();
    }
  }, [open]);

  const loadProductos = async () => {
    try {
      const { data, error } = await supabase
        .from("productos")
        .select("id, nombre, codigo")
        .eq("activo", true)
        .order("nombre");

      if (error) throw error;
      setProductos(data || []);
    } catch (error) {
      console.error("Error loading products:", error);
    }
  };

  const loadLineasProducto = async (productoId: string) => {
    if (!productoId) {
      setLineas([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("pedidos_detalles")
        .select(`
          id,
          pedido_id,
          producto_id,
          cantidad,
          precio_unitario,
          subtotal,
          pedido:pedidos(
            id,
            folio,
            status,
            cliente:clientes(nombre)
          ),
          producto:productos(id, nombre, codigo)
        `)
        .eq("producto_id", productoId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const lineasFormateadas: LineaDetalle[] = (data || [])
        .filter((d: any) => d.pedido && ["pendiente", "por_autorizar", "en_ruta"].includes(d.pedido.status))
        .map((d: any) => ({
          id: d.id,
          pedido_id: d.pedido_id,
          pedido_folio: d.pedido?.folio || "",
          cliente_nombre: d.pedido?.cliente?.nombre || "Cliente",
          producto_id: d.producto_id,
          producto_nombre: d.producto?.nombre || "",
          producto_codigo: d.producto?.codigo || "",
          cantidad: d.cantidad,
          precio_unitario: d.precio_unitario,
          subtotal: d.subtotal,
          selected: false
        }));

      setLineas(lineasFormateadas);
      
      // Set initial price from first line
      if (lineasFormateadas.length > 0) {
        setNuevoPrecio(lineasFormateadas[0].precio_unitario);
      }
    } catch (error) {
      console.error("Error loading lines:", error);
      toast.error("Error al cargar líneas");
    } finally {
      setLoading(false);
    }
  };

  const handleProductoChange = (productoId: string) => {
    setProductoSeleccionado(productoId);
    loadLineasProducto(productoId);
  };

  const handleToggleLinea = (lineaId: string) => {
    setLineas(prev => prev.map(l => 
      l.id === lineaId ? { ...l, selected: !l.selected } : l
    ));
  };

  const handleSelectAll = () => {
    const allSelected = lineas.every(l => l.selected);
    setLineas(prev => prev.map(l => ({ ...l, selected: !allSelected })));
  };

  const handleAplicarPrecio = async () => {
    const lineasSeleccionadas = lineas.filter(l => l.selected);
    if (lineasSeleccionadas.length === 0) {
      toast.error("Selecciona al menos una línea");
      return;
    }

    if (nuevoPrecio <= 0) {
      toast.error("El precio debe ser mayor a 0");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      const pedidosAfectados = new Set<string>();

      for (const linea of lineasSeleccionadas) {
        const nuevoSubtotal = calcularSubtotalLinea(linea.cantidad, nuevoPrecio);
        
        await supabase
          .from("pedidos_detalles")
          .update({
            precio_original: linea.precio_unitario,
            precio_unitario: nuevoPrecio,
            subtotal: nuevoSubtotal,
            precio_ajustado_por: user.id,
            fecha_ajuste_precio: new Date().toISOString(),
            notas_ajuste: `Ajuste masivo de precio: $${linea.precio_unitario} → $${nuevoPrecio}`
          })
          .eq("id", linea.id);

        pedidosAfectados.add(linea.pedido_id);
      }

      // Recalcular totales de cada pedido afectado
      for (const pedidoId of pedidosAfectados) {
        const { data: detalles } = await supabase
          .from("pedidos_detalles")
          .select("subtotal")
          .eq("pedido_id", pedidoId);

        const subtotal = (detalles || []).reduce((sum, d) => sum + (d.subtotal || 0), 0);
        const impuestos = subtotal * 0.16;
        const total = subtotal + impuestos;

        await supabase
          .from("pedidos")
          .update({ subtotal, impuestos, total })
          .eq("id", pedidoId);
      }

      toast.success(`Precio actualizado en ${lineasSeleccionadas.length} líneas`);
      onComplete();
      onOpenChange(false);
    } catch (error) {
      console.error("Error applying price:", error);
      toast.error("Error al aplicar precio");
    } finally {
      setSaving(false);
    }
  };

  const productosFiltrados = productos.filter(p => 
    p.nombre.toLowerCase().includes(searchProducto.toLowerCase()) ||
    p.codigo.toLowerCase().includes(searchProducto.toLowerCase())
  );

  const lineasSeleccionadas = lineas.filter(l => l.selected).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Ajuste Masivo de Precios
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Selector de producto */}
          <div className="space-y-2">
            <Label>Seleccionar Producto</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar producto..."
                  value={searchProducto}
                  onChange={(e) => setSearchProducto(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={productoSeleccionado} onValueChange={handleProductoChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un producto" />
              </SelectTrigger>
              <SelectContent>
                {productosFiltrados.slice(0, 50).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="font-mono text-xs mr-2">{p.codigo}</span>
                    {p.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Nuevo precio */}
          {productoSeleccionado && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nuevo Precio Unitario</Label>
                <Input
                  type="number"
                  value={nuevoPrecio}
                  onChange={(e) => setNuevoPrecio(Number(e.target.value))}
                  step="0.01"
                  min={0}
                />
              </div>
              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  onClick={handleSelectAll}
                  className="gap-2"
                >
                  <CheckSquare className="h-4 w-4" />
                  {lineas.every(l => l.selected) ? "Deseleccionar todo" : "Seleccionar todo"}
                </Button>
              </div>
            </div>
          )}

          {/* Lista de líneas */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : lineas.length > 0 ? (
            <div className="border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="p-2 w-10"></th>
                    <th className="p-2 text-left">Pedido</th>
                    <th className="p-2 text-left">Cliente</th>
                    <th className="p-2 text-center">Cantidad</th>
                    <th className="p-2 text-right">Precio Actual</th>
                    <th className="p-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {lineas.map((linea) => (
                    <tr 
                      key={linea.id} 
                      className={`border-t cursor-pointer hover:bg-muted/50 ${linea.selected ? "bg-primary/5" : ""}`}
                      onClick={() => handleToggleLinea(linea.id)}
                    >
                      <td className="p-2">
                        <Checkbox
                          checked={linea.selected}
                          onCheckedChange={() => handleToggleLinea(linea.id)}
                        />
                      </td>
                      <td className="p-2 font-mono text-xs">{linea.pedido_folio}</td>
                      <td className="p-2">{linea.cliente_nombre}</td>
                      <td className="p-2 text-center">{linea.cantidad}</td>
                      <td className="p-2 text-right">
                        ${linea.precio_unitario.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2 text-right font-medium">
                        ${linea.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : productoSeleccionado ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay pedidos pendientes con este producto
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Selecciona un producto para ver las líneas disponibles
            </div>
          )}

          {/* Resumen */}
          {lineasSeleccionadas > 0 && (
            <div className="bg-muted/50 rounded-lg p-4 flex justify-between items-center">
              <span className="font-medium">
                {lineasSeleccionadas} línea{lineasSeleccionadas > 1 ? "s" : ""} seleccionada{lineasSeleccionadas > 1 ? "s" : ""}
              </span>
              <span className="text-lg font-bold">
                Nuevo precio: ${nuevoPrecio.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleAplicarPrecio} 
            disabled={saving || lineasSeleccionadas === 0}
          >
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <DollarSign className="h-4 w-4 mr-2" />}
            Aplicar a {lineasSeleccionadas} línea{lineasSeleccionadas > 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
