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

import { useState, useEffect, useCallback, useMemo } from "react";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from "@react-google-maps/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, MapPin, Navigation, Building2, Loader2, RefreshCw, AlertTriangle, ExternalLink, Share2 } from "lucide-react";
import { toast as sonnerToast } from "sonner";
import { ErrorBoundaryModule } from "@/components/ErrorBoundaryModule";

interface Sucursal {
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
}

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

const defaultCenter = {
  lat: 19.4326,
  lng: -99.1332,
};

const MARKER_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"
];

/**
 * Componente de fallback cuando el mapa no puede cargar.
 * Muestra lista de sucursales con links a Google Maps externo.
 */
const MapaFallback = ({ 
  sucursales, 
  loading, 
  searchTerm, 
  onSearchChange,
  onRefresh,
  errorMessage 
}: { 
  sucursales: Sucursal[];
  loading: boolean;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  errorMessage?: string;
}) => {
  const getGoogleMapsUrl = (sucursal: Sucursal) => {
    if (sucursal.latitud && sucursal.longitud) {
      return `https://www.google.com/maps/search/?api=1&query=${sucursal.latitud},${sucursal.longitud}`;
    }
    if (sucursal.direccion) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(sucursal.direccion)}`;
    }
    return null;
  };

  const getNavigationUrl = (sucursal: Sucursal) => {
    if (sucursal.latitud && sucursal.longitud) {
      return `https://www.google.com/maps/dir/?api=1&destination=${sucursal.latitud},${sucursal.longitud}`;
    }
    if (sucursal.direccion) {
      return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(sucursal.direccion)}`;
    }
    return null;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Sucursales ({sucursales.length})
          </CardTitle>
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>
        
        <Alert variant="destructive" className="mt-3">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>No se pudo cargar Google Maps</AlertTitle>
          <AlertDescription className="text-sm">
            {errorMessage || "Verifica la API key o la conexión a internet."}{" "}
            Mientras tanto, puedes ver la lista de sucursales y abrir cada una en Google Maps.
          </AlertDescription>
        </Alert>

        <div className="relative mt-3">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar sucursal, cliente, zona..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[500px]">
          {loading ? (
            <div className="flex items-center justify-center p-6">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : sucursales.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No se encontraron sucursales</p>
            </div>
          ) : (
            <div className="divide-y">
              {sucursales.map((sucursal) => {
                const mapsUrl = getGoogleMapsUrl(sucursal);
                const navUrl = getNavigationUrl(sucursal);
                
                return (
                  <div key={sucursal.id} className="p-3 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{sucursal.nombre}</p>
                        <p className="text-xs text-muted-foreground">{sucursal.cliente_nombre}</p>
                        {sucursal.direccion && (
                          <p className="text-xs text-muted-foreground mt-1">{sucursal.direccion}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          {sucursal.zona_nombre && (
                            <Badge variant="outline" className="text-xs">{sucursal.zona_nombre}</Badge>
                          )}
                          {sucursal.latitud && sucursal.longitud && (
                            <Badge variant="secondary" className="text-xs">
                              {sucursal.latitud.toFixed(4)}, {sucursal.longitud.toFixed(4)}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        {mapsUrl && (
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => window.open(mapsUrl, "_blank")}
                            title="Ver en Google Maps"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                        {navUrl && (
                          <Button
                            variant="default"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => window.open(navUrl, "_blank")}
                            title="Navegar"
                          >
                            <Navigation className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

/**
 * Contenido principal del mapa (cuando Google Maps carga correctamente)
 */
const MapaContent = () => {
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSucursal, setSelectedSucursal] = useState<Sucursal | null>(null);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [mapZoom, setMapZoom] = useState(11);
  const { toast } = useToast();

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
  });

  const loadSucursales = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("cliente_sucursales")
        .select(`
          id,
          nombre,
          direccion,
          latitud,
          longitud,
          telefono,
          cliente_id,
          horario_entrega,
          clientes!inner (nombre),
          zonas (nombre)
        `)
        .eq("activo", true);

      if (error) throw error;

      const formattedData: Sucursal[] = (data || []).map((s: any) => ({
        id: s.id,
        nombre: s.nombre,
        direccion: s.direccion,
        latitud: s.latitud,
        longitud: s.longitud,
        telefono: s.telefono,
        cliente_id: s.cliente_id,
        cliente_nombre: s.clientes?.nombre || "Sin cliente",
        zona_nombre: s.zonas?.nombre || null,
        horario_entrega: s.horario_entrega,
      }));

      setSucursales(formattedData);

      // Center map on sucursales with coordinates
      const withCoords = formattedData.filter(s => s.latitud && s.longitud);
      if (withCoords.length > 0) {
        const avgLat = withCoords.reduce((sum, s) => sum + (s.latitud || 0), 0) / withCoords.length;
        const avgLng = withCoords.reduce((sum, s) => sum + (s.longitud || 0), 0) / withCoords.length;
        setMapCenter({ lat: avgLat, lng: avgLng });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las sucursales",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadSucursales();
  }, [loadSucursales]);

  const filteredSucursales = useMemo(() => {
    if (!searchTerm) return sucursales;
    const term = searchTerm.toLowerCase();
    return sucursales.filter(
      (s) =>
        s.nombre.toLowerCase().includes(term) ||
        s.cliente_nombre.toLowerCase().includes(term) ||
        s.direccion?.toLowerCase().includes(term) ||
        s.zona_nombre?.toLowerCase().includes(term)
    );
  }, [sucursales, searchTerm]);

  const sucursalesConCoordenadas = useMemo(() => 
    filteredSucursales.filter(s => s.latitud && s.longitud),
    [filteredSucursales]
  );

  const handleSucursalClick = (sucursal: Sucursal) => {
    setSelectedSucursal(sucursal);
    if (sucursal.latitud && sucursal.longitud) {
      setMapCenter({ lat: sucursal.latitud, lng: sucursal.longitud });
      setMapZoom(16);
    }
  };

  const handleNavigate = (sucursal: Sucursal) => {
    if (sucursal.latitud && sucursal.longitud) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${sucursal.latitud},${sucursal.longitud}`,
        "_blank"
      );
    }
  };

  const handleShare = async (sucursal: Sucursal) => {
    const url = sucursal.latitud && sucursal.longitud
      ? `https://www.google.com/maps?q=${sucursal.latitud},${sucursal.longitud}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(sucursal.direccion || sucursal.nombre)}`;
    
    const shareData = {
      title: sucursal.nombre,
      text: `📍 ${sucursal.nombre}\n${sucursal.cliente_nombre}\n${sucursal.direccion || ""}`,
      url: url,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        sonnerToast.success("Link copiado al portapapeles");
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        await navigator.clipboard.writeText(url);
        sonnerToast.success("Link copiado al portapapeles");
      }
    }
  };

  const getMarkerColor = (clienteId: string) => {
    const hash = clienteId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return MARKER_COLORS[hash % MARKER_COLORS.length];
  };

  const createMarkerIcon = useCallback((color: string) => {
    // 🔒 Guard: verificar que Google Maps API esté cargada
    if (!isLoaded || !window.google || !window.google.maps) return undefined;
    return {
      url: "data:image/svg+xml," + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="48" viewBox="0 0 24 32">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="${color}" stroke="#ffffff" stroke-width="1.5"/>
        </svg>
      `),
      scaledSize: new window.google.maps.Size(36, 48),
      anchor: new window.google.maps.Point(18, 48),
    };
  }, [isLoaded]);

  // 🔒 FALLBACK: Si hay error de carga, mostrar lista con links
  if (loadError) {
    return (
      <MapaFallback
        sucursales={filteredSucursales}
        loading={loading}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onRefresh={loadSucursales}
        errorMessage={loadError.message}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Lista de sucursales */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Sucursales ({filteredSucursales.length})
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar sucursal, cliente, zona..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[300px] lg:h-[450px]">
            {loading ? (
              <div className="flex items-center justify-center p-6">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : filteredSucursales.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No se encontraron sucursales</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredSucursales.map((sucursal) => (
                  <div
                    key={sucursal.id}
                    className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                      selectedSucursal?.id === sucursal.id ? "bg-muted" : ""
                    }`}
                    onClick={() => handleSucursalClick(sucursal)}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
                        style={{ backgroundColor: getMarkerColor(sucursal.cliente_id) }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{sucursal.nombre}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {sucursal.cliente_nombre}
                        </p>
                        {sucursal.direccion && (
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            {sucursal.direccion}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          {sucursal.zona_nombre && (
                            <Badge variant="outline" className="text-xs">
                              {sucursal.zona_nombre}
                            </Badge>
                          )}
                          {!sucursal.latitud && (
                            <Badge variant="secondary" className="text-xs text-orange-600">
                              Sin coordenadas
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShare(sucursal);
                          }}
                          title="Compartir ubicación"
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNavigate(sucursal);
                          }}
                          disabled={!sucursal.latitud}
                          title="Navegar"
                        >
                          <Navigation className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Mapa */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Mapa de Ubicaciones
              {sucursalesConCoordenadas.length < filteredSucursales.length && (
                <Badge variant="secondary" className="text-xs">
                  {sucursalesConCoordenadas.length} de {filteredSucursales.length} con coordenadas
                </Badge>
              )}
            </CardTitle>
            <Button variant="outline" size="sm" onClick={loadSucursales}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 h-[350px] lg:h-[500px]">
          {!isLoaded ? (
            <div className="h-full flex items-center justify-center bg-muted">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={mapCenter}
              zoom={mapZoom}
              options={{
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: true,
              }}
            >
              {sucursalesConCoordenadas.map((sucursal) => (
                <Marker
                  key={sucursal.id}
                  position={{
                    lat: sucursal.latitud!,
                    lng: sucursal.longitud!,
                  }}
                  icon={createMarkerIcon(getMarkerColor(sucursal.cliente_id))}
                  onClick={() => setSelectedSucursal(sucursal)}
                />
              ))}

              {selectedSucursal && selectedSucursal.latitud && selectedSucursal.longitud && (
                <InfoWindow
                  position={{
                    lat: selectedSucursal.latitud,
                    lng: selectedSucursal.longitud,
                  }}
                  onCloseClick={() => setSelectedSucursal(null)}
                >
                  <div className="p-2 min-w-[200px]">
                    <h3 className="font-semibold text-sm">{selectedSucursal.nombre}</h3>
                    <p className="text-xs text-gray-600 mt-1">{selectedSucursal.cliente_nombre}</p>
                    {selectedSucursal.direccion && (
                      <p className="text-xs text-gray-500 mt-1">{selectedSucursal.direccion}</p>
                    )}
                    {selectedSucursal.telefono && (
                      <p className="text-xs text-gray-500 mt-1">Tel: {selectedSucursal.telefono}</p>
                    )}
                    {selectedSucursal.horario_entrega && (
                      <p className="text-xs text-gray-500 mt-1">
                        Horario: {selectedSucursal.horario_entrega}
                      </p>
                    )}
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleShare(selectedSucursal)}
                      >
                        <Share2 className="h-3 w-3 mr-1" />
                        Compartir
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleNavigate(selectedSucursal)}
                      >
                        <Navigation className="h-3 w-3 mr-1" />
                        Navegar
                      </Button>
                    </div>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Componente principal envuelto en ErrorBoundary
 */
export const MapaGlobalSucursales = () => {
  return (
    <ErrorBoundaryModule 
      moduleName="Mapa Global"
      fallback={
        <MapaFallback
          sucursales={[]}
          loading={false}
          searchTerm=""
          onSearchChange={() => {}}
          onRefresh={() => window.location.reload()}
          errorMessage="Error inesperado al cargar el componente de mapa."
        />
      }
    >
      <MapaContent />
    </ErrorBoundaryModule>
  );
};
