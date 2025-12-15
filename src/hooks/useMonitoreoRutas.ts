import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, isToday, differenceInMinutes } from 'date-fns';

export interface RutaMonitoreo {
  id: string;
  folio: string;
  fecha_ruta: string;
  status: string;
  tipo_ruta: string;
  peso_total_kg: number;
  carga_completada: boolean;
  fecha_hora_inicio: string | null;
  fecha_hora_fin: string | null;
  chofer: { id: string; full_name: string } | null;
  ayudante: { id: string; full_name: string } | null;
  vehiculo: { id: string; nombre: string } | null;
  entregas: EntregaMonitoreo[];
  carga_productos: CargaProductoMonitoreo[];
  updated_at: string;
}

export interface EntregaMonitoreo {
  id: string;
  pedido_id: string;
  orden_entrega: number;
  status_entrega: string;
  hora_entrega_real: string | null;
  motivo_rechazo: string | null;
  nombre_receptor: string | null;
  cliente_nombre?: string;
  sucursal_nombre?: string;
  latitud?: number | null;
  longitud?: number | null;
}

export interface CargaProductoMonitoreo {
  id: string;
  cargado: boolean;
  cargado_en: string | null;
  cantidad_solicitada: number;
  cantidad_cargada: number | null;
}

export interface AlertaMonitoreo {
  id: string;
  tipo: 'carga_retrasada' | 'entrega_rechazada' | 'sin_movimiento' | 'tiempo_excedido' | 'entrega_parcial';
  nivel: 'error' | 'warning' | 'info';
  titulo: string;
  descripcion: string;
  ruta_folio: string;
  ruta_id: string;
  timestamp: string;
}

export interface EstadisticasGlobales {
  totalRutas: number;
  rutasProgramadas: number;
  rutasEnCurso: number;
  rutasCompletadas: number;
  totalEntregas: number;
  entregasPendientes: number;
  entregasCompletadas: number;
  entregasRechazadas: number;
  pesoTotalEnRuta: number;
  pesoEntregado: number;
}

