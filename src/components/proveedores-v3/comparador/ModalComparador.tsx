import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useComparadorPrecios } from "@/hooks/useComparadorPrecios";
import { CardComparador } from "./CardComparador";
import { RATING_ORDER } from "@/hooks/useProveedoresV3";

interface Props {
  productoId: string;
  onClose: () => void;
}

export const ModalComparador = ({ productoId, onClose }: Props) => {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useComparadorPrecios(productoId);

  const productoNombre = data?.[0]?.producto_nombre ?? "Producto";
  const aplicaIva = data?.[0]?.aplica_iva ?? false;
  const aplicaIeps = data?.[0]?.aplica_ieps ?? false;

  // Footer: best price vs best score
  let footerMsg = "💡 Compara y elige según tu criterio.";
  if (data && data.length >= 2) {
    const withPrice = data.filter((r) => r.ultimo_precio !== null);
    const bestPrice = withPrice[0];
    const bestScore = [...data].sort(
      (a, b) =>
        RATING_ORDER[b.score.rating] - RATING_ORDER[a.score.rating] ||
        (b.score.score || 0) - (a.score.score || 0)
    )[0];
    if (bestPrice && bestScore && bestPrice.proveedor_id !== bestScore.proveedor_id) {
      footerMsg = `💡 Aunque ${bestPrice.proveedor_nombre} tenga mejor precio, ${bestScore.proveedor_nombre} tiene mejor confiabilidad. Tú decides.`;
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[1100px] max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-8 pt-7 pb-4 border-b border-ink-100">
          <div className="text-[10px] uppercase tracking-wider text-ink-500 font-medium">
            Comparador · mismo producto
          </div>
          <div className="flex items-center gap-3 mt-1">
            <h2 className="font-serif text-[32px] font-medium text-ink-900 leading-tight">
              {productoNombre}
            </h2>
            <div className="flex items-center gap-1 mt-1">
              {aplicaIva && (
                <span className="inline-flex items-center px-1.5 py-px rounded text-[10px] font-semibold tracking-wider uppercase bg-blue-50 text-blue-700">
                  IVA
                </span>
              )}
              {aplicaIeps && (
                <span className="inline-flex items-center px-1.5 py-px rounded text-[10px] font-semibold tracking-wider uppercase bg-amber-50 text-amber-700">
                  IEPS
                </span>
              )}
            </div>
          </div>
          <p className="font-serif italic text-sm text-ink-500 mt-1">
            {isLoading
              ? "Cargando…"
              : `${data?.length ?? 0} proveedores comparados · ordenados por precio (mejor primero)`}
          </p>
        </div>

        {/* Body */}
        <div className="px-8 py-5 overflow-y-auto flex-1 min-h-[380px]">
          {isLoading && (
            <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-[380px] rounded-xl" />
              ))}
            </div>
          )}

          {!isLoading && error && (
            <div className="py-16 text-center">
              <p className="text-sm text-red-700 mb-3">No se pudieron cargar los datos</p>
              <button
                onClick={() => refetch()}
                className="text-xs font-medium text-crimson-700 hover:text-crimson-900"
              >
                Reintentar
              </button>
            </div>
          )}

          {!isLoading && !error && (data?.length ?? 0) === 0 && (
            <div className="py-16 text-center">
              <div className="text-5xl mb-3">📦</div>
              <h3 className="font-serif text-xl text-ink-900 mb-2">
                Sin proveedores con este producto
              </h3>
              <p className="font-serif italic text-ink-500 mb-5">
                Asocia este producto a tus proveedores para comparar precios
              </p>
              <button
                onClick={() => {
                  onClose();
                  navigate("/compras/proveedores-v3");
                }}
                className="text-sm font-medium text-crimson-700 hover:text-crimson-900"
              >
                Ir a productos del proveedor
              </button>
            </div>
          )}

          {!isLoading && !error && (data?.length ?? 0) > 0 && (
            <div
              className={
                (data?.length ?? 0) > 4
                  ? "flex gap-3.5 overflow-x-auto snap-x snap-mandatory pb-2"
                  : "grid gap-3.5"
              }
              style={
                (data?.length ?? 0) > 4
                  ? undefined
                  : { gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }
              }
            >
              {data!.map((row) => (
                <div
                  key={row.proveedor_id}
                  className={(data?.length ?? 0) > 4 ? "snap-start min-w-[280px] flex-shrink-0 w-[280px]" : ""}
                >
                  <CardComparador row={row} productoId={productoId} onCreateOC={onClose} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-ink-100 bg-bg-warm flex justify-between items-center gap-4">
          <p className="font-serif italic text-sm text-ink-700 max-w-[560px]">{footerMsg}</p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-white text-ink-700 border border-ink-100 hover:bg-bg-warm transition-colors flex-shrink-0"
          >
            Cerrar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
