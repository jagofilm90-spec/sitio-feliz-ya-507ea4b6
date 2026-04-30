import { type LineaOC } from "./types";

interface Props {
  linea: LineaOC;
}

const fmtFecha = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
};

export function PrecioHint({ linea }: Props) {
  const editado = Math.abs(linea.precio_unitario - linea.precio_sugerido_inicial) > 0.001;

  if (editado && linea.precio_origen !== 'primera_vez') {
    return (
      <div className="text-[10px] text-ink-500 mt-1 text-right italic">
        ✎ Editado manualmente
      </div>
    );
  }

  switch (linea.precio_origen) {
    case 'oc':
      return (
        <div className="text-[10px] text-blue-700 mt-1 text-right flex items-center justify-end gap-1.5">
          <span className="inline-block w-1 h-1 rounded-full bg-blue-600"></span>
          <span>
            Pre-llenado{linea.precio_oc_folio ? ` · ${linea.precio_oc_folio}` : ''}
          </span>
        </div>
      );

    case 'cotizacion':
      return (
        <div className="text-[10px] text-amber-700 mt-1 text-right">
          ☎ Cotización{linea.precio_vigente_desde ? ` del ${fmtFecha(linea.precio_vigente_desde)}` : ''}
        </div>
      );

    case 'fallback_catalogo':
      return (
        <div className="text-[10px] text-ink-500 mt-1 text-right">
          ○ Catálogo del proveedor
        </div>
      );

    case 'primera_vez':
      return (
        <div className="text-[10px] text-amber-700 mt-1 text-right">
          ⚠ Primera vez · captura precio
        </div>
      );

    default:
      return null;
  }
}