import { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Navigation, Loader2, AlertCircle } from "lucide-react";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from "@react-google-maps/api";

interface Cliente {
  id: string;
  nombre: string;
}

interface Sucursal {
  id: string;
  nombre: string;
  direccion: string | null;
  latitud: number | null;
  longitud: number | null;
  telefono: string | null;
  contacto: string | null;
  codigo_sucursal: string | null;
  cl: string | null;
}

interface ClienteSucursalesMapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialClienteId?: string;
}

const mapContainerStyle = {
  width: "100%",
  height: "500px",
};

const defaultCenter = {
  lat: 19.4326,
  lng: -99.1332,
};

export function ClienteSucursalesMapDialog({
  open,
  onOpenChange,
  initialClienteId,
}: ClienteSucursalesMapDialogProps) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [selectedClienteId, setSelectedClienteId] = useState<string>(initialClienteId || "");
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingClientes, setLoadingClientes] = useState(true);
  const [selectedMarker, setSelectedMarker] = useState<Sucursal | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
  });

  useEffect(() => {
    if (open) {
      loadClientes();
      if (initialClienteId) {
        setSelectedClienteId(initialClienteId);
      }
    }
  }, [open, initialClienteId]);

  useEffect(() => {
    if (selectedClienteId) {
      loadSucursales(selectedClienteId);
    } else {
      setSucursales([]);
    }
  }, [selectedClienteId]);

  const loadClientes = async () => {
    setLoadingClientes(true);
    try {
      const { data, error } = await supabase
        .from("clientes")
        .select("id, nombre")
        .eq("activo", true)
        .order("nombre");

      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error("Error loading clientes:", error);
    } finally {
      setLoadingClientes(false);
    }
  };

  const loadSucursales = async (clienteId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("cliente_sucursales")
        .select("id, nombre, direccion, latitud, longitud, telefono, contacto, codigo_sucursal, cl")
        .eq("cliente_id", clienteId)
        .eq("activo", true)
        .order("codigo_sucursal");

      if (error) throw error;
      setSucursales(data || []);

      // Fit bounds to show all markers - solo si google está disponible
      if (data && data.length > 0 && mapRef.current && typeof google !== 'undefined') {
        const bounds = new google.maps.LatLngBounds();
        let hasValidCoords = false;

        data.forEach((sucursal) => {
          if (sucursal.latitud && sucursal.longitud) {
            bounds.extend({ lat: sucursal.latitud, lng: sucursal.longitud });
            hasValidCoords = true;
          }
        });

        if (hasValidCoords) {
          mapRef.current.fitBounds(bounds);
          // Don't zoom too much for single point
          const listener = google.maps.event.addListener(mapRef.current, "idle", () => {
            if (mapRef.current && mapRef.current.getZoom()! > 15) {
              mapRef.current.setZoom(15);
            }
            google.maps.event.removeListener(listener);
          });
        }
      }
    } catch (error) {
      console.error("Error loading sucursales:", error);
    } finally {
      setLoading(false);
    }
  };

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const sucursalesWithCoords = sucursales.filter(s => s.latitud && s.longitud);
  const sucursalesWithoutCoords = sucursales.filter(s => !s.latitud || !s.longitud);

  const selectedCliente = clientes.find(c => c.id === selectedClienteId);

  const openInGoogleMaps = (sucursal: Sucursal) => {
    if (sucursal.latitud && sucursal.longitud) {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${sucursal.latitud},${sucursal.longitud}`,
        "_blank"
      );
    }
  };

  if (loadError) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Error al cargar el mapa</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>No se pudo cargar Google Maps. Verifica tu conexión o API key.</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Mapa de Sucursales
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Cliente selector */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Select
                value={selectedClienteId}
                onValueChange={setSelectedClienteId}
                disabled={loadingClientes}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      {cliente.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedCliente && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {sucursalesWithCoords.length} con coordenadas
                </Badge>
                {sucursalesWithoutCoords.length > 0 && (
                  <Badge variant="outline" className="text-amber-600">
                    {sucursalesWithoutCoords.length} sin coordenadas
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Map */}
          <div className="border rounded-lg overflow-hidden">
            {!isLoaded ? (
              <div className="h-[500px] flex items-center justify-center bg-muted">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={defaultCenter}
                zoom={10}
                onLoad={onMapLoad}
                options={{
                  streetViewControl: false,
                  mapTypeControl: true,
                  fullscreenControl: true,
                }}
              >
                {sucursalesWithCoords.map((sucursal) => (
                  <Marker
                    key={sucursal.id}
                    position={{ lat: sucursal.latitud!, lng: sucursal.longitud! }}
                    onClick={() => setSelectedMarker(sucursal)}
                    title={sucursal.nombre}
                  />
                ))}

                {selectedMarker && (
                  <InfoWindow
                    position={{ lat: selectedMarker.latitud!, lng: selectedMarker.longitud! }}
                    onCloseClick={() => setSelectedMarker(null)}
                  >
                    <div className="p-2 min-w-[200px]">
                      <h3 className="font-semibold text-sm mb-1">{selectedMarker.nombre}</h3>
                      {selectedMarker.codigo_sucursal && (
                        <p className="text-xs text-gray-600">Suc. {selectedMarker.codigo_sucursal}</p>
                      )}
                      {selectedMarker.cl && (
                        <p className="text-xs text-gray-600">CL: {selectedMarker.cl}</p>
                      )}
                      {selectedMarker.direccion && (
                        <p className="text-xs text-gray-500 mt-1">{selectedMarker.direccion}</p>
                      )}
                      {selectedMarker.telefono && (
                        <p className="text-xs text-gray-500">Tel: {selectedMarker.telefono}</p>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 w-full text-xs"
                        onClick={() => openInGoogleMaps(selectedMarker)}
                      >
                        <Navigation className="h-3 w-3 mr-1" />
                        Abrir en Google Maps
                      </Button>
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>
            )}
          </div>

          {/* Loading indicator */}
          {loading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Cargando sucursales...</span>
            </div>
          )}

          {/* List of branches without coordinates */}
          {sucursalesWithoutCoords.length > 0 && (
            <div className="border rounded-lg p-4 bg-amber-50 dark:bg-amber-950/20">
              <h4 className="font-medium text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Sucursales sin coordenadas ({sucursalesWithoutCoords.length})
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                {sucursalesWithoutCoords.map((sucursal) => (
                  <div key={sucursal.id} className="text-amber-600 dark:text-amber-500">
                    • {sucursal.codigo_sucursal ? `${sucursal.codigo_sucursal} - ` : ""}{sucursal.nombre}
                  </div>
                ))}
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-500 mt-2">
                Geocodifica estas sucursales desde el diálogo de sucursales para verlas en el mapa.
              </p>
            </div>
          )}

          {/* Empty state */}
          {!loading && selectedClienteId && sucursales.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Este cliente no tiene sucursales registradas</p>
            </div>
          )}

          {!selectedClienteId && (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Selecciona un cliente para ver sus sucursales en el mapa</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
