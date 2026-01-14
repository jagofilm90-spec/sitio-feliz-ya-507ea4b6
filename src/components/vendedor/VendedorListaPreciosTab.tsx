import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Search, ChevronDown, ChevronRight, Package, ChevronsUpDown, Scale } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  marca: string | null;
  categoria: string | null;
  precio_venta: number | null;
  unidad: string | null;
  presentacion: number | null;
  precio_por_kilo: boolean | null;
  descuento_maximo: number | null;
  precio_anterior?: number | null;
  fecha_cambio_precio?: string | null;
}

// Función para calcular porcentaje de cambio
const calcularPorcentajeCambio = (precioActual: number, precioAnterior: number): { texto: string; esAumento: boolean } => {
  const cambio = ((precioActual - precioAnterior) / precioAnterior) * 100;
  const signo = cambio > 0 ? "+" : "";
  return {
    texto: `${signo}${cambio.toFixed(1)}%`,
    esAumento: cambio > 0
  };
};

// Función para formatear fecha de cambio
const formatearFechaCambio = (fecha: string): string => {
  const fechaCambio = new Date(fecha);
  return fechaCambio.toLocaleDateString('es-MX', { 
    day: '2-digit', 
    month: 'short', 
    year: '2-digit' 
  });
};

export function VendedorListaPreciosTab() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());

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
          marca,
          categoria,
          precio_venta,
          unidad,
          presentacion,
          precio_por_kilo,
          descuento_maximo
        `)
        .eq("activo", true)
        .or("solo_uso_interno.is.null,solo_uso_interno.eq.false")
        .order("categoria")
        .order("nombre");

      if (error) throw error;

      // Obtener historial de precios para mostrar precio anterior y fecha
      const { data: historialData } = await supabase
        .from("productos_historial_precios")
        .select("producto_id, precio_anterior, created_at")
        .order("created_at", { ascending: false });

      // Crear mapa con el último precio anterior y fecha por producto
      const precioAnteriorMap = new Map<string, { precio: number; fecha: string }>();
      historialData?.forEach(h => {
        if (!precioAnteriorMap.has(h.producto_id)) {
          precioAnteriorMap.set(h.producto_id, {
            precio: h.precio_anterior,
            fecha: h.created_at
          });
        }
      });

      // Combinar productos con precio anterior y fecha
      const productosConHistorial = (data || []).map(p => {
        const historial = precioAnteriorMap.get(p.id);
        return {
          ...p,
          precio_anterior: historial?.precio || null,
          fecha_cambio_precio: historial?.fecha || null
        };
      });

      setProductos(productosConHistorial);
      
      // Abrir todas las categorías inicialmente
      const categorias = new Set((data || []).map(p => p.categoria || "Sin categoría"));
      setOpenCategories(categorias);
    } catch (error) {
      console.error("Error fetching productos:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProductos = useMemo(() => {
    if (!searchTerm.trim()) return productos;
    
    const term = searchTerm.toLowerCase();
    return productos.filter(p =>
      p.codigo?.toLowerCase().includes(term) ||
      p.nombre?.toLowerCase().includes(term) ||
      p.categoria?.toLowerCase().includes(term) ||
      p.marca?.toLowerCase().includes(term)
    );
  }, [productos, searchTerm]);

  const productosPorCategoria = useMemo(() => {
    const grouped: Record<string, Producto[]> = {};
    
    filteredProductos.forEach(producto => {
      const cat = producto.categoria || "Sin categoría";
      if (!grouped[cat]) {
        grouped[cat] = [];
      }
      grouped[cat].push(producto);
    });

    // Ordenar categorías alfabéticamente
    const sortedEntries = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
    return sortedEntries;
  }, [filteredProductos]);

  const toggleCategory = (categoria: string) => {
    setOpenCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoria)) {
        newSet.delete(categoria);
      } else {
        newSet.add(categoria);
      }
      return newSet;
    });
  };

  const expandirTodo = () => {
    const todas = new Set(productosPorCategoria.map(([cat]) => cat));
    setOpenCategories(todas);
  };

  const colapsarTodo = () => {
    setOpenCategories(new Set());
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Lista de Precios
          </h2>
          <p className="text-sm text-muted-foreground">
            {filteredProductos.length} producto{filteredProductos.length !== 1 ? 's' : ''} 
            {searchTerm && ` encontrado${filteredProductos.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={expandirTodo}>
            <ChevronsUpDown className="h-4 w-4 mr-1" />
            Expandir
          </Button>
          <Button variant="outline" size="sm" onClick={colapsarTodo}>
            Colapsar
          </Button>
        </div>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por código, nombre, marca o categoría..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Lista por categorías */}
      <div className="space-y-3">
        {productosPorCategoria.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No se encontraron productos</p>
          </div>
        ) : (
          productosPorCategoria.map(([categoria, prods]) => (
            <Collapsible
              key={categoria}
              open={openCategories.has(categoria)}
              onOpenChange={() => toggleCategory(categoria)}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-4 h-auto hover:bg-muted/50 rounded-lg border"
                >
                  <div className="flex items-center gap-2">
                    {openCategories.has(categoria) ? (
                      <ChevronDown className="h-4 w-4 text-primary" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <span className="font-semibold">{categoria}</span>
                  </div>
                  <Badge variant="secondary">
                    {prods.length} producto{prods.length !== 1 ? 's' : ''}
                  </Badge>
                </Button>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="pt-2">
                <div className="rounded-lg border overflow-hidden">
                {/* Header de tabla - solo desktop */}
                  <div className="hidden sm:grid sm:grid-cols-14 gap-2 p-3 bg-muted/50 text-xs font-medium text-muted-foreground uppercase">
                    <div className="col-span-2">Código</div>
                    <div className="col-span-3">Producto</div>
                    <div className="col-span-2">Marca</div>
                    <div className="col-span-2">Unidad</div>
                    <div className="col-span-1 text-right">Anterior</div>
                    <div className="col-span-2 text-right">Precio</div>
                    <div className="col-span-2 text-right">Desc. Máx</div>
                  </div>
                  
                  {/* Productos */}
                  <div className="divide-y">
                    {prods.map((producto) => (
                      <div 
                        key={producto.id}
                        className="p-3 hover:bg-muted/30 transition-colors"
                      >
                        {/* Vista móvil */}
                        <div className="sm:hidden space-y-2">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <p className="font-medium">{producto.nombre}</p>
                              <p className="text-xs text-muted-foreground">{producto.codigo}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-bold text-primary">
                                {formatCurrency(producto.precio_venta || 0)}
                              </p>
                              {producto.precio_anterior && producto.precio_venta && (() => {
                                const cambio = calcularPorcentajeCambio(producto.precio_venta, producto.precio_anterior);
                                return (
                                  <p className="text-xs text-muted-foreground">
                                    <span className="line-through">
                                      Antes: {formatCurrency(producto.precio_anterior)}
                                    </span>
                                    <span className={cambio.esAumento ? "text-destructive ml-1" : "text-green-600 ml-1"}>
                                      ({cambio.texto})
                                    </span>
                                    {producto.fecha_cambio_precio && (
                                      <span className="opacity-60 ml-1">
                                        · {formatearFechaCambio(producto.fecha_cambio_precio)}
                                      </span>
                                    )}
                                  </p>
                                );
                              })()}
                              {producto.precio_por_kilo && (
                                <Badge variant="outline" className="text-[10px] h-5">
                                  <Scale className="h-3 w-3 mr-1" />
                                  Por kilo
                                </Badge>
                              )}
                              {producto.descuento_maximo && producto.descuento_maximo > 0 && (
                                <div className="mt-1">
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-400 dark:border-green-800 text-[10px]">
                                    Desc. máx: -${producto.descuento_maximo.toFixed(2)}
                                  </Badge>
                                  <span className="text-[10px] text-muted-foreground block">
                                    Mín. {formatCurrency((producto.precio_venta || 0) - producto.descuento_maximo)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 text-xs text-muted-foreground">
                            {producto.marca && <span>{producto.marca}</span>}
                            {producto.marca && producto.unidad && <span>•</span>}
                            {producto.unidad && (
                              <span className="capitalize">{producto.unidad}</span>
                            )}
                            {producto.presentacion && (
                              <>
                                <span>•</span>
                                <span>{producto.presentacion}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Vista desktop */}
                        <div className="hidden sm:grid sm:grid-cols-14 gap-2 items-center">
                          <div className="col-span-2">
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                              {producto.codigo}
                            </code>
                          </div>
                          <div className="col-span-3">
                            <p className="font-medium truncate" title={producto.nombre}>
                              {producto.nombre}
                            </p>
                            {producto.presentacion && (
                              <p className="text-xs text-muted-foreground truncate">
                                {producto.presentacion}
                              </p>
                            )}
                          </div>
                          <div className="col-span-2 text-muted-foreground text-sm truncate">
                            {producto.marca || "—"}
                          </div>
                          <div className="col-span-2 text-sm capitalize">
                            {producto.unidad || "—"}
                            {producto.kg_por_unidad && (
                              <span className="text-xs text-muted-foreground block">
                                ({producto.kg_por_unidad} kg)
                              </span>
                            )}
                          </div>
                          <div className="col-span-1 text-right text-muted-foreground text-sm">
                            {producto.precio_anterior && producto.precio_venta ? (() => {
                              const cambio = calcularPorcentajeCambio(producto.precio_venta, producto.precio_anterior);
                              return (
                                <div className="flex flex-col items-end">
                                  <span className="line-through opacity-70">
                                    {formatCurrency(producto.precio_anterior)}
                                  </span>
                                  <span className={`text-xs ${cambio.esAumento ? "text-destructive" : "text-green-600"}`}>
                                    {cambio.texto}
                                  </span>
                                  {producto.fecha_cambio_precio && (
                                    <span className="text-[10px] text-muted-foreground opacity-60">
                                      {formatearFechaCambio(producto.fecha_cambio_precio)}
                                    </span>
                                  )}
                                </div>
                              );
                            })() : "—"}
                          </div>
                          <div className="col-span-2 text-right">
                            <p className="font-bold text-primary">
                              {formatCurrency(producto.precio_venta || 0)}
                            </p>
                            {producto.precio_por_kilo && (
                              <Badge variant="outline" className="text-[10px]">
                                <Scale className="h-3 w-3 mr-1" />
                                /kg
                              </Badge>
                            )}
                          </div>
                          <div className="col-span-2 text-right">
                            {producto.descuento_maximo && producto.descuento_maximo > 0 ? (
                              <div className="flex flex-col items-end">
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-400 dark:border-green-800">
                                  -${producto.descuento_maximo.toFixed(2)}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  Mín. {formatCurrency((producto.precio_venta || 0) - producto.descuento_maximo)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))
        )}
      </div>
    </div>
  );
}
