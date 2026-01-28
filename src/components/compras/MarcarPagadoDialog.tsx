import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Upload, Loader2, Mail, Send, X, Plus, Save, Package, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, FileText } from "lucide-react";
import { generarCierreOCPDFBase64, type CierreOCData } from "@/utils/cierreOCPdfGenerator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { registrarCorreoEnviado } from "./HistorialCorreosOC";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface MarcarPagadoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orden: {
    id: string;
    folio: string;
    proveedor_id: string | null;
    proveedor_nombre: string;
    proveedor_email: string | null;
    total: number;
    monto_devoluciones?: number | null;
    total_ajustado?: number | null;
  } | null;
}

export function MarcarPagadoDialog({
  open,
  onOpenChange,
  orden,
}: MarcarPagadoDialogProps) {
  const queryClient = useQueryClient();
  const [fechaPago, setFechaPago] = useState<Date>(new Date());
  const [referenciaPago, setReferenciaPago] = useState("");
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [devolucionesOpen, setDevolucionesOpen] = useState(true);
  
  // Estado para envío de correo
  const [enviarCorreo, setEnviarCorreo] = useState(false);
  const [emailSeleccionado, setEmailSeleccionado] = useState<string>("otro");
  const [emailManual, setEmailManual] = useState("");
  const [guardarEmail, setGuardarEmail] = useState(false);
  const [enviandoCorreo, setEnviandoCorreo] = useState(false);
  const [adjuntarEstadoCuenta, setAdjuntarEstadoCuenta] = useState(true); // Por defecto activado

  // Formato de motivos legible
  const formatMotivo = (motivo: string) => {
    const motivos: Record<string, string> = {
      'roto': 'Empaque roto',
      'rechazado_calidad': 'Calidad rechazada',
      'no_llego': 'No llegó',
      'faltante': 'Faltante',
      'dañado': 'Producto dañado',
      'vencido': 'Producto vencido',
      'error_cantidad': 'Error en cantidad',
    };
    return motivos[motivo] || motivo;
  };

  // Fetch contacts that receive payment notifications
  const { data: contactosPagos = [], refetch: refetchContactos } = useQuery({
    queryKey: ["proveedor-contactos-pagos", orden?.proveedor_id],
    queryFn: async () => {
      if (!orden?.proveedor_id) return [];
      const { data, error } = await supabase
        .from("proveedor_contactos")
        .select("*")
        .eq("proveedor_id", orden.proveedor_id)
        .eq("activo", true)
        .not("email", "is", null)
        .neq("email", "")
        .order("recibe_pagos", { ascending: false })
        .order("es_principal", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!orden?.proveedor_id && open,
  });

  // Query para obtener detalles de devoluciones
  const { data: devolucionesDetalle = [] } = useQuery({
    queryKey: ["devoluciones-detalle-pago", orden?.id],
    queryFn: async () => {
      if (!orden?.id) return [];
      
      // Obtener las devoluciones con productos
      const { data: devoluciones, error } = await supabase
        .from("devoluciones_proveedor")
        .select(`
          id,
          cantidad_devuelta,
          motivo,
          producto_id,
          productos (nombre, codigo)
        `)
        .eq("orden_compra_id", orden.id);
      
      if (error) throw error;
      if (!devoluciones || devoluciones.length === 0) return [];
      
      // Para cada devolución, obtener el precio unitario
      const devolucionesConPrecio = await Promise.all(
        devoluciones.map(async (dev) => {
          const { data: detalle } = await supabase
            .from("ordenes_compra_detalles")
            .select("precio_unitario_compra")
            .eq("orden_compra_id", orden.id)
            .eq("producto_id", dev.producto_id)
            .maybeSingle();
          
          const precioUnitario = detalle?.precio_unitario_compra || 0;
          return {
            ...dev,
            precio_unitario: precioUnitario,
            monto: dev.cantidad_devuelta * precioUnitario
          };
        })
      );
      
      return devolucionesConPrecio;
    },
    enabled: !!orden?.id && open && !!(orden?.monto_devoluciones && orden.monto_devoluciones > 0),
  });

  // Query para obtener productos recibidos (para el PDF de Estado de Cuenta)
  const { data: productosRecibidos = [] } = useQuery({
    queryKey: ["productos-recibidos-oc", orden?.id],
    queryFn: async () => {
      if (!orden?.id) return [];
      
      const { data: detalles, error } = await supabase
        .from("ordenes_compra_detalles")
        .select(`
          id,
          cantidad,
          cantidad_recibida,
          precio_unitario_compra,
          subtotal,
          producto_id,
          productos (codigo, nombre)
        `)
        .eq("orden_compra_id", orden.id);
      
      if (error) throw error;
      if (!detalles) return [];
      
      return detalles.map((d: any) => ({
        codigo: d.productos?.codigo || "",
        nombre: d.productos?.nombre || "Producto",
        cantidad: d.cantidad_recibida ?? d.cantidad,
        precio_unitario: d.precio_unitario_compra || 0,
        subtotal: (d.cantidad_recibida ?? d.cantidad) * (d.precio_unitario_compra || 0)
      }));
    },
    enabled: !!orden?.id && open,
  });

  // Initialize email when dialog opens - prioritize contacts with recibe_pagos
  useEffect(() => {
    if (open && orden) {
      if (contactosPagos.length > 0) {
        // First try to find a contact with recibe_pagos = true
        const contactoPagos = contactosPagos.find(c => c.recibe_pagos);
        if (contactoPagos) {
          setEmailSeleccionado(contactoPagos.id);
        } else {
          // Fallback to principal or first contact with email
          const principal = contactosPagos.find(c => c.es_principal);
          setEmailSeleccionado(principal?.id || contactosPagos[0].id);
        }
      } else if (orden.proveedor_email) {
        setEmailManual(orden.proveedor_email);
        setEmailSeleccionado("otro");
      } else {
        setEmailSeleccionado("otro");
        setEmailManual("");
      }
    }
  }, [open, orden, contactosPagos]);

  // Delete contact mutation (for removing email from contact)
  const deleteEmailMutation = useMutation({
    mutationFn: async (contactoId: string) => {
      const { error } = await supabase
        .from("proveedor_contactos")
        .update({ email: null })
        .eq("id", contactoId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Correo eliminado");
      refetchContactos();
      setEmailSeleccionado("otro");
    },
    onError: (error: Error) => {
      toast.error("Error al eliminar: " + error.message);
    },
  });

  // Get the actual email to use
  const getEmailDestino = (): string => {
    if (emailSeleccionado === "otro") {
      return emailManual;
    }
    const contacto = contactosPagos.find(c => c.id === emailSeleccionado);
    return contacto?.email || "";
  };

  const marcarPagadoMutation = useMutation({
    mutationFn: async () => {
      let comprobanteUrl: string | null = null;
      let comprobanteBase64: string | null = null;
      let comprobanteNombre: string | null = null;
      let comprobanteMimeType: string | null = null;

      // Upload comprobante (now required)
      if (comprobante) {
        setUploading(true);
        const fileExt = comprobante.name.split(".").pop();
        const fileName = `${orden?.id}-${Date.now()}.${fileExt}`;
        const filePath = `comprobantes-pago/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("ordenes-compra")
          .upload(filePath, comprobante);

        if (uploadError) {
          throw new Error("Error al subir comprobante: " + uploadError.message);
        }

        const { data: urlData } = supabase.storage
          .from("ordenes-compra")
          .getPublicUrl(filePath);

        comprobanteUrl = urlData.publicUrl;
        comprobanteNombre = comprobante.name;
        comprobanteMimeType = comprobante.type;
        
        // Si vamos a enviar correo, convertir a base64
        const emailDestino = getEmailDestino();
        if (enviarCorreo && emailDestino) {
          const arrayBuffer = await comprobante.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          comprobanteBase64 = btoa(binary);
        }
        
        setUploading(false);
      }

      // First fetch current order status to determine if we need to update main status
      const { data: currentOrder, error: fetchError } = await supabase
        .from("ordenes_compra")
        .select("status, tipo_pago")
        .eq("id", orden?.id)
        .single();
      
      if (fetchError) throw fetchError;

      // Build update payload
      const updatePayload: any = {
        status_pago: "pagado",
        fecha_pago: fechaPago.toISOString(),
        referencia_pago: referenciaPago,
        comprobante_pago_url: comprobanteUrl,
      };

      // If this was an advance payment OC that was pending payment, unlock it to autorizada
      if (currentOrder?.status === "pendiente_pago" && currentOrder?.tipo_pago === "anticipado") {
        updatePayload.status = "autorizada";
      }

      // Update order in database
      const { error } = await supabase
        .from("ordenes_compra")
        .update(updatePayload)
        .eq("id", orden?.id);

      if (error) throw error;

      // Save contact with email if requested
      if (guardarEmail && emailSeleccionado === "otro" && emailManual && orden?.proveedor_id) {
        const { error: saveEmailError } = await supabase
          .from("proveedor_contactos")
          .insert([{
            proveedor_id: orden.proveedor_id,
            nombre: "Contacto Pagos",
            telefono: "",
            email: emailManual,
            recibe_pagos: true,
            es_principal: contactosPagos.length === 0,
          }]);
        if (saveEmailError) {
          console.error("Error guardando contacto:", saveEmailError);
        }
      }

      // Send email if requested
      const emailDestino = getEmailDestino();
      if (enviarCorreo && emailDestino) {
        setEnviandoCorreo(true);
        try {
          // Construir tabla de devoluciones para el correo si hay
          let devolucionesHtml = '';
          if (orden?.monto_devoluciones && orden.monto_devoluciones > 0 && devolucionesDetalle.length > 0) {
            const devolucionesRows = devolucionesDetalle.map((dev: any) => `
              <tr>
                <td style="padding: 6px; border: 1px solid #ddd;">${dev.productos?.nombre || 'Producto'}</td>
                <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${dev.cantidad_devuelta}</td>
                <td style="padding: 6px; border: 1px solid #ddd;">${formatMotivo(dev.motivo)}</td>
                <td style="padding: 6px; border: 1px solid #ddd; text-align: right; color: #dc2626;">-$${dev.monto.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
              </tr>
            `).join('');
            
            devolucionesHtml = `
              <h3 style="color: #333; margin-top: 30px;">Detalle de Devoluciones Aplicadas:</h3>
              <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
                <tr style="background: #fef2f2;">
                  <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Producto</th>
                  <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">Cantidad</th>
                  <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Motivo</th>
                  <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Descuento</th>
                </tr>
                ${devolucionesRows}
                <tr style="background: #fef2f2; font-weight: bold;">
                  <td colspan="3" style="padding: 8px; border: 1px solid #ddd; text-align: right;">Total Devoluciones:</td>
                  <td style="padding: 8px; border: 1px solid #ddd; text-align: right; color: #dc2626;">-$${orden.monto_devoluciones.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                </tr>
              </table>
            `;
          }

          const montoAPagar = orden?.total_ajustado ?? orden?.total ?? 0;
          const tieneDescuentos = orden?.monto_devoluciones && orden.monto_devoluciones > 0;

          const emailBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Confirmación de Pago</h2>
              <p>Estimado proveedor,</p>
              <p>Le informamos que hemos realizado el pago correspondiente a la siguiente orden de compra:</p>
              
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5; font-weight: bold;">Folio OC:</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${orden?.folio}</td>
                </tr>
                ${tieneDescuentos ? `
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5; font-weight: bold;">Total Original:</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">$${orden?.total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd; background: #fef2f2; font-weight: bold; color: #dc2626;">(-) Devoluciones:</td>
                  <td style="padding: 8px; border: 1px solid #ddd; color: #dc2626;">-$${orden?.monto_devoluciones?.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd; background: #f0fdf4; font-weight: bold; color: #16a34a;">Monto Pagado:</td>
                  <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #16a34a;">$${montoAPagar.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                </tr>
                ` : `
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5; font-weight: bold;">Monto:</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">$${orden?.total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                </tr>
                `}
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5; font-weight: bold;">Fecha de pago:</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${format(fechaPago, "PPP", { locale: es })}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5; font-weight: bold;">Referencia:</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${referenciaPago}</td>
                </tr>
              </table>
              
              ${devolucionesHtml}
              
              ${comprobante ? '<p>Adjuntamos el comprobante de pago para su referencia.</p>' : ''}
              ${adjuntarEstadoCuenta ? '<p>Adjuntamos también el Estado de Cuenta detallado en formato PDF.</p>' : ''}
              
              <p style="margin-top: 30px;">Saludos cordiales,</p>
              <p><strong>Abarrotes La Manita S.A. de C.V.</strong><br>
              Departamento de Compras</p>
            </div>
          `;

          const emailPayload: any = {
            action: 'send',
            email: 'compras@almasa.com.mx',
            to: emailDestino,
            subject: `Confirmación de Pago - ${orden?.folio} - ALMASA`,
            body: emailBody,
            attachments: [],
          };

          // Agregar comprobante como adjunto si existe
          if (comprobanteBase64 && comprobanteNombre && comprobanteMimeType) {
            emailPayload.attachments.push({
              filename: comprobanteNombre,
              content: comprobanteBase64,
              mimeType: comprobanteMimeType,
            });
          }

          // Generar y agregar PDF de Estado de Cuenta si está activado
          if (adjuntarEstadoCuenta) {
            try {
              const cierreData: CierreOCData = {
                ordenCompra: {
                  id: orden?.id || "",
                  folio: orden?.folio || "",
                  proveedor_nombre: orden?.proveedor_nombre || "Proveedor",
                  fecha_creacion: new Date().toISOString().split('T')[0],
                  total: orden?.total || 0,
                  monto_devoluciones: orden?.monto_devoluciones || 0,
                  total_ajustado: orden?.total_ajustado ?? orden?.total ?? 0,
                },
                productosRecibidos: productosRecibidos.map((p: any) => ({
                  codigo: p.codigo || "",
                  nombre: p.nombre || "Producto",
                  cantidad: p.cantidad || 0,
                  precio_unitario: p.precio_unitario || 0,
                  subtotal: p.subtotal || 0,
                })),
                devoluciones: devolucionesDetalle.map((d: any) => ({
                  codigo: d.productos?.codigo || "",
                  nombre: d.productos?.nombre || "Producto",
                  cantidad: d.cantidad_devuelta || 0,
                  motivo: d.motivo || "",
                  precio_unitario: d.precio_unitario || 0,
                  monto: d.monto || 0,
                })),
              };

              const { base64: pdfBase64, fileName: pdfFileName } = await generarCierreOCPDFBase64(cierreData);
              emailPayload.attachments.push({
                filename: pdfFileName,
                content: pdfBase64,
                mimeType: 'application/pdf',
              });
            } catch (pdfError) {
              console.error("Error generando PDF de Estado de Cuenta:", pdfError);
              // Continuamos sin el PDF si hay error
            }
          }

          const asunto = `Confirmación de Pago - ${orden?.folio} - ALMASA`;
          const { data: emailData, error: emailError } = await supabase.functions.invoke('gmail-api', {
            body: emailPayload,
          });

          // Registrar el correo enviado
          await registrarCorreoEnviado({
            tipo: "pago_proveedor",
            referencia_id: orden?.id || "",
            destinatario: emailDestino,
            asunto: asunto,
            gmail_message_id: emailData?.messageId || null,
            error: emailError?.message || null,
            contenido_preview: `Confirmación de pago de ${orden?.folio}. Monto: $${orden?.total.toLocaleString("es-MX")}`,
          });
          
          // Invalidar queries de correos
          queryClient.invalidateQueries({ queryKey: ["correos-enviados-oc", orden?.id] });

          if (emailError) {
            console.error("Error enviando correo:", emailError);
            toast.warning("Pago registrado, pero no se pudo enviar el correo");
          } else {
            toast.success("Pago registrado y notificación enviada al proveedor");
            return;
          }
        } catch (emailErr: any) {
          console.error("Error enviando correo:", emailErr);
          toast.warning("Pago registrado, pero no se pudo enviar el correo");
          return;
        } finally {
          setEnviandoCorreo(false);
        }
      }
    },
    onSuccess: () => {
      if (!enviarCorreo) {
        toast.success("Pago registrado correctamente");
      }
      queryClient.invalidateQueries({ queryKey: ["ordenes-compra"] });
      queryClient.invalidateQueries({ queryKey: ["proveedor-correos"] });
      resetAndClose();
    },
    onError: (error: Error) => {
      toast.error("Error al registrar pago: " + error.message);
      setUploading(false);
      setEnviandoCorreo(false);
    },
  });

  const resetAndClose = () => {
    setFechaPago(new Date());
    setReferenciaPago("");
    setComprobante(null);
    setEnviarCorreo(false);
    setEmailSeleccionado("otro");
    setEmailManual("");
    setGuardarEmail(false);
    setAdjuntarEstadoCuenta(true);
    onOpenChange(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!referenciaPago.trim()) {
      toast.error("La referencia de pago es requerida");
      return;
    }
    if (!comprobante) {
      toast.error("El comprobante de pago es obligatorio");
      return;
    }
    if (enviarCorreo) {
      const emailDestino = getEmailDestino();
      if (!emailDestino.trim()) {
        toast.error("El correo del proveedor es requerido para enviar la notificación");
        return;
      }
    }
    marcarPagadoMutation.mutate();
  };

  if (!orden) return null;

  const isLoading = marcarPagadoMutation.isPending || uploading || enviandoCorreo;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Pago</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Resumen Visual de Pago */}
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Package className="h-4 w-4 text-primary" />
              RESUMEN DE PAGO
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Folio:</span>
              <span className="font-medium">{orden.folio}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Proveedor:</span>
              <span className="font-medium">{orden.proveedor_nombre}</span>
            </div>
            
            <div className="border-t pt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Original:</span>
                <span className="font-medium">${orden.total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
              </div>
              
              {/* Si hay devoluciones, mostrar desglose detallado */}
              {orden.monto_devoluciones && orden.monto_devoluciones > 0 && (
                <Collapsible open={devolucionesOpen} onOpenChange={setDevolucionesOpen}>
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center justify-between w-full text-sm text-destructive hover:bg-destructive/5 rounded px-2 py-1 -mx-2"
                    >
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        <span>(-) Devoluciones:</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">-${orden.monto_devoluciones.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                        {devolucionesOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-2 ml-2 pl-4 border-l-2 border-destructive/30 space-y-2">
                      {devolucionesDetalle.length > 0 ? (
                        devolucionesDetalle.map((dev: any) => (
                          <div key={dev.id} className="text-xs space-y-0.5">
                            <div className="font-medium text-foreground">
                              {dev.cantidad_devuelta} × {dev.productos?.nombre || 'Producto'}
                            </div>
                            <div className="text-muted-foreground flex justify-between">
                              <span>Motivo: {formatMotivo(dev.motivo)} | ${dev.precio_unitario.toLocaleString("es-MX", { minimumFractionDigits: 2 })} c/u</span>
                              <span className="text-destructive font-medium">-${dev.monto.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-muted-foreground italic">
                          Cargando detalles de devoluciones...
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
              
              {/* Total a pagar */}
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-sm font-medium text-primary">
                    <CheckCircle2 className="h-4 w-4" />
                    TOTAL A PAGAR:
                  </div>
                  <span className="text-lg font-bold text-primary">
                    ${(orden.total_ajustado ?? orden.total).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Fecha de pago */}
          <div className="space-y-2">
            <Label>Fecha de pago *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !fechaPago && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {fechaPago
                    ? format(fechaPago, "PPP", { locale: es })
                    : "Seleccionar fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={fechaPago}
                  onSelect={(date) => date && setFechaPago(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Referencia */}
          <div className="space-y-2">
            <Label htmlFor="referencia">Referencia de pago *</Label>
            <Input
              id="referencia"
              placeholder="Ej: Transferencia BBVA #123456"
              value={referenciaPago}
              onChange={(e) => setReferenciaPago(e.target.value)}
              required
            />
          </div>

          {/* Comprobante - NOW REQUIRED */}
          <div className="space-y-2">
            <Label>Comprobante de pago *</Label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setComprobante(e.target.files?.[0] || null)}
                className="text-sm"
                required
              />
            </div>
            {comprobante && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Upload className="h-3 w-3" />
                {comprobante.name}
              </p>
            )}
          </div>

          {/* Enviar correo al proveedor */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="enviarCorreo"
                checked={enviarCorreo}
                onCheckedChange={(checked) => setEnviarCorreo(checked === true)}
              />
              <Label 
                htmlFor="enviarCorreo" 
                className="text-sm font-normal cursor-pointer flex items-center gap-2"
              >
                <Mail className="h-4 w-4" />
                Enviar comprobante al proveedor por correo
              </Label>
            </div>

            {enviarCorreo && (
              <div className="space-y-3 pl-6">
                <Label className="text-sm">Correo del proveedor *</Label>
                
                {/* Selector de correos guardados - prioriza correos de pagos */}
                <Select value={emailSeleccionado} onValueChange={setEmailSeleccionado}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar correo" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Mostrar contactos que reciben pagos */}
                    {contactosPagos.map((contacto) => (
                      <SelectItem key={contacto.id} value={contacto.id}>
                        <div className="flex items-center gap-2">
                          <span>{contacto.email}</span>
                          {contacto.nombre && (
                            <span className="text-xs text-muted-foreground">({contacto.nombre})</span>
                          )}
                          {contacto.es_principal && (
                            <span className="text-xs text-muted-foreground">★</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                    <SelectItem value="otro">
                      <div className="flex items-center gap-2">
                        <Plus className="h-3 w-3" />
                        Ingresar otro correo
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                {/* Mostrar botón de eliminar si hay correo guardado seleccionado */}
                {emailSeleccionado !== "otro" && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground flex-1">
                      {contactosPagos.find(c => c.id === emailSeleccionado)?.email}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm("¿Eliminar este correo guardado?")) {
                          deleteEmailMutation.mutate(emailSeleccionado);
                        }
                      }}
                      disabled={deleteEmailMutation.isPending}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* Input para correo manual */}
                {emailSeleccionado === "otro" && (
                  <div className="space-y-2">
                    <Input
                      type="email"
                      placeholder="proveedor@email.com"
                      value={emailManual}
                      onChange={(e) => setEmailManual(e.target.value)}
                      className="text-sm"
                    />
                    {orden.proveedor_id && (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="guardarEmail"
                          checked={guardarEmail}
                          onCheckedChange={(checked) => setGuardarEmail(checked === true)}
                        />
                        <Label 
                          htmlFor="guardarEmail" 
                          className="text-xs font-normal cursor-pointer flex items-center gap-1"
                        >
                          <Save className="h-3 w-3" />
                          Guardar este correo para el proveedor
                        </Label>
                      </div>
                    )}
                  </div>
                )}

                {/* Checkbox para adjuntar Estado de Cuenta PDF */}
                <div className="flex items-center space-x-2 pt-2 border-t border-dashed">
                  <Checkbox
                    id="adjuntarEstadoCuenta"
                    checked={adjuntarEstadoCuenta}
                    onCheckedChange={(checked) => setAdjuntarEstadoCuenta(checked === true)}
                  />
                  <Label 
                    htmlFor="adjuntarEstadoCuenta" 
                    className="text-sm font-normal cursor-pointer flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Adjuntar Estado de Cuenta (PDF detallado)
                  </Label>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={resetAndClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {enviandoCorreo ? (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Enviando...
                </>
              ) : enviarCorreo ? (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Confirmar y Enviar
                </>
              ) : (
                "Confirmar Pago"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}