import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useSolicitudesDescuento, SolicitudDescuento } from "@/hooks/useSolicitudesDescuento";
import { toast } from "sonner";

export function SolicitudesDescuentoPanel() {
  const { solicitudes, loading, pendingCount, responderSolicitud } = useSolicitudesDescuento({
    onlyPending: true,
    enableRealtime: true,
  });

  const [respondiendo, setRespondiendo] = useState<string | null>(null);
  const [contraofertaDialog, setContraofertaDialog] = useState<SolicitudDescuento | null>(null);
  const [contraoferta, setContraoferta] = useState("");
  const [notasRechazo, setNotasRechazo] = useState("");
  const [rechazarDialog, setRechazarDialog] = useState<SolicitudDescuento | null>(null);

  const handleAprobar = async (solicitud: SolicitudDescuento) => {
    setRespondiendo(solicitud.id);
    try {
      await responderSolicitud(solicitud.id, true, solicitud.precio_solicitado);
      toast.success("Descuento aprobado");
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
      toast.success("Solicitud rechazada");
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
      toast.success("Contraoferta enviada");
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
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
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
            <Bell className="h-5 w-5 text-amber-600" />
            Solicitudes de Descuento
            <Badge variant="destructive" className="ml-2">
              {pendingCount} pendientes
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-4">
              {solicitudes.map((solicitud) => (
                <div
                  key={solicitud.id}
                  className="bg-background border rounded-lg p-4 space-y-3"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {solicitud.vendedor?.full_name || "Vendedor"}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(solicitud.created_at), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </span>
                  </div>

                  {/* Client & Product */}
                  <div className="grid gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4 text-muted-foreground" />
                      <span>{solicitud.cliente?.nombre || "Cliente"}</span>
                      {solicitud.sucursal && (
                        <Badge variant="outline" className="text-xs">
                          {solicitud.sucursal.nombre}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {solicitud.producto?.nombre || "Producto"}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {solicitud.cantidad_solicitada} uds
                      </Badge>
                    </div>
                  </div>

                  {/* Price breakdown */}
                  <div className="bg-muted/50 rounded p-3 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Precio lista:</span>
                      <span>{formatCurrency(solicitud.precio_lista)}</span>
                    </div>
                    <div className="flex justify-between text-primary font-medium">
                      <span>Precio solicitado:</span>
                      <span>{formatCurrency(solicitud.precio_solicitado)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-1 mt-1">
                      <span className="text-muted-foreground">Descuento:</span>
                      <span className="text-red-600 font-medium">
                        -{formatCurrency(solicitud.descuento_solicitado)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Máximo autorizado:</span>
                      <span>-{formatCurrency(solicitud.descuento_maximo)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-red-600">
                      <span>Excedente:</span>
                      <span>
                        -{formatCurrency(solicitud.descuento_solicitado - solicitud.descuento_maximo)}
                      </span>
                    </div>
                  </div>

                  {/* Motivo */}
                  {solicitud.motivo && (
                    <div className="text-sm bg-blue-50 dark:bg-blue-950/30 p-2 rounded">
                      <span className="text-muted-foreground">Motivo: </span>
                      {solicitud.motivo}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => handleAprobar(solicitud)}
                      disabled={respondiendo === solicitud.id}
                      className="flex-1"
                    >
                      {respondiendo === solicitud.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          Aprobar
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setRechazarDialog(solicitud)}
                      disabled={respondiendo === solicitud.id}
                      className="flex-1"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Rechazar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setContraofertaDialog(solicitud);
                        setContraoferta(solicitud.precio_lista.toString());
                      }}
                      disabled={respondiendo === solicitud.id}
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
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
