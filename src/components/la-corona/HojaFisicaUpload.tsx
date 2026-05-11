import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Upload, Loader2 } from "lucide-react";
import { useSubirFotoSellada } from "@/hooks/useHojaSalida";

interface Props {
  hojaId: string;
  fotoExistente?: string | null;
}

export default function HojaFisicaUpload({ hojaId, fotoExistente }: Props) {
  const [preview, setPreview] = useState<string | null>(fotoExistente || null);
  const fileRef = useRef<HTMLInputElement>(null);
  const subirMutation = useSubirFotoSellada();

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setPreview(URL.createObjectURL(file));
    subirMutation.mutate({ hojaId, file });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Foto Hoja Sellada</CardTitle>
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
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={subirMutation.isPending}>
              <Camera className="h-4 w-4 mr-1" /> Tomar foto
            </Button>
            <Button variant="outline" size="sm" onClick={() => {
              if (fileRef.current) { fileRef.current.removeAttribute("capture"); fileRef.current.click(); fileRef.current.setAttribute("capture", "environment"); }
            }} disabled={subirMutation.isPending}>
              <Upload className="h-4 w-4 mr-1" /> Galería
            </Button>
          </div>
        )}

        {subirMutation.isPending && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Subiendo...
          </div>
        )}

        {preview && (
          <div className="border rounded overflow-hidden">
            <img src={preview} alt="Hoja sellada" className="max-h-48 w-full object-contain bg-gray-50" />
          </div>
        )}

        {subirMutation.isSuccess && (
          <p className="text-xs text-green-700">Foto subida. Pendiente reconciliación admin.</p>
        )}
      </CardContent>
    </Card>
  );
}
