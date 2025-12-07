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
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { 
  MapPin, Navigation, Loader2, AlertCircle, Globe, Building2, 
  Search, X, ChevronDown, ChevronRight, Download, Image, FileSpreadsheet,
  MapPinOff, RefreshCw, BarChart3
} from "lucide-react";
import { GoogleMap, Marker, InfoWindow, MarkerClusterer } from "@react-google-maps/api";
import { useGoogleMapsLoader } from "@/hooks/useGoogleMapsLoader";
import { toast } from "sonner";
import html2canvas from "html2canvas";

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

// Cluster styles
const clusterStyles = [
  {
    textColor: "white",
    url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
        <circle fill="#3B82F6" cx="20" cy="20" r="18" stroke="#FFFFFF" stroke-width="3"/>
      </svg>
    `),
    height: 40,
    width: 40,
  },
  {
    textColor: "white",
    url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 50 50">
        <circle fill="#8B5CF6" cx="25" cy="25" r="22" stroke="#FFFFFF" stroke-width="3"/>
      </svg>
    `),
    height: 50,
    width: 50,
  },
  {
    textColor: "white",
    url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60">
        <circle fill="#EC4899" cx="30" cy="30" r="26" stroke="#FFFFFF" stroke-width="3"/>
      </svg>
    `),
    height: 60,
    width: 60,
  },
];

function MapaSucursalesGlobal({ open, onOpenChange }: MapaSucursalesGlobalProps) {
  const { isLoaded, loadError, hasApiKey } = useGoogleMapsLoader();
  
  const [sucursalesConGPS, setSucursalesConGPS] = useState<SucursalGlobal[]>([]);
  const [sucursalesSinGPS, setSucursalesSinGPS] = useState<SucursalGlobal[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMarker, setSelectedMarker] = useState<SucursalGlobal | null>(null);
  const [hoveredMarker, setHoveredMarker] = useState<SucursalGlobal | null>(null);
  
  // Filters
  const [filterCliente, setFilterCliente] = useState<string>("all");
  const [filterZona, setFilterZona] = useState<string>("all");
  const [filterRegion, setFilterRegion] = useState<string>("all");
  
  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchQuerySinGPS, setSearchQuerySinGPS] = useState("");
  
  // Sidebar sections
  const [showSucursalesList, setShowSucursalesList] = useState(true);
  const [showSinGPSList, setShowSinGPSList] = useState(false);
  const [showStats, setShowStats] = useState(true);
  
  // Geocoding
  const [geocodingProgress, setGeocodingProgress] = useState<{ current: number; total: number } | null>(null);
  const [geocodingSingle, setGeocodingSingle] = useState<string | null>(null);
  
  // Export
  const [exporting, setExporting] = useState(false);
  
  const mapRef = useRef<google.maps.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load sucursales WITH GPS
      const { data: conGPS, error: conGPSError } = await supabase
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

      if (conGPSError) throw conGPSError;

      // Load sucursales WITHOUT GPS
      const { data: sinGPS, error: sinGPSError } = await supabase
        .from("cliente_sucursales")
        .select(`
          id, nombre, direccion, latitud, longitud, telefono, contacto, 
          codigo_sucursal, cl, cliente_id, zona_id,
          clientes!inner(id, nombre),
          zonas(id, nombre, region)
        `)
        .eq("activo", true)
        .or("latitud.is.null,longitud.is.null");

      if (sinGPSError) throw sinGPSError;

      // Build clientes map from both sets
      const clientesMap = new Map<string, Cliente>();
      let colorIndex = 0;
      
      [...(conGPS || []), ...(sinGPS || [])].forEach((s: any) => {
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

      // Transform sucursales with GPS
      const transformedConGPS: SucursalGlobal[] = (conGPS || []).map((s: any) => ({
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
      setSucursalesConGPS(transformedConGPS);

      // Transform sucursales without GPS
      const transformedSinGPS: SucursalGlobal[] = (sinGPS || []).map((s: any) => ({
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
      setSucursalesSinGPS(transformedSinGPS);

      // Load zonas
      const { data: zonasData } = await supabase
        .from("zonas")
        .select("id, nombre, region")
        .eq("activo", true)
        .order("nombre");

      setZonas(zonasData || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Error al cargar datos del mapa");
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
    return sucursalesConGPS.filter(s => {
      if (filterCliente !== "all" && s.cliente_id !== filterCliente) return false;
      if (filterZona !== "all" && s.zona_id !== filterZona) return false;
      if (filterRegion !== "all" && s.zona_region !== filterRegion) return false;
      return true;
    });
  }, [sucursalesConGPS, filterCliente, filterZona, filterRegion]);

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

  // Navigate to sucursal on map
  const navigateToSucursal = useCallback((sucursal: SucursalGlobal) => {
    if (mapRef.current && sucursal.latitud && sucursal.longitud) {
      mapRef.current.panTo({ lat: sucursal.latitud, lng: sucursal.longitud });
      mapRef.current.setZoom(16);
      setSelectedMarker(sucursal);
    }
  }, []);

  // Filtered sucursales for search list
  const searchFilteredSucursales = useMemo(() => {
    if (!searchQuery.trim()) return filteredSucursales;
    const query = searchQuery.toLowerCase().trim();
    return filteredSucursales.filter(s => 
      s.nombre.toLowerCase().includes(query) ||
      s.cliente_nombre.toLowerCase().includes(query) ||
      s.codigo_sucursal?.toLowerCase().includes(query) ||
      s.cl?.toLowerCase().includes(query) ||
      s.zona_nombre?.toLowerCase().includes(query) ||
      s.direccion?.toLowerCase().includes(query)
    );
  }, [filteredSucursales, searchQuery]);

  // Filtered sucursales sin GPS for search
  const searchFilteredSinGPS = useMemo(() => {
    if (!searchQuerySinGPS.trim()) return sucursalesSinGPS;
    const query = searchQuerySinGPS.toLowerCase().trim();
    return sucursalesSinGPS.filter(s => 
      s.nombre.toLowerCase().includes(query) ||
      s.cliente_nombre.toLowerCase().includes(query) ||
      s.codigo_sucursal?.toLowerCase().includes(query) ||
      s.direccion?.toLowerCase().includes(query)
    );
  }, [sucursalesSinGPS, searchQuerySinGPS]);

  const statsByCliente = useMemo(() => {
    const stats: Record<string, number> = {};
    filteredSucursales.forEach(s => {
      stats[s.cliente_id] = (stats[s.cliente_id] || 0) + 1;
    });
    return stats;
  }, [filteredSucursales]);

  // Stats by region
  const statsByRegion = useMemo(() => {
    const stats: Record<string, number> = {};
    sucursalesConGPS.forEach(s => {
      const region = s.zona_region || "sin_region";
      stats[region] = (stats[region] || 0) + 1;
    });
    return stats;
  }, [sucursalesConGPS]);

  // GPS coverage percentage
  const gpsCoverage = useMemo(() => {
    const total = sucursalesConGPS.length + sucursalesSinGPS.length;
    if (total === 0) return 0;
    return Math.round((sucursalesConGPS.length / total) * 100);
  }, [sucursalesConGPS, sucursalesSinGPS]);

  // Geocode single sucursal
  const geocodeSingle = async (sucursal: SucursalGlobal) => {
    if (!sucursal.direccion) {
      toast.error("Esta sucursal no tiene dirección registrada");
      return;
    }

    setGeocodingSingle(sucursal.id);
    try {
      const { data, error } = await supabase.functions.invoke("geocode-addresses", {
        body: { addresses: [{ id: sucursal.id, address: sucursal.direccion }] }
      });

      if (error) throw error;

      const result = data?.results?.[0];
      if (result?.lat && result?.lng) {
        // Update database
        await supabase
          .from("cliente_sucursales")
          .update({ latitud: result.lat, longitud: result.lng })
          .eq("id", sucursal.id);

        // Move from sinGPS to conGPS
        const updatedSucursal = { ...sucursal, latitud: result.lat, longitud: result.lng };
        setSucursalesSinGPS(prev => prev.filter(s => s.id !== sucursal.id));
        setSucursalesConGPS(prev => [...prev, updatedSucursal]);
        
        toast.success(`Geocodificado: ${sucursal.nombre}`);
      } else {
        toast.error(`No se encontraron coordenadas: ${result?.error || "Sin resultados"}`);
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      toast.error("Error al geocodificar");
    } finally {
      setGeocodingSingle(null);
    }
  };

  // Geocode batch
  const geocodeBatch = async () => {
    const toGeocode = sucursalesSinGPS
      .filter(s => s.direccion)
      .slice(0, 50);

    if (toGeocode.length === 0) {
      toast.error("No hay sucursales con dirección para geocodificar");
      return;
    }

    setGeocodingProgress({ current: 0, total: toGeocode.length });

    try {
      const addresses = toGeocode.map(s => ({ id: s.id, address: s.direccion! }));
      
      const { data, error } = await supabase.functions.invoke("geocode-addresses", {
        body: { addresses }
      });

      if (error) throw error;

      let successCount = 0;
      const successfulIds: string[] = [];
      const updatedSucursales: SucursalGlobal[] = [];

      for (const result of data?.results || []) {
        setGeocodingProgress(prev => prev ? { ...prev, current: prev.current + 1 } : null);
        
        if (result.lat && result.lng) {
          await supabase
            .from("cliente_sucursales")
            .update({ latitud: result.lat, longitud: result.lng })
            .eq("id", result.id);

          const sucursal = toGeocode.find(s => s.id === result.id);
          if (sucursal) {
            successfulIds.push(result.id);
            updatedSucursales.push({ ...sucursal, latitud: result.lat, longitud: result.lng });
          }
          successCount++;
        }
      }

      // Update state
      setSucursalesSinGPS(prev => prev.filter(s => !successfulIds.includes(s.id)));
      setSucursalesConGPS(prev => [...prev, ...updatedSucursales]);

      toast.success(`Geocodificadas ${successCount} de ${toGeocode.length} sucursales`);
    } catch (error) {
      console.error("Batch geocoding error:", error);
      toast.error("Error en geocodificación por lote");
    } finally {
      setGeocodingProgress(null);
    }
  };

  // Export as PNG
  const exportAsPNG = async () => {
    if (!mapContainerRef.current) return;
    
    setExporting(true);
    try {
      const canvas = await html2canvas(mapContainerRef.current, {
        useCORS: true,
        allowTaint: true,
        scale: 2,
      });
      
      const link = document.createElement("a");
      link.download = `mapa-sucursales-${new Date().toISOString().split("T")[0]}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      
      toast.success("Mapa exportado como imagen");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Error al exportar imagen");
    } finally {
      setExporting(false);
    }
  };

  // Export as CSV
  const exportAsCSV = (includeAll: boolean = true) => {
    const data = includeAll 
      ? [...sucursalesConGPS, ...sucursalesSinGPS]
      : sucursalesSinGPS;
    
    const headers = ["Cliente", "Sucursal", "Código", "CL", "Zona", "Región", "Dirección", "Latitud", "Longitud", "Tiene GPS"];
    const rows = data.map(s => [
      s.cliente_nombre,
      s.nombre,
      s.codigo_sucursal || "",
      s.cl || "",
      s.zona_nombre || "",
      REGION_LABELS[s.zona_region || ""] || s.zona_region || "",
      (s.direccion || "").replace(/,/g, ";"),
      s.latitud?.toString() || "",
      s.longitud?.toString() || "",
      s.latitud && s.longitud ? "Sí" : "No"
    ]);

    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = includeAll 
      ? `sucursales-todas-${new Date().toISOString().split("T")[0]}.csv`
      : `sucursales-sin-gps-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    
    toast.success(`Exportadas ${data.length} sucursales`);
  };

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
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Mapa Global - Todas las Sucursales
              </DialogTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary" className="gap-1">
                  <MapPin className="h-3 w-3" />
                  {sucursalesConGPS.length} con GPS
                </Badge>
                {sucursalesSinGPS.length > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <MapPinOff className="h-3 w-3" />
                    {sucursalesSinGPS.length} sin GPS
                  </Badge>
                )}
                <Badge variant="outline">
                  {clientes.length} clientes
                </Badge>
              </div>
            </div>
            
            {/* Export buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportAsPNG}
                disabled={exporting}
              >
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Image className="h-4 w-4" />}
                <span className="ml-1.5 hidden sm:inline">PNG</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportAsCSV(true)}
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span className="ml-1.5 hidden sm:inline">CSV</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportAsCSV(false)}
                disabled={sucursalesSinGPS.length === 0}
              >
                <Download className="h-4 w-4" />
                <span className="ml-1.5 hidden sm:inline">Sin GPS</span>
              </Button>
            </div>
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
          <div className="flex-1 relative" ref={mapContainerRef}>
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
                <MarkerClusterer
                  options={{
                    gridSize: 60,
                    maxZoom: 14,
                    styles: clusterStyles,
                  }}
                >
                  {(clusterer) => (
                    <>
                      {filteredSucursales.map((sucursal) => (
                        <Marker
                          key={sucursal.id}
                          position={{ lat: sucursal.latitud!, lng: sucursal.longitud! }}
                          onClick={() => setSelectedMarker(sucursal)}
                          onMouseOver={() => setHoveredMarker(sucursal)}
                          onMouseOut={() => setHoveredMarker(null)}
                          title={`${sucursal.cliente_nombre} - ${sucursal.nombre}`}
                          icon={createMarkerIcon(getClienteColor(sucursal.cliente_id))}
                          clusterer={clusterer}
                        />
                      ))}
                    </>
                  )}
                </MarkerClusterer>

                {/* Hover tooltip */}
                {hoveredMarker && !selectedMarker && (
                  <InfoWindow
                    position={{ lat: hoveredMarker.latitud!, lng: hoveredMarker.longitud! }}
                    options={{ 
                      disableAutoPan: true,
                      pixelOffset: new google.maps.Size(0, -35)
                    }}
                  >
                    <div className="p-1 min-w-[150px]">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full shrink-0" 
                          style={{ backgroundColor: getClienteColor(hoveredMarker.cliente_id) }}
                        />
                        <span className="font-medium text-xs">{hoveredMarker.cliente_nombre}</span>
                      </div>
                      <p className="text-xs text-gray-700 mt-0.5">{hoveredMarker.nombre}</p>
                    </div>
                  </InfoWindow>
                )}

                {/* Selected marker InfoWindow */}
                {selectedMarker && (
                  <InfoWindow
                    position={{ lat: selectedMarker.latitud!, lng: selectedMarker.longitud! }}
                    onCloseClick={() => setSelectedMarker(null)}
                  >
                    <div className="p-2 min-w-[220px]">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full shrink-0" 
                            style={{ backgroundColor: getClienteColor(selectedMarker.cliente_id) }}
                          />
                          <span className="font-semibold text-sm">{selectedMarker.cliente_nombre}</span>
                        </div>
                        <button 
                          onClick={() => setSelectedMarker(null)}
                          className="text-gray-400 hover:text-gray-600 text-lg font-bold leading-none p-0.5 -mt-1 -mr-1"
                        >
                          ✕
                        </button>
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

          {/* Sidebar */}
          <div className="w-[320px] border-l bg-background flex flex-col shrink-0">
            <ScrollArea className="flex-1">
              {/* Stats section */}
              <div className="p-3 border-b">
                <button
                  onClick={() => setShowStats(!showStats)}
                  className="flex items-center gap-2 w-full text-left font-semibold text-sm mb-2"
                >
                  {showStats ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <BarChart3 className="h-4 w-4" />
                  <span>Estadísticas</span>
                </button>
                
                {showStats && (
                  <div className="space-y-3">
                    {/* GPS Coverage */}
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Cobertura GPS</span>
                        <span className="font-semibold">{gpsCoverage}%</span>
                      </div>
                      <Progress value={gpsCoverage} className="h-2" />
                      <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                        <span>{sucursalesConGPS.length} con GPS</span>
                        <span>{sucursalesSinGPS.length} sin GPS</span>
                      </div>
                    </div>

                    {/* By Region */}
                    <div>
                      <h4 className="text-xs font-medium mb-1.5 text-muted-foreground">Por Región</h4>
                      <div className="grid grid-cols-2 gap-1">
                        {Object.entries(statsByRegion)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 6)
                          .map(([region, count]) => (
                            <div key={region} className="flex items-center justify-between text-xs bg-muted/30 rounded px-2 py-1">
                              <span className="truncate">{REGION_LABELS[region] || "Sin región"}</span>
                              <Badge variant="secondary" className="text-[10px] h-4 px-1">{count}</Badge>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Top Clients */}
                    <div>
                      <h4 className="text-xs font-medium mb-1.5 text-muted-foreground">Top Clientes</h4>
                      <div className="space-y-1">
                        {clientes
                          .filter(c => statsByCliente[c.id])
                          .sort((a, b) => (statsByCliente[b.id] || 0) - (statsByCliente[a.id] || 0))
                          .slice(0, 5)
                          .map((cliente) => (
                            <div key={cliente.id} className="flex items-center gap-2 text-xs">
                              <div 
                                className="w-2 h-2 rounded-full shrink-0" 
                                style={{ backgroundColor: cliente.color }}
                              />
                              <span className="flex-1 truncate">{cliente.nombre}</span>
                              <Badge variant="secondary" className="text-[10px] h-4 px-1">
                                {statsByCliente[cliente.id]}
                              </Badge>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Search and list - with GPS */}
              <div className="p-3 border-b">
                <button
                  onClick={() => setShowSucursalesList(!showSucursalesList)}
                  className="flex items-center gap-2 w-full text-left font-semibold text-sm mb-2"
                >
                  {showSucursalesList ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <MapPin className="h-4 w-4 text-green-600" />
                  <span>Con GPS</span>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {filteredSucursales.length}
                  </Badge>
                </button>
                
                {showSucursalesList && (
                  <>
                    <div className="relative mb-2">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 pr-8 h-8 text-xs"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    <div className="space-y-1 max-h-[200px] overflow-y-auto">
                      {searchFilteredSucursales.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          No se encontraron sucursales
                        </p>
                      ) : (
                        searchFilteredSucursales.slice(0, 50).map((sucursal) => (
                          <button
                            key={sucursal.id}
                            onClick={() => navigateToSucursal(sucursal)}
                            className={`w-full flex items-start gap-2 p-2 rounded-md text-left text-xs hover:bg-muted transition-colors ${
                              selectedMarker?.id === sucursal.id ? "bg-muted ring-1 ring-primary" : ""
                            }`}
                          >
                            <div 
                              className="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5" 
                              style={{ backgroundColor: getClienteColor(sucursal.cliente_id) }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{sucursal.nombre}</p>
                              <p className="text-muted-foreground truncate">{sucursal.cliente_nombre}</p>
                            </div>
                          </button>
                        ))
                      )}
                      {searchFilteredSucursales.length > 50 && (
                        <p className="text-xs text-muted-foreground text-center py-2">
                          +{searchFilteredSucursales.length - 50} más...
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Sucursales sin GPS */}
              <div className="p-3 border-b">
                <button
                  onClick={() => setShowSinGPSList(!showSinGPSList)}
                  className="flex items-center gap-2 w-full text-left font-semibold text-sm mb-2"
                >
                  {showSinGPSList ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <MapPinOff className="h-4 w-4 text-destructive" />
                  <span>Sin GPS</span>
                  <Badge variant="destructive" className="ml-auto text-xs">
                    {sucursalesSinGPS.length}
                  </Badge>
                </button>
                
                {showSinGPSList && (
                  <>
                    {/* Geocoding progress */}
                    {geocodingProgress && (
                      <div className="mb-3 bg-muted/50 rounded-lg p-2">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span>Geocodificando...</span>
                          <span>{geocodingProgress.current}/{geocodingProgress.total}</span>
                        </div>
                        <Progress value={(geocodingProgress.current / geocodingProgress.total) * 100} className="h-1.5" />
                      </div>
                    )}

                    {/* Batch geocode button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mb-2 text-xs"
                      onClick={geocodeBatch}
                      disabled={geocodingProgress !== null || sucursalesSinGPS.filter(s => s.direccion).length === 0}
                    >
                      <RefreshCw className={`h-3 w-3 mr-1.5 ${geocodingProgress ? 'animate-spin' : ''}`} />
                      Geocodificar Lote (máx. 50)
                    </Button>

                    <div className="relative mb-2">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar..."
                        value={searchQuerySinGPS}
                        onChange={(e) => setSearchQuerySinGPS(e.target.value)}
                        className="pl-8 pr-8 h-8 text-xs"
                      />
                      {searchQuerySinGPS && (
                        <button
                          onClick={() => setSearchQuerySinGPS("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    <div className="space-y-1 max-h-[200px] overflow-y-auto">
                      {searchFilteredSinGPS.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          Todas las sucursales tienen GPS
                        </p>
                      ) : (
                        searchFilteredSinGPS.slice(0, 50).map((sucursal) => (
                          <div
                            key={sucursal.id}
                            className="flex items-start gap-2 p-2 rounded-md text-xs bg-destructive/5 border border-destructive/10"
                          >
                            <MapPinOff className="h-3 w-3 text-destructive shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{sucursal.nombre}</p>
                              <p className="text-muted-foreground truncate">{sucursal.cliente_nombre}</p>
                              {sucursal.direccion ? (
                                <p className="text-[10px] text-muted-foreground/70 truncate mt-0.5">
                                  {sucursal.direccion}
                                </p>
                              ) : (
                                <p className="text-[10px] text-destructive mt-0.5">Sin dirección</p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 shrink-0"
                              onClick={() => geocodeSingle(sucursal)}
                              disabled={!sucursal.direccion || geocodingSingle === sucursal.id}
                              title="Geocodificar"
                            >
                              {geocodingSingle === sucursal.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <MapPin className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        ))
                      )}
                      {searchFilteredSinGPS.length > 50 && (
                        <p className="text-xs text-muted-foreground text-center py-2">
                          +{searchFilteredSinGPS.length - 50} más...
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Clientes legend */}
              <div className="p-3">
                <h3 className="font-semibold text-sm mb-2">Clientes en el mapa</h3>
                <div className="space-y-1">
                  {clientes
                    .filter(c => statsByCliente[c.id])
                    .sort((a, b) => (statsByCliente[b.id] || 0) - (statsByCliente[a.id] || 0))
                    .map((cliente) => (
                      <button
                        key={cliente.id}
                        className={`w-full flex items-center gap-2 p-2 rounded-md text-left text-xs hover:bg-muted transition-colors ${
                          filterCliente === cliente.id ? "bg-muted ring-1 ring-primary" : ""
                        }`}
                        onClick={() => setFilterCliente(
                          filterCliente === cliente.id ? "all" : cliente.id
                        )}
                      >
                        <div 
                          className="w-2.5 h-2.5 rounded-full shrink-0" 
                          style={{ backgroundColor: cliente.color }}
                        />
                        <span className="flex-1 truncate">{cliente.nombre}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {statsByCliente[cliente.id] || 0}
                        </Badge>
                      </button>
                    ))}
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default MapaSucursalesGlobal;
