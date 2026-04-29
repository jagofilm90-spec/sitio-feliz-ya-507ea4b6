import { AlertTriangle, AlertCircle, Package } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { PulseStats } from "@/types/proveedor-v3";
import { cn } from "@/lib/utils";

interface PulseBarProps {
  stats?: PulseStats;
  loading?: boolean;
  activeFilter: "ninguno" | "vencidos" | "faltantes" | "transito";
  onFilter: (f: "ninguno" | "vencidos" | "faltantes" | "transito") => void;
}

const fmtMoney = (n: number) =>
  "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

interface CardProps {
  variant: "amber" | "red" | "warm";
  Icon: typeof AlertTriangle;
  title: string;
  primary: string;
  isEmpty: boolean;
  isActive: boolean;
  onClick: () => void;
}

const PulseCard = ({ variant, Icon, title, primary, isEmpty, isActive, onClick }: CardProps) => {
  const styles = {
    amber: {
      bg: "bg-amber-50 hover:bg-amber-100 border-amber-100",
      iconBg: "bg-amber-100 text-amber-700",
      titleColor: "text-amber-800",
    },
    red: {
      bg: "bg-red-50 hover:bg-red-100 border-red-100",
      iconBg: "bg-red-100 text-red-700",
      titleColor: "text-red-800",
    },
    warm: {
      bg: "bg-bg-warm hover:bg-bg-soft-2 border-ink-100",
      iconBg: "bg-ink-50 text-ink-700",
      titleColor: "text-ink-700",
    },
  }[variant];

  return (
    <button
      onClick={onClick}
      type="button"
      className={cn(
        "flex items-center gap-3 rounded-lg border p-3.5 text-left transition-all w-full",
        styles.bg,
        isActive && "ring-2 ring-crimson-500/40 ring-offset-1"
      )}
    >
      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", styles.iconBg)}>
        <Icon size={16} strokeWidth={2.5} />
      </div>
      <div className="min-w-0 flex-1">
        <div className={cn("text-[10px] font-semibold uppercase tracking-[0.14em]", styles.titleColor)}>
          {title}
        </div>
        <div className={cn("text-sm font-medium truncate", isEmpty ? "text-ink-400" : "text-ink-900")}>
          {isEmpty ? "Todo bien" : primary}
        </div>
      </div>
    </button>
  );
};

export const PulseBar = ({ stats, loading, activeFilter, onFilter }: PulseBarProps) => {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[68px] w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <PulseCard
        variant="amber"
        Icon={AlertCircle}
        title="Saldos vencidos"
        primary={`${stats.saldosVencidosCount} ${stats.saldosVencidosCount === 1 ? "proveedor" : "proveedores"} · ${fmtMoney(stats.saldosVencidosMonto)}`}
        isEmpty={stats.saldosVencidosCount === 0}
        isActive={activeFilter === "vencidos"}
        onClick={() => onFilter(activeFilter === "vencidos" ? "ninguno" : "vencidos")}
      />
      <PulseCard
        variant="red"
        Icon={AlertTriangle}
        title="Faltantes pendientes"
        primary={`${stats.faltantesCount} ${stats.faltantesCount === 1 ? "reclamo" : "reclamos"} sin resolver`}
        isEmpty={stats.faltantesCount === 0}
        isActive={activeFilter === "faltantes"}
        onClick={() => onFilter(activeFilter === "faltantes" ? "ninguno" : "faltantes")}
      />
      <PulseCard
        variant="warm"
        Icon={Package}
        title="OCs en tránsito"
        primary={`${stats.ocsTransitoCount} ${stats.ocsTransitoCount === 1 ? "orden en camino" : "órdenes en camino"}`}
        isEmpty={stats.ocsTransitoCount === 0}
        isActive={activeFilter === "transito"}
        onClick={() => onFilter(activeFilter === "transito" ? "ninguno" : "transito")}
      />
    </div>
  );
};
