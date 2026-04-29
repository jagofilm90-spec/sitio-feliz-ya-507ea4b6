import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { type LineaOC, type ProveedorLite, type TipoPlazo, calcularSubtotalLinea } from "./types";

interface Props {
  proveedor: ProveedorLite | null;
  plazoTipo: TipoPlazo | null;
  plazoOtroDias: number;
  lineas: LineaOC[];
  submitting: boolean;
  onSubmit: () => void;
  onSaveDraft: () => void;
  validationError: string | null;
}

const formatMoney = (n: number) =>
  n.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2, maximumFractionDigits: 2 });

function plazoLabel(t: TipoPlazo | null, otroDias: number): string {
  if (!t) return "—";
  if (t === "contado") return "Contado";
  if (t === "anticipado") return "Anticipado";
  if (t === "otro") return otroDias > 0 ? `${otroDias} días` : "Otro";
  return `${t} días`;
}

export default function SidebarTotales({
  proveedor,
  plazoTipo,
  plazoOtroDias,
  lineas,
  submitting,
  onSubmit,
  onSaveDraft,
  validationError,
}: Props) {
  const subtotalBruto = lineas.reduce((acc, l) => acc + calcularSubtotalLinea(l), 0);
  // Asumimos precios con IVA incluido: subtotal sin iva = bruto / 1.16
  const subtotal = subtotalBruto / 1.16;
  const iva = subtotalBruto - subtotal;
  const ieps = 0;
  const total = subtotalBruto + ieps;

  const disabled = submitting || !!validationError;

  const submitBtn = (
    <Button onClick={onSubmit} disabled={disabled} className="w-full" size="lg">
      {submitting ? "Creando..." : "Crear orden de compra"}
    </Button>
  );

  return (
    <aside className="w-[320px] shrink-0">
      <div className="sticky top-6 space-y-4">
        <div
          className={
            proveedor
              ? "rounded-xl border border-crimson-200 bg-crimson-50/40 p-5"
              : "rounded-xl border border-dashed border-ink-200 bg-bg-soft p-5"
          }
        >
          <p className="text-[10px] uppercase tracking-[0.18em] text-crimson-700 font-medium mb-2">
            Proveedor
          </p>
          {proveedor ? (
            <>
              <p className="font-serif italic text-xl text-ink-900 leading-tight">{proveedor.nombre}</p>
              {proveedor.rfc && <p className="text-xs text-ink-500 mt-1 tabular-nums">{proveedor.rfc}</p>}
              <p className="text-xs text-ink-600 mt-3">
                Plazo: <span className="text-ink-900">{plazoLabel(plazoTipo, plazoOtroDias)}</span>
              </p>
            </>
          ) : (
            <p className="font-serif italic text-base text-ink-400">Aún no seleccionado.</p>
          )}
        </div>

        <div className="rounded-xl border border-ink-100 bg-white p-5 shadow-xs-soft">
          <p className="text-[10px] uppercase tracking-[0.18em] text-ink-400 font-medium mb-4">Resumen</p>

          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-500">Productos</span>
              <span className="text-ink-900 tabular-nums">{lineas.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-500">Subtotal</span>
              <span className="text-ink-900 tabular-nums">{formatMoney(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-500">IVA (16%)</span>
              <span className="text-ink-900 tabular-nums">{formatMoney(iva)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-500">IEPS</span>
              <span className="text-ink-400 tabular-nums">{formatMoney(ieps)}</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-ink-100 flex justify-between items-baseline">
            <span className="text-[11px] uppercase tracking-[0.16em] text-ink-500">Total</span>
            <span className="font-serif text-2xl text-crimson-700 tabular-nums">{formatMoney(total)}</span>
          </div>
        </div>

        <div className="space-y-2">
          {validationError ? (
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0} className="block w-full">{submitBtn}</span>
                </TooltipTrigger>
                <TooltipContent side="left">{validationError}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            submitBtn
          )}
          <Button onClick={onSaveDraft} disabled={submitting} variant="secondary" className="w-full">
            Guardar borrador
          </Button>
        </div>
      </div>
    </aside>
  );
}
