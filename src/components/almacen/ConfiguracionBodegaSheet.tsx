import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Wifi, MapPin, Plus, X, Loader2 } from "lucide-react";

interface Bodega {
  id: string;
  nombre: string;
  wifi_ssids: string[] | null;
  latitud: number | null;
  longitud: number | null;
  radio_deteccion_metros: number | null;
  es_externa: boolean;
}

interface ConfiguracionBodegaSheetProps {
  bodega: Bodega | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export const ConfiguracionBodegaSheet = ({
  bodega,
  open,
  onOpenChange,
  onSaved
}: ConfiguracionBodegaSheetProps) => {
  const [wifiSSIDs, setWifiSSIDs] = useState<string[]>([]);
  const [newSSID, setNewSSID] = useState("");
  const [latitud, setLatitud] = useState<string>("");
  const [longitud, setLongitud] = useState<string>("");
  const [radioDeteccion, setRadioDeteccion] = useState<string>("100");
  const [saving, setSaving] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  useEffect(() => {
    if (bodega && open) {
      setWifiSSIDs(bodega.wifi_ssids || []);
      setLatitud(bodega.latitud?.toString() || "");
      setLongitud(bodega.longitud?.toString() || "");
      setRadioDeteccion(bodega.radio_deteccion_metros?.toString() || "100");
      setNewSSID("");
    }
  }, [bodega, open]);

  const handleAddSSID = () => {
    const trimmed = newSSID.trim();
    if (trimmed && !wifiSSIDs.includes(trimmed)) {
      setWifiSSIDs([...wifiSSIDs, trimmed]);
      setNewSSID("");
    }
  };

  const handleRemoveSSID = (ssid: string) => {
    setWifiSSIDs(wifiSSIDs.filter(s => s !== ssid));
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Tu dispositivo no soporta geolocalización");
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitud(position.coords.latitude.toFixed(6));
        setLongitud(position.coords.longitude.toFixed(6));
        setGettingLocation(false);
        toast.success("Ubicación obtenida correctamente");
      },
      (error) => {
        setGettingLocation(false);
        let msg = "Error obteniendo ubicación";
        if (error.code === error.PERMISSION_DENIED) {
          msg = "Permiso de ubicación denegado";
        }
        toast.error(msg);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSave = async () => {
    if (!bodega) return;

    setSaving(true);
    try {
      const lat = latitud ? parseFloat(latitud) : null;
      const lng = longitud ? parseFloat(longitud) : null;
      const radio = parseInt(radioDeteccion) || 100;

      // Validate coordinates
      if (lat !== null && (lat < -90 || lat > 90)) {
        toast.error("Latitud debe estar entre -90 y 90");
        setSaving(false);
        return;
      }
      if (lng !== null && (lng < -180 || lng > 180)) {
        toast.error("Longitud debe estar entre -180 y 180");
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from("bodegas")
        .update({
          wifi_ssids: wifiSSIDs.length > 0 ? wifiSSIDs : null,
          latitud: lat,
          longitud: lng,
          radio_deteccion_metros: radio
        })
        .eq("id", bodega.id);

      if (error) throw error;

      toast.success(`Configuración de ${bodega.nombre} guardada`);
      onSaved();
      onOpenChange(false);
    } catch (error) {
      console.error("Error guardando configuración de bodega:", error);
      toast.error("Error al guardar configuración");
    } finally {
      setSaving(false);
    }
  };

  if (!bodega) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Configurar {bodega.nombre}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* WiFi SSIDs Section */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-base font-semibold">
              <Wifi className="h-4 w-4" />
              Redes WiFi para detección
            </Label>
            <p className="text-sm text-muted-foreground">
              Agrega los nombres exactos de las redes WiFi de esta bodega
            </p>

            {/* Current SSIDs */}
            <div className="flex flex-wrap gap-2 min-h-[32px]">
              {wifiSSIDs.length === 0 ? (
                <span className="text-sm text-muted-foreground italic">
                  Sin redes configuradas
                </span>
              ) : (
                wifiSSIDs.map((ssid) => (
                  <Badge
                    key={ssid}
                    variant="secondary"
                    className="flex items-center gap-1 pr-1"
                  >
                    {ssid}
                    <button
                      type="button"
                      onClick={() => handleRemoveSSID(ssid)}
                      className="ml-1 rounded-full p-0.5 hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              )}
            </div>

            {/* Add new SSID */}
            <div className="flex gap-2">
              <Input
                placeholder="Nombre de red WiFi..."
                value={newSSID}
                onChange={(e) => setNewSSID(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSSID();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleAddSSID}
                disabled={!newSSID.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* GPS Section */}
          <div className="space-y-3 p-4 rounded-lg border bg-muted/50">
            <Label className="flex items-center gap-2 text-base font-semibold">
              <MapPin className="h-4 w-4" />
              Coordenadas GPS (respaldo)
            </Label>
            <p className="text-sm text-muted-foreground">
              Se usa cuando la detección por WiFi no está disponible
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm">Latitud</Label>
                <Input
                  type="number"
                  step="0.000001"
                  placeholder="19.4086"
                  value={latitud}
                  onChange={(e) => setLatitud(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Longitud</Label>
                <Input
                  type="number"
                  step="0.000001"
                  placeholder="-99.1210"
                  value={longitud}
                  onChange={(e) => setLongitud(e.target.value)}
                />
              </div>
            </div>

            {latitud && longitud && (
              <a
                href={`https://www.google.com/maps?q=${latitud},${longitud}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary underline hover:text-primary/80 flex items-center gap-1"
              >
                <MapPin className="h-3 w-3" />
                Ver ubicación en Google Maps
              </a>
            )}

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGetCurrentLocation}
              disabled={gettingLocation}
            >
              {gettingLocation ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <MapPin className="h-4 w-4 mr-2" />
              )}
              Usar mi ubicación actual
            </Button>

            <div className="space-y-1">
              <Label className="text-sm">Radio de detección (metros)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="50"
                  max="500"
                  value={radioDeteccion}
                  onChange={(e) => setRadioDeteccion(e.target.value)}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">
                  (50 - 500 metros)
                </span>
              </div>
            </div>
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
