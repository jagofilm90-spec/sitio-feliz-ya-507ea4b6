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
  notas?: string;
}

interface Props {
  datos: DatosHojaCargaUnificada;
  variante: VarianteHojaCarga;
}

const fmtKg = (n: number) => `${n.toLocaleString("es-MX", { maximumFractionDigits: 2 })} kg`;

const varianteColors: Record<VarianteHojaCarga, { bg: string; border: string; text: string }> = {
  ORIGINAL: { bg: "bg-blue-600", border: "border-blue-600", text: "text-blue-600" },
  CLIENTE: { bg: "bg-green-600", border: "border-green-600", text: "text-green-600" },
  "ALMACÉN": { bg: "bg-amber-600", border: "border-amber-600", text: "text-amber-600" },
};

export const HojaCargaUnificadaTemplate = ({ datos, variante }: Props) => {
  const showQR = variante === "ORIGINAL";
  const colors = varianteColors[variante];
  const direccion = datos.sucursal?.direccion || datos.direccionEntrega || "—";

  return (
    <div className="p-6 bg-white text-black min-h-[11in] w-[8.5in] mx-auto font-sans text-[11px] print:p-4 flex flex-col">
      {/* Header */}
      <div className="text-center border-b-2 border-black pb-2 mb-3">
        <div className="flex items-center justify-between">
          <img src="/logo-almasa-header.png" alt="ALMASA" className="h-10 w-auto object-contain" />
          <div className="text-center flex-1">
            <h1 className="text-lg font-black uppercase tracking-tight">HOJA DE CARGA</h1>
            <p className="text-[9px] text-gray-500">{COMPANY_DATA.razonSocial}</p>
          </div>
          {showQR ? (
            <QRCodeSVG value={`almasa:carga:${datos.pedidoId}`} size={72} level="M" />
          ) : (
            <div className="w-[72px]" /> /* spacer */
          )}
        </div>
      </div>

      {/* Variante badge */}
      <div className={`${colors.bg} text-white text-center py-1.5 rounded mb-3`}>
        <span className="text-base font-black tracking-widest uppercase">{variante}</span>
      </div>

      {/* Info del pedido */}
      <div className="grid grid-cols-3 gap-0 border border-gray-400 rounded mb-3 text-[10px]">
        <div className="border-r border-gray-300 px-2 py-1.5">
          <span className="font-bold text-[9px] text-gray-500 uppercase">Folio:</span>
          <span className="ml-1 font-bold text-sm">{datos.folio}</span>
        </div>
        <div className="border-r border-gray-300 px-2 py-1.5">
          <span className="font-bold text-[9px] text-gray-500 uppercase">Cliente:</span>
          <span className="ml-1 font-semibold">{datos.cliente.nombre}</span>
        </div>
        <div className="px-2 py-1.5">
          <span className="font-bold text-[9px] text-gray-500 uppercase">Peso Total:</span>
          <span className="ml-1 font-semibold">{fmtKg(datos.pesoTotalKg)}</span>
        </div>
      </div>

      {/* Dirección de entrega */}
      <div className="border border-gray-300 rounded px-2 py-1.5 mb-3 text-[10px]">
        <span className="font-bold text-[9px] text-gray-500 uppercase">Dirección de Entrega:</span>
        <span className="ml-1 font-semibold">{direccion}</span>
        {datos.sucursal && (
          <span className="ml-2 text-gray-600">({datos.sucursal.nombre})</span>
        )}
      </div>

      {showQR && (
        <div className="border border-gray-300 rounded px-2 py-1 mb-3 text-[9px] text-gray-500 text-center">
          También puede ingresar los últimos dígitos del folio: <strong className="text-black text-sm">{datos.folio.slice(-4)}</strong>
        </div>
      )}

      {/* Tabla de productos */}
      <table className="w-full mb-3 border-collapse flex-grow">
        <thead>
          <tr className="bg-gray-800 text-white text-[10px]">
            <th className="p-1.5 text-center w-10 border border-gray-700">✓</th>
            <th className="p-1.5 text-center w-16 border border-gray-700">CANT.</th>
            <th className="p-1.5 text-left border border-gray-700">PRODUCTO</th>
            <th className="p-1.5 text-center w-16 border border-gray-700">UNIDAD</th>
            <th className="p-1.5 text-right w-20 border border-gray-700">PESO</th>
          </tr>
        </thead>
        <tbody>
          {datos.productos.map((prod, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
              <td className="p-1.5 border border-gray-300 text-center">
                <div className="w-5 h-5 border-2 border-gray-400 rounded mx-auto" />
              </td>
              <td className="p-1.5 border border-gray-300 text-center font-bold text-sm">{prod.cantidad}</td>
              <td className="p-1.5 border border-gray-300 text-[10px]">{prod.descripcion}</td>
              <td className="p-1.5 border border-gray-300 text-center text-[10px]">{prod.unidad}</td>
              <td className="p-1.5 border border-gray-300 text-right text-[10px]">
                {prod.pesoTotal ? fmtKg(prod.pesoTotal) : "-"}
              </td>
            </tr>
          ))}
          {/* Empty rows for padding */}
          {Array.from({ length: Math.max(0, 6 - datos.productos.length) }).map((_, i) => (
            <tr key={`e-${i}`}>
              <td className="p-1.5 border border-gray-300">&nbsp;</td>
              <td className="p-1.5 border border-gray-300" />
              <td className="p-1.5 border border-gray-300" />
              <td className="p-1.5 border border-gray-300" />
              <td className="p-1.5 border border-gray-300" />
            </tr>
          ))}
        </tbody>
      </table>

      {/* Notas */}
      {datos.notas && (
        <div className="border border-gray-300 rounded p-2 mb-3 text-[10px]">
          <p className="font-bold text-[9px] uppercase text-gray-500 mb-0.5">Notas del Pedido</p>
          <p>{datos.notas}</p>
        </div>
      )}

      {/* Observaciones (espacio para escribir a mano) */}
      <div className="border border-gray-400 rounded p-3 mb-3">
        <p className="text-[9px] font-bold uppercase text-gray-500 mb-1">Observaciones / Devoluciones / Faltantes</p>
        <div className="space-y-3">
          <div className="border-b border-gray-300 h-5" />
          <div className="border-b border-gray-300 h-5" />
          <div className="border-b border-gray-300 h-5" />
        </div>
      </div>

      {/* Firmas */}
      <div className="grid grid-cols-2 gap-6 mt-auto">
        <div className="text-center">
          <div className="border-b-2 border-black h-12 mb-1" />
          <p className="text-[10px] font-bold">Entregó</p>
          <p className="text-[8px] text-gray-500">Nombre y firma</p>
        </div>
        <div className="text-center">
          <div className="border-b-2 border-black h-12 mb-1" />
          <p className="text-[10px] font-bold">Recibió</p>
          <p className="text-[8px] text-gray-500">Nombre, firma y sello</p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-3 border-t border-gray-200 pt-1 text-[7.5px] text-gray-400 text-center">
        <p>{COMPANY_DATA.razonSocial} — Hoja de Carga ({variante}) — {datos.folio}</p>
      </div>
    </div>
  );
};
