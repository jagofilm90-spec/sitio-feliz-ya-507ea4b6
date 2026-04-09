/**
 * ==========================================================
 * ⚠️ COMPONENTE SENSIBLE - REGLAS DE GOOGLE MAPS
 * ==========================================================
 * 
 * 🔒 REGLA 1: NUNCA usar google.maps.* como tipo en:
 *    - useState<google.maps.X>
 *    - useRef<google.maps.X>
 *    - Parámetros de callbacks (map: google.maps.Map)
 *    USAR: any o tipos de @react-google-maps/api
 * 
 * 🔒 REGLA 2: SIEMPRE verificar antes de usar google.maps:
 *    if (!window.google || !window.google.maps) return;
 * 
 * 🔒 REGLA 3: Si el mapa falla, mostrar fallback visual,
 *    NUNCA dejar pantalla blanca.
 * 
 * 🔒 REGLA 4: Validar preview antes de hacer cambios.
 * 
 * ¿Por qué? Los tipos google.maps.* se evalúan en runtime
 * ANTES de que cargue la API, causando:
 * ReferenceError: google is not defined
 * que rompe TODA la aplicación.
 * 
 * Última actualización: 2025-12-08
 * ==========================================================
 */

import { useState, useEffect, useCallback } from "react";
import { GoogleMap, useJsApiLoader, Marker, DirectionsRenderer, InfoWindow } from "@react-google-maps/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, MapPin, Navigation, Clock, Route, ExternalLink, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ErrorBoundaryModule } from "@/components/ErrorBoundaryModule";

interface DeliveryPoint {
  id: string;
  folio: string;
  cliente: string;
  sucursal?: string;
  direccion: string;
  peso_kg: number;
  orden: number;
  lat?: number;
  lng?: number;
}

interface RouteMapVisualizationProps {
  puntos: DeliveryPoint[];
  vehiculoNombre: string;
  optimizarOrden?: boolean;
  onOrderOptimized?: (newOrder: string[]) => void;
}

const COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280"
];

// Warehouse location
const WAREHOUSE = { lat: 19.408680132961802, lng: -99.12108443546356 };

const mapContainerStyle = {
  width: "100%",
  height: "350px",
};

/**
 * Fallback cuando Google Maps no puede cargar
 */
