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
  numeroDia?: number | null;
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

const isAlmacen = (v: VarianteHojaCarga) => v === "ALMACÉN";

export const HojaCargaUnificadaTemplate = ({ datos, variante }: Props) => {
  const showQR = variante === "ORIGINAL";
  const almacen = isAlmacen(variante);
  const colors = varianteColors[variante];
  const direccion = datos.sucursal?.direccion || datos.direccionEntrega || "—";
  const emptyRows = Math.max(0, 2 - datos.productos.length);

  return (
    <div className="p-5 bg-white text-black min-h-[11in] w-[8.5in] mx-auto font-sans text-[10px] print:p-4 flex flex-col">
      {/* Header */}
      <div className={`flex items-center justify-between pb-2 mb-2 border-b-2 ${colors.border}`}>
        <div className="flex flex-col items-center">
          <span className="text-[7px] font-semibold tracking-[0.15em] text-gray-500 uppercase">DESDE 1904</span>
          <img src="/logo-almasa-header.png" alt="ALMASA" className="h-9 w-auto object-contain" />
        </div>
        <div className="text-center flex-1 px-2">
          <h1 className="text-sm font-bold uppercase tracking-tight leading-tight">HOJA DE CARGA</h1>
          {datos.numeroDia && (
            <p className="text-base font-black leading-tight">NOTA #{datos.numeroDia}</p>
          )}
          <p className="text-[8px] text-gray-400 font-normal">{COMPANY_DATA.razonSocial}</p>
          <span className={`text-[9px] font-bold tracking-[0.2em] uppercase ${colors.text}`}>{variante}</span>
        </div>
        {showQR ? (
          <QRCodeSVG value={`almasa:carga:${datos.pedidoId}`} size={56} level="M" />
        ) : (
          <div className="w-[56px]" />
        )}
      </div>

      {/* Info del pedido */}
      <div className="grid grid-cols-4 gap-0 border border-gray-300 rounded mb-2">
        <div className="border-r border-gray-200 px-2 py-1">
          <span className="text-[8px] font-semibold text-gray-500 uppercase block">Folio</span>
          <span className="text-[10px] font-medium leading-tight">{datos.folio}</span>
        </div>
        <div className="border-r border-gray-200 px-2 py-1">
          <span className="text-[8px] font-semibold text-gray-500 uppercase block">Cliente</span>
          <span className="text-[10px] font-medium leading-tight">{datos.cliente.nombre}</span>
        </div>
        <div className="border-r border-gray-200 px-2 py-1">
          <span className="text-[8px] font-semibold text-gray-500 uppercase block">Peso Total</span>
          <span className="text-[10px] font-medium leading-tight">{fmtKg(datos.pesoTotalKg)}</span>
        </div>
        <div className="px-2 py-1">
          <span className="text-[8px] font-semibold text-gray-500 uppercase block">Dirección</span>
          <span className="text-[9px] font-medium leading-tight">
            {direccion}
            {datos.sucursal && <span className="text-gray-500"> ({datos.sucursal.nombre})</span>}
          </span>
        </div>
      </div>

      {showQR && (
        <div className="text-[8px] text-gray-400 text-center mb-2">
          Últimos dígitos del folio: <strong className="text-black text-[10px]">{datos.folio.slice(-4)}</strong>
        </div>
      )}

      {/* Tabla de productos (5 columnas) */}
      <table className="w-full mb-1 border-collapse" style={{ tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '10%' }} />
          <col style={{ width: '10%' }} />
          <col style={{ width: '12%' }} />
          <col style={{ width: '58%' }} />
          <col style={{ width: '10%' }} />
        </colgroup>
        <thead>
          <tr className="bg-gray-800 text-white text-[8px]">
            <th className="py-1 px-2 text-center border border-gray-700 font-semibold">CANT.</th>
            <th className="py-1 px-2 text-center border border-gray-700 font-semibold">UNIDAD</th>
            <th className="py-1 px-2 text-right border border-gray-700 font-semibold">PESO KG</th>
            <th className="py-1 px-2 text-left border border-gray-700 font-semibold">DESCRIPCIÓN</th>
            <th className="py-1 px-2 text-center border border-gray-700 font-semibold">✓</th>
          </tr>
        </thead>
        <tbody>
          {datos.productos.map((prod, i) => {
            const capitalUnidad = prod.unidad ? prod.unidad.charAt(0).toUpperCase() + prod.unidad.slice(1) : '';
            return (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="py-1 px-2 border border-gray-300 text-center text-[9px] font-medium">{prod.cantidad}</td>
                <td className="py-1 px-2 border border-gray-300 text-center text-[9px]">{capitalUnidad}</td>
                <td className="py-1 px-2 border border-gray-300 text-right text-[9px]">
                  {prod.pesoTotal ? `${prod.pesoTotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })} kg` : "-"}
                </td>
                <td className="py-1 px-2 border border-gray-300 text-[9px]">{prod.descripcion}</td>
                <td className="py-1 px-2 border border-gray-300 text-center">
                  <div className="w-4 h-4 border-2 border-gray-400 mx-auto" />
                </td>
              </tr>
            );
          })}
          {Array.from({ length: emptyRows }).map((_, i) => (
            <tr key={`e-${i}`}>
              <td className="py-1 px-2 border border-gray-300">&nbsp;</td>
              <td className="py-1 px-2 border border-gray-300" />
              <td className="py-1 px-2 border border-gray-300" />
              <td className="py-1 px-2 border border-gray-300" />
              <td className="py-1 px-2 border border-gray-300" />
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-100 text-[9px] font-semibold">
            <td className="py-1 px-2 border border-gray-300 text-center">{datos.productos.reduce((s, p) => s + p.cantidad, 0)}</td>
            <td className="py-1 px-2 border border-gray-300 text-center text-[8px]">TOTAL</td>
            <td className="py-1 px-2 border border-gray-300 text-right">{fmtKg(datos.pesoTotalKg)}</td>
            <td className="py-1 px-2 border border-gray-300" colSpan={2} />
          </tr>
        </tfoot>
      </table>

      {/* No reclamaciones — solo ORIGINAL y CLIENTE */}
      {!almacen && (
        <p className="text-[8px] font-semibold text-center uppercase tracking-wide mb-2">
          UNA VEZ RECIBIDA LA MERCANCÍA NO SE ADMITEN RECLAMACIONES NI CAMBIOS
        </p>
      )}

      {/* Notas — todas las variantes */}
      {datos.notas && (
        <div className="border border-gray-300 rounded px-2 py-1 mb-2">
          <p className="text-[8px] font-semibold uppercase text-gray-500 mb-0.5">Notas</p>
          <p className="text-[9px] font-normal">{datos.notas}</p>
        </div>
      )}

      {/* Observaciones — solo ORIGINAL y CLIENTE */}
      {!almacen && (
        <div className="border border-gray-300 rounded p-2 mb-2">
          <p className="text-[8px] font-semibold uppercase text-gray-500 mb-1">Observaciones / Devoluciones / Faltantes</p>
          <div className="space-y-2">
            <div className="border-b border-gray-300 h-4" />
            <div className="border-b border-gray-300 h-4" />
          </div>
        </div>
      )}

      {/* Aviso importante — solo ORIGINAL y CLIENTE */}
      {!almacen && (
        <div className="border border-gray-400 rounded px-2 py-1.5 mb-2 text-center">
          <p className="text-[9px] font-bold uppercase mb-0.5">AVISO IMPORTANTE:</p>
          <p className="text-[8px] font-semibold">FAVOR DE REVISAR QUE SU PEDIDO LLEGUE COMPLETO, SI TIENE ALGUNA DUDA O QUEJA</p>
          <p className="text-[8px] font-semibold">FAVOR DE COMUNICARSE AL TELÉFONO <strong className="text-[9px]">{COMPANY_DATA.telefonos.principal}</strong></p>
        </div>
      )}

      {/* Firmas Entregó/Recibió — solo ORIGINAL y CLIENTE */}
      {!almacen && (
        <div className="grid grid-cols-2 gap-4 mt-auto">
          <div className="text-center">
            <div className="border-b-2 border-black h-8 mb-0.5" />
            <p className="text-[8px] font-medium">Entregó</p>
            <p className="text-[7px] text-gray-400">Nombre y firma</p>
          </div>
          <div className="text-center">
            <div className="border-b-2 border-black h-8 mb-0.5" />
            <p className="text-[8px] font-medium">Recibió</p>
            <p className="text-[7px] text-gray-400">Nombre, firma y sello</p>
          </div>
        </div>
      )}

      {/* Pagaré — solo ORIGINAL y CLIENTE */}
      {!almacen && (variante === "CLIENTE" || variante === "ORIGINAL") && datos.total && (
        <div className="border-2 border-gray-400 p-2 text-[9px] leading-tight mt-2">
          <p className="text-center font-bold mb-1">PAGARÉ</p>
          <p className="text-justify text-[8px]">
            &quot;Por el presente pagaré, reconozco deber y me comprometo incondicionalmente a pagar a la orden de
            <strong> ABARROTES LA MANITA S.A. DE C.V.</strong> la cantidad de <strong>${datos.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })} PESOS MEXICANOS</strong>,
            en la Ciudad de México, por haber recibido a mi entera satisfacción la mercancía descrita.
          </p>
          <p className="text-justify text-[8px] mt-1">
            &quot;Acepto pagar en caso de mora el 10% (diez por ciento) mensual durante el tiempo que se encuentre insoluto sin perjuicio al pago principal y sin que por esto se entienda
            prorrogado el plazo, este pagaré es mercantil y se encuentra regido por la Ley General de Títulos y Operaciones de Créditos según Artículos 170, 171, 174 y demás artículos
            aplicables al presente caso.
          </p>
          <div className="grid grid-cols-2 gap-6 mt-3">
            <div className="text-center">
              <div className="border-b border-black mb-0.5 h-6" />
              <p className="text-[8px] font-medium">Nombre y Firma de quien recibe</p>
            </div>
            <div className="text-center">
              <div className="border-b border-black mb-0.5 h-6" />
              <p className="text-[8px] font-medium">Fecha de recepción</p>
            </div>
          </div>
        </div>
      )}

      {/* Acepto Conformidad — solo ALMACÉN */}
      {almacen && (
        <div className="mt-auto text-center">
          <p className="text-[9px] font-bold uppercase tracking-wide mb-4">ACEPTO CONFORMIDAD</p>
          <div className="mx-auto w-60">
            <div className="border-b-2 border-black h-10 mb-1" />
            <p className="text-[8px] font-medium text-gray-600">Nombre, firma y sello</p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-2 border-t border-gray-200 pt-1 text-[7px] text-gray-300 text-center">
        <p>{COMPANY_DATA.razonSocial} — Hoja de Carga ({variante}) — {datos.folio}</p>
        <p className="font-bold text-gray-500 mt-0.5 tracking-wide text-[8px]">"{COMPANY_DATA.slogan.toUpperCase()}"</p>
      </div>
    </div>
  );
};
