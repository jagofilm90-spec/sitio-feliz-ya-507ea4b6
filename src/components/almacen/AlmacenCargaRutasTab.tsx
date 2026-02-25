import { useState, useEffect, useCallback } from "react";
import { format, differenceInMinutes, parseISO, set } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Package, Truck, User, ChevronRight, CheckCircle2, Clock, AlertCircle,
  Timer, QrCode, ArrowRight, Trash2, Loader2,
} from "lucide-react";
import { RutaCargaSheet } from "@/components/almacen/RutaCargaSheet";
import { CargaRutaInlineFlow } from "@/components/almacen/CargaRutaInlineFlow";

interface Ruta {
  id: string;
  folio: string;
  fecha_ruta: string;
  status: string;
  peso_total_kg: number | null;
  carga_completada: boolean | null;
  carga_completada_en: string | null;
  hora_salida_sugerida: string | null;
  carga_iniciada_en: string | null;
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
  empleadoId?: string | null;
}

export const AlmacenCargaRutasTab = ({ onStatsUpdate, empleadoId }: AlmacenCargaRutasTabProps) => {
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRuta, setSelectedRuta] = useState<Ruta | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [modoVisualizacion, setModoVisualizacion] = useState<"asignadas" | "todas">("asignadas");
  const { toast } = useToast();
  const [deletingRutaId, setDeletingRutaId] = useState<string | null>(null);
  const [showInlineFlow, setShowInlineFlow] = useState(false);

  const fechaHoy = format(new Date(), "yyyy-MM-dd");

  const handleEliminarRuta = async (rutaId: string, vehiculoId?: string) => {
    setDeletingRutaId(rutaId);
    try {
      // 1. Get entregas for this route
      const { data: entregas } = await supabase
        .from("entregas")
        .select("id")
        .eq("ruta_id", rutaId);

      if (entregas && entregas.length > 0) {
        const entregaIds = entregas.map(e => e.id);
        
        // Revert inventory for loaded products
        const { data: cargaProds } = await supabase
          .from("carga_productos")
          .select("id, cargado, lote_id, cantidad_cargada")
          .in("entrega_id", entregaIds);
        
        for (const cp of cargaProds || []) {
          if (cp.cargado && cp.lote_id && cp.cantidad_cargada) {
            await supabase.rpc("incrementar_lote", {
              p_lote_id: cp.lote_id,
              p_cantidad: cp.cantidad_cargada,
            });
          }
        }

        // Delete carga_productos
        await supabase.from("carga_productos").delete().in("entrega_id", entregaIds);
      }

      // 2. Delete entregas
      await supabase.from("entregas").delete().eq("ruta_id", rutaId);

      // 3. Reset vehicle
      if (vehiculoId) {
        await supabase.from("vehiculos").update({ status: "disponible" }).eq("id", vehiculoId);
      }

      // 4. Delete route
      await supabase.from("rutas").delete().eq("id", rutaId);

      toast({ title: "Ruta eliminada", description: "La ruta fue eliminada correctamente." });
      loadRutas();
    } catch (err: any) {
      console.error("Error eliminando ruta:", err);
      toast({ title: "Error", description: err?.message || "No se pudo eliminar la ruta", variant: "destructive" });
    } finally {
      setDeletingRutaId(null);
    }
  };

  const loadRutas = useCallback(async () => {
    console.log("🔄 loadRutas iniciando, empleadoId:", empleadoId, "fechaHoy:", fechaHoy);
    setLoading(true);
    try {
      // Sistema híbrido: primero buscar rutas asignadas al almacenista
      // Si no hay ninguna, mostrar todas las rutas del día
      
      // Cargar TODAS las rutas del día primero
      const { data: todasLasRutas, error } = await supabase
        .from("rutas")
        .select(`
          id,
          folio,
          fecha_ruta,
          status,
          peso_total_kg,
          carga_completada,
          carga_completada_en,
          hora_salida_sugerida,
          carga_iniciada_en,
          almacenista_id,
          vehiculo:vehiculos(id, nombre, placa),
          chofer:empleados!rutas_chofer_id_fkey(id, nombre_completo),
          entregas(id, pedido_id)
        `)
        .eq("fecha_ruta", fechaHoy)
        .order("hora_salida_sugerida", { ascending: true, nullsFirst: false });

      if (error) {
        console.error("❌ Error en query de rutas:", {
          message: error.message,
          code: error.code,
          hint: error.hint,
          details: error.details
        });
        throw error;
      }

      console.log("✅ Rutas cargadas:", todasLasRutas?.length || 0, "rutas encontradas");

      const rutasData = (todasLasRutas as any[]) || [];
      
      // Si el almacenista tiene empleadoId, verificar si hay rutas asignadas
      let rutasFiltradas = rutasData;
      let modo: "asignadas" | "todas" = "todas";
      
      if (empleadoId) {
        const rutasAsignadas = rutasData.filter(r => r.almacenista_id === empleadoId);
        console.log("🔍 Filtrando por empleadoId:", empleadoId, "- Rutas asignadas encontradas:", rutasAsignadas.length);
        if (rutasAsignadas.length > 0) {
          // Tiene rutas asignadas, mostrar solo esas
          rutasFiltradas = rutasAsignadas;
          modo = "asignadas";
        }
        // Si no tiene rutas asignadas, mostrar todas (modo fallback)
      }
      
      // Show all routes including empty ones so they can be deleted
      // rutasFiltradas = rutasFiltradas.filter(r => r.entregas && r.entregas.length > 0);
      
      setModoVisualizacion(modo);
      console.log("📋 Modo visualización:", modo, "- Rutas a mostrar:", rutasFiltradas.length);

      // Ordenar: completadas al final, luego por hora de salida
      const sortedRutas = rutasFiltradas.sort((a, b) => {
        // Completadas van al final
        if (a.carga_completada && !b.carga_completada) return 1;
        if (!a.carga_completada && b.carga_completada) return -1;
        
        // Luego ordenar por hora de salida
        if (a.hora_salida_sugerida && b.hora_salida_sugerida) {
          return a.hora_salida_sugerida.localeCompare(b.hora_salida_sugerida);
        }
        if (a.hora_salida_sugerida && !b.hora_salida_sugerida) return -1;
        if (!a.hora_salida_sugerida && b.hora_salida_sugerida) return 1;
        return 0;
      });

      setRutas(sortedRutas);
      
      const pendientes = sortedRutas.filter(r => !r.carga_completada);
      const completadas = sortedRutas.filter(r => r.carga_completada);
      onStatsUpdate({
        total: sortedRutas.length,
        pendientes: pendientes.length,
        completadas: completadas.length,
        entregas: sortedRutas.reduce((acc, r) => acc + r.entregas.length, 0)
      });
    } catch (error: any) {
      console.error("❌ Error cargando rutas:", error);
      console.error("Error details:", {
        message: error?.message,
        code: error?.code,
        hint: error?.hint,
        details: error?.details,
        empleadoId: empleadoId
      });
      toast({
        title: "Error",
        description: `No se pudieron cargar las rutas: ${error?.message || 'Error desconocido'}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [empleadoId, fechaHoy, onStatsUpdate, toast]);

  useEffect(() => {
    loadRutas();
  }, [loadRutas]);

  // Suscripción a Realtime para actualizaciones instantáneas de rutas
  useEffect(() => {
    const channel = supabase
      .channel('rutas-carga-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'rutas'
        },
        async (payload) => {
          console.log('Nueva ruta detectada via Realtime:', payload);
          const newRuta = payload.new as any;
          
          // Verificar si la ruta es para hoy
          if (newRuta.fecha_ruta === fechaHoy) {
            await loadRutas();
            toast({
              title: "🚛 Nueva ruta asignada",
              description: `Ruta ${newRuta.folio} agregada a tu lista`,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rutas'
        },
        async (payload) => {
          const updatedRuta = payload.new as any;
          // Solo recargar si es una ruta de hoy
          if (updatedRuta.fecha_ruta === fechaHoy) {
            await loadRutas();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fechaHoy, loadRutas, toast]);

  // Calcular urgencia basada en hora de salida
  const getUrgencia = (horaSalida: string | null) => {
    if (!horaSalida) return null;
    
    const now = new Date();
    const [hours, minutes] = horaSalida.split(':').map(Number);
    const horaSalidaDate = set(now, { hours, minutes, seconds: 0 });
    const minutosFaltantes = differenceInMinutes(horaSalidaDate, now);
    
    if (minutosFaltantes < 0) {
      return { nivel: 'atrasada', color: 'bg-red-500', texto: 'ATRASADA' };
    }
    if (minutosFaltantes <= 60) {
      return { nivel: 'urgente', color: 'bg-red-500', texto: `${minutosFaltantes} min` };
    }
    if (minutosFaltantes <= 120) {
      return { nivel: 'proximo', color: 'bg-amber-500', texto: `${Math.floor(minutosFaltantes / 60)}h ${minutosFaltantes % 60}m` };
    }
    return { nivel: 'normal', color: 'bg-green-500', texto: `${Math.floor(minutosFaltantes / 60)}h` };
  };

  const getEstadoCarga = (ruta: Ruta) => {
    if (ruta.carga_completada) {
      return { label: "Completada", color: "bg-green-500", icon: CheckCircle2 };
    }
    if (ruta.status === "cargando" || ruta.carga_iniciada_en) {
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
        <p className="text-xs mt-1">Las rutas se crean desde el módulo de planificación</p>
      </div>
    );
  }

  if (showInlineFlow) {
    return (
      <CargaRutaInlineFlow
        onClose={() => setShowInlineFlow(false)}
        onRutaCreada={() => { loadRutas(); setShowInlineFlow(false); }}
      />
    );
  }

  return (
    <>
      {/* Banner Empezar a Cargar */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 rounded-xl p-3 shrink-0">
              <QrCode className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg text-foreground">Empezar a cargar</h3>
              <p className="text-sm text-muted-foreground">
                Selecciona personal, escanea pedidos y confirma la carga
              </p>
            </div>
            <Button 
              onClick={() => setShowInlineFlow(true)}
              size="lg"
              className="h-14 px-6 text-base font-bold gap-2 shrink-0"
            >
              <QrCode className="h-5 w-5" />
              Nueva Carga
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Rutas para cargar</CardTitle>
            {modoVisualizacion === "todas" && empleadoId && (
              <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                Viendo todas las rutas del día
              </Badge>
            )}
            {modoVisualizacion === "asignadas" && (
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                Mis rutas asignadas
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-320px)] min-h-[300px]">
            <div className="divide-y divide-border">
              {rutas.map((ruta) => {
                const estado = getEstadoCarga(ruta);
                const EstadoIcon = estado.icon;
                const urgencia = !ruta.carga_completada ? getUrgencia(ruta.hora_salida_sugerida) : null;
                
                return (
                  <div
                    key={ruta.id}
                    className={`w-full p-4 hover:bg-muted/50 transition-colors text-left flex items-center gap-4 ${
                      urgencia?.nivel === 'urgente' || urgencia?.nivel === 'atrasada' ? 'bg-destructive/5' : ''
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-full ${urgencia ? urgencia.color : estado.color}`} />
                    
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => ruta.entregas.length > 0 ? handleSelectRuta(ruta) : null}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-lg">{ruta.folio}</span>
                        <Badge variant="outline" className="text-xs">
                          {ruta.entregas.length} entregas
                        </Badge>
                        {ruta.entregas.length === 0 && (
                          <Badge variant="outline" className="text-xs border-destructive/30 text-destructive">
                            Vacía
                          </Badge>
                        )}
                        {urgencia && !ruta.carga_completada && (
                          <Badge className={`${urgencia.color} text-white text-xs`}>
                            <Timer className="w-3 h-3 mr-1" />
                            {urgencia.texto}
                          </Badge>
                        )}
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
                        {ruta.hora_salida_sugerida && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            Sale {ruta.hora_salida_sugerida.slice(0, 5)}
                          </span>
                        )}
                        {ruta.carga_iniciada_en && !ruta.carga_completada && (
                          <span className="text-blue-600 text-xs">
                            Iniciada {format(parseISO(ruta.carga_iniciada_en), 'HH:mm')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!ruta.carga_completada && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {deletingRutaId === ruta.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar ruta {ruta.folio}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Se eliminará la ruta, sus entregas y productos cargados. El inventario se revertirá automáticamente. Esta acción no se puede deshacer.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleEliminarRuta(ruta.id, ruta.vehiculo?.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Sí, eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      <Badge
                        variant={ruta.carga_completada ? "default" : "secondary"}
                        className="flex items-center gap-1"
                      >
                        <EstadoIcon className="w-3 h-3" />
                        {estado.label}
                      </Badge>
                      {ruta.entregas.length > 0 && (
                        <ChevronRight className="w-5 h-5 text-muted-foreground cursor-pointer" onClick={() => handleSelectRuta(ruta)} />
                      )}
                    </div>
                  </div>
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