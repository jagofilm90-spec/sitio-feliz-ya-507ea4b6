import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CreditCard,
  CheckCircle,
  XCircle,
  ExternalLink,
  User,
  Calendar,
  Loader2,
  FileText,
} from "lucide-react";

interface PagoPendiente {
  id: string;
  cliente_id: string;
  monto_total: number;
  monto_aplicado: number;
  forma_pago: string;
  referencia: string | null;
  comprobante_url: string | null;
  fecha_registro: string;
  notas: string | null;
  registrado_por: string | null;
  cliente_nombre: string;
  vendedor_nombre: string;
}

export function SecretariaPagosValidarTab() {
  const [pagos, setPagos] = useState<PagoPendiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [showRechazo, setShowRechazo] = useState<string | null>(null);

  useEffect(() => {
    fetchPagos();
  }, []);

  const fetchPagos = async () => {
    try {
      setLoading(true);

      const { data: pagosData, error } = await supabase
        .from("pagos_cliente")
        .select("id, cliente_id, monto_total, monto_aplicado, forma_pago, referencia, comprobante_url, fecha_registro, notas, registrado_por")
        .eq("status", "pendiente")
        .eq("requiere_validacion", true)
        .order("fecha_registro", { ascending: true });

      if (error) throw error;

      if (!pagosData || pagosData.length === 0) {
        setPagos([]);
        return;
      }

      // Fetch client names
      const clienteIds = [...new Set(pagosData.map(p => p.cliente_id))];
      const { data: clientes } = await supabase
        .from("clientes")
        .select("id, nombre")
        .in("id", clienteIds);
      const clienteMap = new Map((clientes || []).map(c => [c.id, c.nombre]));

      // Fetch vendedor names
      const vendedorIds = [...new Set(pagosData.map(p => p.registrado_por).filter(Boolean))];
      let vendedorMap = new Map<string, string>();
      if (vendedorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", vendedorIds as string[]);
        vendedorMap = new Map((profiles || []).map(p => [p.id, p.full_name || "Usuario"]));
      }

      const pagosFormateados: PagoPendiente[] = pagosData.map(p => ({
        ...p,
        cliente_nombre: clienteMap.get(p.cliente_id) || "Cliente",
        vendedor_nombre: p.registrado_por ? (vendedorMap.get(p.registrado_por) || "Usuario") : "Sistema",
      }));

      setPagos(pagosFormateados);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar pagos pendientes");
    } finally {
      setLoading(false);
    }
  };

  const handleValidar = async (pagoId: string) => {
    try {
      setProcesando(pagoId);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      // Update payment status
      const { error } = await supabase
        .from("pagos_cliente")
        .update({
          status: "validado",
          validado_por: user.id,
          fecha_validacion: new Date().toISOString(),
        })
        .eq("id", pagoId);

      if (error) throw error;

      // Get payment details to update invoices
      const { data: detalles } = await supabase
        .from("pagos_cliente_detalle")
        .select("factura_id, monto_aplicado")
        .eq("pago_id", pagoId);

      // For each invoice detail, check if fully paid and mark as paid
      if (detalles) {
        for (const detalle of detalles) {
          // Get total payments applied to this invoice
          const { data: allPagos } = await supabase
            .from("pagos_cliente_detalle")
            .select("monto_aplicado, pago_id")
            .eq("factura_id", detalle.factura_id);

          // Check which payments are validated
          if (allPagos) {
            const pagoIds = [...new Set(allPagos.map(p => p.pago_id))];
            const { data: pagosStatus } = await supabase
              .from("pagos_cliente")
              .select("id, status")
              .in("id", pagoIds);

            const validatedIds = new Set((pagosStatus || []).filter(p => p.status === 'validado').map(p => p.id));
            const totalValidado = allPagos
              .filter(p => validatedIds.has(p.pago_id))
              .reduce((sum, p) => sum + Number(p.monto_aplicado), 0);

            // Get invoice total
            const { data: factura } = await supabase
              .from("facturas")
              .select("total")
              .eq("id", detalle.factura_id)
              .single();

            if (factura && totalValidado >= factura.total) {
              await supabase
                .from("facturas")
                .update({ pagada: true, fecha_pago: new Date().toISOString() })
                .eq("id", detalle.factura_id);
            }
          }
        }
      }

      toast.success("Pago validado exitosamente");
      fetchPagos();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al validar el pago");
    } finally {
      setProcesando(null);
    }
  };

  const handleRechazar = async (pagoId: string) => {
    try {
      setProcesando(pagoId);

      const { error } = await supabase
        .from("pagos_cliente")
        .update({ status: "rechazado" })
        .eq("id", pagoId);

      if (error) throw error;

      toast.success("Pago rechazado");
      setShowRechazo(null);
      fetchPagos();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al rechazar el pago");
    } finally {
      setProcesando(null);
    }
  };

  const getFormaPagoLabel = (forma: string) => {
    const map: Record<string, string> = {
      transferencia: "🏦 Transferencia",
      deposito: "🏧 Depósito",
      cheque: "📝 Cheque",
      efectivo: "💵 Efectivo",
    };
    return map[forma] || forma;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
      </div>
    );
  }

  if (pagos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <p
          className="text-[22px] text-ink-400 italic leading-tight"
          style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500 }}
        >
          Sin pagos pendientes.
        </p>
        <p className="mt-2 text-xs text-ink-500">
          Cuando llegue un pago a validar, lo verás aquí.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Pagos."
        lead={`Validación y conciliación · ${pagos.length} pendientes`}
      />

      <ScrollArea className="h-[calc(100vh-240px)]">
        <div className="space-y-4">
          {pagos.map((pago) => (
            <Card key={pago.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-lg">{pago.cliente_nombre}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="outline">{getFormaPagoLabel(pago.forma_pago)}</Badge>
                      {pago.referencia && (
                        <span className="text-sm text-muted-foreground">
                          Ref: {pago.referencia}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-primary shrink-0">
                    {formatCurrency(pago.monto_total)}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(pago.fecha_registro), "d MMM yyyy HH:mm", { locale: es })}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4" />
                    {pago.vendedor_nombre}
                  </div>
                </div>

                {pago.notas && (
                  <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded mb-4">
                    {pago.notas}
                  </p>
                )}

                <div className="flex items-center gap-3">
                  {pago.comprobante_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => window.open(pago.comprobante_url!, "_blank")}
                    >
                      <FileText className="h-4 w-4" />
                      Ver comprobante
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  )}
                  
                  <div className="flex-1" />
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-destructive hover:bg-destructive/10"
                    onClick={() => setShowRechazo(pago.id)}
                    disabled={procesando === pago.id}
                  >
                    <XCircle className="h-4 w-4" />
                    Rechazar
                  </Button>
                  <Button
                    size="sm"
                    className="gap-2"
                    onClick={() => handleValidar(pago.id)}
                    disabled={procesando === pago.id}
                  >
                    {procesando === pago.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    Validar pago
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>

      {/* Reject confirmation */}
      <AlertDialog open={!!showRechazo} onOpenChange={() => setShowRechazo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Rechazar este pago?</AlertDialogTitle>
            <AlertDialogDescription>
              El pago será marcado como rechazado y no se aplicará a las facturas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => showRechazo && handleRechazar(showRechazo)}
            >
              Sí, rechazar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
