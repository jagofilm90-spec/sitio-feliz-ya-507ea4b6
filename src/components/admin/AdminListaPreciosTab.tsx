import { useState, useMemo } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificarCambioPrecio } from "@/lib/notificarVendedores";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Loader2, Search, TrendingUp, TrendingDown, DollarSign, Download,
  AlertTriangle, CheckCircle2, XCircle, Calculator, Pencil,
  ArrowUpDown, ChevronDown, ChevronUp, Check, Clock, ListChecks, History, Minus, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { analizarMargen, simularPrecioPropuesto, calcularPrecioSugerido, redondear } from "@/lib/calculos";
import { ProductoPrecioCardMobile } from "./ProductoPrecioCardMobile";
import { exportToExcel } from "@/utils/exportData";
import { useListaPrecios, getProductDisplayName, formatCurrency, type ProductoConAnalisis } from "@/hooks/useListaPrecios";
import { usePrecioHistorial } from "@/hooks/usePrecioHistorial";
import { PrecioHistorialDialog } from "@/components/precios/PrecioHistorialDialog";
import { generarListaPreciosPDF } from "@/utils/listaPreciosPdfGenerator";

const getEstadoBadge = (estado: 'perdida' | 'critico' | 'bajo' | 'saludable') => {
  switch (estado) {
    case 'perdida':
      return (
        <Badge variant="destructive" className="text-[10px] px-2 py-0.5 flex items-center gap-1 font-bold animate-pulse">
          <XCircle className="h-3.5 w-3.5" /> PÉRDIDA
        </Badge>
      );
    case 'critico':
      return (
        <Badge className="text-[10px] px-1.5 py-0 bg-orange-500 hover:bg-orange-600 flex items-center gap-0.5">
          <AlertTriangle className="h-3 w-3" /> Crítico
        </Badge>
      );
    case 'bajo':
      return (
        <Badge className="text-[10px] px-1.5 py-0 bg-amber-500 hover:bg-amber-600 flex items-center gap-0.5">
          <TrendingDown className="h-3 w-3" /> Bajo
        </Badge>
      );
    case 'saludable':
      return (
        <Badge className="text-[10px] px-1.5 py-0 bg-green-600 hover:bg-green-700 flex items-center gap-0.5">
          <CheckCircle2 className="h-3 w-3" /> OK
        </Badge>
      );
  }
};

