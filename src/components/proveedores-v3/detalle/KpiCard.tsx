import { cn } from "@/lib/utils";

interface KpiCardProps {
  icon?: React.ReactNode;
  label: string;
  value: string;
  valueUnit?: string;
  valueClass?: string;
  trend?: { text: string; tone: "up" | "down-good" | "down-bad" | "neutral" } | null;
  sub?: string;
}

const TREND_COLORS = {
  up: "text-green-700",
  "down-good": "text-green-700",
  "down-bad": "text-red-700",
  neutral: "text-ink-500",
};

export const KpiCard = ({ icon, label, value, valueUnit, valueClass, trend, sub }: KpiCardProps) => (
  <div className="bg-white border border-ink-100 rounded-xl px-5 py-4">
    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-ink-500 font-medium">
      {icon}
      {label}
    </div>
    <div className={cn("font-serif text-3xl tabular-nums leading-tight mt-1", valueClass || "text-ink-900")}>
      {value}
      {valueUnit && <span className="text-base text-ink-500 font-serif ml-1">{valueUnit}</span>}
    </div>
    {trend && (
      <div className={cn("text-[11px] font-medium mt-1", TREND_COLORS[trend.tone])}>{trend.text}</div>
    )}
    {sub && !trend && <div className="text-[11px] italic text-ink-500 mt-1">{sub}</div>}
    {sub && trend && <div className="text-[11px] italic text-ink-500 mt-0.5">{sub}</div>}
  </div>
);
