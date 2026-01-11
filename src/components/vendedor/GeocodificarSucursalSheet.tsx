import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Navigation, MapPin, CheckCircle2 } from "lucide-react";
import GoogleMapsAddressAutocomplete from "@/components/GoogleMapsAddressAutocomplete";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sucursalId: string;
  sucursalNombre: string;
  direccionActual: string | null;
  latitudActual: number | null;
  longitudActual: number | null;
  onGeocodificado: () => void;
}

export function GeocodificarSucursalSheet({
  open,
  onOpenChange,
  sucursalId,
  sucursalNombre,
  direccionActual,
  latitudActual,
  longitudActual,
  onGeocodificado,
}: Props) {
  const [geolocating, setGeolocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [latitud, setLatitud] = useState<number | null>(latitudActual);
  const [longitud, setLongitud] = useState<number | null>(longitudActual);
  const [direccionBusqueda, setDireccionBusqueda] = useState("");

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Tu navegador no soporta geolocalización");
      return;
    }

    setGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitud(position.coords.latitude);
        setLongitud(position.coords.longitude);
        setGeolocating(false);
        toast.success("Ubicación GPS capturada correctamente");
      },
      (error) => {
        setGeolocating(false);
        console.error("Geolocation error:", error);
        if (error.code === error.PERMISSION_DENIED) {
          toast.error("Permiso denegado. Habilita la ubicación en tu navegador.");
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          toast.error("Ubicación no disponible. Intenta en exteriores.");
        } else if (error.code === error.TIMEOUT) {
          toast.error("Tiempo agotado. Intenta de nuevo.");
        } else {
          toast.error("No se pudo obtener la ubicación.");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleAddressSelect = async (address: string, placeId?: string) => {
    setDireccionBusqueda(address);

    if (placeId) {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-place-details?place_id=${encodeURIComponent(placeId)}`;
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.lat && data.lng) {
            setLatitud(data.lat);
            setLongitud(data.lng);
            toast.success("Coordenadas obtenidas de la dirección");
          }
        }
      } catch (error) {
        console.error("Error fetching place details:", error);
      }
    }
  };

  const handleSave = async () => {
    if (!latitud || !longitud) {
      toast.error("Primero captura las coordenadas GPS");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("cliente_sucursales")
        .update({
          latitud,
          longitud,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sucursalId);

      if (error) throw error;

      toast.success("Coordenadas GPS guardadas correctamente");
      onGeocodificado();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Error al guardar coordenadas");
    } finally {
      setSaving(false);
    }
  };

  const hasNewCoordinates = latitud !== latitudActual || longitud !== longitudActual;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[80vh]">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Geocodificar Sucursal
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 pb-6">
          {/* Sucursal Info */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <p className="font-medium">{sucursalNombre}</p>
            {direccionActual && (
              <p className="text-sm text-muted-foreground">{direccionActual}</p>
            )}
            {latitudActual && longitudActual && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Ya tiene coordenadas: {latitudActual.toFixed(6)}, {longitudActual.toFixed(6)}
              </p>
            )}
          </div>

          {/* GPS Button */}
          <div className="space-y-3">
            <Button
              type="button"
              variant="default"
              onClick={handleUseCurrentLocation}
              disabled={geolocating}
              className="w-full h-14 text-base"
            >
              {geolocating ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <Navigation className="h-5 w-5 mr-2" />
              )}
              📍 Capturar mi ubicación GPS actual
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Asegúrate de estar físicamente en la ubicación del cliente
            </p>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                o buscar dirección
              </span>
            </div>
          </div>

          {/* Address Search */}
          <div className="space-y-2">
            <GoogleMapsAddressAutocomplete
              value={direccionBusqueda}
              onChange={handleAddressSelect}
              placeholder="Buscar dirección para obtener coordenadas..."
            />
            <p className="text-xs text-muted-foreground">
              Si no estás en el lugar, puedes buscar la dirección para obtener coordenadas aproximadas
            </p>
          </div>

          {/* New Coordinates Display */}
          {latitud && longitud && hasNewCoordinates && (
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-900/20 p-3 rounded-md">
              <CheckCircle2 className="h-5 w-5" />
              <div>
                <p className="font-medium">Nuevas coordenadas listas para guardar:</p>
                <p className="text-xs">{latitud.toFixed(6)}, {longitud.toFixed(6)}</p>
              </div>
            </div>
          )}

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={saving || !hasNewCoordinates}
            className="w-full h-12"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Guardar Coordenadas
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
