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
  X,
  Home,
  Sparkles,
  Check
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

interface RouteStats {
  distanceKm: number;
  durationMinutes: number;
}

interface GoogleOptimizedStats extends RouteStats {
  waypointOrder: number[];
}

interface RealRouteVisualizationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  puntos: RealRoutePoint[];
  vehiculoNombre: string;
  color?: string;
  onOrderSelected?: (orderType: 'ai' | 'google', points: RealRoutePoint[]) => void;
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
  onOrderSelected,
}: RealRouteVisualizationProps) => {
  const { isLoaded, loadError, hasApiKey } = useGoogleMapsLoader();
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // State for AI vs Google comparison
  const [useGoogleOptimization, setUseGoogleOptimization] = useState(true);
  const [aiRouteStats, setAiRouteStats] = useState<RouteStats | null>(null);
  const [googleRouteStats, setGoogleRouteStats] = useState<GoogleOptimizedStats | null>(null);
  const [aiDirections, setAiDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [googleDirections, setGoogleDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [googleOptimizedPoints, setGoogleOptimizedPoints] = useState<RealRoutePoint[]>([]);
  
  const mapRef = useRef<google.maps.Map | null>(null);

  // Filter points with valid coordinates
  const validPoints = useMemo(() => puntos.filter(p => p.lat && p.lng), [puntos]);
  
  // Identify points missing coordinates
  const missingCoords = useMemo(() => puntos.filter(p => !p.lat || !p.lng), [puntos]);

  // Current displayed points based on selected mode
  const displayedPoints = useMemo(() => {
    return useGoogleOptimization && googleOptimizedPoints.length > 0 
      ? googleOptimizedPoints 
      : validPoints;
  }, [useGoogleOptimization, googleOptimizedPoints, validPoints]);

  // Calculate routes function wrapped in useCallback
  const calculateBothRoutes = useCallback(async () => {
    if (!isLoaded || validPoints.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const directionsService = new google.maps.DirectionsService();
      
      // Build waypoints (max 23 for Google Directions API)
      const waypoints = validPoints.slice(0, 23).map(point => ({
        location: new google.maps.LatLng(point.lat!, point.lng!),
        stopover: true,
      }));

      const origin = new google.maps.LatLng(BODEGA_PRINCIPAL.lat, BODEGA_PRINCIPAL.lng);
      const destination = origin; // Round trip back to warehouse

      // 1. Calculate AI order route (no optimization)
      const aiResult = await directionsService.route({
        origin,
        destination,
        waypoints,
        optimizeWaypoints: false, // Keep AI order
        travelMode: google.maps.TravelMode.DRIVING,
        region: "mx",
      });

      const aiRoute = aiResult.routes[0];
      let aiDistanceM = 0;
      let aiDurationS = 0;
      
      aiRoute.legs.forEach(leg => {
        aiDistanceM += leg.distance?.value || 0;
        aiDurationS += leg.duration?.value || 0;
      });

      setAiRouteStats({
        distanceKm: aiDistanceM / 1000,
        durationMinutes: aiDurationS / 60,
      });
      setAiDirections(aiResult);

      // 2. Calculate Google optimized route
      const googleResult = await directionsService.route({
        origin,
        destination,
        waypoints,
        optimizeWaypoints: true, // Let Google optimize
        travelMode: google.maps.TravelMode.DRIVING,
        region: "mx",
      });

      const googleRoute = googleResult.routes[0];
      let googleDistanceM = 0;
      let googleDurationS = 0;
      
      googleRoute.legs.forEach(leg => {
        googleDistanceM += leg.distance?.value || 0;
        googleDurationS += leg.duration?.value || 0;
      });

      const waypointOrder = googleRoute.waypoint_order || [];
      
      // Reorder points according to Google's optimization
      const reorderedPoints = waypointOrder.map((originalIndex, newOrder) => ({
        ...validPoints[originalIndex],
        orden: newOrder + 1,
      }));

      setGoogleRouteStats({
        distanceKm: googleDistanceM / 1000,
        durationMinutes: googleDurationS / 60,
        waypointOrder,
      });
      setGoogleDirections(googleResult);
      setGoogleOptimizedPoints(reorderedPoints);
      
      // Default to showing Google optimized route
      setDirections(googleResult);
      setUseGoogleOptimization(true);
    } catch (err: any) {
      console.error("Error calculating routes:", err);
      setError(err.message || "Error al calcular la ruta");
    } finally {
      setLoading(false);
    }
  }, [isLoaded, validPoints]);

  // Calculate route when dialog opens
  useEffect(() => {
    if (open && isLoaded && validPoints.length > 0 && !aiRouteStats) {
      calculateBothRoutes();
    }
  }, [open, isLoaded, validPoints, aiRouteStats, calculateBothRoutes]);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setDirections(null);
      setAiRouteStats(null);
      setGoogleRouteStats(null);
      setAiDirections(null);
      setGoogleDirections(null);
      setGoogleOptimizedPoints([]);
      setError(null);
      setUseGoogleOptimization(true);
    }
  }, [open]);

  // Update displayed directions when mode changes
  useEffect(() => {
    if (useGoogleOptimization && googleDirections) {
      setDirections(googleDirections);
    } else if (!useGoogleOptimization && aiDirections) {
      setDirections(aiDirections);
    }
  }, [useGoogleOptimization, aiDirections, googleDirections]);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours === 0) return `${mins} min`;
    return `${hours}h ${mins}min`;
  };

  // Calculate savings
  const savingsKm = useMemo(() => {
    if (!aiRouteStats || !googleRouteStats) return 0;
    return aiRouteStats.distanceKm - googleRouteStats.distanceKm;
  }, [aiRouteStats, googleRouteStats]);

  const savingsPercent = useMemo(() => {
    if (!aiRouteStats || !googleRouteStats || aiRouteStats.distanceKm === 0) return 0;
    return ((aiRouteStats.distanceKm - googleRouteStats.distanceKm) / aiRouteStats.distanceKm) * 100;
  }, [aiRouteStats, googleRouteStats]);

  const savingsMinutes = useMemo(() => {
    if (!aiRouteStats || !googleRouteStats) return 0;
    return aiRouteStats.durationMinutes - googleRouteStats.durationMinutes;
  }, [aiRouteStats, googleRouteStats]);

  const handleModeChange = (mode: 'ai' | 'google') => {
    setUseGoogleOptimization(mode === 'google');
  };

  const handleConfirmOrder = () => {
    const selectedPoints = useGoogleOptimization ? googleOptimizedPoints : validPoints;
    onOrderSelected?.(useGoogleOptimization ? 'google' : 'ai', selectedPoints);
    onOpenChange(false);
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

  // Current stats based on mode
  const currentStats = useGoogleOptimization ? googleRouteStats : aiRouteStats;

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
          {/* AI vs Google Comparison Cards */}
          {aiRouteStats && googleRouteStats && (
            <div className="grid grid-cols-2 gap-3">
              {/* AI Order Card */}
              <Card 
                className={`cursor-pointer transition-all ${
                  !useGoogleOptimization 
                    ? 'ring-2 ring-primary bg-primary/5' 
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => handleModeChange('ai')}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium">Orden AI</span>
                    </div>
                    {!useGoogleOptimization && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <p className="text-xl font-bold">{aiRouteStats.distanceKm.toFixed(1)} km</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDuration(aiRouteStats.durationMinutes)} de manejo
                  </p>
                </CardContent>
              </Card>

              {/* Google Optimized Card */}
              <Card 
                className={`cursor-pointer transition-all ${
                  useGoogleOptimization 
                    ? 'ring-2 ring-green-500 bg-green-500/5' 
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => handleModeChange('google')}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Navigation2 className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">Google Optimizado</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge className="bg-green-500 text-white text-xs">Recomendado</Badge>
                      {useGoogleOptimization && (
                        <Check className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                  </div>
                  <p className="text-xl font-bold text-green-600">
                    {googleRouteStats.distanceKm.toFixed(1)} km
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDuration(googleRouteStats.durationMinutes)} de manejo
                  </p>
                  {savingsKm > 0 && (
                    <div className="flex gap-1 mt-2">
                      <Badge variant="outline" className="text-green-600 border-green-500 text-xs">
                        -{savingsKm.toFixed(1)} km
                      </Badge>
                      <Badge variant="outline" className="text-green-600 border-green-500 text-xs">
                        -{savingsPercent.toFixed(0)}%
                      </Badge>
                      {savingsMinutes > 0 && (
                        <Badge variant="outline" className="text-green-600 border-green-500 text-xs">
                          -{Math.round(savingsMinutes)} min
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Current Route Stats */}
          {currentStats && (
            <div className="grid grid-cols-3 gap-3">
              <Card className="bg-primary/10 border-primary/20">
                <CardContent className="p-3 text-center">
                  <Navigation2 className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <p className="text-xl font-bold">{currentStats.distanceKm.toFixed(1)} km</p>
                  <p className="text-xs text-muted-foreground">Distancia total (ida y vuelta)</p>
                </CardContent>
              </Card>
              <Card className="bg-orange-500/10 border-orange-500/20">
                <CardContent className="p-3 text-center">
                  <Clock className="h-5 w-5 mx-auto mb-1 text-orange-600" />
                  <p className="text-xl font-bold">{formatDuration(currentStats.durationMinutes)}</p>
                  <p className="text-xs text-muted-foreground">Tiempo de manejo (ida y vuelta)</p>
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

          {/* Circuit info banner */}
          {currentStats && (
            <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg text-sm">
              <Home className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="text-muted-foreground">
                Ruta completa: <span className="font-medium text-foreground">Bodega → {validPoints.length} entregas → Bodega</span>
              </span>
            </div>
          )}

          {/* Time estimate including deliveries */}
          {currentStats && (
            <div className="flex items-center justify-between px-3 py-2 bg-muted rounded-lg text-sm">
              <span className="text-muted-foreground">Tiempo total estimado (con entregas de ~25 min c/u):</span>
              <span className="font-semibold">
                {formatDuration(currentStats.durationMinutes + (validPoints.length * 25))}
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
                <span className="text-sm text-muted-foreground">Calculando ambas rutas...</span>
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
                        strokeColor: useGoogleOptimization ? "#22c55e" : color,
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
            {displayedPoints.map((punto, idx) => (
              <div key={punto.id} className="p-2 flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="secondary" 
                    className="w-6 h-6 flex items-center justify-center p-0"
                    style={{ 
                      backgroundColor: useGoogleOptimization ? "#22c55e" : color, 
                      color: "white" 
                    }}
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
          <div className="flex justify-between gap-2 flex-shrink-0">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4 mr-2" />
              Cerrar
            </Button>
            <div className="flex gap-2">
              {directions && (
                <Button
                  variant="outline"
                  onClick={() => {
                    // Open Google Maps with the current order
                    const currentPoints = useGoogleOptimization ? googleOptimizedPoints : validPoints;
                    const waypointsParam = currentPoints
                      .map(p => `${p.lat},${p.lng}`)
                      .join("|");
                    const url = `https://www.google.com/maps/dir/?api=1&origin=${BODEGA_PRINCIPAL.lat},${BODEGA_PRINCIPAL.lng}&destination=${BODEGA_PRINCIPAL.lat},${BODEGA_PRINCIPAL.lng}&waypoints=${waypointsParam}&travelmode=driving`;
                    window.open(url, "_blank");
                  }}
                >
                  <Navigation2 className="h-4 w-4 mr-2" />
                  Abrir en Google Maps
                </Button>
              )}
              {onOrderSelected && directions && (
                <Button onClick={handleConfirmOrder} className="bg-green-600 hover:bg-green-700">
                  <Check className="h-4 w-4 mr-2" />
                  Usar este orden
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RealRouteVisualization;