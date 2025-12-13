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

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Circle } from "@react-google-maps/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, MapPin, Navigation, Building2, Loader2, RefreshCw, AlertTriangle, ExternalLink, Share2, Target, X, Maximize2, Minimize2 } from "lucide-react";
import { toast as sonnerToast } from "sonner";
import { ErrorBoundaryModule } from "@/components/ErrorBoundaryModule";

/**
 * Calcula la distancia en kilómetros entre dos puntos usando fórmula de Haversine
 */
const calcularDistanciaKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const RADIO_OPTIONS = [
  { value: "2", label: "2 km" },
  { value: "5", label: "5 km" },
  { value: "10", label: "10 km" },
  { value: "15", label: "15 km" },
];

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
  const [radioKm, setRadioKm] = useState(5);
  const [mostrarCercanas, setMostrarCercanas] = useState(false);
  const [hoveredSucursal, setHoveredSucursal] = useState<Sucursal | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Escuchar cambios de fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Toggle fullscreen custom
  const toggleFullscreen = useCallback(() => {
    if (!mapContainerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      mapContainerRef.current.requestFullscreen();
    }
  }, []);

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

  // Calcular sucursales cercanas cuando hay una seleccionada
  const sucursalesCercanas = useMemo(() => {
    if (!selectedSucursal || !selectedSucursal.latitud || !selectedSucursal.longitud) {
      return [];
    }
    
    return sucursalesConCoordenadas
      .filter(s => s.id !== selectedSucursal.id)
      .map(s => ({
        ...s,
        distancia: calcularDistanciaKm(
          selectedSucursal.latitud!,
          selectedSucursal.longitud!,
          s.latitud!,
          s.longitud!
        )
      }))
      .filter(s => s.distancia <= radioKm)
      .sort((a, b) => a.distancia - b.distancia);
  }, [selectedSucursal, sucursalesConCoordenadas, radioKm]);

  // IDs de sucursales cercanas para resaltado en mapa
  const idsCercanas = useMemo(() => new Set(sucursalesCercanas.map(s => s.id)), [sucursalesCercanas]);

  const handleSucursalClick = (sucursal: Sucursal) => {
    setSelectedSucursal(sucursal);
    setMostrarCercanas(true);
    if (sucursal.latitud && sucursal.longitud) {
      setMapCenter({ lat: sucursal.latitud, lng: sucursal.longitud });
      // Ajustar zoom según el radio
      const zoomPorRadio: Record<number, number> = { 2: 15, 5: 14, 10: 13, 15: 12 };
      setMapZoom(zoomPorRadio[radioKm] || 14);
    }
  };

  const handleClearSelection = () => {
    setSelectedSucursal(null);
    setMostrarCercanas(false);
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

  // Lista a mostrar: cercanas si hay selección, todas si no
  const listaAMostrar = mostrarCercanas && selectedSucursal 
    ? sucursalesCercanas 
    : filteredSucursales;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Lista de sucursales */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-3">
          {mostrarCercanas && selectedSucursal ? (
            <>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Cercanas
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={handleClearSelection}>
                  <X className="h-4 w-4 mr-1" />
                  Limpiar
                </Button>
              </div>
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-2 mt-2">
                <p className="text-sm font-medium">{selectedSucursal.nombre}</p>
                <p className="text-xs text-muted-foreground">{selectedSucursal.cliente_nombre}</p>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Select 
                  value={radioKm.toString()} 
                  onValueChange={(v) => setRadioKm(parseInt(v))}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RADIO_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Badge variant="secondary" className="flex-1 justify-center">
                  {sucursalesCercanas.length} encontradas
                </Badge>
              </div>
            </>
          ) : (
            <>
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
            </>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[300px] lg:h-[450px]">
            {loading ? (
              <div className="flex items-center justify-center p-6">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : listaAMostrar.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  {mostrarCercanas ? "No hay sucursales en este radio" : "No se encontraron sucursales"}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {listaAMostrar.map((sucursal) => {
                  const distancia = 'distancia' in sucursal ? (sucursal as any).distancia : null;
                  return (
                    <div
                      key={sucursal.id}
                      className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                        selectedSucursal?.id === sucursal.id ? "bg-primary/10 border-l-2 border-primary" : ""
                      }`}
                      onClick={() => handleSucursalClick(sucursal)}
                    >
                      <div className="flex items-start gap-2">
                        <div
                          className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
                          style={{ backgroundColor: getMarkerColor(sucursal.cliente_id) }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">{sucursal.nombre}</p>
                            {distancia !== null && (
                              <Badge variant="outline" className="text-xs shrink-0 bg-background">
                                {distancia.toFixed(1)} km
                              </Badge>
                            )}
                          </div>
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
                  );
                })}
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
            <div ref={mapContainerRef} className={`relative h-full ${isFullscreen ? 'bg-white' : ''}`}>
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={mapCenter}
                zoom={mapZoom}
                options={{
                  streetViewControl: false,
                  mapTypeControl: false,
                  fullscreenControl: false, // Deshabilitado - usamos custom
                }}
              >
              
              {/* Círculo de radio cuando hay sucursal seleccionada */}
              {selectedSucursal && selectedSucursal.latitud && selectedSucursal.longitud && (
                <Circle
                  center={{
                    lat: selectedSucursal.latitud,
                    lng: selectedSucursal.longitud,
                  }}
                  radius={radioKm * 1000}
                  options={{
                    fillColor: "#3b82f6",
                    fillOpacity: 0.1,
                    strokeColor: "#3b82f6",
                    strokeOpacity: 0.8,
                    strokeWeight: 2,
                  }}
                />
              )}

              {/* Marcadores con opacidad diferenciada */}
              {sucursalesConCoordenadas.map((sucursal) => {
                const esSeleccionada = selectedSucursal?.id === sucursal.id;
                const esCercana = idsCercanas.has(sucursal.id);
                const tieneSeleccion = !!selectedSucursal;
                
                // Determinar opacidad: seleccionada=1, cercana=1, otras=0.3 si hay selección
                const opacidad = esSeleccionada ? 1 : esCercana ? 1 : tieneSeleccion ? 0.3 : 1;
                
                return (
                  <Marker
                    key={sucursal.id}
                    position={{
                      lat: sucursal.latitud!,
                      lng: sucursal.longitud!,
                    }}
                    icon={createMarkerIcon(getMarkerColor(sucursal.cliente_id))}
                    opacity={opacidad}
                    onClick={() => handleSucursalClick(sucursal)}
                    onMouseOver={() => setHoveredSucursal(sucursal)}
                    onMouseOut={() => setHoveredSucursal(null)}
                    zIndex={esSeleccionada ? 1000 : esCercana ? 500 : 1}
                  />
                );
              })}

              {/* InfoWindow de hover - tooltip rápido */}
              {hoveredSucursal && hoveredSucursal.latitud && hoveredSucursal.longitud && 
               hoveredSucursal.id !== selectedSucursal?.id && (
                <InfoWindow
                  position={{
                    lat: hoveredSucursal.latitud,
                    lng: hoveredSucursal.longitud,
                  }}
                  options={{ disableAutoPan: true }}
                >
                  <div className="p-1 min-w-[160px]">
                    <p className="font-semibold text-sm">{hoveredSucursal.nombre}</p>
                    <p className="text-xs text-gray-600">{hoveredSucursal.cliente_nombre}</p>
                    {hoveredSucursal.zona_nombre && (
                      <p className="text-xs text-gray-500">Zona: {hoveredSucursal.zona_nombre}</p>
                    )}
                    {/* Mostrar distancia si hay sucursal seleccionada */}
                    {selectedSucursal && selectedSucursal.latitud && selectedSucursal.longitud && (
                      <p className="text-xs text-blue-600 font-medium mt-1 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {calcularDistanciaKm(
                          selectedSucursal.latitud,
                          selectedSucursal.longitud,
                          hoveredSucursal.latitud,
                          hoveredSucursal.longitud
                        ).toFixed(1)} km de {selectedSucursal.nombre}
                      </p>
                    )}
                  </div>
                </InfoWindow>
              )}

              {/* InfoWindow de selección - con acciones */}
              {selectedSucursal && selectedSucursal.latitud && selectedSucursal.longitud && (
                <InfoWindow
                  position={{
                    lat: selectedSucursal.latitud,
                    lng: selectedSucursal.longitud,
                  }}
                  onCloseClick={handleClearSelection}
                >
                  <div className="p-2 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="h-4 w-4 text-blue-600" />
                      <h3 className="font-semibold text-sm">{selectedSucursal.nombre}</h3>
                    </div>
                    <p className="text-xs text-gray-600">{selectedSucursal.cliente_nombre}</p>
                    {selectedSucursal.direccion && (
                      <p className="text-xs text-gray-500 mt-1">{selectedSucursal.direccion}</p>
                    )}
                    {selectedSucursal.telefono && (
                      <p className="text-xs text-gray-500 mt-1">Tel: {selectedSucursal.telefono}</p>
                    )}
                    <div className="bg-blue-50 rounded p-2 mt-2 text-center">
                      <p className="text-xs text-blue-700 font-medium">
                        {sucursalesCercanas.length} sucursales en {radioKm} km
                      </p>
                    </div>
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
              
              {/* Buscador flotante - FUERA del GoogleMap para que funcione en fullscreen */}
              <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
                {/* Input de búsqueda */}
                <div className="bg-white rounded-lg shadow-lg p-2 w-72">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar sucursal en mapa..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 h-9"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  
                  {/* Lista de resultados al buscar */}
                  {searchTerm && filteredSucursales.length > 0 && (
                    <div className="mt-2 max-h-48 overflow-y-auto border-t pt-2">
                      {filteredSucursales.slice(0, 8).map((suc) => (
                        <div
                          key={suc.id}
                          className="px-2 py-1.5 hover:bg-gray-100 rounded cursor-pointer"
                          onClick={() => handleSucursalClick(suc)}
                        >
                          <p className="font-medium text-sm truncate">{suc.nombre}</p>
                          <p className="text-xs text-gray-500 truncate">{suc.cliente_nombre}</p>
                        </div>
                      ))}
                      {filteredSucursales.length > 8 && (
                        <p className="text-xs text-gray-400 text-center mt-1">
                          +{filteredSucursales.length - 8} más...
                        </p>
                      )}
                    </div>
                  )}
                  
                  {searchTerm && filteredSucursales.length === 0 && (
                    <p className="text-xs text-gray-500 text-center mt-2">Sin resultados</p>
                  )}
                </div>
                
                {/* Selector de radio cuando hay selección */}
                {selectedSucursal && (
                  <div className="bg-white rounded-lg shadow-lg p-2 w-72">
                    <div className="flex items-center gap-2">
                      <Select
                        value={radioKm.toString()}
                        onValueChange={(value) => setRadioKm(parseInt(value))}
                      >
                        <SelectTrigger className="h-8 w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          {RADIO_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value.toString()}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                        {sucursalesCercanas.length} cercanas
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearSelection}
                        className="ml-auto h-7 px-2"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Botón custom de fullscreen */}
              <Button
                variant="outline"
                size="icon"
                onClick={toggleFullscreen}
                className="absolute top-3 right-3 z-10 bg-white shadow-lg h-10 w-10"
                title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
              >
                {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
              </Button>
            </div>
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
