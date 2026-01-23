import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Bodega {
  id: string;
  nombre: string;
  latitud: number | null;
  longitud: number | null;
  radio_deteccion_metros: number | null;
}

interface BodegaDetectada {
  bodega: { id: string; nombre: string } | null;
  distanciaMetros: number | null;
  detectando: boolean;
  error: string | null;
  todasLasBodegas: Bodega[];
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

export const useBodegaAutoDetect = () => {
  const [bodegaDetectada, setBodegaDetectada] = useState<{ id: string; nombre: string } | null>(null);
  const [distanciaMetros, setDistanciaMetros] = useState<number | null>(null);
  const [detectando, setDetectando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todasLasBodegas, setTodasLasBodegas] = useState<Bodega[]>([]);

  const detectarBodega = useCallback(async () => {
    setDetectando(true);
    setError(null);
    setBodegaDetectada(null);
    setDistanciaMetros(null);

    try {
      // 1. Get all bodegas with coordinates
      const { data: bodegas, error: bodegasError } = await supabase
        .from('bodegas')
        .select('id, nombre, latitud, longitud, radio_deteccion_metros')
        .eq('activo', true);

      if (bodegasError) throw bodegasError;

      setTodasLasBodegas(bodegas || []);

      // Filter bodegas that have GPS coordinates configured
      const bodegasConGPS = (bodegas || []).filter(
        (b) => b.latitud !== null && b.longitud !== null
      );

      if (bodegasConGPS.length === 0) {
        setError('No hay bodegas con coordenadas GPS configuradas');
        setDetectando(false);
        return;
      }

      // 2. Get current GPS position
      if (!navigator.geolocation) {
        setError('Tu dispositivo no soporta geolocalización');
        setDetectando(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;

          // 3. Calculate distance to each bodega and find the closest one within range
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
          setDetectando(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000,
        }
      );
    } catch (err) {
      console.error('Error en detección de bodega:', err);
      setError('Error al cargar bodegas');
      setDetectando(false);
    }
  }, []);

  useEffect(() => {
    detectarBodega();
  }, [detectarBodega]);

  return {
    bodega: bodegaDetectada,
    distanciaMetros,
    detectando,
    error,
    todasLasBodegas,
    reintentarDeteccion: detectarBodega,
  } as BodegaDetectada & { reintentarDeteccion: () => void };
};
