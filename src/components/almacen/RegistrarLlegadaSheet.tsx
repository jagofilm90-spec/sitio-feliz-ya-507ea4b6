import { useState, useEffect, useRef, useCallback } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { registrarCorreoEnviado } from "@/components/compras/HistorialCorreosOC";
import { getEmailsInternos, enviarCopiaInterna } from "@/lib/emailNotificationsUtils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Truck,
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
  Plus,
  Trash2,
  Save,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EvidenciaCapture, TipoEvidencia } from "@/components/compras/EvidenciaCapture";
import { FirmaDigitalDialog } from "./FirmaDigitalDialog";
import logoAlmasa from "@/assets/logo-almasa.png";

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
  datos_llegada_parcial?: any;
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

interface SelloItem {
  foto: EvidenciaLlegada | null;
  numero: string;
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

  // Evidencias (placas, identificación)
  const [evidencias, setEvidencias] = useState<EvidenciaLlegada[]>([]);

  // Placas del vehículo
  const [placas, setPlacas] = useState("");

  // Sellos dinámicos (1-3)
  const [sellos, setSellos] = useState<SelloItem[]>([{ foto: null, numero: "" }]);

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

  // Cerrar con confirmación
  const [showCerrarConfirm, setShowCerrarConfirm] = useState(false);

  // Borrador auto-save
  const [borradorGuardado, setBorradorGuardado] = useState(false);
  const borradorTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { toast } = useToast();

  // Resetear al abrir y cargar borrador si existe
  useEffect(() => {
    if (open) {
      // Siempre resetear estados volátiles (no guardados en borrador)
      setRechazoTotal(false);
      setMotivoRechazo("");
      setFotosRechazo([]);
      setFirmaChoferRechazo(null);
      setFirmaChoferSinSellos(null);
      setEvidencias([]);
      setSaving(false);

      // Cargar borrador si existe
      if (entrega.datos_llegada_parcial) {
        const datos = entrega.datos_llegada_parcial;
        setNombreChofer(datos.nombreChofer || "");
        setPlacas(datos.placas || "");
        setSinSellos(datos.sinSellos || false);
        if (datos.sellos?.length) {
          setSellos(datos.sellos.map((s: any) => ({ foto: null, numero: s.numero || "" })));
        } else {
          setSellos([{ foto: null, numero: "" }]);
        }
      } else {
        // Sin borrador: form limpio
        setNombreChofer("");
        setPlacas("");
        setSinSellos(false);
        setSellos([{ foto: null, numero: "" }]);
      }
    }
  }, [open, entrega.id]);

  // Guardar borrador automático (debounced 1.5s)
  const guardarBorrador = useCallback(async () => {
    const tieneData = nombreChofer.trim() || placas.trim() || sinSellos || sellos.some(s => s.numero.trim());
    if (!tieneData) return;
    try {
      await supabase
        .from("ordenes_compra_entregas")
        .update({
          datos_llegada_parcial: {
            nombreChofer: nombreChofer.trim(),
            placas: placas.trim(),
            sinSellos,
            sellos: sellos.map(s => ({ numero: s.numero })),
            guardado_en: new Date().toISOString(),
          }
        } as any)
        .eq("id", entrega.id);
      setBorradorGuardado(true);
      setTimeout(() => setBorradorGuardado(false), 2000);
    } catch (e) {
      console.error("Error guardando borrador:", e);
    }
  }, [nombreChofer, placas, sinSellos, sellos, entrega.id]);

  useEffect(() => {
    if (!open) return;
    if (borradorTimerRef.current) clearTimeout(borradorTimerRef.current);
    borradorTimerRef.current = setTimeout(guardarBorrador, 1500);
    return () => {
      if (borradorTimerRef.current) clearTimeout(borradorTimerRef.current);
    };
  }, [nombreChofer, placas, sinSellos, sellos, open, guardarBorrador]);

  // Limpiar borrador de la DB al confirmar exitosamente
  const limpiarBorrador = async () => {
    try {
      await supabase
        .from("ordenes_compra_entregas")
        .update({ datos_llegada_parcial: null } as any)
        .eq("id", entrega.id);
    } catch {}
  };

