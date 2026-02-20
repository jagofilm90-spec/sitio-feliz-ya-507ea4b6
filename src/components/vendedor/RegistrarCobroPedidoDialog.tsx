import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Loader2, DollarSign, CreditCard, Building2, Banknote, Calendar, FileText, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PedidoParaCobro {
  id: string;
  folio: string;
  total: number;
  saldo_pendiente: number | null;
  fecha_pedido: string;
  termino_credito: string;
  fecha_entrega_real: string | null;
  cliente: {
    id: string;
    nombre: string;
  };
}

interface RegistrarCobroPedidoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedidoInicial?: PedidoParaCobro | null;
  onCobrosActualizados: () => void;
}

const FORMAS_PAGO = [
  { value: "efectivo", label: "Efectivo", icon: Banknote },
  { value: "deposito", label: "Depósito bancario", icon: Building2 },
  { value: "transferencia", label: "Transferencia", icon: CreditCard },
  { value: "cheque", label: "Cheque", icon: FileText },
];

export function RegistrarCobroPedidoDialog({
  open,
  onOpenChange,
  pedidoInicial,
  onCobrosActualizados,
}: RegistrarCobroPedidoDialogProps) {
  const [pedidos, setPedidos] = useState<PedidoParaCobro[]>([]);
  const [selectedPedido, setSelectedPedido] = useState<PedidoParaCobro | null>(pedidoInicial || null);
  const [loadingPedidos, setLoadingPedidos] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [monto, setMonto] = useState("");
  const [formaPago, setFormaPago] = useState("efectivo");
  const [referencia, setReferencia] = useState("");
  const [fechaCheque, setFechaCheque] = useState("");
  const [notas, setNotas] = useState("");

  useEffect(() => {
    if (open) {
      if (pedidoInicial) {
        setSelectedPedido(pedidoInicial);
      } else {
        fetchPedidosPendientes();
      }
      // Reset form
      setMonto("");
      setFormaPago("efectivo");
      setReferencia("");
      setFechaCheque("");
      setNotas("");
    }
  }, [open, pedidoInicial]);

  const fetchPedidosPendientes = async () => {
    try {
      setLoadingPedidos(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: clientesData } = await supabase
        .from("clientes")
        .select("id, nombre")
        .eq("vendedor_asignado", user.id);

      if (!clientesData || clientesData.length === 0) {
        setPedidos([]);
        return;
      }

      const clienteIds = clientesData.map(c => c.id);
      const clientesMap = new Map(clientesData.map(c => [c.id, c]));

      const { data: pedidosData, error } = await supabase
        .from("pedidos")
        .select("id, folio, total, saldo_pendiente, fecha_pedido, termino_credito, fecha_entrega_real, cliente_id")
        .eq("status", "entregado")
        .eq("pagado", false)
        .in("cliente_id", clienteIds)
        .order("fecha_entrega_real", { ascending: true });

      if (error) throw error;

      const pedidosConCliente: PedidoParaCobro[] = (pedidosData || []).map(p => ({
        id: p.id,
        folio: p.folio,
        total: p.total,
        saldo_pendiente: (p as any).saldo_pendiente,
        fecha_pedido: p.fecha_pedido,
        termino_credito: p.termino_credito,
        fecha_entrega_real: (p as any).fecha_entrega_real,
        cliente: clientesMap.get(p.cliente_id) || { id: p.cliente_id, nombre: "Sin cliente" },
      }));

      setPedidos(pedidosConCliente);
    } catch (error) {
      console.error("Error fetching pedidos:", error);
      toast.error("Error al cargar pedidos pendientes");
    } finally {
      setLoadingPedidos(false);
    }
  };

  const saldoActual = selectedPedido
    ? (selectedPedido.saldo_pendiente ?? selectedPedido.total)
    : 0;

  const montoNum = parseFloat(monto) || 0;
  const esLiquidacion = montoNum >= saldoActual - 0.01;

  const handleSubmit = async () => {
    if (!selectedPedido) {
      toast.error("Selecciona un pedido");
      return;
    }
    if (!monto || montoNum <= 0) {
      toast.error("Ingresa un monto válido");
      return;
    }
    if (montoNum > saldoActual + 0.01) {
      toast.error(`El monto no puede superar el saldo de ${formatCurrency(saldoActual)}`);
      return;
    }
    if (formaPago === "cheque" && !fechaCheque) {
      toast.error("Ingresa la fecha de depósito del cheque");
      return;
    }

    try {
      setSubmitting(true);

      const { error } = await supabase.rpc("registrar_cobro_pedido", {
        p_pedido_id: selectedPedido.id,
        p_cliente_id: selectedPedido.cliente.id,
        p_monto: montoNum,
        p_forma_pago: formaPago,
        p_referencia: referencia || null,
        p_fecha_cheque: fechaCheque || null,
        p_notas: notas || null,
      });

      if (error) throw error;

      toast.success(
        esLiquidacion
          ? `¡Pedido ${selectedPedido.folio} liquidado! ✓`
          : `Cobro de ${formatCurrency(montoNum)} registrado en ${selectedPedido.folio}`
      );

      onCobrosActualizados();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error registrando cobro:", error);
      toast.error(error.message || "Error al registrar el cobro");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Registrar Cobro
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto pr-1">
          <div className="space-y-5 pb-2">
            {/* Selección de pedido */}
            {!pedidoInicial && (
              <div className="space-y-2">
                <Label>Pedido a cobrar</Label>
                {loadingPedidos ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : pedidos.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-3 bg-muted/30 rounded-lg">
                    No hay pedidos entregados pendientes de cobro
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2">
                    {pedidos.map(p => {
                      const saldo = p.saldo_pendiente ?? p.total;
                      const isSelected = selectedPedido?.id === p.id;
                      return (
                        <button
                          key={p.id}
                          onClick={() => setSelectedPedido(p)}
                          className={`w-full text-left p-3 rounded-lg border transition-colors flex items-center justify-between gap-2 ${
                            isSelected
                              ? "bg-primary/10 border-primary"
                              : "hover:bg-muted/50 border-transparent"
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-sm">{p.folio}</p>
                            <p className="text-xs text-muted-foreground truncate">{p.cliente.nombre}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-bold text-sm">{formatCurrency(saldo)}</p>
                            <p className="text-xs text-muted-foreground">saldo</p>
                          </div>
                          {isSelected && <ChevronRight className="h-4 w-4 text-primary shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Info del pedido seleccionado */}
            {selectedPedido && (
              <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{selectedPedido.folio}</p>
                    <p className="text-sm text-muted-foreground">{selectedPedido.cliente.nombre}</p>
                  </div>
                  <Badge variant="outline" className="text-sm">
                    {format(new Date(selectedPedido.fecha_pedido), "d MMM yyyy", { locale: es })}
                  </Badge>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Total nota</p>
                    <p className="font-medium">{formatCurrency(selectedPedido.total)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Saldo pendiente</p>
                    <p className="font-bold text-lg text-primary">{formatCurrency(saldoActual)}</p>
                  </div>
                </div>
              </div>
            )}

            {selectedPedido && (
              <>
                {/* Monto */}
                <div className="space-y-2">
                  <Label htmlFor="monto">Monto a cobrar *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                    <Input
                      id="monto"
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={saldoActual}
                      value={monto}
                      onChange={e => setMonto(e.target.value)}
                      className="pl-8 text-lg h-12"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setMonto(String(saldoActual))}
                    >
                      Liquidar todo ({formatCurrency(saldoActual)})
                    </Button>
                    {saldoActual >= 2 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setMonto(String(Math.round(saldoActual / 2 * 100) / 100))}
                      >
                        50%
                      </Button>
                    )}
                  </div>
                  {montoNum > 0 && (
                    <p className={`text-sm ${esLiquidacion ? "text-green-600 font-medium" : "text-muted-foreground"}`}>
                      {esLiquidacion
                        ? "✓ Esta cantidad liquida el pedido completamente"
                        : `Quedará un saldo de ${formatCurrency(saldoActual - montoNum)}`}
                    </p>
                  )}
                </div>

                {/* Forma de pago */}
                <div className="space-y-2">
                  <Label>Forma de pago *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {FORMAS_PAGO.map(fp => {
                      const Icon = fp.icon;
                      return (
                        <button
                          key={fp.value}
                          type="button"
                          onClick={() => setFormaPago(fp.value)}
                          className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-colors ${
                            formaPago === fp.value
                              ? "bg-primary text-primary-foreground border-primary"
                              : "hover:bg-muted/50"
                          }`}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          {fp.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Referencia */}
                {(formaPago === "deposito" || formaPago === "transferencia") && (
                  <div className="space-y-2">
                    <Label htmlFor="referencia">Referencia / Número de operación</Label>
                    <Input
                      id="referencia"
                      value={referencia}
                      onChange={e => setReferencia(e.target.value)}
                      placeholder="Ej: 123456789"
                    />
                  </div>
                )}

                {/* Fecha cheque */}
                {formaPago === "cheque" && (
                  <div className="space-y-2">
                    <Label htmlFor="fechaCheque" className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Fecha de depósito del cheque *
                    </Label>
                    <Input
                      id="fechaCheque"
                      type="date"
                      value={fechaCheque}
                      onChange={e => setFechaCheque(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                )}

                {/* Notas */}
                <div className="space-y-2">
                  <Label htmlFor="notas">Notas (opcional)</Label>
                  <Textarea
                    id="notas"
                    value={notas}
                    onChange={e => setNotas(e.target.value)}
                    placeholder="Ej: Pago parcial acordado, cliente solicitó recibo..."
                    rows={2}
                  />
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t pt-4 flex gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1"
            disabled={!selectedPedido || !monto || montoNum <= 0 || submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Registrando...
              </>
            ) : (
              <>
                <DollarSign className="h-4 w-4 mr-2" />
                {esLiquidacion ? "Liquidar pedido" : `Registrar ${formatCurrency(montoNum)}`}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
