import { Package, CheckCircle2, Scale, Clock } from "lucide-react";
import { KpiCard } from "./KpiCard";
import { ChartComprasMensuales } from "./ChartComprasMensuales";
import { ChartPrecioEvolucion } from "./ChartPrecioEvolucion";
import { TimelineOCs } from "./TimelineOCs";
import type { ProveedorDetalleData } from "@/hooks/useProveedorDetalle";

const fmtMoney = (n: number) =>
  "$" + Number(n || 0).toLocaleString("es-MX", { maximumFractionDigits: 0 });

interface Props {
  data: ProveedorDetalleData;
  onVerTodasOCs: () => void;
}

export const TabResumen = ({ data, onVerTodasOCs }: Props) => {
  const { kpis, comprasMensuales, ultimasOCs, ocsTotalCount, productoPrincipal, precioEvolucion } = data;
  const { score } = kpis;
  const isSinHist = score.rating === "sin_historial";

  // KPI 1 — trend
  let trendCompras: { text: string; tone: "up" | "down-bad" | "neutral" } | null = null;
  if (kpis.trend_compras === null) {
    trendCompras = { text: "→ Sin datos del mes anterior", tone: "neutral" };
  } else if (kpis.trend_compras > 0) {
    trendCompras = { text: `↑ ${kpis.trend_compras}% vs mes anterior`, tone: "up" };
  } else if (kpis.trend_compras < 0) {
    trendCompras = { text: `↓ ${Math.abs(kpis.trend_compras)}% vs mes anterior`, tone: "down-bad" };
  } else {
    trendCompras = { text: "→ Estable", tone: "neutral" };
  }

  // KPI 2 colors
  const completasVal = score.porcentaje_completas;
  const completasColor =
    completasVal === null
      ? "text-ink-300"
      : completasVal >= 90
      ? "text-green-700"
      : completasVal >= 75
      ? "text-ink-900"
      : "text-amber-700";

  const pesoVal = score.peso_correcto;
  const pesoColor =
    pesoVal === null
      ? "text-ink-300"
      : pesoVal >= 95
      ? "text-green-700"
      : pesoVal >= 90
      ? "text-ink-900"
      : "text-amber-700";

  return (
    <div className="px-8 py-7 space-y-7">
      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon={<Package size={11} />}
          label="Compras 30 días"
          value={fmtMoney(kpis.compras_30d)}
          trend={trendCompras}
        />
        <KpiCard
          icon={<CheckCircle2 size={11} />}
          label="% Completos"
          value={completasVal !== null ? `${Math.round(completasVal)}%` : "—"}
          valueClass={completasColor}
          sub={isSinHist ? "sin OCs aún" : `últimas ${score.total_ocs} OCs`}
        />
        <KpiCard
          icon={<Scale size={11} />}
          label="Peso correcto"
          value={pesoVal !== null ? `${Math.round(pesoVal)}%` : "—"}
          valueClass={pesoColor}
          sub={isSinHist ? "sin recepciones" : "sobre lo pedido"}
        />
        <KpiCard
          icon={<Clock size={11} />}
          label="Lead time real"
          value={
            score.lead_time_promedio !== null ? score.lead_time_promedio.toFixed(1) : "—"
          }
          valueUnit={score.lead_time_promedio !== null ? "días" : undefined}
          valueClass={isSinHist ? "text-ink-300" : "text-ink-900"}
          sub={isSinHist ? "por validar" : "promedio real"}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartComprasMensuales data={comprasMensuales} />
        <ChartPrecioEvolucion
          data={precioEvolucion}
          productoNombre={productoPrincipal?.nombre || null}
        />
      </div>

      {/* Timeline */}
      <TimelineOCs ocs={ultimasOCs} totalCount={ocsTotalCount} onVerTodas={onVerTodasOCs} />
    </div>
  );
};
