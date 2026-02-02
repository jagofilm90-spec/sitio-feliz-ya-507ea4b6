import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, FileStack, AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import DocumentDetectionCard from "./DocumentDetectionCard";

interface DatosExtraidos {
  [key: string]: string | null | undefined;
}

interface DocumentoDetectado {
  tipo: string;
  nombre_documento: string;
  paginas: string;
  confianza: "alta" | "media" | "baja";
  datos_extraidos: DatosExtraidos;
  tipo_info?: {
    id: string;
    name: string;
    fields: string[];
  };
}

interface ExpedienteAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empleadoId: string;
  empleadoNombre: string;
  pdfBase64: string;
  fileName: string;
  onSuccess: () => void;
}

// Mapeo de campos extraídos a campos de la tabla empleados
const FIELD_TO_DB_MAPPING: Record<string, string> = {
  rfc: "rfc",
  curp: "curp",
  numero_seguro_social: "numero_seguro_social",
  fecha_nacimiento: "fecha_nacimiento",
  nombre_completo: "nombre",
  sexo: "sexo",
  lugar_nacimiento: "lugar_nacimiento",
  calle: "calle",
  numero_exterior: "numero_exterior",
  numero_interior: "numero_interior",
  colonia: "colonia",
  codigo_postal: "codigo_postal",
  municipio: "municipio",
  estado: "estado",
  direccion: "direccion",
};

// Mapeo de tipos de documento a tipos en la BD
const DOC_TYPE_MAPPING: Record<string, string> = {
  constancia_situacion_fiscal: "constancia_situacion_fiscal",
  carta_seguro_social: "carta_seguro_social",
  ine: "ine",
  curp: "curp",
  comprobante_domicilio: "comprobante_domicilio",
  licencia_conducir: "licencia_conducir",
  acta_nacimiento: "acta_nacimiento",
  contrato_laboral: "contrato_laboral",
  aviso_privacidad: "aviso_privacidad",
  otro: "otro",
};

