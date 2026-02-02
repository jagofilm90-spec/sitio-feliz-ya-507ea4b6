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
import { toast } from "sonner";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { captureDeviceInfo, getPublicIP } from "@/lib/auditoria-pedidos";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedido: {
    id: string;
    folio: string;
    total: number;
    status: string;
    cliente: {
      nombre: string;
    };
  };
  onPedidoEliminado: () => void;
}

export function EliminarPedidoDialog({ open, onOpenChange, pedido, onPedidoEliminado }: Props) {
  const [folioConfirmacion, setFolioConfirmacion] = useState("");
  const [loading, setLoading] = useState(false);

  const folioCoincide = folioConfirmacion === pedido.folio;

  const handleEliminar = async () => {
    if (!folioCoincide) {
      toast.error("El folio no coincide");
      return;
    }

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
          motivo: "Eliminado por vendedor - error en creación",
          device: JSON.parse(JSON.stringify(deviceInfo))
        }
      }]);

      if (auditError) {
        console.error("Error en auditoría:", auditError);
      }

      // 5. Eliminar detalles del pedido primero
      const { error: deleteDetallesError } = await supabase
        .from("pedidos_detalles")
        .delete()
        .eq("pedido_id", pedido.id);

      if (deleteDetallesError) throw deleteDetallesError;

      // 6. Eliminar solicitudes de descuento asociadas (si existen)
      await supabase
        .from("solicitudes_descuento")
        .delete()
        .eq("pedido_id", pedido.id);

      // 7. Eliminar el pedido
      const { error: deletePedidoError } = await supabase
        .from("pedidos")
        .delete()
        .eq("id", pedido.id);

      if (deletePedidoError) throw deletePedidoError;

      toast.success("Pedido eliminado correctamente");
      setFolioConfirmacion("");
      onPedidoEliminado();
      onOpenChange(false);
    } catch (error) {
      console.error("Error al eliminar pedido:", error);
      toast.error("Error al eliminar el pedido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
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
              setFolioConfirmacion("");
              onOpenChange(false);
            }}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleEliminar}
            disabled={!folioCoincide || loading}
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
