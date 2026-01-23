import { useState, useEffect } from "react";
import { format, differenceInMinutes } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Package,
  Truck,
  User,
  FileText,
  Calendar,
  Camera,
  Download,
  X,
  Image as ImageIcon,
  Clock,
  PenTool,
  AlertTriangle,
  Mail,
  Loader2,
  Eye,
} from "lucide-react";
import { generarRecepcionPDF, generarRecepcionPDFBase64, generarRecepcionPDFBlobUrl } from "@/utils/recepcionPdfGenerator";
import { getDisplayName } from "@/lib/productUtils";
import { getEmailsInternos, enviarCopiaInterna } from "@/lib/emailNotificationsUtils";

interface RecepcionDetalleDialogProps {
  entregaId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface EvidenciaRecepcion {
  id: string;
  tipo_evidencia: string;
  ruta_storage: string;
  nombre_archivo: string;
  created_at: string;
  capturado_por_profile: {
    full_name: string;
  } | null;
}

interface RecepcionDetalle {
  id: string;
  numero_entrega: number;
  cantidad_bultos: number;
  fecha_programada: string | null;
  fecha_entrega_real: string | null;
  status: string;
  notas: string | null;
  firma_chofer_conformidad: string | null;
  firma_almacenista: string | null;
  llegada_registrada_en: string | null;
  recepcion_finalizada_en: string | null;
  placas_vehiculo: string | null;
  nombre_chofer_proveedor: string | null;
  numero_remision_proveedor: string | null;
  recibido_por_profile: {
    full_name: string;
  } | null;
  orden_compra: {
    id: string;
    folio: string;
    proveedor: {
      id: string;
      nombre: string;
    } | null;
    proveedor_nombre_manual: string | null;
  };
}

interface ProductoRecibido {
  id: string;
  cantidad_ordenada: number;
  cantidad_recibida: number;
  razon_diferencia: string | null;
  notas_diferencia: string | null;
  producto: {
    codigo: string;
    nombre: string;
    marca: string | null;
    especificaciones: string | null;
    contenido_empaque: string | null;
    peso_kg: number | null;
  };
}

// Helper to format duration
const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}min`;
  }
  return `${mins} minutos`;
};

// Map razón codes to labels
const RAZON_LABELS: Record<string, string> = {
  "roto": "Producto roto/dañado",
  "no_llego": "No llegó completo",
  "rechazado_calidad": "Rechazado por calidad",
  "otro": "Otro",
};

export const RecepcionDetalleDialog = ({
  entregaId,
  open,
  onOpenChange,
}: RecepcionDetalleDialogProps) => {
  const [loading, setLoading] = useState(true);
  const [recepcion, setRecepcion] = useState<RecepcionDetalle | null>(null);
  const [productos, setProductos] = useState<ProductoRecibido[]>([]);
  const [evidencias, setEvidencias] = useState<EvidenciaRecepcion[]>([]);
  const [evidenciasUrls, setEvidenciasUrls] = useState<Record<string, string>>({});
  const [imagenExpandida, setImagenExpandida] = useState<string | null>(null);
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const [reenviandoCorreo, setReenviandoCorreo] = useState(false);
  const [previsualizandoPdf, setPrevisualizandoPdf] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);

  useEffect(() => {
    if (open && entregaId) {
      loadRecepcion();
    }
  }, [open, entregaId]);

  const loadRecepcion = async () => {
    if (!entregaId) return;
    setLoading(true);
    
    try {
      // Load delivery details
      const { data: entrega, error: entregaError } = await supabase
        .from("ordenes_compra_entregas")
        .select(`
          id, numero_entrega, cantidad_bultos, fecha_programada, fecha_entrega_real, status, notas,
          firma_chofer_conformidad, firma_almacenista, firma_chofer_diferencia, sin_sellos, firma_chofer_sin_sellos,
          llegada_registrada_en, recepcion_finalizada_en, placas_vehiculo, nombre_chofer_proveedor, numero_remision_proveedor,
          recibido_por,
          orden_compra:ordenes_compra(
            id, folio, proveedor_nombre_manual,
            proveedor:proveedores(id, nombre)
          )
        `)
        .eq("id", entregaId)
        .single();

      if (entregaError) throw entregaError;
      
      // Fetch recibido_por profile separately to ensure we get the name
      let recibidoPorProfile: { full_name: string } | null = null;
      if ((entrega as any).recibido_por) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", (entrega as any).recibido_por)
          .maybeSingle();
        
        if (profileError) {
          console.warn("Error cargando perfil de almacenista:", profileError.message);
        }
        
        if (profile?.full_name) {
          recibidoPorProfile = { full_name: profile.full_name };
        }
      }
      
      // Merge the profile data
      const entregaConProfile = {
        ...entrega,
        recibido_por_profile: recibidoPorProfile
      };
      
      setRecepcion(entregaConProfile as unknown as RecepcionDetalle);

      // Load products from order
      const { data: productosData } = await supabase
        .from("ordenes_compra_detalles")
        .select(`
          id, cantidad_ordenada, cantidad_recibida, razon_diferencia, notas_diferencia,
          producto:productos(codigo, nombre, marca, especificaciones, contenido_empaque, peso_kg)
        `)
        .eq("orden_compra_id", (entrega as any).orden_compra.id);

      setProductos((productosData as unknown as ProductoRecibido[]) || []);

      // Load evidences from correct table - ALL types, no filter
      const { data: evidenciasData, error: evidenciasError } = await supabase
        .from("ordenes_compra_entregas_evidencias")
        .select(`id, tipo_evidencia, ruta_storage, nombre_archivo, created_at, fase`)
        .eq("entrega_id", entregaId)
        .order("created_at", { ascending: true });

      if (evidenciasError) {
        console.error("Error cargando evidencias:", evidenciasError.message, evidenciasError.code);
        toast.error("No se pudieron cargar las evidencias fotográficas");
      }
      
      const evidenciasList = (evidenciasData as unknown as EvidenciaRecepcion[]) || [];
      setEvidencias(evidenciasList);
      
      console.log("Evidencias encontradas:", evidenciasList.length, evidenciasList);

      // Get signed URLs for evidences - with better error handling
      const urls: Record<string, string> = {};
      
      if (evidenciasList.length > 0) {
        for (const ev of evidenciasList) {
          const rutaStorage = ev.ruta_storage;
          
          if (!rutaStorage) {
            console.warn(`Evidencia ${ev.id} sin ruta_storage`);
            continue;
          }
          
          console.log(`Generando URL para evidencia ${ev.tipo_evidencia}:`, rutaStorage);
          
          try {
            const { data: signedUrl, error: urlError } = await supabase.storage
              .from("recepciones-evidencias")
              .createSignedUrl(rutaStorage, 3600);
            
            if (urlError) {
              console.error(`Error generando URL para ${rutaStorage}:`, urlError.message);
              continue;
            }
            
            if (signedUrl?.signedUrl) {
              urls[ev.id] = signedUrl.signedUrl;
              console.log(`✓ URL generada para ${ev.tipo_evidencia}`);
            }
          } catch (urlGenError) {
            console.error(`Excepción generando URL para ${rutaStorage}:`, urlGenError);
          }
        }
      }
      
      setEvidenciasUrls(urls);
      console.log(`Total URLs generadas: ${Object.keys(urls).length} de ${evidenciasList.length} evidencias`);

    } catch (error) {
      console.error("Error cargando recepción:", error);
      toast.error("Error al cargar los detalles de la recepción");
    } finally {
      setLoading(false);
    }
  };

  const buildPdfData = () => {
    if (!recepcion) return null;
    
    // Filtrar evidencias que no son firmas para la galería de fotos
    const evidenciasConTipos = evidencias
      .filter(ev => !ev.tipo_evidencia.startsWith('firma_'))
      .map(ev => ({
        url: evidenciasUrls[ev.id] || "",
        tipo: ev.tipo_evidencia,
      }))
      .filter(e => e.url);
    
    // Buscar firma sin sellos en evidencias si no está en el campo directo
    let firmaSinSellos = (recepcion as any).firma_chofer_sin_sellos || null;
    if (!firmaSinSellos) {
      const evidenciaFirmaSinSellos = evidencias.find(ev => ev.tipo_evidencia === 'firma_sin_sellos');
      if (evidenciaFirmaSinSellos && evidenciasUrls[evidenciaFirmaSinSellos.id]) {
        firmaSinSellos = evidenciasUrls[evidenciaFirmaSinSellos.id];
      }
    }
    
    return {
      recepcion,
      productos,
      evidenciasConTipos,
      firmaChofer: recepcion.firma_chofer_conformidad,
      firmaAlmacenista: recepcion.firma_almacenista,
      firmaChoferDiferencia: (recepcion as any).firma_chofer_diferencia || null,
      firmaSinSellos,
      sinSellos: (recepcion as any).sin_sellos || false,
      llegadaRegistradaEn: recepcion.llegada_registrada_en,
      recepcionFinalizadaEn: recepcion.recepcion_finalizada_en,
      placasVehiculo: recepcion.placas_vehiculo,
      nombreChoferProveedor: recepcion.nombre_chofer_proveedor,
      numeroRemisionProveedor: recepcion.numero_remision_proveedor,
    };
  };

  const handleGenerarPDF = async () => {
    const pdfData = buildPdfData();
    if (!pdfData) return;
    
    setGenerandoPdf(true);
    try {
      await generarRecepcionPDF(pdfData);
      toast.success("PDF generado exitosamente");
    } catch (error) {
      console.error("Error generando PDF:", error);
      toast.error("Error al generar PDF. Revisa la consola para más detalles.");
    } finally {
      setGenerandoPdf(false);
    }
  };

  const handlePreviewPDF = async () => {
    const pdfData = buildPdfData();
    if (!pdfData) return;
    
    setPrevisualizandoPdf(true);
    setIframeLoading(true);
    try {
      const blobUrl = await generarRecepcionPDFBlobUrl(pdfData);
      setPdfPreviewUrl(blobUrl);
      setPreviewDialogOpen(true);
    } catch (error) {
      console.error("Error generando preview:", error);
      toast.error("Error al generar vista previa del PDF");
    } finally {
      setPrevisualizandoPdf(false);
    }
  };

  const getTipoEvidenciaLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      sello_1: "Sello Puerta 1",
      sello_2: "Sello Puerta 2",
      sello: "Sello",
      identificacion: "Identificación Chofer",
      placas: "Placas Vehículo",
      remision_proveedor: "Remisión Proveedor",
      caja_vacia: "Caja Vacía",
      producto_danado: "Producto Dañado",
      producto_rechazado: "Producto Rechazado",
      documento: "Documento",
      vehiculo: "Vehículo",
      producto: "Producto",
      otro: "Otro",
    };
    return labels[tipo] || tipo;
  };

  const handleReenviarCorreo = async () => {
    if (!recepcion) return;
    setReenviandoCorreo(true);
    
    try {
      // 1. Buscar contacto de logística del proveedor
      const proveedorId = recepcion.orden_compra.proveedor?.id;
      if (!proveedorId) {
        toast.error("No se encontró información del proveedor");
        return;
      }

      const { data: contactoLogistica } = await supabase
        .from("proveedor_contactos")
        .select("email, nombre")
        .eq("proveedor_id", proveedorId)
        .eq("recibe_ordenes", true)
        .maybeSingle();
      
      if (!contactoLogistica?.email) {
        toast.error("No se encontró un contacto de logística para este proveedor");
        return;
      }
      
      // 2. Generar PDF como base64
      const evidenciasConTipos = evidencias.map(ev => ({
        url: evidenciasUrls[ev.id] || "",
        tipo: ev.tipo_evidencia,
      })).filter(e => e.url);
      
      const pdfData = await generarRecepcionPDFBase64({
        recepcion,
        productos,
        evidenciasConTipos,
        firmaChofer: recepcion.firma_chofer_conformidad,
        firmaAlmacenista: recepcion.firma_almacenista,
        llegadaRegistradaEn: recepcion.llegada_registrada_en,
        recepcionFinalizadaEn: recepcion.recepcion_finalizada_en,
        placasVehiculo: recepcion.placas_vehiculo,
        nombreChoferProveedor: recepcion.nombre_chofer_proveedor,
        numeroRemisionProveedor: recepcion.numero_remision_proveedor,
      });
      
      // 3. Construir HTML del correo
      const provNombre = recepcion.orden_compra.proveedor?.nombre || 
                         recepcion.orden_compra.proveedor_nombre_manual || "Proveedor";
      const fechaRecepcion = recepcion.fecha_entrega_real 
        ? format(new Date(recepcion.fecha_entrega_real), "dd/MM/yyyy HH:mm")
        : "N/A";
      
      const asunto = `[REENVÍO] Confirmación de Recepción - ${recepcion.orden_compra.folio} - Entrega #${recepcion.numero_entrega}`;
      
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2 style="color: #333;">Confirmación de Recepción de Mercancía</h2>
          <p>Estimado proveedor <strong>${provNombre}</strong>,</p>
          <p>Le reenviamos la confirmación de recepción de la entrega correspondiente a:</p>
          <ul style="line-height: 1.8;">
            <li><strong>Orden de Compra:</strong> ${recepcion.orden_compra.folio}</li>
            <li><strong>Entrega #:</strong> ${recepcion.numero_entrega}</li>
            <li><strong>Fecha de recepción:</strong> ${fechaRecepcion}</li>
            <li><strong>Bultos recibidos:</strong> ${recepcion.cantidad_bultos || "N/A"}</li>
            ${recepcion.placas_vehiculo ? `<li><strong>Placas vehículo:</strong> ${recepcion.placas_vehiculo}</li>` : ""}
            ${recepcion.nombre_chofer_proveedor ? `<li><strong>Chofer:</strong> ${recepcion.nombre_chofer_proveedor}</li>` : ""}
          </ul>
          <p>Adjunto encontrará el documento PDF con el detalle completo de la recepción, 
          incluyendo fotos de evidencia y firmas de conformidad.</p>
          <p style="margin-top: 30px;">Saludos cordiales,<br/>
          <strong>Departamento de Compras</strong><br/>
          ABARROTESLA MANITA S.A. DE C.V.</p>
        </div>
      `;
      
      // 4. Enviar correo con PDF adjunto
      const { error: emailError } = await supabase.functions.invoke("gmail-api", {
        body: {
          action: "send",
          email: "compras@almasa.com.mx",
          to: contactoLogistica.email,
          subject: asunto,
          body: htmlBody,
          attachments: [{
            filename: pdfData.fileName,
            content: pdfData.base64,
            mimeType: "application/pdf"
          }]
        }
      });
      
      if (emailError) throw emailError;
      
      // 5. Enviar copia interna a admin/secretaria
      const emailsInternos = await getEmailsInternos();
      if (emailsInternos.length > 0) {
        await enviarCopiaInterna({
          asunto,
          htmlBody,
          emailsDestinatarios: emailsInternos,
          attachments: [{
            filename: pdfData.fileName,
            content: pdfData.base64,
            mimeType: "application/pdf"
          }]
        });
      }
      
      // 6. Registrar en historial de correos
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("correos_enviados").insert({
        tipo: "reenvio_recepcion",
        referencia_id: recepcion.id,
        destinatario: contactoLogistica.email,
        asunto: asunto,
        enviado_por: user?.id
      });
      
      toast.success(`Correo reenviado exitosamente a ${contactoLogistica.email}`);
      
    } catch (error) {
      console.error("Error reenviando correo:", error);
      toast.error("Error al reenviar el correo. Intente nuevamente.");
    } finally {
      setReenviandoCorreo(false);
    }
  };

  const proveedorNombre = recepcion?.orden_compra?.proveedor?.nombre || 
                          recepcion?.orden_compra?.proveedor_nombre_manual || 
                          "Proveedor";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Detalle de Recepción
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : recepcion ? (
            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="space-y-6">
                {/* Header info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="w-4 h-4" />
                      <span className="font-medium text-foreground">
                        {recepcion.orden_compra.folio}
                      </span>
                      <Badge variant="outline">Entrega #{recepcion.numero_entrega}</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Truck className="w-4 h-4 text-muted-foreground" />
                      {proveedorNombre}
                    </div>
                  </div>
                  <div className="space-y-2 text-right">
                    <Badge variant={recepcion.status === "recibida" ? "default" : "secondary"}>
                      {recepcion.status}
                    </Badge>
                    {recepcion.fecha_entrega_real && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 justify-end">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(recepcion.fecha_entrega_real), "PPP", { locale: es })}
                      </p>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Reception info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Recibido por</p>
                    <p className="font-medium flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      {recepcion.recibido_por_profile?.full_name || "No registrado"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Bultos recibidos</p>
                    <p className="font-medium">
                      {recepcion.cantidad_bultos?.toLocaleString() || "N/A"} bultos
                    </p>
                  </div>
                </div>

                {/* Timing and vehicle data */}
                {(recepcion.llegada_registrada_en || recepcion.placas_vehiculo || recepcion.nombre_chofer_proveedor) && (
                  <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                    <h3 className="font-medium mb-3 flex items-center gap-2 text-amber-700 dark:text-amber-400">
                      <Clock className="w-4 h-4" />
                      Datos de Llegada y Descarga
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      {recepcion.llegada_registrada_en && (
                        <div>
                          <p className="text-muted-foreground">Hora llegada</p>
                          <p className="font-medium">{format(new Date(recepcion.llegada_registrada_en), "dd/MM/yyyy HH:mm")}</p>
                        </div>
                      )}
                      {recepcion.recepcion_finalizada_en && (
                        <div>
                          <p className="text-muted-foreground">Hora finalización</p>
                          <p className="font-medium">{format(new Date(recepcion.recepcion_finalizada_en), "dd/MM/yyyy HH:mm")}</p>
                        </div>
                      )}
                      {recepcion.llegada_registrada_en && recepcion.recepcion_finalizada_en && (
                        <div>
                          <p className="text-muted-foreground">Duración descarga</p>
                          <p className="font-medium">
                            {formatDuration(differenceInMinutes(
                              new Date(recepcion.recepcion_finalizada_en),
                              new Date(recepcion.llegada_registrada_en)
                            ))}
                          </p>
                        </div>
                      )}
                      {recepcion.placas_vehiculo && (
                        <div>
                          <p className="text-muted-foreground">Placas vehículo</p>
                          <p className="font-medium">{recepcion.placas_vehiculo}</p>
                        </div>
                      )}
                      {recepcion.nombre_chofer_proveedor && (
                        <div>
                          <p className="text-muted-foreground">Chofer proveedor</p>
                          <p className="font-medium">{recepcion.nombre_chofer_proveedor}</p>
                        </div>
                      )}
                      {recepcion.numero_remision_proveedor && (
                        <div>
                          <p className="text-muted-foreground">No. remisión</p>
                          <p className="font-medium">{recepcion.numero_remision_proveedor}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {recepcion.notas && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-sm font-medium mb-1">Notas de recepción</p>
                    <p className="text-sm text-muted-foreground">{recepcion.notas}</p>
                  </div>
                )}

                <Separator />

                {/* Products */}
                <div>
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Productos Recibidos
                  </h3>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-2">Código</th>
                          <th className="text-left p-2">Producto</th>
                          <th className="text-right p-2">Ordenado</th>
                          <th className="text-right p-2">Recibido</th>
                          <th className="text-left p-2">Diferencia</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productos.map((p) => {
                          const hasDiferencia = p.cantidad_recibida < p.cantidad_ordenada;
                          return (
                            <tr 
                              key={p.id} 
                              className={`border-t ${hasDiferencia ? "bg-destructive/10" : ""}`}
                            >
                              <td className="p-2 font-mono text-xs">{p.producto?.codigo}</td>
                              <td className="p-2">{p.producto ? getDisplayName(p.producto) : '-'}</td>
                              <td className="p-2 text-right">{p.cantidad_ordenada}</td>
                              <td className={`p-2 text-right font-medium ${hasDiferencia ? "text-destructive" : ""}`}>
                                {p.cantidad_recibida}
                              </td>
                              <td className="p-2">
                                {hasDiferencia && (
                                  <div className="flex flex-col gap-1">
                                    <Badge variant="destructive" className="text-xs w-fit">
                                      -{p.cantidad_ordenada - p.cantidad_recibida}
                                    </Badge>
                                    {p.razon_diferencia && (
                                      <span className="text-xs text-muted-foreground">
                                        {RAZON_LABELS[p.razon_diferencia] || p.razon_diferencia}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <Separator />

                {/* Evidences gallery */}
                <div>
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    Evidencias Fotográficas ({evidencias.length})
                  </h3>
                  {evidencias.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No hay evidencias registradas
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {evidencias.map((ev) => (
                        <div
                          key={ev.id}
                          className="relative group cursor-pointer"
                          onClick={() => setImagenExpandida(evidenciasUrls[ev.id])}
                        >
                          <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                            {evidenciasUrls[ev.id] ? (
                              <img
                                src={evidenciasUrls[ev.id]}
                                alt={ev.tipo_evidencia}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="w-8 h-8 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 rounded-b-lg">
                            <Badge variant="secondary" className="text-xs">
                              {getTipoEvidenciaLabel(ev.tipo_evidencia)}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Digital signatures */}
                {(recepcion.firma_almacenista || recepcion.firma_chofer_conformidad) && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-medium mb-3 flex items-center gap-2">
                        <PenTool className="w-4 h-4" />
                        Firmas de Conformidad
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        {recepcion.firma_almacenista && (
                          <div className="border rounded-lg p-3 text-center bg-muted/30">
                            <img 
                              src={recepcion.firma_almacenista} 
                              alt="Firma Almacenista"
                              className="max-h-24 mx-auto mb-2"
                            />
                            <p className="text-xs text-muted-foreground">Firma Almacenista</p>
                          </div>
                        )}
                        {recepcion.firma_chofer_conformidad && (
                          <div className="border rounded-lg p-3 text-center bg-muted/30">
                            <img 
                              src={recepcion.firma_chofer_conformidad} 
                              alt="Firma Chofer/Proveedor"
                              className="max-h-24 mx-auto mb-2"
                            />
                            <p className="text-xs text-muted-foreground">Firma Chofer/Proveedor</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={handlePreviewPDF}
                    disabled={previsualizandoPdf || generandoPdf}
                  >
                    {previsualizandoPdf ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Eye className="w-4 h-4 mr-2" />
                    )}
                    Vista Previa
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleGenerarPDF}
                    disabled={generandoPdf || previsualizandoPdf}
                  >
                    {generandoPdf ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Descargar PDF
                  </Button>
                  <Button
                    onClick={handleReenviarCorreo}
                    disabled={reenviandoCorreo}
                  >
                    {reenviandoCorreo ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 mr-2" />
                        Reenviar a Proveedor
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </ScrollArea>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No se encontró la recepción
            </p>
          )}
        </DialogContent>
      </Dialog>

      {/* Expanded image dialog */}
      <Dialog open={!!imagenExpandida} onOpenChange={() => setImagenExpandida(null)}>
        <DialogContent className="max-w-4xl p-0">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-10 bg-background/80"
            onClick={() => setImagenExpandida(null)}
          >
            <X className="w-4 h-4" />
          </Button>
          {imagenExpandida && (
            <img
              src={imagenExpandida}
              alt="Evidencia"
              className="w-full h-auto max-h-[85vh] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* PDF Preview dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={(open) => {
        if (!open && pdfPreviewUrl) {
          URL.revokeObjectURL(pdfPreviewUrl);
          setPdfPreviewUrl(null);
        }
        setPreviewDialogOpen(open);
        if (!open) setIframeLoading(true);
      }}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Vista Previa - {recepcion?.orden_compra.folio}
            </DialogTitle>
            <DialogDescription>
              Revisa el documento antes de descargarlo
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 h-[calc(90vh-140px)] relative">
            {iframeLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background z-10 rounded-lg border">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
                  <p className="text-sm text-muted-foreground">Renderizando PDF...</p>
                </div>
              </div>
            )}
            {pdfPreviewUrl && (
              <iframe
                src={pdfPreviewUrl}
                className="w-full h-full border rounded-lg"
                title="Vista previa del PDF"
                onLoad={() => setIframeLoading(false)}
              />
            )}
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>
              Cerrar
            </Button>
            <Button 
              onClick={handleGenerarPDF} 
              disabled={generandoPdf}
            >
              {generandoPdf ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Descargar PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};