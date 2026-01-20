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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Mail, AlertTriangle, ArrowRight, Package, Calendar, DollarSign, Paperclip } from "lucide-react";
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

  // Fetch complete order data for PDF generation
  const { data: ordenCompleta } = useQuery({
    queryKey: ["orden-completa-notificacion", ordenId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ordenes_compra")
        .select(`
          *,
          proveedores(*),
          ordenes_compra_detalles(*, productos(*)),
          ordenes_compra_entregas(*)
        `)
        .eq("id", ordenId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch creator profile for PDF
  const { data: creadorProfile } = useQuery({
    queryKey: ["profile-notificacion", ordenCompleta?.creado_por],
    queryFn: async () => {
      if (!ordenCompleta?.creado_por) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", ordenCompleta.creado_por)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!ordenCompleta?.creado_por,
  });

  // Fetch authorizer profile for PDF
  const { data: autorizadorProfile } = useQuery({
    queryKey: ["profile-autorizador-notificacion", ordenCompleta?.autorizado_por],
    queryFn: async () => {
      if (!ordenCompleta?.autorizado_por) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", ordenCompleta.autorizado_por)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!ordenCompleta?.autorizado_por,
  });

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

  // Generate PDF content using same format as ReenviarOCDialog
  const generarPDFContent = async () => {
    if (!ordenCompleta) return '';
    
    const logoBase64 = await getLogoBase64();
    
    // Get scheduled deliveries if order has multiple deliveries
    const entregasProgramadas = ordenCompleta.ordenes_compra_entregas || [];
    
    const detalles = ordenCompleta.ordenes_compra_detalles || [];
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

    const fechaOrden = new Date(ordenCompleta.fecha_orden).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    let fechaEntrega = 'Por confirmar';
    if (ordenCompleta.fecha_entrega_programada) {
      const [year, month, day] = ordenCompleta.fecha_entrega_programada.split('-').map(Number);
      const fechaLocal = new Date(year, month - 1, day);
      fechaEntrega = fechaLocal.toLocaleDateString('es-MX', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }

    const nombreCreador = creadorProfile?.full_name || 'Usuario';
    const nombreAutorizador = ordenCompleta?.autorizado_por && autorizadorProfile?.full_name 
      ? autorizadorProfile.full_name 
      : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Orden de Compra ${ordenCompleta.folio} - ACTUALIZADA</title>
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
          .order-box { text-align: right; background: linear-gradient(135deg, #b45309 0%, #d97706 100%); color: white; padding: 15px 20px; border-radius: 8px; min-width: 200px; }
          .order-title { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; opacity: 0.9; margin-bottom: 5px; }
          .folio { font-size: 22px; font-weight: 700; margin: 5px 0; }
          .order-date { font-size: 10px; opacity: 0.9; }
          .updated-badge { background: #fef3c7; color: #92400e; padding: 4px 8px; border-radius: 4px; font-size: 9px; font-weight: bold; margin-top: 8px; display: inline-block; }
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
            <div class="folio">${ordenCompleta.folio}</div>
            <div class="order-date">${fechaOrden}</div>
            <div class="updated-badge">⚠️ DOCUMENTO ACTUALIZADO</div>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-box">
            <h3>🏢 Proveedor</h3>
            ${getProveedorFiscalHTML(ordenCompleta.proveedores)}
          </div>
          <div class="info-box delivery">
            <h3>📅 Entrega</h3>
            <p><strong>${ordenCompleta.entregas_multiples ? 'Ver calendario de entregas' : fechaEntrega}</strong></p>
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
            <div class="row"><span>Subtotal:</span><span>$${ordenCompleta.subtotal?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
            <div class="row"><span>IVA (16%):</span><span>$${ordenCompleta.impuestos?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
            <div class="row total-row"><span>TOTAL:</span><span>$${ordenCompleta.total?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
          </div>
        </div>

        ${entregasHTML}

        ${ordenCompleta.notas ? `<div class="notes"><h4>📝 Notas</h4><p>${ordenCompleta.notas}</p></div>` : ''}

        <div class="signature-section">
          <div class="signature-box"><div class="signature-line">Elaboró</div><div class="signature-name">${nombreCreador}</div></div>
          <div class="signature-box"><div class="signature-line">Autorizó</div>${nombreAutorizador ? `<div class="signature-name">${nombreAutorizador}</div>` : ''}</div>
          <div class="signature-box"><div class="signature-line">Recibió Proveedor</div></div>
        </div>

        <div class="footer">
          <p>Documento ACTUALIZADO generado el ${new Date().toLocaleString('es-MX')}</p>
          <p><strong>${COMPANY_DATA.razonSocial}</strong> | ${COMPANY_DATA.emails.compras} | Tel: ${COMPANY_DATA.telefonos.principal}</p>
        </div>
      </body>
      </html>
    `;
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

    if (!ordenCompleta) {
      toast({
        title: "Cargando datos",
        description: "Espera mientras se cargan los datos de la orden",
        variant: "destructive",
      });
      return;
    }

    setEnviando(true);

    try {
      const logoBase64 = await getLogoBase64();
      const cambiosANotificar = cambiosSeleccionados.map(i => cambios[i]);

      // Generate the updated PDF
      const pdfContent = await generarPDFContent();
      const pdfBase64 = btoa(unescape(encodeURIComponent(pdfContent)));

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

      // Build products table for email body
      const detalles = ordenCompleta.ordenes_compra_detalles || [];
      const productosEmailHTML = detalles.map((d: any) => 
        `<tr>
          <td style="padding: 10px; border: 1px solid #ddd;">${d.productos?.codigo || '-'}</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${d.productos?.nombre || 'Producto'}</td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${d.cantidad_ordenada}</td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">$${d.precio_unitario_compra?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">$${d.subtotal?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
        </tr>`
      ).join('');

      // Format delivery date
      let fechaEntregaEmail = 'Por confirmar';
      if (ordenCompleta.fecha_entrega_programada) {
        const [year, month, day] = ordenCompleta.fecha_entrega_programada.split('-').map(Number);
        const fechaLocal = new Date(year, month - 1, day);
        fechaEntregaEmail = fechaLocal.toLocaleDateString('es-MX', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      }

      // Build deliveries section for email
      let entregasEmailHTML = '';
      const entregasProgramadas = ordenCompleta.ordenes_compra_entregas || [];
      if (entregasProgramadas.length > 0) {
        const entregasRows = entregasProgramadas.map((e: any) => {
          let fecha = '<span style="color: #d4a024;">Pendiente</span>';
          if (e.fecha_programada) {
            const [year, month, day] = e.fecha_programada.split('-').map(Number);
            const fechaLocal = new Date(year, month - 1, day);
            fecha = fechaLocal.toLocaleDateString('es-MX', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
          }
          return `<tr>
            <td style="padding: 8px; border: 1px solid #d4a024; text-align: center;">${e.numero_entrega}</td>
            <td style="padding: 8px; border: 1px solid #d4a024;">${fecha}</td>
            <td style="padding: 8px; border: 1px solid #d4a024; text-align: center;">${e.cantidad_bultos} bultos</td>
          </tr>`;
        }).join('');

        entregasEmailHTML = `
          <div style="background-color: #fffbeb; border: 1px solid #d4a024; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <h4 style="color: #92400e; margin: 0 0 10px 0;">📅 Calendario de Entregas</h4>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background-color: #d4a024; color: white;">
                  <th style="padding: 8px; border: 1px solid #d4a024;">Entrega #</th>
                  <th style="padding: 8px; border: 1px solid #d4a024;">Fecha</th>
                  <th style="padding: 8px; border: 1px solid #d4a024;">Cantidad</th>
                </tr>
              </thead>
              <tbody>
                ${entregasRows}
              </tbody>
            </table>
          </div>
        `;
      }

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px;">
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 20px;">
            ${logoBase64 ? `<img src="${logoBase64}" alt="ALMASA" style="height: 60px;" />` : '<h1 style="color: #B22234;">ALMASA</h1>'}
          </div>
          
          <!-- Alert Banner -->
          <div style="background-color: #FEF3C7; border: 2px solid #F59E0B; border-radius: 8px; padding: 20px; margin-bottom: 20px; text-align: center;">
            <h2 style="color: #92400E; margin: 0;">⚠️ MODIFICACIÓN - Orden de Compra: ${folio}</h2>
          </div>
          
          <!-- Company Info -->
          <div style="background-color: #f8f9fa; border-left: 4px solid #1e3a5f; padding: 15px; margin-bottom: 20px;">
            <h4 style="margin: 0 0 8px 0; color: #1e3a5f;">🏢 ${COMPANY_DATA.razonSocial}</h4>
            <p style="margin: 3px 0; font-size: 13px;">RFC: ${COMPANY_DATA.rfc}</p>
            <p style="margin: 3px 0; font-size: 13px;">${COMPANY_DATA.direccionCompletaMayusculas}</p>
            <p style="margin: 3px 0; font-size: 13px;">Tel: ${COMPANY_DATA.telefonosFormateados} | ${COMPANY_DATA.emails.compras}</p>
          </div>

          <!-- Supplier Info -->
          <div style="background-color: #f0f9ff; border-left: 4px solid #0284c7; padding: 15px; margin-bottom: 20px;">
            <h4 style="margin: 0 0 8px 0; color: #0369a1;">📦 Proveedor: ${proveedorNombre.toUpperCase()}</h4>
            ${ordenCompleta.proveedores?.rfc ? `<p style="margin: 3px 0; font-size: 13px;">RFC: ${ordenCompleta.proveedores.rfc}</p>` : ''}
          </div>

          <!-- Delivery Info -->
          <div style="background-color: #fef3c7; border-left: 4px solid #d4a024; padding: 15px; margin-bottom: 20px;">
            <h4 style="margin: 0 0 8px 0; color: #92400e;">📅 Fecha de Entrega</h4>
            <p style="margin: 0; font-size: 14px; font-weight: bold;">${ordenCompleta.entregas_multiples ? 'Ver calendario de entregas abajo' : fechaEntregaEmail}</p>
            <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">Lugar: ${COMPANY_DATA.direccionCompletaMayusculas}</p>
          </div>

          <!-- Products Table -->
          <h4 style="color: #1e3a5f; border-bottom: 2px solid #1e3a5f; padding-bottom: 5px;">📋 Productos</h4>
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <thead>
              <tr style="background-color: #1e3a5f; color: white;">
                <th style="padding: 10px; border: 1px solid #1e3a5f;">Código</th>
                <th style="padding: 10px; border: 1px solid #1e3a5f;">Producto</th>
                <th style="padding: 10px; border: 1px solid #1e3a5f; text-align: center;">Cantidad</th>
                <th style="padding: 10px; border: 1px solid #1e3a5f; text-align: right;">P. Unit.</th>
                <th style="padding: 10px; border: 1px solid #1e3a5f; text-align: right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${productosEmailHTML}
            </tbody>
          </table>

          <!-- Totals -->
          <div style="display: flex; justify-content: flex-end; margin: 20px 0;">
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; min-width: 200px;">
              <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                <span>Subtotal:</span>
                <span>$${ordenCompleta.subtotal?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                <span>IVA (16%):</span>
                <span>$${ordenCompleta.impuestos?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin: 8px 0; padding-top: 8px; border-top: 2px solid #1e3a5f; font-weight: bold; font-size: 16px; color: #1e3a5f;">
                <span>TOTAL:</span>
                <span>$${ordenCompleta.total?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          ${entregasEmailHTML}

          <!-- Changes Section -->
          <div style="background-color: #fef2f2; border: 2px solid #ef4444; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h4 style="color: #dc2626; margin: 0 0 15px 0;">🔄 CAMBIOS REALIZADOS EN ESTA ORDEN:</h4>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background-color: #fee2e2;">
                  <th style="padding: 10px; border: 1px solid #fca5a5; text-align: left;">Producto</th>
                  <th style="padding: 10px; border: 1px solid #fca5a5; text-align: left;">Cambio</th>
                  <th style="padding: 10px; border: 1px solid #fca5a5; text-align: center;">Anterior</th>
                  <th style="padding: 10px; border: 1px solid #fca5a5; text-align: center;">Nuevo</th>
                </tr>
              </thead>
              <tbody>
                ${cambiosHTML}
              </tbody>
            </table>
          </div>
          
          ${mensajeAdicional ? `
            <div style="background-color: #f0f9ff; border-left: 4px solid #0284c7; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #0369a1;"><strong>📝 Nota adicional:</strong></p>
              <p style="margin: 10px 0 0 0;">${mensajeAdicional}</p>
            </div>
          ` : ''}
          
          <div style="background-color: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #047857;">
              <strong>📎 Documento adjunto:</strong> Se incluye el documento actualizado de la orden de compra con todos los cambios aplicados.
            </p>
          </div>
          
          <p style="color: #666; margin-top: 30px;">
            <strong>Importante:</strong> Por favor tome nota de estos cambios y revise el documento adjunto para el cumplimiento de la orden actualizada.
          </p>
          
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;" />
          <p style="color: #666; font-size: 12px; text-align: center;">
            Este correo fue enviado automáticamente desde el sistema de ${COMPANY_DATA.razonSocial}.<br/>
            Para cualquier duda, favor de comunicarse al ${COMPANY_DATA.emails.compras}
          </p>
        </div>
      `;

      const asunto = `⚠️ MODIFICACIÓN OC ${folio} - ${proveedorNombre.toUpperCase()}`;

      // Prepare attachment
      const attachments = [
        {
          filename: `OC_${folio}_ACTUALIZADA.html`,
          content: pdfBase64,
          mimeType: 'text/html'
        }
      ];

      // Send email via gmail-api with attachment
      const { data, error } = await supabase.functions.invoke('gmail-api', {
        body: {
          action: 'send',
          email: 'compras@almasa.com.mx',
          to: emailDestinatario,
          subject: asunto,
          body: htmlBody,
          attachments: attachments,
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
        contenido_preview: `Cambios notificados con PDF adjunto: ${resumenCambios.substring(0, 150)}`,
      });

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["correos-enviados-oc", ordenId] });
      queryClient.invalidateQueries({ queryKey: ["ordenes_compra"] });

      toast({
        title: "Notificación enviada con PDF",
        description: `Se informó al proveedor de los cambios en la OC ${folio} con el documento actualizado adjunto`,
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

              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                <Paperclip className="h-4 w-4" />
                <span>Se adjuntará el documento completo de la OC actualizada</span>
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
            disabled={enviando || !emailDestinatario || cambiosSeleccionados.length === 0 || !ordenCompleta}
          >
            {enviando ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Enviar con PDF
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default NotificarCambiosOCDialog;
