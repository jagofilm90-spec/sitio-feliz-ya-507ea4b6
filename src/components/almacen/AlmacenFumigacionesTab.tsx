import { useState, useEffect } from "react";
import { format, differenceInDays, addMonths } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Bug,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Edit2
} from "lucide-react";

interface ProductoFumigacion {
  id: string;
  codigo: string;
  nombre: string;
  fecha_ultima_fumigacion: string | null;
  stock_actual: number;
}

interface AlmacenFumigacionesTabProps {
  onStatsUpdate: (stats: { vencidas: number; proximas: number; vigentes: number }) => void;
}

export const AlmacenFumigacionesTab = ({ onStatsUpdate }: AlmacenFumigacionesTabProps) => {
  const [productos, setProductos] = useState<ProductoFumigacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProducto, setEditingProducto] = useState<ProductoFumigacion | null>(null);
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const loadProductos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("productos")
        .select("id, codigo, nombre, fecha_ultima_fumigacion, stock_actual")
        .eq("requiere_fumigacion", true)
        .eq("activo", true)
        .gt("stock_actual", 0)
        .order("fecha_ultima_fumigacion", { ascending: true, nullsFirst: true });

      if (error) throw error;

      const productosData = (data as ProductoFumigacion[]) || [];
      setProductos(productosData);
      
      // Calcular estadísticas
      let vencidas = 0;
      let proximas = 0;
      let vigentes = 0;
      
      productosData.forEach(p => {
        const estado = getEstadoFumigacion(p.fecha_ultima_fumigacion);
        if (estado.tipo === "vencida") vencidas++;
        else if (estado.tipo === "proxima") proximas++;
        else vigentes++;
      });
      
      onStatsUpdate({ vencidas, proximas, vigentes });
    } catch (error) {
      console.error("Error cargando productos:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los productos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProductos();
  }, []);

  const getEstadoFumigacion = (fechaUltima: string | null) => {
    if (!fechaUltima) {
      return { tipo: "vencida", label: "Sin registro", color: "text-destructive", bgColor: "bg-destructive/10" };
    }

    const fechaProxima = addMonths(new Date(fechaUltima), 6);
    const diasRestantes = differenceInDays(fechaProxima, new Date());

    if (diasRestantes < 0) {
      return { tipo: "vencida", label: `Vencida hace ${Math.abs(diasRestantes)} días`, color: "text-destructive", bgColor: "bg-destructive/10" };
    } else if (diasRestantes <= 14) {
      return { tipo: "proxima", label: `Vence en ${diasRestantes} días`, color: "text-yellow-600", bgColor: "bg-yellow-500/10" };
    } else {
      return { tipo: "vigente", label: `${diasRestantes} días restantes`, color: "text-green-600", bgColor: "bg-green-500/10" };
    }
  };

  const getEstadoIcon = (tipo: string) => {
    switch (tipo) {
      case "vencida":
        return AlertTriangle;
      case "proxima":
        return Clock;
      default:
        return CheckCircle2;
    }
  };

  const handleEditarFecha = (producto: ProductoFumigacion) => {
    setEditingProducto(producto);
    setNuevaFecha(format(new Date(), "yyyy-MM-dd"));
  };

  const handleGuardarFecha = async () => {
    if (!editingProducto || !nuevaFecha) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("productos")
        .update({ fecha_ultima_fumigacion: nuevaFecha })
        .eq("id", editingProducto.id);

      if (error) throw error;

      toast({
        title: "Fecha actualizada",
        description: `Fumigación registrada para ${editingProducto.nombre}`
      });

      setEditingProducto(null);
      loadProductos();
    } catch (error) {
      console.error("Error actualizando fecha:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la fecha",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (productos.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Bug className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No hay productos que requieran fumigación con stock disponible</p>
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bug className="w-5 h-5" />
            Control de fumigaciones
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-320px)] min-h-[300px]">
            <div className="divide-y divide-border">
              {productos.map((producto) => {
                const estado = getEstadoFumigacion(producto.fecha_ultima_fumigacion);
                const EstadoIcon = getEstadoIcon(estado.tipo);
                
                return (
                  <div
                    key={producto.id}
                    className={`p-4 flex items-center gap-4 ${estado.bgColor}`}
                  >
                    <div className={`p-2 rounded-full ${estado.bgColor}`}>
                      <EstadoIcon className={`w-5 h-5 ${estado.color}`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{producto.codigo}</span>
                        <Badge variant="outline" className="text-xs">
                          {producto.stock_actual} kg
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {producto.nombre}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          Última: {producto.fecha_ultima_fumigacion 
                            ? format(new Date(producto.fecha_ultima_fumigacion), "dd/MM/yyyy")
                            : "Sin registro"}
                        </span>
                        <span className={`text-xs font-medium ${estado.color}`}>
                          • {estado.label}
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditarFecha(producto)}
                      className="shrink-0"
                    >
                      <Edit2 className="w-4 h-4 mr-1" />
                      Registrar
                    </Button>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Dialog para editar fecha */}
      <Dialog open={!!editingProducto} onOpenChange={() => setEditingProducto(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bug className="w-5 h-5" />
              Registrar fumigación
            </DialogTitle>
          </DialogHeader>
          
          {editingProducto && (
            <div className="space-y-4">
              <div>
                <p className="font-medium">{editingProducto.codigo}</p>
                <p className="text-sm text-muted-foreground">{editingProducto.nombre}</p>
              </div>
              
              <div className="space-y-2">
                <Label>Fecha de fumigación</Label>
                <Input
                  type="date"
                  value={nuevaFecha}
                  onChange={(e) => setNuevaFecha(e.target.value)}
                  max={format(new Date(), "yyyy-MM-dd")}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProducto(null)}>
              Cancelar
            </Button>
            <Button onClick={handleGuardarFecha} disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
