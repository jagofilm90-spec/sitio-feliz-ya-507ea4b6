import { COMPANY_DATA } from "@/constants/companyData";

interface ProductoHojaCarga {
  cantidad: number;
  descripcion: string;
  pesoTotal: number | null;
  precioUnitario: number;
  importe: number;
  unidad: string;
  precioPorKilo: boolean;
}

export interface DatosHojaCargaCliente {
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
  sucursal?: {
    nombre: string;
    direccion?: string;
  };
  productos: ProductoHojaCarga[];
  subtotal: number;
  iva: number;
  ieps: number;
  total: number;
  pesoTotalKg: number;
  notas?: string;
  // Operational data (filled during loading/dispatch)
  chofer?: string;
  ayudantes?: string[];
  almacenista?: string;
  horaSalida?: string;
  vehiculo?: string;
  placas?: string;
}

interface HojaCargaClienteTemplateProps {
  datos: DatosHojaCargaCliente;
}

const fmtMoney = (n: number) => `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;
const fmtKg = (n: number) => `${n.toLocaleString("es-MX", { maximumFractionDigits: 2 })} kg`;

export const HojaCargaClienteTemplate = ({ datos }: HojaCargaClienteTemplateProps) => {
  return (
    <div className="p-6 bg-white text-black min-h-[11in] w-[8.5in] mx-auto font-sans text-[11px] print:p-4 flex flex-col">
      {/* Header */}
      <div className="text-center border-b-2 border-black pb-2 mb-2">
        <div className="flex items-center justify-center gap-3 mb-1">
          <img src="/logo-almasa-header.png" alt="ALMASA" className="h-10 w-auto object-contain" />
          <h1 className="text-xl font-black uppercase tracking-tight">{COMPANY_DATA.razonSocial}</h1>
        </div>
        <p className="text-[9px] text-gray-600">
          RFC: {COMPANY_DATA.rfc} | Tel: {COMPANY_DATA.telefonosFormateados}
        </p>
        <p className="text-[8px] font-bold uppercase text-gray-500 mt-1">HOJA DE ENTREGA — CLIENTE</p>
      </div>

      {/* Client + Folio info */}
      <div className="border border-gray-400 rounded mb-2">
        <div className="grid grid-cols-[1fr_auto] gap-0">
          <div className="border-b border-r border-gray-300 px-2 py-1">
            <span className="text-[9px] font-bold text-gray-500 uppercase">Cliente:</span>
            <span className="ml-1 font-bold text-sm">{datos.cliente.nombre}</span>
          </div>
          <div className="border-b border-gray-300 px-2 py-1 text-center min-w-[100px]">
            <span className="text-[9px] font-bold text-gray-500 uppercase">Folio:</span>
            <span className="ml-1 font-bold text-sm">{datos.folio}</span>
          </div>
          <div className="border-r border-gray-300 px-2 py-1">
            <span className="text-[9px] font-bold text-gray-500 uppercase">Dirección:</span>
            <span className="ml-1 text-[10px]">
              {datos.sucursal?.direccion || datos.cliente.direccionFiscal || "—"}
            </span>
          </div>
          <div className="px-2 py-1 text-center">
            <span className="text-[9px] font-bold text-gray-500 uppercase">Crédito:</span>
            <span className="ml-1 text-[10px] font-semibold">{datos.terminoCredito}</span>
          </div>
        </div>
      </div>

      {/* Operational info bar */}
      {(datos.chofer || datos.vehiculo) && (
        <div className="grid grid-cols-4 gap-0 border border-gray-400 rounded mb-2 text-[9px]">
          <div className="border-r border-gray-300 px-2 py-1">
            <span className="font-bold text-gray-500 uppercase">Chofer:</span>
            <p className="font-semibold">{datos.chofer || "—"}</p>
          </div>
          <div className="border-r border-gray-300 px-2 py-1">
            <span className="font-bold text-gray-500 uppercase">Ayudantes:</span>
            <p className="font-semibold">{datos.ayudantes?.join(", ") || "—"}</p>
          </div>
          <div className="border-r border-gray-300 px-2 py-1">
            <span className="font-bold text-gray-500 uppercase">Vehículo:</span>
            <p className="font-semibold">{datos.vehiculo || "—"} {datos.placas ? `(${datos.placas})` : ""}</p>
          </div>
          <div className="px-2 py-1">
            <span className="font-bold text-gray-500 uppercase">Hora Salida:</span>
            <p className="font-semibold">{datos.horaSalida || "—"}</p>
          </div>
        </div>
      )}

      {/* Weight + Products count bar */}
      <div className="grid grid-cols-3 gap-0 border border-gray-400 rounded mb-2 text-[10px]">
        <div className="border-r border-gray-300 px-2 py-1">
          <span className="font-bold text-[9px] text-gray-500 uppercase">Peso Total:</span>
          <span className="ml-1 font-semibold">{fmtKg(datos.pesoTotalKg)}</span>
        </div>
        <div className="border-r border-gray-300 px-2 py-1">
          <span className="font-bold text-[9px] text-gray-500 uppercase">Productos:</span>
          <span className="ml-1 font-semibold">{datos.productos.length}</span>
        </div>
        <div className="px-2 py-1">
          <span className="font-bold text-[9px] text-gray-500 uppercase">Vendedor:</span>
          <span className="ml-1 font-semibold">{datos.vendedor}</span>
        </div>
      </div>

      {/* Product table */}
      <table className="w-full mb-2 border-collapse">
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
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end mb-3">
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

      {/* Bank info */}
      <div className="border-2 border-gray-400 rounded p-2 mb-3 text-[9px]">
        <p className="font-bold text-[10px] uppercase mb-1">Datos Bancarios para Pago</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
          <p><span className="font-semibold">Beneficiario:</span> {COMPANY_DATA.datosBancarios.beneficiario}</p>
          <p><span className="font-semibold">Banco:</span> {COMPANY_DATA.datosBancarios.banco}</p>
          <p><span className="font-semibold">Cuenta:</span> {COMPANY_DATA.datosBancarios.cuenta}</p>
          <p><span className="font-semibold">CLABE:</span> {COMPANY_DATA.datosBancarios.clabe}</p>
        </div>
      </div>

      {/* Legal notice */}
      <div className="border border-gray-400 rounded p-2 mb-3 text-[8px] text-gray-600">
        <p className="font-bold text-[9px] uppercase mb-1">Aviso Importante</p>
        <p>
          La mercancía aquí descrita fue recibida a mi entera satisfacción. Me comprometo a pagar
          el monto total indicado en los términos de crédito acordados. En caso de incumplimiento,
          acepto cubrir los costos de cobranza y gastos legales aplicables.
        </p>
      </div>

      {/* Pagaré section */}
      <div className="border-2 border-black rounded p-3 mb-3">
        <h3 className="text-center font-black text-sm mb-2 uppercase">Pagaré</h3>
        <p className="text-[9px] text-gray-700 mb-2">
          Debo y pagaré incondicionalmente a la orden de <strong>{COMPANY_DATA.razonSocialLarga}</strong> en
          esta ciudad, la cantidad de <strong>{fmtMoney(datos.total)}</strong> ({datos.terminoCredito}).
        </p>
        <p className="text-[9px] text-gray-700">
          Valor recibido a mi entera satisfacción. Este pagaré forma parte integral de las operaciones
          contenidas en la Remisión {datos.folio}.
        </p>
      </div>

      {/* Signature blocks */}
      <div className="grid grid-cols-2 gap-6 mt-auto">
        <div className="text-center">
          <div className="border-b-2 border-black h-12 mb-1" />
          <p className="text-[10px] font-bold">Entregó (Chofer)</p>
        </div>
        <div className="text-center">
          <div className="border-b-2 border-black h-12 mb-1" />
          <p className="text-[10px] font-bold">Recibió (Cliente)</p>
          <p className="text-[8px] text-gray-500">Nombre, firma y sello</p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-2 border-t border-gray-200 pt-1 text-[7.5px] text-gray-400 text-center">
        <p>{COMPANY_DATA.razonSocial} | {COMPANY_DATA.direccionCompletaMayusculas}</p>
      </div>
    </div>
  );
};
