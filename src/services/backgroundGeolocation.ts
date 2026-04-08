import { Capacitor, registerPlugin } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import type { BackgroundGeolocationPlugin, Location, WatcherOptions, CallbackError } from '@capacitor-community/background-geolocation';

// Register the plugin for native platforms
const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');

interface GeolocationState {
  isTracking: boolean;
  lastPosition: Location | null;
  error: string | null;
  accuracy: number | null;
  permissionStatus: 'granted' | 'denied' | 'prompt' | 'unknown';
}

type StateCallback = (state: GeolocationState) => void;

// Service state
let watcherId: string | null = null;
let currentRutaId: string | null = null;
let currentChoferId: string | null = null;
let lastUpdateTime = 0;
let stateCallback: StateCallback | null = null;

const UPDATE_INTERVAL_MS = 30000; // 30 seconds minimum between DB updates

/**
 * Check if current time is within the allowed tracking schedule:
 * - Monday to Friday: 8:00 AM - 8:00 PM
 * - Saturday: 8:00 AM - 6:00 PM
 * - Sunday: No tracking
 */
export const isWithinTrackingSchedule = (): boolean => {
  const now = new Date();
  const day = now.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
  const hour = now.getHours();

  if (day === 0) return false; // Sunday
  if (day === 6) return hour >= 8 && hour < 18; // Saturday 8am-6pm
  return hour >= 8 && hour < 20; // Mon-Fri 8am-8pm
};

// Update location in Supabase
const updateLocationInDB = async (location: Location): Promise<void> => {
  if (!currentRutaId || !currentChoferId) return;

  // Only save location during work hours
  if (!isWithinTrackingSchedule()) return;

  const now = Date.now();
  if (now - lastUpdateTime < UPDATE_INTERVAL_MS) return;
  lastUpdateTime = now;

  try {
    const { error } = await supabase
      .from('chofer_ubicaciones')
      .upsert({
        ruta_id: currentRutaId,
        chofer_id: currentChoferId,
        latitud: location.latitude,
        longitud: location.longitude,
        precision_metros: location.accuracy,
        velocidad_kmh: location.speed ? location.speed * 3.6 : null,
        heading: location.bearing,
        timestamp: new Date().toISOString(),
      }, { 
        onConflict: 'ruta_id' 
      });

    if (error) {
      console.error('Error updating location in DB:', error);
    } else {
      console.log('Background location updated:', location.latitude, location.longitude);
    }
  } catch (err) {
    console.error('Failed to update location:', err);
  }
};

// Notify state changes
const notifyStateChange = (partialState: Partial<GeolocationState>): void => {
  if (stateCallback) {
    const currentState: GeolocationState = {
      isTracking: watcherId !== null,
      lastPosition: null,
      error: null,
      accuracy: null,
      permissionStatus: 'unknown',
      ...partialState,
    };
    stateCallback(currentState);
  }
};

/**
 * Check if we're running on a native platform
 */
export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

/**
 * Request location permissions
 * Returns true if permissions are granted
 */
export const requestLocationPermissions = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) {
    // On web, use standard geolocation API
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => {
          notifyStateChange({ permissionStatus: 'granted' });
          resolve(true);
        },
        (error) => {
          const status = error.code === error.PERMISSION_DENIED ? 'denied' : 'prompt';
          notifyStateChange({ permissionStatus: status });
          resolve(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }

  // On native, the plugin will request permissions when we start watching
  // We can trigger a one-time request by starting and immediately stopping
  try {
    const testWatcherId = await BackgroundGeolocation.addWatcher(
      {
        requestPermissions: true,
        stale: true,
      },
      () => {} // Empty callback for permission test
    );
    
    await BackgroundGeolocation.removeWatcher({ id: testWatcherId });
    notifyStateChange({ permissionStatus: 'granted' });
    return true;
  } catch (error: any) {
    console.error('Permission request failed:', error);
    notifyStateChange({ permissionStatus: 'denied', error: error.message });
    return false;
  }
};

/**
 * Open device location settings
 */
export const openLocationSettings = async (): Promise<void> => {
  if (Capacitor.isNativePlatform()) {
    await BackgroundGeolocation.openSettings();
  }
};

/**
 * Start background geolocation tracking
 */
export const startBackgroundTracking = async (
  rutaId: string,
  choferId: string,
  onStateChange?: StateCallback
): Promise<boolean> => {
  if (watcherId) {
    console.log('Already tracking, stopping first');
    await stopBackgroundTracking();
  }

  currentRutaId = rutaId;
  currentChoferId = choferId;
  stateCallback = onStateChange || null;

  if (!Capacitor.isNativePlatform()) {
    console.log('Native plugin not available, falling back to web geolocation');
    return false; // Signal that caller should use web fallback
  }

  try {
    watcherId = await BackgroundGeolocation.addWatcher(
      {
        backgroundMessage: 'ALMASA-OS está compartiendo tu ubicación para el monitoreo de la ruta',
        backgroundTitle: 'Tracking de ruta activo',
        requestPermissions: true,
        stale: false,
        distanceFilter: 50, // meters between updates
      },
      (location, error) => {
        if (error) {
          console.error('Background geolocation error:', error);
          notifyStateChange({ 
            error: error.message,
            isTracking: true,
          });
          return;
        }

        if (location) {
          notifyStateChange({
            isTracking: true,
            lastPosition: location,
            accuracy: location.accuracy,
            error: null,
          });
          updateLocationInDB(location);
        }
      }
    );

    notifyStateChange({ isTracking: true, error: null });
    console.log('Background tracking started with watcher ID:', watcherId);
    return true;
  } catch (error: any) {
    console.error('Failed to start background tracking:', error);
    notifyStateChange({ 
      isTracking: false, 
      error: error.message || 'Error al iniciar tracking',
    });
    return false;
  }
};

/**
 * Stop background geolocation tracking
 */
export const stopBackgroundTracking = async (): Promise<void> => {
  if (!watcherId) {
    console.log('No active watcher to stop');
    return;
  }

  if (Capacitor.isNativePlatform()) {
    try {
      await BackgroundGeolocation.removeWatcher({ id: watcherId });
      console.log('Background tracking stopped');
    } catch (error) {
      console.error('Error stopping watcher:', error);
    }
  }

  watcherId = null;
  currentRutaId = null;
  currentChoferId = null;
  lastUpdateTime = 0;
  
  notifyStateChange({ isTracking: false, lastPosition: null, accuracy: null });
};

/**
 * Clear location record from database when route is completed
 */
export const clearLocationFromDB = async (rutaId: string): Promise<void> => {
  try {
    await supabase
      .from('chofer_ubicaciones')
      .delete()
      .eq('ruta_id', rutaId);
    console.log('Location record cleared for route:', rutaId);
  } catch (err) {
    console.error('Failed to clear location:', err);
  }
};

/**
 * Check if currently tracking
 */
export const isCurrentlyTracking = (): boolean => {
  return watcherId !== null;
};

// Re-export types for convenience
export type { Location, GeolocationState };
