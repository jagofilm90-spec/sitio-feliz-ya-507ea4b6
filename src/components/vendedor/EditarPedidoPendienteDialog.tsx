import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, CheckCircle2, AlertTriangle, X, Plus, Search, Download } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

interface DetallePedido {
  id: string;
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  producto: {
    nombre: string;
    codigo: string;
    unidad: string;
    peso_kg: number | null;
    precio_por_kilo: boolean;
    precio_venta: number;
    descuento_maximo: number | null;
  };
}

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
  folio: string;
  onSaved: () => void;
}

export const EditarPedidoPendienteDialog = ({ open, onOpenChange, pedidoId, folio, onSaved }: Props) => {
  const [detalles, setDetalles] = useState<DetallePedido[]>([]);
  const [editedQtys, setEditedQtys] = useState<Record<string, number>>({});
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Add product
  const [showBuscador, setShowBuscador] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState<ProductoBusqueda[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [nuevosProductos, setNuevosProductos] = useState<{ producto: ProductoBusqueda; cantidad: number; precio: number }[]>([]);

  useEffect(() => {
    if (open && pedidoId) loadDetalles();
  }, [open, pedidoId]);

  const loadDetalles = async () => {
    setLoading(true);
    setRemovedIds(new Set());
    setNuevosProductos([]);
    const { data } = await supabase
      .from("pedidos_detalles")
      .select(`
        id, producto_id, cantidad, precio_unitario, subtotal,
        producto:producto_id (nombre, codigo, unidad, peso_kg, precio_por_kilo, precio_venta, descuento_maximo)
      `)
      .eq("pedido_id", pedidoId);

    const all = (data || []) as unknown as DetallePedido[];
    setDetalles(all);
    const qtys: Record<string, number> = {};
    all.forEach(d => { qtys[d.id] = d.cantidad; });
    setEditedQtys(qtys);
    setLoading(false);
  };

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

  const agregarProducto = (prod: ProductoBusqueda) => {
    if (detalles.some(d => d.producto_id === prod.id && !removedIds.has(d.id))) {
      toast.error("Este producto ya está en el pedido");
      return;
    }
    if (nuevosProductos.some(n => n.producto.id === prod.id)) {
      toast.error("Ya lo agregaste");
      return;
    }
    setNuevosProductos(prev => [...prev, { producto: prod, cantidad: 1, precio: prod.precio_venta }]);
    setShowBuscador(false);
    setBusqueda("");
    setResultados([]);
  };

  const getPrecioMinimo = (precioVenta: number, descMax: number | null) => precioVenta - (descMax || 0);

  const isBelowMin = (precio: number, precioVenta: number, descMax: number | null) => precio < getPrecioMinimo(precioVenta, descMax);

  // Calculate totals
  const detallesActivos = detalles.filter(d => !removedIds.has(d.id));
  const totalExistentes = detallesActivos.reduce((sum, d) => {
    const qty = editedQtys[d.id] ?? d.cantidad;
    const precioPorKilo = d.producto?.precio_por_kilo || false;
    const pesoKg = d.producto?.peso_kg || 0;
    return sum + (precioPorKilo && pesoKg ? qty * pesoKg * d.precio_unitario : qty * d.precio_unitario);
  }, 0);
  const totalNuevos = nuevosProductos.reduce((sum, n) => {
    const precioPorKilo = n.producto.precio_por_kilo || false;
    const pesoKg = n.producto.peso_kg || 0;
    return sum + (precioPorKilo && pesoKg ? n.cantidad * pesoKg * n.precio : n.cantidad * n.precio);
  }, 0);
  const totalGeneral = totalExistentes + totalNuevos;

  const anyBelowMin = nuevosProductos.some(n => isBelowMin(n.precio, n.producto.precio_venta, n.producto.descuento_maximo));

  const handleGuardar = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Remove deleted products
      if (removedIds.size > 0) {
        await supabase.from("pedidos_detalles").delete().in("id", Array.from(removedIds));
      }

      // Update quantities for existing products
      for (const d of detallesActivos) {
        const newQty = editedQtys[d.id];
        if (newQty !== undefined && newQty !== d.cantidad) {
          const precioPorKilo = d.producto?.precio_por_kilo || false;
          const pesoKg = d.producto?.peso_kg || 0;
          const newSubtotal = precioPorKilo && pesoKg ? newQty * pesoKg * d.precio_unitario : newQty * d.precio_unitario;
          await supabase.from("pedidos_detalles").update({ cantidad: newQty, subtotal: newSubtotal }).eq("id", d.id);
        }
      }

      // Insert new products
      for (const n of nuevosProductos) {
        const precioPorKilo = n.producto.precio_por_kilo || false;
        const pesoKg = n.producto.peso_kg || 0;
        const subtotal = precioPorKilo && pesoKg ? n.cantidad * pesoKg * n.precio : n.cantidad * n.precio;
        const descuento = n.producto.precio_venta - n.precio;
        const requiereAuth = descuento > (n.producto.descuento_maximo || 0);

        await supabase.from("pedidos_detalles").insert({
          pedido_id: pedidoId,
          producto_id: n.producto.id,
          cantidad: n.cantidad,
          precio_unitario: n.precio,
          subtotal,
          notas_ajuste: requiereAuth ? `[PENDIENTE REVISIÓN] Descuento: ${formatCurrency(descuento)}` : null,
        });
      }

      // Recalculate pedido totals
      const { data: allDet } = await supabase.from("pedidos_detalles").select("subtotal, cantidad, producto:producto_id(peso_kg)").eq("pedido_id", pedidoId);
      const newTotal = (allDet || []).reduce((s: number, d: any) => s + d.subtotal, 0);
      const newPeso = (allDet || []).reduce((s: number, d: any) => s + (d.cantidad * (d.producto?.peso_kg || 0)), 0);

      const newStatus = anyBelowMin ? "por_autorizar" : "pendiente";

      // Get existing notas
      const { data: pedidoData } = await supabase.from("pedidos").select("notas").eq("id", pedidoId).single();
      const notasActuales = pedidoData?.notas || "";
      const notaEdicion = `[EDITADO EN OFICINA] por vendedor el ${new Date().toLocaleDateString("es-MX")}`;

      await supabase.from("pedidos").update({
        total: newTotal,
        peso_total_kg: newPeso > 0 ? newPeso : null,
        status: newStatus as any,
        notas: notasActuales.includes("[EDITADO EN OFICINA]") ? notasActuales : `${notaEdicion}\n${notasActuales}`.trim(),
      }).eq("id", pedidoId);

      // Notify admin
      try {
        const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user?.id || "").single();
        await supabase.from("notificaciones").insert({
          tipo: "pedido_autorizado",
          titulo: `✏️ Pedido ${folio} editado`,
          descripcion: `${profile?.full_name || "Vendedor"} editó el pedido. ${removedIds.size > 0 ? `${removedIds.size} producto(s) eliminado(s). ` : ""}${nuevosProductos.length > 0 ? `${nuevosProductos.length} producto(s) agregado(s). ` : ""}Nuevo total: ${formatCurrency(newTotal)}`,
          pedido_id: pedidoId,
          leida: false,
        });
        await supabase.functions.invoke("send-push-notification", {
          body: { roles: ["admin"], title: `✏️ ${folio} editado por vendedor`, body: `Nuevo total: ${formatCurrency(newTotal)}` }
        }).catch(() => {});
      } catch {}

      if (anyBelowMin) {
        toast.success("Pedido editado — enviado para autorización de precios");
      } else {
        toast.success("Pedido editado — listo para surtir");
        // Download updated PDF
        try {
          const { generarNotaInternaPDF } = await import("@/lib/generarNotaPDF");
          const { data: ped } = await supabase.from("pedidos").select("total, termino_credito, sucursal:cliente_sucursales(nombre, direccion), vendedor:profiles!pedidos_vendedor_id_fkey(full_name), cliente:clientes(nombre)").eq("id", pedidoId).single();
          const { data: det } = await supabase.from("pedidos_detalles").select("cantidad, precio_unitario, subtotal, producto:productos(nombre, unidad, peso_kg, precio_por_kilo)").eq("pedido_id", pedidoId);
          const productos = (det || []).map((d: any) => {
            const pesoKg = d.producto?.peso_kg || 0;
            return { cantidad: d.cantidad, unidad: d.producto?.unidad || "pza", descripcion: d.producto?.nombre || "Producto", pesoTotal: pesoKg > 0 ? d.cantidad * pesoKg : null, precioUnitario: d.precio_unitario, importe: d.subtotal, precioPorKilo: d.producto?.precio_por_kilo || false };
          });
          const suc = ped?.sucursal as any;
          const pdf = await generarNotaInternaPDF({
            pedidoId, folio, fecha: new Date().toISOString(),
            vendedor: (ped?.vendedor as any)?.full_name || "Vendedor",
            terminoCredito: ped?.termino_credito || "Contado",
            cliente: { nombre: (ped?.cliente as any)?.nombre || "Cliente" },
            sucursal: suc ? { nombre: suc.nombre, direccion: suc.direccion } : undefined,
            productos, subtotal: newTotal, iva: 0, ieps: 0, total: newTotal,
            pesoTotalKg: newPeso,
          });
          const link = document.createElement("a");
          link.href = `data:application/pdf;base64,${pdf.base64}`;
          link.download = pdf.filename;
          link.click();
        } catch (e) { console.error("Error generando PDF:", e); }
      }

      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar pedido — {folio}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <div className="space-y-4">
            {/* Existing products */}
            <div className="space-y-2">
              <p className="text-sm font-semibold">Productos del pedido</p>
              {detallesActivos.length === 0 && nuevosProductos.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Sin productos</p>
              )}
              {detallesActivos.map(d => {
                const qty = editedQtys[d.id] ?? d.cantidad;
                const changed = qty !== d.cantidad;
                const precioPorKilo = d.producto?.precio_por_kilo || false;
                const pesoKg = d.producto?.peso_kg || 0;
                const subtotal = precioPorKilo && pesoKg ? qty * pesoKg * d.precio_unitario : qty * d.precio_unitario;
                return (
                  <Card key={d.id} className={changed ? "border-amber-300" : ""}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">{d.producto?.nombre}</p>
                          <p className="text-xs text-muted-foreground">{d.producto?.codigo} · {d.producto?.unidad} · {formatCurrency(d.precio_unitario)}{precioPorKilo ? "/kg" : "/u"}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => setRemovedIds(prev => new Set([...prev, d.id]))}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <Input type="number" min="1" value={qty} onChange={e => setEditedQtys(prev => ({ ...prev, [d.id]: parseFloat(e.target.value) || 0 }))} className="h-8 w-20 text-center text-sm" />
                        <span className="text-xs text-muted-foreground">{d.producto?.unidad}</span>
                        {changed && <Badge className="text-[10px] bg-amber-500">Modificado</Badge>}
                        <span className="ml-auto font-bold text-sm">{formatCurrency(subtotal)}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {/* New products */}
              {nuevosProductos.map((n, i) => {
                const precioPorKilo = n.producto.precio_por_kilo || false;
                const pesoKg = n.producto.peso_kg || 0;
                const subtotal = precioPorKilo && pesoKg ? n.cantidad * pesoKg * n.precio : n.cantidad * n.precio;
                const belowMin = isBelowMin(n.precio, n.producto.precio_venta, n.producto.descuento_maximo);
                return (
                  <Card key={`new-${i}`} className="border-green-300 bg-green-50/30 dark:bg-green-950/10">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <Badge className="text-[10px] bg-green-600">Nuevo</Badge>
                            <p className="font-semibold text-sm">{n.producto.nombre}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">{n.producto.codigo} · Lista: {formatCurrency(n.producto.precio_venta)} · Mín: {formatCurrency(getPrecioMinimo(n.producto.precio_venta, n.producto.descuento_maximo))}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => setNuevosProductos(prev => prev.filter((_, j) => j !== i))}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Input type="number" min="1" value={n.cantidad} onChange={e => setNuevosProductos(prev => prev.map((p, j) => j === i ? { ...p, cantidad: parseFloat(e.target.value) || 0 } : p))} className="h-8 w-16 text-center text-sm" />
                        <span className="text-xs text-muted-foreground">{n.producto.unidad} ×</span>
                        <Input type="number" step="0.01" value={n.precio} onChange={e => setNuevosProductos(prev => prev.map((p, j) => j === i ? { ...p, precio: parseFloat(e.target.value) || 0 } : p))} className={`h-8 w-24 text-center text-sm ${belowMin ? "border-destructive" : ""}`} />
                        {belowMin && <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />}
                        <span className="ml-auto font-bold text-sm">{formatCurrency(subtotal)}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Add product */}
            {!showBuscador ? (
              <Button variant="outline" className="w-full" onClick={() => setShowBuscador(true)}>
                <Plus className="h-4 w-4 mr-2" /> Agregar producto
              </Button>
            ) : (
              <Card>
                <CardContent className="p-3 space-y-2">
                  <div className="flex gap-2">
                    <Input placeholder="Buscar producto..." value={busqueda} onChange={e => setBusqueda(e.target.value)} onKeyDown={e => e.key === "Enter" && buscarProductos()} className="h-9" />
                    <Button size="sm" onClick={buscarProductos} disabled={buscando} className="h-9 shrink-0">
                      {buscando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setShowBuscador(false); setBusqueda(""); setResultados([]); }} className="h-9 shrink-0">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {resultados.length > 0 && (
                    <ScrollArea className="max-h-[200px]">
                      <div className="space-y-1">
                        {resultados.map(p => (
                          <div key={p.id} className="flex items-center justify-between p-2 rounded hover:bg-muted cursor-pointer" onClick={() => agregarProducto(p)}>
                            <div>
                              <p className="text-sm font-medium">{p.nombre}</p>
                              <p className="text-xs text-muted-foreground">{p.codigo} · {formatCurrency(p.precio_venta)}</p>
                            </div>
                            <Plus className="h-4 w-4 text-primary" />
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Total */}
            <div className="flex items-center justify-between pt-3 border-t">
              <span className="text-muted-foreground">Nuevo total:</span>
              <span className="text-xl font-bold">{formatCurrency(totalGeneral)}</span>
            </div>

            {anyBelowMin && (
              <div className="border border-amber-300 rounded-lg p-2.5 bg-amber-50 dark:bg-amber-950/30 text-sm text-amber-800 dark:text-amber-200">
                <AlertTriangle className="h-4 w-4 inline mr-1" />
                Hay productos con precio bajo mínimo. El pedido se enviará para autorización.
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleGuardar} disabled={saving || loading || (detallesActivos.length === 0 && nuevosProductos.length === 0)}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
            {anyBelowMin ? "Guardar y enviar a autorización" : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
