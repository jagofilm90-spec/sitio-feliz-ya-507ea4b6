import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle2, Trash2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { generarConfirmacionClientePDF, generarNotaPDF } from "@/lib/generarNotaPDF";
import type { DatosPedidoPrint } from "@/components/pedidos/PedidoPrintTemplate";

interface DetalleModificado {
  id: string;
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
  precio_autorizado: number | null;
  precio_original: number | null;
  autorizacion_status: string;
  subtotal: number;
  producto: {
    nombre: string;
    codigo: string;
    unidad: string;
    peso_kg: number | null;
    precio_por_kilo: boolean;
  };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedidoId: string;
  folio: string;
  onConfirmed: () => void;
}

export const ConfirmarPreciosVendedorDialog = ({ open, onOpenChange, pedidoId, folio, onConfirmed }: Props) => {
  const [detalles, setDetalles] = useState<DetalleModificado[]>([]);
  const [allDetalles, setAllDetalles] = useState<DetalleModificado[]>([]);
  const [decisions, setDecisions] = useState<Record<string, 'aceptar' | 'quitar'>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pedidoData, setPedidoData] = useState<any>(null);

  useEffect(() => {
    if (open && pedidoId) loadDetalles();
  }, [open, pedidoId]);

  const loadDetalles = async () => {
    setLoading(true);
    const { data: pedido } = await supabase
      .from("pedidos")
      .select(`
        id, folio, total, termino_credito, vendedor_id, notas,
        clientes (id, nombre, email),
        cliente_sucursales (id, nombre, direccion),
        profiles!pedidos_vendedor_id_fkey (full_name)
      `)
      .eq("id", pedidoId)
      .single();
    setPedidoData(pedido);

    const { data } = await supabase
      .from("pedidos_detalles")
      .select(`
        id, producto_id, cantidad, precio_unitario, precio_autorizado, precio_original, autorizacion_status, subtotal,
        producto:producto_id (nombre, codigo, unidad, peso_kg, precio_por_kilo)
      `)
      .eq("pedido_id", pedidoId);

    const all = (data || []) as unknown as DetalleModificado[];
    setAllDetalles(all);
    const modified = all.filter(d => d.autorizacion_status === "precio_modificado");
    setDetalles(modified);
    const init: Record<string, 'aceptar' | 'quitar'> = {};
    modified.forEach(d => { init[d.id] = 'aceptar'; });
    setDecisions(init);
    setLoading(false);
  };

  const handleConfirm = async () => {
    setSaving(true);
    try {
      // Process decisions
      for (const d of detalles) {
        if (decisions[d.id] === 'aceptar') {
          const newPrice = d.precio_autorizado!;
          const precioPorKilo = d.producto?.precio_por_kilo || false;
          const kgTotales = (d.producto?.peso_kg || 0) > 0 ? d.cantidad * (d.producto?.peso_kg || 0) : 0;
          const newSubtotal = precioPorKilo && kgTotales ? kgTotales * newPrice : d.cantidad * newPrice;
          await supabase
            .from("pedidos_detalles")
            .update({ precio_unitario: newPrice, subtotal: newSubtotal, autorizacion_status: "aprobado" })
            .eq("id", d.id);
        } else {
          await supabase.from("pedidos_detalles").delete().eq("id", d.id);
        }
      }

      // Recalculate total from remaining products
      const { data: remaining } = await supabase
        .from("pedidos_detalles")
        .select("subtotal, cantidad, producto:producto_id (peso_kg)")
        .eq("pedido_id", pedidoId);

      const newTotal = (remaining || []).reduce((s: number, d: any) => s + d.subtotal, 0);
      const newPeso = (remaining || []).reduce((s: number, d: any) => s + (d.cantidad * (d.producto?.peso_kg || 0)), 0);

      await supabase
        .from("pedidos")
        .update({ status: "pendiente" as any, total: newTotal, peso_total_kg: newPeso > 0 ? newPeso : null })
        .eq("id", pedidoId);

      // Send emails + PDFs
      try {
        const p = pedidoData;
        const clienteEmail = p?.clientes?.email;
        const clienteNombre = p?.clientes?.nombre || "Cliente";
        const vendedorNombre = p?.profiles?.full_name || "Vendedor";
        const sucNombre = p?.cliente_sucursales?.nombre || "Principal";
        const direccion = p?.cliente_sucursales?.direccion || "";

        // Reload remaining detalles for PDF
        const { data: det } = await supabase
          .from("pedidos_detalles")
          .select("cantidad, precio_unitario, subtotal, producto:producto_id (nombre, unidad, peso_kg, precio_por_kilo)")
          .eq("pedido_id", pedidoId);

        const productosForPdf = (det || []).map((d: any) => {
          const pesoKg = d.producto?.peso_kg || 0;
          const kgTotales = pesoKg > 0 ? d.cantidad * pesoKg : null;
          return {
            cantidad: d.cantidad, unidad: d.producto?.unidad || "pza",
            descripcion: d.producto?.nombre || "Producto", pesoTotal: kgTotales,
            precioUnitario: d.precio_unitario, importe: d.subtotal,
            precioPorKilo: d.producto?.precio_por_kilo || false,
          };
        });

        const datosPrint: DatosPedidoPrint = {
          pedidoId, folio, fecha: new Date().toISOString(),
          vendedor: vendedorNombre, terminoCredito: p?.termino_credito || "Contado",
          cliente: { nombre: clienteNombre }, direccionEntrega: direccion,
          sucursal: { nombre: sucNombre, direccion: direccion || undefined },
          productos: productosForPdf, subtotal: newTotal, iva: 0, ieps: 0, total: newTotal,
          pesoTotalKg: newPeso,
        };

        // Client email
        if (clienteEmail) {
          let clientePdf64: string | undefined, clientePdfName: string | undefined;
          try {
            const cpdf = await generarConfirmacionClientePDF(datosPrint);
            clientePdf64 = cpdf.base64; clientePdfName = cpdf.filename;
          } catch (e) { console.error("Error PDF cliente:", e); }

          await supabase.functions.invoke("send-order-authorized-email", {
            body: {
              clienteEmail, clienteNombre, pedidoFolio: folio, total: newTotal, ajustesPrecio: 0,
              detalles: productosForPdf.map(d => ({
                producto: d.descripcion, cantidad: d.cantidad, unidad: d.unidad,
                precioUnitario: d.precioUnitario, subtotal: d.importe, fueAjustado: false,
                kgTotales: d.pesoTotal, precioPorKilo: d.precioPorKilo,
              })),
              pdfBase64: clientePdf64, pdfFilename: clientePdfName,
            }
          });
        }

        // Internal email
        let pdfBase64: string | undefined, pdfFilename: string | undefined;
        try {
          const pdf = await generarNotaPDF(datosPrint);
          pdfBase64 = pdf.base64; pdfFilename = pdf.filename;
        } catch (e) { console.error("Error PDF interno:", e); }

        await supabase.functions.invoke("enviar-pedido-interno", {
          body: {
            folio, clienteNombre, vendedorNombre,
            terminoCredito: p?.termino_credito || "contado",
            direccionEntrega: direccion || sucNombre, sucursalNombre: sucNombre,
            total: newTotal, fecha: new Date().toISOString(), pedidoId,
            productos: productosForPdf.map(d => ({
              cantidad: d.cantidad, unidad: d.unidad, nombre: d.descripcion,
              precioUnitario: d.precioUnitario, importe: d.importe,
              kgTotales: d.pesoTotal, precioPorKilo: d.precioPorKilo,
            })),
            pdfBase64, pdfFilename,
          }
        });

        // Notify admin
        await supabase.from("notificaciones").insert({
          tipo: "pedido_autorizado",
          titulo: `✅ Vendedor confirmó precios — ${folio}`,
          descripcion: `${vendedorNombre} confirmó los cambios de precio para ${clienteNombre}`,
          pedido_id: pedidoId,
          leida: false,
        });
      } catch (e) { console.error("Error enviando emails:", e); }

      toast.success("Precios confirmados — pedido listo para surtir");
      onConfirmed();
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Error al confirmar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const quitados = Object.values(decisions).filter(d => d === 'quitar').length;
  const todosQuitados = detalles.length > 0 && quitados === detalles.length && allDetalles.filter(d => d.autorizacion_status === 'aprobado').length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🔄 Revisión de precios — {folio}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : detalles.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">No hay productos con precio modificado.</p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              El administrador modificó el precio de {detalles.length} producto{detalles.length > 1 ? "s" : ""}. Acepta el nuevo precio o quita el producto del pedido.
            </p>

            {detalles.map(d => (
              <Card key={d.id} className={decisions[d.id] === 'quitar' ? 'opacity-50' : ''}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="font-semibold text-sm">{d.producto?.nombre}</p>
                      <p className="text-xs text-muted-foreground">{d.cantidad} {d.producto?.unidad} — {d.producto?.codigo}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-3 text-sm">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Tu precio</p>
                      <p className="font-mono font-medium line-through text-muted-foreground">{formatCurrency(d.precio_original || d.precio_unitario)}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Precio autorizado</p>
                      <p className="font-mono font-bold text-amber-600">{formatCurrency(d.precio_autorizado || 0)}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant={decisions[d.id] === 'aceptar' ? 'default' : 'outline'}
                      size="sm"
                      className={`flex-1 ${decisions[d.id] === 'aceptar' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                      onClick={() => setDecisions(prev => ({ ...prev, [d.id]: 'aceptar' }))}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Aceptar precio
                    </Button>
                    <Button
                      variant={decisions[d.id] === 'quitar' ? 'destructive' : 'outline'}
                      size="sm"
                      className="flex-1"
                      onClick={() => setDecisions(prev => ({ ...prev, [d.id]: 'quitar' }))}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Quitar producto
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={saving || loading || todosQuitados}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
            Confirmar y enviar al cliente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
