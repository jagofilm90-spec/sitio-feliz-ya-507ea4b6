import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Package, AlertTriangle, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Lote {
  id: string;
  producto_id: string;
  cantidad_disponible: number;
  fecha_caducidad: string | null;
  lote_referencia: string | null;
  bodega: { nombre: string } | null;
  producto: {
    codigo: string;
    nombre: string;
    presentacion: string | null;
    unidad: string;
    stock_actual: number;
    stock_minimo: number;
  };
}

export const AlmacenInventarioTab = () => {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"nombre" | "stock" | "caducidad">("nombre");

  useEffect(() => {
    loadInventario();
  }, []);

  const loadInventario = async () => {
    try {
      const { data, error } = await supabase
        .from("inventario_lotes")
        .select(`
          id,
          producto_id,
          cantidad_disponible,
          fecha_caducidad,
          lote_referencia,
          bodega:bodega_id (nombre),
          producto:producto_id (
            codigo,
            nombre,
            presentacion,
            unidad,
            stock_actual,
            stock_minimo
          )
        `)
        .gt("cantidad_disponible", 0)
        .order("fecha_caducidad", { ascending: true });

      if (error) throw error;
      setLotes((data as unknown as Lote[]) || []);
    } catch (error) {
      console.error("Error loading inventario:", error);
    } finally {
      setLoading(false);
    }
  };

  // Agrupar por producto
  const productosAgrupados = lotes.reduce((acc, lote) => {
    const key = lote.producto_id;
    if (!acc[key]) {
      acc[key] = {
        producto: lote.producto,
        lotes: [],
        stockTotal: 0,
      };
    }
    acc[key].lotes.push(lote);
    acc[key].stockTotal += lote.cantidad_disponible;
    return acc;
  }, {} as Record<string, { producto: Lote["producto"]; lotes: Lote[]; stockTotal: number }>);

  const productosArray = Object.values(productosAgrupados);

  // Filtrar por búsqueda
  const filteredProductos = productosArray.filter(
    (p) =>
      p.producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.producto.codigo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Ordenar
  const sortedProductos = [...filteredProductos].sort((a, b) => {
    if (sortBy === "nombre") {
      return a.producto.nombre.localeCompare(b.producto.nombre);
    } else if (sortBy === "stock") {
      return b.stockTotal - a.stockTotal;
    } else if (sortBy === "caducidad") {
      const aDate = a.lotes[0]?.fecha_caducidad || "9999-12-31";
      const bDate = b.lotes[0]?.fecha_caducidad || "9999-12-31";
      return aDate.localeCompare(bDate);
    }
    return 0;
  });

  const getStockBadge = (stockActual: number, stockMinimo: number) => {
    if (stockActual <= 0) {
      return <Badge variant="destructive">Sin stock</Badge>;
    } else if (stockActual <= stockMinimo) {
      return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700">Stock bajo</Badge>;
    }
    return <Badge variant="default" className="bg-green-500/20 text-green-700">OK</Badge>;
  };

  const formatCaducidad = (fecha: string | null) => {
    if (!fecha) return null;
    const date = new Date(fecha);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return <Badge variant="destructive">Vencido hace {Math.abs(diffDays)} días</Badge>;
    } else if (diffDays <= 30) {
      return <Badge variant="secondary" className="bg-orange-500/20 text-orange-700">Vence en {diffDays} días</Badge>;
    }
    return <span className="text-muted-foreground text-sm">{date.toLocaleDateString("es-MX")}</span>;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Barra de búsqueda y filtros */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-12 text-lg"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => {
            const orders: ("nombre" | "stock" | "caducidad")[] = ["nombre", "stock", "caducidad"];
            const currentIdx = orders.indexOf(sortBy);
            setSortBy(orders[(currentIdx + 1) % orders.length]);
          }}
          className="h-12 px-4"
        >
          <ArrowUpDown className="h-5 w-5 mr-2" />
          {sortBy === "nombre" ? "Nombre" : sortBy === "stock" ? "Stock" : "Caducidad"}
        </Button>
      </div>

      {/* Lista de productos */}
      <ScrollArea className="h-[calc(100vh-320px)]">
        <div className="space-y-3">
          {sortedProductos.length === 0 ? (
            <Card className="p-8 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No se encontraron productos</p>
            </Card>
          ) : (
            sortedProductos.map(({ producto, lotes, stockTotal }) => (
              <Card key={producto.codigo} className="overflow-hidden">
                <CardHeader className="py-3 px-4 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-primary/10">
                        <Package className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{producto.nombre}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {producto.codigo} • {producto.presentacion || producto.unidad}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{stockTotal}</p>
                      <div className="flex items-center gap-2">
                        {getStockBadge(stockTotal, producto.stock_minimo)}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {lotes.map((lote) => (
                      <div key={lote.id} className="px-4 py-2 flex items-center justify-between bg-background">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium">
                            {lote.cantidad_disponible} {producto.unidad}
                          </span>
                          {lote.lote_referencia && (
                            <span className="text-xs text-muted-foreground">
                              Lote: {lote.lote_referencia}
                            </span>
                          )}
                          {lote.bodega && (
                            <Badge variant="outline" className="text-xs">
                              {lote.bodega.nombre}
                            </Badge>
                          )}
                        </div>
                        <div>
                          {formatCaducidad(lote.fecha_caducidad)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};