import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Search,
  Edit,
  Loader2,
  Package,
  Sparkles,
} from "lucide-react";
import { MigracionProductosDialog } from "./MigracionProductosDialog";

interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  marca: string | null;
  categoria: string | null;
  peso_kg: number | null;
  especificaciones: string | null;
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
}

export const SecretariaProductosTab = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [tabActivo, setTabActivo] = useState<"activos" | "inactivos">("activos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [migracionDialogOpen, setMigracionDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    codigo: "",
    nombre: "",
    marca: "",
    categoria: "",
    especificaciones: "",
    peso_kg: "",
    unidad: "bulto" as const,
    precio_venta: "",
    stock_minimo: "",
    maneja_caducidad: false,
    aplica_iva: false,
    aplica_ieps: false,
    precio_por_kilo: false,
    descuento_maximo: "",
    activo: true,
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
    setFormData({
      codigo: "",
      nombre: "",
      marca: "",
      categoria: "",
      especificaciones: "",
      peso_kg: "",
      unidad: "bulto",
      precio_venta: "",
      stock_minimo: "",
      maneja_caducidad: false,
      aplica_iva: false,
      aplica_ieps: false,
      precio_por_kilo: false,
      descuento_maximo: "",
      activo: true,
    });
  };

  // Handle edit
  const handleEdit = (producto: Producto) => {
    setEditingProduct(producto);
    setFormData({
      codigo: producto.codigo,
      nombre: producto.nombre,
      marca: producto.marca || "",
      categoria: producto.categoria || "",
      especificaciones: producto.especificaciones || "",
      peso_kg: producto.peso_kg?.toString() || "",
      unidad: producto.unidad as any,
      precio_venta: producto.precio_venta.toString(),
      stock_minimo: producto.stock_minimo.toString(),
      maneja_caducidad: producto.maneja_caducidad,
      aplica_iva: producto.aplica_iva,
      aplica_ieps: producto.aplica_ieps,
      precio_por_kilo: producto.precio_por_kilo,
      descuento_maximo: producto.descuento_maximo?.toString() || "",
      activo: producto.activo,
    });
    setDialogOpen(true);
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const productData = {
        codigo: data.codigo,
        nombre: data.nombre,
        marca: data.marca || null,
        categoria: data.categoria || null,
        especificaciones: data.especificaciones || null,
        peso_kg: data.peso_kg ? parseFloat(data.peso_kg) : null,
        unidad: data.unidad,
        precio_venta: parseFloat(data.precio_venta) || 0,
        stock_minimo: parseInt(data.stock_minimo) || 0,
        maneja_caducidad: data.maneja_caducidad,
        aplica_iva: data.aplica_iva,
        aplica_ieps: data.aplica_ieps,
        precio_por_kilo: data.precio_por_kilo,
        descuento_maximo: data.descuento_maximo ? parseFloat(data.descuento_maximo) : null,
        activo: data.activo,
      };

      if (editingProduct) {
        const { data: updatedData, error } = await supabase
          .from("productos")
          .update(productData)
          .eq("id", editingProduct.id)
          .select("id");
        
        if (error) throw error;
        
        // Check if any row was actually updated
        if (!updatedData || updatedData.length === 0) {
          throw new Error("No se pudo actualizar el producto. Verifica que tienes permisos suficientes.");
        }
      } else {
        const { data: insertedData, error } = await supabase
          .from("productos")
          .insert([productData])
          .select("id");
        
        if (error) throw error;
        
        // Check if any row was actually inserted
        if (!insertedData || insertedData.length === 0) {
          throw new Error("No se pudo crear el producto. Verifica que tienes permisos suficientes.");
        }
      }
    },
    onSuccess: () => {
      toast({ title: editingProduct ? "Producto actualizado" : "Producto creado" });
      queryClient.invalidateQueries({ queryKey: ["secretaria-productos"] });
      setDialogOpen(false);
      resetForm();
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
    saveMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeCount = productos?.filter((p) => p.activo).length || 0;
  const inactiveCount = productos?.filter((p) => !p.activo).length || 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Package className="h-5 w-5 text-pink-600" />
            Catálogo de Productos
          </h2>
          <p className="text-sm text-muted-foreground">
            {activeCount} activos, {inactiveCount} inactivos
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setMigracionDialogOpen(true)}
            className="border-pink-200 text-pink-700 hover:bg-pink-50"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Normalizar con IA
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-pink-600 hover:bg-pink-700">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Producto
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? "Editar Producto" : "Nuevo Producto"}
              </DialogTitle>
              <DialogDescription>
                Completa la información del producto
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-6">
              {/* Sección 1: Identificación */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-muted-foreground border-b pb-2">
                  Identificación
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="codigo">Código *</Label>
                    <Input
                      id="codigo"
                      value={formData.codigo}
                      onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unidad">Unidad *</Label>
                    <Select
                      value={formData.unidad}
                      onValueChange={(v) => setFormData({ ...formData, unidad: v as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bulto">Bulto</SelectItem>
                        <SelectItem value="caja">Caja</SelectItem>
                        <SelectItem value="costal">Costal</SelectItem>
                        <SelectItem value="cubeta">Cubeta</SelectItem>
                        <SelectItem value="kg">Kilogramo</SelectItem>
                        <SelectItem value="pieza">Pieza</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre *</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="marca">Marca</Label>
                  <Input
                    id="marca"
                    value={formData.marca}
                    onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                  />
                </div>
              </div>

              {/* Sección 2: Presentación y Peso */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-muted-foreground border-b pb-2">
                  Presentación y Peso
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="especificaciones">Presentación / Especificaciones</Label>
                  <Input
                    id="especificaciones"
                    value={formData.especificaciones}
                    onChange={(e) => setFormData({ ...formData, especificaciones: e.target.value })}
                    placeholder="Ej: 25kg, 6/2.800kg, 50/60 Deshuesada"
                  />
                  <p className="text-xs text-muted-foreground">
                    Texto que aparece en facturas y remisiones junto al nombre
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="peso_kg">Peso por unidad (kg)</Label>
                    <div className="relative">
                      <Input
                        id="peso_kg"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.peso_kg}
                        onChange={(e) => setFormData({ ...formData, peso_kg: e.target.value })}
                        placeholder="10.00"
                        className="pr-10"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">kg</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Peso del bulto/caja para cálculos
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
              </div>

              {/* Sección 3: Precios (confidencial - se captura pero no se muestra en lista) */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-muted-foreground border-b pb-2">
                  Precios <span className="text-xs text-pink-600">(confidencial)</span>
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="precio_venta">Precio de Venta *</Label>
                    <Input
                      id="precio_venta"
                      type="number"
                      step="0.01"
                      value={formData.precio_venta}
                      onChange={(e) => setFormData({ ...formData, precio_venta: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="descuento_maximo">Descuento Máximo ($)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        id="descuento_maximo"
                        type="number"
                        step="0.01"
                        min="0"
                        className="pl-7"
                        value={formData.descuento_maximo}
                        onChange={(e) => setFormData({ ...formData, descuento_maximo: e.target.value })}
                        placeholder="Ej: 5.00"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Sección 4: Impuestos */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-muted-foreground border-b pb-2">
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

              {/* Sección 5: Control de Inventario */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-muted-foreground border-b pb-2">
                  Control de Inventario
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="stock_minimo">Stock Mínimo</Label>
                    <Input
                      id="stock_minimo"
                      type="number"
                      value={formData.stock_minimo}
                      onChange={(e) => setFormData({ ...formData, stock_minimo: e.target.value })}
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
                <div className="flex items-center gap-2">
                  <Switch
                    id="activo"
                    checked={formData.activo}
                    onCheckedChange={(v) => setFormData({ ...formData, activo: v })}
                  />
                  <Label htmlFor="activo">Producto Activo</Label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saveMutation.isPending} className="bg-pink-600 hover:bg-pink-700">
                  {saveMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {editingProduct ? "Guardar Cambios" : "Crear Producto"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Dialog de migración */}
      <MigracionProductosDialog 
        open={migracionDialogOpen} 
        onOpenChange={setMigracionDialogOpen} 
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

      {/* Products Table - SIN PRECIO (confidencial, solo en Lista de Precios) */}
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
                  <TableHead className="text-center">Stock</TableHead>
                  <TableHead className="text-center hidden sm:table-cell">Stock Min</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProductos && filteredProductos.length > 0 ? (
                  filteredProductos.map((producto) => (
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
                      <TableCell className="text-center">
                        <Badge variant={producto.stock_actual <= producto.stock_minimo ? "destructive" : "secondary"}>
                          {producto.stock_actual}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center hidden sm:table-cell text-muted-foreground">
                        {producto.stock_minimo}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(producto)}
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
    </div>
  );
};
