import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
  Plus,
  FileText,
  Upload,
  Trash2,
  Download,
  CheckCircle,
  Clock,
  Truck,
  Receipt,
  CreditCard,
  X,
  AlertTriangle,
  Calculator,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ConciliarFacturaDialog from "./ConciliarFacturaDialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ProveedorFacturasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ordenCompra: {
    id: string;
    folio: string;
    proveedor_nombre?: string;
    total?: number;
  } | null;
}

interface Factura {
  id: string;
  numero_factura: string;
  fecha_factura: string;
  monto_total: number;
  archivo_url: string | null;
  tipo_pago: string;
  status_pago: string;
  fecha_pago: string | null;
  referencia_pago: string | null;
  comprobante_pago_url: string | null;
  notas: string | null;
  created_at: string;
  entregas_asignadas?: EntregaAsignada[];
  requiere_conciliacion?: boolean;
  conciliacion_completada?: boolean;
  diferencia_total?: number;
  orden_compra_id?: string;
}

interface EntregaAsignada {
  id: string;
  entrega_id: string;
  status: string;
  fecha_recepcion: string | null;
  entrega?: {
    numero_entrega: number;
    fecha_programada: string | null;
    status: string;
  };
}

interface Entrega {
  id: string;
  numero_entrega: number;
  fecha_programada: string | null;
  status: string;
}

