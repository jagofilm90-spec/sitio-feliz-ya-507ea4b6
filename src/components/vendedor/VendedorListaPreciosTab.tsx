import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Search, Package } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { getShortDisplayName } from "@/lib/productUtils";
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
}

export function VendedorListaPreciosTab() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchProductos();
  }, []);

  const fetchProductos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("productos")
        .select(`
          id,
          codigo,
          nombre,
          especificaciones,
          marca,
          categoria,
          precio_venta,
          unidad,
          peso_kg,
          contenido_empaque,
          precio_por_kilo,
          descuento_maximo,
          es_promocion,
          descripcion_promocion,
          bloqueado_venta
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

  const filteredProductos = useMemo(() => {
    if (!searchTerm.trim()) return productos;
    const term = searchTerm.toLowerCase();
    return productos.filter(
      (p) =>
        p.codigo?.toLowerCase().includes(term) ||
        p.nombre?.toLowerCase().includes(term) ||
        p.marca?.toLowerCase().includes(term)
    );
  }, [productos, searchTerm]);

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
    <div className="flex flex-col h-full">
      {/* Header compacto con búsqueda */}
      <div className="p-3 border-b bg-background sticky top-0 z-20">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar producto o código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
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
          {/* Tabla compacta - Desktop */}
          <div className="hidden md:block flex-1 overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[70px] py-2 px-2 text-[10px]">Código</TableHead>
                  <TableHead className="py-2 px-2 text-[10px]">Producto</TableHead>
                  <TableHead className="w-[100px] py-2 px-2 text-[10px]">Marca</TableHead>
                  <TableHead className="w-[80px] py-2 px-2 text-[10px] text-right">Precio</TableHead>
                  <TableHead className="w-[100px] py-2 px-2 text-[10px] text-right">Descuento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productosPorCategoria.map(([categoria, prods]) => (
                  <>
                    {/* Separador de categoría */}
                    <TableRow key={`cat-${categoria}`} className="bg-muted/60 hover:bg-muted/60">
                      <TableCell colSpan={5} className="py-1 px-2 font-semibold text-[10px] uppercase tracking-wide text-muted-foreground">
                        {categoria} ({prods.length})
                      </TableCell>
                    </TableRow>
                    {/* Productos */}
                    {prods.map((producto) => (
                      <TableRow key={producto.id} className="h-8 hover:bg-muted/30">
                        <TableCell className="py-1 px-2 text-[10px] font-mono text-muted-foreground">
                          {producto.codigo}
                        </TableCell>
                        <TableCell className="py-1 px-2">
                          <div>
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="text-xs">
                                {producto.nombre}
                                {producto.especificaciones && (
                                  <span className="text-purple-600 dark:text-purple-400 font-medium ml-1">
                                    {producto.especificaciones}
                                  </span>
                                )}
                              </span>
                              {producto.es_promocion && (
                                <Badge variant="secondary" className="text-[8px] px-1 py-0 h-4 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 shrink-0">
                                  🎁 PROMO
                                </Badge>
                              )}
                              {producto.bloqueado_venta && (
                                <span className="text-[8px] text-red-600 dark:text-red-400 shrink-0" title="Requiere autorización para vender">🔒</span>
                              )}
                              {producto.precio_por_kilo && (
                                <span className="text-[8px] text-muted-foreground bg-muted px-1 rounded shrink-0">
                                  /kg
                                </span>
                              )}
                            </div>
                            {producto.es_promocion && producto.descripcion_promocion && (
                              <div className="text-[9px] text-amber-700 dark:text-amber-400 font-medium">
                                {producto.descripcion_promocion}
                              </div>
                            )}
                            {producto.contenido_empaque && (
                              <div className="text-[10px] text-muted-foreground">
                                {producto.contenido_empaque}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-1 px-2">
                          {producto.marca ? (
                            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                              {producto.marca}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="py-1 px-2 text-right font-semibold text-xs">
                          {formatCurrency(producto.precio_venta || 0)}
                        </TableCell>
                        <TableCell className="py-1 px-2 text-right">
                          {producto.descuento_maximo && producto.descuento_maximo > 0 ? (
                            <span className="text-[10px] font-medium">
                              <span className="text-emerald-600 dark:text-emerald-400">-${producto.descuento_maximo.toFixed(0)}</span>
                              <span className="text-muted-foreground mx-0.5">→</span>
                              <span className="text-amber-600 dark:text-amber-400 font-semibold">
                                {formatCurrency((producto.precio_venta || 0) - producto.descuento_maximo)}
                              </span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Vista móvil ultra compacta */}
          <div className="md:hidden flex-1 overflow-auto">
            {productosPorCategoria.map(([categoria, prods]) => (
              <div key={categoria}>
                {/* Separador de categoría sticky */}
                <div className="sticky top-0 bg-muted/90 backdrop-blur-sm py-1 px-3 border-b z-10">
                  <span className="font-semibold text-[10px] uppercase tracking-wide text-muted-foreground">
                    {categoria} ({prods.length})
                  </span>
                </div>
                {/* Productos */}
                {prods.map((producto) => (
                  <div
                    key={producto.id}
                    className="flex justify-between items-center py-1.5 px-3 border-b hover:bg-muted/30"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="text-sm font-medium truncate leading-tight flex items-center gap-1 flex-wrap">
                        <span>
                          {producto.nombre}
                          {producto.especificaciones && (
                            <span className="text-purple-600 dark:text-purple-400 font-medium ml-1">
                              {producto.especificaciones}
                            </span>
                          )}
                        </span>
                        {producto.es_promocion && (
                          <Badge variant="secondary" className="text-[8px] px-1 py-0 h-4 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 shrink-0">
                            🎁 PROMO
                          </Badge>
                        )}
                        {producto.bloqueado_venta && (
                          <span className="text-[8px] text-red-600 dark:text-red-400 shrink-0" title="Requiere autorización">🔒</span>
                        )}
                      </p>
                      {producto.es_promocion && producto.descripcion_promocion && (
                        <p className="text-[9px] text-amber-700 dark:text-amber-400 font-medium truncate">
                          {producto.descripcion_promocion}
                        </p>
                      )}
                      {(producto.marca || producto.contenido_empaque) && (
                        <p className="text-[10px] text-muted-foreground truncate leading-tight">
                          {producto.marca && (
                            <span className="text-blue-600 dark:text-blue-400 font-medium">{producto.marca}</span>
                          )}
                          {producto.marca && producto.contenido_empaque && " • "}
                          {producto.contenido_empaque}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <span className="font-mono">{producto.codigo}</span>
                        {producto.precio_por_kilo && (
                          <span className="bg-muted px-0.5 rounded text-[8px]">/kg</span>
                        )}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-sm leading-tight">
                        {formatCurrency(producto.precio_venta || 0)}
                      </p>
                      {producto.descuento_maximo && producto.descuento_maximo > 0 && (
                        <>
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium leading-tight">
                            -${producto.descuento_maximo.toFixed(0)}
                          </p>
                          <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold leading-tight">
                            → {formatCurrency((producto.precio_venta || 0) - producto.descuento_maximo)}
                          </p>
                        </>
                      )}
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
