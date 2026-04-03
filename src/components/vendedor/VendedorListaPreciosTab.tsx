import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Search, Package, Filter } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { getDisplayName } from "@/lib/productUtils";
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

interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  especificaciones: string | null;
  marca: string | null;
  categoria: string | null;
  precio_venta: number | null;
  unidad: string | null;
  peso_kg: number | null;
  contenido_empaque: string | null;
  precio_por_kilo: boolean | null;
  descuento_maximo: number | null;
  es_promocion: boolean | null;
  descripcion_promocion: string | null;
  bloqueado_venta: boolean | null;
  aplica_iva: boolean | null;
  aplica_ieps: boolean | null;
}

function buildFullProductName(p: Producto): string {
  return getDisplayName({
    nombre: p.nombre,
    marca: p.marca,
    especificaciones: p.especificaciones,
    unidad: p.unidad,
    contenido_empaque: p.contenido_empaque,
    peso_kg: p.peso_kg,
    es_promocion: p.es_promocion ?? false,
    descripcion_promocion: p.descripcion_promocion,
  });
}

function formatPrice(p: Producto): string {
  const price = formatCurrency(p.precio_venta || 0);
  return p.precio_por_kilo ? `${price}/kg` : price;
}

type TaxFilter = "todos" | "iva" | "ieps" | "sin_impuesto";
type PriceFilter = "todos" | "con_precio" | "sin_precio";

