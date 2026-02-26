import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Calendar, Gift, Warehouse, Scale } from "lucide-react";
import { getCompactDisplayName } from "@/lib/productUtils";

interface LoteDisponible {
  id: string;
  lote_referencia: string | null;
  cantidad_disponible: number;
  fecha_caducidad: string | null;
  bodega_id?: string | null;
  bodega_nombre?: string | null;
}

interface ProductoCarga {
  id: string;
  pedido_detalle_id: string;
  cantidad_solicitada: number;
  cantidad_cargada: number | null;
  cargado: boolean;
  lote_id: string | null;
  peso_real_kg?: number | null;
  producto: {
    id: string;
    codigo: string;
    nombre: string;
    marca: string | null;
    especificaciones: string | null;
    contenido_empaque: string | null;
    peso_kg: number | null;
    unidad: string;
  };
  lotes_disponibles: LoteDisponible[];
}

export interface CargaProductosChecklistProps {
  productos: ProductoCarga[];
  onToggle: (
    cargaId: string,
    cargado: boolean,
    cantidadCargada: number,
    loteId: string | null
  ) => void;
  onDesmarcar?: (producto: ProductoCarga) => void;
  onPesoChange?: (cargaId: string, pesoKg: number) => void;
  disabled?: boolean;
  isCortesia?: boolean;
  entregaConfirmada?: boolean;
}

export const CargaProductosChecklist = ({
  productos,
  onToggle,
  onDesmarcar,
  onPesoChange,
  disabled = false,
  isCortesia = false,
  entregaConfirmada = false,
}: CargaProductosChecklistProps) => {
  return (
    <div className="space-y-2">
      {productos.map((producto) => (
        <ProductoRow
          key={producto.id}
          producto={producto}
          onToggle={onToggle}
          onPesoChange={onPesoChange}
          disabled={disabled || entregaConfirmada}
          isCortesia={isCortesia}
        />
      ))}
    </div>
  );
};

