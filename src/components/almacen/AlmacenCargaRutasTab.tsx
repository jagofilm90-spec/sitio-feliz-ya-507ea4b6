import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format, differenceInMinutes, differenceInSeconds, parseISO, set } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { recalcularTotalesPedido } from "@/lib/recalcularTotalesPedido";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Package, Truck, User, ChevronRight, CheckCircle2, Clock, AlertCircle,
  Timer, QrCode, ArrowRight, Trash2, Loader2, Users, MapPin, Send,
} from "lucide-react";
import { RutaCargaInlineView } from "@/components/almacen/RutaCargaInlineView";
import { CargaRutaInlineFlow } from "@/components/almacen/CargaRutaInlineFlow";
import { RutasEnRutaTab } from "@/components/almacen/RutasEnRutaTab";
import { RutasEntregadasTab } from "@/components/almacen/RutasEntregadasTab";

interface Ruta {
  id: string;
  folio: string;
  fecha_ruta: string;
  status: string;
  peso_total_kg: number | null;
  porcentaje_carga: number;
  carga_completada: boolean | null;
  carga_completada_en: string | null;
  hora_salida_sugerida: string | null;
  carga_iniciada_en: string | null;
  almacenista_id: string | null;
  ayudantes_ids: string[] | null;
  lleva_sellos: boolean | null;
  numero_sello_salida: string | null;
  firma_chofer_carga: string | null;
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
    pedido?: {
      folio: string;
      cliente?: { nombre: string } | null;
    } | null;
  }[];
  ayudantes_nombres?: string[];
}

interface AlmacenCargaRutasTabProps {
  onStatsUpdate: (stats: { total: number; pendientes: number; completadas: number; entregas: number }) => void;
  empleadoId?: string | null;
}

