import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Camera, CreditCard, FileText, Truck, Package, Download, X, ImageOff } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type TipoEvidencia = 'sello' | 'identificacion' | 'documento' | 'vehiculo' | 'otro';

const tipoConfig: Record<TipoEvidencia, { label: string; icon: typeof Camera }> = {
  sello: { label: "Sellos", icon: Camera },
  identificacion: { label: "INE", icon: CreditCard },
  documento: { label: "Documento", icon: FileText },
  vehiculo: { label: "Vehículo", icon: Truck },
  otro: { label: "Otro", icon: Package },
};

interface EvidenciasGalleryProps {
  ordenCompraId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Evidencia {
  id: string;
  tipo_evidencia: TipoEvidencia;
  ruta_storage: string;
  nombre_archivo: string;
  notas: string | null;
  created_at: string;
  signedUrl?: string;
}

export function EvidenciasGallery({ ordenCompraId, open, onOpenChange }: EvidenciasGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<Evidencia | null>(null);

  const { data: evidencias = [], isLoading } = useQuery({
    queryKey: ["recepciones-evidencias", ordenCompraId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recepciones_evidencias")
        .select("*")
        .eq("orden_compra_id", ordenCompraId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Generate signed URLs for each evidence
      const evidenciasWithUrls = await Promise.all(
        (data || []).map(async (evidencia) => {
          const { data: signedUrlData } = await supabase.storage
            .from("recepciones-evidencias")
            .createSignedUrl(evidencia.ruta_storage, 3600); // 1 hour expiry

          return {
            ...evidencia,
            tipo_evidencia: evidencia.tipo_evidencia as TipoEvidencia,
            signedUrl: signedUrlData?.signedUrl,
          };
        })
      );

      return evidenciasWithUrls as Evidencia[];
    },
    enabled: open && !!ordenCompraId,
  });

  const handleDownload = async (evidencia: Evidencia) => {
    if (!evidencia.signedUrl) return;
    
    try {
      const response = await fetch(evidencia.signedUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = evidencia.nombre_archivo;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading file:", error);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Evidencias Fotográficas
            </DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 rounded-lg" />
              ))}
            </div>
          ) : evidencias.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <ImageOff className="h-12 w-12 mb-3" />
              <p>No hay evidencias registradas</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {evidencias.map((evidencia) => {
                const config = tipoConfig[evidencia.tipo_evidencia];
                const Icon = config.icon;

                return (
                  <div
                    key={evidencia.id}
                    className="relative group rounded-lg overflow-hidden border bg-muted/30 cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                    onClick={() => setSelectedImage(evidencia)}
                  >
                    {evidencia.signedUrl ? (
                      <img
                        src={evidencia.signedUrl}
                        alt={config.label}
                        className="w-full h-32 object-cover"
                      />
                    ) : (
                      <div className="w-full h-32 flex items-center justify-center bg-muted">
                        <ImageOff className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-2">
                      <div className="flex items-center gap-1 mb-1">
                        <Icon className="h-3 w-3" />
                        <span className="font-medium">{config.label}</span>
                      </div>
                      <div className="text-white/70">
                        {format(new Date(evidencia.created_at), "dd MMM yyyy HH:mm", { locale: es })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Full-screen image viewer */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <div className="relative">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-2 right-2 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            {selectedImage?.signedUrl && (
              <>
                <img
                  src={selectedImage.signedUrl}
                  alt={tipoConfig[selectedImage.tipo_evidencia].label}
                  className="w-full max-h-[80vh] object-contain bg-black"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-white p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {(() => {
                        const Icon = tipoConfig[selectedImage.tipo_evidencia].icon;
                        return <Icon className="h-4 w-4" />;
                      })()}
                      <span className="font-medium">
                        {tipoConfig[selectedImage.tipo_evidencia].label}
                      </span>
                    </div>
                    <div className="text-sm text-white/70">
                      {format(new Date(selectedImage.created_at), "dd MMMM yyyy 'a las' HH:mm", { locale: es })}
                    </div>
                    {selectedImage.notas && (
                      <div className="text-sm mt-1">{selectedImage.notas}</div>
                    )}
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleDownload(selectedImage)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Descargar
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Compact badge component to show evidence count
interface EvidenciasBadgeProps {
  ordenCompraId: string;
  onClick?: () => void;
}

export function EvidenciasBadge({ ordenCompraId, onClick }: EvidenciasBadgeProps) {
  const { data: count = 0 } = useQuery({
    queryKey: ["recepciones-evidencias-count", ordenCompraId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("recepciones_evidencias")
        .select("*", { count: "exact", head: true })
        .eq("orden_compra_id", ordenCompraId);

      if (error) throw error;
      return count || 0;
    },
  });

  if (count === 0) return null;

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
    >
      <Camera className="h-3 w-3" />
      <span>{count} {count === 1 ? "evidencia" : "evidencias"}</span>
    </button>
  );
}
