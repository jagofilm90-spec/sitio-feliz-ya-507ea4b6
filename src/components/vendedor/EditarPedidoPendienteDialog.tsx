import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2, AlertTriangle, X, Plus, MapPin, Calendar, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { calcularTotalesConImpuestos } from "@/lib/calculos";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface DetallePedido {
  id: string;
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  producto: { nombre: string; codigo: string; unidad: string; peso_kg: number | null; precio_por_kilo: boolean; precio_venta: number; descuento_maximo: number | null; };
}

interface ProductoCatalogo {
  id: string;
  nombre: string;
  codigo: string;
  unidad: string;
  peso_kg: number | null;
  precio_por_kilo: boolean;
  precio_venta: number;
  descuento_maximo: number | null;
}

interface PedidoInfo {
  folio: string;
  fecha_pedido: string;
  cliente_nombre: string;
  direccion: string;
  zona: string;
}

interface NuevoProducto {
  producto: ProductoCatalogo;
  cantidad: number;
  precio: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedidoId: string;
  folio: string;
  onSaved: () => void;
  preciosDisabled?: boolean;
}

const getPrecioMinimo = (pv: number, dm: number | null) => pv - (dm || 0);
const isBelowMin = (precio: number, pv: number, dm: number | null) => precio < getPrecioMinimo(pv, dm);

const calcSubtotal = (qty: number, precio: number, precioPorKilo: boolean, pesoKg: number | null) => {
  return precioPorKilo && pesoKg ? qty * pesoKg * precio : qty * precio;
};

