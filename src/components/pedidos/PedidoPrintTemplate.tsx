import { format } from "date-fns";
import { es } from "date-fns/locale";
import { COMPANY_DATA } from "@/constants/companyData";

interface ProductoPedido {
  cantidad: number;
  descripcion: string;
  pesoTotal: number | null; // cantidad × peso_kg
  precioUnitario: number;
  importe: number; // si precio_por_kilo: pesoTotal × precioUnitario, sino: cantidad × precioUnitario
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
    <div className="p-8 bg-white text-black min-h-[11in] w-[8.5in] mx-auto font-sans text-sm print:p-6">
      {/* ═══════ HEADER ═══════ */}
      <div className="flex justify-between items-start border-b-2 border-gray-800 pb-4 mb-4">
        <div className="flex items-center gap-4">
          <img
            src="/logo-almasa-header.png"
            alt="ALMASA"
            className="h-14 w-auto object-contain"
          />
          <div>
            <h1 className="text-xl font-bold uppercase">{COMPANY_DATA.razonSocial}</h1>
            <p className="text-[10px] text-gray-600">{COMPANY_DATA.razonSocialLarga}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="bg-gray-800 text-white px-4 py-2 rounded font-bold text-lg">
            PEDIDO
          </div>
          <p className="text-xs mt-1">
            Folio: <span className="font-bold">{datos.folio}</span>
          </p>
          <p className="text-xs">{fechaFormateada}</p>
        </div>
      </div>

      {/* ═══════ DATOS EMPRESA ═══════ */}
      <div className="grid grid-cols-2 gap-4 mb-4 text-[10px]">
        <div className="border p-2 rounded">
          <p className="font-bold text-xs mb-1 uppercase">Datos Fiscales Emisor</p>
          <p><span className="font-semibold">RFC:</span> {COMPANY_DATA.rfc}</p>
          {COMPANY_DATA.direccionMultilinea.map((linea, i) => (
            <p key={i}>{linea}</p>
          ))}
          <p className="mt-1"><span className="font-semibold">Tel:</span> {COMPANY_DATA.telefonosFormateados}</p>
          <p><span className="font-semibold">Email:</span> {COMPANY_DATA.emails.ventas}</p>
        </div>
        <div className="border p-2 rounded">
          <p className="font-bold text-xs mb-1 uppercase">Datos Bancarios</p>
          <p><span className="font-semibold">Beneficiario:</span> {COMPANY_DATA.datosBancarios.beneficiario}</p>
          <p><span className="font-semibold">Banco:</span> {COMPANY_DATA.datosBancarios.banco}</p>
          <p><span className="font-semibold">Sucursal:</span> {COMPANY_DATA.datosBancarios.sucursal} (Plaza {COMPANY_DATA.datosBancarios.plaza})</p>
          <p><span className="font-semibold">Cuenta:</span> {COMPANY_DATA.datosBancarios.cuenta}</p>
          <p><span className="font-semibold">CLABE:</span> {COMPANY_DATA.datosBancarios.clabe}</p>
          <p className="mt-1 text-[9px]">Enviar comprobante a: {COMPANY_DATA.emails.pagos}</p>
        </div>
      </div>

      {/* ═══════ VENDEDOR + CRÉDITO ═══════ */}
      <div className="grid grid-cols-3 gap-4 mb-4 text-xs">
        <div className="border p-2 rounded">
          <p className="font-bold uppercase text-[10px] mb-1">Vendedor</p>
          <p className="font-semibold">{datos.vendedor}</p>
        </div>
        <div className="border p-2 rounded">
          <p className="font-bold uppercase text-[10px] mb-1">Condiciones de Crédito</p>
          <p className="font-semibold">{datos.terminoCredito}</p>
        </div>
        <div className="border p-2 rounded">
          <p className="font-bold uppercase text-[10px] mb-1">Peso Total Pedido</p>
          <p className="font-semibold text-base">{fmtKg(datos.pesoTotalKg)}</p>
        </div>
      </div>

      {/* ═══════ CLIENTE + ENTREGA ═══════ */}
      <div className="bg-gray-100 p-3 rounded mb-4">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="border-r pr-3">
            <p className="font-bold uppercase text-[10px] mb-1">Datos del Cliente</p>
            <p><span className="font-semibold">Cliente:</span> {datos.cliente.nombre}</p>
            {datos.cliente.razonSocial && (
              <p><span className="font-semibold">Razón Social:</span> {datos.cliente.razonSocial}</p>
            )}
            {datos.cliente.rfc && (
              <p><span className="font-semibold">RFC:</span> {datos.cliente.rfc}</p>
            )}
            {datos.cliente.direccionFiscal && (
              <p><span className="font-semibold">Dir. Fiscal:</span> {datos.cliente.direccionFiscal}</p>
            )}
            {datos.cliente.telefono && (
              <p><span className="font-semibold">Tel:</span> {datos.cliente.telefono}</p>
            )}
          </div>
          <div className="pl-3">
            <p className="font-bold uppercase text-[10px] mb-1">Dirección de Entrega</p>
            {datos.sucursal ? (
              <>
                <p><span className="font-semibold">Sucursal:</span> {datos.sucursal.nombre}</p>
                {datos.sucursal.direccion && (
                  <p><span className="font-semibold">Dirección:</span> {datos.sucursal.direccion}</p>
                )}
              </>
            ) : datos.direccionEntrega ? (
              <p>{datos.direccionEntrega}</p>
            ) : (
              <p className="text-gray-500 italic">Misma dirección fiscal</p>
            )}
          </div>
        </div>
      </div>

