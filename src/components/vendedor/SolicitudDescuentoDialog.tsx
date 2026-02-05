import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, Send, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useSolicitudesDescuento, useSolicitudStatus, CarritoItem } from "@/hooks/useSolicitudesDescuento";
import { toast } from "sonner";

interface ProductoConDescuento {
  id: string;
  codigo: string;
  nombre: string;
  precioLista: number;
  descuentoMaximo: number;
  precioSolicitado: number;
  cantidad: number;
}

interface SolicitudDescuentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  producto: ProductoConDescuento | null;
  clienteId: string;
  clienteNombre: string;
  sucursalId?: string | null;
  onAprobado?: (productoId: string, precioAprobado: number) => void;
  onCancelar?: () => void;
  // New: cart context for admin visibility
  carritoSnapshot?: CarritoItem[];
  totalPedidoEstimado?: number;
}

export function SolicitudDescuentoDialog({
  open,
  onOpenChange,
  producto,
  clienteId,
  clienteNombre,
  sucursalId,
  onAprobado,
  onCancelar,
  carritoSnapshot,
  totalPedidoEstimado,
}: SolicitudDescuentoDialogProps) {
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [solicitudId, setSolicitudId] = useState<string | null>(null);
  const [esperandoRespuesta, setEsperandoRespuesta] = useState(false);

  const { crearSolicitud } = useSolicitudesDescuento({ enableRealtime: false });
  const { status, precioAprobado, loading: loadingStatus } = useSolicitudStatus(solicitudId);

  // Get current vendor name for push notification
  const { data: currentUserProfile } = useQuery({
    queryKey: ["current-user-profile-for-solicitud"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      return data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Watch for status changes
  if (solicitudId && status && status !== "pendiente") {
    if (status === "aprobado" && precioAprobado && producto) {
      onAprobado?.(producto.id, precioAprobado);
      handleClose();
    } else if (status === "rechazado") {
      toast.error("Descuento rechazado");
      handleClose();
    }
  }

  function handleClose() {
    setMotivo("");
    setSolicitudId(null);
    setEsperandoRespuesta(false);
    setEnviando(false);
    onOpenChange(false);
  }

  async function handleEnviarSolicitud() {
    if (!producto) return;

    setEnviando(true);
    try {
      const descuentoSolicitado = producto.precioLista - producto.precioSolicitado;
      
      const data = await crearSolicitud({
        producto_id: producto.id,
        cliente_id: clienteId,
        sucursal_id: sucursalId,
        precio_lista: producto.precioLista,
        precio_solicitado: producto.precioSolicitado,
        descuento_solicitado: descuentoSolicitado,
        descuento_maximo: producto.descuentoMaximo,
        cantidad_solicitada: producto.cantidad,
        motivo: motivo || undefined,
        producto_nombre: producto.nombre,
        vendedor_nombre: currentUserProfile?.full_name || "Vendedor",
        // Include cart context for admin
        carrito_snapshot: carritoSnapshot,
        total_pedido_estimado: totalPedidoEstimado,
        es_urgente: true,
      });

      setSolicitudId(data.id);
      setEsperandoRespuesta(true);
      toast.success("Solicitud enviada", {
        description: "Esperando respuesta del administrador...",
      });
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Error al enviar solicitud");
      setEnviando(false);
    }
  }

  if (!producto) return null;

  const descuentoSolicitado = producto.precioLista - producto.precioSolicitado;
  const descuentoExcedido = descuentoSolicitado - producto.descuentoMaximo;

  return (
    <Dialog open={open} onOpenChange={esperandoRespuesta ? undefined : onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Solicitar Autorización de Descuento
          </DialogTitle>
          <DialogDescription>
            El descuento solicitado excede el límite autorizado
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Product info */}
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <p className="font-medium">{producto.nombre}</p>
            <p className="text-sm text-muted-foreground">{producto.codigo}</p>
          </div>

          {/* Client info */}
          <div className="text-sm">
            <span className="text-muted-foreground">Cliente: </span>
            <span className="font-medium">{clienteNombre}</span>
          </div>

          {/* Price breakdown */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Precio lista:</span>
              <span className="font-medium">{formatCurrency(producto.precioLista)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Precio solicitado:</span>
              <span className="font-bold text-primary">{formatCurrency(producto.precioSolicitado)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-muted-foreground">Descuento total:</span>
              <span className="font-medium text-red-600">-{formatCurrency(descuentoSolicitado)}</span>
            </div>
          </div>

          {/* Limit info */}
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 rounded-lg space-y-1">
            <div className="flex justify-between text-sm">
              <span>Límite autorizado:</span>
              <span className="font-medium">-{formatCurrency(producto.descuentoMaximo)}</span>
            </div>
            <div className="flex justify-between text-sm text-red-600 font-medium">
              <span>Excedente a autorizar:</span>
              <span>-{formatCurrency(descuentoExcedido)}</span>
            </div>
          </div>

          {/* Cantidad */}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Cantidad solicitada:</span>
            <Badge variant="outline">{producto.cantidad} unidades</Badge>
          </div>

          {/* Order context preview */}
          {totalPedidoEstimado && (
            <div className="text-sm bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 rounded-lg">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total estimado del pedido:</span>
                <span className="font-bold text-blue-600">{formatCurrency(totalPedidoEstimado)}</span>
              </div>
              {carritoSnapshot && carritoSnapshot.length > 1 && (
                <p className="text-xs text-muted-foreground mt-1">
                  +{carritoSnapshot.length - 1} productos adicionales en el carrito
                </p>
              )}
            </div>
          )}

          {/* Motivo */}
          {!esperandoRespuesta && (
            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo (opcional)</Label>
              <Textarea
                id="motivo"
                placeholder="Ej: Cliente amenaza con irse a competencia, pedido grande, cliente frecuente..."
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={3}
              />
            </div>
          )}

          {/* Waiting state */}
          {esperandoRespuesta && (
            <div className="flex flex-col items-center justify-center py-6 space-y-3">
              <div className="relative">
                <Clock className="h-12 w-12 text-primary animate-pulse" />
              </div>
              <p className="font-medium">Esperando respuesta...</p>
              <p className="text-sm text-muted-foreground text-center">
                El administrador está revisando tu solicitud.
                Recibirás una notificación cuando responda.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {!esperandoRespuesta ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  onCancelar?.();
                  handleClose();
                }}
              >
                Cancelar
              </Button>
              <Button onClick={handleEnviarSolicitud} disabled={enviando}>
                {enviando ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Solicitar Autorización
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              onClick={() => {
                onCancelar?.();
                handleClose();
              }}
            >
              Cancelar y continuar sin descuento
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
