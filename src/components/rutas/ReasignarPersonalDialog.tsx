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
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Truck, User, Users, RefreshCw, Bell, Loader2, DollarSign, UserPlus } from "lucide-react";
import { AyudantesMultiSelect } from "./AyudantesMultiSelect";

interface Vehiculo {
  id: string;
  nombre: string;
  tipo: string;
}

interface Chofer {
  id: string;
  nombre_completo: string;
}

interface AyudanteExterno {
  id: string;
  nombre_completo: string;
  tarifa_por_viaje: number;
}

interface Ruta {
  id: string;
  folio: string;
  chofer_id: string;
  ayudantes_ids?: string[] | null;
  vehiculo_id: string | null;
  ayudante_externo_id?: string | null;
  costo_ayudante_externo?: number | null;
  chofer_nombre?: string;
  ayudantes_nombres?: string[];
  vehiculo?: { nombre: string };
  ayudante_externo?: { nombre_completo: string; tarifa_por_viaje: number };
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
  const [ayudantesExternos, setAyudantesExternos] = useState<AyudanteExterno[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [selectedChofer, setSelectedChofer] = useState<string>("");
  const [selectedAyudantes, setSelectedAyudantes] = useState<string[]>([]);
  const [selectedAyudanteExterno, setSelectedAyudanteExterno] = useState<string>("");
  const [usarExterno, setUsarExterno] = useState(false);
  const [selectedVehiculo, setSelectedVehiculo] = useState<string>("");
  const [notificarChofer, setNotificarChofer] = useState(true);

  useEffect(() => {
    if (open && ruta) {
      loadData();
      setSelectedChofer(ruta.chofer_id);
      setSelectedAyudantes(ruta.ayudantes_ids || []);
      setSelectedVehiculo(ruta.vehiculo_id || "");
      setSelectedAyudanteExterno(ruta.ayudante_externo_id || "");
      setUsarExterno(!!ruta.ayudante_externo_id);
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

      // Load drivers from empleados table
      const { data: choferesData, error: choferesError } = await supabase
        .from("empleados")
        .select("id, nombre_completo")
        .eq("activo", true)
        .eq("puesto", "Chofer")
        .order("nombre_completo");

      if (choferesError) throw choferesError;
      setChoferes(choferesData || []);

      // Load external helpers
      const { data: externosData, error: externosError } = await supabase
        .from("ayudantes_externos")
        .select("id, nombre_completo, tarifa_por_viaje")
        .eq("activo", true)
        .order("nombre_completo");

      if (externosError) throw externosError;
      setAyudantesExternos(externosData || []);
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

      // Get external helper tariff if selected
      const externoSeleccionado = ayudantesExternos.find(e => e.id === selectedAyudanteExterno);

      // Update route - usar ayudantes_ids en lugar de ayudante_id
      const { error } = await supabase
        .from("rutas")
        .update({
          chofer_id: selectedChofer,
          ayudantes_ids: usarExterno ? null : (selectedAyudantes.length > 0 ? selectedAyudantes : null),
          vehiculo_id: selectedVehiculo || null,
          ayudante_externo_id: usarExterno ? (selectedAyudanteExterno || null) : null,
          costo_ayudante_externo: usarExterno && externoSeleccionado ? externoSeleccionado.tarifa_por_viaje : null,
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
        }
      }

      toast({ title: "Personal reasignado correctamente" });
      
      // Notify new helpers
      const previousAyudantes = ruta.ayudantes_ids || [];
      const newAyudantes = selectedAyudantes.filter(id => !previousAyudantes.includes(id));
      if (notificarChofer && newAyudantes.length > 0) {
        try {
          await supabase.functions.invoke("send-push-notification", {
            body: {
              user_ids: newAyudantes,
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
  const ayudantesCambiado = usarExterno 
    ? ruta?.ayudante_externo_id !== selectedAyudanteExterno
    : JSON.stringify(ruta?.ayudantes_ids || []) !== JSON.stringify(selectedAyudantes);
  const vehiculoCambiado = ruta?.vehiculo_id !== selectedVehiculo;
  const modoAyudanteCambiado = !!ruta?.ayudante_externo_id !== usarExterno;
  const hayCambios = choferCambiado || ayudantesCambiado || vehiculoCambiado || modoAyudanteCambiado;
  
  const externoSeleccionado = ayudantesExternos.find(e => e.id === selectedAyudanteExterno);

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
                  {ruta.chofer_nombre || "Sin chofer"}
                </Badge>
                {ruta.ayudantes_nombres && ruta.ayudantes_nombres.length > 0 && (
                  <Badge variant="outline">
                    <Users className="h-3 w-3 mr-1" />
                    {ruta.ayudantes_nombres.join(", ")}
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
                          {c.nombre_completo}
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
                
                {/* Toggle for internal vs external */}
                <div className="flex gap-2 mb-2">
                  <Button
                    type="button"
                    variant={!usarExterno ? "default" : "outline"}
                    size="sm"
                    onClick={() => setUsarExterno(false)}
                    className="flex-1"
                  >
                    <User className="h-3 w-3 mr-1" />
                    Interno
                  </Button>
                  <Button
                    type="button"
                    variant={usarExterno ? "default" : "outline"}
                    size="sm"
                    onClick={() => setUsarExterno(true)}
                    className="flex-1"
                  >
                    <UserPlus className="h-3 w-3 mr-1" />
                    Externo
                  </Button>
                </div>

                {!usarExterno ? (
                  <AyudantesMultiSelect
                    selectedAyudantes={selectedAyudantes}
                    onSelectionChange={setSelectedAyudantes}
                    excludeIds={[selectedChofer]}
                  />
                ) : (
                  <Select value={selectedAyudanteExterno} onValueChange={setSelectedAyudanteExterno}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar externo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sin ayudante externo</SelectItem>
                      {ayudantesExternos.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          <div className="flex items-center gap-2">
                            {e.nombre_completo}
                            <Badge variant="outline" className="text-xs">
                              ${e.tarifa_por_viaje}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {usarExterno && externoSeleccionado && (
              <Alert className="bg-amber-500/10 border-amber-500/20">
                <DollarSign className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-sm">
                  Costo del ayudante externo: <strong>${externoSeleccionado.tarifa_por_viaje.toLocaleString()}</strong> por viaje
                </AlertDescription>
              </Alert>
            )}

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