const ProveedorFacturasDialog = ({
  open,
  onOpenChange,
  ordenCompra,
}: ProveedorFacturasDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state for new invoice
  const [showNewForm, setShowNewForm] = useState(false);
  const [numeroFactura, setNumeroFactura] = useState("");
  const [fechaFactura, setFechaFactura] = useState(
    format(new Date(), "yyyy-MM-dd")
  );
  const [montoTotal, setMontoTotal] = useState("");
  const [tipoPago, setTipoPago] = useState("contra_entrega");
  const [notas, setNotas] = useState("");
  const [selectedEntregas, setSelectedEntregas] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Conciliation state
  const [showConciliacion, setShowConciliacion] = useState(false);
  const [facturaAConciliar, setFacturaAConciliar] = useState<Factura | null>(null);

  const [showPaymentForm, setShowPaymentForm] = useState<string | null>(null);
  const [fechaPago, setFechaPago] = useState(format(new Date(), "yyyy-MM-dd"));
  const [referenciaPago, setReferenciaPago] = useState("");
  const [comprobantePago, setComprobantePago] = useState<File | null>(null);

  // Fetch facturas for this OC
  const { data: facturas = [], isLoading: loadingFacturas } = useQuery({
    queryKey: ["proveedor-facturas", ordenCompra?.id],
    queryFn: async () => {
      if (!ordenCompra?.id) return [];

      const { data, error } = await supabase
        .from("proveedor_facturas")
        .select("*")
        .eq("orden_compra_id", ordenCompra.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch entregas asignadas for each factura
      const facturasConEntregas = await Promise.all(
        (data || []).map(async (factura) => {
          const { data: enlaces } = await supabase
            .from("proveedor_factura_entregas")
            .select("*, entrega:ordenes_compra_entregas(numero_entrega, fecha_programada, status)")
            .eq("factura_id", factura.id);

          return {
            ...factura,
            entregas_asignadas: enlaces || [],
          };
        })
      );

      return facturasConEntregas as Factura[];
    },
    enabled: !!ordenCompra?.id && open,
  });

  // Fetch entregas for this OC
  const { data: entregas = [] } = useQuery({
    queryKey: ["oc-entregas", ordenCompra?.id],
    queryFn: async () => {
      if (!ordenCompra?.id) return [];

      const { data, error } = await supabase
        .from("ordenes_compra_entregas")
        .select("id, numero_entrega, fecha_programada, status")
        .eq("orden_compra_id", ordenCompra.id)
        .order("numero_entrega");

      if (error) throw error;
      return data as Entrega[];
    },
    enabled: !!ordenCompra?.id && open,
  });

  // Get entregas already assigned to other invoices
  const entregasAsignadas = facturas.flatMap(
    (f) => f.entregas_asignadas?.map((e) => e.entrega_id) || []
  );

  // Mutation to create invoice
  const createFactura = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("No autenticado");

      let archivoUrl = null;

      // Upload file if selected
      if (selectedFile) {
        const fileExt = selectedFile.name.split(".").pop();
        const fileName = `${ordenCompra?.id}/${Date.now()}-${numeroFactura}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("proveedor-facturas")
          .upload(fileName, selectedFile);

        if (uploadError) throw uploadError;
        archivoUrl = fileName;
      }

      // Calculate if conciliation is needed (difference > $1)
      const montoFactura = parseFloat(montoTotal) || 0;
      const totalOC = ordenCompra?.total || 0;
      const diferencia = Math.abs(totalOC - montoFactura);
      const requiereConciliacion = diferencia > 1;

      // Create factura
      const { data: factura, error } = await supabase
        .from("proveedor_facturas")
        .insert({
          orden_compra_id: ordenCompra?.id,
          numero_factura: numeroFactura,
          fecha_factura: fechaFactura,
          monto_total: montoFactura,
          archivo_url: archivoUrl,
          tipo_pago: tipoPago,
          notas: notas || null,
          creado_por: userData.user.id,
          requiere_conciliacion: requiereConciliacion,
          diferencia_total: totalOC - montoFactura,
        })
        .select()
        .single();

      if (error) throw error;

      // Link to entregas if selected
      if (selectedEntregas.length > 0) {
        const enlaces = selectedEntregas.map((entregaId) => ({
          factura_id: factura.id,
          entrega_id: entregaId,
        }));

        const { error: enlaceError } = await supabase
          .from("proveedor_factura_entregas")
          .insert(enlaces);

        if (enlaceError) throw enlaceError;
      }

      return { factura, requiereConciliacion };
    },
    onSuccess: (result) => {
      if (result.requiereConciliacion) {
        toast({ 
          title: "Factura registrada", 
          description: "El monto difiere de la OC. Concilia los precios para ajustar costos." 
        });
      } else {
        toast({ title: "Factura registrada correctamente" });
      }
      queryClient.invalidateQueries({
        queryKey: ["proveedor-facturas", ordenCompra?.id],
      });
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error al registrar factura",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Helper function to sync OC payment status based on paid invoices
  const actualizarEstadoPagoOC = async (ocId: string) => {
    try {
      // Get all invoices for this OC
      const { data: todasFacturas, error: fetchError } = await supabase
        .from("proveedor_facturas")
        .select("monto_total, status_pago")
        .eq("orden_compra_id", ocId);
      
      if (fetchError) throw fetchError;
      if (!todasFacturas || todasFacturas.length === 0) return;
      
      const totalFacturado = todasFacturas.reduce((sum, f) => sum + (f.monto_total || 0), 0);
      const totalPagadoFacturas = todasFacturas
        .filter(f => f.status_pago === "pagado")
        .reduce((sum, f) => sum + (f.monto_total || 0), 0);
      
      let nuevoStatusPago: string = "pendiente";
      if (totalPagadoFacturas >= totalFacturado && totalFacturado > 0) {
        nuevoStatusPago = "pagado";
      } else if (totalPagadoFacturas > 0) {
        nuevoStatusPago = "parcial";
      }
      
      // Update OC payment status and amount
      const { error: updateError } = await supabase
        .from("ordenes_compra")
        .update({ 
          status_pago: nuevoStatusPago,
          monto_pagado: totalPagadoFacturas,
        })
        .eq("id", ocId);
      
      if (updateError) throw updateError;
      
      // Invalidate OC queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ["ordenes_compra"] });
    } catch (error) {
      console.error("Error syncing OC payment status:", error);
    }
  };

  // Mutation to register payment
  const registerPayment = useMutation({
    mutationFn: async (facturaId: string) => {
      let comprobanteUrl = null;

      if (comprobantePago) {
        const fileExt = comprobantePago.name.split(".").pop();
        const fileName = `comprobantes/${ordenCompra?.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("proveedor-facturas")
          .upload(fileName, comprobantePago);

        if (uploadError) throw uploadError;
        comprobanteUrl = fileName;
      }

      const { error } = await supabase
        .from("proveedor_facturas")
        .update({
          status_pago: "pagado",
          fecha_pago: fechaPago,
          referencia_pago: referenciaPago || null,
          comprobante_pago_url: comprobanteUrl,
        })
        .eq("id", facturaId);

      if (error) throw error;
      
      // Return the OC id to sync payment status
      return ordenCompra?.id;
    },
    onSuccess: async (ocId) => {
      toast({ title: "Pago registrado correctamente" });
      queryClient.invalidateQueries({
        queryKey: ["proveedor-facturas", ordenCompra?.id],
      });
      setShowPaymentForm(null);
      setReferenciaPago("");
      setComprobantePago(null);
      
      // Sync OC payment status
      if (ocId) {
        await actualizarEstadoPagoOC(ocId);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error al registrar pago",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation to delete factura
  const deleteFactura = useMutation({
    mutationFn: async (facturaId: string) => {
      const { error } = await supabase
        .from("proveedor_facturas")
        .delete()
        .eq("id", facturaId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Factura eliminada" });
      queryClient.invalidateQueries({
        queryKey: ["proveedor-facturas", ordenCompra?.id],
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al eliminar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setShowNewForm(false);
    setNumeroFactura("");
    setFechaFactura(format(new Date(), "yyyy-MM-dd"));
    setMontoTotal("");
    setTipoPago("contra_entrega");
    setNotas("");
    setSelectedEntregas([]);
    setSelectedFile(null);
  };

  const handleDownloadFile = async (archivoUrl: string) => {
    const { data, error } = await supabase.storage
      .from("proveedor-facturas")
      .download(archivoUrl);

    if (error) {
      toast({
        title: "Error al descargar",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = archivoUrl.split("/").pop() || "factura.pdf";
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleEntrega = (entregaId: string) => {
    setSelectedEntregas((prev) =>
      prev.includes(entregaId)
        ? prev.filter((id) => id !== entregaId)
        : [...prev, entregaId]
    );
  };

  // Calculate totals
  const totalFacturado = facturas.reduce((sum, f) => sum + (f.monto_total || 0), 0);
  const totalPagado = facturas
    .filter((f) => f.status_pago === "pagado")
    .reduce((sum, f) => sum + (f.monto_total || 0), 0);

  if (!ordenCompra) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Facturas del Proveedor - {ordenCompra.folio}
          </DialogTitle>
        </DialogHeader>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">Total OC</div>
              <div className="text-xl font-bold">
                ${ordenCompra.total?.toLocaleString("es-MX", { minimumFractionDigits: 2 }) || "0.00"}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">Total Facturado</div>
              <div className="text-xl font-bold text-blue-600">
                ${totalFacturado.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">Total Pagado</div>
              <div className="text-xl font-bold text-green-600">
                ${totalPagado.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator />

        <ScrollArea className="flex-1">
          <div className="space-y-4 pr-4">
            {/* Existing invoices */}
            {facturas.length > 0 && (
              <div className="space-y-3">
                {facturas.map((factura) => (
                  <Card key={factura.id} className="relative">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <CardTitle className="text-base">
                            {factura.numero_factura}
                          </CardTitle>
                          <Badge
                            variant={
                              factura.tipo_pago === "anticipado"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {factura.tipo_pago === "anticipado"
                              ? "Anticipado"
                              : "Contra entrega"}
                          </Badge>
                          <Badge
                            variant={
                              factura.status_pago === "pagado"
                                ? "default"
                                : "outline"
                            }
                            className={
                              factura.status_pago === "pagado"
                                ? "bg-green-100 text-green-800"
                                : ""
                            }
                          >
                            {factura.status_pago === "pagado" ? (
                              <CheckCircle className="h-3 w-3 mr-1" />
                            ) : (
                              <Clock className="h-3 w-3 mr-1" />
                            )}
                            {factura.status_pago === "pagado"
                              ? "Pagado"
                              : "Pendiente"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          {factura.archivo_url && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                handleDownloadFile(factura.archivo_url!)
                              }
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                          {/* Conciliar button - show when needs conciliation */}
                          {factura.requiere_conciliacion && !factura.conciliacion_completada && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-amber-500 text-amber-600 hover:bg-amber-50"
                              onClick={() => {
                                setFacturaAConciliar(factura);
                                setShowConciliacion(true);
                              }}
                            >
                              <Calculator className="h-4 w-4 mr-1" />
                              Conciliar Precios
                            </Button>
                          )}
                          {factura.status_pago === "pendiente" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setShowPaymentForm(factura.id)}
                            >
                              <CreditCard className="h-4 w-4 mr-1" />
                              Registrar Pago
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteFactura.mutate(factura.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Fecha:</span>{" "}
                          {format(new Date(factura.fecha_factura), "dd/MM/yyyy")}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Monto:</span>{" "}
                          <span className="font-semibold">
                            ${factura.monto_total.toLocaleString("es-MX", {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                        {factura.fecha_pago && (
                          <div>
                            <span className="text-muted-foreground">
                              Fecha pago:
                            </span>{" "}
                            {format(new Date(factura.fecha_pago), "dd/MM/yyyy")}
                          </div>
                        )}
                        {factura.referencia_pago && (
                          <div>
                            <span className="text-muted-foreground">Ref:</span>{" "}
                            {factura.referencia_pago}
                          </div>
                        )}
                      </div>

                      {/* Conciliation Alert */}
                      {factura.requiere_conciliacion && !factura.conciliacion_completada && (
                        <Alert className="mt-3 border-amber-300 bg-amber-50">
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                          <AlertDescription className="text-amber-800">
                            <strong>Diferencia detectada:</strong> La factura es{" "}
                            <span className="font-bold">
                              ${Math.abs(factura.diferencia_total || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                            </span>{" "}
                            {(factura.diferencia_total || 0) > 0 ? "menor" : "mayor"} que la OC.
                            Concilia los precios para ajustar los costos de inventario.
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Conciliation Completed Badge */}
                      {factura.conciliacion_completada && (
                        <div className="mt-3 flex items-center gap-2 text-sm text-green-700">
                          <CheckCircle className="h-4 w-4" />
                          <span>Precios conciliados - Costos ajustados en inventario</span>
                        </div>
                      )}

                      {/* Entregas asignadas */}
                      {factura.entregas_asignadas &&
                        factura.entregas_asignadas.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                              <Truck className="h-3 w-3" />
                              Entregas cubiertas:
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {factura.entregas_asignadas.map((ea) => (
                                <Badge
                                  key={ea.id}
                                  variant={
                                    ea.status === "recibido"
                                      ? "default"
                                      : "outline"
                                  }
                                  className={
                                    ea.status === "recibido"
                                      ? "bg-green-100 text-green-800"
                                      : ""
                                  }
                                >
                                  Entrega #{ea.entrega?.numero_entrega}
                                  {ea.status === "recibido" && (
                                    <CheckCircle className="h-3 w-3 ml-1" />
                                  )}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                      {factura.notas && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          {factura.notas}
                        </div>
                      )}

                      {/* Payment form inline */}
                      {showPaymentForm === factura.id && (
                        <div className="mt-4 pt-4 border-t space-y-3">
                          <div className="font-medium flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            Registrar Pago
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label>Fecha de Pago</Label>
                              <Input
                                type="date"
                                value={fechaPago}
                                onChange={(e) => setFechaPago(e.target.value)}
                              />
                            </div>
                            <div>
                              <Label>Referencia Bancaria</Label>
                              <Input
                                value={referenciaPago}
                                onChange={(e) =>
                                  setReferenciaPago(e.target.value)
                                }
                                placeholder="Número de transferencia"
                              />
                            </div>
                          </div>
                          <div>
                            <Label>Comprobante (opcional)</Label>
                            <Input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) =>
                                setComprobantePago(e.target.files?.[0] || null)
                              }
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => registerPayment.mutate(factura.id)}
                              disabled={registerPayment.isPending}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Confirmar Pago
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setShowPaymentForm(null)}
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* New invoice form */}
            {showNewForm ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Nueva Factura del Proveedor
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Número de Factura *</Label>
                      <Input
                        value={numeroFactura}
                        onChange={(e) => setNumeroFactura(e.target.value)}
                        placeholder="Ej: F-12345"
                      />
                    </div>
                    <div>
                      <Label>Fecha de Factura</Label>
                      <Input
                        type="date"
                        value={fechaFactura}
                        onChange={(e) => setFechaFactura(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Monto Total *</Label>
                      <Input
                        type="number"
                        value={montoTotal}
                        onChange={(e) => setMontoTotal(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label>Tipo de Pago</Label>
                      <Select value={tipoPago} onValueChange={setTipoPago}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="anticipado">
                            Pago Anticipado
                          </SelectItem>
                          <SelectItem value="contra_entrega">
                            Contra Entrega
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Archivo PDF (opcional)</Label>
                    <Input
                      type="file"
                      accept=".pdf"
                      onChange={(e) =>
                        setSelectedFile(e.target.files?.[0] || null)
                      }
                    />
                    {selectedFile && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedFile.name}
                      </p>
                    )}
                  </div>

                  {/* Entregas to assign */}
                  {entregas.length > 0 && (
                    <div>
                      <Label className="mb-2 block">
                        Entregas que cubre esta factura
                      </Label>
                      <div className="border rounded-md p-3 space-y-2">
                        {entregas.map((entrega) => {
                          const yaAsignada = entregasAsignadas.includes(
                            entrega.id
                          );
                          return (
                            <div
                              key={entrega.id}
                              className="flex items-center gap-3"
                            >
                              <Checkbox
                                id={`entrega-${entrega.id}`}
                                checked={selectedEntregas.includes(entrega.id)}
                                onCheckedChange={() =>
                                  toggleEntrega(entrega.id)
                                }
                                disabled={yaAsignada}
                              />
                              <label
                                htmlFor={`entrega-${entrega.id}`}
                                className={`flex-1 text-sm ${
                                  yaAsignada
                                    ? "text-muted-foreground line-through"
                                    : ""
                                }`}
                              >
                                Entrega #{entrega.numero_entrega}
                                {entrega.fecha_programada && (
                                  <span className="text-muted-foreground ml-2">
                                    ({format(
                                      new Date(entrega.fecha_programada),
                                      "dd/MM/yyyy"
                                    )})
                                  </span>
                                )}
                                {yaAsignada && (
                                  <span className="text-xs ml-2">
                                    (ya tiene factura)
                                  </span>
                                )}
                              </label>
                              <Badge
                                variant="outline"
                                className="text-xs"
                              >
                                {entrega.status}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div>
                    <Label>Notas (opcional)</Label>
                    <Textarea
                      value={notas}
                      onChange={(e) => setNotas(e.target.value)}
                      placeholder="Observaciones..."
                      rows={2}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => createFactura.mutate()}
                      disabled={
                        !numeroFactura || !montoTotal || createFactura.isPending
                      }
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Guardar Factura
                    </Button>
                    <Button variant="ghost" onClick={resetForm}>
                      Cancelar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowNewForm(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar Factura del Proveedor
              </Button>
            )}

            {facturas.length === 0 && !showNewForm && (
              <div className="text-center py-8 text-muted-foreground">
                <Receipt className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No hay facturas registradas para esta OC</p>
                <p className="text-sm">
                  Agrega las facturas que envía el proveedor para llevar control
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>

      {/* Conciliación Dialog */}
      <ConciliarFacturaDialog
        open={showConciliacion}
        onOpenChange={setShowConciliacion}
        factura={facturaAConciliar}
        ordenCompra={ordenCompra}
        onConciliacionCompletada={() => {
          queryClient.invalidateQueries({
            queryKey: ["proveedor-facturas", ordenCompra?.id],
          });
          setFacturaAConciliar(null);
        }}
      />
    </Dialog>
  );
};

export default ProveedorFacturasDialog;
