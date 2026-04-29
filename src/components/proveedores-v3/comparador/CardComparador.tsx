import { useNavigate } from "react-router-dom";
import { formatDistanceToNowStrict } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { StarRating } from "../StarRating";
import type { ComparadorRow } from "@/hooks/useComparadorPrecios";
import type { RatingValue } from "@/types/proveedor-v3";

const RATING_TEXT: Record<RatingValue, string> = {
  excelente: "text-green-700",
  bueno: "text-lime-700",
  regular: "text-amber-700",
  bajo: "text-orange-700",
  critico: "text-red-700",
  sin_historial: "text-ink-500",
};

const RATING_LABEL: Record<RatingValue, string> = {
  excelente: "Excelente",
  bueno: "Bueno",
  regular: "Regular",
  bajo: "Bajo",
  critico: "Crítico",
  sin_historial: "Sin historial",
};

const fmtMoney2 = (n: number | null | undefined) =>
  n === null || n === undefined
    ? "—"
    : "$" + Number(n).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const truncate = (s: string, max = 18) => (s.length > max ? s.slice(0, max - 1) + "…" : s);

interface Props {
  row: ComparadorRow;
  productoId: string;
  onCreateOC: () => void;
}

export const CardComparador = ({ row, productoId, onCreateOC }: Props) => {
  const navigate = useNavigate();
  const goodRating = row.score.rating === "excelente" || row.score.rating === "bueno";
  const unitSuffix = row.precio_por_kilo ? "/ kg" : "/ bulto";

  return (
    <div
      className={cn(
        "relative bg-white border rounded-xl p-[18px] pt-[20px] min-w-[280px] flex flex-col",
        row.isBestPrice ? "border-green-500 shadow-[0_0_0_1px_hsl(var(--green-500,142_71%_45%))]" : "border-ink-100"
      )}
      style={
        row.isBestPrice
          ? { boxShadow: "0 0 0 1px rgb(34 197 94)", borderColor: "rgb(34 197 94)" }
          : undefined
      }
    >
      {row.isBestPrice && (
        <div className="absolute -top-[10px] left-4 bg-green-500 text-white px-2.5 py-[3px] rounded-full text-[10px] font-bold uppercase tracking-wider">
          Mejor precio
        </div>
      )}

      <div className="font-serif text-[18px] font-medium text-ink-900 leading-tight mb-1 truncate">
        {row.proveedor_nombre}
      </div>

      <div className="mb-3">
        <StarRating score={row.score.score} size="sm" />
      </div>

      <div
        className={cn(
          "font-serif text-[32px] font-medium tabular-nums leading-none",
          row.isBestPrice ? "text-green-700" : "text-ink-900"
        )}
      >
        {row.ultimo_precio !== null ? fmtMoney2(row.ultimo_precio) : "—"}
      </div>

      <div className="font-serif italic text-xs text-ink-500 mt-1 mb-4">
        {row.ultimo_precio !== null ? (
          <>
            {unitSuffix}
            {row.ultimo_precio_fecha && (
              <>
                {" · última compra hace "}
                {formatDistanceToNowStrict(new Date(row.ultimo_precio_fecha), { locale: es })}
              </>
            )}
          </>
        ) : (
          "Sin compra histórica"
        )}
      </div>

      {/* Stats */}
      <div className="border-t border-ink-100 pt-3 flex flex-col gap-2 text-xs">
        <div className="flex justify-between items-center">
          <span className="text-ink-500">Score</span>
          <span className={cn("font-medium", RATING_TEXT[row.score.rating])}>
            {row.score.rating === "sin_historial"
              ? "Sin historial"
              : `${row.score.score ?? "—"}% ${RATING_LABEL[row.score.rating]}`}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-ink-500">% Completos</span>
          <span className="text-ink-700 tabular-nums">
            {row.score.porcentaje_completas !== null ? `${row.score.porcentaje_completas}%` : "—"}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-ink-500">Lead time</span>
          <span className="text-ink-700 tabular-nums">
            {row.score.lead_time_promedio !== null ? `${row.score.lead_time_promedio} días` : "—"}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-ink-500">Plazo pago</span>
          <span className="text-ink-700">
            {row.termino_pago && row.termino_pago !== "contado" ? row.termino_pago : "Contado"}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-ink-500">Saldo actual</span>
          <span className={cn("tabular-nums", row.saldo_vencido > 0 ? "text-red-700 font-medium" : "text-ink-700")}>
            {fmtMoney2(row.saldo_total)}
          </span>
        </div>
      </div>

      <button
        onClick={() => {
          onCreateOC();
          navigate(`/compras/nueva-oc-v3?proveedor=${row.proveedor_id}&producto=${productoId}`);
        }}
        className={cn(
          "mt-4 w-full py-2.5 rounded-lg text-sm font-medium transition-colors",
          goodRating
            ? "bg-crimson-700 text-white hover:bg-crimson-800"
            : "bg-white text-ink-700 border border-ink-100 hover:bg-bg-warm"
        )}
      >
        + Crear OC con {truncate(row.proveedor_nombre)}
      </button>
    </div>
  );
};
