import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  CheckCircle2, Loader2, Scale, Trash2, Timer, Package, ArrowDown, ArrowUp, Truck, User,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface PedidoEnCola {
  pedidoId: string;
  folio: string;
  clienteNombre: string;
  clienteId: string;
}

interface ProductoHoja {
  cargaProductoId: string;
  pedidoDetalleId: string;
  pedidoFolio: string;
  clienteNombre: string;
  entregaId: string;
  productoId: string;
  codigo: string;
  nombre: string;
  unidad: string;
  pesoKgUnit: number | null;
  precioPorKilo: boolean;
  cantidadSolicitada: number;
  cantidadACargar: number;
  pesoRealKg: number | null;
  loteId: string | null;
  lotesDisponibles: {
    id: string;
    lote_referencia: string | null;
    cantidad_disponible: number;
    bodega_nombre: string | null;
  }[];
  eliminado: boolean;
}

interface PersonalInfo {
  choferNombre: string;
  ayudantesNombres: string[];
  vehiculoNombre: string;
  vehiculoPlaca: string;
}

interface CargaHojaInteractivaProps {
  rutaId: string;
  rutaFolio: string;
  pedidos: PedidoEnCola[];
  tiempoSeg: number;
  formatTiempo: (s: number) => string;
  onFinalizar: () => void;
  onCancelar: () => void;
  cancelling: boolean;
  personal?: PersonalInfo;
}

