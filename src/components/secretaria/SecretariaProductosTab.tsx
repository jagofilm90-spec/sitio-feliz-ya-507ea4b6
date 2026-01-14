import { useState, useEffect } from "react";
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
import { formatCurrency } from "@/lib/utils";
import {
  Plus,
  Search,
  Edit,
  Loader2,
  Package,
} from "lucide-react";

interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  marca: string | null;
  categoria: string | null;
  presentacion: string | null;
  unidad: string;
  precio_venta: number;
  precio_compra: number;
  stock_actual: number;
  stock_minimo: number;
  activo: boolean;
  maneja_caducidad: boolean;
  aplica_iva: boolean;
  kg_por_unidad: number | null;
  precio_por_kilo: boolean;
}

export const SecretariaProductosTab = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [tabActivo, setTabActivo] = useState<"activos" | "inactivos">("activos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    codigo: "",
    nombre: "",
    marca: "",
    categoria: "",
    presentacion: "",
    unidad: "bulto" as const,
    precio_venta: "",
    precio_compra: "",
    stock_minimo: "",
    maneja_caducidad: false,
    aplica_iva: false,
    kg_por_unidad: "",
    precio_por_kilo: false,
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
      presentacion: "",
      unidad: "bulto",
      precio_venta: "",
      precio_compra: "",
      stock_minimo: "",
      maneja_caducidad: false,
      aplica_iva: false,
      kg_por_unidad: "",
      precio_por_kilo: false,
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
      presentacion: producto.presentacion || "",
      unidad: producto.unidad as any,
      precio_venta: producto.precio_venta.toString(),
      precio_compra: producto.precio_compra.toString(),
      stock_minimo: producto.stock_minimo.toString(),
      maneja_caducidad: producto.maneja_caducidad,
      aplica_iva: producto.aplica_iva,
      kg_por_unidad: producto.kg_por_unidad?.toString() || "",
      precio_por_kilo: producto.precio_por_kilo,
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
        presentacion: data.presentacion || null,
        unidad: data.unidad,
        precio_venta: parseFloat(data.precio_venta) || 0,
        precio_compra: parseFloat(data.precio_compra) || 0,
        stock_minimo: parseInt(data.stock_minimo) || 0,
        maneja_caducidad: data.maneja_caducidad,
        aplica_iva: data.aplica_iva,
        kg_por_unidad: data.kg_por_unidad ? parseFloat(data.kg_por_unidad) : null,
        precio_por_kilo: data.precio_por_kilo,
        activo: data.activo,
      };

      if (editingProduct) {
        const { error } = await supabase
          .from("productos")
          .update(productData)
          .eq("id", editingProduct.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("productos")
          .insert([productData]);
        if (error) throw error;
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
        title: "Error",
        description: error.message,
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
            <form onSubmit={handleSave} className="space-y-4">
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="marca">Marca</Label>
                  <Input
                    id="marca"
                    value={formData.marca}
                    onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="presentacion">Presentación</Label>
                  <Input
                    id="presentacion"
                    value={formData.presentacion}
                    onChange={(e) => setFormData({ ...formData, presentacion: e.target.value })}
                    placeholder="Ej: 10kg, 500g"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="precio_venta">Precio Venta *</Label>
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
                  <Label htmlFor="precio_compra">Precio Compra</Label>
                  <Input
                    id="precio_compra"
                    type="number"
                    step="0.01"
                    value={formData.precio_compra}
                    onChange={(e) => setFormData({ ...formData, precio_compra: e.target.value })}
                  />
                </div>
              </div>

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
                <div className="space-y-2">
                  <Label htmlFor="kg_por_unidad">Kg por Unidad</Label>
                  <Input
                    id="kg_por_unidad"
                    type="number"
                    step="0.01"
                    value={formData.kg_por_unidad}
                    onChange={(e) => setFormData({ ...formData, kg_por_unidad: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    id="activo"
                    checked={formData.activo}
                    onCheckedChange={(v) => setFormData({ ...formData, activo: v })}
                  />
                  <Label htmlFor="activo">Activo</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="aplica_iva"
                    checked={formData.aplica_iva}
                    onCheckedChange={(v) => setFormData({ ...formData, aplica_iva: v })}
                  />
                  <Label htmlFor="aplica_iva">Aplica IVA</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="maneja_caducidad"
                    checked={formData.maneja_caducidad}
                    onCheckedChange={(v) => setFormData({ ...formData, maneja_caducidad: v })}
                  />
                  <Label htmlFor="maneja_caducidad">Maneja Caducidad</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="precio_por_kilo"
                    checked={formData.precio_por_kilo}
                    onCheckedChange={(v) => setFormData({ ...formData, precio_por_kilo: v })}
                  />
                  <Label htmlFor="precio_por_kilo">Precio por Kilo</Label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
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
                  <TableHead className="hidden md:table-cell">Presentación</TableHead>
                  <TableHead className="text-right">Precio Venta</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Stock</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProductos && filteredProductos.length > 0 ? (
                  filteredProductos.map((producto) => (
                    <TableRow key={producto.id}>
                      <TableCell className="font-mono font-medium">{producto.codigo}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{producto.nombre}</p>
                          {producto.marca && (
                            <p className="text-xs text-muted-foreground">{producto.marca}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {producto.presentacion || "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(producto.precio_venta)}
                      </TableCell>
                      <TableCell className="text-right hidden sm:table-cell">
                        <Badge variant={producto.stock_actual <= producto.stock_minimo ? "destructive" : "secondary"}>
                          {producto.stock_actual}
                        </Badge>
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
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
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
