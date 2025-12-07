import { useState, useCallback, useEffect, useRef } from "react";
import { GoogleMap, Marker, Polyline, InfoWindow } from "@react-google-maps/api";
import { useGoogleMapsLoader } from "@/hooks/useGoogleMapsLoader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, MapPin, Navigation, Truck, Package, Clock, AlertCircle } from "lucide-react";

export interface RoutePoint {
  id: string;
  folio: string;
  cliente: string;
  sucursal?: string;
  direccion: string;
  peso_kg: number;
  orden: number;
  lat?: number;
  lng?: number;
  prioridad?: string;
}

export interface RouteData {
  id: string;
  vehiculoNombre: string;
  vehiculoTipo: string;
  color: string;
  puntos: RoutePoint[];
  pesoTotal: number;
  capacidadMaxima: number;
}

interface InteractiveRouteMapProps {
  rutas: RouteData[];
  centroInicial?: { lat: number; lng: number };
  zoom?: number;
  height?: string;
  showLegend?: boolean;
  onMarkerClick?: (punto: RoutePoint, rutaId: string) => void;
}

// Color palette for routes
const ROUTE_COLORS = [
  "#ef4444", // red
  "#3b82f6", // blue
  "#22c55e", // green
  "#f97316", // orange
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#14b8a6", // teal
  "#eab308", // yellow
  "#6366f1", // indigo
];

// Priority labels
const PRIORIDAD_LABELS: Record<string, { label: string; color: string }> = {
  vip_mismo_dia: { label: "VIP", color: "bg-red-500" },
  deadline: { label: "Deadline", color: "bg-orange-500" },
  dia_fijo_recurrente: { label: "Día Fijo", color: "bg-blue-500" },
  fecha_sugerida: { label: "Sugerida", color: "bg-green-500" },
  flexible: { label: "Flexible", color: "bg-gray-500" },
};

// Map container style
const containerStyle = {
  width: "100%",
  height: "100%",
};

// Default center (CDMX - Bodega Principal)
const defaultCenter = {
  lat: 19.408680,
  lng: -99.121084,
};

// Map options
const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
  styles: [
    {
      featureType: "poi",
      elementType: "labels",
      stylers: [{ visibility: "off" }],
    },
  ],
};

