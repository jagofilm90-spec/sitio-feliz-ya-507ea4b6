import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Upload, Loader2, Mail, Send } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface MarcarPagadoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orden: {
    id: string;
    folio: string;
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
  const [emailDestino, setEmailDestino] = useState("");
  const [enviandoCorreo, setEnviandoCorreo] = useState(false);

  // Actualizar email cuando cambia la orden
  useState(() => {
    if (orden?.proveedor_email) {
      setEmailDestino(orden.proveedor_email);
    }
  });

  const marcarPagadoMutation = useMutation({
    mutationFn: async () => {
      let comprobanteUrl: string | null = null;
      let comprobanteBase64: string | null = null;
      let comprobanteNombre: string | null = null;
      let comprobanteMimeType: string | null = null;

      // Upload comprobante if provided
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

      // Send email if requested
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

          const { error: emailError } = await supabase.functions.invoke('gmail-api', {
            body: emailPayload,
          });

          if (emailError) {
            console.error("Error enviando correo:", emailError);
            // No lanzar error, el pago ya se registró
            toast.warning("Pago registrado, pero no se pudo enviar el correo");
          } else {
            toast.success("Pago registrado y notificación enviada al proveedor");
            return; // Exit early to avoid double toast
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
    setEmailDestino(orden?.proveedor_email || "");
    onOpenChange(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!referenciaPago.trim()) {
      toast.error("La referencia de pago es requerida");
      return;
    }
    if (enviarCorreo && !emailDestino.trim()) {
      toast.error("El correo del proveedor es requerido para enviar la notificación");
      return;
    }
    marcarPagadoMutation.mutate();
  };

  // Actualizar email cuando cambia la orden
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && orden?.proveedor_email) {
      setEmailDestino(orden.proveedor_email);
    }
    onOpenChange(newOpen);
  };

  if (!orden) return null;

  const isLoading = marcarPagadoMutation.isPending || uploading || enviandoCorreo;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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

          {/* Comprobante */}
          <div className="space-y-2">
            <Label>Comprobante (opcional)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setComprobante(e.target.files?.[0] || null)}
                className="text-sm"
              />
              {comprobante && (
                <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                  {comprobante.name}
                </span>
              )}
            </div>
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
              <div className="space-y-2 pl-6">
                <Label htmlFor="emailDestino" className="text-sm">
                  Correo del proveedor *
                </Label>
                <Input
                  id="emailDestino"
                  type="email"
                  placeholder="proveedor@email.com"
                  value={emailDestino}
                  onChange={(e) => setEmailDestino(e.target.value)}
                  className="text-sm"
                />
                {!orden.proveedor_email && (
                  <p className="text-xs text-muted-foreground">
                    Este proveedor no tiene correo registrado. Ingrese uno manualmente.
                  </p>
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