import { useState, useEffect, useMemo } from "react";
import { useUserRoles } from "@/hooks/useUserRoles";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarIcon, CheckCircle, XCircle, Mail, Loader2, Pencil, Trash2, FileText, ShieldCheck, ShieldX, Send, Truck, Plus, X, Package, Camera, Scissors, History, AlertTriangle, FileCheck, DollarSign } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import ProgramarEntregasDialog from "./ProgramarEntregasDialog";

// ConvertirEntregasMultiplesDialog and DividirEntregaDialog removed - rarely used
import { EvidenciasGallery, EvidenciasBadge } from "./EvidenciasGallery";
import { HistorialCorreosOC, registrarCorreoEnviado } from "./HistorialCorreosOC";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ConciliacionRapidaDialog } from "./ConciliacionRapidaDialog";
import { AjustarCostosOCDialog } from "./AjustarCostosOCDialog";
import { ModificarProductosOCDialog } from "./ModificarProductosOCDialog";
import logoAlmasa from "@/assets/logo-almasa.png";
import { htmlToPdfBase64 } from "@/lib/htmlToPdfBase64";

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
  const [isAdminLocal, setIsAdminLocal] = useState(false);
  const [programarEntregasOpen, setProgramarEntregasOpen] = useState(false);
  
  // Hook para verificar rol admin (para borrar OCs de prueba)
  const { isAdmin } = useUserRoles();
  
  // Removed: convertirEntregasOpen, dividirEntregaOpen - rarely used functionality
  const [evidenciasGalleryOpen, setEvidenciasGalleryOpen] = useState(false);
  const [confirmEditOpen, setConfirmEditOpen] = useState(false);
  const [ajustarCostosOpen, setAjustarCostosOpen] = useState(false);
  const [conciliacionRapidaOpen, setConciliacionRapidaOpen] = useState(false);
  const [modificarProductosOpen, setModificarProductosOpen] = useState(false);
  
  // Estado para confirmación de folio (borrado especial de OC de prueba)
  const [folioConfirmacion, setFolioConfirmacion] = useState('');
  
  // Email CC functionality
  const [emailTo, setEmailTo] = useState("");
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [newCcEmail, setNewCcEmail] = useState("");

  // Derive ordenId safely to use in hooks
  const ordenId = orden?.id;

  // Detectar si es OC de prueba (para permitir eliminación especial por admin)
  const esOCPrueba = useMemo(() => {
    const nombreProveedor = orden?.proveedores?.nombre || orden?.proveedor_nombre_manual || '';
    const folio = orden?.folio || '';
    
    return nombreProveedor.toLowerCase().includes('prueba') || 
           nombreProveedor.toLowerCase().includes('test') ||
           folio.toUpperCase().includes('TEST') ||
           folio.toUpperCase().includes('PRUEBA');
  }, [orden]);

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

  // REMOVED: confirmacionProveedor query - confirmation system deprecated

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
      if (!orden?.id) return { total: 0, sinFecha: 0, programadas: 0, enProceso: 0, completadas: 0 };
      const { data, error } = await supabase
        .from("ordenes_compra_entregas")
        .select("id, status, fecha_programada, llegada_registrada_en, recepcion_finalizada_en")
        .eq("orden_compra_id", orden.id);
      
      if (error) {
        console.error("Error fetching entregas resumen:", error);
        return { total: 0, sinFecha: 0, programadas: 0, enProceso: 0, completadas: 0 };
      }
      
      const entregas = data || [];
      
      // SIN FECHA: No tienen fecha_programada asignada o status pendiente_fecha
      const sinFecha = entregas.filter(e => 
        !e.fecha_programada || e.status === "pendiente_fecha"
      ).length;
      
      // PROGRAMADAS: Tienen fecha y están listas para recepción
      const programadas = entregas.filter(e => 
        e.fecha_programada && 
        e.status === "programada" &&
        !e.llegada_registrada_en
      ).length;
      
      // EN DESCARGA: Llegaron pero no han finalizado recepción
      const enProceso = entregas.filter(e => 
        e.llegada_registrada_en && 
        !e.recepcion_finalizada_en && 
        e.status !== "rechazada" && 
        e.status !== "recibida"
      ).length;
      
      // RECIBIDAS: Completamente procesadas
      const completadas = entregas.filter(e => e.status === "recibida").length;
      
      return { total: entregas.length, sinFecha, programadas, enProceso, completadas };
    },
    enabled: !!orden?.id,
  });

  // Fetch current user info
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        // Check if admin (for local use, but we also have useUserRoles hook)
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);
        setIsAdminLocal(roles?.some(r => r.role === 'admin') || false);
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
      const nombreProveedor = orden?.proveedores?.nombre || orden?.proveedor_nombre_manual || '';
      const folio = orden?.folio || '';
      
      // Detectar si es OC de prueba
      const esOCPruebaLocal = nombreProveedor.toLowerCase().includes('prueba') || 
                              nombreProveedor.toLowerCase().includes('test') ||
                              folio.toUpperCase().includes('TEST') ||
                              folio.toUpperCase().includes('PRUEBA');
      
      // Permitir eliminación de OC recibida SOLO si es de prueba Y el usuario es admin
      if ((orden.status === 'completada' || orden.status === 'recibida') && !esOCPruebaLocal) {
        throw new Error(
          "No se puede eliminar una orden que ya fue recibida. El inventario ya fue afectado. " +
          "Contacte al administrador para realizar ajustes de inventario si es necesario."
        );
      }
      
      // Si es OC recibida de prueba, eliminar también los lotes de inventario en cascada
      if ((orden.status === 'completada' || orden.status === 'recibida') && esOCPruebaLocal) {
        console.log("🧹 Eliminando OC de prueba con datos de inventario:", orden.folio);
        
        // 1. Eliminar lotes de inventario asociados (trigger actualizará stock)
        const { error: lotesError } = await supabase
          .from("inventario_lotes")
          .delete()
          .eq("orden_compra_id", orden.id);
        
        if (lotesError) {
          console.error("Error eliminando lotes:", lotesError);
          throw new Error("Error al eliminar lotes de inventario: " + lotesError.message);
        }
        
        // 2. Eliminar entregas programadas
        const { error: entregasError } = await supabase
          .from("ordenes_compra_entregas")
          .delete()
          .eq("orden_compra_id", orden.id);
        
        if (entregasError) {
          console.error("Error eliminando entregas:", entregasError);
          // No lanzar error, continuar
        }
        
        // 3. Eliminar recepciones participantes (si existen)
        const { data: recepciones } = await (supabase as any)
          .from("ordenes_compra_recepciones")
          .select("id")
          .eq("orden_compra_id", orden.id);
        
        if (recepciones && recepciones.length > 0) {
          const recepcionIds = recepciones.map((r: any) => r.id);
          
          await (supabase as any)
            .from("recepciones_participantes")
            .delete()
            .in("recepcion_id", recepcionIds);
          
          await (supabase as any)
            .from("ordenes_compra_recepciones")
            .delete()
            .eq("orden_compra_id", orden.id);
        }
        
        console.log("✅ Datos de inventario y recepciones eliminados para OC de prueba:", orden.folio);
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
          
          const pdfBase64 = await htmlToPdfBase64(cancelledPdfContent);
          const asunto = `ORDEN CANCELADA: ${orden.folio} - ${proveedorNombre.toUpperCase()}`;

          // Send cancellation email
          const { error: emailError } = await supabase.functions.invoke('gmail-api', {
            body: {
              action: 'send',
              email: 'compras@almasa.com.mx',
              to: emailDestinatario,
              subject: asunto,
              body: htmlBody,
              attachments: [{
                filename: `OC_${orden.folio}_CANCELADA.pdf`,
                content: pdfBase64,
                mimeType: 'application/pdf'
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
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg overflow-x-hidden">
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

        <div class="signature-section" style="justify-content: center;">
          <div class="signature-box">
            ${nombreCreador ? `<div class="signature-name">${nombreCreador}</div>` : ''}
            <div class="signature-line">Departamento de Compras</div>
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
      
      // Convert HTML to real PDF
      const pdfBase64 = await htmlToPdfBase64(pdfContent);

      // Get logo URL from current origin
      const logoUrl = `${window.location.origin}/logo-almasa-header.png`;

      // Simplified email without confirmation buttons
      const fechaEntregaStr = orden.fecha_entrega_programada 
        ? (() => {
            const [year, month, day] = orden.fecha_entrega_programada.split('-').map(Number);
            return new Date(year, month - 1, day).toLocaleDateString('es-MX');
          })()
        : null;

      // Email body without confirmation buttons (confirmation system deprecated)
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <div style="text-align: center; padding: 20px; background-color: #f8f9fa; border-radius: 8px 8px 0 0; border-bottom: 3px solid #c41e3a;">
            <img src="${logoUrl}" alt="Abarrotes La Manita" style="max-width: 180px; height: auto;" />
          </div>
          <div style="padding: 20px;">
          <h2 style="color: #2e7d32; margin-top: 0;">Orden de Compra: ${orden.folio}</h2>
          <p>Estimado proveedor <strong>${orden.proveedores?.nombre}</strong>,</p>
          <p>Por medio del presente, le enviamos nuestra orden de compra.</p>
          <p><strong>Adjunto encontrará el documento formal de la orden de compra en formato PDF.</strong></p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Folio:</strong> ${orden.folio}</p>
            <p style="margin: 5px 0;"><strong>Total:</strong> $${orden.total?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
            <p style="margin: 5px 0;"><strong>Fecha de la orden:</strong> ${new Date(orden.fecha_orden).toLocaleDateString('es-MX')}</p>
            ${fechaEntregaStr ? `<p style="margin: 5px 0;"><strong>Fecha de entrega solicitada:</strong> ${fechaEntregaStr}</p>` : ''}
          </div>
          
          ${orden.notas ? `<p><strong>Notas:</strong> ${orden.notas}</p>` : ''}

          <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;" />
          <p style="color: #666; font-size: 12px;">
            Este correo fue enviado desde el sistema de Abarrotes La Manita.<br/>
            Para cualquier duda o cambio en la fecha de entrega, favor de comunicarse a compras@almasa.com.mx
          </p>
          </div>
        </div>
      `;

      // Prepare attachment
      const attachments = [
        {
          filename: `Orden_Compra_${orden.folio}.pdf`,
          content: pdfBase64,
          mimeType: 'application/pdf'
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

  const canSendToSupplier = orden?.status === "pendiente";
  const canResend = orden?.status === "enviada" || orden?.status === "confirmada" || orden?.status === "parcial";
  const proveedorTieneEmail = !!(orden?.proveedores?.email || orden?.proveedor_email_manual);

  // Mark as sent without email (for informal suppliers) - still sends internal copy
  const handleMarcarComoEnviada = async () => {
    setEnviandoEmail(true);
    try {
      // Generate PDF content for the internal copy
      const pdfContent = await generarPDFContent(!!orden.autorizado_por);
      const pdfBase64 = await htmlToPdfBase64(pdfContent);

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
          filename: `Orden_Compra_${orden.folio}.pdf`,
          content: pdfBase64,
          mimeType: 'application/pdf'
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
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 pr-8">
            <span className="flex items-center gap-2 flex-wrap">
              Gestionar Orden {orden?.folio}
              {getStatusBadge()}
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              {!proveedorTieneEmail && (
                <Badge variant="outline" className="text-muted-foreground text-[10px]">
                  Sin correo
                </Badge>
              )}
              {orden?.status === "enviada" && orden?.email_enviado_en && orden?.email_leido_en && (
                <Badge variant="outline" className="text-blue-600 border-blue-300 text-[10px]">
                  <Mail className="h-3 w-3 mr-1" />
                  Leído
                </Badge>
              )}
              {orden?.status === "enviada" && !orden?.email_enviado_en && (
                <Badge variant="outline" className="text-muted-foreground text-[10px]">
                  Control interno
                </Badge>
              )}
            </div>
          </DialogTitle>
          <DialogDescription>
            {orden?.status === "rechazada" && orden?.motivo_rechazo && (
              <span className="text-destructive">Motivo rechazo: {orden.motivo_rechazo}</span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Alert for pending advance payment */}
        {orden?.status === 'pendiente_pago' && (
          <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700">
            <DollarSign className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              <strong>Pago Anticipado Pendiente</strong>
              <br />
              Las entregas están bloqueadas para el almacén y el proveedor no recibirá notificaciones hasta que se registre el pago.
            </AlertDescription>
          </Alert>
        )}

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
            
            {/* Panel de Progreso de Entregas */}
            {entregasResumen && entregasResumen.total > 0 && (
              <div className="pt-3 mt-2 border-t border-border/50">
                <div className="flex items-center gap-2 mb-3">
                  <Truck className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Progreso de Entregas</span>
                </div>
                
                {/* Dashboard visual con contadores */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-center">
                    <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{entregasResumen.sinFecha}</p>
                    <p className="text-[10px] text-amber-700 dark:text-amber-300 font-medium">Sin Fecha</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-center">
                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{entregasResumen.programadas}</p>
                    <p className="text-[10px] text-blue-700 dark:text-blue-300 font-medium">Programadas</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 text-center">
                    <p className="text-xl font-bold text-orange-600 dark:text-orange-400">{entregasResumen.enProceso}</p>
                    <p className="text-[10px] text-orange-700 dark:text-orange-300 font-medium">En Descarga</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-center">
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">{entregasResumen.completadas}</p>
                    <p className="text-[10px] text-green-700 dark:text-green-300 font-medium">Recibidas</p>
                  </div>
                </div>
                
                {/* Barra de progreso visual */}
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all"
                      style={{ width: `${(entregasResumen.completadas / entregasResumen.total) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground min-w-[45px]">
                    {entregasResumen.completadas}/{entregasResumen.total}
                  </span>
                </div>
              </div>
            )}
          </div>
          
          {/* Tabla de productos - scrollable si hay muchos */}
          {orden?.ordenes_compra_detalles && orden.ordenes_compra_detalles.length > 0 && (
            <div className="overflow-x-auto -mx-4 px-4">
              <ScrollArea className="max-h-[180px]">
                <Table className="min-w-[320px]">
                  <TableHeader>
                    <TableRow className="text-[11px]">
                      <TableHead className="py-2 min-w-[80px]">Producto</TableHead>
                      <TableHead className="text-center w-10 py-2">Cant</TableHead>
                      <TableHead className="text-right w-14 py-2">P.Unit</TableHead>
                      <TableHead className="text-right w-14 py-2">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orden.ordenes_compra_detalles.map((d: any) => (
                      <TableRow key={d.id} className="text-[11px]">
                        <TableCell className="truncate max-w-[100px] py-1.5">
                          {d.productos?.nombre || d.producto_nombre_manual || "Producto"}
                        </TableCell>
                        <TableCell className="text-center py-1.5">{d.cantidad_ordenada}</TableCell>
                        <TableCell className="text-right py-1.5 whitespace-nowrap">
                          ${Math.round(d.precio_unitario_compra).toLocaleString('es-MX')}
                        </TableCell>
                        <TableCell className="text-right py-1.5 whitespace-nowrap">
                          ${Math.round(d.subtotal).toLocaleString('es-MX')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
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
            {/* ====== ACCIONES FRECUENTES ====== */}
            <div className="space-y-2">
              {/* Enviar / Reenviar al Proveedor */}
              {(canSendToSupplier || canResend) && (
                <button
                  className="w-full flex items-center gap-3 p-4 rounded-lg border border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-950/30 text-left transition-colors"
                  onClick={proveedorTieneEmail ? () => setAccion(canSendToSupplier ? "enviar_email" : "reenviar_email") : handleMarcarComoEnviada}
                  disabled={enviandoEmail}
                >
                  {enviandoEmail ? (
                    <Loader2 className="h-5 w-5 text-green-600 flex-shrink-0 animate-spin" />
                  ) : (
                    <Mail className="h-5 w-5 text-green-600 flex-shrink-0" />
                  )}
                  <div>
                    <div className="font-medium text-sm">{canSendToSupplier ? (proveedorTieneEmail ? "Enviar al Proveedor" : "Marcar como Enviada") : "Reenviar al Proveedor"}</div>
                    <div className="text-xs text-muted-foreground">{proveedorTieneEmail ? "Envía email con PDF de la OC adjunta" : "Sin email — marca como enviada manualmente"}</div>
                  </div>
                </button>
              )}

              {/* Ver Estado de Recepciones */}
              {(orden?.status === "enviada" || orden?.status === "confirmada" || orden?.status === "parcial" || orden?.status === "recibida") && (
                <button
                  className="w-full flex items-center gap-3 p-4 rounded-lg border hover:bg-muted text-left transition-colors"
                  onClick={() => setEvidenciasGalleryOpen(true)}
                >
                  <Package className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-sm">Ver Estado de Recepciones</div>
                    <div className="text-xs text-muted-foreground">Evidencias fotográficas y detalle de entregas</div>
                  </div>
                  {orden?.status === "parcial" && <Badge className="bg-amber-100 text-amber-700 border-0">Parcial</Badge>}
                  {orden?.status === "recibida" && <Badge className="bg-green-100 text-green-700 border-0">Completa</Badge>}
                </button>
              )}

              {/* Generar PDF */}
              <button
                className="w-full flex items-center gap-3 p-4 rounded-lg border hover:bg-muted text-left transition-colors"
                onClick={handleGenerarPDF}
              >
                <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div>
                  <div className="font-medium text-sm">Generar PDF</div>
                  <div className="text-xs text-muted-foreground">Descarga documento de la orden</div>
                </div>
              </button>

              {/* Historial de Correos */}
              <Collapsible className="w-full">
                <CollapsibleTrigger asChild>
                  <button className="w-full flex items-center gap-3 p-4 rounded-lg border hover:bg-muted text-left transition-colors">
                    <History className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div>
                      <div className="font-medium text-sm">Historial de Correos</div>
                      <div className="text-xs text-muted-foreground">Correos enviados al proveedor</div>
                    </div>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 border rounded-lg p-3 bg-muted/30">
                  <HistorialCorreosOC ordenId={orden?.id} />
                </CollapsibleContent>
              </Collapsible>
            </div>

            <Separator />

            {/* ====== MÁS ACCIONES (Collapsible) ====== */}
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between text-muted-foreground text-xs uppercase tracking-wide">
                  Más acciones
                  <Badge variant="secondary" className="text-[10px]">+</Badge>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 pt-2">
                {/* Editar Orden */}
                {onEdit && (
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start", tieneRecepcionesActivas && "opacity-50 cursor-not-allowed")}
                    disabled={tieneRecepcionesActivas}
                    onClick={() => {
                      if (tieneRecepcionesActivas) {
                        toast({ title: "No se puede editar", description: "Ya hay recepciones registradas en almacén", variant: "destructive" });
                        return;
                      }
                      if (orden?.status === "enviada" || orden?.status === "confirmada") {
                        setConfirmEditOpen(true);
                        return;
                      }
                      onOpenChange(false);
                      onEdit(orden);
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar Orden
                    {tieneRecepcionesActivas && <Badge variant="secondary" className="ml-2 text-xs">Bloqueado</Badge>}
                  </Button>
                )}

                {/* Modificar Productos */}
                {(orden?.status === 'borrador' || orden?.status === 'autorizada' || orden?.status === 'enviada' || orden?.status === 'confirmada' || orden?.status === 'parcial') && (
                  <Button variant="outline" className="w-full justify-start text-amber-600 hover:text-amber-700 border-amber-200" onClick={() => setModificarProductosOpen(true)}>
                    <Scissors className="mr-2 h-4 w-4" />
                    Modificar Productos
                    <Badge variant="secondary" className="ml-auto">{orden?.ordenes_compra_detalles?.length || 0}</Badge>
                  </Button>
                )}

                {/* Ajustar Costos */}
                {(orden?.status === 'recibida' || orden?.status === 'parcial' || orden?.status === 'completada') && (
                  <Button variant="outline" className="w-full justify-start text-blue-600 hover:text-blue-700 border-blue-200" onClick={() => setAjustarCostosOpen(true)}>
                    <DollarSign className="mr-2 h-4 w-4" />
                    Ajustar Costos de Compra
                    <Badge variant="secondary" className="ml-auto">{orden?.ordenes_compra_detalles?.length || 0} productos</Badge>
                  </Button>
                )}

                {/* Confirmar Costos */}
                {(orden as any)?.status_conciliacion === 'por_conciliar' && (
                  <Button variant="outline" className="w-full justify-start text-amber-600 hover:text-amber-700 border-amber-300" onClick={() => setConciliacionRapidaOpen(true)}>
                    <FileCheck className="mr-2 h-4 w-4" />
                    Confirmar Costos
                    <Badge variant="secondary" className="ml-auto bg-amber-100 text-amber-700">Por Conciliar</Badge>
                  </Button>
                )}

                {/* Ver Evidencias */}
                {(orden?.status === "recibida" || orden?.status === "parcial") && (
                  <Button variant="outline" className="w-full justify-start text-emerald-600 hover:text-emerald-700 border-emerald-200" onClick={() => setEvidenciasGalleryOpen(true)}>
                    <Camera className="mr-2 h-4 w-4" />
                    Ver Evidencias Fotográficas
                    <EvidenciasBadge ordenCompraId={orden?.id} onClick={() => setEvidenciasGalleryOpen(true)} />
                  </Button>
                )}

                {/* Programar Entregas */}
                {orden?.entregas_multiples && (
                  <Button variant="outline" className={`w-full justify-start ${entregasPendientes > 0 ? "border-amber-300 text-amber-600" : ""}`} onClick={() => setProgramarEntregasOpen(true)}>
                    <Truck className="mr-2 h-4 w-4" />
                    Programar Entregas
                    {entregasPendientes > 0 && <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-700">{entregasPendientes} pendientes</Badge>}
                  </Button>
                )}

                <Separator className="my-2" />

                {/* Eliminar */}
                <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive" onClick={() => setAccion("eliminar")}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar Orden
                </Button>
              </CollapsibleContent>
            </Collapsible>
          </div>
        ) : accion === "eliminar" ? (
          <div className="space-y-4">
            {/* Caso 1: OC recibida que NO es de prueba - mostrar bloqueo */}
            {(orden?.status === 'completada' || orden?.status === 'recibida') && !esOCPrueba ? (
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
            ) : (orden?.status === 'completada' || orden?.status === 'recibida') && esOCPrueba && isAdmin ? (
              /* Caso 2: OC recibida de PRUEBA + usuario es admin - permitir con confirmación doble */
              <div className="space-y-4">
                <div className="bg-destructive/10 border-2 border-destructive p-4 rounded-lg space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-6 w-6 text-destructive" />
                    <p className="font-bold text-destructive">
                      Eliminación de OC de Prueba
                    </p>
                  </div>
                  <p className="text-sm text-destructive">
                    ⚠️ Esta acción eliminará PERMANENTEMENTE:
                  </p>
                  <ul className="text-sm text-muted-foreground list-disc ml-5 space-y-1">
                    <li>La orden de compra <strong>{orden?.folio}</strong></li>
                    <li>Todos los lotes de inventario creados</li>
                    <li>Las entregas y recepciones registradas</li>
                    <li>El stock del producto será actualizado automáticamente</li>
                  </ul>
                  
                  <div className="mt-4 p-3 bg-background rounded border">
                    <p className="text-sm font-medium mb-2">
                      Para confirmar, escribe el folio de la orden:
                    </p>
                    <Input
                      value={folioConfirmacion}
                      onChange={(e) => setFolioConfirmacion(e.target.value.toUpperCase())}
                      placeholder={orden?.folio}
                      className="font-mono"
                    />
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={() => deleteOrden.mutate()} 
                    disabled={deleteOrden.isPending || folioConfirmacion !== orden?.folio}
                    variant="destructive"
                    className="flex-1"
                  >
                    {deleteOrden.isPending ? "Eliminando datos de prueba..." : "🗑️ Eliminar OC de Prueba"}
                  </Button>
                  <Button variant="ghost" onClick={() => { setAccion(null); setFolioConfirmacion(''); }}>
                    Cancelar
                  </Button>
                </div>
                
                {folioConfirmacion && folioConfirmacion !== orden?.folio && (
                  <p className="text-xs text-destructive">
                    El folio no coincide. Debe escribir exactamente: {orden?.folio}
                  </p>
                )}
              </div>
            ) : (orden?.status === 'completada' || orden?.status === 'recibida') && esOCPrueba && !isAdmin ? (
              /* Caso 3: OC recibida de PRUEBA pero usuario NO es admin */
              <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg space-y-2">
                <p className="font-medium text-amber-700 dark:text-amber-400 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Requiere permisos de administrador
                </p>
                <p className="text-sm text-muted-foreground">
                  Esta es una OC de prueba que puede ser eliminada, pero requiere permisos de administrador.
                </p>
              </div>
            ) : (
              /* Caso 4: OC no recibida - eliminación normal */
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

    <ConciliacionRapidaDialog
      open={conciliacionRapidaOpen}
      onOpenChange={setConciliacionRapidaOpen}
      ordenCompra={orden ? { id: orden.id, folio: orden.folio } : null}
    />

    <AjustarCostosOCDialog
      open={ajustarCostosOpen}
      onOpenChange={setAjustarCostosOpen}
      ordenCompra={orden ? { id: orden.id, folio: orden.folio } : null}
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
    
    {/* Dialog para modificar productos */}
    <ModificarProductosOCDialog
      open={modificarProductosOpen}
      onOpenChange={setModificarProductosOpen}
      ordenCompra={orden ? {
        id: orden.id,
        folio: orden.folio,
        status: orden.status,
        proveedor_id: orden.proveedor_id,
        proveedor_nombre: orden.proveedores?.nombre || orden.proveedor_nombre_manual || 'Proveedor',
        proveedor_email: orden.proveedores?.email || orden.proveedor_email_manual || null,
        subtotal: orden.subtotal || 0,
        impuestos: orden.impuestos || 0,
        total: orden.total || 0,
      } : null}
    />
    </>
  );
};

export default OrdenAccionesDialog;
