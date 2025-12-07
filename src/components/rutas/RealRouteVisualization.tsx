import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { GoogleMap, DirectionsRenderer, Marker } from "@react-google-maps/api";
import { useGoogleMapsLoader } from "@/hooks/useGoogleMapsLoader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  MapPin, 
  Clock, 
  Navigation2, 
  AlertCircle,
  AlertTriangle,
  Route,
  X
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface RealRoutePoint {
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

interface RealRouteVisualizationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  puntos: RealRoutePoint[];
  vehiculoNombre: string;
  color?: string;
}

// Map container style
const containerStyle = {
  width: "100%",
  height: "100%",
};

// Default center (CDMX - Bodega Principal)
const BODEGA_PRINCIPAL = {
  lat: 19.408680,
  lng: -99.121084,
};

// Map options - defined without google.maps types
const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
};

export const RealRouteVisualization = ({
  open,
  onOpenChange,
  puntos,
  vehiculoNombre,
  color = "#3b82f6",
}: RealRouteVisualizationProps) => {
  const { isLoaded, loadError, hasApiKey } = useGoogleMapsLoader();
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [routeStats, setRouteStats] = useState<{
    distanceKm: number;
    durationMinutes: number;
  } | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  // Filter points with valid coordinates
  const validPoints = puntos.filter(p => p.lat && p.lng);
  
  // Identify points missing coordinates
  const missingCoords = puntos.filter(p => !p.lat || !p.lng);

  // Calculate route when dialog opens
  useEffect(() => {
    if (open && isLoaded && validPoints.length > 0 && !directions) {
      calculateRoute();
    }
  }, [open, isLoaded, validPoints.length]);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setDirections(null);
      setRouteStats(null);
      setError(null);
    }
  }, [open]);

  const calculateRoute = async () => {
    if (!isLoaded || validPoints.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const directionsService = new google.maps.DirectionsService();

      // Google Directions API has a limit of 25 waypoints (23 intermediate + origin + destination)
      // For routes with more points, we need to make multiple calls
      const MAX_WAYPOINTS = 23;
      
      if (validPoints.length <= MAX_WAYPOINTS) {
        // Single request for routes within limit
        const waypoints = validPoints.slice(0, -1).map(p => ({
          location: { lat: p.lat!, lng: p.lng! },
          stopover: true,
        }));

        const lastPoint = validPoints[validPoints.length - 1];

        const result = await directionsService.route({
          origin: BODEGA_PRINCIPAL,
          destination: { lat: lastPoint.lat!, lng: lastPoint.lng! },
          waypoints,
          travelMode: google.maps.TravelMode.DRIVING,
          optimizeWaypoints: false, // Keep AI-defined order
          region: "mx",
        });

        setDirections(result);

        // Calculate total distance and duration
        const legs = result.routes[0].legs;
        const totalDistance = legs.reduce((sum, leg) => sum + (leg.distance?.value || 0), 0);
        const totalDuration = legs.reduce((sum, leg) => sum + (leg.duration?.value || 0), 0);

        setRouteStats({
          distanceKm: totalDistance / 1000,
          durationMinutes: totalDuration / 60,
        });
      } else {
        // For routes with more than 23 waypoints, we need to segment
        // For now, just use the first 23 waypoints and show a warning
        const limitedPoints = validPoints.slice(0, MAX_WAYPOINTS);
        const waypoints = limitedPoints.slice(0, -1).map(p => ({
          location: { lat: p.lat!, lng: p.lng! },
          stopover: true,
        }));

        const lastPoint = limitedPoints[limitedPoints.length - 1];

        const result = await directionsService.route({
          origin: BODEGA_PRINCIPAL,
          destination: { lat: lastPoint.lat!, lng: lastPoint.lng! },
          waypoints,
          travelMode: google.maps.TravelMode.DRIVING,
          optimizeWaypoints: false,
          region: "mx",
        });

        setDirections(result);

        const legs = result.routes[0].legs;
        const totalDistance = legs.reduce((sum, leg) => sum + (leg.distance?.value || 0), 0);
        const totalDuration = legs.reduce((sum, leg) => sum + (leg.duration?.value || 0), 0);

        setRouteStats({
          distanceKm: totalDistance / 1000,
          durationMinutes: totalDuration / 60,
        });

        setError(`Mostrando primeros ${MAX_WAYPOINTS} puntos. La ruta tiene ${validPoints.length} entregas en total.`);
      }
    } catch (err: any) {
      console.error("Error calculating route:", err);
      setError(err.message || "Error al calcular la ruta");
    } finally {
      setLoading(false);
    }
  };

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours === 0) return `${mins} min`;
    return `${hours}h ${mins}min`;
  };

  // Create warehouse marker icon - only when Google Maps is loaded
  const warehouseIcon = useMemo(() => {
    if (!isLoaded) return undefined;
    return {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 12,
      fillColor: "#000000",
      fillOpacity: 1,
      strokeColor: "#ffffff",
      strokeWeight: 3,
    };
  }, [isLoaded]);

  if (!hasApiKey) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Ruta Real - {vehiculoNombre}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                API de Google Maps no configurada
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Route className="h-5 w-5" style={{ color }} />
            Ruta Real - {vehiculoNombre}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col gap-4">
          {/* Route Stats */}
          {routeStats && (
            <div className="grid grid-cols-3 gap-3">
              <Card className="bg-primary/10 border-primary/20">
                <CardContent className="p-3 text-center">
                  <Navigation2 className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <p className="text-xl font-bold">{routeStats.distanceKm.toFixed(1)} km</p>
                  <p className="text-xs text-muted-foreground">Distancia real</p>
                </CardContent>
              </Card>
              <Card className="bg-orange-500/10 border-orange-500/20">
                <CardContent className="p-3 text-center">
                  <Clock className="h-5 w-5 mx-auto mb-1 text-orange-600" />
                  <p className="text-xl font-bold">{formatDuration(routeStats.durationMinutes)}</p>
                  <p className="text-xs text-muted-foreground">Tiempo de manejo</p>
                </CardContent>
              </Card>
              <Card className={`${missingCoords.length > 0 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-green-500/10 border-green-500/20'}`}>
                <CardContent className="p-3 text-center">
                  <MapPin className={`h-5 w-5 mx-auto mb-1 ${missingCoords.length > 0 ? 'text-amber-600' : 'text-green-600'}`} />
                  <p className="text-xl font-bold">
                    {validPoints.length} {missingCoords.length > 0 && <span className="text-muted-foreground font-normal">de {puntos.length}</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {missingCoords.length > 0 ? 'Entregas con ubicación' : 'Entregas'}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Time estimate including deliveries */}
          {routeStats && (
            <div className="flex items-center justify-between px-3 py-2 bg-muted rounded-lg text-sm">
              <span className="text-muted-foreground">Tiempo total estimado (con entregas):</span>
              <span className="font-semibold">
                {formatDuration(routeStats.durationMinutes + (validPoints.length * 25))}
              </span>
            </div>
          )}

          {/* Warning for missing coordinates */}
          {missingCoords.length > 0 && (
            <div className="flex items-start gap-3 px-4 py-3 bg-amber-500/15 border border-amber-500/30 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-amber-700 dark:text-amber-400">
                  {missingCoords.length} pedido(s) sin coordenadas GPS
                </p>
                <p className="text-sm text-amber-600 dark:text-amber-500">
                  Estos pedidos no aparecen en el mapa. Necesitan geocodificación:
                </p>
                <ul className="text-sm text-amber-600 dark:text-amber-500 mt-1 list-disc list-inside max-h-20 overflow-y-auto">
                  {missingCoords.map(p => (
                    <li key={p.id} className="truncate">
                      {p.cliente} - {p.sucursal || p.direccion || 'Sin dirección'}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm text-yellow-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Map */}
          <div className="flex-1 min-h-0 rounded-lg overflow-hidden border">
            {loadError ? (
              <div className="flex items-center justify-center h-full bg-muted">
                <div className="text-center">
                  <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
                  <p className="text-sm text-destructive">Error cargando Google Maps</p>
                </div>
              </div>
            ) : !isLoaded ? (
              <div className="flex items-center justify-center h-full bg-muted">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Cargando mapa...</span>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center h-full bg-muted">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Calculando ruta real...</span>
              </div>
            ) : (
              <GoogleMap
                mapContainerStyle={containerStyle}
                center={BODEGA_PRINCIPAL}
                zoom={11}
                onLoad={onMapLoad}
                options={mapOptions}
              >
                {/* Warehouse marker */}
                <Marker
                  position={BODEGA_PRINCIPAL}
                  icon={warehouseIcon}
                  title="Bodega Principal"
                  zIndex={1000}
                />

                {/* Directions renderer */}
                {directions && (
                  <DirectionsRenderer
                    directions={directions}
                    options={{
                      suppressMarkers: false,
                      polylineOptions: {
                        strokeColor: color,
                        strokeOpacity: 0.8,
                        strokeWeight: 5,
                      },
                      markerOptions: {
                        zIndex: 100,
                      },
                    }}
                  />
                )}
              </GoogleMap>
            )}
          </div>

          {/* Delivery list */}
          <div className="flex-shrink-0 max-h-32 overflow-y-auto border rounded-lg divide-y">
            {validPoints.map((punto, idx) => (
              <div key={punto.id} className="p-2 flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="secondary" 
                    className="w-6 h-6 flex items-center justify-center p-0"
                    style={{ backgroundColor: color, color: "white" }}
                  >
                    {idx + 1}
                  </Badge>
                  <div>
                    <p className="font-medium">{punto.cliente}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-xs">
                      {punto.sucursal || punto.direccion}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {punto.peso_kg.toLocaleString()} kg
                </span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 flex-shrink-0">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4 mr-2" />
              Cerrar
            </Button>
            {directions && (
              <Button
                onClick={() => {
                  // Open Google Maps with the full route
                  const waypointsParam = validPoints
                    .map(p => `${p.lat},${p.lng}`)
                    .join("|");
                  const url = `https://www.google.com/maps/dir/?api=1&origin=${BODEGA_PRINCIPAL.lat},${BODEGA_PRINCIPAL.lng}&destination=${validPoints[validPoints.length - 1].lat},${validPoints[validPoints.length - 1].lng}&waypoints=${waypointsParam}&travelmode=driving`;
                  window.open(url, "_blank");
                }}
              >
                <Navigation2 className="h-4 w-4 mr-2" />
                Abrir en Google Maps
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RealRouteVisualization;
