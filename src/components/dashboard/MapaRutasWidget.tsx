import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { LiveIndicator } from '@/components/ui/live-indicator';
import { useMonitoreoRutas } from '@/hooks/useMonitoreoRutas';
import { useChoferUbicacionRealtime } from '@/hooks/useChoferUbicacionRealtime';
import { Map, MapPin, Truck, ExternalLink, Navigation } from 'lucide-react';
import { cn } from '@/lib/utils';

const GOOGLE_MAPS_API_KEY = 'AIzaSyDwpPCnrLGHoVphMN-7zowNxvWi9jS4EpM';

const mapContainerStyle = {
  width: '100%',
  height: '280px',
  borderRadius: '0.5rem',
};

// Bodega principal coordinates (default center)
const BODEGA_LOCATION = { lat: 19.4326, lng: -99.1332 };

interface RutaEnMapa {
  id: string;
  folio: string;
  choferNombre: string;
  vehiculoNombre: string;
  ubicacion: { lat: number; lng: number } | null;
  ubicacionStale: boolean;
  progreso: number;
  entregasCompletadas: number;
  entregasTotales: number;
  status: string;
}

const getMarkerColor = (progreso: number, tieneGPS: boolean, stale: boolean): string => {
  if (!tieneGPS || stale) return '#9ca3af'; // gris - sin GPS
  if (progreso >= 71) return '#22c55e'; // verde
  if (progreso >= 31) return '#f59e0b'; // amarillo
  return '#ef4444'; // rojo
};

const getProgressLabel = (progreso: number): string => {
  if (progreso >= 71) return '71-100%';
  if (progreso >= 31) return '31-70%';
  return '0-30%';
};

