import { useState } from "react";
import Layout from "@/components/Layout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, AlertTriangle, FileText, Users, Eye, CheckCircle, XCircle, Clock, TrendingUp, TrendingDown, Activity } from "lucide-react";
import {
  useDashboardLaCorona,
  useDiscrepancias,
  useAnomalias,
  useCerrarAnomalia,
  useScoresConfianza,
  useResolverDiscrepancia,
  useFeedEventos,
} from "@/hooks/useLaCorona";
import { useHojasSalida } from "@/hooks/useHojaSalida";
import ReconciliarHojaDialog from "@/components/la-corona/ReconciliarHojaDialog";

const ESTADO_COLORS: Record<string, string> = {
  generada: "bg-gray-100 text-gray-700",
  impresa: "bg-blue-100 text-blue-700",
  surtida: "bg-blue-100 text-blue-700",
  en_transito: "bg-amber-100 text-amber-800",
  entregada: "bg-green-100 text-green-800",
  reconciliada: "bg-green-200 text-green-900",
  rechazada: "bg-red-100 text-red-800",
  parcial: "bg-yellow-100 text-yellow-800",
};

const LaCorona = () => {
  const { data: kpis } = useDashboardLaCorona();
  const [discFiltro, setDiscFiltro] = useState("pendiente");
  const [hojaFiltro, setHojaFiltro] = useState<string | undefined>(undefined);
  const [reconciliarHoja, setReconciliarHoja] = useState<any>(null);

  const { data: discrepancias } = useDiscrepancias({ estado: discFiltro });
  const { data: anomalias } = useAnomalias(true);
  const { data: scores } = useScoresConfianza();
  const { data: hojas } = useHojasSalida({ estado: hojaFiltro });
  const { data: feed } = useFeedEventos();
  const cerrarAnomalia = useCerrarAnomalia();
  const resolverDisc = useResolverDiscrepancia();

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          title="LA CORONA"
          description="Anti-robo: Reconciliación papel + digital. Principio Biblia #11."
        />

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="py-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <div><p className="text-lg font-bold">{kpis?.anomaliasAbiertas || 0}</p><p className="text-[10px] text-muted-foreground">Anomalías abiertas</p></div>
          </CardContent></Card>
          <Card><CardContent className="py-3 flex items-center gap-2">
            <Shield className="h-4 w-4 text-amber-500" />
            <div><p className="text-lg font-bold">{kpis?.discrepanciasPendientes || 0}</p><p className="text-[10px] text-muted-foreground">Discrepancias pendientes</p></div>
          </CardContent></Card>
          <Card><CardContent className="py-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-500" />
            <div><p className="text-lg font-bold">{kpis?.hojasPendientes || 0}</p><p className="text-[10px] text-muted-foreground">Hojas por reconciliar</p></div>
          </CardContent></Card>
          <Card><CardContent className="py-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-green-500" />
            <div><p className="text-lg font-bold">{kpis?.scorePromedio || 100}</p><p className="text-[10px] text-muted-foreground">Score promedio</p></div>
          </CardContent></Card>
        </div>

        <Tabs defaultValue="feed">
          <TabsList className="flex-wrap">
            <TabsTrigger value="feed" className="text-xs"><Activity className="h-3 w-3 mr-1" /> Tiempo Real</TabsTrigger>
            <TabsTrigger value="hojas" className="text-xs"><FileText className="h-3 w-3 mr-1" /> Hojas Salida</TabsTrigger>
            <TabsTrigger value="discrepancias" className="text-xs"><Shield className="h-3 w-3 mr-1" /> Discrepancias</TabsTrigger>
            <TabsTrigger value="scores" className="text-xs"><Users className="h-3 w-3 mr-1" /> Empleados</TabsTrigger>
            <TabsTrigger value="anomalias" className="text-xs"><AlertTriangle className="h-3 w-3 mr-1" /> Anomalías</TabsTrigger>
          </TabsList>

          {/* Feed */}
          <TabsContent value="feed" className="mt-4 space-y-2">
            {feed?.length ? feed.map((ev: any) => (
              <div key={ev.id} className="flex items-center gap-3 border-b pb-2 text-xs">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${ev.tiene_anomalia ? "bg-red-500" : "bg-green-500"}`} />
                <span className="text-muted-foreground w-28 flex-shrink-0">{new Date(ev.created_at).toLocaleTimeString("es-MX")}</span>
                <span className="font-medium">{ev.momentos_clave?.nombre || ev.momento_id}</span>
                {ev.hojas_salida?.folio && <Badge variant="outline" className="text-[9px]">{ev.hojas_salida.folio}</Badge>}
                {ev.usuario_nombre && <span className="text-muted-foreground">{ev.usuario_nombre}</span>}
              </div>
            )) : <p className="text-center py-8 text-sm text-muted-foreground">Sin eventos en las últimas 24h</p>}
          </TabsContent>

          {/* Hojas Salida */}
          <TabsContent value="hojas" className="mt-4 space-y-3">
            <Select value={hojaFiltro || "todos"} onValueChange={(v) => setHojaFiltro(v === "todos" ? undefined : v)}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="generada">Generada</SelectItem>
                <SelectItem value="en_transito">En tránsito</SelectItem>
                <SelectItem value="entregada">Entregada</SelectItem>
                <SelectItem value="reconciliada">Reconciliada</SelectItem>
              </SelectContent>
            </Select>
            {hojas?.length ? hojas.map((h: any) => (
              <Card key={h.id} className="cursor-pointer hover:bg-accent/50" onClick={() => h.reconciliacion_estado === "pendiente" && setReconciliarHoja(h)}>
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-medium">{h.folio}</span>
                        <Badge className={ESTADO_COLORS[h.estado] || ""}>{h.estado}</Badge>
                        <Badge variant="outline" className="text-[10px]">{h.reconciliacion_estado}</Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {h.cliente_razon_social} · {h.total_items_pedidos} items · {h.peso_bruto_kg}kg
                      </p>
                    </div>
                    <div className="text-[10px] text-muted-foreground text-right">
                      {new Date(h.fecha_emision).toLocaleDateString("es-MX")}
                      {h.foto_sellada_url && <p className="text-green-600">Foto capturada</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )) : <p className="text-center py-8 text-sm text-muted-foreground">Sin hojas de salida</p>}
          </TabsContent>

          {/* Discrepancias */}
          <TabsContent value="discrepancias" className="mt-4 space-y-3">
            <Select value={discFiltro} onValueChange={setDiscFiltro}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pendiente">Pendientes</SelectItem>
                <SelectItem value="investigando">Investigando</SelectItem>
                <SelectItem value="resuelta">Resueltas</SelectItem>
              </SelectContent>
            </Select>
            {discrepancias?.length ? discrepancias.map((d: any) => (
              <Card key={d.id}>
                <CardContent className="py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={d.es_robo_sospechado ? "destructive" : "outline"}>{d.severidad}</Badge>
                    <span className="text-xs font-medium">{d.tipo_discrepancia}</span>
                    {d.es_robo_sospechado && <Badge className="bg-red-600 text-[9px]">ROBO SOSPECHADO</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {d.hojas_salida?.folio} · {d.hojas_salida?.cliente_razon_social}
                    {d.productos?.nombre && ` · ${d.productos.nombre}`}
                    {d.diferencia && ` · Dif: ${d.diferencia}`}
                  </p>
                  {d.empleados?.nombre_completo && <p className="text-[10px] text-red-600">Responsable: {d.empleados.nombre_completo}</p>}
                </CardContent>
              </Card>
            )) : <p className="text-center py-8 text-sm text-muted-foreground">Sin discrepancias</p>}
          </TabsContent>

          {/* Scores */}
          <TabsContent value="scores" className="mt-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Score de Confianza Empleados</CardTitle></CardHeader>
              <CardContent>
                {scores?.length ? (
                  <div className="space-y-2">
                    {scores.map((s: any) => (
                      <div key={s.id} className="flex items-center justify-between border-b pb-2">
                        <div className="flex items-center gap-2">
                          {s.bandera_roja && <div className="w-3 h-3 bg-red-500 rounded-full" title="Bandera roja" />}
                          {s.bandera_amarilla && !s.bandera_roja && <div className="w-3 h-3 bg-amber-400 rounded-full" title="Bandera amarilla" />}
                          {!s.bandera_amarilla && !s.bandera_roja && <div className="w-3 h-3 bg-green-500 rounded-full" />}
                          <span className="text-sm font-medium">{s.empleados?.nombre_completo || "—"}</span>
                          <span className="text-[10px] text-muted-foreground">{s.empleados?.puesto}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${s.score_actual >= 80 ? "text-green-700" : s.score_actual >= 50 ? "text-amber-700" : "text-red-700"}`}>
                            {s.score_actual?.toFixed(0)}
                          </span>
                          {s.tendencia === "mejorando" && <TrendingUp className="h-3 w-3 text-green-500" />}
                          {s.tendencia === "empeorando" && <TrendingDown className="h-3 w-3 text-red-500" />}
                          <span className="text-[10px] text-muted-foreground">{s.factor_discrepancias_30d || 0} disc.</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-center py-8 text-sm text-muted-foreground">Sin datos de score</p>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Anomalías */}
          <TabsContent value="anomalias" className="mt-4 space-y-2">
            {anomalias?.length ? anomalias.map((a: any) => (
              <Card key={a.id}>
                <CardContent className="py-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={a.severidad === "critica" ? "bg-red-600" : a.severidad === "alta" ? "bg-red-500" : "bg-amber-500"}>{a.severidad}</Badge>
                        <span className="text-xs font-mono">{a.tipo_anomalia}</span>
                      </div>
                      <p className="text-xs">{a.hojas_salida?.folio && `${a.hojas_salida.folio} · `}{a.empleados?.nombre_completo || ""}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(a.created_at).toLocaleString("es-MX")}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => cerrarAnomalia.mutate({ id: a.id, resolucion: "Revisada por admin" })}>
                      <Eye className="h-3 w-3 mr-1" /> Cerrar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )) : <p className="text-center py-8 text-sm text-muted-foreground">Sin anomalías abiertas</p>}
          </TabsContent>
        </Tabs>

        {reconciliarHoja && (
          <ReconciliarHojaDialog
            open={!!reconciliarHoja}
            onClose={() => setReconciliarHoja(null)}
            hojaId={reconciliarHoja.id}
            folio={reconciliarHoja.folio}
            fotoUrl={reconciliarHoja.foto_sellada_url}
            iaData={reconciliarHoja}
          />
        )}
      </div>
    </Layout>
  );
};

export default LaCorona;
