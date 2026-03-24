import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Loader2, 
  History,
  Edit2,
  X,
  AlertTriangle
} from "lucide-react";
import { format, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { ordenarProductosAzucarPrimero } from "@/lib/calculos";
import { formatCurrency } from "@/lib/utils";
import { PedidoCardMobile } from "./PedidoCardMobile";
import { AutorizacionRapidaSheet } from "./AutorizacionRapidaSheet";

interface PedidoPorAutorizar {
  id: string;
  folio: string;
  fecha_pedido: string;
  fecha_entrega_estimada: string | null;
  total: number;
  notas: string | null;
  vendedor_id: string | null;
  clientes: { id: string; nombre: string; email: string | null } | null;
  cliente_sucursales: { id: string; nombre: string } | null;
  pedidos_detalles: {
    id: string;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
    productos: {
      id: string;
      nombre: string;
      codigo: string;
      precio_venta: number;
      unidad: string;
      peso_kg: number | null;
      precio_por_kilo: boolean;
      descuento_maximo: number | null;
      ultimo_costo_compra: number | null;
      costo_promedio_ponderado: number | null;
    } | null;
  }[];
}

// Calcular peso total de un pedido
// Peso total: siempre cantidad (bultos) × peso_kg (kg/bulto)
const calcularPesoTotalPedido = (detalles: PedidoPorAutorizar["pedidos_detalles"]) => {
  let pesoTotal = 0;
  for (const det of detalles) {
    const pesoKg = det.productos?.peso_kg ?? 1;
    pesoTotal += det.cantidad * pesoKg;
  }
  return Math.round(pesoTotal * 100) / 100;
};

interface PrecioHistorialProducto {
  fecha: string;
  precio: number;
  fuente: "cotizacion" | "pedido";
}

export function PedidosPorAutorizarTab() {
  const [selectedPedido, setSelectedPedido] = useState<PedidoPorAutorizar | null>(null);
  const [editingPrices, setEditingPrices] = useState<Record<string, number>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [expandedHistorial, setExpandedHistorial] = useState<string | null>(null);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [selectedMobileIndex, setSelectedMobileIndex] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  // Fetch pedidos por autorizar
  const { data: pedidos, isLoading } = useQuery({
    queryKey: ["pedidos-por-autorizar"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedidos")
        .select(`
          id,
          folio,
          fecha_pedido,
          fecha_entrega_estimada,
          total,
          notas,
          vendedor_id,
          vendedor:vendedor_id (id, full_name),
          clientes (id, nombre, email),
          cliente_sucursales:sucursal_id (id, nombre),
          pedidos_detalles (
            id,
            cantidad,
            precio_unitario,
            subtotal,
            productos (id, nombre, codigo, precio_venta, unidad, peso_kg, precio_por_kilo, descuento_maximo, ultimo_costo_compra, costo_promedio_ponderado)
          )
        `)
        .eq("status", "por_autorizar")
        .order("fecha_pedido", { ascending: false });

      if (error) throw error;
      return data as unknown as PedidoPorAutorizar[];
    },
  });

  // Fetch price history for a specific client and product
  const fetchPriceHistory = async (clienteId: string, productoId: string): Promise<PrecioHistorialProducto[]> => {
    const fechaInicio = subMonths(new Date(), 6);
    
    // Get from cotizaciones
    const { data: cotData } = await supabase
      .from("cotizaciones_detalles")
      .select(`
        precio_unitario,
        cotizacion:cotizaciones!inner (
          fecha_creacion,
          cliente_id
        )
      `)
      .eq("producto_id", productoId)
      .eq("cotizacion.cliente_id", clienteId)
      .gte("cotizacion.fecha_creacion", fechaInicio.toISOString())
      .order("cotizacion(fecha_creacion)", { ascending: false })
      .limit(5);

    // Get from pedidos
    const { data: pedData } = await supabase
      .from("pedidos_detalles")
      .select(`
        precio_unitario,
        pedido:pedidos!inner (
          fecha_pedido,
          cliente_id,
          status
        )
      `)
      .eq("producto_id", productoId)
      .eq("pedido.cliente_id", clienteId)
      .neq("pedido.status", "por_autorizar")
      .gte("pedido.fecha_pedido", fechaInicio.toISOString())
      .order("pedido(fecha_pedido)", { ascending: false })
      .limit(5);

    const historial: PrecioHistorialProducto[] = [];
    
    cotData?.forEach((item: any) => {
      historial.push({
        fecha: item.cotizacion.fecha_creacion,
        precio: item.precio_unitario,
        fuente: "cotizacion",
      });
    });
    
    pedData?.forEach((item: any) => {
      historial.push({
        fecha: item.pedido.fecha_pedido,
        precio: item.precio_unitario,
        fuente: "pedido",
      });
    });

    // Sort by date desc
    historial.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    
    return historial.slice(0, 5);
  };

  // Query for expanded product history
  const { data: historialData } = useQuery({
    queryKey: ["historial-producto", selectedPedido?.clientes?.id, expandedHistorial],
    queryFn: () => {
      if (!selectedPedido?.clientes?.id || !expandedHistorial) return [];
      return fetchPriceHistory(selectedPedido.clientes.id, expandedHistorial);
    },
    enabled: !!selectedPedido?.clientes?.id && !!expandedHistorial,
  });

  // Mutation to authorize order
  const authorizeMutation = useMutation({
    mutationFn: async (pedidoId: string) => {
      if (!selectedPedido) throw new Error("No hay pedido seleccionado");
      
      // Track which prices were changed
      const preciosOriginales: Record<string, number> = {};
      selectedPedido.pedidos_detalles.forEach(d => {
        preciosOriginales[d.id] = d.precio_unitario;
      });

      let ajustesPrecio = 0;
      
      // Update prices if edited
      if (Object.keys(editingPrices).length > 0) {
        for (const [detalleId, newPrice] of Object.entries(editingPrices)) {
          const detalle = selectedPedido.pedidos_detalles.find(d => d.id === detalleId);
          if (detalle && newPrice !== detalle.precio_unitario) {
            ajustesPrecio++;
            const newSubtotal = detalle.cantidad * newPrice;
            await supabase
              .from("pedidos_detalles")
              .update({ 
                precio_unitario: newPrice,
                subtotal: newSubtotal 
              })
              .eq("id", detalleId);
          }
        }
        
        // Recalculate total
        const { data: detalles } = await supabase
          .from("pedidos_detalles")
          .select("subtotal")
          .eq("pedido_id", pedidoId);
        
        const newTotal = detalles?.reduce((sum, d) => sum + d.subtotal, 0) || 0;
        const pesoTotal = calcularPesoTotalPedido(selectedPedido.pedidos_detalles);
        
        await supabase
          .from("pedidos")
          .update({ total: newTotal, status: "pendiente", peso_total_kg: pesoTotal > 0 ? pesoTotal : null })
          .eq("id", pedidoId);
      } else {
        const pesoTotal = calcularPesoTotalPedido(selectedPedido.pedidos_detalles);
        await supabase
          .from("pedidos")
          .update({ status: "pendiente", peso_total_kg: pesoTotal > 0 ? pesoTotal : null })
          .eq("id", pedidoId);
      }

      // Send notification email to client if email exists
      const clienteEmail = selectedPedido.clientes?.email;
      if (clienteEmail) {
        try {
          const detallesEmail = selectedPedido.pedidos_detalles.map(d => {
            const precioOriginal = preciosOriginales[d.id];
            const precioNuevo = editingPrices[d.id] ?? d.precio_unitario;
            const fueAjustado = precioNuevo !== precioOriginal;
            return {
              producto: d.productos?.nombre || "Producto",
              cantidad: d.cantidad,
              unidad: d.productos?.unidad || "pza",
              precioUnitario: precioNuevo,
              subtotal: d.cantidad * precioNuevo,
              precioAnterior: fueAjustado ? precioOriginal : undefined,
              fueAjustado
            };
          });

          const newTotal = detallesEmail.reduce((sum, d) => sum + d.subtotal, 0);

          await supabase.functions.invoke("send-order-authorized-email", {
            body: {
              clienteEmail,
              clienteNombre: selectedPedido.clientes?.nombre || "Cliente",
              pedidoFolio: selectedPedido.folio,
              total: newTotal,
              fechaEntrega: selectedPedido.fecha_entrega_estimada || new Date().toISOString(),
              ajustesPrecio,
              detalles: detallesEmail
            }
          });
          console.log("Email de autorización enviado al cliente");
        } catch (emailError) {
          console.error("Error enviando email:", emailError);
          // Don't fail the mutation if email fails
        }
      }

      return { ajustesPrecio };
    },
    onSuccess: (result) => {
      const msg = result.ajustesPrecio > 0 
        ? `Pedido autorizado con ${result.ajustesPrecio} ajuste${result.ajustesPrecio > 1 ? 's' : ''} de precio` 
        : "Pedido autorizado";
      toast({ title: msg, description: "El cliente será notificado por correo" });
      queryClient.invalidateQueries({ queryKey: ["pedidos-por-autorizar"] });
      setSelectedPedido(null);
      setEditingPrices({});
      setIsEditing(false);
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo autorizar el pedido", variant: "destructive" });
    },
  });

  // Mutation to reject order
  const rejectMutation = useMutation({
    mutationFn: async ({ pedidoId, reason }: { pedidoId: string; reason: string }) => {
      await supabase
        .from("pedidos")
        .update({
          status: "cancelado",
          notas: `[RECHAZADO] ${reason}\n${selectedPedido?.notas || ""}`
        })
        .eq("id", pedidoId);

      // Notificación in-app al vendedor
      if (selectedPedido?.vendedor_id) {
        try {
          await supabase.from("notificaciones").insert({
            tipo: "pedido_rechazado",
            titulo: `❌ Pedido ${selectedPedido.folio} rechazado`,
            descripcion: `Tu pedido para ${selectedPedido.clientes?.nombre || "cliente"} fue rechazado. Motivo: ${reason}`,
            pedido_id: pedidoId,
            leida: false,
          });
        } catch (e) { console.error("Error creando notificación:", e); }

        // Push al vendedor
        try {
          await supabase.functions.invoke("send-push-notification", {
            body: {
              user_ids: [selectedPedido.vendedor_id],
              title: "❌ Pedido rechazado",
              body: `${selectedPedido.folio} — ${selectedPedido.clientes?.nombre || "cliente"}: ${reason}`,
            }
          });
        } catch (e) { console.error("Error enviando push:", e); }
      }
    },
    onSuccess: () => {
      toast({ title: "Pedido rechazado" });
      queryClient.invalidateQueries({ queryKey: ["pedidos-por-autorizar"] });
      setSelectedPedido(null);
      setRejectDialogOpen(false);
      setRejectReason("");
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo rechazar el pedido", variant: "destructive" });
    },
  });

  const handleStartEditing = () => {
    if (!selectedPedido) return;
    const prices: Record<string, number> = {};
    selectedPedido.pedidos_detalles.forEach(d => {
      prices[d.id] = d.precio_unitario;
    });
    setEditingPrices(prices);
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setEditingPrices({});
    setIsEditing(false);
  };

  const handlePriceChange = (detalleId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setEditingPrices(prev => ({ ...prev, [detalleId]: numValue }));
  };

  const calculateNewTotal = () => {
    if (!selectedPedido) return 0;
    return selectedPedido.pedidos_detalles.reduce((sum, d) => {
      const price = editingPrices[d.id] ?? d.precio_unitario;
      return sum + (d.cantidad * price);
    }, 0);
  };

  // getPriceComparison removed — replaced by P. Mínimo / Diferencia / Margen columns

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!pedidos || pedidos.length === 0) {
    return null;
  }

  // Mobile handlers
  const handleMobileCardClick = (index: number) => {
    setSelectedMobileIndex(index);
    setMobileSheetOpen(true);
  };

  const handleMobileNext = () => {
    if (pedidos && selectedMobileIndex < pedidos.length - 1) {
      setSelectedMobileIndex(selectedMobileIndex + 1);
    } else {
      setMobileSheetOpen(false);
    }
  };

  // Mobile view
  if (isMobile) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            {pedidos.length} por autorizar
          </Badge>
        </div>

        <div className="space-y-3">
          {pedidos.map((pedido, index) => (
            <PedidoCardMobile
              key={pedido.id}
              folio={pedido.folio}
              clienteNombre={pedido.clientes?.nombre || "Cliente"}
              sucursalNombre={pedido.cliente_sucursales?.nombre}
              fechaPedido={pedido.fecha_pedido}
              numProductos={pedido.pedidos_detalles.length}
              pesoKg={calcularPesoTotalPedido(pedido.pedidos_detalles)}
              total={pedido.total}
              status="por_autorizar"
              onAction={() => handleMobileCardClick(index)}
              showStatus={false}
            />
          ))}
        </div>

        <AutorizacionRapidaSheet
          open={mobileSheetOpen}
          onOpenChange={setMobileSheetOpen}
          pedido={pedidos[selectedMobileIndex] || null}
          onNext={handleMobileNext}
          hasNext={selectedMobileIndex < pedidos.length - 1}
        />
      </div>
    );
  }

  // Desktop view
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="gap-1">
          <Clock className="h-3 w-3" />
          {pedidos.length} por autorizar
        </Badge>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Folio</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Sucursal</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Productos</TableHead>
              <TableHead className="text-right">Peso</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pedidos.map((pedido) => (
              <TableRow key={pedido.id}>
                <TableCell className="font-mono font-medium">{pedido.folio}</TableCell>
                <TableCell>{pedido.clientes?.nombre || "—"}</TableCell>
                <TableCell className="text-sm">{pedido.cliente_sucursales?.nombre || "—"}</TableCell>
                <TableCell>{format(new Date(pedido.fecha_pedido), "dd/MM/yyyy", { locale: es })}</TableCell>
                <TableCell>
                  <Badge variant="outline">{pedido.pedidos_detalles.length} productos</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-mono text-blue-600">
                      {calcularPesoTotalPedido(pedido.pedidos_detalles).toLocaleString()} kg
                    </span>
                    {calcularPesoTotalPedido(pedido.pedidos_detalles) > 15500 && (
                      <Badge variant="destructive" className="gap-1 text-xs">
                        <AlertTriangle className="h-3 w-3" />
                        Excede 15,500 kg
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(pedido.total)}</TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedPedido(pedido)}
                  >
                    Revisar precios
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Dialog de revisión de precios */}
      <Dialog open={!!selectedPedido} onOpenChange={(open) => !open && setSelectedPedido(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-4xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-base sm:text-lg">Autorizar Pedido {selectedPedido?.folio}</span>
              <div className="flex gap-2">
                {!isEditing ? (
                  <Button variant="outline" size="sm" onClick={handleStartEditing}>
                    <Edit2 className="h-4 w-4 mr-1" />
                    Editar precios
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" onClick={handleCancelEditing}>
                    <X className="h-4 w-4 mr-1" />
                    Cancelar
                  </Button>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedPedido && (
            <div className="space-y-4">
              {/* Info del cliente */}
              <Card>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Cliente:</span>
                      <p className="font-medium">{selectedPedido.clientes?.nombre}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Sucursal:</span>
                      <p className="font-medium">{selectedPedido.cliente_sucursales?.nombre || "Principal"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Fecha:</span>
                      <p className="font-medium">{format(new Date(selectedPedido.fecha_pedido), "PPP", { locale: es })}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Productos - Cards en móvil, Tabla en desktop */}
              <div className="sm:hidden space-y-2">
                {ordenarProductosAzucarPrimero(selectedPedido.pedidos_detalles, (d) => d.productos?.nombre || '').map((detalle) => {
                  const currentPrice = editingPrices[detalle.id] ?? detalle.precio_unitario;
                  const subtotal = detalle.cantidad * currentPrice;
                  const listPrice = detalle.productos?.precio_venta || 0;
                  const descuentoMax = detalle.productos?.descuento_maximo ?? 0;
                  const precioMinimo = listPrice - descuentoMax;
                  const diferencia = currentPrice - precioMinimo;
                  const costo = detalle.productos?.ultimo_costo_compra || detalle.productos?.costo_promedio_ponderado || 0;
                  const margenPct = costo > 0 ? ((currentPrice - costo) / costo) * 100 : 0;
                  const porDebajoMinimo = currentPrice < precioMinimo;

                  return (
                    <div key={detalle.id} className={`border rounded-lg p-3 space-y-2 ${porDebajoMinimo ? "border-destructive/50 bg-destructive/5" : ""}`}>
                      <div className="min-w-0">
                        <p className="font-medium text-sm line-clamp-2">{detalle.productos?.nombre}</p>
                        <p className="text-xs text-muted-foreground">{detalle.productos?.codigo} · {detalle.cantidad} {detalle.productos?.unidad}</p>
                      </div>

                      {/* Desglose de precios */}
                      <div className="space-y-1 border-t pt-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">P. Lista</span>
                          <span className="font-mono">{formatCurrency(listPrice)}</span>
                        </div>
                        {descuentoMax > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">P. Mínimo</span>
                            <span className="font-mono">{formatCurrency(precioMinimo)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">P. Solicitado</span>
                          {isEditing ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={currentPrice}
                              onChange={(e) => handlePriceChange(detalle.id, e.target.value)}
                              className="h-7 w-28 text-right font-mono text-xs"
                            />
                          ) : (
                            <span className={`font-mono font-semibold ${porDebajoMinimo ? "text-destructive" : ""}`}>
                              {formatCurrency(currentPrice)}
                            </span>
                          )}
                        </div>
                        {descuentoMax > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Diferencia</span>
                            <span className={`font-mono font-semibold ${diferencia < 0 ? "text-destructive" : "text-green-600"}`}>
                              {diferencia >= 0 ? "+" : ""}{formatCurrency(diferencia)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Costo y margen */}
                      <div className="border-t pt-2 flex items-center justify-between text-xs">
                        {costo > 0 ? (
                          <>
                            <span className="text-muted-foreground">Costo: <span className="font-mono">{formatCurrency(costo)}</span></span>
                            <Badge
                              variant={margenPct < 0 ? "destructive" : "secondary"}
                              className={`text-[10px] ${margenPct >= 10 ? "bg-green-100 text-green-800 border-green-200" : margenPct >= 0 ? "bg-yellow-100 text-yellow-800 border-yellow-200" : ""}`}
                            >
                              {margenPct >= 0 ? "+" : ""}{margenPct.toFixed(1)}%
                            </Badge>
                          </>
                        ) : (
                          <>
                            <span className="text-muted-foreground">Costo: <span className="font-mono">Sin registro</span></span>
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">
                              --
                            </Badge>
                          </>
                        )}
                      </div>

                      {/* Subtotal */}
                      <div className="border-t pt-2 flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">Subtotal</span>
                        <span className="font-mono font-semibold">{formatCurrency(subtotal)}</span>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => setExpandedHistorial(
                          expandedHistorial === detalle.productos?.id ? null : detalle.productos?.id || null
                        )}
                      >
                        <History className="h-3 w-3 mr-1" />
                        Ver historial
                      </Button>
                      {expandedHistorial === detalle.productos?.id && historialData && (
                        <div className="bg-muted/50 rounded p-2">
                          <p className="text-xs font-medium mb-1">Historial de precios:</p>
                          {historialData.length === 0 ? (
                            <p className="text-xs text-muted-foreground">Primera compra</p>
                          ) : (
                            <div className="space-y-1">
                              {historialData.map((h, idx) => (
                                <div key={idx} className="flex justify-between text-xs">
                                  <Badge variant={h.fuente === "pedido" ? "default" : "secondary"} className="text-[10px] h-5">
                                    {h.fuente === "pedido" ? "Pedido" : "Cotización"}
                                  </Badge>
                                  <span className="font-mono">{formatCurrency(h.precio)} ({format(new Date(h.fecha), "dd/MM/yy")})</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Desktop table */}
              <div className="border rounded-lg hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">P. Lista</TableHead>
                      <TableHead className="text-right">P. Mínimo</TableHead>
                      <TableHead className="text-right">P. Solicitado</TableHead>
                      <TableHead className="text-right">Diferencia</TableHead>
                      <TableHead className="text-right">Margen %</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ordenarProductosAzucarPrimero(selectedPedido.pedidos_detalles, (d) => d.productos?.nombre || '').map((detalle) => {
                      const currentPrice = editingPrices[detalle.id] ?? detalle.precio_unitario;
                      const subtotal = detalle.cantidad * currentPrice;
                      const listPrice = detalle.productos?.precio_venta || 0;
                      const descuentoMax = detalle.productos?.descuento_maximo ?? 0;
                      const precioMinimo = listPrice - descuentoMax;
                      const diferencia = currentPrice - precioMinimo;
                      const costo = detalle.productos?.ultimo_costo_compra || detalle.productos?.costo_promedio_ponderado || 0;
                      const margenPct = costo > 0 ? ((currentPrice - costo) / costo) * 100 : 0;
                      const porDebajoMinimo = currentPrice < precioMinimo;

                      return (
                        <>
                          <TableRow key={detalle.id} className={porDebajoMinimo ? "bg-destructive/5" : ""}>
                            <TableCell>
                              <div>
                                <span className="font-medium">{detalle.productos?.nombre}</span>
                                <span className="text-xs text-muted-foreground ml-2">
                                  {detalle.productos?.codigo}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {detalle.cantidad} {detalle.productos?.unidad}
                            </TableCell>
                            <TableCell className="text-right font-mono text-muted-foreground">
                              {formatCurrency(listPrice)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-muted-foreground">
                              {descuentoMax > 0 ? `${formatCurrency(precioMinimo)}` : "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              {isEditing ? (
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={currentPrice}
                                  onChange={(e) => handlePriceChange(detalle.id, e.target.value)}
                                  className="w-28 text-right font-mono"
                                />
                              ) : (
                                <span className={`font-mono font-medium ${porDebajoMinimo ? "text-destructive" : ""}`}>
                                  {formatCurrency(currentPrice)}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {descuentoMax > 0 ? (
                                <span className={`font-mono text-sm font-semibold ${diferencia < 0 ? "text-destructive" : "text-green-600"}`}>
                                  {diferencia >= 0 ? "+" : ""}{formatCurrency(diferencia)}
                                </span>
                              ) : "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              {costo > 0 ? (
                                <Badge
                                  variant={margenPct < 0 ? "destructive" : "secondary"}
                                  className={`text-xs ${margenPct >= 10 ? "bg-green-100 text-green-800 border-green-200" : margenPct >= 0 ? "bg-yellow-100 text-yellow-800 border-yellow-200" : ""}`}
                                >
                                  {margenPct >= 0 ? "+" : ""}{margenPct.toFixed(1)}%
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs text-muted-foreground">
                                  Sin costo
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono font-medium">
                              {formatCurrency(subtotal)}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setExpandedHistorial(
                                  expandedHistorial === detalle.productos?.id ? null : detalle.productos?.id || null
                                )}
                              >
                                <History className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                          
                          {expandedHistorial === detalle.productos?.id && historialData && (
                            <TableRow>
                              <TableCell colSpan={9} className="bg-muted/50">
                                <div className="py-2 px-4">
                                  <p className="text-sm font-medium mb-2">Historial de precios para este cliente:</p>
                                  {historialData.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">Primera compra de este producto</p>
                                  ) : (
                                    <div className="flex gap-4 flex-wrap">
                                      {historialData.map((h, idx) => (
                                        <div key={idx} className="text-sm">
                                          <Badge variant={h.fuente === "pedido" ? "default" : "secondary"} className="mr-2">
                                            {h.fuente === "pedido" ? "Pedido" : "Cotización"}
                                          </Badge>
                                          <span className="font-mono">{formatCurrency(h.precio)}</span>
                                          <span className="text-muted-foreground ml-1">
                                            ({format(new Date(h.fecha), "dd/MM/yy")})
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Total */}
              <div className="flex sm:justify-end">
                <Card className="w-full sm:w-64">
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Total:</span>
                      <span className="text-xl font-bold font-mono">
                        {formatCurrency(isEditing ? calculateNewTotal() : selectedPedido.total)}
                      </span>
                    </div>
                    {isEditing && calculateNewTotal() !== selectedPedido.total && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Original: {formatCurrency(selectedPedido.total)}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Notas */}
              {selectedPedido.notas && (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Notas del pedido</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground">{selectedPedido.notas}</p>
                  </CardContent>
                </Card>
              )}

              {/* Acciones */}
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 border-t">
                <Button
                  variant="destructive"
                  onClick={() => setRejectDialogOpen(true)}
                  disabled={authorizeMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Rechazar
                </Button>
                <Button
                  onClick={() => authorizeMutation.mutate(selectedPedido.id)}
                  disabled={authorizeMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  {authorizeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Autorizar Pedido
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de rechazo */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rechazar pedido</AlertDialogTitle>
            <AlertDialogDescription>
              Ingresa el motivo del rechazo. El cliente será notificado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Motivo del rechazo..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedPedido && rejectMutation.mutate({ 
                pedidoId: selectedPedido.id, 
                reason: rejectReason 
              })}
              disabled={!rejectReason.trim() || rejectMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmar Rechazo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}