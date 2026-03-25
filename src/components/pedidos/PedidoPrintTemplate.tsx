import { COMPANY_DATA } from "@/constants/companyData";
import { QRCodeSVG } from "qrcode.react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

interface ProductoPedido {
  cantidad: number;
  unidad: string;
  descripcion: string;
  pesoTotal: number | null;
  precioUnitario: number;
  importe: number;
  precioPorKilo: boolean;
}

export interface DatosPedidoPrint {
  pedidoId?: string;
  folio: string;
  numeroDia?: number | null;
  fecha: string;
  vendedor: string;
  terminoCredito: string;
  cliente: { nombre: string; razonSocial?: string; rfc?: string; direccionFiscal?: string; telefono?: string };
  direccionEntrega?: string;
  sucursal?: { nombre: string; direccion?: string };
  productos: ProductoPedido[];
  subtotal: number;
  iva: number;
  ieps: number;
  total: number;
  pesoTotalKg: number;
  notas?: string;
}

export type VariantePrint = "original" | "almacen" | "confirmacion_cliente";

interface Props {
  datos: DatosPedidoPrint;
  hideQR?: boolean;
  variante?: VariantePrint;
}

const $$ = (n: number) => `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;
const kgFmt = (n: number) => `${n.toLocaleString("es-MX", { maximumFractionDigits: 2 })} kg`;
const plazoLetras: Record<string, string> = { contado: "Contado", "8_dias": "Ocho", "15_dias": "Quince", "30_dias": "Treinta", "60_dias": "Sesenta" };

const formatFecha = (raw: string): string => {
  try {
    const d = raw.includes("T") ? parseISO(raw) : new Date(raw);
    return format(d, "d 'de' MMMM 'de' yyyy", { locale: es });
  } catch {
    return raw;
  }
};

// Shared cell style for vertical centering
const vcell: React.CSSProperties = { verticalAlign: "middle" };

export const PedidoPrintTemplate = ({ datos, hideQR = false, variante }: Props) => {
  const dir = datos.sucursal?.direccion || datos.direccionEntrega || datos.cliente.direccionFiscal || "";
  const isAlm = variante === "almacen";
  const isOrig = variante === "original";
  const isConf = variante === "confirmacion_cliente";
  const showPrices = !isAlm;
  const b = COMPANY_DATA.datosBancarios;

  const varianteLabel = isOrig ? "NOTA DE VENTA" : isAlm ? "HOJA DE CARGA" : isConf ? "CONFIRMACIÓN" : "";

  // Fecha solo en hoja de carga
  const showFecha = isAlm;
  // Columnas de barra resumen: almacén muestra fecha; original/confirmación no
  const barCols = showFecha ? 3 : (showPrices ? 3 : 2);

  return (
    <div className="p-5 bg-white text-black w-[11in] min-h-[8.5in] mx-auto font-sans flex flex-col" style={{ fontSize: "11px" }}>

      {/* ══ HEADER ══ */}
      <div className="flex items-start justify-between border-b-2 border-black pb-2 mb-2">
        {/* Left: QR for almacen, empty spacer otherwise */}
        <div className="w-40 flex-shrink-0">
          {isAlm && datos.pedidoId && !hideQR && (
            <div className="flex flex-col items-center">
              <QRCodeSVG value={datos.folio} size={90} level="M" />
            </div>
          )}
        </div>

        {/* Center: desde 1904 + logo */}
        <div className="text-center flex-1">
          <p className="italic text-gray-500 mb-0.5" style={{ fontSize: "10px", letterSpacing: "1px" }}>Desde 1904</p>
          <img src="/logo-almasa-header.png" alt="ALMASA" className="h-14 w-auto object-contain mx-auto" />
        </div>

        {/* Right: variante label + folio */}
        <div className="w-56 flex-shrink-0 text-right flex flex-col items-end justify-center">
          <p className="font-bold uppercase text-gray-500 mb-0.5" style={{ fontSize: "10px", letterSpacing: "0.5px" }}>
            {varianteLabel}
          </p>
          <p className="font-black whitespace-nowrap" style={{ fontSize: "22px", lineHeight: 1.1, color: isAlm ? "#C8102E" : "#000" }}>
            {datos.folio}
          </p>
        </div>
      </div>

      {/* ══ DATOS CLIENTE ══ */}
      <div className="border border-gray-400 rounded mb-2">
        <div className="flex" style={{ minHeight: "56px" }}>
          <div className="flex-1 px-3 border-r border-gray-300 flex flex-col justify-center" style={{ paddingTop: "8px", paddingBottom: "8px" }}>
            <div className="flex items-center mb-1">
              <span className="font-bold text-gray-500 uppercase flex-shrink-0" style={{ fontSize: "9px" }}>Nombre:</span>
              <span className="ml-2 font-bold" style={{ fontSize: "15px" }}>{datos.cliente.nombre}</span>
            </div>
            {datos.sucursal?.nombre && (
              <div className="flex items-center mb-0.5">
                <span className="font-bold text-gray-500 uppercase flex-shrink-0" style={{ fontSize: "9px" }}>Sucursal:</span>
                <span className="ml-2 font-semibold" style={{ fontSize: "12px" }}>{datos.sucursal.nombre}</span>
              </div>
            )}
            <div className="flex items-center">
              <span className="font-bold text-gray-500 uppercase flex-shrink-0" style={{ fontSize: "9px" }}>Domicilio:</span>
              <span className="ml-2" style={{ fontSize: "12px" }}>
                {datos.sucursal?.direccion || dir || <span className="italic text-gray-400">Sin dirección</span>}
              </span>
            </div>
          </div>
          <div className="w-44 px-3 flex flex-col items-center justify-center" style={{ paddingTop: "8px", paddingBottom: "8px" }}>
            <span className="font-bold text-gray-500 uppercase" style={{ fontSize: "8px" }}>Vendedor</span>
            <div className="border-2 border-gray-400 rounded px-3 py-1 mt-1 text-center w-full">
              <p className="font-black" style={{ fontSize: "12px" }}>{datos.vendedor}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ══ BARRA RESUMEN ══ */}
      <div className={`grid grid-cols-${barCols} gap-0 border border-gray-400 rounded mb-2`} style={{ fontSize: "11px", minHeight: "36px" }}>
        {showFecha && (
          <div className="border-r border-gray-300 px-3 flex items-center" style={{ paddingTop: "6px", paddingBottom: "6px" }}>
            <span className="font-bold text-gray-500 uppercase" style={{ fontSize: "9px" }}>Fecha:</span>
            <span className="ml-1 font-semibold">{formatFecha(datos.fecha)}</span>
          </div>
        )}
        {showPrices && (
          <div className="border-r border-gray-300 px-3 flex items-center" style={{ paddingTop: "6px", paddingBottom: "6px" }}>
            <span className="font-bold text-gray-500 uppercase" style={{ fontSize: "9px" }}>Crédito:</span>
            <span className="ml-1 font-semibold">{datos.terminoCredito}</span>
          </div>
        )}
        <div className="border-r border-gray-300 px-3 flex items-center" style={{ paddingTop: "6px", paddingBottom: "6px" }}>
          <span className="font-bold text-gray-500 uppercase" style={{ fontSize: "9px" }}>Peso Total:</span>
          <span className="ml-1 font-semibold">{kgFmt(datos.pesoTotalKg)}</span>
        </div>
        <div className="px-3 flex items-center" style={{ paddingTop: "6px", paddingBottom: "6px" }}>
          <span className="font-bold text-gray-500 uppercase" style={{ fontSize: "9px" }}>Productos:</span>
          <span className="ml-1 font-semibold">{datos.productos.length}</span>
        </div>
      </div>

      {/* ══ CONFIRMACIÓN: título ══ */}
      {isConf && (
        <div className="mb-2">
          <h2 className="font-bold" style={{ fontSize: "14px" }}>Pedido Confirmado</h2>
          <p className="text-gray-600" style={{ fontSize: "11px" }}>Estimado(a) {datos.cliente.nombre}, su pedido ha sido confirmado.</p>
        </div>
      )}

      {/* ══ TABLA PRODUCTOS ══ */}
      <table className="w-full mb-2 border-collapse" style={{ tableLayout: "fixed" }}>
        <colgroup>
          {isAlm ? (
            <><col style={{ width: "14%" }} /><col style={{ width: "16%" }} /><col style={{ width: "70%" }} /></>
          ) : (
            <><col style={{ width: "10%" }} /><col style={{ width: "12%" }} /><col style={{ width: "42%" }} /><col style={{ width: "16%" }} /><col style={{ width: "20%" }} /></>
          )}
        </colgroup>
        <thead>
          <tr className="bg-gray-800 text-white" style={{ fontSize: "10px" }}>
            <th className="px-2 text-center border border-gray-700" style={{ ...vcell, paddingTop: "6px", paddingBottom: "6px" }}>CANT.</th>
            <th className="px-2 text-right border border-gray-700" style={{ ...vcell, paddingTop: "6px", paddingBottom: "6px" }}>PESO</th>
            <th className="px-2 text-left border border-gray-700" style={{ ...vcell, paddingTop: "6px", paddingBottom: "6px" }}>DETALLE</th>
            {showPrices && <th className="px-2 text-right border border-gray-700" style={{ ...vcell, paddingTop: "6px", paddingBottom: "6px" }}>PRECIO U.</th>}
            {showPrices && <th className="px-2 text-right border border-gray-700" style={{ ...vcell, paddingTop: "6px", paddingBottom: "6px" }}>IMPORTE</th>}
          </tr>
        </thead>
        <tbody>
          {datos.productos.map((p, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
              <td className="px-2 border border-gray-300 text-center font-semibold" style={{ fontSize: "11px", ...vcell, paddingTop: "5px", paddingBottom: "5px" }}>{p.cantidad} {p.unidad.charAt(0).toUpperCase() + p.unidad.slice(1)}</td>
              <td className="px-2 border border-gray-300 text-right" style={{ fontSize: "11px", ...vcell, paddingTop: "5px", paddingBottom: "5px" }}>{p.pesoTotal ? `${p.pesoTotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })} kg` : "—"}</td>
              <td className="px-2 border border-gray-300" style={{ fontSize: "11px", ...vcell, paddingTop: "5px", paddingBottom: "5px" }}>{p.descripcion}</td>
              {showPrices && <td className="px-2 border border-gray-300 text-right" style={{ fontSize: "11px", ...vcell, paddingTop: "5px", paddingBottom: "5px" }}>{$$(p.precioUnitario)}{p.precioPorKilo && <span style={{ fontSize: "9px" }}>/kg</span>}</td>}
              {showPrices && <td className="px-2 border border-gray-300 text-right font-semibold" style={{ fontSize: "11px", ...vcell, paddingTop: "5px", paddingBottom: "5px" }}>{$$(p.importe)}</td>}
            </tr>
          ))}
        </tbody>
      </table>

      {/* ══ TOTALES — original y confirmación ══ */}
      {showPrices && (
        <div className="flex justify-between items-start mb-2 gap-4">
          <div className="flex-1">
            {datos.notas && (
              <div className="border border-gray-300 rounded p-2" style={{ fontSize: "10px" }}>
                <p className="font-bold uppercase text-gray-500 mb-0.5" style={{ fontSize: "9px" }}>Notas</p>
                <p>{datos.notas}</p>
              </div>
            )}
          </div>
          <table className="border-collapse" style={{ fontSize: "11px", width: "240px" }}>
            <tbody>
              {datos.pesoTotalKg > 0 && <tr><td className="p-1 font-semibold text-right border border-gray-300" style={vcell}>Peso Total:</td><td className="p-1 text-right border border-gray-300 font-mono" style={vcell}>{kgFmt(datos.pesoTotalKg)}</td></tr>}
              <tr><td className="p-1 font-semibold text-right border border-gray-300" style={vcell}>Subtotal:</td><td className="p-1 text-right border border-gray-300 font-mono" style={vcell}>{$$(datos.subtotal)}</td></tr>
              <tr><td className="p-1 font-semibold text-right border border-gray-300" style={vcell}>IVA (16%):</td><td className="p-1 text-right border border-gray-300 font-mono" style={vcell}>{$$(datos.iva)}</td></tr>
              {datos.ieps > 0 && <tr><td className="p-1 font-semibold text-right border border-gray-300" style={vcell}>IEPS (8%):</td><td className="p-1 text-right border border-gray-300 font-mono" style={vcell}>{$$(datos.ieps)}</td></tr>}
              <tr className="bg-black text-white"><td className="p-1.5 font-bold text-right" style={vcell}>TOTAL:</td><td className="p-1.5 text-right font-bold font-mono" style={{ fontSize: "14px", ...vcell }}>{$$(datos.total)}</td></tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ══ RESUMEN BULTOS + PESO TOTAL — solo almacén ══ */}
      {isAlm && (() => {
        const porUnidad: Record<string, number> = {};
        datos.productos.forEach(p => {
          const u = p.unidad.charAt(0).toUpperCase() + p.unidad.slice(1);
          porUnidad[u] = (porUnidad[u] || 0) + p.cantidad;
        });
        const totalPiezas = Object.values(porUnidad).reduce((s, n) => s + n, 0);
        const detalle = Object.entries(porUnidad).map(([u, c]) => `${c} ${u}`).join("  |  ");
        return (
          <div className="flex items-center justify-between mb-2 gap-4">
            <div className="flex-1 border border-gray-400 rounded px-4 flex items-center gap-2" style={{ paddingTop: "6px", paddingBottom: "6px" }}>
              <span className="font-bold uppercase text-gray-500" style={{ fontSize: "10px" }}>Total piezas:</span>
              <span className="font-bold" style={{ fontSize: "14px" }}>{totalPiezas}</span>
              <span className="text-gray-400 mx-1">—</span>
              <span className="font-semibold text-gray-700" style={{ fontSize: "12px" }}>{detalle}</span>
            </div>
            <div className="bg-gray-100 border border-gray-400 rounded px-4 flex items-center gap-2" style={{ paddingTop: "6px", paddingBottom: "6px" }}>
              <span className="font-bold uppercase text-gray-500" style={{ fontSize: "10px" }}>Peso Total:</span>
              <span className="font-bold" style={{ fontSize: "16px" }}>{kgFmt(datos.pesoTotalKg)}</span>
            </div>
          </div>
        );
      })()}

      {/* ══ DATOS BANCARIOS — original y confirmación ══ */}
      {(isOrig || isConf) && (
        <div className="text-gray-600 mb-2 border-t border-gray-300 pt-1" style={{ fontSize: "9px" }}>
          <span className="font-bold uppercase">Datos Bancarios:</span>{" "}
          {b.beneficiario} | {b.banco} | Cta: {b.cuenta} | CLABE: {b.clabe} | {COMPANY_DATA.emails.pagos}
        </div>
      )}

      {/* ══ CONFIRMACIÓN: aviso variación ══ */}
      {isConf && (
        <div className="border-2 rounded p-2 mb-2" style={{ fontSize: "10px", borderColor: "#d97706", backgroundColor: "#fffbeb" }}>
          <p style={{ color: "#92400e", fontWeight: 700 }}>AVISO: Las cantidades y el total pueden variar hasta el momento de la entrega debido a diferencias de peso en báscula u otros ajustes.</p>
        </div>
      )}

      {/* ══ FIRMAS + CONFORMIDAD — solo HOJA DE CARGA (almacén) ══ */}
      {isAlm && (
        <div className="mb-2 mt-1">
          <div className="border border-gray-400 rounded p-2 mb-2" style={{ fontSize: "9px" }}>
            <p className="font-bold uppercase mb-1" style={{ fontSize: "10px", color: "#C8102E" }}>Aviso Importante</p>
            <p className="text-gray-600 leading-snug">FAVOR DE REVISAR SU PEDIDO COMPLETO A LA LLEGADA. RECIBIDA LA MERCANCÍA NO SE ADMITEN RECLAMACIONES NI CAMBIOS.</p>
            <p className="text-gray-500 mt-1">Quejas: {COMPANY_DATA.telefonos.principal}</p>
          </div>
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center pt-8 border-t-2 border-black">
              <p className="font-semibold text-gray-600" style={{ fontSize: "10px" }}>Nombre y firma del cliente</p>
            </div>
            <div className="text-center pt-8 border-t-2 border-black">
              <p className="font-semibold text-gray-600" style={{ fontSize: "10px" }}>Fecha de recepción</p>
            </div>
            <div className="text-center pt-8 border-t-2 border-black">
              <p className="font-semibold text-gray-600" style={{ fontSize: "10px" }}>Sello del cliente</p>
            </div>
          </div>
        </div>
      )}

      {/* ══ FOOTER ══ */}
      <div className="mt-auto border-t border-gray-200 pt-1.5 flex items-end justify-between">
        <div className="text-gray-400 leading-tight" style={{ fontSize: "8px" }}>
          <p className="font-semibold text-gray-500" style={{ fontSize: "8.5px" }}>{COMPANY_DATA.razonSocialLarga}</p>
          <p>RFC: {COMPANY_DATA.rfc} | Régimen: {COMPANY_DATA.regimenFiscalDescripcion}</p>
          <p>{COMPANY_DATA.direccionCompletaMayusculas}</p>
          <p>Tel: {COMPANY_DATA.telefonosFormateados} | {COMPANY_DATA.emails.ventas}</p>
        </div>
        <p className="font-black uppercase tracking-widest" style={{ fontSize: "10px", color: isAlm ? "#333" : "#C8102E" }}>
          {varianteLabel}
        </p>
      </div>
    </div>
  );
};