export const AdminListaPreciosTab = () => {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Shared hooks
  const listData = useListaPrecios({ includeAnalisis: true });
  const historial = usePrecioHistorial();

  const {
    productos, filteredProductos, productosPorCategoria, categorias, stats, isLoading,
    searchTerm, setSearchTerm,
    categoriaFilter, setCategoriaFilter,
    estadoFilter, setEstadoFilter,
    sortField, sortOrder, handleSort,
  } = listData;

  // Cast filtered to ProductoConAnalisis
  const filteredConAnalisis = filteredProductos as ProductoConAnalisis[];

  // ==================== SIMULATOR ====================
  const [simuladorOpen, setSimuladorOpen] = useState(false);
  const [simuladorProduct, setSimuladorProduct] = useState<ProductoConAnalisis | null>(null);
  const [precioPropuesto, setPrecioPropuesto] = useState("");

  // ==================== EDITOR ====================
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductoConAnalisis | null>(null);
  const [precioVenta, setPrecioVenta] = useState("");
  const [descuentoMaximo, setDescuentoMaximo] = useState("");

  // ==================== REVIEW PANEL ====================
  const [reviewPanelOpen, setReviewPanelOpen] = useState(true);
  const [parcialPrecio, setParcialPrecio] = useState<Record<string, string>>({});
  const [parcialMode, setParcialMode] = useState<Record<string, boolean>>({});

  // ==================== BULK UPDATE ====================
  const [bulkSheetOpen, setBulkSheetOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState<'margen' | 'incremento'>('margen');
  const [bulkFilter, setBulkFilter] = useState<string>("all");
  const [bulkMargen, setBulkMargen] = useState("");
  const [bulkDescuento, setBulkDescuento] = useState("");
  const [bulkIncremento, setBulkIncremento] = useState("");
  const [bulkTipo, setBulkTipo] = useState<'pesos' | 'porcentaje'>('porcentaje');
  const [bulkPreview, setBulkPreview] = useState<Array<{ id: string; nombre: string; precioActual: number; precioNuevo: number; cambio: number }>>([]);

  // PDF dialog
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);

  // ==================== QUERIES ====================
  const { data: revisionesPendientes = [], refetch: refetchRevisiones } = useQuery({
    queryKey: ["revisiones-precio-pendientes"],
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

  // ==================== MUTATIONS ====================
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
          const review = revisionesPendientes.find((r: any) => r.id === reviewId);
          notificarCambioPrecio({ productoNombre: review?.productos?.nombre || "", precioAnterior, precioNuevo: nuevoPrecio, roles: ['secretaria', 'vendedor'] });
        }
      }
      const review = revisionesPendientes.find((r: any) => r.id === reviewId);
      const pendienteRestante = tipo === 'parcial' && review ? redondear(review.precio_venta_sugerido - nuevoPrecio) : 0;
      await (supabase as any).from("productos_revision_precio").update({
        status: tipo, ajuste_aplicado: tipo !== 'ignorado' ? redondear(nuevoPrecio - (review?.precio_venta_actual || 0)) : 0,
        pendiente_ajuste: pendienteRestante, resuelto_por: user.id, resuelto_at: new Date().toISOString(),
      }).eq("id", reviewId);
    },
    onSuccess: (_, vars) => {
      toast({ title: vars.tipo === 'completado' ? "Precio actualizado" : vars.tipo === 'parcial' ? "Precio parcialmente actualizado" : "Revisión pospuesta" });
      queryClient.invalidateQueries({ queryKey: ["lista-precios"] });
      refetchRevisiones();
    },
    onError: (error: any) => toast({ title: "Error", description: error.message, variant: "destructive" }),
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async (items: Array<{ id: string; precioNuevo: number }>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");
      const currentPrices = new Map<string, number>();
      productos.forEach(p => currentPrices.set(p.id, p.precio_venta));
      let changedCount = 0;
      for (const item of items) {
        await supabase.from("productos").update({ precio_venta: item.precioNuevo }).eq("id", item.id);
        const precioAnterior = currentPrices.get(item.id) ?? 0;
        if (precioAnterior !== item.precioNuevo) {
          await supabase.from("productos_historial_precios").insert({
            producto_id: item.id, precio_anterior: precioAnterior, precio_nuevo: item.precioNuevo, usuario_id: user.id,
          });
          changedCount++;
        }
      }
      if (changedCount > 0) {
        try { await supabase.from("notificaciones").insert({ tipo: "precio_actualizado", titulo: "Precios actualizados en masa", descripcion: `Se actualizaron los precios de ${changedCount} productos`, leida: false }); } catch {}
        try { await supabase.functions.invoke("send-push-notification", { body: { roles: ["secretaria", "vendedor"], title: "Precios actualizados", body: `Se actualizaron los precios de ${changedCount} productos` } }); } catch {}
      }
      return items.length;
    },
    onSuccess: (count) => {
      toast({ title: `${count} productos actualizados` });
      queryClient.invalidateQueries({ queryKey: ["lista-precios"] });
      setBulkSheetOpen(false); setBulkPreview([]);
    },
    onError: (error: any) => toast({ title: "Error", description: error.message, variant: "destructive" }),
  });

  const updatePriceMutation = useMutation({
    mutationFn: async ({ id, precio_venta, descuento_maximo }: { id: string; precio_venta: number; descuento_maximo: number | null }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const precioAnterior = editingProduct?.precio_venta ?? 0;
      const { error } = await supabase.from("productos").update({ precio_venta, descuento_maximo }).eq("id", id);
      if (error) throw error;
      if (precioAnterior !== precio_venta) {
        await supabase.from("productos_historial_precios").insert({
          producto_id: id, precio_anterior: precioAnterior, precio_nuevo: precio_venta, usuario_id: user?.id ?? null,
        });
        notificarCambioPrecio({ productoNombre: editingProduct?.nombre || "", precioAnterior, precioNuevo: precio_venta, roles: ['secretaria', 'vendedor'] });
      }
    },
    onSuccess: () => {
      toast({ title: "Precio actualizado" });
      queryClient.invalidateQueries({ queryKey: ["lista-precios"] });
      setEditDialogOpen(false);
    },
    onError: (error: any) => toast({ title: "Error al actualizar", description: error.message, variant: "destructive" }),
  });

  // ==================== COMPUTED ====================
  const simulacionResult = useMemo(() => {
    if (!simuladorProduct || !precioPropuesto) return null;
    const precio = parseFloat(precioPropuesto);
    if (isNaN(precio)) return null;
    return simularPrecioPropuesto(simuladorProduct.analisis.costo_referencia, precio, simuladorProduct.descuento_maximo || 0, simuladorProduct.precio_venta);
  }, [simuladorProduct, precioPropuesto]);

  // ==================== HANDLERS ====================
  const openSimulador = (producto: ProductoConAnalisis) => {
    setSimuladorProduct(producto); setPrecioPropuesto(producto.precio_venta.toString()); setSimuladorOpen(true);
  };
  const openEditor = (producto: ProductoConAnalisis) => {
    setEditingProduct(producto); setPrecioVenta(producto.precio_venta.toString()); setDescuentoMaximo(producto.descuento_maximo?.toString() || ""); setEditDialogOpen(true);
  };
  const handleSaveEdit = () => {
    if (!editingProduct) return;
    const precio = parseFloat(precioVenta);
    if (isNaN(precio) || precio <= 0) { toast({ title: "Precio inválido", variant: "destructive" }); return; }
    updatePriceMutation.mutate({ id: editingProduct.id, precio_venta: precio, descuento_maximo: descuentoMaximo ? parseFloat(descuentoMaximo) : null });
  };

  const handleExportExcel = () => {
    const columns = [
      { key: "codigo", header: "Código" }, { key: "displayName", header: "Producto" },
      { key: "categoria", header: "Categoría" }, { key: "costo", header: "Costo" },
      { key: "precio_venta", header: "Precio" }, { key: "descuento_maximo", header: "Desc. Máx" },
      { key: "margen", header: "Margen %" }, { key: "iva_ieps", header: "IVA/IEPS" },
    ];
    const data = filteredConAnalisis.map(p => ({
      codigo: p.codigo, displayName: getProductDisplayName(p), categoria: p.categoria || "",
      costo: p.analisis.costo_referencia || 0, precio_venta: p.precio_venta,
      descuento_maximo: p.descuento_maximo || 0,
      margen: parseFloat(p.analisis.margen_porcentaje.toFixed(1)),
      iva_ieps: [p.aplica_iva && "IVA", p.aplica_ieps && "IEPS"].filter(Boolean).join("+") || "—",
    }));
    exportToExcel(data, "Lista_Precios_Admin", columns, "Precios");
  };

  const handleDownloadPdf = async (version: "cliente" | "interno") => {
    setPdfDialogOpen(false);
    await generarListaPreciosPDF({
      productos: filteredProductos, version,
      categoriaFilter: categoriaFilter !== "all" ? categoriaFilter : null,
    });
  };

  const calculateBulkPreview = () => {
    if (!productos) return;
    const filtered = bulkFilter === 'all' ? productos : productos.filter(p => p.categoria === bulkFilter);
    const preview = filtered.map(p => {
      let precioNuevo = p.precio_venta;
      if (bulkMode === 'margen') {
        const costo = p.costo_promedio_ponderado || p.ultimo_costo_compra || 0;
        const margen = parseFloat(bulkMargen) || 0;
        const desc = parseFloat(bulkDescuento) || 0;
        precioNuevo = costo > 0 ? redondear(costo * (1 + margen / 100) + desc) : p.precio_venta;
      } else {
        const inc = parseFloat(bulkIncremento) || 0;
        precioNuevo = bulkTipo === 'porcentaje' ? redondear(p.precio_venta * (1 + inc / 100)) : redondear(p.precio_venta + inc);
      }
      return { id: p.id, nombre: `${p.codigo} - ${p.nombre}`, precioActual: p.precio_venta, precioNuevo, cambio: redondear(((precioNuevo - p.precio_venta) / p.precio_venta) * 100) };
    }).filter(p => p.precioNuevo !== p.precioActual);
    setBulkPreview(preview);
  };

  if (isLoading) return <AlmasaLoading size={48} />;

  // ==================== REVIEW PANEL ====================
  function renderReviewPanel() {
    if (revisionesPendientes.length === 0) return null;
    return (
      <Collapsible open={reviewPanelOpen} onOpenChange={setReviewPanelOpen}>
        <div className="mb-4 border border-orange-300 dark:border-orange-700 rounded-lg overflow-hidden">
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
                        <Label className="text-xs shrink-0">Precio:</Label>
                        <div className="relative flex-1">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                          <Input type="number" step="0.01" className="pl-6 h-8 text-xs" value={parcialPrecio[rev.id] || ''} onChange={e => setParcialPrecio(p => ({...p, [rev.id]: e.target.value}))} />
                        </div>
                        <Button size="sm" className="h-8 text-xs" disabled={!margenInput || applyReviewMutation.isPending}
                          onClick={() => applyReviewMutation.mutate({ reviewId: rev.id, productoId: rev.producto_id, nuevoPrecio: margenInput, tipo: 'parcial' })}>Aplicar</Button>
                        <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setParcialMode(p => ({...p, [rev.id]: false}))}>Cancelar</Button>
                      </div>
                    ) : (
                      <div className="flex gap-2 flex-wrap">
                        <Button size="sm" className="h-7 text-xs" disabled={applyReviewMutation.isPending}
                          onClick={() => applyReviewMutation.mutate({ reviewId: rev.id, productoId: rev.producto_id, nuevoPrecio: rev.precio_venta_sugerido, tipo: 'completado' })}>
                          <Check className="h-3 w-3 mr-1" /> Aplicar completo
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs"
                          onClick={() => { setParcialMode(p => ({...p, [rev.id]: true})); setParcialPrecio(p => ({...p, [rev.id]: rev.precio_venta_actual.toString()})); }}>
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
    );
  }

  // ==================== BULK SHEET ====================
  function renderBulkSheet() {
    return (
      <Sheet open={bulkSheetOpen} onOpenChange={setBulkSheetOpen}>
        <SheetContent className="sm:max-w-lg overflow-auto">
          <SheetHeader>
            <SheetTitle>Actualización en Masa</SheetTitle>
            <SheetDescription>Ajustar precios de venta para múltiples productos</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            <div className="flex gap-2">
              <Button size="sm" variant={bulkMode === 'margen' ? 'default' : 'outline'} onClick={() => { setBulkMode('margen'); setBulkPreview([]); }}>Por margen %</Button>
              <Button size="sm" variant={bulkMode === 'incremento' ? 'default' : 'outline'} onClick={() => { setBulkMode('incremento'); setBulkPreview([]); }}>Por incremento</Button>
            </div>
            <div>
              <Label className="text-xs">Filtrar por categoría</Label>
              <Select value={bulkFilter} onValueChange={v => { setBulkFilter(v); setBulkPreview([]); }}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {categorias.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {bulkMode === 'margen' ? (
              <>
                <div><Label className="text-xs">Margen deseado %</Label><Input type="number" value={bulkMargen} onChange={e => setBulkMargen(e.target.value)} placeholder="15" className="h-9" /></div>
                <div><Label className="text-xs">Descuento máximo $</Label><Input type="number" value={bulkDescuento} onChange={e => setBulkDescuento(e.target.value)} placeholder="0" className="h-9" /></div>
              </>
            ) : (
              <div className="flex gap-2">
                <div className="flex-1"><Label className="text-xs">Incremento</Label><Input type="number" value={bulkIncremento} onChange={e => setBulkIncremento(e.target.value)} placeholder="10" className="h-9" /></div>
                <div><Label className="text-xs">Tipo</Label>
                  <Select value={bulkTipo} onValueChange={(v: any) => setBulkTipo(v)}>
                    <SelectTrigger className="h-9 w-24"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="porcentaje">%</SelectItem><SelectItem value="pesos">$</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <Button variant="outline" onClick={calculateBulkPreview} className="w-full">Calcular preview</Button>
            {bulkPreview.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold">{bulkPreview.length} productos con cambios:</div>
                <ScrollArea className="h-[250px] border rounded-lg">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead className="text-[10px]">Producto</TableHead>
                      <TableHead className="text-[10px] text-right">Actual</TableHead>
                      <TableHead className="text-[10px] text-right">Nuevo</TableHead>
                      <TableHead className="text-[10px] text-right">%</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {bulkPreview.map(p => (
                        <TableRow key={p.id}>
                          <TableCell className="text-[10px] py-1">{p.nombre}</TableCell>
                          <TableCell className="text-[10px] py-1 text-right">{formatCurrency(p.precioActual)}</TableCell>
                          <TableCell className="text-[10px] py-1 text-right font-medium">{formatCurrency(p.precioNuevo)}</TableCell>
                          <TableCell className={cn("text-[10px] py-1 text-right", p.cambio > 0 ? "text-green-600" : "text-red-600")}>{p.cambio > 0 ? '+' : ''}{p.cambio}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
                <Button className="w-full" disabled={bulkUpdateMutation.isPending}
                  onClick={() => bulkUpdateMutation.mutate(bulkPreview.map(p => ({ id: p.id, precioNuevo: p.precioNuevo })))}>
                  {bulkUpdateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ListChecks className="h-4 w-4 mr-2" />}
                  Aplicar a {bulkPreview.length} productos
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // ==================== DIALOGS ====================
  function renderDialogs() {
    return (
      <>
        {/* Simulator */}
        <Dialog open={simuladorOpen} onOpenChange={setSimuladorOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Calculator className="h-5 w-5" /> Simulador de Precio</DialogTitle>
              <DialogDescription>{simuladorProduct && getProductDisplayName(simuladorProduct)}</DialogDescription>
            </DialogHeader>
            {simuladorProduct && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 bg-muted rounded-lg"><div className="text-muted-foreground text-xs">Costo Ref.</div><div className="font-semibold">{formatCurrency(simuladorProduct.analisis.costo_referencia)}</div></div>
                  <div className="p-3 bg-muted rounded-lg"><div className="text-muted-foreground text-xs">Precio Lista</div><div className="font-semibold">{formatCurrency(simuladorProduct.precio_venta)}</div></div>
                </div>
                <div className="space-y-2">
                  <Label>Precio propuesto</Label>
                  <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input type="number" value={precioPropuesto} onChange={(e) => setPrecioPropuesto(e.target.value)} className="pl-7" step="0.01" /></div>
                </div>
                {simulacionResult && (
                  <div className={cn("p-4 rounded-lg border-2",
                    simulacionResult.es_perdida && "border-red-500 bg-red-50 dark:bg-red-950/20",
                    !simulacionResult.es_perdida && simulacionResult.margen_porcentaje < 5 && "border-orange-500 bg-orange-50 dark:bg-orange-950/20",
                    simulacionResult.margen_porcentaje >= 5 && "border-green-500 bg-green-50 dark:bg-green-950/20"
                  )}>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><div className="text-muted-foreground text-xs">Margen $</div><div className={cn("font-bold", simulacionResult.es_perdida ? "text-red-600" : "text-green-600")}>{formatCurrency(simulacionResult.margen_pesos)}</div></div>
                      <div><div className="text-muted-foreground text-xs">Margen %</div><div className={cn("font-bold", simulacionResult.es_perdida ? "text-red-600" : "text-green-600")}>{simulacionResult.margen_porcentaje}%</div></div>
                      {simulacionResult.diferencia_vs_lista > 0 && (
                        <div className="col-span-2"><div className="text-muted-foreground text-xs">Descuento vs lista</div>
                          <div className="flex items-center gap-2"><span className="font-medium">{formatCurrency(simulacionResult.diferencia_vs_lista)}</span>
                            {simulacionResult.requiere_autorizacion && <Badge variant="destructive" className="text-[10px]">Requiere autorización</Badge>}</div></div>
                      )}
                    </div>
                    {simulacionResult.es_perdida && (
                      <div className="mt-3 p-2 bg-red-100 dark:bg-red-900/30 rounded text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" /> Este precio genera pérdida
                      </div>
                    )}
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  <div className="font-medium mb-1">Precios sugeridos:</div>
                  <div className="flex flex-wrap gap-2">
                    {[5, 10, 15, 20].map(margen => {
                      const sugerido = calcularPrecioSugerido(simuladorProduct.analisis.costo_referencia, margen, 0);
                      return <Button key={margen} variant="outline" size="sm" className="text-xs h-7" onClick={() => setPrecioPropuesto(sugerido.toString())}>{margen}% → {formatCurrency(sugerido)}</Button>;
                    })}
                  </div>
                </div>
                {simulacionResult && <Separator />}
                {simulacionResult && (
                  <Button className="w-full" disabled={!simulacionResult || updatePriceMutation.isPending}
                    variant={simulacionResult?.es_perdida ? "destructive" : "default"}
                    onClick={() => { const precio = parseFloat(precioPropuesto); if (!simuladorProduct || isNaN(precio)) return;
                      updatePriceMutation.mutate({ id: simuladorProduct.id, precio_venta: precio, descuento_maximo: simuladorProduct.descuento_maximo }, { onSuccess: () => setSimuladorOpen(false) }); }}>
                    {updatePriceMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />} Aplicar este precio
                  </Button>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Editar Precio</DialogTitle>
              <DialogDescription>{editingProduct && getProductDisplayName(editingProduct)}</DialogDescription>
            </DialogHeader>
            {editingProduct && (
              <div className="space-y-4">
                <div className="space-y-2"><Label>Precio de venta</Label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input type="number" value={precioVenta} onChange={(e) => setPrecioVenta(e.target.value)} className="pl-7" step="0.01" /></div></div>
                <div className="space-y-2"><Label>Descuento máximo</Label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input type="number" value={descuentoMaximo} onChange={(e) => setDescuentoMaximo(e.target.value)} className="pl-7" step="0.01" placeholder="0.00" /></div></div>
                <Button onClick={handleSaveEdit} className="w-full" disabled={updatePriceMutation.isPending}>
                  {updatePriceMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Guardar
                </Button>
              </div>
            )}
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
            <DialogHeader><DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Descargar PDF</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start h-auto py-3" onClick={() => handleDownloadPdf("cliente")}>
                <div className="text-left"><p className="font-medium text-sm">Para Cliente</p><p className="text-xs text-muted-foreground">Solo código, producto, unidad y precio</p></div>
              </Button>
              <Button variant="outline" className="w-full justify-start h-auto py-3" onClick={() => handleDownloadPdf("interno")}>
                <div className="text-left"><p className="font-medium text-sm">Uso Interno</p><p className="text-xs text-muted-foreground">Incluye descuento máximo y precio mínimo</p></div>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // ==================== MOBILE VIEW ====================
  if (isMobile) {
    return (
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        <div className="pb-3 space-y-3 sticky top-0 bg-background z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-primary" /><h2 className="text-base font-semibold">Análisis de Precios</h2></div>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setPdfDialogOpen(true)}><Download className="h-3.5 w-3.5" /></Button>
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setBulkSheetOpen(true)}><ListChecks className="h-3.5 w-3.5 mr-1" /> En masa</Button>
            </div>
          </div>
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-2 pb-2">
              {stats.sinPrecio > 0 && (
                <Badge variant="outline" className={cn("text-xs cursor-pointer shrink-0", estadoFilter === 'sin_precio' && "bg-gray-100 dark:bg-gray-900/30")}
                  onClick={() => setEstadoFilter(estadoFilter === 'sin_precio' ? 'all' : 'sin_precio')}>
                  Sin precio: {stats.sinPrecio}
                </Badge>
              )}
              <Badge variant="outline" className={cn("text-xs cursor-pointer shrink-0", estadoFilter === 'perdida' && "bg-red-100 dark:bg-red-900/30")}
                onClick={() => setEstadoFilter(estadoFilter === 'perdida' ? 'all' : 'perdida')}>
                <XCircle className="h-3 w-3 mr-1 text-red-500" /> Pérdida: {stats.perdida}
              </Badge>
              <Badge variant="outline" className={cn("text-xs cursor-pointer shrink-0", estadoFilter === 'critico' && "bg-orange-100 dark:bg-orange-900/30")}
                onClick={() => setEstadoFilter(estadoFilter === 'critico' ? 'all' : 'critico')}>
                <AlertTriangle className="h-3 w-3 mr-1 text-orange-500" /> Crítico: {stats.critico}
              </Badge>
              <Badge variant="outline" className={cn("text-xs cursor-pointer shrink-0", estadoFilter === 'bajo' && "bg-amber-100 dark:bg-amber-900/30")}
                onClick={() => setEstadoFilter(estadoFilter === 'bajo' ? 'all' : 'bajo')}>
                <TrendingDown className="h-3 w-3 mr-1 text-amber-500" /> Bajo: {stats.bajo}
              </Badge>
              <Badge variant="outline" className={cn("text-xs cursor-pointer shrink-0", estadoFilter === 'saludable' && "bg-green-100 dark:bg-green-900/30")}
                onClick={() => setEstadoFilter(estadoFilter === 'saludable' ? 'all' : 'saludable')}>
                <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" /> OK: {stats.saludable}
              </Badge>
            </div><ScrollBar orientation="horizontal" />
          </ScrollArea>
          <div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8 h-9" /></div>
        </div>
        {stats.perdida > 0 && estadoFilter !== 'perdida' && (
          <div className="flex items-center justify-between p-2.5 mb-2 rounded-lg bg-red-100 dark:bg-red-950/40 border border-red-300 dark:border-red-800">
            <div className="flex items-center gap-1.5"><AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 animate-pulse" />
              <span className="text-xs font-semibold text-red-800 dark:text-red-300">{stats.perdida} a pérdida</span></div>
            <Button size="sm" variant="destructive" className="h-6 text-[10px] px-2" onClick={() => setEstadoFilter('perdida')}>Ver pérdidas</Button>
          </div>
        )}
        {renderReviewPanel()}
        <div className="flex-1 overflow-auto space-y-3 py-2">
          {filteredConAnalisis.length === 0 ? <div className="text-center py-8 text-muted-foreground">No se encontraron productos</div> :
            filteredConAnalisis.map((producto) => (
              <ProductoPrecioCardMobile key={producto.id} producto={producto}
                onSimular={openSimulador} onEditar={openEditor}
                onHistorial={(p) => historial.openHistorial(p)} />
            ))}
        </div>
        {renderDialogs()}{renderBulkSheet()}
      </div>
    );
  }

  // ==================== DESKTOP VIEW ====================
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="pb-3 border-b bg-background sticky top-0 z-20 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-primary" /><h2 className="text-lg font-semibold">Análisis de Precios y Márgenes</h2></div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setPdfDialogOpen(true)}><Download className="h-4 w-4 mr-1" /> PDF</Button>
            <Button size="sm" variant="outline" onClick={handleExportExcel}><Download className="h-4 w-4 mr-1" /> Excel</Button>
            <Button size="sm" variant="outline" onClick={() => setBulkSheetOpen(true)}><ListChecks className="h-4 w-4 mr-1" /> Actualizar en masa</Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-xs">Total: {stats.total}</Badge>
          {stats.sinPrecio > 0 && (
            <Badge variant="outline" className={cn("text-xs cursor-pointer", estadoFilter === 'sin_precio' && "bg-gray-100 dark:bg-gray-900/30")}
              onClick={() => setEstadoFilter(estadoFilter === 'sin_precio' ? 'all' : 'sin_precio')}>
              Sin precio: {stats.sinPrecio}
            </Badge>
          )}
          <Badge variant="outline" className={cn("text-xs cursor-pointer", estadoFilter === 'perdida' && "bg-red-100 dark:bg-red-900/30")}
            onClick={() => setEstadoFilter(estadoFilter === 'perdida' ? 'all' : 'perdida')}>
            <XCircle className="h-3 w-3 mr-1 text-red-500" /> Pérdida: {stats.perdida}
          </Badge>
          <Badge variant="outline" className={cn("text-xs cursor-pointer", estadoFilter === 'critico' && "bg-orange-100 dark:bg-orange-900/30")}
            onClick={() => setEstadoFilter(estadoFilter === 'critico' ? 'all' : 'critico')}>
            <AlertTriangle className="h-3 w-3 mr-1 text-orange-500" /> Crítico: {stats.critico}
          </Badge>
          <Badge variant="outline" className={cn("text-xs cursor-pointer", estadoFilter === 'bajo' && "bg-amber-100 dark:bg-amber-900/30")}
            onClick={() => setEstadoFilter(estadoFilter === 'bajo' ? 'all' : 'bajo')}>
            <TrendingDown className="h-3 w-3 mr-1 text-amber-500" /> Bajo: {stats.bajo}
          </Badge>
          <Badge variant="outline" className={cn("text-xs cursor-pointer", estadoFilter === 'saludable' && "bg-green-100 dark:bg-green-900/30")}
            onClick={() => setEstadoFilter(estadoFilter === 'saludable' ? 'all' : 'saludable')}>
            <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" /> OK: {stats.saludable}
          </Badge>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por código o nombre..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8 h-9" /></div>
          <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
            <SelectTrigger className="w-full sm:w-[160px] h-9"><SelectValue placeholder="Categoría" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todas</SelectItem>{categorias.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {stats.perdida > 0 && estadoFilter !== 'perdida' && (
        <div className="flex items-center justify-between p-3 mb-2 rounded-lg bg-red-100 dark:bg-red-950/40 border border-red-300 dark:border-red-800">
          <div className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 animate-pulse" />
            <span className="text-sm font-semibold text-red-800 dark:text-red-300">{stats.perdida} producto{stats.perdida > 1 ? 's' : ''} vendiendo a pérdida</span></div>
          <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => setEstadoFilter('perdida')}>Ver solo pérdidas</Button>
        </div>
      )}

      {renderReviewPanel()}

      <div className="flex-1 overflow-auto">
        <Table className="table-fixed w-full">
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead className="w-[55px] py-2 px-1.5 text-[10px] cursor-pointer hover:bg-muted/50" onClick={() => handleSort('codigo')}>
                <div className="flex items-center gap-1">Código{sortField === 'codigo' && <ArrowUpDown className="h-3 w-3" />}</div></TableHead>
              <TableHead className="py-2 px-1.5 text-[10px] cursor-pointer hover:bg-muted/50" onClick={() => handleSort('nombre')}>
                <div className="flex items-center gap-1">Producto{sortField === 'nombre' && <ArrowUpDown className="h-3 w-3" />}</div></TableHead>
              <TableHead className="w-[65px] py-2 px-1.5 text-[10px] text-right">IVA/IEPS</TableHead>
              <TableHead className="w-[65px] py-2 px-1.5 text-[10px] text-right cursor-pointer hover:bg-muted/50" onClick={() => handleSort('costo')}>
                <div className="flex items-center justify-end gap-1">Costo{sortField === 'costo' && <ArrowUpDown className="h-3 w-3" />}</div></TableHead>
              <TableHead className="w-[65px] py-2 px-1.5 text-[10px] text-right cursor-pointer hover:bg-muted/50" onClick={() => handleSort('precio')}>
                <div className="flex items-center justify-end gap-1">Precio{sortField === 'precio' && <ArrowUpDown className="h-3 w-3" />}</div></TableHead>
              <TableHead className="w-[55px] py-2 px-1.5 text-[10px] text-right">Dto Max</TableHead>
              <TableHead className="w-[50px] py-2 px-1.5 text-[10px] text-right cursor-pointer hover:bg-muted/50" onClick={() => handleSort('margen')}>
                <div className="flex items-center justify-end gap-1">Margen{sortField === 'margen' && <ArrowUpDown className="h-3 w-3" />}</div></TableHead>
              <TableHead className="w-[55px] py-2 px-1.5 text-[10px] text-right">Piso</TableHead>
              <TableHead className="w-[50px] py-2 px-1.5 text-[10px] text-right">Espacio</TableHead>
              <TableHead className="w-[65px] py-2 px-1.5 text-[10px] text-center cursor-pointer hover:bg-muted/50" onClick={() => handleSort('estado')}>
                <div className="flex items-center justify-center gap-1">Estado{sortField === 'estado' && <ArrowUpDown className="h-3 w-3" />}</div></TableHead>
              <TableHead className="w-[75px] py-2 px-1 text-[10px] text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(productosPorCategoria as [string, ProductoConAnalisis[]][]).map(([categoria, prods]) => (
              <>
                <TableRow key={`cat-${categoria}`} className="bg-muted/60 hover:bg-muted/60">
                  <TableCell colSpan={11} className="py-1 px-2 font-bold text-[10px] uppercase tracking-wider text-muted-foreground">
                    ═══ {categoria} ({prods.length}) ═══
                  </TableCell>
                </TableRow>
                {prods.map((producto) => {
                  const { analisis } = producto;
                  const rowClass = cn("h-8",
                    analisis.estado_margen === 'perdida' && "bg-red-100/80 dark:bg-red-950/40 border-l-2 border-l-red-500",
                    analisis.estado_margen === 'critico' && "bg-orange-100/60 dark:bg-orange-950/30 border-l-2 border-l-orange-500");
                  return (
                    <TableRow key={producto.id} className={rowClass}>
                      <TableCell className="py-1 px-1.5 text-[10px] font-mono text-muted-foreground">{producto.codigo}</TableCell>
                      <TableCell className="py-1 px-1.5">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-xs">{getProductDisplayName(producto)}</span>
                          {producto.es_promocion && <Badge variant="secondary" className="text-[8px] px-1 py-0 h-4 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 shrink-0">PROMO</Badge>}
                          {producto.bloqueado_venta && <span className="text-[8px] text-red-600 dark:text-red-400 shrink-0" title="Requiere autorización">🔒</span>}
                        </div>
                      </TableCell>
                      <TableCell className="py-1 px-1.5 text-center">
                        <div className="flex items-center justify-center gap-0.5">
                          {producto.aplica_iva && <Badge variant="outline" className="text-[7px] px-1 py-0 h-3.5 border-blue-300 text-blue-600 dark:border-blue-700 dark:text-blue-400">IVA</Badge>}
                          {producto.aplica_ieps && <Badge variant="outline" className="text-[7px] px-1 py-0 h-3.5 border-orange-300 text-orange-600 dark:border-orange-700 dark:text-orange-400">IEPS</Badge>}
                          {!producto.aplica_iva && !producto.aplica_ieps && <span className="text-[9px] text-muted-foreground">—</span>}
                        </div>
                      </TableCell>
                      <TableCell className="py-1 px-1.5 text-right"><span className="text-xs font-medium text-muted-foreground">{analisis.costo_referencia > 0 ? formatCurrency(analisis.costo_referencia) : "-"}</span></TableCell>
                      <TableCell className="py-1 px-1.5 text-right">
                        <span className="text-xs font-semibold flex items-center justify-end gap-1">
                          {analisis.estado_margen === 'perdida' && (
                            <TooltipProvider><Tooltip><TooltipTrigger asChild><AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" /></TooltipTrigger>
                              <TooltipContent><p className="text-xs">Precio menor al costo</p></TooltipContent></Tooltip></TooltipProvider>
                          )}
                          {formatCurrency(producto.precio_venta)}{producto.precio_por_kilo && '/kg'}
                        </span>
                      </TableCell>
                      <TableCell className="py-1 px-1.5 text-right"><span className="text-[11px] text-muted-foreground">{producto.descuento_maximo ? formatCurrency(producto.descuento_maximo) : "-"}</span></TableCell>
                      <TableCell className="py-1 px-1.5 text-right">
                        <span className={cn("text-xs font-medium",
                          analisis.margen_porcentaje < 0 && "text-red-600",
                          analisis.margen_porcentaje >= 0 && analisis.margen_porcentaje < 5 && "text-orange-600",
                          analisis.margen_porcentaje >= 5 && analisis.margen_porcentaje < 10 && "text-amber-600",
                          analisis.margen_porcentaje >= 10 && "text-green-600")}>
                          {analisis.costo_referencia > 0 ? `${analisis.margen_porcentaje}%` : "-"}
                        </span>
                      </TableCell>
                      <TableCell className="py-1 px-1.5 text-right"><span className="text-[11px] text-muted-foreground">{formatCurrency(analisis.piso_minimo)}</span></TableCell>
                      <TableCell className="py-1 px-1.5 text-right">
                        <span className={cn("text-[11px]", analisis.espacio_negociacion < 0 && "text-red-600 font-medium", analisis.espacio_negociacion >= 0 && "text-muted-foreground")}>
                          {analisis.costo_referencia > 0 ? formatCurrency(analisis.espacio_negociacion) : "-"}
                        </span>
                      </TableCell>
                      <TableCell className="py-1 px-1.5 text-center">{getEstadoBadge(analisis.estado_margen)}</TableCell>
                      <TableCell className="py-1 px-1 text-center">
                        <div className="flex items-center justify-center gap-0.5">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openSimulador(producto)} title="Simular precio"><Calculator className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditor(producto)} title="Editar precio"><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => historial.openHistorial(producto)} title="Ver historial"><History className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </>
            ))}
          </TableBody>
        </Table>
      </div>

      {renderDialogs()}{renderBulkSheet()}
    </div>
  );
};
