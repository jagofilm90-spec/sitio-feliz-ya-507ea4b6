import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Edit2,
  Package,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";

interface PedidoDetalle {
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
    descuento_maximo: number | null;
    ultimo_costo_compra: number | null;
    costo_promedio_ponderado: number | null;
  } | null;
}

interface PedidoPorAutorizar {
  id: string;
  folio: string;
  fecha_pedido: string;
  total: number;
  notas: string | null;
  clientes: { id: string; nombre: string; email: string | null } | null;
  cliente_sucursales: { id: string; nombre: string } | null;
  pedidos_detalles: PedidoDetalle[];
}

interface AutorizacionRapidaSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedido: PedidoPorAutorizar | null;
  onNext?: () => void;
  hasNext?: boolean;
}

const calcularPesoTotal = (detalles: PedidoDetalle[]) => {
  return detalles.reduce((acc, d) => {
    const peso = d.productos?.peso_kg ?? 1;
    return acc + d.cantidad * peso;
  }, 0);
};

export function AutorizacionRapidaSheet({
  open,
  onOpenChange,
  pedido,
  onNext,
  hasNext,
}: AutorizacionRapidaSheetProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingPrices, setEditingPrices] = useState<Record<string, number>>({});
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleStartEditing = () => {
    if (!pedido) return;
    const prices: Record<string, number> = {};
    pedido.pedidos_detalles.forEach((d) => {
      prices[d.id] = d.precio_unitario;
    });
    setEditingPrices(prices);
    setIsEditing(true);
  };

  const handlePriceChange = (detalleId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setEditingPrices((prev) => ({ ...prev, [detalleId]: numValue }));
  };

  const calculateNewTotal = () => {
    if (!pedido) return 0;
    return pedido.pedidos_detalles.reduce((sum, d) => {
      const price = editingPrices[d.id] ?? d.precio_unitario;
      return sum + d.cantidad * price;
    }, 0);
  };

  // Authorize mutation
  const authorizeMutation = useMutation({
    mutationFn: async () => {
      if (!pedido) throw new Error("No hay pedido");

      // Update prices if edited
      if (Object.keys(editingPrices).length > 0) {
        for (const [detalleId, newPrice] of Object.entries(editingPrices)) {
          const detalle = pedido.pedidos_detalles.find((d) => d.id === detalleId);
          if (detalle && newPrice !== detalle.precio_unitario) {
            const newSubtotal = detalle.cantidad * newPrice;
            await supabase
              .from("pedidos_detalles")
              .update({ precio_unitario: newPrice, subtotal: newSubtotal })
              .eq("id", detalleId);
          }
        }

        // Recalculate total
        const { data: detalles } = await supabase
          .from("pedidos_detalles")
          .select("subtotal")
          .eq("pedido_id", pedido.id);

        const newTotal = detalles?.reduce((sum, d) => sum + d.subtotal, 0) || 0;
        const pesoTotal = calcularPesoTotal(pedido.pedidos_detalles);

        await supabase
          .from("pedidos")
          .update({
            total: newTotal,
            status: "pendiente",
            peso_total_kg: pesoTotal > 0 ? pesoTotal : null,
          })
          .eq("id", pedido.id);
      } else {
        const pesoTotal = calcularPesoTotal(pedido.pedidos_detalles);
        await supabase
          .from("pedidos")
          .update({
            status: "pendiente",
            peso_total_kg: pesoTotal > 0 ? pesoTotal : null,
          })
          .eq("id", pedido.id);
      }

      // Send notification email
      if (pedido.clientes?.email) {
        try {
          await supabase.functions.invoke("send-order-authorized-email", {
            body: {
              clienteEmail: pedido.clientes.email,
              clienteNombre: pedido.clientes.nombre || "Cliente",
              pedidoFolio: pedido.folio,
              total: calculateNewTotal(),
              fechaEntrega: new Date().toISOString(),
              ajustesPrecio: Object.keys(editingPrices).length,
              detalles: pedido.pedidos_detalles.map((d) => ({
                producto: d.productos?.nombre || "Producto",
                cantidad: d.cantidad,
                unidad: d.productos?.unidad || "pza",
                precioUnitario: editingPrices[d.id] ?? d.precio_unitario,
                subtotal: d.cantidad * (editingPrices[d.id] ?? d.precio_unitario),
              })),
            },
          });
        } catch (e) {
          console.error("Error enviando email:", e);
        }
      }
    },
    onSuccess: () => {
      toast({ title: "✓ Pedido autorizado", description: "El cliente será notificado" });
      queryClient.invalidateQueries({ queryKey: ["pedidos-por-autorizar"] });
      resetState();
      if (hasNext && onNext) {
        onNext();
      } else {
        onOpenChange(false);
      }
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo autorizar", variant: "destructive" });
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!pedido) throw new Error("No hay pedido");
      await supabase
        .from("pedidos")
        .update({
          status: "cancelado",
          notas: `[RECHAZADO] ${rejectReason}\n${pedido.notas || ""}`,
        })
        .eq("id", pedido.id);

      // Notificación in-app al vendedor
      if ((pedido as any).vendedor_id) {
        try {
          await supabase.from("notificaciones").insert({
            tipo: "pedido_rechazado",
            titulo: `❌ Pedido ${pedido.folio} rechazado`,
            descripcion: `Tu pedido para ${pedido.clientes?.nombre || "cliente"} fue rechazado. Motivo: ${rejectReason}`,
            pedido_id: pedido.id,
            leida: false,
          });
        } catch (e) { console.error("Error creando notificación:", e); }

        // Push al vendedor
        try {
          await supabase.functions.invoke("send-push-notification", {
            body: {
              user_ids: [(pedido as any).vendedor_id],
              title: "❌ Pedido rechazado",
              body: `${pedido.folio} — ${pedido.clientes?.nombre || "cliente"}: ${rejectReason}`,
            }
          });
        } catch (e) { console.error("Error enviando push:", e); }
      }
    },
    onSuccess: () => {
      toast({ title: "Pedido rechazado" });
      queryClient.invalidateQueries({ queryKey: ["pedidos-por-autorizar"] });
      resetState();
      if (hasNext && onNext) {
        onNext();
      } else {
        onOpenChange(false);
      }
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo rechazar", variant: "destructive" });
    },
  });

  const resetState = () => {
    setIsEditing(false);
    setEditingPrices({});
    setShowRejectForm(false);
    setRejectReason("");
  };

  if (!pedido) return null;

  const pesoTotal = calcularPesoTotal(pedido.pedidos_detalles);
  const excedePeso = pesoTotal > 15500;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] flex flex-col p-0">
        <SheetHeader className="p-4 pb-2 border-b">
          <SheetTitle className="flex items-center justify-between">
            <span className="font-mono">{pedido.folio}</span>
            {hasNext && (
              <Badge variant="outline" className="text-xs">
                Hay más pendientes
              </Badge>
            )}
          </SheetTitle>
          <div className="text-sm text-muted-foreground text-left">
            <p className="font-medium text-foreground">{pedido.clientes?.nombre}</p>
            {pedido.cliente_sucursales && (
              <p className="text-xs">{pedido.cliente_sucursales.nombre}</p>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4">
          {/* Resumen */}
          <div className="py-3 flex items-center justify-between text-sm">
            <div className="flex items-center gap-3">
              <Badge variant="secondary">
                <Package className="h-3 w-3 mr-1" />
                {pedido.pedidos_detalles.length} productos
              </Badge>
              <span className={`font-mono ${excedePeso ? "text-red-600" : ""}`}>
                {pesoTotal.toLocaleString()} kg
                {excedePeso && <AlertTriangle className="h-3 w-3 inline ml-1" />}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {format(new Date(pedido.fecha_pedido), "dd MMM", { locale: es })}
            </span>
          </div>

          {/* Lista de productos */}
          <div className="space-y-2 pb-4">
            {pedido.pedidos_detalles.map((detalle) => {
              const currentPrice = editingPrices[detalle.id] ?? detalle.precio_unitario;
              const listPrice = detalle.productos?.precio_venta || 0;
              const descuentoMax = detalle.productos?.descuento_maximo ?? 0;
              const precioMinimo = listPrice - descuentoMax;
              const diferencia = currentPrice - precioMinimo;
              const costo = detalle.productos?.ultimo_costo_compra || detalle.productos?.costo_promedio_ponderado || 0;
              const ganancia = costo > 0 ? currentPrice - costo : 0;
              const margenPct = costo > 0 ? ((currentPrice - costo) / costo) * 100 : 0;
              const porDebajoMinimo = currentPrice < precioMinimo;
              const gananciasBajas = costo > 0 && margenPct < 10;

              return (
                <div
                  key={detalle.id}
                  className={`p-3 rounded-lg space-y-2 ${porDebajoMinimo ? "bg-destructive/10 border border-destructive/30" : "bg-muted/50"}`}
                >
                  {/* Nombre y cantidad */}
                  <div>
                    <p className="font-medium text-sm line-clamp-2">
                      {detalle.productos?.nombre}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {detalle.cantidad} {detalle.productos?.unidad}
                    </p>
                  </div>

                  {/* Desglose de precios */}
                  <div className="border-t pt-2 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">P. Lista</span>
                      <span className="font-mono">${formatCurrency(listPrice)}</span>
                    </div>
                    {descuentoMax > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">P. Mínimo</span>
                        <span className="font-mono">${formatCurrency(precioMinimo)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">P. Solicitado</span>
                      <span className={`font-mono font-semibold ${porDebajoMinimo ? "text-destructive" : ""}`}>
                        ${formatCurrency(currentPrice)}
                      </span>
                    </div>
                    {descuentoMax > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Diferencia</span>
                        <span className={`font-mono font-semibold ${diferencia < 0 ? "text-destructive" : "text-green-600"}`}>
                          {diferencia >= 0 ? "+" : ""}${formatCurrency(diferencia)}
                        </span>
                      </div>
                    )}
                  </div>

          {/* Costo y ganancia */}
                  <div className="border-t pt-2 flex items-center justify-between text-xs">
                    {costo > 0 ? (
                      <>
                        <span className="text-muted-foreground">Costo: <span className="font-mono">${formatCurrency(costo)}</span></span>
                        <Badge
                          variant={margenPct < 0 ? "destructive" : "secondary"}
                          className={`text-[10px] ${margenPct >= 10 ? "bg-green-100 text-green-800 border-green-200" : margenPct >= 0 ? "bg-yellow-100 text-yellow-800 border-yellow-200" : ""}`}
                        >
                          {margenPct >= 0 ? "+" : ""}{margenPct.toFixed(1)}% margen
                        </Badge>
                      </>
                    ) : (
                      <>
                        <span className="text-muted-foreground">Costo: <span className="font-mono">Sin registro</span></span>
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          -- margen
                        </Badge>
                      </>
                    )}
                  </div>

                  {/* Subtotal */}
                  <div className="border-t pt-2 flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Subtotal</span>
                    <span className="font-mono font-semibold">
                      ${formatCurrency(detalle.cantidad * currentPrice)}
                    </span>
                  </div>

                  {/* Editor de precio */}
                  {isEditing && (
                    <Input
                      type="number"
                      step="0.01"
                      value={currentPrice}
                      onChange={(e) => handlePriceChange(detalle.id, e.target.value)}
                      className="h-9 text-right font-mono"
                    />
                  )}
                </div>
              );
            })}
          </div>

        </ScrollArea>

        {/* Footer con total y acciones */}
        <div className="border-t p-4 space-y-3 bg-background">
          {showRejectForm ? (
            /* Footer en modo rechazo */
            <div className="space-y-3">
              <p className="font-medium text-sm">Motivo de rechazo:</p>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Escribe el motivo..."
                className="min-h-[80px]"
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowRejectForm(false)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => rejectMutation.mutate()}
                  disabled={!rejectReason.trim() || rejectMutation.isPending}
                >
                  {rejectMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Confirmar rechazo"
                  )}
                </Button>
              </div>
            </div>
          ) : (
            /* Footer normal */
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total:</span>
                <span className="text-2xl font-bold font-mono">
                  ${formatCurrency(isEditing ? calculateNewTotal() : pedido.total)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {!isEditing ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleStartEditing}
                      className="gap-2"
                    >
                      <Edit2 className="h-4 w-4" />
                      Ajustar precios
                    </Button>
                    <Button
                      onClick={() => authorizeMutation.mutate()}
                      disabled={authorizeMutation.isPending}
                      className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                    >
                      {authorizeMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          Autorizar
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Cancelar
                    </Button>
                    <Button
                      onClick={() => authorizeMutation.mutate()}
                      disabled={authorizeMutation.isPending}
                      className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                    >
                      {authorizeMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          Guardar y autorizar
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>

              {!isEditing && (
                <Button
                  variant="ghost"
                  className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setShowRejectForm(true)}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Rechazar pedido
                </Button>
              )}

              {hasNext && (
                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={onNext}
                >
                  Saltar al siguiente
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
