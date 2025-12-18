import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Search, Download, TrendingUp, TrendingDown, Package } from "lucide-react";
import * as XLSX from "xlsx";

interface HistorialItem {
  id: string;
  fecha: string;
  proveedor: string;
  precio_unitario: number;
  cantidad: number;
  subtotal: number;
  status_pago: string;
  folio: string;
}

const HistorialComprasProductoTab = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProducto, setSelectedProducto] = useState<string | null>(null);
  const [rangoAnios, setRangoAnios] = useState("2");

  // Fetch productos for selector
  const { data: productos = [] } = useQuery({
    queryKey: ["productos-historial"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("productos")
        .select("id, nombre, codigo, marca")
        .eq("activo", true)
        .order("nombre");
      if (error) throw error;
      return data;
    },
  });

  // Fetch purchase history for selected product
  const { data: historial = [], isLoading } = useQuery({
    queryKey: ["historial-compras", selectedProducto, rangoAnios],
    queryFn: async () => {
      if (!selectedProducto) return [];

      const fechaDesde = new Date();
      fechaDesde.setFullYear(fechaDesde.getFullYear() - parseInt(rangoAnios));

      const { data, error } = await supabase
        .from("ordenes_compra_detalles")
        .select(`
          id,
          precio_unitario_compra,
          cantidad_ordenada,
          subtotal,
          ordenes_compra (
            id,
            folio,
            fecha_orden,
            status_pago,
            proveedor_id,
            proveedor_nombre_manual,
            proveedores (nombre)
          )
        `)
        .eq("producto_id", selectedProducto)
        .gte("ordenes_compra.fecha_orden", fechaDesde.toISOString())
        .order("ordenes_compra(fecha_orden)", { ascending: false });

      if (error) throw error;

      // Transform data
      return (data || [])
        .filter((item: any) => item.ordenes_compra)
        .map((item: any) => ({
          id: item.id,
          fecha: item.ordenes_compra.fecha_orden,
          proveedor: item.ordenes_compra.proveedores?.nombre || item.ordenes_compra.proveedor_nombre_manual || "Sin nombre",
          precio_unitario: item.precio_unitario_compra,
          cantidad: item.cantidad_ordenada,
          subtotal: item.subtotal,
          status_pago: item.ordenes_compra.status_pago,
          folio: item.ordenes_compra.folio,
        })) as HistorialItem[];
    },
    enabled: !!selectedProducto,
  });

  // Filter productos by search term
  const productosFiltrados = useMemo(() => {
    if (!searchTerm) return productos;
    const term = searchTerm.toLowerCase();
    return productos.filter(
      (p) =>
        p.nombre?.toLowerCase().includes(term) ||
        p.codigo?.toLowerCase().includes(term) ||
        p.marca?.toLowerCase().includes(term)
    );
  }, [productos, searchTerm]);

  // Calculate metrics
  const metricas = useMemo(() => {
    if (historial.length === 0) return null;

    const precios = historial.map((h) => h.precio_unitario);
    const promedio = precios.reduce((a, b) => a + b, 0) / precios.length;
    const minimo = Math.min(...precios);
    const maximo = Math.max(...precios);
    const ultimo = historial[0]?.precio_unitario || 0;
    const ultimoProveedor = historial[0]?.proveedor || "-";
    const totalCompras = historial.length;
    const totalCantidad = historial.reduce((a, b) => a + b.cantidad, 0);

    return {
      promedio,
      minimo,
      maximo,
      ultimo,
      ultimoProveedor,
      totalCompras,
      totalCantidad,
    };
  }, [historial]);

  // Export to Excel
  const exportarExcel = () => {
    if (historial.length === 0) return;

    const producto = productos.find((p) => p.id === selectedProducto);
    const dataExport = historial.map((h) => ({
      Fecha: format(new Date(h.fecha), "dd/MM/yyyy", { locale: es }),
      Folio: h.folio,
      Proveedor: h.proveedor,
      "Precio Unitario": h.precio_unitario,
      Cantidad: h.cantidad,
      Subtotal: h.subtotal,
      "Estado Pago": h.status_pago === "pagado" ? "Pagado" : "Pendiente",
    }));

    const ws = XLSX.utils.json_to_sheet(dataExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Historial");
    XLSX.writeFile(wb, `Historial_${producto?.codigo || "producto"}_${format(new Date(), "yyyyMMdd")}.xlsx`);
  };

  const selectedProductoData = productos.find((p) => p.id === selectedProducto);

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5" />
            Buscar Producto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar por nombre, código o marca..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mb-2"
              />
              <Select
                value={selectedProducto || ""}
                onValueChange={(val) => setSelectedProducto(val || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar producto" />
                </SelectTrigger>
                <SelectContent>
                  {productosFiltrados.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{p.codigo}</span>
                        <span>{p.nombre}</span>
                        {p.marca && (
                          <span className="text-muted-foreground text-xs">({p.marca})</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-48">
              <label className="text-sm text-muted-foreground mb-2 block">Rango de tiempo</label>
              <Select value={rangoAnios} onValueChange={setRangoAnios}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Último año</SelectItem>
                  <SelectItem value="2">Últimos 2 años</SelectItem>
                  <SelectItem value="3">Últimos 3 años</SelectItem>
                  <SelectItem value="5">Últimos 5 años</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Product Info */}
      {selectedProductoData && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-muted-foreground" />
            <span className="font-semibold">{selectedProductoData.nombre}</span>
            <Badge variant="outline">{selectedProductoData.codigo}</Badge>
            {selectedProductoData.marca && (
              <span className="text-muted-foreground text-sm">({selectedProductoData.marca})</span>
            )}
          </div>
          {historial.length > 0 && (
            <Button variant="outline" size="sm" onClick={exportarExcel}>
              <Download className="h-4 w-4 mr-2" />
              Exportar Excel
            </Button>
          )}
        </div>
      )}

      {/* Metrics Cards */}
      {metricas && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">Último precio</div>
              <div className="text-2xl font-bold">${metricas.ultimo.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground truncate">{metricas.ultimoProveedor}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">Precio promedio</div>
              <div className="text-2xl font-bold">${metricas.promedio.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <TrendingDown className="h-3 w-3 text-green-500" />
                Más bajo
              </div>
              <div className="text-2xl font-bold text-green-600">${metricas.minimo.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-red-500" />
                Más alto
              </div>
              <div className="text-2xl font-bold text-red-600">${metricas.maximo.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Additional Stats */}
      {metricas && (
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>Total de compras: <strong className="text-foreground">{metricas.totalCompras}</strong></span>
          <span>Cantidad total: <strong className="text-foreground">{metricas.totalCantidad.toLocaleString()} unidades</strong></span>
        </div>
      )}

      {/* History Table */}
      {selectedProducto && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Historial de Compras</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Cargando historial...</div>
            ) : historial.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No se encontraron compras para este producto en el período seleccionado
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Folio</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead className="text-right">Precio/Unidad</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historial.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          {format(new Date(item.fecha), "dd/MM/yyyy", { locale: es })}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{item.folio}</TableCell>
                        <TableCell>
                          <div className="max-w-[200px] truncate" title={item.proveedor}>
                            {item.proveedor}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${item.precio_unitario.toFixed(2)}
                          {index > 0 && historial[index - 1] && (
                            <span className={`ml-1 text-xs ${
                              item.precio_unitario < historial[index - 1].precio_unitario
                                ? "text-green-600"
                                : item.precio_unitario > historial[index - 1].precio_unitario
                                ? "text-red-600"
                                : "text-muted-foreground"
                            }`}>
                              {item.precio_unitario < historial[index - 1].precio_unitario && "▼"}
                              {item.precio_unitario > historial[index - 1].precio_unitario && "▲"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{item.cantidad.toLocaleString()}</TableCell>
                        <TableCell className="text-right">${item.subtotal.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={item.status_pago === "pagado" ? "default" : "secondary"}>
                            {item.status_pago === "pagado" ? "Pagado" : "Pendiente"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!selectedProducto && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Selecciona un producto para ver su historial de compras</p>
            <p className="text-sm mt-2">
              Podrás ver todos los proveedores, precios y fechas de compra
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default HistorialComprasProductoTab;
