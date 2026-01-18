import { format } from "date-fns";
import { es } from "date-fns/locale";
import { abreviarUnidad } from "@/lib/utils";
import { COMPANY_DATA } from "@/constants/companyData";

interface ProductoRemision {
  cantidad: number;
  unidad: string; // Ahora contiene la presentación calculada para bodegueros
  descripcion: string;
  precio_unitario: number;
  total: number;
  cantidadDisplay?: string; // Cantidad con unidad original (ej: "45 kg")
  es_cortesia?: boolean; // Indica si es cortesía sin cargo
  kilos_totales?: number; // Total de kilos (cantidad × presentación)
  precio_por_kilo?: boolean; // Si el precio es por kilo
}

interface DatosRemision {
  folio: string;
  fecha: string;
  cliente: {
    nombre: string;
    razon_social?: string;
    rfc?: string;
    direccion_fiscal?: string;
    telefono?: string;
  };
  sucursal?: {
    nombre: string;
    direccion?: string;
    contacto?: string;
    telefono?: string;
    // Datos fiscales propios de sucursal (cuando factura por separado)
    razon_social?: string;
    rfc?: string;
    direccion_fiscal?: string;
  };
  productos: ProductoRemision[];
  subtotal: number;
  iva: number;
  ieps: number;
  total: number;
  condiciones_credito: string;
  vendedor?: string;
  notas?: string;
}

interface RemisionPrintTemplateProps {
  datos: DatosRemision;
}

