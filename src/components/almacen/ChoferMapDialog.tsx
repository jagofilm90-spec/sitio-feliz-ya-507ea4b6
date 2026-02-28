import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";
import { useChoferUbicacionRealtime } from "@/hooks/useChoferUbicacionRealtime";
import { MapPin, Navigation, Clock, AlertTriangle, Gauge } from "lucide-react";

interface ChoferMapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rutaId: string;
  choferNombre: string;
}

const mapContainerStyle = { width: "100%", height: "400px" };
const defaultCenter = { lat: 20.6597, lng: -103.3496 }; // Guadalajara

export function ChoferMapDialog({ open, onOpenChange, rutaId, choferNombre }: ChoferMapDialogProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
  });

  const { getUbicacionByRuta, isLocationStale } = useChoferUbicacionRealtime({
    rutaIds: [rutaId],
    enabled: open,
  });

  const ubicacion = getUbicacionByRuta(rutaId);
  const stale = isLocationStale(rutaId);

  const center = ubicacion
    ? { lat: ubicacion.latitud, lng: ubicacion.longitud }
    : defaultCenter;

  const lastUpdate = ubicacion
    ? new Date(ubicacion.timestamp).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null;

  if (loadError) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader><DialogTitle>Error al cargar mapa</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">No se pudo cargar Google Maps.</p>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-blue-500" />
            Ubicación de {choferNombre}
          </DialogTitle>
        </DialogHeader>

        {/* Info badges */}
        <div className="flex flex-wrap gap-2 px-4 pb-2">
          {stale ? (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="w-3 h-3" />
              Sin señal reciente
            </Badge>
          ) : ubicacion ? (
            <Badge variant="secondary" className="gap-1 bg-green-500/10 text-green-700">
              <MapPin className="w-3 h-3" />
              En línea
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <Clock className="w-3 h-3" />
              Sin ubicación
            </Badge>
          )}

          {ubicacion?.velocidad_kmh != null && ubicacion.velocidad_kmh > 0 && (
            <Badge variant="outline" className="gap-1">
              <Gauge className="w-3 h-3" />
              {Math.round(ubicacion.velocidad_kmh)} km/h
            </Badge>
          )}

          {ubicacion?.precision_metros != null && (
            <Badge variant="outline" className="gap-1">
              ±{Math.round(ubicacion.precision_metros)}m
            </Badge>
          )}

          {lastUpdate && (
            <Badge variant="outline" className="gap-1">
              <Clock className="w-3 h-3" />
              {lastUpdate}
            </Badge>
          )}
        </div>

        {/* Map */}
        <div className="w-full h-[400px] bg-muted">
          {isLoaded ? (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={center}
              zoom={ubicacion ? 15 : 12}
              options={{
                disableDefaultUI: true,
                zoomControl: true,
                mapTypeControl: false,
                streetViewControl: false,
              }}
            >
              {ubicacion && (
                <Marker
                  position={{ lat: ubicacion.latitud, lng: ubicacion.longitud }}
                  title={choferNombre}
                />
              )}
            </GoogleMap>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Cargando mapa...
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
