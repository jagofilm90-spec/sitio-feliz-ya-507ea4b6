import { useState } from "react";
import { AlmasaLoading } from "@/components/brand/AlmasaLoading";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Search,
  Warehouse,
  Package,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Boxes} from "lucide-react";
import { InventarioItemMobile } from "./InventarioItemMobile";

interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  stock_actual: number;
  stock_minimo: number;
  unidad: string;
}

interface Lote {
  id: string;
  producto_id: string;
  cantidad_disponible: number;
  fecha_caducidad: string | null;
  fecha_entrada: string;
  lote_referencia: string | null;
  productos: { codigo: string; nombre: string; unidad: string } | null;
}

interface Movimiento {
  id: string;
  producto_id: string;
  tipo_movimiento: string;
  cantidad: number;
  referencia: string | null;
  created_at: string;
  productos: { codigo: string; nombre: string } | null;
  profiles: { full_name: string } | null;
}

export const SecretariaInventarioTab = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("stock");
  const isMobile = useIsMobile();

  // Fetch products with stock
  const { data: productos, isLoading: loadingProductos } = useQuery({
    queryKey: ["secretaria-inventario-productos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("productos")
        .select("id, codigo, nombre, stock_actual, stock_minimo, unidad")
        .eq("activo", true)
        .order("codigo");

      if (error) throw error;
      return data as Producto[];
    }});

  // Fetch recent lots
  const { data: lotes, isLoading: loadingLotes } = useQuery({
    queryKey: ["secretaria-inventario-lotes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventario_lotes")
        .select(`
          id,
          producto_id,
          cantidad_disponible,
          fecha_caducidad,
          fecha_entrada,
          lote_referencia,
          productos (codigo, nombre, unidad)
        `)
        .gt("cantidad_disponible", 0)
        .order("fecha_entrada", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as Lote[];
    }});

  // Fetch recent movements
  const { data: movimientos, isLoading: loadingMovimientos } = useQuery({
    queryKey: ["secretaria-inventario-movimientos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventario_movimientos")
        .select(`
          id,
          producto_id,
          tipo_movimiento,
          cantidad,
          referencia,
          created_at,
          productos (codigo, nombre),
          profiles:usuario_id (full_name)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as Movimiento[];
    }});

  // Filter products
  const filteredProductos = productos?.filter((p) => {
    return (
      p.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Products with low stock
  const lowStockProducts = productos?.filter((p) => p.stock_actual <= p.stock_minimo) || [];

  // Check if caducity is near (30 days)
  const getCaducidadBadge = (fecha: string | null) => {
    if (!fecha) return null;
    const fechaCad = new Date(fecha);
    const hoy = new Date();
    const dias = Math.ceil((fechaCad.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

    if (dias < 0) {
      return <Badge variant="destructive">Vencido</Badge>;
    } else if (dias <= 30) {
      return <Badge variant="outline" className="border-orange-500 text-orange-600">Vence en {dias} días</Badge>;
    }
    return <Badge variant="secondary">{format(fechaCad, "dd/MM/yy")}</Badge>;
  };

  const isLoading = loadingProductos || loadingLotes || loadingMovimientos;

  if (isLoading) {
    return (
      <AlmasaLoading size={48} />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Warehouse className="h-5 w-5 text-pink-600" />
          Inventario General
        </h2>
        <p className="text-sm text-muted-foreground">
          {productos?.length || 0} productos • {lowStockProducts.length} con stock bajo
        </p>
      </div>

      {/* Low stock alert */}
      {lowStockProducts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  {lowStockProducts.length} producto{lowStockProducts.length > 1 ? "s" : ""} con stock bajo
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  {lowStockProducts.slice(0, 3).map((p) => p.nombre).join(", ")}
                  {lowStockProducts.length > 3 && "..."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="stock" className="gap-2">
            <Package className="h-4 w-4" />
            Stock
          </TabsTrigger>
          <TabsTrigger value="lotes" className="gap-2">
            <Boxes className="h-4 w-4" />
            Lotes
          </TabsTrigger>
          <TabsTrigger value="movimientos" className="gap-2">
            <ArrowUp className="h-4 w-4" />
            Movimientos
          </TabsTrigger>
        </TabsList>

        {/* Stock Tab */}
        <TabsContent value="stock" className="mt-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar producto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {isMobile ? (
            // Mobile: vertical list
            <div className="space-y-2">
              {filteredProductos?.slice(0, 50).map((producto) => (
                <InventarioItemMobile
                  key={producto.id}
                  codigo={producto.codigo}
                  nombre={producto.nombre}
                  stockActual={producto.stock_actual}
                  stockMinimo={producto.stock_minimo}
                  unidad={producto.unidad}
                />
              ))}
            </div>
          ) : (
            // Desktop: table
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">Mínimo</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">Unidad</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProductos?.slice(0, 50).map((producto) => (
                      <TableRow key={producto.id}>
                        <TableCell className="font-mono font-medium">{producto.codigo}</TableCell>
                        <TableCell>{producto.nombre}</TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={producto.stock_actual <= producto.stock_minimo ? "destructive" : "secondary"}
                          >
                            {producto.stock_actual}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right hidden sm:table-cell text-muted-foreground">
                          {producto.stock_minimo}
                        </TableCell>
                        <TableCell className="text-right hidden sm:table-cell text-xs">
                          {producto.unidad}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Lotes Tab */}
        <TabsContent value="lotes" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="hidden sm:table-cell">Lote</TableHead>
                    <TableHead className="hidden md:table-cell">Entrada</TableHead>
                    <TableHead>Caducidad</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lotes?.slice(0, 50).map((lote) => (
                    <TableRow key={lote.id}>
                      <TableCell>
                        <div>
                          <span className="font-mono text-xs text-pink-600">{lote.productos?.codigo}</span>
                          <p className="font-medium text-sm">{lote.productos?.nombre}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {lote.cantidad_disponible}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                        {lote.lote_referencia || "—"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs">
                        {format(new Date(lote.fecha_entrada), "dd/MM/yy", { locale: es })}
                      </TableCell>
                      <TableCell>
                        {getCaducidadBadge(lote.fecha_caducidad)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Movimientos Tab */}
        <TabsContent value="movimientos" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="hidden sm:table-cell">Usuario</TableHead>
                    <TableHead className="hidden md:table-cell">Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movimientos?.map((mov) => (
                    <TableRow key={mov.id}>
                      <TableCell>
                        <div>
                          <span className="font-mono text-xs text-pink-600">{mov.productos?.codigo}</span>
                          <p className="font-medium text-sm truncate max-w-[150px]">{mov.productos?.nombre}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={mov.tipo_movimiento === "entrada" ? "default" : mov.tipo_movimiento === "salida" ? "destructive" : "secondary"}
                          className="gap-1"
                        >
                          {mov.tipo_movimiento === "entrada" ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          )}
                          {mov.tipo_movimiento}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {mov.cantidad}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {mov.profiles?.full_name || "—"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs">
                        {format(new Date(mov.created_at), "dd/MM HH:mm", { locale: es })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
