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
  cliente: {
    nombre: string;
    razonSocial?: string;
    rfc?: string;
    direccionFiscal?: string;
    telefono?: string;
  };
  direccionEntrega?: string;
  sucursal?: {
    nombre: string;
    direccion?: string;
  };
  productos: ProductoPedido[];
  subtotal: number;
  iva: number;
  ieps: number;
  total: number;
  pesoTotalKg: number;
  notas?: string;
}

export type VariantePrint = "confirmacion_cliente" | "almacen" | "copia_cliente" | "original";

interface PedidoPrintTemplateProps {
  datos: DatosPedidoPrint;
  hideQR?: boolean;
  variante?: VariantePrint;
}

const fmtMoney = (n: number) => `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;
const fmtKg = (n: number) => `${n.toLocaleString("es-MX", { maximumFractionDigits: 2 })} kg`;
const plazoLetras: Record<string, string> = { contado: "Contado", "8_dias": "Ocho", "15_dias": "Quince", "30_dias": "Treinta", "60_dias": "Sesenta" };

export const PedidoPrintTemplate = ({ datos, hideQR = false, variante }: PedidoPrintTemplateProps) => {
  const fechaFormateada = format(new Date(datos.fecha), "dd 'de' MMMM 'de' yyyy", { locale: es });
  const direccionEntrega = datos.sucursal?.direccion || datos.direccionEntrega || datos.cliente.direccionFiscal || "";
  const isAlmacen = variante === "almacen";
  const isOriginal = variante === "original";
  const isCopiaCliente = variante === "copia_cliente";
  const isConfirmacion = variante === "confirmacion_cliente";
  const showPrecios = !isAlmacen;
  const showBancarios = showPrecios && !isConfirmacion;
  const showPagare = isOriginal || isCopiaCliente;
  const showFirmas = isOriginal || isCopiaCliente;
  const showCamposVacios = isAlmacen || isOriginal || isCopiaCliente;
  const marcaTexto = isOriginal ? "ORIGINAL" : isCopiaCliente ? "COPIA CLIENTE" : isAlmacen ? "HOJA DE CARGA — USO EXCLUSIVO ALMACEN" : isConfirmacion ? "CONFIRMACION DE PEDIDO" : "";

  return (
    <div className="p-6 bg-white text-black min-h-[11in] w-[8.5in] mx-auto font-sans text-[11px] print:p-4 flex flex-col">
      {/* ═══════ HEADER ═══════ */}
      <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3">
        <img src="/logo-almasa-header.png" alt="ALMASA" className="h-12 w-auto object-contain flex-shrink-0" />
        <div className="text-center flex-1 px-3">
          <h1 className="text-base font-black uppercase tracking-tight leading-tight">{COMPANY_DATA.razonSocial}</h1>
          <p className="text-[8px] text-gray-600 mt-0.5">
            RFC: {COMPANY_DATA.rfc} | Tel: {COMPANY_DATA.telefonosFormateados}
          </p>
          <p className="text-[8px] text-gray-600">{COMPANY_DATA.direccionCompletaMayusculas}</p>
        </div>
        <div className="text-right flex-shrink-0">
          {datos.numeroDia && <p className="text-[10px] font-bold text-gray-500 uppercase">NOTA #{datos.numeroDia}</p>}
          <p className="text-[10px] font-bold uppercase text-gray-500">
            {isAlmacen ? "Hoja de Carga" : isConfirmacion ? "Confirmacion" : "Pedido / Remision"}
          </p>
          <p className="text-lg font-black leading-tight">{datos.folio}</p>
        </div>
      </div>
      <p className="text-center text-[9px] italic text-gray-500 -mt-1 mb-2">"{COMPANY_DATA.slogan}"</p>

      {/* ═══════ DATOS CLIENTE ═══════ */}
      <div className="border border-gray-400 rounded mb-2">
        <div className="grid grid-cols-[1fr_auto] gap-0">
          <div className="border-b border-r border-gray-300 px-2 py-1">
            <span className="text-[9px] font-bold text-gray-500 uppercase">Cliente:</span>
            <span className="ml-1 font-bold text-sm">{datos.cliente.nombre}</span>
          </div>
          <div className="border-b border-gray-300 px-2 py-1 text-center min-w-[100px]">
            {showCamposVacios ? (
              <><span className="text-[9px] font-bold text-gray-500 uppercase">Fecha:</span><span className="ml-1 text-[10px] text-gray-300 italic">_____________</span></>
            ) : (
              <><span className="text-[9px] font-bold text-gray-500 uppercase">Fecha:</span><span className="ml-1 text-[10px]">{fechaFormateada}</span></>
            )}
          </div>
          <div className="border-b border-r border-gray-300 px-2 py-1">
            <span className="text-[9px] font-bold text-gray-500 uppercase">Domicilio:</span>
            <span className="ml-1 text-[10px]">
              {datos.sucursal ? (
                <>{datos.sucursal.nombre}{datos.sucursal.direccion ? ` — ${datos.sucursal.direccion}` : ""}</>
              ) : direccionEntrega || <span className="italic text-gray-400">Misma direccion fiscal</span>}
            </span>
          </div>
          <div className="border-b border-gray-300 px-2 py-1 text-center">
            <span className="text-[9px] font-bold text-gray-500 uppercase">Vendedor:</span>
            <span className="ml-1 font-bold text-[10px]">{datos.vendedor}</span>
          </div>
          {/* Fila 3: RFC + campos vacíos */}
          <div className="px-2 py-1" style={{ gridColumn: "1 / -1" }}>
            {datos.cliente.rfc && <span className="text-[10px]"><span className="font-bold text-gray-500 text-[9px] uppercase">RFC:</span> {datos.cliente.rfc}</span>}
            {datos.cliente.razonSocial && <span className="text-[10px] ml-3"><span className="font-bold text-gray-500 text-[9px] uppercase">R. Social:</span> {datos.cliente.razonSocial}</span>}
            {showCamposVacios && (
              <>
                <span className="text-[10px] ml-3"><span className="font-bold text-gray-500 text-[9px] uppercase">Unidad:</span> <span className="text-gray-300">________</span></span>
                <span className="text-[10px] ml-3"><span className="font-bold text-gray-500 text-[9px] uppercase">N/N:</span> <span className="text-gray-300">________</span></span>
                {isOriginal && <span className="text-[10px] ml-3"><span className="font-bold text-gray-500 text-[9px] uppercase">Cargo:</span> <span className="text-gray-300">________</span></span>}
              </>
            )}
          </div>
        </div>
        {/* QR inside data box for almacen (bigger) */}
        {isAlmacen && datos.pedidoId && (
          <div className="flex justify-center py-2 border-t border-gray-300">
            <div className="flex flex-col items-center">
              <QRCodeSVG value={`almasa:carga:${datos.pedidoId}`} size={90} level="M" />
              <p className="text-[7px] text-gray-400 mt-1">Escanear para cargar</p>
            </div>
          </div>
        )}
      </div>

      {/* ═══════ BARRA: Crédito + Peso ═══════ */}
      <div className={`grid ${showPrecios ? "grid-cols-3" : "grid-cols-2"} gap-0 border border-gray-400 rounded mb-2 text-[10px]`}>
        {showPrecios && (
          <div className="border-r border-gray-300 px-2 py-1">
            <span className="font-bold text-[9px] text-gray-500 uppercase">Credito:</span>
            <span className="ml-1 font-semibold">{datos.terminoCredito}</span>
          </div>
        )}
        <div className={`${showPrecios ? "border-r border-gray-300" : ""} px-2 py-1`}>
          <span className="font-bold text-[9px] text-gray-500 uppercase">Peso Total:</span>
          <span className="ml-1 font-semibold">{fmtKg(datos.pesoTotalKg)}</span>
        </div>
        <div className="px-2 py-1">
          <span className="font-bold text-[9px] text-gray-500 uppercase">Productos:</span>
          <span className="ml-1 font-semibold">{datos.productos.length}</span>
        </div>
      </div>

      {/* ═══════ TABLA DE PRODUCTOS ═══════ */}
      <table className="w-full mb-2 border-collapse flex-grow-0" style={{ tableLayout: 'fixed' }}>
        <colgroup>
          {isAlmacen ? (
            <>
              <col style={{ width: '5%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '58%' }} />
            </>
          ) : (
            <>
              <col style={{ width: '8%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '38%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '18%' }} />
            </>
          )}
        </colgroup>
        <thead>
          <tr className="bg-gray-800 text-white text-[9px]">
            {isAlmacen && <th className="p-1 text-center border border-gray-700 w-5">☐</th>}
            <th className="p-1 text-center border border-gray-700">CANT.</th>
            <th className="p-1 text-center border border-gray-700">UNIDAD</th>
            <th className="p-1 text-right border border-gray-700">PESO KG</th>
            <th className="p-1 text-left border border-gray-700">DESCRIPCION</th>
            {showPrecios && <th className="p-1 text-right border border-gray-700">PRECIO</th>}
            {showPrecios && <th className="p-1 text-right border border-gray-700">TOTAL</th>}
          </tr>
        </thead>
        <tbody>
          {datos.productos.map((prod, i) => {
            const capitalUnidad = prod.unidad ? prod.unidad.charAt(0).toUpperCase() + prod.unidad.slice(1) : '';
            return (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                {isAlmacen && <td className="p-1 border border-gray-300 text-center text-[10px]">☐</td>}
                <td className="p-1 border border-gray-300 text-center font-semibold text-[10px]">{prod.cantidad}</td>
                <td className="p-1 border border-gray-300 text-center text-[10px]">{capitalUnidad}</td>
                <td className="p-1 border border-gray-300 text-right text-[10px]">{prod.pesoTotal ? `${prod.pesoTotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })} kg` : "-"}</td>
                <td className="p-1 border border-gray-300 text-[10px]">{prod.descripcion}</td>
                {showPrecios && (
                  <td className="p-1 border border-gray-300 text-right text-[10px]">
                    {fmtMoney(prod.precioUnitario)}{prod.precioPorKilo && <span className="text-[8px]">/kg</span>}
                  </td>
                )}
                {showPrecios && <td className="p-1 border border-gray-300 text-right font-semibold text-[10px]">{fmtMoney(prod.importe)}</td>}
              </tr>
            );
          })}
          {Array.from({ length: Math.max(0, 2 - datos.productos.length) }).map((_, i) => (
            <tr key={`e-${i}`}>
              {isAlmacen && <td className="p-1 border border-gray-300">&nbsp;</td>}
              <td className="p-1 border border-gray-300">&nbsp;</td>
              <td className="p-1 border border-gray-300" />
              <td className="p-1 border border-gray-300" />
              <td className="p-1 border border-gray-300" />
              {showPrecios && <td className="p-1 border border-gray-300" />}
              {showPrecios && <td className="p-1 border border-gray-300" />}
            </tr>
          ))}
        </tbody>
      </table>

      {/* ═══════ NOTAS + TOTALES ═══════ */}
      {showPrecios && (
        <div className="flex justify-between items-start mb-2 gap-3">
          <div className="flex-1">
            {datos.notas && (
              <div className="border border-gray-300 rounded p-2 text-[10px]">
                <p className="font-bold text-[9px] uppercase text-gray-500 mb-0.5">Notas</p>
                <p>{datos.notas}</p>
              </div>
            )}
          </div>
          <table className="text-[10px] w-56 border-collapse">
            <tbody>
              {datos.pesoTotalKg > 0 && (
                <tr><td className="p-1 font-semibold text-right border border-gray-300">Peso Total:</td><td className="p-1 text-right border border-gray-300 w-24 font-mono">{fmtKg(datos.pesoTotalKg)}</td></tr>
              )}
              <tr><td className="p-1 font-semibold text-right border border-gray-300">Subtotal:</td><td className="p-1 text-right border border-gray-300 font-mono">{fmtMoney(datos.subtotal)}</td></tr>
              <tr><td className="p-1 font-semibold text-right border border-gray-300">IVA (16%):</td><td className="p-1 text-right border border-gray-300 font-mono">{fmtMoney(datos.iva)}</td></tr>
              {datos.ieps > 0 && (
                <tr><td className="p-1 font-semibold text-right border border-gray-300">IEPS (8%):</td><td className="p-1 text-right border border-gray-300 font-mono">{fmtMoney(datos.ieps)}</td></tr>
              )}
              <tr className="bg-black text-white">
                <td className="p-1.5 font-bold text-right">TOTAL:</td>
                <td className="p-1.5 text-right font-bold font-mono text-sm">{fmtMoney(datos.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Almacén: solo peso total */}
      {isAlmacen && (
        <div className="flex justify-end mb-2">
          <div className="bg-gray-100 border border-gray-400 rounded px-4 py-2 text-right">
            <span className="font-bold text-[9px] uppercase text-gray-500">Peso Total: </span>
            <span className="font-bold text-base">{fmtKg(datos.pesoTotalKg)}</span>
          </div>
        </div>
      )}

      {/* ═══════ DATOS BANCARIOS ═══════ */}
      {showBancarios && (
        <div className="border-2 border-gray-400 rounded p-2 mb-2 text-[9px]">
          <p className="font-bold text-[10px] uppercase mb-1">Datos Bancarios para Pago</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
            <p><span className="font-semibold">Beneficiario:</span> {COMPANY_DATA.datosBancarios.beneficiario}</p>
            <p><span className="font-semibold">Banco:</span> {COMPANY_DATA.datosBancarios.banco}</p>
            <p><span className="font-semibold">Cuenta:</span> {COMPANY_DATA.datosBancarios.cuenta}</p>
            <p><span className="font-semibold">CLABE:</span> {COMPANY_DATA.datosBancarios.clabe}</p>
          </div>
          <p className="mt-1 text-[8px] text-gray-500">Enviar comprobante de pago a: {COMPANY_DATA.emails.pagos}</p>
        </div>
      )}

      {/* ═══════ AVISO + PAGARÉ (original y copia_cliente) ═══════ */}
      {showPagare && (
        <div className="grid grid-cols-2 gap-2 mb-2 text-[8px]">
          <div className="border border-gray-400 rounded p-2">
            <p className="font-bold text-[9px] uppercase text-red-700 mb-1">Aviso Importante</p>
            <p className="text-gray-600 leading-snug">FAVOR DE REVISAR SU PEDIDO COMPLETO A LA LLEGADA. RECIBIDA LA MERCANCIA NO SE ADMITEN RECLAMACIONES NI CAMBIOS.</p>
            <p className="text-gray-500 mt-1">Quejas: {COMPANY_DATA.telefonos.principal}</p>
          </div>
          <div className="border border-gray-400 rounded p-2">
            <p className="font-bold text-[9px] uppercase mb-1">Pagare</p>
            <p className="text-gray-600 leading-snug">Debo(emos) y pagare(mos) incondicionalmente a la orden de {COMPANY_DATA.razonSocial} la cantidad arriba mencionada a {plazoLetras[datos.terminoCredito] || "—"} dias de la fecha de recepcion de la mercancia.</p>
          </div>
        </div>
      )}

      {/* ═══════ CONFIRMACIÓN: aviso de variación ═══════ */}
      {isConfirmacion && (
        <div className="border-2 border-amber-400 bg-amber-50 rounded p-2 mb-2 text-[9px]">
          <p className="font-bold text-amber-800">AVISO: Las cantidades y el total pueden variar hasta el momento de la entrega debido a diferencias de peso en bascula u otros ajustes.</p>
        </div>
      )}

      {/* ═══════ FIRMAS ═══════ */}
      {showFirmas && (
        <div className="grid grid-cols-3 gap-4 mb-2 mt-2">
          <div className="text-center pt-8 border-t border-black">
            <p className="text-[8px] text-gray-500">Nombre y firma</p>
          </div>
          <div className="text-center pt-8 border-t border-black">
            <p className="text-[8px] text-gray-500">Fecha de recepcion</p>
          </div>
          <div className="text-center pt-8 border-t border-black">
            <p className="text-[8px] text-gray-500">Sello del cliente</p>
          </div>
        </div>
      )}

      {/* ═══════ FOOTER ═══════ */}
      <div className="mt-auto border-t border-gray-200 pt-1.5 flex items-end justify-between">
        <div className="text-[7.5px] text-gray-400 leading-tight">
          <p className="font-semibold text-[8px] text-gray-500">{COMPANY_DATA.razonSocialLarga}</p>
          <p>RFC: {COMPANY_DATA.rfc} | Regimen: {COMPANY_DATA.regimenFiscalDescripcion}</p>
          <p>{COMPANY_DATA.direccionCompletaMayusculas}</p>
          <p>Tel: {COMPANY_DATA.telefonosFormateados} | {COMPANY_DATA.emails.ventas}</p>
        </div>
        {datos.pedidoId && !hideQR && !isAlmacen && (
          <div className="flex flex-col items-center gap-0.5">
            <QRCodeSVG value={`almasa:carga:${datos.pedidoId}`} size={56} level="M" />
            <p className="text-[6px] text-gray-400">Escanear para cargar</p>
          </div>
        )}
      </div>

      {/* ═══════ MARCA DE COPIA ═══════ */}
      {marcaTexto && (
        <p className="text-center text-[7px] text-gray-300 mt-1 uppercase tracking-widest">{marcaTexto} — Generado por ALMASA ERP</p>
      )}
    </div>
  );
};
