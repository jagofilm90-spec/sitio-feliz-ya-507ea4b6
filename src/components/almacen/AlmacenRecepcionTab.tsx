import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Package, 
  ChevronRight,
  CheckCircle2,
  Clock,
  Truck,
  Calendar,
  Camera
} from "lucide-react";
import { AlmacenRecepcionSheet } from "./AlmacenRecepcionSheet";

interface EntregaCompra {
  id: string;
  numero_entrega: number;
  cantidad_bultos: number;
  fecha_programada: string | null;
  fecha_entrega_real: string | null;
  status: string;
  notas: string | null;
  orden_compra: {
    id: string;
    folio: string;
    proveedor: {
      id: string;
      nombre: string;
    };
  };
}

interface AlmacenRecepcionTabProps {
  onStatsUpdate: (stats: { pendientes: number; recibidas: number }) => void;
}

export const AlmacenRecepcionTab = ({ onStatsUpdate }: AlmacenRecepcionTabProps) => {
  const [entregas, setEntregas] = useState<EntregaCompra[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntrega, setSelectedEntrega] = useState<EntregaCompra | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { toast } = useToast();

  const loadEntregas = async () => {
    setLoading(true);
    try {
      // Obtener entregas programadas para hoy o pendientes
      const { data, error } = await supabase
        .from("ordenes_compra_entregas")
        .select(`
          id,
          numero_entrega,
          cantidad_bultos,
          fecha_programada,
          fecha_entrega_real,
          status,
          notas,
          orden_compra:ordenes_compra(
            id,
            folio,
            proveedor:proveedores(id, nombre)
          )
        `)
        .in("status", ["programada", "en_transito"])
        .order("fecha_programada", { ascending: true });

      if (error) throw error;

      const entregasData = (data as any[]) || [];
      setEntregas(entregasData);
      
      const pendientes = entregasData.filter(e => e.status === "programada");
      const recibidas = entregasData.filter(e => e.status === "recibida");
      onStatsUpdate({
        pendientes: pendientes.length,
        recibidas: recibidas.length
      });
    } catch (error) {
      console.error("Error cargando entregas:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las entregas de proveedores",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntregas();
  }, []);

  const getEstadoEntrega = (status: string) => {
    switch (status) {
      case "recibida":
        return { label: "Recibida", color: "bg-green-500", variant: "default" as const };
      case "en_transito":
        return { label: "En tránsito", color: "bg-blue-500", variant: "secondary" as const };
      default:
        return { label: "Programada", color: "bg-yellow-500", variant: "outline" as const };
    }
  };

  const handleSelectEntrega = (entrega: EntregaCompra) => {
    setSelectedEntrega(entrega);
    setSheetOpen(true);
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

  if (entregas.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No hay entregas de proveedores pendientes</p>
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="w-5 h-5" />
            Recepciones pendientes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-320px)] min-h-[300px]">
            <div className="divide-y divide-border">
              {entregas.map((entrega) => {
                const estado = getEstadoEntrega(entrega.status);
                
                return (
                  <button
                    key={entrega.id}
                    onClick={() => handleSelectEntrega(entrega)}
                    className="w-full p-4 hover:bg-muted/50 transition-colors text-left flex items-center gap-4"
                  >
                    <div className={`w-3 h-3 rounded-full ${estado.color} flex-shrink-0`} />
                    
                    <div className="flex-1 min-w-0">
                      {/* LÍNEA 1: Proveedor + Cantidad (prominente) */}
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-semibold text-lg truncate">
                          {entrega.orden_compra?.proveedor?.nombre || "Sin proveedor"}
                        </span>
                        <Badge className="text-base font-bold bg-primary text-primary-foreground flex-shrink-0">
                          {entrega.cantidad_bultos.toLocaleString()} bultos
                        </Badge>
                      </div>
                      
                      {/* LÍNEA 2: Fecha + OC (secundario) */}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {entrega.fecha_programada && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {format(new Date(entrega.fecha_programada + "T12:00:00"), "dd/MM/yyyy", { locale: es })}
                          </span>
                        )}
                        <span>•</span>
                        <span className="truncate">
                          {entrega.orden_compra?.folio} - Entrega #{entrega.numero_entrega}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant={estado.variant}>
                        {estado.label}
                      </Badge>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {selectedEntrega && (
        <AlmacenRecepcionSheet
          entrega={selectedEntrega}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          onRecepcionCompletada={() => {
            loadEntregas();
            setSheetOpen(false);
          }}
        />
      )}
    </>
  );
};
