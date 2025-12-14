import { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Polyline, Circle } from '@react-google-maps/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Truck, Navigation, Clock, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useChoferUbicacionRealtime, type UbicacionChofer } from '@/hooks/useChoferUbicacionRealtime';
import type { RutaMonitoreo, EntregaMonitoreo } from '@/hooks/useMonitoreoRutas';

// Warehouse location
const BODEGA_LOCATION = { lat: 19.4326, lng: -99.1332 }; // Default CDMX, should come from config

interface MapaRutaEnVivoProps {
  ruta: RutaMonitoreo;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const containerStyle = {
  width: '100%',
  height: '500px',
};

export const MapaRutaEnVivo = ({ ruta, open, onOpenChange }: MapaRutaEnVivoProps) => {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  });

  const mapRef = useRef<any>(null);
  const { getUbicacionByRuta, isLocationStale, refetch } = useChoferUbicacionRealtime({
    rutaIds: [ruta.id],
    enabled: open,
  });

  const ubicacionChofer = getUbicacionByRuta(ruta.id);
  const locationStale = ubicacionChofer ? isLocationStale(ruta.id) : true;

  // Calculate map center
  const getMapCenter = useCallback(() => {
    if (ubicacionChofer) {
      return { lat: Number(ubicacionChofer.latitud), lng: Number(ubicacionChofer.longitud) };
    }
    
    // Center on first pending delivery or bodega
    const pendingEntrega = ruta.entregas.find(e => e.status_entrega === 'pendiente');
    if (pendingEntrega?.latitud && pendingEntrega?.longitud) {
      return { lat: pendingEntrega.latitud, lng: pendingEntrega.longitud };
    }

    return BODEGA_LOCATION;
  }, [ubicacionChofer, ruta.entregas]);

  const [mapCenter, setMapCenter] = useState(getMapCenter);

  useEffect(() => {
    setMapCenter(getMapCenter());
  }, [getMapCenter]);

  // Fit bounds to include all points
  const onMapLoad = useCallback((map: any) => {
    mapRef.current = map;

    if (!window.google || !window.google.maps) return;

    const bounds = new window.google.maps.LatLngBounds();
    
    // Add bodega
    bounds.extend(BODEGA_LOCATION);

    // Add all entregas
    ruta.entregas.forEach(entrega => {
      if (entrega.latitud && entrega.longitud) {
        bounds.extend({ lat: entrega.latitud, lng: entrega.longitud });
      }
    });

    // Add chofer location
    if (ubicacionChofer) {
      bounds.extend({ 
        lat: Number(ubicacionChofer.latitud), 
        lng: Number(ubicacionChofer.longitud) 
      });
    }

    map.fitBounds(bounds, { padding: 50 });
  }, [ruta.entregas, ubicacionChofer]);

  // Get marker color based on delivery status
  const getEntregaMarkerIcon = (entrega: EntregaMonitoreo) => {
    if (!window.google) return undefined;

    const colors: Record<string, string> = {
      entregado: '#22c55e', // green
      completo: '#22c55e',
      rechazado: '#ef4444', // red
      parcial: '#f59e0b', // yellow
      pendiente: '#3b82f6', // blue
    };

    const color = colors[entrega.status_entrega || 'pendiente'] || '#6b7280';

    return {
      path: window.google.maps.SymbolPath.CIRCLE,
      fillColor: color,
      fillOpacity: 1,
      strokeWeight: 2,
      strokeColor: '#ffffff',
      scale: 10,
    };
  };

  // Create polyline path
  const getRoutePath = useCallback(() => {
    const path = [BODEGA_LOCATION];
    
    // Add entregas sorted by orden
    const sortedEntregas = [...ruta.entregas]
      .filter(e => e.latitud && e.longitud)
      .sort((a, b) => a.orden_entrega - b.orden_entrega);

    sortedEntregas.forEach(entrega => {
      if (entrega.latitud && entrega.longitud) {
        path.push({ lat: entrega.latitud, lng: entrega.longitud });
      }
    });

    // Return to bodega
    if (path.length > 1) {
      path.push(BODEGA_LOCATION);
    }

    return path;
  }, [ruta.entregas]);

  if (loadError) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Error de Mapa</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MapPin className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No se pudo cargar el mapa</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5 text-primary" />
              Mapa en Vivo - {ruta.folio}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {ubicacionChofer && (
                <Badge 
                  variant={locationStale ? 'secondary' : 'default'} 
                  className={!locationStale ? 'bg-green-600' : ''}
                >
                  <div className={`w-2 h-2 rounded-full mr-1 ${locationStale ? 'bg-gray-400' : 'bg-green-300 animate-pulse'}`} />
                  GPS {locationStale ? 'Inactivo' : 'Activo'}
                </Badge>
              )}
              <Button variant="ghost" size="icon" onClick={refetch}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Map */}
          {!isLoaded ? (
            <Skeleton className="w-full h-[500px] rounded-lg" />
          ) : (
            <div className="rounded-lg overflow-hidden border">
              <GoogleMap
                mapContainerStyle={containerStyle}
                center={mapCenter}
                zoom={12}
                onLoad={onMapLoad}
                options={{
                  streetViewControl: false,
                  mapTypeControl: false,
                  fullscreenControl: true,
                }}
              >
                {/* Bodega marker */}
                <Marker
                  position={BODEGA_LOCATION}
                  icon={{
                    url: 'data:image/svg+xml,' + encodeURIComponent(`
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1e40af" stroke-width="2">
                        <path d="M3 21h18M9 8h1M14 8h1M9 12h1M14 12h1M9 16h1M14 16h1M4 21V6l8-3 8 3v15"/>
                      </svg>
                    `),
                    scaledSize: new window.google.maps.Size(32, 32),
                    anchor: new window.google.maps.Point(16, 32),
                  }}
                  title="Bodega"
                />

                {/* Route polyline */}
                <Polyline
                  path={getRoutePath()}
                  options={{
                    strokeColor: '#3b82f6',
                    strokeOpacity: 0.6,
                    strokeWeight: 3,
                    geodesic: true,
                  }}
                />

                {/* Entrega markers */}
                {ruta.entregas.map((entrega, idx) => (
                  entrega.latitud && entrega.longitud && (
                    <Marker
                      key={entrega.id}
                      position={{ lat: entrega.latitud, lng: entrega.longitud }}
                      icon={getEntregaMarkerIcon(entrega)}
                      label={{
                        text: String(entrega.orden_entrega),
                        color: '#ffffff',
                        fontSize: '10px',
                        fontWeight: 'bold',
                      }}
                      title={`${entrega.orden_entrega}. ${entrega.cliente_nombre || 'Entrega'}`}
                    />
                  )
                ))}

                {/* Chofer marker (truck) */}
                {ubicacionChofer && (
                  <>
                    {/* Accuracy circle */}
                    {ubicacionChofer.precision_metros && (
                      <Circle
                        center={{ 
                          lat: Number(ubicacionChofer.latitud), 
                          lng: Number(ubicacionChofer.longitud) 
                        }}
                        radius={ubicacionChofer.precision_metros}
                        options={{
                          fillColor: '#22c55e',
                          fillOpacity: 0.1,
                          strokeColor: '#22c55e',
                          strokeOpacity: 0.3,
                          strokeWeight: 1,
                        }}
                      />
                    )}
                    
                    {/* Truck marker */}
                    <Marker
                      position={{ 
                        lat: Number(ubicacionChofer.latitud), 
                        lng: Number(ubicacionChofer.longitud) 
                      }}
                      icon={{
                        url: 'data:image/svg+xml,' + encodeURIComponent(`
                          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="#22c55e" stroke="#ffffff" stroke-width="1.5">
                            <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
                            <path d="M15 18H9"/>
                            <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
                            <circle cx="17" cy="18" r="2"/>
                            <circle cx="7" cy="18" r="2"/>
                          </svg>
                        `),
                        scaledSize: new window.google.maps.Size(40, 40),
                        anchor: new window.google.maps.Point(20, 20),
                      }}
                      title={`${ruta.chofer?.full_name || 'Chofer'} - ${ruta.vehiculo?.nombre || 'Vehículo'}`}
                      zIndex={1000}
                    />
                  </>
                )}
              </GoogleMap>
            </div>
          )}

          {/* Footer info */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Truck className="h-4 w-4" />
                {ruta.vehiculo?.nombre || 'Sin vehículo'}
              </span>
              <span>|</span>
              <span>{ruta.chofer?.full_name || 'Sin chofer'}</span>
            </div>
            {ubicacionChofer && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>
                  Última ubicación: {formatDistanceToNow(new Date(ubicacionChofer.timestamp), { 
                    addSuffix: true, 
                    locale: es 
                  })}
                </span>
                {ubicacionChofer.precision_metros && (
                  <span className="text-xs">
                    (±{Math.round(ubicacionChofer.precision_metros)}m)
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              Pendiente
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              Entregado
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              Parcial
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              Rechazado
            </span>
            <span className="flex items-center gap-1">
              <Truck className="h-3 w-3 text-green-500" />
              Chofer
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
