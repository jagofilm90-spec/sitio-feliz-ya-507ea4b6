import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Mail, AlertTriangle, ArrowRight, Package, Calendar, DollarSign } from "lucide-react";
import { registrarCorreoEnviado } from "./HistorialCorreosOC";
import { Badge } from "@/components/ui/badge";
import logoAlmasa from "@/assets/logo-almasa.png";

export interface CambioDetectado {
  tipo: 'cantidad' | 'fecha' | 'precio' | 'producto_agregado' | 'producto_eliminado';
  producto?: string;
  valorAnterior?: string | number;
  valorNuevo?: string | number;
  descripcion: string;
}

interface NotificarCambiosOCDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ordenId: string;
  folio: string;
  proveedorId: string | null;
  proveedorNombre: string;
  cambios: CambioDetectado[];
  onNotificacionEnviada?: () => void;
}

// Helper function to convert image to base64
const getLogoBase64 = async (): Promise<string> => {
  try {
    const response = await fetch(logoAlmasa);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error loading logo:', error);
    return '';
  }
};

const NotificarCambiosOCDialog = ({
  open,
  onOpenChange,
  ordenId,
  folio,
  proveedorId,
  proveedorNombre,
  cambios,
  onNotificacionEnviada,
}: NotificarCambiosOCDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [enviando, setEnviando] = useState(false);
  const [mensajeAdicional, setMensajeAdicional] = useState("");
  const [cambiosSeleccionados, setCambiosSeleccionados] = useState<number[]>(
    cambios.map((_, i) => i) // All selected by default
  );

  // Fetch contact that receives orders for this supplier
  const { data: contactoOrden } = useQuery({
    queryKey: ["proveedor-contacto-ordenes", proveedorId],
    queryFn: async () => {
      if (!proveedorId) return null;
      
      const { data, error } = await supabase
        .from("proveedor_contactos")
        .select("nombre, email")
        .eq("proveedor_id", proveedorId)
        .eq("recibe_ordenes", true)
        .eq("activo", true)
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!proveedorId && open,
  });

  // Fetch supplier email as fallback
  const { data: proveedor } = useQuery({
    queryKey: ["proveedor-email", proveedorId],
    queryFn: async () => {
      if (!proveedorId) return null;
      
      const { data, error } = await supabase
        .from("proveedores")
        .select("email")
        .eq("id", proveedorId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!proveedorId && open,
  });

  const emailDestinatario = contactoOrden?.email || proveedor?.email;

  const toggleCambio = (index: number) => {
    setCambiosSeleccionados(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const getIconForCambio = (tipo: CambioDetectado['tipo']) => {
    switch (tipo) {
      case 'cantidad':
        return <Package className="h-4 w-4 text-blue-500" />;
      case 'fecha':
        return <Calendar className="h-4 w-4 text-amber-500" />;
      case 'precio':
        return <DollarSign className="h-4 w-4 text-green-500" />;
      case 'producto_agregado':
        return <Package className="h-4 w-4 text-green-600" />;
      case 'producto_eliminado':
        return <Package className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    }
  };

  const getBadgeVariant = (tipo: CambioDetectado['tipo']) => {
    switch (tipo) {
      case 'cantidad':
        return 'default';
      case 'fecha':
        return 'secondary';
      case 'precio':
        return 'outline';
      case 'producto_agregado':
        return 'default';
      case 'producto_eliminado':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const handleEnviarNotificacion = async () => {
    if (!emailDestinatario) {
      toast({
        title: "Sin correo",
        description: "Este proveedor no tiene correo registrado para órdenes",
        variant: "destructive",
      });
      return;
    }

    if (cambiosSeleccionados.length === 0) {
      toast({
        title: "Sin cambios seleccionados",
        description: "Selecciona al menos un cambio para notificar",
        variant: "destructive",
      });
      return;
    }

    setEnviando(true);

    try {
      const logoBase64 = await getLogoBase64();
      const cambiosANotificar = cambiosSeleccionados.map(i => cambios[i]);

      // Build HTML table of changes
      const cambiosHTML = cambiosANotificar.map(c => {
        let valorAnteriorDisplay = c.valorAnterior?.toString() || '-';
        let valorNuevoDisplay = c.valorNuevo?.toString() || '-';
        
        return `
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;">${c.producto || 'General'}</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${c.descripcion}</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: center; text-decoration: line-through; color: #999;">${valorAnteriorDisplay}</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: center; font-weight: bold; color: #B45309;">${valorNuevoDisplay}</td>
          </tr>
        `;
      }).join('');

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 20px;">
            ${logoBase64 ? `<img src="${logoBase64}" alt="ALMASA" style="height: 60px;" />` : '<h1 style="color: #B22234;">ALMASA</h1>'}
          </div>
          
          <div style="background-color: #FEF3C7; border: 2px solid #F59E0B; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #92400E; margin-top: 0;">⚠️ MODIFICACIÓN - Orden de Compra: ${folio}</h2>
          </div>
          
          <p>Estimado proveedor <strong>${proveedorNombre.toUpperCase()}</strong>,</p>
          <p>Le informamos que la Orden de Compra <strong>${folio}</strong> ha sido modificada. A continuación los cambios realizados:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background-color: #f8f9fa;">
                <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Producto</th>
                <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Cambio</th>
                <th style="padding: 12px; border: 1px solid #ddd; text-align: center;">Anterior</th>
                <th style="padding: 12px; border: 1px solid #ddd; text-align: center;">Nuevo</th>
              </tr>
            </thead>
            <tbody>
              ${cambiosHTML}
            </tbody>
          </table>
          
          ${mensajeAdicional ? `
            <div style="background-color: #f0f9ff; border-left: 4px solid #0284c7; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #0369a1;"><strong>Nota adicional:</strong></p>
              <p style="margin: 10px 0 0 0;">${mensajeAdicional}</p>
            </div>
          ` : ''}
          
          <p style="color: #666; margin-top: 30px;">
            <strong>Importante:</strong> Por favor tome nota de estos cambios para el cumplimiento de la orden actualizada.
          </p>
          
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;" />
          <p style="color: #666; font-size: 12px;">
            Este correo fue enviado automáticamente desde el sistema de Abarrotes La Manita.<br/>
            Para cualquier duda, favor de comunicarse con nuestro departamento de compras.
          </p>
        </div>
      `;

      const asunto = `⚠️ MODIFICACIÓN OC ${folio} - ${proveedorNombre.toUpperCase()}`;

      // Send email via gmail-api
      const { data, error } = await supabase.functions.invoke('gmail-api', {
        body: {
          action: 'send',
          email: 'compras@almasa.com.mx',
          to: emailDestinatario,
          subject: asunto,
          body: htmlBody,
        },
      });

      if (error) {
        await registrarCorreoEnviado({
          tipo: "modificacion_oc",
          referencia_id: ordenId,
          destinatario: emailDestinatario,
          asunto: asunto,
          gmail_message_id: null,
          error: error.message || "Error desconocido",
        });
        throw error;
      }

      // Register successful send
      const resumenCambios = cambiosANotificar.map(c => c.descripcion).join(', ');
      await registrarCorreoEnviado({
        tipo: "modificacion_oc",
        referencia_id: ordenId,
        destinatario: emailDestinatario,
        asunto: asunto,
        gmail_message_id: data?.messageId || null,
        contenido_preview: `Cambios notificados: ${resumenCambios.substring(0, 200)}`,
      });

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["correos-enviados-oc", ordenId] });
      queryClient.invalidateQueries({ queryKey: ["ordenes_compra"] });

      toast({
        title: "Notificación enviada",
        description: `Se informó al proveedor de los cambios en la OC ${folio}`,
      });

      onNotificacionEnviada?.();
      setMensajeAdicional("");
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error sending modification notification:', error);
      toast({
        title: "Error al enviar",
        description: error.message || "No se pudo enviar la notificación",
        variant: "destructive",
      });
    } finally {
      setEnviando(false);
    }
  };

  if (cambios.length === 0) {
    return null;
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            ¿Notificar cambios al proveedor?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                La orden <strong>{folio}</strong> ha sido modificada. 
                ¿Deseas enviar un correo a <strong>{proveedorNombre}</strong> con los cambios?
              </p>
              
              {emailDestinatario ? (
                <p className="text-xs text-muted-foreground">
                  Se enviará a: {emailDestinatario}
                </p>
              ) : (
                <p className="text-xs text-destructive">
                  ⚠️ Este proveedor no tiene correo registrado
                </p>
              )}

              <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                <Label className="text-xs font-medium text-muted-foreground">
                  Cambios detectados:
                </Label>
                {cambios.map((cambio, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Checkbox
                      id={`cambio-${index}`}
                      checked={cambiosSeleccionados.includes(index)}
                      onCheckedChange={() => toggleCambio(index)}
                    />
                    <label
                      htmlFor={`cambio-${index}`}
                      className="flex-1 flex items-center gap-2 text-sm cursor-pointer"
                    >
                      {getIconForCambio(cambio.tipo)}
                      <span className="flex-1">{cambio.descripcion}</span>
                      {cambio.valorAnterior !== undefined && cambio.valorNuevo !== undefined && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <span className="line-through">{cambio.valorAnterior}</span>
                          <ArrowRight className="h-3 w-3" />
                          <span className="font-medium text-amber-600">{cambio.valorNuevo}</span>
                        </span>
                      )}
                    </label>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="mensaje-adicional" className="text-xs">
                  Mensaje adicional (opcional)
                </Label>
                <Textarea
                  id="mensaje-adicional"
                  placeholder="Ej: Favor de confirmar recepción de estos cambios..."
                  value={mensajeAdicional}
                  onChange={(e) => setMensajeAdicional(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={enviando}>
            No notificar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleEnviarNotificacion();
            }}
            disabled={enviando || !emailDestinatario || cambiosSeleccionados.length === 0}
          >
            {enviando ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Enviar notificación
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default NotificarCambiosOCDialog;
