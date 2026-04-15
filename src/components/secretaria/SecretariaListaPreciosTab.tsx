import { useState, useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
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
  TrendingUp, TrendingDown, Minus, Check, Package, Calculator, Percent,
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
import { RevisionesPrecioPanel } from "@/components/precios/shared/RevisionesPrecioPanel";
import { PdfExportDialog } from "@/components/precios/shared/PdfExportDialog";

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
  // Review panel and PDF are shared components

  if (isLoading) {
    return (
      <AlmasaLoading size={48} />
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="pb-3 border-b bg-background sticky top-0 z-20 space-y-2">
        <PageHeader
          title="Lista de precios."
          lead={`${filteredProductos.length} productos activos`}
          actions={
            <Button size="sm" variant="outline" className="h-8" onClick={() => setPdfDialogOpen(true)}>
              <Download className="h-3.5 w-3.5 mr-1" /> PDF
            </Button>
          }
        />

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

      <RevisionesPrecioPanel onPriceApplied={() => queryClient.invalidateQueries({ queryKey: ["lista-precios"] })} />

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
                    <TableRow key={`cat-${categoria}`} className="bg-warm-50 hover:bg-warm-50">
                      <TableCell colSpan={5} className="py-3 px-4">
                        <span className="font-serif italic text-[16px] text-ink-600" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                          {categoria}
                        </span>
                        <span className="text-[11px] text-ink-400 ml-2">
                          · {prods.length} productos
                        </span>
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
                              <Badge variant="secondary" className="text-[8px] px-1 py-0 h-4 bg-amber-100 text-amber-800 shrink-0">
                                PROMO
                              </Badge>
                            )}
                            {producto.bloqueado_venta && (
                              <span className="text-[8px] text-red-600 shrink-0" title="Requiere autorización">🔒</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-1 px-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <span className="font-semibold text-xs">
                              {formatCurrency(producto.precio_venta)}{producto.precio_por_kilo && '/kg'}
                            </span>
                            {producto.aplica_iva && (
                              <Badge variant="outline" className="text-[7px] px-1 py-0 h-3.5 border-blue-300 text-blue-600">IVA</Badge>
                            )}
                            {producto.aplica_ieps && (
                              <Badge variant="outline" className="text-[7px] px-1 py-0 h-3.5 border-orange-300 text-orange-600">IEPS</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-1 px-2 text-right">
                          {producto.descuento_maximo && producto.descuento_maximo > 0 ? (
                            <span className="text-[10px] font-medium">
                              <span className="text-emerald-600">-${producto.descuento_maximo.toFixed(0)}</span>
                              <span className="text-muted-foreground mx-0.5">→</span>
                              <span className="text-amber-600 font-semibold">
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
                <div className="sticky top-0 bg-warm-50 backdrop-blur-sm py-3 px-4 border-b z-10">
                  <span className="font-serif italic text-[16px] text-ink-600" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                    {categoria}
                  </span>
                  <span className="text-[11px] text-ink-400 ml-2">
                    · {prods.length} productos
                  </span>
                </div>
                {prods.map((producto) => (
                  <div key={producto.id} className="flex justify-between items-center py-1.5 px-3 border-b hover:bg-muted/30">
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="text-sm leading-tight">
                        {getProductDisplayName(producto)}
                        {producto.es_promocion && (
                          <Badge variant="secondary" className="text-[8px] px-1 py-0 h-4 bg-amber-100 text-amber-800 ml-1 shrink-0 inline-flex">
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
                          <p className="text-[10px] text-amber-600 font-semibold">
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
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-[560px] overflow-x-hidden !p-0 !gap-0 !rounded-2xl shadow-[0_20px_60px_-20px_rgba(15,14,13,0.25)]">
          {/* Navigation */}
          {editor.editingProduct && filteredProductos.length > 1 && (
            <div className="flex items-center justify-between px-8 pt-5 pb-2">
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

          <DialogHeader className={cn("px-8 pb-6", editor.editingProduct && filteredProductos.length > 1 ? "pt-4" : "pt-8")}>
            <DialogTitle className="!font-serif !text-[28px] !font-medium text-ink-900 !tracking-[-0.01em] !leading-tight">
              Editar precio.
            </DialogTitle>
            <DialogDescription className="!text-[13px] text-ink-500 italic">
              {editor.editingProduct && getProductDisplayName(editor.editingProduct)}
            </DialogDescription>
          </DialogHeader>

          <div className="px-8 py-4 space-y-5">
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
                        <Input id="margen" type="number" step="0.1" min="0" max="100" className="rounded-none bg-transparent border-x-0 border-t-0 px-0 pr-8 h-auto text-[15px] focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:bg-transparent focus-visible:border-b-[1.5px]"
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
                  <p className="text-xs text-amber-600">Este producto no tiene costos registrados. Usa el modo manual.</p>
                )}
              </div>
            )}

            {/* Price input */}
            <div className="space-y-1.5">
              <Label htmlFor="precio_venta" className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-500">
                Precio de Venta <span className="text-crimson-500">*</span>
                {editor.modoCalculadora && editor.margenPorcentaje && <span className="text-ink-300 normal-case ml-2">(calculado)</span>}
              </Label>
              <div className="relative">
                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-ink-400">$</span>
                <Input id="precio_venta" type="number" step="0.01" min="0"
                  className={cn("rounded-none bg-transparent border-x-0 border-t-0 px-0 pl-4 h-auto text-[15px] font-mono focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:bg-transparent focus-visible:border-b-[1.5px]", editor.modoCalculadora && editor.margenPorcentaje && "text-ink-500")}
                  value={editor.precioVenta}
                  onChange={(e) => { editor.setPrecioVenta(e.target.value); if (editor.modoCalculadora) editor.setMargenPorcentaje(""); }}
                  placeholder="0.00"
                />
              </div>
              {editor.editingProduct?.precio_por_kilo && <p className="text-xs text-muted-foreground">Este producto se vende por kilo</p>}
            </div>

            {/* Discount input */}
            <div className="space-y-1.5">
              <Label htmlFor="descuento_maximo" className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-500">Descuento Máximo Autorizado ($)</Label>
              <div className="relative">
                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-ink-400">$</span>
                <Input id="descuento_maximo" type="number" step="0.01" min="0" className="rounded-none bg-transparent border-x-0 border-t-0 px-0 pl-4 h-auto text-[15px] focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:bg-transparent focus-visible:border-b-[1.5px]"
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

          <div className="px-8 pb-8 pt-6 flex justify-end gap-3">
            <Button variant="outline" onClick={editor.closeEditor}
              className="text-ink-600 border-ink-200 hover:bg-ink-50">Cancelar</Button>
            <Button
              onClick={() => editor.handleSave()}
              disabled={editor.isPending}
              className={cn(
                "transition-all duration-300 ease-out min-w-[140px]",
                (editor.isSaved || editor.showSuccessAnimation)
                  ? "border-green-500 text-green-600 hover:bg-green-50 bg-transparent"
                  : "bg-crimson-500 text-white hover:bg-crimson-600",
                editor.showSuccessAnimation && "animate-success-pulse bg-green-50"
              )}
            >
              <span className="flex items-center justify-center">
                {editor.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> :
                  (editor.isSaved || editor.showSuccessAnimation) ? <Check className={cn("h-4 w-4 mr-2 text-green-500", editor.showSuccessAnimation && "animate-check-bounce")} /> :
                    null}
                <span>{editor.isPending ? "Guardando..." : (editor.isSaved || editor.showSuccessAnimation) ? "Guardado" : "Guardar cambios"}</span>
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
      <PdfExportDialog open={pdfDialogOpen} onOpenChange={setPdfDialogOpen} productos={filteredProductos} categoriaFilter={categoriaFilter} />
    </div>
  );
};
