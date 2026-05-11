import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign, ShoppingCart, Truck, FileCheck, HandCoins, Shield, AlertTriangle,
  TrendingUp, BarChart3, RefreshCw, Send, Clock,
} from "lucide-react";
import {
  useDashboardEjecutivo, useReportesDiarios, useGenerarReporte, useEnviarReporte,
} from "@/hooks/useDashboardEjecutivo";

function KPI({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string; sub?: string; color?: string }) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${color || "bg-gray-50"}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold font-mono" style={{ fontVariantNumeric: "tabular-nums" }}>{value}</p>
            <p className="text-[10px] text-muted-foreground">{label}</p>
            {sub && <p className="text-[9px] text-muted-foreground">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const fmt = (n: number) => `$${(n || 0).toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;

export default function DashboardEjecutivo() {
  const { data: d, isLoading } = useDashboardEjecutivo();
  const { data: reportes } = useReportesDiarios();
  const generar = useGenerarReporte();
  const enviar = useEnviarReporte();

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-4 p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-64" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
              Dashboard Ejecutivo
            </h1>
            <p className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              <span className="ml-2">· Actualización cada 30s</span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => generar.mutate()} disabled={generar.isPending}>
              <RefreshCw className={`h-3 w-3 mr-1 ${generar.isPending ? "animate-spin" : ""}`} /> Generar reporte
            </Button>
          </div>
        </div>

        {/* KPIs Top */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPI icon={DollarSign} label="Ventas del día" value={fmt(d?.ventasDia || 0)} color="bg-green-50" />
          <KPI icon={TrendingUp} label="Ventas del mes" value={fmt(d?.ventasMes || 0)} color="bg-blue-50" />
          <KPI icon={HandCoins} label="Cartera total" value={fmt(d?.carteraTotal || 0)} sub={`${(d?.pctVencido || 0).toFixed(1)}% vencida`} color="bg-amber-50" />
          <KPI icon={ShoppingCart} label="Pedidos hoy" value={String(d?.pedidosDia || 0)} color="bg-purple-50" />
        </div>

        <Tabs defaultValue="hoy">
          <TabsList>
            <TabsTrigger value="hoy" className="text-xs"><BarChart3 className="h-3 w-3 mr-1" /> Hoy</TabsTrigger>
            <TabsTrigger value="historico" className="text-xs"><Clock className="h-3 w-3 mr-1" /> Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="hoy" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Operación */}
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Truck className="h-4 w-4 text-blue-600" /> Operación</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Entregas hoy</span><span className="font-mono font-bold">{d?.entregasDia || 0}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">IA procesadas</span><span className="font-mono font-bold">{d?.hojasIA || 0}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Cobros hoy</span><span className="font-mono font-bold">{d?.cobrosDia || 0}</span></div>
                </CardContent>
              </Card>

              {/* Facturación */}
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><FileCheck className="h-4 w-4 text-green-600" /> Facturación</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Facturado mes</span><span className="font-mono font-bold">{fmt(d?.facturadoMes || 0)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Cartera vencida</span><span className="font-mono font-bold text-red-600">{fmt(d?.carteraVencida || 0)}</span></div>
                </CardContent>
              </Card>

              {/* LA CORONA */}
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Shield className="h-4 w-4 text-[#c41e3a]" /> LA CORONA</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Alertas activas</span>
                    <Badge variant={d?.alertasActivas ? "destructive" : "outline"}>{d?.alertasActivas || 0}</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Score promedio</span>
                    <span className={`font-mono font-bold ${(d?.scorePromedio || 100) >= 80 ? "text-green-700" : "text-amber-700"}`}>{(d?.scorePromedio || 100).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Banderas rojas</span>
                    {(d?.banderasRojas || 0) > 0 ? (
                      <Badge variant="destructive">{d?.banderasRojas}</Badge>
                    ) : (
                      <span className="text-green-600 text-xs">Sin banderas</span>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Cobranza mini */}
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><HandCoins className="h-4 w-4 text-amber-600" /> Cobranza</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Cartera total</span><span className="font-mono font-bold">{fmt(d?.carteraTotal || 0)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Vencida</span><span className="font-mono font-bold text-red-600">{fmt(d?.carteraVencida || 0)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">% vencido</span><span className="font-mono">{(d?.pctVencido || 0).toFixed(1)}%</span></div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Histórico */}
          <TabsContent value="historico" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Reportes Diarios</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {reportes?.length ? (
                  <div className="space-y-2">
                    {reportes.map((r: any) => (
                      <div key={r.id} className="flex items-center justify-between border-b pb-2 text-xs">
                        <div>
                          <span className="font-mono font-medium">{r.fecha}</span>
                          <span className="ml-2 text-muted-foreground">
                            Ventas: {fmt(r.ventas_dia)} · Pedidos: {r.pedidos_dia} · Entregas: {r.entregas_dia}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {r.alertas_criticas > 0 && <Badge variant="destructive" className="text-[9px]">{r.alertas_criticas} alertas</Badge>}
                          {r.enviado_email && <Badge variant="outline" className="text-[9px]">Enviado</Badge>}
                          <Button variant="ghost" size="sm" onClick={() => enviar.mutate(r.fecha)} disabled={enviar.isPending}>
                            <Send className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-sm text-muted-foreground">Sin reportes. Genera el primero.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