export const MapaRutasWidget = () => {
  const navigate = useNavigate();
  const [selectedRuta, setSelectedRuta] = useState<RutaEnMapa | null>(null);
  const [mapRef, setMapRef] = useState<any>(null);

  const { rutas, loading: rutasLoading, lastUpdate } = useMonitoreoRutas();
  
  // Filter active routes
  const rutasActivas = useMemo(() => 
    rutas.filter(r => r.status === 'en_curso' || r.status === 'programada'),
    [rutas]
  );

  const rutaIds = useMemo(() => rutasActivas.map(r => r.id), [rutasActivas]);
  
  const { ubicaciones, isLocationStale } = useChoferUbicacionRealtime({ 
    rutaIds, 
    enabled: rutaIds.length > 0 
  });

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    id: 'dashboard-routes-map',
  });

  // Combine route data with GPS locations
  const rutasEnMapa: RutaEnMapa[] = useMemo(() => {
    return rutasActivas.map(ruta => {
      const ubicacion = ubicaciones.get(ruta.id);
      const entregasCompletadas = ruta.entregas.filter(
        e => e.status_entrega === 'entregado' || e.status_entrega === 'completo'
      ).length;
      const entregasTotales = ruta.entregas.length;
      const progreso = entregasTotales > 0 
        ? Math.round((entregasCompletadas / entregasTotales) * 100) 
        : 0;

      return {
        id: ruta.id,
        folio: ruta.folio,
        choferNombre: ruta.chofer?.full_name || 'Sin chofer',
        vehiculoNombre: ruta.vehiculo?.nombre || 'Sin vehículo',
        ubicacion: ubicacion ? { lat: ubicacion.latitud, lng: ubicacion.longitud } : null,
        ubicacionStale: isLocationStale(ruta.id),
        progreso,
        entregasCompletadas,
        entregasTotales,
        status: ruta.status,
      };
    });
  }, [rutasActivas, ubicaciones, isLocationStale]);

  // Calculate stats
  const stats = useMemo(() => {
    const conGPS = rutasEnMapa.filter(r => r.ubicacion && !r.ubicacionStale).length;
    const sinGPS = rutasEnMapa.length - conGPS;
    const totalEntregas = rutasEnMapa.reduce((sum, r) => sum + r.entregasTotales, 0);
    const completadas = rutasEnMapa.reduce((sum, r) => sum + r.entregasCompletadas, 0);
    
    return { conGPS, sinGPS, totalEntregas, completadas };
  }, [rutasEnMapa]);

  const onMapLoad = useCallback((map: any) => {
    setMapRef(map);
    
    // Fit bounds to include all markers
    if (window.google?.maps && rutasEnMapa.some(r => r.ubicacion)) {
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend(BODEGA_LOCATION);
      rutasEnMapa.forEach(r => {
        if (r.ubicacion) bounds.extend(r.ubicacion);
      });
      map.fitBounds(bounds, { padding: 50 });
    }
  }, [rutasEnMapa]);

  const handleMarkerClick = (ruta: RutaEnMapa) => {
    setSelectedRuta(ruta);
  };

  const formatLastUpdate = () => {
    const mins = Math.floor((Date.now() - lastUpdate.getTime()) / 60000);
    if (mins < 1) return 'ahora';
    return `hace ${mins} min`;
  };

  // Loading state
  if (rutasLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[280px] w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  // No active routes
  if (rutasActivas.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Map className="h-5 w-5 text-primary" />
              Rutas en Vivo
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Truck className="h-12 w-12 mb-3 opacity-40" />
            <p className="font-medium">No hay rutas activas hoy</p>
            <p className="text-sm">Las rutas aparecerán aquí cuando inicien</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Map load error - show fallback
  if (loadError || !isLoaded) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Map className="h-5 w-5 text-primary" />
              Rutas Activas
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/rutas?tab=monitoreo')}
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Ver más
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground mb-4">
            <MapPin className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Mapa no disponible</p>
          </div>
          
          {/* Fallback list */}
          <div className="space-y-2">
            {rutasEnMapa.slice(0, 5).map(ruta => (
              <div 
                key={ruta.id} 
                className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getMarkerColor(ruta.progreso, !!ruta.ubicacion, ruta.ubicacionStale) }}
                  />
                  <div>
                    <span className="font-medium text-sm">{ruta.folio}</span>
                    <span className="text-xs text-muted-foreground ml-2">{ruta.choferNombre}</span>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {ruta.entregasCompletadas}/{ruta.entregasTotales}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Map className="h-5 w-5 text-primary" />
            Rutas en Vivo
          </CardTitle>
          <div className="flex items-center gap-3">
            <LiveIndicator size="sm" />
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/rutas?tab=monitoreo')}
              className="text-xs"
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Expandir
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Map */}
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={BODEGA_LOCATION}
          zoom={11}
          onLoad={onMapLoad}
          options={{
            disableDefaultUI: true,
            zoomControl: true,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            styles: [
              { featureType: 'poi', stylers: [{ visibility: 'off' }] },
              { featureType: 'transit', stylers: [{ visibility: 'off' }] },
            ],
          }}
        >
          {/* Bodega marker */}
          <Marker
            position={BODEGA_LOCATION}
            icon={{
              url: `data:image/svg+xml,${encodeURIComponent(`
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#3b82f6" stroke="#fff" stroke-width="2">
                  <path d="M3 21h18"/>
                  <path d="M5 21V7l8-4v18"/>
                  <path d="M19 21V11l-6-4"/>
                  <path d="M9 9v.01"/>
                  <path d="M9 12v.01"/>
                  <path d="M9 15v.01"/>
                  <path d="M9 18v.01"/>
                </svg>
              `)}`,
              scaledSize: window.google?.maps ? new window.google.maps.Size(32, 32) : undefined,
              anchor: window.google?.maps ? new window.google.maps.Point(16, 32) : undefined,
            }}
            title="Bodega Principal"
          />

          {/* Route markers */}
          {rutasEnMapa.map(ruta => {
            if (!ruta.ubicacion) return null;
            
            const color = getMarkerColor(ruta.progreso, true, ruta.ubicacionStale);
            
            return (
              <Marker
                key={ruta.id}
                position={ruta.ubicacion}
                onClick={() => handleMarkerClick(ruta)}
                icon={{
                  url: `data:image/svg+xml,${encodeURIComponent(`
                    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="${color}" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
                      <path d="M15 18H9"/>
                      <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
                      <circle cx="17" cy="18" r="2"/>
                      <circle cx="7" cy="18" r="2"/>
                    </svg>
                  `)}`,
                  scaledSize: window.google?.maps ? new window.google.maps.Size(36, 36) : undefined,
                  anchor: window.google?.maps ? new window.google.maps.Point(18, 18) : undefined,
                }}
                title={`${ruta.folio} - ${ruta.choferNombre}`}
              />
            );
          })}

          {/* InfoWindow for selected route */}
          {selectedRuta && selectedRuta.ubicacion && (
            <InfoWindow
              position={selectedRuta.ubicacion}
              onCloseClick={() => setSelectedRuta(null)}
            >
              <div className="p-1 min-w-[160px]">
                <div className="font-bold text-sm text-gray-900">{selectedRuta.folio}</div>
                <div className="text-xs text-gray-600 mt-1">
                  <div className="flex items-center gap-1">
                    <Navigation className="h-3 w-3" />
                    {selectedRuta.choferNombre}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Truck className="h-3 w-3" />
                    {selectedRuta.vehiculoNombre}
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs font-medium">Progreso:</span>
                  <Badge 
                    className="text-xs"
                    style={{ backgroundColor: getMarkerColor(selectedRuta.progreso, true, false) }}
                  >
                    {selectedRuta.entregasCompletadas}/{selectedRuta.entregasTotales}
                  </Badge>
                </div>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>

        {/* Legend and stats */}
        <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground border-t pt-3">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> 0-30%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> 31-70%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500" /> 71-100%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-400" /> Sin GPS
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1 sm:mt-0">
            <span>{rutasEnMapa.length} rutas</span>
            <span>•</span>
            <span>{stats.completadas}/{stats.totalEntregas} entregas</span>
            <span>•</span>
            <span>Act. {formatLastUpdate()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
