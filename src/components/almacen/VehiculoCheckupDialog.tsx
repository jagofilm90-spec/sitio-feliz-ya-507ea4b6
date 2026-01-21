import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Send, Car, User } from "lucide-react";

interface Vehiculo {
  id: string;
  nombre: string;
  placa: string | null;
}

interface Empleado {
  id: string;
  nombre_completo: string;
}

interface VehiculoCheckupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehiculo?: Vehiculo | null;
  empleadoId: string;
  onSuccess?: () => void;
}

interface ChecklistItem {
  key: string;
  label: string;
  checked: boolean;
}

const CHECKLIST_ITEMS: { key: string; label: string }[] = [
  { key: "frenos_ok", label: "Sistema de Frenos" },
  { key: "luces_ok", label: "Luces (todas)" },
  { key: "llantas_ok", label: "Estado de Llantas" },
  { key: "aceite_ok", label: "Nivel de Aceite" },
  { key: "anticongelante_ok", label: "Anticongelante" },
  { key: "espejos_ok", label: "Espejos" },
  { key: "limpiadores_ok", label: "Limpiadores" },
  { key: "bateria_ok", label: "Batería" },
  { key: "direccion_ok", label: "Dirección" },
  { key: "suspension_ok", label: "Suspensión" },
  { key: "escape_ok", label: "Sistema de Escape" },
  { key: "cinturones_ok", label: "Cinturones de Seguridad" },
];

