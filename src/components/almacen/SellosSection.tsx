import { useState } from "react";
import { Camera, Lock, LockOpen, Loader2, X, Eye, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { compressImageForUpload } from "@/lib/imageUtils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CargaEvidencia {
  id: string;
  tipo_evidencia: string;
  ruta_storage: string;
  nombre_archivo: string;
  created_at: string;
}

interface SellosSectionProps {
  rutaId: string;
  evidencias: CargaEvidencia[];
  onEvidenciaAdded: () => void;
  disabled?: boolean;
  llevaSellos: boolean;
  onLlevaSellosChange: (value: boolean) => void;
  numeroSello: string;
  onNumeroSelloChange: (value: string) => void;
}

export function SellosSection({
  rutaId,
  evidencias,
  onEvidenciaAdded,
  disabled = false,
  llevaSellos,
  onLlevaSellosChange,
  numeroSello,
  onNumeroSelloChange,
}: SellosSectionProps) {
  const [uploading, setUploading] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>("");

  const selloEvidencias = evidencias.filter(
    (e) => e.tipo_evidencia === "sello_salida_1" || e.tipo_evidencia === "sello_salida_2"
  );
  
  const sello1 = evidencias.find(e => e.tipo_evidencia === "sello_salida_1");
  const sello2 = evidencias.find(e => e.tipo_evidencia === "sello_salida_2");

  const handleCapture = async (tipo: string, label: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setUploading(tipo);
      try {
        const compressed = await compressImageForUpload(file, "evidence");
        const timestamp = Date.now();
        const fileName = `${rutaId}/${tipo}_${timestamp}.jpg`;

        const { error: uploadError } = await supabase.storage
          .from("cargas-evidencias")
          .upload(fileName, compressed);

        if (uploadError) throw uploadError;

        const {
          data: { user },
        } = await supabase.auth.getUser();

        const { error: dbError } = await supabase
          .from("carga_evidencias")
          .insert({
            ruta_id: rutaId,
            tipo_evidencia: tipo,
            ruta_storage: fileName,
            nombre_archivo: file.name,
            capturado_por: user?.id,
          });

        if (dbError) throw dbError;

        toast.success(`Foto de ${label} guardada`);
        onEvidenciaAdded();
      } catch (error) {
        console.error("Error uploading seal evidence:", error);
        toast.error("Error al guardar foto");
      } finally {
        setUploading(null);
      }
    };

    input.click();
  };

  const handleRemove = async (evidencia: CargaEvidencia) => {
    try {
      await supabase.storage
        .from("cargas-evidencias")
        .remove([evidencia.ruta_storage]);

      const { error } = await supabase
        .from("carga_evidencias")
        .delete()
        .eq("id", evidencia.id);

      if (error) throw error;

      toast.success("Foto eliminada");
      onEvidenciaAdded();
    } catch (error) {
      console.error("Error removing evidence:", error);
      toast.error("Error al eliminar foto");
    }
  };

  const handlePreview = async (evidencia: CargaEvidencia) => {
    const { data } = await supabase.storage
      .from("cargas-evidencias")
      .createSignedUrl(evidencia.ruta_storage, 300);

    if (data?.signedUrl) {
      setPreviewTitle(
        evidencia.tipo_evidencia === "sello_salida_1" ? "Sello Puerta 1" : "Sello Puerta 2"
      );
      setPreviewUrl(data.signedUrl);
    }
  };

  return (
    <>
      <Card className={!llevaSellos ? "opacity-60" : ""}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              {llevaSellos ? (
                <Lock className="h-4 w-4 text-primary" />
              ) : (
                <LockOpen className="h-4 w-4 text-muted-foreground" />
              )}
              Sellos de Salida
            </CardTitle>
            <div className="flex items-center gap-2">
              <Checkbox
                id="no-sellos"
                checked={!llevaSellos}
                onCheckedChange={(checked) => onLlevaSellosChange(!checked)}
                disabled={disabled}
              />
              <Label htmlFor="no-sellos" className="text-sm cursor-pointer">
                Sin sellos
              </Label>
            </div>
          </div>
        </CardHeader>

        {llevaSellos && (
          <CardContent className="space-y-4">
            {/* Número de sello */}
            <div className="space-y-2">
              <Label htmlFor="numero-sello">Número de sello</Label>
              <Input
                id="numero-sello"
                placeholder="Ej: 123456"
                value={numeroSello}
                onChange={(e) => onNumeroSelloChange(e.target.value)}
                disabled={disabled}
                className="h-12"
              />
            </div>

            {/* Botones para capturar fotos de sellos */}
            <div className="grid grid-cols-2 gap-3">
              {/* Sello Puerta 1 - Obligatorio */}
              <div className="space-y-2">
                <Label className="text-sm">
                  Sello Puerta 1 <span className="text-destructive">*</span>
                </Label>
                {sello1 ? (
                  <div className="relative aspect-video rounded-lg border overflow-hidden group">
                    <SelloThumbnail
                      rutaStorage={sello1.ruta_storage}
                      onClick={() => handlePreview(sello1)}
                    />
                    <div className="absolute top-2 right-2 flex gap-1">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-7 w-7 bg-background/80"
                        onClick={() => handlePreview(sello1)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleRemove(sello1)}
                        disabled={disabled}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <Badge className="absolute bottom-2 left-2 bg-green-600">
                      <Check className="h-3 w-3 mr-1" />
                      Capturado
                    </Badge>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full h-20 flex flex-col gap-1"
                    onClick={() => handleCapture("sello_salida_1", "Sello Puerta 1")}
                    disabled={disabled || uploading === "sello_salida_1"}
                  >
                    {uploading === "sello_salida_1" ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <Camera className="h-6 w-6" />
                    )}
                    <span className="text-xs">Capturar</span>
                  </Button>
                )}
              </div>

              {/* Sello Puerta 2 - Opcional */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  Sello Puerta 2 (opcional)
                </Label>
                {sello2 ? (
                  <div className="relative aspect-video rounded-lg border overflow-hidden group">
                    <SelloThumbnail
                      rutaStorage={sello2.ruta_storage}
                      onClick={() => handlePreview(sello2)}
                    />
                    <div className="absolute top-2 right-2 flex gap-1">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-7 w-7 bg-background/80"
                        onClick={() => handlePreview(sello2)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleRemove(sello2)}
                        disabled={disabled}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <Badge className="absolute bottom-2 left-2 bg-green-600">
                      <Check className="h-3 w-3 mr-1" />
                      Capturado
                    </Badge>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full h-20 flex flex-col gap-1"
                    onClick={() => handleCapture("sello_salida_2", "Sello Puerta 2")}
                    disabled={disabled || uploading === "sello_salida_2"}
                  >
                    {uploading === "sello_salida_2" ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <Camera className="h-6 w-6" />
                    )}
                    <span className="text-xs">Capturar</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Validación */}
            {!sello1 && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <Camera className="h-4 w-4" />
                Foto del sello obligatoria para completar carga
              </p>
            )}
          </CardContent>
        )}
      </Card>

      {/* Preview dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{previewTitle}</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Sello"
              className="w-full h-auto rounded-md"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// Thumbnail component
function SelloThumbnail({
  rutaStorage,
  onClick,
}: {
  rutaStorage: string;
  onClick: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useState(() => {
    supabase.storage
      .from("cargas-evidencias")
      .createSignedUrl(rutaStorage, 300)
      .then(({ data }) => {
        if (data?.signedUrl) {
          setUrl(data.signedUrl);
        }
        setLoading(false);
      });
  });

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return url ? (
    <img
      src={url}
      alt="Sello"
      className="w-full h-full object-cover cursor-pointer"
      onClick={onClick}
    />
  ) : (
    <div className="w-full h-full flex items-center justify-center bg-muted">
      <Lock className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}
