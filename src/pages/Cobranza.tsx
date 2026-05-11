import { useState } from "react";
import Layout from "@/components/Layout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HandCoins, DollarSign, AlertTriangle, CheckCircle, Clock, TrendingUp, BarChart3 } from "lucide-react";
import { useDashboardCobranza, useAgingReport, useCobros, useValidarCobro, useRechazarCobro } from "@/hooks/useCobranza";

const ESTADO_COBRO: Record<string, { color: string; label: string }> = {
  capturado: { color: "bg-amber-100 text-amber-800", label: "Pendiente validar" },
  validado: { color: "bg-blue-100 text-blue-800", label: "Validado" },
  conciliado: { color: "bg-green-100 text-green-800", label: "Conciliado" },
  rechazado: { color: "bg-red-100 text-red-800", label: "Rechazado" },
};

export default function Cobranza() {
  const { data: dashboard } = useDashboardCobranza();
  const { data: aging } = useAgingReport();
  const [filtroEstado, setFiltroEstado] = useState("capturado");
  const { data: cobros } = useCobros({ estado: filtroEstado });
  const validar = useValidarCobro();
  const rechazar = useRechazarCobro();

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader title="Cobranza" description="Cartera y cobros — ciclo completo factura → pago" />

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="py-3 flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-blue-500" />
            <div><p className="text-lg font-bold font-mono">${(dashboard?.totalCartera || 0).toLocaleString("es-MX", { maximumFractionDigits: 0 })}</p><p className="text-[10px] text-muted-foreground">Total cartera</p></div>
          </CardContent></Card>
          <Card><CardContent className="py-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <div><p className="text-lg font-bold font-mono">${(dashboard?.carteraVencida || 0).toLocaleString("es-MX", { maximumFractionDigits: 0 })}</p><p className="text-[10px] text-muted-foreground">Vencida</p></div>
          </CardContent></Card>
          <Card><CardContent className="py-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-amber-500" />
            <div><p className="text-lg font-bold">{(dashboard?.porcentajeVencido || 0).toFixed(1)}%</p><p className="text-[10px] text-muted-foreground">% vencido</p></div>
          </CardContent></Card>
          <Card><CardContent className="py-3 flex items-center gap-2">
            <HandCoins className="h-4 w-4 text-green-500" />
            <div><p className="text-lg font-bold">{dashboard?.cobrosHoy || 0}</p><p className="text-[10px] text-muted-foreground">Cobros hoy</p></div>
          </CardContent></Card>
        </div>

        <Tabs defaultValue="aging">
          <TabsList>
            <TabsTrigger value="aging" className="text-xs"><BarChart3 className="h-3 w-3 mr-1" /> Aging Report</TabsTrigger>
            <TabsTrigger value="cobros" className="text-xs"><HandCoins className="h-3 w-3 mr-1" /> Cobros</TabsTrigger>
          </TabsList>

          {/* Aging Report */}
          <TabsContent value="aging" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Cartera por Antigüedad</CardTitle>
              </CardHeader>
              <CardContent>
                {aging?.clientes?.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 pr-2">Cliente</th>
                          <th className="text-right py-2 px-2">Corriente</th>
                          <th className="text-right py-2 px-2">1-30</th>
                          <th className="text-right py-2 px-2">31-60</th>
                          <th className="text-right py-2 px-2">61-90</th>
                          <th className="text-right py-2 px-2 text-red-600">&gt;90</th>
                          <th className="text-right py-2 pl-2 font-bold">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {aging.clientes.map((c: any) => (
                          <tr key={c.cliente_id} className="border-b hover:bg-accent/50">
                            <td className="py-2 pr-2">{c.razon_social}</td>
                            <td className="text-right py-2 px-2 font-mono">{c.corriente > 0 ? `$${c.corriente.toLocaleString("es-MX", { maximumFractionDigits: 0 })}` : "—"}</td>
                            <td className="text-right py-2 px-2 font-mono">{c.d1_30 > 0 ? `$${c.d1_30.toLocaleString("es-MX", { maximumFractionDigits: 0 })}` : "—"}</td>
                            <td className="text-right py-2 px-2 font-mono text-amber-700">{c.d31_60 > 0 ? `$${c.d31_60.toLocaleString("es-MX", { maximumFractionDigits: 0 })}` : "—"}</td>
                            <td className="text-right py-2 px-2 font-mono text-orange-700">{c.d61_90 > 0 ? `$${c.d61_90.toLocaleString("es-MX", { maximumFractionDigits: 0 })}` : "—"}</td>
                            <td className="text-right py-2 px-2 font-mono text-red-700 font-bold">{c.d90_plus > 0 ? `$${c.d90_plus.toLocaleString("es-MX", { maximumFractionDigits: 0 })}` : "—"}</td>
                            <td className="text-right py-2 pl-2 font-mono font-bold">${c.total.toLocaleString("es-MX", { maximumFractionDigits: 0 })}</td>
                          </tr>
                        ))}
                      </tbody>
                      {aging.totales && (
                        <tfoot>
                          <tr className="border-t-2 font-bold">
                            <td className="py-2">TOTAL</td>
                            <td className="text-right py-2 px-2 font-mono">${aging.totales.corriente.toLocaleString("es-MX", { maximumFractionDigits: 0 })}</td>
                            <td className="text-right py-2 px-2 font-mono">${aging.totales.d1_30.toLocaleString("es-MX", { maximumFractionDigits: 0 })}</td>
                            <td className="text-right py-2 px-2 font-mono">${aging.totales.d31_60.toLocaleString("es-MX", { maximumFractionDigits: 0 })}</td>
                            <td className="text-right py-2 px-2 font-mono">${aging.totales.d61_90.toLocaleString("es-MX", { maximumFractionDigits: 0 })}</td>
                            <td className="text-right py-2 px-2 font-mono text-red-700">${aging.totales.d90_plus.toLocaleString("es-MX", { maximumFractionDigits: 0 })}</td>
                            <td className="text-right py-2 pl-2 font-mono">${aging.totales.total.toLocaleString("es-MX", { maximumFractionDigits: 0 })}</td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                ) : (
                  <p className="text-center py-8 text-sm text-muted-foreground">Sin cartera pendiente</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cobros */}
          <TabsContent value="cobros" className="mt-4 space-y-3">
            <Select value={filtroEstado} onValueChange={setFiltroEstado}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="capturado">Pendientes validar</SelectItem>
                <SelectItem value="validado">Validados</SelectItem>
                <SelectItem value="conciliado">Conciliados</SelectItem>
                <SelectItem value="rechazado">Rechazados</SelectItem>
              </SelectContent>
            </Select>

            {cobros?.length ? cobros.map((c: any) => {
              const badge = ESTADO_COBRO[c.estado] || ESTADO_COBRO.capturado;
              return (
                <Card key={c.id}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm font-medium">{c.folio}</span>
                          <Badge className={badge.color}>{badge.label}</Badge>
                          <span className="text-xs text-muted-foreground">Pago: {c.forma_pago_sat}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {c.clientes?.razon_social || c.clientes?.nombre}
                          {c.numero_operacion && ` · Op: ${c.numero_operacion}`}
                        </p>
                        {c.notas_cobrador && <p className="text-[10px] italic text-muted-foreground mt-0.5">{c.notas_cobrador}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-lg">${c.monto_total?.toLocaleString("es-MX")}</span>
                        {c.estado === "capturado" && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" className="text-green-700" onClick={() => validar.mutate({ cobro_id: c.id })}>
                              <CheckCircle className="h-3 w-3 mr-1" /> Validar
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-700" onClick={() => rechazar.mutate({ cobro_id: c.id, motivo: "Revisar" })}>
                              Rechazar
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            }) : <p className="text-center py-8 text-sm text-muted-foreground">Sin cobros en este filtro</p>}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
