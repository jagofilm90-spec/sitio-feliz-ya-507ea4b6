import { useState } from 'react';
import { Camera, Package, FileText, Stamp, Loader2, X, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { compressImageForUpload } from '@/lib/imageUtils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface CargaEvidencia {
  id: string;
  tipo_evidencia: string;
  ruta_storage: string;
  nombre_archivo: string;
  created_at: string;
}

interface CargaEvidenciasSectionProps {
  rutaId: string;
  evidencias: CargaEvidencia[];
  onEvidenciaAdded: () => void;
  disabled?: boolean;
}

const TIPOS_EVIDENCIA = [
  { tipo: 'sello_salida', label: 'Sellos de Salida', icon: Stamp },
  { tipo: 'carga_vehiculo', label: 'Carga en Vehículo', icon: Package },
  { tipo: 'carta_porte', label: 'Carta Porte', icon: FileText },
];

export function CargaEvidenciasSection({
  rutaId,
  evidencias,
  onEvidenciaAdded,
  disabled = false,
}: CargaEvidenciasSectionProps) {
  const [uploading, setUploading] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('');

  const handleCapture = async (tipo: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setUploading(tipo);
      try {
        // Usar función centralizada de compresión con perfil 'evidence'
        const compressed = await compressImageForUpload(file, 'evidence');
        
        // Generate unique filename
        const timestamp = Date.now();
        const fileName = `${rutaId}/${tipo}_${timestamp}.jpg`;
        
        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('cargas-evidencias')
          .upload(fileName, compressed);

        if (uploadError) throw uploadError;

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();

        // Save record to database
        const { error: dbError } = await supabase
          .from('carga_evidencias')
          .insert({
            ruta_id: rutaId,
            tipo_evidencia: tipo,
            ruta_storage: fileName,
            nombre_archivo: file.name,
            capturado_por: user?.id,
          });

        if (dbError) throw dbError;

        toast.success('Evidencia guardada');
        onEvidenciaAdded();
      } catch (error) {
        console.error('Error uploading evidence:', error);
        toast.error('Error al guardar evidencia');
      } finally {
        setUploading(null);
      }
    };

    input.click();
  };

  const handleRemove = async (evidencia: CargaEvidencia) => {
    try {
      // Delete from storage
      await supabase.storage
        .from('cargas-evidencias')
        .remove([evidencia.ruta_storage]);

      // Delete from database
      const { error } = await supabase
        .from('carga_evidencias')
        .delete()
        .eq('id', evidencia.id);

      if (error) throw error;

      toast.success('Evidencia eliminada');
      onEvidenciaAdded();
    } catch (error) {
      console.error('Error removing evidence:', error);
      toast.error('Error al eliminar evidencia');
    }
  };

  const handlePreview = async (evidencia: CargaEvidencia) => {
    const { data } = await supabase.storage
      .from('cargas-evidencias')
      .createSignedUrl(evidencia.ruta_storage, 300);

    if (data?.signedUrl) {
      const tipoInfo = TIPOS_EVIDENCIA.find(t => t.tipo === evidencia.tipo_evidencia);
      setPreviewTitle(tipoInfo?.label || evidencia.tipo_evidencia);
      setPreviewUrl(data.signedUrl);
    }
  };

  const getEvidenciasPorTipo = (tipo: string) => {
    return evidencias.filter(e => e.tipo_evidencia === tipo);
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Evidencias de Carga
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Capture buttons */}
          <div className="grid grid-cols-3 gap-2">
            {TIPOS_EVIDENCIA.map(({ tipo, label, icon: Icon }) => (
              <Button
                key={tipo}
                variant="outline"
                className="flex flex-col h-auto py-3 gap-1"
                onClick={() => handleCapture(tipo)}
                disabled={disabled || uploading === tipo}
              >
                {uploading === tipo ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
                <span className="text-xs text-center">{label}</span>
                {getEvidenciasPorTipo(tipo).length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    ({getEvidenciasPorTipo(tipo).length})
                  </span>
                )}
              </Button>
            ))}
          </div>

          {/* Preview grid */}
          {evidencias.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {evidencias.map((evidencia) => {
                const tipoInfo = TIPOS_EVIDENCIA.find(t => t.tipo === evidencia.tipo_evidencia);
                return (
                  <div
                    key={evidencia.id}
                    className="relative aspect-square rounded-md border bg-muted overflow-hidden group"
                  >
                    <EvidenciaThumbnail
                      rutaStorage={evidencia.ruta_storage}
                      onClick={() => handlePreview(evidencia)}
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-background/80 px-1 py-0.5">
                      <div className="flex items-center justify-between">
                        {tipoInfo && <tipoInfo.icon className="h-3 w-3" />}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemove(evidencia);
                          }}
                          disabled={disabled}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handlePreview(evidencia)}
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {evidencias.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              Sin evidencias capturadas
            </p>
          )}
        </CardContent>
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
              alt="Evidencia"
              className="w-full h-auto rounded-md"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// Thumbnail component with lazy loading
function EvidenciaThumbnail({
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
      .from('cargas-evidencias')
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
      <div className="w-full h-full flex items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return url ? (
    <img
      src={url}
      alt="Evidencia"
      className="w-full h-full object-cover cursor-pointer"
      onClick={onClick}
    />
  ) : (
    <div className="w-full h-full flex items-center justify-center">
      <Camera className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}
