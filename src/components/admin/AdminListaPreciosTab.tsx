import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, Search, TrendingUp, TrendingDown, DollarSign, 
  AlertTriangle, CheckCircle2, XCircle, Calculator, Pencil,
  ArrowUpDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { analizarMargen, simularPrecioPropuesto, calcularPrecioSugerido, redondear } from "@/lib/calculos";

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
  descuento_maximo: number | null;
  activo: boolean;
  ultimo_costo_compra: number | null;
  costo_promedio_ponderado: number | null;
}

interface ProductoConAnalisis extends Producto {
  analisis: {
    costo_referencia: number;
    precio_venta: number;
    piso_minimo: number;
    margen_bruto: number;
    margen_porcentaje: number;
    espacio_negociacion: number;
    estado_margen: 'perdida' | 'critico' | 'bajo' | 'saludable';
    puede_dar_descuento_maximo: boolean;
  };
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount);
};

const getDisplayName = (producto: Producto) => {
  let name = producto.nombre;
  if (producto.especificaciones) {
    name += ` ${producto.especificaciones}`;
  }
  if (producto.marca) {
    name += ` - ${producto.marca}`;
  }
  return name;
};

const getEstadoBadge = (estado: 'perdida' | 'critico' | 'bajo' | 'saludable') => {
  switch (estado) {
    case 'perdida':
      return (
        <Badge variant="destructive" className="text-[10px] px-1.5 py-0 flex items-center gap-0.5">
          <XCircle className="h-3 w-3" />
          Pérdida
        </Badge>
      );
    case 'critico':
      return (
        <Badge className="text-[10px] px-1.5 py-0 bg-orange-500 hover:bg-orange-600 flex items-center gap-0.5">
          <AlertTriangle className="h-3 w-3" />
          Crítico
        </Badge>
      );
    case 'bajo':
      return (
        <Badge className="text-[10px] px-1.5 py-0 bg-amber-500 hover:bg-amber-600 flex items-center gap-0.5">
          <TrendingDown className="h-3 w-3" />
          Bajo
        </Badge>
      );
    case 'saludable':
      return (
        <Badge className="text-[10px] px-1.5 py-0 bg-green-600 hover:bg-green-700 flex items-center gap-0.5">
          <CheckCircle2 className="h-3 w-3" />
          OK
        </Badge>
      );
  }
};

type SortField = 'codigo' | 'nombre' | 'costo' | 'precio' | 'margen' | 'estado';
type SortOrder = 'asc' | 'desc';

