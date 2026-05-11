import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, Upload, Loader2, Sparkles, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProcesarHojaConIA } from "@/hooks/useHojaSalida";

interface Props {
  hojaId: string;
  fotoExistente?: string | null;
  iaResultado?: {
    ia_clasificacion?: string | null;
    ia_sello_detectado?: boolean | null;
    ia_firma_detectada?: boolean | null;
    ia_observaciones_texto?: string | null;
  } | null;
}

export default function HojaFisicaUpload({ hojaId, fotoExistente, iaResultado }: Props) {
  const [preview, setPreview] = useState<string | null>(fotoExistente || null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const procesarIA = useProcesarHojaConIA();

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setPreview(URL.createObjectURL(file));
    setUploading(true);

    try {
      // Upload to storage
      const path = `fotos/${hojaId}-${Date.now()}.${file.name.split(".").pop()}`;
      const { error } = await supabase.storage.from("hojas-salida").upload(path, file, { upsert: true });
      if (error) throw error;

      const { data: urlData } = supabase.storage.from("hojas-salida").getPublicUrl(path);
      const fotoUrl = urlData.publicUrl;
      setPreview(fotoUrl);

      // Update hoja with photo URL
      await (supabase as any)
        .from("hojas_salida")
        .update({ foto_sellada_url: fotoUrl, entregada_cliente_at: new Date().toISOString() })
        .eq("id", hojaId);

      setUploading(false);

      // Auto-trigger IA processing
      procesarIA.mutate({ hoja_salida_id: hojaId, foto_url: fotoUrl });
    } catch (err: any) {
      console.error("Upload error:", err);
      setUploading(false);
    }
  };

  const iaData = procesarIA.data || iaResultado;
  const hasIAResult = !!iaData?.ia_clasificacion;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          Foto Hoja Sellada
          {procesarIA.isPending && <Sparkles className="h-3 w-3 text-[#c41e3a] animate-pulse" />}
        </CardTitle>
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

        {!preview && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
              <Camera className="h-4 w-4 mr-1" /> Tomar foto
            </Button>
            <Button variant="outline" size="sm" onClick={() => {
              if (fileRef.current) { fileRef.current.removeAttribute("capture"); fileRef.current.click(); fileRef.current.setAttribute("capture", "environment"); }
            }} disabled={uploading}>
              <Upload className="h-4 w-4 mr-1" /> Galería
            </Button>
          </div>
        )}

        {uploading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Subiendo imagen...
          </div>
        )}

        {procesarIA.isPending && (
          <div className="flex items-center gap-2 text-sm text-[#c41e3a]">
            <Sparkles className="h-4 w-4 animate-pulse" /> Analizando con Claude Vision...
          </div>
        )}

        {preview && (
          <div className="border rounded overflow-hidden">
            <img src={preview} alt="Hoja sellada" className="max-h-48 w-full object-contain bg-gray-50" />
          </div>
        )}

        {/* IA Results */}
        {hasIAResult && (
          <div className="border-t pt-3 space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3 w-3 text-[#c41e3a]" />
              <span className="text-xs font-medium">Resultado IA:</span>
              <Badge className={
                iaData.ia_clasificacion === "completo" ? "bg-green-100 text-green-800" :
                iaData.ia_clasificacion === "faltante" ? "bg-red-100 text-red-800" :
                iaData.ia_clasificacion === "no_llego" ? "bg-red-200 text-red-900" :
                iaData.ia_clasificacion === "rechazado" ? "bg-red-300 text-red-900" :
                "bg-gray-100 text-gray-800"
              }>
                {iaData.ia_clasificacion}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1">
                {iaData.ia_sello_detectado ? <CheckCircle className="h-3 w-3 text-green-600" /> : <XCircle className="h-3 w-3 text-red-500" />}
                Sello {iaData.ia_sello_detectado ? "detectado" : "no detectado"}
              </div>
              <div className="flex items-center gap-1">
                {iaData.ia_firma_detectada ? <CheckCircle className="h-3 w-3 text-green-600" /> : <XCircle className="h-3 w-3 text-red-500" />}
                Firma {iaData.ia_firma_detectada ? "detectada" : "no detectada"}
              </div>
            </div>

            {iaData.ia_observaciones_texto && (
              <div className="bg-gray-50 rounded p-2">
                <p className="text-[10px] text-muted-foreground mb-0.5">Observaciones leídas por IA:</p>
                <p className="text-xs italic">"{iaData.ia_observaciones_texto}"</p>
              </div>
            )}

            {iaData.ia_clasificacion !== "completo" && (
              <div className="flex items-center gap-1 text-xs text-amber-700">
                <AlertTriangle className="h-3 w-3" /> Discrepancia auto-generada. Admin revisará.
              </div>
            )}
          </div>
        )}

        {/* Re-process button if photo exists but no IA */}
        {preview && !hasIAResult && !procesarIA.isPending && !uploading && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => procesarIA.mutate({ hoja_salida_id: hojaId, foto_url: preview })}
          >
            <Sparkles className="h-3 w-3 mr-1" /> Procesar con IA
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
