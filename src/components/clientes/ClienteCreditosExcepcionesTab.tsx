import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Info, Search } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface ClienteCreditosExcepcionesTabProps {
  clienteId: string;
  clienteNombre: string;
  terminoDefault: string;
}

interface Excepcion {
  id: string;
  producto_id: string;
  termino_credito: string;
  notas: string | null;
  producto?: {
    nombre: string;
    codigo: string;
  };
}

interface Producto {
  id: string;
  nombre: string;
  codigo: string;
}

interface ReglaGlobal {
  nombre: string;
  termino: string;
  patrones: string[];
}

const TERMINO_LABELS: Record<string, string> = {
  'contado': 'Contado',
  '8_dias': '8 días',
  '15_dias': '15 días',
  '30_dias': '30 días',
};

export function ClienteCreditosExcepcionesTab({ 
  clienteId, 
  clienteNombre,
  terminoDefault 
}: ClienteCreditosExcepcionesTabProps) {
  const [excepciones, setExcepciones] = useState<Excepcion[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [reglasGlobales, setReglasGlobales] = useState<ReglaGlobal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchProducto, setSearchProducto] = useState("");
  
  // Form state
  const [selectedProductoId, setSelectedProductoId] = useState("");
  const [selectedTermino, setSelectedTermino] = useState("8_dias");
  const [notas, setNotas] = useState("");

  useEffect(() => {
    loadData();
  }, [clienteId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Cargar excepciones del cliente
      const { data: excepcionesData, error: excepcionesError } = await supabase
        .from('cliente_creditos_excepciones')
        .select(`
          id,
          producto_id,
          termino_credito,
          notas,
          producto:productos(nombre, codigo)
        `)
        .eq('cliente_id', clienteId);

      if (excepcionesError) throw excepcionesError;
      setExcepciones(excepcionesData || []);

      // Cargar productos para el selector
      const { data: productosData, error: productosError } = await supabase
        .from('productos')
        .select('id, nombre, codigo')
        .eq('activo', true)
        .order('nombre');

      if (productosError) throw productosError;
      setProductos(productosData || []);

      // Cargar reglas globales
      const { data: configData, error: configError } = await supabase
        .from('configuracion_empresa')
        .select('valor')
        .eq('clave', 'plazos_credito_por_tipo_producto')
        .maybeSingle();

      if (!configError && configData?.valor) {
        const config = configData.valor as { reglas?: ReglaGlobal[] };
        setReglasGlobales(config.reglas || []);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      toast.error('Error al cargar datos de crédito');
    } finally {
      setLoading(false);
    }
  };

  const handleAddExcepcion = async () => {
    if (!selectedProductoId) {
      toast.error('Selecciona un producto');
      return;
    }

    try {
      const { error } = await supabase
        .from('cliente_creditos_excepciones')
        .insert({
          cliente_id: clienteId,
          producto_id: selectedProductoId,
          termino_credito: selectedTermino as "8_dias" | "15_dias" | "30_dias" | "contado",
          notas: notas || null
        } as any);

      if (error) {
        if (error.code === '23505') {
          toast.error('Ya existe una excepción para este producto');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Excepción agregada');
      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error agregando excepción:', error);
      toast.error('Error al agregar excepción');
    }
  };

  const handleDeleteExcepcion = async (id: string) => {
    try {
      const { error } = await supabase
        .from('cliente_creditos_excepciones')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Excepción eliminada');
      loadData();
    } catch (error) {
      console.error('Error eliminando excepción:', error);
      toast.error('Error al eliminar excepción');
    }
  };

  const resetForm = () => {
    setSelectedProductoId("");
    setSelectedTermino("8_dias");
    setNotas("");
    setSearchProducto("");
  };

  // Determinar plazo global para un producto
  const getPlazoGlobal = (productoNombre: string): string | null => {
    for (const regla of reglasGlobales) {
      for (const patron of regla.patrones) {
        if (productoNombre.toLowerCase().includes(patron.toLowerCase())) {
          return regla.termino;
        }
      }
    }
    return null;
  };

  // Filtrar productos que no tienen excepción ya
  const productosDisponibles = productos.filter(p => 
    !excepciones.some(e => e.producto_id === p.id) &&
    (searchProducto === "" || 
     p.nombre.toLowerCase().includes(searchProducto.toLowerCase()) ||
     p.codigo.toLowerCase().includes(searchProducto.toLowerCase()))
  );

  if (loading) {
    return <div className="p-4 text-center text-muted-foreground">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Información del plazo default */}
      <div className="bg-muted/50 rounded-lg p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-medium">
            Plazo default de {clienteNombre}: <Badge variant="secondary">{TERMINO_LABELS[terminoDefault] || terminoDefault}</Badge>
          </p>
          <p className="text-xs text-muted-foreground">
            Este plazo aplica a productos que no tienen regla global ni excepción específica.
          </p>
        </div>
      </div>

      {/* Reglas globales activas */}
      {reglasGlobales.length > 0 && (
        <div className="bg-primary/5 rounded-lg p-4">
          <h4 className="text-sm font-medium mb-2">Reglas globales por tipo de producto:</h4>
          <div className="flex flex-wrap gap-2">
            {reglasGlobales.map((regla, idx) => (
              <TooltipProvider key={idx}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="cursor-help">
                      {regla.nombre}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Aplica a: {regla.patrones.join(', ')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </div>
      )}

      {/* Header con botón agregar */}
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-medium">Excepciones de crédito para este cliente</h4>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-1" />
              Agregar excepción
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar excepción de crédito</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Buscar producto</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre o código..."
                    value={searchProducto}
                    onChange={(e) => setSearchProducto(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Producto</Label>
                <Select value={selectedProductoId} onValueChange={setSelectedProductoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar producto" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {productosDisponibles.slice(0, 50).map((p) => {
                      const plazoGlobal = getPlazoGlobal(p.nombre);
                      return (
                        <SelectItem key={p.id} value={p.id}>
                          <div className="flex items-center gap-2">
                            <span>{p.codigo} - {p.nombre}</span>
                            {plazoGlobal && (
                              <Badge variant="outline" className="text-xs">
                                {TERMINO_LABELS[plazoGlobal]}
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {productosDisponibles.length > 50 && (
                  <p className="text-xs text-muted-foreground">
                    Mostrando 50 de {productosDisponibles.length}. Usa el buscador para filtrar.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Plazo de crédito especial</Label>
                <Select value={selectedTermino} onValueChange={setSelectedTermino}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contado">Contado</SelectItem>
                    <SelectItem value="8_dias">8 días</SelectItem>
                    <SelectItem value="15_dias">15 días</SelectItem>
                    <SelectItem value="30_dias">30 días</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Notas (opcional)</Label>
                <Textarea
                  placeholder="Motivo del acuerdo especial..."
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddExcepcion}>
                  Guardar excepción
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabla de excepciones */}
      {excepciones.length === 0 ? (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          <p>No hay excepciones de crédito para este cliente.</p>
          <p className="text-sm mt-1">Se aplican las reglas globales y el plazo default.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>Plazo global</TableHead>
              <TableHead>Plazo especial</TableHead>
              <TableHead>Notas</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {excepciones.map((exc) => {
              const plazoGlobal = exc.producto ? getPlazoGlobal(exc.producto.nombre) : null;
              return (
                <TableRow key={exc.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{exc.producto?.nombre}</p>
                      <p className="text-xs text-muted-foreground">{exc.producto?.codigo}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {plazoGlobal ? (
                      <Badge variant="outline">{TERMINO_LABELS[plazoGlobal]}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">
                        {TERMINO_LABELS[terminoDefault]} (default)
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge>{TERMINO_LABELS[exc.termino_credito]}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {exc.notas || '-'}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteExcepcion(exc.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
