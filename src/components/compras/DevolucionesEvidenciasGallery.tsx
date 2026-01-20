import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Camera, Package, Download, X, ImageOff } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface DevolucionesEvidenciasGalleryProps {
  devolucionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Evidencia {
  id: string;
  tipo_evidencia: string;
  ruta_storage: string;
  nombre_archivo: string | null;
  created_at: string;
  signedUrl?: string;
}

export function DevolucionesEvidenciasGallery({ devolucionId, open, onOpenChange }: DevolucionesEvidenciasGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<Evidencia | null>(null);

  const { data: evidencias = [], isLoading } = useQuery({
    queryKey: ["devoluciones-evidencias", devolucionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("devoluciones_proveedor_evidencias")
        .select("*")
        .eq("devolucion_id", devolucionId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Generate signed URLs for each evidence
      const evidenciasWithUrls = await Promise.all(
        (data || []).map(async (evidencia) => {
          const { data: signedUrlData } = await supabase.storage
            .from("devoluciones-evidencias")
            .createSignedUrl(evidencia.ruta_storage, 3600); // 1 hour expiry

          return {
            ...evidencia,
            signedUrl: signedUrlData?.signedUrl,
          };
        })
      );

      return evidenciasWithUrls as Evidencia[];
    },
    enabled: open && !!devolucionId,
  });

  const handleDownload = async (evidencia: Evidencia) => {
    if (!evidencia.signedUrl) return;
    
    try {
      const response = await fetch(evidencia.signedUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = evidencia.nombre_archivo || `evidencia-${evidencia.id}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading file:", error);
    }
  };

  const getTipoLabel = (tipo: string) => {
    const tipos: Record<string, string> = {
      producto_danado: "Producto dañado",
      caja_vacia: "Caja vacía",
      caducidad: "Caducidad",
      otro: "Otro",
    };
    return tipos[tipo] || tipo;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Evidencias de Devolución
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
              <p>No hay evidencias registradas para esta devolución</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {evidencias.map((evidencia) => (
                <div
                  key={evidencia.id}
                  className="relative group rounded-lg overflow-hidden border bg-muted/30 cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                  onClick={() => setSelectedImage(evidencia)}
                >
                  {evidencia.signedUrl ? (
                    <img
                      src={evidencia.signedUrl}
                      alt={getTipoLabel(evidencia.tipo_evidencia)}
                      className="w-full h-32 object-cover"
                    />
                  ) : (
                    <div className="w-full h-32 flex items-center justify-center bg-muted">
                      <ImageOff className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-2">
                    <div className="flex items-center gap-1 mb-1">
                      <Package className="h-3 w-3" />
                      <span className="font-medium">{getTipoLabel(evidencia.tipo_evidencia)}</span>
                    </div>
                    <div className="text-white/70">
                      {format(new Date(evidencia.created_at), "dd MMM yyyy HH:mm", { locale: es })}
                    </div>
                  </div>
                </div>
              ))}
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
                  alt={getTipoLabel(selectedImage.tipo_evidencia)}
                  className="w-full max-h-[80vh] object-contain bg-black"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-white p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Package className="h-4 w-4" />
                      <span className="font-medium">
                        {getTipoLabel(selectedImage.tipo_evidencia)}
                      </span>
                    </div>
                    <div className="text-sm text-white/70">
                      {format(new Date(selectedImage.created_at), "dd MMMM yyyy 'a las' HH:mm", { locale: es })}
                    </div>
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
