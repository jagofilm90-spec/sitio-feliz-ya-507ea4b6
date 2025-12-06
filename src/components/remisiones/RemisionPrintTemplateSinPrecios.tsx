import { format } from "date-fns";
import { es } from "date-fns/locale";
import { abreviarUnidad } from "@/lib/utils";

interface ProductoRemision {
  cantidad: number;
  unidad: string;
  descripcion: string;
  cantidadDisplay?: string;
}

interface DatosRemisionSinPrecios {
  folio: string;
  fecha: string;
  cliente: {
    nombre: string;
    rfc?: string;
    direccion_fiscal?: string;
    telefono?: string;
  };
  sucursal?: {
    nombre: string;
    direccion?: string;
  };
  productos: ProductoRemision[];
  condiciones_credito: string;
  vendedor?: string;
  notas?: string;
}

interface RemisionPrintTemplateSinPreciosProps {
  datos: DatosRemisionSinPrecios;
}

export const RemisionPrintTemplateSinPrecios = ({ datos }: RemisionPrintTemplateSinPreciosProps) => {
  const fechaFormateada = format(new Date(datos.fecha), "dd 'de' MMMM 'de' yyyy", { locale: es });
  
  return (
    <div className="p-8 bg-white text-black min-h-[11in] w-[8.5in] mx-auto font-sans text-sm print:p-6">
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-primary pb-4 mb-4">
        <div className="flex items-center gap-4">
          <img 
            src="/logo-almasa-header.png" 
            alt="ALMASA" 
            className="h-14 w-auto object-contain"
          />
          <div>
            <h1 className="text-2xl font-bold text-primary">ABARROTES LA MANITA</h1>
            <p className="text-xs text-gray-600">ABARROTES LA MANITA, S.A. DE C.V.</p>
          </div>
        </div>
        <div className="text-right">
          <div className="bg-primary text-primary-foreground px-4 py-2 rounded font-bold text-lg">
            HOJA DE CARGA
          </div>
          <p className="text-xs mt-1">Folio: <span className="font-bold">{datos.folio}</span></p>
          <p className="text-xs">Fecha: {fechaFormateada}</p>
        </div>
      </div>

      {/* Company Info */}
      <div className="grid grid-cols-2 gap-6 mb-4 text-xs">
        <div>
          <p className="font-semibold">Dirección Fiscal:</p>
          <p>Calle: MELCHOR OCAMPO No.Ext: 59</p>
          <p>Colonia: MAGDALENA MIXIUHCA</p>
          <p>Municipio: VENUSTIANO CARRANZA C.P.:15850</p>
          <p className="mt-1">Tel: (55) 56-00-77-81 / (55) 56-94-97-92</p>
        </div>
        <div>
          <p className="font-semibold">Dirección Entrega:</p>
          <p>Calle: MELCHOR OCAMPO No.Ext: 59</p>
          <p>Colonia: MAGDALENA MIXIUHCA</p>
          <p>Municipio: VENUSTIANO CARRANZA C.P.:15850</p>
        </div>
      </div>

      {/* Client Info */}
      <div className="bg-gray-100 p-3 rounded mb-4">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <p><span className="font-semibold">Cliente:</span> {datos.cliente.nombre}</p>
            {datos.cliente.rfc && <p><span className="font-semibold">RFC:</span> {datos.cliente.rfc}</p>}
            {datos.cliente.direccion_fiscal && (
              <p><span className="font-semibold">Dirección:</span> {datos.cliente.direccion_fiscal}</p>
            )}
          </div>
          <div>
            {datos.sucursal && (
              <>
                <p><span className="font-semibold">Sucursal:</span> {datos.sucursal.nombre}</p>
                {datos.sucursal.direccion && (
                  <p><span className="font-semibold">Entrega:</span> {datos.sucursal.direccion}</p>
                )}
              </>
            )}
            {datos.cliente.telefono && (
              <p><span className="font-semibold">Tel:</span> {datos.cliente.telefono}</p>
            )}
          </div>
        </div>
      </div>

      {/* Products Table - SIN PRECIOS */}
      <table className="w-full mb-4 text-xs">
        <thead>
          <tr className="bg-gray-800 text-white">
            <th className="p-2 text-left w-20">Cantidad</th>
            <th className="p-2 text-left w-28 font-bold">Presentación</th>
            <th className="p-2 text-left">Descripción</th>
          </tr>
        </thead>
        <tbody>
          {datos.productos.map((producto, index) => (
            <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
              <td className="p-2 border-b font-semibold">{producto.cantidadDisplay || producto.cantidad}</td>
              <td className="p-2 border-b font-semibold text-primary">{abreviarUnidad(producto.unidad)}</td>
              <td className="p-2 border-b">{producto.descripcion}</td>
            </tr>
          ))}
          {/* Empty rows to fill space */}
          {Array.from({ length: Math.max(0, 12 - datos.productos.length) }).map((_, i) => (
            <tr key={`empty-${i}`} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
              <td className="p-2 border-b">&nbsp;</td>
              <td className="p-2 border-b"></td>
              <td className="p-2 border-b"></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Info Section */}
      <div className="grid grid-cols-2 gap-6 mb-4">
        <div className="text-xs space-y-2">
          <div className="border p-2 rounded">
            <p><span className="font-semibold">Condiciones de Crédito:</span> {datos.condiciones_credito}</p>
            {datos.vendedor && <p><span className="font-semibold">Vendedor:</span> {datos.vendedor}</p>}
          </div>
        </div>
        <div className="border p-3 rounded">
          <p className="font-semibold text-center mb-2">Firma de Recepción</p>
          <div className="h-16 border-b border-black"></div>
          <p className="text-xs text-center mt-1 text-gray-500">Nombre y firma de quien recibe</p>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-gray-600 border-t pt-2">
        <p className="font-bold">UNA VEZ RECIBIDA LA MERCANCÍA NO SE ACEPTAN DEVOLUCIONES</p>
        {datos.notas && <p className="mt-1 italic">Notas: {datos.notas}</p>}
      </div>
    </div>
  );
};
