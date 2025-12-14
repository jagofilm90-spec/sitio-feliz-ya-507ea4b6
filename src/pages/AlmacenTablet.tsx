import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Package, 
  Truck, 
  User, 
  Calendar,
  RefreshCw,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  LogOut,
  Wifi,
  WifiOff
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

const AlmacenTablet = () => {
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRuta, setSelectedRuta] = useState<Ruta | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { toast } = useToast();
  const navigate = useNavigate();

  const fechaHoy = format(new Date(), "yyyy-MM-dd");

  // Monitor de conexión
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

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

      setRutas((data as any[]) || []);
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

  const rutasPendientes = rutas.filter(r => !r.carga_completada);
  const rutasCompletadas = rutas.filter(r => r.carga_completada);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      {/* Header con indicador de conexión y logout */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Carga de Rutas
            </h1>
            {/* Indicador de conexión */}
            <Badge variant={isOnline ? "default" : "destructive"} className="h-8 px-3 text-sm">
              {isOnline ? (
                <><Wifi className="w-4 h-4 mr-1" /> Conectado</>
              ) : (
                <><WifiOff className="w-4 h-4 mr-1" /> Sin conexión</>
              )}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1 text-lg">
            <Calendar className="inline-block w-5 h-5 mr-2" />
            {format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="lg"
            onClick={loadRutas}
            disabled={loading}
            className="h-14 px-6 text-lg"
          >
            <RefreshCw className={`w-5 h-5 mr-2 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
          <Button
            variant="ghost"
            size="lg"
            onClick={handleLogout}
            className="h-14 px-6 text-lg text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-5 h-5 mr-2" />
            Salir
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 rounded-full bg-primary/10">
              <Truck className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{rutas.length}</p>
              <p className="text-sm text-muted-foreground">Rutas hoy</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 rounded-full bg-yellow-500/10">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{rutasPendientes.length}</p>
              <p className="text-sm text-muted-foreground">Pendientes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 rounded-full bg-green-500/10">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{rutasCompletadas.length}</p>
              <p className="text-sm text-muted-foreground">Completadas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 rounded-full bg-muted">
              <Package className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {rutas.reduce((acc, r) => acc + r.entregas.length, 0)}
              </p>
              <p className="text-sm text-muted-foreground">Entregas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de rutas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Rutas para cargar</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : rutas.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Truck className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No hay rutas programadas para hoy</p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-400px)] min-h-[300px]">
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
                      {/* Estado */}
                      <div className={`w-3 h-3 rounded-full ${estado.color}`} />
                      
                      {/* Info principal */}
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

                      {/* Estado badge */}
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
          )}
        </CardContent>
      </Card>

      {/* Sheet de carga */}
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
    </div>
  );
};

export default AlmacenTablet;
