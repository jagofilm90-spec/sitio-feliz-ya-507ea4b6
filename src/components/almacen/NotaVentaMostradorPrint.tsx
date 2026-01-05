import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { SolicitudVenta } from "@/hooks/useSolicitudesVenta";

interface NotaVentaMostradorPrintProps {
  solicitud: SolicitudVenta;
  onPrint?: () => void;
}

export const NotaVentaMostradorPrint = ({ solicitud, onPrint }: NotaVentaMostradorPrintProps) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Nota de Venta ${solicitud.folio}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: Arial, sans-serif; 
              padding: 20px;
              max-width: 80mm;
              margin: 0 auto;
            }
            .header { text-align: center; margin-bottom: 16px; }
            .logo { max-width: 120px; margin-bottom: 8px; }
            .title { font-size: 18px; font-weight: bold; margin: 8px 0; }
            .subtitle { font-size: 12px; color: #666; }
            .info-row { 
              display: flex; 
              justify-content: space-between; 
              font-size: 11px; 
              margin: 4px 0;
              border-bottom: 1px dotted #ccc;
              padding-bottom: 4px;
            }
            .products { margin: 16px 0; }
            .product { 
              display: flex; 
              justify-content: space-between; 
              font-size: 12px;
              padding: 4px 0;
              border-bottom: 1px solid #eee;
            }
            .product-name { flex: 1; }
            .product-qty { width: 40px; text-align: center; }
            .product-price { width: 70px; text-align: right; }
            .total-section { 
              margin-top: 16px; 
              padding-top: 8px; 
              border-top: 2px solid #000;
            }
            .total { 
              font-size: 20px; 
              font-weight: bold; 
              text-align: right;
            }
            .stamp { 
              margin-top: 20px; 
              padding: 8px; 
              border: 2px solid #22c55e; 
              text-align: center;
              font-weight: bold;
              color: #22c55e;
              font-size: 14px;
            }
            .stamp-entrega {
              margin-top: 8px;
              padding: 8px;
              border: 2px solid #3b82f6;
              text-align: center;
              font-weight: bold;
              color: #3b82f6;
              font-size: 12px;
            }
            .footer { 
              margin-top: 20px; 
              font-size: 10px; 
              text-align: center; 
              color: #666;
            }
            .payment-info {
              margin-top: 12px;
              padding: 8px;
              background: #f5f5f5;
              font-size: 11px;
            }
            @media print {
              body { padding: 0; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
      onPrint?.();
    }, 250);
  };

  // Calculate total from products
  const subtotal = solicitud.productos_solicitados.reduce((sum, p) => {
    return sum + (p.cantidad * (p.precio_unitario || 0));
  }, 0);

  return (
    <div className="space-y-4">
      {/* Print preview */}
      <div 
        ref={printRef}
        className="bg-white p-6 rounded-lg border max-w-sm mx-auto"
      >
        {/* Header */}
        <div className="header text-center mb-4">
          <img 
            src="/logo-almasa-pdf.png" 
            alt="Almasa" 
            className="logo mx-auto h-12 object-contain"
          />
          <div className="title">NOTA DE VENTA</div>
          <div className="subtitle">Venta de mostrador</div>
        </div>

        {/* Info */}
        <div className="space-y-1 text-sm border-b pb-3 mb-3">
          <div className="info-row flex justify-between">
            <span className="text-muted-foreground">Folio:</span>
            <span className="font-mono font-bold">{solicitud.folio}</span>
          </div>
          {solicitud.factura?.folio && (
            <div className="info-row flex justify-between">
              <span className="text-muted-foreground">Factura:</span>
              <span className="font-mono">{solicitud.factura.folio}</span>
            </div>
          )}
          <div className="info-row flex justify-between">
            <span className="text-muted-foreground">Fecha:</span>
            <span>{format(new Date(solicitud.fecha_solicitud), "dd/MM/yyyy HH:mm", { locale: es })}</span>
          </div>
        </div>

        {/* Products */}
        <div className="products">
          <div className="flex justify-between text-xs font-bold border-b pb-1 mb-2">
            <span className="flex-1">Producto</span>
            <span className="w-10 text-center">Cant</span>
            <span className="w-20 text-right">Precio</span>
          </div>
          {solicitud.productos_solicitados.map((producto, index) => (
            <div key={index} className="product flex justify-between text-sm py-1">
              <span className="product-name flex-1 pr-2 truncate">{producto.nombre}</span>
              <span className="product-qty w-10 text-center">{producto.cantidad}</span>
              <span className="product-price w-20 text-right">
                ${((producto.precio_unitario || 0) * producto.cantidad).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </span>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="total-section border-t-2 border-foreground pt-2 mt-3">
          <div className="total text-xl font-bold text-right">
            TOTAL: ${Number(solicitud.total || subtotal).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </div>
        </div>

        {/* Payment info */}
        {solicitud.forma_pago && (
          <div className="payment-info bg-muted/50 p-2 rounded mt-3 text-sm">
            <div className="flex justify-between">
              <span>Forma de pago:</span>
              <span className="font-medium">
                {solicitud.forma_pago === 'efectivo' ? 'Efectivo' : 'Transferencia'}
              </span>
            </div>
            {solicitud.referencia_pago && (
              <div className="flex justify-between">
                <span>Referencia:</span>
                <span className="font-mono">{solicitud.referencia_pago}</span>
              </div>
            )}
          </div>
        )}

        {/* Stamps */}
        {solicitud.status === 'pagada' || solicitud.status === 'entregada' ? (
          <>
            <div className="stamp border-2 border-green-500 text-green-600 text-center font-bold p-2 mt-4 rounded">
              ✓ PAGADA
            </div>
            <div className="stamp-entrega border-2 border-blue-500 text-blue-600 text-center font-bold p-2 mt-2 rounded">
              ENTREGA DIRECTA
            </div>
          </>
        ) : null}

        {/* Footer */}
        <div className="footer text-center text-xs text-muted-foreground mt-4 pt-3 border-t">
          <p>Atendió: {solicitud.solicitante?.nombre_completo || 'Almacén'}</p>
          {solicitud.fecha_entregado && (
            <p>Entregado: {format(new Date(solicitud.fecha_entregado), "dd/MM/yyyy HH:mm", { locale: es })}</p>
          )}
          <p className="mt-2">Gracias por su compra</p>
          <p>Almacén de Alimentos del Bajío S.A. de C.V.</p>
        </div>
      </div>

      {/* Print button */}
      <div className="flex justify-center no-print">
        <Button onClick={handlePrint} size="lg">
          <Printer className="w-4 h-4 mr-2" />
          Imprimir Nota
        </Button>
      </div>
    </div>
  );
};
