import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, XCircle, PauseCircle } from "lucide-react";

const MOTIVOS_CANCELACION = [
  { value: "camion_se_fue", label: "Camión tuvo que irse por emergencia" },
  { value: "documentacion", label: "Problema con documentación" },
  { value: "falta_personal", label: "Falta de personal para descarga" },
  { value: "problema_producto", label: "Problema con el producto" },
  { value: "espacio_bodega", label: "Espacio insuficiente en bodega" },
  { value: "otro", label: "Otro motivo" },
];

interface CancelarDescargaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entregaId: string;
  proveedorNombre: string;
  onDescargaCancelada: () => void;
}

export const CancelarDescargaDialog = ({
  open,
  onOpenChange,
  entregaId,
  proveedorNombre,
  onDescargaCancelada,
}: CancelarDescargaDialogProps) => {
  const [accion, setAccion] = useState<"cancelar" | "pausar">("pausar");
  const [motivoSeleccionado, setMotivoSeleccionado] = useState("");
  const [motivoOtro, setMotivoOtro] = useState("");
  const [loading, setLoading] = useState(false);

  const motivoFinal = motivoSeleccionado === "otro" 
    ? motivoOtro 
    : MOTIVOS_CANCELACION.find(m => m.value === motivoSeleccionado)?.label || "";

  const handleConfirmar = async () => {
    if (!motivoSeleccionado) {
      toast.error("Selecciona un motivo");
      return;
    }

    if (motivoSeleccionado === "otro" && !motivoOtro.trim()) {
      toast.error("Especifica el motivo");
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      // Actualizar la entrega: volver a programada y limpiar campos de llegada
      const { error } = await supabase
        .from("ordenes_compra_entregas")
        .update({
          status: "programada",
          // Limpiar campos de llegada
          llegada_registrada_en: null,
          llegada_registrada_por: null,
          nombre_chofer_proveedor: null,
          placas_vehiculo: null,
          numero_sello_llegada: null,
          numero_sello_puerta2: null,
          trabajando_por: null,
          trabajando_desde: null,
          // Registrar cancelación
          descarga_cancelada_en: new Date().toISOString(),
          descarga_cancelada_por: user.id,
          motivo_cancelacion_descarga: `[${accion.toUpperCase()}] ${motivoFinal}`,
        })
        .eq("id", entregaId);

      if (error) throw error;

      toast.success(
        accion === "pausar"
          ? "Recepción pausada. Podrás reiniciarla cuando el camión regrese."
          : "Recepción cancelada. La entrega vuelve a estado pendiente."
      );

      // Limpiar estado
      setAccion("pausar");
      setMotivoSeleccionado("");
      setMotivoOtro("");
      
      onOpenChange(false);
      onDescargaCancelada();
    } catch (error) {
      console.error("Error al cancelar/pausar descarga:", error);
      toast.error("Error al procesar la solicitud");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="w-[calc(100vw-2rem)] sm:max-w-md overflow-x-hidden">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {accion === "pausar" ? (
              <PauseCircle className="w-5 h-5 text-amber-500" />
            ) : (
              <XCircle className="w-5 h-5 text-destructive" />
            )}
            {accion === "pausar" ? "Pausar" : "Cancelar"} Recepción
          </AlertDialogTitle>
          <AlertDialogDescription>
            Entrega de <strong>{proveedorNombre}</strong>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {/* Selector de acción */}
          <div className="space-y-2">
            <Label>¿Qué deseas hacer?</Label>
            <RadioGroup
              value={accion}
              onValueChange={(v) => setAccion(v as "cancelar" | "pausar")}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pausar" id="pausar" />
                <Label htmlFor="pausar" className="font-normal cursor-pointer">
                  <span className="flex items-center gap-1">
                    <PauseCircle className="w-4 h-4 text-amber-500" />
                    Pausar
                  </span>
                  <span className="text-xs text-muted-foreground block">
                    El camión regresará después
                  </span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cancelar" id="cancelar" />
                <Label htmlFor="cancelar" className="font-normal cursor-pointer">
                  <span className="flex items-center gap-1">
                    <XCircle className="w-4 h-4 text-destructive" />
                    Cancelar
                  </span>
                  <span className="text-xs text-muted-foreground block">
                    El camión no regresará hoy
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Selector de motivo */}
          <div className="space-y-2">
            <Label>Motivo</Label>
            <Select value={motivoSeleccionado} onValueChange={setMotivoSeleccionado}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un motivo" />
              </SelectTrigger>
              <SelectContent>
                {MOTIVOS_CANCELACION.map((motivo) => (
                  <SelectItem key={motivo.value} value={motivo.value}>
                    {motivo.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Campo de texto para "Otro" */}
          {motivoSeleccionado === "otro" && (
            <div className="space-y-2">
              <Label>Especifica el motivo</Label>
              <Textarea
                value={motivoOtro}
                onChange={(e) => setMotivoOtro(e.target.value)}
                placeholder="Describe el motivo..."
                className="min-h-[80px]"
              />
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Volver</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirmar}
            disabled={loading || !motivoSeleccionado || (motivoSeleccionado === "otro" && !motivoOtro.trim())}
            className={accion === "cancelar" ? "bg-destructive hover:bg-destructive/90" : "bg-amber-500 hover:bg-amber-600"}
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Confirmar {accion === "pausar" ? "pausa" : "cancelación"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
