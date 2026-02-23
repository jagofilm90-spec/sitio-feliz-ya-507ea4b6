import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { AlertTriangle, Loader2, Trash2, UserX, FileWarning } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { captureDeviceInfo, getPublicIP } from "@/lib/auditoria-pedidos";

type MotivoEliminacion = "cancelo_cliente" | "error_pedido";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedido: {
    id: string;
    folio: string;
    total: number;
    status: string;
    cliente_id?: string;
    cliente: {
      nombre: string;
    };
  };
  onPedidoEliminado: () => void;
}

export function EliminarPedidoDialog({ open, onOpenChange, pedido, onPedidoEliminado }: Props) {
  const [folioConfirmacion, setFolioConfirmacion] = useState("");
  const [motivo, setMotivo] = useState<MotivoEliminacion | "">("");
  const [loading, setLoading] = useState(false);

  const folioCoincide = folioConfirmacion === pedido.folio;
  const puedeEliminar = folioCoincide && motivo !== "";

  const motivoLabels: Record<MotivoEliminacion, string> = {
    cancelo_cliente: "Canceló el cliente",
    error_pedido: "Error de pedido (error del vendedor)",
  };

  const handleEliminar = async () => {
    if (!puedeEliminar) return;

    try {
      setLoading(true);

      // 1. Verificar que no tenga entregas asignadas
      const { data: entregas, error: entregasError } = await supabase
        .from("entregas")
        .select("id")
        .eq("pedido_id", pedido.id);

      if (entregasError) throw entregasError;

      if (entregas && entregas.length > 0) {
        toast.error("No se puede eliminar: el pedido tiene entregas asignadas");
        return;
      }

      // 2. Verificar que no tenga facturas asociadas
      const { data: facturas, error: facturasError } = await supabase
        .from("facturas")
        .select("id")
        .eq("pedido_id", pedido.id);

      if (facturasError) throw facturasError;

      if (facturas && facturas.length > 0) {
        toast.error("No se puede eliminar: el pedido tiene facturas asociadas");
        return;
      }

      // 3. Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Sesión no válida");
        return;
      }

      // 4. Registrar en auditoría ANTES de eliminar
      const deviceInfo = captureDeviceInfo();
      const ipAddress = await getPublicIP();

      const { error: auditError } = await supabase.from("security_audit_log").insert([{
        user_id: user.id,
        action: "pedido_eliminado",
        table_name: "pedidos",
        record_id: pedido.id,
        ip_address: ipAddress,
        details: {
          folio: pedido.folio,
          cliente_nombre: pedido.cliente.nombre,
          total: pedido.total,
          status_al_eliminar: pedido.status,
          motivo: motivoLabels[motivo as MotivoEliminacion],
          motivo_codigo: motivo,
          device: JSON.parse(JSON.stringify(deviceInfo))
        }
      }]);

      if (auditError) {
        console.error("Error en auditoría:", auditError);
      }

      // 5. Si el motivo es "canceló el cliente", notificar al cliente por email
      if (motivo === "cancelo_cliente" && pedido.cliente_id) {
        try {
          await supabase.functions.invoke("send-client-notification", {
            body: {
              clienteId: pedido.cliente_id,
              tipo: "pedido_confirmado", // reuse template but with cancellation subject
              data: {
                pedidoFolio: pedido.folio,
                total: pedido.total,
              },
            },
          });
          // We send a custom cancellation email via the gmail-api directly
          await supabase.functions.invoke("gmail-api", {
            body: {
              action: "send",
              email: "pedidos@almasa.com.mx",
              to: await getClientEmail(pedido.cliente_id),
              subject: `Pedido ${pedido.folio} cancelado - Almasa`,
              body: buildCancellationEmailHtml(pedido.folio, pedido.cliente.nombre, pedido.total),
            },
          });
          console.log("Notificación de cancelación enviada al cliente");
        } catch (notifError) {
          console.warn("No se pudo notificar al cliente:", notifError);
          // Don't block deletion if notification fails
        }
      }

      // 6. Eliminar detalles del pedido primero
      const { error: deleteDetallesError } = await supabase
        .from("pedidos_detalles")
        .delete()
        .eq("pedido_id", pedido.id);

      if (deleteDetallesError) throw deleteDetallesError;

      // 7. Eliminar solicitudes de descuento asociadas (si existen)
      await supabase
        .from("solicitudes_descuento")
        .delete()
        .eq("pedido_id", pedido.id);

      // 8. Eliminar el pedido
      const { error: deletePedidoError } = await supabase
        .from("pedidos")
        .delete()
        .eq("id", pedido.id);

      if (deletePedidoError) throw deletePedidoError;

      toast.success("Pedido eliminado correctamente");
      resetForm();
      onPedidoEliminado();
      onOpenChange(false);
    } catch (error) {
      console.error("Error al eliminar pedido:", error);
      toast.error("Error al eliminar el pedido");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFolioConfirmacion("");
    setMotivo("");
  };

  return (
    <AlertDialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <AlertDialogContent className="w-[calc(100vw-2rem)] sm:max-w-md overflow-x-hidden">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-xl">Eliminar Pedido</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base pt-2">
            Esta acción eliminará <span className="font-semibold text-foreground">permanentemente</span> el 
            pedido y toda su información. Esta acción <span className="text-destructive font-semibold">no se puede deshacer</span>.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {/* Detalles del pedido */}
          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pedido:</span>
              <span className="font-semibold">{pedido.folio}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cliente:</span>
              <span className="font-medium truncate ml-4">{pedido.cliente.nombre}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-semibold text-lg">{formatCurrency(pedido.total)}</span>
            </div>
          </div>

          {/* Motivo de eliminación */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">¿Por qué se elimina este pedido?</Label>
            <RadioGroup
              value={motivo}
              onValueChange={(v) => setMotivo(v as MotivoEliminacion)}
              className="space-y-2"
            >
              <label
                htmlFor="motivo-cancelo"
                className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                  motivo === "cancelo_cliente" ? "border-destructive bg-destructive/5" : "border-border hover:bg-muted/50"
                }`}
              >
                <RadioGroupItem value="cancelo_cliente" id="motivo-cancelo" />
                <UserX className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">Canceló el cliente</p>
                  <p className="text-xs text-muted-foreground">Se notificará al cliente por correo</p>
                </div>
              </label>
              <label
                htmlFor="motivo-error"
                className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                  motivo === "error_pedido" ? "border-destructive bg-destructive/5" : "border-border hover:bg-muted/50"
                }`}
              >
                <RadioGroupItem value="error_pedido" id="motivo-error" />
                <FileWarning className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">Error de pedido</p>
                  <p className="text-xs text-muted-foreground">Error del vendedor al crear el pedido</p>
                </div>
              </label>
            </RadioGroup>
          </div>

          {/* Confirmación de folio */}
          <div className="space-y-2">
            <Label htmlFor="folio-confirmacion" className="text-sm">
              Para confirmar, escribe el folio del pedido:
            </Label>
            <Input
              id="folio-confirmacion"
              value={folioConfirmacion}
              onChange={(e) => setFolioConfirmacion(e.target.value.toUpperCase())}
              placeholder={pedido.folio}
              className={folioCoincide ? "border-green-500 focus-visible:ring-green-500" : ""}
              autoComplete="off"
            />
            {folioConfirmacion && !folioCoincide && (
              <p className="text-xs text-destructive">El folio no coincide</p>
            )}
            {folioCoincide && (
              <p className="text-xs text-green-600">✓ Folio correcto</p>
            )}
          </div>
        </div>

        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              resetForm();
              onOpenChange(false);
            }}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleEliminar}
            disabled={!puedeEliminar || loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Eliminando...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar Pedido
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Helper: get client email for cancellation notification
async function getClientEmail(clienteId: string): Promise<string | null> {
  // Try cliente_correos first
  const { data: correos } = await supabase
    .from("cliente_correos")
    .select("email")
    .eq("cliente_id", clienteId)
    .eq("activo", true)
    .in("proposito", ["todo", "pedidos"])
    .limit(1);

  if (correos && correos.length > 0) return correos[0].email;

  // Fallback to clientes table
  const { data: cliente } = await supabase
    .from("clientes")
    .select("email")
    .eq("id", clienteId)
    .single();

  return cliente?.email || null;
}

// Build cancellation email HTML
function buildCancellationEmailHtml(folio: string, clienteNombre: string, total: number): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #dc2626, #991b1b); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 22px;">Pedido Cancelado</h1>
      </div>
      <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb;">
        <p>Estimado/a <strong>${clienteNombre}</strong>,</p>
        <p>Le informamos que su pedido ha sido cancelado.</p>
        <div style="background: #fee2e2; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #ef4444;">
          <strong>Folio:</strong> ${folio}<br>
          <strong>Total:</strong> $${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
        </div>
        <p>Si tiene alguna duda sobre esta cancelación, no dude en contactarnos.</p>
        <p>¡Gracias por su preferencia!</p>
      </div>
      <div style="background: #1f2937; color: #9ca3af; padding: 20px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px;">
        <p style="margin: 0;">Almasa - Distribuidora de Alimentos</p>
        <p style="margin: 4px 0 0 0;">Este es un correo automático, por favor no responda directamente.</p>
      </div>
    </div>
  `;
}
