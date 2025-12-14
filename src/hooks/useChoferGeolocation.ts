import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GeolocationState {
  isTracking: boolean;
  lastPosition: GeolocationPosition | null;
  error: string | null;
  accuracy: number | null;
}

interface UseChoferGeolocationOptions {
  rutaId: string | null;
  enabled?: boolean;
  updateInterval?: number; // ms between updates to DB
}

export const useChoferGeolocation = ({ 
  rutaId, 
  enabled = true,
  updateInterval = 30000 // 30 seconds
}: UseChoferGeolocationOptions) => {
  const [state, setState] = useState<GeolocationState>({
    isTracking: false,
    lastPosition: null,
    error: null,
    accuracy: null,
  });

  const watchIdRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const choferId = useRef<string | null>(null);

  // Fetch chofer ID on mount
  useEffect(() => {
    const fetchChoferId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: empleado } = await supabase
        .from('empleados')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (empleado) {
        choferId.current = empleado.id;
      }
    };

    fetchChoferId();
  }, []);

  // Update location in Supabase
  const updateLocation = useCallback(async (position: GeolocationPosition) => {
    if (!rutaId || !choferId.current) return;

    const now = Date.now();
    if (now - lastUpdateRef.current < updateInterval) return;
    lastUpdateRef.current = now;

    try {
      const { error } = await supabase
        .from('chofer_ubicaciones')
        .upsert({
          ruta_id: rutaId,
          chofer_id: choferId.current,
          latitud: position.coords.latitude,
          longitud: position.coords.longitude,
          precision_metros: position.coords.accuracy,
          velocidad_kmh: position.coords.speed ? position.coords.speed * 3.6 : null,
          heading: position.coords.heading,
          timestamp: new Date().toISOString(),
        }, { 
          onConflict: 'ruta_id' 
        });

      if (error) {
        console.error('Error updating location:', error);
      } else {
        console.log('Location updated:', position.coords.latitude, position.coords.longitude);
      }
    } catch (err) {
      console.error('Failed to update location:', err);
    }
  }, [rutaId, updateInterval]);

  // Handle position update
  const handlePosition = useCallback((position: GeolocationPosition) => {
    setState(prev => ({
      ...prev,
      lastPosition: position,
      accuracy: position.coords.accuracy,
      error: null,
    }));
    updateLocation(position);
  }, [updateLocation]);

  // Handle geolocation error
  const handleError = useCallback((error: GeolocationPositionError) => {
    let errorMessage = 'Error de ubicación';
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Permiso de ubicación denegado';
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Ubicación no disponible';
        break;
      case error.TIMEOUT:
        errorMessage = 'Tiempo de espera agotado';
        break;
    }
    setState(prev => ({ ...prev, error: errorMessage }));
    console.error('Geolocation error:', errorMessage);
  }, []);

  // Start tracking
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setState(prev => ({ ...prev, error: 'Geolocalización no soportada' }));
      toast.error('Tu dispositivo no soporta geolocalización');
      return;
    }

    if (watchIdRef.current !== null) return; // Already tracking

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 10000,
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      handleError,
      options
    );

    setState(prev => ({ ...prev, isTracking: true, error: null }));
    console.log('Started GPS tracking');
  }, [handlePosition, handleError]);

  // Stop tracking
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setState(prev => ({ ...prev, isTracking: false }));
    console.log('Stopped GPS tracking');
  }, []);

  // Auto start/stop based on enabled prop and rutaId
  useEffect(() => {
    if (enabled && rutaId) {
      startTracking();
    } else {
      stopTracking();
    }

    return () => {
      stopTracking();
    };
  }, [enabled, rutaId, startTracking, stopTracking]);

  // Clean up location record when route is completed
  const clearLocation = useCallback(async () => {
    if (!rutaId) return;

    try {
      await supabase
        .from('chofer_ubicaciones')
        .delete()
        .eq('ruta_id', rutaId);
    } catch (err) {
      console.error('Failed to clear location:', err);
    }
  }, [rutaId]);

  return {
    ...state,
    startTracking,
    stopTracking,
    clearLocation,
  };
};
