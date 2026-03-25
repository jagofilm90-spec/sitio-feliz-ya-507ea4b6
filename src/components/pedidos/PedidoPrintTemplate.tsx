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

export const PedidoPrintTemplate = ({ datos, hideQR = false, variante }: Props) => {
  const dir = datos.sucursal?.direccion || datos.direccionEntrega || datos.cliente.direccionFiscal || "";
  const isAlm = variante === "almacen";
  const isOrig = variante === "original";
  const isConf = variante === "confirmacion_cliente";
  const showPrices = !isAlm;
  const b = COMPANY_DATA.datosBancarios;

  const varianteLabel = isOrig ? "NOTA DE VENTA" : isAlm ? "HOJA DE CARGA" : isConf ? "CONFIRMACIÓN" : "";
  const showFecha = isAlm;

  // Sizes: media carta for almacen, full letter for others
  const pageW = isAlm ? "8.5in" : "11in";
  const pageMinH = isAlm ? "6.5in" : "8.5in";
  const baseFontSize = isAlm ? "9px" : "11px";
  const logoH = isAlm ? "h-10" : "h-14";
  const qrSize = isAlm ? 70 : 90;
  const folioSize = isAlm ? "18px" : "22px";
  const nombreSize = isAlm ? "13px" : "15px";
  const fieldSize = isAlm ? "10px" : "12px";
  const labelSize = isAlm ? "8px" : "9px";
  const thTdPad = isAlm ? "7px 6px" : "10px 8px";
  const clientPad = isAlm ? "10px 10px" : "14px 12px";
  const barPad = isAlm ? "8px 10px" : "12px 12px";
  const totalPad = isAlm ? "6px 8px" : "8px 10px";
  const totalBoldPad = isAlm ? "7px 8px" : "10px 10px";
  const prodFontSize = isAlm ? "9px" : "11px";
  const thFontSize = isAlm ? "8px" : "10px";

  return (
    <div
      className="bg-white text-black mx-auto font-sans flex flex-col"
      style={{ fontSize: baseFontSize, width: pageW, minHeight: pageMinH, padding: isAlm ? "12px" : "20px" }}
    >

      {/* ══ HEADER ══ */}
      <div className="flex items-start justify-between border-b-2 border-black" style={{ paddingBottom: "8px", marginBottom: "6px" }}>
        <div style={{ width: isAlm ? "80px" : "160px", flexShrink: 0 }}>
          {isAlm && datos.pedidoId && !hideQR && (
            <div className="flex flex-col items-center">
              <QRCodeSVG value={datos.folio} size={qrSize} level="M" />
            </div>
          )}
        </div>
        <div className="text-center flex-1">
          <p className="italic text-gray-500" style={{ fontSize: isAlm ? "8px" : "10px", letterSpacing: "1px", marginBottom: "0px" }}>Desde 1904</p>
          <img src="/logo-almasa-header.png" alt="ALMASA" className={`${logoH} w-auto object-contain mx-auto`} />
        </div>
        <div style={{ width: isAlm ? "140px" : "224px", flexShrink: 0, textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "center" }}>
          <p className="font-bold uppercase text-gray-500" style={{ fontSize: isAlm ? "8px" : "10px", letterSpacing: "0.5px", marginBottom: "2px" }}>
            {varianteLabel}
          </p>
          <p className="font-black whitespace-nowrap" style={{ fontSize: folioSize, lineHeight: 1.1, color: isAlm ? "#C8102E" : "#000" }}>
            {datos.folio}
          </p>
        </div>
      </div>

      {/* ══ DATOS CLIENTE ══ */}
      <table className="w-full border border-gray-400 border-collapse" style={{ marginBottom: "6px" }}>
        <tbody>
          <tr>
            <td className="border-r border-gray-300" style={{ padding: clientPad }}>
              <div style={{ marginBottom: "4px" }}>
                <span className="font-bold text-gray-500 uppercase" style={{ fontSize: labelSize }}>Nombre:</span>
                <span className="ml-2 font-bold" style={{ fontSize: nombreSize }}>{datos.cliente.nombre}</span>
              </div>
              {datos.sucursal?.nombre && (
                <div style={{ marginBottom: "2px" }}>
                  <span className="font-bold text-gray-500 uppercase" style={{ fontSize: labelSize }}>Sucursal:</span>
                  <span className="ml-2 font-semibold" style={{ fontSize: fieldSize }}>{datos.sucursal.nombre}</span>
                </div>
              )}
              <div>
                <span className="font-bold text-gray-500 uppercase" style={{ fontSize: labelSize }}>Domicilio:</span>
                <span className="ml-2" style={{ fontSize: fieldSize }}>
                  {datos.sucursal?.direccion || dir || <span className="italic text-gray-400">Sin dirección</span>}
                </span>
              </div>
            </td>
            <td style={{ padding: clientPad, width: isAlm ? "130px" : "176px", textAlign: "center" }}>
              <span className="font-bold text-gray-500 uppercase" style={{ fontSize: isAlm ? "7px" : "8px" }}>Vendedor</span>
              <div className="border-2 border-gray-400 rounded" style={{ padding: "4px 8px", marginTop: "4px" }}>
                <p className="font-black" style={{ fontSize: fieldSize }}>{datos.vendedor}</p>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ══ BARRA RESUMEN ══ */}
      <table className="w-full border border-gray-400 border-collapse" style={{ marginBottom: "6px" }}>
        <tbody>
          <tr>
            {showFecha && (
              <td className="border-r border-gray-300" style={{ padding: barPad }}>
                <span className="font-bold text-gray-500 uppercase" style={{ fontSize: labelSize }}>Fecha:</span>
                <span className="ml-1 font-semibold">{formatFecha(datos.fecha)}</span>
              </td>
            )}
            {showPrices && (
              <td className="border-r border-gray-300" style={{ padding: barPad }}>
                <span className="font-bold text-gray-500 uppercase" style={{ fontSize: labelSize }}>Crédito:</span>
                <span className="ml-1 font-semibold">{datos.terminoCredito}</span>
              </td>
            )}
            <td className="border-r border-gray-300" style={{ padding: barPad }}>
              <span className="font-bold text-gray-500 uppercase" style={{ fontSize: labelSize }}>Peso Total:</span>
              <span className="ml-1 font-semibold">{kgFmt(datos.pesoTotalKg)}</span>
            </td>
            <td style={{ padding: barPad }}>
              <span className="font-bold text-gray-500 uppercase" style={{ fontSize: labelSize }}>Productos:</span>
              <span className="ml-1 font-semibold">{datos.productos.length}</span>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ══ CONFIRMACIÓN: título ══ */}
      {isConf && (
        <div style={{ marginBottom: "6px" }}>
          <h2 className="font-bold" style={{ fontSize: "14px" }}>Pedido Confirmado</h2>
          <p className="text-gray-600" style={{ fontSize: "11px" }}>Estimado(a) {datos.cliente.nombre}, su pedido ha sido confirmado.</p>
        </div>
      )}

      {/* ══ TABLA PRODUCTOS ══ */}
      <table className="w-full border-collapse" style={{ tableLayout: "fixed", marginBottom: "6px" }}>
        <colgroup>
          {isAlm ? (
            <><col style={{ width: "14%" }} /><col style={{ width: "16%" }} /><col style={{ width: "70%" }} /></>
          ) : (
            <><col style={{ width: "10%" }} /><col style={{ width: "12%" }} /><col style={{ width: "42%" }} /><col style={{ width: "16%" }} /><col style={{ width: "20%" }} /></>
          )}
        </colgroup>
        <thead>
          <tr className="bg-gray-800 text-white" style={{ fontSize: thFontSize }}>
            <th className="text-center border border-gray-700" style={{ padding: thTdPad }}>CANT.</th>
            <th className="text-right border border-gray-700" style={{ padding: thTdPad }}>PESO</th>
            <th className="text-left border border-gray-700" style={{ padding: thTdPad }}>DETALLE</th>
            {showPrices && <th className="text-right border border-gray-700" style={{ padding: thTdPad }}>PRECIO U.</th>}
            {showPrices && <th className="text-right border border-gray-700" style={{ padding: thTdPad }}>IMPORTE</th>}
          </tr>
        </thead>
        <tbody>
          {datos.productos.map((p, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
              <td className="border border-gray-300 text-center font-semibold" style={{ fontSize: prodFontSize, padding: thTdPad }}>{p.cantidad} {p.unidad.charAt(0).toUpperCase() + p.unidad.slice(1)}</td>
              <td className="border border-gray-300 text-right" style={{ fontSize: prodFontSize, padding: thTdPad }}>{p.pesoTotal ? `${p.pesoTotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })} kg` : "—"}</td>
              <td className="border border-gray-300" style={{ fontSize: prodFontSize, padding: thTdPad }}>{p.descripcion}</td>
              {showPrices && <td className="border border-gray-300 text-right" style={{ fontSize: prodFontSize, padding: thTdPad }}>{$$(p.precioUnitario)}{p.precioPorKilo && <span style={{ fontSize: "9px" }}>/kg</span>}</td>}
              {showPrices && <td className="border border-gray-300 text-right font-semibold" style={{ fontSize: prodFontSize, padding: thTdPad }}>{$$(p.importe)}</td>}
            </tr>
          ))}
        </tbody>
      </table>

      {/* ══ TOTALES — original y confirmación ══ */}
      {showPrices && (
        <div className="flex justify-between items-start gap-4" style={{ marginBottom: "6px" }}>
          <div className="flex-1">
            {datos.notas && (
              <div className="border border-gray-300 rounded" style={{ padding: "8px", fontSize: "10px" }}>
                <p className="font-bold uppercase text-gray-500" style={{ fontSize: "9px", marginBottom: "2px" }}>Notas</p>
                <p>{datos.notas}</p>
              </div>
            )}
          </div>
          <table className="border-collapse" style={{ fontSize: "11px", width: "240px" }}>
            <tbody>
              {datos.pesoTotalKg > 0 && <tr><td className="font-semibold text-right border border-gray-300" style={{ padding: totalPad }}>Peso Total:</td><td className="text-right border border-gray-300 font-mono" style={{ padding: totalPad }}>{kgFmt(datos.pesoTotalKg)}</td></tr>}
              <tr><td className="font-semibold text-right border border-gray-300" style={{ padding: totalPad }}>Subtotal:</td><td className="text-right border border-gray-300 font-mono" style={{ padding: totalPad }}>{$$(datos.subtotal)}</td></tr>
              <tr><td className="font-semibold text-right border border-gray-300" style={{ padding: totalPad }}>IVA (16%):</td><td className="text-right border border-gray-300 font-mono" style={{ padding: totalPad }}>{$$(datos.iva)}</td></tr>
              {datos.ieps > 0 && <tr><td className="font-semibold text-right border border-gray-300" style={{ padding: totalPad }}>IEPS (8%):</td><td className="text-right border border-gray-300 font-mono" style={{ padding: totalPad }}>{$$(datos.ieps)}</td></tr>}
              <tr className="bg-black text-white"><td className="font-bold text-right" style={{ padding: totalBoldPad }}>TOTAL:</td><td className="text-right font-bold font-mono" style={{ fontSize: "14px", padding: totalBoldPad }}>{$$(datos.total)}</td></tr>
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
        const bultosPad = isAlm ? "8px 12px" : "10px 16px";
        return (
          <table className="w-full border-collapse" style={{ marginBottom: "6px" }}>
            <tbody>
              <tr>
                <td className="border border-gray-400" style={{ padding: bultosPad }}>
                  <span className="font-bold uppercase text-gray-500" style={{ fontSize: isAlm ? "9px" : "10px" }}>Total piezas: </span>
                  <span className="font-semibold text-gray-700" style={{ fontSize: isAlm ? "10px" : "12px" }}>{totalPiezas}</span>
                  <span className="text-gray-400" style={{ margin: "0 6px" }}>—</span>
                  <span className="font-semibold text-gray-700" style={{ fontSize: isAlm ? "10px" : "12px" }}>{detalle}</span>
                </td>
                <td className="bg-gray-100 border border-gray-400 text-right" style={{ padding: bultosPad, width: isAlm ? "170px" : "220px" }}>
                  <span className="font-bold uppercase text-gray-500" style={{ fontSize: isAlm ? "9px" : "10px" }}>Peso Total: </span>
                  <span className="font-bold" style={{ fontSize: isAlm ? "13px" : "16px" }}>{kgFmt(datos.pesoTotalKg)}</span>
                </td>
              </tr>
            </tbody>
          </table>
        );
      })()}

      {/* ══ DATOS BANCARIOS — original y confirmación ══ */}
      {(isOrig || isConf) && (
        <div className="text-gray-600 border-t border-gray-300" style={{ fontSize: "9px", marginBottom: "6px", paddingTop: "4px" }}>
          <span className="font-bold uppercase">Datos Bancarios:</span>{" "}
          {b.beneficiario} | {b.banco} | Cta: {b.cuenta} | CLABE: {b.clabe} | {COMPANY_DATA.emails.pagos}
        </div>
      )}

      {/* ══ CONFIRMACIÓN: aviso variación ══ */}
      {isConf && (
        <div className="border-2 rounded" style={{ fontSize: "10px", borderColor: "#d97706", backgroundColor: "#fffbeb", padding: "8px", marginBottom: "6px" }}>
          <p style={{ color: "#92400e", fontWeight: 700 }}>AVISO: Las cantidades y el total pueden variar hasta el momento de la entrega debido a diferencias de peso en báscula u otros ajustes.</p>
        </div>
      )}

      {/* ══ FIRMAS + CONFORMIDAD — solo HOJA DE CARGA (almacén) ══ */}
      {isAlm && (
        <div style={{ marginBottom: "6px", marginTop: "4px" }}>
          <div className="border border-gray-400 rounded" style={{ padding: "6px", marginBottom: "6px", fontSize: isAlm ? "8px" : "9px" }}>
            <p className="font-bold uppercase" style={{ fontSize: isAlm ? "8px" : "10px", color: "#C8102E", marginBottom: "2px" }}>Aviso Importante</p>
            <p className="text-gray-600 leading-snug">FAVOR DE REVISAR SU PEDIDO COMPLETO A LA LLEGADA. RECIBIDA LA MERCANCÍA NO SE ADMITEN RECLAMACIONES NI CAMBIOS.</p>
            <p className="text-gray-500" style={{ marginTop: "2px" }}>Quejas: {COMPANY_DATA.telefonos.principal}</p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center border-t-2 border-black" style={{ paddingTop: isAlm ? "16px" : "32px" }}>
              <p className="font-semibold text-gray-600" style={{ fontSize: isAlm ? "8px" : "10px" }}>Nombre y firma del cliente</p>
            </div>
            <div className="text-center border-t-2 border-black" style={{ paddingTop: isAlm ? "16px" : "32px" }}>
              <p className="font-semibold text-gray-600" style={{ fontSize: isAlm ? "8px" : "10px" }}>Fecha de recepción</p>
            </div>
            <div className="text-center border-t-2 border-black" style={{ paddingTop: isAlm ? "16px" : "32px" }}>
              <p className="font-semibold text-gray-600" style={{ fontSize: isAlm ? "8px" : "10px" }}>Sello del cliente</p>
            </div>
          </div>
        </div>
      )}

      {/* ══ FOOTER ══ */}
      <div className="mt-auto border-t border-gray-200 flex items-end justify-between" style={{ paddingTop: "6px" }}>
        <div className="text-gray-400 leading-tight" style={{ fontSize: isAlm ? "7px" : "8px" }}>
          <p className="font-semibold text-gray-500" style={{ fontSize: isAlm ? "7px" : "8.5px" }}>{COMPANY_DATA.razonSocialLarga}</p>
          <p>RFC: {COMPANY_DATA.rfc} | Régimen: {COMPANY_DATA.regimenFiscalDescripcion}</p>
          <p>{COMPANY_DATA.direccionCompletaMayusculas}</p>
          <p>Tel: {COMPANY_DATA.telefonosFormateados} | {COMPANY_DATA.emails.ventas}</p>
        </div>
        <p className="font-black uppercase tracking-widest" style={{ fontSize: isAlm ? "8px" : "10px", color: isAlm ? "#333" : "#C8102E" }}>
          {varianteLabel}
        </p>
      </div>
    </div>
  );
};
