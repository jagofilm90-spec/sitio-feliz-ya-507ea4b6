/**
 * Hook para cálculos de corredor de ruta "En Ruta"
 * Calcula qué sucursales quedan en el camino entre Bodega y destino (ancla)
 */

import { useMemo } from "react";

// Coordenadas de la Bodega principal (Melchor Campo #59)
export const BODEGA_COORDS = {
  lat: 19.408680,
  lng: -99.121084,
  nombre: "Bodega Principal"
};

// Desviación máxima permitida en km para considerar "en ruta"
export const MAX_DESVIACION_KM = 15;

export interface SucursalConRuta {
  id: string;
  nombre: string;
  direccion: string | null;
  latitud: number | null;
  longitud: number | null;
  telefono: string | null;
  cliente_id: string;
  cliente_nombre: string;
  zona_nombre: string | null;
  horario_entrega: string | null;
  // Campos calculados para modo "En Ruta"
  distanciaDesdeBodega?: number;
  distanciaHastaAncla?: number;
  desviacionKm?: number;
  enRuta?: boolean;
  tipoRuta?: 'ida' | 'regreso';
  tienePedidoPendiente?: boolean;
}

/**
 * Calcula la distancia en kilómetros entre dos puntos usando fórmula de Haversine
 */
export const calcularDistanciaKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Calcula la desviación de un punto respecto a la ruta directa origen-destino
 * Retorna cuántos km extra se recorren si se pasa por ese punto
 */
export const calcularDesviacionDeRuta = (
  origen: { lat: number; lng: number },
  destino: { lat: number; lng: number },
  punto: { lat: number; lng: number }
): { enRuta: boolean; desviacionKm: number } => {
  const distanciaDirecta = calcularDistanciaKm(origen.lat, origen.lng, destino.lat, destino.lng);
  const distanciaConPunto = calcularDistanciaKm(origen.lat, origen.lng, punto.lat, punto.lng) +
                            calcularDistanciaKm(punto.lat, punto.lng, destino.lat, destino.lng);
  const desviacionKm = distanciaConPunto - distanciaDirecta;
  return { 
    enRuta: desviacionKm <= MAX_DESVIACION_KM, 
    desviacionKm: Math.max(0, desviacionKm)
  };
};

/**
 * Hook para calcular sucursales en el corredor de ruta
 */
export const useEnRutaCalculations = (
  sucursales: SucursalConRuta[],
  anclaId: string | null,
  pedidosPendientesIds: Set<string>
) => {
  return useMemo(() => {
    if (!anclaId) {
      return {
        ancla: null,
        sucursalesIda: [],
        sucursalesRegreso: [],
        sucursalesFueraRuta: [],
        totalEnRuta: 0
      };
    }

    const ancla = sucursales.find(s => s.id === anclaId);
    if (!ancla || !ancla.latitud || !ancla.longitud) {
      return {
        ancla: null,
        sucursalesIda: [],
        sucursalesRegreso: [],
        sucursalesFueraRuta: [],
        totalEnRuta: 0
      };
    }

    const distanciaAncla = calcularDistanciaKm(
      BODEGA_COORDS.lat, BODEGA_COORDS.lng,
      ancla.latitud, ancla.longitud
    );

    const otrasConCoordenadas = sucursales.filter(s => 
      s.id !== anclaId && s.latitud && s.longitud
    );

    const sucursalesConCalculo = otrasConCoordenadas.map(s => {
      const distanciaDesdeBodega = calcularDistanciaKm(
        BODEGA_COORDS.lat, BODEGA_COORDS.lng,
        s.latitud!, s.longitud!
      );
      const distanciaHastaAncla = calcularDistanciaKm(
        s.latitud!, s.longitud!,
        ancla.latitud!, ancla.longitud!
      );

      // Calcular desviación desde ruta Bodega → Ancla
      const devIda = calcularDesviacionDeRuta(
        BODEGA_COORDS,
        { lat: ancla.latitud!, lng: ancla.longitud! },
        { lat: s.latitud!, lng: s.longitud! }
      );

      // Calcular desviación desde ruta Ancla → Bodega (regreso)
      const devRegreso = calcularDesviacionDeRuta(
        { lat: ancla.latitud!, lng: ancla.longitud! },
        BODEGA_COORDS,
        { lat: s.latitud!, lng: s.longitud! }
      );

      // Determinar si está en ida (más cerca de bodega) o regreso (más cerca de ancla)
      const esIda = distanciaDesdeBodega < distanciaAncla * 0.7;
      const esRegreso = distanciaHastaAncla < distanciaAncla * 0.7;

      // Usar la desviación menor (ida o regreso)
      const desviacionKm = Math.min(devIda.desviacionKm, devRegreso.desviacionKm);
      const enRuta = desviacionKm <= MAX_DESVIACION_KM;

      let tipoRuta: 'ida' | 'regreso' = 'ida';
      if (enRuta) {
        if (esIda && !esRegreso) {
          tipoRuta = 'ida';
        } else if (esRegreso && !esIda) {
          tipoRuta = 'regreso';
        } else {
          // En medio o ambiguo - usar distancia relativa
          tipoRuta = distanciaDesdeBodega <= distanciaHastaAncla ? 'ida' : 'regreso';
        }
      }

      return {
        ...s,
        distanciaDesdeBodega,
        distanciaHastaAncla,
        desviacionKm,
        enRuta,
        tipoRuta,
        tienePedidoPendiente: pedidosPendientesIds.has(s.id)
      } as SucursalConRuta;
    });

    // Separar en categorías
    const enRuta = sucursalesConCalculo.filter(s => s.enRuta);
    const fueraRuta = sucursalesConCalculo.filter(s => !s.enRuta);

    const sucursalesIda = enRuta
      .filter(s => s.tipoRuta === 'ida')
      .sort((a, b) => (a.distanciaDesdeBodega || 0) - (b.distanciaDesdeBodega || 0));

    const sucursalesRegreso = enRuta
      .filter(s => s.tipoRuta === 'regreso')
      .sort((a, b) => (b.distanciaHastaAncla || 0) - (a.distanciaHastaAncla || 0));

    const sucursalesFueraRuta = fueraRuta.sort((a, b) => 
      (a.desviacionKm || 0) - (b.desviacionKm || 0)
    );

    return {
      ancla: {
        ...ancla,
        distanciaDesdeBodega: distanciaAncla,
        tienePedidoPendiente: pedidosPendientesIds.has(ancla.id)
      } as SucursalConRuta,
      sucursalesIda,
      sucursalesRegreso,
      sucursalesFueraRuta,
      totalEnRuta: enRuta.length
    };
  }, [sucursales, anclaId, pedidosPendientesIds]);
};
