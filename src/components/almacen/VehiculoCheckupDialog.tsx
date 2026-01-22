import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Car,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  Send,
  Clock,
  FileText,
} from "lucide-react";
import { ChecklistItemRow, ChecklistStatus } from "./ChecklistItemRow";
import {
  CHECKLIST_CATEGORIES,
  createInitialChecklist,
  validateNNItems,
  countItemsByStatus,
  mapToLegacyFields,
} from "./checklistConfig";
import { FirmaDigitalDialog } from "./FirmaDigitalDialog";
import { DiagramaDanosVehiculo, DanoMarcado } from "./DiagramaDanosVehiculo";
import { generarCheckupPDF } from "@/utils/checkupPdfGenerator";

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
  const [checklist, setChecklist] = useState<Record<string, ChecklistStatus>>(
    createInitialChecklist()
  );
  const [kilometrajeInicial, setKilometrajeInicial] = useState<string>("");
  const [horaInspeccion, setHoraInspeccion] = useState<string>("");
  const [observaciones, setObservaciones] = useState("");
  const [observacionesGolpes, setObservacionesGolpes] = useState("");
  const [danosVehiculo, setDanosVehiculo] = useState<DanoMarcado[]>([]);
  const [firmaConductor, setFirmaConductor] = useState<string | null>(null);
  const [firmaSupervisor, setFirmaSupervisor] = useState<string | null>(null);
  const [notificarMecanico, setNotificarMecanico] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({});
  const [firmaDialogOpen, setFirmaDialogOpen] = useState<
    "conductor" | "supervisor" | null
  >(null);
  
  // Generate a unique ID for this checkup session to organize photos in storage
  const [checkupTempId] = useState(() => crypto.randomUUID());

  useEffect(() => {
    if (open) {
      loadData();
      resetForm();
      if (vehiculo) {
        setSelectedVehiculo(vehiculo.id);
      }
      // Set current time
      const now = new Date();
      setHoraInspeccion(
        `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
      );
      // Expand all categories by default
      const expanded: Record<string, boolean> = {};
      CHECKLIST_CATEGORIES.forEach((cat) => {
        expanded[cat.key] = true;
      });
      setExpandedCategories(expanded);
    }
  }, [open, vehiculo]);

  const loadData = async () => {
    const { data: vehiculosData } = await supabase
      .from("vehiculos")
      .select("id, nombre, placa")
      .eq("activo", true)
      .order("nombre");

    if (vehiculosData) setVehiculos(vehiculosData);

    const { data: choferesData } = await supabase
      .from("empleados")
      .select("id, nombre_completo")
      .eq("activo", true)
      .in("puesto", ["Chofer", "Ayudante de Chofer"])
      .order("nombre_completo");

    if (choferesData) setChoferes(choferesData);
  };

  const resetForm = () => {
    setChecklist(createInitialChecklist());
    setKilometrajeInicial("");
    setHoraInspeccion("");
    setObservaciones("");
    setObservacionesGolpes("");
    setDanosVehiculo([]);
    setFirmaConductor(null);
    setFirmaSupervisor(null);
    setNotificarMecanico(false);
    if (!vehiculo) setSelectedVehiculo("");
    setSelectedChofer("");
  };

  const handleChecklistChange = (key: string, value: ChecklistStatus) => {
    setChecklist((prev) => ({ ...prev, [key]: value }));
  };

  const toggleCategory = (categoryKey: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryKey]: !prev[categoryKey],
    }));
  };

  const nnValidation = validateNNItems(checklist);
  const counts = countItemsByStatus(checklist);

  const handleSave = async () => {
    if (!selectedVehiculo) {
      toast.error("Selecciona un vehículo");
      return;
    }

    if (!firmaConductor) {
      toast.error("Se requiere la firma del conductor");
      return;
    }

    setSaving(true);
    try {
      // Map to legacy fields for compatibility
      const legacyFields = mapToLegacyFields(checklist);

      // Serialize damage diagram data with text observations
      const danosData = danosVehiculo.length > 0 || observacionesGolpes 
        ? JSON.stringify({
            danos: danosVehiculo,
            notas: observacionesGolpes || null,
          })
        : observacionesGolpes || null;

      const checkupData = {
        vehiculo_id: selectedVehiculo,
        chofer_id: selectedChofer || null,
        realizado_por: empleadoId,
        ...legacyFields,
        // New professional format fields
        kilometraje_inicial: kilometrajeInicial
          ? parseInt(kilometrajeInicial)
          : null,
        hora_inspeccion: horaInspeccion || null,
        checklist_detalle: checklist,
        firma_conductor: firmaConductor,
        firma_supervisor: firmaSupervisor,
        fallas_detectadas: observaciones || null,
        observaciones_golpes: danosData,
        tiene_items_nn_fallados: !nnValidation.isValid,
        requiere_reparacion: counts.mal > 0,
        prioridad: !nnValidation.isValid
          ? "urgente"
          : counts.mal > 0
            ? "alta"
            : null,
        notificado_mecanico: false,
      };

      const { data: checkup, error } = await supabase
        .from("vehiculos_checkups")
        .insert(checkupData)
        .select()
        .single();

      if (error) throw error;

      // Get empleado name for PDF
      const { data: empleadoData } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", empleadoId)
        .single();

      const choferData = choferes.find(c => c.id === selectedChofer);
      const vehiculoCompleto = vehiculos.find(v => v.id === selectedVehiculo);

      // Generate and upload PDF
      try {
        toast.info("Generando PDF del checkup...");
        
        const pdfBlob = await generarCheckupPDF({
          checkup: {
            id: checkup.id,
            fecha_checkup: checkup.fecha_checkup,
            hora_inspeccion: horaInspeccion,
            kilometraje_inicial: kilometrajeInicial ? parseInt(kilometrajeInicial) : null,
            prioridad: checkup.prioridad,
            tiene_items_nn_fallados: checkup.tiene_items_nn_fallados,
            checklist_detalle: checklist,
            fallas_detectadas: observaciones,
            observaciones_golpes: danosData,
            firma_conductor: firmaConductor,
            firma_supervisor: firmaSupervisor,
          },
          vehiculo: {
            id: selectedVehiculo,
            nombre: vehiculoCompleto?.nombre || "Vehículo",
            placa: vehiculoCompleto?.placa,
          },
          chofer: choferData ? { 
            id: choferData.id, 
            nombre_completo: choferData.nombre_completo 
          } : null,
          realizadoPor: empleadoData?.full_name || null,
        });

        // Upload PDF to storage
        const pdfPath = `${selectedVehiculo}/${checkup.id}.pdf`;
        const { error: uploadError } = await supabase.storage
          .from("checkups-reportes-pdf")
          .upload(pdfPath, pdfBlob, { 
            contentType: "application/pdf",
            upsert: true 
          });

        if (uploadError) {
          console.error("Error uploading PDF:", uploadError);
        } else {
          // Update checkup with PDF path
          await supabase
            .from("vehiculos_checkups")
            .update({ pdf_path: pdfPath })
            .eq("id", checkup.id);
          
          console.log("PDF guardado en:", pdfPath);
        }
      } catch (pdfError) {
        console.error("Error generando PDF:", pdfError);
        // Don't fail the whole operation if PDF fails
      }

      // Auto-notify mechanic if NN items failed
      if (!nnValidation.isValid && checkup) {
        await enviarNotificacionMecanico(checkup.id);
        toast.warning(
          "⚠️ Vehículo con fallas No Negociables - Mecánico notificado",
          {
            duration: 5000,
          }
        );
      } else if (notificarMecanico && counts.mal > 0 && checkup) {
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
      const { data: config } = await supabase
        .from("configuracion_flotilla")
        .select("valor")
        .eq("clave", "email_mecanico")
        .maybeSingle();

      if (!config?.valor) {
        toast.warning("No hay email de mecánico configurado");
        return;
      }

      const { error } = await supabase.functions.invoke("send-checkup-report", {
        body: { checkupId, emailMecanico: config.valor },
      });

      if (error) throw error;

      await supabase
        .from("vehiculos_checkups")
        .update({
          notificado_mecanico: true,
          notificado_en: new Date().toISOString(),
        })
        .eq("id", checkupId);

      toast.success("Notificación enviada al mecánico");
    } catch (error) {
      console.error("Error enviando notificación:", error);
      toast.error("Error al enviar notificación al mecánico");
    }
  };

  const selectedVehiculoData = vehiculos.find((v) => v.id === selectedVehiculo);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Car className="h-5 w-5" />
              CHECK LIST - REVISIÓN DE SALIDA DE UNIDAD
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Header Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 rounded-lg bg-muted">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Unidad</Label>
                <Select
                  value={selectedVehiculo}
                  onValueChange={setSelectedVehiculo}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehiculos.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Operador
                </Label>
                <Select
                  value={selectedChofer}
                  onValueChange={setSelectedChofer}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {choferes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nombre_completo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Km Inicial
                </Label>
                <Input
                  type="number"
                  value={kilometrajeInicial}
                  onChange={(e) => setKilometrajeInicial(e.target.value)}
                  placeholder="123456"
                  className="h-10"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Hora</Label>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Input
                    type="time"
                    value={horaInspeccion}
                    onChange={(e) => setHoraInspeccion(e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>
            </div>

            {/* Vehicle Info */}
            {selectedVehiculoData && (
              <div className="p-3 rounded-lg border bg-muted/50 flex items-center gap-3">
                <Car className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="font-medium">{selectedVehiculoData.nombre}</p>
                  <p className="text-sm text-muted-foreground">
                    Placa: {selectedVehiculoData.placa || "Sin placa"}
                  </p>
                </div>
                <div className="ml-auto flex gap-2">
                  <Badge
                    variant="outline"
                    className="bg-green-50 text-green-700 border-green-200"
                  >
                    B: {counts.bueno}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="bg-red-50 text-red-700 border-red-200"
                  >
                    M: {counts.mal}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="bg-gray-50 text-gray-700 border-gray-200"
                  >
                    NA: {counts.na}
                  </Badge>
                </div>
              </div>
            )}

            {/* NN Warning Alert */}
            {!nnValidation.isValid && (
              <div className="p-4 rounded-lg bg-red-100 border-2 border-red-400 dark:bg-red-950 dark:border-red-700">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-red-800 dark:text-red-200">
                      ⚠️ ALERTA: {nnValidation.failedItems.length} punto(s) No
                      Negociable(s) con falla
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                      El vehículo NO puede salir hasta su corrección:
                    </p>
                    <ul className="mt-2 space-y-1">
                      {nnValidation.failedItems.map((item) => (
                        <li
                          key={item.key}
                          className="text-sm font-medium text-red-800 dark:text-red-200"
                        >
                          • {item.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="flex items-center gap-4 p-2 rounded-lg bg-muted/50 text-xs">
              <span className="font-semibold">LEYENDA:</span>
              <span className="flex items-center gap-1">
                <span className="w-5 h-5 rounded bg-green-500 text-white font-bold flex items-center justify-center text-[10px]">
                  B
                </span>
                Bueno
              </span>
              <span className="flex items-center gap-1">
                <span className="w-5 h-5 rounded bg-red-500 text-white font-bold flex items-center justify-center text-[10px]">
                  M
                </span>
                Mal
              </span>
              <span className="flex items-center gap-1">
                <span className="w-5 h-5 rounded bg-gray-400 text-white font-bold flex items-center justify-center text-[10px]">
                  NA
                </span>
                No Aplica
              </span>
              <span className="flex items-center gap-1 ml-2">
                <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                  NN
                </span>
                No Negociable
              </span>
            </div>

            {/* Checklist Categories */}
            <div className="space-y-2">
              {CHECKLIST_CATEGORIES.map((category) => (
                <Collapsible
                  key={category.key}
                  open={expandedCategories[category.key]}
                  onOpenChange={() => toggleCategory(category.key)}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between p-3 h-auto font-semibold text-left bg-muted hover:bg-muted/80"
                    >
                      <span className="flex items-center gap-2">
                        <span>{category.icon}</span>
                        {category.label}
                        <Badge variant="secondary" className="ml-2">
                          {category.items.length} items
                        </Badge>
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${expandedCategories[category.key] ? "rotate-180" : ""}`}
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1 pt-1">
                    {category.items.map((item) => (
                      <ChecklistItemRow
                        key={item.key}
                        itemKey={item.key}
                        label={item.label}
                        value={checklist[item.key]}
                        onChange={handleChecklistChange}
                        isNN={item.isNN}
                      />
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>

            {/* Observations */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Observaciones Generales</Label>
                <Textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Describe cualquier observación o falla encontrada..."
                  rows={2}
                  className="min-h-[60px]"
                />
              </div>

              {/* Interactive Damage Diagram */}
              <DiagramaDanosVehiculo
                danos={danosVehiculo}
                onDanosChange={setDanosVehiculo}
                checkupId={checkupTempId}
              />

              <div className="space-y-2">
                <Label>Notas Adicionales de Golpes</Label>
                <Textarea
                  value={observacionesGolpes}
                  onChange={(e) => setObservacionesGolpes(e.target.value)}
                  placeholder="Notas adicionales sobre golpes, raspaduras o daños..."
                  rows={2}
                  className="min-h-[60px]"
                />
              </div>
            </div>

            {/* Signatures Section */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-lg border bg-muted/30">
              <div className="space-y-2">
                <Label className="font-semibold">Firma Conductor *</Label>
                {firmaConductor ? (
                  <div className="relative">
                    <img
                      src={firmaConductor}
                      alt="Firma conductor"
                      className="h-24 w-full object-contain border rounded-lg bg-white"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-1 right-1"
                      onClick={() => setFirmaConductor(null)}
                    >
                      Borrar
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full h-24 border-dashed"
                    onClick={() => setFirmaDialogOpen("conductor")}
                  >
                    <div className="text-center">
                      <p className="font-medium">Tocar para firmar</p>
                      <p className="text-xs text-muted-foreground">
                        CONDUCTOR
                      </p>
                    </div>
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label className="font-semibold">Firma Supervisor</Label>
                {firmaSupervisor ? (
                  <div className="relative">
                    <img
                      src={firmaSupervisor}
                      alt="Firma supervisor"
                      className="h-24 w-full object-contain border rounded-lg bg-white"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-1 right-1"
                      onClick={() => setFirmaSupervisor(null)}
                    >
                      Borrar
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full h-24 border-dashed"
                    onClick={() => setFirmaDialogOpen("supervisor")}
                  >
                    <div className="text-center">
                      <p className="font-medium">Tocar para firmar</p>
                      <p className="text-xs text-muted-foreground">
                        SUPERVISOR
                      </p>
                    </div>
                  </Button>
                )}
              </div>
            </div>

            {/* Notify mechanic option */}
            {counts.mal > 0 && nnValidation.isValid && (
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-amber-50 dark:bg-amber-950">
                <input
                  type="checkbox"
                  id="notificar"
                  checked={notificarMecanico}
                  onChange={(e) => setNotificarMecanico(e.target.checked)}
                  className="h-5 w-5"
                />
                <label
                  htmlFor="notificar"
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                  Notificar al mecánico por correo
                </label>
              </div>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !selectedVehiculo || !firmaConductor}
              className={
                !nnValidation.isValid
                  ? "bg-red-600 hover:bg-red-700"
                  : undefined
              }
            >
              {saving ? (
                "Guardando..."
              ) : !nnValidation.isValid ? (
                <>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Guardar (Con Fallas NN)
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Guardar Checkup
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Signature Dialog */}
      <FirmaDigitalDialog
        open={firmaDialogOpen !== null}
        onOpenChange={(open) => {
          if (!open) setFirmaDialogOpen(null);
        }}
        titulo={
          firmaDialogOpen === "conductor"
            ? "Firma del Conductor"
            : "Firma del Supervisor"
        }
        onConfirm={(firma) => {
          const tipo = firmaDialogOpen; // Capturar antes de cerrar
          setFirmaDialogOpen(null);
          
          // Aplicar firma después del cierre para evitar conflictos
          setTimeout(() => {
            if (tipo === "conductor") {
              setFirmaConductor(firma);
            } else {
              setFirmaSupervisor(firma);
            }
          }, 50);
        }}
      />
    </>
  );
};
