import { useState } from "react";
import { Camera, Lock, LockOpen, Loader2, X, Eye, Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  numerosSello: string[];
  onNumerosSelloChange: (value: string[]) => void;
  totalPedidos: number;
}

export function SellosSection({
  rutaId,
  evidencias,
  onEvidenciaAdded,
  disabled = false,
  llevaSellos,
  onLlevaSellosChange,
  numerosSello,
  onNumerosSelloChange,
  totalPedidos,
}: SellosSectionProps) {
  const [uploading, setUploading] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>("");

  const esDirecto = totalPedidos === 1;

  // Get seal evidences sorted by tipo_evidencia
  const selloEvidencias = evidencias
    .filter((e) => e.tipo_evidencia.startsWith("sello_salida_"))
    .sort((a, b) => a.tipo_evidencia.localeCompare(b.tipo_evidencia));

  // Determine how many seal slots we have (at least match evidencias count)
  const selloCount = Math.max(numerosSello.length, selloEvidencias.length, llevaSellos ? 1 : 0);

  const handleCapture = async (selloIdx: number) => {
    const tipo = `sello_salida_${selloIdx + 1}`;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.style.display = "none";
    document.body.appendChild(input);

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      document.body.removeChild(input);
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

        const { data: { user } } = await supabase.auth.getUser();

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

        toast.success(`Foto de sello guardada`);
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

  const handleRemove = async (evidencia: CargaEvidencia, selloIdx: number) => {
    try {
      await supabase.storage
        .from("cargas-evidencias")
        .remove([evidencia.ruta_storage]);

      const { error } = await supabase
        .from("carga_evidencias")
        .delete()
        .eq("id", evidencia.id);

      if (error) throw error;

      // Clear only the number for this specific seal, don't shift others
      const newNumeros = [...numerosSello];
      if (selloIdx < newNumeros.length) {
        newNumeros[selloIdx] = "";
        onNumerosSelloChange(newNumeros);
      }

      toast.success("Sello eliminado");
      onEvidenciaAdded();
    } catch (error) {
      console.error("Error removing evidence:", error);
      toast.error("Error al eliminar");
    }
  };

  const handlePreview = async (evidencia: CargaEvidencia, idx: number) => {
    const { data } = await supabase.storage
      .from("cargas-evidencias")
      .createSignedUrl(evidencia.ruta_storage, 300);

    if (data?.signedUrl) {
      setPreviewTitle(`Sello`);
      setPreviewUrl(data.signedUrl);
    }
  };

  const handleAddSello = () => {
    onNumerosSelloChange([...numerosSello, ""]);
  };

  const handleNumeroChange = (idx: number, value: string) => {
    const newNumeros = [...numerosSello];
    newNumeros[idx] = value;
    onNumerosSelloChange(newNumeros);
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
              {esDirecto && llevaSellos && (
                <span className="text-xs font-normal text-muted-foreground border rounded px-1.5 py-0.5">Obligatorio</span>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Checkbox
                id="no-sellos"
                checked={!llevaSellos}
                onCheckedChange={(checked) => onLlevaSellosChange(!checked)}
                disabled={disabled || esDirecto}
              />
              <Label htmlFor="no-sellos" className="text-sm cursor-pointer">
                Sin sellos
              </Label>
            </div>
          </div>
          {esDirecto && (
            <p className="text-xs text-muted-foreground mt-1">
              Pedido directo (1/1) — al menos 1 sello obligatorio
            </p>
          )}
        </CardHeader>

        {llevaSellos && (
          <CardContent className="space-y-4">
            {/* Dynamic seal entries */}
            {Array.from({ length: selloCount }).map((_, idx) => {
              const tipo = `sello_salida_${idx + 1}`;
              const evidencia = evidencias.find(e => e.tipo_evidencia === tipo);
              const numero = numerosSello[idx] || "";

              return (
                <div key={idx} className="border rounded-lg p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">
                      Sello
                      {idx === 0 && esDirecto && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    {idx > 0 && !evidencia && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                          const newNumeros = [...numerosSello];
                          newNumeros.splice(idx, 1);
                          onNumerosSelloChange(newNumeros);
                        }}
                        disabled={disabled}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Photo */}
                    {evidencia ? (
                      <div
                        className="flex items-center gap-2 border rounded-md px-3 py-2 bg-muted/50 cursor-pointer hover:bg-muted transition-colors flex-1 min-w-0"
                        onClick={() => handlePreview(evidencia, idx)}
                      >
                        <Check className="h-4 w-4 text-green-600 shrink-0" />
                        <span className="text-sm truncate">Foto sello</span>
                        <div className="flex items-center gap-1 ml-auto shrink-0">
                          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive"
                            onClick={(e) => { e.stopPropagation(); handleRemove(evidencia, idx); }}
                            disabled={disabled}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        className="gap-2 flex-1"
                        onClick={() => handleCapture(idx)}
                        disabled={disabled || uploading === tipo}
                      >
                        {uploading === tipo ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Camera className="h-4 w-4" />
                        )}
                        <span className="text-sm">Foto sello</span>
                      </Button>
                    )}

                    {/* Number */}
                    <Input
                      placeholder="Nº sello"
                      value={numero}
                      onChange={(e) => handleNumeroChange(idx, e.target.value)}
                      disabled={disabled}
                      className="h-10 w-32"
                    />
                  </div>
                </div>
              );
            })}

            {/* Add seal button */}
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={handleAddSello}
              disabled={disabled}
            >
              <Plus className="h-4 w-4" />
              Agregar sello
            </Button>

            {/* Validation for direct orders */}
            {esDirecto && selloEvidencias.length === 0 && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <Camera className="h-4 w-4" />
                Al menos 1 sello con foto obligatorio (pedido directo)
              </p>
            )}
          </CardContent>
        )}
      </Card>

      {/* Preview dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-2xl overflow-x-hidden">
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

