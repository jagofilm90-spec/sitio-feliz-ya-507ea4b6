import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { 
  AlertTriangle, 
  Clock, 
  ShoppingCart,
  Wallet,
  X,
  ArrowRight
} from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendedorNombre: string;
  onIrCobranza: () => void;
  onIrPedidos: () => void;
}

interface Alertas {
  facturasVencidas: number;
  montoVencido: number;
  facturasPorVencer: number;
  montoPorVencer: number;
  pedidosPendientes: number;
}

export function VendedorBienvenidaDialog({ 
  open, 
  onOpenChange, 
  vendedorNombre,
  onIrCobranza,
  onIrPedidos
}: Props) {
  const [alertas, setAlertas] = useState<Alertas>({
    facturasVencidas: 0,
    montoVencido: 0,
    facturasPorVencer: 0,
    montoPorVencer: 0,
    pedidosPendientes: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchAlertas();
    }
  }, [open]);

  const fetchAlertas = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Obtener IDs de clientes del vendedor
      const { data: clientesIds } = await supabase
        .from("clientes")
        .select("id")
        .eq("vendedor_asignado", user.id)
        .eq("activo", true);

      if (!clientesIds || clientesIds.length === 0) {
        setAlertas({
          facturasVencidas: 0,
          montoVencido: 0,
          facturasPorVencer: 0,
          montoPorVencer: 0,
          pedidosPendientes: 0
        });
        setLoading(false);
        return;
      }

      const ids = clientesIds.map(c => c.id);
      const hoy = new Date();
      const en7Dias = new Date();
      en7Dias.setDate(hoy.getDate() + 7);

      // Facturas pendientes de esos clientes
      const { data: facturas } = await supabase
        .from("facturas")
        .select("total, fecha_vencimiento")
        .in("cliente_id", ids)
        .eq("pagada", false);

      let facturasVencidas = 0;
      let montoVencido = 0;
      let facturasPorVencer = 0;
      let montoPorVencer = 0;

      (facturas || []).forEach(f => {
        if (f.fecha_vencimiento) {
          const fechaVenc = new Date(f.fecha_vencimiento);
          if (fechaVenc < hoy) {
            facturasVencidas++;
            montoVencido += f.total || 0;
          } else if (fechaVenc <= en7Dias) {
            facturasPorVencer++;
            montoPorVencer += f.total || 0;
          }
        }
      });

      // Pedidos pendientes (status = pendiente)
      const { count: pedidosPendientes } = await supabase
        .from("pedidos")
        .select("id", { count: "exact", head: true })
        .eq("vendedor_id", user.id)
        .eq("status", "pendiente");

      setAlertas({
        facturasVencidas,
        montoVencido,
        facturasPorVencer,
        montoPorVencer,
        pedidosPendientes: pedidosPendientes || 0
      });
    } catch (error) {
      console.error("Error fetching alertas:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSaludo = () => {
    const hora = new Date().getHours();
    if (hora < 12) return "¡Buenos días";
    if (hora < 18) return "¡Buenas tardes";
    return "¡Buenas noches";
  };

  const tieneAlertas = alertas.facturasVencidas > 0 || alertas.facturasPorVencer > 0 || alertas.pedidosPendientes > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            👋 {getSaludo()}, {vendedorNombre}!
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {loading ? (
            <div className="text-center py-6 text-muted-foreground">
              Cargando resumen...
            </div>
          ) : (
            <>
              <p className="text-muted-foreground">
                {tieneAlertas 
                  ? "Aquí tienes un resumen de pendientes importantes:"
                  : "¡Excelente! No tienes pendientes urgentes hoy."}
              </p>

              <div className="space-y-3">
                {/* Facturas vencidas */}
                {alertas.facturasVencidas > 0 && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <div className="h-10 w-10 rounded-full bg-destructive/20 flex items-center justify-center">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-destructive">
                        {alertas.facturasVencidas} factura{alertas.facturasVencidas > 1 ? "s" : ""} vencida{alertas.facturasVencidas > 1 ? "s" : ""}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Total: {formatCurrency(alertas.montoVencido)}
                      </p>
                    </div>
                    <Badge variant="destructive">{alertas.facturasVencidas}</Badge>
                  </div>
                )}

                {/* Facturas por vencer */}
                {alertas.facturasPorVencer > 0 && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-amber-700 dark:text-amber-400">
                        {alertas.facturasPorVencer} factura{alertas.facturasPorVencer > 1 ? "s" : ""} por vencer
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Próximos 7 días: {formatCurrency(alertas.montoPorVencer)}
                      </p>
                    </div>
                    <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                      {alertas.facturasPorVencer}
                    </Badge>
                  </div>
                )}

                {/* Pedidos pendientes */}
                {alertas.pedidosPendientes > 0 && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <ShoppingCart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-blue-700 dark:text-blue-400">
                        {alertas.pedidosPendientes} pedido{alertas.pedidosPendientes > 1 ? "s" : ""} pendiente{alertas.pedidosPendientes > 1 ? "s" : ""}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        En proceso de entrega
                      </p>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                      {alertas.pedidosPendientes}
                    </Badge>
                  </div>
                )}

                {/* Sin alertas */}
                {!tieneAlertas && (
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Wallet className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-green-700 dark:text-green-400">
                        Todo al corriente
                      </p>
                      <p className="text-sm text-muted-foreground">
                        No hay facturas vencidas ni pedidos pendientes
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-2">
          {alertas.facturasVencidas > 0 || alertas.facturasPorVencer > 0 ? (
            <Button 
              onClick={() => { onIrCobranza(); onOpenChange(false); }}
              className="w-full"
            >
              <Wallet className="h-4 w-4 mr-2" />
              Ir a Cobranza
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : null}
          
          {alertas.pedidosPendientes > 0 ? (
            <Button 
              variant="outline"
              onClick={() => { onIrPedidos(); onOpenChange(false); }}
              className="w-full"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Ver Pedidos
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : null}

          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            Continuar al panel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}