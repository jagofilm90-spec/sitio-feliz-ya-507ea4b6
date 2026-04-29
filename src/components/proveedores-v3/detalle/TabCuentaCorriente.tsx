import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useProveedorCuentaCorriente } from "@/hooks/useProveedorTabsData";

const fmtMoney = (n: number) =>
  "$" +
  Number(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

interface Props {
  proveedorId: string;
}

export const TabCuentaCorriente = ({ proveedorId }: Props) => {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useProveedorCuentaCorriente(proveedorId);

  const stats = useMemo(() => {
    const arr = data || [];
    const total = arr.reduce((s, o) => s + o.total, 0);
    const today = new Date();
    const vencidasArr = arr.filter(
      (o) => o.fecha_pago_calculada && new Date(o.fecha_pago_calculada) < today
    );
    const saldoVencido = vencidasArr.reduce((s, o) => s + o.total, 0);
    const proxima = arr.find((o) => o.fecha_pago_calculada && new Date(o.fecha_pago_calculada) >= today);
    return {
      total,
      countTotal: arr.length,
      saldoVencido,
      countVencidas: vencidasArr.length,
      proxima,
    };
  }, [data]);

  return (
    <div>
      {/* Header */}
      <div className="px-8 pt-7 pb-4">
        <h2 className="font-serif text-2xl text-ink-900 leading-tight">
          Cuenta <em className="italic text-ink-700">corriente</em>
        </h2>
        <p className="font-serif italic text-sm text-ink-500 mt-1">Saldos pendientes de pago</p>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="px-8 pb-8 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <div className="px-8 py-12 text-center">
          <p className="text-sm text-red-700 mb-3">No se pudo cargar cuenta corriente</p>
          <button
            onClick={() => refetch()}
            className="text-xs font-medium text-crimson-700 hover:text-crimson-900"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && (data?.length ?? 0) === 0 && (
        <div className="px-8 py-16 text-center">
          <div className="text-4xl mb-3">✅</div>
          <p className="font-serif text-lg text-ink-900">Sin saldos pendientes</p>
          <p className="font-serif italic text-sm text-ink-500 mt-1">
            Todas las OCs están al corriente
          </p>
        </div>
      )}

      {/* Content */}
      {!isLoading && !error && (data?.length ?? 0) > 0 && (
        <div className="px-8 pb-8 space-y-5">
          {/* Stats banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white border border-ink-100 rounded-xl p-4">
              <div className="text-[10px] uppercase tracking-wider text-ink-500 font-medium">
                💰 Saldo total
              </div>
              <div className="font-serif text-3xl text-ink-900 tabular-nums mt-1 leading-none">
                {fmtMoney(stats.total)}
              </div>
              <div className="text-xs italic text-ink-500 mt-1.5">
                {stats.countTotal} OCs pendientes
              </div>
            </div>

            <div
              className={cn(
                "border rounded-xl p-4",
                stats.saldoVencido > 0
                  ? "bg-red-50/40 border-red-100"
                  : "bg-white border-ink-100"
              )}
            >
              <div className="text-[10px] uppercase tracking-wider text-ink-500 font-medium">
                ⚠ Saldo vencido
              </div>
              <div
                className={cn(
                  "font-serif text-3xl tabular-nums mt-1 leading-none",
                  stats.saldoVencido > 0 ? "text-red-700" : "text-ink-900"
                )}
              >
                {fmtMoney(stats.saldoVencido)}
              </div>
              <div className="text-xs italic text-ink-500 mt-1.5">
                {stats.countVencidas} OCs vencidas
              </div>
            </div>

            <div className="bg-white border border-ink-100 rounded-xl p-4">
              <div className="text-[10px] uppercase tracking-wider text-ink-500 font-medium">
                📅 Próximo vencimiento
              </div>
              {stats.proxima && stats.proxima.fecha_pago_calculada ? (
                <>
                  <div className="font-serif text-2xl text-ink-900 mt-1 leading-none">
                    {format(new Date(stats.proxima.fecha_pago_calculada), "d MMM yyyy", {
                      locale: es,
                    })}
                  </div>
                  <div className="text-xs italic text-ink-500 mt-1.5 truncate">
                    OC {stats.proxima.folio} · {fmtMoney(stats.proxima.total)}
                  </div>
                </>
              ) : (
                <>
                  <div className="font-serif text-2xl text-ink-500 mt-1 leading-none">
                    Sin vencimientos
                  </div>
                  <div className="text-xs italic text-ink-500 mt-1.5">—</div>
                </>
              )}
            </div>
          </div>

          {/* Tabla */}
          <div className="border border-ink-100 rounded-xl overflow-hidden bg-white">
            <div
              className="grid items-center gap-3 px-5 py-3 text-[10px] uppercase tracking-wider text-ink-500 font-medium bg-bg-warm border-b border-ink-100"
              style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr" }}
            >
              <div>Folio</div>
              <div>Fecha OC</div>
              <div className="text-right">Total</div>
              <div>Vence</div>
              <div>Días</div>
            </div>

            {(data || []).map((o) => {
              const diff = o.fecha_pago_calculada
                ? differenceInDays(new Date(o.fecha_pago_calculada), new Date())
                : null;
              return (
                <div
                  key={o.id}
                  className="grid items-center gap-3 px-5 py-3 text-sm border-b last:border-b-0 border-ink-50 hover:bg-bg-warm transition-colors"
                  style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr" }}
                >
                  <button
                    onClick={() => navigate(`/compras/oc/${o.id}`)}
                    className="text-left text-crimson-700 hover:text-crimson-900 font-medium"
                  >
                    {o.folio}
                  </button>
                  <div className="text-ink-700">
                    {format(new Date(o.created_at), "d MMM yyyy", { locale: es })}
                  </div>
                  <div className="text-right tabular-nums text-ink-900">{fmtMoney(o.total)}</div>
                  <div className="text-ink-700">
                    {o.fecha_pago_calculada
                      ? format(new Date(o.fecha_pago_calculada), "d MMM yyyy", { locale: es })
                      : "—"}
                  </div>
                  <div
                    className={cn(
                      "text-xs",
                      diff === null
                        ? "text-ink-500"
                        : diff >= 0
                          ? "text-ink-700"
                          : "text-red-700 font-medium"
                    )}
                  >
                    {diff === null
                      ? "—"
                      : diff >= 0
                        ? `en ${diff} día${diff !== 1 ? "s" : ""}`
                        : `vencido ${Math.abs(diff)} día${Math.abs(diff) !== 1 ? "s" : ""}`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
