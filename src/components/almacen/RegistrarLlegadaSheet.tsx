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
} from "lucide-react";
import { EvidenciaCapture, TipoEvidencia } from "@/components/compras/EvidenciaCapture";

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

// Tipos de evidencias obligatorias para llegada
const EVIDENCIAS_OBLIGATORIAS: { tipo: TipoEvidencia; label: string; icon: typeof Hash }[] = [
  { tipo: "sello", label: "Sello del camión", icon: Hash },
  { tipo: "placas", label: "Placas/Camión", icon: Car },
];

const EVIDENCIA_OPCIONAL: { tipo: TipoEvidencia; label: string; icon: typeof User } = { tipo: "identificacion", label: "Identificación del chofer", icon: User };

export const RegistrarLlegadaSheet = ({
  entrega,
  open,
  onOpenChange,
  onLlegadaRegistrada
}: RegistrarLlegadaSheetProps) => {
  const [saving, setSaving] = useState(false);
  const [nombreChofer, setNombreChofer] = useState("");
  const [placasVehiculo, setPlacasVehiculo] = useState("");
  const [numeroSello, setNumeroSello] = useState("");
  const [evidencias, setEvidencias] = useState<EvidenciaLlegada[]>([]);
  
  const { toast } = useToast();

  const handleEvidenciaCapture = (tipo: TipoEvidencia, file: File, preview: string) => {
    // Reemplazar si ya existe una de este tipo
    setEvidencias(prev => {
      const filtered = prev.filter(e => e.tipo !== tipo);
      return [...filtered, { tipo, file, preview }];
    });
  };

  const handleRemoveEvidencia = (tipo: TipoEvidencia) => {
    setEvidencias(prev => {
      const ev = prev.find(e => e.tipo === tipo);
      if (ev) URL.revokeObjectURL(ev.preview);
      return prev.filter(e => e.tipo !== tipo);
    });
  };

  const getEvidenciaPorTipo = (tipo: TipoEvidencia) => {
    return evidencias.find(e => e.tipo === tipo);
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

    // Verificar evidencias obligatorias
    for (const ev of EVIDENCIAS_OBLIGATORIAS) {
      if (!getEvidenciaPorTipo(ev.tipo)) {
        toast({
          title: "Foto requerida",
          description: `Captura la foto: ${ev.label}`,
          variant: "destructive"
        });
        return false;
      }
    }

    return true;
  };

  const handleConfirmarLlegada = async () => {
    if (!validarFormulario()) return;

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      // 1. Actualizar entrega con datos de llegada y asignar trabajando_por
      const { error: updateError } = await supabase
        .from("ordenes_compra_entregas")
        .update({
          status: "en_descarga",
          llegada_registrada_en: new Date().toISOString(),
          llegada_registrada_por: user.id,
          nombre_chofer_proveedor: nombreChofer.trim(),
          placas_vehiculo: placasVehiculo.trim() || null,
          numero_sello_llegada: numeroSello.trim() || null,
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
        notas: `Registró llegada del camión con chofer: ${nombreChofer.trim()}`
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

      toast({
        title: "Llegada registrada",
        description: "Puedes proceder con la descarga. Cuando termines, completa la recepción."
      });

      // Limpiar estado
      setNombreChofer("");
      setPlacasVehiculo("");
      setNumeroSello("");
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
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
                    Luego podrás completar la recepción con las cantidades.
                  </p>
                </div>
              </div>
            </div>

            {/* Datos del transporte */}
            <div className="space-y-4">
              <h3 className="font-medium">Datos del transporte</h3>
              
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

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Car className="w-4 h-4" />
                  Placas del vehículo
                </Label>
                <Input
                  value={placasVehiculo}
                  onChange={(e) => setPlacasVehiculo(e.target.value.toUpperCase())}
                  placeholder="ABC-123"
                  className="uppercase"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  Número de sello
                </Label>
                <Input
                  value={numeroSello}
                  onChange={(e) => setNumeroSello(e.target.value)}
                  placeholder="Número del sello de seguridad"
                />
              </div>
            </div>

            {/* Evidencias fotográficas */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <Camera className="w-4 h-4" />
                Evidencias fotográficas
              </h3>
              
              {/* Obligatorias */}
              <div className="space-y-3">
                {EVIDENCIAS_OBLIGATORIAS.map((ev) => {
                  const capturada = getEvidenciaPorTipo(ev.tipo);
                  const Icon = ev.icon;
                  
                  return (
                    <div key={ev.tipo} className={cn(
                      "flex items-center justify-between p-3 border rounded-lg",
                      capturada ? "border-green-500 bg-green-50 dark:bg-green-950/20" : "border-destructive bg-destructive/5"
                    )}>
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        <span className="font-medium">{ev.label} *</span>
                        {capturada && (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        )}
                      </div>
                      
                      {capturada ? (
                        <div className="flex items-center gap-2">
                          <img 
                            src={capturada.preview} 
                            alt={ev.label}
                            className="h-10 w-14 object-cover rounded border"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleRemoveEvidencia(ev.tipo)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <EvidenciaCapture
                          tipo={ev.tipo}
                          onCapture={(file, preview) => handleEvidenciaCapture(ev.tipo, file, preview)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Opcional */}
              <div className="space-y-3">
                {(() => {
                  const ev = EVIDENCIA_OPCIONAL;
                  const capturada = getEvidenciaPorTipo(ev.tipo);
                  const Icon = ev.icon;
                  
                  return (
                    <div className={cn(
                      "flex items-center justify-between p-3 border rounded-lg",
                      capturada ? "border-green-500 bg-green-50 dark:bg-green-950/20" : "border-border"
                    )}>
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        <span className="font-medium">{ev.label}</span>
                        <Badge variant="outline" className="text-xs">Opcional</Badge>
                        {capturada && (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        )}
                      </div>
                      
                      {capturada ? (
                        <div className="flex items-center gap-2">
                          <img 
                            src={capturada.preview} 
                            alt={ev.label}
                            className="h-10 w-14 object-cover rounded border"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleRemoveEvidencia(ev.tipo)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <EvidenciaCapture
                          tipo={ev.tipo}
                          onCapture={(file, preview) => handleEvidenciaCapture(ev.tipo, file, preview)}
                        />
                      )}
                    </div>
                  );
                })()}
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
            disabled={saving}
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
  );
};
