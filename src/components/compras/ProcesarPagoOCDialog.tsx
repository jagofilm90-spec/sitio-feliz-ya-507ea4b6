import { useState, useEffect, useMemo } from "react";
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
  Undo2,
  Receipt,
  ExternalLink
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Constantes de impuestos
const IVA_RATE = 0.16;
const IEPS_RATE = 0.08;

interface ProductoRecibido {
  detalle_id: string;
  producto_id: string;
  codigo: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  aplica_iva: boolean;
  aplica_ieps: boolean;
  pagado: boolean;
  precioFacturado?: number;
}

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
    monto_pagado?: number | null;
    fecha_creacion?: string;
  } | null;
  onOpenFacturas?: () => void;
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
  onOpenFacturas,
}: ProcesarPagoOCDialogProps) {
  const queryClient = useQueryClient();
  const [fechaPago, setFechaPago] = useState<Date>(new Date());
  const [referenciaPago, setReferenciaPago] = useState("");
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generandoPDF, setGenerandoPDF] = useState(false);
  const [notificarDevoluciones, setNotificarDevoluciones] = useState(true);
  
  // Estado para productos seleccionados
  const [productosSeleccionados, setProductosSeleccionados] = useState<Set<string>>(new Set());
  
  // Estado para precios editados (costo facturado)
  const [preciosEditados, setPreciosEditados] = useState<Record<string, number>>({});

  // Query para obtener productos recibidos con flags de impuestos
  const { data: productosRecibidos = [] } = useQuery({
    queryKey: ["productos-recibidos-pago", orden?.id],
    queryFn: async () => {
      if (!orden?.id) return [];
      
      const { data: detalles, error } = await supabase
        .from("ordenes_compra_detalles")
        .select(`
          id,
          cantidad_ordenada,
          cantidad_recibida,
          precio_unitario_compra,
          subtotal,
          producto_id,
          pagado,
          productos (codigo, nombre, aplica_iva, aplica_ieps)
        `)
        .eq("orden_compra_id", orden.id);
      
      if (error) throw error;
      if (!detalles) return [];
      
      return detalles.map((d: any): ProductoRecibido => ({
        detalle_id: d.id,
        producto_id: d.producto_id,
        codigo: d.productos?.codigo || "",
        nombre: d.productos?.nombre || "Producto",
        cantidad: d.cantidad_recibida ?? d.cantidad_ordenada,
        precio_unitario: d.precio_unitario_compra || 0,
        subtotal: (d.cantidad_recibida ?? d.cantidad_ordenada) * (d.precio_unitario_compra || 0),
        aplica_iva: d.productos?.aplica_iva ?? true,
        aplica_ieps: d.productos?.aplica_ieps ?? false,
        pagado: d.pagado || false,
      }));
    },
    enabled: !!orden?.id && open,
  });

  // Inicializar selección cuando cargan productos (solo los no pagados)
  useEffect(() => {
    if (productosRecibidos.length > 0) {
      const noPagados = productosRecibidos
        .filter(p => !p.pagado)
        .map(p => p.detalle_id);
      setProductosSeleccionados(new Set(noPagados));
      // Reset precios editados al abrir
      setPreciosEditados({});
    }
  }, [productosRecibidos]);

  // Query para verificar si hay facturas del proveedor registradas
  const { data: facturasProveedor = [] } = useQuery({
    queryKey: ["facturas-proveedor-pago", orden?.id],
    queryFn: async () => {
      if (!orden?.id) return [];
      
      const { data, error } = await supabase
        .from("proveedor_facturas")
        .select("id, numero_factura, monto_total, status_pago")
        .eq("orden_compra_id", orden.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!orden?.id && open,
  });

  const tieneFacturasRegistradas = facturasProveedor.length > 0;

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

  // Query para datos bancarios del proveedor
  const { data: datosBancarios } = useQuery({
    queryKey: ["proveedor-banco", orden?.proveedor_id],
    queryFn: async () => {
      if (!orden?.proveedor_id) return null;
      
      const { data, error } = await supabase
        .from("proveedores")
        .select("nombre")
        .eq("id", orden.proveedor_id)
        .single();
      
      if (error) throw error;
      return data ? { beneficiario: data.nombre } : null;
    },
    enabled: !!orden?.proveedor_id && open,
  });

  // Handler para cambiar precio facturado
  const handlePrecioChange = (detalleId: string, nuevoPrecio: number) => {
    setPreciosEditados(prev => ({
      ...prev,
      [detalleId]: nuevoPrecio
    }));
  };

  // Calcular totales con impuestos de productos seleccionados (usando precios editados)
  const calcularTotalesSeleccionados = useMemo(() => {
    const productosParaPagar = productosRecibidos.filter(
      p => productosSeleccionados.has(p.detalle_id) && !p.pagado
    );
    
    let subtotalBase = 0;
    let subtotalBaseOriginal = 0;
    let ivaTotal = 0;
    let iepsTotal = 0;
    
    for (const p of productosParaPagar) {
      const precioEfectivo = preciosEditados[p.detalle_id] ?? p.precio_unitario;
      const subtotalProducto = p.cantidad * precioEfectivo;
      const subtotalOriginal = p.subtotal;
      
      // Los precios de compra típicamente incluyen impuestos, desagregar
      let divisor = 1;
      if (p.aplica_iva) divisor += IVA_RATE;
      if (p.aplica_ieps) divisor += IEPS_RATE;
      
      const base = subtotalProducto / divisor;
      const baseOriginal = subtotalOriginal / divisor;
      subtotalBase += base;
      subtotalBaseOriginal += baseOriginal;
      
      if (p.aplica_iva) {
        ivaTotal += base * IVA_RATE;
      }
      if (p.aplica_ieps) {
        iepsTotal += base * IEPS_RATE;
      }
    }
    
    const totalAjustado = subtotalBase + ivaTotal + iepsTotal;
    const totalOriginal = subtotalBaseOriginal + (subtotalBaseOriginal * IVA_RATE) + (subtotalBaseOriginal * IEPS_RATE);
    const diferencia = totalOriginal - totalAjustado;
    const hayAjustes = Object.keys(preciosEditados).length > 0 && diferencia !== 0;
    
    return {
      subtotal: Math.round(subtotalBase * 100) / 100,
      subtotalOriginal: Math.round(subtotalBaseOriginal * 100) / 100,
      iva: Math.round(ivaTotal * 100) / 100,
      ieps: Math.round(iepsTotal * 100) / 100,
      impuestos: Math.round((ivaTotal + iepsTotal) * 100) / 100,
      total: Math.round(totalAjustado * 100) / 100,
      totalOriginal: Math.round(totalOriginal * 100) / 100,
      diferencia: Math.round(diferencia * 100) / 100,
      hayAjustes,
      cantidadProductos: productosParaPagar.length,
    };
  }, [productosRecibidos, productosSeleccionados, preciosEditados]);

  const tieneDevoluciones = (orden?.monto_devoluciones ?? 0) > 0;
  const productosNoPagados = productosRecibidos.filter(p => !p.pagado);
  const todosSeleccionados = productosNoPagados.length > 0 && 
    productosNoPagados.every(p => productosSeleccionados.has(p.detalle_id));
  const algunosPagados = productosRecibidos.some(p => p.pagado);

  // Handlers para checkboxes
  const handleToggleAll = (checked: boolean) => {
    if (checked) {
      setProductosSeleccionados(new Set(productosNoPagados.map(p => p.detalle_id)));
    } else {
      setProductosSeleccionados(new Set());
    }
  };

  const handleToggleProducto = (detalleId: string, checked: boolean) => {
    const newSet = new Set(productosSeleccionados);
    if (checked) {
      newSet.add(detalleId);
    } else {
      newSet.delete(detalleId);
    }
    setProductosSeleccionados(newSet);
  };

  // Descargar PDF de Orden de Pago con productos seleccionados
  const handleDescargarPDF = async () => {
    if (!orden) return;
    
    setGenerandoPDF(true);
    try {
      const productosParaPDF = productosRecibidos.filter(
        p => productosSeleccionados.has(p.detalle_id) && !p.pagado
      );
      
      const pdfData: OrdenPagoData = {
        ordenCompra: {
          id: orden.id,
          folio: orden.folio,
          proveedor_nombre: orden.proveedor_nombre,
          fecha_creacion: orden.fecha_creacion || new Date().toISOString().split('T')[0],
          total: calcularTotalesSeleccionados.total,
          monto_devoluciones: 0, // No aplica devoluciones en pago parcial por producto
          total_ajustado: calcularTotalesSeleccionados.total,
        },
        productosRecibidos: productosParaPDF.map(p => ({
          codigo: p.codigo,
          nombre: p.nombre,
          cantidad: p.cantidad,
          precio_unitario: p.precio_unitario,
          subtotal: p.subtotal,
        })),
        devoluciones: [],
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

      // 0. Si hay ajustes de precio, actualizar costos primero usando RPC
      const productosConAjustes = Object.entries(preciosEditados)
        .filter(([id, precio]) => {
          const producto = productosRecibidos.find(p => p.detalle_id === id);
          return producto && precio !== producto.precio_unitario && productosSeleccionados.has(id);
        })
        .map(([id, precio]) => {
          const producto = productosRecibidos.find(p => p.detalle_id === id)!;
          return {
            producto_id: producto.producto_id,
            precio_facturado: precio,
            cantidad: producto.cantidad,
          };
        });

      if (productosConAjustes.length > 0 && orden?.id) {
        const { error: rpcError } = await supabase.rpc("ajustar_costos_oc", {
          p_oc_id: orden.id,
          p_productos: productosConAjustes,
        });
        
        if (rpcError) {
          console.error("Error ajustando costos:", rpcError);
          throw new Error("Error al ajustar costos: " + rpcError.message);
        }
      }

      // 1. Marcar productos seleccionados como pagados
      const idsSeleccionados = Array.from(productosSeleccionados);
      
      if (idsSeleccionados.length > 0) {
        const { error: updateDetallesError } = await supabase
          .from("ordenes_compra_detalles")
          .update({ 
            pagado: true, 
            fecha_pago: new Date().toISOString() 
          })
          .in("id", idsSeleccionados);
        
        if (updateDetallesError) throw updateDetallesError;
      }

      // 2. Verificar si todos los productos están pagados
      const { data: todosDetalles } = await supabase
        .from("ordenes_compra_detalles")
        .select("id, pagado")
        .eq("orden_compra_id", orden?.id);
      
      const todosPagados = todosDetalles?.every(d => d.pagado);
      const nuevoStatus = todosPagados ? "pagado" : "parcial";

      // 3. Calcular nuevo monto pagado total
      const nuevoMontoPagado = (orden?.monto_pagado || 0) + calcularTotalesSeleccionados.total;

      // 4. Update orden en base de datos
      const { error } = await supabase
        .from("ordenes_compra")
        .update({
          status_pago: nuevoStatus,
          fecha_pago: fechaPago.toISOString(),
          referencia_pago: referenciaPago,
          comprobante_pago_url: comprobanteUrl,
          monto_pagado: nuevoMontoPagado,
        })
        .eq("id", orden?.id);

      if (error) throw error;

      // Notificar devoluciones al proveedor si hay y está activado (solo en pago completo)
      if (todosPagados && tieneDevoluciones && notificarDevoluciones && orden?.proveedor_id) {
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
        }
      }

      return { todosPagados };
    },
    onSuccess: ({ todosPagados }) => {
      queryClient.invalidateQueries({ queryKey: ["ordenes_compra"] });
      queryClient.invalidateQueries({ queryKey: ["productos-recibidos-pago"] });
      
      if (todosPagados) {
        toast.success("Pago completo registrado exitosamente");
      } else {
        toast.success(`Pago parcial registrado: ${calcularTotalesSeleccionados.cantidadProductos} producto(s)`);
      }
      
      onOpenChange(false);
      // Reset form
      setReferenciaPago("");
      setComprobante(null);
      setFechaPago(new Date());
      setProductosSeleccionados(new Set());
    },
    onError: (error: Error) => {
      toast.error("Error al registrar pago: " + error.message);
    },
  });

  const isPagoCompleto = productosNoPagados.length === calcularTotalesSeleccionados.cantidadProductos;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Procesar Pago - {orden?.folio}
          </DialogTitle>
          <DialogDescription>
            Selecciona los productos a pagar. Los impuestos se recalculan automáticamente.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-1">
          <div className="space-y-6 pb-4">
            {/* Alert when there are registered invoices */}
            {tieneFacturasRegistradas && (
              <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/30">
                <Receipt className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800 dark:text-amber-300">
                  Esta OC tiene facturas del proveedor registradas
                </AlertTitle>
                <AlertDescription className="text-amber-700 dark:text-amber-400">
                  <p className="mb-3">
                    También puedes gestionar los pagos por factura individual.
                  </p>
                  {onOpenFacturas && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onOpenChange(false);
                        onOpenFacturas();
                      }}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Ver Facturas del Proveedor
                    </Button>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Proveedor header */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Proveedor</p>
                <p className="font-semibold">{orden?.proveedor_nombre}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDescargarPDF}
                disabled={generandoPDF || calcularTotalesSeleccionados.cantidadProductos === 0}
              >
                {generandoPDF ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4 mr-2" />
                )}
                Descargar Orden de Pago (PDF)
              </Button>
            </div>

            {/* Productos ya pagados alert */}
            {algunosPagados && (
              <Alert>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  Algunos productos de esta OC ya han sido pagados previamente.
                </AlertDescription>
              </Alert>
            )}

            {/* Tabla de productos con checkboxes */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted/30 p-3 border-b flex items-center justify-between">
                <h4 className="font-medium">Seleccionar Productos a Pagar</h4>
                {productosNoPagados.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="selectAll"
                      checked={todosSeleccionados}
                      onCheckedChange={(checked) => handleToggleAll(checked === true)}
                    />
                    <Label htmlFor="selectAll" className="text-sm cursor-pointer">
                      Seleccionar todos
                    </Label>
                  </div>
                )}
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-center">Cant.</TableHead>
                    <TableHead className="text-right">Costo OC</TableHead>
                    <TableHead className="text-right">Costo Factura</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead>Imp.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productosRecibidos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No hay productos recibidos
                      </TableCell>
                    </TableRow>
                  ) : (
                    productosRecibidos.map((p) => {
                      const precioEfectivo = preciosEditados[p.detalle_id] ?? p.precio_unitario;
                      const subtotalCalculado = p.cantidad * precioEfectivo;
                      const tieneAjuste = preciosEditados[p.detalle_id] !== undefined && 
                                          preciosEditados[p.detalle_id] !== p.precio_unitario;
                      
                      return (
                        <TableRow 
                          key={p.detalle_id}
                          className={cn(
                            p.pagado && "bg-green-50/50 dark:bg-green-950/20",
                            !p.pagado && !productosSeleccionados.has(p.detalle_id) && "opacity-50",
                            tieneAjuste && "bg-amber-50/50 dark:bg-amber-950/20"
                          )}
                        >
                          <TableCell>
                            {p.pagado ? (
                              <Badge variant="outline" className="bg-green-100 text-green-800 text-xs">
                                ✓ Pagado
                              </Badge>
                            ) : (
                              <Checkbox
                                checked={productosSeleccionados.has(p.detalle_id)}
                                onCheckedChange={(checked) => 
                                  handleToggleProducto(p.detalle_id, checked === true)
                                }
                              />
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-sm">{p.codigo}</TableCell>
                          <TableCell className="max-w-[150px] truncate">{p.nombre}</TableCell>
                          <TableCell className="text-center">{p.cantidad}</TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            ${p.precio_unitario.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right">
                            {p.pagado ? (
                              <span className="text-muted-foreground">-</span>
                            ) : (
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                className={cn(
                                  "w-24 text-right h-8",
                                  tieneAjuste && "border-amber-400 bg-amber-50 dark:bg-amber-950/50"
                                )}
                                value={precioEfectivo}
                                onChange={(e) =>
                                  handlePrecioChange(p.detalle_id, parseFloat(e.target.value) || 0)
                                }
                              />
                            )}
                          </TableCell>
                          <TableCell className={cn(
                            "text-right font-medium",
                            tieneAjuste && "text-amber-600 dark:text-amber-400"
                          )}>
                            ${subtotalCalculado.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {p.aplica_iva && (
                                <Badge variant="outline" className="text-xs">IVA</Badge>
                              )}
                              {p.aplica_ieps && (
                                <Badge variant="outline" className="text-xs">IEPS</Badge>
                              )}
                              {!p.aplica_iva && !p.aplica_ieps && (
                                <span className="text-muted-foreground text-xs">-</span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Ajuste de Precios - Solo si hay cambios */}
            {calcularTotalesSeleccionados.hayAjustes && (
              <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/30">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800 dark:text-amber-300">
                  Ajuste de Costos Detectado
                </AlertTitle>
                <AlertDescription className="text-amber-700 dark:text-amber-400">
                  <div className="mt-2 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Total Original OC:</span>
                      <span className="font-medium">
                        ${calcularTotalesSeleccionados.totalOriginal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Ajustado:</span>
                      <span className="font-medium">
                        ${calcularTotalesSeleccionados.total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>Diferencia:</span>
                      <span className={calcularTotalesSeleccionados.diferencia >= 0 ? "text-green-600" : "text-destructive"}>
                        {calcularTotalesSeleccionados.diferencia >= 0 ? "-" : "+"}$
                        {Math.abs(calcularTotalesSeleccionados.diferencia).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                        {calcularTotalesSeleccionados.diferencia >= 0 ? " (ahorro)" : " (extra)"}
                      </span>
                    </div>
                  </div>
                  <p className="mt-3 text-xs">
                    Al confirmar se actualizarán los costos del inventario y el costo promedio de los productos.
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {/* Resumen Financiero Dinámico */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-green-50 dark:bg-green-950/30 p-4">
                <h3 className="font-semibold text-green-800 dark:text-green-300 mb-3">
                  Resumen del Pago {!isPagoCompleto && "(Parcial)"}
                </h3>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Productos seleccionados:</span>
                    <span className="font-medium">
                      {calcularTotalesSeleccionados.cantidadProductos} de {productosNoPagados.length}
                    </span>
                  </div>
                  
                  <Separator className="my-2" />
                  
                  <div className="flex justify-between text-sm">
                    <span>Subtotal (base):</span>
                    <span className="font-medium">
                      ${calcularTotalesSeleccionados.subtotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  
                  {calcularTotalesSeleccionados.iva > 0 && (
                    <div className="flex justify-between text-sm text-blue-600 dark:text-blue-400">
                      <span>IVA (16%):</span>
                      <span className="font-medium">
                        +${calcularTotalesSeleccionados.iva.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  
                  {calcularTotalesSeleccionados.ieps > 0 && (
                    <div className="flex justify-between text-sm text-amber-600 dark:text-amber-400">
                      <span>IEPS (8%):</span>
                      <span className="font-medium">
                        +${calcularTotalesSeleccionados.ieps.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  
                  <Separator className="my-2" />
                  
                  <div className="flex justify-between text-lg font-bold text-green-700 dark:text-green-400">
                    <span>MONTO A PAGAR:</span>
                    <span>${calcularTotalesSeleccionados.total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Devoluciones detalle (solo mostrar si hay) */}
            {tieneDevoluciones && devolucionesDetalle.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-red-50 dark:bg-red-950/30 p-3 border-b">
                  <h4 className="font-medium text-red-800 dark:text-red-300 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Devoluciones Registradas ({devolucionesDetalle.length})
                  </h4>
                  <p className="text-xs text-red-600/80 mt-1">
                    Nota: Las devoluciones se descontaron del total de la OC.
                  </p>
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
              <h3 className="font-semibold">Datos del Pago</h3>
              
              <div className="grid grid-cols-2 gap-4">
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

                <div className="space-y-2">
                  <Label>Referencia / No. Transferencia</Label>
                  <Input
                    value={referenciaPago}
                    onChange={(e) => setReferenciaPago(e.target.value)}
                    placeholder="Ej: Transferencia SPEI #123456"
                  />
                </div>
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

              {isPagoCompleto && tieneDevoluciones && (
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
            disabled={calcularTotalesSeleccionados.cantidadProductos === 0 || confirmarPagoMutation.isPending || uploading}
          >
            {confirmarPagoMutation.isPending || uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {isPagoCompleto ? "Confirmar Pago Completo" : "Confirmar Pago Parcial"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