  // ====== EVIDENCIAS ======
  const handleEvidenciaCapture = (tipo: TipoEvidencia, file: File, preview: string) => {
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

  // ====== SELLOS DINÁMICOS ======
  const addSello = () => {
    if (sellos.length < 3) {
      setSellos(prev => [...prev, { foto: null, numero: "" }]);
    }
  };

  const removeSello = (idx: number) => {
    setSellos(prev => {
      const newSellos = [...prev];
      if (newSellos[idx].foto) URL.revokeObjectURL(newSellos[idx].foto!.preview);
      newSellos.splice(idx, 1);
      return newSellos;
    });
  };

  const updateSelloFoto = (idx: number, file: File, preview: string) => {
    setSellos(prev => prev.map((s, i) => i === idx ? { ...s, foto: { tipo: `sello_${i + 1}` as TipoEvidencia, file, preview } } : s));
  };

  const removeSelloFoto = (idx: number) => {
    setSellos(prev => prev.map((s, i) => {
      if (i === idx && s.foto) {
        URL.revokeObjectURL(s.foto.preview);
        return { ...s, foto: null };
      }
      return s;
    }));
  };

  const updateSelloNumero = (idx: number, numero: string) => {
    setSellos(prev => prev.map((s, i) => i === idx ? { ...s, numero } : s));
  };

  // ====== SIN SELLOS ======
  const handleSinSellosChange = (checked: boolean) => {
    setSinSellos(checked);
    if (!checked) {
      setFirmaChoferSinSellos(null);
    }
  };

  const handleFirmaSinSellosConfirmada = (firma: string) => {
    setFirmaChoferSinSellos(firma);
    setShowFirmaDialog(false);
  };

  // ====== RECHAZO TOTAL ======
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

  // ====== CERRAR ======
  const handleCerrar = () => {
    const tieneData = nombreChofer.trim() || placas.trim() || evidencias.length > 0 || sellos.some(s => s.foto || s.numero.trim());
    if (tieneData) {
      setShowCerrarConfirm(true);
    } else {
      onOpenChange(false);
    }
  };

  // ====== VALIDACIÓN ======
  const validarFormulario = (): boolean => {
    if (!nombreChofer.trim()) {
      toast({ title: "Datos incompletos", description: "Ingresa el nombre del chofer del proveedor", variant: "destructive" });
      return false;
    }
    if (!getEvidenciaPorTipo("placas")) {
      toast({ title: "Foto requerida", description: "Captura la foto de las placas/camión", variant: "destructive" });
      return false;
    }
    if (!placas.trim()) {
      toast({ title: "Placas requeridas", description: "Ingresa el número de placas del vehículo", variant: "destructive" });
      return false;
    }
    if (!getEvidenciaPorTipo("identificacion")) {
      toast({ title: "Foto requerida", description: "Captura la foto de identificación del chofer", variant: "destructive" });
      return false;
    }

    if (rechazoTotal) {
      if (!motivoRechazo) {
        toast({ title: "Motivo requerido", description: "Selecciona el motivo del rechazo total", variant: "destructive" });
        return false;
      }
      if (fotosRechazo.length === 0) {
        toast({ title: "Fotos requeridas", description: "Captura al menos una foto de evidencia del problema", variant: "destructive" });
        return false;
      }
      if (!firmaChoferRechazo) {
        toast({ title: "Firma requerida", description: "El chofer debe firmar confirmando el rechazo de la entrega", variant: "destructive" });
        return false;
      }
      return true;
    }

    // Validar sellos: al menos 1 foto de sello O checkbox sin sellos
    const tieneAlgunSelloFoto = sellos.some(s => s.foto);
    if (!tieneAlgunSelloFoto && !sinSellos) {
      toast({ title: "Sello requerido", description: "Captura foto de al menos un sello o marca 'Sin sellos'", variant: "destructive" });
      return false;
    }
    if (sinSellos && !firmaChoferSinSellos) {
      toast({ title: "Firma requerida", description: "El chofer debe firmar confirmando que no trae sellos", variant: "destructive" });
      return false;
    }
    return true;
  };

  // ====== SUBMIT ======
  const handleConfirmarLlegada = async () => {
    if (!validarFormulario()) return;

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      // ====== FLUJO RECHAZO TOTAL ======
      if (rechazoTotal) {
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
            datos_llegada_parcial: null,
          })
          .eq("id", entrega.id);

        if (updateError) throw updateError;

        const motivoLabelHistorial = MOTIVOS_RECHAZO_TOTAL.find(m => m.value === motivoRechazo)?.label || motivoRechazo;
        await supabase.from("recepciones_participantes").insert({
          entrega_id: entrega.id,
          user_id: user.id,
          accion: "rechazo_total",
          notas: `Rechazó entrega completa. Motivo: ${motivoLabelHistorial}. Chofer: ${nombreChofer.trim()}`
        });

        for (const evidencia of evidencias) {
          const fileName = `rechazos/${entrega.orden_compra.id}/${entrega.id}/${Date.now()}-${evidencia.tipo}.jpg`;
          const { error: uploadError } = await supabase.storage.from("recepciones-evidencias").upload(fileName, evidencia.file);
          if (!uploadError) {
            await supabase.from("ordenes_compra_entregas_evidencias").insert({
              entrega_id: entrega.id, tipo_evidencia: evidencia.tipo, fase: "rechazo",
              ruta_storage: fileName, nombre_archivo: evidencia.file.name, capturado_por: user.id
            });
          }
        }

        for (const foto of fotosRechazo) {
          const fileName = `rechazos/${entrega.orden_compra.id}/${entrega.id}/${Date.now()}-rechazo-${foto.tipo}.jpg`;
          const { error: uploadError } = await supabase.storage.from("recepciones-evidencias").upload(fileName, foto.file);
          if (!uploadError) {
            await supabase.from("ordenes_compra_entregas_evidencias").insert({
              entrega_id: entrega.id, tipo_evidencia: "rechazo_" + foto.tipo, fase: "rechazo",
              ruta_storage: fileName, nombre_archivo: foto.file.name, capturado_por: user.id
            });
          }
        }

        if (firmaChoferRechazo) {
          const firmaBlob = await fetch(firmaChoferRechazo).then(r => r.blob());
          const firmaFile = new File([firmaBlob], "firma-rechazo.png", { type: "image/png" });
          const firmaFileName = `rechazos/${entrega.orden_compra.id}/${entrega.id}/${Date.now()}-firma-rechazo.png`;
          const { error: firmaUploadError } = await supabase.storage.from("recepciones-evidencias").upload(firmaFileName, firmaFile);
          if (!firmaUploadError) {
            await supabase.from("ordenes_compra_entregas_evidencias").insert({
              entrega_id: entrega.id, tipo_evidencia: "firma_rechazo", fase: "rechazo",
              ruta_storage: firmaFileName, nombre_archivo: "firma-rechazo.png", capturado_por: user.id
            });
          }
        }

        // Notificaciones de rechazo
        const motivoLabel = MOTIVOS_RECHAZO_TOTAL.find(m => m.value === motivoRechazo)?.label || motivoRechazo;
        const proveedorId = entrega.orden_compra?.proveedor?.id;
        const nombreProveedorRechazo = entrega.orden_compra?.proveedor?.nombre || entrega.orden_compra?.proveedor_nombre_manual || "Proveedor";

        let almacenistaNombre = "Almacenista";
        try {
          const { data: perfil } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
          if (perfil?.full_name) almacenistaNombre = perfil.full_name;
        } catch {}

        try {
          if (proveedorId) {
            const { data: contactoLogistica } = await supabase.from("proveedor_contactos").select("nombre, email")
              .eq("proveedor_id", proveedorId).eq("recibe_logistica", true).not("email", "is", null).limit(1).single();
            let ccEmails: string[] = [];
            const { data: contactoDevol } = await supabase.from("proveedor_contactos").select("email")
              .eq("proveedor_id", proveedorId).eq("recibe_devoluciones", true).not("email", "is", null).limit(1).single();
            if (contactoDevol?.email && contactoDevol.email !== contactoLogistica?.email) ccEmails.push(contactoDevol.email);

            if (contactoLogistica?.email) {
              const fechaRechazo = format(new Date(), "dd/MM/yyyy 'a las' HH:mm", { locale: es });
              const { data: evidenciasRechazo } = await supabase.from("ordenes_compra_entregas_evidencias" as any)
                .select("ruta_storage, tipo_evidencia").eq("entrega_id", entrega.id).eq("fase", "rechazo");
              const attachments: { filename: string; content: string; mimeType: string }[] = [];
              for (const ev of (evidenciasRechazo as any[]) || []) {
                try {
                  const { data: fileData } = await supabase.storage.from("recepciones-evidencias").download(ev.ruta_storage);
                  if (fileData) {
                    const buffer = await fileData.arrayBuffer();
                    const base64 = btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
                    attachments.push({ filename: `evidencia-${ev.tipo_evidencia}.jpg`, content: base64, mimeType: "image/jpeg" });
                  }
                } catch (e) { console.warn("No se pudo adjuntar evidencia:", ev.ruta_storage); }
              }

              const asuntoRechazo = `🚫 Rechazo de entrega — OC ${entrega.orden_compra.folio}`;
              const htmlBodyRechazo = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h2 style="color: #dc2626;">🚫 Rechazo de Entrega</h2><p>Estimado(a) ${contactoLogistica.nombre},</p><p>Le informamos que la entrega correspondiente a la siguiente orden de compra ha sido <strong>rechazada en su totalidad</strong>.</p><table style="width: 100%; border-collapse: collapse; margin: 20px 0;"><tr style="background: #fef2f2;"><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Orden de Compra:</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;">${entrega.orden_compra.folio}</td></tr><tr><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Fecha y hora del rechazo:</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;">${fechaRechazo}</td></tr><tr style="background: #fef2f2;"><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Motivo del rechazo:</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb; color: #dc2626; font-weight: bold;">${motivoLabel}</td></tr><tr><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Almacenista:</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;">${almacenistaNombre}</td></tr><tr style="background: #fef2f2;"><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Chofer del proveedor:</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;">${nombreChofer.trim()}</td></tr><tr><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Placas del vehículo:</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;">${placas.trim()}</td></tr></table><p style="color: #dc2626; font-weight: bold;">Se adjuntan evidencias fotográficas del rechazo.</p><p>Favor de comunicarse con nuestro departamento de compras para coordinar la reposición.</p><p style="color: #6b7280; font-size: 12px; margin-top: 30px;">Este es un correo automático del sistema de ALMASA.</p></div>`;

              const { data: emailData, error: emailError } = await supabase.functions.invoke("gmail-api", {
                body: { action: "send", email: "compras@almasa.com.mx", to: contactoLogistica.email,
                  cc: ccEmails.length > 0 ? ccEmails.join(",") : undefined, subject: asuntoRechazo, body: htmlBodyRechazo,
                  attachments: attachments.length > 0 ? attachments : undefined }
              });
              await registrarCorreoEnviado({ tipo: "rechazo_entrega_total", referencia_id: entrega.orden_compra.id,
                destinatario: [contactoLogistica.email, ...ccEmails].join(", "), asunto: asuntoRechazo,
                gmail_message_id: emailData?.messageId || null, error: emailError?.message || null });
              const emailsInternos = await getEmailsInternos();
              if (emailsInternos.length > 0) {
                await enviarCopiaInterna({ asunto: asuntoRechazo, htmlBody: htmlBodyRechazo, emailsDestinatarios: emailsInternos,
                  attachments: attachments.length > 0 ? attachments : undefined });
              }
            }
          }
        } catch (emailErr) { console.error("Error enviando email de rechazo:", emailErr); }

        try {
          await supabase.from("notificaciones").insert({
            tipo: "rechazo_entrega_total",
            titulo: `🚫 Entrega rechazada — ${entrega.orden_compra.folio}`,
            descripcion: `Almacén rechazó entrega de ${nombreProveedorRechazo}. Motivo: ${motivoLabel}. Proveedor notificado.`,
            leida: false
          });
        } catch (notifErr) { console.error("Error creando notificación de rechazo:", notifErr); }

        try {
          await supabase.functions.invoke("send-push-notification", {
            body: { roles: ['admin', 'secretaria'], title: '🚫 Entrega rechazada',
              body: `OC ${entrega.orden_compra.folio} de ${nombreProveedorRechazo} fue rechazada por ${motivoLabel}` }
          });
        } catch (pushErr) { console.error("Error enviando push notification de rechazo:", pushErr); }

        toast({ title: "Entrega rechazada", description: "Se registró el rechazo y se notificó al proveedor automáticamente." });
        resetForm();
        onLlegadaRegistrada();
        return;
      }

