import { useState, useEffect, useCallback, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Navigation } from "lucide-react";
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

export const RouteMapVisualization = ({
  puntos,
  vehiculoNombre,
  optimizarOrden = false,
  onOrderOptimized,
}: RouteMapVisualizationProps) => {
  const [geocodedPoints, setGeocodedPoints] = useState<DeliveryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalDistance, setTotalDistance] = useState<number | null>(null);
  const [totalDuration, setTotalDuration] = useState<number | null>(null);

  // Geocode addresses using edge function
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

      const geocodeMap = new Map((data.results || []).map((r: { id: string; lat: number | null; lng: number | null }) => [r.id, r]));
      
      const updatedPoints = puntos.map(p => {
        const geocoded = geocodeMap.get(p.id) as { lat: number | null; lng: number | null } | undefined;
        if (geocoded && geocoded.lat && geocoded.lng) {
          return { ...p, lat: geocoded.lat, lng: geocoded.lng };
        }
        return p;
      });

      setGeocodedPoints(updatedPoints);

      // Calculate simple distance estimate between consecutive points
      const validPoints = updatedPoints.filter(p => p.lat && p.lng);
      if (validPoints.length >= 2) {
        let distance = 0;
        for (let i = 1; i < validPoints.length; i++) {
          const d = haversineDistance(
            validPoints[i - 1].lat!, validPoints[i - 1].lng!,
            validPoints[i].lat!, validPoints[i].lng!
          );
          distance += d;
        }
        setTotalDistance(Math.round(distance));
        // Estimate duration: avg 30 km/h in city traffic + 10 min per stop
        setTotalDuration(Math.round((distance / 30) * 60 + validPoints.length * 10));
      }

    } catch (err) {
      console.error("Geocoding error:", err);
      setError("Error obteniendo ubicaciones");
    } finally {
      setLoading(false);
    }
  }, [puntos]);

  useEffect(() => {
    geocodeAddresses();
  }, [geocodeAddresses]);

  // Haversine formula for distance between two points
  const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Generate Google Maps URL for navigation
  const generateMapsUrl = () => {
    const validPoints = geocodedPoints.filter(p => p.lat && p.lng);
    if (validPoints.length === 0) return null;
    
    if (validPoints.length === 1) {
      return `https://www.google.com/maps/search/?api=1&query=${validPoints[0].lat},${validPoints[0].lng}`;
    }

    const origin = `${validPoints[0].lat},${validPoints[0].lng}`;
    const destination = `${validPoints[validPoints.length - 1].lat},${validPoints[validPoints.length - 1].lng}`;
    const waypoints = validPoints.slice(1, -1).map(p => `${p.lat},${p.lng}`).join('|');
    
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypoints ? `&waypoints=${waypoints}` : ''}`;
  };

  if (loading) {
    return (
      <div className="h-[250px] flex items-center justify-center bg-muted rounded-lg">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span className="text-sm text-muted-foreground">Obteniendo ubicaciones...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[250px] flex items-center justify-center bg-muted rounded-lg">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  const validPoints = geocodedPoints.filter((p) => p.lat && p.lng);
  const invalidCount = geocodedPoints.filter((p) => !p.lat || !p.lng).length;
  const mapsUrl = generateMapsUrl();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{vehiculoNombre} • {validPoints.length} puntos ubicados</span>
        {invalidCount > 0 && (
          <Badge variant="outline" className="text-orange-600">
            {invalidCount} sin dirección
          </Badge>
        )}
      </div>

      {/* Static map preview */}
      <div className="border rounded-lg overflow-hidden bg-muted">
        {validPoints.length > 0 ? (
          <div className="relative">
            {/* Simple visual representation */}
            <div className="p-4 space-y-2 max-h-[200px] overflow-y-auto">
              {geocodedPoints.map((punto, index) => (
                <div 
                  key={punto.id}
                  className={`flex items-center gap-3 p-2 rounded ${punto.lat && punto.lng ? 'bg-background' : 'bg-orange-50 dark:bg-orange-950/20'}`}
                >
                  <div 
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{punto.cliente}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {punto.sucursal || punto.folio} • {punto.peso_kg.toLocaleString()} kg
                    </p>
                    {punto.direccion && (
                      <p className="text-xs text-muted-foreground truncate">{punto.direccion}</p>
                    )}
                  </div>
                  {punto.lat && punto.lng ? (
                    <MapPin className="h-4 w-4 text-green-600 flex-shrink-0" />
                  ) : (
                    <MapPin className="h-4 w-4 text-orange-500 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>

            {/* Connection lines indicator */}
            {validPoints.length >= 2 && (
              <div className="absolute top-2 right-2">
                <Badge variant="secondary" className="text-xs">
                  {validPoints.length} paradas
                </Badge>
              </div>
            )}
          </div>
        ) : (
          <div className="h-[150px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Sin direcciones para mostrar</p>
          </div>
        )}
      </div>

      {/* Stats and actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-4 text-xs text-muted-foreground">
          {totalDistance && (
            <span>
              Distancia aprox:{" "}
              <span className="font-medium text-foreground">{totalDistance} km</span>
            </span>
          )}
          {totalDuration && (
            <span>
              Tiempo estimado:{" "}
              <span className="font-medium text-foreground">
                {Math.floor(totalDuration / 60)}h {totalDuration % 60}min
              </span>
            </span>
          )}
        </div>

        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Navigation className="h-3 w-3" />
            Abrir en Google Maps
          </a>
        )}
      </div>
    </div>
  );
};
