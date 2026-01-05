import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { ChevronLeft, ChevronRight, CalendarDays, Clock, Package, User } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, getDay, isToday, isTomorrow, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

interface ProgramacionPedido {
  id: string;
  cliente_id: string;
  sucursal_id: string | null;
  dia_semana: string;
  hora_preferida: string | null;
  activo: boolean;
  notas: string | null;
  clientes: {
    id: string;
    nombre: string;
    codigo: string;
    vendedor_asignado: string | null;
  };
  cliente_sucursales: {
    id: string;
    nombre: string;
    codigo_sucursal: string | null;
  } | null;
}

interface PedidoPendiente {
  id: string;
  folio: string;
  cliente_id: string;
  sucursal_id: string | null;
  status: string;
  fecha_entrega_solicitada: string | null;
  total: number;
  clientes: {
    nombre: string;
    codigo: string;
  };
  cliente_sucursales: {
    nombre: string;
  } | null;
}

export function CalendarioPedidosTab() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  // Fetch programaciones
  const { data: programaciones = [], isLoading: loadingProgramaciones } = useQuery({
    queryKey: ['programaciones-pedidos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cliente_programacion_pedidos')
        .select(`
          id,
          cliente_id,
          sucursal_id,
          dia_semana,
          hora_preferida,
          activo,
          notas,
          clientes (id, nombre, codigo, vendedor_asignado),
          cliente_sucursales (id, nombre, codigo_sucursal)
        `)
        .eq('activo', true);
      
      if (error) throw error;
      return data as unknown as ProgramacionPedido[];
    }
  });

  // Fetch pedidos pendientes del mes
  const { data: pedidosPendientes = [], isLoading: loadingPedidos } = useQuery({
    queryKey: ['pedidos-pendientes-calendario', format(currentMonth, 'yyyy-MM')],
    queryFn: async () => {
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);
      
      const { data, error } = await supabase
        .from('pedidos')
        .select(`
          id,
          folio,
          cliente_id,
          sucursal_id,
          status,
          fecha_entrega_solicitada,
          total,
          clientes (nombre, codigo),
          cliente_sucursales (nombre)
        `)
        .in('status', ['pendiente', 'por_autorizar'])
        .gte('fecha_entrega_solicitada', format(start, 'yyyy-MM-dd'))
        .lte('fecha_entrega_solicitada', format(end, 'yyyy-MM-dd'));
      
      if (error) throw error;
      return data as unknown as PedidoPendiente[];
    }
  });

  // Get days of the month
  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // Get programaciones for a specific date
  const getProgramacionesForDate = (date: Date) => {
    const dayIndex = getDay(date);
    const dayName = DIAS_SEMANA[dayIndex];
    return programaciones.filter(p => p.dia_semana === dayName);
  };

  // Get pedidos for a specific date
  const getPedidosForDate = (date: Date) => {
    return pedidosPendientes.filter(p => 
      p.fecha_entrega_solicitada && isSameDay(new Date(p.fecha_entrega_solicitada), date)
    );
  };

  // Items for selected date
  const selectedDateItems = useMemo(() => {
    if (!selectedDate) return { programaciones: [], pedidos: [] };
    return {
      programaciones: getProgramacionesForDate(selectedDate),
      pedidos: getPedidosForDate(selectedDate)
    };
  }, [selectedDate, programaciones, pedidosPendientes]);

  // Tomorrow's items for the widget
  const tomorrowItems = useMemo(() => {
    const tomorrow = addDays(new Date(), 1);
    return {
      programaciones: getProgramacionesForDate(tomorrow),
      pedidos: getPedidosForDate(tomorrow)
    };
  }, [programaciones, pedidosPendientes]);

  const isLoading = loadingProgramaciones || loadingPedidos;

  return (
    <div className="space-y-4">
      {/* Widget: Pedidos para Mañana */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Pedidos Programados para Mañana ({format(addDays(new Date(), 1), 'EEEE d', { locale: es })})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tomorrowItems.programaciones.length === 0 && tomorrowItems.pedidos.length === 0 ? (
            <p className="text-muted-foreground text-sm">No hay pedidos programados para mañana</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {tomorrowItems.programaciones.map(prog => (
                <div key={prog.id} className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                  <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <CalendarDays className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{prog.clientes.nombre}</p>
                    {prog.cliente_sucursales && (
                      <p className="text-xs text-muted-foreground truncate">
                        Suc: {prog.cliente_sucursales.nombre}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                    Programado
                  </Badge>
                </div>
              ))}
              {tomorrowItems.pedidos.map(pedido => (
                <div key={pedido.id} className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                  <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Package className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{pedido.clientes.nombre}</p>
                    <p className="text-xs text-muted-foreground">{pedido.folio}</p>
                  </div>
                  <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300">
                    Confirmado
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Calendario de Pedidos</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-medium min-w-[140px] text-center capitalize">
                  {format(currentMonth, 'MMMM yyyy', { locale: es })}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 35 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : (
              <>
                {/* Header días */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                    <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Grid de días */}
                <div className="grid grid-cols-7 gap-1">
                  {/* Espacios vacíos antes del primer día */}
                  {Array.from({ length: getDay(startOfMonth(currentMonth)) }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-20" />
                  ))}

                  {/* Días del mes */}
                  {daysInMonth.map(day => {
                    const dayProgs = getProgramacionesForDate(day);
                    const dayPedidos = getPedidosForDate(day);
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const isTodayDate = isToday(day);
                    const isTomorrowDate = isTomorrow(day);

                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => setSelectedDate(day)}
                        className={`h-20 p-1 rounded-lg border text-left transition-colors ${
                          isSelected 
                            ? 'border-primary bg-primary/10' 
                            : 'border-border hover:bg-muted/50'
                        } ${isTodayDate ? 'ring-2 ring-primary/50' : ''}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-sm font-medium ${
                            isTodayDate ? 'text-primary' : ''
                          }`}>
                            {format(day, 'd')}
                          </span>
                          {isTomorrowDate && (
                            <Badge variant="secondary" className="text-[10px] px-1 py-0">
                              Mañana
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-0.5">
                          {dayProgs.length > 0 && (
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full bg-blue-500" />
                              <span className="text-[10px] text-muted-foreground">
                                {dayProgs.length} prog.
                              </span>
                            </div>
                          )}
                          {dayPedidos.length > 0 && (
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full bg-green-500" />
                              <span className="text-[10px] text-muted-foreground">
                                {dayPedidos.length} ped.
                              </span>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Leyenda */}
                <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span>Programación recurrente</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span>Pedido confirmado</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Panel lateral: Detalle del día seleccionado */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">
              {selectedDate 
                ? format(selectedDate, "EEEE d 'de' MMMM", { locale: es })
                : 'Selecciona un día'
              }
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedDate ? (
              <p className="text-muted-foreground text-sm">
                Haz clic en un día para ver los detalles
              </p>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {/* Programaciones */}
                  {selectedDateItems.programaciones.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                        <CalendarDays className="h-4 w-4" />
                        Programaciones Recurrentes
                      </h4>
                      <div className="space-y-2">
                        {selectedDateItems.programaciones.map(prog => (
                          <div 
                            key={prog.id} 
                            className="p-3 rounded-lg border bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium">{prog.clientes.nombre}</p>
                                <p className="text-xs text-muted-foreground">
                                  {prog.clientes.codigo}
                                </p>
                                {prog.cliente_sucursales && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    📍 {prog.cliente_sucursales.nombre}
                                  </p>
                                )}
                                {prog.hora_preferida && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    🕐 {prog.hora_preferida}
                                  </p>
                                )}
                                {prog.notas && (
                                  <p className="text-xs text-muted-foreground mt-1 italic">
                                    "{prog.notas}"
                                  </p>
                                )}
                              </div>
                              <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shrink-0">
                                Cada {prog.dia_semana}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pedidos confirmados */}
                  {selectedDateItems.pedidos.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Pedidos Confirmados
                      </h4>
                      <div className="space-y-2">
                        {selectedDateItems.pedidos.map(pedido => (
                          <div 
                            key={pedido.id} 
                            className="p-3 rounded-lg border bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium">{pedido.clientes.nombre}</p>
                                <p className="text-xs text-muted-foreground">
                                  {pedido.folio}
                                </p>
                                {pedido.cliente_sucursales && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    📍 {pedido.cliente_sucursales.nombre}
                                  </p>
                                )}
                                <p className="text-sm font-medium text-green-700 dark:text-green-400 mt-1">
                                  ${pedido.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                </p>
                              </div>
                              <Badge variant="outline" className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 shrink-0">
                                {pedido.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedDateItems.programaciones.length === 0 && selectedDateItems.pedidos.length === 0 && (
                    <p className="text-muted-foreground text-sm text-center py-8">
                      No hay pedidos programados para este día
                    </p>
                  )}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
