import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, CreditCard, FileText, Truck, Package, X, Loader2, CalendarDays, PackageOpen, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import { compressImageForUpload, type ImageCompressionProfile } from "@/lib/imageUtils";

export type TipoEvidencia = 'sello' | 'sello_1' | 'sello_2' | 'identificacion' | 'documento' | 'vehiculo' | 'placas' | 'caducidad' | 'producto_danado' | 'caja_vacia' | 'remision_proveedor' | 'rechazo_total' | 'otro';

interface EvidenciaCaptureProps {
  tipo: TipoEvidencia;
  onCapture: (file: File, preview: string) => void;
  disabled?: boolean;
  className?: string;
}

const tipoConfig: Record<TipoEvidencia, { label: string; icon: typeof Camera }> = {
  sello: { label: "Foto de sellos", icon: Camera },
  sello_1: { label: "Sello Puerta 1", icon: Camera },
  sello_2: { label: "Sello Puerta 2", icon: Camera },
  identificacion: { label: "Escanear INE", icon: CreditCard },
  documento: { label: "Escanear documento", icon: FileText },
  vehiculo: { label: "Foto del vehículo", icon: Truck },
  placas: { label: "Foto placas/camión", icon: Truck },
  caducidad: { label: "Foto caducidad", icon: CalendarDays },
  producto_danado: { label: "Foto producto dañado", icon: Package },
  caja_vacia: { label: "Foto caja vacía", icon: PackageOpen },
  remision_proveedor: { label: "Foto remisión", icon: Receipt },
  rechazo_total: { label: "Evidencia rechazo", icon: Camera },
  otro: { label: "Otra evidencia", icon: Package },
};

// Mapeo de tipo de evidencia a perfil de compresión centralizado
const TIPO_TO_PROFILE: Record<TipoEvidencia, ImageCompressionProfile> = {
  sello: 'evidence',
  sello_1: 'evidence',
  sello_2: 'evidence',
  identificacion: 'ocr', // INE necesita OCR
  documento: 'ocr',
  vehiculo: 'evidence',
  placas: 'ocr', // Placas necesitan OCR
  caducidad: 'ocr', // Fechas necesitan OCR
  producto_danado: 'evidence',
  caja_vacia: 'evidence',
  remision_proveedor: 'ocr', // Documento del proveedor puede necesitar OCR
  rechazo_total: 'evidence', // Fotos de evidencia de rechazo
  otro: 'evidence',
};

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
      // Usar función centralizada de compresión con perfil según tipo
      const compressionProfile = TIPO_TO_PROFILE[tipo];
      const compressedFile = await compressImageForUpload(file, compressionProfile);
      
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
        size="lg"
        onClick={handleClick}
        disabled={disabled || isProcessing}
        className="flex items-center gap-3 h-14 px-6 text-base touch-manipulation"
      >
        {isProcessing ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Icon className="h-5 w-5" />
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
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
      {evidencias.map((evidencia, index) => {
        const config = tipoConfig[evidencia.tipo];
        const Icon = config.icon;
        
        return (
          <div
            key={index}
            className="relative rounded-lg overflow-hidden border-2 bg-muted/30"
          >
            <img
              src={evidencia.preview}
              alt={config.label}
              className="w-full h-32 object-cover"
            />
            {/* Botón eliminar siempre visible y más grande para stylus */}
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="absolute top-2 right-2 p-2 rounded-full bg-destructive text-destructive-foreground touch-manipulation hover:bg-destructive/90 active:scale-95 transition-transform"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-sm py-2 px-3 flex items-center gap-2">
              <Icon className="h-4 w-4" />
              <span className="truncate">{config.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
