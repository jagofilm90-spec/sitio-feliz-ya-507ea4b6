import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Bell,
  Check,
  X,
  MessageSquare,
  Clock,
  User,
  Package,
  Store,
  Loader2,
  ShoppingCart,
  TrendingDown,
  History,
  AlertTriangle,
  ChevronDown,
  Wallet,
  Zap,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";
import { es } from "date-fns/locale";
import { useSolicitudesDescuento, SolicitudDescuento, CarritoItem } from "@/hooks/useSolicitudesDescuento";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

// Fetch price history for a product+client combination
async function fetchPriceHistory(productoId: string, clienteId: string) {
  const { data } = await supabase
    .from("pedidos_detalles")
    .select(`
      precio_unitario,
      cantidad,
      created_at,
      pedido:pedidos!inner(fecha_pedido, cliente_id, folio)
    `)
    .eq("producto_id", productoId)
    .eq("pedido.cliente_id", clienteId)
    .order("created_at", { ascending: false })
    .limit(5);
  
  return data || [];
}

// Fetch recent orders for a client
async function fetchClienteHistorial(clienteId: string) {
  const { data: ordersData } = await supabase
    .from("pedidos")
    .select("id, folio, total, created_at, status")
    .eq("cliente_id", clienteId)
    .order("created_at", { ascending: false })
    .limit(5);
  
  return ordersData || [];
}

// Parse cart snapshot from JSON
function parseCarritoSnapshot(snapshot: unknown): CarritoItem[] {
  if (!snapshot) return [];
  try {
    if (typeof snapshot === 'string') {
      return JSON.parse(snapshot) as CarritoItem[];
    }
    return snapshot as CarritoItem[];
  } catch {
    return [];
  }
}

