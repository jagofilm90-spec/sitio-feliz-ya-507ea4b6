import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { COMPANY_DATA } from "@/constants/companyData";
import { getProveedorFiscalHTML } from "@/lib/proveedorUtils";
import { cn, formatCurrency } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarIcon, CheckCircle, XCircle, Mail, Loader2, Pencil, Trash2, FileText, ShieldCheck, ShieldX, Send, Truck, Plus, X, Package, Camera, Scissors, History, AlertTriangle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import ProgramarEntregasDialog from "./ProgramarEntregasDialog";

// ConvertirEntregasMultiplesDialog and DividirEntregaDialog removed - rarely used
import { EvidenciasGallery, EvidenciasBadge } from "./EvidenciasGallery";
import { HistorialCorreosOC, registrarCorreoEnviado } from "./HistorialCorreosOC";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import logoAlmasa from "@/assets/logo-almasa.png";

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

interface OrdenAccionesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orden: any;
  onEdit?: (orden: any) => void;
}

const OrdenAccionesDialog = ({ open, onOpenChange, orden, onEdit }: OrdenAccionesDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [accion, setAccion] = useState<"enviar_email" | "reenviar_email" | "eliminar" | "solicitar_autorizacion" | "autorizar" | "rechazar" | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [enviandoEmail, setEnviandoEmail] = useState(false);
  const [solicitandoAutorizacion, setSolicitandoAutorizacion] = useState(false);
  const [autorizando, setAutorizando] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [programarEntregasOpen, setProgramarEntregasOpen] = useState(false);
  
  // Removed: convertirEntregasOpen, dividirEntregaOpen - rarely used functionality
  const [evidenciasGalleryOpen, setEvidenciasGalleryOpen] = useState(false);
  const [confirmEditOpen, setConfirmEditOpen] = useState(false);
  
  // Email CC functionality
  const [emailTo, setEmailTo] = useState("");
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [newCcEmail, setNewCcEmail] = useState("");

  // Derive ordenId safely to use in hooks
  const ordenId = orden?.id;

  // Fetch pending deliveries count
  const { data: entregasPendientes = 0 } = useQuery({
    queryKey: ["entregas-pendientes", ordenId],
    queryFn: async () => {
      if (!ordenId || !orden?.entregas_multiples) return 0;
      const { count } = await supabase
        .from("ordenes_compra_entregas")
        .select("*", { count: "exact", head: true })
        .eq("orden_compra_id", ordenId)
        .or("fecha_programada.is.null,status.eq.pendiente_fecha");
      return count || 0;
    },
    enabled: !!ordenId && !!orden?.entregas_multiples,
  });

  // Fetch email confirmation status
  const { data: confirmacionProveedor } = useQuery({
    queryKey: ["confirmacion-oc", orden?.id],
    queryFn: async () => {
      if (!orden?.id) return null;
      const { data, error } = await supabase
        .from("ordenes_compra_confirmaciones")
        .select("confirmado_en")
        .eq("orden_compra_id", orden.id)
        .not("confirmado_en", "is", null)
        .single();
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
      return data;
    },
    enabled: !!orden?.id && orden?.status === "enviada",
  });

  // Query to check if there are active receptions (blocks editing)
  const { data: tieneRecepcionesActivas = false } = useQuery({
    queryKey: ["recepciones-activas-oc", orden?.id],
    queryFn: async () => {
      if (!orden?.id) return false;
      const { data, error } = await supabase
        .from("ordenes_compra_entregas")
        .select("id")
        .eq("orden_compra_id", orden.id)
        .or("llegada_registrada_en.not.is.null,recepcion_finalizada_en.not.is.null")
        .limit(1);
      
      if (error) {
        console.error("Error checking recepciones:", error);
        return false;
      }
      return (data?.length || 0) > 0;
    },
    enabled: !!orden?.id,
  });

  // Query para obtener entregas y calcular resumen de estados
  const { data: entregasResumen } = useQuery({
    queryKey: ["entregas-resumen-oc", orden?.id],
    queryFn: async () => {
      if (!orden?.id) return { total: 0, pendientes: 0, enProceso: 0, completadas: 0, rechazadas: 0 };
      const { data, error } = await supabase
        .from("ordenes_compra_entregas")
        .select("id, status, llegada_registrada_en, recepcion_finalizada_en")
        .eq("orden_compra_id", orden.id);
      
      if (error) {
        console.error("Error fetching entregas resumen:", error);
        return { total: 0, pendientes: 0, enProceso: 0, completadas: 0, rechazadas: 0 };
      }
      
      const entregas = data || [];
      const pendientes = entregas.filter(e => 
        e.status === "programada" || e.status === "pendiente_fecha"
      ).length;
      const enProceso = entregas.filter(e => 
        e.llegada_registrada_en && !e.recepcion_finalizada_en && 
        e.status !== "rechazada" && e.status !== "recibida"
      ).length;
      const completadas = entregas.filter(e => e.status === "recibida").length;
      const rechazadas = entregas.filter(e => e.status === "rechazada").length;
      
      return { total: entregas.length, pendientes, enProceso, completadas, rechazadas };
    },
    enabled: !!orden?.id,
  });

  // Fetch current user info
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        // Check if admin
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);
        setIsAdmin(roles?.some(r => r.role === 'admin') || false);
      }
    };
    fetchCurrentUser();
  }, []);

  // Fetch creator profile name
  const { data: creadorProfile } = useQuery({
    queryKey: ["profile", orden?.creado_por],
    queryFn: async () => {
      if (!orden?.creado_por) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", orden.creado_por)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!orden?.creado_por,
  });

  // Fetch authorizer profile name
  const { data: autorizadorProfile } = useQuery({
    queryKey: ["profile", orden?.autorizado_por],
    queryFn: async () => {
      if (!orden?.autorizado_por) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", orden.autorizado_por)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!orden?.autorizado_por,
  });

  const updateOrden = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from("ordenes_compra")
        .update(data)
        .eq("id", orden.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ordenes_compra"] });
      queryClient.invalidateQueries({ queryKey: ["ordenes_calendario"] });
      toast({
        title: "Orden actualizada",
        description: "La orden se ha actualizado correctamente",
      });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteOrden = useMutation({
    mutationFn: async () => {
      // Block deletion of completed/received orders to protect inventory integrity
      if (orden.status === 'completada' || orden.status === 'recibida') {
        throw new Error(
          "No se puede eliminar una orden que ya fue recibida. El inventario ya fue afectado. " +
          "Contacte al administrador para realizar ajustes de inventario si es necesario."
        );
      }

      // Get supplier email before deleting
      const emailDestinatario = orden?.proveedores?.email || orden?.proveedor_email_manual;
      const proveedorNombre = orden?.proveedores?.nombre || orden?.proveedor_nombre_manual || 'Proveedor';
      
      // If order was sent, notify supplier of cancellation
      if (emailDestinatario && (orden.status === 'enviada' || orden.status === 'confirmada')) {
        try {
          const logoBase64 = await getLogoBase64();
          
          // Build products table for cancellation email
          const detalles = orden.ordenes_compra_detalles || [];
          const productosHTML = detalles.map((d: any) => 
            `<tr>
              <td style="padding: 10px; border: 1px solid #ddd;">${d.productos?.codigo || '-'}</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${d.productos?.nombre || 'Producto'}</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${d.cantidad_ordenada}</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">$${d.precio_unitario_compra?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">$${d.subtotal?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
            </tr>`
          ).join('');

          // Format delivery date
          let fechaEntrega = 'Por confirmar';
          if (orden.fecha_entrega_programada) {
            const [year, month, day] = orden.fecha_entrega_programada.split('-').map(Number);
            const fechaLocal = new Date(year, month - 1, day);
            fechaEntrega = fechaLocal.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
          }

          // Build cancellation email
          const htmlBody = `
            <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 20px;">
                ${logoBase64 ? `<img src="${logoBase64}" alt="ALMASA" style="height: 60px;" />` : '<h1 style="color: #B22234;">ALMASA</h1>'}
              </div>
              
              <div style="background-color: #FEE2E2; border: 2px solid #EF4444; border-radius: 8px; padding: 20px; margin-bottom: 20px; text-align: center;">
                <h2 style="color: #DC2626; margin: 0;">❌ ORDEN CANCELADA: ${orden.folio}</h2>
              </div>
              
              <div style="background-color: #f8f9fa; border-left: 4px solid #1e3a5f; padding: 15px; margin-bottom: 20px;">
                <h4 style="margin: 0 0 8px 0; color: #1e3a5f;">🏢 ${COMPANY_DATA.razonSocial}</h4>
                <p style="margin: 3px 0; font-size: 13px;">RFC: ${COMPANY_DATA.rfc}</p>
                <p style="margin: 3px 0; font-size: 13px;">${COMPANY_DATA.direccionCompletaMayusculas}</p>
                <p style="margin: 3px 0; font-size: 13px;">Tel: ${COMPANY_DATA.telefonosFormateados} | ${COMPANY_DATA.emails.compras}</p>
              </div>

              <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin-bottom: 20px;">
                <h4 style="margin: 0 0 8px 0; color: #dc2626;">📦 Proveedor: ${proveedorNombre.toUpperCase()}</h4>
                ${orden.proveedores?.rfc ? `<p style="margin: 3px 0; font-size: 13px;">RFC: ${orden.proveedores.rfc}</p>` : ''}
              </div>

              <div style="background-color: #fee2e2; border: 2px solid #ef4444; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="margin: 0; font-size: 16px; color: #dc2626; text-align: center;">
                  <strong>⚠️ IMPORTANTE: Esta orden ha sido CANCELADA y ya NO debe ser procesada.</strong>
                </p>
              </div>

              <h4 style="color: #1e3a5f; border-bottom: 2px solid #1e3a5f; padding-bottom: 5px;">📋 Productos que estaban en la orden:</h4>
              <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
                <thead>
                  <tr style="background-color: #6b7280; color: white;">
                    <th style="padding: 10px; border: 1px solid #6b7280;">Código</th>
                    <th style="padding: 10px; border: 1px solid #6b7280;">Producto</th>
                    <th style="padding: 10px; border: 1px solid #6b7280; text-align: center;">Cantidad</th>
                    <th style="padding: 10px; border: 1px solid #6b7280; text-align: right;">P. Unit.</th>
                    <th style="padding: 10px; border: 1px solid #6b7280; text-align: right;">Subtotal</th>
                  </tr>
                </thead>
                <tbody style="color: #6b7280;">
                  ${productosHTML}
                </tbody>
              </table>

              <div style="display: flex; justify-content: flex-end; margin: 20px 0;">
                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; min-width: 200px; color: #6b7280;">
                  <div style="display: flex; justify-content: space-between; margin: 5px 0; text-decoration: line-through;">
                    <span>Subtotal:</span>
                    <span>$${orden.subtotal?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin: 5px 0; text-decoration: line-through;">
                    <span>IVA (16%):</span>
                    <span>$${orden.impuestos?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin: 8px 0; padding-top: 8px; border-top: 2px solid #9ca3af; text-decoration: line-through;">
                    <span>TOTAL:</span>
                    <span>$${orden.total?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              <p style="color: #666; margin-top: 30px;">
                Si tiene alguna duda sobre esta cancelación, favor de comunicarse con nuestro departamento de compras.
              </p>
              
              <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;" />
              <p style="color: #666; font-size: 12px; text-align: center;">
                Este correo fue enviado automáticamente desde el sistema de ${COMPANY_DATA.razonSocial}.<br/>
                Para cualquier duda, favor de comunicarse al ${COMPANY_DATA.emails.compras}
              </p>
            </div>
          `;

          // Generate PDF with CANCELLED watermark
          const pdfContent = await generarPDFContent(true);
          const cancelledPdfContent = pdfContent.replace(
            '<div class="order-box">',
            '<div class="order-box" style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%) !important;">'
          ).replace(
            '</title>',
            ' - CANCELADA</title>'
          ).replace(
            '<div class="order-title">Orden de Compra</div>',
            '<div class="order-title">ORDEN CANCELADA</div><div style="background: #fee2e2; color: #dc2626; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; margin-top: 5px;">❌ CANCELADA</div>'
          );
          
          const pdfBase64 = btoa(unescape(encodeURIComponent(cancelledPdfContent)));
          const asunto = `❌ ORDEN CANCELADA: ${orden.folio} - ${proveedorNombre.toUpperCase()}`;

          // Send cancellation email
          const { error: emailError } = await supabase.functions.invoke('gmail-api', {
            body: {
              action: 'send',
              email: 'compras@almasa.com.mx',
              to: emailDestinatario,
              subject: asunto,
              body: htmlBody,
              attachments: [{
                filename: `OC_${orden.folio}_CANCELADA.html`,
                content: pdfBase64,
                mimeType: 'text/html'
              }]
            },
          });

          // Register email in history
          await registrarCorreoEnviado({
            tipo: "cancelacion_oc",
            referencia_id: orden.id,
            destinatario: emailDestinatario,
            asunto: asunto,
            error: emailError?.message || null,
          });

          if (emailError) {
            console.error('Error sending cancellation email:', emailError);
          }
        } catch (emailErr) {
          console.error('Error preparing cancellation email:', emailErr);
          // Continue with deletion even if email fails
        }
      }

      // First delete related notifications
      await supabase
        .from("notificaciones")
        .delete()
        .eq("orden_compra_id", orden.id);

      // Delete order deliveries (entregas múltiples)
      await supabase
        .from("ordenes_compra_entregas")
        .delete()
        .eq("orden_compra_id", orden.id);

      // Delete order details
      const { error: detallesError } = await supabase
        .from("ordenes_compra_detalles")
        .delete()
        .eq("orden_compra_id", orden.id);
      if (detallesError) throw detallesError;

      // Finally delete the order
      const { error } = await supabase
        .from("ordenes_compra")
        .delete()
        .eq("id", orden.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ordenes_compra"] });
      queryClient.invalidateQueries({ queryKey: ["ordenes_calendario"] });
      toast({
        title: "Orden eliminada",
        description: "La orden de compra se ha eliminado y se notificó al proveedor",
      });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setAccion(null);
    setMotivoRechazo("");
    setEmailTo("");
    setCcEmails([]);
    setNewCcEmail("");
  };

  // Initialize email when action changes - support both catalog and manual supplier emails
  useEffect(() => {
    if (accion === "enviar_email" || accion === "reenviar_email") {
      // Priority: catalog supplier email, then manual supplier email
      const email = orden?.proveedores?.email || orden?.proveedor_email_manual;
      if (email) {
        setEmailTo(email);
      }
    }
  }, [accion, orden?.proveedores?.email, orden?.proveedor_email_manual]);

  // Safety check: if orden is invalid, show error dialog (placed after all hooks)
  if (!ordenId) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            No se pudo cargar la información de la orden. Por favor, cierra e intenta de nuevo.
          </p>
          <Button onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogContent>
      </Dialog>
    );
  }

  const handleAddCcEmail = () => {
    const email = newCcEmail.trim();
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !ccEmails.includes(email)) {
      setCcEmails([...ccEmails, email]);
      setNewCcEmail("");
    }
  };

  const handleRemoveCcEmail = (emailToRemove: string) => {
    setCcEmails(ccEmails.filter(e => e !== emailToRemove));
  };

  // handleCambiarFecha and handleMarcarDevuelta removed - editing is done via onEdit
  // handleMarcarRecibida removed - reception is done by warehouse



  const generarPDFContent = async (incluirAutorizacion: boolean = false) => {
    // Fetch logo as base64
    const logoBase64 = await getLogoBase64();
    
    // Fetch scheduled deliveries if order has multiple deliveries
    let entregasProgramadas: any[] = [];
    if (orden.entregas_multiples) {
      const { data: entregas } = await supabase
        .from("ordenes_compra_entregas")
        .select("*")
        .eq("orden_compra_id", orden.id)
        .order("numero_entrega", { ascending: true });
      entregasProgramadas = entregas || [];
    }

    const detalles = orden.ordenes_compra_detalles || [];
    const productosHTML = detalles.map((d: any) => 
      `<tr>
        <td style="padding: 10px; border: 1px solid #333;">${d.productos?.codigo || '-'}</td>
        <td style="padding: 10px; border: 1px solid #333;">${d.productos?.nombre || 'Producto'}</td>
        <td style="padding: 10px; border: 1px solid #333; text-align: center;">${d.cantidad_ordenada}</td>
        <td style="padding: 10px; border: 1px solid #333; text-align: right;">$${d.precio_unitario_compra?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
        <td style="padding: 10px; border: 1px solid #333; text-align: right;">$${d.subtotal?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
      </tr>`
    ).join('');

    // Build delivery schedule section with new design
    let entregasHTML = '';
    if (entregasProgramadas.length > 0) {
      const entregasRows = entregasProgramadas.map((e: any) => {
        let fecha = '<span style="color: #d4a024; font-style: italic;">Pendiente de programar</span>';
        if (e.fecha_programada) {
          const [year, month, day] = e.fecha_programada.split('-').map(Number);
          const fechaLocal = new Date(year, month - 1, day);
          fecha = fechaLocal.toLocaleDateString('es-MX', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        }
        return `<tr>
          <td style="text-align: center;">${e.numero_entrega}</td>
          <td>${fecha}</td>
          <td style="text-align: center;">${e.cantidad_bultos} bultos</td>
        </tr>`;
      }).join('');

      entregasHTML = `
        <div class="entregas-section">
          <h3>📅 Calendario de Entregas Programadas</h3>
          <table>
            <thead>
              <tr>
                <th style="width: 80px; text-align: center;">Entrega #</th>
                <th>Fecha Programada</th>
                <th style="width: 120px; text-align: center;">Cantidad</th>
              </tr>
            </thead>
            <tbody>
              ${entregasRows}
            </tbody>
          </table>
        </div>
      `;
    }

    const fechaOrden = new Date(orden.fecha_orden).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    let fechaEntrega = 'Por confirmar';
    if (orden.fecha_entrega_programada) {
      // Parse date correctly to avoid timezone issues
      const [year, month, day] = orden.fecha_entrega_programada.split('-').map(Number);
      const fechaLocal = new Date(year, month - 1, day);
      fechaEntrega = fechaLocal.toLocaleDateString('es-MX', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }

    // Get creator and authorizer names
    const nombreCreador = creadorProfile?.full_name || 'Usuario';
    const nombreAutorizador = incluirAutorizacion && autorizadorProfile?.full_name 
      ? autorizadorProfile.full_name 
      : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Orden de Compra ${orden.folio}</title>
        <style>
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
          * { box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Arial, sans-serif; 
            padding: 30px 40px; 
            max-width: 850px; 
            margin: 0 auto;
            font-size: 11px;
            color: #1a1a1a;
            background: #fff;
          }
          .header { 
            display: flex; 
            justify-content: space-between; 
            align-items: flex-start;
            padding-bottom: 20px;
            margin-bottom: 25px;
            border-bottom: 3px solid #1e3a5f;
          }
          .company-info { 
            flex: 1;
          }
          .company-logo {
            font-size: 28px; 
            font-weight: 800; 
            color: #1e3a5f;
            margin: 0 0 5px 0;
            letter-spacing: -0.5px;
          }
          .company-logo span {
            color: #d4a024;
          }
          .company-subtitle {
            font-size: 10px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 12px;
          }
          .company-details { 
            font-size: 10px; 
            color: #444;
            line-height: 1.5;
          }
          .company-details strong {
            color: #1e3a5f;
          }
          .order-box { 
            text-align: right;
            background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            min-width: 200px;
          }
          .order-title { 
            font-size: 10px; 
            text-transform: uppercase;
            letter-spacing: 2px;
            opacity: 0.9;
            margin-bottom: 5px;
          }
          .folio { 
            font-size: 22px; 
            font-weight: 700; 
            margin: 5px 0;
          }
          .order-date {
            font-size: 10px;
            opacity: 0.9;
          }
          .status-badge {
            display: inline-block;
            background: #d4a024;
            color: #1e3a5f;
            padding: 3px 10px;
            border-radius: 12px;
            font-size: 9px;
            font-weight: 600;
            text-transform: uppercase;
            margin-top: 8px;
          }
          .info-grid {
            display: flex;
            gap: 20px;
            margin-bottom: 25px;
          }
          .info-box {
            flex: 1;
            background: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            border-left: 4px solid #1e3a5f;
          }
          .info-box.delivery {
            border-left-color: #d4a024;
          }
          .info-box h3 { 
            margin: 0 0 10px 0; 
            font-size: 10px; 
            color: #1e3a5f;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .info-box p { 
            margin: 3px 0; 
            font-size: 11px;
            color: #333;
          }
          .info-box .highlight {
            font-weight: 600;
            color: #1e3a5f;
            font-size: 12px;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          th { 
            background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
            color: white; 
            padding: 12px 10px; 
            text-align: left;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-weight: 600;
          }
          td { 
            padding: 10px; 
            border-bottom: 1px solid #e0e0e0;
            font-size: 11px; 
            background: #fff;
          }
          tbody tr:nth-child(even) td {
            background: #f8f9fa;
          }
          tbody tr:hover td {
            background: #f0f4f8;
          }
          .totals { 
            margin-top: 20px; 
            display: flex;
            justify-content: flex-end;
          }
          .totals-box {
            width: 280px;
            background: #f8f9fa;
            border-radius: 6px;
            overflow: hidden;
          }
          .totals-box .row {
            display: flex;
            justify-content: space-between;
            padding: 10px 15px;
            border-bottom: 1px solid #e0e0e0;
          }
          .totals-box .row:last-child {
            border-bottom: none;
          }
          .totals-box .total-row { 
            background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
            color: white; 
            font-weight: bold;
            font-size: 14px;
          }
          .entregas-section {
            margin-top: 25px;
            background: #f8f9fa;
            border-radius: 6px;
            padding: 15px;
          }
          .entregas-section h3 {
            margin: 0 0 15px 0;
            font-size: 11px;
            color: #1e3a5f;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .entregas-section table {
            margin: 0;
            box-shadow: none;
          }
          .entregas-section th {
            background: #d4a024;
            color: #1e3a5f;
          }
          .notes { 
            margin-top: 25px; 
            padding: 15px; 
            background: linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%);
            border-left: 4px solid #d4a024;
            border-radius: 0 6px 6px 0;
          }
          .notes h4 { 
            margin: 0 0 8px 0;
            color: #1e3a5f;
            font-size: 11px;
            text-transform: uppercase;
          }
          .notes p {
            margin: 0;
            color: #333;
            line-height: 1.5;
          }
          .signature-section {
            display: flex;
            justify-content: space-between;
            margin-top: 50px;
            padding-top: 20px;
          }
          .signature-box {
            width: 180px;
            text-align: center;
          }
          .signature-line {
            border-top: 2px solid #1e3a5f;
            margin-top: 60px;
            padding-top: 8px;
            font-size: 10px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .signature-name {
            font-weight: 600;
            margin-top: 5px;
            font-size: 11px;
            color: #1e3a5f;
          }
          .footer { 
            margin-top: 40px; 
            text-align: center; 
            font-size: 9px; 
            color: #999;
            border-top: 1px solid #e0e0e0;
            padding-top: 15px;
          }
          .footer p {
            margin: 3px 0;
          }
          @page { margin: 1cm; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-info">
            ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" style="height: 70px; margin-bottom: 10px;">` : ''}
            <div class="company-details">
              <strong>${COMPANY_DATA.razonSocial}</strong><br>
              RFC: ${COMPANY_DATA.rfc}<br>
              ${COMPANY_DATA.direccionCortaMayusculas}<br>
              Tel: ${COMPANY_DATA.telefonosFormateados}<br>
              ${COMPANY_DATA.emails.compras}
            </div>
          </div>
          <div class="order-box">
            <div class="order-title">Orden de Compra</div>
            <div class="folio">${orden.folio}</div>
            <div class="order-date">${fechaOrden}</div>
            <div class="status-badge">${orden.status?.toUpperCase()}</div>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-box">
            <h3>Proveedor</h3>
            ${getProveedorFiscalHTML(orden.proveedores)}
          </div>
          ${!orden.entregas_multiples ? `
            <div class="info-box delivery">
              <h3>Entrega Programada</h3>
              <p class="highlight">${fechaEntrega}</p>
              <p style="font-size: 11px; margin-top: 5px;">Lugar: ${COMPANY_DATA.direccionCompletaMayusculas}</p>
            </div>
          ` : ''}
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 80px;">Código</th>
              <th>Producto</th>
              <th style="width: 80px; text-align: center;">Cantidad</th>
              <th style="width: 100px; text-align: right;">Precio Unit.</th>
              <th style="width: 100px; text-align: right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${productosHTML}
          </tbody>
        </table>

        <div class="totals">
          <div class="totals-box">
            <div class="row">
              <span>Subtotal:</span>
              <span>$${orden.subtotal?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
            </div>
            <div class="row">
              <span>IVA (16%):</span>
              <span>$${orden.impuestos?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
            </div>
            <div class="row total-row">
              <span>TOTAL:</span>
              <span>$${orden.total?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        ${entregasHTML}

        ${orden.notas ? `
          <div class="notes">
            <h4>📝 Notas</h4>
            <p>${orden.notas}</p>
          </div>
        ` : ''}

        <div class="signature-section">
          <div class="signature-box">
            <div class="signature-line">Elaboró</div>
            <div class="signature-name">${nombreCreador}</div>
          </div>
          <div class="signature-box">
            <div class="signature-line">Autorizó</div>
            ${nombreAutorizador ? `<div class="signature-name">${nombreAutorizador}</div>` : ''}
          </div>
          <div class="signature-box">
            <div class="signature-line">Recibió Proveedor</div>
          </div>
        </div>

        <div class="footer">
          <p>Documento generado el ${new Date().toLocaleString('es-MX')}</p>
          <p><strong>${COMPANY_DATA.razonSocial}</strong> | ${COMPANY_DATA.emails.compras} | Tel: ${COMPANY_DATA.telefonos.principal}</p>
        </div>
      </body>
      </html>
    `;
  };

  const handleGenerarPDF = async () => {
    try {
      const pdfContent = await generarPDFContent(!!orden.autorizado_por);

      // Create a blob URL and open it - less likely to be blocked
      const blob = new Blob([pdfContent], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);
      
      // Try window.open first
      const printWindow = window.open(blobUrl, '_blank');
      
      if (printWindow) {
        // Wait for content to load then trigger print
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 500);
        };
        
        toast({
          title: "PDF generado",
          description: "Puedes imprimir o guardar como PDF desde el diálogo de impresión",
        });
      } else {
        // Fallback: use iframe if popup was blocked
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = 'none';
        document.body.appendChild(iframe);
        
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
          iframeDoc.open();
          iframeDoc.write(pdfContent);
          iframeDoc.close();
          
          setTimeout(() => {
            iframe.contentWindow?.print();
            // Remove iframe after printing
            setTimeout(() => {
              document.body.removeChild(iframe);
            }, 1000);
          }, 500);
          
          toast({
            title: "PDF generado",
            description: "Puedes imprimir o guardar como PDF desde el diálogo de impresión",
          });
        }
      }
      
      // Clean up blob URL after a delay
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "No se pudo generar el PDF",
        variant: "destructive",
      });
    }
  };

  const handleSolicitarAutorizacion = async () => {
    setSolicitandoAutorizacion(true);

    try {
      // Get current user name
      const { data: { user } } = await supabase.auth.getUser();
      let nombreSolicitante = 'Usuario';
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();
        nombreSolicitante = profile?.full_name || 'Usuario';
      }

      // Update order status first
      const { error: statusError } = await supabase
        .from("ordenes_compra")
        .update({ status: "pendiente_autorizacion" })
        .eq("id", orden.id);
      
      if (statusError) {
        console.error("Error updating order status:", statusError);
        // Continue anyway to create notification
      }

      // Create notification for admin (internal notification system)
      const { error: notifError } = await supabase
        .from("notificaciones")
        .insert({
          tipo: "autorizacion_oc",
          titulo: `Autorización requerida: ${orden.folio}`,
          descripcion: `${nombreSolicitante} solicita autorización para la orden de compra a ${orden.proveedores?.nombre || 'proveedor'} por $${orden.total?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
          orden_compra_id: orden.id,
          leida: false,
        });

      if (notifError) {
        console.error('Error creating notification:', notifError);
        // Continue anyway, the order status was updated
      }

      queryClient.invalidateQueries({ queryKey: ["ordenes_compra"] });

      toast({
        title: "Solicitud enviada",
        description: "La solicitud de autorización está pendiente. El administrador la verá en sus notificaciones.",
      });
      
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error('Error sending authorization request:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo enviar la solicitud",
        variant: "destructive",
      });
    } finally {
      setSolicitandoAutorizacion(false);
    }
  };

  const handleAutorizar = async () => {
    setAutorizando(true);

    try {
      // Update order with authorization
      await supabase
        .from("ordenes_compra")
        .update({ 
          status: "autorizada",
          autorizado_por: currentUserId,
          fecha_autorizacion: new Date().toISOString()
        })
        .eq("id", orden.id);

      // Mark related notification as read
      await supabase
        .from("notificaciones")
        .update({ leida: true })
        .eq("orden_compra_id", orden.id)
        .eq("tipo", "autorizacion_oc");

      // Create internal notification for the creator
      const { data: adminProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", currentUserId)
        .single();

      await supabase
        .from("notificaciones")
        .insert({
          tipo: "oc_autorizada",
          titulo: `Orden ${orden.folio} autorizada`,
          descripcion: `Tu orden de compra a ${orden.proveedores?.nombre || 'proveedor'} ha sido autorizada por ${adminProfile?.full_name || 'Administrador'}. Ya puedes enviarla al proveedor.`,
          orden_compra_id: orden.id,
          leida: false,
        });

      queryClient.invalidateQueries({ queryKey: ["ordenes_compra"] });
      queryClient.invalidateQueries({ queryKey: ["notificaciones"] });

      toast({
        title: "Orden autorizada",
        description: "La orden fue autorizada. El creador puede enviarla al proveedor.",
      });
      
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error('Error authorizing order:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo autorizar la orden",
        variant: "destructive",
      });
    } finally {
      setAutorizando(false);
    }
  };

  const handleRechazar = async () => {
    if (!motivoRechazo.trim()) {
      toast({
        title: "Motivo requerido",
        description: "Indica el motivo del rechazo",
        variant: "destructive",
      });
      return;
    }

    setAutorizando(true);

    try {
      // Update order status
      await supabase
        .from("ordenes_compra")
        .update({ 
          status: "rechazada",
          rechazado_por: currentUserId,
          fecha_rechazo: new Date().toISOString(),
          motivo_rechazo: motivoRechazo
        })
        .eq("id", orden.id);

      // Mark related notification as read
      await supabase
        .from("notificaciones")
        .update({ leida: true })
        .eq("orden_compra_id", orden.id)
        .eq("tipo", "autorizacion_oc");

      // Notify creator about rejection
      const creadorEmail = await getCreadorEmail();
      if (creadorEmail) {
        const { data: adminProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", currentUserId)
          .single();

        await supabase.functions.invoke('gmail-api', {
          body: {
            action: 'send',
            email: 'compras@almasa.com.mx',
            to: creadorEmail,
            subject: `[RECHAZADA] Orden de Compra ${orden.folio}`,
            body: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #d32f2f;">✗ Orden Rechazada</h2>
                <p>La orden de compra <strong>${orden.folio}</strong> ha sido rechazada.</p>
                <div style="background-color: #ffebee; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 5px 0;"><strong>Rechazado por:</strong> ${adminProfile?.full_name || 'Administrador'}</p>
                  <p style="margin: 5px 0;"><strong>Motivo:</strong> ${motivoRechazo}</p>
                </div>
                <p>Por favor revisa la orden y realiza las correcciones necesarias.</p>
              </div>
            `,
          },
        });
      }

      queryClient.invalidateQueries({ queryKey: ["ordenes_compra"] });

      toast({
        title: "Orden rechazada",
        description: "Se notificó al creador sobre el rechazo",
      });
      
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error('Error rejecting order:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo rechazar la orden",
        variant: "destructive",
      });
    } finally {
      setAutorizando(false);
    }
  };

  const getCreadorEmail = async (): Promise<string | null> => {
    if (!orden?.creado_por) return null;
    const { data } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", orden.creado_por)
      .single();
    return data?.email || null;
  };

  const handleEnviarOrden = async () => {
    const destinatario = emailTo.trim();
    if (!destinatario) {
      toast({
        title: "Sin correo",
        description: "Ingresa un correo de destino",
        variant: "destructive",
      });
      return;
    }

    setEnviandoEmail(true);

    try {
      // Generate PDF content
      const pdfContent = await generarPDFContent(!!orden.autorizado_por);
      
      // Convert HTML to base64 for attachment
      const pdfBase64 = btoa(unescape(encodeURIComponent(pdfContent)));

      // Get fecha_entrega for the propose-date action
      const fechaEntrega = orden.fecha_entrega ? new Date(orden.fecha_entrega).toISOString().split('T')[0] : null;

      // Generate signed confirmation URL via edge function
      const { data: confirmUrlData, error: confirmUrlError } = await supabase.functions.invoke("generate-oc-confirmation-url", {
        body: {
          ordenId: orden.id,
          action: "confirm",
        },
      });

      if (confirmUrlError || !confirmUrlData?.url) {
        console.error("Error generating confirm URL:", confirmUrlError);
        throw new Error("No se pudo generar URL de confirmación");
      }

      // Generate signed propose-date URL
      const { data: proposeDateUrlData, error: proposeDateUrlError } = await supabase.functions.invoke("generate-oc-confirmation-url", {
        body: {
          ordenId: orden.id,
          action: "propose-date",
          fechaOriginal: fechaEntrega,
        },
      });

      if (proposeDateUrlError || !proposeDateUrlData?.url) {
        console.error("Error generating propose-date URL:", proposeDateUrlError);
        throw new Error("No se pudo generar URL de propuesta de fecha");
      }

      const confirmUrl = confirmUrlData.url;
      const proposeDateUrl = proposeDateUrlData.url;
      const trackingPixelUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/confirmar-oc?id=${orden.id}&action=track`;

      // Get logo URL from current origin
      const logoUrl = `${window.location.origin}/logo-almasa-header.png`;

      // Email body with two action buttons: confirm and propose new date
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <div style="text-align: center; padding: 20px; background-color: #f8f9fa; border-radius: 8px 8px 0 0; border-bottom: 3px solid #c41e3a;">
            <img src="${logoUrl}" alt="Abarrotes La Manita" style="max-width: 180px; height: auto;" />
          </div>
          <div style="padding: 20px;">
          <h2 style="color: #2e7d32; margin-top: 0;">Orden de Compra: ${orden.folio}</h2>
          <p>Estimado proveedor <strong>${orden.proveedores?.nombre}</strong>,</p>
          <p>Por medio del presente, le enviamos nuestra orden de compra.</p>
          <p><strong>Adjunto encontrará el documento formal de la orden de compra en formato HTML que puede abrir en cualquier navegador e imprimir.</strong></p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Folio:</strong> ${orden.folio}</p>
            <p style="margin: 5px 0;"><strong>Total:</strong> $${orden.total?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
            <p style="margin: 5px 0;"><strong>Fecha de la orden:</strong> ${new Date(orden.fecha_orden).toLocaleDateString('es-MX')}</p>
            ${fechaEntrega ? `<p style="margin: 5px 0;"><strong>Fecha de entrega solicitada:</strong> ${new Date(fechaEntrega).toLocaleDateString('es-MX')}</p>` : ''}
          </div>
          
          ${orden.notas ? `<p><strong>Notas:</strong> ${orden.notas}</p>` : ''}

          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #333; font-size: 14px; margin-bottom: 20px;">
              <strong>¿Puede cumplir con la fecha de entrega?</strong>
            </p>
            
            <div style="display: inline-block;">
              <a href="${confirmUrl}" 
                 style="display: inline-block; background-color: #22c55e; color: white; padding: 14px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; margin: 5px;">
                ✓ Confirmar Fecha
              </a>
              
              <a href="${proposeDateUrl}" 
                 style="display: inline-block; background-color: #f59e0b; color: white; padding: 14px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; margin: 5px;">
                📅 Proponer Otra Fecha
              </a>
            </div>
            
            <p style="color: #666; font-size: 12px; margin-top: 15px;">
              Si puede cumplir con la fecha, haga clic en "Confirmar Fecha".<br/>
              Si necesita cambiar la fecha, haga clic en "Proponer Otra Fecha".
            </p>
          </div>

          <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;" />
          <p style="color: #666; font-size: 12px;">
            Este correo fue enviado desde el sistema de Abarrotes La Manita.<br/>
            <strong>Importante:</strong> Su respuesta nos ayuda a planificar mejor nuestras operaciones.
          </p>
          <img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />
          </div>
        </div>
      `;

      // Prepare attachment
      const attachments = [
        {
          filename: `Orden_Compra_${orden.folio}.html`,
          content: pdfBase64,
          mimeType: 'text/html'
        }
      ];

      // 1. Send email to supplier (with CC if provided)
      const emailPayload: any = {
        action: 'send',
        email: 'compras@almasa.com.mx',
        to: destinatario,
        subject: `Orden de Compra ${orden.folio} - Abarrotes La Manita`,
        body: htmlBody,
        attachments: attachments,
      };
      
      if (ccEmails.length > 0) {
        emailPayload.cc = ccEmails.join(',');
      }

      const { data, error } = await supabase.functions.invoke('gmail-api', {
        body: emailPayload,
      });

      // Registrar el correo enviado (exitoso o con error)
      const asunto = `Orden de Compra ${orden.folio} - Abarrotes La Manita`;
      if (error) {
        const tipoCorreo = accion === "reenviar_email" ? "reenvio_oc" : "orden_compra";
        await registrarCorreoEnviado({
          tipo: tipoCorreo,
          referencia_id: orden.id,
          destinatario: destinatario,
          asunto: asunto,
          gmail_message_id: null,
          error: error.message || "Error desconocido",
        });
        throw error;
      }

      // Registrar envío exitoso
      const tipoCorreoExito = accion === "reenviar_email" ? "reenvio_oc" : "orden_compra";
      await registrarCorreoEnviado({
        tipo: tipoCorreoExito,
        referencia_id: orden.id,
        destinatario: destinatario,
        asunto: asunto,
        gmail_message_id: data?.messageId || null,
        contenido_preview: `Orden de compra ${accion === "reenviar_email" ? "reenviada" : "enviada"} a ${orden.proveedores?.nombre}. Total: $${orden.total?.toLocaleString('es-MX')}`,
      });

      // Invalidar queries de correos
      queryClient.invalidateQueries({ queryKey: ["correos-enviados-oc", orden.id] });

      // 2. Send copy notification to compras@almasa.com.mx
      const copyHtmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333333; background-color: #ffffff;">
          <div style="text-align: center; padding: 20px; background-color: #f8f9fa; border-radius: 8px 8px 0 0; border-bottom: 3px solid #c41e3a;">
            <img src="${logoUrl}" alt="Abarrotes La Manita" style="max-width: 180px; height: auto;" />
          </div>
          <div style="padding: 20px;">
          <h2 style="color: #2e7d32; margin-top: 0;">✓ Orden de Compra Enviada</h2>
          <p style="color: #333333;">Se ha enviado la siguiente orden de compra al proveedor:</p>
          
          <div style="background-color: #e8f5e9; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2e7d32; color: #1a1a1a;">
            <p style="margin: 5px 0; color: #1a1a1a;"><strong style="color: #1a1a1a;">Folio:</strong> ${orden.folio}</p>
            <p style="margin: 5px 0; color: #1a1a1a;"><strong style="color: #1a1a1a;">Proveedor:</strong> ${orden.proveedores?.nombre}</p>
            <p style="margin: 5px 0; color: #1a1a1a;"><strong style="color: #1a1a1a;">Email del proveedor:</strong> ${destinatario}</p>
            ${ccEmails.length > 0 ? `<p style="margin: 5px 0; color: #1a1a1a;"><strong style="color: #1a1a1a;">CC:</strong> ${ccEmails.join(', ')}</p>` : ''}
            <p style="margin: 5px 0; color: #1a1a1a;"><strong style="color: #1a1a1a;">Total:</strong> $${orden.total?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
            <p style="margin: 5px 0; color: #1a1a1a;"><strong style="color: #1a1a1a;">Fecha de la orden:</strong> ${new Date(orden.fecha_orden).toLocaleDateString('es-MX')}</p>
            <p style="margin: 5px 0; color: #1a1a1a;"><strong style="color: #1a1a1a;">Enviado:</strong> ${new Date().toLocaleString('es-MX')}</p>
          </div>
          
          <p style="color: #333333;">Adjunto encontrarás una copia del documento enviado al proveedor.</p>
          
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;" />
          <p style="color: #666666; font-size: 12px;">
            Notificación automática del sistema ERP - Abarrotes La Manita
          </p>
          </div>
        </div>
      `;

      // Send copy to internal email (don't fail if this fails)
      try {
        await supabase.functions.invoke('gmail-api', {
          body: {
            action: 'send',
            email: 'compras@almasa.com.mx',
            to: 'compras@almasa.com.mx',
            subject: `[COPIA ENVIADA] OC ${orden.folio} enviada a ${orden.proveedores?.nombre}`,
            body: copyHtmlBody,
            attachments: attachments,
          },
        });
        console.log('Copy email sent to compras@almasa.com.mx');
      } catch (copyError) {
        console.error('Error sending copy email:', copyError);
        // Don't fail the main operation if copy fails
      }

      // Update order status to "enviada" and record send time
      await supabase
        .from("ordenes_compra")
        .update({ 
          status: "enviada",
          email_enviado_en: new Date().toISOString()
        })
        .eq("id", orden.id);

      queryClient.invalidateQueries({ queryKey: ["ordenes_compra"] });

      const ccInfo = ccEmails.length > 0 ? ` (CC: ${ccEmails.join(', ')})` : '';
      toast({
        title: "Orden enviada",
        description: `La orden se envió a ${destinatario}${ccInfo} y una copia a compras@almasa.com.mx`,
      });
      
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error('Error sending order email:', error);
      toast({
        title: "Error al enviar",
        description: error.message || "No se pudo enviar el correo",
        variant: "destructive",
      });
    } finally {
      setEnviandoEmail(false);
    }
  };

  // Helper to show status badge
  const getStatusBadge = () => {
    const status = orden?.status;
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      pendiente: { variant: "outline", label: "Pendiente" },
      pendiente_autorizacion: { variant: "secondary", label: "Esperando Autorización" },
      autorizada: { variant: "default", label: "Autorizada" },
      rechazada: { variant: "destructive", label: "Rechazada" },
      enviada: { variant: "default", label: "Enviada" },
      parcial: { variant: "secondary", label: "Recepción Parcial" },
      recibida: { variant: "default", label: "Recibida" },
      devuelta: { variant: "destructive", label: "Devuelta" },
    };
    const config = statusConfig[status] || { variant: "outline", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Flujo simplificado: No se requiere autorización, OCs se envían automáticamente al crear
  const canRequestAuthorization = false; // Deshabilitado - flujo simplificado
  const canAuthorize = false; // Deshabilitado - flujo simplificado
  const canSendToSupplier = orden?.status === "pendiente"; // Permitir envío manual desde pendiente
  const proveedorTieneEmail = !!(orden?.proveedores?.email || orden?.proveedor_email_manual);

  // Mark as sent without email (for informal suppliers) - still sends internal copy
  const handleMarcarComoEnviada = async () => {
    setEnviandoEmail(true);
    try {
      // Generate PDF content for the internal copy
      const pdfContent = await generarPDFContent(!!orden.autorizado_por);
      const pdfBase64 = btoa(unescape(encodeURIComponent(pdfContent)));

      // Send internal copy email to compras@almasa.com.mx
      const copyHtmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2e7d32;">📋 Orden de Compra Registrada (Control Interno)</h2>
          <p>Se ha registrado la siguiente orden de compra para un proveedor sin correo electrónico:</p>
          
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <p style="margin: 5px 0;"><strong>⚠️ Proveedor sin correo:</strong> Esta orden NO fue enviada por email al proveedor.</p>
          </div>

          <div style="background-color: #e8f5e9; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2e7d32;">
            <p style="margin: 5px 0;"><strong>Folio:</strong> ${orden.folio}</p>
            <p style="margin: 5px 0;"><strong>Proveedor:</strong> ${orden.proveedores?.nombre}</p>
            <p style="margin: 5px 0;"><strong>Total:</strong> $${orden.total?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
            <p style="margin: 5px 0;"><strong>Fecha de la orden:</strong> ${new Date(orden.fecha_orden).toLocaleDateString('es-MX')}</p>
            <p style="margin: 5px 0;"><strong>Registrado:</strong> ${new Date().toLocaleString('es-MX')}</p>
          </div>
          
          <p>Adjunto encontrarás el documento de la orden de compra.</p>
          
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;" />
          <p style="color: #666; font-size: 12px;">
            Notificación automática del sistema ERP - Abarrotes La Manita
          </p>
        </div>
      `;

      const attachments = [
        {
          filename: `Orden_Compra_${orden.folio}.html`,
          content: pdfBase64,
          mimeType: 'text/html'
        }
      ];

      await supabase.functions.invoke('gmail-api', {
        body: {
          action: 'send',
          email: 'compras@almasa.com.mx',
          to: 'compras@almasa.com.mx',
          subject: `[CONTROL INTERNO] OC ${orden.folio} - ${orden.proveedores?.nombre} (sin correo)`,
          body: copyHtmlBody,
          attachments: attachments,
        },
      });

      // Update order status
      await supabase
        .from("ordenes_compra")
        .update({ 
          status: "enviada",
          email_enviado_en: null // No email was sent to supplier
        })
        .eq("id", orden.id);

      queryClient.invalidateQueries({ queryKey: ["ordenes_compra"] });

      toast({
        title: "Orden registrada",
        description: "La orden se marcó como enviada y se envió copia a compras@almasa.com.mx",
      });
      
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error('Error marking order as sent:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la orden",
        variant: "destructive",
      });
    } finally {
      setEnviandoEmail(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            Gestionar Orden {orden?.folio}
            {getStatusBadge()}
            {!proveedorTieneEmail && (
              <Badge variant="outline" className="text-muted-foreground">
                Sin correo
              </Badge>
            )}
            {orden?.status === "enviada" && orden?.email_enviado_en && (
              <div className="flex items-center gap-2 ml-auto">
                {orden?.email_leido_en && (
                  <Badge variant="outline" className="text-blue-600 border-blue-300">
                    <Mail className="h-3 w-3 mr-1" />
                    Leído
                  </Badge>
                )}
                {confirmacionProveedor?.confirmado_en ? (
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Confirmado por proveedor
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-amber-600 border-amber-300">
                    <Mail className="h-3 w-3 mr-1" />
                    Pendiente confirmación
                  </Badge>
                )}
              </div>
            )}
            {orden?.status === "enviada" && !orden?.email_enviado_en && (
              <Badge variant="outline" className="text-muted-foreground ml-auto">
                Control interno
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {orden?.status === "rechazada" && orden?.motivo_rechazo && (
              <span className="text-destructive">Motivo rechazo: {orden.motivo_rechazo}</span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* ====== RESUMEN DE LA ORDEN ====== */}
        <div className="bg-muted/30 border rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Resumen de la Orden</span>
          </div>
          
          {/* Info del proveedor y fecha */}
          <div className="text-sm space-y-1">
            <p>
              <span className="text-muted-foreground">Proveedor:</span>{" "}
              {orden?.proveedores?.nombre || orden?.proveedor_nombre_manual || "Sin proveedor"}
            </p>
            <p>
              <span className="text-muted-foreground">Fecha entrega:</span>{" "}
              {orden?.fecha_entrega_programada 
                ? (() => {
                    const [year, month, day] = orden.fecha_entrega_programada.split('-').map(Number);
                    const fecha = new Date(year, month - 1, day);
                    return fecha.toLocaleDateString('es-MX', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    });
                  })()
                : "Por confirmar"
              }
            </p>
            
            {/* Indicador de Entregas Programadas */}
            {entregasResumen && entregasResumen.total > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-2 mt-2 border-t border-border/50">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Truck className="h-3.5 w-3.5" />
                  <span>{entregasResumen.total} entrega{entregasResumen.total > 1 ? 's' : ''}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {entregasResumen.pendientes > 0 && (
                    <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-800">
                      {entregasResumen.pendientes} pendiente{entregasResumen.pendientes > 1 ? 's' : ''}
                    </Badge>
                  )}
                  {entregasResumen.enProceso > 0 && (
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800">
                      {entregasResumen.enProceso} en proceso
                    </Badge>
                  )}
                  {entregasResumen.completadas > 0 && (
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800">
                      {entregasResumen.completadas} completada{entregasResumen.completadas > 1 ? 's' : ''}
                    </Badge>
                  )}
                  {entregasResumen.rechazadas > 0 && (
                    <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800">
                      {entregasResumen.rechazadas} rechazada{entregasResumen.rechazadas > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Tabla de productos - scrollable si hay muchos */}
          {orden?.ordenes_compra_detalles && orden.ordenes_compra_detalles.length > 0 && (
            <ScrollArea className="max-h-[180px]">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead className="py-2">Producto</TableHead>
                    <TableHead className="text-center w-16 py-2">Cant</TableHead>
                    <TableHead className="text-right w-24 py-2">P.Unit</TableHead>
                    <TableHead className="text-right w-24 py-2">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orden.ordenes_compra_detalles.map((d: any) => (
                    <TableRow key={d.id} className="text-xs">
                      <TableCell className="truncate max-w-[200px] py-1.5">
                        {d.productos?.nombre || d.producto_nombre_manual || "Producto"}
                      </TableCell>
                      <TableCell className="text-center py-1.5">{d.cantidad_ordenada}</TableCell>
                      <TableCell className="text-right py-1.5">{formatCurrency(d.precio_unitario_compra)}</TableCell>
                      <TableCell className="text-right py-1.5">{formatCurrency(d.subtotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
          
          {/* Totales */}
          <div className="flex justify-between items-start pt-2 border-t">
            <span className="text-xs text-muted-foreground">
              {orden?.ordenes_compra_detalles?.length || 0} producto(s)
            </span>
            <div className="text-right text-sm space-y-0.5">
              <div className="text-muted-foreground">Subtotal: {formatCurrency(orden?.subtotal || 0)}</div>
              <div className="text-muted-foreground">IVA 16%: {formatCurrency(orden?.impuestos || 0)}</div>
              <div className="font-bold text-base">Total: {formatCurrency(orden?.total || 0)}</div>
            </div>
          </div>
        </div>

        {!accion ? (
          <div className="space-y-4">
            {/* ====== ACCIONES PRINCIPALES ====== */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Acciones Principales</p>
              
              {onEdit && (
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start",
                    tieneRecepcionesActivas && "opacity-50 cursor-not-allowed"
                  )}
                  disabled={tieneRecepcionesActivas}
                  onClick={() => {
                    if (tieneRecepcionesActivas) {
                      toast({
                        title: "No se puede editar",
                        description: "Ya hay recepciones registradas en almacén",
                        variant: "destructive",
                      });
                      return;
                    }
                    
                    // If sent or confirmed, show warning
                    if (orden?.status === "enviada" || orden?.status === "confirmada") {
                      setConfirmEditOpen(true);
                      return;
                    }
                    
                    // Edit directly
                    onOpenChange(false);
                    onEdit(orden);
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar Orden
                  {tieneRecepcionesActivas && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      Bloqueado
                    </Badge>
                  )}
                </Button>
              )}
              
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleGenerarPDF}
              >
                <FileText className="mr-2 h-4 w-4" />
                Generar PDF
              </Button>
            </div>

            <Separator />

            {/* ====== AUTORIZACIÓN Y ENVÍO ====== */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Autorización y Envío</p>
              
              {/* Authorization workflow buttons */}
            {canRequestAuthorization && (
              <Button
                variant="outline"
                className="w-full justify-start text-amber-600 hover:text-amber-700"
                onClick={() => setAccion("solicitar_autorizacion")}
              >
                <Send className="mr-2 h-4 w-4" />
                Solicitar Autorización
              </Button>
            )}

            {canAuthorize && (
              <>
                <Button
                  variant="outline"
                  className="w-full justify-start text-green-600 hover:text-green-700"
                  onClick={() => setAccion("autorizar")}
                >
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Autorizar Orden
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start text-destructive hover:text-destructive"
                  onClick={() => setAccion("rechazar")}
                >
                  <ShieldX className="mr-2 h-4 w-4" />
                  Rechazar Orden
                </Button>
              </>
            )}

            {/* Unified send button - shown for authorized orders */}
            {canSendToSupplier && (
              <Button
                variant="outline"
                className="w-full justify-start text-green-600 hover:text-green-700 border-green-200"
                onClick={proveedorTieneEmail ? () => setAccion("enviar_email") : handleMarcarComoEnviada}
                disabled={enviandoEmail}
              >
                {enviandoEmail ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : proveedorTieneEmail ? (
                  <Mail className="mr-2 h-4 w-4" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                {proveedorTieneEmail ? "Enviar al Proveedor" : "Marcar como Enviada"}
              </Button>
            )}
            </div>

            <Separator />

            {/* ====== SEGUIMIENTO ====== */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Seguimiento</p>

              {orden?.entregas_multiples && (
                <Button
                  variant="outline"
                  className={`w-full justify-start ${entregasPendientes > 0 ? "border-amber-300 text-amber-600 hover:bg-amber-50" : ""}`}
                  onClick={() => setProgramarEntregasOpen(true)}
                >
                  <Truck className="mr-2 h-4 w-4" />
                  Programar Entregas
                  {entregasPendientes > 0 && (
                    <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-700">
                      {entregasPendientes} pendientes
                    </Badge>
                  )}
                </Button>
              )}
            
            {/* Read-only reception status - actual registration is done by warehouse */}
            {(orden?.status === "enviada" || orden?.status === "confirmada" || orden?.status === "parcial" || orden?.status === "recibida") && (
              <Button
                variant="outline"
                className="w-full justify-start text-muted-foreground"
                onClick={() => setEvidenciasGalleryOpen(true)}
              >
                <Package className="mr-2 h-4 w-4" />
                Ver Estado de Recepciones
                {orden?.status === "parcial" && (
                  <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-700">
                    Parcial
                  </Badge>
                )}
                {orden?.status === "recibida" && (
                  <Badge variant="default" className="ml-2 bg-green-100 text-green-700">
                    Completa
                  </Badge>
                )}
              </Button>
            )}
            </div>

            <Separator />

            {/* ====== OTRAS ACCIONES ====== */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Otras Acciones</p>
              
              {/* View photo evidences button */}
              {(orden?.status === "recibida" || orden?.status === "parcial") && (
                <Button
                  variant="outline"
                  className="w-full justify-start text-emerald-600 hover:text-emerald-700 border-emerald-200"
                  onClick={() => setEvidenciasGalleryOpen(true)}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Ver Evidencias Fotográficas
                  <EvidenciasBadge 
                    ordenCompraId={orden?.id} 
                    onClick={() => setEvidenciasGalleryOpen(true)} 
                  />
                </Button>
              )}
              
              {/* Historial de correos enviados */}
              <Collapsible className="w-full">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground">
                    <History className="mr-2 h-4 w-4" />
                    Historial de Correos Enviados
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 border rounded-lg p-3 bg-muted/30">
                  <HistorialCorreosOC ordenId={orden?.id} />
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
        ) : accion === "solicitar_autorizacion" ? (
          <div className="space-y-4">
            <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg space-y-2">
              <p className="font-medium text-amber-700 dark:text-amber-400">¿Enviar solicitud de autorización?</p>
              <p className="text-sm text-muted-foreground">
                Se enviará un correo a <strong>jagomez@almasa.com.mx</strong> para solicitar la autorización de esta orden.
              </p>
              <div className="text-sm text-muted-foreground space-y-1 mt-2">
                <p><strong>Folio:</strong> {orden?.folio}</p>
                <p><strong>Proveedor:</strong> {orden?.proveedores?.nombre}</p>
                <p><strong>Total:</strong> ${orden?.total?.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleSolicitarAutorizacion} 
                disabled={solicitandoAutorizacion}
              >
                {solicitandoAutorizacion ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Sí, solicitar"
                )}
              </Button>
              <Button variant="ghost" onClick={() => setAccion(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : accion === "autorizar" ? (
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg space-y-2">
              <p className="font-medium text-green-700 dark:text-green-400">¿Autorizar esta orden?</p>
              <p className="text-sm text-muted-foreground">
                {proveedorTieneEmail 
                  ? "Al autorizar, tu nombre aparecerá como firma en el PDF. El creador podrá enviarla al proveedor por correo."
                  : "Al autorizar, tu nombre aparecerá como firma en el PDF. Este proveedor no tiene correo registrado (control interno)."}
              </p>
              <div className="text-sm text-muted-foreground space-y-1 mt-2">
                <p><strong>Folio:</strong> {orden?.folio}</p>
                <p><strong>Proveedor:</strong> {orden?.proveedores?.nombre}</p>
                {proveedorTieneEmail ? (
                  <p><strong>Correo proveedor:</strong> {orden?.proveedores?.email || orden?.proveedor_email_manual}</p>
                ) : (
                  <p className="text-amber-600"><strong>⚠ Sin correo:</strong> Control interno</p>
                )}
                <p><strong>Total:</strong> ${orden?.total?.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleAutorizar} 
                disabled={autorizando}
                className="bg-green-600 hover:bg-green-700"
              >
                {autorizando ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Autorizando...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Autorizar y Enviar
                  </>
                )}
              </Button>
              <Button variant="ghost" onClick={() => setAccion(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : accion === "rechazar" ? (
          <div className="space-y-4">
            <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg space-y-2">
              <p className="font-medium text-red-700 dark:text-red-400">Rechazar orden de compra</p>
              <p className="text-sm text-muted-foreground">
                Se notificará al creador de la orden sobre el rechazo.
              </p>
            </div>
            <div>
              <Label>Motivo del rechazo *</Label>
              <Textarea
                value={motivoRechazo}
                onChange={(e) => setMotivoRechazo(e.target.value)}
                placeholder="Explica por qué se rechaza esta orden..."
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleRechazar} 
                disabled={autorizando}
                variant="destructive"
              >
                {autorizando ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Rechazando...
                  </>
                ) : (
                  "Rechazar Orden"
                )}
              </Button>
              <Button variant="ghost" onClick={() => setAccion(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : accion === "eliminar" ? (
          <div className="space-y-4">
            {(orden?.status === 'completada' || orden?.status === 'recibida') ? (
              <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg space-y-2">
                <p className="font-medium text-amber-700 dark:text-amber-400 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  No se puede eliminar esta orden
                </p>
                <p className="text-sm text-muted-foreground">
                  Esta orden ya fue recibida y el inventario fue afectado. Para mantener la integridad de los datos, 
                  no es posible eliminarla directamente.
                </p>
                <p className="text-sm text-muted-foreground">
                  Si necesita realizar ajustes, contacte al administrador del sistema.
                </p>
              </div>
            ) : (
              <>
                <div className="bg-destructive/10 p-4 rounded-lg space-y-2">
                  <p className="font-medium text-destructive">¿Estás seguro de eliminar esta orden?</p>
                  <p className="text-sm text-muted-foreground">
                    Esta acción no se puede deshacer. Se eliminarán todos los detalles de la orden.
                  </p>
                  <div className="text-sm text-muted-foreground space-y-1 mt-2">
                    <p><strong>Folio:</strong> {orden?.folio}</p>
                    <p><strong>Proveedor:</strong> {orden?.proveedores?.nombre || orden?.proveedor_nombre_manual}</p>
                    <p><strong>Total:</strong> ${orden?.total?.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => deleteOrden.mutate()} 
                    disabled={deleteOrden.isPending}
                    variant="destructive"
                  >
                    {deleteOrden.isPending ? "Eliminando..." : "Sí, eliminar"}
                  </Button>
                  <Button variant="ghost" onClick={() => setAccion(null)}>
                    No, cancelar
                  </Button>
                </div>
              </>
            )}
          </div>
        ) : accion === "enviar_email" || accion === "reenviar_email" ? (
          <div className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <p className="font-medium">
                {accion === "reenviar_email" ? "Reenviar orden de compra" : "Detalles del envío"}
              </p>
              {accion === "reenviar_email" && (
                <p className="text-sm text-cyan-600">
                  Esta orden ya fue enviada previamente. Se volverá a enviar al proveedor.
                </p>
              )}
              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>Proveedor:</strong> {orden?.proveedores?.nombre}</p>
                <p><strong>Total de la orden:</strong> ${orden?.total?.toLocaleString()}</p>
                <p><strong>Productos:</strong> {orden?.ordenes_compra_detalles?.length || 0} items</p>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Se enviará desde: <strong>compras@almasa.com.mx</strong>
              </p>
            </div>
            
            {/* Email destination */}
            <div className="space-y-2">
              <Label htmlFor="emailTo">Correo destino *</Label>
              <Input
                id="emailTo"
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="correo@proveedor.com"
              />
            </div>

            {/* CC Emails */}
            <div className="space-y-2">
              <Label>CC (con copia)</Label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  value={newCcEmail}
                  onChange={(e) => setNewCcEmail(e.target.value)}
                  placeholder="Agregar correo en copia..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCcEmail();
                    }
                  }}
                />
                <Button type="button" variant="outline" size="icon" onClick={handleAddCcEmail}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {ccEmails.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {ccEmails.map((email) => (
                    <Badge key={email} variant="secondary" className="flex items-center gap-1">
                      {email}
                      <button
                        type="button"
                        onClick={() => handleRemoveCcEmail(email)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleEnviarOrden} 
                disabled={enviandoEmail || !emailTo.trim()}
              >
                {enviandoEmail ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  accion === "reenviar_email" ? "Reenviar orden" : "Enviar orden"
                )}
              </Button>
              <Button variant="ghost" onClick={() => setAccion(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>

    <ProgramarEntregasDialog
      open={programarEntregasOpen}
      onOpenChange={setProgramarEntregasOpen}
      orden={orden}
    />

    {/* ConvertirEntregasMultiplesDialog and DividirEntregaDialog removed - rarely used */}


    <EvidenciasGallery
      ordenCompraId={orden?.id || ""}
      open={evidenciasGalleryOpen}
      onOpenChange={setEvidenciasGalleryOpen}
    />

    {/* Alert dialog for editing sent/confirmed orders */}
    <AlertDialog open={confirmEditOpen} onOpenChange={setConfirmEditOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Orden ya enviada al proveedor
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>
              <p className="mb-2">Esta orden ya fue enviada al proveedor. Si realizas cambios:</p>
              <ul className="list-disc ml-4 space-y-1 text-sm">
                <li>Los cambios <strong>no se enviarán automáticamente</strong></li>
                <li>Deberás reenviar la orden manualmente si es necesario</li>
                <li>El proveedor tiene la versión anterior</li>
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={() => {
            setConfirmEditOpen(false);
            onOpenChange(false);
            if (onEdit) onEdit(orden);
          }}>
            Continuar editando
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};

export default OrdenAccionesDialog;
