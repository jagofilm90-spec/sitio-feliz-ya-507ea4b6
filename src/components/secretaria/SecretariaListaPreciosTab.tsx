import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificarCambioPrecio } from "@/lib/notificarVendedores";
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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Pencil, Search, History, ChevronLeft, ChevronRight, DollarSign, TrendingUp, TrendingDown, Minus, Save, Check, Package, Calculator, Percent } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  especificaciones: string | null;
  marca: string | null;
  categoria: string | null;
  peso_kg: number | null;
  contenido_empaque: string | null;
  unidad: string;
  precio_venta: number;
  precio_por_kilo: boolean;
  descuento_maximo: number | null;
  activo: boolean;
  es_promocion: boolean;
  descripcion_promocion: string | null;
  producto_base_id: string | null;
  bloqueado_venta: boolean;
  // Campos de costos para calculadora
  ultimo_costo_compra: number | null;
  costo_promedio_ponderado: number | null;
}

interface HistorialPrecio {
  id: string;
  precio_anterior: number;
  precio_nuevo: number;
  created_at: string;
  usuario_id: string | null;
  usuario_nombre?: string | null;
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

export const SecretariaListaPreciosTab = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState<string>("all");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [precioVenta, setPrecioVenta] = useState("");
  const [descuentoMaximo, setDescuentoMaximo] = useState("");
  const [historialDialogOpen, setHistorialDialogOpen] = useState(false);
  const [selectedProductForHistory, setSelectedProductForHistory] = useState<Producto | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [originalPrecio, setOriginalPrecio] = useState("");
  const [originalDescuento, setOriginalDescuento] = useState("");
  
  // Estados para calculadora de margen
  const [modoCalculadora, setModoCalculadora] = useState(false);
  const [usarCostoPromedio, setUsarCostoPromedio] = useState(true);
  const [margenPorcentaje, setMargenPorcentaje] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch products - incluye costos para calculadora
  const { data: productos, isLoading } = useQuery({
    queryKey: ["secretaria-lista-precios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("productos")
        .select("id, codigo, nombre, especificaciones, marca, categoria, peso_kg, contenido_empaque, unidad, precio_venta, precio_por_kilo, descuento_maximo, activo, es_promocion, descripcion_promocion, producto_base_id, bloqueado_venta, ultimo_costo_compra, costo_promedio_ponderado")
        .eq("activo", true)
        .or("solo_uso_interno.is.null,solo_uso_interno.eq.false")
        .order("categoria")
        .order("nombre");

      if (error) throw error;
      return data as Producto[];
    },
  });

