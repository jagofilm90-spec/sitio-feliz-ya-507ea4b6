import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { COMPANY_DATA } from "@/constants/companyData";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Mail, Camera, AlertTriangle } from "lucide-react";
import { registrarCorreoEnviado } from "./HistorialCorreosOC";
import logoAlmasa from "@/assets/logo-almasa.png";

interface Devolucion {
  id: string;
  cantidad_devuelta: number;
  motivo: string;
  notas: string | null;
  status: string;
  created_at: string;
  orden_compra_id: string;
  producto_id: string;
  productos: { nombre: string; codigo: string } | null;
  ordenes_compra: {
    id: string;
    folio: string;
    proveedores: { id: string; nombre: string; email: string | null } | null;
    proveedor_nombre_manual: string | null;
  } | null;
}

interface Evidencia {
  id: string;
  ruta_storage: string;
  nombre_archivo: string | null;
  tipo_evidencia: string;
  signedUrl?: string;
  selected?: boolean;
}

interface EnviarEvidenciasProveedorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  devolucion: Devolucion;
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

const EnviarEvidenciasProveedorDialog = ({
  open,
  onOpenChange,
  devolucion,
}: EnviarEvidenciasProveedorDialogProps) => {
  const { toast } = useToast();
  const [enviando, setEnviando] = useState(false);
  const [mensajeAdicional, setMensajeAdicional] = useState("");
  const [selectedEvidencias, setSelectedEvidencias] = useState<Set<string>>(new Set());

  const proveedorNombre = devolucion.ordenes_compra?.proveedores?.nombre || 
                          devolucion.ordenes_compra?.proveedor_nombre_manual || 
                          "Proveedor";
  const proveedorEmail = devolucion.ordenes_compra?.proveedores?.email;
  const folio = devolucion.ordenes_compra?.folio || "N/A";

  // Fetch evidencias for this devolucion
  const { data: evidencias = [], isLoading } = useQuery({
    queryKey: ["devolucion-evidencias", devolucion.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("devoluciones_proveedor_evidencias")
        .select("*")
        .eq("devolucion_id", devolucion.id);
      
      if (error) throw error;
      
      // Generate signed URLs for each evidence
      const evidenciasConUrl: Evidencia[] = await Promise.all(
        (data || []).map(async (e) => {
          const { data: signedData } = await supabase.storage
            .from("devoluciones-evidencias")
            .createSignedUrl(e.ruta_storage, 604800); // 7 days
          
          return {
            ...e,
            signedUrl: signedData?.signedUrl || "",
          };
        })
      );
      
      return evidenciasConUrl;
    },
    enabled: open,
  });

  // Select all evidencias by default when loaded
  useState(() => {
    if (evidencias.length > 0 && selectedEvidencias.size === 0) {
      setSelectedEvidencias(new Set(evidencias.map(e => e.id)));
    }
  });

  const toggleEvidencia = (id: string) => {
    const newSelected = new Set(selectedEvidencias);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedEvidencias(newSelected);
  };

  const selectAll = () => {
    setSelectedEvidencias(new Set(evidencias.map(e => e.id)));
  };

  const selectNone = () => {
    setSelectedEvidencias(new Set());
  };

  const handleEnviar = async () => {
    if (!proveedorEmail) {
      toast({
        title: "Error",
        description: "El proveedor no tiene correo registrado",
        variant: "destructive",
      });
      return;
    }

    if (selectedEvidencias.size === 0) {
      toast({
        title: "Error",
        description: "Selecciona al menos una evidencia para enviar",
        variant: "destructive",
      });
      return;
    }

    setEnviando(true);

    try {
      const logoBase64 = await getLogoBase64();
      const fechaDevolucion = format(new Date(devolucion.created_at), "dd/MM/yyyy", { locale: es });
      
      // Get selected evidencias
      const evidenciasSeleccionadas = evidencias.filter(e => selectedEvidencias.has(e.id));
      
      // Build images HTML with embedded links
      const imagenesHTML = evidenciasSeleccionadas
        .map((e, i) => `
          <div style="display: inline-block; margin: 10px; text-align: center;">
            <a href="${e.signedUrl}" target="_blank" style="display: block;">
              <img src="${e.signedUrl}" alt="Evidencia ${i + 1}" 
                   style="max-width: 200px; max-height: 200px; border: 1px solid #ddd; border-radius: 8px;" />
            </a>
            <p style="font-size: 11px; color: #666; margin-top: 5px;">
              ${e.tipo_evidencia || 'Foto'} ${i + 1}
            </p>
          </div>
        `)
        .join("");

      const asunto = `[ALMASA] Reporte de Devolución - ${folio} - ${devolucion.productos?.nombre || 'Producto'}`;

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 20px;">
            ${logoBase64 ? `<img src="${logoBase64}" alt="ALMASA" style="height: 60px;" />` : '<h1 style="color: #B22234;">ALMASA</h1>'}
          </div>
          
          <div style="background-color: #FEF3C7; border: 2px solid #F59E0B; border-radius: 8px; padding: 20px; margin-bottom: 20px; text-align: center;">
            <h2 style="color: #D97706; margin: 0;">⚠️ REPORTE DE DEVOLUCIÓN</h2>
          </div>
          
          <div style="background-color: #f8f9fa; border-left: 4px solid #1e3a5f; padding: 15px; margin-bottom: 20px;">
            <h4 style="margin: 0 0 8px 0; color: #1e3a5f;">🏢 ${COMPANY_DATA.razonSocial}</h4>
            <p style="margin: 3px 0; font-size: 13px;">RFC: ${COMPANY_DATA.rfc}</p>
            <p style="margin: 3px 0; font-size: 13px;">${COMPANY_DATA.direccionCompletaMayusculas}</p>
            <p style="margin: 3px 0; font-size: 13px;">Tel: ${COMPANY_DATA.telefonosFormateados} | ${COMPANY_DATA.emails.compras}</p>
          </div>

          <p style="margin-bottom: 20px;">
            Estimado proveedor <strong>${proveedorNombre.toUpperCase()}</strong>,
          </p>

          <p style="margin-bottom: 20px;">
            Por medio del presente, le informamos que hemos registrado una <strong>devolución</strong> 
            relacionada con la orden de compra <strong>${folio}</strong>.
          </p>

          <div style="background-color: #FEF3C7; border: 1px solid #F59E0B; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h4 style="margin: 0 0 15px 0; color: #D97706;">📦 Detalle de la Devolución</h4>
            <table style="width: 100%;">
              <tr>
                <td style="padding: 5px 0; color: #666;"><strong>Producto:</strong></td>
                <td style="padding: 5px 0;">${devolucion.productos?.codigo || ''} - ${devolucion.productos?.nombre || 'Producto'}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #666;"><strong>Cantidad devuelta:</strong></td>
                <td style="padding: 5px 0; color: #DC2626; font-weight: bold;">${devolucion.cantidad_devuelta} unidades</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #666;"><strong>Motivo:</strong></td>
                <td style="padding: 5px 0;">${devolucion.motivo}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #666;"><strong>Fecha de registro:</strong></td>
                <td style="padding: 5px 0;">${fechaDevolucion}</td>
              </tr>
              ${devolucion.notas ? `
              <tr>
                <td style="padding: 5px 0; color: #666;"><strong>Notas:</strong></td>
                <td style="padding: 5px 0;">${devolucion.notas}</td>
              </tr>
              ` : ''}
            </table>
          </div>

          ${mensajeAdicional ? `
          <div style="background-color: #E0F2FE; border-left: 4px solid #0EA5E9; padding: 15px; margin-bottom: 20px;">
            <p style="margin: 0; font-size: 14px;">${mensajeAdicional.replace(/\n/g, '<br>')}</p>
          </div>
          ` : ''}

          <h4 style="color: #1e3a5f; border-bottom: 2px solid #1e3a5f; padding-bottom: 5px; margin-top: 30px;">
            📷 Evidencias Fotográficas (${evidenciasSeleccionadas.length})
          </h4>
          <p style="font-size: 12px; color: #666; margin-bottom: 10px;">
            Haz clic en las imágenes para verlas en tamaño completo
          </p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px;">
            ${imagenesHTML}
          </div>

          <div style="background-color: #DCFCE7; border: 1px solid #22C55E; border-radius: 8px; padding: 15px; margin-top: 30px;">
            <p style="margin: 0; font-size: 14px; color: #166534;">
              <strong>Solicitamos:</strong> Por favor, indíquenos cómo proceder con esta devolución 
              (reposición de producto, nota de crédito, etc.).
            </p>
          </div>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;" />
          <p style="color: #666; font-size: 12px; text-align: center;">
            Este correo fue enviado automáticamente desde el sistema de ${COMPANY_DATA.razonSocial}.<br/>
            Para cualquier duda, favor de comunicarse al ${COMPANY_DATA.emails.compras}
          </p>
        </div>
      `;

      // Send email
      const { error: emailError } = await supabase.functions.invoke('gmail-api', {
        body: {
          action: 'send',
          email: 'compras@almasa.com.mx',
          to: proveedorEmail,
          subject: asunto,
          body: htmlBody,
        },
      });

      if (emailError) throw emailError;

      // Register email in history
      await registrarCorreoEnviado({
        tipo: "evidencias_devolucion",
        referencia_id: devolucion.orden_compra_id,
        destinatario: proveedorEmail,
        asunto: asunto,
        error: null,
      });

      toast({
        title: "Correo enviado",
        description: `Se enviaron ${evidenciasSeleccionadas.length} evidencias a ${proveedorEmail}`,
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error("Error sending evidence email:", error);
      toast({
        title: "Error al enviar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-600" />
            Enviar Evidencias al Proveedor
          </DialogTitle>
          <DialogDescription>
            Se enviará un correo a <strong>{proveedorEmail}</strong> con las evidencias seleccionadas
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Resumen de la devolución */}
          <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="font-medium text-amber-800 dark:text-amber-400">
                Devolución de {devolucion.cantidad_devuelta} unidades
              </span>
            </div>
            <p className="text-sm">
              <strong>Producto:</strong> {devolucion.productos?.codigo} - {devolucion.productos?.nombre}
            </p>
            <p className="text-sm">
              <strong>Motivo:</strong> {devolucion.motivo}
            </p>
            <Badge variant="outline" className="font-mono">
              {folio}
            </Badge>
          </div>

          {/* Selección de evidencias */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-medium flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Evidencias a enviar
              </Label>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  Todas
                </Button>
                <Button variant="ghost" size="sm" onClick={selectNone}>
                  Ninguna
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : evidencias.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Camera className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No hay evidencias para esta devolución</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {evidencias.map((evidencia) => (
                  <div
                    key={evidencia.id}
                    className={`relative border rounded-lg overflow-hidden cursor-pointer transition-all ${
                      selectedEvidencias.has(evidencia.id)
                        ? "ring-2 ring-primary border-primary"
                        : "hover:border-muted-foreground"
                    }`}
                    onClick={() => toggleEvidencia(evidencia.id)}
                  >
                    {evidencia.signedUrl && (
                      <img
                        src={evidencia.signedUrl}
                        alt={evidencia.nombre_archivo || "Evidencia"}
                        className="w-full h-32 object-cover"
                      />
                    )}
                    <div className="absolute top-2 left-2">
                      <Checkbox
                        checked={selectedEvidencias.has(evidencia.id)}
                        onCheckedChange={() => toggleEvidencia(evidencia.id)}
                      />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                      <p className="text-xs text-white truncate">
                        {evidencia.tipo_evidencia || "Foto"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mensaje adicional */}
          <div>
            <Label htmlFor="mensaje-adicional">Mensaje adicional (opcional)</Label>
            <Textarea
              id="mensaje-adicional"
              value={mensajeAdicional}
              onChange={(e) => setMensajeAdicional(e.target.value)}
              placeholder="Agregue un mensaje personalizado para el proveedor..."
              rows={3}
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleEnviar}
            disabled={enviando || selectedEvidencias.size === 0 || !proveedorEmail}
          >
            {enviando ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Enviar {selectedEvidencias.size} Evidencia{selectedEvidencias.size !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EnviarEvidenciasProveedorDialog;
