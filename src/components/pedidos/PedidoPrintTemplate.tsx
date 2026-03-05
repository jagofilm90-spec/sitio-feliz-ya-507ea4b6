import { format } from "date-fns";
import { es } from "date-fns/locale";
import { COMPANY_DATA } from "@/constants/companyData";
import { QRCodeSVG } from "qrcode.react";

interface ProductoPedido {
  cantidad: number;
  descripcion: string;
  pesoTotal: number | null;
  precioUnitario: number;
  importe: number;
  precioPorKilo: boolean;
}

export interface DatosPedidoPrint {
  pedidoId?: string;
  folio: string;
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

interface PedidoPrintTemplateProps {
  datos: DatosPedidoPrint;
  hideQR?: boolean;
}

const fmtMoney = (n: number) => `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;
const fmtKg = (n: number) => `${n.toLocaleString("es-MX", { maximumFractionDigits: 2 })} kg`;

export const PedidoPrintTemplate = ({ datos, hideQR = false }: PedidoPrintTemplateProps) => {
  const fechaFormateada = format(new Date(datos.fecha), "dd 'de' MMMM 'de' yyyy", { locale: es });
  const direccionEntrega = datos.sucursal?.direccion || datos.direccionEntrega || datos.cliente.direccionFiscal || "";

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
          <p className="text-[10px] font-bold uppercase text-gray-500">Pedido / Remisión</p>
          <p className="text-lg font-black leading-tight">{datos.folio}</p>
        </div>
      </div>

      {/* ═══════ DATOS CLIENTE (protagonista) ═══════ */}
      <div className="border border-gray-400 rounded mb-2">
        <div className="grid grid-cols-[1fr_auto] gap-0">
          {/* Fila 1: Nombre + Fecha */}
          <div className="border-b border-r border-gray-300 px-2 py-1">
            <span className="text-[9px] font-bold text-gray-500 uppercase">Cliente:</span>
            <span className="ml-1 font-bold text-sm">{datos.cliente.nombre}</span>
          </div>
          <div className="border-b border-gray-300 px-2 py-1 text-center min-w-[100px]">
            <span className="text-[9px] font-bold text-gray-500 uppercase">Fecha:</span>
            <span className="ml-1 text-[10px]">{fechaFormateada}</span>
          </div>

          {/* Fila 2: Domicilio + Vendedor */}
          <div className="border-b border-r border-gray-300 px-2 py-1">
            <span className="text-[9px] font-bold text-gray-500 uppercase">Domicilio:</span>
            <span className="ml-1 text-[10px]">
              {datos.sucursal ? (
                <>{datos.sucursal.nombre}{datos.sucursal.direccion ? ` — ${datos.sucursal.direccion}` : ""}</>
              ) : direccionEntrega || <span className="italic text-gray-400">Misma dirección fiscal</span>}
            </span>
          </div>
          <div className="border-b border-gray-300 px-2 py-1 text-center">
            <span className="text-[9px] font-bold text-gray-500 uppercase">Vendedor:</span>
            <span className="ml-1 font-bold text-[10px]">{datos.vendedor}</span>
          </div>

          {/* Fila 3: RFC / Razón Social / Tel */}
          <div className="border-r border-gray-300 px-2 py-1" style={{ gridColumn: "1 / -1" }}>
            {datos.cliente.rfc && (
              <span className="text-[10px]"><span className="font-bold text-gray-500 text-[9px] uppercase">RFC:</span> {datos.cliente.rfc}</span>
            )}
            {datos.cliente.razonSocial && (
              <span className="text-[10px] ml-3"><span className="font-bold text-gray-500 text-[9px] uppercase">R. Social:</span> {datos.cliente.razonSocial}</span>
            )}
            {datos.cliente.telefono && (
              <span className="text-[10px] ml-3"><span className="font-bold text-gray-500 text-[9px] uppercase">Tel:</span> {datos.cliente.telefono}</span>
            )}
          </div>
        </div>
      </div>

      {/* ═══════ BARRA: Crédito + Peso ═══════ */}
      <div className="grid grid-cols-3 gap-0 border border-gray-400 rounded mb-2 text-[10px]">
        <div className="border-r border-gray-300 px-2 py-1">
          <span className="font-bold text-[9px] text-gray-500 uppercase">Crédito:</span>
          <span className="ml-1 font-semibold">{datos.terminoCredito}</span>
        </div>
        <div className="border-r border-gray-300 px-2 py-1">
          <span className="font-bold text-[9px] text-gray-500 uppercase">Peso Total:</span>
          <span className="ml-1 font-semibold">{fmtKg(datos.pesoTotalKg)}</span>
        </div>
        <div className="px-2 py-1">
          <span className="font-bold text-[9px] text-gray-500 uppercase">Productos:</span>
          <span className="ml-1 font-semibold">{datos.productos.length}</span>
        </div>
      </div>

      {/* ═══════ TABLA DE PRODUCTOS ═══════ */}
      <table className="w-full mb-2 border-collapse flex-grow-0">
        <thead>
          <tr className="bg-gray-800 text-white text-[10px]">
            <th className="p-1.5 text-center w-16 border border-gray-700">CANTIDAD</th>
            <th className="p-1.5 text-left border border-gray-700">DETALLE</th>
            <th className="p-1.5 text-right w-20 border border-gray-700">PESO</th>
            <th className="p-1.5 text-right w-20 border border-gray-700">PRECIO U.</th>
            <th className="p-1.5 text-right w-24 border border-gray-700">IMPORTE</th>
          </tr>
        </thead>
        <tbody>
          {datos.productos.map((prod, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
              <td className="p-1 border border-gray-300 text-center font-semibold">{prod.cantidad}</td>
              <td className="p-1 border border-gray-300 text-[10px]">{prod.descripcion}</td>
              <td className="p-1 border border-gray-300 text-right text-[10px]">{prod.pesoTotal ? fmtKg(prod.pesoTotal) : "-"}</td>
              <td className="p-1 border border-gray-300 text-right text-[10px]">
                {fmtMoney(prod.precioUnitario)}
                {prod.precioPorKilo && <span className="text-[8px]">/kg</span>}
              </td>
              <td className="p-1 border border-gray-300 text-right font-semibold text-[10px]">{fmtMoney(prod.importe)}</td>
            </tr>
          ))}
          {/* Filas vacías para mínimo visual */}
          {Array.from({ length: Math.max(0, 2 - datos.productos.length) }).map((_, i) => (
            <tr key={`e-${i}`}>
              <td className="p-1 border border-gray-300">&nbsp;</td>
              <td className="p-1 border border-gray-300" />
              <td className="p-1 border border-gray-300" />
              <td className="p-1 border border-gray-300" />
              <td className="p-1 border border-gray-300" />
            </tr>
          ))}
        </tbody>
      </table>

      {/* ═══════ NOTAS + TOTALES ═══════ */}
      <div className="flex justify-between items-start mb-2 gap-3">
        {/* Notas */}
        <div className="flex-1">
          {datos.notas && (
            <div className="border border-gray-300 rounded p-2 text-[10px]">
              <p className="font-bold text-[9px] uppercase text-gray-500 mb-0.5">Notas</p>
              <p>{datos.notas}</p>
            </div>
          )}
        </div>
        {/* Totales */}
        <table className="text-[10px] w-52 border-collapse">
          <tbody>
            <tr>
              <td className="p-1 font-semibold text-right border border-gray-300">Subtotal:</td>
              <td className="p-1 text-right border border-gray-300 w-24 font-mono">{fmtMoney(datos.subtotal)}</td>
            </tr>
            <tr>
              <td className="p-1 font-semibold text-right border border-gray-300">IVA (16%):</td>
              <td className="p-1 text-right border border-gray-300 font-mono">{fmtMoney(datos.iva)}</td>
            </tr>
            {datos.ieps > 0 && (
              <tr>
                <td className="p-1 font-semibold text-right border border-gray-300">IEPS (8%):</td>
                <td className="p-1 text-right border border-gray-300 font-mono">{fmtMoney(datos.ieps)}</td>
              </tr>
            )}
            <tr className="bg-gray-800 text-white">
              <td className="p-1.5 font-bold text-right">TOTAL:</td>
              <td className="p-1.5 text-right font-bold font-mono text-sm">{fmtMoney(datos.total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ═══════ DATOS BANCARIOS ═══════ */}
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

      {/* Firmas y secciones legales se incluyen solo en la hoja de carga, no en el pedido del vendedor */}

      {/* ═══════ FOOTER FISCAL + QR ═══════ */}
      <div className="mt-auto border-t border-gray-200 pt-1.5 flex items-end justify-between">
        <div className="text-[7.5px] text-gray-400 leading-tight">
          <p className="font-semibold text-[8px] text-gray-500">{COMPANY_DATA.razonSocialLarga}</p>
          <p>RFC: {COMPANY_DATA.rfc} | Régimen: {COMPANY_DATA.regimenFiscalDescripcion}</p>
          <p>{COMPANY_DATA.direccionCompletaMayusculas}</p>
          <p>Tel: {COMPANY_DATA.telefonosFormateados} | {COMPANY_DATA.emails.ventas}</p>
        </div>
        {datos.pedidoId && !hideQR && (
          <div className="flex flex-col items-center gap-0.5">
            <QRCodeSVG
              value={`almasa:carga:${datos.pedidoId}`}
              size={56}
              level="M"
            />
            <p className="text-[6px] text-gray-400">Escanear para cargar</p>
          </div>
        )}
      </div>
    </div>
  );
};
