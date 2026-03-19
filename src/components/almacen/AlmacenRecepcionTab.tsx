import { useState, useEffect, useRef } from "react";
import { format, formatDistanceToNow, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Package, 
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Truck,
  Calendar,
  Clock,
  CheckCircle2,
  PackageCheck,
  User,
  UserCheck,
  RefreshCw,
  Box,
  XCircle,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { RegistrarLlegadaSheet } from "./RegistrarLlegadaSheet";
import { AlmacenRecepcionSheet } from "./AlmacenRecepcionSheet";
import { CancelarDescargaDialog } from "./CancelarDescargaDialog";
import { ProximasEntregasTab } from "./ProximasEntregasTab";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { getCompactDisplayName } from "@/lib/productUtils";

interface TrabajandoPor {
  id: string;
  full_name: string;
}

interface ProductoEntrega {
  id: string;
  cantidad_ordenada: number;
  producto: {
    id: string;
    nombre: string;
    marca: string | null;
    especificaciones: string | null;
    unidad: string | null;
    contenido_empaque: string | null;
    peso_kg: number | null;
  };
}

interface ProductoFaltante {
  producto_id?: string;
  nombre: string;
  cantidad_faltante: number;
  codigo?: string;
}

interface EntregaCompra {
  id: string;
  numero_entrega: number;
  cantidad_bultos: number;
  fecha_programada: string | null;
  fecha_entrega_real: string | null;
  status: string;
  notas: string | null;
  llegada_registrada_en: string | null;
  nombre_chofer_proveedor: string | null;
  placas_vehiculo: string | null;
  numero_sello_llegada: string | null;
  llegada_registrada_por: string | null;
  llegada_registrada_por_profile?: { id: string; full_name: string } | null;
  trabajando_por: string | null;
  trabajando_desde: string | null;
  trabajando_por_profile?: TrabajandoPor | null;
  productos?: ProductoEntrega[];
  // Campos para entregas de faltantes
  origen_faltante?: boolean;
  productos_faltantes?: ProductoFaltante[];
  orden_compra: {
    id: string;
    folio: string;
    proveedor_id: string | null;
    proveedor_nombre_manual: string | null;
    proveedor: {
      id: string;
      nombre: string;
    } | null;
  };
}

interface AlmacenRecepcionTabProps {
  onStatsUpdate: (stats: { pendientes: number; recibidas: number }) => void;
}

export const AlmacenRecepcionTab = ({ onStatsUpdate }: AlmacenRecepcionTabProps) => {
  const [entregas, setEntregas] = useState<EntregaCompra[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntrega, setSelectedEntrega] = useState<EntregaCompra | null>(null);
  const [llegadaSheetOpen, setLlegadaSheetOpen] = useState(false);
  const [recepcionSheetOpen, setRecepcionSheetOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [tomarRecepcionEntrega, setTomarRecepcionEntrega] = useState<EntregaCompra | null>(null);
  const [tomandoRecepcion, setTomandoRecepcion] = useState(false);
  const [cancelarDescargaEntrega, setCancelarDescargaEntrega] = useState<EntregaCompra | null>(null);
  const [activeTab, setActiveTab] = useState<"hoy" | "proximas">("hoy");
  const { toast } = useToast();
  
  // Refs para saber si hay sheets abiertos (accesible desde realtime callbacks)
  const sheetOpenRef = useRef(false);
  useEffect(() => {
    sheetOpenRef.current = llegadaSheetOpen || recepcionSheetOpen;
  }, [llegadaSheetOpen, recepcionSheetOpen]);

  // Obtener usuario actual
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getUser();
  }, []);

  const loadEntregas = async () => {
    setLoading(true);
    try {
      // ========================================
      // VENTANA DE VISIBILIDAD (24h DINÁMICAS)
      // ========================================
      // Por la mañana (antes de 14:00): solo entregas de HOY
      // Por la tarde (después de 14:00): HOY + MAÑANA
      // Entregas en proceso (en_transito, en_descarga): siempre visibles
      const ahora = new Date();
      const horaActual = ahora.getHours();
      
      const fechaLimite = new Date();
      // Después de las 14:00, incluir día siguiente
      if (horaActual >= 14) {
        fechaLimite.setDate(fechaLimite.getDate() + 1);
      }
      fechaLimite.setHours(23, 59, 59, 999);

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
          llegada_registrada_en,
          nombre_chofer_proveedor,
          placas_vehiculo,
          numero_sello_llegada,
          llegada_registrada_por,
          trabajando_por,
          trabajando_desde,
          origen_faltante,
          productos_faltantes,
          orden_compra:ordenes_compra!inner(
            id,
            folio,
            status,
            tipo_pago,
            proveedor_id,
            proveedor_nombre_manual,
            proveedor:proveedores(id, nombre)
          )
        `)
        .in("status", ["programada", "en_transito", "en_descarga"])
        // Exclude deliveries for OCs with pending advance payment
        .neq("orden_compra.status", "pendiente_pago")
        .order("fecha_programada", { ascending: true });

      if (error) throw error;

      // Filtrar entregas por ventana de visibilidad
      // - Las que están en_transito o en_descarga siempre se muestran
      // - Las programadas solo si caen dentro de la ventana de 24h
      let entregasData = ((data as any[]) || []).filter(entrega => {
        // Siempre mostrar entregas en proceso (ya llegaron o están descargando)
        if (entrega.status === "en_transito" || entrega.status === "en_descarga") {
          return true;
        }
        
        // Sin fecha programada - mostrar (llegada no programada/improvista)
        if (!entrega.fecha_programada) {
          return true;
        }
        
        // Verificar si está dentro de la ventana de visibilidad
        const fechaEntrega = new Date(entrega.fecha_programada + "T23:59:59");
        return fechaEntrega <= fechaLimite;
      });
      
      // Cargar nombres de quienes están trabajando y quién registró llegada
      const trabajandoPorIds = entregasData
        .filter(e => e.trabajando_por)
        .map(e => e.trabajando_por);
      
      const llegadaRegistradaPorIds = entregasData
        .filter(e => e.llegada_registrada_por)
        .map(e => e.llegada_registrada_por);
      
      const allProfileIds = [...new Set([...trabajandoPorIds, ...llegadaRegistradaPorIds])];
      
      // Cargar productos de las órdenes de compra
      const ordenIds = entregasData
        .map(e => e.orden_compra?.id)
        .filter(Boolean) as string[];
      
      // Ejecutar queries en paralelo
      const [profilesResult, detallesResult] = await Promise.all([
        allProfileIds.length > 0 
          ? supabase.from("profiles").select("id, full_name").in("id", allProfileIds)
          : Promise.resolve({ data: null }),
        ordenIds.length > 0
          ? supabase
              .from("ordenes_compra_detalles")
              .select(`
                id,
                orden_compra_id,
                cantidad_ordenada,
                producto:productos(id, nombre, marca, especificaciones, unidad, contenido_empaque, peso_kg)
              `)
              .in("orden_compra_id", ordenIds)
          : Promise.resolve({ data: null })
      ]);
      
      // Mapear perfiles
      const profileMap = new Map(
        (profilesResult.data || []).map(p => [p.id, p])
      );
      
      // Mapear productos por orden_compra_id
      const productosPorOrden = new Map<string, ProductoEntrega[]>();
      (detallesResult.data || []).forEach((d: any) => {
        const list = productosPorOrden.get(d.orden_compra_id) || [];
        list.push(d);
        productosPorOrden.set(d.orden_compra_id, list);
      });
      
      // Combinar todo
      entregasData = entregasData.map(e => ({
        ...e,
        trabajando_por_profile: e.trabajando_por ? profileMap.get(e.trabajando_por) : null,
        llegada_registrada_por_profile: e.llegada_registrada_por ? profileMap.get(e.llegada_registrada_por) : null,
        productos: e.orden_compra?.id ? productosPorOrden.get(e.orden_compra.id) || [] : []
      }));
      
      setEntregas(entregasData);
      
      // Estadísticas para el padre
      const pendientes = entregasData.filter(e => e.status === "programada" || e.status === "en_transito");
      const enDescarga = entregasData.filter(e => e.status === "en_descarga");
      onStatsUpdate({
        pendientes: pendientes.length + enDescarga.length,
        recibidas: 0
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

  // Tomar recepción de otro almacenista
  const handleTomarRecepcion = async () => {
    if (!tomarRecepcionEntrega || !currentUserId) return;
    
    setTomandoRecepcion(true);
    try {
      const anteriorUsuario = tomarRecepcionEntrega.trabajando_por;
      
      // Actualizar quién está trabajando
      const { error: updateError } = await supabase
        .from("ordenes_compra_entregas")
        .update({
          trabajando_por: currentUserId,
          trabajando_desde: new Date().toISOString()
        })
        .eq("id", tomarRecepcionEntrega.id);
      
      if (updateError) throw updateError;
      
      // Registrar transferencia en historial
      if (anteriorUsuario) {
        await supabase.from("recepciones_participantes").insert([
          {
            entrega_id: tomarRecepcionEntrega.id,
            user_id: anteriorUsuario,
            accion: "transferido_a",
            notas: `Transferido a otro almacenista`
          },
          {
            entrega_id: tomarRecepcionEntrega.id,
            user_id: currentUserId,
            accion: "transferido_de",
            notas: `Tomó recepción de otro almacenista`
          }
        ]);
      }
      
      toast({
        title: "Recepción tomada",
        description: "Ahora estás trabajando en esta recepción"
      });
      
      loadEntregas();
    } catch (error) {
      console.error("Error tomando recepción:", error);
      toast({
        title: "Error",
        description: "No se pudo tomar la recepción",
        variant: "destructive"
      });
    } finally {
      setTomandoRecepcion(false);
      setTomarRecepcionEntrega(null);
    }
  };

  useEffect(() => {
    loadEntregas();
  }, []);

  // Suscripción a Realtime para actualizaciones instantáneas
  useEffect(() => {
    const channel = supabase
      .channel('entregas-almacen-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ordenes_compra_entregas'
        },
        async (payload) => {
          console.log('Nueva entrega detectada via Realtime:', payload);
          const newEntrega = payload.new as any;
          if (['programada', 'en_transito', 'en_descarga'].includes(newEntrega.status)) {
            await loadEntregas();
            toast({
              title: "🚚 Nueva entrega programada",
              description: "Se ha agregado una nueva entrega a la lista",
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ordenes_compra_entregas'
        },
        async () => {
          // No recargar si hay un sheet abierto para evitar parpadeos
          if (!sheetOpenRef.current) {
            await loadEntregas();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleRegistrarLlegada = (entrega: EntregaCompra) => {
    setSelectedEntrega(entrega);
    setLlegadaSheetOpen(true);
  };

  const handleCompletarRecepcion = (entrega: EntregaCompra) => {
    setSelectedEntrega(entrega);
    setRecepcionSheetOpen(true);
  };

  const getEstadoConfig = (status: string) => {
    switch (status) {
      case "en_descarga":
        return { 
          label: "En descarga", 
          color: "bg-amber-500", 
          variant: "secondary" as const,
          icon: Clock
        };
      case "en_transito":
        return { 
          label: "En tránsito", 
          color: "bg-blue-500", 
          variant: "secondary" as const,
          icon: Truck
        };
      default:
        return { 
          label: "Programada", 
          color: "bg-slate-400", 
          variant: "outline" as const,
          icon: Calendar
        };
    }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    );
  }

  // Separar por status para mostrar en grupos
  const entregasEnDescarga = entregas.filter(e => e.status === "en_descarga");
  const entregasPendientes = entregas.filter(e => e.status === "programada" || e.status === "en_transito");

  return (
    <>
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="w-5 h-5" />
            Recepción de mercancía
          </CardTitle>
          {/* Pestañas */}
          <div className="flex gap-1 mt-3 border-b border-border -mx-6 px-6">
            <button
              onClick={() => setActiveTab("hoy")}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors touch-manipulation ${
                activeTab === "hoy"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Hoy
              {entregas.length > 0 && (
                <span className="ml-1.5 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                  {entregas.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("proximas")}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors touch-manipulation ${
                activeTab === "proximas"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Próximas entregas
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {activeTab === "hoy" ? (
            entregas.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No hay entregas programadas para hoy</p>
                <p className="text-sm mt-1">Revisa la pestaña "Próximas entregas"</p>
              </div>
            ) : (
              <ScrollArea className="h-[calc(100vh-380px)] min-h-[300px]">
                <div className="divide-y divide-border">
                  {/* Entregas en descarga (prioritarias) */}
                  {entregasEnDescarga.length > 0 && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/20">
                      <div className="text-sm font-medium text-amber-700 dark:text-amber-400 flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4" />
                        En descarga ({entregasEnDescarga.length})
                      </div>
                      <div className="space-y-2">
                        {entregasEnDescarga.map((entrega) => (
                          <EntregaCard 
                            key={entrega.id}
                            entrega={entrega}
                            currentUserId={currentUserId}
                            onRegistrarLlegada={handleRegistrarLlegada}
                            onCompletarRecepcion={handleCompletarRecepcion}
                            onTomarRecepcion={setTomarRecepcionEntrega}
                            onCancelarDescarga={setCancelarDescargaEntrega}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Entregas pendientes */}
                  {entregasPendientes.map((entrega) => (
                    <EntregaCard 
                      key={entrega.id}
                      entrega={entrega}
                      currentUserId={currentUserId}
                      onRegistrarLlegada={handleRegistrarLlegada}
                      onCompletarRecepcion={handleCompletarRecepcion}
                      onTomarRecepcion={setTomarRecepcionEntrega}
                      onCancelarDescarga={setCancelarDescargaEntrega}
                    />
                  ))}
                </div>
              </ScrollArea>
            )
          ) : (
            <ScrollArea className="h-[calc(100vh-380px)] min-h-[300px]">
              <ProximasEntregasTab onEntregaReprogramada={loadEntregas} />
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Sheet para registrar llegada (Fase 1) */}
      {selectedEntrega && (
        <RegistrarLlegadaSheet
          entrega={selectedEntrega}
          open={llegadaSheetOpen}
          onOpenChange={setLlegadaSheetOpen}
          onLlegadaRegistrada={() => {
            setLlegadaSheetOpen(false);
            // Delay reload to let the sheet animation finish before re-rendering
            setTimeout(() => {
              loadEntregas();
            }, 300);
          }}
        />
      )}

      {/* Sheet para completar recepción (Fase 2) */}
      {selectedEntrega && (
        <AlmacenRecepcionSheet
          entrega={selectedEntrega}
          open={recepcionSheetOpen}
          onOpenChange={setRecepcionSheetOpen}
          onRecepcionCompletada={() => {
            setRecepcionSheetOpen(false);
            setTimeout(() => {
              loadEntregas();
            }, 300);
          }}
        />
      )}

      {/* Diálogo de confirmación para tomar recepción */}
      <AlertDialog open={!!tomarRecepcionEntrega} onOpenChange={(open) => !open && setTomarRecepcionEntrega(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              ¿Tomar esta recepción?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {tomarRecepcionEntrega?.trabajando_por_profile?.full_name 
                ? `${tomarRecepcionEntrega.trabajando_por_profile.full_name} está trabajando en esta recepción. ¿Deseas tomarla?`
                : "Esta recepción está asignada a otro almacenista. ¿Deseas tomarla?"}
              <br /><br />
              El almacenista anterior será notificado del cambio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={tomandoRecepcion}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleTomarRecepcion} disabled={tomandoRecepcion}>
              {tomandoRecepcion ? "Tomando..." : "Sí, tomar recepción"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog para cancelar descarga */}
      <CancelarDescargaDialog
        open={!!cancelarDescargaEntrega}
        onOpenChange={(open) => !open && setCancelarDescargaEntrega(null)}
        entregaId={cancelarDescargaEntrega?.id || ""}
        proveedorNombre={
          cancelarDescargaEntrega?.orden_compra?.proveedor_id 
            ? (cancelarDescargaEntrega?.orden_compra?.proveedor?.nombre || "Sin proveedor")
            : (cancelarDescargaEntrega?.orden_compra?.proveedor_nombre_manual || "Sin proveedor")
        }
        onDescargaCancelada={loadEntregas}
      />
    </>
  );
};

// Componente timer en tiempo real para descargas
const TimerDescarga = ({ inicioDescarga }: { inicioDescarga: string }) => {
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState("");
  const [colorClase, setColorClase] = useState("text-green-600 dark:text-green-400");

  useEffect(() => {
    const calcularTiempo = () => {
      const inicio = new Date(inicioDescarga).getTime();
      const ahora = Date.now();
      const diffMs = ahora - inicio;
      
      const horas = Math.floor(diffMs / (1000 * 60 * 60));
      const minutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const segundos = Math.floor((diffMs % (1000 * 60)) / 1000);
      
      // Formato HH:MM:SS
      const tiempo = [
        horas.toString().padStart(2, '0'),
        minutos.toString().padStart(2, '0'),
        segundos.toString().padStart(2, '0')
      ].join(':');
      
      setTiempoTranscurrido(tiempo);
      
      // Código de colores según urgencia
      if (horas >= 2) {
        setColorClase("text-red-600 dark:text-red-400"); // Crítico: +2 horas
      } else if (horas >= 1) {
        setColorClase("text-orange-600 dark:text-orange-400"); // Advertencia: +1 hora
      } else if (minutos >= 30) {
        setColorClase("text-amber-600 dark:text-amber-400"); // Atención: +30 min
      } else {
        setColorClase("text-green-600 dark:text-green-400"); // Normal: <30 min
      }
    };

    calcularTiempo(); // Calcular inmediatamente
    const interval = setInterval(calcularTiempo, 1000); // Actualizar cada segundo

    return () => clearInterval(interval);
  }, [inicioDescarga]);

  return (
    <span className={`font-mono font-bold ${colorClase}`}>
      {tiempoTranscurrido}
    </span>
  );
};

// Componente para lista de productos expandible
// Ahora recibe también datos de faltantes para mostrar solo esos productos
interface ProductosEntregaListProps {
  productos?: ProductoEntrega[];
  origen_faltante?: boolean;
  productos_faltantes?: ProductoFaltante[];
}

const ProductosEntregaList = ({ productos, origen_faltante, productos_faltantes }: ProductosEntregaListProps) => {
  const [expandido, setExpandido] = useState(false);

  // Si es entrega de faltante, mostrar solo los productos faltantes
  if (origen_faltante && productos_faltantes && productos_faltantes.length > 0) {
    const productosVisibles = expandido ? productos_faltantes : productos_faltantes.slice(0, 3);
    const tienesMas = productos_faltantes.length > 3;

    return (
      <div className="mt-2 space-y-1">
        <span className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
          <Box className="w-3 h-3" />
          Faltantes ({productos_faltantes.length}):
        </span>
        <div className="pl-4 space-y-0.5">
          {productosVisibles.map((prod, index) => (
            <div key={prod.producto_id || index} className="text-sm flex items-center gap-2">
              <span className="text-amber-600 dark:text-amber-400">•</span>
              <span className="truncate flex-1">
                {prod.codigo ? `${prod.codigo} - ` : ""}{prod.nombre}
              </span>
              <Badge variant="outline" className="text-xs flex-shrink-0 border-amber-500 text-amber-600">
                {prod.cantidad_faltante.toLocaleString()}
              </Badge>
            </div>
          ))}
          {tienesMas && (
            <button
              onClick={() => setExpandido(!expandido)}
              className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
            >
              {expandido ? (
                <>
                  <ChevronUp className="w-3 h-3" />
                  Ver menos
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" />
                  +{productos_faltantes.length - 3} más...
                </>
              )}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Flujo normal: mostrar productos de la OC
  if (!productos || productos.length === 0) return null;

  const productosVisibles = expandido ? productos : productos.slice(0, 3);
  const tienesMas = productos.length > 3;

  return (
    <div className="mt-2 space-y-1">
      <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
        <Box className="w-3 h-3" />
        Productos ({productos.length}):
      </span>
      <div className="pl-4 space-y-0.5">
        {productosVisibles.map((prod) => (
          <div key={prod.id} className="text-sm flex items-center gap-2">
            <span className="text-muted-foreground">•</span>
            <span className="truncate flex-1">
              {getCompactDisplayName(prod.producto)}
            </span>
            <Badge variant="outline" className="text-xs flex-shrink-0">
              {prod.cantidad_ordenada.toLocaleString()}
            </Badge>
          </div>
        ))}
        {tienesMas && (
          <button
            onClick={() => setExpandido(!expandido)}
            className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
          >
            {expandido ? (
              <>
                <ChevronUp className="w-3 h-3" />
                Ver menos
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" />
                +{productos.length - 3} más...
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

// Componente interno para cada entrega
interface EntregaCardProps {
  entrega: EntregaCompra;
  currentUserId: string | null;
  onRegistrarLlegada: (entrega: EntregaCompra) => void;
  onCompletarRecepcion: (entrega: EntregaCompra) => void;
  onTomarRecepcion: (entrega: EntregaCompra) => void;
  onCancelarDescarga: (entrega: EntregaCompra) => void;
}

const EntregaCard = ({ entrega, currentUserId, onRegistrarLlegada, onCompletarRecepcion, onTomarRecepcion, onCancelarDescarga }: EntregaCardProps) => {
  const estado = getEstadoConfigStatic(entrega.status);
  const esEnDescarga = entrega.status === "en_descarga";
  const Icon = estado.icon;

  const proveedorNombre = entrega.orden_compra?.proveedor_id 
    ? (entrega.orden_compra?.proveedor?.nombre || "Sin proveedor")
    : (entrega.orden_compra?.proveedor_nombre_manual || "Sin proveedor");

  // Verificar si otro usuario está trabajando en esta recepción
  const otroUsuarioTrabajando = entrega.trabajando_por && entrega.trabajando_por !== currentUserId;
  const yoEstoyTrabajando = entrega.trabajando_por === currentUserId;
  const esLlegadaAnticipada = entrega.notas?.includes("Llegada anticipada");
  
  // Verificar si el timeout de 4 horas ha pasado
  const tiempoTrabajando = entrega.trabajando_desde 
    ? (Date.now() - new Date(entrega.trabajando_desde).getTime()) / (1000 * 60 * 60) 
    : 0;
  const timeoutExpirado = tiempoTrabajando > 4;

  // ========================================
  // LÓGICA PARA DESHABILITAR BOTÓN "REGISTRAR LLEGADA"
  // ========================================
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  
  const fechaProgramada = entrega.fecha_programada 
    ? new Date(entrega.fecha_programada + "T00:00:00") 
    : null;
  
  const puedeRegistrarLlegada = !fechaProgramada || fechaProgramada <= hoy;
  
  const diasRestantes = fechaProgramada 
    ? Math.ceil((fechaProgramada.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // Verificar si la entrega es para mañana
  const esMañana = diasRestantes === 1;

  return (
    <div className="p-4 hover:bg-muted/50 transition-colors">
      <div className="flex items-start gap-4">
        <div className={`w-3 h-3 rounded-full ${estado.color} flex-shrink-0 mt-2`} />
        
        <div className="flex-1 min-w-0 space-y-2">
          {/* Línea 1: Proveedor + Cantidad */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-semibold text-lg truncate">
                {proveedorNombre}
              </span>
              {/* Badge de mañana */}
              {esMañana && (
                <Badge variant="outline" className="gap-1 border-blue-500 text-blue-600 dark:text-blue-400 flex-shrink-0">
                  <Calendar className="w-3 h-3" />
                  Mañana
                </Badge>
              )}
              {/* Badge de llegada anticipada */}
              {esLlegadaAnticipada && (
                <Badge variant="outline" className="gap-1 border-amber-500 text-amber-600 dark:text-amber-400 flex-shrink-0">
                  <Clock className="w-3 h-3" />
                  Anticipada
                </Badge>
              )}
            </div>
            <Badge className="text-base font-bold bg-primary text-primary-foreground flex-shrink-0">
              {entrega.cantidad_bultos.toLocaleString()} bultos
            </Badge>
          </div>
          
          {/* Línea 2: Info adicional */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
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

          {/* Productos de la entrega - expandible */}
          <ProductosEntregaList 
            productos={entrega.productos}
            origen_faltante={entrega.origen_faltante}
            productos_faltantes={entrega.productos_faltantes as ProductoFaltante[] | undefined}
          />

          {/* Info de descarga en curso con timer en tiempo real */}
          {esEnDescarga && entrega.llegada_registrada_en && (
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-muted-foreground">Tiempo de descarga:</span>
              <TimerDescarga inicioDescarga={entrega.llegada_registrada_en} />
              {entrega.nombre_chofer_proveedor && (
                <span className="text-muted-foreground">• Chofer: {entrega.nombre_chofer_proveedor}</span>
              )}
            </div>
          )}

          {/* Badge de quién está trabajando */}
          {entrega.trabajando_por && (
            <div className="flex items-center gap-2">
              {yoEstoyTrabajando ? (
                <Badge variant="secondary" className="gap-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  <UserCheck className="w-3 h-3" />
                  Tú estás trabajando
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  <User className="w-3 h-3" />
                  {entrega.trabajando_por_profile?.full_name || "Otro almacenista"}
                  {entrega.trabajando_desde && (
                    <span className="opacity-75">
                      • hace {formatDistanceToNow(new Date(entrega.trabajando_desde), { locale: es })}
                    </span>
                  )}
                </Badge>
              )}
            </div>
          )}

          {/* Botones de acción - optimizados para tablet/stylus */}
          <div className="flex gap-3 pt-2 flex-wrap">
            {esEnDescarga ? (
              <>
                {/* Botón para cancelar descarga */}
                {(!otroUsuarioTrabajando || yoEstoyTrabajando) && (
                  <Button 
                    size="lg" 
                    variant="outline"
                    onClick={() => onCancelarDescarga(entrega)}
                    className="gap-2 h-12 px-5 text-destructive border-destructive/50 hover:bg-destructive/10 touch-manipulation"
                  >
                    <XCircle className="w-5 h-5" />
                    Cancelar Descarga
                  </Button>
                )}
                {/* Solo mostrar botón de completar si soy yo o no hay nadie asignado */}
                {(!otroUsuarioTrabajando || timeoutExpirado) && (
                  <Button 
                    size="lg" 
                    onClick={() => onCompletarRecepcion(entrega)}
                    className="gap-2 h-12 px-5 touch-manipulation"
                  >
                    <PackageCheck className="w-5 h-5" />
                    Completar Recepción
                  </Button>
                )}
                {/* Botón para tomar recepción de otro */}
                {otroUsuarioTrabajando && (
                  <Button 
                    size="lg" 
                    variant="outline"
                    onClick={() => onTomarRecepcion(entrega)}
                    className="gap-2 h-12 px-5 touch-manipulation"
                  >
                    <RefreshCw className="w-5 h-5" />
                    Tomar recepción
                  </Button>
                )}
              </>
            ) : (
              puedeRegistrarLlegada ? (
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={() => onRegistrarLlegada(entrega)}
                  className="gap-2 h-12 px-5 touch-manipulation"
                >
                  <Truck className="w-5 h-5" />
                  Registrar Llegada
                </Button>
              ) : (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span tabIndex={0}>
                        <Button 
                          size="lg" 
                          variant="outline"
                          disabled
                          className="gap-2 h-12 px-5 touch-manipulation cursor-not-allowed"
                        >
                          <Truck className="w-5 h-5" />
                          Registrar Llegada
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p className="text-sm">
                        {diasRestantes === 1 
                          ? "Esta entrega está programada para mañana" 
                          : `Esta entrega está programada para dentro de ${diasRestantes} días`}
                        {fechaProgramada && (
                          <span className="block text-xs text-muted-foreground mt-1">
                            Fecha: {format(fechaProgramada, "dd/MM/yyyy", { locale: es })}
                          </span>
                        )}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant={estado.variant} className="gap-1">
            <Icon className="w-3 h-3" />
            {estado.label}
          </Badge>
        </div>
      </div>
    </div>
  );
};

// Helper function para el componente EntregaCard
const getEstadoConfigStatic = (status: string) => {
  switch (status) {
    case "en_descarga":
      return { 
        label: "En descarga", 
        color: "bg-amber-500", 
        variant: "secondary" as const,
        icon: Clock
      };
    case "en_transito":
      return { 
        label: "En tránsito", 
        color: "bg-blue-500", 
        variant: "secondary" as const,
        icon: Truck
      };
    default:
      return { 
        label: "Programada", 
        color: "bg-slate-400", 
        variant: "outline" as const,
        icon: Calendar
      };
  }
};