export const AdminListaPreciosTab = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState<string>("all");
  const [estadoFilter, setEstadoFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>('nombre');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  
  // Simulador
  const [simuladorOpen, setSimuladorOpen] = useState(false);
  const [simuladorProduct, setSimuladorProduct] = useState<ProductoConAnalisis | null>(null);
  const [precioPropuesto, setPrecioPropuesto] = useState("");
  
  // Editor
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null);
  const [precioVenta, setPrecioVenta] = useState("");
  const [descuentoMaximo, setDescuentoMaximo] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch products with costs
  const { data: productos, isLoading } = useQuery({
    queryKey: ["admin-lista-precios-analisis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("productos")
        .select("id, codigo, nombre, especificaciones, marca, categoria, peso_kg, unidad, precio_venta, precio_por_kilo, descuento_maximo, activo, ultimo_costo_compra, costo_promedio_ponderado")
        .eq("activo", true)
        .or("solo_uso_interno.is.null,solo_uso_interno.eq.false")
        .order("categoria")
        .order("nombre");

      if (error) throw error;
      return data as Producto[];
    },
  });

  // Update price mutation
  const updatePriceMutation = useMutation({
    mutationFn: async ({ id, precio_venta, descuento_maximo }: { id: string; precio_venta: number; descuento_maximo: number | null }) => {
      const { error } = await supabase
        .from("productos")
        .update({ precio_venta, descuento_maximo })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Precio actualizado" });
      queryClient.invalidateQueries({ queryKey: ["admin-lista-precios-analisis"] });
      setEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error al actualizar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Process products with margin analysis
  const productosConAnalisis = useMemo(() => {
    if (!productos) return [];
    
    return productos.map(p => {
      const analisis = analizarMargen({
        costo_promedio: p.costo_promedio_ponderado || 0,
        costo_ultimo: p.ultimo_costo_compra || 0,
        precio_venta: p.precio_venta,
        descuento_maximo: p.descuento_maximo || 0
      });
      
      return { ...p, analisis };
    });
  }, [productos]);

  // Get unique categories
  const categorias = [...new Set(productos?.map((p) => p.categoria).filter(Boolean))] as string[];

  // Filter and sort
  const filteredProductos = useMemo(() => {
    let result = productosConAnalisis.filter((p) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        p.codigo.toLowerCase().includes(term) ||
        p.nombre.toLowerCase().includes(term) ||
        (p.especificaciones?.toLowerCase() || "").includes(term);

      const matchesCategoria = categoriaFilter === "all" || p.categoria === categoriaFilter;
      const matchesEstado = estadoFilter === "all" || p.analisis.estado_margen === estadoFilter;

      return matchesSearch && matchesCategoria && matchesEstado;
    });
    
    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'codigo':
          comparison = a.codigo.localeCompare(b.codigo);
          break;
        case 'nombre':
          comparison = a.nombre.localeCompare(b.nombre);
          break;
        case 'costo':
          comparison = (a.analisis.costo_referencia || 0) - (b.analisis.costo_referencia || 0);
          break;
        case 'precio':
          comparison = a.precio_venta - b.precio_venta;
          break;
        case 'margen':
          comparison = a.analisis.margen_porcentaje - b.analisis.margen_porcentaje;
          break;
        case 'estado':
          const estadoOrder = { perdida: 0, critico: 1, bajo: 2, saludable: 3 };
          comparison = estadoOrder[a.analisis.estado_margen] - estadoOrder[b.analisis.estado_margen];
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return result;
  }, [productosConAnalisis, searchTerm, categoriaFilter, estadoFilter, sortField, sortOrder]);

  // Summary stats
  const stats = useMemo(() => {
    const total = productosConAnalisis.length;
    const perdida = productosConAnalisis.filter(p => p.analisis.estado_margen === 'perdida').length;
    const critico = productosConAnalisis.filter(p => p.analisis.estado_margen === 'critico').length;
    const bajo = productosConAnalisis.filter(p => p.analisis.estado_margen === 'bajo').length;
    const saludable = productosConAnalisis.filter(p => p.analisis.estado_margen === 'saludable').length;
    return { total, perdida, critico, bajo, saludable };
  }, [productosConAnalisis]);

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Open simulator
  const openSimulador = (producto: typeof filteredProductos[0]) => {
    setSimuladorProduct(producto);
    setPrecioPropuesto(producto.precio_venta.toString());
    setSimuladorOpen(true);
  };

  // Open editor
  const openEditor = (producto: Producto) => {
    setEditingProduct(producto);
    setPrecioVenta(producto.precio_venta.toString());
    setDescuentoMaximo(producto.descuento_maximo?.toString() || "");
    setEditDialogOpen(true);
  };

  // Save edit
  const handleSaveEdit = () => {
    if (!editingProduct) return;
    const precio = parseFloat(precioVenta);
    if (isNaN(precio) || precio <= 0) {
      toast({ title: "Precio inválido", variant: "destructive" });
      return;
    }
    const descuento = descuentoMaximo ? parseFloat(descuentoMaximo) : null;
    updatePriceMutation.mutate({ 
      id: editingProduct.id, 
      precio_venta: precio, 
      descuento_maximo: descuento 
    });
  };

  // Simulate result
  const simulacionResult = useMemo(() => {
    if (!simuladorProduct || !precioPropuesto) return null;
    const precio = parseFloat(precioPropuesto);
    if (isNaN(precio)) return null;
    
    return simularPrecioPropuesto(
      simuladorProduct.analisis.costo_referencia,
      precio,
      simuladorProduct.descuento_maximo || 0,
      simuladorProduct.precio_venta
    );
  }, [simuladorProduct, precioPropuesto]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b bg-background sticky top-0 z-20 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Análisis de Precios y Márgenes</h2>
          </div>
        </div>
        
        {/* Stats badges */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-xs">
            Total: {stats.total}
          </Badge>
          <Badge 
            variant="outline" 
            className={cn("text-xs cursor-pointer", estadoFilter === 'perdida' && "bg-red-100 dark:bg-red-900/30")}
            onClick={() => setEstadoFilter(estadoFilter === 'perdida' ? 'all' : 'perdida')}
          >
            <XCircle className="h-3 w-3 mr-1 text-red-500" />
            Pérdida: {stats.perdida}
          </Badge>
          <Badge 
            variant="outline" 
            className={cn("text-xs cursor-pointer", estadoFilter === 'critico' && "bg-orange-100 dark:bg-orange-900/30")}
            onClick={() => setEstadoFilter(estadoFilter === 'critico' ? 'all' : 'critico')}
          >
            <AlertTriangle className="h-3 w-3 mr-1 text-orange-500" />
            Crítico: {stats.critico}
          </Badge>
          <Badge 
            variant="outline" 
            className={cn("text-xs cursor-pointer", estadoFilter === 'bajo' && "bg-amber-100 dark:bg-amber-900/30")}
            onClick={() => setEstadoFilter(estadoFilter === 'bajo' ? 'all' : 'bajo')}
          >
            <TrendingDown className="h-3 w-3 mr-1 text-amber-500" />
            Bajo: {stats.bajo}
          </Badge>
          <Badge 
            variant="outline" 
            className={cn("text-xs cursor-pointer", estadoFilter === 'saludable' && "bg-green-100 dark:bg-green-900/30")}
            onClick={() => setEstadoFilter(estadoFilter === 'saludable' ? 'all' : 'saludable')}
          >
            <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
            OK: {stats.saludable}
          </Badge>
        </div>
        
        {/* Search and filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código o nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
          <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
            <SelectTrigger className="w-full sm:w-[160px] h-9">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categorias.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead 
                className="w-[60px] py-2 px-1.5 text-[10px] cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('codigo')}
              >
                <div className="flex items-center gap-1">
                  Código
                  {sortField === 'codigo' && <ArrowUpDown className="h-3 w-3" />}
                </div>
              </TableHead>
              <TableHead 
                className="min-w-[180px] py-2 px-1.5 text-[10px] cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('nombre')}
              >
                <div className="flex items-center gap-1">
                  Producto
                  {sortField === 'nombre' && <ArrowUpDown className="h-3 w-3" />}
                </div>
              </TableHead>
              <TableHead className="w-[70px] py-2 px-1.5 text-[10px]">
                Marca
              </TableHead>
              <TableHead 
                className="w-[70px] py-2 px-1.5 text-[10px] text-right cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('costo')}
              >
                <div className="flex items-center justify-end gap-1">
                  Costo
                  {sortField === 'costo' && <ArrowUpDown className="h-3 w-3" />}
                </div>
              </TableHead>
              <TableHead 
                className="w-[70px] py-2 px-1.5 text-[10px] text-right cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('precio')}
              >
                <div className="flex items-center justify-end gap-1">
                  Precio
                  {sortField === 'precio' && <ArrowUpDown className="h-3 w-3" />}
                </div>
              </TableHead>
              <TableHead className="w-[60px] py-2 px-1.5 text-[10px] text-right">
                Dto Max
              </TableHead>
              <TableHead 
                className="w-[55px] py-2 px-1.5 text-[10px] text-right cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('margen')}
              >
                <div className="flex items-center justify-end gap-1">
                  Margen
                  {sortField === 'margen' && <ArrowUpDown className="h-3 w-3" />}
                </div>
              </TableHead>
              <TableHead className="w-[60px] py-2 px-1.5 text-[10px] text-right">
                Piso
              </TableHead>
              <TableHead className="w-[55px] py-2 px-1.5 text-[10px] text-right">
                Espacio
              </TableHead>
              <TableHead 
                className="w-[70px] py-2 px-1.5 text-[10px] text-center cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('estado')}
              >
                <div className="flex items-center justify-center gap-1">
                  Estado
                  {sortField === 'estado' && <ArrowUpDown className="h-3 w-3" />}
                </div>
              </TableHead>
              <TableHead className="w-[60px] py-2 px-1 text-[10px] text-center">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProductos.map((producto) => {
              const { analisis } = producto;
              const rowClass = cn(
                "h-8",
                analisis.estado_margen === 'perdida' && "bg-red-50 dark:bg-red-950/20",
                analisis.estado_margen === 'critico' && "bg-orange-50 dark:bg-orange-950/20"
              );
              
              return (
                <TableRow key={producto.id} className={rowClass}>
                  <TableCell className="py-1 px-1.5 text-[10px] font-mono text-muted-foreground">
                    {producto.codigo}
                  </TableCell>
                  <TableCell className="py-1 px-1.5">
                    <span className="text-xs">
                      {producto.nombre}
                      {producto.especificaciones && (
                        <span className="text-purple-600 dark:text-purple-400 ml-1">
                          {producto.especificaciones}
                        </span>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="py-1 px-1.5">
                    {producto.marca ? (
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                        {producto.marca}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="py-1 px-1.5 text-right">
                    <span className="text-xs font-medium text-muted-foreground">
                      {analisis.costo_referencia > 0 ? formatCurrency(analisis.costo_referencia) : "-"}
                    </span>
                  </TableCell>
                  <TableCell className="py-1 px-1.5 text-right">
                    <span className="text-xs font-semibold">
                      {formatCurrency(producto.precio_venta)}
                    </span>
                  </TableCell>
                  <TableCell className="py-1 px-1.5 text-right">
                    <span className="text-[11px] text-muted-foreground">
                      {producto.descuento_maximo ? formatCurrency(producto.descuento_maximo) : "-"}
                    </span>
                  </TableCell>
                  <TableCell className="py-1 px-1.5 text-right">
                    <span className={cn(
                      "text-xs font-medium",
                      analisis.margen_porcentaje < 0 && "text-red-600",
                      analisis.margen_porcentaje >= 0 && analisis.margen_porcentaje < 5 && "text-orange-600",
                      analisis.margen_porcentaje >= 5 && analisis.margen_porcentaje < 10 && "text-amber-600",
                      analisis.margen_porcentaje >= 10 && "text-green-600"
                    )}>
                      {analisis.costo_referencia > 0 ? `${analisis.margen_porcentaje}%` : "-"}
                    </span>
                  </TableCell>
                  <TableCell className="py-1 px-1.5 text-right">
                    <span className="text-[11px] text-muted-foreground">
                      {formatCurrency(analisis.piso_minimo)}
                    </span>
                  </TableCell>
                  <TableCell className="py-1 px-1.5 text-right">
                    <span className={cn(
                      "text-[11px]",
                      analisis.espacio_negociacion < 0 && "text-red-600 font-medium",
                      analisis.espacio_negociacion >= 0 && "text-muted-foreground"
                    )}>
                      {analisis.costo_referencia > 0 ? formatCurrency(analisis.espacio_negociacion) : "-"}
                    </span>
                  </TableCell>
                  <TableCell className="py-1 px-1.5 text-center">
                    {getEstadoBadge(analisis.estado_margen)}
                  </TableCell>
                  <TableCell className="py-1 px-1 text-center">
                    <div className="flex items-center justify-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => openSimulador(producto)}
                        title="Simular precio"
                      >
                        <Calculator className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => openEditor(producto)}
                        title="Editar precio"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Simulador Dialog */}
      <Dialog open={simuladorOpen} onOpenChange={setSimuladorOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Simulador de Precio
            </DialogTitle>
            <DialogDescription>
              {simuladorProduct && getDisplayName(simuladorProduct)}
            </DialogDescription>
          </DialogHeader>
          
          {simuladorProduct && (
            <div className="space-y-4">
              {/* Info actual */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-muted-foreground text-xs">Costo Ref.</div>
                  <div className="font-semibold">{formatCurrency(simuladorProduct.analisis.costo_referencia)}</div>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-muted-foreground text-xs">Precio Lista</div>
                  <div className="font-semibold">{formatCurrency(simuladorProduct.precio_venta)}</div>
                </div>
              </div>
              
              {/* Input precio propuesto */}
              <div className="space-y-2">
                <Label>Precio propuesto</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    value={precioPropuesto}
                    onChange={(e) => setPrecioPropuesto(e.target.value)}
                    className="pl-7"
                    step="0.01"
                  />
                </div>
              </div>
              
              {/* Resultado simulación */}
              {simulacionResult && (
                <div className={cn(
                  "p-4 rounded-lg border-2",
                  simulacionResult.es_perdida && "border-red-500 bg-red-50 dark:bg-red-950/20",
                  !simulacionResult.es_perdida && simulacionResult.margen_porcentaje < 5 && "border-orange-500 bg-orange-50 dark:bg-orange-950/20",
                  simulacionResult.margen_porcentaje >= 5 && "border-green-500 bg-green-50 dark:bg-green-950/20"
                )}>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-muted-foreground text-xs">Margen $</div>
                      <div className={cn("font-bold", simulacionResult.es_perdida ? "text-red-600" : "text-green-600")}>
                        {formatCurrency(simulacionResult.margen_pesos)}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Margen %</div>
                      <div className={cn("font-bold", simulacionResult.es_perdida ? "text-red-600" : "text-green-600")}>
                        {simulacionResult.margen_porcentaje}%
                      </div>
                    </div>
                    {simulacionResult.diferencia_vs_lista > 0 && (
                      <div className="col-span-2">
                        <div className="text-muted-foreground text-xs">Descuento vs lista</div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{formatCurrency(simulacionResult.diferencia_vs_lista)}</span>
                          {simulacionResult.requiere_autorizacion && (
                            <Badge variant="destructive" className="text-[10px]">
                              Requiere autorización
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {simulacionResult.es_perdida && (
                    <div className="mt-3 p-2 bg-red-100 dark:bg-red-900/30 rounded text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      ¡Este precio genera pérdida! No recomendado.
                    </div>
                  )}
                </div>
              )}
              
              {/* Sugerencias rápidas */}
              <div className="text-xs text-muted-foreground">
                <div className="font-medium mb-1">Precios sugeridos:</div>
                <div className="flex flex-wrap gap-2">
                  {[5, 10, 15, 20].map(margen => {
                    const sugerido = calcularPrecioSugerido(simuladorProduct.analisis.costo_referencia, margen, 0);
                    return (
                      <Button
                        key={margen}
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => setPrecioPropuesto(sugerido.toString())}
                      >
                        {margen}% → {formatCurrency(sugerido)}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar Precio</DialogTitle>
            <DialogDescription>
              {editingProduct && getDisplayName(editingProduct)}
            </DialogDescription>
          </DialogHeader>
          
          {editingProduct && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Precio de venta</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    value={precioVenta}
                    onChange={(e) => setPrecioVenta(e.target.value)}
                    className="pl-7"
                    step="0.01"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Descuento máximo</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    value={descuentoMaximo}
                    onChange={(e) => setDescuentoMaximo(e.target.value)}
                    className="pl-7"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              <Button 
                onClick={handleSaveEdit} 
                className="w-full"
                disabled={updatePriceMutation.isPending}
              >
                {updatePriceMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Guardar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
