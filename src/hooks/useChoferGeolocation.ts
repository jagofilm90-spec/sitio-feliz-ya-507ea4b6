import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  startBackgroundTracking,
  stopBackgroundTracking,
  clearLocationFromDB,
  isNativePlatform,
  type GeolocationState as NativeGeolocationState,
} from '@/services/backgroundGeolocation';

interface GeolocationState {
  isTracking: boolean;
  lastPosition: GeolocationPosition | null;
  error: string | null;
  accuracy: number | null;
  isNative: boolean;
}

interface UseChoferGeolocationOptions {
  rutaId: string | null;
  choferId?: string | null;
  enabled?: boolean;
  updateInterval?: number; // ms between updates to DB
}

export const useChoferGeolocation = ({ 
  rutaId, 
  choferId: externalChoferId,
  enabled = true,
  updateInterval = 30000 // 30 seconds
}: UseChoferGeolocationOptions) => {
  const [state, setState] = useState<GeolocationState>({
    isTracking: false,
    lastPosition: null,
    error: null,
    accuracy: null,
    isNative: isNativePlatform(),
  });

  const watchIdRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const choferId = useRef<string | null>(externalChoferId || null);
  const isUsingNative = useRef<boolean>(false);

  // Fetch chofer ID on mount if not provided
  useEffect(() => {
    if (externalChoferId) {
      choferId.current = externalChoferId;
      return;
    }

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
  }, [externalChoferId]);

  // Update location in Supabase (for web fallback)
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
        console.log('Web location updated:', position.coords.latitude, position.coords.longitude);
      }
    } catch (err) {
      console.error('Failed to update location:', err);
    }
  }, [rutaId, updateInterval]);

  // Handle position update (web fallback)
  const handlePosition = useCallback((position: GeolocationPosition) => {
    setState(prev => ({
      ...prev,
      lastPosition: position,
      accuracy: position.coords.accuracy,
      error: null,
    }));
    updateLocation(position);
  }, [updateLocation]);

  // Handle geolocation error (web fallback)
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

  // Handle native state changes
  const handleNativeStateChange = useCallback((nativeState: NativeGeolocationState) => {
    setState(prev => ({
      ...prev,
      isTracking: nativeState.isTracking,
      accuracy: nativeState.accuracy,
      error: nativeState.error,
      // Convert native location to GeolocationPosition-like format
      lastPosition: nativeState.lastPosition ? {
        coords: {
          latitude: nativeState.lastPosition.latitude,
          longitude: nativeState.lastPosition.longitude,
          accuracy: nativeState.lastPosition.accuracy,
          altitude: nativeState.lastPosition.altitude,
          altitudeAccuracy: nativeState.lastPosition.altitudeAccuracy,
          heading: nativeState.lastPosition.bearing,
          speed: nativeState.lastPosition.speed,
        },
        timestamp: nativeState.lastPosition.time || Date.now(),
      } as GeolocationPosition : prev.lastPosition,
    }));
  }, []);

  // Start tracking (auto-selects native or web)
  const startTracking = useCallback(async () => {
    if (!rutaId || !choferId.current) {
      console.log('Cannot start tracking: missing rutaId or choferId');
      return;
    }

    // Try native tracking first on mobile devices
    if (Capacitor.isNativePlatform()) {
      console.log('Attempting native background tracking...');
      const nativeStarted = await startBackgroundTracking(
        rutaId,
        choferId.current,
        handleNativeStateChange
      );

      if (nativeStarted) {
        isUsingNative.current = true;
        setState(prev => ({ ...prev, isTracking: true, error: null, isNative: true }));
        console.log('Native background tracking started');
        return;
      }
    }

    // Fall back to web geolocation
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

    isUsingNative.current = false;
    setState(prev => ({ ...prev, isTracking: true, error: null, isNative: false }));
    console.log('Web GPS tracking started');
  }, [rutaId, handlePosition, handleError, handleNativeStateChange]);

  // Stop tracking
  const stopTracking = useCallback(async () => {
    // Stop native tracking
    if (isUsingNative.current) {
      await stopBackgroundTracking();
      isUsingNative.current = false;
    }

    // Stop web tracking
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setState(prev => ({ ...prev, isTracking: false }));
    console.log('GPS tracking stopped');
  }, []);

  // Auto start/stop based on enabled prop and rutaId
  useEffect(() => {
    if (enabled && rutaId && choferId.current) {
      startTracking();
    } else {
      stopTracking();
    }

    return () => {
      stopTracking();
    };
  }, [enabled, rutaId, startTracking, stopTracking]);

  // Update choferId ref when it changes externally
  useEffect(() => {
    if (externalChoferId) {
      choferId.current = externalChoferId;
    }
  }, [externalChoferId]);

  // Clean up location record when route is completed
  const clearLocation = useCallback(async () => {
    if (!rutaId) return;
    await clearLocationFromDB(rutaId);
  }, [rutaId]);

  return {
    ...state,
    startTracking,
    stopTracking,
    clearLocation,
  };
};
