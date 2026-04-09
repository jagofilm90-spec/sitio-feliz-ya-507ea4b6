import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { AlmasaLoading } from "@/components/brand/AlmasaLoading";
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
  DialogTrigger,
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
import { Loader2, Plus, Search, Package, ChevronLeft, ChevronRight, Sparkles, Edit, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MigracionProductosDialog } from "./MigracionProductosDialog";
import { MigracionLoteDialog } from "./MigracionLoteDialog";
import { getDisplayName, UNIDADES_SAT, UNIDADES_PRODUCTO } from "@/lib/productUtils";
import { useCategorias } from "@/hooks/useCategorias";

interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  marca: string | null;
  categoria: string | null;
  peso_kg: number | null;
  especificaciones: string | null;
  contenido_empaque: string | null;
  unidad_sat: string | null;
  unidad: string;
  precio_venta: number;
  stock_actual: number;
  stock_minimo: number;
  activo: boolean;
  maneja_caducidad: boolean;
  aplica_iva: boolean;
  aplica_ieps: boolean;
  precio_por_kilo: boolean;
  descuento_maximo: number | null;
  puede_tener_promocion: boolean;
  es_promocion: boolean;
  descripcion_promocion: string | null;
  producto_base_id: string | null;
}

export const SecretariaProductosTab = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [tabActivo, setTabActivo] = useState<"activos" | "inactivos">("activos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [migracionDialogOpen, setMigracionDialogOpen] = useState(false);
  const [migracionLoteOpen, setMigracionLoteOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [isSaved, setIsSaved] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [originalFormData, setOriginalFormData] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    codigo: "",
    nombre: "",
    marca: "",
    categoria: "",
    especificaciones: "",
    contenido_empaque: "",
    unidad_sat: "",
    peso_kg: "",
    unidad: "bulto" as const,
    stock_minimo: "",
    maneja_caducidad: false,
    aplica_iva: false,
    aplica_ieps: false,
    precio_por_kilo: false,
    activo: true,
    requiere_fumigacion: false,
    fecha_ultima_fumigacion: "",
    puede_tener_promocion: false,
  });

  // Fetch products
  const { data: productos, isLoading } = useQuery({
    queryKey: ["secretaria-productos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("productos")
        .select("*")
        .order("codigo");
      
      if (error) throw error;
      return data as Producto[];
    },
  });

  // Filter products
  const filteredProductos = productos?.filter((p) => {
    const matchesSearch =
      p.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.marca?.toLowerCase() || "").includes(searchTerm.toLowerCase());
    
    const matchesTab = tabActivo === "activos" ? p.activo : !p.activo;
    
    return matchesSearch && matchesTab;
  });

  // Reset form
  const resetForm = () => {
    setEditingProduct(null);
    setCurrentIndex(-1);
    setFormData({
      codigo: "",
      nombre: "",
      marca: "",
      categoria: "",
      especificaciones: "",
      contenido_empaque: "",
      unidad_sat: "",
      peso_kg: "",
      unidad: "bulto",
      stock_minimo: "",
      maneja_caducidad: false,
      aplica_iva: false,
      aplica_ieps: false,
      precio_por_kilo: false,
      activo: true,
      requiere_fumigacion: false,
      fecha_ultima_fumigacion: "",
      puede_tener_promocion: false,
    });
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
    const newFormData = {
      codigo: producto.codigo,
      nombre: producto.nombre,
      marca: producto.marca || "",
      categoria: producto.categoria || "",
      especificaciones: producto.especificaciones || "",
      contenido_empaque: producto.contenido_empaque || "",
      unidad_sat: producto.unidad_sat || "",
      peso_kg: producto.peso_kg?.toString() || "",
      unidad: producto.unidad as any,
      stock_minimo: producto.stock_minimo.toString(),
      maneja_caducidad: producto.maneja_caducidad,
      aplica_iva: producto.aplica_iva,
      aplica_ieps: producto.aplica_ieps,
      precio_por_kilo: producto.precio_por_kilo,
      activo: producto.activo,
      requiere_fumigacion: (producto as any).requiere_fumigacion || false,
      fecha_ultima_fumigacion: (producto as any).fecha_ultima_fumigacion || "",
      puede_tener_promocion: producto.puede_tener_promocion || false,
    };
    setFormData(newFormData);
    setOriginalFormData(JSON.stringify(newFormData));
    setIsSaved(false);
    setDialogOpen(true);
  };

  // Detectar cambios para resetear estado de guardado
  useEffect(() => {
    if (!editingProduct || !originalFormData) return;
    const hasChanges = JSON.stringify(formData) !== originalFormData;
    if (hasChanges && isSaved) {
      setIsSaved(false);
    }
  }, [formData, originalFormData, isSaved, editingProduct]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const matchedCat = categoriasCanon?.find(c => c.nombre === data.categoria);

      const productData = {
        codigo: data.codigo,
        nombre: data.nombre,
        marca: data.marca || null,
        categoria: data.categoria || null,
        categoria_id: matchedCat?.id || null,
        especificaciones: data.especificaciones || null,
        contenido_empaque: data.contenido_empaque || null,
        unidad_sat: data.unidad_sat || null,
        peso_kg: data.peso_kg ? parseFloat(data.peso_kg) : null,
        unidad: data.unidad,
        stock_minimo: parseInt(data.stock_minimo) || 0,
        maneja_caducidad: data.maneja_caducidad,
        aplica_iva: data.aplica_iva,
        aplica_ieps: data.aplica_ieps,
        precio_por_kilo: data.precio_por_kilo,
        activo: data.activo,
        requiere_fumigacion: data.requiere_fumigacion,
        fecha_ultima_fumigacion: data.fecha_ultima_fumigacion || null,
        puede_tener_promocion: data.puede_tener_promocion,
      };

      if (editingProduct) {
        const { data: updatedData, error } = await supabase
          .from("productos")
          .update(productData)
          .eq("id", editingProduct.id)
          .select("id");
        
        if (error) throw error;
        
        if (!updatedData || updatedData.length === 0) {
          throw new Error("No se pudo actualizar el producto. Verifica que tienes permisos suficientes.");
        }
      } else {
        const { data: insertedData, error } = await supabase
          .from("productos")
          .insert([productData])
          .select("id");
        
        if (error) throw error;
        
        if (!insertedData || insertedData.length === 0) {
          throw new Error("No se pudo crear el producto. Verifica que tienes permisos suficientes.");
        }
      }
    },
    onSuccess: () => {
      toast({ title: editingProduct ? "Producto actualizado" : "Producto creado" });
      queryClient.invalidateQueries({ queryKey: ["secretaria-productos"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error al guardar",
        description: error.message || "Ocurrió un error inesperado",
        variant: "destructive",
      });
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData, {
      onSuccess: () => {
        if (editingProduct) {
          // Para edición: animación y mostrar "Guardado"
          setShowSuccessAnimation(true);
          setTimeout(() => {
            setIsSaved(true);
            setShowSuccessAnimation(false);
          }, 400);
          setOriginalFormData(JSON.stringify(formData));
        } else {
          // Para nuevo producto: cerrar diálogo
          setDialogOpen(false);
          resetForm();
        }
      }
    });
  };

  // Navigate between products
  const handleNavigate = async (direction: 'prev' | 'next') => {
    if (!filteredProductos || currentIndex === -1) return;
    
    const newIndex = direction === 'prev' 
      ? Math.max(0, currentIndex - 1)
      : Math.min(filteredProductos.length - 1, currentIndex + 1);
    
    if (newIndex === currentIndex) return;
    
    // Save current product first
    saveMutation.mutate(formData, {
      onSuccess: () => {
        const nextProduct = filteredProductos[newIndex];
        handleEdit(nextProduct, newIndex);
      }
    });
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (!dialogOpen || !editingProduct) return;
    
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
  }, [dialogOpen, editingProduct, currentIndex, filteredProductos?.length, formData]);

  if (isLoading) {
    return (
      <AlmasaLoading size={48} />
    );
  }

  const activeCount = productos?.filter((p) => p.activo).length || 0;
  const inactiveCount = productos?.filter((p) => !p.activo).length || 0;

  // — Editorial modal tokens —
  const eInput = "rounded-none bg-transparent border-x-0 border-t-0 px-0 h-auto text-[15px] focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:bg-transparent focus-visible:border-b-[1.5px]";
  const eSelect = "rounded-none bg-transparent border-x-0 border-t-0 px-0 h-auto text-[15px] focus:ring-0 focus:ring-offset-0";
  const eLabel = "text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-500";

  return (
    <div className="space-y-4">
      <PageHeader
        title="Productos."
        lead={`Catálogo activo · ${activeCount} productos`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setMigracionLoteOpen(true)}>
              <Sparkles className="h-4 w-4 mr-2" />
              Migración en Lote
            </Button>
            <Button variant="outline" onClick={() => setMigracionDialogOpen(true)}>
              <Sparkles className="h-4 w-4 mr-2" />
              Uno por Uno
            </Button>
            <Button className="bg-crimson-500 hover:bg-crimson-600 text-white" onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Producto
            </Button>
          </div>
        }
      />

      {/* Dialogs de migración */}
      <MigracionProductosDialog 
        open={migracionDialogOpen} 
        onOpenChange={setMigracionDialogOpen} 
      />
      <MigracionLoteDialog
        open={migracionLoteOpen}
        onOpenChange={setMigracionLoteOpen}
      />

      {/* Tabs */}
      <Tabs value={tabActivo} onValueChange={(v) => setTabActivo(v as any)}>
        <TabsList>
          <TabsTrigger value="activos">
            Activos
            <Badge variant="secondary" className="ml-2">{activeCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="inactivos">
            Inactivos
            <Badge variant="secondary" className="ml-2">{inactiveCount}</Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por código, nombre o marca..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Products Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="hidden md:table-cell">Marca</TableHead>
                  <TableHead className="hidden lg:table-cell">Presentación</TableHead>
                  <TableHead>Unidad</TableHead>
                  <TableHead className="text-center hidden sm:table-cell">IVA/IEPS</TableHead>
                  <TableHead className="text-center">Stock Min</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProductos && filteredProductos.length > 0 ? (
                  filteredProductos.map((producto, index) => (
                    <TableRow key={producto.id}>
                      <TableCell className="font-mono font-medium">{producto.codigo}</TableCell>
                      <TableCell>
                        <p className="font-medium">{producto.nombre}</p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {producto.marca || "—"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {producto.peso_kg ? `${producto.peso_kg} kg` : "—"}
                      </TableCell>
                      <TableCell className="capitalize">
                        {producto.unidad}
                      </TableCell>
                      <TableCell className="text-center hidden sm:table-cell">
                        <div className="flex items-center justify-center gap-1">
                          {producto.aplica_iva && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                              IVA
                            </Badge>
                          )}
                          {producto.aplica_ieps && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                              IEPS
                            </Badge>
                          )}
                          {!producto.aplica_iva && !producto.aplica_ieps && "—"}
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {producto.stock_minimo}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(producto, index)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
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

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { 
        setDialogOpen(open); 
        if (!open) resetForm(); 
      }}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-[720px] max-h-[90vh] overflow-y-auto overflow-x-hidden !p-0 !gap-0 !rounded-2xl shadow-[0_20px_60px_-20px_rgba(15,14,13,0.25)]">
          {/* Navigation between products */}
          {editingProduct && filteredProductos && filteredProductos.length > 1 && (
            <div className="flex items-center justify-between px-8 pt-5 pb-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleNavigate('prev')}
                disabled={currentIndex <= 0 || saveMutation.isPending}
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
                disabled={currentIndex >= filteredProductos.length - 1 || saveMutation.isPending}
              >
                Siguiente
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}

          <DialogHeader className={cn("px-8 pb-6", editingProduct ? "pt-4" : "pt-8")}>
            <DialogTitle className="!font-serif !text-[28px] !font-medium text-ink-900 !tracking-[-0.01em] !leading-tight">
              {editingProduct ? "Editar producto." : "Nuevo producto."}
            </DialogTitle>
            <DialogDescription className="!text-[13px] text-ink-500 italic">
              {editingProduct ? editingProduct.nombre : "Completa la información del catálogo"}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSave} className="px-8 py-4 space-y-5">
            {/* Sección 1: Identificación */}
            <div className="space-y-4">
              <h3 className="font-serif italic text-[15px] text-ink-500 mt-8 mb-3">
                Identificación
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="codigo" className={eLabel}>Código <span className="text-crimson-500">*</span></Label>
                  <Input
                    id="codigo"
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    required
                    className={eInput}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="unidad" className={eLabel}>Unidad <span className="text-crimson-500">*</span></Label>
                  <Select
                    value={formData.unidad}
                    onValueChange={(v) => setFormData({ ...formData, unidad: v as any })}
                  >
                    <SelectTrigger className={eSelect}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIDADES_PRODUCTO.map(unidad => (
                        <SelectItem key={unidad.value} value={unidad.value}>
                          {unidad.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="nombre" className={eLabel}>Nombre <span className="text-crimson-500">*</span></Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                  className={eInput}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="marca" className={eLabel}>Marca</Label>
                <Input
                  id="marca"
                  value={formData.marca}
                  onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                  className={eInput}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="categoria" className={eLabel}>Categoría</Label>
                <Select
                  value={formData.categoria || ""}
                  onValueChange={(v) => setFormData({ ...formData, categoria: v })}
                >
                  <SelectTrigger className={eSelect}>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {(categoriasCanon || []).map(cat => (
                      <SelectItem key={cat.id} value={cat.nombre}>{cat.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Sección 2: Empaque */}
            <div className="space-y-4">
              <h3 className="font-serif italic text-[15px] text-ink-500 mt-8 mb-3">
                Empaque y presentación
              </h3>
              <div className="space-y-1.5">
                <Label htmlFor="especificaciones" className={eLabel}>Variantes / Calibre</Label>
                <Input
                  id="especificaciones"
                  value={formData.especificaciones}
                  onChange={(e) => setFormData({ ...formData, especificaciones: e.target.value })}
                  placeholder="Ej: 30/40, Jumbo 22/64, 14 rodajas"
                  className={eInput}
                />
                <p className="text-xs text-muted-foreground">
                  Calibre, conteo o variante del producto
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="contenido_empaque" className={eLabel}>Contenido por empaque</Label>
                  <Input
                    id="contenido_empaque"
                    value={formData.contenido_empaque}
                    onChange={(e) => setFormData({ ...formData, contenido_empaque: e.target.value })}
                    placeholder="Ej: 25 kg, 24×800g, 10 kg"
                    className={eInput}
                  />
                  <p className="text-xs text-muted-foreground">
                    Peso o contenido por unidad de venta
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="peso_kg" className={eLabel}>Peso numérico (kg)</Label>
                  <div className="relative">
                    <Input
                      id="peso_kg"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.peso_kg}
                      onChange={(e) => setFormData({ ...formData, peso_kg: e.target.value })}
                      placeholder="25.00"
                      className={cn(eInput, "pr-10")}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">kg</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Para cálculos de peso y precio por kilo
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="unidad_sat" className={eLabel}>Unidad SAT</Label>
                  <Select
                    value={formData.unidad_sat}
                    onValueChange={(v) => setFormData({ ...formData, unidad_sat: v })}
                  >
                    <SelectTrigger className={eSelect}>
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIDADES_SAT.map((u) => (
                        <SelectItem key={u.clave} value={u.clave}>
                          {u.clave} - {u.descripcion}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Clave para facturación electrónica
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch
                    id="precio_por_kilo"
                    checked={formData.precio_por_kilo}
                    onCheckedChange={(v) => setFormData({ ...formData, precio_por_kilo: v })}
                  />
                  <Label htmlFor="precio_por_kilo">Precio por Kilo</Label>
                </div>
              </div>
              
              {/* Preview del Display Name */}
              <div className="p-3 bg-muted/50 rounded-lg border">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Package className="h-3 w-3" />
                  Vista previa del nombre (Display Name)
                </div>
                <p className="font-medium text-sm">
                  {getDisplayName({
                    nombre: formData.nombre || "Nombre del producto",
                    marca: formData.marca || null,
                    especificaciones: formData.especificaciones || null,
                    unidad: formData.unidad,
                    contenido_empaque: formData.contenido_empaque || null,
                    peso_kg: formData.peso_kg ? parseFloat(formData.peso_kg) : null,
                  })}
                </p>
              </div>
            </div>

            {/* Sección 3: Impuestos */}
            <div className="space-y-4">
              <h3 className="font-serif italic text-[15px] text-ink-500 mt-8 mb-3">
                Impuestos
              </h3>
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    id="aplica_iva"
                    checked={formData.aplica_iva}
                    onCheckedChange={(v) => setFormData({ ...formData, aplica_iva: v })}
                  />
                  <Label htmlFor="aplica_iva">Aplica IVA 16%</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="aplica_ieps"
                    checked={formData.aplica_ieps}
                    onCheckedChange={(v) => setFormData({ ...formData, aplica_ieps: v })}
                  />
                  <Label htmlFor="aplica_ieps">Aplica IEPS 8%</Label>
                </div>
              </div>
            </div>

            {/* Sección 4: Control de Inventario */}
            <div className="space-y-4">
              <h3 className="font-serif italic text-[15px] text-ink-500 mt-8 mb-3">
                Inventario inicial
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="stock_minimo" className={eLabel}>Stock Mínimo</Label>
                  <Input
                    id="stock_minimo"
                    type="number"
                    value={formData.stock_minimo}
                    onChange={(e) => setFormData({ ...formData, stock_minimo: e.target.value })}
                    className={eInput}
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch
                    id="maneja_caducidad"
                    checked={formData.maneja_caducidad}
                    onCheckedChange={(v) => setFormData({ ...formData, maneja_caducidad: v })}
                  />
                  <Label htmlFor="maneja_caducidad">Maneja Caducidad</Label>
                </div>
              </div>
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    id="activo"
                    checked={formData.activo}
                    onCheckedChange={(v) => setFormData({ ...formData, activo: v })}
                  />
                  <Label htmlFor="activo">Producto Activo</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="puede_tener_promocion"
                    checked={formData.puede_tener_promocion}
                    onCheckedChange={(v) => setFormData({ ...formData, puede_tener_promocion: v })}
                  />
                  <Label htmlFor="puede_tener_promocion" className="flex items-center gap-1">
                    Puede venir con promoción
                    <span className="text-amber-500">🎁</span>
                  </Label>
                </div>
              </div>
              {formData.puede_tener_promocion && (
                <p className="text-xs text-muted-foreground bg-amber-50 p-2 rounded border border-amber-200">
                  💡 Al crear una OC, el sistema preguntará si este producto viene con promoción del proveedor
                </p>
              )}
              
              {/* Fumigación */}
              <div className="space-y-3 p-3 bg-muted/50 rounded-lg border mt-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id="requiere_fumigacion"
                    checked={formData.requiere_fumigacion}
                    onCheckedChange={(v) => setFormData({ ...formData, requiere_fumigacion: v })}
                  />
                  <Label htmlFor="requiere_fumigacion">Requiere fumigación cada 6 meses</Label>
                </div>
                {formData.requiere_fumigacion && (
                  <div className="space-y-2 ml-6">
                    <Label htmlFor="fecha_ultima_fumigacion" className={eLabel}>Fecha de última fumigación (opcional)</Label>
                    <Input
                      id="fecha_ultima_fumigacion"
                      type="date"
                      value={formData.fecha_ultima_fumigacion}
                      onChange={(e) => setFormData({ ...formData, fecha_ultima_fumigacion: e.target.value })}
                      className={eInput}
                    />
                    <p className="text-xs text-muted-foreground">
                      Si no se conoce, se registrará al recibir el producto en inventario
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="px-8 pb-8 pt-6 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}
                className="text-ink-600 border-ink-200 hover:bg-ink-50">
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saveMutation.isPending}
                className={cn(
                  "transition-all duration-300 ease-out min-w-[140px]",
                  (isSaved || showSuccessAnimation) && editingProduct
                    ? "border-green-500 text-green-600 hover:bg-green-50 bg-transparent"
                    : "bg-crimson-500 text-white hover:bg-crimson-600",
                  showSuccessAnimation && editingProduct && "animate-success-pulse bg-green-50"
                )}
              >
                <span className="flex items-center justify-center">
                  {saveMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : ((isSaved || showSuccessAnimation) && editingProduct) ? (
                    <Check className={cn(
                      "h-4 w-4 mr-2 text-green-500",
                      showSuccessAnimation && "animate-check-bounce"
                    )} />
                  ) : null}
                  <span className="transition-opacity duration-200">
                    {saveMutation.isPending
                      ? "Guardando..."
                      : editingProduct
                        ? ((isSaved || showSuccessAnimation) ? "Guardado" : "Guardar cambios")
                        : "+ Guardar producto"
                    }
                  </span>
                </span>
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