  // Fetch price history for selected product
  const { data: historialPrecios, isLoading: isLoadingHistorial } = useQuery({
    queryKey: ["historial-precios", selectedProductForHistory?.id],
    queryFn: async () => {
      if (!selectedProductForHistory?.id) return [];
      
      const { data: historial, error } = await supabase
        .from("productos_historial_precios")
        .select("id, precio_anterior, precio_nuevo, created_at, usuario_id")
        .eq("producto_id", selectedProductForHistory.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!historial || historial.length === 0) return [];

      const userIds = [...new Set(historial.map(h => h.usuario_id).filter(Boolean))] as string[];
      
      let userMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);
        
        if (profiles) {
          userMap = profiles.reduce((acc, p) => {
            acc[p.id] = p.full_name || "Usuario";
            return acc;
          }, {} as Record<string, string>);
        }
      }

      return historial.map(h => ({
        ...h,
        usuario_nombre: h.usuario_id ? userMap[h.usuario_id] || "Usuario" : null
      })) as HistorialPrecio[];
    },
    enabled: !!selectedProductForHistory?.id,
  });

  // Update price mutation
  const updatePriceMutation = useMutation({
    mutationFn: async ({ id, precio_venta, descuento_maximo, precio_anterior }: { id: string; precio_venta: number; descuento_maximo: number | null; precio_anterior: number }) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("productos")
        .update({ precio_venta, descuento_maximo })
        .eq("id", id);
      
      if (error) throw error;

      if (precio_anterior !== precio_venta) {
        const { error: historialError } = await supabase
          .from("productos_historial_precios")
          .insert({
            producto_id: id,
            precio_anterior,
            precio_nuevo: precio_venta,
            usuario_id: user?.id
          });
        
        if (historialError) {
          console.error("Error saving price history:", historialError);
        }

        // Notify vendedores
        const productoNombre = editingProduct?.nombre || "";
        notificarCambioPrecio({ productoNombre, precioAnterior: precio_anterior, precioNuevo: precio_venta });
      }
    },
    onSuccess: () => {
      toast({ title: "Precio actualizado correctamente" });
      queryClient.invalidateQueries({ queryKey: ["secretaria-lista-precios"] });
      queryClient.invalidateQueries({ queryKey: ["historial-precios"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error al actualizar precio",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Get unique categories
  const categorias = [...new Set(productos?.map((p) => p.categoria).filter(Boolean))] as string[];

  // Filter products
  const filteredProductos = useMemo(() => {
    if (!productos) return [];
    
    return productos.filter((p) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        p.codigo.toLowerCase().includes(term) ||
        p.nombre.toLowerCase().includes(term) ||
        (p.especificaciones?.toLowerCase() || "").includes(term) ||
        (p.marca?.toLowerCase() || "").includes(term);

      const matchesCategoria = categoriaFilter === "all" || p.categoria === categoriaFilter;

      return matchesSearch && matchesCategoria;
    });
  }, [productos, searchTerm, categoriaFilter]);

  // Group products by category
  const productosPorCategoria = useMemo(() => {
    const grupos: Record<string, Producto[]> = {};
    for (const producto of filteredProductos) {
      const cat = producto.categoria || "Sin categoría";
      if (!grupos[cat]) grupos[cat] = [];
      grupos[cat].push(producto);
    }
    return Object.entries(grupos).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredProductos]);

  // Get flat index for a product (for navigation)
  const getFlatIndex = (producto: Producto) => {
    return filteredProductos.findIndex(p => p.id === producto.id);
  };

  // Handle edit
  const handleEdit = (producto: Producto, index?: number) => {
    const idx = index !== undefined ? index : getFlatIndex(producto);
    setCurrentIndex(idx);
    setEditingProduct(producto);
    const precio = producto.precio_venta.toString();
    const descuento = producto.descuento_maximo?.toString() || "";
    setPrecioVenta(precio);
    setDescuentoMaximo(descuento);
    setOriginalPrecio(precio);
    setOriginalDescuento(descuento);
    setIsSaved(false);
    // Resetear calculadora
    setModoCalculadora(false);
    setMargenPorcentaje("");
    setUsarCostoPromedio(true);
    setEditDialogOpen(true);
  };

  // Detect changes to reset saved state
  useEffect(() => {
    if (!editingProduct) return;
    const hasChanges = precioVenta !== originalPrecio || descuentoMaximo !== originalDescuento;
    if (hasChanges && isSaved) {
      setIsSaved(false);
    }
  }, [precioVenta, descuentoMaximo, originalPrecio, originalDescuento, isSaved, editingProduct]);

  // Handle save
  const handleSave = () => {
    if (!editingProduct) return;
    
    const precio = parseFloat(precioVenta);
    if (isNaN(precio) || precio <= 0) {
      toast({
        title: "Error",
        description: "El precio debe ser un número mayor a 0",
        variant: "destructive",
      });
      return;
    }

    const descuento = descuentoMaximo ? parseFloat(descuentoMaximo) : null;

    updatePriceMutation.mutate({
      id: editingProduct.id,
      precio_venta: precio,
      descuento_maximo: descuento,
      precio_anterior: editingProduct.precio_venta,
    }, {
      onSuccess: () => {
        setShowSuccessAnimation(true);
        setTimeout(() => {
          setIsSaved(true);
          setShowSuccessAnimation(false);
        }, 400);
        setOriginalPrecio(precioVenta);
        setOriginalDescuento(descuentoMaximo);
        setEditingProduct(prev => prev ? {
          ...prev,
          precio_venta: precio,
          descuento_maximo: descuento
        } : null);
      }
    });
  };

  // Navigate between products
  const handleNavigate = (direction: 'prev' | 'next') => {
    if (!filteredProductos || currentIndex === -1) return;
    
    const newIndex = direction === 'prev' 
      ? Math.max(0, currentIndex - 1)
      : Math.min(filteredProductos.length - 1, currentIndex + 1);
    
    if (newIndex === currentIndex) return;
    
    if (editingProduct) {
      const precio = parseFloat(precioVenta);
      if (!isNaN(precio) && precio > 0) {
        const descuento = descuentoMaximo ? parseFloat(descuentoMaximo) : null;
        updatePriceMutation.mutate({
          id: editingProduct.id,
          precio_venta: precio,
          descuento_maximo: descuento,
          precio_anterior: editingProduct.precio_venta,
        }, {
          onSuccess: () => {
            const nextProduct = filteredProductos[newIndex];
            handleEdit(nextProduct, newIndex);
          }
        });
      } else {
        const nextProduct = filteredProductos[newIndex];
        handleEdit(nextProduct, newIndex);
      }
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (!editDialogOpen || !editingProduct) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        e.preventDefault();
        handleNavigate('prev');
      } else if (e.key === 'ArrowRight' && currentIndex < (filteredProductos?.length || 1) - 1) {
        e.preventDefault();
        handleNavigate('next');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editDialogOpen, editingProduct, currentIndex, filteredProductos?.length, precioVenta, descuentoMaximo]);

  // Handle view history
  const handleViewHistory = (producto: Producto) => {
    setSelectedProductForHistory(producto);
    setHistorialDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header compacto */}
      <div className="pb-3 border-b bg-background sticky top-0 z-20 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Lista de Precios</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            {filteredProductos.length} productos
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código, nombre o marca..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
          <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
            <SelectTrigger className="w-full sm:w-[180px] h-9">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categorias.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
            <Table className="table-fixed w-full">
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[55px] py-2 px-1.5 text-[10px]">Código</TableHead>
                  <TableHead className="py-2 px-1.5 text-[10px]">Producto</TableHead>
                  <TableHead className="w-[70px] py-2 px-1.5 text-[10px]">Marca</TableHead>
                  <TableHead className="w-[70px] py-2 px-1.5 text-[10px] text-right">Precio</TableHead>
                  <TableHead className="w-[90px] py-2 px-1.5 text-[10px] text-right">Descuento</TableHead>
                  <TableHead className="w-[50px] py-2 px-1 text-[10px] text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productosPorCategoria.map(([categoria, prods]) => (
                  <>
                    {/* Separador de categoría */}
                    <TableRow key={`cat-${categoria}`} className="bg-muted/60 hover:bg-muted/60">
                      <TableCell colSpan={6} className="py-1 px-2 font-semibold text-[10px] uppercase tracking-wide text-muted-foreground">
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
                                <span className="text-[8px] text-red-600 dark:text-red-400 shrink-0" title="Requiere autorización">🔒</span>
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
                          {formatCurrency(producto.precio_venta)}
                        </TableCell>
                        <TableCell className="py-1 px-2 text-right">
                          {producto.descuento_maximo && producto.descuento_maximo > 0 ? (
                            <span className="text-[10px] font-medium">
                              <span className="text-emerald-600 dark:text-emerald-400">-${producto.descuento_maximo.toFixed(0)}</span>
                              <span className="text-muted-foreground mx-0.5">→</span>
                              <span className="text-amber-600 dark:text-amber-400 font-semibold">
                                {formatCurrency(producto.precio_venta - producto.descuento_maximo)}
                              </span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="py-1 px-1 text-center">
                          <div className="flex items-center justify-center gap-0.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handleViewHistory(producto)}
                              title="Ver historial"
                            >
                              <History className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handleEdit(producto)}
                              title="Editar precio"
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </div>
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
                      <p className="text-sm font-medium truncate leading-tight">
                        {producto.nombre}
                        {producto.especificaciones && (
                          <span className="text-purple-600 dark:text-purple-400 font-medium ml-1">
                            {producto.especificaciones}
                          </span>
                        )}
                      </p>
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
                    <div className="flex items-center gap-2">
                      <div className="text-right shrink-0">
                        <p className="font-bold text-sm leading-tight">
                          {formatCurrency(producto.precio_venta)}
                        </p>
                        {producto.descuento_maximo && producto.descuento_maximo > 0 && (
                          <>
                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium leading-tight">
                              -${producto.descuento_maximo.toFixed(0)}
                            </p>
                            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold leading-tight">
                              → {formatCurrency(producto.precio_venta - producto.descuento_maximo)}
                            </p>
                          </>
                        )}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => handleViewHistory(producto)}
                        >
                          <History className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => handleEdit(producto)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Edit Price Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => {
        if (!open) setCurrentIndex(-1);
        setEditDialogOpen(open);
      }}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md overflow-x-hidden">
          {/* Navigation between products */}
          {editingProduct && filteredProductos && filteredProductos.length > 1 && (
            <div className="flex items-center justify-between border-b pb-3 -mt-2 mb-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleNavigate('prev')}
                disabled={currentIndex <= 0 || updatePriceMutation.isPending}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              
              <span className="text-xs text-muted-foreground font-mono">
                {currentIndex + 1} de {filteredProductos.length}
              </span>
              
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleNavigate('next')}
                disabled={currentIndex >= filteredProductos.length - 1 || updatePriceMutation.isPending}
              >
                Siguiente
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}

          <DialogHeader>
            <DialogTitle>Editar Precio</DialogTitle>
            <DialogDescription>
              {editingProduct && (
                <span className="font-medium text-foreground">
                  {editingProduct.codigo} - {getDisplayName(editingProduct)}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Toggle calculadora */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="modo-calculadora" className="text-sm font-medium">
                  Calculadora de Margen
                </Label>
              </div>
              <Switch
                id="modo-calculadora"
                checked={modoCalculadora}
                onCheckedChange={setModoCalculadora}
              />
            </div>

            {/* Sección de costos (solo si hay datos y está en modo calculadora) */}
            {modoCalculadora && editingProduct && (
              <div className="p-3 bg-muted/30 rounded-lg border space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  Costos de Referencia
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Costo Promedio</p>
                    <p className="font-mono font-semibold">
                      {editingProduct.costo_promedio_ponderado 
                        ? formatCurrency(editingProduct.costo_promedio_ponderado) 
                        : <span className="text-muted-foreground">Sin datos</span>}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Último Costo</p>
                    <p className="font-mono font-semibold">
                      {editingProduct.ultimo_costo_compra 
                        ? formatCurrency(editingProduct.ultimo_costo_compra) 
                        : <span className="text-muted-foreground">Sin datos</span>}
                    </p>
                  </div>
                </div>

                {/* Selector de costo base */}
                {(editingProduct.costo_promedio_ponderado || editingProduct.ultimo_costo_compra) && (
                  <div className="flex items-center gap-3 pt-2 border-t">
                    <span className="text-xs text-muted-foreground">Usar como base:</span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant={usarCostoPromedio ? "default" : "outline"}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setUsarCostoPromedio(true)}
                        disabled={!editingProduct.costo_promedio_ponderado}
                      >
                        Promedio
                      </Button>
                      <Button
                        type="button"
                        variant={!usarCostoPromedio ? "default" : "outline"}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setUsarCostoPromedio(false)}
                        disabled={!editingProduct.ultimo_costo_compra}
                      >
                        Último
                      </Button>
                    </div>
                  </div>
                )}

                {/* Campo de margen */}
                {(editingProduct.costo_promedio_ponderado || editingProduct.ultimo_costo_compra) && (
                  <div className="space-y-2 pt-2 border-t">
                    <Label htmlFor="margen" className="text-xs">Margen de Utilidad (%)</Label>
                    <div className="relative">
                      <Input
                        id="margen"
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        className="pr-8"
                        value={margenPorcentaje}
                        onChange={(e) => {
                          const margen = e.target.value;
                          setMargenPorcentaje(margen);
                          
                          // Calcular precio automáticamente
                          const costoBase = usarCostoPromedio 
                            ? editingProduct.costo_promedio_ponderado 
                            : editingProduct.ultimo_costo_compra;
                          
                          if (costoBase && margen) {
                            const margenDecimal = parseFloat(margen) / 100;
                            const precioConMargen = costoBase * (1 + margenDecimal);
                            const descuento = parseFloat(descuentoMaximo) || 0;
                            const precioFinal = precioConMargen + descuento;
                            setPrecioVenta(precioFinal.toFixed(2));
                          }
                        }}
                        placeholder="10"
                      />
                      <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>

                    {/* Preview del cálculo */}
                    {margenPorcentaje && (
                      <div className="text-xs space-y-1 p-2 bg-background rounded border">
                        {(() => {
                          const costoBase = usarCostoPromedio 
                            ? editingProduct.costo_promedio_ponderado 
                            : editingProduct.ultimo_costo_compra;
                          
                          if (!costoBase) return null;
                          
                          const margenDecimal = parseFloat(margenPorcentaje) / 100;
                          const precioConMargen = costoBase * (1 + margenDecimal);
                          const descuento = parseFloat(descuentoMaximo) || 0;
                          const precioFinal = precioConMargen + descuento;
                          
                          return (
                            <>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Costo base:</span>
                                <span className="font-mono">{formatCurrency(costoBase)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">+ Margen {margenPorcentaje}%:</span>
                                <span className="font-mono">{formatCurrency(costoBase * margenDecimal)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">= Precio con margen:</span>
                                <span className="font-mono font-medium">{formatCurrency(precioConMargen)}</span>
                              </div>
                              {descuento > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">+ Colchón descuento:</span>
                                  <span className="font-mono">{formatCurrency(descuento)}</span>
                                </div>
                              )}
                              <div className="flex justify-between border-t pt-1 mt-1">
                                <span className="font-medium">= Precio de Lista:</span>
                                <span className="font-mono font-bold text-primary">{formatCurrency(precioFinal)}</span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}

                {/* Mensaje si no hay costos */}
                {!editingProduct.costo_promedio_ponderado && !editingProduct.ultimo_costo_compra && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    ⚠️ Este producto no tiene costos registrados. Usa el modo manual.
                  </p>
                )}
              </div>
            )}

            {/* Precio de venta (siempre visible) */}
            <div className="space-y-2">
              <Label htmlFor="precio_venta">
                Precio de Venta *
                {modoCalculadora && margenPorcentaje && (
                  <span className="text-xs text-muted-foreground ml-2">(calculado)</span>
                )}
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="precio_venta"
                  type="number"
                  step="0.01"
                  min="0"
                  className={cn(
                    "pl-7 text-lg font-mono",
                    modoCalculadora && margenPorcentaje && "bg-muted/50"
                  )}
                  value={precioVenta}
                  onChange={(e) => {
                    setPrecioVenta(e.target.value);
                    // Si cambia manual, limpiar el margen
                    if (modoCalculadora) {
                      setMargenPorcentaje("");
                    }
                  }}
                  placeholder="0.00"
                />
              </div>
              {editingProduct?.precio_por_kilo && (
                <p className="text-xs text-muted-foreground">
                  Este producto se vende por kilo
                </p>
              )}
            </div>

            {/* Descuento máximo */}
            <div className="space-y-2">
              <Label htmlFor="descuento_maximo">Descuento Máximo Autorizado ($)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="descuento_maximo"
                  type="number"
                  step="0.01"
                  min="0"
                  className="pl-7"
                  value={descuentoMaximo}
                  onChange={(e) => {
                    const nuevoDescuento = e.target.value;
                    setDescuentoMaximo(nuevoDescuento);
                    
                    // Recalcular precio si está en modo calculadora
                    if (modoCalculadora && margenPorcentaje && editingProduct) {
                      const costoBase = usarCostoPromedio 
                        ? editingProduct.costo_promedio_ponderado 
                        : editingProduct.ultimo_costo_compra;
                      
                      if (costoBase) {
                        const margenDecimal = parseFloat(margenPorcentaje) / 100;
                        const precioConMargen = costoBase * (1 + margenDecimal);
                        const descuento = parseFloat(nuevoDescuento) || 0;
                        const precioFinal = precioConMargen + descuento;
                        setPrecioVenta(precioFinal.toFixed(2));
                      }
                    }
                  }}
                  placeholder="0.00"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                El vendedor puede aplicar descuentos hasta este monto sin autorización
              </p>
            </div>

            {/* Resumen de precio mínimo */}
            {precioVenta && descuentoMaximo && parseFloat(descuentoMaximo) > 0 && (
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-sm text-primary">
                  Precio mínimo sin autorización: <strong>{formatCurrency(parseFloat(precioVenta) - parseFloat(descuentoMaximo))}</strong>
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cerrar
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={updatePriceMutation.isPending}
              variant={(isSaved || showSuccessAnimation) ? "outline" : "default"}
              className={cn(
                "transition-all duration-300 ease-out min-w-[140px]",
                (isSaved || showSuccessAnimation) && "border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20",
                showSuccessAnimation && "animate-success-pulse bg-green-50 dark:bg-green-950/30"
              )}
            >
              <span className="flex items-center justify-center">
                {updatePriceMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (isSaved || showSuccessAnimation) ? (
                  <Check className={cn(
                    "h-4 w-4 mr-2 text-green-500",
                    showSuccessAnimation && "animate-check-bounce"
                  )} />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                <span className="transition-opacity duration-200">
                  {updatePriceMutation.isPending ? "Guardando..." : (isSaved || showSuccessAnimation) ? "Guardado" : "Guardar Cambios"}
                </span>
              </span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Price History Dialog */}
      <Dialog open={historialDialogOpen} onOpenChange={setHistorialDialogOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg overflow-x-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Historial de Precios
            </DialogTitle>
            <DialogDescription>
              {selectedProductForHistory && (
                <span className="font-medium text-foreground">
                  {selectedProductForHistory.codigo} - {getDisplayName(selectedProductForHistory)}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[400px] pr-4">
            {isLoadingHistorial ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : historialPrecios && historialPrecios.length > 0 ? (
              <div className="space-y-3">
                {historialPrecios.map((registro) => {
                  const diferencia = registro.precio_nuevo - registro.precio_anterior;
                  const esAumento = diferencia > 0;
                  const esMismo = diferencia === 0;
                  
                  return (
                    <div
                      key={registro.id}
                      className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(registro.created_at), "d 'de' MMMM yyyy, HH:mm", { locale: es })}
                          </p>
                          {registro.usuario_nombre && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Por: {registro.usuario_nombre}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <span className="text-sm text-muted-foreground font-mono">
                              {formatCurrency(registro.precio_anterior)}
                            </span>
                            <span className="text-muted-foreground">→</span>
                            <span className="font-semibold font-mono">
                              {formatCurrency(registro.precio_nuevo)}
                            </span>
                          </div>
                          <div className="mt-1">
                            {esMismo ? (
                              <Badge variant="outline" className="text-xs">
                                <Minus className="h-3 w-3 mr-1" />
                                Sin cambio
                              </Badge>
                            ) : esAumento ? (
                              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-xs">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                +{formatCurrency(diferencia)}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400 text-xs">
                                <TrendingDown className="h-3 w-3 mr-1" />
                                {formatCurrency(diferencia)}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No hay historial de cambios</p>
                <p className="text-xs mt-1">Los cambios de precio se registrarán aquí</p>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};
