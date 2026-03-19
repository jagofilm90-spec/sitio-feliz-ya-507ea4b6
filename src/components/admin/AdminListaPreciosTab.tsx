import { useState, useMemo } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
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
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  Loader2, Search, TrendingUp, TrendingDown, DollarSign, 
  AlertTriangle, CheckCircle2, XCircle, Calculator, Pencil,
  ArrowUpDown, ChevronDown, ChevronUp, Check, Clock, ListChecks, History, Minus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { analizarMargen, simularPrecioPropuesto, calcularPrecioSugerido, redondear } from "@/lib/calculos";
import { ProductoPrecioCardMobile } from "./ProductoPrecioCardMobile";

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
  
  // Mobile detection
  const isMobile = useIsMobile();
  
  // Simulador
  const [simuladorOpen, setSimuladorOpen] = useState(false);
  const [simuladorProduct, setSimuladorProduct] = useState<ProductoConAnalisis | null>(null);
  const [precioPropuesto, setPrecioPropuesto] = useState("");
  
  // Editor
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null);
  const [precioVenta, setPrecioVenta] = useState("");
  const [descuentoMaximo, setDescuentoMaximo] = useState("");

  // Review panel
  const [reviewPanelOpen, setReviewPanelOpen] = useState(true);
  const [parcialPrecio, setParcialPrecio] = useState<Record<string, string>>({});
  const [parcialMode, setParcialMode] = useState<Record<string, boolean>>({});

  // Bulk update
  // Historial
  const [historialDialogOpen, setHistorialDialogOpen] = useState(false);
  const [selectedProductForHistory, setSelectedProductForHistory] = useState<ProductoConAnalisis | null>(null);

  const [bulkSheetOpen, setBulkSheetOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState<'margen' | 'incremento'>('margen');
  const [bulkFilter, setBulkFilter] = useState<string>("all");
  const [bulkMargen, setBulkMargen] = useState("");
  const [bulkDescuento, setBulkDescuento] = useState("");
  const [bulkIncremento, setBulkIncremento] = useState("");
  const [bulkTipo, setBulkTipo] = useState<'pesos' | 'porcentaje'>('porcentaje');
  const [bulkPreview, setBulkPreview] = useState<Array<{ id: string; nombre: string; precioActual: number; precioNuevo: number; cambio: number }>>([]);

  // Simulator enhanced
  const [simMargenDeseado, setSimMargenDeseado] = useState("");
  const [simDescuentoMax, setSimDescuentoMax] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch pending price reviews
  const { data: revisionesPendientes = [], refetch: refetchRevisiones } = useQuery({
    queryKey: ["revisiones-precio-pendientes"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("productos_revision_precio")
        .select("*, productos:producto_id(id, codigo, nombre, unidad, precio_por_kilo, peso_kg)")
        .in("status", ["pendiente", "parcial"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Mutation: apply full price review
  const applyReviewMutation = useMutation({
    mutationFn: async ({ reviewId, productoId, nuevoPrecio, tipo }: { reviewId: string; productoId: string; nuevoPrecio: number; tipo: 'completado' | 'parcial' | 'ignorado' }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      if (tipo !== 'ignorado') {
        // Get current price for history
        const { data: prodData } = await supabase.from("productos").select("precio_venta").eq("id", productoId).single();
        const precioAnterior = prodData?.precio_venta ?? 0;

        await supabase.from("productos").update({ precio_venta: nuevoPrecio }).eq("id", productoId);

        if (precioAnterior !== nuevoPrecio) {
          await supabase.from("productos_historial_precios").insert({
            producto_id: productoId,
            precio_anterior: precioAnterior,
            precio_nuevo: nuevoPrecio,
            usuario_id: user.id,
          });
          // Notify vendedores
          const review = revisionesPendientes.find((r: any) => r.id === reviewId);
          const productoNombre = review?.productos?.nombre || "";
          notificarCambioPrecio({ productoNombre, precioAnterior, precioNuevo: nuevoPrecio });
        }
      }

      const review = revisionesPendientes.find((r: any) => r.id === reviewId);
      const pendienteRestante = tipo === 'parcial' && review
        ? redondear(review.precio_venta_sugerido - nuevoPrecio)
        : 0;

      await (supabase as any).from("productos_revision_precio").update({
        status: tipo,
        ajuste_aplicado: tipo !== 'ignorado' ? redondear(nuevoPrecio - (review?.precio_venta_actual || 0)) : 0,
        pendiente_ajuste: pendienteRestante,
        resuelto_por: user.id,
        resuelto_at: new Date().toISOString(),
      }).eq("id", reviewId);
    },
    onSuccess: (_, vars) => {
      const msg = vars.tipo === 'completado' ? "Precio actualizado" : vars.tipo === 'parcial' ? "Precio parcialmente actualizado" : "Revisión pospuesta";
      toast({ title: msg });
      queryClient.invalidateQueries({ queryKey: ["admin-lista-precios-analisis"] });
      refetchRevisiones();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Mutation: bulk price update
  const bulkUpdateMutation = useMutation({
    mutationFn: async (items: Array<{ id: string; precioNuevo: number }>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      // Get current prices for history
      const currentPrices = new Map<string, number>();
      productos?.forEach(p => currentPrices.set(p.id, p.precio_venta));

      let changedCount = 0;
      for (const item of items) {
        await supabase.from("productos").update({ precio_venta: item.precioNuevo }).eq("id", item.id);

        const precioAnterior = currentPrices.get(item.id) ?? 0;
        if (precioAnterior !== item.precioNuevo) {
          await supabase.from("productos_historial_precios").insert({
            producto_id: item.id,
            precio_anterior: precioAnterior,
            precio_nuevo: item.precioNuevo,
            usuario_id: user.id,
          });
          changedCount++;
        }
      }
      // Send one summary notification for bulk updates
      if (changedCount > 0) {
        // Override with a custom in-app notification for bulk
        try {
          await supabase.from("notificaciones").insert({
            tipo: "precio_actualizado",
            titulo: "💰 Precios actualizados en masa",
            descripcion: `Se actualizaron los precios de ${changedCount} productos`,
            leida: false,
          });
        } catch (e) { console.error(e); }
        try {
          await supabase.functions.invoke("send-push-notification", {
            body: {
              roles: ["vendedor"],
              title: "💰 Precios actualizados",
              body: `Se actualizaron los precios de ${changedCount} productos`,
            },
          });
        } catch (e) { console.error(e); }
      }
      return items.length;
    },
    onSuccess: (count) => {
      toast({ title: `${count} productos actualizados` });
      queryClient.invalidateQueries({ queryKey: ["admin-lista-precios-analisis"] });
      setBulkSheetOpen(false);
      setBulkPreview([]);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Fetch price history
  const { data: historialPrecios, isLoading: isLoadingHistorial } = useQuery({
    queryKey: ["admin-historial-precios", selectedProductForHistory?.id],
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
        const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
        if (profiles) {
          userMap = profiles.reduce((acc, p) => { acc[p.id] = p.full_name || "Usuario"; return acc; }, {} as Record<string, string>);
        }
      }
      return historial.map(h => ({
        ...h,
        usuario_nombre: h.usuario_id ? userMap[h.usuario_id] || "Usuario" : null,
      }));
    },
    enabled: !!selectedProductForHistory?.id,
  });

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
      const { data: { user } } = await supabase.auth.getUser();
      // Get current price before updating
      const precioAnterior = editingProduct?.precio_venta ?? 0;

      const { error } = await supabase
        .from("productos")
        .update({ precio_venta, descuento_maximo })
        .eq("id", id);
      
      if (error) throw error;

      // Record price history + notify vendedores
      if (precioAnterior !== precio_venta) {
        await supabase.from("productos_historial_precios").insert({
          producto_id: id,
          precio_anterior: precioAnterior,
          precio_nuevo: precio_venta,
          usuario_id: user?.id ?? null,
        });
        // Notify vendedores
        const productoNombre = editingProduct?.nombre || "";
        notificarCambioPrecio({ productoNombre, precioAnterior, precioNuevo: precio_venta });
      }
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
  const openSimulador = (producto: ProductoConAnalisis) => {
    setSimuladorProduct(producto);
    setPrecioPropuesto(producto.precio_venta.toString());
    setSimuladorOpen(true);
  };

  // Open editor
  const openEditor = (producto: ProductoConAnalisis) => {
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

  // Calculate bulk preview
  const calculateBulkPreview = () => {
    if (!productos) return;
    const filtered = bulkFilter === 'all' ? productos : productos.filter(p => p.categoria === bulkFilter || p.marca === bulkFilter);
    const preview = filtered.map(p => {
      let precioNuevo = p.precio_venta;
      if (bulkMode === 'margen') {
        const costo = p.costo_promedio_ponderado || p.ultimo_costo_compra || 0;
        const margen = parseFloat(bulkMargen) || 0;
        const desc = parseFloat(bulkDescuento) || 0;
        precioNuevo = costo > 0 ? redondear(costo * (1 + margen / 100) + desc) : p.precio_venta;
      } else {
        const inc = parseFloat(bulkIncremento) || 0;
        precioNuevo = bulkTipo === 'porcentaje' ? redondear(p.precio_venta * (1 + inc / 100)) : redondear(p.precio_venta + inc);
      }
      return { id: p.id, nombre: `${p.codigo} - ${p.nombre}`, precioActual: p.precio_venta, precioNuevo, cambio: redondear(((precioNuevo - p.precio_venta) / p.precio_venta) * 100) };
    }).filter(p => p.precioNuevo !== p.precioActual);
    setBulkPreview(preview);
  };

  // Render review panel
  function renderReviewPanel() {
    if (revisionesPendientes.length === 0) return null;
    return (
      <Collapsible open={reviewPanelOpen} onOpenChange={setReviewPanelOpen}>
        <div className="mb-4 border border-orange-300 dark:border-orange-700 rounded-lg overflow-hidden">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950/30 cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-950/50">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-semibold text-orange-800 dark:text-orange-300">
                  {revisionesPendientes.length} producto(s) con ajuste de precio pendiente
                </span>
              </div>
              {reviewPanelOpen ? <ChevronUp className="h-4 w-4 text-orange-600" /> : <ChevronDown className="h-4 w-4 text-orange-600" />}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-3 space-y-3 max-h-[400px] overflow-auto">
              {revisionesPendientes.map((rev: any) => {
                const prod = rev.productos;
                const isParcialMode = parcialMode[rev.id];
                const margenInput = parseFloat(parcialPrecio[rev.id] || '') || 0;
                return (
                  <div key={rev.id} className="p-3 border rounded-lg bg-background space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-sm">{prod?.nombre || 'Producto'}</span>
                        <span className="text-xs text-muted-foreground ml-2">{prod?.codigo}</span>
                      </div>
                      {rev.status === 'parcial' && <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-[10px]">Parcial</Badge>}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div><span className="text-muted-foreground">Costo:</span> <span className="font-medium">{formatCurrency(rev.costo_anterior)}→{formatCurrency(rev.costo_nuevo)}</span></div>
                      <div><span className="text-muted-foreground">Precio actual:</span> <span className="font-medium">{formatCurrency(rev.precio_venta_actual)}</span></div>
                      <div><span className="text-muted-foreground">Sugerido:</span> <span className="font-semibold text-orange-600">{formatCurrency(rev.precio_venta_sugerido)}</span></div>
                      <div><span className="text-muted-foreground">Pendiente:</span> <span className="font-medium">+{formatCurrency(rev.pendiente_ajuste)}</span></div>
                    </div>

                    {isParcialMode ? (
                      <div className="flex items-center gap-2">
                        <Label className="text-xs shrink-0">Precio a aplicar:</Label>
                        <div className="relative flex-1">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                          <Input type="number" step="0.01" className="pl-6 h-8 text-xs" value={parcialPrecio[rev.id] || ''} onChange={e => setParcialPrecio(p => ({...p, [rev.id]: e.target.value}))} />
                        </div>
                        <Button size="sm" className="h-8 text-xs" disabled={!margenInput || applyReviewMutation.isPending}
                          onClick={() => applyReviewMutation.mutate({ reviewId: rev.id, productoId: rev.producto_id, nuevoPrecio: margenInput, tipo: 'parcial' })}>
                          Aplicar
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setParcialMode(p => ({...p, [rev.id]: false}))}>Cancelar</Button>
                      </div>
                    ) : (
                      <div className="flex gap-2 flex-wrap">
                        <Button size="sm" className="h-7 text-xs" disabled={applyReviewMutation.isPending}
                          onClick={() => applyReviewMutation.mutate({ reviewId: rev.id, productoId: rev.producto_id, nuevoPrecio: rev.precio_venta_sugerido, tipo: 'completado' })}>
                          <Check className="h-3 w-3 mr-1" /> Aplicar completo
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs"
                          onClick={() => { setParcialMode(p => ({...p, [rev.id]: true})); setParcialPrecio(p => ({...p, [rev.id]: rev.precio_venta_actual.toString()})); }}>
                          Aplicar parcial
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" disabled={applyReviewMutation.isPending}
                          onClick={() => applyReviewMutation.mutate({ reviewId: rev.id, productoId: rev.producto_id, nuevoPrecio: 0, tipo: 'ignorado' })}>
                          <Clock className="h-3 w-3 mr-1" /> Después
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  }

  // Render bulk update sheet
  function renderBulkSheet() {
    return (
      <Sheet open={bulkSheetOpen} onOpenChange={setBulkSheetOpen}>
        <SheetContent className="sm:max-w-lg overflow-auto">
          <SheetHeader>
            <SheetTitle>Actualización en Masa</SheetTitle>
            <SheetDescription>Ajustar precios de venta para múltiples productos</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            <div className="flex gap-2">
              <Button size="sm" variant={bulkMode === 'margen' ? 'default' : 'outline'} onClick={() => { setBulkMode('margen'); setBulkPreview([]); }}>Por margen %</Button>
              <Button size="sm" variant={bulkMode === 'incremento' ? 'default' : 'outline'} onClick={() => { setBulkMode('incremento'); setBulkPreview([]); }}>Por incremento</Button>
            </div>
            <div>
              <Label className="text-xs">Filtrar por categoría/marca</Label>
              <Select value={bulkFilter} onValueChange={v => { setBulkFilter(v); setBulkPreview([]); }}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {[...new Set(productos?.map(p => p.categoria).filter(Boolean) as string[])].map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {bulkMode === 'margen' ? (
              <>
                <div>
                  <Label className="text-xs">Margen deseado %</Label>
                  <Input type="number" value={bulkMargen} onChange={e => setBulkMargen(e.target.value)} placeholder="15" className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Descuento máximo $</Label>
                  <Input type="number" value={bulkDescuento} onChange={e => setBulkDescuento(e.target.value)} placeholder="0" className="h-9" />
                </div>
              </>
            ) : (
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label className="text-xs">Incremento</Label>
                  <Input type="number" value={bulkIncremento} onChange={e => setBulkIncremento(e.target.value)} placeholder="10" className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Tipo</Label>
                  <Select value={bulkTipo} onValueChange={(v: any) => setBulkTipo(v)}>
                    <SelectTrigger className="h-9 w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="porcentaje">%</SelectItem>
                      <SelectItem value="pesos">$</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <Button variant="outline" onClick={calculateBulkPreview} className="w-full">Calcular preview</Button>
            {bulkPreview.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold">{bulkPreview.length} productos con cambios:</div>
                <ScrollArea className="h-[250px] border rounded-lg">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead className="text-[10px]">Producto</TableHead>
                      <TableHead className="text-[10px] text-right">Actual</TableHead>
                      <TableHead className="text-[10px] text-right">Nuevo</TableHead>
                      <TableHead className="text-[10px] text-right">%</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {bulkPreview.map(p => (
                        <TableRow key={p.id}>
                          <TableCell className="text-[10px] py-1">{p.nombre}</TableCell>
                          <TableCell className="text-[10px] py-1 text-right">{formatCurrency(p.precioActual)}</TableCell>
                          <TableCell className="text-[10px] py-1 text-right font-medium">{formatCurrency(p.precioNuevo)}</TableCell>
                          <TableCell className={cn("text-[10px] py-1 text-right", p.cambio > 0 ? "text-green-600" : "text-red-600")}>{p.cambio > 0 ? '+' : ''}{p.cambio}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
                <Button className="w-full" disabled={bulkUpdateMutation.isPending}
                  onClick={() => bulkUpdateMutation.mutate(bulkPreview.map(p => ({ id: p.id, precioNuevo: p.precioNuevo })))}>
                  {bulkUpdateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ListChecks className="h-4 w-4 mr-2" />}
                  Aplicar a {bulkPreview.length} productos
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // MOBILE VIEW
  if (isMobile) {
    return (
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        {/* Header móvil */}
        <div className="pb-3 space-y-3 sticky top-0 bg-background z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold">Análisis de Precios</h2>
            </div>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setBulkSheetOpen(true)}>
              <ListChecks className="h-3.5 w-3.5 mr-1" /> En masa
            </Button>
          </div>
          
          {/* Stats badges - scroll horizontal */}
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-2 pb-2">
              <Badge 
                variant="outline" 
                className={cn("text-xs cursor-pointer shrink-0", estadoFilter === 'perdida' && "bg-red-100 dark:bg-red-900/30")}
                onClick={() => setEstadoFilter(estadoFilter === 'perdida' ? 'all' : 'perdida')}
              >
                <XCircle className="h-3 w-3 mr-1 text-red-500" />
                Pérdida: {stats.perdida}
              </Badge>
              <Badge 
                variant="outline" 
                className={cn("text-xs cursor-pointer shrink-0", estadoFilter === 'critico' && "bg-orange-100 dark:bg-orange-900/30")}
                onClick={() => setEstadoFilter(estadoFilter === 'critico' ? 'all' : 'critico')}
              >
                <AlertTriangle className="h-3 w-3 mr-1 text-orange-500" />
                Crítico: {stats.critico}
              </Badge>
              <Badge 
                variant="outline" 
                className={cn("text-xs cursor-pointer shrink-0", estadoFilter === 'bajo' && "bg-amber-100 dark:bg-amber-900/30")}
                onClick={() => setEstadoFilter(estadoFilter === 'bajo' ? 'all' : 'bajo')}
              >
                <TrendingDown className="h-3 w-3 mr-1 text-amber-500" />
                Bajo: {stats.bajo}
              </Badge>
              <Badge 
                variant="outline" 
                className={cn("text-xs cursor-pointer shrink-0", estadoFilter === 'saludable' && "bg-green-100 dark:bg-green-900/30")}
                onClick={() => setEstadoFilter(estadoFilter === 'saludable' ? 'all' : 'saludable')}
              >
                <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
                OK: {stats.saludable}
              </Badge>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
          
          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
        </div>

        {renderReviewPanel()}

        {/* Lista de cards */}
        <div className="flex-1 overflow-auto space-y-3 py-2">
          {filteredProductos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron productos
            </div>
          ) : (
            filteredProductos.map((producto) => (
              <ProductoPrecioCardMobile
                key={producto.id}
                producto={producto}
                onSimular={openSimulador}
                onEditar={openEditor}
              />
            ))
          )}
        </div>

        {/* Dialogs - se mantienen igual */}
        {renderDialogs()}
        {renderBulkSheet()}
      </div>
    );
  }

  // DESKTOP VIEW
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="pb-3 border-b bg-background sticky top-0 z-20 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Análisis de Precios y Márgenes</h2>
          </div>
          <Button size="sm" variant="outline" onClick={() => setBulkSheetOpen(true)}>
            <ListChecks className="h-4 w-4 mr-1" /> Actualizar en masa
          </Button>
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

      {/* Review Panel */}
      {renderReviewPanel()}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <Table className="table-fixed w-full">
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead 
                className="w-[55px] py-2 px-1.5 text-[10px] cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('codigo')}
              >
                <div className="flex items-center gap-1">
                  Código
                  {sortField === 'codigo' && <ArrowUpDown className="h-3 w-3" />}
                </div>
              </TableHead>
              <TableHead 
                className="py-2 px-1.5 text-[10px] cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('nombre')}
              >
                <div className="flex items-center gap-1">
                  Producto
                  {sortField === 'nombre' && <ArrowUpDown className="h-3 w-3" />}
                </div>
              </TableHead>
              <TableHead className="w-[65px] py-2 px-1.5 text-[10px]">
                Marca
              </TableHead>
              <TableHead 
                className="w-[65px] py-2 px-1.5 text-[10px] text-right cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('costo')}
              >
                <div className="flex items-center justify-end gap-1">
                  Costo
                  {sortField === 'costo' && <ArrowUpDown className="h-3 w-3" />}
                </div>
              </TableHead>
              <TableHead 
                className="w-[65px] py-2 px-1.5 text-[10px] text-right cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('precio')}
              >
                <div className="flex items-center justify-end gap-1">
                  Precio
                  {sortField === 'precio' && <ArrowUpDown className="h-3 w-3" />}
                </div>
              </TableHead>
              <TableHead className="w-[55px] py-2 px-1.5 text-[10px] text-right">
                Dto Max
              </TableHead>
              <TableHead 
                className="w-[50px] py-2 px-1.5 text-[10px] text-right cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('margen')}
              >
                <div className="flex items-center justify-end gap-1">
                  Margen
                  {sortField === 'margen' && <ArrowUpDown className="h-3 w-3" />}
                </div>
              </TableHead>
              <TableHead className="w-[55px] py-2 px-1.5 text-[10px] text-right">
                Piso
              </TableHead>
              <TableHead className="w-[50px] py-2 px-1.5 text-[10px] text-right">
                Espacio
              </TableHead>
              <TableHead 
                className="w-[65px] py-2 px-1.5 text-[10px] text-center cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('estado')}
              >
                <div className="flex items-center justify-center gap-1">
                  Estado
                  {sortField === 'estado' && <ArrowUpDown className="h-3 w-3" />}
                </div>
              </TableHead>
              <TableHead className="w-[75px] py-2 px-1 text-[10px] text-center">
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
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                          setSelectedProductForHistory(producto);
                          setHistorialDialogOpen(true);
                        }}
                        title="Ver historial de precios"
                      >
                        <History className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Dialogs */}
      {renderDialogs()}
      {renderBulkSheet()}
    </div>
  );

  // Helper function to render dialogs (shared between mobile and desktop)
  function renderDialogs() {
    return (
      <>
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

                {/* Aplicar este precio */}
                {simulacionResult && !simulacionResult.es_perdida && (
                  <Separator />
                )}
                {simulacionResult && (
                  <Button
                    className="w-full"
                    disabled={!simulacionResult || simulacionResult.es_perdida || updatePriceMutation.isPending}
                    onClick={() => {
                      const precio = parseFloat(precioPropuesto);
                      if (!simuladorProduct || isNaN(precio)) return;
                      updatePriceMutation.mutate(
                        { id: simuladorProduct.id, precio_venta: precio, descuento_maximo: simuladorProduct.descuento_maximo },
                        { onSuccess: () => setSimuladorOpen(false) }
                      );
                    }}
                  >
                    {updatePriceMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                    Aplicar este precio
                  </Button>
                )}
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
                  <p>Sin cambios registrados aún</p>
                  <p className="text-xs mt-1">Los cambios de precio se registrarán aquí</p>
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </>
    );
  }
};
