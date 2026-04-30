import { useNavigate } from "react-router-dom";
import { Package, CheckCircle2, Scale, Clock, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StarRating } from "./StarRating";
import { cn } from "@/lib/utils";
import type { ProveedorEnriquecido, RatingValue } from "@/types/proveedor-v3";
import { formatCurrency } from "@/lib/currency";

interface SupplierCardProps {
  proveedor: ProveedorEnriquecido;
  onEdit?: (id: string) => void;
}

const RATING_BORDER: Record<RatingValue, string> = {
  excelente: "border-l-green-500",
  bueno: "border-l-lime-500",
  regular: "border-l-amber-500",
  bajo: "border-l-orange-500",
  critico: "border-l-red-500",
  sin_historial: "border-l-ink-200",
};

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

const fmtMoney = (n: number) => formatCurrency(n);

function colorForPct(value: number, thresholds: [number, number]): string {
  if (value >= thresholds[0]) return "text-green-700";
  if (value >= thresholds[1]) return "text-amber-700";
  return "text-red-700";
}

function buildTags(p: ProveedorEnriquecido): { text: string; tone: "warm" | "success" | "danger" | "warning" | "info" }[] {
  const tags: { text: string; tone: "warm" | "success" | "danger" | "warning" | "info" }[] = [];
  const now = Date.now();
  const altaMs = new Date(p.created_at).getTime();
  const diasAlta = (now - altaMs) / 86400000;
  const aniosRel = Math.floor(diasAlta / 365);

  if (p.saldo_vencido > 0) tags.push({ text: "⚠ Saldo vencido", tone: "danger" });
  if (p.faltantes_pendientes_30d > 0)
    tags.push({
      text: `${p.faltantes_pendientes_30d} faltante${p.faltantes_pendientes_30d > 1 ? "s" : ""} mes pasado`,
      tone: "warning",
    });

  if (p.ultima_oc_fecha) {
    const dias = (now - new Date(p.ultima_oc_fecha).getTime()) / 86400000;
    if (dias > 90) tags.push({ text: `⚠ Última OC hace ${Math.floor(dias / 30)} meses`, tone: "danger" });
  }

  if (diasAlta < 30) tags.push({ text: "🆕 Nuevo", tone: "info" });
  else if (aniosRel >= 1) tags.push({ text: `⏱ ${aniosRel} año${aniosRel > 1 ? "s" : ""} de relación`, tone: "warm" });

  return tags.slice(0, 3);
}

const TAG_STYLES = {
  warm: "bg-bg-warm text-ink-700 border-ink-100",
  success: "bg-green-50 text-green-700 border-green-100",
  danger: "bg-red-50 text-red-700 border-red-100",
  warning: "bg-amber-50 text-amber-800 border-amber-100",
  info: "bg-crimson-50 text-crimson-700 border-crimson-100",
};

