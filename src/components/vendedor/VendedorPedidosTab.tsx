import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Package, Calendar, DollarSign, Eye, X, Trash2,
  Clock, Truck, CheckCircle2, CreditCard, MapPin, Weight, Loader2, FileText
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { CancelarPedidoDialog } from "./CancelarPedidoDialog";
import { PedidoDetalleVendedorDialog } from "./PedidoDetalleVendedorDialog";
import { EliminarPedidoDialog } from "./EliminarPedidoDialog";
import { PedidoPDFPreviewDialog } from "./PedidoPDFPreviewDialog";
import { RegistrarCobroPedidoDialog } from "./RegistrarCobroPedidoDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VendedorEnCargaTab } from "./VendedorEnCargaTab";
import { VendedorEnRutaTab } from "./VendedorEnRutaTab";
import { EditarPedidoRechazadoDialog } from "./EditarPedidoRechazadoDialog";
import { EditarPedidoPendienteDialog } from "./EditarPedidoPendienteDialog";
import { AlertCircle, Edit2, Pencil } from "lucide-react";

interface PedidoDetalle {
  id: string;
  precio_unitario: number;
  precio_autorizado: number | null;
  autorizacion_status: string | null;
  cantidad: number;
  producto: {
    nombre: string;
    precio_venta: number;
    descuento_maximo: number | null;
    precio_por_kilo: boolean;
  } | null;
}

interface Pedido {
  id: string;
  cliente_id: string;
  folio: string;
  fecha_pedido: string;
  fecha_entrega_real: string | null;
  total: number;
  saldo_pendiente: number | null;
  status: string;
  termino_credito: string;
  pagado: boolean;
  peso_total_kg: number | null;
  notas: string | null;
  cliente: { nombre: string };
  sucursal?: { nombre: string; direccion?: string | null; zona?: { nombre: string } | null } | null;
  pedidos_detalles?: PedidoDetalle[];
}

function DiasTranscurridos({ fecha }: { fecha: string }) {
  const dias = differenceInDays(new Date(), new Date(fecha));
  const color = dias <= 2 ? "text-green-600" : dias <= 7 ? "text-amber-600" : "text-destructive";
  return (
    <span className={`text-xs font-medium flex items-center gap-1 ${color}`}>
      <Clock className="h-3 w-3" />
      {dias === 0 ? "Hoy" : dias === 1 ? "1 día" : `${dias} días`}
    </span>
  );
}

function SaldoBadge({ pedido }: { pedido: Pedido }) {
  const saldo = pedido.saldo_pendiente ?? pedido.total;
  if (pedido.status !== "entregado" || pedido.pagado || saldo <= 0) return null;
  const esParcial = saldo < pedido.total;
  return (
    <Badge variant="outline" className={esParcial ? "border-amber-400 text-amber-600 text-xs" : "border-destructive/50 text-destructive text-xs"}>
      <CreditCard className="h-3 w-3 mr-1" />
      {esParcial ? `Saldo: ${formatCurrency(saldo)}` : "Por cobrar"}
    </Badge>
  );
}

const PLAZO_DIAS: Record<string, number> = { contado: 0, "8_dias": 8, "15_dias": 15, "30_dias": 30, "60_dias": 60 };

function VencimientoCredito({ pedido }: { pedido: Pedido }) {
  const plazoDias = PLAZO_DIAS[pedido.termino_credito] ?? 0;
  if (plazoDias === 0) return null;
  const fechaBase = pedido.fecha_entrega_real || pedido.fecha_pedido;
  const vencimiento = new Date(fechaBase);
  vencimiento.setDate(vencimiento.getDate() + plazoDias);
  const diasRestantes = differenceInDays(vencimiento, new Date());
  const color = diasRestantes > 5 ? "text-green-600" : diasRestantes > 0 ? "text-amber-600" : "text-destructive";
  const texto = diasRestantes > 1 ? `Vence en ${diasRestantes} días` : diasRestantes === 1 ? "Vence mañana" : diasRestantes === 0 ? "Vence hoy" : `Vencido hace ${Math.abs(diasRestantes)} día${Math.abs(diasRestantes) > 1 ? "s" : ""}`;
  return <span className={`text-xs font-medium ${color}`}>{texto}</span>;
}

function getPrecioSolicitadoDetalle(detalle: PedidoDetalle) {
  return detalle.precio_autorizado ?? detalle.precio_unitario;
}

