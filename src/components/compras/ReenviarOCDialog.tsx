import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { COMPANY_DATA } from "@/constants/companyData";
import { getProveedorFiscalHTML } from "@/lib/proveedorUtils";
import { htmlToPdfBase64 } from "@/lib/htmlToPdfBase64";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Mail, Building2, AlertCircle, UserPlus, CheckCircle2 } from "lucide-react";
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
  const [pasoActual, setPasoActual] = useState("");
  const [correoAdicional, setCorreoAdicional] = useState("");
  const [mostrarGuardarContacto, setMostrarGuardarContacto] = useState(false);
  const [guardandoContacto, setGuardandoContacto] = useState(false);
  const [correoParaGuardar, setCorreoParaGuardar] = useState("");
  const [nombreContactoNuevo, setNombreContactoNuevo] = useState("");
  const [recibeOrdenes, setRecibeOrdenes] = useState(true);
  const [recibePagos, setRecibePagos] = useState(false);
  const [correosEnviados, setCorreosEnviados] = useState<string[]>([]);

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

  let logoCache: string | null = null;

  const generarPDFContent = async () => {
    if (!logoCache) {
      logoCache = await getLogoBase64();
    }
    const logoBase64 = logoCache;
    
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
    const pesoTotalOC = detalles.reduce((sum: number, d: any) => sum + ((d.cantidad_ordenada || 0) * (d.productos?.peso_kg || 0)), 0);
    const productosHTML = detalles.map((d: any) => {
      const kgTotal = (d.cantidad_ordenada || 0) * (d.productos?.peso_kg || 0);
      const precioLabel = d.productos?.precio_por_kilo ? `$${d.precio_unitario_compra?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}/kg` : `$${d.precio_unitario_compra?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
      return `<tr>
        <td style="padding: 10px; border: 1px solid #333;">${d.productos?.codigo || '-'}</td>
        <td style="padding: 10px; border: 1px solid #333;">${d.productos?.nombre || 'Producto'}</td>
        <td style="padding: 10px; border: 1px solid #333; text-align: center;">${d.cantidad_ordenada} ${d.productos?.unidad || ''}</td>
        <td style="padding: 10px; border: 1px solid #333; text-align: right; color: #666;">${kgTotal > 0 ? kgTotal.toLocaleString() + ' kg' : '-'}</td>
        <td style="padding: 10px; border: 1px solid #333; text-align: right;">${precioLabel}</td>
        <td style="padding: 10px; border: 1px solid #333; text-align: right;">$${d.subtotal?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
      </tr>`;
    }).join('');

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
              <th style="width: 70px;">Código</th>
              <th>Producto</th>
              <th style="width: 80px; text-align: center;">Cantidad</th>
              <th style="width: 70px; text-align: right;">KG</th>
              <th style="width: 90px; text-align: right;">Precio</th>
              <th style="width: 90px; text-align: right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${productosHTML}
          </tbody>
        </table>
        ${pesoTotalOC > 0 ? `<p style="text-align: right; font-size: 11px; color: #666; margin-top: 5px;">Peso total: <strong>${pesoTotalOC.toLocaleString()} kg</strong></p>` : ''}

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
          <div class="signature-box">${nombreCreador ? `<div class="signature-name">${nombreCreador}</div>` : ''}<div class="signature-line">Departamento de Compras</div></div>
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
      setPasoActual("Preparando documento...");
      const pdfContent = await generarPDFContent();

      setPasoActual("Generando PDF...");
      const pdfBase64 = await htmlToPdfBase64(pdfContent);

      // NOTE: Confirmation URL generation removed - confirmation system deprecated
      // Email is sent without confirmation buttons
      const logoUrl = `${window.location.origin}/logo-almasa-header.png`;

      // Get fecha for display
      const fechaEntregaStr = orden.fecha_entrega_programada 
        ? (() => {
            const [year, month, day] = orden.fecha_entrega_programada.split('-').map(Number);
            return new Date(year, month - 1, day).toLocaleDateString('es-MX');
          })() 
        : null;

      // Email body - simplified without confirmation buttons
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <div style="text-align: center; padding: 20px; background-color: #f8f9fa; border-radius: 8px 8px 0 0; border-bottom: 3px solid #c41e3a;">
            <img src="${logoUrl}" alt="Abarrotes La Manita" style="max-width: 180px; height: auto;" />
          </div>
          <div style="padding: 20px;">
            <h2 style="color: #2e7d32; margin-top: 0;">Orden de Compra: ${orden.folio}</h2>
            <p>Estimado proveedor <strong>${nombreProveedor}</strong>,</p>
            <p>Por medio del presente, le reenviamos nuestra orden de compra.</p>
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
              Este correo fue reenviado desde el sistema de Abarrotes La Manita.<br/>
              Para cualquier duda o cambio en la fecha de entrega, favor de comunicarse a compras@almasa.com.mx
            </p>
          </div>
        </div>
      `;

      const attachments = [
        {
          filename: `Orden_Compra_${orden.folio}.pdf`,
          content: pdfBase64,
          mimeType: 'application/pdf'
        }
      ];

      // Determine recipients - if we have both, send to both (CC the additional)
      const toRecipient = destinatarioPrincipal || destinatarioAdicional;
      const ccRecipient = destinatarioPrincipal && destinatarioAdicional ? destinatarioAdicional : undefined;

      // Send email
      setPasoActual("Enviando email al proveedor...");
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
      setPasoActual("Registrando envío...");
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
        // Build list of emails sent
        const listaCorreos: string[] = [];
        if (destinatarioPrincipal) listaCorreos.push(destinatarioPrincipal);
        listaCorreos.push(destinatarioAdicional);
        setCorreosEnviados(listaCorreos);
        
        setCorreoParaGuardar(destinatarioAdicional);
        setNombreContactoNuevo("");
        setRecibeOrdenes(true);
        setRecibePagos(false);
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
      setPasoActual("");
    }
  };

  const handleGuardarContacto = async () => {
    if (!orden?.proveedor_id || !correoParaGuardar) return;
    
    setGuardandoContacto(true);
    try {
      const { error } = await supabase.from("proveedor_contactos").insert({
        proveedor_id: orden.proveedor_id,
        nombre: nombreContactoNuevo.trim() || "Contacto adicional",
        telefono: "",
        email: correoParaGuardar,
        recibe_ordenes: recibeOrdenes,
        recibe_pagos: recibePagos,
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
      setNombreContactoNuevo("");
      setCorreosEnviados([]);
      onOpenChange(false);
    }
  };

  const handleCerrarSinGuardar = () => {
    setMostrarGuardarContacto(false);
    setCorreoAdicional("");
    setCorreoParaGuardar("");
    setNombreContactoNuevo("");
    setCorreosEnviados([]);
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

          <AlertDialogFooter className="flex-col items-stretch">
            <div className="flex justify-end gap-2">
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
            </div>
            {pasoActual && (
              <p className="text-xs text-center text-muted-foreground animate-pulse mt-2">{pasoActual}</p>
            )}
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
          </AlertDialogHeader>
          
          {/* Success summary */}
          <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-green-800">
                Orden enviada exitosamente
              </p>
              <p className="text-green-600 text-xs mt-1">
                Se envió a: {correosEnviados.join(", ")}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              ¿Desea guardar <strong className="text-foreground">{correoParaGuardar}</strong> como 
              contacto de <strong className="text-foreground">{nombreProveedor}</strong>?
            </p>

            {/* Contact name field */}
            <div className="space-y-2">
              <Label htmlFor="nombre-contacto" className="text-sm font-medium">
                Nombre del contacto
              </Label>
              <Input
                id="nombre-contacto"
                placeholder="Ej: Juan Pérez - Ventas"
                value={nombreContactoNuevo}
                onChange={(e) => setNombreContactoNuevo(e.target.value)}
                className="h-9"
                disabled={guardandoContacto}
              />
            </div>

            {/* Responsibility checkboxes */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Este contacto recibe:</Label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox 
                    checked={recibeOrdenes} 
                    onCheckedChange={(checked) => setRecibeOrdenes(checked === true)}
                    disabled={guardandoContacto}
                  />
                  <span>Órdenes de compra</span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox 
                    checked={recibePagos} 
                    onCheckedChange={(checked) => setRecibePagos(checked === true)}
                    disabled={guardandoContacto}
                  />
                  <span>Comprobantes de pago</span>
                </label>
              </div>
            </div>
          </div>

          <AlertDialogFooter className="mt-2">
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
                "Sí, guardar contacto"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ReenviarOCDialog;
