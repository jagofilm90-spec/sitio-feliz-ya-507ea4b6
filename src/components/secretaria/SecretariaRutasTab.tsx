import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Truck,
  CheckCircle2,
  Clock,
  Package,
  FileCheck,
  AlertTriangle,
  MapPin,
  User,
  CalendarDays,
  Edit,
  Send,
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ConciliacionDetalleDialog } from "./ConciliacionDetalleDialog";
import { ConciliacionMasivaEnvio } from "./ConciliacionMasivaEnvio";

interface RutaConDetalles {
  id: string;
  folio: string;
  fecha_ruta: string;
  status: string | null;
  chofer_id: string;
  vehiculo_id: string | null;
  peso_total_kg: number | null;
  fecha_hora_inicio: string | null;
  fecha_hora_fin: string | null;
  notas: string | null;
  chofer?: { nombre_completo: string } | null;
  vehiculo?: { marca: string; modelo: string; placas: string } | null;
  entregas: EntregaDetalle[];
}

interface EntregaDetalle {
  id: string;
  orden_entrega: number;
  entregado: boolean | null;
  status_entrega: string | null;
  hora_entrega_real: string | null;
  nombre_receptor: string | null;
  firma_recibido: string | null;
  notas: string | null;
  papeles_recibidos: boolean | null;
  notas_conciliacion: string | null;
  pedido: {
    id: string;
    folio: string;
    total: number;
    status: string;
    notas: string | null;
    cliente: { nombre: string; codigo: string } | null;
  } | null;
}

