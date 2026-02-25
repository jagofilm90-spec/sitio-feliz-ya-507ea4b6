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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, XCircle } from "lucide-react";

const MOTIVOS_CANCELACION = [
  { value: "mercancia_mal_estado", label: "Mercancía en mal estado" },
  { value: "mercancia_danada", label: "Mercancía dañada durante descarga" },
  { value: "producto_incorrecto", label: "Producto incorrecto / no coincide" },
  { value: "problema_temperatura", label: "Problema de temperatura" },
  { value: "documentacion", label: "Problema con documentación" },
  { value: "camion_se_fue", label: "Camión tuvo que irse" },
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
          llegada_registrada_en: null,
          llegada_registrada_por: null,
          nombre_chofer_proveedor: null,
          placas_vehiculo: null,
          numero_sello_llegada: null,
          numero_sello_puerta2: null,
          trabajando_por: null,
          trabajando_desde: null,
          descarga_cancelada_en: new Date().toISOString(),
          descarga_cancelada_por: user.id,
          motivo_cancelacion_descarga: `[CANCELADA] ${motivoFinal}`,
        })
        .eq("id", entregaId);

      if (error) throw error;

      // Notificar al proveedor por correo
      try {
        await supabase.functions.invoke("notificar-cancelacion-descarga", {
          body: { entregaId, motivo: motivoFinal },
        });
      } catch (emailError) {
        console.error("Error al notificar proveedor:", emailError);
        // No bloquear la cancelación si falla el correo
      }

      toast.success("Descarga cancelada. Se notificó al proveedor.");

      // Limpiar estado
      setMotivoSeleccionado("");
      setMotivoOtro("");
      
      onOpenChange(false);
      onDescargaCancelada();
    } catch (error) {
      console.error("Error al cancelar descarga:", error);
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
            <XCircle className="w-5 h-5 text-destructive" />
            Cancelar Descarga
          </AlertDialogTitle>
          <AlertDialogDescription>
            Se cancelará la descarga de <strong>{proveedorNombre}</strong> y se notificará al proveedor por correo.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {/* Selector de motivo */}
          <div className="space-y-2">
            <Label>Motivo de cancelación</Label>
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
            className="bg-destructive hover:bg-destructive/90"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Confirmar Cancelación
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};