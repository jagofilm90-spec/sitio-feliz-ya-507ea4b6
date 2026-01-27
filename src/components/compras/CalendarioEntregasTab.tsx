import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, List, MoreVertical, Truck, ChevronLeft, ChevronRight, RotateCcw, Eye, Banknote, CheckCircle2, PackageX, AlertTriangle } from "lucide-react";
import OrdenAccionesDialog from "./OrdenAccionesDialog";
import { RecepcionDetalleDialog } from "./RecepcionDetalleDialog";
import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { LiveIndicator } from "@/components/ui/live-indicator";
import { Alert, AlertDescription } from "@/components/ui/alert";

const CalendarioEntregasTab = () => {
  const queryClient = useQueryClient();
  const [accionesDialogOpen, setAccionesDialogOpen] = useState(false);
  const [ordenSeleccionada, setOrdenSeleccionada] = useState<any>(null);
  const [vistaCalendario, setVistaCalendario] = useState(true);
  const [mesActual, setMesActual] = useState(new Date());
  const [diaSeleccionado, setDiaSeleccionado] = useState<Date | null>(null);
  const [dialogDiaOpen, setDialogDiaOpen] = useState(false);
  const [recepcionDetalleId, setRecepcionDetalleId] = useState<string | null>(null);
  const [recepcionDialogOpen, setRecepcionDialogOpen] = useState(false);

  // Realtime subscription para sincronizar calendario de entregas
  useEffect(() => {
    const channel = supabase
      .channel('calendario-entregas-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ordenes_compra_entregas'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["entregas_programadas_calendario"] });
          queryClient.invalidateQueries({ queryKey: ["ordenes_calendario_simples"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Fetch ALL scheduled deliveries from ordenes_compra_entregas
  // This now includes both multi-delivery OCs AND faltante follow-ups
  const { data: entregasProgramadas = [] } = useQuery({
    queryKey: ["entregas_programadas_calendario"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ordenes_compra_entregas")
        .select(
          `
          *,
          productos_faltantes,
          ordenes_compra!inner (
            id,
            folio,
            total,
            subtotal,
            impuestos,
            status,
            proveedor_id,
            proveedor_nombre_manual,
            proveedor_email_manual,
            tipo_pago,
            status_pago,
            entregas_multiples,
            fecha_entrega_programada,
            creado_por,
            autorizado_por,
            notas,
            proveedores (id, nombre, email, rfc),
            ordenes_compra_detalles (
              id,
              cantidad_ordenada,
              precio_unitario_compra,
              subtotal,
              productos (id, codigo, nombre)
            )
          )
        `
        )
        // No filter on entregas_multiples - fetch ALL delivery records
        .order("fecha_programada");

      if (error) throw error;
      return data;
    },
  });


  // Fetch OCs that have NO records in ordenes_compra_entregas (legacy orders without delivery tracking)
  // These are older orders that only have fecha_entrega_programada on the OC itself
  const { data: ordenesSimples = [] } = useQuery({
    queryKey: ["ordenes_calendario_simples", entregasProgramadas],
    queryFn: async () => {
      // Get all OC IDs that already have delivery records
      const ocIdsWithDeliveries = new Set(
        entregasProgramadas.map((e: any) => e.ordenes_compra?.id).filter(Boolean)
      );

      const { data, error } = await supabase
        .from("ordenes_compra")
        .select(
          `
          *,
          proveedores (id, nombre, email, rfc),
          ordenes_compra_detalles (
            id,
            cantidad_ordenada,
            precio_unitario_compra,
            subtotal,
            productos (id, codigo, nombre)
          )
        `
        )
        .not("fecha_entrega_programada", "is", null)
        .not("status", "eq", "cancelada")
        .order("fecha_entrega_programada");

      if (error) throw error;
      
      // Filter out OCs that already have entries in ordenes_compra_entregas
      return (data || []).filter((oc: any) => !ocIdsWithDeliveries.has(oc.id));
    },
    enabled: entregasProgramadas !== undefined,
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      programada: "secondary",
      pendiente: "secondary",
      parcial: "default",
      recibida: "default",
      entregada: "default",
      devuelta: "destructive",
    };
    return colors[status] || "secondary";
  };

  // Check if delivery was auto-rescheduled
  const esReprogramada = (notas: string | null) => {
    return notas?.includes("[AUTO]") || false;
  };

  // Helper to determine payment status: 'anticipado_pagado' | 'anticipado_pendiente' | 'contra_entrega'
  const getEstadoPago = (orden: any): 'anticipado_pagado' | 'anticipado_pendiente' | 'contra_entrega' => {
    if (orden?.tipo_pago === 'anticipado') {
      return orden?.status_pago === 'pagado' ? 'anticipado_pagado' : 'anticipado_pendiente';
    }
    return 'contra_entrega';
  };

  // Combine both data sources into unified format
  const todasLasEntregas = useMemo(() => [
    // All delivery entries from ordenes_compra_entregas (including faltantes)
    ...entregasProgramadas.map((entrega: any) => {
      // Use fecha_entrega_real if completed, otherwise fecha_programada
      const esRecibida = entrega.status === 'recibida';
      const fechaMostrar = (esRecibida && entrega.fecha_entrega_real) 
        ? entrega.fecha_entrega_real 
        : entrega.fecha_programada;
      
      return {
        id: entrega.id,
        fecha: fechaMostrar,
        folio: entrega.ordenes_compra?.folio,
        proveedor: entrega.ordenes_compra?.proveedor_id 
          ? entrega.ordenes_compra?.proveedores?.nombre 
          : entrega.ordenes_compra?.proveedor_nombre_manual,
        esProveedorManual: !entrega.ordenes_compra?.proveedor_id,
        productos: entrega.ordenes_compra?.ordenes_compra_detalles,
        total: entrega.ordenes_compra?.total,
        status: entrega.status,
        orden: entrega.ordenes_compra,
        numeroEntrega: entrega.numero_entrega,
        cantidadBultos: entrega.cantidad_bultos,
        esMultiple: entrega.ordenes_compra?.entregas_multiples || entrega.origen_faltante,
        esFaltante: entrega.origen_faltante === true,
        productosFaltantes: entrega.productos_faltantes as Array<{
          producto_id: string;
          codigo: string;
          nombre: string;
          cantidad_faltante: number;
        }> | null,
        reprogramada: esReprogramada(entrega.notas),
        estadoPago: getEstadoPago(entrega.ordenes_compra),
        esCompletada: entrega.status === 'recibida',
      };
    }),
    // Legacy OCs without delivery tracking entries
    ...ordenesSimples.map((orden: any) => ({
      id: orden.id,
      fecha: orden.fecha_entrega_programada,
      folio: orden.folio,
      proveedor: orden.proveedor_id 
        ? orden.proveedores?.nombre 
        : orden.proveedor_nombre_manual,
      esProveedorManual: !orden.proveedor_id,
      productos: orden.ordenes_compra_detalles,
      total: orden.total,
      status: orden.status,
      orden: orden,
      numeroEntrega: null,
      cantidadBultos: null,
      esMultiple: false,
      esFaltante: false,
      productosFaltantes: null,
      reprogramada: esReprogramada(orden.notas),
      estadoPago: getEstadoPago(orden),
      esCompletada: orden.status === 'completada' || orden.status === 'recibida',
    })),
  ], [entregasProgramadas, ordenesSimples]);

  // Helper to parse date string without timezone issues
  const parseDateLocal = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Map of dates with deliveries
  const entregasPorFecha = useMemo(() => {
    const mapa: Record<string, typeof todasLasEntregas> = {};
    todasLasEntregas.forEach((entrega) => {
      if (entrega.fecha) {
        // Use the date string directly as key to avoid timezone issues
        const fechaKey = entrega.fecha.split('T')[0]; // Handle both "2025-12-01" and "2025-12-01T00:00:00"
        if (!mapa[fechaKey]) {
          mapa[fechaKey] = [];
        }
        mapa[fechaKey].push(entrega);
      }
    });
    return mapa;
  }, [todasLasEntregas]);

  const agruparPorFecha = () => {
    const grupos: Record<string, typeof todasLasEntregas> = {};
    todasLasEntregas.forEach((entrega) => {
      if (entrega.fecha) {
        // Parse date without timezone conversion
        const dateStr = entrega.fecha.split('T')[0];
        const [year, month, day] = dateStr.split('-').map(Number);
        const fechaLocal = new Date(year, month - 1, day);
        const fecha = format(fechaLocal, "dd/MM/yyyy");
        if (!grupos[fecha]) {
          grupos[fecha] = [];
        }
        grupos[fecha].push(entrega);
      }
    });
    return grupos;
  };

  const gruposPorFecha = agruparPorFecha();

  // Calendar helpers
  const diasDelMes = useMemo(() => {
    const inicio = startOfWeek(startOfMonth(mesActual), { locale: es });
    const fin = endOfWeek(endOfMonth(mesActual), { locale: es });
    return eachDayOfInterval({ start: inicio, end: fin });
  }, [mesActual]);

  // Spanish locale starts week on Monday, so headers must match: Lunes, Martes, Miércoles, Jueves, Viernes, Sábado, Domingo
  const diasSemana = ["L", "M", "M", "J", "V", "S", "D"];

  const getEntregasDelDia = (dia: Date) => {
    const key = format(dia, "yyyy-MM-dd");
    return entregasPorFecha[key] || [];
  };

  const handleDiaClick = (dia: Date) => {
    const entregas = getEntregasDelDia(dia);
    if (entregas.length > 0) {
      setDiaSeleccionado(dia);
      setDialogDiaOpen(true);
    }
  };

  const entregasDelDiaSeleccionado = diaSeleccionado ? getEntregasDelDia(diaSeleccionado) : [];

  return (
    <Card className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <CalendarIcon className="h-6 w-6" />
            <h2 className="text-2xl font-bold">Calendario de Entregas</h2>
            <LiveIndicator />
          </div>
          <div className="flex gap-2">
            <Button
              variant={vistaCalendario ? "default" : "outline"}
              size="sm"
              onClick={() => setVistaCalendario(true)}
            >
              <CalendarIcon className="h-4 w-4 mr-1" />
              Calendario
            </Button>
            <Button
              variant={!vistaCalendario ? "default" : "outline"}
              size="sm"
              onClick={() => setVistaCalendario(false)}
            >
              <List className="h-4 w-4 mr-1" />
              Lista
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground">
          Visualiza y gestiona las entregas programadas de tus proveedores
        </p>
      </div>

      {vistaCalendario ? (
        <div className="space-y-4">
          {/* Calendar header */}
          <div className="flex items-center justify-between">
            <Button variant="outline" size="icon" onClick={() => setMesActual(subMonths(mesActual, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-lg font-semibold capitalize">
              {format(mesActual, "MMMM yyyy", { locale: es })}
            </h3>
            <Button variant="outline" size="icon" onClick={() => setMesActual(addMonths(mesActual, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Day headers */}
            {diasSemana.map((dia, i) => (
              <div key={i} className="text-center py-2 text-sm font-medium text-muted-foreground">
                {dia}
              </div>
            ))}

            {/* Day cells */}
            {diasDelMes.map((dia, i) => {
              const entregas = getEntregasDelDia(dia);
              const esHoy = isSameDay(dia, new Date());
              const esDelMes = isSameMonth(dia, mesActual);
              const tieneEntregas = entregas.length > 0;

              return (
                <div
                  key={i}
                  onClick={() => handleDiaClick(dia)}
                  className={cn(
                    "min-h-[72px] p-2 text-center rounded-lg transition-colors relative",
                    esDelMes ? "bg-background" : "bg-muted/30 text-muted-foreground",
                    tieneEntregas && "cursor-pointer hover:bg-accent",
                    esHoy && "ring-2 ring-primary ring-offset-2"
                  )}
                >
                  <span className={cn(
                    "inline-flex items-center justify-center w-8 h-8 rounded-full text-sm",
                    esHoy && "bg-primary text-primary-foreground"
                  )}>
                    {format(dia, "d")}
                  </span>
                  
                  {/* Dots indicator - checkmark for completed, colored dots for pending */}
                  {tieneEntregas && (
                    <div className="flex justify-center gap-1 mt-1">
                      {entregas.slice(0, 3).map((entrega, idx) => (
                        entrega.esCompletada ? (
                          <span
                            key={idx}
                            className="w-4 h-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center"
                          >
                            <CheckCircle2 className="w-3 h-3 text-green-600 dark:text-green-400" />
                          </span>
                        ) : (
                          <span
                            key={idx}
                            className={cn(
                              "w-2 h-2 rounded-full",
                              entrega.estadoPago === 'anticipado_pagado' && "bg-green-500",
                              entrega.estadoPago === 'anticipado_pendiente' && "bg-yellow-500",
                              entrega.estadoPago === 'contra_entrega' && "bg-rose-500"
                            )}
                          />
                        )
                      ))}
                      {entregas.length > 3 && (
                        <span className="text-xs text-muted-foreground">+{entregas.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 pt-4 text-sm text-muted-foreground flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="w-3 h-3 text-green-600 dark:text-green-400" />
              </span>
              <span>Recibida</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <PackageX className="w-3 h-3 text-orange-600 dark:text-orange-400" />
              </span>
              <span>Faltante</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500" />
              <span>Anticipado pagado</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-yellow-500" />
              <span>Anticipado pendiente</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500" />
              <span>Contra entrega</span>
            </div>
          </div>
        </div>
      ) : (
        // Lista view (existing)
        <>
          {Object.keys(gruposPorFecha).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No hay entregas programadas
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(gruposPorFecha).map(([fecha, entregas]) => (
                <div key={fecha} className="border rounded-lg overflow-hidden">
                  <div className="bg-muted px-4 py-3">
                    <h3 className="font-semibold capitalize">{fecha}</h3>
                    <p className="text-sm text-muted-foreground">
                      {entregas.length} {entregas.length === 1 ? "entrega" : "entregas"}
                    </p>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Folio</TableHead>
                        <TableHead>Proveedor</TableHead>
                        <TableHead>Productos</TableHead>
                        <TableHead>Bultos</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entregas.map((entrega) => (
                        <TableRow 
                          key={entrega.id}
                          className={cn(entrega.esCompletada && "opacity-60 bg-muted/30")}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2 flex-wrap">
                              {entrega.folio}
                              {entrega.esCompletada && (
                                <Badge className="text-xs bg-green-100 text-green-700 border-green-300 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Recibida
                                </Badge>
                              )}
                              {entrega.esFaltante && (
                                <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800">
                                  <PackageX className="h-3 w-3 mr-1" />
                                  Faltante
                                </Badge>
                              )}
                              {entrega.esMultiple && !entrega.esFaltante && (
                                <Badge variant="outline" className="text-xs">
                                  <Truck className="h-3 w-3 mr-1" />
                                  #{entrega.numeroEntrega}
                                </Badge>
                              )}
                              {!entrega.esCompletada && entrega.estadoPago === 'anticipado_pagado' && (
                                <Badge className="text-xs bg-green-100 text-green-700 border-green-300 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800">
                                  <Banknote className="h-3 w-3 mr-1" />
                                  Anticipado pagado
                                </Badge>
                              )}
                              {!entrega.esCompletada && entrega.estadoPago === 'anticipado_pendiente' && (
                                <Badge className="text-xs bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-800">
                                  <Banknote className="h-3 w-3 mr-1" />
                                  Anticipo pendiente
                                </Badge>
                              )}
                              {entrega.reprogramada && (
                                <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800">
                                  <RotateCcw className="h-3 w-3 mr-1" />
                                  Reprogramada
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{entrega.proveedor}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {entrega.productos?.slice(0, 2).map((d: any, idx: number) => (
                                <span key={idx}>
                                  {idx > 0 && ", "}
                                  <span className="font-medium">{d.cantidad_ordenada}</span> {d.productos?.nombre}
                                </span>
                              ))}
                              {entrega.productos &&
                                entrega.productos.length > 2 && (
                                  <span className="text-muted-foreground">
                                    {" "}
                                    +{entrega.productos.length - 2} más
                                  </span>
                                )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {entrega.cantidadBultos ? (
                              <span className="font-medium">{entrega.cantidadBultos.toLocaleString()} bultos</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusColor(entrega.status) as "default" | "secondary" | "destructive" | "outline"}>
                              {entrega.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {entrega.status === "recibida" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setRecepcionDetalleId(entrega.id);
                                    setRecepcionDialogOpen(true);
                                  }}
                                  title="Ver detalle de recepción"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setOrdenSeleccionada(entrega.orden);
                                  setAccionesDialogOpen(true);
                                }}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Dialog for day details */}
      <Dialog open={dialogDiaOpen} onOpenChange={setDialogDiaOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="capitalize">
              {diaSeleccionado && format(diaSeleccionado, "EEEE d 'de' MMMM yyyy", { locale: es })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {entregasDelDiaSeleccionado.map((entrega) => (
              <div
                key={entrega.id}
                className={cn(
                  "p-4 border rounded-lg hover:bg-accent/50 transition-colors",
                  entrega.esCompletada && "opacity-60 bg-muted/30"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{entrega.folio}</span>
                    {entrega.esCompletada && (
                      <Badge className="text-xs bg-green-100 text-green-700 border-green-300 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Recibida
                      </Badge>
                    )}
                    {entrega.esFaltante && (
                      <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800">
                        <PackageX className="h-3 w-3 mr-1" />
                        Faltante
                      </Badge>
                    )}
                    {entrega.esMultiple && !entrega.esFaltante && (
                      <Badge variant="outline" className="text-xs">
                        <Truck className="h-3 w-3 mr-1" />
                        Entrega #{entrega.numeroEntrega}
                      </Badge>
                    )}
                    {!entrega.esCompletada && entrega.estadoPago === 'anticipado_pagado' && (
                      <Badge className="text-xs bg-green-100 text-green-700 border-green-300 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800">
                        <Banknote className="h-3 w-3 mr-1" />
                        Anticipado pagado
                      </Badge>
                    )}
                    {!entrega.esCompletada && entrega.estadoPago === 'anticipado_pendiente' && (
                      <Badge className="text-xs bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-800">
                        <Banknote className="h-3 w-3 mr-1" />
                        Anticipo pendiente
                      </Badge>
                    )}
                    {entrega.reprogramada && (
                      <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800">
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Reprogramada
                      </Badge>
                    )}
                  </div>
                  <Badge variant={getStatusColor(entrega.status) as "default" | "secondary" | "destructive" | "outline"}>
                    {entrega.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-1">{entrega.proveedor}</p>
                <p className="text-sm">
                  {entrega.productos?.slice(0, 3).map((d: any, idx: number) => (
                    <span key={idx}>
                      {idx > 0 && ", "}
                      <span className="font-medium">{d.cantidad_ordenada}</span> {d.productos?.nombre}
                    </span>
                  ))}
                  {entrega.productos && entrega.productos.length > 3 && (
                    <span className="text-muted-foreground"> +{entrega.productos.length - 3} más</span>
                  )}
                </p>
                {entrega.cantidadBultos && (
                  <p className="text-sm font-medium mt-1">{entrega.cantidadBultos.toLocaleString()} bultos</p>
                )}
                
                {/* Alert for faltante deliveries showing specific products */}
                {entrega.esFaltante && entrega.productosFaltantes && entrega.productosFaltantes.length > 0 && (
                  <Alert className="mt-3 bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800">
                    <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    <AlertDescription className="text-orange-700 dark:text-orange-300">
                      <span className="font-medium">Productos recibidos en esta entrega:</span>
                      <ul className="mt-1 ml-4 list-disc">
                        {entrega.productosFaltantes.map((p: any, idx: number) => (
                          <li key={idx}>
                            <span className="font-medium">{p.cantidad_faltante}</span> {p.nombre}
                          </li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="flex gap-2 mt-3">
                  {entrega.status === "recibida" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRecepcionDetalleId(entrega.id);
                        setRecepcionDialogOpen(true);
                        setDialogDiaOpen(false);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver Recepción
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setOrdenSeleccionada(entrega.orden);
                      setAccionesDialogOpen(true);
                      setDialogDiaOpen(false);
                    }}
                  >
                    <MoreVertical className="h-4 w-4 mr-1" />
                    Acciones
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <OrdenAccionesDialog
        open={accionesDialogOpen}
        onOpenChange={setAccionesDialogOpen}
        orden={ordenSeleccionada}
      />

      <RecepcionDetalleDialog
        entregaId={recepcionDetalleId}
        open={recepcionDialogOpen}
        onOpenChange={setRecepcionDialogOpen}
      />
    </Card>
  );
};

export default CalendarioEntregasTab;
