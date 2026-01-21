import { useState, useEffect } from "react";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Pencil, Search, History, ChevronLeft, ChevronRight, DollarSign, TrendingUp, TrendingDown, Minus, Save, Check } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  const [originalPrecio, setOriginalPrecio] = useState("");
  const [originalDescuento, setOriginalDescuento] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch products
  const { data: productos, isLoading } = useQuery({
    queryKey: ["secretaria-lista-precios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("productos")
        .select("id, codigo, nombre, especificaciones, marca, categoria, peso_kg, contenido_empaque, unidad, precio_venta, precio_por_kilo, descuento_maximo, activo")
        .eq("activo", true)
        .or("solo_uso_interno.is.null,solo_uso_interno.eq.false")
        .order("codigo");

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

  // Handle edit
  const handleEdit = (producto: Producto, index?: number) => {
    if (index !== undefined) {
      setCurrentIndex(index);
    } else {
      const idx = filteredProductos?.findIndex(p => p.id === producto.id) ?? -1;
      setCurrentIndex(idx);
    }
    setEditingProduct(producto);
    const precio = producto.precio_venta.toString();
    const descuento = producto.descuento_maximo?.toString() || "";
    setPrecioVenta(precio);
    setDescuentoMaximo(descuento);
    setOriginalPrecio(precio);
    setOriginalDescuento(descuento);
    setIsSaved(false);
    setEditDialogOpen(true);
  };

  // Detectar cambios para resetear estado de guardado
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
        setIsSaved(true);
        setOriginalPrecio(precioVenta);
        setOriginalDescuento(descuentoMaximo);
        // Actualizar el editingProduct con los nuevos valores
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
    
    // Save current product first then navigate
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
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          Lista de Precios
        </h2>
        <p className="text-sm text-muted-foreground">
          {productos?.length || 0} productos activos • Click en editar para modificar precios
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
                <TableRow className="bg-muted/50">
                  <TableHead>Código</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead className="hidden md:table-cell">Presentación</TableHead>
                  <TableHead className="hidden lg:table-cell">Categoría</TableHead>
                  <TableHead className="text-right">Precio Unitario</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">$/Kilo</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Desc. Máx</TableHead>
                  <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProductos && filteredProductos.length > 0 ? (
                  filteredProductos.map((producto, index) => {
                    const precioKilo = getPrecioKilo(producto);
                    return (
                      <TableRow key={producto.id} className="hover:bg-muted/50">
                        <TableCell className="font-mono font-medium text-primary">
                          {producto.codigo}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {getDisplayName(producto)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center gap-2">
                            {producto.contenido_empaque || (producto.peso_kg && `${producto.peso_kg} kg`) || "—"}
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
                          {producto.descuento_maximo && producto.descuento_maximo > 0 ? (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800">
                              -${producto.descuento_maximo.toFixed(2)}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewHistory(producto)}
                              title="Ver historial de precios"
                            >
                              <History className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(producto, index)}
                              title="Editar precio"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No se encontraron productos
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Price Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => {
        if (!open) setCurrentIndex(-1);
        setEditDialogOpen(open);
      }}>
        <DialogContent className="max-w-md">
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
            <div className="space-y-2">
              <Label htmlFor="precio_venta">Precio de Venta *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="precio_venta"
                  type="number"
                  step="0.01"
                  min="0"
                  className="pl-7 text-lg font-mono"
                  value={precioVenta}
                  onChange={(e) => setPrecioVenta(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              {editingProduct?.precio_por_kilo && (
                <p className="text-xs text-muted-foreground">
                  Este producto se vende por kilo
                </p>
              )}
            </div>

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
                  onChange={(e) => setDescuentoMaximo(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                El vendedor puede aplicar descuentos hasta este monto sin autorización
              </p>
            </div>

            {precioVenta && descuentoMaximo && parseFloat(descuentoMaximo) > 0 && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <p className="text-sm text-emerald-700 dark:text-emerald-400">
                  Precio mínimo sin autorización: <strong>${(parseFloat(precioVenta) - parseFloat(descuentoMaximo)).toFixed(2)}</strong>
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
              variant={isSaved ? "outline" : "default"}
              className={isSaved ? "border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20" : ""}
            >
              {updatePriceMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : isSaved ? (
                <Check className="h-4 w-4 mr-2 text-green-500" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {updatePriceMutation.isPending ? "Guardando..." : isSaved ? "Guardado" : "Guardar Cambios"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Price History Dialog */}
      <Dialog open={historialDialogOpen} onOpenChange={setHistorialDialogOpen}>
        <DialogContent className="max-w-lg">
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
