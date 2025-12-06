import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  RotateCcw, 
  Package, 
  CheckCircle2, 
  Plus,
  Truck
} from "lucide-react";

interface Devolucion {
  id: string;
  cantidad_devuelta: number;
  motivo: string;
  reingresado_a_inventario: boolean;
  created_at: string;
  entrega: {
    id: string;
    ruta: {
      fecha_ruta: string;
      vehiculo: { nombre: string } | null;
    };
    pedido: {
      folio: string;
      cliente: { nombre: string };
    };
  };
  pedido_detalle: {
    producto: {
      codigo: string;
      nombre: string;
    };
  };
  registrado_por_profile: {
    full_name: string;
  } | null;
}

const MOTIVOS_DEVOLUCION = [
  { value: "cliente_rechazo", label: "Cliente rechazó el producto" },
  { value: "producto_danado", label: "Producto dañado" },
  { value: "error_pedido", label: "Error en el pedido" },
  { value: "exceso_cantidad", label: "Exceso de cantidad" },
  { value: "producto_vencido", label: "Producto vencido" },
  { value: "otro", label: "Otro motivo" }
];

export const DevolucionesTab = () => {
  const [devoluciones, setDevoluciones] = useState<Devolucion[]>([]);
  const [loading, setLoading] = useState(true);
  const [rutasHoy, setRutasHoy] = useState<any[]>([]);

  useEffect(() => {
    loadDevoluciones();
    loadRutasHoy();
  }, []);

  const loadDevoluciones = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("devoluciones")
        .select(`
          id,
          cantidad_devuelta,
          motivo,
          reingresado_a_inventario,
          created_at,
          entrega:entregas(
            id,
            ruta:rutas(
              fecha_ruta,
              vehiculo:vehiculos(nombre)
            ),
            pedido:pedidos(
              folio,
              cliente:clientes(nombre)
            )
          ),
          pedido_detalle:pedidos_detalles(
            producto:productos(codigo, nombre)
          ),
          registrado_por_profile:profiles!devoluciones_registrado_por_fkey(full_name)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setDevoluciones(data || []);
    } catch (error) {
      console.error("Error loading devoluciones:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadRutasHoy = async () => {
    const hoy = format(new Date(), "yyyy-MM-dd");
    const { data } = await supabase
      .from("rutas")
      .select(`
        id,
        fecha_ruta,
        vehiculo:vehiculos(nombre),
        entregas(
          id,
          pedido:pedidos(
            id,
            folio,
            cliente:clientes(nombre)
          )
        )
      `)
      .eq("fecha_ruta", hoy)
      .eq("carga_completada", true);

    setRutasHoy(data || []);
  };

  const handleReingresarInventario = async (devolucionId: string) => {
    try {
      const { error } = await supabase
        .from("devoluciones")
        .update({ reingresado_a_inventario: true })
        .eq("id", devolucionId);

      if (error) throw error;
      
      toast.success("Producto reingresado al inventario");
      loadDevoluciones();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al reingresar producto");
    }
  };

  const getMotivoLabel = (motivo: string) => {
    return MOTIVOS_DEVOLUCION.find(m => m.value === motivo)?.label || motivo;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Devoluciones</h2>
          <p className="text-sm text-muted-foreground">
            Registro de productos devueltos por clientes
          </p>
        </div>
      </div>

      {/* Devoluciones recientes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Devoluciones Recientes</CardTitle>
          <CardDescription>Últimas 50 devoluciones registradas</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : devoluciones.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <RotateCcw className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No hay devoluciones</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Las devoluciones se registrarán aquí cuando ocurran
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {devoluciones.map((devolucion) => (
                <div 
                  key={devolucion.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-muted-foreground">
                        {devolucion.pedido_detalle?.producto?.codigo || "N/A"}
                      </span>
                      <span className="font-medium truncate">
                        {devolucion.pedido_detalle?.producto?.nombre || "Producto desconocido"}
                      </span>
                      <Badge variant="secondary">
                        {devolucion.cantidad_devuelta} unidades
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{devolucion.entrega?.pedido?.cliente?.nombre}</span>
                      <span>•</span>
                      <span>Pedido: {devolucion.entrega?.pedido?.folio}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {getMotivoLabel(devolucion.motivo)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(devolucion.created_at), "d MMM HH:mm", { locale: es })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {devolucion.reingresado_a_inventario ? (
                      <Badge variant="default" className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Reingresado
                      </Badge>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleReingresarInventario(devolucion.id)}
                      >
                        <Package className="h-4 w-4 mr-1" />
                        Reingresar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
