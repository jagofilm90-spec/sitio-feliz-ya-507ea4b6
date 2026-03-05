import { QRCodeSVG } from "qrcode.react";
import { COMPANY_DATA } from "@/constants/companyData";

export type VarianteHojaCarga = "ORIGINAL" | "CLIENTE" | "ALMACÉN";

interface ProductoHojaCarga {
  cantidad: number;
  descripcion: string;
  pesoTotal: number | null;
  unidad: string;
}

export interface DatosHojaCargaUnificada {
  pedidoId: string;
  folio: string;
  fecha: string;
  cliente: {
    nombre: string;
  };
  sucursal?: {
    nombre: string;
    direccion?: string;
  };
  direccionEntrega?: string;
  productos: ProductoHojaCarga[];
  pesoTotalKg: number;
  total?: number;
  notas?: string;
}

interface Props {
  datos: DatosHojaCargaUnificada;
  variante: VarianteHojaCarga;
}

const fmtKg = (n: number) => `${n.toLocaleString("es-MX", { maximumFractionDigits: 2 })} kg`;

const varianteColors: Record<VarianteHojaCarga, { border: string; text: string }> = {
  ORIGINAL: { border: "border-blue-600", text: "text-blue-600" },
  CLIENTE: { border: "border-green-600", text: "text-green-600" },
  "ALMACÉN": { border: "border-amber-600", text: "text-amber-600" },
};

