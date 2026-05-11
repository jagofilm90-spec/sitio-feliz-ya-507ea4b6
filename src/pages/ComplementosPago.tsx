import { useState } from "react";
import Layout from "@/components/Layout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Receipt, Stamp, Clock, CheckCircle } from "lucide-react";
import { useComplementosPago, useTimbrarComplementoPago } from "@/hooks/useComplementoPago";

const ESTADO_BADGE: Record<string, { color: string; label: string }> = {
  pendiente: { color: "bg-amber-100 text-amber-800", label: "Pendiente" },
  timbrada: { color: "bg-green-100 text-green-800", label: "Timbrado" },
  cancelada: { color: "bg-red-100 text-red-800", label: "Cancelado" },
  error: { color: "bg-red-200 text-red-900", label: "Error" },
};

export default function ComplementosPago() {
  const [filtro, setFiltro] = useState<string | undefined>(undefined);
  const { data: reps, isLoading } = useComplementosPago(filtro ? { estado: filtro } : undefined);
  const timbrar = useTimbrarComplementoPago();

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader title="Complementos de Pago" description="CFDI tipo P (REP) — Recibos electrónicos de pago" />

        <div className="flex items-center justify-between">
          <Select value={filtro || "todos"} onValueChange={(v) => setFiltro(v === "todos" ? undefined : v)}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="pendiente">Pendientes</SelectItem>
              <SelectItem value="timbrada">Timbrados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : !reps?.length ? (
          <Card><CardContent className="py-12 text-center">
            <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Sin complementos de pago</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-2">
            {reps.map((rep: any) => {
              const badge = ESTADO_BADGE[rep.cfdi_estado] || ESTADO_BADGE.pendiente;
              return (
                <Card key={rep.id}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm font-medium">{rep.folio}</span>
                          <Badge className={badge.color}>{badge.label}</Badge>
                          <span className="text-xs text-muted-foreground">Pago: {rep.forma_pago}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {rep.clientes?.razon_social || rep.clientes?.nombre}
                          {rep.fecha_pago && ` · ${new Date(rep.fecha_pago).toLocaleDateString("es-MX")}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium">${rep.monto?.toLocaleString("es-MX")}</span>
                        {rep.cfdi_estado === "pendiente" && (
                          <Button size="sm" onClick={() => timbrar.mutate(rep.id)} disabled={timbrar.isPending}>
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
