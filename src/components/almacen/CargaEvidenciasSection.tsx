import { useState } from 'react';
import { Camera, Package, FileText, Loader2, X, Eye, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

export function CargaEvidenciasSection({
  rutaId,
  evidencias,
  onEvidenciaAdded,
  disabled = false,
}: CargaEvidenciasSectionProps) {
  const [uploading, setUploading] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('');

  const cargaVehiculo = evidencias.find(e => e.tipo_evidencia === 'carga_vehiculo');
  const cartaPorte = evidencias.find(e => e.tipo_evidencia === 'carta_porte');

  const handleCapture = async (tipo: string, label: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setUploading(tipo);
      try {
        const compressed = await compressImageForUpload(file, 'evidence');
        const timestamp = Date.now();
        const fileName = `${rutaId}/${tipo}_${timestamp}.jpg`;
        
        const { error: uploadError } = await supabase.storage
          .from('cargas-evidencias')
          .upload(fileName, compressed);

        if (uploadError) throw uploadError;

        const { data: { user } } = await supabase.auth.getUser();

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

        toast.success(`Foto de ${label} guardada`);
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
      await supabase.storage
        .from('cargas-evidencias')
        .remove([evidencia.ruta_storage]);

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
      setPreviewTitle(
        evidencia.tipo_evidencia === 'carga_vehiculo' ? 'Carga en Vehículo' : 'Carta Porte'
      );
      setPreviewUrl(data.signedUrl);
    }
  };

  const renderEvidenciaSlot = (
    evidencia: CargaEvidencia | undefined,
    tipo: string,
    label: string,
    obligatorio: boolean
  ) => {
    if (evidencia) {
      return (
        <div className="relative aspect-video rounded-lg border overflow-hidden group">
          <EvidenciaThumbnail
            rutaStorage={evidencia.ruta_storage}
            onClick={() => handlePreview(evidencia)}
          />
          <div className="absolute top-2 right-2 flex gap-1">
            <Button
              variant="secondary"
              size="icon"
              className="h-7 w-7 bg-background/80"
              onClick={() => handlePreview(evidencia)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="destructive"
              size="icon"
              className="h-7 w-7"
              onClick={() => handleRemove(evidencia)}
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
      );
    }

    return (
      <Button
        variant="outline"
        className="w-full h-24 flex flex-col gap-1"
        onClick={() => handleCapture(tipo, label)}
        disabled={disabled || uploading === tipo}
      >
        {uploading === tipo ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : (
          <Camera className="h-6 w-6" />
        )}
        <span className="text-xs">Capturar</span>
      </Button>
    );
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
          <div className="grid grid-cols-2 gap-4">
            {/* Carga en Vehículo - Obligatoria */}
            <div className="space-y-2">
              <p className="text-sm font-medium flex items-center gap-1">
                <Package className="h-4 w-4" />
                Caja abierta <span className="text-destructive">*</span>
              </p>
              {renderEvidenciaSlot(cargaVehiculo, 'carga_vehiculo', 'Carga en Vehículo', true)}
            </div>

            {/* Carta Porte - Opcional */}
            <div className="space-y-2">
              <p className="text-sm font-medium flex items-center gap-1 text-muted-foreground">
                <FileText className="h-4 w-4" />
                Carta Porte
              </p>
              {renderEvidenciaSlot(cartaPorte, 'carta_porte', 'Carta Porte', false)}
            </div>
          </div>

          {!cargaVehiculo && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <Camera className="h-4 w-4" />
              Foto de caja abierta obligatoria para continuar
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
      <div className="w-full h-full flex items-center justify-center bg-muted">
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
    <div className="w-full h-full flex items-center justify-center bg-muted">
      <Camera className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}
