import { format } from "date-fns";
import { es } from "date-fns/locale";
import { COMPANY_DATA } from "@/constants/companyData";
import { QRCodeSVG } from "qrcode.react";

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
const kg = (n: number) => `${n.toLocaleString("es-MX", { maximumFractionDigits: 2 })} kg`;
const plazoLetras: Record<string, string> = { contado: "Contado", "8_dias": "Ocho", "15_dias": "Quince", "30_dias": "Treinta", "60_dias": "Sesenta" };

export const PedidoPrintTemplate = ({ datos, hideQR = false, variante }: Props) => {
  const fechaFmt = format(new Date(datos.fecha), "dd 'de' MMMM 'de' yyyy", { locale: es });
  const dir = datos.sucursal?.direccion || datos.direccionEntrega || datos.cliente.direccionFiscal || "";
  const isAlm = variante === "almacen";
  const isOrig = variante === "original";
  const isConf = variante === "confirmacion_cliente";
  const showPrices = !isAlm;
  const b = COMPANY_DATA.datosBancarios;

  return (
    <div className="p-6 bg-white text-black min-h-[11in] w-[8.5in] mx-auto font-sans text-[11px] print:p-4 flex flex-col">

      {/* ══ HEADER ══ */}
      <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-1">
        <img src="/logo-almasa-header.png" alt="ALMASA" className="h-12 w-auto object-contain flex-shrink-0" />
        <div className="text-center flex-1 px-3">
          <h1 className="text-base font-black uppercase tracking-tight leading-tight">{COMPANY_DATA.razonSocial}</h1>
          <p className="text-[8px] text-gray-600 mt-0.5">RFC: {COMPANY_DATA.rfc} | Tel: {COMPANY_DATA.telefonosFormateados}</p>
          <p className="text-[8px] text-gray-600">{COMPANY_DATA.direccionCompletaMayusculas}</p>
        </div>
        <div className="text-right flex-shrink-0 flex flex-col items-center">
          {datos.pedidoId && !hideQR && (
            <QRCodeSVG value={datos.folio} size={isAlm ? 90 : 72} level="M" />
          )}
          <p className="text-[9px] font-black mt-1" style={{ color: "#C8102E" }}>{datos.folio}</p>
        </div>
      </div>
      <p className="text-center text-[9px] italic text-gray-500 mb-2">"{COMPANY_DATA.slogan}"</p>

      {/* ══ BARRA OPERATIVA (campos vacíos para llenar a mano) — solo original/almacen ══ */}
      {(isOrig || isAlm) && (
        <div className="flex gap-3 text-[9px] bg-gray-100 border border-gray-300 rounded px-2 py-1.5 mb-2">
          <span><b>Fecha:</b> <span className="text-gray-400">_____________</span></span>
          <span><b>Unidad:</b> <span className="text-gray-400">________</span></span>
          <span><b>N/N:</b> <span className="text-gray-400">____</span></span>
          <span><b>H/S:</b> <span className="text-gray-400">____</span></span>
          {isOrig && <span><b>Cargo:</b> <span className="text-gray-400">___________</span></span>}
          <span><b>Folio:</b> <span className="text-gray-400">________</span></span>
        </div>
      )}

      {/* ══ DATOS CLIENTE ══ */}
      <div className="border border-gray-400 rounded mb-2">
        <div className="grid grid-cols-[1fr_auto] gap-0">
          <div className="border-b border-r border-gray-300 px-2 py-1">
            <span className="text-[9px] font-bold text-gray-500 uppercase">Nombre:</span>
            <span className="ml-1 font-bold text-sm">{datos.cliente.nombre}</span>
          </div>
          <div className="border-b border-gray-300 px-2 py-1 w-40 text-center">
            <span className="text-[8px] font-bold text-gray-500 uppercase">Vendedor</span>
            <p className="font-black text-[10px] border border-gray-400 rounded px-1 py-0.5 mt-0.5">{datos.vendedor}</p>
          </div>
          <div className="px-2 py-1" style={{ gridColumn: "1 / -1" }}>
            <span className="text-[9px] font-bold text-gray-500 uppercase">Domicilio:</span>
            <span className="ml-1 text-[10px]">
              {datos.sucursal ? <>{datos.sucursal.nombre}{datos.sucursal.direccion ? ` — ${datos.sucursal.direccion}` : ""}</> : dir || <span className="italic text-gray-400">Misma dirección fiscal</span>}
            </span>
          </div>
        </div>
      </div>

      {/* ══ BARRA RESUMEN ══ */}
      <div className={`grid ${showPrices ? "grid-cols-3" : "grid-cols-2"} gap-0 border border-gray-400 rounded mb-2 text-[10px]`}>
        {showPrices && (
          <div className="border-r border-gray-300 px-2 py-1">
            <span className="font-bold text-[9px] text-gray-500 uppercase">Crédito:</span>
            <span className="ml-1 font-semibold">{datos.terminoCredito}</span>
          </div>
        )}
        <div className={`${showPrices ? "border-r border-gray-300" : ""} px-2 py-1`}>
          <span className="font-bold text-[9px] text-gray-500 uppercase">Peso Total:</span>
          <span className="ml-1 font-semibold">{kg(datos.pesoTotalKg)}</span>
        </div>
        <div className="px-2 py-1">
          <span className="font-bold text-[9px] text-gray-500 uppercase">Productos:</span>
          <span className="ml-1 font-semibold">{datos.productos.length}</span>
        </div>
      </div>

      {/* ══ CONFIRMACIÓN: título ══ */}
      {isConf && (
        <div className="mb-2">
          <h2 className="text-base font-bold">Pedido Confirmado</h2>
          <p className="text-[10px] text-gray-600">Estimado(a) {datos.cliente.nombre}, su pedido ha sido confirmado.</p>
        </div>
      )}

      {/* ══ TABLA DE PRODUCTOS ══ */}
      <table className="w-full mb-2 border-collapse" style={{ tableLayout: "fixed" }}>
        <colgroup>
          {isAlm ? (
            <><col style={{ width: "12%" }} /><col style={{ width: "15%" }} /><col style={{ width: "73%" }} /></>
          ) : (
            <><col style={{ width: "8%" }} /><col style={{ width: "12%" }} /><col style={{ width: "40%" }} /><col style={{ width: "16%" }} /><col style={{ width: "24%" }} /></>
          )}
        </colgroup>
        <thead>
          <tr className="bg-gray-800 text-white text-[9px]">
            <th className="p-1 text-center border border-gray-700">CANT.</th>
            <th className="p-1 text-right border border-gray-700">PESO</th>
            <th className="p-1 text-left border border-gray-700">DETALLE</th>
            {showPrices && <th className="p-1 text-right border border-gray-700">PRECIO U.</th>}
            {showPrices && <th className="p-1 text-right border border-gray-700">IMPORTE</th>}
          </tr>
        </thead>
        <tbody>
          {datos.productos.map((p, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
              <td className="p-1 border border-gray-300 text-center font-semibold text-[10px]">{p.cantidad} {p.unidad.charAt(0).toUpperCase() + p.unidad.slice(1)}</td>
              <td className="p-1 border border-gray-300 text-right text-[10px]">{p.pesoTotal ? `${p.pesoTotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })} kg` : "—"}</td>
              <td className="p-1 border border-gray-300 text-[10px]">{p.descripcion}</td>
              {showPrices && <td className="p-1 border border-gray-300 text-right text-[10px]">{$$(p.precioUnitario)}{p.precioPorKilo && <span className="text-[8px]">/kg</span>}</td>}
              {showPrices && <td className="p-1 border border-gray-300 text-right font-semibold text-[10px]">{$$(p.importe)}</td>}
            </tr>
          ))}
          {Array.from({ length: Math.max(0, 2 - datos.productos.length) }).map((_, i) => (
            <tr key={`e-${i}`}><td className="p-1 border border-gray-300">&nbsp;</td><td className="p-1 border border-gray-300" /><td className="p-1 border border-gray-300" />{showPrices && <td className="p-1 border border-gray-300" />}{showPrices && <td className="p-1 border border-gray-300" />}</tr>
          ))}
        </tbody>
      </table>

      {/* ══ TOTALES (solo si precios) ══ */}
      {showPrices && (
        <div className="flex justify-between items-start mb-2 gap-3">
          <div className="flex-1">{datos.notas && <div className="border border-gray-300 rounded p-2 text-[10px]"><p className="font-bold text-[9px] uppercase text-gray-500 mb-0.5">Notas</p><p>{datos.notas}</p></div>}</div>
          <table className="text-[10px] w-56 border-collapse">
            <tbody>
              {datos.pesoTotalKg > 0 && <tr><td className="p-1 font-semibold text-right border border-gray-300">Peso Total:</td><td className="p-1 text-right border border-gray-300 w-24 font-mono">{kg(datos.pesoTotalKg)}</td></tr>}
              <tr><td className="p-1 font-semibold text-right border border-gray-300">Subtotal:</td><td className="p-1 text-right border border-gray-300 font-mono">{$$(datos.subtotal)}</td></tr>
              <tr><td className="p-1 font-semibold text-right border border-gray-300">IVA (16%):</td><td className="p-1 text-right border border-gray-300 font-mono">{$$(datos.iva)}</td></tr>
              {datos.ieps > 0 && <tr><td className="p-1 font-semibold text-right border border-gray-300">IEPS (8%):</td><td className="p-1 text-right border border-gray-300 font-mono">{$$(datos.ieps)}</td></tr>}
              <tr className="bg-black text-white"><td className="p-1.5 font-bold text-right">TOTAL:</td><td className="p-1.5 text-right font-bold font-mono text-sm">{$$(datos.total)}</td></tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Almacén: solo peso */}
      {isAlm && <div className="flex justify-end mb-2"><div className="bg-gray-100 border border-gray-400 rounded px-4 py-2 text-right"><span className="font-bold text-[9px] uppercase text-gray-500">Peso Total: </span><span className="font-bold text-base">{kg(datos.pesoTotalKg)}</span></div></div>}

      {/* ══ AVISO + PAGARÉ (solo original) ══ */}
      {isOrig && (
        <div className="grid grid-cols-2 gap-2 mb-2 text-[8px]">
          <div className="border border-gray-400 rounded p-2">
            <p className="font-bold text-[9px] uppercase mb-1" style={{ color: "#C8102E" }}>Aviso Importante</p>
            <p className="text-gray-600 leading-snug">FAVOR DE REVISAR SU PEDIDO COMPLETO A LA LLEGADA. RECIBIDA LA MERCANCIA NO SE ADMITEN RECLAMACIONES NI CAMBIOS.</p>
            <p className="text-gray-500 mt-1">Quejas: {COMPANY_DATA.telefonos.principal}</p>
          </div>
          <div className="border border-gray-400 rounded p-2">
            <p className="font-bold text-[9px] uppercase mb-1">Pagaré</p>
            <p className="text-gray-600 leading-snug">Debo(emos) y pagaré(mos) incondicionalmente a la orden de {COMPANY_DATA.razonSocial} la cantidad arriba mencionada a {plazoLetras[datos.terminoCredito] || "—"} días de la fecha de recepción de la mercancía.</p>
          </div>
        </div>
      )}

      {/* ══ DATOS BANCARIOS (original y confirmación) ══ */}
      {(isOrig || isConf) && (
        <div className="text-[8px] text-gray-600 mb-2 border-t border-gray-300 pt-1">
          <span className="font-bold uppercase">Datos Bancarios:</span>{" "}
          {b.beneficiario} | {b.banco} | Cta: {b.cuenta} | CLABE: {b.clabe} | {COMPANY_DATA.emails.pagos}
        </div>
      )}

      {/* ══ CONFIRMACIÓN: aviso variación ══ */}
      {isConf && (
        <div className="border-2 border-amber-400 bg-amber-50 rounded p-2 mb-2 text-[9px]">
          <p className="font-bold text-amber-800">AVISO: Las cantidades y el total pueden variar hasta el momento de la entrega debido a diferencias de peso en báscula u otros ajustes.</p>
        </div>
      )}

      {/* ══ FIRMAS (solo original) ══ */}
      {isOrig && (
        <div className="grid grid-cols-3 gap-4 mb-2 mt-1">
          <div className="text-center pt-8 border-t border-black"><p className="text-[8px] text-gray-500">Nombre y firma</p></div>
          <div className="text-center pt-8 border-t border-black"><p className="text-[8px] text-gray-500">Fecha de recepción</p></div>
          <div className="text-center pt-8 border-t border-black"><p className="text-[8px] text-gray-500">Sello del cliente</p></div>
        </div>
      )}

      {/* ══ FOOTER ══ */}
      <div className="mt-auto border-t border-gray-200 pt-1.5 flex items-end justify-between">
        <div className="text-[7.5px] text-gray-400 leading-tight">
          <p className="font-semibold text-[8px] text-gray-500">{COMPANY_DATA.razonSocialLarga}</p>
          <p>RFC: {COMPANY_DATA.rfc} | Régimen: {COMPANY_DATA.regimenFiscalDescripcion}</p>
          <p>{COMPANY_DATA.direccionCompletaMayusculas}</p>
          <p>Tel: {COMPANY_DATA.telefonosFormateados} | {COMPANY_DATA.emails.ventas}</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: isAlm ? "#333" : "#C8102E" }}>
            {isOrig ? "ORIGINAL" : isAlm ? "HOJA DE CARGA" : isConf ? "CONFIRMACIÓN" : ""}
          </p>
        </div>
      </div>
      {isAlm && <p className="text-center text-[7px] text-gray-300 mt-0.5">USO EXCLUSIVO ALMACEN — Generado por ALMASA ERP</p>}
    </div>
  );
};
