import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Truck, User, Users, RefreshCw, Bell, Loader2 } from "lucide-react";

interface Vehiculo {
  id: string;
  nombre: string;
  tipo: string;
}

interface Chofer {
  id: string;
  full_name: string;
}

interface Ruta {
  id: string;
  folio: string;
  chofer_id: string;
  ayudante_id: string | null;
  vehiculo_id: string | null;
  chofer?: { full_name: string };
  ayudante?: { full_name: string };
  vehiculo?: { nombre: string };
}

interface ReasignarPersonalDialogProps {
  ruta: Ruta | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const ReasignarPersonalDialog = ({
  ruta,
  open,
  onOpenChange,
  onSuccess,
}: ReasignarPersonalDialogProps) => {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [choferes, setChoferes] = useState<Chofer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [selectedChofer, setSelectedChofer] = useState<string>("");
  const [selectedAyudante, setSelectedAyudante] = useState<string>("");
  const [selectedVehiculo, setSelectedVehiculo] = useState<string>("");
  const [notificarChofer, setNotificarChofer] = useState(true);

  useEffect(() => {
    if (open && ruta) {
      loadData();
      setSelectedChofer(ruta.chofer_id);
      setSelectedAyudante(ruta.ayudante_id || "");
      setSelectedVehiculo(ruta.vehiculo_id || "");
    }
  }, [open, ruta]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load available vehicles
      const { data: vehiculosData, error: vehiculosError } = await supabase
        .from("vehiculos")
        .select("id, nombre, tipo")
        .eq("activo", true)
        .or(`status.eq.disponible,id.eq.${ruta?.vehiculo_id}`)
        .order("nombre");

      if (vehiculosError) throw vehiculosError;
      setVehiculos(vehiculosData || []);

      // Load drivers
      const { data: choferesData, error: choferesError } = await supabase
        .from("user_roles")
        .select(`
          user_id,
          profiles:user_id (id, full_name)
        `)
        .eq("role", "chofer");

      if (choferesError) throw choferesError;
      
      const transformedChoferes = (choferesData || [])
        .filter((c: any) => c.profiles)
        .map((c: any) => ({
          id: c.profiles.id,
          full_name: c.profiles.full_name,
        }));
      setChoferes(transformedChoferes);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!ruta || !selectedChofer) {
      toast({
        title: "Error",
        description: "Selecciona al menos un chofer",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // Update vehicle status if changed
      if (ruta.vehiculo_id && ruta.vehiculo_id !== selectedVehiculo) {
        await supabase
          .from("vehiculos")
          .update({ status: "disponible" })
          .eq("id", ruta.vehiculo_id);

        if (selectedVehiculo) {
          await supabase
            .from("vehiculos")
            .update({ status: "en_ruta" })
            .eq("id", selectedVehiculo);
        }
      }

      // Update route
      const { error } = await supabase
        .from("rutas")
        .update({
          chofer_id: selectedChofer,
          ayudante_id: selectedAyudante || null,
          vehiculo_id: selectedVehiculo || null,
        })
        .eq("id", ruta.id);

      if (error) throw error;

      // Send notification to new driver if changed
      if (notificarChofer && selectedChofer !== ruta.chofer_id) {
        try {
          await supabase.functions.invoke("send-push-notification", {
            body: {
              user_ids: [selectedChofer],
              title: "Nueva asignación de ruta",
              body: `Te han asignado la ruta ${ruta.folio}`,
              data: { type: "ruta", ruta_id: ruta.id }
            }
          });
        } catch (notifError) {
          console.error("Error sending notification:", notifError);
          // Don't fail the whole operation for notification error
        }
      }

      toast({ title: "Personal reasignado correctamente" });
      
      // Also notify if helper changed
      if (notificarChofer && selectedAyudante && selectedAyudante !== ruta.ayudante_id) {
        try {
          await supabase.functions.invoke("send-push-notification", {
            body: {
              user_ids: [selectedAyudante],
              title: "Asignación como ayudante",
              body: `Te han asignado como ayudante en la ruta ${ruta.folio}`,
              data: { type: "ruta", ruta_id: ruta.id }
            }
          });
        } catch (notifError) {
          console.error("Error sending helper notification:", notifError);
        }
      }

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const ayudantesDisponibles = choferes.filter(c => c.id !== selectedChofer);
  const choferCambiado = ruta?.chofer_id !== selectedChofer;
  const ayudanteCambiado = ruta?.ayudante_id !== selectedAyudante;
  const vehiculoCambiado = ruta?.vehiculo_id !== selectedVehiculo;
  const hayCambios = choferCambiado || ayudanteCambiado || vehiculoCambiado;

  if (!ruta) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Reasignar Personal - {ruta.folio}
          </DialogTitle>
          <DialogDescription>
            Cambia rápidamente el chofer, ayudante o vehículo de esta ruta
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Current assignment */}
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p className="text-muted-foreground mb-2">Asignación actual:</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  <Truck className="h-3 w-3 mr-1" />
                  {ruta.vehiculo?.nombre || "Sin vehículo"}
                </Badge>
                <Badge variant="outline">
                  <User className="h-3 w-3 mr-1" />
                  {ruta.chofer?.full_name || "Sin chofer"}
                </Badge>
                {ruta.ayudante && (
                  <Badge variant="outline">
                    <Users className="h-3 w-3 mr-1" />
                    {ruta.ayudante.full_name}
                  </Badge>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Truck className="h-4 w-4" />
                Vehículo
              </Label>
              <Select value={selectedVehiculo} onValueChange={setSelectedVehiculo}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un vehículo" />
                </SelectTrigger>
                <SelectContent>
                  {vehiculos.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      <div className="flex items-center gap-2">
                        {v.nombre}
                        {v.id === ruta.vehiculo_id && (
                          <Badge variant="secondary" className="text-xs">Actual</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  Chofer *
                </Label>
                <Select value={selectedChofer} onValueChange={setSelectedChofer}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                  <SelectContent>
                    {choferes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <div className="flex items-center gap-2">
                          {c.full_name}
                          {c.id === ruta.chofer_id && (
                            <Badge variant="secondary" className="text-xs">Actual</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  Ayudante
                </Label>
                <Select value={selectedAyudante} onValueChange={setSelectedAyudante}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin ayudante" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin ayudante</SelectItem>
                    {ayudantesDisponibles.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {hayCambios && (
              <Alert className="bg-blue-500/10 border-blue-500/20">
                <Bell className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-sm">
                  Se enviará una notificación push al nuevo personal asignado
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !selectedChofer || !hayCambios}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {saving ? "Guardando..." : "Reasignar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReasignarPersonalDialog;
