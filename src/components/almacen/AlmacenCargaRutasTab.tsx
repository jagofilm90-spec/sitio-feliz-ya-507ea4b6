import { useState, useEffect } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Package, 
  Truck, 
  User, 
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle
} from "lucide-react";
import { RutaCargaSheet } from "@/components/almacen/RutaCargaSheet";

interface Ruta {
  id: string;
  folio: string;
  fecha_ruta: string;
  status: string;
  peso_total_kg: number | null;
  carga_completada: boolean | null;
  carga_completada_en: string | null;
  vehiculo: {
    id: string;
    nombre: string;
    placas: string;
  } | null;
  chofer: {
    id: string;
    nombre_completo: string;
  } | null;
  entregas: {
    id: string;
    pedido_id: string;
  }[];
}

interface AlmacenCargaRutasTabProps {
  onStatsUpdate: (stats: { total: number; pendientes: number; completadas: number; entregas: number }) => void;
}

export const AlmacenCargaRutasTab = ({ onStatsUpdate }: AlmacenCargaRutasTabProps) => {
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRuta, setSelectedRuta] = useState<Ruta | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { toast } = useToast();

  const fechaHoy = format(new Date(), "yyyy-MM-dd");

  const loadRutas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("rutas")
        .select(`
          id,
          folio,
          fecha_ruta,
          status,
          peso_total_kg,
          carga_completada,
          carga_completada_en,
          vehiculo:vehiculos(id, nombre, placas),
          chofer:empleados!rutas_chofer_id_fkey(id, nombre_completo),
          entregas(id, pedido_id)
        `)
        .eq("fecha_ruta", fechaHoy)
        .order("folio", { ascending: true });

      if (error) throw error;

      const rutasData = (data as any[]) || [];
      setRutas(rutasData);
      
      const pendientes = rutasData.filter(r => !r.carga_completada);
      const completadas = rutasData.filter(r => r.carga_completada);
      onStatsUpdate({
        total: rutasData.length,
        pendientes: pendientes.length,
        completadas: completadas.length,
        entregas: rutasData.reduce((acc, r) => acc + r.entregas.length, 0)
      });
    } catch (error) {
      console.error("Error cargando rutas:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las rutas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRutas();
  }, []);

  const getEstadoCarga = (ruta: Ruta) => {
    if (ruta.carga_completada) {
      return { label: "Completada", color: "bg-green-500", icon: CheckCircle2 };
    }
    if (ruta.status === "en_carga") {
      return { label: "En progreso", color: "bg-yellow-500", icon: Clock };
    }
    return { label: "Sin iniciar", color: "bg-muted", icon: AlertCircle };
  };

  const handleSelectRuta = (ruta: Ruta) => {
    setSelectedRuta(ruta);
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

  if (rutas.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Truck className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No hay rutas programadas para hoy</p>
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Rutas para cargar</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-320px)] min-h-[300px]">
            <div className="divide-y divide-border">
              {rutas.map((ruta) => {
                const estado = getEstadoCarga(ruta);
                const EstadoIcon = estado.icon;
                
                return (
                  <button
                    key={ruta.id}
                    onClick={() => handleSelectRuta(ruta)}
                    className="w-full p-4 hover:bg-muted/50 transition-colors text-left flex items-center gap-4"
                  >
                    <div className={`w-3 h-3 rounded-full ${estado.color}`} />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-lg">{ruta.folio}</span>
                        <Badge variant="outline" className="text-xs">
                          {ruta.entregas.length} entregas
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Truck className="w-4 h-4" />
                          {ruta.vehiculo?.nombre || "Sin vehículo"}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {ruta.chofer?.nombre_completo || "Sin chofer"}
                        </span>
                        {ruta.peso_total_kg && (
                          <span className="flex items-center gap-1">
                            <Package className="w-4 h-4" />
                            {ruta.peso_total_kg.toLocaleString()} kg
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant={ruta.carga_completada ? "default" : "secondary"}
                        className="flex items-center gap-1"
                      >
                        <EstadoIcon className="w-3 h-3" />
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

      {selectedRuta && (
        <RutaCargaSheet
          ruta={selectedRuta}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          onCargaCompletada={() => {
            loadRutas();
            setSheetOpen(false);
          }}
        />
      )}
    </>
  );
};
