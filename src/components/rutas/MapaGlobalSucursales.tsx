import { useState, useEffect, useCallback, useMemo } from "react";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from "@react-google-maps/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, MapPin, Navigation, Building2, Loader2, RefreshCw } from "lucide-react";

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
  height: "500px",
};

const defaultCenter = {
  lat: 19.4326,
  lng: -99.1332,
};

const MARKER_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"
];

export const MapaGlobalSucursales = () => {
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
        .eq("activo", true)
        .not("latitud", "is", null)
        .not("longitud", "is", null);

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

      // Center map on first sucursal or default
      if (formattedData.length > 0) {
        const avgLat = formattedData.reduce((sum, s) => sum + (s.latitud || 0), 0) / formattedData.length;
        const avgLng = formattedData.reduce((sum, s) => sum + (s.longitud || 0), 0) / formattedData.length;
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

  const getMarkerColor = (clienteId: string) => {
    const hash = clienteId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return MARKER_COLORS[hash % MARKER_COLORS.length];
  };

  const createMarkerIcon = useCallback((color: string) => {
    if (!isLoaded || !window.google) return undefined;
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

  if (loadError) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-destructive">Error cargando Google Maps</p>
        </CardContent>
      </Card>
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
          <ScrollArea className="h-[450px]">
            {loading ? (
              <div className="flex items-center justify-center p-6">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : filteredSucursales.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No se encontraron sucursales con coordenadas</p>
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
                          {sucursal.horario_entrega && (
                            <span className="text-xs text-muted-foreground">
                              {sucursal.horario_entrega}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNavigate(sucursal);
                        }}
                      >
                        <Navigation className="h-4 w-4" />
                      </Button>
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
            </CardTitle>
            <Button variant="outline" size="sm" onClick={loadSucursales}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!isLoaded ? (
            <div className="h-[500px] flex items-center justify-center bg-muted">
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
              {filteredSucursales.map((sucursal) => (
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
                    <Button
                      size="sm"
                      className="mt-2 w-full"
                      onClick={() => handleNavigate(selectedSucursal)}
                    >
                      <Navigation className="h-3 w-3 mr-1" />
                      Navegar
                    </Button>
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
