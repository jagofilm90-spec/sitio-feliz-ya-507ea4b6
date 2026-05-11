import { useState } from "react";
import Layout from "@/components/Layout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { FileMinus, Stamp, XCircle, CheckCircle, Clock } from "lucide-react";
import { useNotasCredito, useTimbrarNotaCredito, useCancelarNotaCredito } from "@/hooks/useNotaCredito";

const ESTADO_BADGE: Record<string, { color: string; label: string }> = {
  pendiente: { color: "bg-amber-100 text-amber-800", label: "Pendiente" },
  timbrada: { color: "bg-green-100 text-green-800", label: "Timbrada" },
  cancelada: { color: "bg-red-100 text-red-800", label: "Cancelada" },
  error: { color: "bg-red-200 text-red-900", label: "Error" },
};

export default function NotasCredito() {
  const [filtro, setFiltro] = useState<string | undefined>(undefined);
  const { data: notas, isLoading } = useNotasCredito(filtro ? { estado: filtro } : undefined);
  const timbrar = useTimbrarNotaCredito();

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader title="Notas de Crédito" description="CFDI tipo E — Devoluciones y bonificaciones" />

        <div className="flex items-center justify-between">
          <Select value={filtro || "todos"} onValueChange={(v) => setFiltro(v === "todos" ? undefined : v)}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="pendiente">Pendientes</SelectItem>
              <SelectItem value="timbrada">Timbradas</SelectItem>
              <SelectItem value="cancelada">Canceladas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : !notas?.length ? (
          <Card><CardContent className="py-12 text-center">
            <FileMinus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Sin notas de crédito</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-2">
            {notas.map((nc: any) => {
              const badge = ESTADO_BADGE[nc.cfdi_estado] || ESTADO_BADGE.pendiente;
              return (
                <Card key={nc.id}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm font-medium">{nc.folio}</span>
                          <Badge className={badge.color}>{badge.label}</Badge>
                          <span className="text-xs text-muted-foreground">{nc.tipo}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {nc.clientes?.razon_social || nc.clientes?.nombre}
                          {nc.facturas?.folio && ` · Factura: ${nc.facturas.folio}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium">${nc.total?.toLocaleString("es-MX")}</span>
                        {nc.cfdi_estado === "pendiente" && (
                          <Button size="sm" onClick={() => timbrar.mutate(nc.id)} disabled={timbrar.isPending}>
                            <Stamp className="h-3 w-3 mr-1" /> Timbrar
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
