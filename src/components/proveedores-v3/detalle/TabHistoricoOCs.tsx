import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useProveedorHistoricoOCs,
  type OCHistoricoRow,
} from "@/hooks/useProveedorTabsData";

const fmtMoney = (n: number) =>
  "$" + Number(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type FilterKey = "todas" | "completas" | "pendientes" | "faltantes" | "canceladas";
type SortKey = "recientes" | "antiguas" | "mayor" | "menor";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "todas", label: "Todas" },
  { key: "completas", label: "Completas" },
  { key: "pendientes", label: "Pendientes" },
  { key: "faltantes", label: "Con faltantes" },
  { key: "canceladas", label: "Canceladas" },
];

function statusInfo(o: OCHistoricoRow) {
  const s = o.status;
  if (["recibida", "completada", "cerrada"].includes(s))
    return { label: "Completa", cls: "bg-green-50 text-green-700 border-green-100" };
  if (s === "parcial")
    return {
      label: `Parcial${o.total_faltantes ? ` · ${o.total_faltantes} faltantes` : ""}`,
      cls: "bg-amber-50 text-amber-800 border-amber-100",
    };
  if (["enviada", "confirmada"].includes(s))
    return { label: "En tránsito", cls: "bg-blue-50 text-blue-700 border-blue-100" };
  if (["pendiente", "borrador", "pendiente_pago"].includes(s))
    return { label: "Pendiente", cls: "bg-blue-50 text-blue-700 border-blue-100" };
  return { label: "Cancelada", cls: "bg-red-50 text-red-700 border-red-100" };
}

function pagoInfo(o: OCHistoricoRow): { text: string; cls: string } {
  if (o.status_pago === "pagado") return { text: "Pagado", cls: "text-green-700" };
  if (!o.fecha_pago_calculada) return { text: "—", cls: "text-ink-500" };
  const diff = differenceInDays(new Date(o.fecha_pago_calculada), new Date());
  if (diff >= 0)
    return {
      text: `Vence ${format(new Date(o.fecha_pago_calculada), "d MMM", { locale: es })}`,
      cls: "text-ink-700",
    };
  return { text: `Vencido ${Math.abs(diff)} días`, cls: "text-red-700 font-medium" };
}

interface Props {
  proveedorId: string;
}

