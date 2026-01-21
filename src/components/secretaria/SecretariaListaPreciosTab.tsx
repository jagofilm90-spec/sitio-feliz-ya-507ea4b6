import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import { Search, Loader2, DollarSign, Edit, Save } from "lucide-react";
import { getDisplayName } from "@/lib/productUtils";
import { useToast } from "@/hooks/use-toast";

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

export const SecretariaListaPreciosTab = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState<string>("all");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null);
  const [precioVenta, setPrecioVenta] = useState("");
  const [descuentoMaximo, setDescuentoMaximo] = useState("");
  
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
      toast({ title: "Precio actualizado correctamente" });
      queryClient.invalidateQueries({ queryKey: ["secretaria-lista-precios"] });
      setEditDialogOpen(false);
      setEditingProduct(null);
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
  const handleEdit = (producto: Producto) => {
    setEditingProduct(producto);
    setPrecioVenta(producto.precio_venta.toString());
    setDescuentoMaximo(producto.descuento_maximo?.toString() || "");
    setEditDialogOpen(true);
  };

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
    });
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
                  <TableHead className="text-center">Editar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProductos && filteredProductos.length > 0 ? (
                  filteredProductos.map((producto) => {
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
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-400 dark:border-green-800">
                              -${producto.descuento_maximo.toFixed(2)}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(producto)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
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
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
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
              <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-700 dark:text-green-400">
                  Precio mínimo sin autorización: <strong>${(parseFloat(precioVenta) - parseFloat(descuentoMaximo)).toFixed(2)}</strong>
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={updatePriceMutation.isPending}>
              {updatePriceMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
