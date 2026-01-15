import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { Search, Loader2, DollarSign } from "lucide-react";

interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  especificaciones: string | null;
  marca: string | null;
  categoria: string | null;
  peso_kg: number | null;
  unidad: string;
  precio_venta: number;
  precio_por_kilo: boolean;
  stock_actual: number;
  activo: boolean;
}

export const SecretariaListaPreciosTab = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState<string>("all");

  // Fetch products
  const { data: productos, isLoading } = useQuery({
    queryKey: ["secretaria-lista-precios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("productos")
        .select("id, codigo, nombre, especificaciones, marca, categoria, peso_kg, unidad, precio_venta, precio_por_kilo, stock_actual, activo")
        .eq("activo", true)
        .or("solo_uso_interno.is.null,solo_uso_interno.eq.false")
        .order("codigo");

      if (error) throw error;
      return data as Producto[];
    },
  });

  // Get unique categories
  const categorias = [...new Set(productos?.map((p) => p.categoria).filter(Boolean))] as string[];

  // Filter products
  const filteredProductos = productos?.filter((p) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      p.codigo.toLowerCase().includes(term) ||
      p.nombre.toLowerCase().includes(term) ||
      (p.especificaciones?.toLowerCase() || "").includes(term) ||
      (p.marca?.toLowerCase() || "").includes(term);

    const matchesCategoria = categoriaFilter === "all" || p.categoria === categoriaFilter;

    return matchesSearch && matchesCategoria;
  });

  // Calculate price per kilo if applicable
  const getPrecioKilo = (producto: Producto) => {
    if (producto.precio_por_kilo) return producto.precio_venta;
    if (producto.peso_kg && producto.peso_kg > 0) {
      return producto.precio_venta / producto.peso_kg;
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-pink-600" />
          Lista de Precios
        </h2>
        <p className="text-sm text-muted-foreground">
          {productos?.length || 0} productos activos
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código, nombre o marca..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {categorias.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Price List Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-pink-50 dark:bg-pink-950/20">
                  <TableHead>Código</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead className="hidden md:table-cell">Presentación</TableHead>
                  <TableHead className="hidden lg:table-cell">Categoría</TableHead>
                  <TableHead className="text-right">Precio Unitario</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">$/Kilo</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Stock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProductos && filteredProductos.length > 0 ? (
                  filteredProductos.map((producto) => {
                    const precioKilo = getPrecioKilo(producto);
                    return (
                      <TableRow key={producto.id} className="hover:bg-muted/50">
                        <TableCell className="font-mono font-medium text-pink-600">
                          {producto.codigo}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {producto.nombre}
                              {producto.especificaciones && (
                                <span className="text-muted-foreground font-normal ml-1">
                                  {producto.especificaciones}
                                </span>
                              )}
                            </p>
                            {producto.marca && (
                              <p className="text-xs text-muted-foreground">{producto.marca}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center gap-2">
                            {producto.peso_kg && (
                              <span>{producto.peso_kg} kg</span>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {producto.unidad}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          {producto.categoria || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-mono font-semibold text-lg">
                            {formatCurrency(producto.precio_venta)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right hidden sm:table-cell font-mono">
                          {precioKilo ? (
                            <span className="text-muted-foreground">
                              {formatCurrency(precioKilo)}
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-right hidden sm:table-cell">
                          <Badge 
                            variant={producto.stock_actual <= 0 ? "destructive" : "secondary"}
                          >
                            {producto.stock_actual}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No se encontraron productos
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