      {/* ═══════ TABLA DE PRODUCTOS (5 COLUMNAS) ═══════ */}
      <table className="w-full mb-4 text-xs">
        <thead>
          <tr className="bg-gray-800 text-white">
            <th className="p-2 text-center w-16">Cantidad</th>
            <th className="p-2 text-left">Descripción</th>
            <th className="p-2 text-right w-24">Peso Total</th>
            <th className="p-2 text-right w-24">P. Unitario</th>
            <th className="p-2 text-right w-28">Importe</th>
          </tr>
        </thead>
        <tbody>
          {datos.productos.map((prod, i) => (
            <tr
              key={i}
              className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
            >
              <td className="p-2 border-b text-center font-semibold">{prod.cantidad}</td>
              <td className="p-2 border-b">{prod.descripcion}</td>
              <td className="p-2 border-b text-right">
                {prod.pesoTotal ? fmtKg(prod.pesoTotal) : "-"}
              </td>
              <td className="p-2 border-b text-right">
                {fmtMoney(prod.precioUnitario)}
                {prod.precioPorKilo && <span className="text-[9px]">/kg</span>}
              </td>
              <td className="p-2 border-b text-right font-semibold">
                {fmtMoney(prod.importe)}
              </td>
            </tr>
          ))}
          {/* Filas vacías para llenar espacio */}
          {Array.from({ length: Math.max(0, 10 - datos.productos.length) }).map((_, i) => (
            <tr key={`empty-${i}`} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
              <td className="p-2 border-b">&nbsp;</td>
              <td className="p-2 border-b" />
              <td className="p-2 border-b" />
              <td className="p-2 border-b" />
              <td className="p-2 border-b" />
            </tr>
          ))}
        </tbody>
      </table>

      {/* ═══════ TOTALES ═══════ */}
      <div className="flex justify-end mb-6">
        <table className="text-sm w-64">
          <tbody>
            <tr>
              <td className="p-2 font-semibold text-right">Subtotal:</td>
              <td className="p-2 text-right border w-32">{fmtMoney(datos.subtotal)}</td>
            </tr>
            <tr>
              <td className="p-2 font-semibold text-right">IVA (16%):</td>
              <td className="p-2 text-right border">{fmtMoney(datos.iva)}</td>
            </tr>
            {datos.ieps > 0 && (
              <tr>
                <td className="p-2 font-semibold text-right">IEPS (8%):</td>
                <td className="p-2 text-right border">{fmtMoney(datos.ieps)}</td>
              </tr>
            )}
            <tr className="bg-gray-800 text-white">
              <td className="p-2 font-bold text-right">TOTAL:</td>
              <td className="p-2 text-right font-bold">{fmtMoney(datos.total)}</td>
            </tr>
            <tr>
              <td className="p-2 font-semibold text-right">Peso Total:</td>
              <td className="p-2 text-right border font-bold">{fmtKg(datos.pesoTotalKg)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ═══════ NOTAS ═══════ */}
      {datos.notas && (
        <div className="border p-2 rounded mb-4 text-xs">
          <p className="font-bold mb-1">Notas:</p>
          <p>{datos.notas}</p>
        </div>
      )}

      {/* ═══════ FIRMA DE CONFORMIDAD ═══════ */}
      <div className="border-2 border-gray-400 p-4 rounded mb-4">
        <p className="text-center font-bold text-xs mb-4 uppercase">Firma de Conformidad del Cliente</p>
        <div className="grid grid-cols-3 gap-8 mt-6">
          <div className="text-center">
            <div className="border-b border-black mb-1 h-10" />
            <p className="text-[10px]">Nombre y firma de quien recibe</p>
          </div>
          <div className="text-center">
            <div className="border-b border-black mb-1 h-10" />
            <p className="text-[10px]">Fecha de recepción</p>
          </div>
          <div className="text-center">
            <div className="border-b border-black mb-1 h-10" />
            <p className="text-[10px]">Sello del cliente</p>
          </div>
        </div>
      </div>

      {/* ═══════ FOOTER ═══════ */}
      <div className="text-center text-[10px] text-gray-600 border-t pt-2">
        <p className="font-bold">{COMPANY_DATA.razonSocialLarga}</p>
        <p>{COMPANY_DATA.direccionCompleta} | Tel: {COMPANY_DATA.telefonosFormateados}</p>
      </div>
    </div>
  );
};
