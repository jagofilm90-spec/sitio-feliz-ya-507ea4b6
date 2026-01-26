import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  CalendarIcon, 
  Upload, 
  Loader2, 
  FileDown, 
  AlertTriangle,
  CheckCircle2,
  Package,
  Undo2
} from "lucide-react";
import { generarOrdenPagoPDF, type OrdenPagoData } from "@/utils/ordenPagoPdfGenerator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ProcesarPagoOCDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orden: {
    id: string;
    folio: string;
    proveedor_id: string | null;
    proveedor_nombre: string;
    total: number;
    monto_devoluciones?: number | null;
    total_ajustado?: number | null;
    fecha_creacion?: string;
  } | null;
}

// Motivo labels
const MOTIVO_LABELS: Record<string, string> = {
  roto: "Empaque roto",
  rechazado_calidad: "Calidad rechazada",
  no_llego: "Faltante",
  faltante: "Faltante",
  dañado: "Dañado",
  vencido: "Vencido",
  error_cantidad: "Error cantidad",
};

export function ProcesarPagoOCDialog({
  open,
  onOpenChange,
  orden,
}: ProcesarPagoOCDialogProps) {
  const queryClient = useQueryClient();
  const [fechaPago, setFechaPago] = useState<Date>(new Date());
  const [referenciaPago, setReferenciaPago] = useState("");
  const [montoPagado, setMontoPagado] = useState("");
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generandoPDF, setGenerandoPDF] = useState(false);
  const [notificarDevoluciones, setNotificarDevoluciones] = useState(true);

  // Query para obtener productos recibidos
  const { data: productosRecibidos = [] } = useQuery({
    queryKey: ["productos-recibidos-pago", orden?.id],
    queryFn: async () => {
      if (!orden?.id) return [];
      
      const { data: detalles, error } = await supabase
        .from("ordenes_compra_detalles")
        .select(`
          id,
          cantidad,
          cantidad_recibida,
          precio_unitario_compra,
          subtotal,
          producto_id,
          productos (codigo, nombre)
        `)
        .eq("orden_compra_id", orden.id);
      
      if (error) throw error;
      if (!detalles) return [];
      
      return detalles.map((d: any) => ({
        codigo: d.productos?.codigo || "",
        nombre: d.productos?.nombre || "Producto",
        cantidad: d.cantidad_recibida ?? d.cantidad,
        precio_unitario: d.precio_unitario_compra || 0,
        subtotal: (d.cantidad_recibida ?? d.cantidad) * (d.precio_unitario_compra || 0)
      }));
    },
    enabled: !!orden?.id && open,
  });

  // Query para obtener devoluciones
  const { data: devolucionesDetalle = [] } = useQuery({
    queryKey: ["devoluciones-pago", orden?.id],
    queryFn: async () => {
      if (!orden?.id) return [];
      
      const { data: devoluciones, error } = await supabase
        .from("devoluciones_proveedor")
        .select(`
          id,
          cantidad_devuelta,
          motivo,
          producto_id,
          productos (nombre, codigo)
        `)
        .eq("orden_compra_id", orden.id);
      
      if (error) throw error;
      if (!devoluciones || devoluciones.length === 0) return [];
      
      // Para cada devolución, obtener el precio unitario
      const devolucionesConPrecio = await Promise.all(
        devoluciones.map(async (dev) => {
          const { data: detalle } = await supabase
            .from("ordenes_compra_detalles")
            .select("precio_unitario_compra")
            .eq("orden_compra_id", orden.id)
            .eq("producto_id", dev.producto_id)
            .maybeSingle();
          
          const precioUnitario = detalle?.precio_unitario_compra || 0;
          return {
            ...dev,
            precio_unitario: precioUnitario,
            monto: dev.cantidad_devuelta * precioUnitario
          };
        })
      );
      
      return devolucionesConPrecio;
    },
    enabled: !!orden?.id && open && !!(orden?.monto_devoluciones && orden.monto_devoluciones > 0),
  });

  // Query para datos bancarios del proveedor (si los tiene)
  const { data: datosBancarios } = useQuery({
    queryKey: ["proveedor-banco", orden?.proveedor_id],
    queryFn: async () => {
      if (!orden?.proveedor_id) return null;
      
      // Solo seleccionar nombre ya que los campos bancarios podrían no existir
      const { data, error } = await supabase
        .from("proveedores")
        .select("nombre")
        .eq("id", orden.proveedor_id)
        .single();
      
      if (error) throw error;
      // Retornar solo beneficiario por ahora - datos bancarios se podrían agregar después
      return data ? {
        beneficiario: data.nombre
      } : null;
    },
    enabled: !!orden?.proveedor_id && open,
  });

  const montoCalculado = orden?.total_ajustado ?? orden?.total ?? 0;
  const tieneDevoluciones = (orden?.monto_devoluciones ?? 0) > 0;

  // Validar conciliación
  const montoPagadoNum = parseFloat(montoPagado) || 0;
  const diferencia = Math.abs(montoPagadoNum - montoCalculado);
  const hayDiferencia = montoPagado && diferencia > 0.02;

  // Descargar PDF de Orden de Pago
  const handleDescargarPDF = async () => {
    if (!orden) return;
    
    setGenerandoPDF(true);
    try {
      const pdfData: OrdenPagoData = {
        ordenCompra: {
          id: orden.id,
          folio: orden.folio,
          proveedor_nombre: orden.proveedor_nombre,
          fecha_creacion: orden.fecha_creacion || new Date().toISOString().split('T')[0],
          total: orden.total,
          monto_devoluciones: orden.monto_devoluciones || 0,
          total_ajustado: orden.total_ajustado ?? orden.total,
        },
        productosRecibidos: productosRecibidos.map(p => ({
          codigo: p.codigo,
          nombre: p.nombre,
          cantidad: p.cantidad,
          precio_unitario: p.precio_unitario,
          subtotal: p.subtotal,
        })),
        devoluciones: devolucionesDetalle.map((d: any) => ({
          codigo: d.productos?.codigo || "",
          nombre: d.productos?.nombre || "Producto",
          cantidad: d.cantidad_devuelta,
          motivo: d.motivo,
          monto: d.monto,
        })),
        datosBancarios,
      };
      
      await generarOrdenPagoPDF(pdfData);
      toast.success("PDF de Orden de Pago descargado");
    } catch (error) {
      console.error("Error generando PDF:", error);
      toast.error("Error al generar PDF");
    } finally {
      setGenerandoPDF(false);
    }
  };

  const confirmarPagoMutation = useMutation({
    mutationFn: async () => {
      let comprobanteUrl: string | null = null;

      // Upload comprobante si existe
      if (comprobante) {
        setUploading(true);
        const fileExt = comprobante.name.split(".").pop();
        const fileName = `${orden?.id}-${Date.now()}.${fileExt}`;
        const filePath = `comprobantes-pago/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("ordenes-compra")
          .upload(filePath, comprobante);

        if (uploadError) {
          throw new Error("Error al subir comprobante: " + uploadError.message);
        }

        const { data: urlData } = supabase.storage
          .from("ordenes-compra")
          .getPublicUrl(filePath);

        comprobanteUrl = urlData.publicUrl;
        setUploading(false);
      }

      // Update orden en base de datos
      const { error } = await supabase
        .from("ordenes_compra")
        .update({
          status_pago: "pagado",
          fecha_pago: fechaPago.toISOString(),
          referencia_pago: referenciaPago,
          comprobante_pago_url: comprobanteUrl,
          monto_pagado: montoPagadoNum,
        })
        .eq("id", orden?.id);

      if (error) throw error;

      // Notificar devoluciones al proveedor si hay y está activado
      if (tieneDevoluciones && notificarDevoluciones && orden?.proveedor_id) {
        try {
          await supabase.functions.invoke("notificar-cierre-oc", {
            body: {
              orden_compra_id: orden.id,
              devoluciones: devolucionesDetalle.map((d: any) => ({
                codigo: d.productos?.codigo || "",
                nombre: d.productos?.nombre || "Producto",
                cantidad: d.cantidad_devuelta,
                motivo: d.motivo,
                monto: d.monto,
              })),
            },
          });
        } catch (notifError) {
          console.error("Error notificando devoluciones:", notifError);
          // No lanzar error, el pago ya se registró
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ordenes_compra"] });
      toast.success("Pago registrado exitosamente");
      onOpenChange(false);
      // Reset form
      setReferenciaPago("");
      setMontoPagado("");
      setComprobante(null);
      setFechaPago(new Date());
    },
    onError: (error: Error) => {
      toast.error("Error al registrar pago: " + error.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Procesar Pago - {orden?.folio}
          </DialogTitle>
          <DialogDescription>
            Revisa el resumen financiero y registra el pago de esta orden de compra.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-1">
          <div className="space-y-6 pb-4">
            {/* Proveedor */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Proveedor</p>
                <p className="font-semibold">{orden?.proveedor_nombre}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDescargarPDF}
                disabled={generandoPDF}
              >
                {generandoPDF ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4 mr-2" />
                )}
                Descargar Orden de Pago (PDF)
              </Button>
            </div>

            {/* Resumen Financiero */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-green-50 dark:bg-green-950/30 p-4">
                <h3 className="font-semibold text-green-800 dark:text-green-300 mb-3">
                  Resumen Financiero
                </h3>
                
                <div className="space-y-2">
                  {tieneDevoluciones && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span>Total Original:</span>
                        <span className="font-medium">
                          ${orden?.total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm text-red-600 dark:text-red-400">
                        <span className="flex items-center gap-1">
                          <Undo2 className="h-3 w-3" />
                          Devoluciones:
                        </span>
                        <span className="font-medium">
                          -${(orden?.monto_devoluciones || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <Separator className="my-2" />
                    </>
                  )}
                  
                  <div className="flex justify-between text-lg font-bold text-green-700 dark:text-green-400">
                    <span>MONTO A PAGAR:</span>
                    <span>${montoCalculado.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Devoluciones detalle */}
            {tieneDevoluciones && devolucionesDetalle.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-red-50 dark:bg-red-950/30 p-3 border-b">
                  <h4 className="font-medium text-red-800 dark:text-red-300 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Devoluciones Aplicadas ({devolucionesDetalle.length})
                  </h4>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-center">Cant.</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead className="text-right">Descuento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {devolucionesDetalle.map((dev: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">
                          {dev.productos?.nombre || "Producto"}
                        </TableCell>
                        <TableCell className="text-center">{dev.cantidad_devuelta}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {MOTIVO_LABELS[dev.motivo] || dev.motivo}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-red-600 dark:text-red-400 font-medium">
                          -${dev.monto.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <Separator />

            {/* Formulario de Pago */}
            <div className="space-y-4">
              <h3 className="font-semibold">Registrar Pago</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Monto Pagado *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={montoPagado}
                      onChange={(e) => setMontoPagado(e.target.value)}
                      placeholder={montoCalculado.toFixed(2)}
                      className="pl-7"
                      required
                    />
                  </div>
                  {hayDiferencia && (
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm">
                      <AlertTriangle className="h-4 w-4" />
                      <span>
                        Diferencia de ${diferencia.toFixed(2)} con el monto calculado
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Fecha de Pago *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !fechaPago && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {fechaPago ? format(fechaPago, "PPP", { locale: es }) : "Seleccionar"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={fechaPago}
                        onSelect={(date) => date && setFechaPago(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Referencia / No. Transferencia</Label>
                <Input
                  value={referenciaPago}
                  onChange={(e) => setReferenciaPago(e.target.value)}
                  placeholder="Ej: Transferencia SPEI #123456"
                />
              </div>

              <div className="space-y-2">
                <Label>Comprobante de Pago</Label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setComprobante(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-colors">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {comprobante ? comprobante.name : "Click para subir comprobante"}
                    </span>
                  </div>
                </div>
              </div>

              {tieneDevoluciones && (
                <div className="flex items-center space-x-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                  <Checkbox
                    id="notificarDevoluciones"
                    checked={notificarDevoluciones}
                    onCheckedChange={(checked) => setNotificarDevoluciones(checked === true)}
                  />
                  <Label htmlFor="notificarDevoluciones" className="text-sm cursor-pointer">
                    Notificar al proveedor sobre las devoluciones aplicadas
                    <span className="block text-xs text-muted-foreground">
                      Se enviará un correo informativo (sin montos de pago)
                    </span>
                  </Label>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="border-t pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={confirmarPagoMutation.isPending || uploading}
          >
            Cancelar
          </Button>
          <Button
            onClick={() => confirmarPagoMutation.mutate()}
            disabled={!montoPagado || confirmarPagoMutation.isPending || uploading}
          >
            {confirmarPagoMutation.isPending || uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Confirmar Pago
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
