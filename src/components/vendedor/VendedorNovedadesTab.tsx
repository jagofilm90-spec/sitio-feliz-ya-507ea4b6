import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  Package, 
  TrendingUp, 
  TrendingDown, 
  ArrowRight, 
  Ban,
  Sparkles,
  CheckCircle2
} from "lucide-react";

interface ProductoNuevo {
  id: string;
  codigo: string;
  nombre: string;
  precio_venta: number;
  created_at: string;
}

interface CambioPrecio {
  producto_id: string;
  codigo: string;
  nombre: string;
  precio_anterior: number;
  precio_nuevo: number;
  created_at: string;
}

interface ProductoInhabilitado {
  producto_id: string;
  codigo: string;
  nombre: string;
  created_at: string;
}

export function VendedorNovedadesTab() {
  const [loading, setLoading] = useState(true);
  const [productosNuevos, setProductosNuevos] = useState<ProductoNuevo[]>([]);
  const [cambiosPrecios, setCambiosPrecios] = useState<CambioPrecio[]>([]);
  const [productosInhabilitados, setProductosInhabilitados] = useState<ProductoInhabilitado[]>([]);

  useEffect(() => {
    fetchNovedades();
  }, []);

  const fetchNovedades = async () => {
    try {
      setLoading(true);
      
      // Fecha de hace 48 horas
      const hace48Horas = new Date();
      hace48Horas.setHours(hace48Horas.getHours() - 48);

      // Productos nuevos (últimas 48 horas)
      const { data: nuevos } = await supabase
        .from("productos")
        .select("id, codigo, nombre, precio_venta, created_at")
        .eq("activo", true)
        .or("solo_uso_interno.is.null,solo_uso_interno.eq.false")
        .gte("created_at", hace48Horas.toISOString())
        .order("created_at", { ascending: false });

      // Cambios de precio (últimas 48 horas)
      const { data: cambiosPreciosData } = await supabase
        .from("productos_historial_precios")
        .select(`
          producto_id,
          precio_anterior,
          precio_nuevo,
          created_at,
          productos(codigo, nombre)
        `)
        .gte("created_at", hace48Horas.toISOString())
        .order("created_at", { ascending: false });

      // Productos inhabilitados (últimas 48 horas)
      const { data: productosInhabilitadosData } = await supabase
        .from("productos_historial_estado")
        .select(`
          producto_id,
          created_at,
          productos(codigo, nombre)
        `)
        .eq("activo_nuevo", false)
        .gte("created_at", hace48Horas.toISOString())
        .order("created_at", { ascending: false });

      // Transformar cambios de precios
      const cambiosRaw: CambioPrecio[] = (cambiosPreciosData || [])
        .filter(c => c.productos)
        .map(c => ({
          producto_id: c.producto_id,
          codigo: (c.productos as any).codigo || "",
          nombre: (c.productos as any).nombre || "",
          precio_anterior: c.precio_anterior,
          precio_nuevo: c.precio_nuevo,
          created_at: c.created_at
        }));

      // Filtrar para obtener solo el último cambio por producto
      const obtenerUltimoCambioPorProducto = (cambios: CambioPrecio[]): CambioPrecio[] => {
        const ultimoPorProducto = new Map<string, CambioPrecio>();
        // Ya vienen ordenados por fecha descendente de la consulta
        cambios.forEach(cambio => {
          if (!ultimoPorProducto.has(cambio.producto_id)) {
            ultimoPorProducto.set(cambio.producto_id, cambio);
          }
        });
        return Array.from(ultimoPorProducto.values());
      };

      const cambios = obtenerUltimoCambioPorProducto(cambiosRaw);

      // Transformar productos inhabilitados
      const inhabilitados: ProductoInhabilitado[] = (productosInhabilitadosData || [])
        .filter(p => p.productos)
        .map(p => ({
          producto_id: p.producto_id,
          codigo: (p.productos as any).codigo || "",
          nombre: (p.productos as any).nombre || "",
          created_at: p.created_at
        }));

      setProductosNuevos(nuevos || []);
      setCambiosPrecios(cambios);
      setProductosInhabilitados(inhabilitados);
    } catch (error) {
      console.error("Error fetching novedades:", error);
    } finally {
      setLoading(false);
    }
  };

  const calcularPorcentajeCambio = (anterior: number, nuevo: number) => {
    if (anterior === 0) return 0;
    return ((nuevo - anterior) / anterior) * 100;
  };

  const formatFecha = (fecha: string) => {
    return format(new Date(fecha), "dd MMM, HH:mm", { locale: es });
  };

  const totalNovedades = productosNuevos.length + cambiosPrecios.length + productosInhabilitados.length;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Novedades en Productos</h2>
            <p className="text-sm text-muted-foreground">Cambios en las últimas 48 horas</p>
          </div>
        </div>
        {totalNovedades > 0 && (
          <Badge variant="secondary" className="text-sm">
            {totalNovedades} cambio{totalNovedades !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {totalNovedades === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="font-medium text-lg mb-1">Todo al corriente</h3>
            <p className="text-muted-foreground text-sm">
              No hay novedades en productos en las últimas 48 horas.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {/* Productos nuevos */}
          {productosNuevos.length > 0 && (
            <Card className="border-emerald-500/30 bg-emerald-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-700 dark:text-emerald-400">
                    Productos Nuevos ({productosNuevos.length})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {productosNuevos.map((producto) => (
                    <div 
                      key={producto.id} 
                      className="flex items-center justify-between p-3 rounded-lg bg-background/60 border"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {producto.codigo}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatFecha(producto.created_at)}
                          </span>
                        </div>
                        <p className="font-medium truncate">{producto.nombre}</p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                          {formatCurrency(producto.precio_venta)}
                        </p>
                        <p className="text-xs text-muted-foreground">por kg</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cambios de precio */}
          {cambiosPrecios.length > 0 && (
            <Card className="border-violet-500/30 bg-violet-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                  <span className="text-violet-700 dark:text-violet-400">
                    Cambios de Precio ({cambiosPrecios.length})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {cambiosPrecios.map((cambio, index) => {
                    const porcentaje = calcularPorcentajeCambio(cambio.precio_anterior, cambio.precio_nuevo);
                    const esAumento = porcentaje > 0;
                    return (
                      <div 
                        key={`${cambio.producto_id}-${index}`}
                        className="p-3 rounded-lg bg-background/60 border"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {cambio.codigo}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatFecha(cambio.created_at)}
                          </span>
                        </div>
                        <p className="font-medium mb-2">{cambio.nombre}</p>
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-muted-foreground line-through">
                            {formatCurrency(cambio.precio_anterior)}
                          </span>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold text-lg">
                            {formatCurrency(cambio.precio_nuevo)}
                          </span>
                          <Badge 
                            variant="secondary" 
                            className={`${
                              esAumento 
                                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" 
                                : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            }`}
                          >
                            {esAumento ? (
                              <TrendingUp className="h-3 w-3 mr-1" />
                            ) : (
                              <TrendingDown className="h-3 w-3 mr-1" />
                            )}
                            {porcentaje > 0 ? "+" : ""}{porcentaje.toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Productos inhabilitados */}
          {productosInhabilitados.length > 0 && (
            <Card className="border-red-500/30 bg-red-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Ban className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <span className="text-red-700 dark:text-red-400">
                    Productos Descontinuados ({productosInhabilitados.length})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {productosInhabilitados.map((producto) => (
                    <div 
                      key={producto.producto_id}
                      className="flex items-center justify-between p-3 rounded-lg bg-background/60 border"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {producto.codigo}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatFecha(producto.created_at)}
                          </span>
                        </div>
                        <p className="font-medium text-muted-foreground line-through truncate">
                          {producto.nombre}
                        </p>
                      </div>
                      <Badge variant="destructive" className="ml-4">
                        No disponible
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
