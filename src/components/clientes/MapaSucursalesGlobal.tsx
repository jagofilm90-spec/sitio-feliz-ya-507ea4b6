import { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
import { MapPin, Navigation, Loader2, AlertCircle, Globe, Building2 } from "lucide-react";
import { GoogleMap, Marker, InfoWindow } from "@react-google-maps/api";
import { useGoogleMapsLoader } from "@/hooks/useGoogleMapsLoader";

interface Cliente {
  id: string;
  nombre: string;
  color: string;
}

interface Zona {
  id: string;
  nombre: string;
  region: string | null;
}

interface SucursalGlobal {
  id: string;
  nombre: string;
  direccion: string | null;
  latitud: number | null;
  longitud: number | null;
  telefono: string | null;
  contacto: string | null;
  codigo_sucursal: string | null;
  cl: string | null;
  cliente_id: string;
  cliente_nombre: string;
  zona_id: string | null;
  zona_nombre: string | null;
  zona_region: string | null;
}

interface MapaSucursalesGlobalProps {
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

// Paleta de colores para distinguir clientes
const MARKER_COLORS = [
  "#EF4444", "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6",
  "#EC4899", "#06B6D4", "#F97316", "#84CC16", "#6366F1",
  "#14B8A6", "#A855F7", "#E11D48", "#0EA5E9", "#22C55E",
  "#FACC15", "#DC2626", "#2563EB", "#059669", "#D97706",
];

const REGION_LABELS: Record<string, string> = {
  cdmx_norte: "CDMX Norte",
  cdmx_centro: "CDMX Centro",
  cdmx_sur: "CDMX Sur",
  cdmx_oriente: "CDMX Oriente",
  cdmx_poniente: "CDMX Poniente",
  edomex_norte: "EdoMex Norte",
  edomex_oriente: "EdoMex Oriente",
  toluca: "Toluca",
  morelos: "Morelos",
  puebla: "Puebla",
  hidalgo: "Hidalgo",
  queretaro: "Querétaro",
  tlaxcala: "Tlaxcala",
};

function MapaSucursalesGlobal({ open, onOpenChange }: MapaSucursalesGlobalProps) {
  const { isLoaded, loadError, hasApiKey } = useGoogleMapsLoader();
  
  const [sucursales, setSucursales] = useState<SucursalGlobal[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMarker, setSelectedMarker] = useState<SucursalGlobal | null>(null);
  
  // Filters
  const [filterCliente, setFilterCliente] = useState<string>("all");
  const [filterZona, setFilterZona] = useState<string>("all");
  const [filterRegion, setFilterRegion] = useState<string>("all");
  
  const mapRef = useRef<google.maps.Map | null>(null);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: sucursalesData, error: sucursalesError } = await supabase
        .from("cliente_sucursales")
        .select(`
          id, nombre, direccion, latitud, longitud, telefono, contacto, 
          codigo_sucursal, cl, cliente_id, zona_id,
          clientes!inner(id, nombre),
          zonas(id, nombre, region)
        `)
        .eq("activo", true)
        .not("latitud", "is", null)
        .not("longitud", "is", null);

      if (sucursalesError) throw sucursalesError;

      const clientesMap = new Map<string, Cliente>();
      let colorIndex = 0;
      
      sucursalesData?.forEach((s: any) => {
        if (!clientesMap.has(s.cliente_id)) {
          clientesMap.set(s.cliente_id, {
            id: s.cliente_id,
            nombre: s.clientes.nombre,
            color: MARKER_COLORS[colorIndex % MARKER_COLORS.length],
          });
          colorIndex++;
        }
      });

      const clientesList = Array.from(clientesMap.values()).sort((a, b) => 
        a.nombre.localeCompare(b.nombre)
      );
      setClientes(clientesList);

      const transformedSucursales: SucursalGlobal[] = (sucursalesData || []).map((s: any) => ({
        id: s.id,
        nombre: s.nombre,
        direccion: s.direccion,
        latitud: s.latitud,
        longitud: s.longitud,
        telefono: s.telefono,
        contacto: s.contacto,
        codigo_sucursal: s.codigo_sucursal,
        cl: s.cl,
        cliente_id: s.cliente_id,
        cliente_nombre: s.clientes.nombre,
        zona_id: s.zona_id,
        zona_nombre: s.zonas?.nombre || null,
        zona_region: s.zonas?.region || null,
      }));

      setSucursales(transformedSucursales);

      const { data: zonasData } = await supabase
        .from("zonas")
        .select("id, nombre, region")
        .eq("activo", true)
        .order("nombre");

      setZonas(zonasData || []);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const regions = useMemo(() => {
    const uniqueRegions = new Set<string>();
    zonas.forEach(z => {
      if (z.region) uniqueRegions.add(z.region);
    });
    return Array.from(uniqueRegions).sort();
  }, [zonas]);

  const filteredSucursales = useMemo(() => {
    return sucursales.filter(s => {
      if (filterCliente !== "all" && s.cliente_id !== filterCliente) return false;
      if (filterZona !== "all" && s.zona_id !== filterZona) return false;
      if (filterRegion !== "all" && s.zona_region !== filterRegion) return false;
      return true;
    });
  }, [sucursales, filterCliente, filterZona, filterRegion]);

  const getClienteColor = useCallback((clienteId: string) => {
    return clientes.find(c => c.id === clienteId)?.color || MARKER_COLORS[0];
  }, [clientes]);

  const createMarkerIcon = useCallback((color: string) => {
    if (!isLoaded || typeof google === 'undefined') return undefined;
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="36" viewBox="0 0 24 36">
        <path fill="${color}" stroke="#FFFFFF" stroke-width="1.5" d="M12 0C5.4 0 0 5.4 0 12c0 7.2 12 24 12 24s12-16.8 12-24c0-6.6-5.4-12-12-12z"/>
        <circle fill="#FFFFFF" cx="12" cy="12" r="5"/>
      </svg>
    `;
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: new google.maps.Size(28, 42),
      anchor: new google.maps.Point(14, 42),
    };
  }, [isLoaded]);

  useEffect(() => {
    if (mapRef.current && filteredSucursales.length > 0 && isLoaded && typeof google !== 'undefined') {
      const bounds = new google.maps.LatLngBounds();
      filteredSucursales.forEach((s) => {
        if (s.latitud && s.longitud) {
          bounds.extend({ lat: s.latitud, lng: s.longitud });
        }
      });
      mapRef.current.fitBounds(bounds);
      
      const listener = google.maps.event.addListener(mapRef.current, "idle", () => {
        if (mapRef.current && mapRef.current.getZoom()! > 15) {
          mapRef.current.setZoom(15);
        }
        google.maps.event.removeListener(listener);
      });
    }
  }, [filteredSucursales, isLoaded]);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const openInGoogleMaps = (sucursal: SucursalGlobal) => {
    if (sucursal.latitud && sucursal.longitud) {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${sucursal.latitud},${sucursal.longitud}`,
        "_blank"
      );
    }
  };

  const statsByCliente = useMemo(() => {
    const stats: Record<string, number> = {};
    filteredSucursales.forEach(s => {
      stats[s.cliente_id] = (stats[s.cliente_id] || 0) + 1;
    });
    return stats;
  }, [filteredSucursales]);

  // No API key
  if (!hasApiKey) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              Mapa no disponible
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-6">
            <Globe className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">
              La API de Google Maps no está configurada.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Load error
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
      <DialogContent className="max-w-[95vw] w-[1400px] h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Mapa Global - Todas las Sucursales
          </DialogTitle>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary">
              {filteredSucursales.length} sucursales con GPS
            </Badge>
            <Badge variant="outline">
              {clientes.length} clientes
            </Badge>
          </div>
        </DialogHeader>

        {/* Filters */}
        <div className="px-6 py-3 border-b bg-muted/30 flex flex-wrap gap-3 items-center shrink-0">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <Select value={filterCliente} onValueChange={setFilterCliente}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Todos los clientes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los clientes</SelectItem>
                {clientes.map((cliente) => (
                  <SelectItem key={cliente.id} value={cliente.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full shrink-0" 
                        style={{ backgroundColor: cliente.color }}
                      />
                      {cliente.nombre}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <Select value={filterZona} onValueChange={setFilterZona}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Todas las zonas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las zonas</SelectItem>
                {zonas.map((zona) => (
                  <SelectItem key={zona.id} value={zona.id}>
                    {zona.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <Select value={filterRegion} onValueChange={setFilterRegion}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Todas las regiones" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las regiones</SelectItem>
                {regions.map((region) => (
                  <SelectItem key={region} value={region}>
                    {REGION_LABELS[region] || region}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(filterCliente !== "all" || filterZona !== "all" || filterRegion !== "all") && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                setFilterCliente("all");
                setFilterZona("all");
                setFilterRegion("all");
              }}
            >
              Limpiar filtros
            </Button>
          )}
        </div>

        {/* Main content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Map */}
          <div className="flex-1 relative">
            {loading || !isLoaded ? (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
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
                {filteredSucursales.map((sucursal) => (
                  <Marker
                    key={sucursal.id}
                    position={{ lat: sucursal.latitud!, lng: sucursal.longitud! }}
                    onClick={() => setSelectedMarker(sucursal)}
                    title={`${sucursal.cliente_nombre} - ${sucursal.nombre}`}
                    icon={createMarkerIcon(getClienteColor(sucursal.cliente_id))}
                  />
                ))}

                {selectedMarker && (
                  <InfoWindow
                    position={{ lat: selectedMarker.latitud!, lng: selectedMarker.longitud! }}
                    onCloseClick={() => setSelectedMarker(null)}
                  >
                    <div className="p-2 min-w-[220px]">
                      <div className="flex items-center gap-2 mb-2">
                        <div 
                          className="w-3 h-3 rounded-full shrink-0" 
                          style={{ backgroundColor: getClienteColor(selectedMarker.cliente_id) }}
                        />
                        <span className="font-semibold text-sm">{selectedMarker.cliente_nombre}</span>
                      </div>
                      <h3 className="font-medium text-sm">{selectedMarker.nombre}</h3>
                      {selectedMarker.codigo_sucursal && (
                        <p className="text-xs text-gray-600">Suc. {selectedMarker.codigo_sucursal}</p>
                      )}
                      {selectedMarker.cl && (
                        <p className="text-xs text-gray-600">CL: {selectedMarker.cl}</p>
                      )}
                      {selectedMarker.zona_nombre && (
                        <p className="text-xs text-gray-500">Zona: {selectedMarker.zona_nombre}</p>
                      )}
                      {selectedMarker.direccion && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{selectedMarker.direccion}</p>
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

          {/* Legend sidebar */}
          <div className="w-[280px] border-l bg-background overflow-y-auto shrink-0">
            <div className="p-4">
              <h3 className="font-semibold text-sm mb-3">Clientes en el mapa</h3>
              <div className="space-y-2">
                {clientes
                  .filter(c => statsByCliente[c.id])
                  .sort((a, b) => (statsByCliente[b.id] || 0) - (statsByCliente[a.id] || 0))
                  .map((cliente) => (
                    <button
                      key={cliente.id}
                      className={`w-full flex items-center gap-2 p-2 rounded-md text-left text-sm hover:bg-muted transition-colors ${
                        filterCliente === cliente.id ? "bg-muted ring-1 ring-primary" : ""
                      }`}
                      onClick={() => setFilterCliente(
                        filterCliente === cliente.id ? "all" : cliente.id
                      )}
                    >
                      <div 
                        className="w-3 h-3 rounded-full shrink-0" 
                        style={{ backgroundColor: cliente.color }}
                      />
                      <span className="flex-1 truncate">{cliente.nombre}</span>
                      <Badge variant="secondary" className="text-xs">
                        {statsByCliente[cliente.id] || 0}
                      </Badge>
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default MapaSucursalesGlobal;