const ProductoRow = ({
  producto,
  onToggle,
  onPesoChange,
  disabled,
  isCortesia = false,
}: {
  producto: ProductoCarga;
  onToggle: CargaProductosChecklistProps["onToggle"];
  onPesoChange?: CargaProductosChecklistProps["onPesoChange"];
  disabled: boolean;
  isCortesia?: boolean;
}) => {
  const pesoTeoricoUnitario = producto.producto.peso_kg || 0;

  const [cantidadCargada, setCantidadCargada] = useState(
    producto.cantidad_cargada || producto.cantidad_solicitada
  );
  const [pesoReal, setPesoReal] = useState<number>(
    producto.peso_real_kg || (pesoTeoricoUnitario * (producto.cantidad_cargada || producto.cantidad_solicitada))
  );
  const [loteSeleccionado, setLoteSeleccionado] = useState(
    producto.lote_id || (producto.lotes_disponibles[0]?.id ?? null)
  );

  useEffect(() => {
    setCantidadCargada(producto.cantidad_cargada || producto.cantidad_solicitada);
  }, [producto.cantidad_cargada, producto.cantidad_solicitada]);

  const pesoTeoricoTotal = pesoTeoricoUnitario * cantidadCargada;
  const esVentaPorKg = producto.producto.unidad === 'kg';
  const tienePeso = esVentaPorKg && pesoTeoricoUnitario > 0;

  const cantidadDifiere = cantidadCargada !== producto.cantidad_solicitada;
  const pesoDifiere = tienePeso && Math.abs(pesoReal - pesoTeoricoTotal) > 0.1;

  const loteFIFO = producto.lotes_disponibles[0];
  const loteActual = producto.lotes_disponibles.find(l => l.id === loteSeleccionado);

  const handleCheckChange = (checked: boolean) => {
    onToggle(producto.id, checked, cantidadCargada, loteSeleccionado);
  };

  const handleCantidadChange = (value: string) => {
    const cantidad = parseFloat(value) || 0;
    setCantidadCargada(cantidad);
    if (pesoTeoricoUnitario > 0) {
      const nuevoPeso = cantidad * pesoTeoricoUnitario;
      setPesoReal(nuevoPeso);
      if (onPesoChange) {
        onPesoChange(producto.id, nuevoPeso);
      }
    }
  };

  const handleCantidadBlur = () => {
    // If product is already loaded and quantity changed, trigger adjustment
    if (producto.cargado && cantidadCargada !== producto.cantidad_cargada && cantidadCargada > 0) {
      onToggle(producto.id, true, cantidadCargada, loteSeleccionado);
    }
  };

  const handlePesoChange = (value: string) => {
    const peso = parseFloat(value) || 0;
    setPesoReal(peso);
  };

  const handlePesoBlur = () => {
    if (onPesoChange && pesoReal !== producto.peso_real_kg) {
      onPesoChange(producto.id, pesoReal);
    }
  };

  const borderColor = producto.cargado
    ? isCortesia
      ? "border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20"
      : "border-l-green-500 bg-green-50/50 dark:bg-green-950/20"
    : "border-l-muted-foreground/30";

  return (
    <div className={`border rounded-lg overflow-hidden border-l-4 ${borderColor}`}>
      {/* Fila principal: checkbox + nombre completo */}
      <div className="flex items-start gap-3 p-3 pb-2">
        <Checkbox
          checked={producto.cargado}
          onCheckedChange={handleCheckChange}
          disabled={disabled}
          className="h-8 w-8 rounded-md border-2 mt-0.5 shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            {isCortesia && <Gift className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />}
            <span className="font-semibold text-sm leading-snug">
              {getCompactDisplayName(producto.producto)}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[11px] text-muted-foreground font-mono">{producto.producto.codigo}</span>
            {isCortesia && <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0">CORTESÍA</Badge>}
            {producto.cargado && (
              <Badge className="bg-green-600 text-white text-[10px] px-1.5 py-0">CARGADO</Badge>
            )}
            {loteActual?.bodega_nombre && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <Warehouse className="w-3 h-3" />
                {loteActual.bodega_nombre}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Fila de controles: Cantidad, Peso, Lote */}
      <div className="flex items-center gap-2 px-3 pb-3 pl-14">
        {/* Cantidad */}
        <div className="flex flex-col items-center gap-0.5">
          <label className="text-[10px] text-muted-foreground font-medium uppercase">Cant.</label>
          <Input
            type="number"
            inputMode="numeric"
            value={cantidadCargada}
            onChange={(e) => handleCantidadChange(e.target.value)}
            onBlur={handleCantidadBlur}
            className={`h-9 w-20 text-center text-sm font-semibold ${
              cantidadDifiere ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30" : ""
            }`}
            disabled={disabled}
          />
          {cantidadDifiere && (
            <span className="text-[10px] text-amber-600 flex items-center gap-0.5">
              <AlertTriangle className="w-3 h-3" />
              ≠ {producto.cantidad_solicitada}
            </span>
          )}
        </div>

        {/* Peso */}
        {tienePeso && (
          <div className="flex flex-col items-center gap-0.5">
            <label className="text-[10px] text-muted-foreground font-medium uppercase">Peso kg</label>
            <Input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={pesoReal || ""}
              onChange={(e) => handlePesoChange(e.target.value)}
              onBlur={handlePesoBlur}
              placeholder={pesoTeoricoTotal.toFixed(1)}
              className={`h-9 w-20 text-center text-sm font-semibold ${
                pesoDifiere ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30" : ""
              }`}
              disabled={disabled}
            />
            {pesoDifiere && (
              <span className="text-[10px] text-amber-600 flex items-center gap-0.5">
                <Scale className="w-3 h-3" />
                T: {pesoTeoricoTotal.toFixed(1)}
              </span>
            )}
          </div>
        )}

        {/* Fecha caducidad - siempre visible si existe */}
        {loteActual?.fecha_caducidad && (
          <div className="flex flex-col items-center gap-0.5">
            <label className="text-[10px] text-muted-foreground font-medium uppercase">Caduc.</label>
            <span className="text-xs font-medium flex items-center gap-1 h-9">
              <Calendar className="w-3 h-3 text-muted-foreground" />
              {format(new Date(loteActual.fecha_caducidad), "dd/MMM/yy", { locale: es })}
            </span>
          </div>
        )}

        {/* Sin lotes */}
        {producto.lotes_disponibles.length === 0 && (
          <span className="text-xs text-destructive flex items-center gap-1 h-9">
            <AlertTriangle className="w-3 h-3" />
            Sin lotes
          </span>
        )}
      </div>
    </div>
  );
};
