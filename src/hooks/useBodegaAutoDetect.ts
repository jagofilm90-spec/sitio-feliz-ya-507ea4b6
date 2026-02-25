import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';

interface Bodega {
  id: string;
  nombre: string;
  latitud: number | null;
  longitud: number | null;
  radio_deteccion_metros: number | null;
  wifi_ssids: string[] | null;
}

export type MetodoDeteccion = 'wifi' | 'gps' | 'manual' | null;

interface BodegaDetectadaResult {
  bodega: { id: string; nombre: string } | null;
  distanciaMetros: number | null;
  metodoDeteccion: MetodoDeteccion;
  detectando: boolean;
  error: string | null;
  todasLasBodegas: Bodega[];
  reintentarDeteccion: () => void;
}

/**
 * Calculates the distance between two GPS coordinates using Haversine formula
 * @returns Distance in meters
 */
const calcularDistanciaMetros = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Attempts to get the current WiFi SSID using Capacitor plugin
 * Returns null if not available or not on native platform
 * 
 * NOTE: This requires the @capawesome-team/capacitor-wifi plugin to be installed
 * locally in the native project. Install with: npm install @capawesome-team/capacitor-wifi
 * Then run: npx cap sync
 */
const getWifiSSID = async (): Promise<string | null> => {
  // Only works on native platforms (iOS/Android)
  if (!Capacitor.isNativePlatform()) {
    console.log('[WiFi Detection] Not on native platform, skipping WiFi detection');
    return null;
  }

  try {
    // Use Function constructor to completely bypass TypeScript module resolution
    // This allows the code to work even when the plugin is not installed in Lovable
    // but will work correctly when the native app has the plugin installed
    const loadWifiPlugin = new Function(`
      return import('@capawesome-team/capacitor-wifi')
        .then(m => m.Wifi)
        .catch(() => null);
    `);
    
    const Wifi = await loadWifiPlugin();
    
    if (!Wifi) {
      console.log('[WiFi Detection] WiFi plugin not installed, skipping');
      return null;
    }
    
    // Get the current network SSID
    const result = await Wifi.getSSID();
    console.log('[WiFi Detection] Current SSID:', result?.ssid);
    return result?.ssid || null;
  } catch (error) {
    console.log('[WiFi Detection] Plugin not available or error:', error);
    return null;
  }
};

/**
 * Finds a bodega that matches the given WiFi SSID
 */
const findBodegaByWifi = (
  bodegas: Bodega[],
  currentSSID: string
): Bodega | null => {
  for (const bodega of bodegas) {
    if (bodega.wifi_ssids && bodega.wifi_ssids.length > 0) {
      // Check if current SSID matches any of the bodega's configured SSIDs
      if (bodega.wifi_ssids.includes(currentSSID)) {
        console.log(`[WiFi Detection] Match found: ${bodega.nombre} (SSID: ${currentSSID})`);
        return bodega;
      }
    }
  }
  return null;
};

