import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedido: {
    id: string;
    folio: string;
    total: number;
    cliente: { nombre: string };
  };
  onPedidoCancelado: () => void;
}

export function CancelarPedidoDialog({ open, onOpenChange, pedido, onPedidoCancelado }: Props) {
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCancelar = async () => {
    if (!motivo.trim()) {
      toast.error("Indica el motivo de cancelación");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      // Update order status
      const { error } = await supabase
        .from("pedidos")
        .update({
          status: "cancelado",
          notas: `[CANCELADO POR VENDEDOR] ${motivo}`
        })
        .eq("id", pedido.id);

      if (error) throw error;

      // Get vendedor name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      
      const vendedorNombre = profile?.full_name || "Vendedor";

      // Create internal notification for secretaries
      await supabase.from("notificaciones").insert({
        tipo: "pedido_cancelado",
        titulo: `Pedido ${pedido.folio} cancelado`,
        descripcion: `${vendedorNombre} canceló el pedido de ${pedido.cliente.nombre}. Motivo: ${motivo}`,
        pedido_id: pedido.id,
        leida: false,
      });

      // Send push notification to secretaries
      try {
        await supabase.functions.invoke('send-push-notification', {
          body: {
            roles: ['secretaria'],
            title: '❌ Pedido Cancelado',
            body: `${vendedorNombre} canceló ${pedido.folio} - ${pedido.cliente.nombre}`,
            data: {
              type: 'pedido_cancelado',
              pedido_id: pedido.id,
              folio: pedido.folio,
            }
          }
        });
      } catch (pushError) {
        console.error("Error sending push:", pushError);
      }

      // Notificar al cliente por email si tiene email
      try {
        const { data: pedidoData } = await supabase
          .from("pedidos")
          .select("clientes(email, nombre)")
          .eq("id", pedido.id)
          .single();

        const clienteEmail = (pedidoData?.clientes as any)?.email;
        const clienteNombre = (pedidoData?.clientes as any)?.nombre || pedido.cliente.nombre;

        if (clienteEmail) {
          await supabase.functions.invoke("gmail-api", {
            body: {
              action: "send",
              email: "pedidos@almasa.com.mx",
              to: clienteEmail,
              subject: `Pedido ${pedido.folio} cancelado`,
              body: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #dc2626;">Pedido Cancelado</h2>
                  <p>Estimado(a) ${clienteNombre},</p>
                  <p>Le informamos que el pedido <strong>${pedido.folio}</strong> ha sido cancelado.</p>
                  <p><strong>Motivo:</strong> ${motivo}</p>
                  <p>Si tiene alguna duda, no dude en contactarnos.</p>
                  <p>Atentamente,<br><strong>ALMASA — Abarrotes la Manita</strong></p>
                </div>
              `
            }
          });
        }
      } catch (emailError) {
        console.error("Error sending cancellation email:", emailError);
      }

      toast.success("Pedido cancelado correctamente");
      setMotivo("");
      onPedidoCancelado();
      onOpenChange(false);
    } catch (error) {
      console.error("Error canceling order:", error);
      toast.error("Error al cancelar el pedido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Cancelar Pedido
          </DialogTitle>
          <DialogDescription>
            Esta acción no se puede deshacer. El pedido {pedido.folio} será cancelado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="font-medium">{pedido.folio}</p>
            <p className="text-sm text-muted-foreground">{pedido.cliente.nombre}</p>
            <p className="text-lg font-semibold mt-1">{formatCurrency(pedido.total)}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo de cancelación *</Label>
            <Textarea
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: Cliente ya no requiere el producto, error en el pedido..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Volver
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleCancelar}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Cancelando...
              </>
            ) : (
              "Confirmar cancelación"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
