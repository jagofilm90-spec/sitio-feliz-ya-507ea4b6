import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Sparkles, 
  Truck, 
  Package, 
  AlertTriangle, 
  Check, 
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronUp,
  Map,
  Calendar,
  Clock,
  Info,
  Navigation,
  ExternalLink
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { RouteMapVisualization } from "./RouteMapVisualization";

interface RutaSugerida {
  vehiculo: {
    id: string;
    nombre: string;
    tipo: string;
    peso_maximo_local_kg: number;
    peso_maximo_foraneo_kg: number;
  };
  tipo_ruta: "local" | "foranea";
  pedidos: any[];
  peso_total: number;
  capacidad_maxima: number;
  porcentaje_carga: number;
  regiones: string[];
  zonas: string[];
  hora_salida_sugerida?: string;
  tiempo_estimado_minutos?: number;
  chofer_sugerido?: { id: string; nombre: string };
  ayudante_sugerido?: { id: string; nombre: string };
}

interface VehiculoDisponible {
  id: string;
  nombre: string;
  tipo: string;
  peso_maximo_local_kg: number;
  peso_maximo_foraneo_kg: number;
  status: string;
}

interface SugerirRutasAIDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRutaCreada: () => void;
  choferes: { id: string; full_name: string }[];
}

const PRIORIDAD_LABELS: Record<string, { label: string; color: string }> = {
  vip_mismo_dia: { label: "VIP", color: "bg-red-500" },
  deadline: { label: "Deadline", color: "bg-orange-500" },
  dia_fijo_recurrente: { label: "Día Fijo", color: "bg-blue-500" },
  fecha_sugerida: { label: "Sugerida", color: "bg-green-500" },
  flexible: { label: "Flexible", color: "bg-gray-500" },
};

