import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Send,
  Loader2,
  CheckCircle2,
  Edit,
  Package,
  FileCheck,
  AlertTriangle,
  Mail,
  Phone,
  MessageCircle,
} from "lucide-react";
import { format, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ConciliacionDetalleDialog } from "./ConciliacionDetalleDialog";
import { PedidoPrintTemplate, DatosPedidoPrint } from "@/components/pedidos/PedidoPrintTemplate";
import { getDisplayName } from "@/lib/productUtils";
import { generateWhatsAppUrl, formatPhoneForWhatsApp } from "@/lib/whatsappUtils";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { createRoot } from "react-dom/client";

interface WhatsAppPending {
  pedidoFolio: string;
  clienteNombre: string;
  phones: string[];
  message: string;
}

interface PedidoConciliacion {
  pedidoId: string;
  pedidoFolio: string;
  clienteId: string;
  clienteNombre: string;
  clienteCodigo: string;
  total: number;
  entregaId: string;
  fechaEntrega: string | null;
  terminoCredito: string;
  tieneDevolucion: boolean;
  productosResumen: string;
  tieneCorreo: boolean;
  tieneTelefono: boolean;
}

type EstadoPedido = "pendiente" | "listo" | "editado";

export function ConciliacionMasivaEnvio() {
  const queryClient = useQueryClient();
  const [estados, setEstados] = useState<Record<string, EstadoPedido>>({});
  const [enviando, setEnviando] = useState(false);
  const [confirmarOpen, setConfirmarOpen] = useState(false);
  const [editandoPedido, setEditandoPedido] = useState<PedidoConciliacion | null>(null);
  const [whatsappPendientes, setWhatsappPendientes] = useState<WhatsAppPending[]>([]);
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);

  // Query pedidos pendientes de conciliación (entregas completadas sin envío masivo)
  const { data: pedidosPendientes = [], isLoading } = useQuery({
    queryKey: ["conciliacion-masiva-pedidos"],
    queryFn: async () => {
      // Get entregas entregadas que no han sido conciliadas masivamente
      // (pedidos en status 'entregado', no 'por_cobrar')
      const { data: entregas, error } = await supabase
        .from("entregas")
        .select(`
          id, hora_entrega_real, nombre_receptor,
          pedido:pedidos!entregas_pedido_id_fkey(
            id, folio, total, status, termino_credito, fecha_entrega_real,
            cliente:clientes!pedidos_cliente_id_fkey(id, nombre, codigo),
            pedidos_detalles(
              cantidad,
              productos:productos!pedidos_detalles_producto_id_fkey(nombre, codigo)
            )
          )
        `)
        .in("status_entrega", ["entregado", "completo"])
        .eq("papeles_recibidos", true);

      if (error) throw error;

      const pedidos: PedidoConciliacion[] = [];
      for (const e of entregas || []) {
        const pedido = e.pedido as any;
        if (!pedido || pedido.status !== "entregado") continue;

        // Check if has devoluciones
        const { count } = await supabase
          .from("devoluciones")
          .select("id", { count: "exact", head: true })
          .eq("entrega_id", e.id);

        // Check if client has email
        const clienteId = pedido.cliente?.id;
        const { count: emailCount } = await supabase
          .from("cliente_correos")
          .select("id", { count: "exact", head: true })
          .eq("cliente_id", clienteId)
          .eq("activo", true);

        // Check if client has phone
        const { count: phoneCount } = await supabase
          .from("cliente_telefonos")
          .select("id", { count: "exact", head: true })
          .eq("cliente_id", clienteId)
          .eq("activo", true);

        // Fallback: check email in clientes table
        const tieneCorreo = (emailCount || 0) > 0 || !!pedido.cliente?.email;

        const detalles = pedido.pedidos_detalles || [];
        const resumen = detalles
          .slice(0, 3)
          .map((d: any) => `${d.cantidad}x ${d.productos?.nombre || "?"}`)
          .join(", ");

        pedidos.push({
          pedidoId: pedido.id,
          pedidoFolio: pedido.folio,
          clienteId: pedido.cliente?.id || "",
          clienteNombre: pedido.cliente?.nombre || "—",
          clienteCodigo: pedido.cliente?.codigo || "",
          total: pedido.total || 0,
          entregaId: e.id,
          fechaEntrega: pedido.fecha_entrega_real || e.hora_entrega_real,
          terminoCredito: pedido.termino_credito || "30_dias",
          tieneDevolucion: (count || 0) > 0,
          productosResumen: resumen + (detalles.length > 3 ? ` (+${detalles.length - 3} más)` : ""),
          tieneCorreo,
          tieneTelefono: (phoneCount || 0) > 0,
        });
      }

      return pedidos;
    },
    refetchInterval: 30000,
  });

  const getEstado = (pedidoId: string): EstadoPedido => estados[pedidoId] || "pendiente";

  const toggleListo = (pedidoId: string) => {
    setEstados((prev) => {
      const current = prev[pedidoId];
      if (current === "editado") return prev; // Don't toggle edited ones
      return { ...prev, [pedidoId]: current === "listo" ? "pendiente" : "listo" };
    });
  };

  const marcarEditado = (pedidoId: string) => {
    setEstados((prev) => ({ ...prev, [pedidoId]: "editado" }));
  };

  const pedidosListos = pedidosPendientes.filter((p) => {
    const estado = getEstado(p.pedidoId);
    return estado === "listo" || estado === "editado";
  });

  const formatCredito = (tc: string) => {
    const map: Record<string, string> = {
      contado: "Contado",
      "8_dias": "8 días",
      "15_dias": "15 días",
      "30_dias": "30 días",
      "60_dias": "60 días",
      "90_dias": "90 días",
    };
    return map[tc] || tc;
  };

  const enviarTodos = async () => {
    setConfirmarOpen(false);
    setEnviando(true);
    let enviados = 0;
    let errores = 0;
    const whatsappList: WhatsAppPending[] = [];

    for (const pedido of pedidosListos) {
      try {
        // Generate PDF
        const pdfBase64 = await generateConciliacionPdf(pedido);

        const tipo = pedido.tieneDevolucion || getEstado(pedido.pedidoId) === "editado"
          ? "pedido_conciliado_ajustado"
          : "pedido_conciliado";

        // Send email + get WhatsApp info
        const { data: notifResponse } = await supabase.functions.invoke("send-client-notification", {
          body: {
            clienteId: pedido.clienteId,
            tipo,
            data: {
              pedidoFolio: pedido.pedidoFolio,
              total: pedido.total,
              fechaEntrega: pedido.fechaEntrega
                ? format(new Date(pedido.fechaEntrega), "dd/MM/yyyy")
                : undefined,
              diasCredito: formatCredito(pedido.terminoCredito),
            },
            pdfBase64: pdfBase64 || undefined,
            pdfFilename: `Remision_${pedido.pedidoFolio}.pdf`,
          },
        });

        // Collect WhatsApp pending
        if (notifResponse?.whatsapp?.pending && notifResponse.whatsapp.phones?.length) {
          whatsappList.push({
            pedidoFolio: pedido.pedidoFolio,
            clienteNombre: pedido.clienteNombre,
            phones: notifResponse.whatsapp.phones,
            message: notifResponse.whatsapp.message,
          });
        }

        // Update status to por_cobrar
        await supabase
          .from("pedidos")
          .update({ status: "por_cobrar" as any })
          .eq("id", pedido.pedidoId);

        enviados++;
      } catch (err: any) {
        console.error(`Error enviando ${pedido.pedidoFolio}:`, err);
        errores++;
      }
    }

    setEnviando(false);
    queryClient.invalidateQueries({ queryKey: ["conciliacion-masiva-pedidos"] });
    
    if (errores === 0) {
      toast.success(`${enviados} pedido(s) enviados exitosamente`);
    } else {
      toast.warning(`${enviados} enviados, ${errores} con error`);
    }
    
    // Show WhatsApp dialog if any pending
    if (whatsappList.length > 0) {
      setWhatsappPendientes(whatsappList);
      setWhatsappDialogOpen(true);
    }

    // Reset states
    setEstados({});
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Cargando pedidos pendientes...</div>;
  }

  if (pedidosPendientes.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <FileCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Todo conciliado y enviado</p>
          <p className="text-sm">No hay pedidos pendientes de envío al cliente</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with send all button */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            {pedidosPendientes.length} pedido(s) pendientes de envío
          </p>
        </div>
        <Button
          onClick={() => setConfirmarOpen(true)}
          disabled={pedidosListos.length === 0 || enviando}
          className="gap-2"
        >
          {enviando ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Enviar Todo ({pedidosListos.length})
        </Button>
      </div>

      {/* Pedidos list */}
      <div className="space-y-2">
        {pedidosPendientes.map((pedido) => {
          const estado = getEstado(pedido.pedidoId);
          return (
            <Card
              key={pedido.pedidoId}
              className={cn(
                "transition-all",
                estado === "listo" && "border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/10",
                estado === "editado" && "border-amber-300 bg-amber-50/50 dark:bg-amber-950/10"
              )}
            >
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <div className="pt-0.5">
                    {estado === "editado" ? (
                      <div className="h-4 w-4 rounded-sm bg-amber-500 flex items-center justify-center">
                        <Edit className="h-3 w-3 text-white" />
                      </div>
                    ) : (
                      <Checkbox
                        checked={estado === "listo"}
                        onCheckedChange={() => toggleListo(pedido.pedidoId)}
                      />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{pedido.pedidoFolio}</span>
                        <span className="text-xs text-muted-foreground">
                          {pedido.clienteNombre}
                        </span>
                        {pedido.tieneDevolucion && (
                          <Badge variant="destructive" className="text-[10px]">
                            <AlertTriangle className="h-3 w-3 mr-0.5" />
                            Devolución
                          </Badge>
                        )}
                        {estado === "editado" && (
                          <Badge className="bg-amber-500 text-white text-[10px]">
                            Editado
                          </Badge>
                        )}
                        {/* Notification channel indicators */}
                        <div className="flex items-center gap-1">
                          {pedido.tieneCorreo && (
                            <span title="Tiene correo"><Mail className="h-3 w-3 text-muted-foreground" /></span>
                          )}
                          {pedido.tieneTelefono && (
                            <span title="Tiene WhatsApp"><MessageCircle className="h-3 w-3 text-emerald-600" /></span>
                          )}
                          {!pedido.tieneCorreo && !pedido.tieneTelefono && (
                            <span className="text-[10px] text-destructive" title="Sin correo ni teléfono">⚠️</span>
                          )}
                        </div>
                      </div>
                      <span className="font-bold text-sm">
                        ${pedido.total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {pedido.productosResumen}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                      {pedido.fechaEntrega && (
                        <span>
                          Entregado: {format(new Date(pedido.fechaEntrega), "dd/MM/yyyy HH:mm")}
                        </span>
                      )}
                      <span>Crédito: {formatCredito(pedido.terminoCredito)}</span>
                    </div>
                  </div>

                  {/* Edit button */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditandoPedido(pedido)}
                    className="shrink-0"
                  >
                    <Edit className="h-3.5 w-3.5 mr-1" />
                    Editar
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Confirmation dialog */}
      <Dialog open={confirmarOpen} onOpenChange={setConfirmarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar envío masivo</DialogTitle>
            <DialogDescription>
              Se van a enviar <strong>{pedidosListos.length}</strong> pedido(s) a sus respectivos
              clientes con el documento final y datos bancarios. ¿Todo está en orden?
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-40 overflow-y-auto space-y-1 text-sm">
            {pedidosListos.map((p) => (
              <div key={p.pedidoId} className="flex items-center justify-between py-1 border-b">
                <span>
                  {p.pedidoFolio} — {p.clienteNombre}
                </span>
                <span className="font-semibold">
                  ${p.total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmarOpen(false)}>
              No, regresar
            </Button>
            <Button onClick={enviarTodos}>
              <Send className="h-4 w-4 mr-2" />
              Sí, enviar todo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      {editandoPedido && (
        <ConciliacionDetalleDialog
          open={!!editandoPedido}
          onClose={() => {
            marcarEditado(editandoPedido.pedidoId);
            setEditandoPedido(null);
            queryClient.invalidateQueries({ queryKey: ["conciliacion-masiva-pedidos"] });
          }}
          pedidoId={editandoPedido.pedidoId}
          pedidoFolio={editandoPedido.pedidoFolio}
          clienteNombre={editandoPedido.clienteNombre}
          entregaId={editandoPedido.entregaId}
        />
      )}

      {/* WhatsApp pending dialog */}
      <Dialog open={whatsappDialogOpen} onOpenChange={setWhatsappDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-emerald-600" />
              Enviar por WhatsApp
            </DialogTitle>
            <DialogDescription>
              Los siguientes clientes tienen teléfono registrado. Haz clic para abrir WhatsApp con el mensaje listo.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-60 overflow-y-auto space-y-2">
            {whatsappPendientes.map((wp, idx) => (
              <div key={idx} className="flex items-center justify-between py-2 px-3 border rounded-lg">
                <div>
                  <p className="text-sm font-medium">{wp.pedidoFolio}</p>
                  <p className="text-xs text-muted-foreground">{wp.clienteNombre}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                  onClick={() => {
                    const url = generateWhatsAppUrl(wp.phones[0], wp.message);
                    window.open(url, "_blank");
                  }}
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Enviar
                </Button>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWhatsappDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

async function generateConciliacionPdf(pedido: PedidoConciliacion): Promise<string | null> {
  try {
    // Fetch full pedido data for PDF
    const { data: pedidoData } = await supabase
      .from("pedidos")
      .select(`
        id, folio, total, subtotal, impuestos, fecha_pedido, notas, termino_credito,
        cliente:clientes!pedidos_cliente_id_fkey(nombre, rfc, razon_social, direccion, telefono),
        vendedor:profiles!pedidos_vendedor_id_fkey(full_name),
        sucursal:cliente_sucursales!pedidos_sucursal_id_fkey(nombre, direccion)
      `)
      .eq("id", pedido.pedidoId)
      .single();

    if (!pedidoData) return null;

    const { data: detalles } = await supabase
      .from("pedidos_detalles")
      .select(`
        id, cantidad, precio_unitario, subtotal, es_cortesia,
        productos:productos!pedidos_detalles_producto_id_fkey(
          id, nombre, codigo, peso_kg, precio_por_kilo
        )
      `)
      .eq("pedido_id", pedido.pedidoId);

    // Check devoluciones
    const { data: devoluciones } = await supabase
      .from("devoluciones")
      .select("pedido_detalle_id, cantidad_devuelta")
      .eq("entrega_id", pedido.entregaId);

    const devMap = new Map<string, number>();
    (devoluciones || []).forEach((d) => {
      devMap.set(d.pedido_detalle_id, (devMap.get(d.pedido_detalle_id) || 0) + d.cantidad_devuelta);
    });

    const pd = pedidoData as any;
    const productos = (detalles || [])
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

    const formatCredito = (tc: string) => {
      const map: Record<string, string> = {
        contado: "Contado", "8_dias": "8 días", "15_dias": "15 días",
        "30_dias": "30 días", "60_dias": "60 días", "90_dias": "90 días",
      };
      return map[tc] || tc;
    };

    const datosPrint: DatosPedidoPrint = {
      pedidoId: pd.id,
      folio: pd.folio,
      fecha: pd.fecha_pedido,
      vendedor: pd.vendedor?.full_name || "—",
      terminoCredito: formatCredito(pd.termino_credito || "30_dias"),
      cliente: {
        nombre: pd.cliente?.nombre || pedido.clienteNombre,
        rfc: pd.cliente?.rfc || undefined,
        razonSocial: pd.cliente?.razon_social || undefined,
        direccionFiscal: pd.cliente?.direccion || undefined,
        telefono: pd.cliente?.telefono || undefined,
      },
      sucursal: pd.sucursal ? { nombre: pd.sucursal.nombre, direccion: pd.sucursal.direccion } : undefined,
      productos,
      subtotal: pd.subtotal,
      iva: pd.impuestos,
      ieps: 0,
      total: pd.total,
      pesoTotalKg: productos.reduce((sum: number, p: any) => sum + (p.pesoTotal || 0), 0),
    };

    // Render PDF
    const tempContainer = document.createElement("div");
    tempContainer.style.position = "absolute";
    tempContainer.style.left = "-9999px";
    tempContainer.style.top = "0";
    tempContainer.style.width = "8.5in";
    tempContainer.style.backgroundColor = "#ffffff";
    document.body.appendChild(tempContainer);

    const root = createRoot(tempContainer);
    root.render(<PedidoPrintTemplate datos={datosPrint} hideQR />);
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
