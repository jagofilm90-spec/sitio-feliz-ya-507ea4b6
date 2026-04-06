/**
 * Mapa global de clientes y sucursales
 * ⚠️ REGLAS GOOGLE MAPS: Nunca usar google.maps.* como tipo, siempre usar any
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from "@react-google-maps/api";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, MapPin, Loader2, AlertTriangle, Users, Truck, RefreshCw } from "lucide-react";
import { ErrorBoundaryModule } from "@/components/ErrorBoundaryModule";

interface PuntoEntrega {
  id: string;
  nombre: string;
  direccion: string | null;
  latitud: number | null;
  longitud: number | null;
  telefono: string | null;
  clienteId: string;
  clienteNombre: string;
  clienteCodigo: string;
  vendedorNombre: string | null;
  vendedorId: string | null;
  zonaNombre: string | null;
  tipo: "cliente" | "sucursal";
}

const VENDEDOR_COLORS: Record<string, string> = {};
const COLOR_PALETTE = [
  "#E53935", "#1E88E5", "#43A047", "#FB8C00", "#8E24AA",
  "#00897B", "#D81B60", "#3949AB", "#6D4C41", "#546E7A",
];

function getVendedorColor(vendedorId: string | null): string {
  if (!vendedorId) return "#757575"; // Gris = de la casa
  if (!VENDEDOR_COLORS[vendedorId]) {
    const idx = Object.keys(VENDEDOR_COLORS).length % COLOR_PALETTE.length;
    VENDEDOR_COLORS[vendedorId] = COLOR_PALETTE[idx];
  }
  return VENDEDOR_COLORS[vendedorId];
}

function createMarkerIcon(color: string) {
  return {
    path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z",
    fillColor: color,
    fillOpacity: 1,
    strokeColor: "#fff",
    strokeWeight: 2,
    scale: 1.5,
    anchor: { x: 12, y: 22 } as any,
  };
}

const defaultCenter = { lat: 19.4326, lng: -99.1332 };

interface ClientesMapaTabProps {
  onSugerirRutas?: () => void;
}

export function ClientesMapaTab({ onSugerirRutas }: ClientesMapaTabProps) {
  const [puntos, setPuntos] = useState<PuntoEntrega[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [vendedorFilter, setVendedorFilter] = useState("todos");
  const [selectedPunto, setSelectedPunto] = useState<PuntoEntrega | null>(null);
  const [sinGeocodificar, setSinGeocodificar] = useState(0);
  const [geocodificando, setGeocodificando] = useState(false);
  const { toast } = useToast();

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
  });

  // Load all clients + sucursales with coordinates
  const loadPuntos = useCallback(async () => {
    setLoading(true);
    try {
      // Get clients with their primary address
      const { data: clientes } = await supabase
        .from("clientes")
        .select("id, codigo, nombre, direccion, telefono, vendedor_asignado, zona:zonas(nombre)")
        .eq("activo", true)
        .order("nombre");

      // Get all sucursales with coordinates
      const { data: sucursales } = await supabase
        .from("cliente_sucursales")
        .select("id, nombre, direccion, latitud, longitud, telefono, cliente_id, zona:zonas(nombre)")
        .eq("activo", true);

      // Get vendedor names
      const vendedorIds = [...new Set((clientes || []).map(c => c.vendedor_asignado).filter(Boolean))];
      let vendedorMap: Record<string, string> = {};
      if (vendedorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", vendedorIds);
        if (profiles) {
          vendedorMap = profiles.reduce((acc, p) => { acc[p.id] = p.full_name || "Vendedor"; return acc; }, {} as Record<string, string>);
        }
      }

      const resultado: PuntoEntrega[] = [];
      let sinCoords = 0;

      // Clientes that have sucursales → use sucursales
      const clientesConSucursales = new Set((sucursales || []).map(s => s.cliente_id));

      for (const c of clientes || []) {
        if (clientesConSucursales.has(c.id)) {
          // Use sucursales as delivery points
          const suc = (sucursales || []).filter(s => s.cliente_id === c.id);
          for (const s of suc) {
            if (s.latitud && s.longitud) {
              resultado.push({
                id: s.id,
                nombre: s.nombre,
                direccion: s.direccion,
                latitud: s.latitud,
                longitud: s.longitud,
                telefono: s.telefono,
                clienteId: c.id,
                clienteNombre: c.nombre,
                clienteCodigo: c.codigo,
                vendedorNombre: c.vendedor_asignado ? vendedorMap[c.vendedor_asignado] || null : null,
                vendedorId: c.vendedor_asignado,
                zonaNombre: (s.zona as any)?.nombre || null,
                tipo: "sucursal",
              });
            } else {
              sinCoords++;
            }
          }
        }
        // Note: clients without sucursales would need geocoding of their address
        // For now they won't show on map unless they have sucursales with coords
      }

      setPuntos(resultado);
      setSinGeocodificar(sinCoords);
    } catch (err) {
      console.error(err);
      toast({ title: "Error al cargar puntos", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadPuntos(); }, [loadPuntos]);

  // Unique vendedores for filter
  const vendedores = useMemo(() => {
    const map = new Map<string, string>();
    puntos.forEach(p => {
      if (p.vendedorId && p.vendedorNombre) {
        map.set(p.vendedorId, p.vendedorNombre);
      }
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [puntos]);

  // Filtered points
  const filtered = useMemo(() => {
    let result = puntos;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(p =>
        p.clienteNombre.toLowerCase().includes(term) ||
        p.nombre.toLowerCase().includes(term) ||
        p.clienteCodigo.toLowerCase().includes(term) ||
        (p.direccion?.toLowerCase() || "").includes(term)
      );
    }
    if (vendedorFilter === "casa") {
      result = result.filter(p => !p.vendedorId);
    } else if (vendedorFilter !== "todos") {
      result = result.filter(p => p.vendedorId === vendedorFilter);
    }
    return result;
  }, [puntos, searchTerm, vendedorFilter]);

  // Geocode missing addresses
  const handleGeocodificarTodos = async () => {
    setGeocodificando(true);
    try {
      const { data: sinCoords } = await supabase
        .from("cliente_sucursales")
        .select("id, direccion")
        .eq("activo", true)
        .is("latitud", null)
        .not("direccion", "is", null);

      if (!sinCoords || sinCoords.length === 0) {
        toast({ title: "Todas las sucursales ya están geocodificadas" });
        setGeocodificando(false);
        return;
      }

      const addresses = sinCoords.map(s => ({ id: s.id, address: s.direccion! }));

      const { data, error } = await supabase.functions.invoke("geocode-addresses", {
        body: { addresses },
      });

      if (error) throw error;

      const results = data?.results || [];
      let updated = 0;
      for (const r of results) {
        if (r.lat && r.lng) {
          await supabase.from("cliente_sucursales").update({ latitud: r.lat, longitud: r.lng }).eq("id", r.id);
          updated++;
        }
      }

      toast({ title: `${updated} sucursales geocodificadas de ${sinCoords.length}` });
      loadPuntos();
    } catch (err: any) {
      toast({ title: "Error al geocodificar", description: err.message, variant: "destructive" });
    } finally {
      setGeocodificando(false);
    }
  };

  // Fallback if maps don't load
  if (loadError) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <AlertTriangle className="h-8 w-8 mr-3" />
        <div>
          <p className="font-semibold">Error al cargar Google Maps</p>
          <p className="text-sm">{loadError.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar cliente, sucursal o dirección..." value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)} className="pl-9 h-9" />
        </div>

        <Select value={vendedorFilter} onValueChange={setVendedorFilter}>
          <SelectTrigger className="h-9 w-auto min-w-[180px]">
            <Users className="h-3.5 w-3.5 mr-1.5" />
            <SelectValue placeholder="Vendedor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los clientes</SelectItem>
            <SelectItem value="casa">De la casa (sin vendedor)</SelectItem>
            {vendedores.map(([id, nombre]) => (
              <SelectItem key={id} value={id}>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getVendedorColor(id) }} />
                  {nombre}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" className="h-9" onClick={loadPuntos}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Actualizar
        </Button>

        {onSugerirRutas && (
          <Button size="sm" className="h-9" onClick={onSugerirRutas}>
            <Truck className="h-3.5 w-3.5 mr-1.5" /> Sugerir Ruta
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="flex gap-3 text-sm">
        <Badge variant="outline">{filtered.length} puntos en mapa</Badge>
        {sinGeocodificar > 0 && (
          <Badge variant="destructive" className="cursor-pointer" onClick={handleGeocodificarTodos}>
            {geocodificando ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
            {sinGeocodificar} sin ubicación — {geocodificando ? "Geocodificando..." : "Click para geocodificar"}
          </Badge>
        )}
      </div>

      {/* Map */}
      <ErrorBoundaryModule fallback={<div className="h-[600px] bg-muted rounded-xl flex items-center justify-center text-muted-foreground">Error al cargar el mapa</div>}>
        <div className="h-[600px] rounded-xl overflow-hidden border">
          {!isLoaded || loading ? (
            <div className="h-full flex items-center justify-center bg-muted">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <GoogleMap
              mapContainerStyle={{ width: "100%", height: "100%" }}
              center={filtered.length > 0 ? { lat: filtered[0].latitud!, lng: filtered[0].longitud! } : defaultCenter}
              zoom={11}
              onClick={() => setSelectedPunto(null)}
              options={{
                disableDefaultUI: false,
                zoomControl: true,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: true,
              }}
            >
              {filtered.map(p => (
                <Marker
                  key={p.id}
                  position={{ lat: p.latitud!, lng: p.longitud! }}
                  icon={createMarkerIcon(getVendedorColor(p.vendedorId))}
                  onClick={() => setSelectedPunto(p)}
                />
              ))}

              {selectedPunto && (
                <InfoWindow
                  position={{ lat: selectedPunto.latitud!, lng: selectedPunto.longitud! }}
                  onCloseClick={() => setSelectedPunto(null)}
                >
                  <div className="p-1 min-w-[200px] relative">
                    <button onClick={() => setSelectedPunto(null)} className="absolute top-0 right-0 text-slate-400 hover:text-slate-700 cursor-pointer text-lg leading-none">&times;</button>
                    <p className="font-bold text-sm text-slate-900 pr-5">{selectedPunto.clienteNombre}</p>
                    <p className="text-xs text-slate-500">{selectedPunto.clienteCodigo}</p>
                    {selectedPunto.tipo === "sucursal" && (
                      <p className="text-xs text-blue-600 mt-1">Sucursal: {selectedPunto.nombre}</p>
                    )}
                    {selectedPunto.direccion && (
                      <p className="text-xs text-slate-600 mt-1 flex items-start gap-1">
                        <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                        {selectedPunto.direccion}
                      </p>
                    )}
                    {selectedPunto.vendedorNombre && (
                      <p className="text-xs mt-1">
                        <span className="text-slate-500">Vendedor:</span>{" "}
                        <span className="font-medium">{selectedPunto.vendedorNombre}</span>
                      </p>
                    )}
                    {!selectedPunto.vendedorId && (
                      <p className="text-xs text-slate-400 mt-1 italic">Cliente de la casa</p>
                    )}
                    {selectedPunto.zonaNombre && (
                      <p className="text-xs text-slate-500 mt-1">Zona: {selectedPunto.zonaNombre}</p>
                    )}
                    {selectedPunto.telefono && (
                      <p className="text-xs text-slate-500 mt-1">Tel: {selectedPunto.telefono}</p>
                    )}
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          )}
        </div>
      </ErrorBoundaryModule>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#757575]" />
          De la casa
        </div>
        {vendedores.map(([id, nombre]) => (
          <div key={id} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getVendedorColor(id) }} />
            {nombre}
          </div>
        ))}
      </div>
    </div>
  );
}
