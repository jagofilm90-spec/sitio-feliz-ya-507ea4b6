import { useState, useEffect } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
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
  Truck,
  Calendar,
  Clock,
  CheckCircle2,
  PackageCheck,
  User,
  UserCheck,
  RefreshCw,
} from "lucide-react";
import { RegistrarLlegadaSheet } from "./RegistrarLlegadaSheet";
import { AlmacenRecepcionSheet } from "./AlmacenRecepcionSheet";

interface TrabajandoPor {
  id: string;
  full_name: string;
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
  const { toast } = useToast();

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
          orden_compra:ordenes_compra(
            id,
            folio,
            proveedor_id,
            proveedor_nombre_manual,
            proveedor:proveedores(id, nombre)
          )
        `)
        .in("status", ["programada", "en_transito", "en_descarga"])
        .order("fecha_programada", { ascending: true });

      if (error) throw error;

      let entregasData = (data as any[]) || [];
      
      // Cargar nombres de quienes están trabajando y quién registró llegada
      const trabajandoPorIds = entregasData
        .filter(e => e.trabajando_por)
        .map(e => e.trabajando_por);
      
      const llegadaRegistradaPorIds = entregasData
        .filter(e => e.llegada_registrada_por)
        .map(e => e.llegada_registrada_por);
      
      const allProfileIds = [...new Set([...trabajandoPorIds, ...llegadaRegistradaPorIds])];
      
      if (allProfileIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", allProfileIds);
        
        if (profiles) {
          const profileMap = new Map(profiles.map(p => [p.id, p]));
          entregasData = entregasData.map(e => ({
            ...e,
            trabajando_por_profile: e.trabajando_por ? profileMap.get(e.trabajando_por) : null,
            llegada_registrada_por_profile: e.llegada_registrada_por ? profileMap.get(e.llegada_registrada_por) : null
          }));
        }
      }
      
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
          await loadEntregas();
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

  if (entregas.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No hay entregas de proveedores pendientes</p>
      </div>
    );
  }

  // Separar por status para mostrar en grupos
  const entregasEnDescarga = entregas.filter(e => e.status === "en_descarga");
  const entregasPendientes = entregas.filter(e => e.status === "programada" || e.status === "en_transito");

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
                />
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Sheet para registrar llegada (Fase 1) */}
      {selectedEntrega && (
        <RegistrarLlegadaSheet
          entrega={selectedEntrega}
          open={llegadaSheetOpen}
          onOpenChange={setLlegadaSheetOpen}
          onLlegadaRegistrada={() => {
            loadEntregas();
            setLlegadaSheetOpen(false);
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
            loadEntregas();
            setRecepcionSheetOpen(false);
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
    </>
  );
};

// Componente interno para cada entrega
interface EntregaCardProps {
  entrega: EntregaCompra;
  currentUserId: string | null;
  onRegistrarLlegada: (entrega: EntregaCompra) => void;
  onCompletarRecepcion: (entrega: EntregaCompra) => void;
  onTomarRecepcion: (entrega: EntregaCompra) => void;
}

const EntregaCard = ({ entrega, currentUserId, onRegistrarLlegada, onCompletarRecepcion, onTomarRecepcion }: EntregaCardProps) => {
  const estado = getEstadoConfigStatic(entrega.status);
  const esEnDescarga = entrega.status === "en_descarga";
  const Icon = estado.icon;

  const proveedorNombre = entrega.orden_compra?.proveedor_id 
    ? (entrega.orden_compra?.proveedor?.nombre || "Sin proveedor")
    : (entrega.orden_compra?.proveedor_nombre_manual || "Sin proveedor");

  // Verificar si otro usuario está trabajando en esta recepción
  const otroUsuarioTrabajando = entrega.trabajando_por && entrega.trabajando_por !== currentUserId;
  const yoEstoyTrabajando = entrega.trabajando_por === currentUserId;
  
  // Verificar si el timeout de 4 horas ha pasado
  const tiempoTrabajando = entrega.trabajando_desde 
    ? (Date.now() - new Date(entrega.trabajando_desde).getTime()) / (1000 * 60 * 60) 
    : 0;
  const timeoutExpirado = tiempoTrabajando > 4;

  return (
    <div className="p-4 hover:bg-muted/50 transition-colors">
      <div className="flex items-start gap-4">
        <div className={`w-3 h-3 rounded-full ${estado.color} flex-shrink-0 mt-2`} />
        
        <div className="flex-1 min-w-0 space-y-2">
          {/* Línea 1: Proveedor + Cantidad */}
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-lg truncate">
              {proveedorNombre}
            </span>
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

          {/* Info de descarga en curso */}
          {esEnDescarga && entrega.llegada_registrada_en && (
            <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
              <Clock className="w-4 h-4" />
              Descargando desde hace {formatDistanceToNow(new Date(entrega.llegada_registrada_en), { locale: es })}
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

          {/* Botones de acción */}
          <div className="flex gap-2 pt-1 flex-wrap">
            {esEnDescarga ? (
              <>
                {/* Solo mostrar botón de completar si soy yo o no hay nadie asignado */}
                {(!otroUsuarioTrabajando || timeoutExpirado) && (
                  <Button 
                    size="sm" 
                    onClick={() => onCompletarRecepcion(entrega)}
                    className="gap-2"
                  >
                    <PackageCheck className="w-4 h-4" />
                    Completar Recepción
                  </Button>
                )}
                {/* Botón para tomar recepción de otro */}
                {otroUsuarioTrabajando && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => onTomarRecepcion(entrega)}
                    className="gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Tomar recepción
                  </Button>
                )}
              </>
            ) : (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onRegistrarLlegada(entrega)}
                className="gap-2"
              >
                <Truck className="w-4 h-4" />
                Registrar Llegada
              </Button>
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
