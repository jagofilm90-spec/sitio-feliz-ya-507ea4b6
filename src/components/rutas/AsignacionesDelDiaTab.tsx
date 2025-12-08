import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, isToday, isTomorrow } from "date-fns";
import { es } from "date-fns/locale";
import { 
  CalendarIcon, 
  Users, 
  Truck, 
  UserCheck,
  AlertTriangle,
  Loader2,
  Clock,
  Package,
  RefreshCw,
  CalendarPlus,
  X,
  Bell
} from "lucide-react";
import { cn } from "@/lib/utils";
import ReasignarPersonalDialog from "./ReasignarPersonalDialog";
import PosponerRutaDialog from "./PosponerRutaDialog";

interface Empleado {
  id: string;
  nombre_completo: string;
  puesto: string;
}

interface Ruta {
  id: string;
  folio: string;
  fecha_ruta: string;
  status: string;
  tipo_ruta: string;
  peso_total_kg: number | null;
  chofer_id: string;
  ayudante_id: string | null;
  vehiculo_id: string | null;
  notas: string | null;
  chofer?: { full_name: string };
  ayudante?: { full_name: string };
  vehiculo?: { nombre: string; tipo: string };
  entregas?: { id: string; pedido_id: string }[];
}

interface Vehiculo {
  id: string;
  nombre: string;
  tipo: string;
  status: string;
}