      // ====== FLUJO NORMAL ======
      const sellosConFoto = sellos.filter(s => s.foto);
      const sellosTexto = sinSellos
        ? "SIN SELLOS - FIRMADO"
        : sellosConFoto.length > 0
          ? `${sellosConFoto.length} SELLO(S) REGISTRADO(S)`
          : "SIN SELLOS";

      const { error: updateError } = await supabase
        .from("ordenes_compra_entregas")
        .update({
          status: "en_descarga",
          llegada_registrada_en: new Date().toISOString(),
          llegada_registrada_por: user.id,
          nombre_chofer_proveedor: nombreChofer.trim(),
          placas_vehiculo: placas.trim(),
          numero_sello_llegada: sellosTexto,
          sin_sellos: sinSellos,
          trabajando_por: user.id,
          trabajando_desde: new Date().toISOString(),
          datos_llegada_parcial: null,
        })
        .eq("id", entrega.id);

      if (updateError) throw updateError;

      await supabase.from("recepciones_participantes").insert({
        entrega_id: entrega.id, user_id: user.id, accion: "inicio_llegada",
        notas: `Registró llegada. Chofer: ${nombreChofer.trim()}, Placas: ${placas.trim()}${sinSellos ? ", Sin sellos (firmado)" : ""}`
      });

