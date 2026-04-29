import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { StarRating } from "../StarRating";
import { cn } from "@/lib/utils";
import type { ProveedorDetalleRow, KpisProveedor } from "@/hooks/useProveedorDetalle";
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

function antiguedad(created_at: string): string {
  const diff = (Date.now() - new Date(created_at).getTime()) / 86400000;
  if (diff < 365) return "Nuevo";
  const anios = Math.floor(diff / 365);
  return `${anios} año${anios > 1 ? "s" : ""} de relación`;
}

function termPagoTexto(termino_pago: string | null): string | null {
  if (!termino_pago) return null;
  const m = termino_pago.match(/(\d+)/);
  if (m) return `Plazo: ${m[1]} días`;
  if (termino_pago === "contado") return "Plazo: contado";
  return `Plazo: ${termino_pago}`;
}

interface Props {
  proveedor: ProveedorDetalleRow;
  kpis: KpisProveedor;
}

export const DetailHero = ({ proveedor, kpis }: Props) => {
  const navigate = useNavigate();
  const rating = kpis.score.rating;
  const score = kpis.score.score;
  const isSinHist = rating === "sin_historial";

  const ubicacion = [proveedor.municipio, proveedor.estado].filter(Boolean).join(", ");
  const anioAlta = new Date(proveedor.created_at).getFullYear();

  return (
    <div className="px-8 py-6 border-b border-ink-100">
      <div className="flex flex-col lg:flex-row lg:justify-between gap-6">
        {/* LEFT */}
        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-[0.12em] text-ink-500 font-medium mb-2">
            Proveedor · {antiguedad(proveedor.created_at)}
            {proveedor.categoria && ` · ${proveedor.categoria}`}
          </div>

          <h1 className="font-serif text-4xl text-ink-900 leading-none">
            {proveedor.nombre_comercial || proveedor.nombre}
            {proveedor.nombre_comercial && proveedor.nombre_comercial !== proveedor.nombre && (
              <span className="font-serif italic text-2xl text-ink-500 ml-3">
                {proveedor.nombre}
              </span>
            )}
          </h1>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500 mt-3">
            {proveedor.rfc && <span>RFC: {proveedor.rfc}</span>}
            {proveedor.rfc && (ubicacion || true) && <span className="text-ink-300">·</span>}
            {ubicacion && <span>📍 {ubicacion}</span>}
            {ubicacion && <span className="text-ink-300">·</span>}
            <span>📅 Cliente desde {anioAlta}</span>
            {termPagoTexto(proveedor.termino_pago) && (
              <>
                <span className="text-ink-300">·</span>
                <span>⏱ {termPagoTexto(proveedor.termino_pago)}</span>
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mt-5">
            <Button onClick={() => navigate(`/compras/nueva-oc-v3?proveedor=${proveedor.id}`)}>
              + Crear orden de compra
            </Button>
            {proveedor.telefono && (
              <Button
                variant="outline"
                onClick={() => (window.location.href = `tel:${proveedor.telefono}`)}
              >
                📞 Contactar
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() =>
                navigate(`/compras?tab=proveedores&accion=editar&id=${proveedor.id}`)
              }
            >
              ✏️ Editar
            </Button>
          </div>
        </div>

        {/* RIGHT — Score */}
        <div className="bg-gradient-to-br from-white to-amber-50/30 border border-amber-100 rounded-xl px-6 py-5 min-w-[220px] text-center self-start">
          <div className="text-[11px] uppercase tracking-[0.12em] text-ink-500 font-medium mb-2">
            Confiabilidad
          </div>
          <div className="flex justify-center mb-2">
            <StarRating score={score} size="lg" />
          </div>
          <div className={cn("font-serif text-2xl", RATING_TEXT[rating])}>
            {isSinHist
              ? "Sin historial"
              : `${score !== null ? Math.round(score) : 0}% ${RATING_LABEL[rating]}`}
          </div>
        </div>
      </div>
    </div>
  );
};