export const TabHistoricoOCs = ({ proveedorId }: Props) => {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useProveedorHistoricoOCs(proveedorId);
  const [filter, setFilter] = useState<FilterKey>("todas");
  const [sort, setSort] = useState<SortKey>("recientes");

  const stats = useMemo(() => {
    const all = data || [];
    const yearNow = new Date().getFullYear();
    const esteAnio = all.filter((o) => new Date(o.created_at).getFullYear() === yearNow).length;
    const total = all.reduce((s, o) => s + o.total, 0);
    return { total: all.length, esteAnio, montoTotal: total };
  }, [data]);

  const filteredSorted = useMemo(() => {
    let arr = [...(data || [])];
    if (filter === "completas")
      arr = arr.filter((o) => ["recibida", "completada", "cerrada"].includes(o.status));
    else if (filter === "pendientes")
      arr = arr.filter((o) =>
        ["pendiente", "borrador", "pendiente_pago", "enviada", "confirmada"].includes(o.status)
      );
    else if (filter === "faltantes") arr = arr.filter((o) => o.total_faltantes > 0);
    else if (filter === "canceladas")
      arr = arr.filter((o) => ["cancelada", "rechazada"].includes(o.status));

    if (sort === "recientes")
      arr.sort((a, b) => b.created_at.localeCompare(a.created_at));
    else if (sort === "antiguas")
      arr.sort((a, b) => a.created_at.localeCompare(b.created_at));
    else if (sort === "mayor") arr.sort((a, b) => b.total - a.total);
    else if (sort === "menor") arr.sort((a, b) => a.total - b.total);
    return arr;
  }, [data, filter, sort]);

  const recientes = (data || []).slice(0, 3);
  const resto = filteredSorted;

  return (
    <div>
      {/* Header */}
      <div className="px-8 pt-7 pb-4">
        <h2 className="font-serif text-2xl text-ink-900 leading-tight">
          Histórico de <em className="italic text-ink-700">órdenes de compra</em>
        </h2>
        <p className="font-serif italic text-sm text-ink-500 mt-1">
          {isLoading
            ? "Cargando…"
            : `${stats.total} OCs totales · ${stats.esteAnio} este año · ${fmtMoney(stats.montoTotal)} acumulado`}
        </p>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="px-8 pb-8 space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <div className="px-8 py-12 text-center">
          <p className="text-sm text-red-700 mb-3">No se pudo cargar histórico</p>
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
          <div className="text-4xl mb-3">📋</div>
          <p className="font-serif italic text-ink-500 mb-4">Sin órdenes de compra todavía</p>
          <button
            onClick={() => navigate(`/compras/nueva-oc-v3?proveedor=${proveedorId}`)}
            className="px-4 py-2 rounded-lg bg-crimson-500 text-white text-sm font-medium hover:bg-crimson-600 transition-colors"
          >
            + Crear primera OC
          </button>
        </div>
      )}

      {/* Content */}
      {!isLoading && !error && (data?.length ?? 0) > 0 && (
        <div className="px-8 pb-8 space-y-7">
          {/* Filtros + sort */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex gap-1.5 flex-wrap">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                    filter === f.key
                      ? "bg-crimson-50 text-crimson-700 border-crimson-100"
                      : "bg-white text-ink-700 border-ink-100 hover:bg-bg-warm"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="text-xs border border-ink-100 rounded-md px-2.5 py-1.5 bg-white text-ink-700 focus:outline-none focus:ring-1 focus:ring-crimson-500"
            >
              <option value="recientes">Más recientes</option>
              <option value="antiguas">Más antiguas</option>
              <option value="mayor">Mayor monto</option>
              <option value="menor">Menor monto</option>
            </select>
          </div>

          {/* Timeline recientes */}
          {recientes.length > 0 && (
            <div>
              <h3 className="font-serif text-sm text-ink-700 italic mb-3">Más recientes</h3>
              <div className="relative pl-6">
                <div
                  className="absolute left-[7px] top-2 bottom-2 w-[2px] bg-ink-100"
                  aria-hidden
                />
                {recientes.map((o) => {
                  const info = statusInfo(o);
                  return (
                    <div key={o.id} className="relative mb-3 last:mb-0">
                      <div className="absolute -left-[22px] top-2.5 w-3 h-3 rounded-full ring-2 border-2 border-white bg-crimson-500 ring-crimson-50" />
                      <div className="bg-white border border-ink-100 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <button
                            onClick={() => navigate(`/compras/oc/${o.id}`)}
                            className="text-xs font-semibold text-crimson-700 hover:text-crimson-900"
                          >
                            {o.folio}
                          </button>
                          <div className="text-xs text-ink-500 mt-0.5">
                            {format(new Date(o.created_at), "d MMM yyyy", { locale: es })} ·{" "}
                            {o.total_productos} productos
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span
                            className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border",
                              info.cls
                            )}
                          >
                            {info.label}
                          </span>
                          <div className="font-serif text-base tabular-nums text-ink-900">
                            {fmtMoney(o.total)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tabla histórico completo */}
          <div>
            <h3 className="font-serif text-sm text-ink-700 italic mb-3">
              Histórico completo ({resto.length})
            </h3>
            <div className="border border-ink-100 rounded-xl overflow-hidden bg-white">
              <div
                className="grid items-center gap-3 px-5 py-3 text-[10px] uppercase tracking-wider text-ink-500 font-medium bg-bg-warm border-b border-ink-100"
                style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr" }}
              >
                <div>Folio</div>
                <div>Fecha</div>
                <div>Productos</div>
                <div className="text-right">Total</div>
                <div>Status</div>
                <div>Pago</div>
              </div>
              {resto.length === 0 && (
                <div className="px-5 py-10 text-center text-sm italic text-ink-500">
                  Sin resultados con este filtro
                </div>
              )}
              {resto.map((o) => {
                const info = statusInfo(o);
                const pago = pagoInfo(o);
                return (
                  <div
                    key={o.id}
                    className="grid items-center gap-3 px-5 py-3 text-sm border-b last:border-b-0 border-ink-50 hover:bg-bg-warm transition-colors"
                    style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr" }}
                  >
                    <button
                      onClick={() => navigate(`/compras/oc/${o.id}`)}
                      className="text-left text-crimson-700 hover:text-crimson-900 font-medium truncate"
                    >
                      {o.folio}
                    </button>
                    <div className="text-ink-700">
                      {format(new Date(o.created_at), "d MMM yyyy", { locale: es })}
                    </div>
                    <div className="text-ink-700">
                      {o.total_productos} producto{o.total_productos !== 1 ? "s" : ""}
                    </div>
                    <div className="text-right tabular-nums text-ink-900">
                      {fmtMoney(o.total)}
                    </div>
                    <div>
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border",
                          info.cls
                        )}
                      >
                        {info.label}
                      </span>
                    </div>
                    <div className={cn("text-xs", pago.cls)}>{pago.text}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
