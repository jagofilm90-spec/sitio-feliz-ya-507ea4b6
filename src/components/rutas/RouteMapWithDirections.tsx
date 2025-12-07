import { useState, useEffect, useCallback } from "react";
import { GoogleMap, useJsApiLoader, Marker, Polyline, InfoWindow } from "@react-google-maps/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Navigation, Clock, Route as RouteIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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

interface RouteMapWithDirectionsProps {
  puntos: DeliveryPoint[];
  vehiculoNombre: string;
  bodegaCoords?: { lat: number; lng: number };
  showReturnToBodega?: boolean;
}

interface DirectionsResult {
  polyline: string;
  totalDistance: { value: number; text: string };
  totalDuration: { value: number; text: string };
  legs: Array<{
    startAddress: string;
    endAddress: string;
    distance: { value: number; text: string };
    duration: { value: number; text: string };
  }>;
}

const mapContainerStyle = {
  width: "100%",
  height: "400px",
};

const COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280"
];

// Decode Google's polyline encoding
function decodePolyline(encoded: string): google.maps.LatLngLiteral[] {
  const points: google.maps.LatLngLiteral[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return points;
}

export const RouteMapWithDirections = ({
  puntos,
  vehiculoNombre,
  bodegaCoords = { lat: 19.408680, lng: -99.121084 }, // Default: Melchor Campo
  showReturnToBodega = true,
}: RouteMapWithDirectionsProps) => {
  const [geocodedPoints, setGeocodedPoints] = useState<DeliveryPoint[]>([]);
  const [directions, setDirections] = useState<DirectionsResult | null>(null);
  const [routePath, setRoutePath] = useState<google.maps.LatLngLiteral[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDirections, setLoadingDirections] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<DeliveryPoint | null>(null);
  const [mapRef, setMapRef] = useState<google.maps.Map | null>(null);

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
      const addressesToGeocode = puntos
        .filter(p => p.direccion && !p.lat && !p.lng)
        .map(p => ({ id: p.id, address: p.direccion }));

      if (addressesToGeocode.length === 0) {
        setGeocodedPoints(puntos);
        setLoading(false);
        return;
      }

      const { data, error: fnError } = await supabase.functions.invoke("geocode-addresses", {
        body: { addresses: addressesToGeocode },
      });

      if (fnError) throw fnError;

      const geocodeMap = new Map<string, { lat: number | null; lng: number | null }>(
        (data.results || []).map((r: { id: string; lat: number | null; lng: number | null }) => [r.id, r])
      );
      
      const updatedPoints = puntos.map(p => {
        const geocoded = geocodeMap.get(p.id);
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

  // Get directions from API
  const fetchDirections = useCallback(async (points: DeliveryPoint[]) => {
    const validPoints = points.filter(p => p.lat && p.lng);
    if (validPoints.length < 1) return;

    setLoadingDirections(true);

    try {
      // Origin is bodega
      const origin = bodegaCoords;
      
      // Destination is last point (or bodega if returning)
      const destination = showReturnToBodega 
        ? bodegaCoords 
        : { lat: validPoints[validPoints.length - 1].lat!, lng: validPoints[validPoints.length - 1].lng! };

      // Waypoints are all delivery points
      const waypoints = validPoints.map(p => ({
        lat: p.lat!,
        lng: p.lng!,
        id: p.id,
      }));

      const { data, error } = await supabase.functions.invoke("get-route-directions", {
        body: { origin, destination, waypoints },
      });

      if (error) throw error;

      if (data.polyline) {
        setDirections(data);
        const decodedPath = decodePolyline(data.polyline);
        setRoutePath(decodedPath);
      }
    } catch (err) {
      console.error("Directions error:", err);
      // Don't set error - just show points without route line
    } finally {
      setLoadingDirections(false);
    }
  }, [bodegaCoords, showReturnToBodega]);

  useEffect(() => {
    geocodeAddresses();
  }, [geocodeAddresses]);

  useEffect(() => {
    if (geocodedPoints.length > 0 && isLoaded) {
      fetchDirections(geocodedPoints);
    }
  }, [geocodedPoints, isLoaded, fetchDirections]);

  // Fit map to bounds
  useEffect(() => {
    if (!mapRef || !isLoaded) return;

    const validPoints = geocodedPoints.filter(p => p.lat && p.lng);
    if (validPoints.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    bounds.extend(bodegaCoords);
    validPoints.forEach(p => {
      bounds.extend({ lat: p.lat!, lng: p.lng! });
    });
    mapRef.fitBounds(bounds);
  }, [mapRef, geocodedPoints, bodegaCoords, isLoaded]);

  // Generate Google Maps navigation URL
  const generateMapsUrl = () => {
    const validPoints = geocodedPoints.filter(p => p.lat && p.lng);
    if (validPoints.length === 0) return null;
    
    const origin = `${bodegaCoords.lat},${bodegaCoords.lng}`;
    const destination = showReturnToBodega 
      ? origin 
      : `${validPoints[validPoints.length - 1].lat},${validPoints[validPoints.length - 1].lng}`;
    
    const waypoints = validPoints.map(p => `${p.lat},${p.lng}`).join('|');
    
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`;
  };

  if (loadError) {
    return (
      <div className="h-[400px] flex items-center justify-center bg-muted rounded-lg">
        <p className="text-sm text-destructive">Error cargando Google Maps</p>
      </div>
    );
  }

  if (loading || !isLoaded) {
    return (
      <div className="h-[400px] flex items-center justify-center bg-muted rounded-lg">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span className="text-sm text-muted-foreground">Cargando mapa...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[400px] flex items-center justify-center bg-muted rounded-lg">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  const validPoints = geocodedPoints.filter(p => p.lat && p.lng);
  const invalidCount = geocodedPoints.filter(p => !p.lat || !p.lng).length;
  const mapsUrl = generateMapsUrl();

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RouteIcon className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{vehiculoNombre}</span>
          <Badge variant="secondary">{validPoints.length} entregas</Badge>
          {invalidCount > 0 && (
            <Badge variant="outline" className="text-orange-600">
              {invalidCount} sin ubicación
            </Badge>
          )}
        </div>
        {loadingDirections && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Calculando ruta...
          </div>
        )}
      </div>

      {/* Map */}
      <div className="rounded-lg overflow-hidden border">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={bodegaCoords}
          zoom={12}
          onLoad={setMapRef}
          options={{
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: true,
          }}
        >
          {/* Route polyline */}
          {routePath.length > 0 && (
            <Polyline
              path={routePath}
              options={{
                strokeColor: "#3b82f6",
                strokeOpacity: 0.8,
                strokeWeight: 4,
              }}
            />
          )}

          {/* Bodega marker */}
          <Marker
            position={bodegaCoords}
            icon={{
              path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
              scale: 8,
              fillColor: "#22c55e",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
            }}
            title="Bodega Principal"
            zIndex={1000}
          />

          {/* Delivery point markers */}
          {validPoints.map((point, index) => (
            <Marker
              key={point.id}
              position={{ lat: point.lat!, lng: point.lng! }}
              onClick={() => setSelectedPoint(point)}
              label={{
                text: String(index + 1),
                color: "#ffffff",
                fontWeight: "bold",
                fontSize: "12px",
              }}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: 14,
                fillColor: COLORS[index % COLORS.length],
                fillOpacity: 1,
                strokeColor: "#ffffff",
                strokeWeight: 2,
              }}
            />
          ))}

          {/* Info window */}
          {selectedPoint && selectedPoint.lat && selectedPoint.lng && (
            <InfoWindow
              position={{ lat: selectedPoint.lat, lng: selectedPoint.lng }}
              onCloseClick={() => setSelectedPoint(null)}
            >
              <div className="p-2 min-w-[180px]">
                <p className="font-semibold text-sm">
                  #{geocodedPoints.findIndex(p => p.id === selectedPoint.id) + 1} - {selectedPoint.cliente}
                </p>
                {selectedPoint.sucursal && (
                  <p className="text-xs text-muted-foreground">{selectedPoint.sucursal}</p>
                )}
                <p className="text-xs mt-1">{selectedPoint.direccion}</p>
                <Badge variant="secondary" className="mt-2 text-xs">
                  {selectedPoint.peso_kg.toLocaleString()} kg
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => window.open(
                    `https://www.google.com/maps/search/?api=1&query=${selectedPoint.lat},${selectedPoint.lng}`,
                    "_blank"
                  )}
                >
                  <Navigation className="h-3 w-3 mr-1" />
                  Navegar aquí
                </Button>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between">
        <div className="flex gap-4 text-sm">
          {directions && (
            <>
              <div className="flex items-center gap-1">
                <RouteIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Distancia:</span>
                <span className="font-medium">{directions.totalDistance.text}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Tiempo:</span>
                <span className="font-medium">{directions.totalDuration.text}</span>
              </div>
            </>
          )}
        </div>

        {mapsUrl && (
          <Button
            variant="default"
            size="sm"
            onClick={() => window.open(mapsUrl, "_blank")}
          >
            <Navigation className="h-4 w-4 mr-2" />
            Iniciar navegación
          </Button>
        )}
      </div>

      {/* Delivery list with leg info */}
      {directions && directions.legs.length > 0 && (
        <div className="border rounded-lg divide-y max-h-[200px] overflow-y-auto">
          {geocodedPoints.map((punto, index) => {
            const leg = directions.legs[index];
            return (
              <div key={punto.id} className="flex items-center gap-3 p-3">
                <div 
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                >
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{punto.cliente}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {punto.sucursal || punto.folio}
                  </p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-xs font-medium">{punto.peso_kg.toLocaleString()} kg</p>
                  {leg && (
                    <p className="text-xs text-muted-foreground">
                      {leg.distance.text} • {leg.duration.text}
                    </p>
                  )}
                </div>
                {punto.lat && punto.lng ? (
                  <MapPin className="h-4 w-4 text-green-600 flex-shrink-0" />
                ) : (
                  <MapPin className="h-4 w-4 text-orange-500 flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
