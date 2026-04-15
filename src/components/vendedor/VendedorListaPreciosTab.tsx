import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Package, Filter, Download, FileText, User, TrendingDown, TrendingUp, Shield } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useListaPrecios, getProductDisplayName, formatPrecio, formatCurrency } from "@/hooks/useListaPrecios";
import { generarListaPreciosPDF } from "@/utils/listaPreciosPdfGenerator";
import { PdfExportDialog } from "@/components/precios/shared/PdfExportDialog";

type TaxFilter = "todos" | "iva" | "ieps" | "sin_impuesto";
type PriceFilter = "todos" | "con_precio" | "sin_precio";
type PdfVersion = "cliente" | "interno";

export function VendedorListaPreciosTab() {
  const {
    filteredProductos,
    productosPorCategoria,
    categorias,
    isLoading,
    searchTerm, setSearchTerm,
    categoriaFilter, setCategoriaFilter,
    taxFilter, setTaxFilter,
    priceFilter, setPriceFilter,
  } = useListaPrecios();

  // Client selector for last-price comparison
  const [clienteSearch, setClienteSearch] = useState("");
  const [selectedCliente, setSelectedCliente] = useState<{ id: string; nombre: string } | null>(null);
  const [clienteDialogOpen, setClienteDialogOpen] = useState(false);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);

  // Fetch clients for selector
  const { data: clientes } = useQuery({
    queryKey: ["clientes-busqueda", clienteSearch],
    queryFn: async () => {
      if (!clienteSearch || clienteSearch.length < 2) return [];
      const { data, error } = await supabase
        .from("clientes")
        .select("id, nombre, codigo")
        .or(`nombre.ilike.%${clienteSearch}%,codigo.ilike.%${clienteSearch}%`)
        .eq("activo", true)
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
    enabled: clienteSearch.length >= 2,
  });

  // Fetch last prices for selected client
  const { data: ultimosPrecios } = useQuery({
    queryKey: ["ultimos-precios-cliente", selectedCliente?.id],
    queryFn: async () => {
      if (!selectedCliente?.id) return {};
      // Get the latest delivered order for each product
      const { data, error } = await supabase
        .from("pedidos_detalles")
        .select("producto_id, precio_unitario, pedidos!inner(cliente_id, status, created_at)")
        .eq("pedidos.cliente_id", selectedCliente.id)
        .in("pedidos.status", ["entregado", "por_cobrar"])
        .order("created_at", { ascending: false, referencedTable: "pedidos" });

      if (error) throw error;

      // Keep only the most recent price per product
      const map: Record<string, number> = {};
      for (const d of data ?? []) {
        if (!map[d.producto_id]) {
          map[d.producto_id] = d.precio_unitario;
        }
      }
      return map;
    },
    enabled: !!selectedCliente?.id,
  });

  if (isLoading) {
    return (
      <div className="p-3 space-y-1.5">
        <Skeleton className="h-9 w-full" />
        {[...Array(10)].map((_, i) => (
          <Skeleton key={i} className="h-7 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <PageHeader
        title="Lista de precios."
        lead="Catálogo autorizado para cotizar"
      />
      {/* Header */}
      <div className="pb-3 border-b bg-background sticky top-0 z-20 space-y-2 mt-4">
        <div className="flex items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar producto, código o marca..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
          <Button size="sm" variant="outline" className="ml-2 h-9" onClick={() => setPdfDialogOpen(true)}>
            <Download className="h-4 w-4 mr-1" /> PDF
          </Button>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={categoriaFilter === "all" ? "todas" : categoriaFilter} onValueChange={(v) => setCategoriaFilter(v === "todas" ? "all" : v)}>
            <SelectTrigger className="h-8 text-xs w-auto min-w-[140px]">
              <Filter className="h-3 w-3 mr-1" />
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las categorías</SelectItem>
              {categorias.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priceFilter} onValueChange={(v) => setPriceFilter(v as PriceFilter)}>
            <SelectTrigger className="h-8 text-xs w-auto min-w-[110px]">
              <SelectValue placeholder="Precio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="con_precio">Con precio</SelectItem>
              <SelectItem value="sin_precio">Sin precio</SelectItem>
            </SelectContent>
          </Select>
          <Select value={taxFilter} onValueChange={(v) => setTaxFilter(v as TaxFilter)}>
            <SelectTrigger className="h-8 text-xs w-auto min-w-[110px]">
              <SelectValue placeholder="Impuesto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="iva">Solo IVA</SelectItem>
              <SelectItem value="ieps">Solo IEPS</SelectItem>
              <SelectItem value="sin_impuesto">Sin impuesto</SelectItem>
            </SelectContent>
          </Select>

          {/* Client selector */}
          <Button
            size="sm"
            variant={selectedCliente ? "default" : "outline"}
            className="h-8 text-xs"
            onClick={() => setClienteDialogOpen(true)}
          >
            <User className="h-3 w-3 mr-1" />
            {selectedCliente ? selectedCliente.nombre.substring(0, 15) : "Comparar cliente"}
          </Button>
          {selectedCliente && (
            <Button size="sm" variant="ghost" className="h-8 text-xs px-2" onClick={() => setSelectedCliente(null)}>
              ✕
            </Button>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground">
          {filteredProductos.length} productos
          {selectedCliente && <span className="ml-2 text-primary font-medium">| Comparando con: {selectedCliente.nombre}</span>}
        </p>
      </div>

      {filteredProductos.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No se encontraron productos</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block flex-1 overflow-auto">
            <Table className="table-fixed w-full">
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[70px] py-2 px-2 text-[10px]">Código</TableHead>
                  <TableHead className="py-2 px-2 text-[10px]">Producto</TableHead>
                  <TableHead className="w-[100px] py-2 px-2 text-[10px] text-right">Precio</TableHead>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <TableHead className="w-[90px] py-2 px-2 text-[10px] text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Shield className="h-3 w-3" />
                            Piso
                          </div>
                        </TableHead>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Precio mínimo que puedes ofrecer sin autorización</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  {selectedCliente && (
                    <TableHead className="w-[100px] py-2 px-2 text-[10px] text-right">Últ. Precio</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {productosPorCategoria.map(([categoria, prods]) => (
                  <>
                    <TableRow key={`cat-${categoria}`} className="bg-muted/60 hover:bg-muted/60">
                      <TableCell colSpan={selectedCliente ? 5 : 4} className="py-1.5 px-2 font-bold text-[11px] uppercase tracking-wider text-muted-foreground">
                        ═══ {categoria} ({prods.length}) ═══
                      </TableCell>
                    </TableRow>
                    {prods.map((producto) => {
                      const pisoMinimo = (producto.precio_venta || 0) - (producto.descuento_maximo || 0);
                      const tieneEspacio = producto.descuento_maximo && producto.descuento_maximo > 0;
                      const ultimoPrecio = selectedCliente && ultimosPrecios ? ultimosPrecios[producto.id] : undefined;
                      const precioSubio = ultimoPrecio !== undefined && (producto.precio_venta || 0) > ultimoPrecio;

                      return (
                        <TableRow key={producto.id} className="h-8 hover:bg-muted/30">
                          <TableCell className="py-1 px-2 text-[10px] font-mono text-muted-foreground">
                            {producto.codigo}
                          </TableCell>
                          <TableCell className="py-1 px-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs">{getProductDisplayName(producto)}</span>
                              {producto.es_promocion && (
                                <Badge variant="secondary" className="text-[8px] px-1 py-0 h-4 bg-amber-100 text-amber-800 shrink-0">
                                  PROMO
                                </Badge>
                              )}
                              {producto.bloqueado_venta && (
                                <span className="text-[8px] text-red-600 shrink-0" title="Requiere autorización para vender">🔒</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-1 px-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <span className="font-semibold text-xs">{formatPrecio(producto)}</span>
                              {producto.aplica_iva && (
                                <Badge variant="outline" className="text-[7px] px-1 py-0 h-3.5 border-blue-300 text-blue-600 shrink-0">IVA</Badge>
                              )}
                              {producto.aplica_ieps && (
                                <Badge variant="outline" className="text-[7px] px-1 py-0 h-3.5 border-orange-300 text-orange-600 shrink-0">IEPS</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-1 px-2 text-right">
                            {tieneEspacio ? (
                              <span className="text-xs">
                                <span className="text-emerald-600 font-medium">
                                  {formatCurrency(pisoMinimo)}
                                </span>
                                <span className="text-[9px] text-muted-foreground ml-1">(-${producto.descuento_maximo!.toFixed(0)})</span>
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          {selectedCliente && (
                            <TableCell className="py-1 px-2 text-right">
                              {ultimoPrecio !== undefined ? (
                                <div className="flex items-center justify-end gap-1">
                                  <span className="text-xs font-mono">{formatCurrency(ultimoPrecio)}</span>
                                  {precioSubio && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <TrendingUp className="h-3 w-3 text-amber-500" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p className="text-xs">El precio subió desde la última compra del cliente (+{formatCurrency((producto.precio_venta || 0) - ultimoPrecio)})</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[10px] text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile view */}
          <div className="md:hidden flex-1 overflow-auto">
            {productosPorCategoria.map(([categoria, prods]) => (
              <div key={categoria}>
                <div className="sticky top-0 bg-muted/90 backdrop-blur-sm py-1.5 px-3 border-b z-10">
                  <span className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">
                    ═══ {categoria} ({prods.length}) ═══
                  </span>
                </div>
                {prods.map((producto) => {
                  const pisoMinimo = (producto.precio_venta || 0) - (producto.descuento_maximo || 0);
                  const tieneEspacio = producto.descuento_maximo && producto.descuento_maximo > 0;
                  const ultimoPrecio = selectedCliente && ultimosPrecios ? ultimosPrecios[producto.id] : undefined;

                  return (
                    <div key={producto.id} className="flex justify-between items-start py-2 px-3 border-b hover:bg-muted/30">
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="text-sm leading-tight">
                          {getProductDisplayName(producto)}
                          {producto.es_promocion && (
                            <Badge variant="secondary" className="text-[8px] px-1 py-0 h-4 bg-amber-100 text-amber-800 ml-1 shrink-0 inline-flex">
                              PROMO
                            </Badge>
                          )}
                          {producto.bloqueado_venta && (
                            <span className="text-[8px] text-red-600 ml-1" title="Requiere autorización">🔒</span>
                          )}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          <span className="font-mono">{producto.codigo}</span>
                        </p>
                      </div>
                      <div className="text-right shrink-0 flex flex-col items-end gap-0.5">
                        <p className="font-bold text-sm leading-tight">{formatPrecio(producto)}</p>
                        <div className="flex gap-0.5">
                          {producto.aplica_iva && (
                            <Badge variant="outline" className="text-[7px] px-1 py-0 h-3.5 border-blue-300 text-blue-600">IVA</Badge>
                          )}
                          {producto.aplica_ieps && (
                            <Badge variant="outline" className="text-[7px] px-1 py-0 h-3.5 border-orange-300 text-orange-600">IEPS</Badge>
                          )}
                        </div>
                        {tieneEspacio && (
                          <p className="text-[10px] text-emerald-600 font-medium">
                            Piso: {formatCurrency(pisoMinimo)}
                          </p>
                        )}
                        {ultimoPrecio !== undefined && (
                          <p className="text-[10px] text-muted-foreground">
                            Últ: {formatCurrency(ultimoPrecio)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Client selector dialog */}
      <Dialog open={clienteDialogOpen} onOpenChange={setClienteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Seleccionar Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Buscar por nombre o código..."
              value={clienteSearch}
              onChange={(e) => setClienteSearch(e.target.value)}
              autoFocus
            />
            {clientes && clientes.length > 0 && (
              <div className="space-y-1 max-h-[300px] overflow-auto">
                {clientes.map((c) => (
                  <Button
                    key={c.id}
                    variant="ghost"
                    className="w-full justify-start text-sm h-auto py-2"
                    onClick={() => {
                      setSelectedCliente({ id: c.id, nombre: c.nombre });
                      setClienteDialogOpen(false);
                      setClienteSearch("");
                    }}
                  >
                    <span className="font-mono text-muted-foreground mr-2 text-xs">{c.codigo}</span>
                    {c.nombre}
                  </Button>
                ))}
              </div>
            )}
            {clienteSearch.length >= 2 && (!clientes || clientes.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">No se encontraron clientes</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <PdfExportDialog open={pdfDialogOpen} onOpenChange={setPdfDialogOpen} productos={filteredProductos} categoriaFilter={categoriaFilter} />
    </div>
  );
}
