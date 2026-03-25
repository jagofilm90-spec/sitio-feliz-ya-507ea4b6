import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

interface DetalleRechazado {
  id: string;
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  producto: {
    nombre: string;
    codigo: string;
    unidad: string;
    peso_kg: number | null;
    precio_por_kilo: boolean;
    precio_venta: number;
    descuento_maximo: number | null;
  };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedidoId: string;
  folio: string;
  onSaved: () => void;
}

export const EditarPedidoRechazadoDialog = ({ open, onOpenChange, pedidoId, folio, onSaved }: Props) => {
  const [detalles, setDetalles] = useState<DetalleRechazado[]>([]);
  const [editedPrices, setEditedPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notas, setNotas] = useState("");

  useEffect(() => {
    if (open && pedidoId) loadDetalles();
  }, [open, pedidoId]);

  const loadDetalles = async () => {
    setLoading(true);
    const { data: pedido } = await supabase
      .from("pedidos")
      .select("notas")
      .eq("id", pedidoId)
      .single();
    setNotas(pedido?.notas || "");

    const { data } = await supabase
      .from("pedidos_detalles")
      .select(`
        id, producto_id, cantidad, precio_unitario, subtotal,
        producto:producto_id (nombre, codigo, unidad, peso_kg, precio_por_kilo, precio_venta, descuento_maximo)
      `)
      .eq("pedido_id", pedidoId);

    const all = (data || []) as unknown as DetalleRechazado[];
    setDetalles(all);
    const prices: Record<string, number> = {};
    all.forEach(d => { prices[d.id] = d.precio_unitario; });
    setEditedPrices(prices);
    setLoading(false);
  };

  const getPrecioMinimo = (d: DetalleRechazado) => {
    const lista = d.producto?.precio_venta || 0;
    const descMax = d.producto?.descuento_maximo || 0;
    return lista - descMax;
  };

  const isBelow = (d: DetalleRechazado) => {
    const price = editedPrices[d.id] ?? d.precio_unitario;
    return price < getPrecioMinimo(d);
  };

  const handleSetPrecioMaxDescuento = (d: DetalleRechazado) => {
    setEditedPrices(prev => ({ ...prev, [d.id]: getPrecioMinimo(d) }));
  };

  const anyBelowMinimum = detalles.some(d => isBelow(d));

  const calculateTotal = () => {
    return detalles.reduce((sum, d) => {
      const price = editedPrices[d.id] ?? d.precio_unitario;
      const precioPorKilo = d.producto?.precio_por_kilo || false;
      const kgTotales = (d.producto?.peso_kg || 0) > 0 ? d.cantidad * (d.producto?.peso_kg || 0) : 0;
      return sum + (precioPorKilo && kgTotales ? kgTotales * price : d.cantidad * price);
    }, 0);
  };

  const handleConfirm = async () => {
    setSaving(true);
    try {
      // Update prices on each detalle
      for (const d of detalles) {
        const newPrice = editedPrices[d.id];
        if (newPrice !== undefined && newPrice !== d.precio_unitario) {
          const precioPorKilo = d.producto?.precio_por_kilo || false;
          const kgTotales = (d.producto?.peso_kg || 0) > 0 ? d.cantidad * (d.producto?.peso_kg || 0) : 0;
          const newSubtotal = precioPorKilo && kgTotales ? kgTotales * newPrice : d.cantidad * newPrice;
          await supabase.from("pedidos_detalles").update({ precio_unitario: newPrice, subtotal: newSubtotal }).eq("id", d.id);
        }
      }

      // Determine new status
      const newStatus = anyBelowMinimum ? "por_autorizar" : "pendiente";
      const newTotal = calculateTotal();

      await supabase.from("pedidos").update({
        status: newStatus as any,
        total: newTotal,
        notas: notas.replace(/\[RECHAZADO\].*?\n?/, "").trim() || null,
      }).eq("id", pedidoId);

      // If going directly to pendiente, send emails
      if (newStatus === "pendiente") {
        // Trigger the same email flow as authorization
        // For now, notify admin that vendor corrected prices
        try {
          await supabase.from("notificaciones").insert({
            tipo: "pedido_autorizado",
            titulo: `✅ Vendedor corrigió precios — ${folio}`,
            descripcion: `Precios dentro del rango. Pedido listo para surtir.`,
            pedido_id: pedidoId,
            leida: false,
          });
        } catch (e) { console.error("Error notificación:", e); }

        toast.success("Precios corregidos — pedido listo para surtir");
      } else {
        toast.success("Pedido reenviado para autorización");
      }

      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Extract rejection reason from notas
  const rejectionReason = notas.match(/\[RECHAZADO\]\s*(.*?)(\n|$)/)?.[1] || "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar pedido rechazado — {folio}</DialogTitle>
        </DialogHeader>

        {rejectionReason && (
          <div className="border border-destructive/30 bg-destructive/5 rounded-lg p-3 text-sm">
            <p className="font-semibold text-destructive mb-1">Motivo del rechazo:</p>
            <p className="text-muted-foreground">{rejectionReason}</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Ajusta los precios de los productos marcados con ⚠️ para que estén dentro del rango permitido, o usa "Precio máx. descuento" para poner automáticamente el precio mínimo.
            </p>

            {detalles.map(d => {
              const precioMinimo = getPrecioMinimo(d);
              const below = isBelow(d);
              const currentPrice = editedPrices[d.id] ?? d.precio_unitario;

              return (
                <Card key={d.id} className={below ? "border-destructive/50" : "border-green-500/30"}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          {below && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
                          <p className="font-semibold text-sm">{d.producto?.nombre}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">{d.cantidad} {d.producto?.unidad} — {d.producto?.codigo}</p>
                      </div>
                      {below && (
                        <Badge variant="destructive" className="text-xs shrink-0">Bajo mínimo</Badge>
                      )}
                      {!below && (
                        <Badge className="text-xs bg-green-600 shrink-0">OK</Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mb-2 text-xs text-muted-foreground">
                      <span>Lista: {formatCurrency(d.producto?.precio_venta || 0)}</span>
                      <span>Mínimo: {formatCurrency(precioMinimo)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={currentPrice}
                        onChange={(e) => setEditedPrices(prev => ({ ...prev, [d.id]: parseFloat(e.target.value) || 0 }))}
                        className="w-32 text-right font-mono"
                      />
                      {below && (
                        <Button variant="outline" size="sm" onClick={() => handleSetPrecioMaxDescuento(d)}>
                          Precio máx. descuento
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-muted-foreground text-sm">Nuevo total:</span>
              <span className="text-xl font-bold">{formatCurrency(calculateTotal())}</span>
            </div>
          </div>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={saving || loading}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
            {anyBelowMinimum ? "Reenviar para autorización" : "Confirmar pedido"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
