import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Truck, User, Users, AlertTriangle, Save } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useRouteNotifications } from "@/hooks/useRouteNotifications";
import { AyudantesMultiSelect } from "./AyudantesMultiSelect";

interface Vehiculo {
  id: string;
  nombre: string;
  tipo: string;
  peso_maximo_local_kg: number;
  peso_maximo_foraneo_kg: number;
  status: string;
}

interface Chofer {
  id: string;
  nombre_completo: string;
}

interface Ruta {
  id: string;
  folio: string;
  status: string;
  fecha_ruta: string;
  tipo_ruta: string;
  peso_total_kg: number | null;
  chofer_id: string;
  ayudantes_ids: string[] | null;
  vehiculo_id: string | null;
  notas: string | null;
  vehiculo?: {
    id: string;
    nombre: string;
  };
  chofer?: {
    nombre_completo: string;
  };
}

interface EditarRutaDialogProps {
  ruta: Ruta | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const EditarRutaDialog = ({
  ruta,
  open,
  onOpenChange,
  onSuccess,
}: EditarRutaDialogProps) => {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [choferes, setChoferes] = useState<Chofer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { notifyDriverReassignment, notifyRouteChange } = useRouteNotifications();

  const [selectedChofer, setSelectedChofer] = useState<string>("");
  const [selectedAyudantes, setSelectedAyudantes] = useState<string[]>([]);
  const [selectedVehiculo, setSelectedVehiculo] = useState<string>("");
  const [notas, setNotas] = useState("");

  useEffect(() => {
    if (open && ruta) {
      loadData();
      setSelectedChofer(ruta.chofer_id);
      setSelectedAyudantes(ruta.ayudantes_ids || []);
      setSelectedVehiculo(ruta.vehiculo_id || "");
      setNotas(ruta.notas || "");
    }
  }, [open, ruta]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load vehicles (available + current vehicle if in use)
      const { data: vehiculosData, error: vehiculosError } = await supabase
        .from("vehiculos")
        .select("*")
        .eq("activo", true)
        .or(`status.eq.disponible,id.eq.${ruta?.vehiculo_id}`)
        .order("nombre");

      if (vehiculosError) throw vehiculosError;
      setVehiculos(vehiculosData || []);

      // Cargar choferes desde empleados (no desde profiles/user_roles)
      const { data: choferesData, error: choferesError } = await supabase
        .from("empleados")
        .select("id, nombre_completo")
        .eq("puesto", "Chofer")
        .eq("activo", true)
        .order("nombre_completo");

      if (choferesError) throw choferesError;
      setChoferes(choferesData || []);
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
    if (!ruta || !selectedChofer || !selectedVehiculo) {
      toast({
        title: "Error",
        description: "Selecciona un chofer y vehículo",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // If vehicle changed, update old vehicle status to disponible
      if (ruta.vehiculo_id && ruta.vehiculo_id !== selectedVehiculo) {
        await supabase
          .from("vehiculos")
          .update({ status: "disponible" })
          .eq("id", ruta.vehiculo_id);

        // Mark new vehicle as en_ruta (since route is programmed)
        await supabase
          .from("vehiculos")
          .update({ status: "en_ruta" })
          .eq("id", selectedVehiculo);
      }

      // Guardar solo ayudantes_ids (no usar ayudante_id por FK a profiles)
      const { error } = await supabase
        .from("rutas")
        .update({
          chofer_id: selectedChofer,
          ayudantes_ids: selectedAyudantes.length > 0 ? selectedAyudantes : null,
          vehiculo_id: selectedVehiculo,
          notas: notas || null,
        })
        .eq("id", ruta.id);

      if (error) throw error;

      // Enviar notificaciones push si hubo cambios de personal
      if (choferCambiado) {
        await notifyDriverReassignment({
          newChoferId: selectedChofer,
          oldChoferId: ruta.chofer_id,
          rutaFolio: ruta.folio,
          rutaId: ruta.id,
        });
      }

      // Notificar cambio de ayudantes (nuevos ayudantes agregados)
      const ayudantesAnteriores = ruta.ayudantes_ids || [];
      const nuevosAyudantes = selectedAyudantes.filter(id => !ayudantesAnteriores.includes(id));
      
      for (const ayudanteId of nuevosAyudantes) {
        await notifyRouteChange({
          choferId: ayudanteId,
          rutaFolio: ruta.folio,
          rutaId: ruta.id,
          mensaje: `Te asignaron como ayudante en ruta ${ruta.folio}`,
        });
      }

      toast({ title: "Ruta actualizada correctamente" });
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

  const vehiculoSeleccionado = vehiculos.find(v => v.id === selectedVehiculo);
  const capacidadMaxima = vehiculoSeleccionado 
    ? (ruta?.tipo_ruta === "local" ? vehiculoSeleccionado.peso_maximo_local_kg : vehiculoSeleccionado.peso_maximo_foraneo_kg)
    : 0;
  const excedido = (ruta?.peso_total_kg || 0) > capacidadMaxima;

  const choferCambiado = ruta?.chofer_id !== selectedChofer;
  const vehiculoCambiado = ruta?.vehiculo_id !== selectedVehiculo;

  if (!ruta) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>Editar Ruta {ruta.folio}</DialogTitle>
          <DialogDescription>
            Modifica el chofer o vehículo asignado a esta ruta
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Cargando...</div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 p-3 bg-muted rounded-lg text-sm">
              <div>
                <p className="text-muted-foreground">Fecha</p>
                <p className="font-medium">
                  {new Date(ruta.fecha_ruta).toLocaleDateString("es-MX")}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Tipo</p>
                <Badge variant={ruta.tipo_ruta === "local" ? "secondary" : "outline"}>
                  {ruta.tipo_ruta === "local" ? "Local" : "Foránea"}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground">Peso Total</p>
                <p className="font-medium">{(ruta.peso_total_kg || 0).toLocaleString()} kg</p>
              </div>
              <div>
                <p className="text-muted-foreground">Estado</p>
                <Badge>{ruta.status}</Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Truck className="h-4 w-4" />
                Vehículo *
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
                          <Badge variant="outline" className="text-xs">Actual</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {vehiculoSeleccionado && (
                <p className="text-xs text-muted-foreground">
                  Capacidad: {capacidadMaxima.toLocaleString()} kg ({ruta.tipo_ruta})
                </p>
              )}
            </div>

            {excedido && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  El peso de la ruta ({(ruta.peso_total_kg || 0).toLocaleString()} kg) excede la capacidad del vehículo ({capacidadMaxima.toLocaleString()} kg)
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <User className="h-4 w-4" />
                Chofer *
              </Label>
              <Select value={selectedChofer} onValueChange={setSelectedChofer}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un chofer" />
                </SelectTrigger>
                <SelectContent>
                  {choferes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center gap-2">
                        {c.nombre_completo}
                        {c.id === ruta.chofer_id && (
                          <Badge variant="outline" className="text-xs">Actual</Badge>
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
                Ayudantes
              </Label>
              <AyudantesMultiSelect
                selectedAyudantes={selectedAyudantes}
                onSelectionChange={setSelectedAyudantes}
                excludeIds={selectedChofer ? [selectedChofer] : []}
              />
            </div>

            <div className="space-y-2">
              <Label>Notas</Label>
              <Input
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Notas adicionales..."
                autoComplete="off"
              />
            </div>

            {(choferCambiado || vehiculoCambiado) && (
              <Alert>
                <AlertDescription className="text-sm">
                  Cambios pendientes: 
                  {choferCambiado && " Chofer"}
                  {choferCambiado && vehiculoCambiado && " y"}
                  {vehiculoCambiado && " Vehículo"}
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
            disabled={saving || !selectedChofer || !selectedVehiculo || excedido}
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditarRutaDialog;
