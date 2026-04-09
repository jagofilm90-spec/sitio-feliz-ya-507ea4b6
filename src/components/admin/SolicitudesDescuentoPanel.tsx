import { useState } from "react";
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
  Loader2,
  ShoppingCart,
  History,
  Zap,
  Info,
  Wallet,
  AlertTriangle,
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
  const [detalleDialog, setDetalleDialog] = useState<SolicitudDescuento | null>(null);

  const handleAprobar = async (solicitud: SolicitudDescuento, precioAprobado?: number) => {
    const precio = precioAprobado ?? solicitud.precio_solicitado;
    setRespondiendo(solicitud.id);
    try {
      await responderSolicitud(solicitud.id, true, precio);
      removeSolicitud(solicitud.id);
      toast.success("Descuento aprobado");
      
      try {
        await supabase.functions.invoke('send-push-notification', {
          body: {
            user_ids: [solicitud.vendedor_id],
            title: '✅ Precio Autorizado',
            body: `Tu descuento para ${solicitud.producto?.nombre || 'producto'} fue aprobado a ${formatCurrency(precio)}`,
            data: { type: 'descuento_aprobado', solicitud_id: solicitud.id, precio_aprobado: String(precio) }
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
      
      try {
        await supabase.functions.invoke('send-push-notification', {
          body: {
            user_ids: [rechazarDialog.vendedor_id],
            title: '❌ Descuento Rechazado',
            body: `Tu solicitud para ${rechazarDialog.producto?.nombre || 'producto'} fue rechazada`,
            data: { type: 'descuento_rechazado', solicitud_id: rechazarDialog.id }
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
      await responderSolicitud(contraofertaDialog.id, true, precio, `Contraoferta: ${formatCurrency(precio)}`);
      removeSolicitud(contraofertaDialog.id);
      toast.success("Contraoferta enviada");
      
      try {
        await supabase.functions.invoke('send-push-notification', {
          body: {
            user_ids: [contraofertaDialog.vendedor_id],
            title: '💰 Contraoferta de Precio',
            body: `Se aprobó un precio diferente para ${contraofertaDialog.producto?.nombre || 'producto'}: ${formatCurrency(precio)}`,
            data: { type: 'descuento_contraoferta', solicitud_id: contraofertaDialog.id, precio_aprobado: String(precio) }
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
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-amber-600 animate-pulse" />
          <h2 className="text-lg font-semibold">Por Autorizar</h2>
          <Badge variant="destructive" className="animate-pulse">
            {pendingCount}
          </Badge>
        </div>
        <div className="space-y-2">
          {solicitudes.map((solicitud) => (
            <SolicitudCardFlat
              key={solicitud.id}
              solicitud={solicitud}
              onAprobar={handleAprobar}
              onRechazar={(s) => setRechazarDialog(s)}
              onContraoferta={(s) => {
                setContraofertaDialog(s);
                setContraoferta(s.precio_lista.toString());
              }}
              onVerMas={(s) => setDetalleDialog(s)}
              respondiendo={respondiendo === solicitud.id}
            />
          ))}
        </div>
      </div>

      {/* Contraoferta Dialog */}
      <Dialog open={!!contraofertaDialog} onOpenChange={(open) => !open && setContraofertaDialog(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Contraoferta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">Propón un precio diferente al solicitado</p>
            <div className="space-y-2">
              <div className="text-sm">
                <span className="text-muted-foreground">Precio lista: </span>
                <span className="font-medium">{contraofertaDialog && formatCurrency(contraofertaDialog.precio_lista)}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Vendedor solicita: </span>
                <span className="font-medium text-primary">{contraofertaDialog && formatCurrency(contraofertaDialog.precio_solicitado)}</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tu contraoferta:</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input type="number" value={contraoferta} onChange={(e) => setContraoferta(e.target.value)} className="pl-7" placeholder="0.00" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContraofertaDialog(null)}>Cancelar</Button>
            <Button onClick={handleContraoferta} disabled={respondiendo !== null}>
              {respondiendo ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar Contraoferta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rechazar Dialog */}
      <Dialog open={!!rechazarDialog} onOpenChange={(open) => !open && setRechazarDialog(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rechazar Solicitud</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">Opcionalmente, indica el motivo del rechazo</p>
            <Textarea value={notasRechazo} onChange={(e) => setNotasRechazo(e.target.value)} placeholder="Motivo del rechazo (opcional)..." rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRechazarDialog(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleRechazar} disabled={respondiendo !== null}>
              {respondiendo ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar Rechazo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ver Más Dialog - Carrito + Historial */}
      {detalleDialog && (
        <DetalleDialog
          solicitud={detalleDialog}
          open={!!detalleDialog}
          onClose={() => setDetalleDialog(null)}
        />
      )}
    </>
  );
}

// ─── Flat compact card ──────────────────────────────────────────────
interface SolicitudCardFlatProps {
  solicitud: SolicitudDescuento;
  onAprobar: (solicitud: SolicitudDescuento, precioAprobado?: number) => void;
  onRechazar: (solicitud: SolicitudDescuento) => void;
  onContraoferta: (solicitud: SolicitudDescuento) => void;
  onVerMas: (solicitud: SolicitudDescuento) => void;
  respondiendo: boolean;
}

function SolicitudCardFlat({
  solicitud,
  onAprobar,
  onRechazar,
  onContraoferta,
  onVerMas,
  respondiendo,
}: SolicitudCardFlatProps) {
  const carritoItems = parseCarritoSnapshot(solicitud.carrito_snapshot);
  const tieneCarrito = carritoItems.length > 0;

  // Cost & margin calculation
  const costo = solicitud.producto?.costo_promedio_ponderado || solicitud.producto?.ultimo_costo_compra || 0;
  const margenPct = costo > 0 ? ((solicitud.precio_solicitado - costo) / solicitud.precio_solicitado) * 100 : 0;
  const margenColor = costo === 0
    ? 'text-muted-foreground'
    : margenPct >= 10
      ? 'text-green-700'
      : margenPct >= 0
        ? 'text-amber-700'
        : 'text-red-700';

  // Suggested intermediate prices
  const precioMedio = Math.round((solicitud.precio_solicitado + solicitud.precio_lista) / 2);
  const precio5PorcientoMenos = Math.round(solicitud.precio_lista * 0.95);

  const hasSaldo = solicitud.cliente?.saldo_pendiente != null && solicitud.cliente.saldo_pendiente > 0;

  return (
    <div className="bg-background border rounded-lg p-3 space-y-2">
      {/* Row 1: Vendedor + Tiempo + Urgencia */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {solicitud.es_urgente && <Zap className="h-4 w-4 text-amber-500 shrink-0 animate-pulse" />}
          <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium truncate">{solicitud.vendedor?.full_name || "Vendedor"}</span>
          {hasSaldo && (
            <span title={`Saldo: ${formatCurrency(solicitud.cliente!.saldo_pendiente!)}`}>
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatDistanceToNow(new Date(solicitud.created_at), { addSuffix: false, locale: es })}
        </span>
      </div>

      {/* Row 2: Cliente */}
      <p className="text-xs text-muted-foreground truncate">
        {solicitud.cliente?.nombre || "Cliente"}
        {solicitud.sucursal && ` · ${solicitud.sucursal.nombre}`}
      </p>

      {/* Row 3: Producto + Cantidad */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
          <span className="text-sm font-medium line-clamp-2">{solicitud.producto?.nombre}</span>
        </div>
        <Badge variant="secondary" className="text-xs shrink-0">
          ×{solicitud.cantidad_solicitada}
        </Badge>
      </div>

      {/* Row 4: Precios + Costo/Margen */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm bg-muted/50 rounded px-2 py-1.5">
        <span className="text-muted-foreground line-through">{formatCurrency(solicitud.precio_lista)}</span>
        <span className="text-primary font-bold">→ {formatCurrency(solicitud.precio_solicitado)}</span>
        <span className="text-red-600 text-xs font-medium">
          (-{formatCurrency(solicitud.descuento_solicitado)})
        </span>
        {costo > 0 && (
          <>
            <span className="text-muted-foreground text-xs">C:{formatCurrency(costo)}</span>
            <span className={`text-xs font-semibold ${margenColor}`}>
              {margenPct >= 0 ? '+' : ''}{margenPct.toFixed(1)}%
            </span>
          </>
        )}
      </div>

      {/* Motivo (if any, compact) */}
      {solicitud.motivo && (
        <p className="text-xs text-muted-foreground italic px-1 line-clamp-1" title={solicitud.motivo}>
          💬 {solicitud.motivo}
        </p>
      )}

      {/* Row 5: Action buttons */}
      <div className="flex flex-wrap gap-1.5 pt-1">
        <Button
          size="sm"
          onClick={() => onAprobar(solicitud)}
          disabled={respondiendo}
          className="h-8 text-xs flex-1 min-w-[100px]"
        >
          {respondiendo ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <>
              <Check className="h-3.5 w-3.5 mr-1" />
              {formatCurrency(solicitud.precio_solicitado)}
            </>
          )}
        </Button>

        {precioMedio !== solicitud.precio_solicitado && precioMedio !== solicitud.precio_lista && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAprobar(solicitud, precioMedio)}
            disabled={respondiendo}
            className="h-8 text-xs"
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
            className="h-8 text-xs"
          >
            {formatCurrency(precio5PorcientoMenos)}
          </Button>
        )}

        <Button
          size="sm"
          variant="destructive"
          onClick={() => onRechazar(solicitud)}
          disabled={respondiendo}
          className="h-8 text-xs"
        >
          <X className="h-3.5 w-3.5" />
        </Button>

        <Button
          size="sm"
          variant="secondary"
          onClick={() => onContraoferta(solicitud)}
          disabled={respondiendo}
          className="h-8 text-xs"
        >
          <MessageSquare className="h-3.5 w-3.5" />
        </Button>

        {tieneCarrito && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onVerMas(solicitud)}
            className="h-8 text-xs"
          >
            <Info className="h-3.5 w-3.5 mr-1" />
            +{carritoItems.length}
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Detalle Dialog (Carrito + Historial) ───────────────────────────
interface DetalleDialogProps {
  solicitud: SolicitudDescuento;
  open: boolean;
  onClose: () => void;
}

function DetalleDialog({ solicitud, open, onClose }: DetalleDialogProps) {
  const { data: historialPrecios } = useQuery({
    queryKey: ['price-history', solicitud.producto_id, solicitud.cliente_id],
    queryFn: () => fetchPriceHistory(solicitud.producto_id, solicitud.cliente_id),
    enabled: open,
  });

  const carritoItems = parseCarritoSnapshot(solicitud.carrito_snapshot);
  const hasSaldo = solicitud.cliente?.saldo_pendiente != null && solicitud.cliente.saldo_pendiente > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">
            {solicitud.producto?.nombre} — {solicitud.cliente?.nombre}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Client balance */}
          {hasSaldo && (
            <div className="flex items-center gap-2 text-sm bg-amber-50 p-2 rounded border border-amber-200">
              <Wallet className="h-4 w-4 text-amber-600" />
              <span>Saldo pendiente: <strong>{formatCurrency(solicitud.cliente!.saldo_pendiente!)}</strong></span>
            </div>
          )}

          {/* Cart items */}
          {carritoItems.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                Productos del pedido ({carritoItems.length})
              </div>
              <div className="bg-muted/30 rounded-lg p-2 space-y-1 border">
                {carritoItems.map((item, idx) => {
                  const esEste = item.productoId === solicitud.producto_id;
                  return (
                    <div
                      key={idx}
                      className={`flex justify-between items-center text-sm py-1 px-2 rounded ${
                        esEste ? 'bg-amber-50 border border-amber-300 font-medium' : ''
                      }`}
                    >
                      <span className={`line-clamp-1 ${esEste ? 'text-amber-700' : 'text-muted-foreground'}`}>
                        {item.productoNombre} ×{item.cantidad}
                        {item.tieneDescuentoPendiente && !esEste && ' ⚠️'}
                        {esEste && ' ← este'}
                      </span>
                      <span className={esEste ? 'text-amber-700' : 'font-medium'}>
                        {formatCurrency(item.subtotal)}
                      </span>
                    </div>
                  );
                })}
                {solicitud.total_pedido_estimado && solicitud.total_pedido_estimado > 0 && (
                  <>
                    <Separator className="my-1" />
                    <div className="flex justify-between font-bold text-sm px-2">
                      <span>Total estimado:</span>
                      <span className="text-primary">{formatCurrency(solicitud.total_pedido_estimado)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Price history */}
          {historialPrecios && historialPrecios.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <History className="h-4 w-4 text-muted-foreground" />
                Historial de precios
              </div>
              <div className="bg-muted/30 rounded-lg p-2 border space-y-1">
                {historialPrecios.map((h: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-xs px-2 py-0.5">
                    <span className="text-muted-foreground">
                      {format(new Date(h.created_at), 'dd MMM yyyy', { locale: es })}
                    </span>
                    <span className="font-medium">{formatCurrency(h.precio_unitario)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {historialPrecios && historialPrecios.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">Sin historial de precios con este cliente</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