export default function ExpedienteAnalysisDialog({
  open,
  onOpenChange,
  empleadoId,
  empleadoNombre,
  pdfBase64,
  fileName,
  onSuccess,
}: ExpedienteAnalysisDialogProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documentos, setDocumentos] = useState<DocumentoDetectado[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<Set<number>>(new Set());
  const [selectedFields, setSelectedFields] = useState<Record<number, string[]>>({});
  const [notas, setNotas] = useState<string | null>(null);
  const { toast } = useToast();

  // Analizar el documento cuando se abre el dialog
  useEffect(() => {
    if (open && pdfBase64) {
      analyzeDocument();
    }
  }, [open, pdfBase64]);

  const analyzeDocument = async () => {
    setIsAnalyzing(true);
    setError(null);
    setDocumentos([]);
    setSelectedDocs(new Set());
    setSelectedFields({});

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "analyze-employee-file-bundle",
        {
          body: {
            pdfBase64,
            empleadoNombre,
          },
        }
      );

      if (fnError) {
        throw new Error(fnError.message || "Error al analizar el expediente");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.documentos_detectados && data.documentos_detectados.length > 0) {
        setDocumentos(data.documentos_detectados);
        setNotas(data.notas);

        // Seleccionar todos los documentos por defecto
        const allDocsIndices = data.documentos_detectados.map((_: any, i: number) => i) as number[];
        setSelectedDocs(new Set<number>(allDocsIndices));

        // Seleccionar todos los campos extraídos por defecto
        const allFields: Record<number, string[]> = {};
        data.documentos_detectados.forEach((doc: DocumentoDetectado, i: number) => {
          const campos = Object.entries(doc.datos_extraidos || {})
            .filter(([_, v]) => v !== null && v !== undefined && v !== "")
            .map(([k]) => k);
          allFields[i] = campos;
        });
        setSelectedFields(allFields);
      } else {
        setError("No se detectaron documentos reconocibles en el archivo.");
      }
    } catch (err) {
      console.error("Error analizando expediente:", err);
      setError(err instanceof Error ? err.message : "Error al analizar el expediente");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleDocSelection = (index: number) => {
    setSelectedDocs((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const toggleFieldSelection = (docIndex: number, field: string) => {
    setSelectedFields((prev) => {
      const currentFields = prev[docIndex] || [];
      const next = currentFields.includes(field)
        ? currentFields.filter((f) => f !== field)
        : [...currentFields, field];
      return { ...prev, [docIndex]: next };
    });
  };

  const handleProcess = async () => {
    if (selectedDocs.size === 0) {
      toast({
        title: "Sin documentos seleccionados",
        description: "Selecciona al menos un documento para procesar",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Subir el archivo original a storage
      const fileExt = fileName.split(".").pop() || "pdf";
      const filePath = `${empleadoId}/expediente-${Date.now()}.${fileExt}`;
      
      // Convertir base64 a blob
      const byteCharacters = atob(pdfBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/pdf" });

      const { error: uploadError } = await supabase.storage
        .from("empleados-documentos")
        .upload(filePath, blob);

      if (uploadError) {
        throw new Error(`Error subiendo archivo: ${uploadError.message}`);
      }

      // 2. Crear registros de documentos para cada documento seleccionado
      const docsToCreate = Array.from(selectedDocs).map((index) => {
        const doc = documentos[index];
        return {
          empleado_id: empleadoId,
          tipo_documento: DOC_TYPE_MAPPING[doc.tipo] || "otro",
          nombre_archivo: `${doc.nombre_documento || doc.tipo} (págs. ${doc.paginas})`,
          ruta_storage: filePath,
        };
      });

      const { error: docsError } = await supabase
        .from("empleados_documentos")
        .insert(docsToCreate);

      if (docsError) {
        console.error("Error creando registros de documentos:", docsError);
        // No lanzamos error, continuamos con la actualización del empleado
      }

      // 3. Recopilar todos los campos seleccionados para actualizar el empleado
      const empleadoUpdates: Record<string, any> = {};

      Array.from(selectedDocs).forEach((docIndex) => {
        const doc = documentos[docIndex];
        const fieldsToUpdate = selectedFields[docIndex] || [];

        fieldsToUpdate.forEach((field) => {
          const dbField = FIELD_TO_DB_MAPPING[field];
          const value = doc.datos_extraidos[field];

          if (dbField && value) {
            // Si es fecha, intentar formatear
            if (field === "fecha_nacimiento" && value) {
              // Intentar parsear la fecha
              const dateValue = new Date(value);
              if (!isNaN(dateValue.getTime())) {
                empleadoUpdates[dbField] = dateValue.toISOString().split("T")[0];
              } else {
                empleadoUpdates[dbField] = value;
              }
            } else {
              empleadoUpdates[dbField] = value;
            }
          }
        });
      });

      // 4. Actualizar empleado si hay campos
      if (Object.keys(empleadoUpdates).length > 0) {
        const { error: updateError } = await supabase
          .from("empleados")
          .update(empleadoUpdates)
          .eq("id", empleadoId);

        if (updateError) {
          console.error("Error actualizando empleado:", updateError);
          toast({
            title: "Advertencia",
            description: "Se guardaron los documentos pero hubo un error actualizando algunos datos del empleado",
            variant: "destructive",
          });
        }
      }

      toast({
        title: "¡Expediente procesado!",
        description: `Se guardaron ${selectedDocs.size} documento(s) y se actualizaron los datos del empleado.`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error("Error procesando expediente:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Error procesando expediente",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileStack className="h-5 w-5" />
            Análisis de Expediente: {empleadoNombre}
          </DialogTitle>
          <DialogDescription>
            {isAnalyzing
              ? "Analizando el documento para detectar los diferentes archivos..."
              : documentos.length > 0
              ? `Se detectaron ${documentos.length} documento(s). Selecciona cuáles guardar y qué datos aplicar.`
              : "Sube un PDF con múltiples documentos escaneados."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-4">
          {isAnalyzing ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Analizando documentos con IA...
              </p>
              <p className="text-xs text-muted-foreground">
                Esto puede tomar unos segundos
              </p>
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : documentos.length > 0 ? (
            <div className="space-y-4">
              {notas && (
                <Alert>
                  <AlertDescription className="text-sm">{notas}</AlertDescription>
                </Alert>
              )}
              {documentos.map((doc, index) => (
                <DocumentDetectionCard
                  key={`${doc.tipo}-${doc.paginas}-${index}`}
                  documento={doc}
                  isSelected={selectedDocs.has(index)}
                  onToggleSelect={() => toggleDocSelection(index)}
                  selectedFields={selectedFields[index] || []}
                  onToggleField={(field) => toggleFieldSelection(index, field)}
                />
              ))}
            </div>
          ) : null}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
            Cancelar
          </Button>
          {documentos.length > 0 && !isAnalyzing && (
            <Button onClick={handleProcess} disabled={isProcessing || selectedDocs.size === 0}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Procesar {selectedDocs.size} Documento(s)
                </>
              )}
            </Button>
          )}
          {error && (
            <Button onClick={analyzeDocument} disabled={isAnalyzing}>
              Reintentar Análisis
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
