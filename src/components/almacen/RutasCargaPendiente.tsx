import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Truck, Package, CheckCircle2, Clock, ChevronRight, AlertCircle } from "lucide-react";
import { HojaCargaDigital } from "./HojaCargaDigital";

interface Ruta {
  id: string;
  fecha_ruta: string;
  carga_completada: boolean;
  carga_completada_en: string | null;
  vehiculo: {
    id: string;
    nombre: string;
    placa: string;
  } | null;
  chofer: {
    id: string;
    full_name: string;
  } | null;
  entregas: Array<{
    id: string;
    pedido: {
      id: string;
      folio: string;
      cliente: {
        id: string;
        nombre: string;
        codigo: string;
      };
      sucursal: {
        id: string;
        nombre: string;
      } | null;
    };
  }>;
}

export const RutasCargaPendiente = () => {
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRuta, setSelectedRuta] = useState<Ruta | null>(null);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(format(new Date(), "yyyy-MM-dd"));

  useEffect(() => {
    loadRutas();
  }, [fechaSeleccionada]);

  const loadRutas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("rutas")
        .select(`
          id,
          fecha_ruta,
          carga_completada,
          carga_completada_en,
          vehiculo:vehiculos(id, nombre, placa),
          chofer:profiles!rutas_chofer_id_fkey(id, full_name),
          entregas(
            id,
            pedido:pedidos(
              id,
              folio,
              cliente:clientes(id, nombre, codigo),
              sucursal:cliente_sucursales(id, nombre)
            )
          )
        `)
        .eq("fecha_ruta", fechaSeleccionada)
        .order("created_at", { ascending: true });

      if (error) throw error;
      
      // Transform data to match interface
      const transformedRutas = (data || []).map((ruta: any) => ({
        ...ruta,
        vehiculo: ruta.vehiculo ? ruta.vehiculo : null,
        chofer: ruta.chofer ? ruta.chofer : null,
        entregas: (ruta.entregas || []).map((e: any) => ({
          ...e,
          pedido: e.pedido ? {
            ...e.pedido,
            cliente: e.pedido.cliente || null,
            sucursal: e.pedido.sucursal || null
          } : null
        })).filter((e: any) => e.pedido)
      }));
      
      setRutas(transformedRutas);
    } catch (error) {
      console.error("Error loading rutas:", error);
    } finally {
      setLoading(false);
    }
  };

  const getEstadoCarga = (ruta: Ruta) => {
    if (ruta.carga_completada) {
      return { label: "Completada", variant: "default" as const, icon: CheckCircle2 };
    }
    return { label: "Pendiente", variant: "secondary" as const, icon: Clock };
  };

  const handleCargaCompletada = () => {
    loadRutas();
    setSelectedRuta(null);
  };

  if (selectedRuta) {
    return (
      <HojaCargaDigital 
        ruta={selectedRuta} 
        onBack={() => setSelectedRuta(null)}
        onComplete={handleCargaCompletada}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Rutas por Cargar</h2>
          <p className="text-sm text-muted-foreground">
            Selecciona una ruta para ver la hoja de carga
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={fechaSeleccionada}
            onChange={(e) => setFechaSeleccionada(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm bg-background"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : rutas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Truck className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No hay rutas para esta fecha</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Selecciona otra fecha o espera a que se programen nuevas rutas
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rutas.map((ruta) => {
            const estado = getEstadoCarga(ruta);
            const EntregasCount = ruta.entregas?.length || 0;
            
            return (
              <Card 
                key={ruta.id} 
                className={`cursor-pointer transition-all hover:shadow-md hover:border-primary/50 ${
                  ruta.carga_completada ? "opacity-75" : ""
                }`}
                onClick={() => setSelectedRuta(ruta)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Truck className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">
                        {ruta.vehiculo?.nombre || "Sin vehículo"}
                      </CardTitle>
                    </div>
                    <Badge variant={estado.variant} className="flex items-center gap-1">
                      <estado.icon className="h-3 w-3" />
                      {estado.label}
                    </Badge>
                  </div>
                  <CardDescription>
                    {ruta.vehiculo?.placa || "Sin placa"} • {ruta.chofer?.full_name || "Sin chofer"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Entregas:</span>
                      <span className="font-medium">{EntregasCount} clientes</span>
                    </div>
                    
                    {ruta.carga_completada && ruta.carga_completada_en && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        Completada: {format(new Date(ruta.carga_completada_en), "HH:mm", { locale: es })}
                      </div>
                    )}

                    <div className="pt-2 border-t">
                      <Button variant="ghost" className="w-full justify-between" size="sm">
                        Ver hoja de carga
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Resumen del día */}
      {!loading && rutas.length > 0 && (
        <Card className="mt-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Resumen del Día</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{rutas.length}</p>
                <p className="text-xs text-muted-foreground">Rutas totales</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {rutas.filter(r => r.carga_completada).length}
                </p>
                <p className="text-xs text-muted-foreground">Cargas completadas</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">
                  {rutas.filter(r => !r.carga_completada).length}
                </p>
                <p className="text-xs text-muted-foreground">Pendientes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