export const EditarPedidoPendienteDialog = ({ open, onOpenChange, pedidoId, folio, onSaved, preciosDisabled = false }: Props) => {
  const [pedidoInfo, setPedidoInfo] = useState<PedidoInfo | null>(null);
  const [detalles, setDetalles] = useState<DetallePedido[]>([]);
  const [editedQtys, setEditedQtys] = useState<Record<string, number>>({});
  const [editedPrices, setEditedPrices] = useState<Record<string, number>>({});
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [terminoCredito, setTerminoCredito] = useState("contado");

  const [catalogo, setCatalogo] = useState<ProductoCatalogo[]>([]);
  const [filtro, setFiltro] = useState("");
  const [loadingCatalogo, setLoadingCatalogo] = useState(false);
  const [nuevos, setNuevos] = useState<NuevoProducto[]>([]);

  useEffect(() => {
    if (open && pedidoId) { loadDetalles(); loadCatalogo(); }
  }, [open, pedidoId]);

  const loadDetalles = async () => {
    setLoading(true);
    setRemovedIds(new Set());
    setNuevos([]);

    // Pedido info
    const { data: ped } = await supabase.from("pedidos")
      .select("folio, fecha_pedido, termino_credito, cliente:clientes(nombre), sucursal:cliente_sucursales(direccion, zona:zonas(nombre))")
      .eq("id", pedidoId).single();
    if (ped) {
      setPedidoInfo({
        folio: ped.folio, fecha_pedido: ped.fecha_pedido,
        cliente_nombre: (ped.cliente as any)?.nombre || "Cliente",
        direccion: (ped.sucursal as any)?.direccion || "",
        zona: (ped.sucursal as any)?.zona?.nombre || "",
      });
      setTerminoCredito(ped.termino_credito || "contado");
    }

    // Detalles
    const { data } = await supabase.from("pedidos_detalles")
      .select("id, producto_id, cantidad, precio_unitario, subtotal, producto:producto_id (nombre, codigo, unidad, peso_kg, precio_por_kilo, precio_venta, descuento_maximo)")
      .eq("pedido_id", pedidoId);

    const all = (data || []) as unknown as DetallePedido[];
    setDetalles(all);
    const qtys: Record<string, number> = {};
    const prices: Record<string, number> = {};
    all.forEach(d => { qtys[d.id] = d.cantidad; prices[d.id] = d.precio_unitario; });
    setEditedQtys(qtys);
    setEditedPrices(prices);
    setLoading(false);
  };

  const loadCatalogo = async () => {
    setLoadingCatalogo(true);
    const { data } = await supabase.from("productos")
      .select("id, nombre, codigo, unidad, peso_kg, precio_por_kilo, precio_venta, descuento_maximo")
      .eq("activo", true).order("nombre").limit(200);
    setCatalogo((data || []) as ProductoCatalogo[]);
    setLoadingCatalogo(false);
  };

  const agregarProducto = (prod: ProductoCatalogo) => {
    if (detalles.some(d => d.producto_id === prod.id && !removedIds.has(d.id))) { toast.error("Ya está en el pedido"); return; }
    if (nuevos.some(n => n.producto.id === prod.id)) { toast.error("Ya lo agregaste"); return; }
    setNuevos(prev => [...prev, { producto: prod, cantidad: 1, precio: prod.precio_venta }]);
    toast.success(`${prod.nombre} agregado`);
  };

  // Calculations
  const detallesActivos = detalles.filter(d => !removedIds.has(d.id));
  const totalExistentes = detallesActivos.reduce((sum, d) => {
    const qty = editedQtys[d.id] ?? d.cantidad;
    const precio = editedPrices[d.id] ?? d.precio_unitario;
    return sum + calcSubtotal(qty, precio, d.producto?.precio_por_kilo || false, d.producto?.peso_kg);
  }, 0);
  const totalNuevos = nuevos.reduce((sum, n) => sum + calcSubtotal(n.cantidad, n.precio, n.producto.precio_por_kilo, n.producto.peso_kg), 0);
  const totalGeneral = totalExistentes + totalNuevos;

  const anyBelowMin = [
    ...detallesActivos.map(d => isBelowMin(editedPrices[d.id] ?? d.precio_unitario, d.producto?.precio_venta || 0, d.producto?.descuento_maximo)),
    ...nuevos.map(n => isBelowMin(n.precio, n.producto.precio_venta, n.producto.descuento_maximo)),
  ].some(Boolean);

  const pesoTotal = detallesActivos.reduce((s, d) => s + (editedQtys[d.id] ?? d.cantidad) * (d.producto?.peso_kg || 0), 0) +
    nuevos.reduce((s, n) => s + n.cantidad * (n.producto.peso_kg || 0), 0);

  // Filtered catalog
  const catalogoFiltrado = catalogo.filter(p => {
    if (!filtro.trim()) return true;
    const q = filtro.toLowerCase();
    return p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q);
  });

  const handleGuardar = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Apply DB changes: delete, update, insert
      if (removedIds.size > 0) await supabase.from("pedidos_detalles").delete().in("id", Array.from(removedIds));

      for (const d of detallesActivos) {
        const newQty = editedQtys[d.id];
        const newPrice = editedPrices[d.id];
        const qtyChanged = newQty !== undefined && newQty !== d.cantidad;
        const priceChanged = newPrice !== undefined && newPrice !== d.precio_unitario;
        if (qtyChanged || priceChanged) {
          const qty = newQty ?? d.cantidad;
          const price = newPrice ?? d.precio_unitario;
          const sub = calcSubtotal(qty, price, d.producto?.precio_por_kilo || false, d.producto?.peso_kg);
          await supabase.from("pedidos_detalles").update({ cantidad: qty, precio_unitario: price, subtotal: sub }).eq("id", d.id);
        }
      }

      for (const n of nuevos) {
        const sub = calcSubtotal(n.cantidad, n.precio, n.producto.precio_por_kilo, n.producto.peso_kg);
        const descuento = n.producto.precio_venta - n.precio;
        const requiereAuth = descuento > (n.producto.descuento_maximo || 0);
        await supabase.from("pedidos_detalles").insert({
          pedido_id: pedidoId, producto_id: n.producto.id, cantidad: n.cantidad,
          precio_unitario: n.precio, subtotal: sub,
          notas_ajuste: requiereAuth ? `[PENDIENTE REVISIÓN] Descuento: ${formatCurrency(descuento)}` : null,
        });
      }

      // 2. Recalculate total, weight, and taxes FROM DB
      const { data: allDet } = await supabase
        .from("pedidos_detalles")
        .select("cantidad, subtotal, precio_unitario, producto:producto_id(peso_kg, precio_por_kilo, nombre, unidad, aplica_iva, aplica_ieps)")
        .eq("pedido_id", pedidoId);

      const taxItems = (allDet || []).map((d: any) => ({
        subtotal: d.subtotal || 0,
        aplica_iva: (d.producto as any)?.aplica_iva ?? true,
        aplica_ieps: (d.producto as any)?.aplica_ieps ?? false,
      }));
      const impuestos = calcularTotalesConImpuestos(taxItems);
      const realPeso = (allDet || []).reduce((s: number, d: any) => s + (d.cantidad * ((d.producto as any)?.peso_kg || 0)), 0);
      console.log("[EditarPedido] taxItems:", taxItems, "impuestos:", impuestos, "realPeso:", realPeso);

      const newStatus = anyBelowMin ? "por_autorizar" : "pendiente";
      const { data: pedidoData } = await supabase.from("pedidos").select("notas, cliente_id, termino_credito").eq("id", pedidoId).single();
      const notasActuales = pedidoData?.notas || "";
      const notaEdicion = `[EDITADO EN OFICINA] por vendedor el ${new Date().toLocaleDateString("es-MX")}`;

      const updatePayload = {
        total: impuestos.total,
        subtotal: impuestos.subtotal,
        impuestos: impuestos.iva + impuestos.ieps,
        peso_total_kg: realPeso > 0 ? realPeso : null,
        termino_credito: terminoCredito as any,
        status: newStatus as any,
        notas: notasActuales.includes("[EDITADO EN OFICINA]") ? notasActuales : `${notaEdicion}\n${notasActuales}`.trim(),
      };
      console.log("[PEDIDO UPDATE] pedidoId:", pedidoId, "payload:", updatePayload);
      const { error: updateError } = await supabase.from("pedidos").update(updatePayload).eq("id", pedidoId);
      console.log("[PEDIDO UPDATE RESULT] error:", updateError);
      if (updateError) {
        toast.error("Error al actualizar pedido: " + updateError.message);
        setSaving(false);
        return;
      }
      // Verify the update took effect
      const { data: verificacion } = await supabase.from("pedidos").select("total, subtotal, impuestos").eq("id", pedidoId).single();
      console.log("[PEDIDO VERIFY] after update:", verificacion);

      // 3. Get vendor name + notify admin
      const { data: vendorProfile } = await supabase.from("profiles").select("full_name").eq("id", user?.id || "").single();
      const vendedorNombre = vendorProfile?.full_name || "Vendedor";
      try {
        await supabase.from("notificaciones").insert({ tipo: "pedido_autorizado", titulo: `✏️ Pedido ${folio} editado`, descripcion: `${vendedorNombre} editó el pedido. Nuevo total: ${formatCurrency(impuestos.total)}`, pedido_id: pedidoId, leida: false });
        await supabase.functions.invoke("send-push-notification", { body: { roles: ["admin"], title: `✏️ ${folio} editado`, body: `Nuevo total: ${formatCurrency(impuestos.total)}` } }).catch(() => {});
      } catch {}

      // 4. Build products list for PDF from DB data
      const productosForPdf = (allDet || []).map((d: any) => {
        const prod = d.producto as any;
        const pk = prod?.peso_kg || 0;
        return { cantidad: d.cantidad, unidad: prod?.unidad || "pza", descripcion: prod?.nombre || "Producto", pesoTotal: pk > 0 ? d.cantidad * pk : null, precioUnitario: d.precio_unitario, importe: d.subtotal, precioPorKilo: prod?.precio_por_kilo || false };
      });

      if (!anyBelowMin) {
        toast.success("Pedido editado — descargando nueva hoja de carga...");

        // 5. BUG FIX: Send email to client with updated PDF
        try {
          const { generarConfirmacionClientePDF, generarNotaInternaPDF } = await import("@/lib/generarNotaPDF");

          // Get client email
          const clienteId = pedidoData?.cliente_id;
          let clienteEmail: string | null = null;
          if (clienteId) {
            const { data: cli } = await supabase.from("clientes").select("email, nombre").eq("id", clienteId).single();
            clienteEmail = cli?.email;
          }

          // Generate PDFs
          const pdfData = {
            pedidoId, folio, fecha: new Date().toISOString(), vendedor: vendedorNombre,
            terminoCredito: ({ contado: "Contado", "8_dias": "8 días", "15_dias": "15 días", "30_dias": "30 días", "60_dias": "60 días" } as Record<string,string>)[terminoCredito] || terminoCredito || "Contado",
            cliente: { nombre: pedidoInfo?.cliente_nombre || "Cliente" },
            sucursal: pedidoInfo?.direccion ? { nombre: pedidoInfo.zona || "Principal", direccion: pedidoInfo.direccion } : undefined,
            productos: productosForPdf, subtotal: impuestos.subtotal, iva: impuestos.iva, ieps: impuestos.ieps, total: impuestos.total, pesoTotalKg: realPeso,
          };

          // Download internal PDF (nota + hoja de carga)
          const pdf = await generarNotaInternaPDF(pdfData);
          const link = document.createElement("a"); link.href = `data:application/pdf;base64,${pdf.base64}`; link.download = pdf.filename; link.click();

          // Send client email with confirmation PDF
          if (clienteEmail) {
            const cpdf = await generarConfirmacionClientePDF(pdfData);
            await supabase.functions.invoke("send-order-authorized-email", {
              body: {
                clienteEmail,
                clienteNombre: pedidoInfo?.cliente_nombre || "Cliente",
                pedidoFolio: folio,
                total: impuestos.total,
                ajustesPrecio: 0,
                detalles: productosForPdf.map(p => ({
                  producto: p.descripcion, cantidad: p.cantidad, unidad: p.unidad,
                  precioUnitario: p.precioUnitario, subtotal: p.importe, fueAjustado: false,
                  kgTotales: p.pesoTotal, precioPorKilo: p.precioPorKilo,
                })),
                pdfBase64: cpdf.base64,
                pdfFilename: cpdf.filename,
              },
            });
          }
        } catch (e) { console.error("Error PDF/email:", e); }
      } else {
        toast.success("Pedido editado — enviado para autorización");
      }

      onOpenChange(false);
      setTimeout(() => onSaved(), 500);
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-lg">Editar Pedido</DialogTitle>
          {pedidoInfo && (
            <div className="space-y-1 pt-1">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xl font-black">{pedidoInfo.folio}</span>
                <span className="text-base font-semibold">{pedidoInfo.cliente_nombre}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {pedidoInfo.direccion && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{pedidoInfo.direccion}</span>}
                {pedidoInfo.zona && <Badge variant="outline" className="text-[10px]">{pedidoInfo.zona}</Badge>}
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(pedidoInfo.fecha_pedido), "d MMM yyyy", { locale: es })}</span>
                <Select value={terminoCredito} onValueChange={setTerminoCredito}>
                  <SelectTrigger className="h-6 w-auto text-xs gap-1">
                    <CreditCard className="h-3 w-3" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contado">Contado</SelectItem>
                    <SelectItem value="8_dias">8 días</SelectItem>
                    <SelectItem value="15_dias">15 días</SelectItem>
                    <SelectItem value="30_dias">30 días</SelectItem>
                    <SelectItem value="60_dias">60 días</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <div className="flex-1 overflow-hidden flex gap-4" style={{ minHeight: 0 }}>
            {/* LEFT: Products table */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <p className="text-sm font-semibold mb-2">Productos del pedido ({detallesActivos.length + nuevos.length})</p>
              <ScrollArea className="flex-1 border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs w-[70px]">Cant.</TableHead>
                      <TableHead className="text-xs w-[60px]">Unidad</TableHead>
                      <TableHead className="text-xs">Producto</TableHead>
                      <TableHead className="text-xs w-[70px]">Peso</TableHead>
                      <TableHead className="text-xs w-[90px]">Precio U.</TableHead>
                      <TableHead className="text-xs text-right w-[80px]">Total</TableHead>
                      <TableHead className="w-[32px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detallesActivos.map(d => {
                      const qty = editedQtys[d.id] ?? d.cantidad;
                      const precio = editedPrices[d.id] ?? d.precio_unitario;
                      const pk = d.producto?.precio_por_kilo || false;
                      const pesoKg = d.producto?.peso_kg || 0;
                      const peso = pesoKg > 0 ? qty * pesoKg : 0;
                      const sub = calcSubtotal(qty, precio, d.producto?.precio_por_kilo || false, d.producto?.peso_kg);
                      const below = isBelowMin(precio, d.producto?.precio_venta || 0, d.producto?.descuento_maximo);
                      return (
                        <TableRow key={d.id}>
                          <TableCell><Input type="number" min="1" value={qty} onChange={e => setEditedQtys(prev => ({ ...prev, [d.id]: parseFloat(e.target.value) || 0 }))} className="h-7 w-16 text-xs text-center" /></TableCell>
                          <TableCell className="text-xs text-muted-foreground">{d.producto?.unidad}</TableCell>
                          <TableCell className="text-xs font-medium">{d.producto?.nombre}</TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono">{peso > 0 ? `${peso.toFixed(1)}` : "—"}</TableCell>
                          <TableCell><Input type="number" step="0.01" value={precio} onChange={e => setEditedPrices(prev => ({ ...prev, [d.id]: parseFloat(e.target.value) || 0 }))} className={`h-7 w-20 text-xs text-center ${below ? "border-destructive" : ""} ${preciosDisabled ? "opacity-60" : ""}`} disabled={preciosDisabled} /></TableCell>
                          <TableCell className="text-xs text-right font-bold">{formatCurrency(sub)}</TableCell>
                          <TableCell><Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setRemovedIds(prev => new Set([...prev, d.id]))}><X className="h-3 w-3" /></Button></TableCell>
                        </TableRow>
                      );
                    })}
                    {nuevos.map((n, i) => {
                      const pesoKg = n.producto.peso_kg || 0;
                      const peso = pesoKg > 0 ? n.cantidad * pesoKg : 0;
                      const sub = calcSubtotal(n.cantidad, n.precio, n.producto.precio_por_kilo, n.producto.peso_kg);
                      const below = isBelowMin(n.precio, n.producto.precio_venta, n.producto.descuento_maximo);
                      return (
                        <TableRow key={`n-${i}`} className="bg-green-50/50">
                          <TableCell><Input type="number" min="1" value={n.cantidad} onChange={e => setNuevos(prev => prev.map((p, j) => j === i ? { ...p, cantidad: parseFloat(e.target.value) || 0 } : p))} className="h-7 w-16 text-xs text-center" /></TableCell>
                          <TableCell className="text-xs text-muted-foreground">{n.producto.unidad}</TableCell>
                          <TableCell className="text-xs font-medium"><Badge className="text-[9px] bg-green-600 mr-1">Nuevo</Badge>{n.producto.nombre}</TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono">{peso > 0 ? `${peso.toFixed(1)}` : "—"}</TableCell>
                          <TableCell><Input type="number" step="0.01" value={n.precio} onChange={e => setNuevos(prev => prev.map((p, j) => j === i ? { ...p, precio: parseFloat(e.target.value) || 0 } : p))} className={`h-7 w-20 text-xs text-center ${below ? "border-destructive" : ""} ${preciosDisabled ? "opacity-60" : ""}`} disabled={preciosDisabled} /></TableCell>
                          <TableCell className="text-xs text-right font-bold">{formatCurrency(sub)}</TableCell>
                          <TableCell><Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setNuevos(prev => prev.filter((_, j) => j !== i))}><X className="h-3 w-3" /></Button></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>

              {/* Totals */}
              <div className="flex items-center justify-between pt-3 border-t mt-2">
                <div className="text-xs text-muted-foreground">{Math.round(pesoTotal).toLocaleString()} kg</div>
                <div className="text-right">
                  <span className="text-muted-foreground text-sm mr-3">Total:</span>
                  <span className="text-xl font-bold">{formatCurrency(totalGeneral)}</span>
                </div>
              </div>

              {anyBelowMin && (
                <div className="border border-amber-300 rounded p-2 bg-amber-50 text-xs text-amber-800 mt-2">
                  <AlertTriangle className="h-3.5 w-3.5 inline mr-1" />
                  Hay precios bajo mínimo — se enviará para autorización.
                </div>
              )}
            </div>

            {/* RIGHT: Product catalog */}
            <div className="w-[280px] shrink-0 flex flex-col overflow-hidden border rounded-lg">
              <div className="p-2 border-b">
                <p className="text-xs font-semibold mb-1.5">Catálogo de productos</p>
                <Input placeholder="Filtrar..." value={filtro} onChange={e => setFiltro(e.target.value)} className="h-8 text-xs" />
              </div>
              <ScrollArea className="flex-1">
                {loadingCatalogo ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : (
                  <div className="p-1">
                    {catalogoFiltrado.map(p => (
                      <div key={p.id} className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-xs" onClick={() => agregarProducto(p)}>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{p.nombre}</p>
                          <p className="text-[10px] text-muted-foreground">{p.unidad} · {formatCurrency(p.precio_venta)}</p>
                        </div>
                        <Plus className="h-3.5 w-3.5 text-primary shrink-0 ml-1" />
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        )}

        <DialogFooter className="shrink-0 flex-col gap-2 sm:flex-row pt-3 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleGuardar} disabled={saving || loading || (detallesActivos.length === 0 && nuevos.length === 0)}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
            {anyBelowMin ? "Guardar y enviar a autorización" : "Guardar y descargar hoja"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
