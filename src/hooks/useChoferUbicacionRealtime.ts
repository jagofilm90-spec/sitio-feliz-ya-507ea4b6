import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UbicacionChofer {
  id: string;
  ruta_id: string;
  chofer_id: string;
  latitud: number;
  longitud: number;
  precision_metros: number | null;
  velocidad_kmh: number | null;
  heading: number | null;
  timestamp: string;
}

interface UseChoferUbicacionRealtimeOptions {
  rutaIds?: string[];
  enabled?: boolean;
}

export const useChoferUbicacionRealtime = ({ 
  rutaIds = [], 
  enabled = true 
}: UseChoferUbicacionRealtimeOptions = {}) => {
  const [ubicaciones, setUbicaciones] = useState<Map<string, UbicacionChofer>>(new Map());
  const [loading, setLoading] = useState(true);

  // Fetch initial locations
  const fetchUbicaciones = useCallback(async () => {
    if (!enabled) return;

    try {
      let query = supabase
        .from('chofer_ubicaciones')
        .select('*');

      if (rutaIds.length > 0) {
        query = query.in('ruta_id', rutaIds);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching locations:', error);
        return;
      }

      const ubicacionesMap = new Map<string, UbicacionChofer>();
      data?.forEach((ub) => {
        ubicacionesMap.set(ub.ruta_id, ub as UbicacionChofer);
      });
      setUbicaciones(ubicacionesMap);
    } catch (err) {
      console.error('Failed to fetch locations:', err);
    } finally {
      setLoading(false);
    }
  }, [rutaIds, enabled]);

  useEffect(() => {
    if (!enabled) return;

    fetchUbicaciones();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('chofer-ubicaciones-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chofer_ubicaciones',
        },
        (payload) => {
          console.log('Location update received:', payload);

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newUbicacion = payload.new as UbicacionChofer;
            // Only include if matches our filter or no filter
            if (rutaIds.length === 0 || rutaIds.includes(newUbicacion.ruta_id)) {
              setUbicaciones(prev => {
                const updated = new Map(prev);
                updated.set(newUbicacion.ruta_id, newUbicacion);
                return updated;
              });
            }
          } else if (payload.eventType === 'DELETE') {
            const oldUbicacion = payload.old as { ruta_id: string };
            setUbicaciones(prev => {
              const updated = new Map(prev);
              updated.delete(oldUbicacion.ruta_id);
              return updated;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, rutaIds, fetchUbicaciones]);

  // Get location for specific route
  const getUbicacionByRuta = useCallback((rutaId: string): UbicacionChofer | undefined => {
    return ubicaciones.get(rutaId);
  }, [ubicaciones]);

  // Check if location is stale (> 5 minutes old)
  const isLocationStale = useCallback((rutaId: string, staleThresholdMs = 5 * 60 * 1000): boolean => {
    const ubicacion = ubicaciones.get(rutaId);
    if (!ubicacion) return true;

    const lastUpdate = new Date(ubicacion.timestamp).getTime();
    return Date.now() - lastUpdate > staleThresholdMs;
  }, [ubicaciones]);

  return {
    ubicaciones,
    ubicacionesArray: Array.from(ubicaciones.values()),
    loading,
    getUbicacionByRuta,
    isLocationStale,
    refetch: fetchUbicaciones,
  };
};