export const CargaHojaInteractiva = ({
  rutaId, rutaFolio, pedidos, tiempoSeg, formatTiempo, onFinalizar, onCancelar, cancelling, personal,
}: CargaHojaInteractivaProps) => {
  const [productos, setProductos] = useState<ProductoHoja[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load all products for all pedidos
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const allProducts: ProductoHoja[] = [];

      for (const ped of pedidos) {
        // Get or create entrega
        let { data: entrega } = await supabase
          .from("entregas").select("id").eq("pedido_id", ped.pedidoId).eq("ruta_id", rutaId).limit(1).maybeSingle();

        if (!entrega) {
          const { data: newE } = await supabase.from("entregas")
            .insert({ pedido_id: ped.pedidoId, ruta_id: rutaId, orden_entrega: pedidos.indexOf(ped) + 1 })
            .select("id").single();
          entrega = newE;
        }
        if (!entrega) continue;

        // Get or create carga_productos
        let { data: cargaProds } = await supabase
          .from("carga_productos")
          .select("id, pedido_detalle_id, cantidad_solicitada, cantidad_cargada, cargado, lote_id, peso_real_kg")
          .eq("entrega_id", entrega.id);

        if (!cargaProds || cargaProds.length === 0) {
          const { data: detalles } = await supabase
            .from("pedidos_detalles").select("id, cantidad").eq("pedido_id", ped.pedidoId);

          if (detalles && detalles.length > 0) {
            const { data: insertados } = await supabase.from("carga_productos")
              .insert(detalles.map(d => ({
                entrega_id: entrega!.id, pedido_detalle_id: d.id,
                cantidad_solicitada: d.cantidad, cantidad_cargada: 0, cargado: false,
              })))
              .select("id, pedido_detalle_id, cantidad_solicitada, cantidad_cargada, cargado, lote_id, peso_real_kg");
            cargaProds = insertados;
          }
        }

        // Enrich with product info
        for (const cp of cargaProds || []) {
          const { data: detalle } = await supabase
            .from("pedidos_detalles")
            .select("producto:productos(id, codigo, nombre, peso_kg, unidad, precio_por_kilo)")
            .eq("id", cp.pedido_detalle_id).single();

          const prod = (detalle?.producto as any) || { id: "", codigo: "N/A", nombre: "N/A", peso_kg: null, unidad: "unidad", precio_por_kilo: false };

          const { data: lotes } = await supabase
            .from("inventario_lotes")
            .select("id, lote_referencia, cantidad_disponible, bodega_id, bodega:bodegas(nombre)")
            .eq("producto_id", prod.id).gt("cantidad_disponible", 0)
            .order("fecha_caducidad", { ascending: true, nullsFirst: false });

          allProducts.push({
            cargaProductoId: cp.id,
            pedidoDetalleId: cp.pedido_detalle_id,
            pedidoFolio: ped.folio,
            clienteNombre: ped.clienteNombre,
            entregaId: entrega.id,
            productoId: prod.id,
            codigo: prod.codigo,
            nombre: prod.nombre,
            unidad: prod.unidad,
            pesoKgUnit: prod.peso_kg,
            precioPorKilo: prod.precio_por_kilo,
            cantidadSolicitada: cp.cantidad_solicitada,
            cantidadACargar: cp.cantidad_cargada || cp.cantidad_solicitada,
            pesoRealKg: cp.peso_real_kg,
            loteId: cp.lote_id || (lotes && lotes.length > 0 ? lotes[0].id : null),
            lotesDisponibles: (lotes || []).map(l => ({
              id: l.id, lote_referencia: l.lote_referencia,
              cantidad_disponible: l.cantidad_disponible,
              bodega_nombre: (l.bodega as any)?.nombre || null,
            })),
            eliminado: false,
          });
        }
      }

      setProductos(allProducts);
      setLoading(false);
    };
    load();
  }, [rutaId, pedidos]);

  // Weight calculations
  const productosActivos = productos.filter(p => !p.eliminado);
  const pesoTeorico = productosActivos.reduce((sum, p) => {
    if (p.pesoKgUnit) return sum + p.cantidadACargar * p.pesoKgUnit;
    return sum;
  }, 0);
  const pesoReal = productosActivos.reduce((sum, p) => {
    if (p.pesoRealKg != null) return sum + p.pesoRealKg;
    if (p.pesoKgUnit) return sum + p.cantidadACargar * p.pesoKgUnit;
    return sum;
  }, 0);
  const diferenciaPeso = pesoReal - pesoTeorico;

  const updateProducto = (idx: number, updates: Partial<ProductoHoja>) => {
    setProductos(prev => prev.map((p, i) => i === idx ? { ...p, ...updates } : p));
  };

  // Confirm and save all
  const handleConfirmarCarga = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      for (const prod of productosActivos) {
        if (!prod.loteId) {
          toast.error(`Selecciona lote para ${prod.codigo}`);
          setSaving(false);
          return;
        }

        // Decrement inventory
        await supabase.rpc("decrementar_lote", { p_lote_id: prod.loteId, p_cantidad: prod.cantidadACargar });

        // Record movement
        await supabase.from("inventario_movimientos").insert({
          producto_id: prod.productoId,
          tipo_movimiento: "salida",
          cantidad: prod.cantidadACargar,
          motivo: "Carga de pedido",
          lote_id: prod.loteId,
          referencia_id: prod.entregaId,
          usuario_id: user?.id,
        });

        // Update carga_productos
        await supabase.from("carga_productos").update({
          cargado: true,
          cantidad_cargada: prod.cantidadACargar,
          lote_id: prod.loteId,
          peso_real_kg: prod.pesoRealKg,
          cargado_en: new Date().toISOString(),
          cargado_por: user?.id,
        }).eq("id", prod.cargaProductoId);
      }

      // Delete removed products from DB
      const eliminados = productos.filter(p => p.eliminado);
      for (const del of eliminados) {
        await supabase.from("carga_productos").delete().eq("id", del.cargaProductoId);
      }

      // Confirm entregas
      const entregaIds = [...new Set(productosActivos.map(p => p.entregaId))];
      for (const eId of entregaIds) {
        await supabase.from("entregas").update({
          carga_confirmada: true,
          carga_confirmada_por: user?.id,
          carga_confirmada_en: new Date().toISOString(),
        }).eq("id", eId);
      }

      await onFinalizar();
    } catch (err: any) {
      console.error(err);
      toast.error("Error al confirmar carga: " + (err?.message || ""));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Group by pedido
  const pedidoGroups = pedidos.map(ped => ({
    ...ped,
    items: productos.map((p, idx) => ({ ...p, originalIdx: idx })).filter(p => p.pedidoFolio === ped.folio),
  }));

  return (
    <div className="space-y-4">
      {/* ─── Document-style Header ─── */}
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        {/* Top bar: Logo + Title + Folio */}
        <div className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-almasa-header.png" alt="ALMASA" className="h-7 w-auto brightness-200" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <div>
              <h1 className="text-base font-black uppercase tracking-tight">HOJA DE CARGA</h1>
              <p className="text-[10px] text-gray-400 uppercase">{format(new Date(), "EEEE d 'de' MMMM yyyy", { locale: es })}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-black">{rutaFolio}</p>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Timer className="h-3 w-3" />
              <span>{formatTiempo(tiempoSeg)}</span>
            </div>
          </div>
        </div>

        {/* Info grid: Chofer, Ayudantes, Vehículo, Pedidos */}
        <div className="grid grid-cols-2 md:grid-cols-4 text-sm divide-x divide-y divide-border">
          <div className="px-3 py-2">
            <p className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
              <User className="h-3 w-3" />Chofer
            </p>
            <p className="font-semibold truncate">{personal?.choferNombre || "—"}</p>
          </div>
          <div className="px-3 py-2">
            <p className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
              <User className="h-3 w-3" />Ayudantes
            </p>
            {personal?.ayudantesNombres && personal.ayudantesNombres.length > 0 ? (
              <p className="font-semibold truncate">{personal.ayudantesNombres.join(", ")}</p>
            ) : (
              <p className="text-muted-foreground text-xs">Sin ayudantes</p>
            )}
          </div>
          <div className="px-3 py-2">
            <p className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
              <Truck className="h-3 w-3" />Vehículo
            </p>
            <p className="font-semibold">
              Unidad {personal?.vehiculoNombre || "—"}
              {personal?.vehiculoPlaca && <span className="text-muted-foreground ml-1">({personal.vehiculoPlaca})</span>}
            </p>
          </div>
          <div className="px-3 py-2">
            <p className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
              <Package className="h-3 w-3" />Resumen
            </p>
            <p className="font-semibold">{productosActivos.length} productos · {pedidos.length} pedido{pedidos.length > 1 ? "s" : ""}</p>
          </div>
        </div>
      </div>

      {/* Cancel button */}
      <div className="flex justify-end">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={cancelling}>
              {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
              Cancelar Ruta
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar ruta {rutaFolio}?</AlertDialogTitle>
              <AlertDialogDescription>Se eliminará todo el progreso.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>No</AlertDialogCancel>
              <AlertDialogAction onClick={onCancelar} className="bg-destructive text-destructive-foreground">Sí, eliminar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Weight summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-xs text-muted-foreground">Peso Teórico</p>
            <p className="text-2xl font-bold">{pesoTeorico.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">kg</p>
          </CardContent>
        </Card>
        <Card className={diferenciaPeso === 0 ? "border-green-500/50" : Math.abs(diferenciaPeso) < pesoTeorico * 0.05 ? "border-amber-500/50" : "border-destructive/50"}>
          <CardContent className="py-3 text-center">
            <p className="text-xs text-muted-foreground">Peso Real</p>
            <p className="text-2xl font-bold">{pesoReal.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">kg</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-xs text-muted-foreground">Diferencia</p>
            <p className={`text-2xl font-bold flex items-center justify-center gap-1 ${diferenciaPeso > 0 ? "text-green-600" : diferenciaPeso < 0 ? "text-destructive" : ""}`}>
              {diferenciaPeso > 0 && <ArrowUp className="h-4 w-4" />}
              {diferenciaPeso < 0 && <ArrowDown className="h-4 w-4" />}
              {Math.abs(diferenciaPeso).toFixed(1)}
            </p>
            <p className="text-xs text-muted-foreground">kg</p>
          </CardContent>
        </Card>
      </div>

      {/* Product tables by pedido */}
      <ScrollArea className="max-h-[calc(100vh-500px)]">
        <div className="space-y-6">
          {pedidoGroups.map(group => (
            <div key={group.pedidoId}>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-sm font-bold">{group.folio}</Badge>
                <span className="text-sm text-muted-foreground">{group.clienteNombre}</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {group.items.filter(i => !i.eliminado).length} productos
                </span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Producto</TableHead>
                    <TableHead className="w-[80px] text-center">Solicitado</TableHead>
                    <TableHead className="w-[100px] text-center">Cantidad</TableHead>
                    <TableHead className="w-[100px] text-center">Peso KG</TableHead>
                    <TableHead className="w-[160px]">Lote</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.items.map(item => {
                    if (item.eliminado) return (
                      <TableRow key={item.cargaProductoId} className="opacity-30 line-through">
                        <TableCell colSpan={5}>{item.codigo} — {item.nombre}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600"
                            onClick={() => updateProducto(item.originalIdx, { eliminado: false })}>
                            ↩
                          </Button>
                        </TableCell>
                      </TableRow>
                    );

                    const pesoTeoricoItem = item.pesoKgUnit ? item.cantidadACargar * item.pesoKgUnit : null;

                    return (
                      <TableRow key={item.cargaProductoId}>
                        <TableCell>
                          <p className="font-medium text-sm">{item.codigo}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[180px]">{item.nombre}</p>
                        </TableCell>
                        <TableCell className="text-center font-medium">{item.cantidadSolicitada}</TableCell>
                        <TableCell className="text-center">
                          <Input type="number" inputMode="numeric"
                            value={item.cantidadACargar}
                            onChange={e => updateProducto(item.originalIdx, { cantidadACargar: parseFloat(e.target.value) || 0 })}
                            className="w-20 h-9 text-center mx-auto" />
                        </TableCell>
                        <TableCell className="text-center">
                          {item.precioPorKilo || item.pesoKgUnit ? (
                            <Input type="number" inputMode="decimal"
                              value={item.pesoRealKg ?? (pesoTeoricoItem?.toFixed(1) || "")}
                              onChange={e => updateProducto(item.originalIdx, { pesoRealKg: e.target.value ? parseFloat(e.target.value) : null })}
                              className="w-20 h-9 text-center mx-auto" />
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.lotesDisponibles.length > 0 ? (
                            <select value={item.loteId || ""}
                              onChange={e => updateProducto(item.originalIdx, { loteId: e.target.value })}
                              className="w-full h-9 rounded-md border bg-background px-2 text-xs">
                              {item.lotesDisponibles.map(l => (
                                <option key={l.id} value={l.id}>
                                  {l.lote_referencia || "Sin ref"} ({l.cantidad_disponible})
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-xs text-destructive">Sin lotes</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => updateProducto(item.originalIdx, { eliminado: true })}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Confirm button */}
      <Button onClick={handleConfirmarCarga} disabled={saving || productosActivos.length === 0}
        size="lg" className="w-full h-14 text-lg font-bold">
        {saving ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <CheckCircle2 className="h-5 w-5 mr-2" />}
        Confirmar Carga ({productosActivos.length} productos)
      </Button>
    </div>
  );
};
