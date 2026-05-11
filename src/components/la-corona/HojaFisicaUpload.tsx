import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, Upload, Loader2, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProcesarHojaFisica } from "@/hooks/useLaCorona";

interface Props {
  hojaFisicaId: string;
  entregaId: string;
  existingResult?: {
    ia_clasificacion: string | null;
    ia_sello_detectado: boolean | null;
    ia_firma_detectada: boolean | null;
    ia_observaciones_texto: string | null;
    ia_items_faltantes: string[] | null;
    foto_sellada_url: string | null;
  };
}

export default function HojaFisicaUpload({ hojaFisicaId, entregaId, existingResult }: Props) {
  const [preview, setPreview] = useState<string | null>(existingResult?.foto_sellada_url || null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const procesarMutation = useProcesarHojaFisica();

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;

    setUploading(true);
    try {
      // Upload to storage
      const path = `fotos/${entregaId}-${Date.now()}.${file.name.split(".").pop()}`;
      const { error } = await supabase.storage.from("hojas-fisicas").upload(path, file, { upsert: true });
      if (error) throw error;

      const { data: urlData } = supabase.storage.from("hojas-fisicas").getPublicUrl(path);
      setPreview(urlData.publicUrl);

      // Process with AI
      procesarMutation.mutate({ hojaFisicaId, fotoUrl: urlData.publicUrl });
    } catch (err: any) {
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
    }
  };

  const result = procesarMutation.data || existingResult;
  const hasResult = result?.ia_clasificacion;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Hoja Física — Foto Sellada</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />

        {!preview && !hasResult && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={uploading || procesarMutation.isPending}
            >
              <Camera className="h-4 w-4 mr-1" /> Tomar foto
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (fileRef.current) {
                  fileRef.current.removeAttribute("capture");
                  fileRef.current.click();
                  fileRef.current.setAttribute("capture", "environment");
                }
              }}
              disabled={uploading || procesarMutation.isPending}
            >
              <Upload className="h-4 w-4 mr-1" /> Subir imagen
            </Button>
          </div>
        )}

        {(uploading || procesarMutation.isPending) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {uploading ? "Subiendo imagen..." : "Procesando con IA..."}
          </div>
        )}

        {preview && (
          <div className="border rounded overflow-hidden">
            <img src={preview} alt="Hoja sellada" className="max-h-48 w-full object-contain bg-gray-50" />
          </div>
        )}

        {hasResult && (
          <div className="space-y-2 border-t pt-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium">Resultado IA:</span>
              <Badge
                className={
                  result.ia_clasificacion === "completo"
                    ? "bg-green-100 text-green-800"
                    : result.ia_clasificacion === "faltante"
                    ? "bg-red-100 text-red-800"
                    : result.ia_clasificacion === "no_llego"
                    ? "bg-red-200 text-red-900"
                    : "bg-gray-100 text-gray-800"
                }
              >
                {result.ia_clasificacion === "completo" && <CheckCircle className="h-3 w-3 mr-1" />}
                {result.ia_clasificacion === "faltante" && <AlertTriangle className="h-3 w-3 mr-1" />}
                {result.ia_clasificacion === "no_llego" && <XCircle className="h-3 w-3 mr-1" />}
                {result.ia_clasificacion}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1">
                {result.ia_sello_detectado ? (
                  <CheckCircle className="h-3 w-3 text-green-600" />
                ) : (
                  <XCircle className="h-3 w-3 text-red-500" />
                )}
                Sello {result.ia_sello_detectado ? "detectado" : "no detectado"}
              </div>
              <div className="flex items-center gap-1">
                {result.ia_firma_detectada ? (
                  <CheckCircle className="h-3 w-3 text-green-600" />
                ) : (
                  <XCircle className="h-3 w-3 text-red-500" />
                )}
                Firma {result.ia_firma_detectada ? "detectada" : "no detectada"}
              </div>
            </div>

            {result.ia_observaciones_texto && (
              <div className="bg-gray-50 rounded p-2">
                <p className="text-[10px] text-muted-foreground mb-0.5">Observaciones leídas por IA:</p>
                <p className="text-xs italic">"{result.ia_observaciones_texto}"</p>
              </div>
            )}

            {result.ia_items_faltantes && result.ia_items_faltantes.length > 0 && (
              <div className="bg-red-50 rounded p-2">
                <p className="text-[10px] text-red-700 mb-0.5">Items faltantes:</p>
                <ul className="text-xs text-red-800">
                  {result.ia_items_faltantes.map((item: string, i: number) => (
                    <li key={i}>• {item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