function getDescuentoSolicitadoDetalle(detalle: PedidoDetalle) {
  if (!detalle.producto) return 0;
  return Math.max(detalle.producto.precio_venta - getPrecioSolicitadoDetalle(detalle), 0);
}

function detalleRequiereAutorizacion(detalle: PedidoDetalle) {
  const status = detalle.autorizacion_status?.toLowerCase() ?? "";
  const descuentoMaximo = detalle.producto?.descuento_maximo ?? 0;
  const descuentoSolicitado = getDescuentoSolicitadoDetalle(detalle);

  return ["pendiente", "rechazado", "precio_modificado"].includes(status) || descuentoSolicitado > descuentoMaximo;
}

function EmptyState({ icono: Icon, titulo, descripcion }: { icono: any; titulo: string; descripcion: string }) {
  return (
    <Card className="border-dashed border-2">
      <CardContent className="flex flex-col items-center justify-center py-10 text-center">
        <Icon className="h-14 w-14 text-muted-foreground mb-3" />
        <h3 className="text-lg font-semibold mb-1">{titulo}</h3>
        <p className="text-muted-foreground text-sm">{descripcion}</p>
      </CardContent>
    </Card>
  );
}

export function VendedorPedidosTab({ onDashboardRefresh }: { onDashboardRefresh?: () => void } = {}) {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [showDetalle, setShowDetalle] = useState(false);
  const [showCancelar, setShowCancelar] = useState(false);
  const [showEliminar, setShowEliminar] = useState(false);
  const [showCobro, setShowCobro] = useState(false);
  const [pedidoParaCobro, setPedidoParaCobro] = useState<any>(null);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [pdfPedidoId, setPdfPedidoId] = useState<string>("");
  const [enCargaCount, setEnCargaCount] = useState(0);
  const [pedidosEnCargaIds, setPedidosEnCargaIds] = useState<Set<string>>(new Set());
  const [showEditarRechazado, setShowEditarRechazado] = useState(false);
  const [pedidoParaEditar, setPedidoParaEditar] = useState<Pedido | null>(null);
  const [showEditarPendiente, setShowEditarPendiente] = useState(false);
  const [pedidoParaEditarPendiente, setPedidoParaEditarPendiente] = useState<Pedido | null>(null);

  useEffect(() => {
    fetchPedidos();

    const channel = supabase
      .channel('vendedor-pedidos-tab-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' },
        () => {
          fetchPedidos();
          onDashboardRefresh?.();
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rutas' }, () => fetchPedidos())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entregas' }, () => fetchPedidos())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Fetch pedidos en carga
  const fetchPedidosEnCarga = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("entregas")
      .select("pedido_id, pedido:pedidos!inner(vendedor_id), ruta:rutas!inner(status, carga_completada)")
      .eq("pedido.vendedor_id", user.id)
      .eq("ruta.status", "programada")
      .eq("ruta.carga_completada", false);
    const ids = new Set((data || []).map((e: any) => e.pedido_id));
    setPedidosEnCargaIds(ids);
    setEnCargaCount(ids.size);
  };

  useEffect(() => {
    fetchPedidosEnCarga();
    const ch = supabase.channel("vendedor-pedidos-carga-count")
      .on("postgres_changes", { event: "*", schema: "public", table: "carga_productos" }, fetchPedidosEnCarga)
      .on("postgres_changes", { event: "*", schema: "public", table: "rutas" }, fetchPedidosEnCarga)
      .on("postgres_changes", { event: "*", schema: "public", table: "entregas" }, fetchPedidosEnCarga)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const fetchPedidos = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("pedidos")
        .select(`
          id, folio, fecha_pedido, fecha_entrega_real, total, saldo_pendiente,
          status, termino_credito, pagado, peso_total_kg, cliente_id, notas,
          cliente:clientes(nombre),
          sucursal:cliente_sucursales(nombre, direccion, zona:zonas(nombre)),
          pedidos_detalles(id, precio_unitario, precio_autorizado, autorizacion_status, cantidad, subtotal, producto:producto_id(nombre, precio_venta, descuento_maximo, precio_por_kilo, peso_kg, aplica_iva, aplica_ieps))
        `)
        .eq("vendedor_id", user.id)
        .neq("status", "cancelado")
        .neq("status", "borrador")
        .order("fecha_pedido", { ascending: false });

      if (error) throw error;

      setPedidos((data || []).map((p: any) => ({
        ...p,
        cliente: p.cliente || { nombre: "Sin cliente" },
        sucursal: p.sucursal || null,
        termino_credito: p.termino_credito || "contado",
        fecha_entrega_real: p.fecha_entrega_real || null,
        pagado: p.pagado || false,
        saldo_pendiente: p.saldo_pendiente ?? null,
        peso_total_kg: p.peso_total_kg || 0,
      })));
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar pedidos");
    } finally {
      setLoading(false);
    }
  };

  // Clasificación
  const pedidosPorAutorizar = pedidos.filter(p =>
    p.status === "por_autorizar" || p.status === "rechazado"
  );
  const pedidosListos = pedidos.filter(p =>
    p.status === "pendiente" && !pedidosEnCargaIds.has(p.id)
  );
  const enRuta = pedidos.filter(p => p.status === "en_ruta");
  const entregadosAll = pedidos.filter(p => p.status === "entregado");
  const porCobrar = pedidos.filter(p => p.status === "entregado" && !p.pagado);

  const abrirDetalle = (p: Pedido) => { setSelectedPedido(p); setShowDetalle(true); };
  const abrirCancelar = (p: Pedido) => { setSelectedPedido(p); setShowCancelar(true); };
  const abrirEliminar = (p: Pedido) => { setSelectedPedido(p); setShowEliminar(true); };
  const abrirCobro = (p: Pedido) => {
    setPedidoParaCobro({
      id: p.id, folio: p.folio, total: p.total, saldo_pendiente: p.saldo_pendiente,
      fecha_pedido: p.fecha_pedido, termino_credito: p.termino_credito,
      fecha_entrega_real: p.fecha_entrega_real, cliente: p.cliente as any,
    });
    setShowCobro(true);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32" />)}
      </div>
    );
  }

  const PedidoCard = ({ pedido, showCobrarBtn = false }: { pedido: Pedido; showCobrarBtn?: boolean }) => {
    const detallesConDescuentoSolicitado = (pedido.pedidos_detalles || []).filter(
      detalle => detalle.producto && detalleRequiereAutorizacion(detalle)
    );

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-bold text-base">{pedido.folio}</span>
                {pedido.status === "por_autorizar" && <Badge variant="secondary" className="text-xs">Pendiente de autorización</Badge>}
                {pedido.status === "rechazado" && <Badge variant="destructive" className="text-xs">Precio rechazado</Badge>}
                {pedido.status === "pendiente" && <Badge variant="default" className="text-xs">Pendiente</Badge>}
                {pedido.status === "en_ruta" && <Badge className="text-xs bg-blue-500">En ruta</Badge>}
                {pedido.status === "entregado" && <Badge variant="outline" className="text-xs text-green-600 border-green-400">Entregado</Badge>}
                <SaldoBadge pedido={pedido} />
              </div>

              <p className="text-sm text-muted-foreground truncate mb-1">{pedido.cliente.nombre}</p>

              {(pedido.status === "por_autorizar" || pedido.status === "rechazado") && detallesConDescuentoSolicitado.length > 0 && (
                <div className="mt-2 mb-2 rounded-lg border border-border bg-muted/30 p-2.5">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Productos con descuento solicitado:
                  </p>
                  <div className="space-y-2">
                    {detallesConDescuentoSolicitado.map(detalle => {
                      const precioLista = detalle.producto?.precio_venta || 0;
                      const descMax = detalle.producto?.descuento_maximo || 0;
                      const precioMaxDesc = precioLista - descMax;
                      const precioSolicitado = getPrecioSolicitadoDetalle(detalle);
                      const diferencia = precioSolicitado - precioMaxDesc;

                      return (
                        <div key={detalle.id} className="rounded-md border border-border/70 bg-background/80 p-2">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-foreground">{detalle.producto?.nombre}</p>
                              <div className="mt-1 grid grid-cols-4 gap-2 text-[11px]">
                                <div>
                                  <span className="block text-muted-foreground">Lista</span>
                                  <span className="font-medium text-foreground">{formatCurrency(precioLista)}</span>
                                </div>
                                <div>
                                  <span className="block text-muted-foreground">Máx. Desc.</span>
                                  <span className="font-medium text-foreground">{formatCurrency(precioMaxDesc)}</span>
                                </div>
                                <div>
                                  <span className="block text-muted-foreground">Solicitado</span>
                                  <span className="font-semibold text-amber-700 dark:text-amber-300">{formatCurrency(precioSolicitado)}</span>
                                </div>
                                <div>
                                  <span className="block text-muted-foreground">Diferencia</span>
                                  <span className="font-semibold text-destructive">{formatCurrency(diferencia)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(pedido.fecha_pedido), "d MMM yyyy", { locale: es })}
                </span>
                {(pedido.status === "por_autorizar" || pedido.status === "pendiente") && (
                  <DiasTranscurridos fecha={pedido.fecha_pedido} />
                )}
                {pedido.peso_total_kg && pedido.peso_total_kg > 0 ? (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Weight className="h-3 w-3" />
                    {pedido.peso_total_kg.toFixed(1)} kg
                  </span>
                ) : null}
                {pedido.status === "entregado" && !pedido.pagado && (
                  <VencimientoCredito pedido={pedido} />
                )}
              </div>
            </div>

            <div className="text-right shrink-0">
              <p className="text-xl font-bold">{formatCurrency(pedido.total)}</p>
              {pedido.status === "entregado" && (
                <p className="text-xs text-green-600">+{formatCurrency(pedido.total * 0.01)} comisión</p>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t flex-wrap">
            {pedido.status === "rechazado" && (
              <Button size="sm" className="flex-1 bg-amber-500 hover:bg-amber-600 text-white" onClick={() => { setPedidoParaEditar(pedido); setShowEditarRechazado(true); }}>
                <Edit2 className="h-3.5 w-3.5 mr-1" /> Editar pedido
              </Button>
            )}
            {pedido.status === "pendiente" && !pedidosEnCargaIds.has(pedido.id) && (
              <Button variant="outline" size="sm" onClick={() => { setPedidoParaEditarPendiente(pedido); setShowEditarPendiente(true); }}>
                <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
              </Button>
            )}
            {["pendiente", "en_ruta", "entregado"].includes(pedido.status) && (
              <Button variant="outline" size="sm" onClick={() => { setPdfPedidoId(pedido.id); setShowPDFPreview(true); }}>
                <FileText className="h-3.5 w-3.5 mr-1" /> PDF
              </Button>
            )}
            {showCobrarBtn && !pedido.pagado && pedido.status === "entregado" && (
              <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => abrirCobro(pedido)}>
                <DollarSign className="h-3.5 w-3.5 mr-1" /> Cobrar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const montoporCobrar = porCobrar.reduce((s, p) => s + (p.saldo_pendiente ?? p.total), 0);

  return (
    <div className="space-y-4">
      {/* Resumen rápido */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Card>
          <CardContent className="p-3 flex items-center gap-2.5">
            <div className="p-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30"><Package className="h-3.5 w-3.5 text-blue-600" /></div>
            <div><p className="text-lg font-bold">{pedidosListos.length}</p><p className="text-[10px] text-muted-foreground">Por entregar</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-2.5">
            <div className="p-1.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30"><Truck className="h-3.5 w-3.5 text-indigo-600" /></div>
            <div><p className="text-lg font-bold">{enRuta.length}</p><p className="text-[10px] text-muted-foreground">En ruta</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-2.5">
            <div className="p-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30"><CreditCard className="h-3.5 w-3.5 text-amber-600" /></div>
            <div><p className="text-lg font-bold">{porCobrar.length}</p><p className="text-[10px] text-muted-foreground">Por cobrar</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-2.5">
            <div className="p-1.5 rounded-full bg-green-100 dark:bg-green-900/30"><DollarSign className="h-3.5 w-3.5 text-green-600" /></div>
            <div><p className="text-lg font-bold">{formatCurrency(montoporCobrar)}</p><p className="text-[10px] text-muted-foreground">Monto por cobrar</p></div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue={pedidosPorAutorizar.length > 0 ? "por_autorizar" : "pedidos"}>
        <TabsList className="grid grid-cols-6 w-full h-12">
          <TabsTrigger value="por_autorizar" className="text-xs gap-1 relative">
            <Clock className="h-3.5 w-3.5" />
            Por Autorizar
            {pedidosPorAutorizar.length > 0 && (
              <Badge className="absolute -top-1.5 -right-1.5 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-amber-500">
                {pedidosPorAutorizar.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pedidos" className="text-xs gap-1 relative">
            <Package className="h-3.5 w-3.5" />
            Pedidos
            {pedidosListos.length > 0 && (
              <Badge className="absolute -top-1.5 -right-1.5 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                {pedidosListos.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="en_carga" className="text-xs gap-1 relative">
            <Loader2 className="h-3.5 w-3.5" />
            En Carga
            {enCargaCount > 0 && (
              <Badge className="absolute -top-1.5 -right-1.5 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-amber-500">
                {enCargaCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="en_ruta" className="text-xs gap-1 relative">
            <Truck className="h-3.5 w-3.5" />
            En Ruta
            {enRuta.length > 0 && (
              <Badge className="absolute -top-1.5 -right-1.5 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-blue-500">
                {enRuta.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="entregados" className="text-xs gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Entregados
          </TabsTrigger>
          <TabsTrigger value="por_cobrar" className="text-xs gap-1 relative">
            <CreditCard className="h-3.5 w-3.5" />
            Por Cobrar
            {porCobrar.length > 0 && (
              <Badge variant="destructive" className="absolute -top-1.5 -right-1.5 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                {porCobrar.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Por Autorizar */}
        <TabsContent value="por_autorizar">
          <ScrollArea className="h-[calc(100vh-300px)] min-h-[200px]">
            {pedidosPorAutorizar.length === 0 ? (
              <EmptyState icono={Clock} titulo="Sin pedidos por autorizar" descripcion="Los pedidos que requieran autorización de precios aparecerán aquí" />
            ) : (
              <div style={{ overflowX: "auto" }}>
              <Table style={{ minWidth: "950px" }}>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Folio</TableHead>
                    <TableHead className="text-xs">Cliente</TableHead>
                    <TableHead className="text-xs">Dirección</TableHead>
                    <TableHead className="text-xs">Zona</TableHead>
                    <TableHead className="text-xs">Fecha</TableHead>
                    <TableHead className="text-xs">Peso</TableHead>
                    <TableHead className="text-xs">Crédito</TableHead>
                    <TableHead className="text-xs text-right">Total</TableHead>
                    <TableHead className="text-xs">Días</TableHead>
                    <TableHead className="text-xs">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pedidosPorAutorizar.map(p => {
                    const creditoLabels: Record<string, string> = { contado: "Contado", "8_dias": "8 días", "15_dias": "15 días", "30_dias": "30 días", "60_dias": "60 días" };
                    const diasPedido = differenceInDays(new Date(), new Date(p.fecha_pedido));
                    const diasColor = diasPedido < 7 ? "text-green-600" : diasPedido <= 14 ? "text-amber-600" : "text-destructive";
                    const descuentoProducts = (p.pedidos_detalles || []).filter(d => {
                      if (!d.producto) return false;
                      const descuento = d.producto.precio_venta - d.precio_unitario;
                      return descuento > (d.producto.descuento_maximo || 0);
                    });
                    return (
                      <React.Fragment key={p.id}>
                        <TableRow>
                          <TableCell className="text-xs font-bold" style={{ whiteSpace: "nowrap" }}>
                            {p.folio}
                            {p.status === "por_autorizar" && <Badge variant="secondary" className="ml-1 text-[9px]">Pendiente</Badge>}
                            {p.status === "rechazado" && <Badge variant="destructive" className="ml-1 text-[9px]">Rechazado</Badge>}
                          </TableCell>
                          <TableCell className="text-xs" style={{ wordBreak: "break-word", whiteSpace: "normal" }}>{p.cliente.nombre}</TableCell>
                          <TableCell className="text-xs text-muted-foreground" style={{ wordBreak: "break-word", whiteSpace: "normal" }}>{(p.sucursal as any)?.direccion || "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground" style={{ wordBreak: "break-word", whiteSpace: "normal" }}>{(p.sucursal as any)?.zona?.nombre || "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground" style={{ whiteSpace: "nowrap" }}>{format(new Date(p.fecha_pedido), "dd/MM/yy")}</TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground" style={{ whiteSpace: "nowrap" }}>{p.peso_total_kg && p.peso_total_kg > 0 ? `${Math.round(p.peso_total_kg)} kg` : "—"}</TableCell>
                          <TableCell className="text-xs" style={{ whiteSpace: "nowrap" }}>{creditoLabels[p.termino_credito] || p.termino_credito}</TableCell>
                          <TableCell className="text-xs text-right font-bold" style={{ whiteSpace: "nowrap" }}>{formatCurrency(p.total)}</TableCell>
                          <TableCell><span className={`text-xs font-semibold ${diasColor}`}>{diasPedido}d</span></TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {p.status === "rechazado" && (
                                <Button size="sm" className="h-7 text-xs bg-amber-500 hover:bg-amber-600 text-white" onClick={() => { setPedidoParaEditar(p); setShowEditarRechazado(true); }}>
                                  <Edit2 className="h-3 w-3 mr-1" />Editar
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                        {descuentoProducts.length > 0 && (
                          <TableRow>
                            <TableCell colSpan={10} className="bg-amber-50 dark:bg-amber-950/20 py-1.5 px-3">
                              <p className="text-[10px] font-semibold uppercase text-amber-700 dark:text-amber-300 mb-1">Productos con descuento solicitado:</p>
                              {descuentoProducts.map(d => {
                                const lista = d.producto!.precio_venta;
                                const maxDesc = lista - (d.producto!.descuento_maximo || 0);
                                const solicitado = d.precio_unitario;
                                const dif = solicitado - maxDesc;
                                return (
                                  <div key={d.id} className="flex items-center gap-3 text-[10px] text-muted-foreground">
                                    <AlertCircle className="h-3 w-3 text-amber-600 shrink-0" />
                                    <span className="font-medium text-foreground">{d.producto!.nombre}</span>
                                    <span>Lista: {formatCurrency(lista)}</span>
                                    <span>Máx: {formatCurrency(maxDesc)}</span>
                                    <span className="font-semibold text-amber-700 dark:text-amber-300">Solic: {formatCurrency(solicitado)}</span>
                                    <span className="font-semibold text-destructive">{formatCurrency(dif)}</span>
                                  </div>
                                );
                              })}
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        {/* Tab 2: Pedidos (ya autorizados, listos para surtir) */}
        <TabsContent value="pedidos">
          <ScrollArea className="h-[calc(100vh-300px)] min-h-[200px]">
            {pedidosListos.length === 0 ? (
              <EmptyState icono={Package} titulo="Sin pedidos listos" descripcion="Los pedidos autorizados y listos para surtir aparecerán aquí" />
            ) : (
              <div style={{ overflowX: "auto" }}>
              <Table style={{ minWidth: "950px" }}>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Folio</TableHead>
                    <TableHead className="text-xs">Cliente</TableHead>
                    <TableHead className="text-xs">Dirección</TableHead>
                    <TableHead className="text-xs">Zona</TableHead>
                    <TableHead className="text-xs">Fecha</TableHead>
                    <TableHead className="text-xs">Peso</TableHead>
                    <TableHead className="text-xs">Crédito</TableHead>
                    <TableHead className="text-xs text-right">Total</TableHead>
                    <TableHead className="text-xs">Días</TableHead>
                    <TableHead className="text-center w-[32px]"></TableHead>
                    <TableHead className="text-center w-[32px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pedidosListos.map(p => {
                    const creditoLabels: Record<string, string> = {
                      contado: "Contado",
                      "8_dias": "8 días",
                      "15_dias": "15 días",
                      "30_dias": "30 días",
                      "60_dias": "60 días",
                    };
                    const diasPedido = differenceInDays(new Date(), new Date(p.fecha_pedido));
                    const diasColor = diasPedido < 7 ? "text-green-600" : diasPedido <= 14 ? "text-amber-600" : "text-destructive";
                    return (
                      <TableRow key={p.id} className="cursor-pointer" onClick={() => abrirDetalle(p)}>
                        <TableCell className="text-xs font-bold" style={{ whiteSpace: "nowrap" }}>
                          {p.folio}
                          {p.notas?.includes("[EDITADO EN OFICINA]") && <Badge className="ml-1 text-[9px] bg-blue-500">Editado</Badge>}
                        </TableCell>
                        <TableCell className="text-xs" style={{ wordBreak: "break-word", whiteSpace: "normal" }}>{p.cliente.nombre}</TableCell>
                        <TableCell className="text-xs text-muted-foreground" style={{ wordBreak: "break-word", whiteSpace: "normal" }}>{(p.sucursal as any)?.direccion || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground" style={{ wordBreak: "break-word", whiteSpace: "normal" }}>{(p.sucursal as any)?.zona?.nombre || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground" style={{ whiteSpace: "nowrap" }}>{format(new Date(p.fecha_pedido), "dd/MM/yy")}</TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground" style={{ whiteSpace: "nowrap" }}>{p.peso_total_kg && p.peso_total_kg > 0 ? `${Math.round(p.peso_total_kg)} kg` : "—"}</TableCell>
                        <TableCell className="text-xs" style={{ whiteSpace: "nowrap" }}>{creditoLabels[p.termino_credito] || p.termino_credito}</TableCell>
                        <TableCell className="text-xs text-right font-bold" style={{ whiteSpace: "nowrap" }}>{formatCurrency(p.total)}</TableCell>
                        <TableCell><span className={`text-xs font-semibold ${diasColor}`} style={{ whiteSpace: "nowrap" }}>{diasPedido}d</span></TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPdfPedidoId(p.id);
                              setShowPDFPreview(true);
                            }}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        </TableCell>
                        <TableCell className="text-center">
                          {!pedidosEnCargaIds.has(p.id) && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setPedidoParaEditarPendiente(p); setShowEditarPendiente(true); }}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="en_carga">
          <ScrollArea className="h-[calc(100vh-300px)] min-h-[200px]">
            <VendedorEnCargaTab />
          </ScrollArea>
        </TabsContent>

        <TabsContent value="en_ruta">
          <ScrollArea className="h-[calc(100vh-300px)] min-h-[200px]">
            <VendedorEnRutaTab onVerDetalle={(id) => {
              const p = pedidos.find(x => x.id === id);
              if (p) abrirDetalle(p);
            }} />
          </ScrollArea>
        </TabsContent>

        <TabsContent value="entregados">
          <ScrollArea className="h-[calc(100vh-300px)] min-h-[200px]">
            <div className="space-y-3 pt-1">
              {entregadosAll.length === 0 ? (
                <EmptyState icono={CheckCircle2} titulo="Sin pedidos entregados" descripcion="Los pedidos entregados y su comisión aparecerán aquí" />
              ) : (
                entregadosAll.map(p => <PedidoCard key={p.id} pedido={p} />)
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="por_cobrar">
          {porCobrar.length > 0 && (
            <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-2.5 mt-2 mb-3">
              <span className="text-sm font-medium text-amber-800 dark:text-amber-200">Total por cobrar</span>
              <span className="font-bold text-amber-700 dark:text-amber-300">
                {formatCurrency(porCobrar.reduce((s, p) => s + (p.saldo_pendiente ?? p.total), 0))}
              </span>
            </div>
          )}
          <ScrollArea className="h-[calc(100vh-320px)] min-h-[200px]">
            <div className="space-y-3">
              {porCobrar.length === 0 ? (
                <EmptyState icono={CreditCard} titulo="Sin pedidos por cobrar" descripcion="Cuando entregues pedidos y estén pendientes de pago aparecerán aquí" />
              ) : (
                porCobrar.map(p => <PedidoCard key={p.id} pedido={p} showCobrarBtn={true} />)
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {selectedPedido && (
        <>
          <PedidoDetalleVendedorDialog open={showDetalle} onOpenChange={setShowDetalle} pedidoId={selectedPedido.id} />
          <CancelarPedidoDialog open={showCancelar} onOpenChange={setShowCancelar} pedido={selectedPedido} onPedidoCancelado={fetchPedidos} />
          <EliminarPedidoDialog open={showEliminar} onOpenChange={setShowEliminar} pedido={selectedPedido} onPedidoEliminado={() => { fetchPedidos(); onDashboardRefresh?.(); }} />
        </>
      )}

      <RegistrarCobroPedidoDialog
        open={showCobro}
        onOpenChange={setShowCobro}
        pedidoInicial={pedidoParaCobro}
        onCobrosActualizados={fetchPedidos}
      />

      <PedidoPDFPreviewDialog
        open={showPDFPreview}
        onOpenChange={setShowPDFPreview}
        pedidoId={pdfPedidoId}
      />

      {pedidoParaEditar && (
        <EditarPedidoRechazadoDialog
          open={showEditarRechazado}
          onOpenChange={setShowEditarRechazado}
          pedidoId={pedidoParaEditar.id}
          folio={pedidoParaEditar.folio}
          onSaved={fetchPedidos}
        />
      )}

      {pedidoParaEditarPendiente && (
        <EditarPedidoPendienteDialog
          open={showEditarPendiente}
          onOpenChange={setShowEditarPendiente}
          pedidoId={pedidoParaEditarPendiente.id}
          folio={pedidoParaEditarPendiente.folio}
          onSaved={fetchPedidos}
        />
      )}
    </div>
  );
}