export function VendedorListaPreciosTab() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState<string>("todas");
  const [taxFilter, setTaxFilter] = useState<TaxFilter>("todos");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("todos");

  useEffect(() => {
    fetchProductos();
  }, []);

  const fetchProductos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("productos")
        .select(`
          id, codigo, nombre, especificaciones, marca, categoria,
          precio_venta, unidad, peso_kg, contenido_empaque,
          precio_por_kilo, descuento_maximo, es_promocion,
          descripcion_promocion, bloqueado_venta, aplica_iva, aplica_ieps
        `)
        .eq("activo", true)
        .or("solo_uso_interno.is.null,solo_uso_interno.eq.false")
        .order("categoria")
        .order("nombre");

      if (error) throw error;
      setProductos(data || []);
    } catch (error) {
      console.error("Error fetching productos:", error);
    } finally {
      setLoading(false);
    }
  };

  const categorias = useMemo(() => {
    const cats = new Set<string>();
    productos.forEach((p) => cats.add(p.categoria || "Sin categoría"));
    return Array.from(cats).sort();
  }, [productos]);

  const filteredProductos = useMemo(() => {
    let result = productos;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (p) =>
          p.codigo?.toLowerCase().includes(term) ||
          p.nombre?.toLowerCase().includes(term) ||
          p.marca?.toLowerCase().includes(term)
      );
    }

    if (categoriaFilter !== "todas") {
      result = result.filter(
        (p) => (p.categoria || "Sin categoría") === categoriaFilter
      );
    }

    if (taxFilter === "iva") {
      result = result.filter((p) => p.aplica_iva);
    } else if (taxFilter === "ieps") {
      result = result.filter((p) => p.aplica_ieps);
    } else if (taxFilter === "sin_impuesto") {
      result = result.filter((p) => !p.aplica_iva && !p.aplica_ieps);
    }

    if (priceFilter === "con_precio") {
      result = result.filter((p) => p.precio_venta && p.precio_venta > 0);
    } else if (priceFilter === "sin_precio") {
      result = result.filter((p) => !p.precio_venta || p.precio_venta === 0);
    }

    return result;
  }, [productos, searchTerm, categoriaFilter, taxFilter, priceFilter]);

  const productosPorCategoria = useMemo(() => {
    const grupos: Record<string, Producto[]> = {};
    for (const producto of filteredProductos) {
      const cat = producto.categoria || "Sin categoría";
      if (!grupos[cat]) grupos[cat] = [];
      grupos[cat].push(producto);
    }
    return Object.entries(grupos).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredProductos]);

  if (loading) {
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
      {/* Header con búsqueda y filtros */}
      <div className="pb-3 border-b bg-background sticky top-0 z-20 space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar producto, código o marca..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
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
        </div>
        <p className="text-[10px] text-muted-foreground">
          {filteredProductos.length} productos
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
                  <TableHead className="w-[120px] py-2 px-2 text-[10px] text-right">Precio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productosPorCategoria.map(([categoria, prods]) => (
                  <>
                    <TableRow key={`cat-${categoria}`} className="bg-muted/60 hover:bg-muted/60">
                      <TableCell colSpan={3} className="py-1.5 px-2 font-bold text-[11px] uppercase tracking-wider text-muted-foreground">
                        ═══ {categoria} ({prods.length}) ═══
                      </TableCell>
                    </TableRow>
                    {prods.map((producto) => (
                      <TableRow key={producto.id} className="h-8 hover:bg-muted/30">
                        <TableCell className="py-1 px-2 text-[10px] font-mono text-muted-foreground">
                          {producto.codigo}
                        </TableCell>
                        <TableCell className="py-1 px-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs">
                              {buildFullProductName(producto)}
                            </span>
                            {producto.es_promocion && (
                              <Badge variant="secondary" className="text-[8px] px-1 py-0 h-4 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 shrink-0">
                                🎁 PROMO
                              </Badge>
                            )}
                            {producto.bloqueado_venta && (
                              <span className="text-[8px] text-red-600 dark:text-red-400 shrink-0" title="Requiere autorización para vender">🔒</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-1 px-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <span className="font-semibold text-xs">
                              {formatPrice(producto)}
                            </span>
                            {producto.aplica_iva && (
                              <Badge variant="outline" className="text-[7px] px-1 py-0 h-3.5 border-blue-300 text-blue-600 dark:border-blue-700 dark:text-blue-400 shrink-0">
                                IVA
                              </Badge>
                            )}
                            {producto.aplica_ieps && (
                              <Badge variant="outline" className="text-[7px] px-1 py-0 h-3.5 border-orange-300 text-orange-600 dark:border-orange-700 dark:text-orange-400 shrink-0">
                                IEPS
                              </Badge>
                            )}
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
                <div className="sticky top-0 bg-muted/90 backdrop-blur-sm py-1.5 px-3 border-b z-10">
                  <span className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">
                    ═══ {categoria} ({prods.length}) ═══
                  </span>
                </div>
                {prods.map((producto) => (
                  <div
                    key={producto.id}
                    className="flex justify-between items-start py-2 px-3 border-b hover:bg-muted/30"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="text-sm leading-tight">
                        {buildFullProductName(producto)}
                        {producto.es_promocion && (
                          <Badge variant="secondary" className="text-[8px] px-1 py-0 h-4 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 ml-1 shrink-0 inline-flex">
                            🎁 PROMO
                          </Badge>
                        )}
                        {producto.bloqueado_venta && (
                          <span className="text-[8px] text-red-600 dark:text-red-400 ml-1" title="Requiere autorización">🔒</span>
                        )}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        <span className="font-mono">{producto.codigo}</span>
                      </p>
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end gap-0.5">
                      <p className="font-bold text-sm leading-tight">
                        {formatPrice(producto)}
                      </p>
                      <div className="flex gap-0.5">
                        {producto.aplica_iva && (
                          <Badge variant="outline" className="text-[7px] px-1 py-0 h-3.5 border-blue-300 text-blue-600 dark:border-blue-700 dark:text-blue-400">
                            IVA
                          </Badge>
                        )}
                        {producto.aplica_ieps && (
                          <Badge variant="outline" className="text-[7px] px-1 py-0 h-3.5 border-orange-300 text-orange-600 dark:border-orange-700 dark:text-orange-400">
                            IEPS
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