export const SecretariaRutasTab = () => {
  const [subTab, setSubTab] = useState("en_camino");
  const queryClient = useQueryClient();

  const hoy = new Date();
  const ayer = subDays(hoy, 1);

  // Query rutas en curso (hoy, status en_curso)
  const { data: rutasEnCamino = [], isLoading: loadingEnCamino } = useQuery({
    queryKey: ["secretaria-rutas-en-camino"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rutas")
        .select(`
          id, folio, fecha_ruta, status, chofer_id, vehiculo_id, peso_total_kg,
          fecha_hora_inicio, fecha_hora_fin, notas,
          chofer:empleados!rutas_chofer_id_fkey(nombre_completo),
          vehiculo:vehiculos!rutas_vehiculo_id_fkey(marca, modelo, placas),
          entregas(
            id, orden_entrega, entregado, status_entrega, hora_entrega_real,
            nombre_receptor, firma_recibido, notas, papeles_recibidos, notas_conciliacion,
            pedido:pedidos!entregas_pedido_id_fkey(
              id, folio, total, status, notas,
              cliente:clientes!pedidos_cliente_id_fkey(nombre, codigo)
            )
          )
        `)
        .in("status", ["en_curso", "en_ruta", "cargada"])
        .order("fecha_ruta", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as RutaConDetalles[];
    },
    refetchInterval: 30000,
  });

  // Query rutas completadas hoy
  const { data: rutasCompletadas = [], isLoading: loadingCompletadas } = useQuery({
    queryKey: ["secretaria-rutas-completadas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rutas")
        .select(`
          id, folio, fecha_ruta, status, chofer_id, vehiculo_id, peso_total_kg,
          fecha_hora_inicio, fecha_hora_fin, notas,
          chofer:empleados!rutas_chofer_id_fkey(nombre_completo),
          vehiculo:vehiculos!rutas_vehiculo_id_fkey(marca, modelo, placas),
          entregas(
            id, orden_entrega, entregado, status_entrega, hora_entrega_real,
            nombre_receptor, firma_recibido, notas, papeles_recibidos, notas_conciliacion,
            pedido:pedidos!entregas_pedido_id_fkey(
              id, folio, total, status, notas,
              cliente:clientes!pedidos_cliente_id_fkey(nombre, codigo)
            )
          )
        `)
        .eq("status", "completada")
        .gte("fecha_ruta", format(ayer, "yyyy-MM-dd"))
        .order("fecha_ruta", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as RutaConDetalles[];
    },
    refetchInterval: 30000,
  });

  // Rutas por conciliar: completadas donde alguna entrega no tiene papeles_recibidos
  const rutasPorConciliar = rutasCompletadas.filter((r) =>
    r.entregas.some(
      (e) =>
        (e.status_entrega === "entregado" || e.status_entrega === "completo") &&
        !e.papeles_recibidos
    )
  );

  const rutasConciliadas = rutasCompletadas.filter(
    (r) =>
      r.entregas.length > 0 &&
      r.entregas
        .filter((e) => e.status_entrega === "entregado" || e.status_entrega === "completo")
        .every((e) => e.papeles_recibidos)
  );

  // Mutation to mark papers received
  const marcarPapeles = useMutation({
    mutationFn: async ({
      entregaId,
      recibido,
      notas,
    }: {
      entregaId: string;
      recibido: boolean;
      notas?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("entregas")
        .update({
          papeles_recibidos: recibido,
          papeles_recibidos_en: recibido ? new Date().toISOString() : null,
          papeles_recibidos_por: recibido ? user?.id : null,
          notas_conciliacion: notas || null,
        })
        .eq("id", entregaId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["secretaria-rutas-completadas"] });
      toast.success("Papeles actualizados");
    },
    onError: () => toast.error("Error al actualizar"),
  });

  const getEntregaStatusBadge = (status: string | null) => {
    switch (status) {
      case "entregado":
      case "completo":
        return <Badge className="bg-emerald-600 text-white text-[10px]">Entregado</Badge>;
      case "parcial":
        return <Badge className="bg-amber-500 text-white text-[10px]">Parcial</Badge>;
      case "rechazado":
        return <Badge variant="destructive" className="text-[10px]">Rechazado</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px]">Pendiente</Badge>;
    }
  };

  const RutaCard = ({
    ruta,
    showConciliacion = false,
  }: {
    ruta: RutaConDetalles;
    showConciliacion?: boolean;
  }) => {
    const entregasTotal = ruta.entregas.length;
    const entregasCompletadas = ruta.entregas.filter(
      (e) => e.status_entrega === "entregado" || e.status_entrega === "completo"
    ).length;
    const entregasRechazadas = ruta.entregas.filter(
      (e) => e.status_entrega === "rechazado"
    ).length;
    const papelesRecibidos = ruta.entregas.filter((e) => e.papeles_recibidos).length;

    return (
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">{ruta.folio}</CardTitle>
              <Badge
                variant={ruta.status === "en_curso" ? "default" : "secondary"}
                className={cn(
                  "text-[10px]",
                  ruta.status === "en_curso" && "bg-green-600 text-white",
                  ruta.status === "completada" && "bg-blue-600 text-white"
                )}
              >
                {ruta.status === "en_curso" ? "En Camino" : "Completada"}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                {format(new Date(ruta.fecha_ruta), "dd MMM yyyy", { locale: es })}
              </span>
              {ruta.peso_total_kg && (
                <span>{ruta.peso_total_kg.toLocaleString()} kg</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
            <span className="flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              {ruta.chofer?.nombre_completo || "Sin chofer"}
            </span>
            {ruta.vehiculo && (
              <span>
                {ruta.vehiculo.marca} {ruta.vehiculo.modelo} ({ruta.vehiculo.placas})
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            <div className="bg-muted/50 rounded-lg p-2 text-center">
              <p className="text-lg font-bold">{entregasTotal}</p>
              <p className="text-[10px] text-muted-foreground">Total</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-emerald-600">{entregasCompletadas}</p>
              <p className="text-[10px] text-muted-foreground">Entregadas</p>
            </div>
            <div className="bg-rose-50 dark:bg-rose-950/20 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-rose-600">{entregasRechazadas}</p>
              <p className="text-[10px] text-muted-foreground">Rechazadas</p>
            </div>
            {showConciliacion && (
              <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-blue-600">
                  {papelesRecibidos}/{entregasCompletadas}
                </p>
                <p className="text-[10px] text-muted-foreground">Papeles</p>
              </div>
            )}
          </div>

          {/* Entregas list */}
          <div className="space-y-2">
            {ruta.entregas
              .sort((a, b) => a.orden_entrega - b.orden_entrega)
              .map((entrega) => (
                <EntregaRow
                  key={entrega.id}
                  entrega={entrega}
                  showConciliacion={showConciliacion}
                  onMarcarPapeles={(recibido, notas) =>
                    marcarPapeles.mutate({
                      entregaId: entrega.id,
                      recibido,
                      notas,
                    })
                  }
                />
              ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  const totalEnCamino = rutasEnCamino.length;
  const totalPorConciliar = rutasPorConciliar.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Control de Rutas y Entregas</h2>
      </div>

      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="en_camino" className="text-xs sm:text-sm">
            <Truck className="h-4 w-4 mr-1.5" />
            En Camino
            {totalEnCamino > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[10px]">
                {totalEnCamino}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completadas" className="text-xs sm:text-sm">
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
            Completadas
          </TabsTrigger>
          <TabsTrigger value="conciliar" className="text-xs sm:text-sm">
            <FileCheck className="h-4 w-4 mr-1.5" />
            Conciliar
            {totalPorConciliar > 0 && (
              <Badge variant="destructive" className="ml-1.5 text-[10px]">
                {totalPorConciliar}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="conciliar_enviar" className="text-xs sm:text-sm">
            <Send className="h-4 w-4 mr-1.5" />
            Enviar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="en_camino" className="mt-4">
          {loadingEnCamino ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : rutasEnCamino.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Truck className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No hay rutas en camino</p>
                <p className="text-sm">Las rutas aparecerán aquí cuando el almacén complete la carga</p>
              </CardContent>
            </Card>
          ) : (
            rutasEnCamino.map((ruta) => <RutaCard key={ruta.id} ruta={ruta} />)
          )}
        </TabsContent>

        <TabsContent value="completadas" className="mt-4">
          {loadingCompletadas ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : rutasConciliadas.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No hay rutas completadas y conciliadas</p>
              </CardContent>
            </Card>
          ) : (
            rutasConciliadas.map((ruta) => (
              <RutaCard key={ruta.id} ruta={ruta} showConciliacion />
            ))
          )}
        </TabsContent>

        <TabsContent value="conciliar" className="mt-4">
          {rutasPorConciliar.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <FileCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Todo conciliado</p>
                <p className="text-sm">No hay papeles pendientes de recibir</p>
              </CardContent>
            </Card>
          ) : (
            rutasPorConciliar.map((ruta) => (
              <RutaCard key={ruta.id} ruta={ruta} showConciliacion />
            ))
          )}
        </TabsContent>

        <TabsContent value="conciliar_enviar" className="mt-4">
          <ConciliacionMasivaEnvio />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Entrega row component
function EntregaRow({
  entrega,
  showConciliacion,
  onMarcarPapeles,
}: {
  entrega: EntregaDetalle;
  showConciliacion: boolean;
  onMarcarPapeles: (recibido: boolean, notas?: string) => void;
}) {
  const [notasConciliacion, setNotasConciliacion] = useState(entrega.notas_conciliacion || "");
  const [conciliacionOpen, setConciliacionOpen] = useState(false);
  const esEntregado =
    entrega.status_entrega === "entregado" || entrega.status_entrega === "completo";

  return (
    <>
      <div
        className={cn(
          "border rounded-lg p-3 text-sm",
          entrega.papeles_recibidos && "border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/10",
          !entrega.papeles_recibidos && esEntregado && showConciliacion && "border-amber-300 bg-amber-50/50 dark:bg-amber-950/10"
        )}
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs text-muted-foreground font-mono">#{entrega.orden_entrega}</span>
            <span className="font-medium truncate">
              {entrega.pedido?.cliente?.nombre || "—"}
            </span>
            <span className="text-xs text-muted-foreground">
              ({entrega.pedido?.folio})
            </span>
          </div>
          <div className="flex items-center gap-2">
            {getEntregaStatusBadgeStatic(entrega.status_entrega)}
            {entrega.pedido?.notas?.includes("[MODIFICADO EN CARGA]") && (
              <Badge className="bg-amber-500 text-white text-[10px]">
                <AlertTriangle className="h-3 w-3 mr-0.5" />
                Modificado
              </Badge>
            )}
            {entrega.papeles_recibidos && (
              <Badge className="bg-emerald-600 text-white text-[10px]">
                <FileCheck className="h-3 w-3 mr-0.5" />
                Papeles ✓
              </Badge>
            )}
          </div>
        </div>

        {entrega.hora_entrega_real && (
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Entregado: {entrega.hora_entrega_real}
            {entrega.nombre_receptor && ` — Recibió: ${entrega.nombre_receptor}`}
          </p>
        )}

        {entrega.firma_recibido && (
          <p className="text-xs text-emerald-600 mt-0.5 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Firma digital capturada
          </p>
        )}

        {showConciliacion && esEntregado && !entrega.papeles_recibidos && (
          <div className="mt-2 pt-2 border-t space-y-2">
            {/* Button to register returns */}
            {entrega.pedido?.id && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConciliacionOpen(true)}
                className="w-full"
              >
                <Edit className="h-4 w-4 mr-1.5" />
                Registrar Devoluciones / Faltantes
              </Button>
            )}

            <Textarea
              placeholder="Notas de conciliación (opcional)"
              value={notasConciliacion}
              onChange={(e) => setNotasConciliacion(e.target.value)}
              className="text-xs h-16"
            />
            <Button
              size="sm"
              onClick={() => onMarcarPapeles(true, notasConciliacion)}
              className="w-full"
            >
              <FileCheck className="h-4 w-4 mr-1.5" />
              Marcar papeles recibidos (firma y sello)
            </Button>
          </div>
        )}

        {showConciliacion && entrega.papeles_recibidos && entrega.notas_conciliacion && (
          <p className="text-xs text-muted-foreground mt-1 italic">
            Nota: {entrega.notas_conciliacion}
          </p>
        )}
      </div>

      {/* Conciliation dialog */}
      {entrega.pedido?.id && (
        <ConciliacionDetalleDialog
          open={conciliacionOpen}
          onClose={() => setConciliacionOpen(false)}
          pedidoId={entrega.pedido.id}
          pedidoFolio={entrega.pedido.folio}
          clienteNombre={entrega.pedido.cliente?.nombre || "—"}
          entregaId={entrega.id}
        />
      )}
    </>
  );
}

function getEntregaStatusBadgeStatic(status: string | null) {
  switch (status) {
    case "entregado":
    case "completo":
      return <Badge className="bg-emerald-600 text-white text-[10px]">Entregado</Badge>;
    case "parcial":
      return <Badge className="bg-amber-500 text-white text-[10px]">Parcial</Badge>;
    case "rechazado":
      return <Badge variant="destructive" className="text-[10px]">Rechazado</Badge>;
    default:
      return <Badge variant="secondary" className="text-[10px]">Pendiente</Badge>;
  }
}