export function SolicitudesDescuentoPanel() {
  const { solicitudes, loading, pendingCount, responderSolicitud, removeSolicitud } = useSolicitudesDescuento({
    onlyPending: true,
    enableRealtime: true,
  });

  const [respondiendo, setRespondiendo] = useState<string | null>(null);
  const [contraofertaDialog, setContraofertaDialog] = useState<SolicitudDescuento | null>(null);
  const [contraoferta, setContraoferta] = useState("");
  const [notasRechazo, setNotasRechazo] = useState("");
  const [rechazarDialog, setRechazarDialog] = useState<SolicitudDescuento | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Auto-expand first item
  useEffect(() => {
    if (solicitudes.length > 0 && expandedItems.size === 0) {
      setExpandedItems(new Set([solicitudes[0].id]));
    }
  }, [solicitudes.length]);

  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleAprobar = async (solicitud: SolicitudDescuento, precioAprobado?: number) => {
    const precio = precioAprobado ?? solicitud.precio_solicitado;
    setRespondiendo(solicitud.id);
    try {
      await responderSolicitud(solicitud.id, true, precio);
      removeSolicitud(solicitud.id);
      toast.success("Descuento aprobado");
      
      // Send push notification to vendedor
      try {
        await supabase.functions.invoke('send-push-notification', {
          body: {
            user_ids: [solicitud.vendedor_id],
            title: '✅ Precio Autorizado',
            body: `Tu descuento para ${solicitud.producto?.nombre || 'producto'} fue aprobado a ${formatCurrency(precio)}`,
            data: {
              type: 'descuento_aprobado',
              solicitud_id: solicitud.id,
              precio_aprobado: String(precio),
            }
          }
        });
      } catch (pushError) {
        console.error("Error sending push:", pushError);
      }
    } catch (error: any) {
      toast.error(error.message || "Error al aprobar");
    } finally {
      setRespondiendo(null);
    }
  };

  const handleRechazar = async () => {
    if (!rechazarDialog) return;
    setRespondiendo(rechazarDialog.id);
    try {
      await responderSolicitud(rechazarDialog.id, false, undefined, notasRechazo);
      removeSolicitud(rechazarDialog.id);
      toast.success("Solicitud rechazada");
      
      // Send push notification to vendedor
      try {
        await supabase.functions.invoke('send-push-notification', {
          body: {
            user_ids: [rechazarDialog.vendedor_id],
            title: '❌ Descuento Rechazado',
            body: `Tu solicitud para ${rechazarDialog.producto?.nombre || 'producto'} fue rechazada`,
            data: {
              type: 'descuento_rechazado',
              solicitud_id: rechazarDialog.id,
            }
          }
        });
      } catch (pushError) {
        console.error("Error sending push:", pushError);
      }
      
      setRechazarDialog(null);
      setNotasRechazo("");
    } catch (error: any) {
      toast.error(error.message || "Error al rechazar");
    } finally {
      setRespondiendo(null);
    }
  };

  const handleContraoferta = async () => {
    if (!contraofertaDialog) return;
    const precio = parseFloat(contraoferta);
    if (isNaN(precio) || precio <= 0) {
      toast.error("Ingresa un precio válido");
      return;
    }
    
    setRespondiendo(contraofertaDialog.id);
    try {
      await responderSolicitud(
        contraofertaDialog.id,
        true,
        precio,
        `Contraoferta: ${formatCurrency(precio)}`
      );
      removeSolicitud(contraofertaDialog.id);
      toast.success("Contraoferta enviada");
      
      // Send push notification to vendedor
      try {
        await supabase.functions.invoke('send-push-notification', {
          body: {
            user_ids: [contraofertaDialog.vendedor_id],
            title: '💰 Contraoferta de Precio',
            body: `Se aprobó un precio diferente para ${contraofertaDialog.producto?.nombre || 'producto'}: ${formatCurrency(precio)}`,
            data: {
              type: 'descuento_contraoferta',
              solicitud_id: contraofertaDialog.id,
              precio_aprobado: String(precio),
            }
          }
        });
      } catch (pushError) {
        console.error("Error sending push:", pushError);
      }
      
      setContraofertaDialog(null);
      setContraoferta("");
    } catch (error: any) {
      toast.error(error.message || "Error al enviar contraoferta");
    } finally {
      setRespondiendo(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (solicitudes.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5 text-amber-600 animate-pulse" />
            Solicitudes de Descuento
            <Badge variant="destructive" className="ml-2 animate-pulse">
              {pendingCount} pendientes
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[600px]">
            <div className="space-y-4">
              {solicitudes.map((solicitud) => (
                <SolicitudCard
                  key={solicitud.id}
                  solicitud={solicitud}
                  isExpanded={expandedItems.has(solicitud.id)}
                  onToggleExpand={() => toggleExpanded(solicitud.id)}
                  onAprobar={handleAprobar}
                  onRechazar={(s) => setRechazarDialog(s)}
                  onContraoferta={(s) => {
                    setContraofertaDialog(s);
                    setContraoferta(s.precio_lista.toString());
                  }}
                  respondiendo={respondiendo === solicitud.id}
                />
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Contraoferta Dialog */}
      <Dialog
        open={!!contraofertaDialog}
        onOpenChange={(open) => !open && setContraofertaDialog(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Contraoferta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Propón un precio diferente al solicitado
            </p>
            <div className="space-y-2">
              <div className="text-sm">
                <span className="text-muted-foreground">Precio lista: </span>
                <span className="font-medium">
                  {contraofertaDialog && formatCurrency(contraofertaDialog.precio_lista)}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Vendedor solicita: </span>
                <span className="font-medium text-primary">
                  {contraofertaDialog && formatCurrency(contraofertaDialog.precio_solicitado)}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tu contraoferta:</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  type="number"
                  value={contraoferta}
                  onChange={(e) => setContraoferta(e.target.value)}
                  className="pl-7"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContraofertaDialog(null)}>
              Cancelar
            </Button>
            <Button onClick={handleContraoferta} disabled={respondiendo !== null}>
              {respondiendo ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Enviar Contraoferta"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rechazar Dialog */}
      <Dialog
        open={!!rechazarDialog}
        onOpenChange={(open) => !open && setRechazarDialog(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rechazar Solicitud</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Opcionalmente, indica el motivo del rechazo
            </p>
            <Textarea
              value={notasRechazo}
              onChange={(e) => setNotasRechazo(e.target.value)}
              placeholder="Motivo del rechazo (opcional)..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRechazarDialog(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRechazar}
              disabled={respondiendo !== null}
            >
              {respondiendo ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Confirmar Rechazo"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Individual solicitud card with full context
interface SolicitudCardProps {
  solicitud: SolicitudDescuento;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onAprobar: (solicitud: SolicitudDescuento, precioAprobado?: number) => void;
  onRechazar: (solicitud: SolicitudDescuento) => void;
  onContraoferta: (solicitud: SolicitudDescuento) => void;
  respondiendo: boolean;
}

function SolicitudCard({
  solicitud,
  isExpanded,
  onToggleExpand,
  onAprobar,
  onRechazar,
  onContraoferta,
  respondiendo,
}: SolicitudCardProps) {
  // Fetch price history for this product+client
  const { data: historialPrecios } = useQuery({
    queryKey: ['price-history', solicitud.producto_id, solicitud.cliente_id],
    queryFn: () => fetchPriceHistory(solicitud.producto_id, solicitud.cliente_id),
    enabled: isExpanded,
  });

  // Fetch client order history
  const { data: historialCliente } = useQuery({
    queryKey: ['client-history', solicitud.cliente_id],
    queryFn: () => fetchClienteHistorial(solicitud.cliente_id),
    enabled: isExpanded,
  });

  const carritoItems = parseCarritoSnapshot(solicitud.carrito_snapshot);
  const otrosProductos = carritoItems.filter(item => item.productoId !== solicitud.producto_id);
  const tieneOtrosDescuentos = carritoItems.some(
    item => item.tieneDescuentoPendiente && item.productoId !== solicitud.producto_id
  );

  // Calculate suggested intermediate prices
  const precioMedio = Math.round((solicitud.precio_solicitado + solicitud.precio_lista) / 2);
  const precio5PorcientoMenos = Math.round(solicitud.precio_lista * 0.95);

  return (
    <div className="bg-background border rounded-lg overflow-hidden">
      {/* Header - Always visible */}
      <div 
        className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={onToggleExpand}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Urgency indicator */}
            {solicitud.es_urgente && (
              <div className="relative">
                <Zap className="h-5 w-5 text-amber-500 animate-pulse" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {solicitud.vendedor?.full_name || "Vendedor"}
                </span>
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">
                  EN ESPERA
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {solicitud.cliente?.nombre || "Cliente"} 
                {solicitud.sucursal && ` - ${solicitud.sucursal.nombre}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(solicitud.created_at), {
                addSuffix: true,
                locale: es,
              })}
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </div>
        </div>

        {/* Quick summary */}
        <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm">
          <div className="flex items-center gap-1 min-w-0">
            <Package className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-medium line-clamp-2 sm:line-clamp-1">{solicitud.producto?.nombre}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-muted-foreground line-through">{formatCurrency(solicitud.precio_lista)}</span>
            <span className="text-primary font-bold">→ {formatCurrency(solicitud.precio_solicitado)}</span>
            <Badge variant="destructive" className="text-xs">
              -{formatCurrency(solicitud.descuento_solicitado)}
            </Badge>
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t px-4 py-3 space-y-4 bg-muted/30">
          {/* Client info with balance */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-muted-foreground" />
              <span>{solicitud.cliente?.codigo} - {solicitud.cliente?.nombre}</span>
            </div>
            {solicitud.cliente?.saldo_pendiente != null && solicitud.cliente.saldo_pendiente > 0 && (
              <Badge variant="outline" className="text-amber-600 border-amber-400">
                <Wallet className="h-3 w-3 mr-1" />
                Saldo: {formatCurrency(solicitud.cliente.saldo_pendiente)}
              </Badge>
            )}
          </div>

          {/* Price breakdown with cost & margin */}
          <div className="bg-background rounded-lg p-3 space-y-2 text-sm border">
            <div className="font-medium flex items-center gap-2 mb-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              Detalle del Descuento
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Precio lista:</span>
                <span className="font-medium">{formatCurrency(solicitud.precio_lista)}</span>
              </div>
              <div className="flex justify-between text-primary">
                <span>Precio solicitado:</span>
                <span className="font-bold">{formatCurrency(solicitud.precio_solicitado)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Máx. autorizado:</span>
                <span>-{formatCurrency(solicitud.descuento_maximo)}</span>
              </div>
              <div className="flex justify-between text-red-600 font-medium">
                <span>Excedente:</span>
                <span>-{formatCurrency(solicitud.descuento_solicitado - solicitud.descuento_maximo)}</span>
              </div>
            </div>
            {/* Cost & Margin */}
            {(() => {
              const costo = solicitud.producto?.ultimo_costo_compra || solicitud.producto?.costo_promedio_ponderado || 0;
              const margenPct = costo > 0 ? ((solicitud.precio_solicitado - costo) / costo) * 100 : 0;
              const margenColor = costo === 0 ? 'bg-muted text-muted-foreground' : margenPct >= 10 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : margenPct >= 0 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
              return (
                <div className="pt-2 border-t flex justify-between items-center">
                  <span className="text-muted-foreground">
                    Costo: {costo > 0 ? formatCurrency(costo) : 'Sin registro'}
                  </span>
                  <Badge className={margenColor}>
                    {costo > 0 ? `${margenPct >= 0 ? '+' : ''}${margenPct.toFixed(1)}% margen` : '--'}
                  </Badge>
                </div>
              );
            })()}
            <div className="pt-2 border-t flex justify-between">
              <span className="text-muted-foreground">Cantidad:</span>
              <Badge variant="secondary">{solicitud.cantidad_solicitada} uds</Badge>
            </div>
          </div>

          {/* Quick approval buttons - immediately after price detail */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                size="sm"
                onClick={() => onAprobar(solicitud)}
                disabled={respondiendo}
                className="flex-1"
              >
                {respondiendo ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Aprobar {formatCurrency(solicitud.precio_solicitado)}
                  </>
                )}
              </Button>
              {precioMedio !== solicitud.precio_solicitado && precioMedio !== solicitud.precio_lista && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAprobar(solicitud, precioMedio)}
                  disabled={respondiendo}
                  className="flex-1 sm:flex-initial"
                >
                  {formatCurrency(precioMedio)}
                </Button>
              )}
              {precio5PorcientoMenos > solicitud.precio_solicitado && precio5PorcientoMenos < solicitud.precio_lista && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAprobar(solicitud, precio5PorcientoMenos)}
                  disabled={respondiendo}
                  className="flex-1 sm:flex-initial"
                >
                  {formatCurrency(precio5PorcientoMenos)}
                </Button>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onRechazar(solicitud)}
                disabled={respondiendo}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-1" />
                Rechazar
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onContraoferta(solicitud)}
                disabled={respondiendo}
                className="flex-1 sm:flex-initial"
              >
                <MessageSquare className="h-4 w-4 mr-1" />
                Otro precio
              </Button>
            </div>
          </div>

          {/* Motivo */}
          {solicitud.motivo && (
            <div className="text-sm bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
              <span className="text-muted-foreground font-medium">Motivo: </span>
              {solicitud.motivo}
            </div>
          )}

          {/* Cart items - always visible */}
          {carritoItems.length > 0 && (
            <div className="bg-background rounded-lg p-3 border text-sm space-y-2">
              <div className="flex items-center gap-2 font-medium mb-2">
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                Productos del pedido ({carritoItems.length} total)
                {tieneOtrosDescuentos && (
                  <Badge variant="outline" className="text-amber-600 text-xs">
                    Más descuentos pendientes
                  </Badge>
                )}
              </div>
              {carritoItems.map((item, idx) => {
                const esProductoSolicitado = item.productoId === solicitud.producto_id;
                return (
                  <div
                    key={idx}
                    className={`flex justify-between items-center py-1 px-2 rounded ${
                      esProductoSolicitado
                        ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 font-medium'
                        : ''
                    }`}
                  >
                    <span className={esProductoSolicitado ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground'}>
                      {item.productoNombre} × {item.cantidad}
                      {item.tieneDescuentoPendiente && !esProductoSolicitado && ' ⚠️'}
                      {esProductoSolicitado && ' ← este'}
                    </span>
                    <span className={esProductoSolicitado ? 'text-amber-700 dark:text-amber-400' : 'font-medium'}>
                      {formatCurrency(item.subtotal)}
                    </span>
                  </div>
                );
              })}
              {solicitud.total_pedido_estimado && solicitud.total_pedido_estimado > 0 && (
                <>
                  <Separator className="my-2" />
                  <div className="flex justify-between font-bold">
                    <span>Total estimado:</span>
                    <span className="text-primary">{formatCurrency(solicitud.total_pedido_estimado)}</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Price history */}
          {historialPrecios && historialPrecios.length > 0 && (
            <div className="text-sm">
              <div className="flex items-center gap-2 mb-2 font-medium">
                <History className="h-4 w-4 text-muted-foreground" />
                Historial de precios (este cliente)
              </div>
              <div className="bg-background rounded-lg p-3 border space-y-1">
                {historialPrecios.map((h: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">
                      {format(new Date(h.created_at), 'dd MMM yyyy', { locale: es })}
                    </span>
                    <span className="font-medium">{formatCurrency(h.precio_unitario)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