export const RemisionPrintTemplate = ({ datos }: RemisionPrintTemplateProps) => {
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
            NOTA DE VENTA
          </div>
          <p className="text-xs mt-1">Folio: <span className="font-bold">{datos.folio}</span></p>
          <p className="text-xs">Fecha: {fechaFormateada}</p>
        </div>
      </div>

      {/* Company Info */}
      <div className="grid grid-cols-2 gap-6 mb-4 text-xs">
        <div>
          <p className="font-semibold">Dirección Fiscal:</p>
          <p>Calle: {COMPANY_DATA.direccion.calle} No.Ext: {COMPANY_DATA.direccion.numeroExterior}</p>
          <p>Colonia: {COMPANY_DATA.direccion.colonia}</p>
          <p>Municipio: {COMPANY_DATA.direccion.municipio} C.P.: {COMPANY_DATA.direccion.codigoPostal}</p>
          <p>RFC: {COMPANY_DATA.rfc}</p>
          <p className="mt-1">Tel: {COMPANY_DATA.telefonosAlternos}</p>
        </div>
        <div>
          <p className="font-semibold">Dirección Entrega:</p>
          <p>Calle: {COMPANY_DATA.direccion.calle} No.Ext: {COMPANY_DATA.direccion.numeroExterior}</p>
          <p>Colonia: {COMPANY_DATA.direccion.colonia}</p>
          <p>Municipio: {COMPANY_DATA.direccion.municipio} C.P.: {COMPANY_DATA.direccion.codigoPostal}</p>
        </div>
      </div>

      {/* Client Info - Datos Fiscales y de Entrega */}
      <div className="bg-gray-100 p-3 rounded mb-4">
        <div className="grid grid-cols-2 gap-4 text-xs">
          {/* Columna izquierda: Datos Fiscales */}
          <div className="border-r pr-3">
            <p className="font-bold text-primary mb-1 uppercase text-[10px]">Datos Fiscales</p>
            <p><span className="font-semibold">Cliente:</span> {datos.cliente.nombre}</p>
            {/* Prioridad: Si sucursal tiene RFC propio, usar datos fiscales de sucursal */}
            {datos.sucursal?.rfc ? (
              <>
                {datos.sucursal.razon_social && (
                  <p><span className="font-semibold">Razón Social:</span> {datos.sucursal.razon_social}</p>
                )}
                <p><span className="font-semibold">RFC:</span> {datos.sucursal.rfc}</p>
                {datos.sucursal.direccion_fiscal && (
                  <p><span className="font-semibold">Dir. Fiscal:</span> {datos.sucursal.direccion_fiscal}</p>
                )}
              </>
            ) : (
              <>
                {datos.cliente.razon_social && (
                  <p><span className="font-semibold">Razón Social:</span> {datos.cliente.razon_social}</p>
                )}
                {datos.cliente.rfc && <p><span className="font-semibold">RFC:</span> {datos.cliente.rfc}</p>}
                {datos.cliente.direccion_fiscal && (
                  <p><span className="font-semibold">Dir. Fiscal:</span> {datos.cliente.direccion_fiscal}</p>
                )}
              </>
            )}
            {datos.cliente.telefono && (
              <p><span className="font-semibold">Tel:</span> {datos.cliente.telefono}</p>
            )}
          </div>
          {/* Columna derecha: Datos de Entrega */}
          <div className="pl-3">
            <p className="font-bold text-primary mb-1 uppercase text-[10px]">Datos de Entrega</p>
            {datos.sucursal ? (
              <>
                <p><span className="font-semibold">Sucursal:</span> {datos.sucursal.nombre}</p>
                {datos.sucursal.direccion && (
                  <p><span className="font-semibold">Dirección:</span> {datos.sucursal.direccion}</p>
                )}
                {datos.sucursal.contacto && (
                  <p><span className="font-semibold">Contacto:</span> {datos.sucursal.contacto}</p>
                )}
                {datos.sucursal.telefono && (
                  <p><span className="font-semibold">Tel:</span> {datos.sucursal.telefono}</p>
                )}
              </>
            ) : (
              <p className="text-gray-500 italic">Entrega en dirección fiscal</p>
            )}
          </div>
        </div>
      </div>

      {/* Products Table */}
      <table className="w-full mb-4 text-xs">
        <thead>
          <tr className="bg-gray-800 text-white">
            <th className="p-2 text-right w-16">Kilos</th>
            <th className="p-2 text-left w-20">Cantidad</th>
            <th className="p-2 text-left">Descripción</th>
            <th className="p-2 text-right w-20">Precio</th>
            <th className="p-2 text-right w-24">Total</th>
          </tr>
        </thead>
        <tbody>
          {datos.productos.map((producto, index) => (
            <tr 
              key={index} 
              className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50"} ${producto.es_cortesia ? "bg-amber-50" : ""}`}
            >
              <td className="p-2 border-b text-right font-semibold">
                {producto.kilos_totales ? `${producto.kilos_totales.toLocaleString('es-MX')} kg` : '-'}
              </td>
              <td className="p-2 border-b">
                {producto.cantidad} {abreviarUnidad(producto.unidad)}
              </td>
              <td className="p-2 border-b">
                {producto.descripcion}
                {producto.es_cortesia && (
                  <span className="ml-2 text-amber-600 font-semibold text-xs">(CORTESÍA)</span>
                )}
              </td>
              <td className="p-2 border-b text-right">
                {producto.es_cortesia ? (
                  <span className="text-amber-600 font-medium">CORTESÍA</span>
                ) : producto.precio_por_kilo ? (
                  `$${producto.precio_unitario.toLocaleString('es-MX', { minimumFractionDigits: 2 })}/kg`
                ) : (
                  `$${producto.precio_unitario.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
                )}
              </td>
              <td className="p-2 border-b text-right font-semibold">
                {producto.es_cortesia ? (
                  <span className="text-amber-600 font-medium">$0.00</span>
                ) : (
                  `$${producto.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
                )}
              </td>
            </tr>
          ))}
          {/* Empty rows to fill space */}
          {Array.from({ length: Math.max(0, 8 - datos.productos.length) }).map((_, i) => (
            <tr key={`empty-${i}`} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
              <td className="p-2 border-b">&nbsp;</td>
              <td className="p-2 border-b"></td>
              <td className="p-2 border-b"></td>
              <td className="p-2 border-b"></td>
              <td className="p-2 border-b"></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals and Payment Info */}
      <div className="grid grid-cols-2 gap-6 mb-4">
        <div className="text-xs space-y-2">
          <div className="border p-2 rounded">
            <p className="font-semibold mb-1">Para Depósito o Transferencia Bancaria a Nombre de:</p>
            <p>ABARROTES LA MANITA S.A. DE C.V.</p>
            <p className="mt-1"><span className="font-semibold">Referencia:</span> {datos.folio}</p>
          </div>
          <div className="border p-2 rounded">
            <p><span className="font-semibold">Condiciones de Crédito:</span> {datos.condiciones_credito}</p>
            {datos.vendedor && <p><span className="font-semibold">Vendedor:</span> {datos.vendedor}</p>}
          </div>
        </div>
        <div>
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td className="p-2 font-semibold text-right">SubTotal:</td>
                <td className="p-2 text-right w-32 border">${datos.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td className="p-2 font-semibold text-right">IVA (16%):</td>
                <td className="p-2 text-right border">${datos.iva.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
              </tr>
              {datos.ieps > 0 && (
                <tr>
                  <td className="p-2 font-semibold text-right">IEPS (8%):</td>
                  <td className="p-2 text-right border">${datos.ieps.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                </tr>
              )}
              <tr className="bg-gray-800 text-white">
                <td className="p-2 font-bold text-right">G. Total:</td>
                <td className="p-2 text-right font-bold">${datos.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagaré */}
      <div className="border-2 border-gray-400 p-3 text-[10px] leading-tight mb-4">
        <p className="text-center font-bold mb-2">PAGARÉ</p>
        <p className="text-justify">
          &quot;Por el presente pagaré, reconozco deber y me comprometo incondicionalmente a pagar a la orden de 
          <strong> ABARROTES LA MANITA S.A. DE C.V.</strong> la cantidad de <strong>${datos.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })} PESOS MEXICANOS</strong>, 
          en la Ciudad de México, por haber recibido a mi entera satisfacción la mercancía descrita.
        </p>
        <p className="text-justify mt-2">
          &quot;Acepto pagar en caso de mora el 10% (diez por ciento) mensual durante el tiempo que se encuentre insoluto sin perjuicio al pago principal y sin que por esto se entienda 
          prorrogado el plazo, este pagaré es mercantil y se encuentra regido por la Ley General de Títulos y Operaciones de Créditos según Artículos 170, 171, 174 y demás artículos 
          aplicables al presente caso.
        </p>
        <div className="grid grid-cols-2 gap-8 mt-4">
          <div className="text-center">
            <div className="border-b border-black mb-1 h-8"></div>
            <p>Nombre y Firma de quien recibe</p>
          </div>
          <div className="text-center">
            <div className="border-b border-black mb-1 h-8"></div>
            <p>Fecha de recepción</p>
          </div>
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
