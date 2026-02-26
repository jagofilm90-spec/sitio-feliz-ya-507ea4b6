import { useState, useEffect } from "react";
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
  cliente: { nombre: string };
  sucursal?: { nombre: string; direccion?: string | null; zona?: { nombre: string } | null } | null;
}

interface GrupoZona {
  zona: string;
  pedidos: Pedido[];
  totalKg: number;
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
  if (pedido.pagado || saldo <= 0) return null;
  const esParcial = saldo < pedido.total;
  return (
    <Badge variant="outline" className={esParcial ? "border-amber-400 text-amber-600 text-xs" : "border-destructive/50 text-destructive text-xs"}>
      <CreditCard className="h-3 w-3 mr-1" />
      {esParcial ? `Saldo: ${formatCurrency(saldo)}` : "Por cobrar"}
    </Badge>
  );
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

  useEffect(() => {
    fetchPedidos();

    const channel = supabase
      .channel('vendedor-pedidos-tab-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' },
        (payload) => {
          const isStatusChange = payload.eventType === 'UPDATE' && payload.new && payload.old && payload.new.status !== payload.old.status;
          const isDeleteOrInsert = payload.eventType === 'DELETE' || payload.eventType === 'INSERT';
          if (isStatusChange || isDeleteOrInsert) {
            fetchPedidos();
            onDashboardRefresh?.();
          }
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
          status, termino_credito, pagado, peso_total_kg, cliente_id,
          cliente:clientes(nombre),
          sucursal:cliente_sucursales(nombre, direccion, zona:zonas(nombre))
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
  const pedidosPendientes = pedidos.filter(p =>
    (p.status === "por_autorizar" || p.status === "pendiente") && !pedidosEnCargaIds.has(p.id)
  );
  const enRuta = pedidos.filter(p => p.status === "en_ruta");
  const entregadosAll = pedidos.filter(p => p.status === "entregado");
  const porCobrar = pedidos.filter(p => p.status === "entregado" && !p.pagado);

  const gruposZona: GrupoZona[] = enRuta.reduce((acc: GrupoZona[], p) => {
    const zonaNombre = (p.sucursal as any)?.zona?.nombre || (p.sucursal as any)?.nombre || "Sin zona";
    const existente = acc.find(g => g.zona === zonaNombre);
    if (existente) { existente.pedidos.push(p); existente.totalKg += p.peso_total_kg || 0; }
    else { acc.push({ zona: zonaNombre, pedidos: [p], totalKg: p.peso_total_kg || 0 }); }
    return acc;
  }, []);

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

  const PedidoCard = ({ pedido, showCobrarBtn = false }: { pedido: Pedido; showCobrarBtn?: boolean }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-bold text-base">{pedido.folio}</span>
              {pedido.status === "por_autorizar" && <Badge variant="secondary" className="text-xs">Por autorizar</Badge>}
              {pedido.status === "pendiente" && <Badge variant="default" className="text-xs">Pendiente</Badge>}
              {pedido.status === "en_ruta" && <Badge className="text-xs bg-blue-500">En ruta</Badge>}
              {pedido.status === "entregado" && <Badge variant="outline" className="text-xs text-green-600 border-green-400">Entregado</Badge>}
              <SaldoBadge pedido={pedido} />
            </div>
            <p className="text-sm text-muted-foreground truncate mb-1">{pedido.cliente.nombre}</p>
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
          <Button variant="outline" size="sm" className="flex-1" onClick={() => abrirDetalle(pedido)}>
            <Eye className="h-3.5 w-3.5 mr-1" /> Ver
          </Button>
          {showCobrarBtn && !pedido.pagado && (
            <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => abrirCobro(pedido)}>
              <DollarSign className="h-3.5 w-3.5 mr-1" /> Cobrar
            </Button>
          )}
          {(pedido.status === "por_autorizar" || pedido.status === "pendiente") && (
            <>
              <Button variant="outline" size="sm" className="text-amber-600 border-amber-300" onClick={() => abrirCancelar(pedido)}>
                <X className="h-3.5 w-3.5" />
              </Button>
              <Button variant="destructive" size="sm" onClick={() => abrirEliminar(pedido)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <Tabs defaultValue="pedidos">
        <TabsList className="grid grid-cols-5 w-full h-12">
          <TabsTrigger value="pedidos" className="text-xs gap-1 relative">
            <Package className="h-3.5 w-3.5" />
            Pedidos
            {pedidosPendientes.length > 0 && (
              <Badge className="absolute -top-1.5 -right-1.5 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                {pedidosPendientes.length}
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

        <TabsContent value="pedidos">
          <ScrollArea className="h-[calc(100vh-300px)] min-h-[200px]">
            {pedidosPendientes.length === 0 ? (
              <EmptyState icono={Package} titulo="Sin pedidos pendientes" descripcion="Tus pedidos aparecerán aquí hasta que sean autorizados" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[110px]">Pedido</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="w-[90px]">Fecha</TableHead>
                    <TableHead>Dirección</TableHead>
                    <TableHead className="w-[80px]">Crédito</TableHead>
                    <TableHead className="text-right w-[100px]">Total</TableHead>
                    <TableHead className="text-center w-[50px]">PDF</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pedidosPendientes.map(p => {
                    const creditoLabels: Record<string, string> = {
                      contado: "Contado",
                      "8_dias": "8 días",
                      "15_dias": "15 días",
                      "30_dias": "30 días",
                      "60_dias": "60 días",
                    };
                    return (
                      <TableRow key={p.id} className="cursor-pointer" onClick={() => abrirDetalle(p)}>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-sm">{p.folio}</span>
                            {p.status === "por_autorizar" && <Badge variant="secondary" className="text-[10px] w-fit">Por autorizar</Badge>}
                            {p.status === "pendiente" && <Badge variant="default" className="text-[10px] w-fit">Pendiente</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{p.cliente.nombre}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(p.fecha_pedido), "d MMM yy", { locale: es })}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground truncate max-w-[150px] block">
                            {(p.sucursal as any)?.direccion || "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs">{creditoLabels[p.termino_credito] || p.termino_credito}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-bold text-sm">{formatCurrency(p.total)}</span>
                        </TableCell>
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
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
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
            <div className="space-y-4 pt-1">
              {enRuta.length === 0 ? (
                <EmptyState icono={Truck} titulo="Sin pedidos en ruta" descripcion="Los pedidos asignados a rutas aparecerán aquí" />
              ) : (
                gruposZona.map(grupo => (
                  <div key={grupo.zona}>
                    <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-2.5 mb-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-blue-600" />
                        <span className="font-semibold text-sm text-blue-800 dark:text-blue-200">{grupo.zona}</span>
                        <Badge variant="secondary" className="text-xs">{grupo.pedidos.length} pedido{grupo.pedidos.length !== 1 ? "s" : ""}</Badge>
                      </div>
                      <div className="flex items-center gap-1 text-blue-700 dark:text-blue-300 font-bold text-sm">
                        <Weight className="h-3.5 w-3.5" />
                        {grupo.totalKg.toFixed(1)} kg total
                      </div>
                    </div>
                    <div className="space-y-2 pl-2">
                      {grupo.pedidos.map(p => <PedidoCard key={p.id} pedido={p} />)}
                    </div>
                  </div>
                ))
              )}
            </div>
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
    </div>
  );
}
