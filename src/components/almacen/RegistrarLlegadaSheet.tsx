import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { registrarCorreoEnviado } from "@/components/compras/HistorialCorreosOC";
import { getEmailsInternos, enviarCopiaInterna } from "@/lib/emailNotificationsUtils";
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
  Ban,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EvidenciaCapture, EvidenciasPreviewGrid, TipoEvidencia } from "@/components/compras/EvidenciaCapture";
import { FirmaDigitalDialog } from "./FirmaDigitalDialog";

// Motivos para rechazo total de la entrega en Fase 1
const MOTIVOS_RECHAZO_TOTAL = [
  { value: "mal_estado", label: "Todo el producto viene en mal estado" },
  { value: "producto_incorrecto", label: "Llegó producto diferente al ordenado" },
];

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
  
  // Placas del vehículo (ingreso manual)
  const [placas, setPlacas] = useState("");
  
  // Sin sellos + firma
  const [sinSellos, setSinSellos] = useState(false);
  const [firmaChoferSinSellos, setFirmaChoferSinSellos] = useState<string | null>(null);
  const [showFirmaDialog, setShowFirmaDialog] = useState(false);
  
  // Rechazo total
  const [rechazoTotal, setRechazoTotal] = useState(false);
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [fotosRechazo, setFotosRechazo] = useState<EvidenciaLlegada[]>([]);
  const [firmaChoferRechazo, setFirmaChoferRechazo] = useState<string | null>(null);
  const [showFirmaRechazoDialog, setShowFirmaRechazoDialog] = useState(false);
  
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

  // Handle rechazo total
  const handleRechazoTotalChange = (checked: boolean) => {
    setRechazoTotal(checked);
    if (!checked) {
      setMotivoRechazo("");
      setFotosRechazo([]);
      setFirmaChoferRechazo(null);
    }
  };

  const handleFotoRechazoCapture = (tipo: TipoEvidencia, file: File, preview: string) => {
    setFotosRechazo(prev => [...prev, { tipo, file, preview }]);
  };

  const handleRemoveFotoRechazo = (index: number) => {
    setFotosRechazo(prev => {
      const newFotos = [...prev];
      URL.revokeObjectURL(newFotos[index].preview);
      newFotos.splice(index, 1);
      return newFotos;
    });
  };

  const handleFirmaRechazoConfirmada = (firma: string) => {
    setFirmaChoferRechazo(firma);
    setShowFirmaRechazoDialog(false);
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

    // Verificar que tenemos placas
    if (!placas.trim()) {
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

    // Si es rechazo total, validar diferente
    if (rechazoTotal) {
      if (!motivoRechazo) {
        toast({
          title: "Motivo requerido",
          description: "Selecciona el motivo del rechazo total",
          variant: "destructive"
        });
        return false;
      }
      if (fotosRechazo.length === 0) {
        toast({
          title: "Fotos requeridas",
          description: "Captura al menos una foto de evidencia del problema",
          variant: "destructive"
        });
        return false;
      }
      if (!firmaChoferRechazo) {
        toast({
          title: "Firma requerida",
          description: "El chofer debe firmar confirmando el rechazo de la entrega",
          variant: "destructive"
        });
        return false;
      }
      return true; // Si es rechazo, no validar sellos
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

      // Flujo de RECHAZO TOTAL
      if (rechazoTotal) {
        // 1. Actualizar entrega como rechazada
        const { error: updateError } = await supabase
          .from("ordenes_compra_entregas")
          .update({
            status: "rechazada",
            llegada_registrada_en: new Date().toISOString(),
            llegada_registrada_por: user.id,
            nombre_chofer_proveedor: nombreChofer.trim(),
            placas_vehiculo: placas.trim(),
            motivo_rechazo: motivoRechazo,
            rechazada_en: new Date().toISOString(),
            rechazada_por: user.id,
            firma_chofer_rechazo: firmaChoferRechazo,
          })
          .eq("id", entrega.id);

        if (updateError) throw updateError;

        // 2. Registrar en historial
        const motivoLabel = MOTIVOS_RECHAZO_TOTAL.find(m => m.value === motivoRechazo)?.label || motivoRechazo;
        await supabase.from("recepciones_participantes").insert({
          entrega_id: entrega.id,
          user_id: user.id,
          accion: "rechazo_total",
          notas: `Rechazó entrega completa. Motivo: ${motivoLabel}. Chofer: ${nombreChofer.trim()}`
        });

        // 3. Subir evidencias básicas (placas, identificación)
        for (const evidencia of evidencias) {
          const fileName = `rechazos/${entrega.orden_compra.id}/${entrega.id}/${Date.now()}-${evidencia.tipo}.jpg`;
          
          const { error: uploadError } = await supabase.storage
            .from("recepciones-evidencias")
            .upload(fileName, evidencia.file);

          if (!uploadError) {
            await supabase
              .from("ordenes_compra_entregas_evidencias")
              .insert({
                entrega_id: entrega.id,
                tipo_evidencia: evidencia.tipo,
                fase: "rechazo",
                ruta_storage: fileName,
                nombre_archivo: evidencia.file.name,
                capturado_por: user.id
              });
          }
        }

        // 4. Subir fotos de rechazo
        for (const foto of fotosRechazo) {
          const fileName = `rechazos/${entrega.orden_compra.id}/${entrega.id}/${Date.now()}-rechazo-${foto.tipo}.jpg`;
          
          const { error: uploadError } = await supabase.storage
            .from("recepciones-evidencias")
            .upload(fileName, foto.file);

          if (!uploadError) {
            await supabase
              .from("ordenes_compra_entregas_evidencias")
              .insert({
                entrega_id: entrega.id,
                tipo_evidencia: "rechazo_" + foto.tipo,
                fase: "rechazo",
                ruta_storage: fileName,
                nombre_archivo: foto.file.name,
                capturado_por: user.id
              });
          }
        }

        // 5. Subir firma de rechazo
        if (firmaChoferRechazo) {
          const firmaBlob = await fetch(firmaChoferRechazo).then(r => r.blob());
          const firmaFile = new File([firmaBlob], "firma-rechazo.png", { type: "image/png" });
          const firmaFileName = `rechazos/${entrega.orden_compra.id}/${entrega.id}/${Date.now()}-firma-rechazo.png`;
          
          const { error: firmaUploadError } = await supabase.storage
            .from("recepciones-evidencias")
            .upload(firmaFileName, firmaFile);

          if (!firmaUploadError) {
            await supabase
              .from("ordenes_compra_entregas_evidencias")
              .insert({
                entrega_id: entrega.id,
                tipo_evidencia: "firma_rechazo",
                fase: "rechazo",
                ruta_storage: firmaFileName,
                nombre_archivo: "firma-rechazo.png",
                capturado_por: user.id
              });
          }
        }

        toast({
          title: "Entrega rechazada",
          description: "Se registró el rechazo total de la entrega. El proveedor debe ser notificado."
        });

        // Limpiar estado
        setNombreChofer("");
        setPlacas("");
        setRechazoTotal(false);
        setMotivoRechazo("");
        setFotosRechazo([]);
        setFirmaChoferRechazo(null);
        setEvidencias([]);
        
        onLlegadaRegistrada();
        return;
      }

      // Flujo NORMAL (llegada para descarga)
      // 1. Actualizar entrega con datos de llegada
      const { error: updateError } = await supabase
        .from("ordenes_compra_entregas")
        .update({
          status: "en_descarga",
          llegada_registrada_en: new Date().toISOString(),
          llegada_registrada_por: user.id,
          nombre_chofer_proveedor: nombreChofer.trim(),
          placas_vehiculo: placas.trim(),
          numero_sello_llegada: sinSellos 
            ? "SIN SELLOS - FIRMADO" 
            : getEvidenciaPorTipo("sello_2") 
              ? "2 SELLOS REGISTRADOS"
              : "1 SELLO REGISTRADO",
          sin_sellos: sinSellos,
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
        notas: `Registró llegada. Chofer: ${nombreChofer.trim()}, Placas: ${placas.trim()}${sinSellos ? ", Sin sellos (firmado)" : ""}`
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

      // Notificar al contacto de logística del proveedor (si existe)
      try {
        const proveedorId = entrega.orden_compra?.proveedor?.id;
        if (proveedorId) {
          const { data: contactoLogistica } = await supabase
            .from("proveedor_contactos")
            .select("nombre, email")
            .eq("proveedor_id", proveedorId)
            .eq("recibe_logistica", true)
            .not("email", "is", null)
            .limit(1)
            .single();

          if (contactoLogistica?.email) {
            const horaInicio = format(new Date(), "HH:mm 'del' dd/MM/yyyy", { locale: es });
            const nombreProveedor = entrega.orden_compra.proveedor?.nombre 
              || entrega.orden_compra.proveedor_nombre_manual 
              || "Proveedor";
            const asunto = `🚛 Inicio de descarga - OC ${entrega.orden_compra.folio} - ${nombreProveedor}`;
            const htmlBody = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #f97316;">🚛 Inicio de Descarga</h2>
                <p>Estimado(a) ${contactoLogistica.nombre},</p>
                <p>Le informamos que su unidad ha llegado a nuestro almacén y se ha iniciado la descarga.</p>
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                  <tr style="background: #f3f4f6;">
                    <td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Proveedor:</strong></td>
                    <td style="padding: 8px; border: 1px solid #e5e7eb;">${nombreProveedor}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Orden de Compra:</strong></td>
                    <td style="padding: 8px; border: 1px solid #e5e7eb;">${entrega.orden_compra.folio}</td>
                  </tr>
                  <tr style="background: #f3f4f6;">
                    <td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Hora de inicio:</strong></td>
                    <td style="padding: 8px; border: 1px solid #e5e7eb;">${horaInicio}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Chofer:</strong></td>
                    <td style="padding: 8px; border: 1px solid #e5e7eb;">${nombreChofer.trim()}</td>
                  </tr>
                  <tr style="background: #f3f4f6;">
                    <td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Placas:</strong></td>
                    <td style="padding: 8px; border: 1px solid #e5e7eb;">${placas.trim()}</td>
                  </tr>
                </table>
                <p>Le notificaremos cuando la descarga haya finalizado.</p>
                <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
                  Este es un correo automático del sistema de ALMASA.
                </p>
              </div>
            `;

            const { data: emailData, error: emailError } = await supabase.functions.invoke("gmail-api", {
              body: {
                action: "send",
                email: "compras@almasa.com.mx",
                to: contactoLogistica.email,
                subject: asunto,
                body: htmlBody
              }
            });

            await registrarCorreoEnviado({
              tipo: "logistica_inicio",
              referencia_id: entrega.orden_compra.id,
              destinatario: contactoLogistica.email,
              asunto: asunto,
              gmail_message_id: emailData?.messageId || null,
              error: emailError?.message || null
            });

            if (!emailError) {
              console.log("Notificación de inicio de descarga enviada a:", contactoLogistica.email);
            }

            // Enviar copia a usuarios internos (admin y secretaria)
            const emailsInternos = await getEmailsInternos();
            if (emailsInternos.length > 0) {
              await enviarCopiaInterna({
                asunto: asunto,
                htmlBody: htmlBody,
                emailsDestinatarios: emailsInternos
              });
              console.log("Copias internas de logística enviadas a:", emailsInternos.length, "usuarios");
            }
          }
        }
      } catch (emailErr) {
        console.error("Error enviando notificación de logística:", emailErr);
        // No bloqueamos el flujo principal por error de email
      }

      // Limpiar estado
      setNombreChofer("");
      setPlacas("");
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
      <Sheet open={open && !showFirmaDialog && !showFirmaRechazoDialog} onOpenChange={onOpenChange}>
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
                <Label className="flex items-center gap-2 text-base">
                  <User className="w-5 h-5" />
                  Nombre del chofer *
                </Label>
                <Input
                  value={nombreChofer}
                  onChange={(e) => setNombreChofer(e.target.value)}
                  placeholder="Nombre del chofer del proveedor"
                  className="h-12 text-base touch-manipulation"
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
                      
                      {/* Input para placas (ingreso manual) */}
                      <div className="space-y-1">
                        <Label className="text-sm">Número de placas *</Label>
                        <Input
                          value={placas}
                          onChange={(e) => setPlacas(e.target.value.toUpperCase())}
                          placeholder="ABC-123"
                          className="uppercase h-12 text-base touch-manipulation"
                        />
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
                      size="lg"
                      className="h-12 w-12 p-0 touch-manipulation"
                      onClick={() => handleRemoveEvidencia("identificacion")}
                    >
                      <X className="h-5 w-5" />
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
                            size="lg"
                            className="h-12 w-12 p-0 touch-manipulation"
                            onClick={() => handleRemoveEvidencia("sello_1")}
                          >
                            <X className="h-5 w-5" />
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
                            size="lg"
                            className="h-12 w-12 p-0 touch-manipulation"
                            onClick={() => handleRemoveEvidencia("sello_2")}
                          >
                            <X className="h-5 w-5" />
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

                {/* Opción sin sellos - optimizado para tablet */}
                <div className={cn(
                  "p-4 border rounded-lg",
                  sinSellos ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20" : "border-border"
                )}>
                  <div className="flex items-center gap-4 touch-manipulation">
                    <Checkbox
                      id="sin-sellos"
                      checked={sinSellos}
                      onCheckedChange={(checked) => handleSinSellosChange(!!checked)}
                      disabled={!!fotoSelloPuerta1 || !!fotoSelloPuerta2}
                      className="h-6 w-6 border-2"
                    />
                    <label 
                      htmlFor="sin-sellos"
                      className="text-base font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2 cursor-pointer py-2"
                    >
                      <ShieldX className="w-5 h-5 text-amber-600" />
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
                            size="lg"
                            className="touch-manipulation"
                            onClick={() => setFirmaChoferSinSellos(null)}
                          >
                            <X className="h-5 w-5" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="lg"
                          onClick={() => setShowFirmaDialog(true)}
                          className="w-full h-14 text-base gap-3 touch-manipulation"
                        >
                          <PenLine className="w-5 h-5" />
                          Obtener firma del chofer
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* RECHAZO TOTAL - optimizado para tablet */}
              <div className={cn(
                "p-4 border rounded-lg",
                rechazoTotal ? "border-red-500 bg-red-50 dark:bg-red-950/20" : "border-border"
              )}>
                <div className="flex items-center gap-4 touch-manipulation">
                  <Checkbox
                    id="rechazo-total"
                    checked={rechazoTotal}
                    onCheckedChange={(checked) => handleRechazoTotalChange(!!checked)}
                    disabled={sinSellos || !!fotoSelloPuerta1}
                    className="h-6 w-6 border-2"
                  />
                  <label 
                    htmlFor="rechazo-total"
                    className="text-base font-medium leading-none flex items-center gap-2 text-red-700 dark:text-red-400 cursor-pointer py-2"
                  >
                    <Ban className="w-5 h-5" />
                    Rechazar entrega completa
                  </label>
                </div>
                
                {rechazoTotal && (
                  <div className="mt-4 space-y-4">
                    <Select value={motivoRechazo} onValueChange={setMotivoRechazo}>
                      <SelectTrigger className={cn("h-12 text-base touch-manipulation", !motivoRechazo && "border-destructive")}>
                        <SelectValue placeholder="Selecciona motivo del rechazo *" />
                      </SelectTrigger>
                      <SelectContent>
                        {MOTIVOS_RECHAZO_TOTAL.map(m => (
                          <SelectItem key={m.value} value={m.value} className="py-3 text-base">{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="space-y-3">
                      <Label className="text-base">Fotos de evidencia * (mínimo 1)</Label>
                      <EvidenciaCapture
                        tipo="rechazo_total"
                        onCapture={(file, preview) => handleFotoRechazoCapture("rechazo_total", file, preview)}
                      />
                      {fotosRechazo.length > 0 && (
                        <div className="grid grid-cols-3 gap-3 mt-3">
                          {fotosRechazo.map((foto, idx) => (
                            <div key={idx} className="relative">
                              <img src={foto.preview} alt="Evidencia" className="h-20 w-full object-cover rounded border-2" />
                              <button
                                type="button"
                                onClick={() => handleRemoveFotoRechazo(idx)}
                                className="absolute -top-2 -right-2 p-2 rounded-full bg-destructive text-destructive-foreground touch-manipulation"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {firmaChoferRechazo ? (
                      <div className="flex items-center gap-3 p-2 bg-green-100 dark:bg-green-900/30 rounded">
                        <img src={firmaChoferRechazo} alt="Firma" className="h-12 border rounded bg-white" />
                        <div className="flex items-center gap-1 text-green-700 dark:text-green-400 text-sm">
                          <CheckCircle2 className="w-4 h-4" />
                          Chofer firmó rechazo
                        </div>
                        <Button variant="ghost" size="lg" className="touch-manipulation" onClick={() => setFirmaChoferRechazo(null)}>
                          <X className="h-5 w-5" />
                        </Button>
                      </div>
                    ) : (
                      <Button variant="outline" size="lg" onClick={() => setShowFirmaRechazoDialog(true)} className="w-full h-14 text-base gap-3 touch-manipulation">
                        <PenLine className="w-5 h-5" />
                        Firma del chofer (confirma rechazo) *
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Aviso */}
              {!rechazoTotal && (
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
              )}
            </div>
          </ScrollArea>

          <SheetFooter className="mt-4 pt-4 border-t">
            <Button
              onClick={handleConfirmarLlegada}
              disabled={saving}
              className={cn("w-full h-14 text-base touch-manipulation", rechazoTotal && "bg-destructive hover:bg-destructive/90")}
              size="lg"
            >
              {saving ? (
                "Guardando..."
              ) : rechazoTotal ? (
                <>
                  <Ban className="w-6 h-6 mr-2" />
                  Confirmar Rechazo Total
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-6 h-6 mr-2" />
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

      {/* Diálogo de firma para rechazo total */}
      <FirmaDigitalDialog
        open={showFirmaRechazoDialog}
        onOpenChange={setShowFirmaRechazoDialog}
        onConfirm={handleFirmaRechazoConfirmada}
        titulo={`Firma de ${nombreChofer || "chofer"} - Confirma RECHAZO TOTAL de la entrega`}
      />
    </>
  );
};
