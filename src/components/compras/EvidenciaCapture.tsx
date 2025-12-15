import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, CreditCard, FileText, Truck, Package, X, Loader2, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

export type TipoEvidencia = 'sello' | 'identificacion' | 'documento' | 'vehiculo' | 'caducidad' | 'producto_danado' | 'otro';

interface EvidenciaCaptureProps {
  tipo: TipoEvidencia;
  onCapture: (file: File, preview: string) => void;
  disabled?: boolean;
  className?: string;
}

const tipoConfig: Record<TipoEvidencia, { label: string; icon: typeof Camera }> = {
  sello: { label: "Foto de sellos", icon: Camera },
  identificacion: { label: "Escanear INE", icon: CreditCard },
  documento: { label: "Escanear documento", icon: FileText },
  vehiculo: { label: "Foto del vehículo", icon: Truck },
  caducidad: { label: "Foto caducidad", icon: CalendarDays },
  producto_danado: { label: "Foto producto dañado", icon: Package },
  otro: { label: "Otra evidencia", icon: Package },
};

// Compress image to reduce file size
async function compressImage(file: File, maxWidth = 1920, quality = 0.8): Promise<File> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Scale down if needed
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: "image/jpeg",
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            "image/jpeg",
            quality
          );
        } else {
          resolve(file);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function EvidenciaCapture({ tipo, onCapture, disabled, className }: EvidenciaCaptureProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const config = tipoConfig[tipo];
  const Icon = config.icon;

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      // Compress the image
      const compressedFile = await compressImage(file);
      
      // Create preview URL
      const preview = URL.createObjectURL(compressedFile);
      
      onCapture(compressedFile, preview);
    } catch (error) {
      console.error("Error processing image:", error);
    } finally {
      setIsProcessing(false);
      // Reset input to allow selecting same file again
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  return (
    <div className={cn("inline-block", className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || isProcessing}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={disabled || isProcessing}
        className="flex items-center gap-2"
      >
        {isProcessing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Icon className="h-4 w-4" />
        )}
        {config.label}
      </Button>
    </div>
  );
}

interface EvidenciaPreview {
  tipo: TipoEvidencia;
  file: File;
  preview: string;
}

interface EvidenciasPreviewGridProps {
  evidencias: EvidenciaPreview[];
  onRemove: (index: number) => void;
}

export function EvidenciasPreviewGrid({ evidencias, onRemove }: EvidenciasPreviewGridProps) {
  if (evidencias.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
      {evidencias.map((evidencia, index) => {
        const config = tipoConfig[evidencia.tipo];
        const Icon = config.icon;
        
        return (
          <div
            key={index}
            className="relative group rounded-lg overflow-hidden border bg-muted/30"
          >
            <img
              src={evidencia.preview}
              alt={config.label}
              className="w-full h-24 object-cover"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="absolute top-1 right-1 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/90"
            >
              <X className="h-3 w-3" />
            </button>
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs py-1 px-2 flex items-center gap-1">
              <Icon className="h-3 w-3" />
              <span className="truncate">{config.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