      // Subir evidencias (placas, identificación)
      for (const evidencia of evidencias) {
        const fileName = `llegada/${entrega.orden_compra.id}/${entrega.id}/${Date.now()}-${evidencia.tipo}.jpg`;
        const { error: uploadError } = await supabase.storage.from("recepciones-evidencias").upload(fileName, evidencia.file);
        if (!uploadError) {
          await supabase.from("ordenes_compra_entregas_evidencias").insert({
            entrega_id: entrega.id, tipo_evidencia: evidencia.tipo, fase: "llegada",
            ruta_storage: fileName, nombre_archivo: evidencia.file.name, capturado_por: user.id
          });
        }
      }

      // Subir fotos de sellos dinámicos
      for (let i = 0; i < sellos.length; i++) {
        const sello = sellos[i];
        if (sello.foto) {
          const fileName = `llegada/${entrega.orden_compra.id}/${entrega.id}/${Date.now()}-sello_${i + 1}.jpg`;
          const { error: uploadError } = await supabase.storage.from("recepciones-evidencias").upload(fileName, sello.foto.file);
          if (!uploadError) {
            await supabase.from("ordenes_compra_entregas_evidencias").insert({
              entrega_id: entrega.id, tipo_evidencia: `sello_${i + 1}`, fase: "llegada",
              ruta_storage: fileName, nombre_archivo: sello.foto.file.name, capturado_por: user.id
            });
          }
        }
      }

