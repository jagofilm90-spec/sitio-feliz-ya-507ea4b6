import { useState } from "react";
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
import { useToast } from "@/hooks/use-toast";
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
} from "lucide-react";

interface CostoProveedor {
  id: string;
  producto_id: string;
  producto_codigo: string;
  producto_nombre: string;
  proveedor_id: string;
  proveedor_nombre: string;
  costo_proveedor: number;
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
}

export const SecretariaCostosTab = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("proveedores");
  const [editDialog, setEditDialog] = useState(false);
  const [editingCosto, setEditingCosto] = useState<CostoProveedor | null>(null);
  const [nuevoCosto, setNuevoCosto] = useState("");
  const [notas, setNotas] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch costs by supplier
  const { data: costosProveedores, isLoading: loadingCostos } = useQuery({
    queryKey: ["costos-proveedores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proveedor_productos")
        .select(`
          id,
          producto_id,
          proveedor_id,
          costo_proveedor,
          productos (codigo, nombre),
          proveedores (nombre)
        `)
        .order("producto_id");

      if (error) throw error;

      return data?.map((item: any) => ({
        id: item.id,
        producto_id: item.producto_id,
        producto_codigo: item.productos?.codigo || "",
        producto_nombre: item.productos?.nombre || "",
        proveedor_id: item.proveedor_id,
        proveedor_nombre: item.proveedores?.nombre || "",
        costo_proveedor: item.costo_proveedor || 0,
      })) as CostoProveedor[];
    },
  });

  // Fetch cost history
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
          productos (codigo, nombre),
          proveedores (nombre)
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
      })) as HistorialCosto[];
    },
  });

  // Filter costs
  const filteredCostos = costosProveedores?.filter((c) =>
    c.producto_codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.producto_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.proveedor_nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter history
  const filteredHistorial = historialCostos?.filter((h) =>
    h.producto_codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.producto_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (h.proveedor_nombre?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  // Edit cost mutation
  const editCostoMutation = useMutation({
    mutationFn: async () => {
      if (!editingCosto) return;

      const costoAnterior = editingCosto.costo_proveedor;
      const costoNuevo = parseFloat(nuevoCosto);

      // Update proveedor_productos
      const { error: updateError } = await supabase
        .from("proveedor_productos")
        .update({ costo_proveedor: costoNuevo })
        .eq("id", editingCosto.id);

      if (updateError) throw updateError;

      // Also update ultimo_costo_compra in productos
      const { error: productoError } = await supabase
        .from("productos")
        .update({ ultimo_costo_compra: costoNuevo })
        .eq("id", editingCosto.producto_id);

      if (productoError) throw productoError;

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Register in history
      const { error: historyError } = await supabase
        .from("productos_historial_costos")
        .insert({
          producto_id: editingCosto.producto_id,
          proveedor_id: editingCosto.proveedor_id,
          costo_anterior: costoAnterior,
          costo_nuevo: costoNuevo,
          fuente: "manual",
          notas: notas || null,
          usuario_id: user?.id,
        });

      if (historyError) throw historyError;
    },
    onSuccess: () => {
      toast({ title: "Costo actualizado correctamente" });
      queryClient.invalidateQueries({ queryKey: ["costos-proveedores"] });
      queryClient.invalidateQueries({ queryKey: ["historial-costos"] });
      setEditDialog(false);
      setEditingCosto(null);
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

  const handleEditClick = (costo: CostoProveedor) => {
    setEditingCosto(costo);
    setNuevoCosto(costo.costo_proveedor.toString());
    setNotas("");
    setEditDialog(true);
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
      case "manual":
        return "Manual";
      case "orden_compra":
        return "Orden de Compra";
      case "recepcion":
        return "Recepción";
      default:
        return fuente;
    }
  };

  const getCostoDiff = (anterior: number | null, nuevo: number) => {
    if (!anterior || anterior === 0) return null;
    const diff = nuevo - anterior;
    const percent = ((diff / anterior) * 100).toFixed(1);
    return { diff, percent };
  };

  const isLoading = loadingCostos || loadingHistorial;

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Coins className="h-5 w-5 text-pink-600" />
            Costos de Mercancía
          </h2>
          <p className="text-sm text-muted-foreground">
            {costosProveedores?.length || 0} costos registrados
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por código, producto o proveedor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="proveedores" className="gap-2">
            <Coins className="h-4 w-4" />
            Por Proveedor
          </TabsTrigger>
          <TabsTrigger value="historial" className="gap-2">
            <History className="h-4 w-4" />
            Historial de Cambios
          </TabsTrigger>
        </TabsList>

        {/* Tab: Por Proveedor */}
        <TabsContent value="proveedores" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead className="text-right">Costo</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCostos && filteredCostos.length > 0 ? (
                      filteredCostos.map((costo) => (
                        <TableRow key={costo.id}>
                          <TableCell className="font-mono font-medium">
                            {costo.producto_codigo}
                          </TableCell>
                          <TableCell>{costo.producto_nombre}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{costo.proveedor_nombre}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ${costo.costo_proveedor.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditClick(costo)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No se encontraron costos
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHistorial && filteredHistorial.length > 0 ? (
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
                              {item.costo_anterior ? `$${item.costo_anterior.toFixed(2)}` : "—"}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              ${item.costo_nuevo.toFixed(2)}
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
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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

      {/* Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Costo</DialogTitle>
            <DialogDescription>
              {editingCosto?.producto_nombre} - {editingCosto?.proveedor_nombre}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Costo Actual</Label>
              <p className="text-2xl font-bold text-muted-foreground">
                ${editingCosto?.costo_proveedor.toFixed(2)}
              </p>
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
                placeholder="Razón del cambio..."
                rows={2}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveCosto}
              disabled={editCostoMutation.isPending}
              className="bg-pink-600 hover:bg-pink-700"
            >
              {editCostoMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Guardar Cambio
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
