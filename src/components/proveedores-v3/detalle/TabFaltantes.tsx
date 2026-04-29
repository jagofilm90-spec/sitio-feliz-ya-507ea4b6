import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useProveedorFaltantes } from "@/hooks/useProveedorTabsData";

type FilterKey = "pendientes" | "resueltos" | "todos";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "pendientes", label: "Pendientes" },
  { key: "resueltos", label: "Resueltos" },
  { key: "todos", label: "Todos" },
];

const TIPO_STYLES: Record<string, { label: string; cls: string }> = {
  peso: { label: "Peso", cls: "bg-amber-50 text-amber-800 border-amber-100" },
  cantidad: { label: "Cantidad", cls: "bg-blue-50 text-blue-700 border-blue-100" },
  ambos: { label: "Peso + Cantidad", cls: "bg-red-50 text-red-700 border-red-100" },
};

interface Props {
  proveedorId: string;
}

export const TabFaltantes = ({ proveedorId }: Props) => {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useProveedorFaltantes(proveedorId);
  const [filter, setFilter] = useState<FilterKey>("pendientes");

  const stats = useMemo(() => {
    const all = data || [];
    const pendientes = all.filter((f) => f.status === "pendiente").length;
    const resueltos = all.filter((f) => f.status !== "pendiente").length;
    const totalKg = all.reduce((s, f) => s + (f.peso_faltante || 0), 0);
    return { pendientes, resueltos, totalKg };
  }, [data]);

  const filtered = useMemo(() => {
    const all = data || [];
    if (filter === "pendientes") return all.filter((f) => f.status === "pendiente");
    if (filter === "resueltos") return all.filter((f) => f.status !== "pendiente");
    return all;
  }, [data, filter]);

  return (
    <div>
      {/* Header */}
      <div className="px-8 pt-7 pb-4">
        <h2 className="font-serif text-2xl text-ink-900 leading-tight">
          Faltantes <em className="italic text-ink-700">históricos</em>
        </h2>
        <p className="font-serif italic text-sm text-ink-500 mt-1">
          {isLoading
            ? "Cargando…"
            : `${stats.pendientes} pendientes · ${stats.resueltos} resueltos · ${stats.totalKg.toFixed(1)} kg total`}
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
          <p className="text-sm text-red-700 mb-3">No se pudo cargar faltantes</p>
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
          <p className="font-serif text-lg text-ink-900">Sin faltantes registrados</p>
          <p className="font-serif italic text-sm text-ink-500 mt-1">
            Este proveedor entrega completo
          </p>
        </div>
      )}

      {/* Content */}
      {!isLoading && !error && (data?.length ?? 0) > 0 && (
        <div className="px-8 pb-8 space-y-5">
          {/* Filtros */}
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

          {/* Tabla */}
          <div className="border border-ink-100 rounded-xl overflow-hidden bg-white">
            <div
              className="grid items-center gap-3 px-5 py-3 text-[10px] uppercase tracking-wider text-ink-500 font-medium bg-bg-warm border-b border-ink-100"
              style={{ gridTemplateColumns: "1fr 1fr 1.5fr 1fr 1fr 1fr" }}
            >
              <div>Fecha</div>
              <div>OC</div>
              <div>Producto</div>
              <div>Tipo</div>
              <div>Cantidad</div>
              <div>Status</div>
            </div>

            {filtered.length === 0 && (
              <div className="px-5 py-10 text-center text-sm italic text-ink-500">
                Sin resultados con este filtro
              </div>
            )}

            {filtered.map((f) => {
              const tipo = TIPO_STYLES[f.tipo_faltante] || TIPO_STYLES.cantidad;
              const cantidadText =
                f.tipo_faltante === "peso"
                  ? `${(f.peso_faltante || 0).toFixed(1)} kg`
                  : f.tipo_faltante === "cantidad"
                    ? `${f.cantidad_faltante} bultos`
                    : `${f.cantidad_faltante} bultos · ${(f.peso_faltante || 0).toFixed(1)} kg`;
              return (
                <div
                  key={f.id}
                  className="grid items-center gap-3 px-5 py-3 text-sm border-b last:border-b-0 border-ink-50 hover:bg-bg-warm transition-colors"
                  style={{ gridTemplateColumns: "1fr 1fr 1.5fr 1fr 1fr 1fr" }}
                >
                  <div className="text-ink-700">
                    {format(new Date(f.fecha_recepcion), "d MMM yyyy", { locale: es })}
                  </div>
                  <div>
                    {f.folio ? (
                      <button
                        onClick={() => navigate(`/compras/oc/${f.orden_compra_id}`)}
                        className="text-crimson-700 hover:text-crimson-900 font-medium"
                      >
                        {f.folio}
                      </button>
                    ) : (
                      <span className="text-ink-500">—</span>
                    )}
                  </div>
                  <div className="text-ink-900 truncate">{f.producto_nombre}</div>
                  <div>
                    <span
                      className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border",
                        tipo.cls
                      )}
                    >
                      {tipo.label}
                    </span>
                  </div>
                  <div className="tabular-nums text-ink-900">{cantidadText}</div>
                  <div>
                    {f.status === "pendiente" ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border bg-red-50 text-red-700 border-red-100">
                        Pendiente
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border bg-green-50 text-green-700 border-green-100">
                        Resuelto
                        {f.resolved_at
                          ? ` · ${format(new Date(f.resolved_at), "d MMM", { locale: es })}`
                          : ""}
                      </span>
                    )}
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