export const HojaCargaUnificadaTemplate = ({ datos, variante }: Props) => {
  const showQR = variante === "ORIGINAL";
  const colors = varianteColors[variante];
  const direccion = datos.sucursal?.direccion || datos.direccionEntrega || "—";
  const emptyRows = Math.max(0, 2 - datos.productos.length);

  return (
    <div className="p-5 bg-white text-black min-h-[11in] w-[8.5in] mx-auto font-sans text-[11px] print:p-4 flex flex-col">
      {/* Header + Variante combined */}
      <div className={`flex items-center justify-between pb-2 mb-2 border-b-[3px] ${colors.border}`}>
        <img src="/logo-almasa-header.png" alt="ALMASA" className="h-9 w-auto object-contain" />
        <div className="text-center flex-1 px-2">
          <h1 className="text-base font-black uppercase tracking-tight leading-tight">HOJA DE CARGA</h1>
          <p className="text-[8px] text-gray-400">{COMPANY_DATA.razonSocial}</p>
          <span className={`text-[10px] font-black tracking-[0.2em] uppercase ${colors.text}`}>{variante}</span>
        </div>
        {showQR ? (
          <QRCodeSVG value={`almasa:carga:${datos.pedidoId}`} size={56} level="M" />
        ) : (
          <div className="w-[56px]" />
        )}
      </div>

      {/* Info del pedido - 2 rows compact */}
      <div className="grid grid-cols-4 gap-0 border border-gray-300 rounded mb-2 text-[10px]">
        <div className="border-r border-gray-200 px-2 py-1">
          <span className="font-bold text-[8px] text-gray-400 uppercase block">Folio</span>
          <span className="font-bold text-sm leading-tight">{datos.folio}</span>
        </div>
        <div className="border-r border-gray-200 px-2 py-1">
          <span className="font-bold text-[8px] text-gray-400 uppercase block">Cliente</span>
          <span className="font-semibold leading-tight">{datos.cliente.nombre}</span>
        </div>
        <div className="border-r border-gray-200 px-2 py-1">
          <span className="font-bold text-[8px] text-gray-400 uppercase block">Peso Total</span>
          <span className="font-semibold leading-tight">{fmtKg(datos.pesoTotalKg)}</span>
        </div>
        <div className="px-2 py-1">
          <span className="font-bold text-[8px] text-gray-400 uppercase block">Dirección</span>
          <span className="font-semibold leading-tight text-[9px]">
            {direccion}
            {datos.sucursal && <span className="text-gray-500"> ({datos.sucursal.nombre})</span>}
          </span>
        </div>
      </div>

      {showQR && (
        <div className="text-[8px] text-gray-400 text-center mb-2">
          Últimos dígitos del folio: <strong className="text-black text-xs">{datos.folio.slice(-4)}</strong>
        </div>
      )}

      {/* Tabla de productos - adaptativa */}
      <table className="w-full mb-2 border-collapse">
        <thead>
          <tr className="bg-gray-800 text-white text-[9px]">
            <th className="py-1 px-2 text-center w-14 border border-gray-700">CANT.</th>
            <th className="py-1 px-2 text-left border border-gray-700">PRODUCTO</th>
            <th className="py-1 px-2 text-center w-14 border border-gray-700">UNIDAD</th>
            <th className="py-1 px-2 text-right w-18 border border-gray-700">PESO</th>
          </tr>
        </thead>
        <tbody>
          {datos.productos.map((prod, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
              <td className="py-1 px-2 border border-gray-300 text-center font-bold text-sm">{prod.cantidad}</td>
              <td className="py-1 px-2 border border-gray-300 text-[10px]">{prod.descripcion}</td>
              <td className="py-1 px-2 border border-gray-300 text-center text-[10px]">{prod.unidad}</td>
              <td className="py-1 px-2 border border-gray-300 text-right text-[10px]">
                {prod.pesoTotal ? fmtKg(prod.pesoTotal) : "-"}
              </td>
            </tr>
          ))}
          {Array.from({ length: emptyRows }).map((_, i) => (
            <tr key={`e-${i}`}>
              <td className="py-1 px-2 border border-gray-300">&nbsp;</td>
              <td className="py-1 px-2 border border-gray-300" />
              <td className="py-1 px-2 border border-gray-300" />
              <td className="py-1 px-2 border border-gray-300" />
            </tr>
          ))}
        </tbody>
      </table>

      {/* Notas */}
      {datos.notas && (
        <div className="border border-gray-300 rounded px-2 py-1 mb-2 text-[10px]">
          <p className="font-bold text-[8px] uppercase text-gray-400 mb-0.5">Notas</p>
          <p>{datos.notas}</p>
        </div>
      )}

      {/* Observaciones - 2 líneas */}
      <div className="border border-gray-300 rounded p-2 mb-2">
        <p className="text-[8px] font-bold uppercase text-gray-400 mb-1">Observaciones / Devoluciones / Faltantes</p>
        <div className="space-y-2">
          <div className="border-b border-gray-300 h-4" />
          <div className="border-b border-gray-300 h-4" />
        </div>
      </div>

      {/* Firmas */}
      <div className="grid grid-cols-2 gap-4 mt-auto">
        <div className="text-center">
          <div className="border-b-2 border-black h-8 mb-0.5" />
          <p className="text-[9px] font-bold">Entregó</p>
          <p className="text-[7px] text-gray-400">Nombre y firma</p>
        </div>
        <div className="text-center">
          <div className="border-b-2 border-black h-8 mb-0.5" />
          <p className="text-[9px] font-bold">Recibió</p>
          <p className="text-[7px] text-gray-400">Nombre, firma y sello</p>
        </div>
      </div>

      {/* Pagaré - solo variante CLIENTE */}
      {variante === "CLIENTE" && datos.total && (
        <div className="border-2 border-gray-400 p-2 text-[9px] leading-tight mt-2">
          <p className="text-center font-bold mb-1 text-[10px]">PAGARÉ</p>
          <p className="text-justify">
            &quot;Por el presente pagaré, reconozco deber y me comprometo incondicionalmente a pagar a la orden de
            <strong> ABARROTES LA MANITA S.A. DE C.V.</strong> la cantidad de <strong>${datos.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })} PESOS MEXICANOS</strong>,
            en la Ciudad de México, por haber recibido a mi entera satisfacción la mercancía descrita.
          </p>
          <p className="text-justify mt-1">
            &quot;Acepto pagar en caso de mora el 10% (diez por ciento) mensual durante el tiempo que se encuentre insoluto sin perjuicio al pago principal y sin que por esto se entienda
            prorrogado el plazo, este pagaré es mercantil y se encuentra regido por la Ley General de Títulos y Operaciones de Créditos según Artículos 170, 171, 174 y demás artículos
            aplicables al presente caso.
          </p>
          <div className="grid grid-cols-2 gap-6 mt-3">
            <div className="text-center">
              <div className="border-b border-black mb-0.5 h-6"></div>
              <p className="text-[8px]">Nombre y Firma de quien recibe</p>
            </div>
            <div className="text-center">
              <div className="border-b border-black mb-0.5 h-6"></div>
              <p className="text-[8px]">Fecha de recepción</p>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-2 border-t border-gray-200 pt-1 text-[7px] text-gray-300 text-center">
        <p>{COMPANY_DATA.razonSocial} — Hoja de Carga ({variante}) — {datos.folio}</p>
        <p className="italic text-gray-400 mt-0.5">"{COMPANY_DATA.slogan}"</p>
      </div>
    </div>
  );
};