const RouteFallback = ({ 
  puntos, 
  vehiculoNombre,
  errorMessage 
}: { 
  puntos: DeliveryPoint[];
  vehiculoNombre: string;
  errorMessage?: string;
}) => {
  const getNavigationUrl = (punto: DeliveryPoint) => {
    if (punto.lat && punto.lng) {
      return `https://www.google.com/maps/dir/?api=1&destination=${punto.lat},${punto.lng}`;
    }
    if (punto.direccion) {
      return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(punto.direccion)}`;
    }
    return null;
  };

  const getViewUrl = (punto: DeliveryPoint) => {
    if (punto.lat && punto.lng) {
      return `https://www.google.com/maps/search/?api=1&query=${punto.lat},${punto.lng}`;
    }
    if (punto.direccion) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(punto.direccion)}`;
    }
    return null;
  };

  // Generate full route URL
  const getFullRouteUrl = () => {
    const validPoints = puntos.filter(p => p.lat && p.lng);
    if (validPoints.length === 0) return null;

    const origin = `${WAREHOUSE.lat},${WAREHOUSE.lng}`;
    const destination = origin; // Round trip
    const waypoints = validPoints.map(p => `${p.lat},${p.lng}`).join('|');

    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`;
  };

  const fullRouteUrl = getFullRouteUrl();
  const totalPeso = puntos.reduce((sum, p) => sum + p.peso_kg, 0);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{vehiculoNombre} • {puntos.length} entregas • {totalPeso.toLocaleString()} kg</span>
      </div>

      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>No se pudo cargar el mapa</AlertTitle>
        <AlertDescription className="text-sm">
          {errorMessage || "Verifica la API key o la conexión."}{" "}
          Puedes usar los links para navegar con Google Maps.
        </AlertDescription>
      </Alert>

      {/* Delivery list */}
      <Card className="p-3">
        <div className="flex items-center gap-2 mb-3">
          <Route className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Entregas en orden</span>
        </div>
        <ScrollArea className="h-[300px]">
          <div className="space-y-2">
            {puntos.map((punto, index) => {
              const navUrl = getNavigationUrl(punto);
              const viewUrl = getViewUrl(punto);
              
              return (
                <div
                  key={punto.id}
                  className="flex items-start gap-2 p-2 rounded bg-muted/50"
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{punto.cliente}</p>
                    {punto.sucursal && (
                      <p className="text-xs text-muted-foreground truncate">{punto.sucursal}</p>
                    )}
                    <p className="text-xs text-muted-foreground truncate">{punto.direccion}</p>
                    <p className="text-xs text-muted-foreground">{punto.peso_kg.toLocaleString()} kg</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {viewUrl && (
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => window.open(viewUrl, "_blank")}
                        title="Ver en mapa"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                    {navUrl && (
                      <Button
                        variant="default"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => window.open(navUrl, "_blank")}
                        title="Navegar"
                      >
                        <Navigation className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </Card>

      {/* Full route button */}
      {fullRouteUrl && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => window.open(fullRouteUrl, "_blank")}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Abrir ruta completa en Google Maps
        </Button>
      )}
    </div>
  );
};

/**
 * Contenido principal del mapa
 */
const RouteMapContent = ({
  puntos,
  vehiculoNombre,
  optimizarOrden = false,
  onOrderOptimized,
}: RouteMapVisualizationProps) => {
  const [geocodedPoints, setGeocodedPoints] = useState<DeliveryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [directions, setDirections] = useState<any>(null);
  const [selectedPoint, setSelectedPoint] = useState<DeliveryPoint | null>(null);
  const [routeInfo, setRouteInfo] = useState<{
    distance: number;
    duration: number;
    formattedDuration: string;
  } | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
  });

  // Geocode addresses
  const geocodeAddresses = useCallback(async () => {
    if (!puntos.length) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const pointsWithCoords = puntos.filter(p => p.lat && p.lng);
      const pointsNeedingGeocode = puntos.filter(p => p.direccion && !p.lat && !p.lng);

      if (pointsNeedingGeocode.length === 0) {
        setGeocodedPoints(puntos);
        return;
      }

      const addressesToGeocode = pointsNeedingGeocode.map(p => ({ id: p.id, address: p.direccion }));

      const { data, error: fnError } = await supabase.functions.invoke("geocode-addresses", {
        body: { addresses: addressesToGeocode },
      });

      if (fnError) throw fnError;

      const geocodeMap = new Map((data.results || []).map((r: { id: string; lat: number | null; lng: number | null }) => [r.id, r]));

      const updatedPoints = puntos.map(p => {
        if (p.lat && p.lng) return p;
        const geocoded = geocodeMap.get(p.id) as { lat: number | null; lng: number | null } | undefined;
        if (geocoded && geocoded.lat && geocoded.lng) {
          return { ...p, lat: geocoded.lat, lng: geocoded.lng };
        }
        return p;
      });

      setGeocodedPoints(updatedPoints);
    } catch (err) {
      console.error("Geocoding error:", err);
      setError("Error obteniendo ubicaciones");
    } finally {
      setLoading(false);
    }
  }, [puntos]);

  // Fetch directions
  const fetchDirections = useCallback(async () => {
    const validPoints = geocodedPoints.filter(p => p.lat && p.lng);
    // 🔒 Guard: verificar que Google Maps API esté cargada
    if (validPoints.length < 1 || !isLoaded || !window.google || !window.google.maps) return;

    try {
      const directionsService = new window.google.maps.DirectionsService();

      const origin = WAREHOUSE;
      const destination = WAREHOUSE;
      const waypoints = validPoints.map(p => ({
        location: new window.google.maps.LatLng(p.lat!, p.lng!),
        stopover: true,
      }));

      const result = await directionsService.route({
        origin,
        destination,
        waypoints,
        optimizeWaypoints: optimizarOrden,
        travelMode: window.google.maps.TravelMode.DRIVING,
      });

      setDirections(result);

      const route = result.routes[0];
      if (route) {
        let totalDistance = 0;
        let totalDuration = 0;
        route.legs.forEach((leg: any) => {
          totalDistance += leg.distance?.value || 0;
          totalDuration += leg.duration?.value || 0;
        });

        const hours = Math.floor(totalDuration / 3600);
        const minutes = Math.floor((totalDuration % 3600) / 60);
        const formattedDuration = hours > 0 ? `${hours}h ${minutes}min` : `${minutes} min`;

        setRouteInfo({
          distance: Math.round(totalDistance / 100) / 10,
          duration: totalDuration,
          formattedDuration,
        });

        if (optimizarOrden && route.waypoint_order && onOrderOptimized) {
          const newOrder = route.waypoint_order.map((i: number) => validPoints[i].id);
          onOrderOptimized(newOrder);
        }
      }
    } catch (err) {
      console.error("Directions error:", err);
      calculateSimpleDistance(validPoints);
    }
  }, [geocodedPoints, isLoaded, optimizarOrden, onOrderOptimized]);

  // Fallback distance calculation
  const calculateSimpleDistance = (points: DeliveryPoint[]) => {
    if (points.length < 1) return;

    let totalDistance = 0;
    let prevPoint = WAREHOUSE;

    points.forEach(p => {
      if (p.lat && p.lng) {
        totalDistance += haversineDistance(prevPoint.lat, prevPoint.lng, p.lat, p.lng);
        prevPoint = { lat: p.lat, lng: p.lng };
      }
    });

    totalDistance += haversineDistance(prevPoint.lat, prevPoint.lng, WAREHOUSE.lat, WAREHOUSE.lng);

    const estimatedDuration = (totalDistance / 25) * 60 + points.length * 15;
    const hours = Math.floor(estimatedDuration / 60);
    const minutes = Math.round(estimatedDuration % 60);

    setRouteInfo({
      distance: Math.round(totalDistance * 10) / 10,
      duration: estimatedDuration * 60,
      formattedDuration: hours > 0 ? `${hours}h ${minutes}min` : `${minutes} min`,
    });
  };

  const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  useEffect(() => {
    geocodeAddresses();
  }, [geocodeAddresses]);

  useEffect(() => {
    if (geocodedPoints.length > 0 && isLoaded) {
      fetchDirections();
    }
  }, [geocodedPoints, isLoaded, fetchDirections]);

  const getNavigationUrl = (point: DeliveryPoint) => {
    if (point.lat && point.lng) {
      return `https://www.google.com/maps/dir/?api=1&destination=${point.lat},${point.lng}`;
    }
    return null;
  };

  const getFullRouteUrl = () => {
    const validPoints = geocodedPoints.filter(p => p.lat && p.lng);
    if (validPoints.length === 0) return null;

    const origin = `${WAREHOUSE.lat},${WAREHOUSE.lng}`;
    const destination = origin;
    const waypoints = validPoints.map(p => `${p.lat},${p.lng}`).join('|');

    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`;
  };

  if (loading) {
    return (
      <div className="h-[350px] flex items-center justify-center bg-muted rounded-lg">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span className="text-sm text-muted-foreground">Obteniendo ubicaciones...</span>
      </div>
    );
  }

  // 🔒 FALLBACK: Si hay error de carga, mostrar lista con links
  if (error || loadError) {
    return (
      <RouteFallback
        puntos={geocodedPoints.length > 0 ? geocodedPoints : puntos}
        vehiculoNombre={vehiculoNombre}
        errorMessage={error || loadError?.message}
      />
    );
  }

  const validPoints = geocodedPoints.filter(p => p.lat && p.lng);
  const invalidCount = geocodedPoints.filter(p => !p.lat || !p.lng).length;
  const fullRouteUrl = getFullRouteUrl();

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{vehiculoNombre} • {validPoints.length} entregas</span>
        {invalidCount > 0 && (
          <Badge variant="outline" className="text-orange-600">
            {invalidCount} sin coordenadas
          </Badge>
        )}
      </div>

      {/* Map */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card className="lg:col-span-2 overflow-hidden">
          {!isLoaded ? (
            <div className="h-[350px] flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={validPoints.length > 0 ? { lat: validPoints[0].lat!, lng: validPoints[0].lng! } : WAREHOUSE}
              zoom={12}
              options={{
                streetViewControl: false,
                mapTypeControl: false,
              }}
            >
              {/* Warehouse marker */}
              {window.google && window.google.maps && (
                <Marker
                  position={WAREHOUSE}
                  icon={{
                    url: "data:image/svg+xml," + encodeURIComponent(`
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" fill="#000000" stroke="#ffffff" stroke-width="2"/>
                      </svg>
                    `),
                    scaledSize: new window.google.maps.Size(24, 24),
                    anchor: new window.google.maps.Point(12, 12),
                  }}
                  title="Bodega Principal"
                />
              )}

              {/* Directions renderer */}
              {directions && (
                <DirectionsRenderer
                  directions={directions}
                  options={{
                    suppressMarkers: true,
                    polylineOptions: {
                      strokeColor: "#3b82f6",
                      strokeWeight: 4,
                      strokeOpacity: 0.8,
                    },
                  }}
                />
              )}

              {/* Delivery point markers */}
              {validPoints.map((punto, index) => (
                window.google && window.google.maps && (
                  <Marker
                    key={punto.id}
                    position={{ lat: punto.lat!, lng: punto.lng! }}
                    label={{
                      text: String(index + 1),
                      color: "#ffffff",
                      fontWeight: "bold",
                    }}
                    icon={{
                      url: "data:image/svg+xml," + encodeURIComponent(`
                        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="48" viewBox="0 0 24 32">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="${COLORS[index % COLORS.length]}" stroke="#ffffff" stroke-width="1.5"/>
                        </svg>
                      `),
                      scaledSize: new window.google.maps.Size(36, 48),
                      anchor: new window.google.maps.Point(18, 48),
                      labelOrigin: new window.google.maps.Point(18, 14),
                    }}
                    onClick={() => setSelectedPoint(punto)}
                  />
                )
              ))}

              {/* InfoWindow */}
              {selectedPoint && selectedPoint.lat && selectedPoint.lng && (
                <InfoWindow
                  position={{ lat: selectedPoint.lat, lng: selectedPoint.lng }}
                  onCloseClick={() => setSelectedPoint(null)}
                >
                  <div className="p-2 min-w-[180px]">
                    <h3 className="font-semibold text-sm">{selectedPoint.cliente}</h3>
                    {selectedPoint.sucursal && (
                      <p className="text-xs text-gray-600">{selectedPoint.sucursal}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">{selectedPoint.direccion}</p>
                    <p className="text-xs text-gray-500 mt-1">{selectedPoint.peso_kg.toLocaleString()} kg</p>
                    <Button
                      size="sm"
                      className="mt-2 w-full"
                      onClick={() => {
                        const url = getNavigationUrl(selectedPoint);
                        if (url) window.open(url, "_blank");
                      }}
                    >
                      <Navigation className="h-3 w-3 mr-1" />
                      Navegar
                    </Button>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          )}
        </Card>

        {/* Delivery list */}
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-3">
            <Route className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Entregas</span>
          </div>
          <ScrollArea className="h-[280px]">
            <div className="space-y-2">
              {geocodedPoints.map((punto, index) => (
                <div
                  key={punto.id}
                  className={`flex items-start gap-2 p-2 rounded text-sm ${
                    punto.lat && punto.lng ? "bg-muted/50" : "bg-orange-50"
                  }`}
                >
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{punto.cliente}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {punto.sucursal || punto.folio}
                    </p>
                    <p className="text-xs text-muted-foreground">{punto.peso_kg.toLocaleString()} kg</p>
                  </div>
                  {punto.lat && punto.lng && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 flex-shrink-0"
                      onClick={() => {
                        const url = getNavigationUrl(punto);
                        if (url) window.open(url, "_blank");
                      }}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      </div>

      {/* Stats and actions */}
      <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
        <div className="flex gap-6 text-sm">
          {routeInfo && (
            <>
              <div className="flex items-center gap-2">
                <Route className="h-4 w-4 text-muted-foreground" />
                <span>
                  <span className="font-medium">{routeInfo.distance} km</span>
                  <span className="text-muted-foreground ml-1">distancia</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  <span className="font-medium">{routeInfo.formattedDuration}</span>
                  <span className="text-muted-foreground ml-1">estimado</span>
                </span>
              </div>
            </>
          )}
        </div>

        {fullRouteUrl && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(fullRouteUrl, "_blank")}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Abrir en Google Maps
          </Button>
        )}
      </div>
    </div>
  );
};

/**
 * Componente principal envuelto en ErrorBoundary
 */
export const RouteMapVisualization = (props: RouteMapVisualizationProps) => {
  return (
    <ErrorBoundaryModule 
      moduleName="Mapa de Ruta"
      fallback={
        <RouteFallback
          puntos={props.puntos}
          vehiculoNombre={props.vehiculoNombre}
          errorMessage="Error inesperado al cargar el componente de mapa."
        />
      }
    >
      <RouteMapContent {...props} />
    </ErrorBoundaryModule>
  );
};
