import { useState, useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { AlmasaLoading } from "@/components/brand/AlmasaLoading";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useUserRoles } from "@/hooks/useUserRoles";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Search,
  Edit,
  Loader2,
  Coins,
  TrendingUp,
  TrendingDown,
  Minus,
  History,
  AlertTriangle,
  Calculator,
  Target,
  ShieldAlert,
  ShieldCheck,
  ShieldMinus,
} from "lucide-react";
import { analizarMargen, simularPrecioPropuesto } from "@/lib/calculos";
import { getDisplayName } from "@/lib/productUtils";

// Formateo de moneda
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(amount);
};

interface ProductoConCostos {
  id: string;
  codigo: string;
  nombre: string;
  marca: string | null;
  categoria: string | null;
  ultimo_costo_compra: number;
  costo_promedio_ponderado: number;
  precio_venta: number;
  descuento_maximo: number;
  stock_actual: number;
}

interface HistorialCosto {
  id: string;
  producto_id: string;
  producto_nombre: string;
  producto_codigo: string;
  proveedor_id: string | null;
  proveedor_nombre: string | null;
  costo_anterior: number | null;
  costo_nuevo: number;
  fuente: string;
  notas: string | null;
  created_at: string;
  usuario_nombre: string | null;
}

export const SecretariaCostosTab = () => {
  const { isAdmin } = useUserRoles();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("analisis");
  const [categoriaFilter, setCategoriaFilter] = useState<string>("todas");
  const [editDialog, setEditDialog] = useState(false);
  const [editingProducto, setEditingProducto] = useState<ProductoConCostos | null>(null);
  const [nuevoCosto, setNuevoCosto] = useState("");
  const [notas, setNotas] = useState("");
  const [simuladorDialog, setSimuladorDialog] = useState(false);
  const [simuladorProducto, setSimuladorProducto] = useState<ProductoConCostos | null>(null);
  const [precioSimulado, setPrecioSimulado] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch productos con costos y márgenes
  const { data: productos, isLoading: loadingProductos } = useQuery({
    queryKey: ["productos-costos-margen"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("productos")
        .select(`
          id,
          codigo,
          nombre,
          marca,
          categoria,
          ultimo_costo_compra,
          costo_promedio_ponderado,
          precio_venta,
          descuento_maximo,
          stock_actual
        `)
        .eq("activo", true)
        .order("codigo");

      if (error) throw error;
      return data as ProductoConCostos[];
    },
  });

  // Fetch historial de costos
  const { data: historialCostos, isLoading: loadingHistorial } = useQuery({
    queryKey: ["historial-costos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("productos_historial_costos")
        .select(`
          id,
          producto_id,
          proveedor_id,
          costo_anterior,
          costo_nuevo,
          fuente,
          notas,
          created_at,
          usuario_id,
          productos (codigo, nombre),
          proveedores (nombre),
          profiles:usuario_id (full_name)
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      return data?.map((item: any) => ({
        id: item.id,
        producto_id: item.producto_id,
        producto_nombre: item.productos?.nombre || "",
        producto_codigo: item.productos?.codigo || "",
        proveedor_id: item.proveedor_id,
        proveedor_nombre: item.proveedores?.nombre || null,
        costo_anterior: item.costo_anterior,
        costo_nuevo: item.costo_nuevo,
        fuente: item.fuente,
        notas: item.notas,
        created_at: item.created_at,
        usuario_nombre: item.profiles?.full_name || null,
      })) as HistorialCosto[];
    },
  });

  // Obtener categorías únicas
  const categorias = useMemo(() => {
    const cats = new Set<string>();
    productos?.forEach(p => {
      if (p.categoria) cats.add(p.categoria);
    });
    return Array.from(cats).sort();
  }, [productos]);

  // Filtrar productos
  const filteredProductos = useMemo(() => {
    let filtered = productos || [];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.codigo.toLowerCase().includes(term) ||
        p.nombre.toLowerCase().includes(term) ||
        (p.marca?.toLowerCase() || "").includes(term)
      );
    }
    
    if (categoriaFilter !== "todas") {
      filtered = filtered.filter(p => p.categoria === categoriaFilter);
    }
    
    return filtered;
  }, [productos, searchTerm, categoriaFilter]);

  // Agrupar por categoría
  const productosPorCategoria = useMemo(() => {
    const grupos: Record<string, ProductoConCostos[]> = {};
    for (const producto of filteredProductos) {
      const cat = producto.categoria || "Sin categoría";
      if (!grupos[cat]) grupos[cat] = [];
      grupos[cat].push(producto);
    }
    return Object.entries(grupos).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredProductos]);

  // Filtrar historial
  const filteredHistorial = useMemo(() => {
    if (!searchTerm) return historialCostos || [];
    const term = searchTerm.toLowerCase();
    return (historialCostos || []).filter(h =>
      h.producto_codigo.toLowerCase().includes(term) ||
      h.producto_nombre.toLowerCase().includes(term) ||
      (h.proveedor_nombre?.toLowerCase() || "").includes(term)
    );
  }, [historialCostos, searchTerm]);

  // Mutación para editar costo
  const editCostoMutation = useMutation({
    mutationFn: async () => {
      if (!editingProducto) return;

      const costoAnterior = editingProducto.ultimo_costo_compra;
      const costoNuevo = parseFloat(nuevoCosto);

      // Actualizar ultimo_costo_compra en productos
      const { error: productoError } = await supabase
        .from("productos")
        .update({ ultimo_costo_compra: costoNuevo })
        .eq("id", editingProducto.id);

      if (productoError) throw productoError;

      // Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser();

      // Registrar en historial
      const { error: historyError } = await supabase
        .from("productos_historial_costos")
        .insert({
          producto_id: editingProducto.id,
          costo_anterior: costoAnterior || 0,
          costo_nuevo: costoNuevo,
          fuente: "manual",
          notas: notas || null,
          usuario_id: user?.id,
        });

      if (historyError) throw historyError;
    },
    onSuccess: () => {
      toast({ title: "Costo actualizado correctamente" });
      queryClient.invalidateQueries({ queryKey: ["productos-costos-margen"] });
      queryClient.invalidateQueries({ queryKey: ["historial-costos"] });
      setEditDialog(false);
      setEditingProducto(null);
      setNuevoCosto("");
      setNotas("");
    },
    onError: (error: any) => {
      toast({
        title: "Error al actualizar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEditClick = (producto: ProductoConCostos) => {
    setEditingProducto(producto);
    setNuevoCosto(producto.ultimo_costo_compra?.toString() || "0");
    setNotas("");
    setEditDialog(true);
  };

  const handleSimuladorClick = (producto: ProductoConCostos) => {
    setSimuladorProducto(producto);
    setPrecioSimulado(producto.precio_venta.toString());
    setSimuladorDialog(true);
  };

  const handleSaveCosto = () => {
    if (!nuevoCosto || isNaN(parseFloat(nuevoCosto))) {
      toast({
        title: "Error",
        description: "Ingresa un costo válido",
        variant: "destructive",
      });
      return;
    }
    editCostoMutation.mutate();
  };

  const getFuenteLabel = (fuente: string) => {
    switch (fuente) {
      case "manual": return "Manual";
      case "orden_compra": return "Orden de Compra";
      case "recepcion": return "Recepción";
      default: return fuente;
    }
  };

  const getCostoDiff = (anterior: number | null, nuevo: number) => {
    if (!anterior || anterior === 0) return null;
    const diff = nuevo - anterior;
    const percent = ((diff / anterior) * 100).toFixed(1);
    return { diff, percent };
  };

  const getMargenBadge = (estado: string) => {
    switch (estado) {
      case 'perdida':
        return (
          <Badge variant="destructive" className="gap-1">
            <ShieldAlert className="h-3 w-3" />
            PÉRDIDA
          </Badge>
        );
      case 'critico':
        return (
          <Badge variant="outline" className="border-orange-500 text-orange-600 gap-1">
            <AlertTriangle className="h-3 w-3" />
            Crítico
          </Badge>
        );
      case 'bajo':
        return (
          <Badge variant="outline" className="border-yellow-500 text-yellow-600 gap-1">
            <ShieldMinus className="h-3 w-3" />
            Bajo
          </Badge>
        );
      case 'saludable':
        return (
          <Badge variant="outline" className="border-green-500 text-green-600 gap-1">
            <ShieldCheck className="h-3 w-3" />
            OK
          </Badge>
        );
      default:
        return null;
    }
  };

  // Simulación de precio
  const simulacion = useMemo(() => {
    if (!simuladorProducto || !precioSimulado) return null;
    const costo = simuladorProducto.costo_promedio_ponderado > 0 
      ? simuladorProducto.costo_promedio_ponderado 
      : simuladorProducto.ultimo_costo_compra;
    
    return simularPrecioPropuesto(
      costo,
      parseFloat(precioSimulado) || 0,
      simuladorProducto.descuento_maximo || 0,
      simuladorProducto.precio_venta
    );
  }, [simuladorProducto, precioSimulado]);

  const isLoading = loadingProductos || loadingHistorial;

  if (isLoading) {
    return (
      <AlmasaLoading size={48} />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Costos."
        lead={`Análisis de margen · ${productos?.length || 0} productos`}
      />

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código, producto o marca..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las categorías</SelectItem>
            {categorias.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="analisis" className="gap-2">
            <Target className="h-4 w-4" />
            {isAdmin ? "Análisis de Margen" : "Costos"}
          </TabsTrigger>
          <TabsTrigger value="historial" className="gap-2">
            <History className="h-4 w-4" />
            Historial de Cambios
          </TabsTrigger>
        </TabsList>

        {/* Tab: Análisis de Margen */}
        <TabsContent value="analisis" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-20">Código</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right w-24">Últ. Costo</TableHead>
                      {isAdmin && (
                        <TableHead className="text-right w-24 hidden md:table-cell">Costo Prom.</TableHead>
                      )}
                      <TableHead className="text-right w-24">Precio Lista</TableHead>
                      {isAdmin && (
                        <>
                          <TableHead className="text-center w-20">Margen</TableHead>
                          <TableHead className="text-right w-24 hidden lg:table-cell">Piso Mín.</TableHead>
                          <TableHead className="text-right w-24 hidden lg:table-cell">Espacio</TableHead>
                          <TableHead className="w-20"></TableHead>
                        </>
                      )}
                      {!isAdmin && (
                        <TableHead className="text-right w-20">Stock</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productosPorCategoria.length > 0 ? (
                      productosPorCategoria.map(([categoria, prods]) => (
                        <>
                          {/* Separador de categoría */}
                          <TableRow key={`cat-${categoria}`} className="bg-muted/60 hover:bg-muted/60">
                            <TableCell colSpan={9} className="py-1.5 px-2">
                              <span className="font-semibold text-[11px] uppercase tracking-wide text-muted-foreground">
                                {categoria} ({prods.length})
                              </span>
                            </TableCell>
                          </TableRow>
                          {/* Productos */}
                          {prods.map((producto) => {
                            // Solo calcular análisis si es admin
                            const analisis = isAdmin ? analizarMargen({
                              costo_promedio: producto.costo_promedio_ponderado || 0,
                              costo_ultimo: producto.ultimo_costo_compra || 0,
                              precio_venta: producto.precio_venta || 0,
                              descuento_maximo: producto.descuento_maximo || 0,
                            }) : null;
                            
                            // Color de fila solo para admin
                            const rowClass = isAdmin && analisis 
                              ? analisis.estado_margen === 'perdida' 
                                ? 'bg-red-50' 
                                : analisis.estado_margen === 'critico'
                                ? 'bg-orange-50'
                                : ''
                              : '';

                            return (
                              <TableRow key={producto.id} className={rowClass}>
                                <TableCell className="py-1.5 px-2 font-mono text-xs">
                                  {producto.codigo}
                                </TableCell>
                                <TableCell className="py-1.5 px-2">
                                  <div className="min-w-0">
                                    <p className="text-xs font-medium truncate">{getDisplayName(producto)}</p>
                                  </div>
                                </TableCell>
                                <TableCell className="py-1.5 px-2 text-right">
                                  <span className="text-xs font-medium">
                                    {formatCurrency(producto.ultimo_costo_compra || 0)}
                                  </span>
                                </TableCell>
                                
                                {/* Columnas solo para Admin */}
                                {isAdmin && analisis && (
                                  <>
                                    <TableCell className="py-1.5 px-2 text-right hidden md:table-cell">
                                      {producto.costo_promedio_ponderado > 0 ? (
                                        <span className="text-xs text-muted-foreground">
                                          {formatCurrency(producto.costo_promedio_ponderado)}
                                        </span>
                                      ) : (
                                        <span className="text-xs text-muted-foreground">—</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="py-1.5 px-2 text-right">
                                      <span className="text-xs font-bold">
                                        {formatCurrency(producto.precio_venta)}
                                      </span>
                                    </TableCell>
                                    <TableCell className="py-1.5 px-2 text-center">
                                      <div className="flex flex-col items-center gap-0.5">
                                        <span className={`text-xs font-bold ${
                                          analisis.margen_porcentaje < 0 ? 'text-red-600' :
                                          analisis.margen_porcentaje < 5 ? 'text-orange-600' :
                                          analisis.margen_porcentaje < 10 ? 'text-yellow-600' :
                                          'text-green-600'
                                        }`}>
                                          {analisis.margen_porcentaje.toFixed(1)}%
                                        </span>
                                        <span className="text-[9px] text-muted-foreground">
                                          {formatCurrency(analisis.margen_bruto)}
                                        </span>
                                      </div>
                                    </TableCell>
                                    <TableCell className="py-1.5 px-2 text-right hidden lg:table-cell">
                                      <span className="text-xs">
                                        {formatCurrency(analisis.piso_minimo)}
                                      </span>
                                    </TableCell>
                                    <TableCell className="py-1.5 px-2 text-right hidden lg:table-cell">
                                      <span className={`text-xs font-medium ${
                                        analisis.espacio_negociacion < 0 ? 'text-red-600' :
                                        analisis.espacio_negociacion < 20 ? 'text-yellow-600' :
                                        'text-green-600'
                                      }`}>
                                        {analisis.espacio_negociacion >= 0 ? '+' : ''}{formatCurrency(analisis.espacio_negociacion)}
                                      </span>
                                    </TableCell>
                                    <TableCell className="py-1.5 px-1 text-center">
                                      <div className="flex items-center justify-center gap-0.5">
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="h-6 w-6 p-0" 
                                          onClick={() => handleSimuladorClick(producto)}
                                          title="Simular precio"
                                        >
                                          <Calculator className="h-3 w-3" />
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="h-6 w-6 p-0" 
                                          onClick={() => handleEditClick(producto)}
                                          title="Editar costo"
                                        >
                                          <Edit className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </>
                                )}

                                {/* Columnas para Secretaria (vista simplificada) */}
                                {!isAdmin && (
                                  <>
                                    <TableCell className="py-1.5 px-2 text-right">
                                      <span className="text-xs font-bold">
                                        {formatCurrency(producto.precio_venta)}
                                      </span>
                                    </TableCell>
                                    <TableCell className="py-1.5 px-2 text-right">
                                      <span className="text-xs">
                                        {producto.stock_actual}
                                      </span>
                                    </TableCell>
                                  </>
                                )}
                              </TableRow>
                            );
                          })}
                        </>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={isAdmin ? 9 : 5} className="text-center py-8 text-muted-foreground">
                          No se encontraron productos
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Leyenda - Solo visible para Admin */}
          {isAdmin && (
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mt-2">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-red-200" />
                <span>Margen &lt; 0% (Pérdida)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-orange-200" />
                <span>Margen 0-5% (Crítico)</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-yellow-600 font-bold">●</span>
                <span>Margen 5-10% (Bajo)</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-green-600 font-bold">●</span>
                <span>Margen &gt;10% (Saludable)</span>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Tab: Historial */}
        <TabsContent value="historial" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead className="hidden md:table-cell">Proveedor</TableHead>
                      <TableHead className="text-right">Anterior</TableHead>
                      <TableHead className="text-right">Nuevo</TableHead>
                      <TableHead className="text-center hidden sm:table-cell">Cambio</TableHead>
                      <TableHead className="hidden lg:table-cell">Fuente</TableHead>
                      <TableHead className="hidden lg:table-cell">Usuario</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHistorial.length > 0 ? (
                      filteredHistorial.map((item) => {
                        const diff = getCostoDiff(item.costo_anterior, item.costo_nuevo);
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="text-sm">
                              {format(new Date(item.created_at), "dd/MM/yy HH:mm", { locale: es })}
                            </TableCell>
                            <TableCell>
                              <p className="font-medium">{item.producto_nombre}</p>
                              <p className="text-xs text-muted-foreground font-mono">
                                {item.producto_codigo}
                              </p>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              {item.proveedor_nombre ? (
                                <Badge variant="outline">{item.proveedor_nombre}</Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {item.costo_anterior ? formatCurrency(item.costo_anterior) : "—"}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(item.costo_nuevo)}
                            </TableCell>
                            <TableCell className="text-center hidden sm:table-cell">
                              {diff ? (
                                <span
                                  className={`inline-flex items-center gap-1 text-sm ${
                                    diff.diff > 0
                                      ? "text-red-600"
                                      : diff.diff < 0
                                      ? "text-green-600"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  {diff.diff > 0 ? (
                                    <TrendingUp className="h-3 w-3" />
                                  ) : diff.diff < 0 ? (
                                    <TrendingDown className="h-3 w-3" />
                                  ) : (
                                    <Minus className="h-3 w-3" />
                                  )}
                                  {diff.percent}%
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <Badge variant="secondary" className="text-xs">
                                {getFuenteLabel(item.fuente)}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                              {item.usuario_nombre || "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No hay historial de cambios
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog: Editar Costo - Solo Admin */}
      {isAdmin && (
        <Dialog open={editDialog} onOpenChange={setEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Costo</DialogTitle>
              <DialogDescription>
                {editingProducto?.codigo} - {editingProducto?.nombre}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Último Costo</Label>
                  <p className="text-lg font-bold text-muted-foreground">
                    {formatCurrency(editingProducto?.ultimo_costo_compra || 0)}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Costo Promedio</Label>
                  <p className="text-lg font-bold text-muted-foreground">
                    {editingProducto?.costo_promedio_ponderado 
                      ? formatCurrency(editingProducto.costo_promedio_ponderado) 
                      : "—"}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nuevoCosto">Nuevo Costo *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="nuevoCosto"
                    type="number"
                    step="0.01"
                    min="0"
                    className="pl-7"
                    value={nuevoCosto}
                    onChange={(e) => setNuevoCosto(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notas">Notas (opcional)</Label>
                <Textarea
                  id="notas"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Ej: Cotización telefónica con proveedor"
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditDialog(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSaveCosto}
                  disabled={editCostoMutation.isPending}
                >
                  {editCostoMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Guardar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog: Simulador de Precio - Solo Admin */}
      {isAdmin && (
        <Dialog open={simuladorDialog} onOpenChange={setSimuladorDialog}>
          <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md overflow-x-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-blue-600" />
                Simulador de Precio
              </DialogTitle>
              <DialogDescription>
                {simuladorProducto?.codigo} - {simuladorProducto?.nombre}
              </DialogDescription>
            </DialogHeader>
            
            {simuladorProducto && (
              <div className="space-y-4 py-4">
                {/* Info actual */}
                <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground">Costo Referencia</p>
                    <p className="font-bold">
                      {formatCurrency(simuladorProducto.costo_promedio_ponderado > 0 
                        ? simuladorProducto.costo_promedio_ponderado 
                        : simuladorProducto.ultimo_costo_compra)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Precio Lista</p>
                    <p className="font-bold">{formatCurrency(simuladorProducto.precio_venta)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Desc. Máximo</p>
                    <p className="font-medium text-emerald-600">
                      -{formatCurrency(simuladorProducto.descuento_maximo || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Piso Mínimo</p>
                    <p className="font-bold text-amber-600">
                      {formatCurrency(simuladorProducto.precio_venta - (simuladorProducto.descuento_maximo || 0))}
                    </p>
                  </div>
                </div>

                {/* Input precio propuesto */}
                <div className="space-y-2">
                  <Label>Precio propuesto al cliente</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      className="pl-7 text-lg font-bold"
                      value={precioSimulado}
                      onChange={(e) => setPrecioSimulado(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Resultado de simulación */}
                {simulacion && (
                  <div className={`p-4 rounded-lg border-2 ${
                    simulacion.es_perdida 
                      ? 'border-red-500 bg-red-50' 
                      : simulacion.requiere_autorizacion
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-green-500 bg-green-50'
                  }`}>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Margen resultante</p>
                        <p className={`text-xl font-bold ${
                          simulacion.es_perdida ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {simulacion.margen_porcentaje.toFixed(1)}%
                        </p>
                        <p className={`text-sm ${
                          simulacion.es_perdida ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {formatCurrency(simulacion.margen_pesos)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Descuento otorgado</p>
                        <p className="text-xl font-bold">
                          {formatCurrency(simulacion.diferencia_vs_lista)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          vs máx. {formatCurrency(simuladorProducto.descuento_maximo || 0)}
                        </p>
                      </div>
                    </div>

                    {/* Alertas */}
                    <div className="mt-3 pt-3 border-t">
                      {simulacion.es_perdida ? (
                        <div className="flex items-center gap-2 text-red-600">
                          <ShieldAlert className="h-5 w-5" />
                          <span className="font-medium">¡PÉRDIDA! No se recomienda este precio</span>
                        </div>
                      ) : simulacion.requiere_autorizacion ? (
                        <div className="flex items-center gap-2 text-orange-600">
                          <AlertTriangle className="h-5 w-5" />
                          <span className="font-medium">
                            Requiere autorización (rebasa desc. máximo por {formatCurrency(simulacion.diferencia_vs_lista - (simuladorProducto.descuento_maximo || 0))})
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-green-600">
                          <ShieldCheck className="h-5 w-5" />
                          <span className="font-medium">Precio dentro del rango autorizado</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => setSimuladorDialog(false)}
                >
                  Cerrar
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