const AsignacionesDelDiaTab = () => {
  const [fecha, setFecha] = useState<Date>(addDays(new Date(), 1)); // Mañana por defecto
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Dialog states
  const [reasignarDialogOpen, setReasignarDialogOpen] = useState(false);
  const [posponerDialogOpen, setPosponerDialogOpen] = useState(false);
  const [selectedRuta, setSelectedRuta] = useState<Ruta | null>(null);

  useEffect(() => {
    loadData();
  }, [fecha]);

  const loadData = async () => {
    setLoading(true);
    try {
      const fechaStr = format(fecha, "yyyy-MM-dd");
      
      // Load routes for selected date
      const { data: rutasData, error: rutasError } = await supabase
        .from("rutas")
        .select(`
          *,
          chofer:profiles!rutas_chofer_id_fkey (full_name),
          ayudante:profiles!rutas_ayudante_id_fkey (full_name),
          vehiculo:vehiculo_id (nombre, tipo),
          entregas (id, pedido_id)
        `)
        .eq("fecha_ruta", fechaStr)
        .in("status", ["programada", "en_curso"])
        .order("created_at");

      if (rutasError) throw rutasError;
      setRutas((rutasData as Ruta[]) || []);

      // Load all drivers and helpers
      const { data: empleadosData, error: empleadosError } = await supabase
        .from("empleados")
        .select("id, nombre_completo, puesto")
        .eq("activo", true)
        .or("puesto.ilike.%chofer%,puesto.ilike.%ayudante%")
        .order("nombre_completo");

      if (empleadosError) throw empleadosError;
      setEmpleados(empleadosData || []);

      // Load all vehicles
      const { data: vehiculosData, error: vehiculosError } = await supabase
        .from("vehiculos")
        .select("id, nombre, tipo, status")
        .eq("activo", true)
        .order("nombre");

      if (vehiculosError) throw vehiculosError;
      setVehiculos(vehiculosData || []);

    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar la información",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate assigned and unassigned resources
  const choferesAsignados = new Set(rutas.map(r => r.chofer_id));
  const ayudantesAsignados = new Set(rutas.filter(r => r.ayudante_id).map(r => r.ayudante_id));
  const vehiculosAsignados = new Set(rutas.filter(r => r.vehiculo_id).map(r => r.vehiculo_id));

  const choferes = empleados.filter(e => 
    e.puesto.toLowerCase().includes("chofer") && 
    !e.puesto.toLowerCase().includes("ayudante")
  );
  const ayudantes = empleados.filter(e => 
    e.puesto.toLowerCase().includes("ayudante")
  );

  const choferesLibres = choferes.filter(c => !choferesAsignados.has(c.id));
  const ayudantesLibres = ayudantes.filter(a => !ayudantesAsignados.has(a.id));
  const vehiculosLibres = vehiculos.filter(v => !vehiculosAsignados.has(v.id) && v.status === "disponible");

  const handleReasignar = (ruta: Ruta) => {
    setSelectedRuta(ruta);
    setReasignarDialogOpen(true);
  };

  const handlePosponer = (ruta: Ruta) => {
    setSelectedRuta(ruta);
    setPosponerDialogOpen(true);
  };

  const handleCancelarRuta = async (ruta: Ruta) => {
    if (!confirm(`¿Cancelar la ruta ${ruta.folio}? Los pedidos regresarán a "pendientes".`)) {
      return;
    }

    try {
      // Get pedido IDs from entregas
      const pedidoIds = ruta.entregas?.map(e => e.pedido_id) || [];

      // Update pedidos back to pendiente
      if (pedidoIds.length > 0) {
        await supabase
          .from("pedidos")
          .update({ status: "pendiente" })
          .in("id", pedidoIds);
      }

      // Delete entregas
      await supabase
        .from("entregas")
        .delete()
        .eq("ruta_id", ruta.id);

      // Update vehicle status back to disponible
      if (ruta.vehiculo_id) {
        await supabase
          .from("vehiculos")
          .update({ status: "disponible" })
          .eq("id", ruta.vehiculo_id);
      }

      // Update route status
      await supabase
        .from("rutas")
        .update({ status: "cancelada" })
        .eq("id", ruta.id);

      toast({ title: `Ruta ${ruta.folio} cancelada` });
      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getDateLabel = () => {
    if (isToday(fecha)) return "HOY";
    if (isTomorrow(fecha)) return "MAÑANA";
    return format(fecha, "EEEE d MMM", { locale: es }).toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-semibold">Asignaciones del Día</h2>
          <p className="text-sm text-muted-foreground">
            Rutas programadas y personal asignado
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[220px] justify-start text-left">
                <CalendarIcon className="mr-2 h-4 w-4" />
                <span className="font-semibold mr-2">{getDateLabel()}</span>
                <span className="text-muted-foreground">
                  {format(fecha, "d/MM/yyyy")}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={fecha}
                onSelect={(d) => d && setFecha(d)}
                initialFocus
                locale={es}
              />
            </PopoverContent>
          </Popover>

          <Button variant="outline" size="icon" onClick={loadData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Quick date navigation */}
      <div className="flex gap-2">
        {[0, 1, 2, 3, 4, 5, 6].map(offset => {
          const d = addDays(new Date(), offset);
          const isSelected = format(d, "yyyy-MM-dd") === format(fecha, "yyyy-MM-dd");
          const label = offset === 0 ? "Hoy" : offset === 1 ? "Mañana" : format(d, "EEE", { locale: es });
          return (
            <Button
              key={offset}
              variant={isSelected ? "default" : "outline"}
              size="sm"
              onClick={() => setFecha(d)}
              className={cn("flex-1", isSelected && offset === 1 && "bg-primary")}
            >
              <div className="flex flex-col items-center">
                <span className="text-xs font-normal">{label}</span>
                <span className="font-medium">{format(d, "d")}</span>
              </div>
            </Button>
          );
        })}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 text-center">
            <Truck className="h-6 w-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold text-primary">{rutas.length}</p>
            <p className="text-xs text-muted-foreground">Rutas programadas</p>
          </CardContent>
        </Card>
        <Card className="bg-green-500/10 border-green-500/20">
          <CardContent className="p-4 text-center">
            <UserCheck className="h-6 w-6 mx-auto mb-2 text-green-600" />
            <p className="text-2xl font-bold text-green-600">{choferesLibres.length}</p>
            <p className="text-xs text-muted-foreground">Choferes disponibles</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="p-4 text-center">
            <Users className="h-6 w-6 mx-auto mb-2 text-blue-600" />
            <p className="text-2xl font-bold text-blue-600">{ayudantesLibres.length}</p>
            <p className="text-xs text-muted-foreground">Ayudantes disponibles</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Truck className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            <p className="text-2xl font-bold">{vehiculosLibres.length}</p>
            <p className="text-xs text-muted-foreground">Vehículos libres</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Scheduled Routes - Takes 2 columns */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Rutas Programadas ({rutas.length})
            </h3>

            {rutas.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No hay rutas programadas</p>
                  <p className="text-sm">Usa el planificador para crear rutas para {getDateLabel().toLowerCase()}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {rutas.map(ruta => (
                  <Card key={ruta.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-bold text-lg">{ruta.folio}</span>
                            <Badge variant={ruta.tipo_ruta === "local" ? "secondary" : "outline"}>
                              {ruta.tipo_ruta === "local" ? "Local" : "Foránea"}
                            </Badge>
                            <Badge variant={ruta.status === "programada" ? "default" : "secondary"}>
                              {ruta.status === "programada" ? "Programada" : "En curso"}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Vehículo</p>
                              <p className="font-medium flex items-center gap-1">
                                <Truck className="h-3 w-3" />
                                {ruta.vehiculo?.nombre || "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Chofer</p>
                              <p className="font-medium">{ruta.chofer?.full_name || "—"}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Ayudante</p>
                              <p className="font-medium">{ruta.ayudante?.full_name || "Sin ayudante"}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Carga</p>
                              <p className="font-medium">
                                {ruta.peso_total_kg?.toLocaleString() || 0} kg
                                <span className="text-muted-foreground ml-1">
                                  ({ruta.entregas?.length || 0} entregas)
                                </span>
                              </p>
                            </div>
                          </div>

                          {ruta.notas && (
                            <p className="text-sm text-muted-foreground mt-2 italic">
                              "{ruta.notas}"
                            </p>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-col gap-1 ml-4">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleReasignar(ruta)}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Reasignar
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handlePosponer(ruta)}
                          >
                            <CalendarPlus className="h-3 w-3 mr-1" />
                            Posponer
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleCancelarRuta(ruta)}
                          >
                            <X className="h-3 w-3 mr-1" />
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Available Resources - Sidebar */}
          <div className="space-y-4">
            <h3 className="font-semibold">Recursos Disponibles</h3>

            {/* Available Drivers */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Choferes Libres ({choferesLibres.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {choferesLibres.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    Todos los choferes están asignados
                  </p>
                ) : (
                  choferesLibres.map(c => (
                    <div key={c.id} className="flex items-center gap-2 py-1.5 px-2 rounded bg-green-500/10">
                      <UserCheck className="h-3 w-3 text-green-600" />
                      <span className="text-sm">{c.nombre_completo}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Available Helpers */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Ayudantes Libres ({ayudantesLibres.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {ayudantesLibres.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    Todos los ayudantes están asignados
                  </p>
                ) : (
                  ayudantesLibres.map(a => (
                    <div key={a.id} className="flex items-center gap-2 py-1.5 px-2 rounded bg-blue-500/10">
                      <UserCheck className="h-3 w-3 text-blue-600" />
                      <span className="text-sm">{a.nombre_completo}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Available Vehicles */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Vehículos Libres ({vehiculosLibres.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {vehiculosLibres.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    Todos los vehículos están asignados
                  </p>
                ) : (
                  vehiculosLibres.map(v => (
                    <div key={v.id} className="flex items-center gap-2 py-1.5 px-2 rounded bg-muted">
                      <Truck className="h-3 w-3" />
                      <span className="text-sm">{v.nombre}</span>
                      <Badge variant="outline" className="text-xs ml-auto">{v.tipo}</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Notification hint */}
            <Card className="border-dashed">
              <CardContent className="py-4 text-center">
                <Bell className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Los choferes recibirán una notificación cuando se les asigne una ruta
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <ReasignarPersonalDialog
        ruta={selectedRuta}
        open={reasignarDialogOpen}
        onOpenChange={setReasignarDialogOpen}
        onSuccess={loadData}
      />

      <PosponerRutaDialog
        ruta={selectedRuta}
        open={posponerDialogOpen}
        onOpenChange={setPosponerDialogOpen}
        onSuccess={loadData}
      />
    </div>
  );
};

export default AsignacionesDelDiaTab;