export const AlmacenCargaRutasTab = ({ onStatsUpdate, empleadoId }: AlmacenCargaRutasTabProps) => {
  const navigate = useNavigate();
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRuta, setSelectedRuta] = useState<Ruta | null>(null);
  const sheetOpenRef = useRef(false);
  const [modoVisualizacion, setModoVisualizacion] = useState<"asignadas" | "todas">("asignadas");
  const { toast } = useToast();
  const [deletingRutaId, setDeletingRutaId] = useState<string | null>(null);
  const [showInlineFlow, setShowInlineFlow] = useState(false);
  const [now, setNow] = useState(new Date());
  const [sendingRutaId, setSendingRutaId] = useState<string | null>(null);

  // Live timer for in-progress routes
  useEffect(() => {
    const hasInProgress = rutas.some(r => r.carga_iniciada_en && !r.carga_completada);
    if (!hasInProgress) return;
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [rutas]);

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

      // 2. Get pedido IDs to reset before deleting entregas
      const { data: entregasPedidos } = await supabase
        .from("entregas")
        .select("pedido_id")
        .eq("ruta_id", rutaId);

      // 3. Delete entregas
      await supabase.from("entregas").delete().eq("ruta_id", rutaId);

      // 4. Reset pedidos to pendiente
      if (entregasPedidos && entregasPedidos.length > 0) {
        const pedidoIds = entregasPedidos.map(e => e.pedido_id);
        await supabase.from("pedidos").update({ 
          status: "pendiente" as any, 
          updated_at: new Date().toISOString() 
        }).in("id", pedidoIds);
      }

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
      // Mostrar rutas de hoy + rutas incompletas de cualquier fecha
      const { data: todasLasRutas, error } = await supabase
        .from("rutas")
        .select(`
          id,
          folio,
          fecha_ruta,
          status,
          peso_total_kg,
          porcentaje_carga,
          carga_completada,
          carga_completada_en,
          hora_salida_sugerida,
          carga_iniciada_en,
          almacenista_id,
          ayudantes_ids,
          lleva_sellos,
          numero_sello_salida,
          firma_chofer_carga,
          vehiculo:vehiculos(id, nombre, placa),
          chofer:empleados!rutas_chofer_id_fkey(id, nombre_completo),
          entregas(id, pedido_id, orden_entrega, pedido:pedidos(folio, cliente:clientes(nombre)))
        `)
        .or(`fecha_ruta.eq.${fechaHoy},and(status.in.(programada,en_carga,cargada,en_curso),carga_completada.neq.true)`)
        .order("fecha_ruta", { ascending: false })
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

      // Resolve ayudantes names
      const allAyudanteIds = [...new Set(sortedRutas.flatMap(r => r.ayudantes_ids || []).filter(Boolean))];
      let ayudantesMap: Record<string, string> = {};
      if (allAyudanteIds.length > 0) {
        const { data: ayNames } = await supabase
          .from("empleados")
          .select("id, nombre_completo")
          .in("id", allAyudanteIds);
        ayudantesMap = Object.fromEntries((ayNames || []).map(a => [a.id, a.nombre_completo]));
      }

      const enrichedRutas = sortedRutas.map(r => ({
        ...r,
        ayudantes_nombres: (r.ayudantes_ids || []).map(id => ayudantesMap[id]).filter(Boolean),
      }));

      setRutas(enrichedRutas);
      
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
          await loadRutas();
          if (newRuta.fecha_ruta === fechaHoy) {
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
          // No recargar si el sheet de carga está abierto
          if (sheetOpenRef.current) return;
          await loadRutas();
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
    if (ruta.status === "cargada" && ruta.carga_completada) {
      return { label: "Lista para enviar", color: "bg-blue-500", icon: Send };
    }
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
    sheetOpenRef.current = true;
  };

  // Sync loaded quantities from carga_productos → pedidos_detalles and recalculate totals
  // Returns a map of pedidoId → { modificaciones, totalAnterior, totalNuevo }
  const syncCargaToPedidos = async (ruta: Ruta): Promise<Record<string, { modificaciones: { producto: string; cantidadOriginal: number; cantidadNueva: number }[]; totalAnterior: number; totalNuevo: number }>> => {
    const cambiosPorPedido: Record<string, { modificaciones: { producto: string; cantidadOriginal: number; cantidadNueva: number }[]; totalAnterior: number; totalNuevo: number }> = {};

    for (const entrega of ruta.entregas) {
      const pedidoId = entrega.pedido_id;
      const modificaciones: { producto: string; cantidadOriginal: number; cantidadNueva: number }[] = [];

      // Get current pedido total before sync
      const { data: pedidoAnterior } = await supabase
        .from("pedidos")
        .select("total")
        .eq("id", pedidoId)
        .single();
      const totalAnterior = pedidoAnterior?.total || 0;

      // Get all carga_productos for this entrega with their loaded quantities
      const { data: cargaItems } = await supabase
        .from("carga_productos")
        .select("pedido_detalle_id, cantidad_cargada, cargado")
        .eq("entrega_id", entrega.id);

      if (!cargaItems || cargaItems.length === 0) continue;

      // Update each pedido_detalle with the loaded quantity
      for (const cp of cargaItems) {
        if (!cp.cargado || !cp.cantidad_cargada) continue;

        // Get current precio_unitario to recalculate subtotal
        const { data: detalle } = await supabase
          .from("pedidos_detalles")
          .select("precio_unitario, cantidad, producto:productos(peso_kg, precio_por_kilo, nombre)")
          .eq("id", cp.pedido_detalle_id)
          .single();

        if (!detalle) continue;

        const prod = detalle.producto as any;

        // Track modification if quantity changed
        if (detalle.cantidad !== cp.cantidad_cargada) {
          modificaciones.push({
            producto: prod?.nombre || "Producto",
            cantidadOriginal: detalle.cantidad,
            cantidadNueva: cp.cantidad_cargada,
          });

          const newSubtotal = prod?.precio_por_kilo && prod?.peso_kg
            ? cp.cantidad_cargada * prod.peso_kg * detalle.precio_unitario
            : cp.cantidad_cargada * detalle.precio_unitario;

          await supabase.from("pedidos_detalles").update({
            cantidad: cp.cantidad_cargada,
            subtotal: newSubtotal,
          }).eq("id", cp.pedido_detalle_id);
        }
      }

      // Recalculate pedido totals with proper tax breakdown
      const { data: { user } } = await supabase.auth.getUser();
      const result = await recalcularTotalesPedido(pedidoId, modificaciones.length > 0 ? {
        tipoCambio: "almacen_carga",
        cambiosJson: { modificaciones },
        totalAnterior,
        usuarioId: user?.id,
      } : undefined);

      if (modificaciones.length > 0) {
        cambiosPorPedido[pedidoId] = {
          modificaciones,
          totalAnterior,
          totalNuevo: result.total,
        };
      }
    }

    return cambiosPorPedido;
  };

  const handleEnviarARuta = async (ruta: Ruta) => {
    setSendingRutaId(ruta.id);
    try {
      // Sync loaded quantities to pedidos_detalles before dispatching and detect changes
      const cambiosPorPedido = await syncCargaToPedidos(ruta);

      // Update route status to en_curso
      await supabase.from("rutas").update({
        status: "en_curso",
        fecha_hora_inicio: new Date().toISOString(),
      }).eq("id", ruta.id);

      // Update each pedido to en_ruta and notify clients
      for (const entrega of ruta.entregas) {
        const pedidoId = entrega.pedido_id;
        await supabase.from("pedidos").update({
          status: "en_ruta" as any,
          updated_at: new Date().toISOString(),
        }).eq("id", pedidoId);

        // Get client info for notification
        const { data: pedido } = await supabase
          .from("pedidos")
          .select("folio, cliente_id")
          .eq("id", pedidoId)
          .single();

        if (pedido) {
          try {
            const cambios = cambiosPorPedido[pedidoId];
            await supabase.functions.invoke("send-client-notification", {
              body: {
                clienteId: pedido.cliente_id,
                tipo: "en_ruta",
                data: {
                  pedidoFolio: pedido.folio,
                  choferNombre: ruta.chofer?.nombre_completo || "Chofer",
                  ...(cambios ? {
                    modificaciones: cambios.modificaciones,
                    totalAnterior: cambios.totalAnterior,
                    totalNuevo: cambios.totalNuevo,
                  } : {}),
                },
              },
            });
          } catch {}
        }
      }

      // Send route email to chofer
      try {
        await supabase.functions.invoke("send-chofer-route-email", {
          body: { rutaId: ruta.id },
        });
      } catch (emailErr) {
        console.error("Error sending chofer email:", emailErr);
        // Non-blocking
      }

      toast({ title: "🚛 Ruta enviada", description: `La ruta ${ruta.folio} está en camino. Se notificó a los clientes y al chofer.` });
      loadRutas();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "No se pudo enviar la ruta", variant: "destructive" });
    } finally {
      setSendingRutaId(null);
    }
  };

  // Show inline flow for new route (scan)
  if (showInlineFlow) {
    return (
      <CargaRutaInlineFlow
        onClose={() => setShowInlineFlow(false)}
        onRutaCreada={() => { loadRutas(); setShowInlineFlow(false); }}
      />
    );
  }

  // Show inline view for existing route
  if (selectedRuta) {
    return (
      <RutaCargaInlineView
        ruta={selectedRuta}
        onClose={() => { setSelectedRuta(null); sheetOpenRef.current = false; loadRutas(); }}
        onCargaCompletada={() => { setSelectedRuta(null); sheetOpenRef.current = false; loadRutas(); }}
      />
    );
  }

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
      <Tabs defaultValue="carga" className="w-full">
        <TabsList className="w-full grid grid-cols-3 mb-4">
          <TabsTrigger value="carga" className="gap-1.5">
            <Package className="w-4 h-4" />
            Carga de Rutas
          </TabsTrigger>
          <TabsTrigger value="enruta" className="gap-1.5">
            <Truck className="w-4 h-4" />
            En Ruta
          </TabsTrigger>
          <TabsTrigger value="entregados" className="gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            Entregados
          </TabsTrigger>
        </TabsList>

        <TabsContent value="carga">
          <div className="space-y-6">
            {/* Banner Empezar a Cargar - siempre visible */}
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
                    onClick={() => navigate("/almacen-tablet/carga-scan")}
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

            <div className="p-8 text-center text-muted-foreground">
              <Truck className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No hay rutas programadas para hoy</p>
              <p className="text-xs mt-1">Presiona "Nueva Carga" para crear una ruta</p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="enruta">
          <RutasEnRutaTab />
        </TabsContent>

        <TabsContent value="entregados">
          <RutasEntregadasTab />
        </TabsContent>
      </Tabs>
    );
  }

  return (
    <Tabs defaultValue="carga" className="w-full">
      <TabsList className="w-full grid grid-cols-3 mb-4">
        <TabsTrigger value="carga" className="gap-1.5">
          <Package className="w-4 h-4" />
          Carga de Rutas
        </TabsTrigger>
        <TabsTrigger value="enruta" className="gap-1.5">
          <Truck className="w-4 h-4" />
          En Ruta
        </TabsTrigger>
        <TabsTrigger value="entregados" className="gap-1.5">
          <CheckCircle2 className="w-4 h-4" />
          Entregados
        </TabsTrigger>
      </TabsList>

      <TabsContent value="carga">
      {/* Mis cargas activas */}
      {(() => {
        const misCargas = rutas.filter(r => r.almacenista_id === empleadoId && !r.carga_completada && r.carga_iniciada_en);
        if (misCargas.length === 0) return null;
        return (
          <div className="space-y-2 mb-4">
            <p className="text-sm font-semibold text-muted-foreground">Mis cargas activas</p>
            {misCargas.map(r => {
              const segsTranscurridos = r.carga_iniciada_en ? Math.floor((Date.now() - new Date(r.carga_iniciada_en).getTime()) / 1000) : 0;
              const mins = Math.floor(segsTranscurridos / 60);
              const tiempoStr = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
              return (
                <Card key={r.id} className="border-amber-300 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedRuta(r)}>
                  <CardContent className="py-3 flex items-center gap-3">
                    <div className="bg-amber-100 rounded-lg p-2 shrink-0">
                      <Package className="h-5 w-5 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">{r.folio}</span>
                        <Badge className="text-[10px] bg-amber-500">En carga</Badge>
                        <span className="text-xs font-mono text-muted-foreground">{r.porcentaje_carga}%</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {r.chofer?.nombre_completo || "Sin chofer"} · {r.entregas?.length || 0} pedidos · {tiempoStr}
                      </p>
                    </div>
                    <Button size="sm" className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white">
                      Continuar carga
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        );
      })()}

      {/* Banner Empezar a Cargar */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 rounded-xl p-3 shrink-0">
              <QrCode className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg text-foreground">Escanear hoja de carga</h3>
              <p className="text-sm text-muted-foreground">
                Escanea QR, asigna personal y confirma la carga
              </p>
            </div>
            <Button
              onClick={() => navigate("/almacen-tablet/carga-scan")}
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
          <ScrollArea className="h-[calc(100vh-420px)] min-h-[300px]">
            <div className="divide-y divide-border">
              {rutas.map((ruta) => {
                const estado = getEstadoCarga(ruta);
                const EstadoIcon = estado.icon;
                const urgencia = !ruta.carga_completada ? getUrgencia(ruta.hora_salida_sugerida) : null;
                const enProgreso = !!ruta.carga_iniciada_en && !ruta.carga_completada;
                
                // Live timer
                let tiempoStr = "";
                if (enProgreso && ruta.carga_iniciada_en) {
                  const segs = differenceInSeconds(now, parseISO(ruta.carga_iniciada_en));
                  const mins = Math.floor(segs / 60);
                  const hrs = Math.floor(mins / 60);
                  tiempoStr = hrs > 0 ? `${hrs}h ${mins % 60}m` : `${mins}m ${segs % 60}s`;
                }

                // Client names from entregas, sorted by orden_entrega (delivery order: 1 first)
                const sortedEntregas = [...ruta.entregas].sort((a, b) => 
                  ((a as any).orden_entrega || 0) - ((b as any).orden_entrega || 0)
                );
                const clienteNames = sortedEntregas
                  .map(e => (e as any).pedido?.cliente?.nombre)
                  .filter(Boolean) as string[];
                const uniqueClientes = [...new Set(clienteNames)];
                
                return (
                  <div
                    key={ruta.id}
                    className={`w-full p-4 hover:bg-muted/50 transition-colors text-left ${
                      urgencia?.nivel === 'urgente' || urgencia?.nivel === 'atrasada' ? 'bg-destructive/5' : ''
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full shrink-0 ${urgencia ? urgencia.color : estado.color}`} />
                      
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
                          {enProgreso && tiempoStr && (
                            <Badge variant="secondary" className="text-xs font-mono animate-pulse">
                              <Clock className="w-3 h-3 mr-1" />
                              {tiempoStr}
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
                        </div>

                        {/* Extra info: ayudantes + clientes */}
                        {(uniqueClientes.length > 0 || (ruta.ayudantes_nombres && ruta.ayudantes_nombres.length > 0)) && (
                          <div className="mt-1.5 space-y-0.5">
                            {ruta.ayudantes_nombres && ruta.ayudantes_nombres.length > 0 && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Users className="w-3 h-3 shrink-0" />
                                <span className="truncate">Ayudantes: {ruta.ayudantes_nombres.join(", ")}</span>
                              </p>
                            )}
                            {uniqueClientes.length > 0 && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="w-3 h-3 shrink-0" />
                                <span className="truncate">{uniqueClientes.join(" → ")}</span>
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
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
                      {ruta.carga_completada && ruta.status === "cargada" && (
                        <Button
                          size="sm"
                          className="gap-1.5 font-bold"
                          onClick={(e) => { e.stopPropagation(); handleEnviarARuta(ruta); }}
                          disabled={sendingRutaId === ruta.id}
                        >
                          {sendingRutaId === ruta.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                          Enviar a Ruta
                        </Button>
                      )}
                      {ruta.status !== "cargada" && (
                        <Badge
                          variant={ruta.carga_completada ? "default" : "secondary"}
                          className="flex items-center gap-1"
                        >
                          <EstadoIcon className="w-3 h-3" />
                          {estado.label}
                        </Badge>
                      )}
                      {ruta.entregas.length > 0 && (
                        <ChevronRight className="w-5 h-5 text-muted-foreground cursor-pointer" onClick={() => handleSelectRuta(ruta)} />
                      )}
                    </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="enruta">
        <RutasEnRutaTab />
      </TabsContent>

      <TabsContent value="entregados">
        <RutasEntregadasTab />
      </TabsContent>
    </Tabs>
  );
};