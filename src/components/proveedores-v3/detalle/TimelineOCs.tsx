import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { OCResumen } from "@/hooks/useProveedorDetalle";

const fmtMoney = (n: number) =>
  "$" + Number(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

type StatusKind = "ok" | "parcial" | "pending" | "danger";

function classifyStatus(status: string): StatusKind {
  if (["recibida", "completada", "cerrada"].includes(status)) return "ok";
  if (["parcial", "enviada", "confirmada"].includes(status)) return "parcial";
  if (["pendiente", "borrador", "pendiente_pago"].includes(status)) return "pending";
  return "danger";
}

const DOT_COLORS: Record<StatusKind, string> = {
  ok: "bg-green-500 ring-green-100",
  parcial: "bg-amber-500 ring-amber-100",
  pending: "bg-blue-500 ring-blue-50",
  danger: "bg-red-500 ring-red-50",
};

const PILL_STYLES: Record<StatusKind, string> = {
  ok: "bg-green-50 text-green-700 border-green-100",
  parcial: "bg-amber-50 text-amber-800 border-amber-100",
  pending: "bg-blue-50 text-blue-700 border-blue-100",
  danger: "bg-red-50 text-red-700 border-red-100",
};

const PILL_LABEL: Record<StatusKind, string> = {
  ok: "Completa ✓",
  parcial: "Parcial",
  pending: "Pendiente",
  danger: "Cancelada",
};

function summary(o: OCResumen, kind: StatusKind): string {
  switch (kind) {
    case "ok":
      return "entregado completo";
    case "parcial":
      return "entrega parcial · revisar ajustes";
    case "pending":
      return "esperando confirmación";
    case "danger":
      return "cancelada";
  }
}

interface Props {
  ocs: OCResumen[];
  totalCount: number;
  onVerTodas: () => void;
}

export const TimelineOCs = ({ ocs, totalCount, onVerTodas }: Props) => {
  const visibles = ocs.slice(0, 3);
  return (
    <div>
      <div className="flex items-end justify-between mb-4">
        <div>
          <h3 className="font-serif text-xl text-ink-900 leading-tight">
            Últimas <em className="italic text-ink-700">órdenes de compra</em>
          </h3>
          <p className="font-serif italic text-xs text-ink-500">
            Línea temporal · {totalCount} totales
          </p>
        </div>
        <button
          onClick={onVerTodas}
          className="text-xs font-medium text-crimson-700 hover:text-crimson-900 transition-colors"
        >
          Ver todas →
        </button>
      </div>

      {visibles.length === 0 ? (
        <div className="bg-white border border-ink-100 rounded-xl py-10 text-center">
          <p className="text-sm italic text-ink-500">Sin órdenes de compra todavía</p>
        </div>
      ) : (
        <div className="relative pl-6">
          <div
            className="absolute left-[7px] top-2 bottom-2 w-[2px] bg-ink-100"
            aria-hidden
          />
          {visibles.map((o) => {
            const kind = classifyStatus(o.status);
            const hace = formatDistanceToNow(new Date(o.created_at), {
              locale: es,
              addSuffix: true,
            });
            return (
              <div key={o.id} className="relative mb-4 last:mb-0">
                <div
                  className={cn(
                    "absolute -left-[22px] top-2 w-3 h-3 rounded-full ring-2 border-2 border-white",
                    DOT_COLORS[kind]
                  )}
                />
                <div className="bg-white border border-ink-100 rounded-lg px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs">
                        <span className="font-semibold text-ink-900">{o.folio}</span>
                        <span className="italic text-ink-500"> · {hace}</span>
                      </div>
                      <div className="text-xs text-ink-500 mt-0.5">
                        {o.productos_count} producto{o.productos_count !== 1 ? "s" : ""} · {summary(o, kind)}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className="font-serif text-lg tabular-nums text-ink-900 leading-none">
                        {fmtMoney(o.total)}
                      </div>
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border",
                          PILL_STYLES[kind]
                        )}
                      >
                        {PILL_LABEL[kind]}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
