import { useState, useEffect } from "react";
import { AlmasaLoading } from "@/components/brand/AlmasaLoading";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2,
  FileText,
  CheckCircle,
  AlertTriangle,
  Building2,
  Receipt,
  Calendar,
  DollarSign,
  FileCheck,
  Link2,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

interface EmailAttachment {
  filename: string;
  mimeType: string;
  attachmentId: string;
  size: number;
}

interface CFDIData {
  serie?: string;
  folio?: string;
  fecha?: string;
  subtotal?: number;
  total?: number;
  moneda?: string;
  emisor: {
    rfc: string;
    nombre: string;
  };
  receptor: {
    rfc: string;
    nombre: string;
  };
  impuestos: {
    totalImpuestosTrasladados?: number;
    iva?: number;
    ieps?: number;
  };
  uuid?: string;
  conceptos: Array<{
    descripcion: string;
    cantidad: number;
    valorUnitario: number;
    importe: number;
  }>;
  // Observaciones y número de talón para vinculación automática
  observaciones?: string;
  numeroTalonExtraido?: string;
}

interface EntregaPorTalon {
  id: string;
  numero_talon: string;
  fecha_entrega_real: string;
  orden_compra: {
    id: string;
    folio: string;
    total: number;
    total_ajustado?: number;
    status: string;
    proveedor_id: string;
    proveedores?: {
      nombre: string;
      rfc?: string;
    };
  };
}

interface OrdenCompra {
  id: string;
  folio: string;
  total: number;
  total_ajustado?: number;
  status: string;
  proveedor_id: string;
  fecha_recepcion?: string;
  created_at: string;
  proveedores?: {
    nombre: string;
    rfc?: string;
  };
}

interface VincularFacturaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  emailId: string;
  emailSubject: string;
  emailFrom: string;
  attachments: EmailAttachment[];
  cuentaEmail: string;
  onSuccess?: () => void;
}

