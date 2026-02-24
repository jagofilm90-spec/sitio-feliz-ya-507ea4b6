import { format } from "date-fns";
import { es } from "date-fns/locale";
import { COMPANY_DATA } from "@/constants/companyData";

interface ProductoPedido {
  cantidad: number;
  descripcion: string;
  pesoTotal: number | null;
  precioUnitario: number;
  importe: number;
  precioPorKilo: boolean;
}

export interface DatosPedidoPrint {
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
}

const fmtMoney = (n: number) => `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;
const fmtKg = (n: number) => `${n.toLocaleString("es-MX", { maximumFractionDigits: 2 })} kg`;

export const PedidoPrintTemplate = ({ datos }: PedidoPrintTemplateProps) => {
  const fechaFormateada = format(new Date(datos.fecha), "dd 'de' MMMM 'de' yyyy", { locale: es });

  return (
    <div className="p-8 bg-white text-black min-h-[11in] w-[8.5in] mx-auto font-sans text-sm print:p-6 flex flex-col">
      {/* ═══════ HEADER: Logo + Folio ═══════ */}
      <div className="flex justify-between items-start border-b-2 border-gray-800 pb-3 mb-4">
        <div className="flex items-center gap-3">
          <img src="/logo-almasa-header.png" alt="ALMASA" className="h-12 w-auto object-contain" />
          <div>
            <h1 className="text-lg font-bold uppercase tracking-tight">{COMPANY_DATA.nombreComercial}</h1>
            <p className="text-[9px] text-gray-500">{COMPANY_DATA.razonSocialLarga}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="bg-gray-800 text-white px-4 py-1.5 rounded font-bold text-base">PEDIDO</div>
          <p className="text-xs mt-1">Folio: <span className="font-bold">{datos.folio}</span></p>
          <p className="text-[10px] text-gray-600">{fechaFormateada}</p>
        </div>
      </div>

      {/* ═══════ CLIENTE + ENTREGA (protagonistas) ═══════ */}
      <div className="bg-gray-50 border rounded p-3 mb-3">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <p className="font-bold uppercase text-[10px] mb-1 text-gray-700">Cliente</p>
            <p className="font-semibold text-sm">{datos.cliente.nombre}</p>
            {datos.cliente.razonSocial && (
              <p className="text-[10px]"><span className="font-semibold">Razón Social:</span> {datos.cliente.razonSocial}</p>
            )}
            {datos.cliente.rfc && (
              <p className="text-[10px]"><span className="font-semibold">RFC:</span> {datos.cliente.rfc}</p>
            )}
            {datos.cliente.direccionFiscal && (
              <p className="text-[10px]"><span className="font-semibold">Dir. Fiscal:</span> {datos.cliente.direccionFiscal}</p>
            )}
            {datos.cliente.telefono && (
              <p className="text-[10px]"><span className="font-semibold">Tel:</span> {datos.cliente.telefono}</p>
            )}
          </div>
          <div className="border-l pl-4">
            <p className="font-bold uppercase text-[10px] mb-1 text-gray-700">Dirección de Entrega</p>
            {datos.sucursal ? (
              <>
                <p className="font-semibold text-sm">{datos.sucursal.nombre}</p>
                {datos.sucursal.direccion && <p className="text-[10px]">{datos.sucursal.direccion}</p>}
              </>
            ) : datos.direccionEntrega ? (
              <p className="text-[10px]">{datos.direccionEntrega}</p>
            ) : (
              <p className="text-[10px] text-gray-400 italic">Misma dirección fiscal</p>
            )}
          </div>
        </div>
      </div>

      {/* ═══════ VENDEDOR + CRÉDITO + PESO (barra compacta) ═══════ */}
      <div className="grid grid-cols-3 gap-3 mb-3 text-[10px]">
        <div className="border rounded px-2 py-1.5">
          <p className="font-bold uppercase text-[9px] text-gray-500">Vendedor</p>
          <p className="font-semibold text-xs">{datos.vendedor}</p>
        </div>
        <div className="border rounded px-2 py-1.5">
          <p className="font-bold uppercase text-[9px] text-gray-500">Crédito</p>
          <p className="font-semibold text-xs">{datos.terminoCredito}</p>
        </div>
        <div className="border rounded px-2 py-1.5">
          <p className="font-bold uppercase text-[9px] text-gray-500">Peso Total</p>
          <p className="font-semibold text-xs">{fmtKg(datos.pesoTotalKg)}</p>
        </div>
      </div>

      {/* ═══════ TABLA DE PRODUCTOS ═══════ */}
      <table className="w-full mb-3 text-xs flex-grow-0">
        <thead>
          <tr className="bg-gray-800 text-white">
            <th className="p-1.5 text-center w-14">Cant.</th>
            <th className="p-1.5 text-left">Descripción</th>
            <th className="p-1.5 text-right w-20">Peso Total</th>
            <th className="p-1.5 text-right w-22">P. Unitario</th>
            <th className="p-1.5 text-right w-24">Importe</th>
          </tr>
        </thead>
        <tbody>
          {datos.productos.map((prod, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
              <td className="p-1.5 border-b text-center font-semibold">{prod.cantidad}</td>
              <td className="p-1.5 border-b">{prod.descripcion}</td>
              <td className="p-1.5 border-b text-right">{prod.pesoTotal ? fmtKg(prod.pesoTotal) : "-"}</td>
              <td className="p-1.5 border-b text-right">
                {fmtMoney(prod.precioUnitario)}
                {prod.precioPorKilo && <span className="text-[8px]">/kg</span>}
              </td>
              <td className="p-1.5 border-b text-right font-semibold">{fmtMoney(prod.importe)}</td>
            </tr>
          ))}
          {Array.from({ length: Math.max(0, 8 - datos.productos.length) }).map((_, i) => (
            <tr key={`empty-${i}`} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
              <td className="p-1.5 border-b">&nbsp;</td>
              <td className="p-1.5 border-b" />
              <td className="p-1.5 border-b" />
              <td className="p-1.5 border-b" />
              <td className="p-1.5 border-b" />
            </tr>
          ))}
        </tbody>
      </table>

      {/* ═══════ NOTAS + TOTALES (side by side) ═══════ */}
      <div className="flex justify-between items-start mb-3 gap-4">
        <div className="flex-1">
          {datos.notas && (
            <div className="border rounded p-2 text-[10px]">
              <p className="font-bold text-[9px] uppercase text-gray-500 mb-0.5">Notas</p>
              <p>{datos.notas}</p>
            </div>
          )}
        </div>
        <table className="text-xs w-56">
          <tbody>
            <tr>
              <td className="p-1.5 font-semibold text-right">Subtotal:</td>
              <td className="p-1.5 text-right border w-28">{fmtMoney(datos.subtotal)}</td>
            </tr>
            <tr>
              <td className="p-1.5 font-semibold text-right">IVA (16%):</td>
              <td className="p-1.5 text-right border">{fmtMoney(datos.iva)}</td>
            </tr>
            {datos.ieps > 0 && (
              <tr>
                <td className="p-1.5 font-semibold text-right">IEPS (8%):</td>
                <td className="p-1.5 text-right border">{fmtMoney(datos.ieps)}</td>
              </tr>
            )}
            <tr className="bg-gray-800 text-white">
              <td className="p-1.5 font-bold text-right">TOTAL:</td>
              <td className="p-1.5 text-right font-bold">{fmtMoney(datos.total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ═══════ DATOS BANCARIOS ═══════ */}
      <div className="border-2 border-gray-300 rounded p-3 mb-3 text-[10px]">
        <p className="font-bold text-xs uppercase mb-1">Datos Bancarios para Pago</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-0.5">
          <p><span className="font-semibold">Beneficiario:</span> {COMPANY_DATA.datosBancarios.beneficiario}</p>
          <p><span className="font-semibold">Banco:</span> {COMPANY_DATA.datosBancarios.banco}</p>
          <p><span className="font-semibold">Sucursal:</span> {COMPANY_DATA.datosBancarios.sucursal} (Plaza {COMPANY_DATA.datosBancarios.plaza})</p>
          <p><span className="font-semibold">Cuenta:</span> {COMPANY_DATA.datosBancarios.cuenta}</p>
          <p className="col-span-2"><span className="font-semibold">CLABE:</span> {COMPANY_DATA.datosBancarios.clabe}</p>
        </div>
        <p className="mt-1 text-[9px] text-gray-500">Enviar comprobante de pago a: {COMPANY_DATA.emails.pagos}</p>
      </div>

      {/* ═══════ FIRMA DE CONFORMIDAD ═══════ */}
      <div className="border border-gray-300 p-3 rounded mb-3">
        <p className="text-center font-bold text-[10px] mb-3 uppercase text-gray-600">Firma de Conformidad</p>
        <div className="grid grid-cols-3 gap-6">
          <div className="text-center">
            <div className="border-b border-black mb-1 h-8" />
            <p className="text-[9px]">Nombre y firma</p>
          </div>
          <div className="text-center">
            <div className="border-b border-black mb-1 h-8" />
            <p className="text-[9px]">Fecha de recepción</p>
          </div>
          <div className="text-center">
            <div className="border-b border-black mb-1 h-8" />
            <p className="text-[9px]">Sello del cliente</p>
          </div>
        </div>
      </div>

      {/* ═══════ FOOTER: Datos fiscales emisor (letra chiquita) ═══════ */}
      <div className="mt-auto border-t border-gray-200 pt-2 text-center text-[8px] text-gray-400 leading-tight">
        <p className="font-semibold text-[9px] text-gray-500">{COMPANY_DATA.razonSocialLarga}</p>
        <p>RFC: {COMPANY_DATA.rfc} | Régimen: {COMPANY_DATA.regimenFiscalDescripcion}</p>
        <p>{COMPANY_DATA.direccionCompletaMayusculas}</p>
        <p>Tel: {COMPANY_DATA.telefonosFormateados} | {COMPANY_DATA.emails.ventas}</p>
      </div>
    </div>
  );
};
