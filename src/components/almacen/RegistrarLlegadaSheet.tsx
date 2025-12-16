import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Truck,
  Camera,
  CheckCircle2,
  User,
  Hash,
  Car,
  Package,
  AlertTriangle,
  X,
  Loader2,
  PenLine,
  ShieldX,
} from "lucide-react";
import { EvidenciaCapture, TipoEvidencia } from "@/components/compras/EvidenciaCapture";
import { FirmaDigitalDialog } from "./FirmaDigitalDialog";

interface EntregaCompra {
  id: string;
  numero_entrega: number;
  cantidad_bultos: number;
  fecha_programada: string | null;
  status: string;
  orden_compra: {
    id: string;
    folio: string;
    proveedor_id: string | null;
    proveedor_nombre_manual: string | null;
    proveedor: {
      id: string;
      nombre: string;
    } | null;
  };
}

interface EvidenciaLlegada {
  tipo: TipoEvidencia;
  file: File;
  preview: string;
}

interface RegistrarLlegadaSheetProps {
  entrega: EntregaCompra;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLlegadaRegistrada: () => void;
}

export const RegistrarLlegadaSheet = ({
  entrega,
  open,
  onOpenChange,
  onLlegadaRegistrada
}: RegistrarLlegadaSheetProps) => {
  const [saving, setSaving] = useState(false);
  const [nombreChofer, setNombreChofer] = useState("");
  
  // Evidencias
  const [evidencias, setEvidencias] = useState<EvidenciaLlegada[]>([]);
  
  // AI placas detection
  const [placasDetectadas, setPlacasDetectadas] = useState<string | null>(null);
  const [placasManual, setPlacasManual] = useState("");
  const [detectandoPlacas, setDetectandoPlacas] = useState(false);
  const [deteccionFallida, setDeteccionFallida] = useState(false);
  
  // Sin sellos + firma
  const [sinSellos, setSinSellos] = useState(false);
  const [firmaChoferSinSellos, setFirmaChoferSinSellos] = useState<string | null>(null);
  const [showFirmaDialog, setShowFirmaDialog] = useState(false);
  
  const { toast } = useToast();

  const handleEvidenciaCapture = async (tipo: TipoEvidencia, file: File, preview: string) => {
    // Reemplazar si ya existe una de este tipo
    setEvidencias(prev => {
      const filtered = prev.filter(e => e.tipo !== tipo);
      return [...filtered, { tipo, file, preview }];
    });
    
    // Si es foto de placas, intentar detectar con AI
    if (tipo === "placas") {
      await detectarPlacasConAI(file);
    }
  };

  const detectarPlacasConAI = async (file: File) => {
    setDetectandoPlacas(true);
    setDeteccionFallida(false);
    setPlacasDetectadas(null);
    
    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      
      const { data, error } = await supabase.functions.invoke('extract-placas-vehiculo', {
        body: { imageBase64: base64 }
      });
      
      if (error) throw error;
      
      if (data?.placas) {
        setPlacasDetectadas(data.placas);
        setPlacasManual(data.placas);
        toast({
          title: "Placas detectadas",
          description: `Se detectó: ${data.placas}`,
        });
      } else {
        setDeteccionFallida(true);
        toast({
          title: "Detección manual requerida",
          description: data?.message || "No se pudieron detectar las placas automáticamente",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error detectando placas:", error);
      setDeteccionFallida(true);
      toast({
        title: "Error en detección",
        description: "Ingresa las placas manualmente",
        variant: "destructive"
      });
    } finally {
      setDetectandoPlacas(false);
    }
  };

  const handleRemoveEvidencia = (tipo: TipoEvidencia) => {
    setEvidencias(prev => {
      const ev = prev.find(e => e.tipo === tipo);
      if (ev) URL.revokeObjectURL(ev.preview);
      return prev.filter(e => e.tipo !== tipo);
    });
    
    // Reset placas detection if removing placas photo
    if (tipo === "placas") {
      setPlacasDetectadas(null);
      setPlacasManual("");
      setDeteccionFallida(false);
    }
  };

  const getEvidenciaPorTipo = (tipo: TipoEvidencia) => {
    return evidencias.find(e => e.tipo === tipo);
  };

  // Handle checkbox change for "sin sellos"
  const handleSinSellosChange = (checked: boolean) => {
    setSinSellos(checked);
    if (!checked) {
      setFirmaChoferSinSellos(null);
    }
  };

  // Handle firma for "sin sellos"
  const handleFirmaSinSellosConfirmada = (firma: string) => {
    setFirmaChoferSinSellos(firma);
    setShowFirmaDialog(false);
  };

  const validarFormulario = (): boolean => {
    if (!nombreChofer.trim()) {
      toast({
        title: "Datos incompletos",
        description: "Ingresa el nombre del chofer del proveedor",
        variant: "destructive"
      });
      return false;
    }

    // Verificar foto de placas
    if (!getEvidenciaPorTipo("placas")) {
      toast({
        title: "Foto requerida",
        description: "Captura la foto de las placas/camión",
        variant: "destructive"
      });
      return false;
    }

    // Verificar que tenemos placas (detectadas o manuales)
    if (!placasManual.trim()) {
      toast({
        title: "Placas requeridas",
        description: "Ingresa el número de placas del vehículo",
        variant: "destructive"
      });
      return false;
    }

    // Verificar foto de identificación
    if (!getEvidenciaPorTipo("identificacion")) {
      toast({
        title: "Foto requerida",
        description: "Captura la foto de identificación del chofer",
        variant: "destructive"
      });
      return false;
    }

    // Verificar: foto de sello puerta 1 (obligatorio) O (checkbox sin sellos + firma)
    const tieneSelloPuerta1 = getEvidenciaPorTipo("sello_1");
    if (!tieneSelloPuerta1 && !sinSellos) {
      toast({
        title: "Sello Puerta 1 requerido",
        description: "Captura foto del sello de la puerta 1 o marca 'Sin sellos' si el camión no trae",
        variant: "destructive"
      });
      return false;
    }

    if (sinSellos && !firmaChoferSinSellos) {
      toast({
        title: "Firma requerida",
        description: "El chofer debe firmar confirmando que no trae sellos",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleConfirmarLlegada = async () => {
    if (!validarFormulario()) return;

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      // 1. Actualizar entrega con datos de llegada
      const { error: updateError } = await supabase
        .from("ordenes_compra_entregas")
        .update({
          status: "en_descarga",
          llegada_registrada_en: new Date().toISOString(),
          llegada_registrada_por: user.id,
          nombre_chofer_proveedor: nombreChofer.trim(),
          placas_vehiculo: placasManual.trim(),
          numero_sello_llegada: sinSellos 
            ? "SIN SELLOS - FIRMADO" 
            : getEvidenciaPorTipo("sello_2") 
              ? "2 SELLOS REGISTRADOS"
              : "1 SELLO REGISTRADO",
          trabajando_por: user.id,
          trabajando_desde: new Date().toISOString(),
        })
        .eq("id", entrega.id);

      if (updateError) throw updateError;

      // 2. Registrar participación en historial
      await supabase.from("recepciones_participantes").insert({
        entrega_id: entrega.id,
        user_id: user.id,
        accion: "inicio_llegada",
        notas: `Registró llegada. Chofer: ${nombreChofer.trim()}, Placas: ${placasManual.trim()}${sinSellos ? ", Sin sellos (firmado)" : ""}`
      });

      // 3. Subir y registrar evidencias de llegada
      for (const evidencia of evidencias) {
        const fileName = `llegada/${entrega.orden_compra.id}/${entrega.id}/${Date.now()}-${evidencia.tipo}.jpg`;
        
        const { error: uploadError } = await supabase.storage
          .from("recepciones-evidencias")
          .upload(fileName, evidencia.file);

        if (uploadError) {
          console.error("Error subiendo evidencia:", uploadError);
          continue;
        }

        await supabase
          .from("ordenes_compra_entregas_evidencias")
          .insert({
            entrega_id: entrega.id,
            tipo_evidencia: evidencia.tipo,
            fase: "llegada",
            ruta_storage: fileName,
            nombre_archivo: evidencia.file.name,
            capturado_por: user.id
          });
      }

      // 4. Si hay firma "sin sellos", guardarla como evidencia
      if (sinSellos && firmaChoferSinSellos) {
        const firmaBlob = await fetch(firmaChoferSinSellos).then(r => r.blob());
        const firmaFile = new File([firmaBlob], "firma-sin-sellos.png", { type: "image/png" });
        const firmaFileName = `llegada/${entrega.orden_compra.id}/${entrega.id}/${Date.now()}-firma-sin-sellos.png`;
        
        const { error: firmaUploadError } = await supabase.storage
          .from("recepciones-evidencias")
          .upload(firmaFileName, firmaFile);

        if (!firmaUploadError) {
          await supabase
            .from("ordenes_compra_entregas_evidencias")
            .insert({
              entrega_id: entrega.id,
              tipo_evidencia: "firma_sin_sellos",
              fase: "llegada",
              ruta_storage: firmaFileName,
              nombre_archivo: "firma-sin-sellos.png",
              capturado_por: user.id
            });
        }
      }

      toast({
        title: "Llegada registrada",
        description: "Puedes proceder con la descarga. Cuando termines, completa la recepción."
      });

      // Limpiar estado
      setNombreChofer("");
      setPlacasDetectadas(null);
      setPlacasManual("");
      setDeteccionFallida(false);
      setSinSellos(false);
      setFirmaChoferSinSellos(null);
      setEvidencias([]);
      
      onLlegadaRegistrada();
    } catch (error) {
      console.error("Error registrando llegada:", error);
      toast({
        title: "Error",
        description: "No se pudo registrar la llegada",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const proveedorNombre = entrega.orden_compra?.proveedor?.nombre || 
                          entrega.orden_compra?.proveedor_nombre_manual || 
                          "Proveedor";

  const fotoPlacas = getEvidenciaPorTipo("placas");
  const fotoIdentificacion = getEvidenciaPorTipo("identificacion");
  const fotoSelloPuerta1 = getEvidenciaPorTipo("sello_1");
  const fotoSelloPuerta2 = getEvidenciaPorTipo("sello_2");

  return (
    <>
      <Sheet open={open && !showFirmaDialog} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-primary" />
              Registrar Llegada
            </SheetTitle>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{entrega.orden_compra?.folio}</Badge>
              <span>•</span>
              <span>{proveedorNombre}</span>
              <Badge variant="secondary">{entrega.cantidad_bultos.toLocaleString()} bultos</Badge>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1 mt-4 pr-4">
            <div className="space-y-6">
              {/* Info */}
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-start gap-2 text-blue-700 dark:text-blue-400">
                  <Package className="w-5 h-5 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium">Fase 1: Registro de llegada</p>
                    <p className="text-blue-600 dark:text-blue-300">
                      Captura los datos del transporte antes de iniciar la descarga.
                    </p>
                  </div>
                </div>
              </div>

              {/* Nombre del chofer */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Nombre del chofer *
                </Label>
                <Input
                  value={nombreChofer}
                  onChange={(e) => setNombreChofer(e.target.value)}
                  placeholder="Nombre del chofer del proveedor"
                />
              </div>

              {/* Foto de placas con detección AI */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Car className="w-4 h-4" />
                  Foto de placas/camión *
                </Label>
                
                <div className={cn(
                  "p-3 border rounded-lg",
                  fotoPlacas ? "border-green-500 bg-green-50 dark:bg-green-950/20" : "border-destructive bg-destructive/5"
                )}>
                  {fotoPlacas ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <img 
                            src={fotoPlacas.preview} 
                            alt="Placas"
                            className="h-12 w-16 object-cover rounded border"
                          />
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleRemoveEvidencia("placas")}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {/* Placas detection status */}
                      {detectandoPlacas && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Detectando placas con AI...
                        </div>
                      )}
                      
                      {placasDetectadas && !detectandoPlacas && (
                        <div className="flex items-center gap-2 text-sm text-green-600">
                          <CheckCircle2 className="h-4 w-4" />
                          AI detectó: {placasDetectadas}
                        </div>
                      )}
                      
                      {/* Input para placas (siempre visible, pre-llenado si AI detectó) */}
                      <div className="space-y-1">
                        <Label className="text-xs">Número de placas *</Label>
                        <Input
                          value={placasManual}
                          onChange={(e) => setPlacasManual(e.target.value.toUpperCase())}
                          placeholder="ABC-123"
                          className="uppercase"
                        />
                        {deteccionFallida && (
                          <p className="text-xs text-amber-600">
                            AI no pudo detectar, ingresa manualmente
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Foto de placas *</span>
                      <EvidenciaCapture
                        tipo="placas"
                        onCapture={(file, preview) => handleEvidenciaCapture("placas", file, preview)}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Foto de identificación */}
              <div className={cn(
                "flex items-center justify-between p-3 border rounded-lg",
                fotoIdentificacion ? "border-green-500 bg-green-50 dark:bg-green-950/20" : "border-destructive bg-destructive/5"
              )}>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span className="font-medium">Identificación del chofer *</span>
                  {fotoIdentificacion && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                </div>
                
                {fotoIdentificacion ? (
                  <div className="flex items-center gap-2">
                    <img 
                      src={fotoIdentificacion.preview} 
                      alt="Identificación"
                      className="h-10 w-14 object-cover rounded border"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleRemoveEvidencia("identificacion")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <EvidenciaCapture
                    tipo="identificacion"
                    onCapture={(file, preview) => handleEvidenciaCapture("identificacion", file, preview)}
                  />
                )}
              </div>

              {/* Fotos de sellos (Puerta 1 obligatorio, Puerta 2 opcional) O checkbox sin sellos */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  Sellos de seguridad *
                </Label>
                
                {!sinSellos && (
                  <div className="space-y-2">
                    {/* Sello Puerta 1 - OBLIGATORIO */}
                    <div className={cn(
                      "flex items-center justify-between p-3 border rounded-lg",
                      fotoSelloPuerta1 ? "border-green-500 bg-green-50 dark:bg-green-950/20" : "border-destructive bg-destructive/5"
                    )}>
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4" />
                        <span className="font-medium">Sello Puerta 1 *</span>
                        {fotoSelloPuerta1 && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                      </div>
                      
                      {fotoSelloPuerta1 ? (
                        <div className="flex items-center gap-2">
                          <img 
                            src={fotoSelloPuerta1.preview} 
                            alt="Sello Puerta 1"
                            className="h-10 w-14 object-cover rounded border"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleRemoveEvidencia("sello_1")}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <EvidenciaCapture
                          tipo="sello_1"
                          onCapture={(file, preview) => handleEvidenciaCapture("sello_1", file, preview)}
                        />
                      )}
                    </div>

                    {/* Sello Puerta 2 - OPCIONAL */}
                    <div className={cn(
                      "flex items-center justify-between p-3 border rounded-lg",
                      fotoSelloPuerta2 ? "border-green-500 bg-green-50 dark:bg-green-950/20" : "border-border"
                    )}>
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4" />
                        <span className="font-medium">Sello Puerta 2</span>
                        <span className="text-xs text-muted-foreground">(opcional)</span>
                        {fotoSelloPuerta2 && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                      </div>
                      
                      {fotoSelloPuerta2 ? (
                        <div className="flex items-center gap-2">
                          <img 
                            src={fotoSelloPuerta2.preview} 
                            alt="Sello Puerta 2"
                            className="h-10 w-14 object-cover rounded border"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleRemoveEvidencia("sello_2")}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <EvidenciaCapture
                          tipo="sello_2"
                          onCapture={(file, preview) => handleEvidenciaCapture("sello_2", file, preview)}
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Opción sin sellos */}
                <div className={cn(
                  "p-3 border rounded-lg",
                  sinSellos ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20" : "border-border"
                )}>
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="sin-sellos"
                      checked={sinSellos}
                      onCheckedChange={(checked) => handleSinSellosChange(!!checked)}
                      disabled={!!fotoSelloPuerta1 || !!fotoSelloPuerta2}
                    />
                    <label 
                      htmlFor="sin-sellos"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                    >
                      <ShieldX className="w-4 h-4 text-amber-600" />
                      El camión NO trae sellos de seguridad
                    </label>
                  </div>
                  
                  {sinSellos && (
                    <div className="mt-3 space-y-3">
                      <div className="flex items-start gap-2 text-amber-700 dark:text-amber-400 text-sm">
                        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>Se requiere firma del chofer confirmando que entrega sin sellos</span>
                      </div>
                      
                      {firmaChoferSinSellos ? (
                        <div className="flex items-center gap-3 p-2 bg-green-100 dark:bg-green-900/30 rounded">
                          <img 
                            src={firmaChoferSinSellos} 
                            alt="Firma" 
                            className="h-12 border rounded bg-white"
                          />
                          <div className="flex items-center gap-1 text-green-700 dark:text-green-400 text-sm">
                            <CheckCircle2 className="w-4 h-4" />
                            Firmado
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setFirmaChoferSinSellos(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={() => setShowFirmaDialog(true)}
                          className="w-full"
                        >
                          <PenLine className="w-4 h-4 mr-2" />
                          Obtener firma del chofer
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Aviso */}
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="flex items-start gap-2 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium">Después de confirmar:</p>
                    <p className="text-amber-600 dark:text-amber-300">
                      La entrega pasará a estado "En descarga". Cuando termines de descargar, 
                      regresa para completar la recepción con las cantidades recibidas.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

          <SheetFooter className="mt-4 pt-4 border-t">
            <Button
              onClick={handleConfirmarLlegada}
              disabled={saving || detectandoPlacas}
              className="w-full"
              size="lg"
            >
              {saving ? (
                "Guardando..."
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Confirmar Llegada e Iniciar Descarga
                </>
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Diálogo de firma para "sin sellos" */}
      <FirmaDigitalDialog
        open={showFirmaDialog}
        onOpenChange={setShowFirmaDialog}
        onConfirm={handleFirmaSinSellosConfirmada}
        titulo={`Firma de ${nombreChofer || "chofer"} - Confirma que entrega SIN SELLOS de seguridad`}
      />
    </>
  );
};
