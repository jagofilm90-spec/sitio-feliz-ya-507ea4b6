import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MapPin, Package, Truck, CheckCircle, XCircle, ArrowRight } from "lucide-react";
import { useMisEntregasDia, useMetricasChoferDia } from "@/hooks/useChoferApp";

const ESTADO: Record<string, { color: string; label: string; icon: any }> = {
  generada: { color: "bg-gray-100 text-gray-700", label: "Por surtir", icon: Package },
  impresa: { color: "bg-gray-100 text-gray-700", label: "Por surtir", icon: Package },
  surtida: { color: "bg-amber-100 text-amber-700", label: "Lista", icon: Package },
  en_transito: { color: "bg-blue-100 text-blue-700", label: "En camino", icon: Truck },
  entregada: { color: "bg-green-100 text-green-700", label: "Entregada", icon: CheckCircle },
  reconciliada: { color: "bg-green-200 text-green-800", label: "Reconciliada", icon: CheckCircle },
  rechazada: { color: "bg-red-100 text-red-700", label: "Fallida", icon: XCircle },
};

export default function MiRutaHoy() {
  const navigate = useNavigate();
  const { data: entregas, isLoading } = useMisEntregasDia();
  const { data: m } = useMetricasChoferDia();
  const progreso = m && m.total > 0 ? ((m.entregadas || 0) / m.total) * 100 : 0;

  return (
    <Layout>
      <div className="min-h-screen">
        <div className="sticky top-0 bg-white border-b z-10 px-4 py-3">
          <h1 className="text-xl font-semibold">Mi ruta hoy</h1>
          <p className="text-xs text-muted-foreground mb-2">
            {new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <div className="grid grid-cols-4 gap-2 mb-2 text-center">
            <div><p className="text-lg font-mono font-bold">{m?.total || 0}</p><p className="text-[9px] text-muted-foreground">Total</p></div>
            <div><p className="text-lg font-mono font-bold text-green-600">{m?.entregadas || 0}</p><p className="text-[9px] text-muted-foreground">Entregadas</p></div>
            <div><p className="text-lg font-mono font-bold text-blue-600">{m?.enTransito || 0}</p><p className="text-[9px] text-muted-foreground">En ruta</p></div>
            <div><p className="text-lg font-mono font-bold text-amber-600">{m?.pendientes || 0}</p><p className="text-[9px] text-muted-foreground">Pendientes</p></div>
          </div>
          <Progress value={progreso} className="h-2" />
        </div>

        <div className="p-4 space-y-3 pb-20">
          {isLoading ? (
            <p className="text-center py-12 text-muted-foreground">Cargando...</p>
          ) : !entregas?.length ? (
            <div className="text-center py-12">
              <Truck className="mx-auto h-12 w-12 text-muted-foreground opacity-30 mb-4" />
              <p className="text-muted-foreground">Sin entregas asignadas hoy</p>
            </div>
          ) : (
            entregas.map((h: any) => {
              const cfg = ESTADO[h.estado] || ESTADO.generada;
              const Icon = cfg.icon;
              return (
                <Card key={h.id} className="cursor-pointer hover:border-[#c41e3a]/40" onClick={() => navigate(`/chofer/entrega/${h.id}`)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-semibold truncate">{h.cliente_razon_social}</p>
                        <p className="text-xs text-muted-foreground font-mono">{h.folio}</p>
                      </div>
                      <Badge variant="outline" className={cfg.color}>
                        <Icon className="mr-1 h-3 w-3" />{cfg.label}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-start text-muted-foreground text-xs">
                        <MapPin className="mr-1 h-3 w-3 flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-1">{h.cliente_direccion}</span>
                      </span>
                      <ArrowRight className="h-4 w-4 text-[#c41e3a] flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </Layout>
  );
}