export const SugerirRutasAIDialog = ({
  open,
  onOpenChange,
  onRutaCreada,
  choferes,
}: SugerirRutasAIDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [loadingVehiculos, setLoadingVehiculos] = useState(false);
  const [rutasSugeridas, setRutasSugeridas] = useState<RutaSugerida[]>([]);
  const [pedidosParaDespues, setPedidosParaDespues] = useState<any[]>([]);
  const [pedidosOversized, setPedidosOversized] = useState<any[]>([]);
  const [notasAI, setNotasAI] = useState<string | null>(null);
  const [capacidadHoy, setCapacidadHoy] = useState(0);
  const [pesoTotalPendiente, setPesoTotalPendiente] = useState(0);
  const [expandedRutas, setExpandedRutas] = useState<Set<number>>(new Set([0]));
  const [creandoRutas, setCreandoRutas] = useState<Set<number>>(new Set());
  const [showMaps, setShowMaps] = useState<Set<number>>(new Set());
  const [personalDisponible, setPersonalDisponible] = useState<{ choferes: number; ayudantes: number } | null>(null);
  
  // Vehicle selection state
  const [vehiculosDisponibles, setVehiculosDisponibles] = useState<VehiculoDisponible[]>([]);
  const [vehiculosSeleccionados, setVehiculosSeleccionados] = useState<Set<string>>(new Set());
  
  const { toast } = useToast();

  // Load available vehicles when dialog opens
  useEffect(() => {
    if (open) {
      loadVehiculos();
    }
  }, [open]);

  const loadVehiculos = async () => {
    setLoadingVehiculos(true);
    try {
      const { data, error } = await supabase
        .from("vehiculos")
        .select("id, nombre, tipo, peso_maximo_local_kg, peso_maximo_foraneo_kg, status")
        .eq("activo", true)
        .order("peso_maximo_local_kg", { ascending: false });

      if (error) throw error;

      const disponibles = data?.filter(v => v.status === "disponible") || [];
      setVehiculosDisponibles(data || []);
      // Select all available by default
      setVehiculosSeleccionados(new Set(disponibles.map(v => v.id)));
    } catch (error) {
      console.error("Error loading vehicles:", error);
    } finally {
      setLoadingVehiculos(false);
    }
  };

  const toggleVehiculo = (vehiculoId: string) => {
    setVehiculosSeleccionados(prev => {
      const newSet = new Set(prev);
      if (newSet.has(vehiculoId)) {
        newSet.delete(vehiculoId);
      } else {
        newSet.add(vehiculoId);
      }
      return newSet;
    });
  };

  const capacidadSeleccionada = vehiculosDisponibles
    .filter(v => vehiculosSeleccionados.has(v.id))
    .reduce((sum, v) => sum + v.peso_maximo_local_kg, 0);

  const toggleMap = (index: number) => {
    const newShowMaps = new Set(showMaps);
    if (newShowMaps.has(index)) {
      newShowMaps.delete(index);
    } else {
      newShowMaps.add(index);
    }
    setShowMaps(newShowMaps);
  };

  const generarSugerencias = async () => {
    if (vehiculosSeleccionados.size === 0) {
      toast({
        title: "Sin vehículos",
        description: "Selecciona al menos un vehículo para generar rutas",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-routes", {
        body: { 
          fecha: format(new Date(), "yyyy-MM-dd"),
          vehiculos_seleccionados: Array.from(vehiculosSeleccionados),
        },
      });

      if (error) throw error;

      setRutasSugeridas(data.rutas_sugeridas || []);
      setPedidosParaDespues(data.pedidos_para_despues || []);
      setPedidosOversized(data.pedidos_oversized || []);
      setCapacidadHoy(data.capacidad_hoy || 0);
      setPesoTotalPendiente(data.peso_total_pendiente || 0);
      setNotasAI(data.notas_ai);
      setPersonalDisponible(data.personal_disponible || null);

      const pedidosHoy = data.rutas_sugeridas?.reduce((sum: number, r: any) => sum + r.pedidos.length, 0) || 0;

      toast({
        title: `Plan del día generado`,
        description: `${data.rutas_sugeridas?.length || 0} rutas con ${pedidosHoy} pedidos para hoy`,
      });
    } catch (error: any) {
      console.error("Error generating routes:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudieron generar las sugerencias",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedRutas);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRutas(newExpanded);
  };

  const crearRuta = async (ruta: RutaSugerida, index: number) => {
    if (choferes.length === 0) {
      toast({
        title: "Sin choferes",
        description: "No hay choferes disponibles para asignar",
        variant: "destructive",
      });
      return;
    }

    setCreandoRutas(prev => new Set(prev).add(index));

    try {
      const { data: lastRuta } = await supabase
        .from("rutas")
        .select("folio")
        .order("created_at", { ascending: false })
        .limit(1);

      const lastNumber = lastRuta?.[0]?.folio 
        ? parseInt(lastRuta[0].folio.replace("RUT-", "")) 
        : 0;
      const newFolio = `RUT-${String(lastNumber + 1).padStart(4, "0")}`;

      const { data: rutaData, error: rutaError } = await supabase
        .from("rutas")
        .insert([{
          folio: newFolio,
          fecha_ruta: format(new Date(), "yyyy-MM-dd"),
          chofer_id: choferes[0].id,
          vehiculo_id: ruta.vehiculo.id,
          peso_total_kg: ruta.peso_total,
          tipo_ruta: ruta.tipo_ruta,
          status: "programada",
          hora_salida_sugerida: ruta.hora_salida_sugerida || null,
          tiempo_estimado_minutos: ruta.tiempo_estimado_minutos || null,
          notas: `Ruta generada por AI. Regiones: ${ruta.regiones.join(", ") || "N/A"}`,
        }])
        .select()
        .single();

      if (rutaError) throw rutaError;

      const entregasData = ruta.pedidos.map((pedido, idx) => ({
        ruta_id: rutaData.id,
        pedido_id: pedido.id,
        orden_entrega: idx + 1,
        entregado: false,
      }));

      const { error: entregasError } = await supabase
        .from("entregas")
        .insert(entregasData);

      if (entregasError) throw entregasError;

      const pedidoIds = ruta.pedidos.map(p => p.id);
      await supabase
        .from("pedidos")
        .update({ status: "en_ruta" })
        .in("id", pedidoIds);

      await supabase
        .from("vehiculos")
        .update({ status: "en_ruta" })
        .eq("id", ruta.vehiculo.id);

      toast({ title: `Ruta ${newFolio} creada` });

      setRutasSugeridas(prev => prev.filter((_, i) => i !== index));
      onRutaCreada();

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCreandoRutas(prev => {
        const newSet = new Set(prev);
        newSet.delete(index);
        return newSet;
      });
    }
  };

  const crearTodasLasRutas = async () => {
    for (let i = 0; i < rutasSugeridas.length; i++) {
      await crearRuta(rutasSugeridas[i], i);
    }
  };

  const pedidosHoyTotal = rutasSugeridas.reduce((sum, r) => sum + r.pedidos.length, 0);
  const pesoHoyTotal = rutasSugeridas.reduce((sum, r) => sum + r.peso_total, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Planificación Diaria con AI
          </DialogTitle>
          <DialogDescription>
            Genera rutas óptimas para HOY con los vehículos disponibles
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col gap-4">
          {/* Vehicle Selection */}
          {rutasSugeridas.length === 0 && !loading && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Vehículos para hoy
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingVehiculos ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando vehículos...
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                      {vehiculosDisponibles.map(v => (
                        <label
                          key={v.id}
                          className={`flex items-center gap-2 p-2 border rounded-lg cursor-pointer transition-colors ${
                            vehiculosSeleccionados.has(v.id) 
                              ? "bg-primary/10 border-primary" 
                              : "hover:bg-muted"
                          } ${v.status !== "disponible" ? "opacity-50" : ""}`}
                        >
                          <Checkbox
                            checked={vehiculosSeleccionados.has(v.id)}
                            onCheckedChange={() => toggleVehiculo(v.id)}
                            disabled={v.status !== "disponible"}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{v.nombre}</p>
                            <p className="text-xs text-muted-foreground">
                              {v.peso_maximo_local_kg.toLocaleString()} kg
                              {v.status !== "disponible" && (
                                <Badge variant="secondary" className="ml-1 text-xs">
                                  {v.status === "en_ruta" ? "En ruta" : v.status}
                                </Badge>
                              )}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-sm border-t pt-3">
                      <span className="text-muted-foreground">
                        {vehiculosSeleccionados.size} vehículos seleccionados
                      </span>
                      <span className="font-medium">
                        Capacidad: {capacidadSeleccionada.toLocaleString()} kg
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Generate button */}
          {rutasSugeridas.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-6 gap-4">
              <Button 
                onClick={generarSugerencias} 
                size="lg"
                disabled={vehiculosSeleccionados.size === 0}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Generar Rutas para Hoy
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                El sistema asignará pedidos pendientes a los vehículos seleccionados,<br />
                priorizando VIP y deadlines. Los pedidos que no quepan quedan para mañana.
              </p>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground">Optimizando rutas del día...</p>
            </div>
          )}

          {/* Results */}
          {rutasSugeridas.length > 0 && (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-4 gap-3">
                <Card className="bg-green-500/10 border-green-500/20">
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-green-600">{pedidosHoyTotal}</p>
                    <p className="text-xs text-muted-foreground">Pedidos HOY</p>
                    <p className="text-xs font-medium">{pesoHoyTotal.toLocaleString()} kg</p>
                  </CardContent>
                </Card>
                <Card className="bg-blue-500/10 border-blue-500/20">
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-blue-600">{pedidosParaDespues.length}</p>
                    <p className="text-xs text-muted-foreground">Para después</p>
                    <p className="text-xs font-medium">
                      {pedidosParaDespues.reduce((s, p) => s + (p.peso_total_kg || 0), 0).toLocaleString()} kg
                    </p>
                  </CardContent>
                </Card>
                <Card className={`${pedidosOversized.length > 0 ? "bg-red-500/10 border-red-500/20" : "bg-muted"}`}>
                  <CardContent className="p-3 text-center">
                    <p className={`text-2xl font-bold ${pedidosOversized.length > 0 ? "text-red-600" : "text-muted-foreground"}`}>
                      {pedidosOversized.length}
                    </p>
                    <p className="text-xs text-muted-foreground">Oversized</p>
                    <p className="text-xs font-medium">
                      {pedidosOversized.length > 0 ? "Requieren múltiples viajes" : "Todo OK"}
                    </p>
                  </CardContent>
                </Card>
                {personalDisponible && (
                  <Card className="bg-purple-500/10 border-purple-500/20">
                    <CardContent className="p-3 text-center">
                      <p className="text-2xl font-bold text-purple-600">
                        {personalDisponible.choferes}/{personalDisponible.ayudantes}
                      </p>
                      <p className="text-xs text-muted-foreground">Choferes / Ayudantes</p>
                      <p className="text-xs font-medium">Disponibles hoy</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="flex items-center justify-between flex-shrink-0">
                <div className="text-sm text-muted-foreground">
                  {rutasSugeridas.length} rutas para hoy
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={generarSugerencias}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Regenerar
                  </Button>
                  {rutasSugeridas.length > 1 && (
                    <Button size="sm" onClick={crearTodasLasRutas}>
                      <Check className="h-4 w-4 mr-2" />
                      Crear Todas ({rutasSugeridas.length})
                    </Button>
                  )}
                </div>
              </div>

              {notasAI && (
                <Alert className="flex-shrink-0">
                  <Sparkles className="h-4 w-4" />
                  <AlertDescription>{notasAI}</AlertDescription>
                </Alert>
              )}

              <ScrollArea className="flex-1 min-h-0" style={{ maxHeight: 'calc(90vh - 320px)' }}>
                <div className="space-y-4 pr-4">
                  {/* Today's Routes */}
                  {rutasSugeridas.map((ruta, index) => (
                    <Card key={index} className="overflow-hidden border-green-500/30">
                      <CardHeader 
                        className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => toggleExpanded(index)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Truck className="h-5 w-5 text-green-600" />
                            <div>
                              <CardTitle className="text-base flex items-center gap-2">
                                {ruta.vehiculo.nombre}
                                <Badge variant="outline">
                                  {ruta.tipo_ruta === "foranea" ? "Foránea" : "Local"}
                                </Badge>
                                {ruta.hora_salida_sugerida && (
                                  <Badge variant="secondary" className="gap-1">
                                    <Clock className="h-3 w-3" />
                                    {ruta.hora_salida_sugerida}
                                  </Badge>
                                )}
                              </CardTitle>
                              <p className="text-xs text-muted-foreground">
                                {ruta.zonas.slice(0, 3).join(", ")}
                                {ruta.zonas.length > 3 && ` +${ruta.zonas.length - 3}`}
                                {ruta.tiempo_estimado_minutos && (
                                  <span className="ml-2">
                                    • ~{Math.round(ruta.tiempo_estimado_minutos / 60)}h {ruta.tiempo_estimado_minutos % 60}min
                                  </span>
                                )}
                              </p>
                              {(ruta.chofer_sugerido || ruta.ayudante_sugerido) && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  👷 {ruta.chofer_sugerido?.nombre || "Sin asignar"}
                                  {ruta.ayudante_sugerido && ` + ${ruta.ayudante_sugerido.nombre}`}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                const warehouseLat = 19.408680132961802;
                                const warehouseLng = -99.12108443546356;
                                const waypoints = ruta.pedidos
                                  .filter((p: any) => p.sucursal?.latitud && p.sucursal?.longitud)
                                  .map((p: any) => `${p.sucursal.latitud},${p.sucursal.longitud}`)
                                  .join('|');
                                const url = waypoints 
                                  ? `https://www.google.com/maps/dir/?api=1&origin=${warehouseLat},${warehouseLng}&destination=${warehouseLat},${warehouseLng}&waypoints=${waypoints}&travelmode=driving`
                                  : `https://www.google.com/maps/dir/?api=1&origin=${warehouseLat},${warehouseLng}&destination=${warehouseLat},${warehouseLng}&travelmode=driving`;
                                window.open(url, '_blank');
                              }}
                              title="Abrir ruta en Google Maps"
                            >
                              <Navigation className="h-4 w-4" />
                            </Button>
                            <div className="text-right">
                              <p className="text-sm font-medium">
                                {ruta.pedidos.length} pedidos
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {ruta.peso_total.toLocaleString()} / {ruta.capacidad_maxima.toLocaleString()} kg
                              </p>
                            </div>
                            <div className="w-20">
                              <Progress 
                                value={Math.min(ruta.porcentaje_carga, 100)} 
                                className="h-2"
                              />
                              <p className="text-xs text-center mt-1">
                                {ruta.porcentaje_carga.toFixed(0)}%
                              </p>
                            </div>
                            {expandedRutas.has(index) ? (
                              <ChevronUp className="h-4 w-4 shrink-0" />
                            ) : (
                              <ChevronDown className="h-4 w-4 shrink-0" />
                            )}
                          </div>
                        </div>
                      </CardHeader>

                      {expandedRutas.has(index) && (
                        <CardContent className="pt-0 space-y-3">
                          <div className="flex items-center gap-2">
                            <Button 
                              variant={showMaps.has(index) ? "secondary" : "outline"} 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleMap(index);
                              }}
                            >
                              <Map className="h-4 w-4 mr-2" />
                              {showMaps.has(index) ? "Ocultar Mapa" : "Ver en Mapa"}
                            </Button>
                          </div>

                          {showMaps.has(index) && (
                            <RouteMapVisualization
                              puntos={ruta.pedidos.map((pedido: any, pIdx: number) => ({
                                id: pedido.id,
                                folio: pedido.folio,
                                cliente: pedido.cliente?.nombre || "Sin cliente",
                                sucursal: pedido.sucursal?.nombre,
                                direccion: pedido.sucursal?.direccion || pedido.cliente?.direccion || "",
                                peso_kg: pedido.peso_total_kg || 0,
                                orden: pIdx + 1,
                                // Pass GPS coordinates from sucursal if available
                                lat: pedido.sucursal?.latitud || undefined,
                                lng: pedido.sucursal?.longitud || undefined,
                              }))}
                              vehiculoNombre={ruta.vehiculo.nombre}
                              optimizarOrden={true}
                            />
                          )}

                          <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                            {ruta.pedidos.map((pedido, pIdx) => (
                              <div key={pedido.id} className="p-2 flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="w-6 h-6 flex items-center justify-center p-0">
                                    {pIdx + 1}
                                  </Badge>
                                  <div>
                                    <p className="font-medium">{pedido.folio}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {pedido.cliente?.nombre || "Sin cliente"}
                                      {pedido.sucursal?.nombre && ` - ${pedido.sucursal.nombre}`}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {pedido.sucursal?.latitud && pedido.sucursal?.longitud && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(
                                          `https://www.google.com/maps/dir/?api=1&destination=${pedido.sucursal.latitud},${pedido.sucursal.longitud}&travelmode=driving`,
                                          '_blank'
                                        );
                                      }}
                                      title="Navegar a esta entrega"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                    </Button>
                                  )}
                                  {pedido.prioridad_entrega && PRIORIDAD_LABELS[pedido.prioridad_entrega] && (
                                    <Badge className={`${PRIORIDAD_LABELS[pedido.prioridad_entrega].color} text-white text-xs`}>
                                      {PRIORIDAD_LABELS[pedido.prioridad_entrega].label}
                                    </Badge>
                                  )}
                                  <span className="text-xs text-muted-foreground">
                                    {(pedido.peso_total_kg || 0).toLocaleString()} kg
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 flex justify-end">
                            <Button 
                              size="sm" 
                              onClick={() => crearRuta(ruta, index)}
                              disabled={creandoRutas.has(index)}
                            >
                              {creandoRutas.has(index) ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4 mr-2" />
                              )}
                              Crear Ruta
                            </Button>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  ))}

                  {/* Orders for Later */}
                  {pedidosParaDespues.length > 0 && (
                    <Card className="border-blue-500/30">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-blue-600" />
                          Para días siguientes ({pedidosParaDespues.length} pedidos)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Alert className="mb-3">
                          <Info className="h-4 w-4" />
                          <AlertDescription>
                            Estos pedidos no caben hoy pero se entregarán en los próximos días.
                            Clientes con deadline tienen tiempo suficiente.
                          </AlertDescription>
                        </Alert>
                        <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
                          {pedidosParaDespues.slice(0, 10).map((pedido) => (
                            <div key={pedido.id} className="p-2 flex items-center justify-between text-sm">
                              <div>
                                <p className="font-medium">{pedido.folio}</p>
                                <p className="text-xs text-muted-foreground">
                                  {pedido.cliente?.nombre}
                                  {pedido.sucursal?.nombre && ` - ${pedido.sucursal.nombre}`}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {pedido.prioridad_entrega && PRIORIDAD_LABELS[pedido.prioridad_entrega] && (
                                  <Badge variant="outline" className="text-xs">
                                    {PRIORIDAD_LABELS[pedido.prioridad_entrega].label}
                                    {pedido.deadline_dias_habiles && ` (${pedido.deadline_dias_habiles}d)`}
                                  </Badge>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  {(pedido.peso_total_kg || 0).toLocaleString()} kg
                                </span>
                              </div>
                            </div>
                          ))}
                          {pedidosParaDespues.length > 10 && (
                            <div className="p-2 text-center text-xs text-muted-foreground">
                              +{pedidosParaDespues.length - 10} más...
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Oversized Orders */}
                  {pedidosOversized.length > 0 && (
                    <Card className="border-red-500/30">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          Pedidos oversized ({pedidosOversized.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Alert variant="destructive" className="mb-3">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>Requieren múltiples viajes</AlertTitle>
                          <AlertDescription>
                            Estos pedidos exceden la capacidad máxima de cualquier vehículo.
                            Necesitan dividirse o programar varios viajes.
                          </AlertDescription>
                        </Alert>
                        <div className="border rounded-lg divide-y">
                          {pedidosOversized.map((pedido) => (
                            <div key={pedido.id} className="p-2 flex items-center justify-between text-sm">
                              <div>
                                <p className="font-medium">{pedido.folio}</p>
                                <p className="text-xs text-muted-foreground">
                                  {pedido.cliente?.nombre}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium text-red-600">
                                  {(pedido.peso_total_kg || 0).toLocaleString()} kg
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  ~{Math.ceil((pedido.peso_total_kg || 0) / 18000)} viajes
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