export const useMonitoreoRutas = () => {
  const [rutas, setRutas] = useState<RutaMonitoreo[]>([]);
  const [alertas, setAlertas] = useState<AlertaMonitoreo[]>([]);
  const [estadisticas, setEstadisticas] = useState<EstadisticasGlobales>({
    totalRutas: 0,
    rutasProgramadas: 0,
    rutasEnCurso: 0,
    rutasCompletadas: 0,
    totalEntregas: 0,
    entregasPendientes: 0,
    entregasCompletadas: 0,
    entregasRechazadas: 0,
    pesoTotalEnRuta: 0,
    pesoEntregado: 0,
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const calcularAlertas = useCallback((rutasData: RutaMonitoreo[]): AlertaMonitoreo[] => {
    const nuevasAlertas: AlertaMonitoreo[] = [];
    const ahora = new Date();
    const horaActual = ahora.getHours();

    rutasData.forEach((ruta) => {
      // Alerta: Carga retrasada (después de 9:00 AM sin iniciar carga)
      if (horaActual >= 9 && ruta.status === 'programada' && !ruta.carga_completada) {
        const productosNoCargados = ruta.carga_productos.filter(cp => !cp.cargado).length;
        if (productosNoCargados > 0) {
          nuevasAlertas.push({
            id: `carga-${ruta.id}`,
            tipo: 'carga_retrasada',
            nivel: 'error',
            titulo: 'Carga retrasada',
            descripcion: `${productosNoCargados} productos sin cargar`,
            ruta_folio: ruta.folio,
            ruta_id: ruta.id,
            timestamp: ahora.toISOString(),
          });
        }
      }

      // Alerta: Entregas rechazadas
      const rechazadas = ruta.entregas.filter(e => e.status_entrega === 'rechazado');
      rechazadas.forEach((entrega) => {
        nuevasAlertas.push({
          id: `rechazo-${entrega.id}`,
          tipo: 'entrega_rechazada',
          nivel: 'warning',
          titulo: 'Entrega rechazada',
          descripcion: entrega.motivo_rechazo || 'Sin motivo especificado',
          ruta_folio: ruta.folio,
          ruta_id: ruta.id,
          timestamp: ahora.toISOString(),
        });
      });

      // Alerta: Sin movimiento (>1 hora sin actualización en ruta en curso)
      if (ruta.status === 'en_curso') {
        const ultimaActividad = new Date(ruta.updated_at);
        const minutosSinActividad = differenceInMinutes(ahora, ultimaActividad);
        
        if (minutosSinActividad > 60) {
          nuevasAlertas.push({
            id: `sinmov-${ruta.id}`,
            tipo: 'sin_movimiento',
            nivel: 'warning',
            titulo: 'Sin movimiento',
            descripcion: `${Math.floor(minutosSinActividad / 60)}h ${minutosSinActividad % 60}min sin actividad`,
            ruta_folio: ruta.folio,
            ruta_id: ruta.id,
            timestamp: ahora.toISOString(),
          });
        }
      }

      // Alerta: Entregas parciales
      const parciales = ruta.entregas.filter(e => e.status_entrega === 'parcial');
      parciales.forEach((entrega) => {
        nuevasAlertas.push({
          id: `parcial-${entrega.id}`,
          tipo: 'entrega_parcial',
          nivel: 'info',
          titulo: 'Entrega parcial',
          descripcion: entrega.cliente_nombre || 'Cliente',
          ruta_folio: ruta.folio,
          ruta_id: ruta.id,
          timestamp: ahora.toISOString(),
        });
      });
    });

    return nuevasAlertas;
  }, []);

  const calcularEstadisticas = useCallback((rutasData: RutaMonitoreo[]): EstadisticasGlobales => {
    const stats: EstadisticasGlobales = {
      totalRutas: rutasData.length,
      rutasProgramadas: 0,
      rutasEnCurso: 0,
      rutasCompletadas: 0,
      totalEntregas: 0,
      entregasPendientes: 0,
      entregasCompletadas: 0,
      entregasRechazadas: 0,
      pesoTotalEnRuta: 0,
      pesoEntregado: 0,
    };

    rutasData.forEach((ruta) => {
      switch (ruta.status) {
        case 'programada':
          stats.rutasProgramadas++;
          break;
        case 'en_curso':
          stats.rutasEnCurso++;
          break;
        case 'completada':
          stats.rutasCompletadas++;
          break;
      }

      stats.pesoTotalEnRuta += ruta.peso_total_kg || 0;

      ruta.entregas.forEach((entrega) => {
        stats.totalEntregas++;
        switch (entrega.status_entrega) {
          case 'entregado':
          case 'completo':
            stats.entregasCompletadas++;
            break;
          case 'rechazado':
            stats.entregasRechazadas++;
            break;
          default:
            stats.entregasPendientes++;
        }
      });
    });

    return stats;
  }, []);

  const cargarRutasDelDia = useCallback(async () => {
    try {
      const hoy = format(new Date(), 'yyyy-MM-dd');

      // Cargar rutas sin JOIN de chofer/ayudante (IDs son de empleados, no profiles)
      const { data: rutasData, error: rutasError } = await supabase
        .from('rutas')
        .select(`
          id, folio, fecha_ruta, status, tipo_ruta, peso_total_kg,
          carga_completada, fecha_hora_inicio, fecha_hora_fin, updated_at,
          chofer_id, ayudante_id,
          vehiculo:vehiculos!rutas_vehiculo_id_fkey (id, nombre)
        `)
        .eq('fecha_ruta', hoy)
        .neq('status', 'cancelada')
        .order('created_at', { ascending: true });

      if (rutasError) throw rutasError;

      // Obtener IDs únicos de choferes y ayudantes
      const empleadoIds = [...new Set([
        ...(rutasData || []).map(r => r.chofer_id).filter(Boolean),
        ...(rutasData || []).map(r => r.ayudante_id).filter(Boolean)
      ])];

      // Cargar nombres de empleados
      let empleadosMap: Record<string, string> = {};
      if (empleadoIds.length > 0) {
        const { data: empleados } = await supabase
          .from('empleados')
          .select('id, nombre_completo')
          .in('id', empleadoIds);
        
        empleados?.forEach(emp => {
          empleadosMap[emp.id] = emp.nombre_completo;
        });
      }

      // Cargar entregas y carga para cada ruta
      const rutasConDetalles: RutaMonitoreo[] = await Promise.all(
        (rutasData || []).map(async (ruta) => {
          const { data: entregas } = await supabase
            .from('entregas')
            .select(`
              id, pedido_id, orden_entrega, status_entrega, hora_entrega_real, 
              motivo_rechazo, nombre_receptor,
              pedido:pedido_id (
                cliente:cliente_id (nombre),
                sucursal:sucursal_id (nombre, latitud, longitud)
              )
            `)
            .eq('ruta_id', ruta.id)
            .order('orden_entrega', { ascending: true });

          const entregaIds = (entregas || []).map(e => e.id);
          let carga: any[] = [];
          
          if (entregaIds.length > 0) {
            const { data: cargaData } = await supabase
              .from('carga_productos')
              .select('id, cargado, cargado_en, cantidad_solicitada, cantidad_cargada, entrega_id')
              .in('entrega_id', entregaIds);
            carga = cargaData || [];
          }

          return {
            ...ruta,
            chofer: ruta.chofer_id ? { id: ruta.chofer_id, full_name: empleadosMap[ruta.chofer_id] || 'Chofer desconocido' } : null,
            ayudante: ruta.ayudante_id ? { id: ruta.ayudante_id, full_name: empleadosMap[ruta.ayudante_id] || 'Ayudante desconocido' } : null,
            vehiculo: ruta.vehiculo as { id: string; nombre: string } | null,
            entregas: (entregas || []).map((e: any) => ({
              id: e.id,
              pedido_id: e.pedido_id,
              orden_entrega: e.orden_entrega,
              status_entrega: e.status_entrega || 'pendiente',
              hora_entrega_real: e.hora_entrega_real,
              motivo_rechazo: e.motivo_rechazo,
              nombre_receptor: e.nombre_receptor,
              cliente_nombre: e.pedido?.cliente?.nombre,
              sucursal_nombre: e.pedido?.sucursal?.nombre,
              latitud: e.pedido?.sucursal?.latitud,
              longitud: e.pedido?.sucursal?.longitud,
            })),
            carga_productos: carga,
          };
        })
      );

      setRutas(rutasConDetalles);
      setAlertas(calcularAlertas(rutasConDetalles));
      setEstadisticas(calcularEstadisticas(rutasConDetalles));
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error cargando rutas del día:', error);
    } finally {
      setLoading(false);
    }
  }, [calcularAlertas, calcularEstadisticas]);

  // Carga inicial
  useEffect(() => {
    cargarRutasDelDia();
  }, [cargarRutasDelDia]);

  // Suscripción realtime
  useEffect(() => {
    const channel = supabase
      .channel('monitoreo-rutas-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rutas' },
        () => {
          console.log('📡 Cambio en rutas detectado');
          cargarRutasDelDia();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'entregas' },
        () => {
          console.log('📡 Cambio en entregas detectado');
          cargarRutasDelDia();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'carga_productos' },
        () => {
          console.log('📡 Cambio en carga_productos detectado');
          cargarRutasDelDia();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cargarRutasDelDia]);

  // Actualizar alertas cada minuto
  useEffect(() => {
    const interval = setInterval(() => {
      setAlertas(calcularAlertas(rutas));
    }, 60000);

    return () => clearInterval(interval);
  }, [rutas, calcularAlertas]);

  return {
    rutas,
    alertas,
    estadisticas,
    loading,
    lastUpdate,
    refetch: cargarRutasDelDia,
  };
};
