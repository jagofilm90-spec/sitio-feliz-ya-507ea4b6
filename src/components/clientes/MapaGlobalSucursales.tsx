import { useState, useEffect, useCallback } from "react";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from "@react-google-maps/api";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, MapPin, Navigation, RefreshCw, Search, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { MapErrorBoundary } from "@/components/ErrorBoundary";

interface Sucursal {
  id: string;
  nombre: string;
  direccion: string | null;
  latitud: number | null;
  longitud: number | null;
  telefono: string | null;
  contacto: string | null;
  cliente_id: string;
  cliente_nombre?: string;
  zona_nombre?: string;
}

interface Cliente {
  id: string;
  nombre: string;
}

interface MapaGlobalSucursalesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

const defaultCenter = {
  lat: 19.4326,
  lng: -99.1332,
};

const COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#3b82f6", "#8b5cf6", "#ec4899", "#6366f1", "#06b6d4"
];

// Verificar si la API key está configurada
const hasValidApiKey = () => {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  return key && key.length > 10 && key !== "undefined";
};

export const MapaGlobalSucursales = ({ open, onOpenChange }: MapaGlobalSucursalesProps) => {
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSucursal, setSelectedSucursal] = useState<Sucursal | null>(null);
  const [selectedClienteId, setSelectedClienteId] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [mapRef, setMapRef] = useState<google.maps.Map | null>(null);
  const [geocodingProgress, setGeocodingProgress] = useState<{ current: number; total: number } | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const { toast } = useToast();

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: hasValidApiKey() ? import.meta.env.VITE_GOOGLE_MAPS_API_KEY : "",
    libraries: ["places"],
  });

  // Color map for clients
  const [clientColorMap, setClientColorMap] = useState<Map<string, string>>(new Map());

  const loadData = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    try {
      // Load all sucursales with client info
      const { data: sucursalesData, error: sucursalesError } = await supabase
        .from("cliente_sucursales")
        .select(`
          id, nombre, direccion, latitud, longitud, telefono, contacto, cliente_id,
          cliente:cliente_id (nombre),
          zona:zona_id (nombre)
        `)
        .eq("activo", true)
        .order("nombre");

      if (sucursalesError) throw sucursalesError;

      const formattedSucursales = (sucursalesData || []).map((s: any) => ({
        ...s,
        cliente_nombre: s.cliente?.nombre || "Sin cliente",
        zona_nombre: s.zona?.nombre || null,
      }));

      setSucursales(formattedSucursales);

      // Create color map for clients
      const uniqueClientIds = [...new Set(formattedSucursales.map(s => s.cliente_id))];
      const colorMap = new Map<string, string>();
      uniqueClientIds.forEach((id, index) => {
        colorMap.set(id, COLORS[index % COLORS.length]);
      });
      setClientColorMap(colorMap);

      // Load clients for filter
      const { data: clientesData, error: clientesError } = await supabase
        .from("clientes")
        .select("id, nombre")
        .eq("activo", true)
        .order("nombre");

      if (clientesError) throw clientesError;
      setClientes(clientesData || []);

    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las sucursales",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [open, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter sucursales
  const filteredSucursales = sucursales.filter(s => {
    const matchesClient = selectedClienteId === "all" || s.cliente_id === selectedClienteId;
    const matchesSearch = !searchTerm || 
      s.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.cliente_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.direccion?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesClient && matchesSearch;
  });

  // Filter only those with coordinates for the map
  const mappableSucursales = filteredSucursales.filter(s => s.latitud && s.longitud);

  // Stats
  const totalSucursales = sucursales.length;
  const conCoordenadas = sucursales.filter(s => s.latitud && s.longitud).length;
  const sinCoordenadas = totalSucursales - conCoordenadas;

  // Zoom to selected client's sucursales
  useEffect(() => {
    if (!mapRef || selectedClienteId === "all") return;

    const clientSucursales = mappableSucursales.filter(s => s.cliente_id === selectedClienteId);
    if (clientSucursales.length === 0) return;

    if (clientSucursales.length === 1) {
      mapRef.setCenter({ lat: clientSucursales[0].latitud!, lng: clientSucursales[0].longitud! });
      mapRef.setZoom(15);
    } else {
      const bounds = new google.maps.LatLngBounds();
      clientSucursales.forEach(s => {
        bounds.extend({ lat: s.latitud!, lng: s.longitud! });
      });
      mapRef.fitBounds(bounds);
    }
  }, [selectedClienteId, mapRef, mappableSucursales]);

  // Geocode all missing addresses
  const handleGeocodificarTodas = async () => {
    const sinCoords = sucursales.filter(s => !s.latitud && !s.longitud && s.direccion);
    if (sinCoords.length === 0) {
      toast({ title: "Todas las sucursales ya tienen coordenadas" });
      return;
    }

    setGeocodingProgress({ current: 0, total: sinCoords.length });
    
    const BATCH_SIZE = 10;
    let processed = 0;
    let successCount = 0;

    try {
      for (let i = 0; i < sinCoords.length; i += BATCH_SIZE) {
        const batch = sinCoords.slice(i, i + BATCH_SIZE);
        
        const { data, error } = await supabase.functions.invoke("geocode-addresses", {
          body: { 
            addresses: batch.map(s => ({ id: s.id, address: s.direccion }))
          },
        });

        if (error) {
          console.error("Geocoding batch error:", error);
          continue;
        }

        // Update database with results
        for (const result of data.results || []) {
          if (result.lat && result.lng) {
            const { error: updateError } = await supabase
              .from("cliente_sucursales")
              .update({ latitud: result.lat, longitud: result.lng })
              .eq("id", result.id);

            if (!updateError) successCount++;
          }
        }

        processed += batch.length;
        setGeocodingProgress({ current: processed, total: sinCoords.length });
      }

      toast({
        title: "Geocodificación completada",
        description: `${successCount} de ${sinCoords.length} sucursales geocodificadas`,
      });

      // Reload data
      await loadData();

    } catch (error) {
      console.error("Geocoding error:", error);
      toast({
        title: "Error",
        description: "Error durante la geocodificación",
        variant: "destructive",
      });
    } finally {
      setGeocodingProgress(null);
    }
  };

  const handleOpenInMaps = (sucursal: Sucursal) => {
    if (sucursal.latitud && sucursal.longitud) {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${sucursal.latitud},${sucursal.longitud}`,
        "_blank"
      );
    }
  };

  // Mostrar error si no hay API key o hay error de carga
  if (!hasValidApiKey()) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Mapa no disponible
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <p className="text-muted-foreground">
              La API key de Google Maps no está configurada. El mapa no está disponible en este momento.
            </p>
          </div>
          <Button onClick={() => onOpenChange(false)} variant="outline" className="w-full">
            Cerrar
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  if (loadError) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Error cargando Google Maps
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <p className="text-muted-foreground">
              No se pudo cargar Google Maps. Verifica tu conexión a internet.
            </p>
          </div>
          <Button onClick={() => onOpenChange(false)} variant="outline" className="w-full">
            Cerrar
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full h-[90vh] p-0 overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b bg-background">
            <div className="flex items-center justify-between mb-3">
              <DialogTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Mapa Global de Sucursales
              </DialogTitle>
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="secondary">{conCoordenadas} ubicadas</Badge>
                {sinCoordenadas > 0 && (
                  <Badge variant="outline" className="text-orange-600 border-orange-300">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {sinCoordenadas} sin ubicación
                  </Badge>
                )}
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar sucursal, cliente o dirección..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={selectedClienteId} onValueChange={setSelectedClienteId}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Filtrar por cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los clientes</SelectItem>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {sinCoordenadas > 0 && (
                <Button
                  variant="outline"
                  onClick={handleGeocodificarTodas}
                  disabled={!!geocodingProgress}
                >
                  {geocodingProgress ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Geocodificando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Geocodificar {sinCoordenadas} faltantes
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Geocoding progress */}
            {geocodingProgress && (
              <div className="mt-3 space-y-1">
                <Progress 
                  value={(geocodingProgress.current / geocodingProgress.total) * 100} 
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground">
                  Procesando {geocodingProgress.current} de {geocodingProgress.total} direcciones...
                </p>
              </div>
            )}
          </div>

          {/* Map */}
          <div className="flex-1 relative">
            {loading || !isLoaded ? (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <MapErrorBoundary>
                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  center={defaultCenter}
                  zoom={11}
                  onLoad={setMapRef}
                  options={{
                    streetViewControl: false,
                    mapTypeControl: true,
                    fullscreenControl: true,
                  }}
                >
                  {mappableSucursales.map((sucursal) => (
                    <Marker
                      key={sucursal.id}
                      position={{ lat: sucursal.latitud!, lng: sucursal.longitud! }}
                      onClick={() => setSelectedSucursal(sucursal)}
                      icon={{
                      path: google.maps.SymbolPath.CIRCLE,
                      scale: 10,
                      fillColor: clientColorMap.get(sucursal.cliente_id) || "#3b82f6",
                      fillOpacity: 1,
                      strokeColor: "#ffffff",
                      strokeWeight: 2,
                    }}
                    title={`${sucursal.cliente_nombre} - ${sucursal.nombre}`}
                  />
                ))}

                {selectedSucursal && selectedSucursal.latitud && selectedSucursal.longitud && (
                  <InfoWindow
                    position={{ lat: selectedSucursal.latitud, lng: selectedSucursal.longitud }}
                    onCloseClick={() => setSelectedSucursal(null)}
                  >
                    <div className="p-2 min-w-[200px]">
                      <h3 className="font-semibold text-sm">{selectedSucursal.cliente_nombre}</h3>
                      <p className="text-xs text-muted-foreground">{selectedSucursal.nombre}</p>
                      {selectedSucursal.direccion && (
                        <p className="text-xs mt-1">{selectedSucursal.direccion}</p>
                      )}
                      {selectedSucursal.telefono && (
                        <p className="text-xs text-muted-foreground">Tel: {selectedSucursal.telefono}</p>
                      )}
                      {selectedSucursal.zona_nombre && (
                        <Badge variant="outline" className="mt-2 text-xs">
                          {selectedSucursal.zona_nombre}
                        </Badge>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-2"
                        onClick={() => handleOpenInMaps(selectedSucursal)}
                      >
                        <Navigation className="h-3 w-3 mr-1" />
                        Abrir en Google Maps
                      </Button>
                    </div>
                  </InfoWindow>
                  )}
                </GoogleMap>
              </MapErrorBoundary>
            )}
          </div>

          {/* Footer with list of sucursales without coordinates */}
          {sinCoordenadas > 0 && selectedClienteId === "all" && !searchTerm && (
            <div className="border-t p-3 bg-muted/50 max-h-[120px] overflow-y-auto">
              <p className="text-xs font-medium mb-2 text-muted-foreground">
                Sucursales sin coordenadas ({sinCoordenadas}):
              </p>
              <div className="flex flex-wrap gap-1">
                {sucursales
                  .filter(s => !s.latitud && !s.longitud)
                  .slice(0, 20)
                  .map(s => (
                    <Badge key={s.id} variant="outline" className="text-xs">
                      {s.cliente_nombre} - {s.nombre}
                    </Badge>
                  ))}
                {sinCoordenadas > 20 && (
                  <Badge variant="secondary" className="text-xs">
                    +{sinCoordenadas - 20} más
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
