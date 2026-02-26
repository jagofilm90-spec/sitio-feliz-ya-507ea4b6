import { useState } from 'react';
import { Camera, Package, FileText, Loader2, X, Eye, Check } from 'lucide-react';
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
        <div
          className="flex items-center justify-between border rounded-lg px-3 py-2 bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
          onClick={() => handlePreview(evidencia)}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Check className="h-4 w-4 text-green-600 shrink-0" />
            <span className="text-sm truncate">{label}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => { e.stopPropagation(); handlePreview(evidencia); }}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive"
              onClick={(e) => { e.stopPropagation(); handleRemove(evidencia); }}
              disabled={disabled}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      );
    }

    return (
      <Button
        variant="outline"
        className="w-full h-12 gap-2"
        onClick={() => handleCapture(tipo, label)}
        disabled={disabled || uploading === tipo}
      >
        {uploading === tipo ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Camera className="h-4 w-4" />
        )}
        <span className="text-sm">Capturar {label}</span>
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
          <div className="space-y-2">
            {/* Carga en Vehículo - Obligatoria */}
            <div className="space-y-1">
              <p className="text-sm font-medium flex items-center gap-1">
                <Package className="h-4 w-4" />
                Caja abierta <span className="text-destructive">*</span>
              </p>
              {renderEvidenciaSlot(cargaVehiculo, 'carga_vehiculo', 'Foto caja abierta', true)}
            </div>

            {/* Carta Porte - Opcional */}
            <div className="space-y-1">
              <p className="text-sm font-medium flex items-center gap-1 text-muted-foreground">
                <FileText className="h-4 w-4" />
                Carta Porte <span className="text-xs">(opcional)</span>
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

