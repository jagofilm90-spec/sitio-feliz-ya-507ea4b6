import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Plus, Search, X, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

interface ProductoBusqueda {
  id: string;
  nombre: string;
  codigo: string;
  unidad: string;
  peso_kg: number | null;
  precio_por_kilo: boolean;
  precio_venta: number;
  descuento_maximo: number | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedidoId: string;
  pedidoFolio: string;
  entregaId: string;
  onProductoAgregado: () => void;
}

export const AgregarProductoEnCargaDialog = ({ open, onOpenChange, pedidoId, pedidoFolio, entregaId, onProductoAgregado }: Props) => {
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState<ProductoBusqueda[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState<ProductoBusqueda | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [precio, setPrecio] = useState(0);
  const [saving, setSaving] = useState(false);

  const buscarProductos = async () => {
    if (!busqueda.trim()) return;
    setBuscando(true);
    const { data } = await supabase
      .from("productos")
      .select("id, nombre, codigo, unidad, peso_kg, precio_por_kilo, precio_venta, descuento_maximo")
      .or(`nombre.ilike.%${busqueda}%,codigo.ilike.%${busqueda}%`)
      .eq("activo", true)
      .limit(10);
    setResultados((data || []) as ProductoBusqueda[]);
    setBuscando(false);
  };

  const seleccionarProducto = (p: ProductoBusqueda) => {
    setProductoSeleccionado(p);
    setPrecio(p.precio_venta);
    setCantidad(1);
    setResultados([]);
    setBusqueda("");
  };

  const precioMinimo = productoSeleccionado ? productoSeleccionado.precio_venta - (productoSeleccionado.descuento_maximo || 0) : 0;
  const belowMin = productoSeleccionado ? precio < precioMinimo : false;

  const calcSubtotal = () => {
    if (!productoSeleccionado) return 0;
    const precioPorKilo = productoSeleccionado.precio_por_kilo;
    const pesoKg = productoSeleccionado.peso_kg || 0;
    return precioPorKilo && pesoKg ? cantidad * pesoKg * precio : cantidad * precio;
  };

  const handleAgregar = async () => {
    if (!productoSeleccionado || cantidad <= 0 || precio <= 0) {
      toast.error("Completa los datos del producto");
      return;
    }
    if (belowMin) {
      toast.error("El precio está por debajo del mínimo permitido. Ajusta el precio.");
      return;
    }

    setSaving(true);
    try {
      const subtotal = calcSubtotal();

      // Insert new pedido_detalle
      const { data: newDetalle, error } = await supabase.from("pedidos_detalles").insert({
        pedido_id: pedidoId,
        producto_id: productoSeleccionado.id,
        cantidad,
        precio_unitario: precio,
        subtotal,
        agregado_en_carga: true,
        notas_ajuste: "[AGREGADO EN CARGA]",
      }).select("id").single();

      if (error) throw error;

      // Create carga_productos record for the almacenista's checklist
      if (newDetalle) {
        await supabase.from("carga_productos").insert({
          entrega_id: entregaId,
          pedido_detalle_id: newDetalle.id,
          cantidad_solicitada: cantidad,
          cantidad_cargada: 0,
          cargado: false,
        });
      }

      // Recalculate pedido total
      const { data: allDet } = await supabase.from("pedidos_detalles").select("subtotal, cantidad, producto:producto_id(peso_kg)").eq("pedido_id", pedidoId);
      const newTotal = (allDet || []).reduce((s: number, d: any) => s + d.subtotal, 0);
      const newPeso = (allDet || []).reduce((s: number, d: any) => s + (d.cantidad * (d.producto?.peso_kg || 0)), 0);

      await supabase.from("pedidos").update({
        total: newTotal,
        peso_total_kg: newPeso > 0 ? newPeso : null,
      }).eq("id", pedidoId);

      toast.success(`${productoSeleccionado.nombre} agregado al pedido ${pedidoFolio}`);
      onProductoAgregado();
      onOpenChange(false);
      setProductoSeleccionado(null);
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agregar producto — {pedidoFolio}</DialogTitle>
        </DialogHeader>

        {!productoSeleccionado ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input placeholder="Buscar producto..." value={busqueda} onChange={e => setBusqueda(e.target.value)} onKeyDown={e => e.key === "Enter" && buscarProductos()} className="h-10" />
              <Button onClick={buscarProductos} disabled={buscando} className="h-10 shrink-0">
                {buscando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
            {resultados.length > 0 && (
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-1">
                  {resultados.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted cursor-pointer border" onClick={() => seleccionarProducto(p)}>
                      <div>
                        <p className="text-sm font-medium">{p.nombre}</p>
                        <p className="text-xs text-muted-foreground">{p.codigo} · {formatCurrency(p.precio_venta)}{p.precio_por_kilo ? "/kg" : ""}</p>
                      </div>
                      <Plus className="h-4 w-4 text-primary shrink-0" />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border rounded-lg p-3 bg-muted/30">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{productoSeleccionado.nombre}</p>
                  <p className="text-xs text-muted-foreground">{productoSeleccionado.codigo} · {productoSeleccionado.unidad}</p>
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                    <span>Lista: {formatCurrency(productoSeleccionado.precio_venta)}</span>
                    <span>Mín: {formatCurrency(precioMinimo)}</span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setProductoSeleccionado(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Cantidad</label>
                <Input type="number" min="1" value={cantidad} onChange={e => setCantidad(parseFloat(e.target.value) || 0)} className="h-10 text-center font-semibold" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Precio unitario</label>
                <Input type="number" step="0.01" value={precio} onChange={e => setPrecio(parseFloat(e.target.value) || 0)} className={`h-10 text-center font-semibold ${belowMin ? "border-destructive" : ""}`} />
              </div>
            </div>

            {belowMin && (
              <div className="flex items-center gap-2 text-xs text-destructive">
                <AlertTriangle className="h-3.5 w-3.5" />
                Precio por debajo del mínimo ({formatCurrency(precioMinimo)})
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm text-muted-foreground">Subtotal:</span>
              <span className="text-lg font-bold">{formatCurrency(calcSubtotal())}</span>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          {productoSeleccionado && (
            <Button onClick={handleAgregar} disabled={saving || belowMin || cantidad <= 0}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Agregar al pedido
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
