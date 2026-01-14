import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Package, Bug, Calendar, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  marca: string | null;
  categoria: string | null;
  presentacion: number | null;
  unidad: string;
  stock_actual: number;
  stock_minimo: number;
  maneja_caducidad: boolean;
  requiere_fumigacion: boolean;
  fecha_ultima_fumigacion: string | null;
  activo: boolean;
}

export const AlmacenProductosTab = () => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"nombre" | "codigo" | "stock">("nombre");
  const [filterCategory, setFilterCategory] = useState<string>("todos");

  useEffect(() => {
    loadProductos();
  }, []);

  const loadProductos = async () => {
    try {
      const { data, error } = await supabase
        .from("productos")
        .select(`
          id,
          codigo,
          nombre,
          marca,
          categoria,
          presentacion,
          unidad,
          stock_actual,
          stock_minimo,
          maneja_caducidad,
          requiere_fumigacion,
          fecha_ultima_fumigacion,
          activo
        `)
        .eq("activo", true)
        .order("nombre");

      if (error) throw error;
      setProductos(data || []);
    } catch (error) {
      console.error("Error loading productos:", error);
    } finally {
      setLoading(false);
    }
  };

  // Obtener categorías únicas
  const categorias = [...new Set(productos.map((p) => p.categoria).filter(Boolean))];

  // Filtrar
  const filteredProductos = productos.filter((p) => {
    const matchesSearch =
      p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.marca && p.marca.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = filterCategory === "todos" || p.categoria === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // Ordenar
  const sortedProductos = [...filteredProductos].sort((a, b) => {
    if (sortBy === "nombre") {
      return a.nombre.localeCompare(b.nombre);
    } else if (sortBy === "codigo") {
      return a.codigo.localeCompare(b.codigo);
    } else if (sortBy === "stock") {
      return b.stock_actual - a.stock_actual;
    }
    return 0;
  });

  const getStockBadge = (stockActual: number, stockMinimo: number) => {
    if (stockActual <= 0) {
      return <Badge variant="destructive">Sin stock</Badge>;
    } else if (stockActual <= stockMinimo) {
      return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700">Stock bajo</Badge>;
    }
    return <Badge variant="default" className="bg-green-500/20 text-green-700">Disponible</Badge>;
  };

  const getFumigacionStatus = (requiere: boolean, fecha: string | null) => {
    if (!requiere) return null;
    
    if (!fecha) {
      return <Badge variant="destructive" className="text-xs"><Bug className="h-3 w-3 mr-1" />Sin fumigar</Badge>;
    }
    
    const lastDate = new Date(fecha);
    const now = new Date();
    const diffMonths = (now.getFullYear() - lastDate.getFullYear()) * 12 + (now.getMonth() - lastDate.getMonth());
    
    if (diffMonths >= 6) {
      return <Badge variant="destructive" className="text-xs"><Bug className="h-3 w-3 mr-1" />Requiere fumigación</Badge>;
    } else if (diffMonths >= 5) {
      return <Badge variant="secondary" className="text-xs bg-orange-500/20 text-orange-700"><Bug className="h-3 w-3 mr-1" />Próxima fumigación</Badge>;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Barra de búsqueda y filtros */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, código o marca..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-12 text-lg"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="h-12 px-4 rounded-md border bg-background text-foreground"
        >
          <option value="todos">Todas las categorías</option>
          {categorias.map((cat) => (
            <option key={cat} value={cat || ""}>
              {cat}
            </option>
          ))}
        </select>
        <Button
          variant="outline"
          onClick={() => {
            const orders: ("nombre" | "codigo" | "stock")[] = ["nombre", "codigo", "stock"];
            const currentIdx = orders.indexOf(sortBy);
            setSortBy(orders[(currentIdx + 1) % orders.length]);
          }}
          className="h-12 px-4"
        >
          <ArrowUpDown className="h-5 w-5 mr-2" />
          {sortBy === "nombre" ? "Nombre" : sortBy === "codigo" ? "Código" : "Stock"}
        </Button>
      </div>

      {/* Lista de productos - SIN PRECIOS */}
      <ScrollArea className="h-[calc(100vh-320px)]">
        <div className="space-y-2">
          {sortedProductos.length === 0 ? (
            <Card className="p-8 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No se encontraron productos</p>
            </Card>
          ) : (
            sortedProductos.map((producto) => (
              <Card key={producto.id} className="overflow-hidden hover:bg-muted/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-full bg-primary/10">
                        <Package className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{producto.nombre}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="font-mono">{producto.codigo}</span>
                          {producto.marca && <span>• {producto.marca}</span>}
                          {producto.categoria && (
                            <Badge variant="outline" className="text-xs">
                              {producto.categoria}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm">
                            {producto.presentacion ? `${producto.presentacion} kg` : producto.unidad}
                          </span>
                          {producto.maneja_caducidad && (
                            <Badge variant="outline" className="text-xs">
                              <Calendar className="h-3 w-3 mr-1" />
                              Maneja caducidad
                            </Badge>
                          )}
                          {getFumigacionStatus(producto.requiere_fumigacion, producto.fecha_ultima_fumigacion)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{producto.stock_actual}</p>
                      <p className="text-sm text-muted-foreground">{producto.unidad}</p>
                      {getStockBadge(producto.stock_actual, producto.stock_minimo)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Contador */}
      <div className="text-center text-sm text-muted-foreground">
        Mostrando {sortedProductos.length} de {productos.length} productos
      </div>
    </div>
  );
};