export const InteractiveRouteMap = ({
  rutas,
  centroInicial = defaultCenter,
  zoom = 11,
  height = "400px",
  showLegend = true,
  onMarkerClick,
}: InteractiveRouteMapProps) => {
  const { isLoaded, loadError, hasApiKey } = useGoogleMapsLoader();
  const [selectedMarker, setSelectedMarker] = useState<{
    punto: RoutePoint;
    rutaId: string;
    color: string;
  } | null>(null);
  const [visibleRutas, setVisibleRutas] = useState<Set<string>>(new Set());
  const mapRef = useRef<any>(null);

  // Initialize visible routes
  useEffect(() => {
    setVisibleRutas(new Set(rutas.map(r => r.id)));
  }, [rutas]);

  const onMapLoad = useCallback((map: any) => {
    mapRef.current = map;
    
    // Fit bounds to show all points
    if (rutas.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      let hasPoints = false;
      
      rutas.forEach(ruta => {
        ruta.puntos.forEach(punto => {
          if (punto.lat && punto.lng) {
            bounds.extend({ lat: punto.lat, lng: punto.lng });
            hasPoints = true;
          }
        });
      });
      
      // Add warehouse to bounds
      bounds.extend(centroInicial);
      
      if (hasPoints) {
        map.fitBounds(bounds, 50);
      }
    }
  }, [rutas, centroInicial]);

  const handleMarkerClick = (punto: RoutePoint, rutaId: string, color: string) => {
    setSelectedMarker({ punto, rutaId, color });
    onMarkerClick?.(punto, rutaId);
  };

  const toggleRutaVisibility = (rutaId: string) => {
    setVisibleRutas(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rutaId)) {
        newSet.delete(rutaId);
      } else {
        newSet.add(rutaId);
      }
      return newSet;
    });
  };

  // Create numbered marker icon
  const createMarkerIcon = (number: number, color: string, isWarehouse: boolean = false): any => {
    if (!isLoaded || typeof google === 'undefined') return undefined;
    if (isWarehouse) {
      return {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 12,
        fillColor: "#000000",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 3,
      };
    }
    
    return {
      path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z",
      fillColor: color,
      fillOpacity: 1,
      strokeColor: "#ffffff",
      strokeWeight: 2,
      scale: 1.5,
      anchor: new google.maps.Point(12, 22),
      labelOrigin: new google.maps.Point(12, 9),
    };
  };

  if (!hasApiKey) {
    return (
      <div 
        className="flex items-center justify-center bg-muted rounded-lg border"
        style={{ height }}
      >
        <div className="text-center p-4">
          <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            API de Google Maps no configurada
          </p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div 
        className="flex items-center justify-center bg-muted rounded-lg border"
        style={{ height }}
      >
        <div className="text-center p-4">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-sm text-destructive">Error cargando Google Maps</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div 
        className="flex items-center justify-center bg-muted rounded-lg border"
        style={{ height }}
      >
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span className="text-sm text-muted-foreground">Cargando mapa...</span>
      </div>
    );
  }

  // Count total points with coordinates
  const totalPoints = rutas.reduce((sum, r) => 
    sum + r.puntos.filter(p => p.lat && p.lng).length, 0
  );

  return (
    <div className="space-y-3">
      {/* Legend */}
      {showLegend && rutas.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {rutas.map((ruta, index) => (
            <button
              key={ruta.id}
              onClick={() => toggleRutaVisibility(ruta.id)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                visibleRutas.has(ruta.id)
                  ? "bg-background border-2 shadow-sm"
                  : "bg-muted opacity-50"
              }`}
              style={{
                borderColor: visibleRutas.has(ruta.id) ? ruta.color : "transparent",
              }}
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: ruta.color }}
              />
              <Truck className="h-3 w-3" />
              <span>{ruta.vehiculoNombre}</span>
              <Badge variant="secondary" className="text-xs px-1">
                {ruta.puntos.filter(p => p.lat && p.lng).length}
              </Badge>
            </button>
          ))}
        </div>
      )}

      {/* Map Container */}
      <div className="rounded-lg overflow-hidden border" style={{ height }}>
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={centroInicial}
          zoom={zoom}
          onLoad={onMapLoad}
          options={mapOptions}
        >
          {/* Warehouse marker */}
          <Marker
            position={centroInicial}
            icon={createMarkerIcon(0, "#000000", true)}
            title="Bodega Principal"
            zIndex={1000}
          />

          {/* Route polylines and markers */}
          {rutas.map((ruta) => {
            if (!visibleRutas.has(ruta.id)) return null;

            const validPoints = ruta.puntos.filter(p => p.lat && p.lng);
            
            // Create path including warehouse as starting point
            const path = [
              centroInicial,
              ...validPoints.map(p => ({ lat: p.lat!, lng: p.lng! })),
            ];

            return (
              <div key={ruta.id}>
                {/* Route polyline */}
                {validPoints.length > 0 && (
                  <Polyline
                    path={path}
                    options={{
                      strokeColor: ruta.color,
                      strokeOpacity: 0.8,
                      strokeWeight: 4,
                      icons: [
                        {
                          icon: {
                            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                            scale: 3,
                            strokeColor: ruta.color,
                            fillColor: ruta.color,
                            fillOpacity: 1,
                          },
                          offset: "50%",
                          repeat: "100px",
                        },
                      ],
                    }}
                  />
                )}

                {/* Delivery point markers */}
                {validPoints.map((punto) => (
                  <Marker
                    key={punto.id}
                    position={{ lat: punto.lat!, lng: punto.lng! }}
                    icon={createMarkerIcon(punto.orden, ruta.color)}
                    label={{
                      text: String(punto.orden),
                      color: "#ffffff",
                      fontSize: "11px",
                      fontWeight: "bold",
                    }}
                    onClick={() => handleMarkerClick(punto, ruta.id, ruta.color)}
                    zIndex={punto.orden}
                  />
                ))}
              </div>
            );
          })}

          {/* Info Window for selected marker */}
          {selectedMarker && selectedMarker.punto.lat && selectedMarker.punto.lng && (
            <InfoWindow
              position={{
                lat: selectedMarker.punto.lat,
                lng: selectedMarker.punto.lng,
              }}
              onCloseClick={() => setSelectedMarker(null)}
            >
              <div className="p-2 min-w-[200px] max-w-[280px]">
                <div className="flex items-start gap-2 mb-2">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: selectedMarker.color }}
                  >
                    {selectedMarker.punto.orden}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm truncate">
                      {selectedMarker.punto.cliente}
                    </h4>
                    {selectedMarker.punto.sucursal && (
                      <p className="text-xs text-gray-600 truncate">
                        {selectedMarker.punto.sucursal}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-1 text-gray-600">
                    <Package className="h-3 w-3" />
                    <span>{selectedMarker.punto.peso_kg.toLocaleString()} kg</span>
                  </div>
                  
                  <div className="flex items-center gap-1 text-gray-600">
                    <MapPin className="h-3 w-3" />
                    <span className="line-clamp-2">{selectedMarker.punto.direccion}</span>
                  </div>

                  {selectedMarker.punto.prioridad && PRIORIDAD_LABELS[selectedMarker.punto.prioridad] && (
                    <div className="pt-1">
                      <span 
                        className={`inline-flex items-center px-2 py-0.5 rounded text-white text-xs ${
                          PRIORIDAD_LABELS[selectedMarker.punto.prioridad].color
                        }`}
                      >
                        {PRIORIDAD_LABELS[selectedMarker.punto.prioridad].label}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-2 pt-2 border-t">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${selectedMarker.punto.lat},${selectedMarker.punto.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                  >
                    <Navigation className="h-3 w-3" />
                    Navegar aquí
                  </a>
                </div>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {totalPoints} puntos de entrega en {rutas.length} ruta{rutas.length !== 1 ? "s" : ""}
        </span>
        <span>
          Total: {rutas.reduce((sum, r) => sum + r.pesoTotal, 0).toLocaleString()} kg
        </span>
      </div>
    </div>
  );
};

export default InteractiveRouteMap;
