import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Package, Calendar, TrendingUp, DollarSign, Receipt, Eye, X, Trash2,
  Clock, Truck, CheckCircle2, CreditCard, MapPin, Weight, ChevronRight
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { format, differenceInDays, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { CancelarPedidoDialog } from "./CancelarPedidoDialog";
import { PedidoDetalleVendedorDialog } from "./PedidoDetalleVendedorDialog";
import { EliminarPedidoDialog } from "./EliminarPedidoDialog";
import { RegistrarCobroPedidoDialog } from "./RegistrarCobroPedidoDialog";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Pedido {
  id: string;
  folio: string;
  fecha_pedido: string;
  fecha_entrega_real: string | null;
  total: number;
  saldo_pendiente: number | null;
  status: string;
  termino_credito: string;
  pagado: boolean;
  peso_total_kg: number | null;
  cliente: {
    nombre: string;
  };
  sucursal?: {
    nombre: string;
    zona?: {
      nombre: string;
    } | null;
  } | null;
}

interface VentaMensual {
  mes: string;
  mesCorto: string;
  total: number;
}

interface GrupoZona {
  zona: string;
  pedidos: Pedido[];
  totalKg: number;
}

const chartConfig = {
  total: { label: "Ventas", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

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

export function VendedorMisVentasTab() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [ventasMensuales, setVentasMensuales] = useState<VentaMensual[]>([]);
  const [stats, setStats] = useState({
    totalVentas: 0, totalPedidos: 0, ticketPromedio: 0, comisionEstimada: 0
  });

  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [showDetalle, setShowDetalle] = useState(false);
  const [showCancelar, setShowCancelar] = useState(false);
  const [showEliminar, setShowEliminar] = useState(false);
  const [showCobro, setShowCobro] = useState(false);
  const [pedidoParaCobro, setPedidoParaCobro] = useState<any>(null);

  useEffect(() => {
    fetchPedidos();
    fetchVentasMensuales();
  }, []);

  const fetchVentasMensuales = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const meses: VentaMensual[] = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const fecha = subMonths(now, i);
        const { data } = await supabase
          .from("pedidos")
          .select("total")
          .eq("vendedor_id", user.id)
          .gte("fecha_pedido", startOfMonth(fecha).toISOString())
          .lte("fecha_pedido", endOfMonth(fecha).toISOString())
          .not("status", "in", "(cancelado,por_autorizar)");
        meses.push({
          mes: format(fecha, "MMMM yyyy", { locale: es }),
          mesCorto: format(fecha, "MMM", { locale: es }).toUpperCase(),
          total: (data || []).reduce((sum, p) => sum + (p.total || 0), 0),
        });
      }
      setVentasMensuales(meses);
    } catch (error) {
      console.error("Error fetching monthly sales:", error);
    }
  };

  const fetchPedidos = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("pedidos")
        .select(`
          id, folio, fecha_pedido, fecha_entrega_real, total, saldo_pendiente, 
          status, termino_credito, pagado, peso_total_kg,
          cliente:clientes(nombre),
          sucursal:cliente_sucursales(nombre, zona:zonas(nombre))
        `)
        .eq("vendedor_id", user.id)
        .neq("status", "cancelado")
        .order("fecha_pedido", { ascending: false });

      if (error) throw error;

      const pedidosData = (data || []).map((p: any) => ({
        ...p,
        cliente: p.cliente || { nombre: "Sin cliente" },
        sucursal: p.sucursal || null,
        termino_credito: p.termino_credito || "contado",
        fecha_entrega_real: p.fecha_entrega_real || null,
        pagado: p.pagado || false,
        saldo_pendiente: p.saldo_pendiente ?? null,
        peso_total_kg: p.peso_total_kg || 0,
      }));

      setPedidos(pedidosData);

      const validos = pedidosData.filter(p => p.status !== "cancelado");
      const totalVentas = validos.reduce((sum, p) => sum + (p.total || 0), 0);
      const totalPedidos = validos.length;
      setStats({
        totalVentas,
        totalPedidos,
        ticketPromedio: totalPedidos > 0 ? totalVentas / totalPedidos : 0,
        comisionEstimada: totalVentas * 0.01,
      });
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar pedidos");
    } finally {
      setLoading(false);
    }
  };

  // Clasificación por tab
  const pendientes = pedidos.filter(p => p.status === "por_autorizar" || p.status === "pendiente");
  const enRuta = pedidos.filter(p => p.status === "en_ruta");
  const entregadosAll = pedidos.filter(p => p.status === "entregado");
  const porCobrar = pedidos.filter(p => p.status === "entregado" && !p.pagado);

  // Agrupación por zona para "En Ruta"
  const gruposZona: GrupoZona[] = enRuta.reduce((acc: GrupoZona[], p) => {
    const zonaNombre = (p.sucursal as any)?.zona?.nombre || (p.sucursal as any)?.nombre || "Sin zona";
    const existente = acc.find(g => g.zona === zonaNombre);
    if (existente) {
      existente.pedidos.push(p);
      existente.totalKg += p.peso_total_kg || 0;
    } else {
      acc.push({ zona: zonaNombre, pedidos: [p], totalKg: p.peso_total_kg || 0 });
    }
    return acc;
  }, []);

  const abrirDetalle = (p: Pedido) => { setSelectedPedido(p); setShowDetalle(true); };
  const abrirCancelar = (p: Pedido) => { setSelectedPedido(p); setShowCancelar(true); };
  const abrirEliminar = (p: Pedido) => { setSelectedPedido(p); setShowEliminar(true); };
  const abrirCobro = (p: Pedido) => {
    setPedidoParaCobro({
      id: p.id,
      folio: p.folio,
      total: p.total,
      saldo_pendiente: p.saldo_pendiente,
      fecha_pedido: p.fecha_pedido,
      termino_credito: p.termino_credito,
      fecha_entrega_real: p.fecha_entrega_real,
      cliente: p.cliente as any,
    });
    setShowCobro(true);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-40 w-full" />
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
            <Eye className="h-3.5 w-3.5 mr-1" />
            Ver
          </Button>
          {showCobrarBtn && !pedido.pagado && (
            <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => abrirCobro(pedido)}>
              <DollarSign className="h-3.5 w-3.5 mr-1" />
              Cobrar
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
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
        { label: "Total vendido (año)", value: formatCurrency(stats.totalVentas), icon: DollarSign, bg: "bg-primary/10", fg: "text-primary" },
          { label: "Pedidos activos", value: String(stats.totalPedidos), icon: Package, bg: "bg-secondary", fg: "text-secondary-foreground" },
          { label: "Ticket promedio", value: formatCurrency(stats.ticketPromedio), icon: TrendingUp, bg: "bg-muted", fg: "text-foreground" },
          { label: "Comisión (1%)", value: formatCurrency(stats.comisionEstimada), icon: Receipt, bg: "bg-primary/5", fg: "text-primary" },
        ].map((kpi, i) => (
          <Card key={i} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`h-11 w-11 rounded-lg ${kpi.bg} flex items-center justify-center shrink-0`}>
                  <kpi.icon className={`h-5 w-5 ${kpi.fg}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground leading-tight">{kpi.label}</p>
                  <p className="text-lg font-bold leading-tight">{kpi.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gráfica */}
      {ventasMensuales.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Ventas últimos 6 meses</h3>
            <ChartContainer config={chartConfig} className="h-[160px] w-full">
              <BarChart data={ventasMensuales} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <XAxis dataKey="mesCorto" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} fontSize={10} width={44} />
                <ChartTooltip content={<ChartTooltipContent />} formatter={(v: number) => [formatCurrency(v), "Ventas"]} labelFormatter={(l, p) => (p?.[0]?.payload as VentaMensual | undefined)?.mes || l} />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Tabs por estado */}
      <Tabs defaultValue="pendientes">
        <TabsList className="grid grid-cols-4 w-full h-12">
          <TabsTrigger value="pendientes" className="text-xs gap-1 relative">
            <Clock className="h-3.5 w-3.5" />
            Pendientes
            {pendientes.length > 0 && (
              <Badge className="absolute -top-1.5 -right-1.5 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                {pendientes.length}
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

        {/* Pendientes */}
        <TabsContent value="pendientes">
          <ScrollArea className="h-[calc(100vh-680px)] min-h-[200px]">
            <div className="space-y-3 pt-1">
              {pendientes.length === 0 ? (
                <EmptyState icono={Clock} titulo="Sin pedidos pendientes" descripcion="Tus pedidos aparecerán aquí hasta que sean autorizados" />
              ) : (
                pendientes.map(p => <PedidoCard key={p.id} pedido={p} />)
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* En Ruta - agrupado por zona con KG totales */}
        <TabsContent value="en_ruta">
          <ScrollArea className="h-[calc(100vh-680px)] min-h-[200px]">
            <div className="space-y-4 pt-1">
              {enRuta.length === 0 ? (
                <EmptyState icono={Truck} titulo="Sin pedidos en ruta" descripcion="Los pedidos asignados a rutas aparecerán aquí" />
              ) : (
                gruposZona.map(grupo => (
                  <div key={grupo.zona}>
                    {/* Header de zona con KG total */}
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

        {/* Entregados */}
        <TabsContent value="entregados">
          <ScrollArea className="h-[calc(100vh-680px)] min-h-[200px]">
            <div className="space-y-3 pt-1">
              {entregadosAll.length === 0 ? (
                <EmptyState icono={CheckCircle2} titulo="Sin pedidos entregados" descripcion="Los pedidos entregados y su comisión aparecerán aquí" />
              ) : (
                entregadosAll.map(p => <PedidoCard key={p.id} pedido={p} />)
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Por Cobrar */}
        <TabsContent value="por_cobrar">
          {porCobrar.length > 0 && (
            <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-2.5 mt-2 mb-3">
              <span className="text-sm font-medium text-amber-800 dark:text-amber-200">Total por cobrar</span>
              <span className="font-bold text-amber-700 dark:text-amber-300">
                {formatCurrency(porCobrar.reduce((s, p) => s + (p.saldo_pendiente ?? p.total), 0))}
              </span>
            </div>
          )}
          <ScrollArea className="h-[calc(100vh-700px)] min-h-[200px]">
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
          <EliminarPedidoDialog open={showEliminar} onOpenChange={setShowEliminar} pedido={selectedPedido} onPedidoEliminado={fetchPedidos} />
        </>
      )}

      <RegistrarCobroPedidoDialog
        open={showCobro}
        onOpenChange={setShowCobro}
        pedidoInicial={pedidoParaCobro}
        onCobrosActualizados={fetchPedidos}
      />
    </div>
  );
}
