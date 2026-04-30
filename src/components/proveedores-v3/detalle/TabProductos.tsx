import { useEffect, useState } from "react";

import { Pencil, Trash2 } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import { es } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { useProveedorProductos } from "@/hooks/useProveedorTabsData";
import { ModalComparador } from "@/components/proveedores-v3/comparador/ModalComparador";
import { ModalAsociarProducto } from "@/components/proveedores-v3/asociar-producto/ModalAsociarProducto";
import { useDesasociarProducto } from "@/hooks/useAsociarProducto";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const fmtMoney = (n: number | null | undefined) =>
  n === null || n === undefined
    ? "—"
    : "$" +
      Number(n).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Props {
  proveedorId: string;
  autoAsociar?: boolean;
  onAutoAsociarConsumido?: () => void;
}

type ModalState =
  | null
  | { mode: "create" }
  | { mode: "edit"; asociacionId: string };

export const TabProductos = ({ proveedorId, autoAsociar, onAutoAsociarConsumido }: Props) => {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useProveedorProductos(proveedorId);
  const [productoComparar, setProductoComparar] = useState<string | null>(null);
  const [modalAsociar, setModalAsociar] = useState<ModalState>(null);
  const [productoADesasociar, setProductoADesasociar] = useState<{
    id: string;
    nombre: string;
  } | null>(null);
  const desasociarMut = useDesasociarProducto(proveedorId);

  // Auto-open from ?accion=asociar
  useEffect(() => {
    if (autoAsociar) {
      setModalAsociar({ mode: "create" });
      onAutoAsociarConsumido?.();
    }
  }, [autoAsociar, onAutoAsociarConsumido]);

  const handleDesasociar = async () => {
    if (!productoADesasociar) return;
    await desasociarMut.mutateAsync(productoADesasociar.id);
    setProductoADesasociar(null);
  };

  return (
    <div>
      {/* Header */}
      <div className="px-8 pt-7 pb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-serif text-2xl text-ink-900 leading-tight">
            Productos <em className="italic text-ink-700">asociados</em>
          </h2>
          <p className="font-serif italic text-sm text-ink-500 mt-1">
            {isLoading
              ? "Cargando…"
              : `${data?.length ?? 0} productos · costo y último precio histórico`}
          </p>
        </div>
        <button
          onClick={() => setModalAsociar({ mode: "create" })}
          className="shrink-0 inline-flex items-center gap-1 px-3.5 py-2 rounded-lg text-xs font-medium bg-crimson-700 text-white hover:bg-crimson-800 transition-colors"
        >
          + Asociar producto
        </button>
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
          <p className="text-sm text-red-700 mb-3">No se pudo cargar productos</p>
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
          <div className="text-4xl mb-3">📦</div>
          <p className="font-serif italic text-ink-500 mb-4">Sin productos asociados activos</p>
          <button
            onClick={() => setModalAsociar({ mode: "create" })}
            className="text-sm font-medium text-crimson-700 hover:text-crimson-900"
          >
            + Asociar primer producto
          </button>
        </div>
      )}

      {/* Table */}
      {!isLoading && !error && (data?.length ?? 0) > 0 && (
        <div className="px-8 pb-8">
          <div className="border border-ink-100 rounded-xl overflow-hidden bg-white">
            {/* Header row */}
            <div
              className="grid items-center gap-3 px-5 py-3 text-[10px] uppercase tracking-wider text-ink-500 font-medium bg-bg-warm border-b border-ink-100"
              style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 140px" }}
            >
              <div>Producto</div>
              <div className="text-right">Costo base</div>
              <div className="text-right">Último precio</div>
              <div>Tendencia</div>
              <div>Tipo carga</div>
              <div className="text-right">Acciones</div>
            </div>
            {/* Rows */}
            {data!.map((p) => {
              const trend =
                p.ultimo_precio !== null && p.avg_3m !== null && p.avg_3m > 0
                  ? ((p.ultimo_precio - p.avg_3m) / p.avg_3m) * 100
                  : null;
              const sub = p.precio_por_kilo
                ? p.peso_kg
                  ? `kg · ${p.peso_kg} kg/bulto`
                  : "kg"
                : p.peso_kg
                  ? `bulto · ${p.peso_kg} kg promedio`
                  : "bulto";
              return (
                <div
                  key={p.id}
                  className="grid items-center gap-3 px-5 py-3.5 text-sm border-b last:border-b-0 border-ink-50 hover:bg-bg-warm transition-colors"
                  style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 140px" }}
                >
                  <div className="min-w-0">
                    <div className="font-medium text-ink-900 truncate">{p.nombre}</div>
                    <div className="text-xs text-ink-500 truncate">{sub}</div>
                    {(p.aplica_iva || p.aplica_ieps) && (
                      <div className="flex items-center gap-1 mt-1">
                        {p.aplica_iva && (
                          <span className="inline-flex items-center px-1.5 py-px rounded text-[10px] font-semibold tracking-wider uppercase bg-blue-50 text-blue-700">
                            IVA
                          </span>
                        )}
                        {p.aplica_ieps && (
                          <span className="inline-flex items-center px-1.5 py-px rounded text-[10px] font-semibold tracking-wider uppercase bg-amber-50 text-amber-700">
                            IEPS
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="tabular-nums text-ink-900">
                      {fmtMoney(p.costo_proveedor)}
                    </div>
                    <div className="text-xs text-ink-500">
                      {p.precio_por_kilo ? "/ kg" : "/ bulto"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="tabular-nums text-ink-900">
                      {fmtMoney(p.ultimo_precio)}
                      {p.ultimo_precio !== null && (
                        <span className="text-xs text-ink-500 ml-1">
                          {p.precio_por_kilo ? "/ kg" : "/ bulto"}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-ink-500">
                      {p.ultimo_precio_fecha
                        ? `hace ${formatDistanceToNowStrict(new Date(p.ultimo_precio_fecha), { locale: es })}`
                        : "—"}
                    </div>
                  </div>
                  <div className="text-xs">
                    {trend === null ? (
                      <span className="text-ink-500">—</span>
                    ) : trend > 5 ? (
                      <span className="text-red-700">↑ {Math.abs(trend).toFixed(1)}% vs prom.</span>
                    ) : trend < -5 ? (
                      <span className="text-green-700">
                        ↓ {Math.abs(trend).toFixed(1)}% vs prom.
                      </span>
                    ) : (
                      <span className="text-ink-500">→ estable</span>
                    )}
                  </div>
                  <div>
                    {p.tipo_carga_default ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-ink-50 text-ink-700 border border-ink-100">
                        {p.tipo_carga_default === "fija" ? "Fija" : "Libre"}
                      </span>
                    ) : (
                      <span className="text-ink-500 text-xs">—</span>
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => setProductoComparar(p.producto_id)}
                      className="px-2 py-1 rounded-md text-[11px] font-medium bg-crimson-50 text-crimson-700 hover:bg-crimson-100 transition-colors"
                      title="Comparar precios"
                    >
                      Comparar
                    </button>
                    <button
                      onClick={() => setModalAsociar({ mode: "edit", asociacionId: p.id })}
                      className="p-1.5 rounded-md text-ink-500 hover:text-ink-900 hover:bg-ink-50 transition-colors"
                      title="Editar asociación"
                      aria-label="Editar asociación"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() =>
                        setProductoADesasociar({ id: p.id, nombre: p.nombre })
                      }
                      className="p-1.5 rounded-md text-ink-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                      title="Desasociar producto"
                      aria-label="Desasociar producto"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {productoComparar && (
        <ModalComparador
          productoId={productoComparar}
          onClose={() => setProductoComparar(null)}
        />
      )}

      {modalAsociar && (
        <ModalAsociarProducto
          mode={modalAsociar.mode}
          proveedorId={proveedorId}
          asociacionId={modalAsociar.mode === "edit" ? modalAsociar.asociacionId : undefined}
          onClose={() => setModalAsociar(null)}
        />
      )}

      <AlertDialog
        open={!!productoADesasociar}
        onOpenChange={(o) => !o && setProductoADesasociar(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desasociar este producto?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{productoADesasociar?.nombre}</strong> dejará de aparecer en la lista
              de productos del proveedor. El histórico de OCs se mantiene intacto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={desasociarMut.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDesasociar();
              }}
              disabled={desasociarMut.isPending}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {desasociarMut.isPending ? "Desasociando…" : "Desasociar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
