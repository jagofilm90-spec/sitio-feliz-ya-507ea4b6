import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { recalcularTotalesPedido } from "@/lib/recalcularTotalesPedido";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Package,
  AlertTriangle,
  Send,
  Loader2,
  Undo2,
  CheckCircle2,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { PedidoPrintTemplate, DatosPedidoPrint } from "@/components/pedidos/PedidoPrintTemplate";
import { getDisplayName } from "@/lib/productUtils";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { createRoot } from "react-dom/client";

interface Props {
  open: boolean;
  onClose: () => void;
  pedidoId: string;
  pedidoFolio: string;
  clienteNombre: string;
  entregaId: string;
}

interface DevolucionLinea {
  pedidoDetalleId: string;
  cantidadDevuelta: number;
  motivo: string;
}

const MOTIVOS_DEVOLUCION = [
  "Producto rechazado por cliente",
  "Producto dañado",
  "Cantidad incorrecta",
  "No solicitado",
  "Otro",
];

export function ConciliacionDetalleDialog({
  open,
  onClose,
  pedidoId,
  pedidoFolio,
  clienteNombre,
  entregaId,
}: Props) {
  const queryClient = useQueryClient();
  const [devoluciones, setDevoluciones] = useState<Record<string, DevolucionLinea>>({});
  const [enviando, setEnviando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [devolucionesGuardadas, setDevolucionesGuardadas] = useState(false);

  // Query pedido details
  const { data: detalles = [], isLoading } = useQuery({
    queryKey: ["conciliacion-detalles", pedidoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedidos_detalles")
        .select(`
          id, cantidad, precio_unitario, subtotal, es_cortesia, notas_ajuste,
          productos:productos!pedidos_detalles_producto_id_fkey(
            id, nombre, codigo, peso_kg, precio_por_kilo, unidad_medida
          )
        `)
        .eq("pedido_id", pedidoId);
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Query existing devoluciones for this entrega
  const { data: devolucionesExistentes = [] } = useQuery({
    queryKey: ["devoluciones-existentes", entregaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("devoluciones")
        .select("id, pedido_detalle_id, cantidad_devuelta, motivo")
        .eq("entrega_id", entregaId);
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const tieneDevolucionesRegistradas = devolucionesExistentes.length > 0;

  const updateDevolucion = (detalleId: string, field: keyof DevolucionLinea, value: any) => {
    setDevoluciones((prev) => ({
      ...prev,
      [detalleId]: {
        ...prev[detalleId],
        pedidoDetalleId: detalleId,
        cantidadDevuelta: prev[detalleId]?.cantidadDevuelta || 0,
        motivo: prev[detalleId]?.motivo || MOTIVOS_DEVOLUCION[0],
        [field]: value,
      },
    }));
  };

  const devolucionesActivas = Object.values(devoluciones).filter(
    (d) => d.cantidadDevuelta > 0
  );

  const guardarDevoluciones = async () => {
    if (devolucionesActivas.length === 0) {
      toast.error("No hay devoluciones para registrar");
      return;
    }

    setGuardando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      // Insert devoluciones
      const inserts = devolucionesActivas.map((d) => ({
        entrega_id: entregaId,
        pedido_detalle_id: d.pedidoDetalleId,
        cantidad_devuelta: d.cantidadDevuelta,
        motivo: d.motivo,
        registrado_por: user.id,
        reingresado_a_inventario: false,
      }));

      const { error: devError } = await supabase.from("devoluciones").insert(inserts);
      if (devError) throw devError;

      // Update each pedido_detalle with the adjusted quantity
      for (const dev of devolucionesActivas) {
        const detalle = detalles.find(d => d.id === dev.pedidoDetalleId);
        if (!detalle) continue;
        const cantidadReal = detalle.cantidad - dev.cantidadDevuelta;
        const producto = detalle.productos as any;
        const newSubtotal = producto?.precio_por_kilo
          ? cantidadReal * (producto.peso_kg || 0) * detalle.precio_unitario
          : cantidadReal * detalle.precio_unitario;
        await supabase.from("pedidos_detalles").update({
          cantidad: cantidadReal,
          subtotal: Math.round(newSubtotal * 100) / 100,
          notas_ajuste: `Devolución: -${dev.cantidadDevuelta} (${dev.motivo})`,
        }).eq("id", dev.pedidoDetalleId);
      }

      // Recalculate totals with proper per-product tax breakdown
      const result = await recalcularTotalesPedido(pedidoId, {
        tipoCambio: "conciliacion_secretaria",
        cambiosJson: { devoluciones: devolucionesActivas.map(d => ({ detalleId: d.pedidoDetalleId, cantidadDevuelta: d.cantidadDevuelta, motivo: d.motivo })) },
        usuarioId: user.id,
      });

      queryClient.invalidateQueries({ queryKey: ["conciliacion-detalles", pedidoId] });
      queryClient.invalidateQueries({ queryKey: ["devoluciones-existentes", entregaId] });
      queryClient.invalidateQueries({ queryKey: ["secretaria-rutas-completadas"] });

      setDevolucionesGuardadas(true);
      toast.success("Devoluciones registradas y pedido actualizado");
    } catch (err: any) {
      console.error("Error guardando devoluciones:", err);
      toast.error("Error al guardar devoluciones");
    } finally {
      setGuardando(false);
    }
  };

  const enviarCorreoCorregido = async () => {
    setEnviando(true);
    try {
      // Fetch updated pedido data
      const { data: pedido, error: pedErr } = await supabase
        .from("pedidos")
        .select(`
          id, folio, total, subtotal, impuestos, fecha_pedido, notas,
          cliente:clientes!pedidos_cliente_id_fkey(id, nombre, rfc, razon_social, direccion, telefono),
          vendedor:profiles!pedidos_vendedor_id_fkey(full_name),
          sucursal:cliente_sucursales!pedidos_sucursal_id_fkey(nombre, direccion)
        `)
        .eq("id", pedidoId)
        .single();
      if (pedErr || !pedido) throw pedErr || new Error("Pedido no encontrado");

      // Fetch detalles with devoluciones
      const { data: detallesActualizados } = await supabase
        .from("pedidos_detalles")
        .select(`
          id, cantidad, precio_unitario, subtotal, es_cortesia,
          productos:productos!pedidos_detalles_producto_id_fkey(
            id, nombre, codigo, peso_kg, precio_por_kilo
          )
        `)
        .eq("pedido_id", pedidoId);

      const { data: todasDevoluciones } = await supabase
        .from("devoluciones")
        .select("pedido_detalle_id, cantidad_devuelta")
        .eq("entrega_id", entregaId);

      const devMap = new Map<string, number>();
      (todasDevoluciones || []).forEach((d) => {
        devMap.set(d.pedido_detalle_id, (devMap.get(d.pedido_detalle_id) || 0) + d.cantidad_devuelta);
      });

      const pedidoData = pedido as any;
      const cliente = pedidoData.cliente;
      const vendedor = pedidoData.vendedor;
      const sucursal = pedidoData.sucursal;

      // Build corrected products list
      const productosCorregidos = (detallesActualizados || [])
        .map((d) => {
          const producto = d.productos as any;
          const devueltos = devMap.get(d.id) || 0;
          const cantidadReal = d.cantidad - devueltos;
          if (cantidadReal <= 0) return null;

          const pesoKg = producto?.peso_kg || 0;
          const precioPorKilo = !!producto?.precio_por_kilo;
          const importe = precioPorKilo
            ? cantidadReal * pesoKg * d.precio_unitario
            : cantidadReal * d.precio_unitario;

          return {
            cantidad: cantidadReal,
            descripcion: getDisplayName(producto),
            pesoTotal: pesoKg > 0 ? cantidadReal * pesoKg : null,
            precioUnitario: d.precio_unitario,
            importe,
            precioPorKilo,
          };
        })
        .filter(Boolean) as any[];

      const datosPrint: DatosPedidoPrint = {
        pedidoId: pedidoData.id,
        folio: `${pedidoData.folio} (CORREGIDO)`,
        fecha: pedidoData.fecha_pedido,
        vendedor: vendedor?.full_name || "—",
        terminoCredito: "—",
        cliente: {
          nombre: cliente?.nombre || clienteNombre,
          rfc: cliente?.rfc || undefined,
          razonSocial: cliente?.razon_social || undefined,
          direccionFiscal: cliente?.direccion || undefined,
          telefono: cliente?.telefono || undefined,
        },
        sucursal: sucursal ? { nombre: sucursal.nombre, direccion: sucursal.direccion } : undefined,
        productos: productosCorregidos,
        subtotal: pedidoData.subtotal,
        iva: pedidoData.impuestos,
        ieps: 0,
        total: pedidoData.total,
        pesoTotalKg: productosCorregidos.reduce(
          (sum: number, p: any) => sum + (p.pesoTotal || 0),
          0
        ),
        notas: "Pedido corregido después de conciliación de entrega.",
      };

      // Generate PDF
      const pdfBase64 = await generatePdfBase64(datosPrint);

      // Send to client
      await supabase.functions.invoke("send-client-notification", {
        body: {
          clienteId: cliente?.id,
          tipo: "pedido_corregido",
          data: {
            pedidoFolio: pedidoData.folio,
            total: pedidoData.total,
            mensaje: "Su pedido ha sido ajustado después de la entrega. Adjuntamos el documento corregido.",
          },
          pdfBase64: pdfBase64 || undefined,
          pdfFilename: `Pedido_${pedidoData.folio}_Corregido.pdf`,
        },
      });

      // Also send copy to internal emails
      const { getEmailsInternos, enviarCopiaInterna } = await import("@/lib/emailNotificationsUtils");
      const emailsInternos = await getEmailsInternos();
      if (emailsInternos.length > 0) {
        await enviarCopiaInterna({
          asunto: `Pedido Corregido: ${pedidoData.folio} - ${clienteNombre}`,
          htmlBody: `<p>El pedido <strong>${pedidoData.folio}</strong> de <strong>${clienteNombre}</strong> fue conciliado con devoluciones. Nuevo total: <strong>$${pedidoData.total?.toFixed(2)}</strong></p>`,
          emailsDestinatarios: emailsInternos,
        });
      }

      toast.success("Correo enviado al cliente con pedido corregido");
      onClose();
    } catch (err: any) {
      console.error("Error enviando correo:", err);
      toast.error("Error al enviar correo al cliente");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Conciliar Pedido {pedidoFolio}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Cliente: {clienteNombre}
          </p>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Cargando productos...</div>
        ) : (
          <div className="space-y-4">
            {tieneDevolucionesRegistradas && (
              <Card className="border-amber-300 bg-amber-50/50 dark:bg-amber-950/10">
                <CardContent className="py-3 px-4">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-amber-600" />
                    <span className="font-medium">
                      Ya se registraron {devolucionesExistentes.length} devoluciones para esta entrega
                    </span>
                  </div>
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {devolucionesExistentes.map((dev) => {
                      const detalle = detalles.find((d) => d.id === dev.pedido_detalle_id);
                      const producto = detalle?.productos as any;
                      return (
                        <li key={dev.id}>
                          • {producto?.nombre || "Producto"}: -{dev.cantidad_devuelta} ({dev.motivo})
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
            )}

            {!tieneDevolucionesRegistradas && (
              <>
                <div className="text-sm font-medium flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                  Registrar devoluciones por línea
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 text-xs">
                        <th className="p-2 text-left">Producto</th>
                        <th className="p-2 text-center w-16">Pedido</th>
                        <th className="p-2 text-center w-20">Devuelto</th>
                        <th className="p-2 text-left w-44">Motivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detalles.map((d) => {
                        const producto = d.productos as any;
                        const dev = devoluciones[d.id];
                        return (
                          <tr key={d.id} className="border-t">
                            <td className="p-2">
                              <span className="font-medium text-xs">
                                {producto?.nombre || "—"}
                              </span>
                              <br />
                              <span className="text-[10px] text-muted-foreground">
                                {producto?.codigo}
                              </span>
                            </td>
                            <td className="p-2 text-center font-mono">{d.cantidad}</td>
                            <td className="p-2">
                              <Input
                                type="number"
                                min={0}
                                max={d.cantidad}
                                value={dev?.cantidadDevuelta || ""}
                                onChange={(e) =>
                                  updateDevolucion(
                                    d.id,
                                    "cantidadDevuelta",
                                    Math.min(Number(e.target.value), d.cantidad)
                                  )
                                }
                                className="h-7 text-center text-xs w-16"
                                placeholder="0"
                              />
                            </td>
                            <td className="p-2">
                              {(dev?.cantidadDevuelta || 0) > 0 && (
                                <Select
                                  value={dev?.motivo || MOTIVOS_DEVOLUCION[0]}
                                  onValueChange={(v) =>
                                    updateDevolucion(d.id, "motivo", v)
                                  }
                                >
                                  <SelectTrigger className="h-7 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {MOTIVOS_DEVOLUCION.map((m) => (
                                      <SelectItem key={m} value={m}>
                                        {m}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {devolucionesActivas.length > 0 && (
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                      {devolucionesActivas.length} línea(s) con devolución
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Al guardar se recalculará el total del pedido automáticamente.
                    </p>
                  </div>
                )}

                <Button
                  onClick={guardarDevoluciones}
                  disabled={devolucionesActivas.length === 0 || guardando}
                  className="w-full"
                  variant={devolucionesActivas.length > 0 ? "default" : "secondary"}
                >
                  {guardando ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Undo2 className="h-4 w-4 mr-2" />
                  )}
                  Registrar Devoluciones ({devolucionesActivas.length})
                </Button>
              </>
            )}

            {/* Button to send corrected order to client */}
            {(tieneDevolucionesRegistradas || devolucionesGuardadas) && (
              <Button
                onClick={enviarCorreoCorregido}
                disabled={enviando}
                className="w-full"
                variant="default"
              >
                {enviando ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Enviar Pedido Corregido al Cliente
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

async function generatePdfBase64(datos: DatosPedidoPrint): Promise<string | null> {
  try {
    const tempContainer = document.createElement("div");
    tempContainer.style.position = "absolute";
    tempContainer.style.left = "-9999px";
    tempContainer.style.top = "0";
    tempContainer.style.width = "8.5in";
    tempContainer.style.backgroundColor = "#ffffff";
    document.body.appendChild(tempContainer);

    const root = createRoot(tempContainer);
    root.render(<PedidoPrintTemplate datos={datos} hideQR />);
    await new Promise((resolve) => setTimeout(resolve, 500));

    const canvas = await html2canvas(tempContainer, {
      scale: 3,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });

    root.unmount();
    document.body.removeChild(tempContainer);

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const ratio = Math.min(pdfWidth / canvas.width, pdfHeight / canvas.height);
    const imgX = (pdfWidth - canvas.width * ratio) / 2;
    pdf.addImage(imgData, "PNG", imgX, 5, canvas.width * ratio, canvas.height * ratio);
    return pdf.output("datauristring").split(",")[1];
  } catch (e) {
    console.error("Error generating PDF:", e);
    return null;
  }
}