export const useBodegaAutoDetect = (): BodegaDetectadaResult => {
  const [bodegaDetectada, setBodegaDetectada] = useState<{ id: string; nombre: string } | null>(null);
  const [distanciaMetros, setDistanciaMetros] = useState<number | null>(null);
  const [metodoDeteccion, setMetodoDeteccion] = useState<MetodoDeteccion>(null);
  const [detectando, setDetectando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todasLasBodegas, setTodasLasBodegas] = useState<Bodega[]>([]);

  const detectarPorGPS = useCallback((bodegas: Bodega[]) => {
    // Filter bodegas that have GPS coordinates configured
    const bodegasConGPS = bodegas.filter(
      (b) => b.latitud !== null && b.longitud !== null
    );

    if (bodegasConGPS.length === 0) {
      const sinGPS = bodegas
        .filter(b => b.latitud === null || b.longitud === null)
        .map(b => b.nombre);
      const nombres = sinGPS.length > 0 ? sinGPS.join(', ') : 'todas';
      setError(`Sin coordenadas GPS: ${nombres}. Configúralas en Ajustes → Bodegas.`);
      setMetodoDeteccion('manual');
      setDetectando(false);
      return;
    }

    if (!navigator.geolocation) {
      setError('Tu dispositivo no soporta geolocalización');
      setMetodoDeteccion('manual');
      setDetectando(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        // Calculate distance to each bodega and find the closest one within range
        let bodegaMasCercana: Bodega | null = null;
        let distanciaMasCercana = Infinity;

        for (const bodega of bodegasConGPS) {
          const distancia = calcularDistanciaMetros(
            latitude,
            longitude,
            bodega.latitud!,
            bodega.longitud!
          );

          const radioDeteccion = bodega.radio_deteccion_metros || 100;

          if (distancia <= radioDeteccion && distancia < distanciaMasCercana) {
            bodegaMasCercana = bodega;
            distanciaMasCercana = distancia;
          }
        }

        if (bodegaMasCercana) {
          setBodegaDetectada({
            id: bodegaMasCercana.id,
            nombre: bodegaMasCercana.nombre,
          });
          setDistanciaMetros(Math.round(distanciaMasCercana));
          setMetodoDeteccion('gps');
        } else {
          // Find the closest bodega even if outside range, for informational purposes
          let closestBodega: Bodega | null = null;
          let closestDistance = Infinity;

          for (const bodega of bodegasConGPS) {
            const distancia = calcularDistanciaMetros(
              latitude,
              longitude,
              bodega.latitud!,
              bodega.longitud!
            );

            if (distancia < closestDistance) {
              closestBodega = bodega;
              closestDistance = distancia;
            }
          }

          if (closestBodega) {
            setError(
              `Estás a ${Math.round(closestDistance)}m de ${closestBodega.nombre} (fuera del rango de ${closestBodega.radio_deteccion_metros || 100}m)`
            );
          } else {
            setError('No se encontró ninguna bodega cercana');
          }
          setMetodoDeteccion('manual');
        }

        setDetectando(false);
      },
      (geoError) => {
        let errorMsg = 'Error obteniendo ubicación';
        switch (geoError.code) {
          case geoError.PERMISSION_DENIED:
            errorMsg = 'Permiso de ubicación denegado. Activa la ubicación para detectar automáticamente.';
            break;
          case geoError.POSITION_UNAVAILABLE:
            errorMsg = 'Ubicación no disponible. Intenta nuevamente.';
            break;
          case geoError.TIMEOUT:
            errorMsg = 'Tiempo de espera agotado. Intenta nuevamente.';
            break;
        }
        setError(errorMsg);
        setMetodoDeteccion('manual');
        setDetectando(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  }, []);

  const detectarBodega = useCallback(async () => {
    setDetectando(true);
    setError(null);
    setBodegaDetectada(null);
    setDistanciaMetros(null);
    setMetodoDeteccion(null);

    try {
      // 1. Get all bodegas with coordinates and wifi_ssids
      const { data: bodegas, error: bodegasError } = await supabase
        .from('bodegas')
        .select('id, nombre, latitud, longitud, radio_deteccion_metros, wifi_ssids')
        .eq('activo', true);

      if (bodegasError) throw bodegasError;

      const bodegasList = (bodegas || []) as Bodega[];
      setTodasLasBodegas(bodegasList);

      // 2. Try WiFi detection first (only on native platforms)
      const currentSSID = await getWifiSSID();
      
      if (currentSSID) {
        const bodegaPorWifi = findBodegaByWifi(bodegasList, currentSSID);
        
        if (bodegaPorWifi) {
          setBodegaDetectada({
            id: bodegaPorWifi.id,
            nombre: bodegaPorWifi.nombre,
          });
          setMetodoDeteccion('wifi');
          setDetectando(false);
          return; // Success via WiFi, no need for GPS
        }
        
        console.log('[WiFi Detection] No matching bodega for SSID:', currentSSID);
      }

      // 3. Fallback to GPS detection
      console.log('[Detection] Falling back to GPS detection');
      detectarPorGPS(bodegasList);

    } catch (err) {
      console.error('Error en detección de bodega:', err);
      setError('Error al cargar bodegas');
      setMetodoDeteccion('manual');
      setDetectando(false);
    }
  }, [detectarPorGPS]);

  useEffect(() => {
    detectarBodega();
  }, [detectarBodega]);

  return {
    bodega: bodegaDetectada,
    distanciaMetros,
    metodoDeteccion,
    detectando,
    error,
    todasLasBodegas,
    reintentarDeteccion: detectarBodega,
  };
};
