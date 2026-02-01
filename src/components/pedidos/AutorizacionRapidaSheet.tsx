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
              const isDifferent = currentPrice !== listPrice;

              return (
                <div
                  key={detalle.id}
                  className="p-3 bg-muted/50 rounded-lg space-y-2"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {detalle.productos?.nombre}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {detalle.cantidad} {detalle.productos?.unidad} × $
                        {formatCurrency(currentPrice)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-semibold">
                        ${formatCurrency(detalle.cantidad * currentPrice)}
                      </p>
                      {isDifferent && (
                        <p className="text-xs text-muted-foreground">
                          Lista: ${formatCurrency(listPrice)}
                        </p>
                      )}
                    </div>
                  </div>

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

          {/* Form de rechazo */}
          {showRejectForm && (
            <div className="py-4 space-y-3 border-t">
              <p className="font-medium text-sm">Motivo de rechazo:</p>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Escribe el motivo..."
                className="min-h-[80px]"
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
          )}
        </ScrollArea>

        {/* Footer con total y acciones */}
        <div className="border-t p-4 space-y-3 bg-background">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total:</span>
            <span className="text-2xl font-bold font-mono">
              ${formatCurrency(isEditing ? calculateNewTotal() : pedido.total)}
            </span>
          </div>

          {!showRejectForm && (
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
          )}

          {!showRejectForm && !isEditing && (
            <Button
              variant="ghost"
              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setShowRejectForm(true)}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Rechazar pedido
            </Button>
          )}

          {hasNext && !showRejectForm && (
            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={onNext}
            >
              Saltar al siguiente
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