export const VehiculoCheckupDialog = ({
  open,
  onOpenChange,
  vehiculo,
  empleadoId,
  onSuccess,
}: VehiculoCheckupDialogProps) => {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [choferes, setChoferes] = useState<Empleado[]>([]);
  const [selectedVehiculo, setSelectedVehiculo] = useState<string>("");
  const [selectedChofer, setSelectedChofer] = useState<string>("");
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [fallasDetectadas, setFallasDetectadas] = useState("");
  const [prioridad, setPrioridad] = useState<string>("media");
  const [requiereReparacion, setRequiereReparacion] = useState(false);
  const [notificarMecanico, setNotificarMecanico] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      loadData();
      resetForm();
      if (vehiculo) {
        setSelectedVehiculo(vehiculo.id);
      }
    }
  }, [open, vehiculo]);

  const loadData = async () => {
    // Cargar vehículos activos
    const { data: vehiculosData } = await supabase
      .from("vehiculos")
      .select("id, nombre, placa")
      .eq("activo", true)
      .order("nombre");

    if (vehiculosData) setVehiculos(vehiculosData);

    // Cargar choferes activos
    const { data: choferesData } = await supabase
      .from("empleados")
      .select("id, nombre_completo")
      .eq("activo", true)
      .in("puesto", ["Chofer", "Ayudante de Chofer"])
      .order("nombre_completo");

    if (choferesData) setChoferes(choferesData);
  };

  const resetForm = () => {
    const initialChecklist: Record<string, boolean> = {};
    CHECKLIST_ITEMS.forEach(item => {
      initialChecklist[item.key] = true; // Por defecto todo OK
    });
    setChecklist(initialChecklist);
    setFallasDetectadas("");
    setPrioridad("media");
    setRequiereReparacion(false);
    setNotificarMecanico(false);
    if (!vehiculo) setSelectedVehiculo("");
    setSelectedChofer("");
  };

  const toggleItem = (key: string) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getItemsFallados = () => {
    return Object.entries(checklist).filter(([_, ok]) => !ok).length;
  };

  const handleSave = async () => {
    if (!selectedVehiculo) {
      toast.error("Selecciona un vehículo");
      return;
    }

    setSaving(true);
    try {
      const checkupData = {
        vehiculo_id: selectedVehiculo,
        chofer_id: selectedChofer || null,
        realizado_por: empleadoId,
        ...checklist,
        fallas_detectadas: fallasDetectadas || null,
        prioridad: getItemsFallados() > 0 ? prioridad : null,
        requiere_reparacion: requiereReparacion,
        notificado_mecanico: false,
      };

      const { data: checkup, error } = await supabase
        .from("vehiculos_checkups")
        .insert(checkupData)
        .select()
        .single();

      if (error) throw error;

      // Si requiere notificar al mecánico, enviar correo
      if (notificarMecanico && requiereReparacion && checkup) {
        await enviarNotificacionMecanico(checkup.id);
      }

      toast.success("Checkup registrado correctamente");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error guardando checkup:", error);
      toast.error("Error al guardar el checkup");
    } finally {
      setSaving(false);
    }
  };

  const enviarNotificacionMecanico = async (checkupId: string) => {
    try {
      // Obtener email del mecánico de la configuración
      const { data: config } = await supabase
        .from("configuracion_flotilla")
        .select("valor")
        .eq("clave", "email_mecanico")
        .single();

      if (!config?.valor) {
        toast.warning("No hay email de mecánico configurado");
        return;
      }

      // Invocar edge function para enviar correo
      const { error } = await supabase.functions.invoke("send-checkup-report", {
        body: { checkupId, emailMecanico: config.valor },
      });

      if (error) throw error;

      // Marcar como notificado
      await supabase
        .from("vehiculos_checkups")
        .update({ notificado_mecanico: true, notificado_en: new Date().toISOString() })
        .eq("id", checkupId);

      toast.success("Notificación enviada al mecánico");
    } catch (error) {
      console.error("Error enviando notificación:", error);
      toast.error("Error al enviar notificación al mecánico");
    }
  };

  const selectedVehiculoData = vehiculos.find(v => v.id === selectedVehiculo);
  const itemsFallados = getItemsFallados();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Checkup de Vehículo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Selección de vehículo y chofer */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Vehículo *</Label>
              <Select value={selectedVehiculo} onValueChange={setSelectedVehiculo}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar vehículo" />
                </SelectTrigger>
                <SelectContent>
                  {vehiculos.map(v => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.nombre} {v.placa ? `(${v.placa})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Chofer (opcional)</Label>
              <Select value={selectedChofer} onValueChange={setSelectedChofer}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar chofer" />
                </SelectTrigger>
                <SelectContent>
                  {choferes.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nombre_completo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Info del vehículo seleccionado */}
          {selectedVehiculoData && (
            <div className="p-3 rounded-lg bg-muted flex items-center gap-3">
              <Car className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium">{selectedVehiculoData.nombre}</p>
                <p className="text-sm text-muted-foreground">
                  Placa: {selectedVehiculoData.placa || 'Sin placa'}
                </p>
              </div>
            </div>
          )}

          {/* Checklist */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Checklist de Revisión</Label>
              <Badge variant={itemsFallados > 0 ? "destructive" : "secondary"}>
                {12 - itemsFallados}/12 OK
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {CHECKLIST_ITEMS.map(item => (
                <div
                  key={item.key}
                  onClick={() => toggleItem(item.key)}
                  className={`
                    p-3 rounded-lg border cursor-pointer transition-all
                    ${checklist[item.key] 
                      ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' 
                      : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.label}</span>
                    {checklist[item.key] ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fallas detectadas */}
          <div className="space-y-2">
            <Label>Fallas Detectadas / Observaciones</Label>
            <Textarea
              value={fallasDetectadas}
              onChange={(e) => setFallasDetectadas(e.target.value)}
              placeholder="Describe las fallas encontradas o cualquier observación..."
              rows={3}
            />
          </div>

          {/* Prioridad (solo si hay fallas) */}
          {itemsFallados > 0 && (
            <div className="space-y-2">
              <Label>Prioridad de Reparación</Label>
              <Select value={prioridad} onValueChange={setPrioridad}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baja">Baja - Puede esperar</SelectItem>
                  <SelectItem value="media">Media - Atender pronto</SelectItem>
                  <SelectItem value="alta">Alta - Atender esta semana</SelectItem>
                  <SelectItem value="urgente">Urgente - Atender hoy</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Opciones de seguimiento */}
          <div className="space-y-3 p-4 rounded-lg border bg-muted/50">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="requiere_reparacion"
                checked={requiereReparacion}
                onCheckedChange={(checked) => setRequiereReparacion(!!checked)}
              />
              <Label htmlFor="requiere_reparacion" className="cursor-pointer">
                Requiere reparación
              </Label>
            </div>

            {requiereReparacion && (
              <div className="flex items-center space-x-2 ml-6">
                <Checkbox
                  id="notificar_mecanico"
                  checked={notificarMecanico}
                  onCheckedChange={(checked) => setNotificarMecanico(!!checked)}
                />
                <Label htmlFor="notificar_mecanico" className="cursor-pointer flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Notificar al mecánico por correo
                </Label>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !selectedVehiculo}>
            {saving ? "Guardando..." : "Guardar Checkup"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
