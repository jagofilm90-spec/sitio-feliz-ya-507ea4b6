import { cn } from "@/lib/utils";

export type TabKey = "resumen" | "productos" | "ocs" | "faltantes" | "cuenta" | "memoria";

interface TabDef {
  key: TabKey;
  label: string;
  count?: number;
}

interface Props {
  active: TabKey;
  onChange: (k: TabKey) => void;
  productosCount: number;
  ocsCount: number;
  faltantesCount: number;
  eventosCount: number;
}

export const DetailTabs = ({
  active,
  onChange,
  productosCount,
  ocsCount,
  faltantesCount,
  eventosCount,
}: Props) => {
  const tabs: TabDef[] = [
    { key: "resumen", label: "Resumen" },
    { key: "productos", label: "Productos", count: productosCount },
    { key: "ocs", label: "Histórico OCs", count: ocsCount },
    { key: "faltantes", label: "Faltantes", count: faltantesCount },
    { key: "cuenta", label: "Cuenta corriente" },
    { key: "memoria", label: "Memoria", count: eventosCount },
  ];

  return (
    <div className="px-8 border-b border-ink-100 flex gap-1 overflow-x-auto scrollbar-hide">
      {tabs.map((t) => {
        const isActive = active === t.key;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-3.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors",
              isActive
                ? "text-crimson-700 border-crimson-600"
                : "text-ink-500 border-transparent hover:text-ink-700"
            )}
          >
            {t.label}
            {typeof t.count === "number" && (
              <span
                className={cn(
                  "inline-flex items-center justify-center px-1.5 rounded-full text-[10px] min-w-[18px] h-[18px]",
                  isActive
                    ? "bg-crimson-50 text-crimson-700"
                    : "bg-bg-warm text-ink-500"
                )}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
