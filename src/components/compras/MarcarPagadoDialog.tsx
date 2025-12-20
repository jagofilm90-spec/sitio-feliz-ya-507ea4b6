import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Upload, Loader2, Mail, Send, X, Plus, Save } from "lucide-react";
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
  
  // Estado para envío de correo
  const [enviarCorreo, setEnviarCorreo] = useState(false);
  const [emailSeleccionado, setEmailSeleccionado] = useState<string>("otro");
  const [emailManual, setEmailManual] = useState("");
  const [guardarEmail, setGuardarEmail] = useState(false);
  const [enviandoCorreo, setEnviandoCorreo] = useState(false);

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

      // Update order in database
      const { error } = await supabase
        .from("ordenes_compra")
        .update({
          status_pago: "pagado",
          fecha_pago: fechaPago.toISOString(),
          referencia_pago: referenciaPago,
          comprobante_pago_url: comprobanteUrl,
        })
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
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5; font-weight: bold;">Monto:</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">$${orden?.total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5; font-weight: bold;">Fecha de pago:</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${format(fechaPago, "PPP", { locale: es })}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5; font-weight: bold;">Referencia:</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${referenciaPago}</td>
                </tr>
              </table>
              
              ${comprobante ? '<p>Adjuntamos el comprobante de pago para su referencia.</p>' : ''}
              
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
          };

          // Agregar comprobante como adjunto si existe
          if (comprobanteBase64 && comprobanteNombre && comprobanteMimeType) {
            emailPayload.attachments = [{
              filename: comprobanteNombre,
              content: comprobanteBase64,
              mimeType: comprobanteMimeType,
            }];
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
          {/* Info de la orden */}
          <div className="rounded-lg bg-muted p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Folio:</span>
              <span className="font-medium">{orden.folio}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Proveedor:</span>
              <span className="font-medium">{orden.proveedor_nombre}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-bold text-primary">
                ${orden.total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
              </span>
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