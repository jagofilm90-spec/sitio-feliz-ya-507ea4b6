import { useState } from "react";
import Layout from "@/components/Layout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, AlertTriangle, FileText, Users, Eye, CheckCircle, XCircle, Clock, TrendingUp, TrendingDown } from "lucide-react";
import {
  useDiscrepancias,
  useAnomalias,
  useMarcarAnomaliaRevisada,
  useScoresConfianza,
  useHojasFisicas,
  useResolverDiscrepancia,
} from "@/hooks/useLaCorona";

const LaCorona = () => {
  const [discFiltro, setDiscFiltro] = useState("pendiente");
  const [hojasFiltro, setHojasFiltro] = useState("pendiente");

  const { data: discrepancias } = useDiscrepancias({ estado: discFiltro });
  const { data: anomalias } = useAnomalias(true);
  const { data: scores } = useScoresConfianza();
  const { data: hojas } = useHojasFisicas({ estado: hojasFiltro });
  const marcarRevisada = useMarcarAnomaliaRevisada();
  const resolverDisc = useResolverDiscrepancia();

  const totalAnomalias = anomalias?.length || 0;
  const totalDiscPendientes = discrepancias?.filter((d: any) => d.estado_investigacion === "pendiente").length || 0;
  const totalHojasPendientes = hojas?.filter((h: any) => h.reconciliacion_estado === "pendiente").length || 0;

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          title="LA CORONA"
          description="Anti-robo: Reconciliación papel físico + digital. El Sistema Todo Lo Ve."
        />

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="py-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <div>
                  <p className="text-lg font-bold">{totalAnomalias}</p>
                  <p className="text-[10px] text-muted-foreground">Anomalías sin revisar</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-amber-500" />
                <div>
                  <p className="text-lg font-bold">{totalDiscPendientes}</p>
                  <p className="text-[10px] text-muted-foreground">Discrepancias pendientes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-lg font-bold">{totalHojasPendientes}</p>
                  <p className="text-[10px] text-muted-foreground">Hojas por reconciliar</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-lg font-bold">{scores?.length || 0}</p>
                  <p className="text-[10px] text-muted-foreground">Empleados con score</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="anomalias">
          <TabsList className="flex-wrap">
            <TabsTrigger value="anomalias" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" /> Anomalías ({totalAnomalias})
            </TabsTrigger>
            <TabsTrigger value="discrepancias" className="text-xs">
              <Shield className="h-3 w-3 mr-1" /> Discrepancias
            </TabsTrigger>
            <TabsTrigger value="hojas" className="text-xs">
              <FileText className="h-3 w-3 mr-1" /> Hojas Físicas
            </TabsTrigger>
            <TabsTrigger value="scores" className="text-xs">
              <Users className="h-3 w-3 mr-1" /> Scores
            </TabsTrigger>
          </TabsList>

          {/* Anomalías */}
          <TabsContent value="anomalias" className="mt-4 space-y-2">
            {anomalias?.length ? (
              anomalias.map((a: any) => (
                <Card key={a.id}>
                  <CardContent className="py-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={a.severidad === "critica" ? "bg-red-600" : a.severidad === "alta" ? "bg-red-500" : "bg-amber-500"} >
                            {a.severidad}
                          </Badge>
                          <span className="text-xs font-mono">{a.tipo}</span>
                        </div>
                        <p className="text-xs">{a.descripcion}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {new Date(a.created_at).toLocaleString("es-MX")}
                          {a.empleados?.nombre_completo && ` — ${a.empleados.nombre_completo}`}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => marcarRevisada.mutate(a.id)}
                        disabled={marcarRevisada.isPending}
                      >
                        <Eye className="h-3 w-3 mr-1" /> Revisar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-center py-8 text-sm text-muted-foreground">Sin anomalías pendientes</p>
            )}
          </TabsContent>

          {/* Discrepancias */}
          <TabsContent value="discrepancias" className="mt-4 space-y-3">
            <Select value={discFiltro} onValueChange={setDiscFiltro}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pendiente">Pendientes</SelectItem>
                <SelectItem value="investigando">Investigando</SelectItem>
                <SelectItem value="resuelta">Resueltas</SelectItem>
              </SelectContent>
            </Select>

            {discrepancias?.length ? (
              discrepancias.map((d: any) => (
                <Card key={d.id}>
                  <CardContent className="py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={d.severidad === "critica" ? "destructive" : "outline"}>
                        {d.severidad}
                      </Badge>
                      <span className="text-xs font-medium">{d.tipo}</span>
                      <Badge variant="outline" className="text-[10px]">{d.estado_investigacion}</Badge>
                    </div>
                    <p className="text-xs">{d.descripcion}</p>
                    {d.entregas?.pedidos?.folio && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Pedido: {d.entregas.pedidos.folio}
                        {d.entregas.pedidos.clientes?.nombre && ` — ${d.entregas.pedidos.clientes.nombre}`}
                      </p>
                    )}
                    {d.resolucion && (
                      <p className="text-[10px] text-green-700 mt-1">Resolución: {d.resolucion}</p>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-center py-8 text-sm text-muted-foreground">Sin discrepancias en este filtro</p>
            )}
          </TabsContent>

          {/* Hojas Físicas */}
          <TabsContent value="hojas" className="mt-4 space-y-3">
            <Select value={hojasFiltro} onValueChange={setHojasFiltro}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pendiente">Pendientes</SelectItem>
                <SelectItem value="ok">Reconciliadas OK</SelectItem>
                <SelectItem value="con_observaciones">Con observaciones</SelectItem>
                <SelectItem value="con_robo_sospechado">Robo sospechado</SelectItem>
              </SelectContent>
            </Select>

            {hojas?.length ? (
              hojas.map((h: any) => (
                <Card key={h.id}>
                  <CardContent className="py-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono font-medium">{h.pdf_folio}</span>
                          <Badge
                            className={
                              h.ia_clasificacion === "completo" ? "bg-green-100 text-green-800" :
                              h.ia_clasificacion === "faltante" ? "bg-red-100 text-red-800" :
                              h.ia_clasificacion === "no_llego" ? "bg-red-200 text-red-900" :
                              h.ia_clasificacion ? "bg-gray-100 text-gray-800" : "bg-amber-100 text-amber-800"
                            }
                          >
                            {h.ia_clasificacion || "sin procesar"}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {h.reconciliacion_estado}
                          </Badge>
                        </div>
                        {h.entregas?.pedidos?.folio && (
                          <p className="text-[10px] text-muted-foreground">
                            Pedido: {h.entregas.pedidos.folio}
                            {h.entregas.pedidos.clientes?.nombre && ` — ${h.entregas.pedidos.clientes.nombre}`}
                          </p>
                        )}
                        {h.ia_observaciones_texto && (
                          <p className="text-[10px] italic mt-1">"{h.ia_observaciones_texto}"</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {h.ia_sello_detectado != null && (
                          h.ia_sello_detectado
                            ? <CheckCircle className="h-3 w-3 text-green-600" />
                            : <XCircle className="h-3 w-3 text-red-500" />
                        )}
                        {h.foto_sellada_url && (
                          <a href={h.foto_sellada_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-3 w-3" />
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-center py-8 text-sm text-muted-foreground">Sin hojas en este filtro</p>
            )}
          </TabsContent>

          {/* Scores */}
          <TabsContent value="scores" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Score de Confianza — {new Date().toISOString().slice(0, 7)}</CardTitle>
              </CardHeader>
              <CardContent>
                {scores?.length ? (
                  <div className="space-y-2">
                    {scores.map((s: any) => (
                      <div key={s.id} className="flex items-center justify-between border-b pb-2">
                        <div>
                          <span className="text-sm font-medium">{s.empleados?.nombre_completo || "—"}</span>
                          <span className="text-[10px] text-muted-foreground ml-2">{s.empleados?.puesto || ""}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${s.score >= 80 ? "text-green-700" : s.score >= 50 ? "text-amber-700" : "text-red-700"}`}>
                            {s.score}
                          </span>
                          {s.tendencia === "mejorando" && <TrendingUp className="h-3 w-3 text-green-500" />}
                          {s.tendencia === "empeorando" && <TrendingDown className="h-3 w-3 text-red-500" />}
                          <span className="text-[10px] text-muted-foreground">
                            {s.entregas_totales} entregas · {s.discrepancias_graves} graves
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-sm text-muted-foreground">
                    Sin datos de score. Se calcula automáticamente.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default LaCorona;
