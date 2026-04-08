import { useState, useMemo } from "react";
import { AlmasaLoading } from "@/components/brand/AlmasaLoading";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Pencil, Search, History, ChevronLeft, ChevronRight, DollarSign,
  TrendingUp, TrendingDown, Minus, Save, Check, Package, Calculator, Percent,
  Download, FileText, AlertTriangle, ChevronDown, ChevronUp, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { redondear } from "@/lib/calculos";
import { useListaPrecios, getProductDisplayName, formatCurrency } from "@/hooks/useListaPrecios";
import { usePrecioEditor } from "@/hooks/usePrecioEditor";
import { usePrecioHistorial } from "@/hooks/usePrecioHistorial";
import { PrecioHistorialDialog } from "@/components/precios/PrecioHistorialDialog";
import { generarListaPreciosPDF } from "@/utils/listaPreciosPdfGenerator";

export const SecretariaListaPreciosTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);

  // Shared hooks
  const {
    filteredProductos,
    productosPorCategoria,
    categorias,
    isLoading,
    searchTerm, setSearchTerm,
    categoriaFilter, setCategoriaFilter,
  } = useListaPrecios();

  const editor = usePrecioEditor({
    notifyRoles: ['admin', 'secretaria', 'vendedor'],
    productList: filteredProductos,
  });

  const historial = usePrecioHistorial();

  // ==================== REVISIONES PENDIENTES ====================
  const [reviewPanelOpen, setReviewPanelOpen] = useState(true);
  const [parcialPrecio, setParcialPrecio] = useState<Record<string, string>>({});
  const [parcialMode, setParcialMode] = useState<Record<string, boolean>>({});

  const { data: revisionesPendientes = [], refetch: refetchRevisiones } = useQuery({
    queryKey: ["revisiones-precio-pendientes-sec"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("productos_revision_precio")
        .select("*, productos:producto_id(id, codigo, nombre, unidad, precio_por_kilo, peso_kg)")
        .in("status", ["pendiente", "parcial"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const applyReviewMutation = useMutation({
    mutationFn: async ({ reviewId, productoId, nuevoPrecio, tipo }: { reviewId: string; productoId: string; nuevoPrecio: number; tipo: 'completado' | 'parcial' | 'ignorado' }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      if (tipo !== 'ignorado') {
        const { data: prodData } = await supabase.from("productos").select("precio_venta").eq("id", productoId).single();
        const precioAnterior = prodData?.precio_venta ?? 0;
        await supabase.from("productos").update({ precio_venta: nuevoPrecio }).eq("id", productoId);
        if (precioAnterior !== nuevoPrecio) {
          await supabase.from("productos_historial_precios").insert({
            producto_id: productoId, precio_anterior: precioAnterior, precio_nuevo: nuevoPrecio, usuario_id: user.id,
          });
        }
      }

      const review = revisionesPendientes.find((r: any) => r.id === reviewId);
      const pendienteRestante = tipo === 'parcial' && review ? redondear(review.precio_venta_sugerido - nuevoPrecio) : 0;

      await (supabase as any).from("productos_revision_precio").update({
        status: tipo,
        ajuste_aplicado: tipo !== 'ignorado' ? redondear(nuevoPrecio - (review?.precio_venta_actual || 0)) : 0,
        pendiente_ajuste: pendienteRestante,
        resuelto_por: user.id,
        resuelto_at: new Date().toISOString(),
      }).eq("id", reviewId);
    },
    onSuccess: (_, vars) => {
      const msg = vars.tipo === 'completado' ? "Precio actualizado" : vars.tipo === 'parcial' ? "Precio parcialmente actualizado" : "Revisión pospuesta";
      toast({ title: msg });
      queryClient.invalidateQueries({ queryKey: ["lista-precios"] });
      refetchRevisiones();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // ==================== PDF ====================
  const handleDownloadPdf = async (version: "cliente" | "interno") => {
    setPdfDialogOpen(false);
    await generarListaPreciosPDF({
      productos: filteredProductos,
      version,
      categoriaFilter: categoriaFilter !== "all" ? categoriaFilter : null,
    });
  };

  if (isLoading) {
    return (
      <AlmasaLoading size={48} />
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="pb-3 border-b bg-background sticky top-0 z-20 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Lista de Precios</h2>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">{filteredProductos.length} productos</p>
            <Button size="sm" variant="outline" className="h-8" onClick={() => setPdfDialogOpen(true)}>
              <Download className="h-3.5 w-3.5 mr-1" /> PDF
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código, nombre o marca..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
          <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
            <SelectTrigger className="w-full sm:w-[180px] h-9">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categorias.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Review Panel */}
      {revisionesPendientes.length > 0 && (
        <Collapsible open={reviewPanelOpen} onOpenChange={setReviewPanelOpen}>
          <div className="my-2 border border-orange-300 dark:border-orange-700 rounded-lg overflow-hidden">
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950/30 cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-950/50">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-semibold text-orange-800 dark:text-orange-300">
                    {revisionesPendientes.length} producto(s) con ajuste de precio pendiente
                  </span>
                </div>
                {reviewPanelOpen ? <ChevronUp className="h-4 w-4 text-orange-600" /> : <ChevronDown className="h-4 w-4 text-orange-600" />}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-3 space-y-3 max-h-[400px] overflow-auto">
                {revisionesPendientes.map((rev: any) => {
                  const prod = rev.productos;
                  const isParcialMode = parcialMode[rev.id];
                  const margenInput = parseFloat(parcialPrecio[rev.id] || '') || 0;
                  return (
                    <div key={rev.id} className="p-3 border rounded-lg bg-background space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-sm">{prod?.nombre || 'Producto'}</span>
                          <span className="text-xs text-muted-foreground ml-2">{prod?.codigo}</span>
                        </div>
                        {rev.status === 'parcial' && <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-[10px]">Parcial</Badge>}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div><span className="text-muted-foreground">Costo:</span> <span className="font-medium">{formatCurrency(rev.costo_anterior)}→{formatCurrency(rev.costo_nuevo)}</span></div>
                        <div><span className="text-muted-foreground">Precio actual:</span> <span className="font-medium">{formatCurrency(rev.precio_venta_actual)}</span></div>
                        <div><span className="text-muted-foreground">Sugerido:</span> <span className="font-semibold text-orange-600">{formatCurrency(rev.precio_venta_sugerido)}</span></div>
                        <div><span className="text-muted-foreground">Pendiente:</span> <span className="font-medium">+{formatCurrency(rev.pendiente_ajuste)}</span></div>
                      </div>

                      {isParcialMode ? (
                        <div className="flex items-center gap-2">
                          <Label className="text-xs shrink-0">Precio a aplicar:</Label>
                          <div className="relative flex-1">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                            <Input type="number" step="0.01" className="pl-6 h-8 text-xs" value={parcialPrecio[rev.id] || ''} onChange={e => setParcialPrecio(p => ({ ...p, [rev.id]: e.target.value }))} />
                          </div>
                          <Button size="sm" className="h-8 text-xs" disabled={!margenInput || applyReviewMutation.isPending}
                            onClick={() => applyReviewMutation.mutate({ reviewId: rev.id, productoId: rev.producto_id, nuevoPrecio: margenInput, tipo: 'parcial' })}>
                            Aplicar
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setParcialMode(p => ({ ...p, [rev.id]: false }))}>Cancelar</Button>
                        </div>
                      ) : (
                        <div className="flex gap-2 flex-wrap">
                          <Button size="sm" className="h-7 text-xs" disabled={applyReviewMutation.isPending}
                            onClick={() => applyReviewMutation.mutate({ reviewId: rev.id, productoId: rev.producto_id, nuevoPrecio: rev.precio_venta_sugerido, tipo: 'completado' })}>
                            <Check className="h-3 w-3 mr-1" /> Aplicar completo
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs"
                            onClick={() => { setParcialMode(p => ({ ...p, [rev.id]: true })); setParcialPrecio(p => ({ ...p, [rev.id]: rev.precio_venta_actual.toString() })); }}>
                            Aplicar parcial
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" disabled={applyReviewMutation.isPending}
                            onClick={() => applyReviewMutation.mutate({ reviewId: rev.id, productoId: rev.producto_id, nuevoPrecio: 0, tipo: 'ignorado' })}>
                            <Clock className="h-3 w-3 mr-1" /> Después
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      )}

      {filteredProductos.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No se encontraron productos</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block flex-1 overflow-auto">
            <Table className="table-fixed w-full">
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[55px] py-2 px-1.5 text-[10px]">Código</TableHead>
                  <TableHead className="py-2 px-1.5 text-[10px]">Producto</TableHead>
                  <TableHead className="w-[100px] py-2 px-1.5 text-[10px] text-right">Precio</TableHead>
                  <TableHead className="w-[90px] py-2 px-1.5 text-[10px] text-right">Descuento</TableHead>
                  <TableHead className="w-[50px] py-2 px-1 text-[10px] text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productosPorCategoria.map(([categoria, prods]) => (
                  <>
                    <TableRow key={`cat-${categoria}`} className="bg-muted/60 hover:bg-muted/60">
                      <TableCell colSpan={5} className="py-1.5 px-2 font-bold text-[11px] uppercase tracking-wider text-muted-foreground">
                        ═══ {categoria} ({prods.length}) ═══
                      </TableCell>
                    </TableRow>
                    {prods.map((producto) => (
                      <TableRow key={producto.id} className="h-8 hover:bg-muted/30">
                        <TableCell className="py-1 px-2 text-[10px] font-mono text-muted-foreground">
                          {producto.codigo}
                        </TableCell>
                        <TableCell className="py-1 px-2">
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-xs">{getProductDisplayName(producto)}</span>
                            {producto.es_promocion && (
                              <Badge variant="secondary" className="text-[8px] px-1 py-0 h-4 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 shrink-0">
                                PROMO
                              </Badge>
                            )}
                            {producto.bloqueado_venta && (
                              <span className="text-[8px] text-red-600 dark:text-red-400 shrink-0" title="Requiere autorización">🔒</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-1 px-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <span className="font-semibold text-xs">
                              {formatCurrency(producto.precio_venta)}{producto.precio_por_kilo && '/kg'}
                            </span>
                            {producto.aplica_iva && (
                              <Badge variant="outline" className="text-[7px] px-1 py-0 h-3.5 border-blue-300 text-blue-600 dark:border-blue-700 dark:text-blue-400">IVA</Badge>
                            )}
                            {producto.aplica_ieps && (
                              <Badge variant="outline" className="text-[7px] px-1 py-0 h-3.5 border-orange-300 text-orange-600 dark:border-orange-700 dark:text-orange-400">IEPS</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-1 px-2 text-right">
                          {producto.descuento_maximo && producto.descuento_maximo > 0 ? (
                            <span className="text-[10px] font-medium">
                              <span className="text-emerald-600 dark:text-emerald-400">-${producto.descuento_maximo.toFixed(0)}</span>
                              <span className="text-muted-foreground mx-0.5">→</span>
                              <span className="text-amber-600 dark:text-amber-400 font-semibold">
                                {formatCurrency(producto.precio_venta - producto.descuento_maximo)}
                              </span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="py-1 px-1 text-center">
                          <div className="flex items-center justify-center gap-0.5">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0"
                              onClick={() => historial.openHistorial(producto)} title="Ver historial">
                              <History className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0"
                              onClick={() => editor.openEditor(producto)} title="Editar precio">
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile view */}
          <div className="md:hidden flex-1 overflow-auto">
            {productosPorCategoria.map(([categoria, prods]) => (
              <div key={categoria}>
                <div className="sticky top-0 bg-muted/90 backdrop-blur-sm py-1 px-3 border-b z-10">
                  <span className="font-semibold text-[10px] uppercase tracking-wide text-muted-foreground">
                    {categoria} ({prods.length})
                  </span>
                </div>
                {prods.map((producto) => (
                  <div key={producto.id} className="flex justify-between items-center py-1.5 px-3 border-b hover:bg-muted/30">
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="text-sm leading-tight">
                        {getProductDisplayName(producto)}
                        {producto.es_promocion && (
                          <Badge variant="secondary" className="text-[8px] px-1 py-0 h-4 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 ml-1 shrink-0 inline-flex">
                            PROMO
                          </Badge>
                        )}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{producto.codigo}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right shrink-0">
                        <p className="font-bold text-sm">{formatCurrency(producto.precio_venta)}{producto.precio_por_kilo && '/kg'}</p>
                        {producto.descuento_maximo && producto.descuento_maximo > 0 && (
                          <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                            → {formatCurrency(producto.precio_venta - producto.descuento_maximo)}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => historial.openHistorial(producto)}>
                          <History className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => editor.openEditor(producto)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Edit Price Dialog */}
      <Dialog open={editor.editDialogOpen} onOpenChange={editor.setEditDialogOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md overflow-x-hidden">
          {/* Navigation */}
          {editor.editingProduct && filteredProductos.length > 1 && (
            <div className="flex items-center justify-between border-b pb-3 -mt-2 mb-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => editor.handleNavigate('prev')}
                disabled={editor.currentIndex <= 0 || editor.isPending}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
              </Button>
              <span className="text-xs text-muted-foreground font-mono">
                {editor.currentIndex + 1} de {filteredProductos.length}
              </span>
              <Button type="button" variant="ghost" size="sm" onClick={() => editor.handleNavigate('next')}
                disabled={editor.currentIndex >= filteredProductos.length - 1 || editor.isPending}>
                Siguiente <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}

          <DialogHeader>
            <DialogTitle>Editar Precio</DialogTitle>
            <DialogDescription>
              {editor.editingProduct && (
                <span className="font-medium text-foreground">
                  {editor.editingProduct.codigo} - {getProductDisplayName(editor.editingProduct)}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Calculator toggle */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="modo-calculadora" className="text-sm font-medium">Calculadora de Margen</Label>
              </div>
              <Switch id="modo-calculadora" checked={editor.modoCalculadora} onCheckedChange={editor.setModoCalculadora} />
            </div>

            {/* Calculator section */}
            {editor.modoCalculadora && editor.editingProduct && (
              <div className="p-3 bg-muted/30 rounded-lg border space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <DollarSign className="h-4 w-4" /> Costos de Referencia
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Costo Promedio</p>
                    <p className="font-mono font-semibold">
                      {editor.editingProduct.costo_promedio_ponderado
                        ? formatCurrency(editor.editingProduct.costo_promedio_ponderado)
                        : <span className="text-muted-foreground">Sin datos</span>}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Último Costo</p>
                    <p className="font-mono font-semibold">
                      {editor.editingProduct.ultimo_costo_compra
                        ? formatCurrency(editor.editingProduct.ultimo_costo_compra)
                        : <span className="text-muted-foreground">Sin datos</span>}
                    </p>
                  </div>
                </div>

                {(editor.editingProduct.costo_promedio_ponderado || editor.editingProduct.ultimo_costo_compra) && (
                  <>
                    <div className="flex items-center gap-3 pt-2 border-t">
                      <span className="text-xs text-muted-foreground">Usar como base:</span>
                      <div className="flex items-center gap-2">
                        <Button type="button" variant={editor.usarCostoPromedio ? "default" : "outline"} size="sm" className="h-7 text-xs"
                          onClick={() => editor.setUsarCostoPromedio(true)} disabled={!editor.editingProduct.costo_promedio_ponderado}>
                          Promedio
                        </Button>
                        <Button type="button" variant={!editor.usarCostoPromedio ? "default" : "outline"} size="sm" className="h-7 text-xs"
                          onClick={() => editor.setUsarCostoPromedio(false)} disabled={!editor.editingProduct.ultimo_costo_compra}>
                          Último
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t">
                      <Label htmlFor="margen" className="text-xs">Margen de Utilidad (%)</Label>
                      <div className="relative">
                        <Input id="margen" type="number" step="0.1" min="0" max="100" className="pr-8"
                          value={editor.margenPorcentaje}
                          onChange={(e) => {
                            const margen = e.target.value;
                            editor.setMargenPorcentaje(margen);
                            const costoBase = editor.usarCostoPromedio
                              ? editor.editingProduct!.costo_promedio_ponderado
                              : editor.editingProduct!.ultimo_costo_compra;
                            if (costoBase && margen) {
                              const margenDecimal = parseFloat(margen) / 100;
                              const precioConMargen = costoBase * (1 + margenDecimal);
                              const descuento = parseFloat(editor.descuentoMaximo) || 0;
                              editor.setPrecioVenta((precioConMargen + descuento).toFixed(2));
                            }
                          }}
                          placeholder="10"
                        />
                        <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      </div>

                      {editor.margenPorcentaje && (() => {
                        const costoBase = editor.usarCostoPromedio
                          ? editor.editingProduct!.costo_promedio_ponderado
                          : editor.editingProduct!.ultimo_costo_compra;
                        if (!costoBase) return null;
                        const margenDecimal = parseFloat(editor.margenPorcentaje) / 100;
                        const precioConMargen = costoBase * (1 + margenDecimal);
                        const descuento = parseFloat(editor.descuentoMaximo) || 0;
                        const precioFinal = precioConMargen + descuento;
                        return (
                          <div className="text-xs space-y-1 p-2 bg-background rounded border">
                            <div className="flex justify-between"><span className="text-muted-foreground">Costo base:</span><span className="font-mono">{formatCurrency(costoBase)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">+ Margen {editor.margenPorcentaje}%:</span><span className="font-mono">{formatCurrency(costoBase * margenDecimal)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">= Precio con margen:</span><span className="font-mono font-medium">{formatCurrency(precioConMargen)}</span></div>
                            {descuento > 0 && <div className="flex justify-between"><span className="text-muted-foreground">+ Colchón descuento:</span><span className="font-mono">{formatCurrency(descuento)}</span></div>}
                            <div className="flex justify-between border-t pt-1 mt-1"><span className="font-medium">= Precio de Lista:</span><span className="font-mono font-bold text-primary">{formatCurrency(precioFinal)}</span></div>
                          </div>
                        );
                      })()}
                    </div>
                  </>
                )}

                {!editor.editingProduct.costo_promedio_ponderado && !editor.editingProduct.ultimo_costo_compra && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">Este producto no tiene costos registrados. Usa el modo manual.</p>
                )}
              </div>
            )}

            {/* Price input */}
            <div className="space-y-2">
              <Label htmlFor="precio_venta">
                Precio de Venta *
                {editor.modoCalculadora && editor.margenPorcentaje && <span className="text-xs text-muted-foreground ml-2">(calculado)</span>}
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input id="precio_venta" type="number" step="0.01" min="0"
                  className={cn("pl-7 text-lg font-mono", editor.modoCalculadora && editor.margenPorcentaje && "bg-muted/50")}
                  value={editor.precioVenta}
                  onChange={(e) => { editor.setPrecioVenta(e.target.value); if (editor.modoCalculadora) editor.setMargenPorcentaje(""); }}
                  placeholder="0.00"
                />
              </div>
              {editor.editingProduct?.precio_por_kilo && <p className="text-xs text-muted-foreground">Este producto se vende por kilo</p>}
            </div>

            {/* Discount input */}
            <div className="space-y-2">
              <Label htmlFor="descuento_maximo">Descuento Máximo Autorizado ($)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input id="descuento_maximo" type="number" step="0.01" min="0" className="pl-7"
                  value={editor.descuentoMaximo}
                  onChange={(e) => {
                    editor.setDescuentoMaximo(e.target.value);
                    if (editor.modoCalculadora && editor.margenPorcentaje && editor.editingProduct) {
                      const costoBase = editor.usarCostoPromedio
                        ? editor.editingProduct.costo_promedio_ponderado
                        : editor.editingProduct.ultimo_costo_compra;
                      if (costoBase) {
                        const margenDecimal = parseFloat(editor.margenPorcentaje) / 100;
                        const precioConMargen = costoBase * (1 + margenDecimal);
                        editor.setPrecioVenta((precioConMargen + (parseFloat(e.target.value) || 0)).toFixed(2));
                      }
                    }
                  }}
                  placeholder="0.00"
                />
              </div>
              <p className="text-xs text-muted-foreground">El vendedor puede aplicar descuentos hasta este monto sin autorización</p>
            </div>

            {/* Floor price summary */}
            {editor.precioVenta && editor.descuentoMaximo && parseFloat(editor.descuentoMaximo) > 0 && (
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-sm text-primary">
                  Precio mínimo sin autorización: <strong>{formatCurrency(parseFloat(editor.precioVenta) - parseFloat(editor.descuentoMaximo))}</strong>
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={editor.closeEditor}>Cerrar</Button>
            <Button
              onClick={() => editor.handleSave()}
              disabled={editor.isPending}
              variant={(editor.isSaved || editor.showSuccessAnimation) ? "outline" : "default"}
              className={cn(
                "transition-all duration-300 ease-out min-w-[140px]",
                (editor.isSaved || editor.showSuccessAnimation) && "border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20",
                editor.showSuccessAnimation && "animate-success-pulse bg-green-50 dark:bg-green-950/30"
              )}
            >
              <span className="flex items-center justify-center">
                {editor.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> :
                  (editor.isSaved || editor.showSuccessAnimation) ? <Check className={cn("h-4 w-4 mr-2 text-green-500", editor.showSuccessAnimation && "animate-check-bounce")} /> :
                    <Save className="h-4 w-4 mr-2" />}
                <span>{editor.isPending ? "Guardando..." : (editor.isSaved || editor.showSuccessAnimation) ? "Guardado" : "Guardar Cambios"}</span>
              </span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <PrecioHistorialDialog
        open={historial.historialDialogOpen}
        onOpenChange={historial.setHistorialDialogOpen}
        productInfo={historial.selectedProductInfo}
        historial={historial.historialPrecios}
        isLoading={historial.isLoadingHistorial}
      />

      {/* PDF Dialog */}
      <Dialog open={pdfDialogOpen} onOpenChange={setPdfDialogOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" /> Descargar PDF
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-start h-auto py-3" onClick={() => handleDownloadPdf("cliente")}>
              <div className="text-left">
                <p className="font-medium text-sm">Para Cliente</p>
                <p className="text-xs text-muted-foreground">Solo código, producto, unidad y precio</p>
              </div>
            </Button>
            <Button variant="outline" className="w-full justify-start h-auto py-3" onClick={() => handleDownloadPdf("interno")}>
              <div className="text-left">
                <p className="font-medium text-sm">Uso Interno</p>
                <p className="text-xs text-muted-foreground">Incluye descuento máximo y precio mínimo</p>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