      // Firma sin sellos
      if (sinSellos && firmaChoferSinSellos) {
        const firmaBlob = await fetch(firmaChoferSinSellos).then(r => r.blob());
        const firmaFile = new File([firmaBlob], "firma-sin-sellos.png", { type: "image/png" });
        const firmaFileName = `llegada/${entrega.orden_compra.id}/${entrega.id}/${Date.now()}-firma-sin-sellos.png`;
        const { error: firmaUploadError } = await supabase.storage.from("recepciones-evidencias").upload(firmaFileName, firmaFile);
        if (!firmaUploadError) {
          await supabase.from("ordenes_compra_entregas_evidencias").insert({
            entrega_id: entrega.id, tipo_evidencia: "firma_sin_sellos", fase: "llegada",
            ruta_storage: firmaFileName, nombre_archivo: "firma-sin-sellos.png", capturado_por: user.id
          });
        }
      }

      toast({ title: "Llegada registrada", description: "Puedes proceder con la descarga. Cuando termines, completa la recepción." });

      // Email de notificación al proveedor
      try {
        const proveedorId = entrega.orden_compra?.proveedor?.id;
        if (proveedorId) {
          const { data: contactoLogistica } = await supabase.from("proveedor_contactos").select("nombre, email")
            .eq("proveedor_id", proveedorId).eq("recibe_logistica", true).not("email", "is", null).limit(1).single();
          if (contactoLogistica?.email) {
            const horaInicio = format(new Date(), "HH:mm 'del' dd/MM/yyyy", { locale: es });
            const nombreProveedor = entrega.orden_compra.proveedor?.nombre || entrega.orden_compra.proveedor_nombre_manual || "Proveedor";
            const asunto = `🚛 Inicio de descarga - OC ${entrega.orden_compra.folio} - ${nombreProveedor}`;
            const htmlBody = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h2 style="color: #f97316;">🚛 Inicio de Descarga</h2><p>Estimado(a) ${contactoLogistica.nombre},</p><p>Le informamos que su unidad ha llegado a nuestro almacén y se ha iniciado la descarga.</p><table style="width: 100%; border-collapse: collapse; margin: 20px 0;"><tr style="background: #f3f4f6;"><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Proveedor:</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;">${nombreProveedor}</td></tr><tr><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Orden de Compra:</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;">${entrega.orden_compra.folio}</td></tr><tr style="background: #f3f4f6;"><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Hora de inicio:</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;">${horaInicio}</td></tr><tr><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Chofer:</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;">${nombreChofer.trim()}</td></tr><tr style="background: #f3f4f6;"><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Placas:</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;">${placas.trim()}</td></tr></table><p>Le notificaremos cuando la descarga haya finalizado.</p><p style="color: #6b7280; font-size: 12px; margin-top: 30px;">Este es un correo automático del sistema de ALMASA.</p></div>`;

            const { data: emailData, error: emailError } = await supabase.functions.invoke("gmail-api", {
              body: { action: "send", email: "compras@almasa.com.mx", to: contactoLogistica.email, subject: asunto, body: htmlBody }
            });
            await registrarCorreoEnviado({ tipo: "logistica_inicio", referencia_id: entrega.orden_compra.id,
              destinatario: contactoLogistica.email, asunto, gmail_message_id: emailData?.messageId || null, error: emailError?.message || null });
            const emailsInternos = await getEmailsInternos();
            if (emailsInternos.length > 0) {
              await enviarCopiaInterna({ asunto, htmlBody, emailsDestinatarios: emailsInternos });
            }
          }
        }
      } catch (emailErr) { console.error("Error enviando notificación de logística:", emailErr); }

