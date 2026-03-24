import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { getDisplayName } from "@/lib/productUtils";
import { esProductoBolsas5kg, calcularNumeroBolsas, KG_POR_BOLSA } from "@/lib/calculos";

interface ProductoDetalle {
  id: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  kilos_totales: number | null;
  unidades_manual: number | null;
  productos: {
    codigo: string;
    nombre: string;
    marca: string | null;
    especificaciones: string | null;
    contenido_empaque: string | null;
    unidad: string;
    precio_por_kilo: boolean;
    peso_kg: number | null;
  };
}

interface PedidoDetalleProductCardsProps {
  detalles: ProductoDetalle[];
  clienteNombre?: string;
}

export function PedidoDetalleProductCards({ detalles, clienteNombre }: PedidoDetalleProductCardsProps) {
  const esLecaroz = clienteNombre?.toLowerCase().includes('lecaroz');

  return (
    <div className="space-y-3">
      {detalles.map((detalle) => {
        const producto = detalle.productos;
        const nombreLower = producto.nombre.toLowerCase();
        let unidadComercial = producto.unidad || "pza";

        if (esLecaroz && (nombreLower.includes('anís') || nombreLower.includes('anis') || nombreLower.includes('canela molida'))) {
          unidadComercial = 'bolsa';
        }

        // Calcular presentación
        let presentacionDisplay = "";
        if (esProductoBolsas5kg(producto.nombre)) {
          const numBolsas = calcularNumeroBolsas(detalle.cantidad, KG_POR_BOLSA);
          presentacionDisplay = `${numBolsas} bolsa${numBolsas !== 1 ? 's' : ''}`;
        } else if (detalle.kilos_totales && producto.peso_kg) {
          const plural = detalle.cantidad !== 1 ? 's' : '';
          presentacionDisplay = `${detalle.cantidad.toLocaleString()} ${unidadComercial}${plural} de ${producto.peso_kg} kg`;
        } else if (detalle.kilos_totales) {
          presentacionDisplay = `${detalle.kilos_totales.toLocaleString()} kg total`;
        } else if (producto.peso_kg) {
          const plural = detalle.cantidad !== 1 ? 's' : '';
          presentacionDisplay = `${detalle.cantidad.toLocaleString()} ${unidadComercial}${plural} de ${producto.peso_kg} kg`;
        }

        // Cantidad display
        let cantidadDisplay: string;
        if (producto.peso_kg && producto.precio_por_kilo) {
          cantidadDisplay = `${detalle.cantidad} ${unidadComercial}${detalle.cantidad !== 1 ? 's' : ''}`;
        } else if (producto.precio_por_kilo) {
          cantidadDisplay = `${detalle.cantidad} kg`;
        } else {
          cantidadDisplay = `${detalle.cantidad} ${unidadComercial}${detalle.cantidad !== 1 ? 's' : ''}`;
        }

        return (
          <Card key={detalle.id} className="border">
            <CardContent className="p-3 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm leading-tight">{getDisplayName(producto)}</p>
                  <p className="font-mono text-xs text-muted-foreground">{producto.codigo}</p>
                </div>
                <p className="font-mono font-bold text-primary shrink-0">{formatCurrency(detalle.subtotal)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span>{cantidadDisplay}
                  {detalle.kilos_totales && (
                    <span className="text-xs ml-1">({detalle.kilos_totales.toLocaleString()} kg)</span>
                  )}
                </span>
                {presentacionDisplay && (
                  <span className="font-semibold text-primary text-xs">{presentacionDisplay}</span>
                )}
                <span className="font-mono text-xs">
                  {formatCurrency(detalle.precio_unitario)}
                  {producto.precio_por_kilo && <span>/kg</span>}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}