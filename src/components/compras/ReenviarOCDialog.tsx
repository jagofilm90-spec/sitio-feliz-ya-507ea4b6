import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { COMPANY_DATA } from "@/constants/companyData";
import { getProveedorFiscalHTML } from "@/lib/proveedorUtils";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, Building2, AlertCircle, UserPlus } from "lucide-react";
import { registrarCorreoEnviado } from "./HistorialCorreosOC";
import logoAlmasa from "@/assets/logo-almasa.png";

interface ReenviarOCDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orden: any;
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

const ReenviarOCDialog = ({ open, onOpenChange, orden }: ReenviarOCDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [enviando, setEnviando] = useState(false);
  const [correoAdicional, setCorreoAdicional] = useState("");
  const [mostrarGuardarContacto, setMostrarGuardarContacto] = useState(false);
  const [guardandoContacto, setGuardandoContacto] = useState(false);
  const [correoParaGuardar, setCorreoParaGuardar] = useState("");

  // Fetch contact that receives orders for this supplier
  const { data: contactoOrden, isLoading: loadingContacto } = useQuery({
    queryKey: ["proveedor-contacto-ordenes", orden?.proveedor_id],
    queryFn: async () => {
      if (!orden?.proveedor_id) return null;
      
      const { data, error } = await supabase
        .from("proveedor_contactos")
        .select("nombre, email")
        .eq("proveedor_id", orden.proveedor_id)
        .eq("recibe_ordenes", true)
        .eq("activo", true)
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!orden?.proveedor_id && open,
  });

  // Fetch creator profile for PDF
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
    enabled: !!orden?.creado_por && open,
  });

  // Fetch authorizer profile for PDF
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
    enabled: !!orden?.autorizado_por && open,
  });

  // Determine email to use: first from contact with recibe_ordenes, then supplier main email
  const emailDestinatario = contactoOrden?.email || orden?.proveedores?.email || orden?.proveedor_email_manual;
  const nombreProveedor = orden?.proveedores?.nombre || orden?.proveedor_nombre_manual || "Proveedor";

  const generarPDFContent = async () => {
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

    // Build delivery schedule section
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
      const [year, month, day] = orden.fecha_entrega_programada.split('-').map(Number);
      const fechaLocal = new Date(year, month - 1, day);
      fechaEntrega = fechaLocal.toLocaleDateString('es-MX', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }

    const nombreCreador = creadorProfile?.full_name || 'Usuario';
    const nombreAutorizador = orden?.autorizado_por && autorizadorProfile?.full_name 
      ? autorizadorProfile.full_name 
      : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Orden de Compra ${orden.folio}</title>
        <style>
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
          * { box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px 40px; max-width: 850px; margin: 0 auto; font-size: 11px; color: #1a1a1a; background: #fff; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; margin-bottom: 25px; border-bottom: 3px solid #1e3a5f; }
          .company-info { flex: 1; }
          .company-logo { font-size: 28px; font-weight: 800; color: #1e3a5f; margin: 0 0 5px 0; }
          .company-logo span { color: #d4a024; }
          .company-subtitle { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
          .company-details { font-size: 10px; color: #444; line-height: 1.5; }
          .order-box { text-align: right; background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: white; padding: 15px 20px; border-radius: 8px; min-width: 200px; }
          .order-title { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; opacity: 0.9; margin-bottom: 5px; }
          .folio { font-size: 22px; font-weight: 700; margin: 5px 0; }
          .order-date { font-size: 10px; opacity: 0.9; }
          .info-grid { display: flex; gap: 20px; margin-bottom: 25px; }
          .info-box { flex: 1; background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #1e3a5f; }
          .info-box.delivery { border-left-color: #d4a024; }
          .info-box h3 { margin: 0 0 10px 0; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #1e3a5f; }
          .info-box p { margin: 4px 0; font-size: 11px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background: #1e3a5f; color: white; padding: 10px; text-align: left; font-size: 10px; text-transform: uppercase; }
          td { padding: 10px; border: 1px solid #e0e0e0; }
          .totals-section { display: flex; justify-content: flex-end; margin-top: 20px; }
          .totals-box { background: #f8f9fa; padding: 15px 20px; border-radius: 6px; min-width: 250px; }
          .totals-box .row { display: flex; justify-content: space-between; margin: 5px 0; font-size: 11px; }
          .totals-box .total-row { border-top: 2px solid #1e3a5f; padding-top: 8px; margin-top: 8px; font-weight: 700; font-size: 14px; color: #1e3a5f; }
          .entregas-section { margin: 25px 0; padding: 15px; background: #fffbeb; border-radius: 8px; border: 1px solid #d4a024; }
          .entregas-section h3 { color: #1e3a5f; margin: 0 0 15px 0; font-size: 13px; }
          .entregas-section table { margin: 0; }
          .entregas-section th { background: #d4a024; color: #1e3a5f; }
          .entregas-section td { padding: 8px; border: 1px solid #d4a024; }
          .notes { margin: 20px 0; padding: 15px; background: #f0f0f0; border-radius: 6px; }
          .notes h4 { margin: 0 0 10px 0; font-size: 11px; color: #1e3a5f; }
          .signature-section { display: flex; justify-content: space-between; margin-top: 50px; gap: 30px; }
          .signature-box { flex: 1; text-align: center; }
          .signature-line { border-top: 1px solid #333; padding-top: 8px; margin-top: 40px; font-size: 10px; color: #666; }
          .signature-name { font-size: 11px; color: #1a1a1a; margin-top: 5px; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; font-size: 9px; color: #999; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-info">
            ${logoBase64 ? `<img src="${logoBase64}" alt="Almasa" style="max-width: 180px; margin-bottom: 10px;">` : '<div class="company-logo">ALMASA</div>'}
            <div class="company-subtitle">${COMPANY_DATA.razonSocial}</div>
            <div class="company-details">
              <strong>RFC:</strong> ${COMPANY_DATA.rfc}<br>
              <strong>Dirección:</strong> ${COMPANY_DATA.direccionCompletaMayusculas}<br>
              <strong>Tel:</strong> ${COMPANY_DATA.telefonosFormateados} | <strong>Email:</strong> ${COMPANY_DATA.emails.compras}
            </div>
          </div>
          <div class="order-box">
            <div class="order-title">Orden de Compra</div>
            <div class="folio">${orden.folio}</div>
            <div class="order-date">${fechaOrden}</div>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-box">
            <h3>🏢 Proveedor</h3>
            ${getProveedorFiscalHTML(orden.proveedores)}
          </div>
          <div class="info-box delivery">
            <h3>📅 Entrega</h3>
            <p><strong>${orden.entregas_multiples ? 'Ver calendario de entregas' : fechaEntrega}</strong></p>
            <p>Lugar: ${COMPANY_DATA.direccionCompletaMayusculas}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 80px;">Código</th>
              <th>Producto</th>
              <th style="width: 80px; text-align: center;">Cantidad</th>
              <th style="width: 100px; text-align: right;">P. Unit.</th>
              <th style="width: 100px; text-align: right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${productosHTML}
          </tbody>
        </table>

        <div class="totals-section">
          <div class="totals-box">
            <div class="row"><span>Subtotal:</span><span>$${orden.subtotal?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
            <div class="row"><span>IVA (16%):</span><span>$${orden.impuestos?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
            <div class="row total-row"><span>TOTAL:</span><span>$${orden.total?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
          </div>
        </div>

        ${entregasHTML}

        ${orden.notas ? `<div class="notes"><h4>📝 Notas</h4><p>${orden.notas}</p></div>` : ''}

        <div class="signature-section">
          <div class="signature-box"><div class="signature-line">Elaboró</div><div class="signature-name">${nombreCreador}</div></div>
          <div class="signature-box"><div class="signature-line">Autorizó</div>${nombreAutorizador ? `<div class="signature-name">${nombreAutorizador}</div>` : ''}</div>
          <div class="signature-box"><div class="signature-line">Recibió Proveedor</div></div>
        </div>

        <div class="footer">
          <p>Documento generado el ${new Date().toLocaleString('es-MX')}</p>
          <p><strong>${COMPANY_DATA.razonSocial}</strong> | ${COMPANY_DATA.emails.compras} | Tel: ${COMPANY_DATA.telefonos.principal}</p>
        </div>
      </body>
      </html>
    `;
  };

  // Validate email format
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleReenviar = async () => {
    const destinatarioPrincipal = emailDestinatario;
    const destinatarioAdicional = correoAdicional.trim();

    if (!destinatarioPrincipal && !destinatarioAdicional) {
      toast({
        title: "Sin correo",
        description: "Debe haber al menos un correo para enviar la orden",
        variant: "destructive",
      });
      return;
    }

    if (destinatarioAdicional && !isValidEmail(destinatarioAdicional)) {
      toast({
        title: "Correo inválido",
        description: "El correo adicional no tiene un formato válido",
        variant: "destructive",
      });
      return;
    }

    setEnviando(true);

    try {
      // Generate PDF content
      const pdfContent = await generarPDFContent();
      const pdfBase64 = btoa(unescape(encodeURIComponent(pdfContent)));

      // Get fecha_entrega for the propose-date action
      const fechaEntrega = orden.fecha_entrega_programada 
        ? orden.fecha_entrega_programada 
        : null;

      // Generate signed confirmation URL via edge function
      const { data: confirmUrlData, error: confirmUrlError } = await supabase.functions.invoke("generate-oc-confirmation-url", {
        body: {
          ordenId: orden.id,
          action: "confirm",
        },
      });

      if (confirmUrlError || !confirmUrlData?.url) {
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
        throw new Error("No se pudo generar URL de propuesta de fecha");
      }

      const confirmUrl = confirmUrlData.url;
      const proposeDateUrl = proposeDateUrlData.url;
      const trackingPixelUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/confirmar-oc?id=${orden.id}&action=track`;
      const logoUrl = `${window.location.origin}/logo-almasa-header.png`;

      // Email body
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <div style="text-align: center; padding: 20px; background-color: #f8f9fa; border-radius: 8px 8px 0 0; border-bottom: 3px solid #c41e3a;">
            <img src="${logoUrl}" alt="Abarrotes La Manita" style="max-width: 180px; height: auto;" />
          </div>
          <div style="padding: 20px;">
            <h2 style="color: #2e7d32; margin-top: 0;">Orden de Compra: ${orden.folio}</h2>
            <p>Estimado proveedor <strong>${nombreProveedor}</strong>,</p>
            <p>Por medio del presente, le reenviamos nuestra orden de compra.</p>
            <p><strong>Adjunto encontrará el documento formal de la orden de compra en formato HTML que puede abrir en cualquier navegador e imprimir.</strong></p>
            
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Folio:</strong> ${orden.folio}</p>
              <p style="margin: 5px 0;"><strong>Total:</strong> $${orden.total?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
              <p style="margin: 5px 0;"><strong>Fecha de la orden:</strong> ${new Date(orden.fecha_orden).toLocaleDateString('es-MX')}</p>
              ${fechaEntrega ? `<p style="margin: 5px 0;"><strong>Fecha de entrega solicitada:</strong> ${(() => {
                const [year, month, day] = fechaEntrega.split('-').map(Number);
                return new Date(year, month - 1, day).toLocaleDateString('es-MX');
              })()}</p>` : ''}
            </div>
            
            ${orden.notas ? `<p><strong>Notas:</strong> ${orden.notas}</p>` : ''}

            <div style="text-align: center; margin: 30px 0;">
              <p style="color: #333; font-size: 14px; margin-bottom: 20px;"><strong>¿Puede cumplir con la fecha de entrega?</strong></p>
              
              <div style="display: inline-block;">
                <a href="${confirmUrl}" style="display: inline-block; background-color: #22c55e; color: white; padding: 14px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; margin: 5px;">
                  ✓ Confirmar Fecha
                </a>
                <a href="${proposeDateUrl}" style="display: inline-block; background-color: #f59e0b; color: white; padding: 14px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; margin: 5px;">
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
              Este correo fue reenviado desde el sistema de Abarrotes La Manita.<br/>
              <strong>Importante:</strong> Su respuesta nos ayuda a planificar mejor nuestras operaciones.
            </p>
            <img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />
          </div>
        </div>
      `;

      const attachments = [
        {
          filename: `Orden_Compra_${orden.folio}.html`,
          content: pdfBase64,
          mimeType: 'text/html'
        }
      ];

      // Determine recipients - if we have both, send to both (CC the additional)
      const toRecipient = destinatarioPrincipal || destinatarioAdicional;
      const ccRecipient = destinatarioPrincipal && destinatarioAdicional ? destinatarioAdicional : undefined;

      // Send email
      const { data, error } = await supabase.functions.invoke('gmail-api', {
        body: {
          action: 'send',
          email: 'compras@almasa.com.mx',
          to: toRecipient,
          cc: ccRecipient,
          subject: `[REENVÍO] Orden de Compra ${orden.folio} - Abarrotes La Manita`,
          body: htmlBody,
          attachments: attachments,
        },
      });

      const asunto = `[REENVÍO] Orden de Compra ${orden.folio} - Abarrotes La Manita`;
      const destinatariosTexto = ccRecipient ? `${toRecipient}, ${ccRecipient}` : toRecipient;
      
      if (error) {
        await registrarCorreoEnviado({
          tipo: "reenvio_oc",
          referencia_id: orden.id,
          destinatario: destinatariosTexto,
          asunto: asunto,
          gmail_message_id: null,
          error: error.message || "Error desconocido",
        });
        throw error;
      }

      // Register successful send
      await registrarCorreoEnviado({
        tipo: "reenvio_oc",
        referencia_id: orden.id,
        destinatario: destinatariosTexto,
        asunto: asunto,
        gmail_message_id: data?.messageId || null,
        contenido_preview: `Orden de compra reenviada a ${nombreProveedor}. Total: $${orden.total?.toLocaleString('es-MX')}`,
      });

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["correos-enviados-oc", orden.id] });
      queryClient.invalidateQueries({ queryKey: ["ordenes_compra"] });

      toast({
        title: "OC reenviada",
        description: `La orden se reenvió exitosamente a ${destinatariosTexto}`,
      });
      
      // If there was an additional email, ask if they want to save it
      if (destinatarioAdicional) {
        setCorreoParaGuardar(destinatarioAdicional);
        setMostrarGuardarContacto(true);
      } else {
        setCorreoAdicional("");
        onOpenChange(false);
      }
    } catch (error: any) {
      console.error('Error resending OC:', error);
      toast({
        title: "Error al reenviar",
        description: error.message || "No se pudo reenviar el correo",
        variant: "destructive",
      });
    } finally {
      setEnviando(false);
    }
  };

  const handleGuardarContacto = async () => {
    if (!orden?.proveedor_id || !correoParaGuardar) return;
    
    setGuardandoContacto(true);
    try {
      const { error } = await supabase.from("proveedor_contactos").insert({
        proveedor_id: orden.proveedor_id,
        nombre: "Contacto adicional",
        telefono: "",
        email: correoParaGuardar,
        recibe_ordenes: true,
        activo: true,
      });
      
      if (error) throw error;
      
      toast({
        title: "Contacto guardado",
        description: `El correo ${correoParaGuardar} fue agregado a los contactos del proveedor`,
      });
      
      queryClient.invalidateQueries({ queryKey: ["proveedor-contactos"] });
      queryClient.invalidateQueries({ queryKey: ["proveedor-contacto-ordenes", orden.proveedor_id] });
    } catch (error: any) {
      console.error("Error saving contact:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar el contacto",
        variant: "destructive",
      });
    } finally {
      setGuardandoContacto(false);
      setMostrarGuardarContacto(false);
      setCorreoAdicional("");
      setCorreoParaGuardar("");
      onOpenChange(false);
    }
  };

  const handleCerrarSinGuardar = () => {
    setMostrarGuardarContacto(false);
    setCorreoAdicional("");
    setCorreoParaGuardar("");
    onOpenChange(false);
  };

  if (!orden) return null;

  const puedeEnviar = emailDestinatario || (correoAdicional.trim() && isValidEmail(correoAdicional.trim()));

  return (
    <>
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Reenviar Orden de Compra
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Desea reenviar la OC <strong>{orden.folio}</strong> al destinatario?
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                <strong>Proveedor:</strong> {nombreProveedor}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                <strong>Correo:</strong>{" "}
                {loadingContacto ? (
                  <span className="text-muted-foreground">Cargando...</span>
                ) : emailDestinatario ? (
                  emailDestinatario
                ) : (
                  <span className="text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Sin correo configurado
                  </span>
                )}
              </span>
            </div>
            {contactoOrden?.nombre && (
              <div className="text-xs text-muted-foreground ml-6">
                Contacto: {contactoOrden.nombre}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="correo-adicional" className="text-sm font-medium">
              Agregar otro correo (opcional)
            </Label>
            <Input
              id="correo-adicional"
              type="email"
              placeholder="otro@proveedor.com"
              value={correoAdicional}
              onChange={(e) => setCorreoAdicional(e.target.value)}
              disabled={enviando}
            />
            <p className="text-xs text-muted-foreground">
              Este correo también recibirá la OC
            </p>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={enviando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleReenviar();
              }}
              disabled={enviando || !puedeEnviar}
              className="bg-primary hover:bg-primary/90"
            >
              {enviando ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Confirmar Reenvío"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog to save additional contact */}
      <AlertDialog open={mostrarGuardarContacto} onOpenChange={setMostrarGuardarContacto}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              ¿Guardar contacto?
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Desea guardar el correo <strong>{correoParaGuardar}</strong> en los 
              contactos de <strong>{nombreProveedor}</strong> para futuros envíos?
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCerrarSinGuardar} disabled={guardandoContacto}>
              No, solo esta vez
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleGuardarContacto();
              }}
              disabled={guardandoContacto}
              className="bg-primary hover:bg-primary/90"
            >
              {guardandoContacto ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Sí, guardar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ReenviarOCDialog;