      resetForm();
      onLlegadaRegistrada();
    } catch (error) {
      console.error("Error registrando llegada:", error);
      toast({ title: "Error", description: "No se pudo registrar la llegada", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setNombreChofer("");
    setPlacas("");
    setSellos([{ foto: null, numero: "" }]);
    setSinSellos(false);
    setFirmaChoferSinSellos(null);
    setRechazoTotal(false);
    setMotivoRechazo("");
    setFotosRechazo([]);
    setFirmaChoferRechazo(null);
    setEvidencias([]);
  };

  const proveedorNombre = entrega.orden_compra?.proveedor?.nombre || entrega.orden_compra?.proveedor_nombre_manual || "Proveedor";
  const fotoPlacas = getEvidenciaPorTipo("placas");
  const fotoIdentificacion = getEvidenciaPorTipo("identificacion");
  const tieneAlgunSello = sellos.some(s => s.foto);

  return (
    <>
      <Dialog open={open && !showFirmaDialog && !showFirmaRechazoDialog} onOpenChange={(v) => { if (!v) handleCerrar(); }}>
        <DialogContent className="w-full h-full md:h-auto md:max-w-3xl md:max-h-[95vh] overflow-hidden flex flex-col p-0 gap-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Registrar Llegada</DialogTitle>
          </DialogHeader>

          {/* Header fijo con logo */}
          <div className="flex items-center justify-between p-4 border-b bg-background sticky top-0 z-10">
            <img src={logoAlmasa} alt="ALMASA" className="h-8 object-contain" />
            <div className="text-center">
              <p className="font-bold text-sm">HOJA DE RECEPCIÓN</p>
              <p className="text-xs text-muted-foreground">
                {entrega.orden_compra?.folio} · Entrega #{entrega.numero_entrega}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleCerrar} className="touch-manipulation">
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Info proveedor */}
          <div className="px-4 py-3 bg-muted/30 border-b">
            <p className="font-bold text-lg">{proveedorNombre}</p>
            <p className="text-sm text-muted-foreground">
              {entrega.fecha_programada
                ? format(new Date(entrega.fecha_programada + "T12:00:00"), "dd/MMM/yyyy", { locale: es })
                : "Sin fecha"} · {entrega.cantidad_bultos.toLocaleString()} bultos
            </p>
          </div>

          {/* Indicador borrador guardado */}
          {borradorGuardado && (
            <div className="px-4 py-1.5 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 text-xs flex items-center gap-1">
              <Save className="w-3 h-3" /> Borrador guardado
            </div>
          )}

          {/* Contenido scrollable */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
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

            {/* Foto de placas */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Car className="w-4 h-4" />
                Foto de placas/camión *
              </Label>
              <div className={cn("p-3 border rounded-lg", fotoPlacas ? "border-green-500 bg-green-50 dark:bg-green-950/20" : "border-destructive bg-destructive/5")}>
                {fotoPlacas ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img src={fotoPlacas.preview} alt="Placas" className="h-12 w-16 object-cover rounded border" />
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRemoveEvidencia("placas")}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Número de placas *</Label>
                      <Input value={placas} onChange={(e) => setPlacas(e.target.value.toUpperCase())} placeholder="ABC-123" className="uppercase h-12 text-base touch-manipulation" />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Foto de placas *</span>
                    <EvidenciaCapture tipo="placas" onCapture={(file, preview) => handleEvidenciaCapture("placas", file, preview)} />
                  </div>
                )}
              </div>
            </div>

            {/* Foto de identificación */}
            <div className={cn("flex items-center justify-between p-3 border rounded-lg", fotoIdentificacion ? "border-green-500 bg-green-50 dark:bg-green-950/20" : "border-destructive bg-destructive/5")}>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span className="font-medium">Identificación del chofer *</span>
                {fotoIdentificacion && <CheckCircle2 className="w-4 h-4 text-green-600" />}
              </div>
              {fotoIdentificacion ? (
                <div className="flex items-center gap-2">
                  <img src={fotoIdentificacion.preview} alt="Identificación" className="h-10 w-14 object-cover rounded border" />
                  <Button variant="ghost" size="lg" className="h-12 w-12 p-0 touch-manipulation" onClick={() => handleRemoveEvidencia("identificacion")}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              ) : (
                <EvidenciaCapture tipo="identificacion" onCapture={(file, preview) => handleEvidenciaCapture("identificacion", file, preview)} />
              )}
            </div>

            {/* Sellos dinámicos */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Hash className="w-4 h-4" />
                Sellos de seguridad *
              </Label>

              {!sinSellos && (
                <div className="space-y-2">
                  {sellos.map((sello, idx) => (
                    <div key={idx} className={cn("flex items-center gap-3 p-3 border rounded-lg", sello.foto ? "border-green-500 bg-green-50 dark:bg-green-950/20" : idx === 0 ? "border-destructive bg-destructive/5" : "border-border")}>
                      <span className="font-medium text-sm w-16 flex-shrink-0">Sello {idx + 1}</span>
                      {sello.foto ? (
                        <div className="flex items-center gap-2">
                          <img src={sello.foto.preview} alt={`Sello ${idx + 1}`} className="h-10 w-14 object-cover rounded border" />
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeSelloFoto(idx)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <EvidenciaCapture tipo={`sello_${idx + 1}` as TipoEvidencia} onCapture={(file, preview) => updateSelloFoto(idx, file, preview)} />
                      )}
                      <Input placeholder="# Sello" value={sello.numero} onChange={(e) => updateSelloNumero(idx, e.target.value.toUpperCase())} className="h-10 w-28 uppercase touch-manipulation flex-shrink-0" />
                      {idx > 0 && (
                        <Button variant="ghost" size="icon" className="h-10 w-10 flex-shrink-0" onClick={() => removeSello(idx)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {sellos.length < 3 && (
                    <Button variant="outline" size="sm" onClick={addSello} className="w-full touch-manipulation">
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar sello
                    </Button>
                  )}
                </div>
              )}

              {/* Opción sin sellos */}
              <div className={cn("p-4 border rounded-lg", sinSellos ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20" : "border-border")}>
                <div className="flex items-center gap-4 touch-manipulation">
                  <Checkbox id="sin-sellos" checked={sinSellos} onCheckedChange={(checked) => handleSinSellosChange(!!checked)} disabled={tieneAlgunSello} className="h-6 w-6 border-2" />
                  <label htmlFor="sin-sellos" className="text-base font-medium leading-none flex items-center gap-2 cursor-pointer py-2">
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
                        <img src={firmaChoferSinSellos} alt="Firma" className="h-12 border rounded bg-white" />
                        <div className="flex items-center gap-1 text-green-700 dark:text-green-400 text-sm">
                          <CheckCircle2 className="w-4 h-4" /> Firmado
                        </div>
                        <Button variant="ghost" size="lg" className="touch-manipulation" onClick={() => setFirmaChoferSinSellos(null)}>
                          <X className="h-5 w-5" />
                        </Button>
                      </div>
                    ) : (
                      <Button variant="outline" size="lg" onClick={() => setShowFirmaDialog(true)} className="w-full h-14 text-base gap-3 touch-manipulation">
                        <PenLine className="w-5 h-5" />
                        Obtener firma del chofer
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Rechazo total */}
            <div className={cn("p-4 border rounded-lg", rechazoTotal ? "border-red-500 bg-red-50 dark:bg-red-950/20" : "border-border")}>
              <div className="flex items-center gap-4 touch-manipulation">
                <Checkbox id="rechazo-total" checked={rechazoTotal} onCheckedChange={(checked) => handleRechazoTotalChange(!!checked)} disabled={sinSellos || tieneAlgunSello} className="h-6 w-6 border-2" />
                <label htmlFor="rechazo-total" className="text-base font-medium leading-none flex items-center gap-2 text-red-700 dark:text-red-400 cursor-pointer py-2">
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
                    <EvidenciaCapture tipo="rechazo_total" onCapture={(file, preview) => handleFotoRechazoCapture("rechazo_total", file, preview)} />
                    {fotosRechazo.length > 0 && (
                      <div className="grid grid-cols-3 gap-3 mt-3">
                        {fotosRechazo.map((foto, idx) => (
                          <div key={idx} className="relative">
                            <img src={foto.preview} alt="Evidencia" className="h-20 w-full object-cover rounded border-2" />
                            <button type="button" onClick={() => handleRemoveFotoRechazo(idx)} className="absolute -top-2 -right-2 p-2 rounded-full bg-destructive text-destructive-foreground touch-manipulation">
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
                      <div className="flex items-center gap-1 text-green-700 dark:text-green-400 text-sm"><CheckCircle2 className="w-4 h-4" /> Chofer firmó rechazo</div>
                      <Button variant="ghost" size="lg" className="touch-manipulation" onClick={() => setFirmaChoferRechazo(null)}><X className="h-5 w-5" /></Button>
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
                      La entrega pasará a estado "En descarga". Cuando termines de descargar, regresa para completar la recepción con las cantidades recibidas.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer fijo */}
          <div className="p-4 border-t bg-background">
            <Button
              onClick={handleConfirmarLlegada}
              disabled={saving}
              className={cn("w-full h-14 text-base touch-manipulation", rechazoTotal && "bg-destructive hover:bg-destructive/90")}
              size="lg"
            >
              {saving ? (
                <><Loader2 className="w-6 h-6 mr-2 animate-spin" /> Guardando...</>
              ) : rechazoTotal ? (
                <><Ban className="w-6 h-6 mr-2" /> Confirmar Rechazo Total</>
              ) : (
                <><CheckCircle2 className="w-6 h-6 mr-2" /> Confirmar Llegada e Iniciar Descarga</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmación al cerrar */}
      <AlertDialog open={showCerrarConfirm} onOpenChange={setShowCerrarConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cerrar formulario?</AlertDialogTitle>
            <AlertDialogDescription>
              Tu progreso está guardado automáticamente. Puedes continuar después desde la misma entrega.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Seguir llenando</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowCerrarConfirm(false); onOpenChange(false); }}>
              Cerrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Firma sin sellos */}
      <FirmaDigitalDialog
        open={showFirmaDialog}
        onOpenChange={setShowFirmaDialog}
        onConfirm={handleFirmaSinSellosConfirmada}
        titulo={`Firma de ${nombreChofer || "chofer"} - Confirma que entrega SIN SELLOS de seguridad`}
      />

      {/* Firma rechazo */}
      <FirmaDigitalDialog
        open={showFirmaRechazoDialog}
        onOpenChange={setShowFirmaRechazoDialog}
        onConfirm={handleFirmaRechazoConfirmada}
        titulo={`Firma de ${nombreChofer || "chofer"} - Confirma RECHAZO TOTAL de la entrega`}
      />
    </>
  );
};