export default function VincularFacturaDialog({
  open,
  onOpenChange,
  emailId,
  emailSubject,
  emailFrom,
  attachments,
  cuentaEmail,
  onSuccess,
}: VincularFacturaDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [step, setStep] = useState<"loading" | "select-oc" | "confirm" | "success">("loading");
  const [cfdiData, setCfdiData] = useState<CFDIData | null>(null);
  const [selectedOC, setSelectedOC] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [xmlAttachment, setXmlAttachment] = useState<EmailAttachment | null>(null);
  const [pdfAttachment, setPdfAttachment] = useState<EmailAttachment | null>(null);
  const [xmlContent, setXmlContent] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);

  // Find XML and PDF attachments
  useEffect(() => {
    if (open) {
      const xml = attachments.find(att => 
        att.filename.toLowerCase().endsWith(".xml") || 
        att.mimeType === "application/xml" ||
        att.mimeType === "text/xml"
      );
      const pdf = attachments.find(att => 
        att.filename.toLowerCase().endsWith(".pdf") || 
        att.mimeType === "application/pdf"
      );
      
      setXmlAttachment(xml || null);
      setPdfAttachment(pdf || null);
      setCfdiData(null);
      setSelectedOC(null);
      setParseError(null);
      setStep("loading");
      
      if (!xml) {
        setParseError("No se encontró un archivo XML CFDI en los adjuntos del correo.");
        setStep("select-oc");
      }
    }
  }, [open, attachments]);

  // Download and parse XML when dialog opens
  useEffect(() => {
    const downloadAndParse = async () => {
      if (!open || !xmlAttachment) return;
      
      try {
        // Download XML content
        const response = await supabase.functions.invoke("gmail-api", {
          body: {
            action: "downloadAttachment",
            email: cuentaEmail,
            messageId: emailId,
            attachmentId: xmlAttachment.attachmentId,
            filename: xmlAttachment.filename,
          },
        });

        if (response.error) throw new Error(response.error.message);

        // Decode base64
        const base64Data = response.data.data.replace(/-/g, "+").replace(/_/g, "/");
        const decodedXml = atob(base64Data);
        setXmlContent(decodedXml);

        // Parse CFDI
        const parseResponse = await supabase.functions.invoke("parse-cfdi-xml", {
          body: { xmlContent: decodedXml },
        });

        if (parseResponse.error) {
          throw new Error(parseResponse.error.message);
        }

        if (parseResponse.data?.error) {
          throw new Error(parseResponse.data.error);
        }

        setCfdiData(parseResponse.data.data);
        setStep("select-oc");
        
      } catch (error: any) {
        console.error("Error parsing CFDI:", error);
        setParseError(error.message || "Error al procesar el archivo XML");
        setStep("select-oc");
      }
    };

    downloadAndParse();
  }, [open, xmlAttachment, cuentaEmail, emailId]);

  // Fetch OCs for the detected proveedor
  const { data: ordenesCompra, isLoading: loadingOCs } = useQuery({
    queryKey: ["ocs-vincular-factura", cfdiData?.emisor?.rfc],
    queryFn: async () => {
      if (!cfdiData?.emisor?.rfc) return [];

      // Find proveedor by RFC
      const { data: proveedor } = await supabase
        .from("proveedores")
        .select("id")
        .eq("rfc", cfdiData.emisor.rfc)
        .maybeSingle();

      if (!proveedor) {
        // Try finding by name similarity
        const { data: proveedores } = await supabase
          .from("proveedores")
          .select("id, nombre, rfc")
          .ilike("nombre", `%${cfdiData.emisor.nombre?.split(" ")[0] || ""}%`)
          .limit(5);
        
        if (!proveedores?.length) return [];
        
        // Get OCs for all potential providers
        const { data, error } = await supabase
          .from("ordenes_compra")
          .select(`
            id, folio, total, total_ajustado, status, proveedor_id, created_at,
            proveedores (nombre, rfc)
          `)
          .in("proveedor_id", proveedores.map(p => p.id))
          .in("status", ["recibida", "parcial", "completada", "autorizada"])
          .order("created_at", { ascending: false })
          .limit(20);
        
        if (error) throw error;
        return data as OrdenCompra[];
      }

      // Get OCs for this proveedor
      const { data, error } = await supabase
        .from("ordenes_compra")
        .select(`
          id, folio, total, total_ajustado, status, proveedor_id, created_at,
          proveedores (nombre, rfc)
        `)
        .eq("proveedor_id", proveedor.id)
        .in("status", ["recibida", "parcial", "completada", "autorizada"])
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as OrdenCompra[];
    },
    enabled: open && !!cfdiData?.emisor?.rfc,
  });

  // Check if factura UUID already exists
  const { data: existingFactura } = useQuery({
    queryKey: ["check-factura-uuid", cfdiData?.uuid],
    queryFn: async (): Promise<{ id: string; numero_factura: string; oc_folio?: string } | null> => {
      if (!cfdiData?.uuid) return null;
      
      // Use raw query approach to avoid type issues with new column
      const { data, error } = await supabase
        .from("proveedor_facturas")
        .select("id, numero_factura, orden_compra_id")
        .filter("uuid", "eq", cfdiData.uuid)
        .limit(1);
      
      if (error) throw error;
      if (!data || data.length === 0) return null;
      
      const row = data[0];
      
      // Fetch OC folio separately
      const { data: oc } = await supabase
        .from("ordenes_compra")
        .select("folio")
        .eq("id", row.orden_compra_id)
        .maybeSingle();
      
      return { 
        id: row.id, 
        numero_factura: row.numero_factura, 
        oc_folio: oc?.folio 
      };
    },
    enabled: open && !!cfdiData?.uuid,
  });

  // Search for entrega by numero_talon if extracted from CFDI
  const { data: entregaPorTalon, isLoading: loadingTalon } = useQuery({
    queryKey: ["entrega-por-talon", cfdiData?.numeroTalonExtraido],
    queryFn: async (): Promise<EntregaPorTalon | null> => {
      if (!cfdiData?.numeroTalonExtraido) return null;
      
      const { data, error } = await supabase
        .from("ordenes_compra_entregas")
        .select(`
          id, numero_talon, fecha_entrega_real,
          ordenes_compra:orden_compra_id (
            id, folio, total, total_ajustado, status, proveedor_id,
            proveedores (nombre, rfc)
          )
        `)
        .eq("numero_talon", cfdiData.numeroTalonExtraido)
        .eq("status", "recibida")
        .limit(1);
      
      if (error) {
        console.error("Error searching by talon:", error);
        return null;
      }
      
      if (!data || data.length === 0) return null;
      
      const row = data[0] as any;
      return {
        id: row.id,
        numero_talon: row.numero_talon,
        fecha_entrega_real: row.fecha_entrega_real,
        orden_compra: row.ordenes_compra,
      };
    },
    enabled: open && !!cfdiData?.numeroTalonExtraido,
  });

  // Find best matching OC by amount
  const suggestedOC = ordenesCompra?.find(oc => {
    if (!cfdiData?.total) return false;
    const ocTotal = oc.total_ajustado || oc.total;
    const diff = Math.abs(ocTotal - cfdiData.total);
    return diff < 100 || diff / ocTotal < 0.02; // $100 tolerance or 2%
  });

  // Auto-select OC: prioritize talon match, then amount match
  useEffect(() => {
    if (entregaPorTalon?.orden_compra?.id && !selectedOC) {
      setSelectedOC(entregaPorTalon.orden_compra.id);
    } else if (suggestedOC && !selectedOC) {
      setSelectedOC(suggestedOC.id);
    }
  }, [entregaPorTalon, suggestedOC, selectedOC]);

  // Mutation to link factura
  const vincularMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOC) throw new Error("Selecciona una OC");
      if (!cfdiData) throw new Error("No hay datos de CFDI");

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("No autenticado");

      const selectedOrdenCompra = ordenesCompra?.find(oc => oc.id === selectedOC);
      if (!selectedOrdenCompra) throw new Error("OC no encontrada");

      // Upload XML to storage
      let xmlUrl = null;
      if (xmlContent) {
        const xmlBlob = new Blob([xmlContent], { type: "text/xml" });
        const xmlFileName = `${selectedOC}/${Date.now()}-${cfdiData.folio || "factura"}.xml`;
        
        const { error: uploadError } = await supabase.storage
          .from("proveedor-facturas")
          .upload(xmlFileName, xmlBlob);
        
        if (uploadError) throw uploadError;
        xmlUrl = xmlFileName;
      }

      // Upload PDF if available
      let pdfUrl = null;
      if (pdfAttachment) {
        // Download PDF
        const pdfResponse = await supabase.functions.invoke("gmail-api", {
          body: {
            action: "downloadAttachment",
            email: cuentaEmail,
            messageId: emailId,
            attachmentId: pdfAttachment.attachmentId,
            filename: pdfAttachment.filename,
          },
        });

        if (!pdfResponse.error && pdfResponse.data?.data) {
          const base64Data = pdfResponse.data.data.replace(/-/g, "+").replace(/_/g, "/");
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const pdfBlob = new Blob([byteArray], { type: "application/pdf" });
          
          const pdfFileName = `${selectedOC}/${Date.now()}-${cfdiData.folio || "factura"}.pdf`;
          
          const { error: pdfUploadError } = await supabase.storage
            .from("proveedor-facturas")
            .upload(pdfFileName, pdfBlob);
          
          if (!pdfUploadError) {
            pdfUrl = pdfFileName;
          }
        }
      }

      // Calculate if conciliation is needed
      const ocTotal = selectedOrdenCompra.total_ajustado || selectedOrdenCompra.total;
      const diferencia = ocTotal - (cfdiData.total || 0);
      const requiereConciliacion = Math.abs(diferencia) > 1;

      // Create proveedor_facturas record
      const insertData = {
        orden_compra_id: selectedOC,
        numero_factura: cfdiData.serie 
          ? `${cfdiData.serie}-${cfdiData.folio}` 
          : cfdiData.folio || `CFDI-${cfdiData.uuid?.substring(0, 8)}`,
        fecha_factura: cfdiData.fecha ? cfdiData.fecha.split("T")[0] : new Date().toISOString().split("T")[0],
        monto_total: cfdiData.total || 0,
        archivo_url: pdfUrl || xmlUrl,
        uuid: cfdiData.uuid,
        requiere_conciliacion: requiereConciliacion,
        diferencia_total: diferencia,
        creado_por: userData.user.id,
        notas: `Vinculado desde correo: ${emailSubject}`,
      };

      const { data: factura, error } = await supabase
        .from("proveedor_facturas")
        .insert(insertData as any)
        .select()
        .single();

      if (error) throw error;
      
      return { factura, requiereConciliacion, diferencia };
    },
    onSuccess: (result) => {
      setStep("success");
      queryClient.invalidateQueries({ queryKey: ["proveedor-facturas"] });
      queryClient.invalidateQueries({ queryKey: ["ordenes-compra"] });
      
      toast({
        title: "Factura vinculada",
        description: result.requiereConciliacion 
          ? `Factura vinculada correctamente. Diferencia de $${Math.abs(result.diferencia).toFixed(2)} detectada - requiere conciliación.`
          : "La factura fue vinculada a la OC exitosamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al vincular",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return "-";
    return amount.toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
    });
  };

  const handleClose = () => {
    onOpenChange(false);
    if (step === "success" && onSuccess) {
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Vincular Factura de Proveedor
          </DialogTitle>
          <DialogDescription>
            Vincula la factura CFDI con una Orden de Compra existente
          </DialogDescription>
        </DialogHeader>

        {/* Email info */}
        <div className="text-sm text-muted-foreground space-y-1">
          <p><strong>De:</strong> {emailFrom}</p>
          <p><strong>Asunto:</strong> {emailSubject}</p>
        </div>

        <Separator />

        {/* Loading state */}
        {step === "loading" && (
          <AlmasaLoading size={48} text="Procesando archivo XML CFDI..." />
        )}

        {/* Main content */}
        {step !== "loading" && step !== "success" && (
          <div className="space-y-4">
            {/* Attachments detected */}
            <div className="flex flex-wrap gap-2">
              {xmlAttachment && (
                <Badge variant="secondary" className="gap-1">
                  <FileText className="h-3 w-3" />
                  {xmlAttachment.filename}
                </Badge>
              )}
              {pdfAttachment && (
                <Badge variant="outline" className="gap-1">
                  <FileText className="h-3 w-3" />
                  {pdfAttachment.filename}
                </Badge>
              )}
            </div>

            {/* Parse error or no XML warning */}
            {parseError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{parseError}</AlertDescription>
              </Alert>
            )}

            {/* Existing factura warning */}
            {existingFactura && (
              <Alert variant="default" className="border-amber-500 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  Esta factura (UUID: {cfdiData?.uuid?.substring(0, 8)}...) ya está registrada
                  como <strong>{existingFactura.numero_factura}</strong> vinculada a la OC{" "}
                  <strong>{(existingFactura as any).ordenes_compra?.folio}</strong>.
                </AlertDescription>
              </Alert>
            )}

            {/* Match por Número de Talón */}
            {cfdiData?.numeroTalonExtraido && entregaPorTalon && (
              <Alert className="border-green-500 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>Match por Número de Talón:</strong> La factura menciona talón "{cfdiData.numeroTalonExtraido}" 
                  que coincide con la recepción de <strong>{entregaPorTalon.orden_compra.folio}</strong>
                  {entregaPorTalon.fecha_entrega_real && (
                    <span className="ml-1">
                      (recibida el {format(parseISO(entregaPorTalon.fecha_entrega_real), "dd/MM/yyyy", { locale: es })})
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Talón no encontrado warning */}
            {cfdiData?.numeroTalonExtraido && !entregaPorTalon && !loadingTalon && (
              <Alert variant="default" className="border-amber-400 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  Se detectó número de talón "{cfdiData.numeroTalonExtraido}" pero no se encontró 
                  ninguna recepción con ese número. Selecciona la OC manualmente.
                </AlertDescription>
              </Alert>
            )}

            {/* CFDI Data Preview */}
            {cfdiData && (
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Datos extraídos del CFDI
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Emisor (Proveedor)</p>
                        <p className="font-medium">{cfdiData.emisor.nombre}</p>
                        <p className="text-xs">RFC: {cfdiData.emisor.rfc}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Folio</p>
                        <p className="font-medium">
                          {cfdiData.serie ? `${cfdiData.serie}-` : ""}{cfdiData.folio || "Sin folio"}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Fecha</p>
                        <p className="font-medium">
                          {cfdiData.fecha 
                            ? format(parseISO(cfdiData.fecha), "dd/MM/yyyy", { locale: es })
                            : "-"
                          }
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="font-medium text-lg">{formatCurrency(cfdiData.total)}</p>
                        <p className="text-xs text-muted-foreground">
                          Subtotal: {formatCurrency(cfdiData.subtotal)} | IVA: {formatCurrency(cfdiData.impuestos?.iva)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {cfdiData.uuid && (
                    <p className="text-xs text-muted-foreground">
                      UUID: {cfdiData.uuid}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* OC Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FileCheck className="h-4 w-4" />
                Selecciona la Orden de Compra a vincular
              </Label>
              
              {loadingOCs ? (
                <div className="flex items-center gap-2 py-4 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Buscando OCs del proveedor...
                </div>
              ) : ordenesCompra?.length === 0 ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    No se encontraron OCs pendientes para el proveedor {cfdiData?.emisor?.nombre || "detectado"}.
                    Verifica que el RFC ({cfdiData?.emisor?.rfc}) esté registrado correctamente.
                  </AlertDescription>
                </Alert>
              ) : (
                <RadioGroup
                  value={selectedOC || ""}
                  onValueChange={setSelectedOC}
                  className="space-y-2"
                >
                  {ordenesCompra?.map((oc) => {
                    const ocTotal = oc.total_ajustado || oc.total;
                    const diff = cfdiData?.total ? Math.abs(ocTotal - cfdiData.total) : 0;
                    const isMatch = diff < 100 || (cfdiData?.total && diff / ocTotal < 0.02);
                    
                    return (
                      <div
                        key={oc.id}
                        className={`flex items-center space-x-3 p-3 rounded-lg border ${
                          selectedOC === oc.id 
                            ? "border-primary bg-primary/5" 
                            : isMatch 
                              ? "border-green-300 bg-green-50/50" 
                              : "border-border"
                        }`}
                      >
                        <RadioGroupItem value={oc.id} id={oc.id} />
                        <Label htmlFor={oc.id} className="flex-1 cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium">{oc.folio}</span>
                              <span className="text-muted-foreground ml-2">
                                | {formatCurrency(ocTotal)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={
                                oc.status === "recibida" ? "default" :
                                oc.status === "parcial" ? "secondary" : "outline"
                              }>
                                {oc.status}
                              </Badge>
                              {isMatch && (
                                <Badge variant="default" className="bg-green-600">
                                  Match!
                                </Badge>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {oc.proveedores?.nombre} | Creada: {format(parseISO(oc.created_at), "dd/MM/yyyy")}
                            {cfdiData?.total && (
                              <span className={diff > 1 ? "text-amber-600 ml-2" : "ml-2"}>
                                (Dif: {formatCurrency(ocTotal - cfdiData.total)})
                              </span>
                            )}
                          </p>
                        </Label>
                      </div>
                    );
                  })}
                </RadioGroup>
              )}
            </div>
          </div>
        )}

        {/* Success state */}
        {step === "success" && (
          <div className="flex flex-col items-center justify-center py-8">
            <CheckCircle className="h-12 w-12 text-green-600 mb-4" />
            <p className="text-lg font-medium">¡Factura vinculada exitosamente!</p>
            <p className="text-muted-foreground text-sm mt-2">
              La factura ha sido registrada y vinculada a la OC.
            </p>
          </div>
        )}

        {/* Actions */}
        {step !== "loading" && step !== "success" && (
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              onClick={() => vincularMutation.mutate()}
              disabled={!selectedOC || vincularMutation.isPending || !!existingFactura}
            >
              {vincularMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Vinculando...
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4 mr-2" />
                  Vincular Factura
                </>
              )}
            </Button>
          </div>
        )}

        {step === "success" && (
          <div className="flex justify-center">
            <Button onClick={handleClose}>
              Cerrar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