export const SupplierCard = ({ proveedor: p, onEdit }: SupplierCardProps) => {
  const navigate = useNavigate();
  const rating = p.score.rating;
  const isSinHist = rating === "sin_historial";
  const tags = buildTags(p);

  const showAsociar = p.score.total_ocs === 0 && p.productos_count === 0;

  const handleCrearOC = () => navigate(`/compras/nueva-oc-v3?proveedor=${p.id}`);
  const handleDetalle = () => navigate(`/compras/proveedores-v3/${p.id}`);
  const handleCuenta = () => navigate(`/compras?tab=adeudos&proveedor=${p.id}`);

  return (
    <div
      className={cn(
        "bg-white border border-ink-100 rounded-xl border-l-4 p-6 sm:p-7 transition-all hover:border-ink-300 hover:shadow-sm-soft",
        RATING_BORDER[rating]
      )}
    >
      <div className="grid gap-6 md:grid-cols-[1fr_auto]">
        {/* LEFT */}
        <div className="min-w-0">
          {/* Top row: name + score */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-2">
            <div className="min-w-0">
              <h3 className="font-serif text-2xl text-ink-900 leading-tight">
                {p.nombre}
                {p.nombre_comercial && p.nombre_comercial !== p.nombre && (
                  <span className="font-serif italic text-base text-ink-500 ml-2">
                    {p.nombre_comercial}
                  </span>
                )}
              </h3>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-500 mt-1.5">
                {p.rfc && <span>RFC: {p.rfc}</span>}
                {p.categoria && <span>📦 {p.categoria}</span>}
                {p.nombre_contacto && <span>👤 {p.nombre_contacto}</span>}
                {p.telefono && <span>📞 {p.telefono}</span>}
              </div>
            </div>

            <div className="flex flex-col items-start sm:items-end gap-1.5 shrink-0">
              <StarRating score={p.score.score} size="md" />
              <div className={cn("text-[11px] uppercase tracking-wider font-semibold", RATING_TEXT[rating])}>
                {RATING_LABEL[rating]}
                {!isSinHist && p.score.score !== null && ` · ${Math.round(p.score.score)}%`}
              </div>
            </div>
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {tags.map((t, i) => (
                <span
                  key={i}
                  className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border",
                    TAG_STYLES[t.tone]
                  )}
                >
                  {t.text}
                </span>
              ))}
            </div>
          )}

          {/* Stats */}
          <div className="border-t border-ink-100 pt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <Stat
              icon={<Package size={11} />}
              label="Productos"
              value={String(p.productos_count)}
              sub="asociados"
            />
            <Stat
              icon={<CheckCircle2 size={11} />}
              label="Completos"
              value={
                isSinHist || p.score.porcentaje_completas === null
                  ? "—"
                  : `${Math.round(p.score.porcentaje_completas)}%`
              }
              valueClass={
                !isSinHist && p.score.porcentaje_completas !== null
                  ? colorForPct(p.score.porcentaje_completas, [90, 75])
                  : "text-ink-300"
              }
              sub={isSinHist ? "sin OCs aún" : "últimas 12 OCs"}
            />
            <Stat
              icon={<Scale size={11} />}
              label="Peso correcto"
              value={
                isSinHist || p.score.peso_correcto === null
                  ? "—"
                  : `${Math.round(p.score.peso_correcto)}%`
              }
              valueClass={
                !isSinHist && p.score.peso_correcto !== null
                  ? colorForPct(p.score.peso_correcto, [95, 90])
                  : "text-ink-300"
              }
              sub={isSinHist ? "sin recepciones" : "sobre lo pedido"}
            />
            <Stat
              icon={<Clock size={11} />}
              label="Lead time"
              value={
                isSinHist || p.score.lead_time_promedio === null
                  ? "—"
                  : `${p.score.lead_time_promedio.toFixed(1)} días`
              }
              valueClass={isSinHist ? "text-ink-300" : "text-ink-900"}
              sub={isSinHist ? "por validar" : "promedio real"}
            />
            <Stat
              icon={<Wallet size={11} />}
              label="Saldo"
              value={fmtMoney(p.saldo_total)}
              valueClass={p.saldo_vencido > 0 ? "text-red-700" : "text-ink-900"}
              sub={
                p.saldo_vencido > 0
                  ? `vencido ${p.dias_vencido_max} días`
                  : p.saldo_total === 0
                  ? "sin movimientos"
                  : p.fecha_pago_proxima
                  ? `venc. ${new Date(p.fecha_pago_proxima).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}`
                  : "—"
              }
            />
          </div>
        </div>

        {/* RIGHT — Actions */}
        <div className="flex flex-row md:flex-col gap-1.5 md:min-w-[160px]">
          <Button size="sm" className="text-xs" onClick={handleCrearOC}>
            + Crear OC
          </Button>
          <Button size="sm" variant="outline" className="text-xs" onClick={handleDetalle}>
            Ver detalle
          </Button>
          <Button size="sm" variant="outline" className="text-xs" onClick={handleCuenta}>
            Cuenta corriente
          </Button>
          {onEdit && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={() => onEdit(p.id)}
            >
              ✏️ Editar
            </Button>
          )}
          {p.saldo_vencido > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs border-red-200 text-red-700 hover:bg-red-50"
              onClick={handleCuenta}
            >
              ⚠ Pagar saldo
            </Button>
          )}
          {!p.activo && (
            <Button size="sm" variant="outline" className="text-xs">
              Reactivar
            </Button>
          )}
          {p.activo && p.saldo_vencido === 0 && showAsociar && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={() =>
                navigate(`/compras/proveedores-v3/${p.id}?tab=productos&accion=asociar`)
              }
            >
              Asociar productos
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

const Stat = ({
  icon,
  label,
  value,
  valueClass,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClass?: string;
  sub: string;
}) => (
  <div>
    <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] text-ink-500 font-medium">
      {icon}
      {label}
    </div>
    <div className={cn("font-serif text-lg tabular-nums leading-tight mt-0.5", valueClass || "text-ink-900")}>
      {value}
    </div>
    <div className="text-[11px] italic text-ink-500">{sub}</div>
  </div>
);
