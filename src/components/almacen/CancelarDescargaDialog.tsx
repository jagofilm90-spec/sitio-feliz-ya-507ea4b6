import { useState, useRef } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, XCircle, Camera, X, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { compressImageForUpload, validateCapturedFile } from "@/lib/imageUtils";

const MOTIVO_FIJO = "Producto en mal estado";

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
  const [notas, setNotas] = useState("");
  const [loading, setLoading] = useState(false);
  const [fotos, setFotos] = useState<File[]>([]);
  const [fotoPreviews, setFotoPreviews] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCapturarFoto = () => {
    inputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateCapturedFile(file);
    if (!validation.valid) {
      toast.error(validation.errorTitle, { description: validation.errorMessage });
      return;
    }

    const compressed = await compressImageForUpload(file, "evidence");
    setFotos((prev) => [...prev, compressed]);
    setFotoPreviews((prev) => [...prev, URL.createObjectURL(compressed)]);

    // Reset input
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleRemoveFoto = (index: number) => {
    URL.revokeObjectURL(fotoPreviews[index]);
    setFotos((prev) => prev.filter((_, i) => i !== index));
    setFotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirmar = async () => {
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      // Subir fotos de evidencia
      const fotosStoragePaths: string[] = [];
      for (const foto of fotos) {
        const path = `cancelaciones/${entregaId}/${Date.now()}_${foto.name}`;
        const { error: uploadError } = await supabase.storage
          .from("recepciones-evidencias")
          .upload(path, foto);

        if (!uploadError) {
          fotosStoragePaths.push(path);
        }
      }

      const motivoCompleto = notas.trim()
        ? `${MOTIVO_FIJO} — ${notas.trim()}`
        : MOTIVO_FIJO;

      // Actualizar la entrega
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
          motivo_cancelacion_descarga: `[CANCELADA] ${motivoCompleto}`,
        })
        .eq("id", entregaId);

      if (error) throw error;

      // Notificar al proveedor por correo con fotos
      try {
        await supabase.functions.invoke("notificar-cancelacion-descarga", {
          body: { entregaId, motivo: motivoCompleto, fotosStoragePaths },
        });
      } catch (emailError) {
        console.error("Error al notificar proveedor:", emailError);
      }

      toast.success("Descarga cancelada. Se notificó al proveedor.");

      // Limpiar estado
      setNotas("");
      fotoPreviews.forEach((url) => URL.revokeObjectURL(url));
      setFotos([]);
      setFotoPreviews([]);

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
      <AlertDialogContent className="w-[calc(100vw-2rem)] sm:max-w-md overflow-x-hidden max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-destructive" />
            Cancelar Descarga
          </AlertDialogTitle>
          <AlertDialogDescription>
            Se cancelará la descarga de <strong>{proveedorNombre}</strong> por <strong>{MOTIVO_FIJO}</strong> y se notificará al proveedor.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {/* Notas adicionales opcionales */}
          <div className="space-y-2">
            <Label>Notas adicionales (opcional)</Label>
            <Textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Detalles adicionales sobre el problema..."
              className="min-h-[60px]"
            />
          </div>

          {/* Fotos de evidencia */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <ImageIcon className="w-4 h-4" />
              Fotos de evidencia (opcional)
            </Label>

            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCapturarFoto}
              disabled={loading}
              className="w-full"
            >
              <Camera className="w-4 h-4 mr-2" />
              Tomar / Adjuntar foto
            </Button>

            {fotoPreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-2">
                {fotoPreviews.map((url, i) => (
                  <div key={i} className="relative rounded-md overflow-hidden border">
                    <img src={url} alt={`Evidencia ${i + 1}`} className="w-full h-20 object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveFoto(i)}
                      className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Volver</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirmar}
            disabled={loading}
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
