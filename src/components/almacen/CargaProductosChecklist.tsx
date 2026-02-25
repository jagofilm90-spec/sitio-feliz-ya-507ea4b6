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
import { Package, AlertTriangle, Calendar, Gift, Warehouse, Weight, Scale } from "lucide-react";
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
    <div className="space-y-0">
      {/* Table Header */}
      <div className="grid grid-cols-[48px_1fr_100px_100px_120px] gap-2 px-3 py-2 bg-muted/60 rounded-t-lg border border-b-0 border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
        <div className="flex items-center justify-center">✓</div>
        <div>Producto</div>
        <div className="text-center">Cantidad</div>
        <div className="text-center">Peso (kg)</div>
        <div className="text-center">Lote</div>
      </div>

      {/* Product Rows */}
      <div className="border border-border rounded-b-lg divide-y divide-border/50 overflow-hidden">
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

  // Sync with external changes
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
    // Auto-recalculate weight based on new quantity
    if (pesoTeoricoUnitario > 0) {
      const nuevoPeso = cantidad * pesoTeoricoUnitario;
      setPesoReal(nuevoPeso);
      if (onPesoChange) {
        onPesoChange(producto.id, nuevoPeso);
      }
    }
  };

  const handleCantidadBlur = () => {
    // If already checked and quantity changed, re-toggle
    if (producto.cargado && cantidadCargada !== (producto.cantidad_cargada || producto.cantidad_solicitada)) {
      // User needs to uncheck first
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

  const rowBg = producto.cargado
    ? isCortesia
      ? "bg-amber-50/80 dark:bg-amber-950/20"
      : "bg-green-50/80 dark:bg-green-950/20"
    : "";

  return (
    <div className={`grid grid-cols-[48px_1fr_100px_100px_120px] gap-2 px-3 py-3 items-center transition-colors ${rowBg}`}>
      {/* Checkbox */}
      <div className="flex items-center justify-center">
        <Checkbox
          checked={producto.cargado}
          onCheckedChange={handleCheckChange}
          disabled={disabled}
          className="h-7 w-7 rounded-md border-2"
        />
      </div>

      {/* Product info */}
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          {isCortesia && <Gift className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
          <span className="font-semibold text-sm truncate">{getCompactDisplayName(producto.producto)}</span>
          {isCortesia && <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0">CORTESÍA</Badge>}
          {producto.cargado && (
            <Badge className="bg-green-600 text-white text-[10px] px-1.5 py-0">CARGADO</Badge>
          )}
        </div>
        <span className="text-[11px] text-muted-foreground font-mono">{producto.producto.codigo}</span>
        {/* Lote & Bodega info inline */}
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {loteActual?.bodega_nombre && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Warehouse className="w-3 h-3" />
              {loteActual.bodega_nombre}
            </span>
          )}
          {loteFIFO?.fecha_caducidad && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Calendar className="w-3 h-3" />
              {format(new Date(loteFIFO.fecha_caducidad), "dd/MMM/yy", { locale: es })}
            </span>
          )}
        </div>
      </div>

      {/* Cantidad cargada - editable */}
      <div className="flex flex-col items-center gap-0.5">
        <Input
          type="number"
          inputMode="numeric"
          value={cantidadCargada}
          onChange={(e) => handleCantidadChange(e.target.value)}
          onBlur={handleCantidadBlur}
          className={`h-10 text-center text-base font-semibold ${
            cantidadDifiere ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30" : ""
          }`}
          disabled={disabled || producto.cargado}
        />
        {cantidadDifiere && (
          <span className="text-[10px] text-amber-600 flex items-center gap-0.5">
            <AlertTriangle className="w-3 h-3" />
            ≠ {producto.cantidad_solicitada}
          </span>
        )}
      </div>

      {/* Peso real - editable */}
      <div className="flex flex-col items-center gap-0.5">
        {tienePeso ? (
          <>
            <Input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={pesoReal || ""}
              onChange={(e) => handlePesoChange(e.target.value)}
              onBlur={handlePesoBlur}
              placeholder={pesoTeoricoTotal.toFixed(1)}
              className={`h-10 text-center text-base font-semibold ${
                pesoDifiere ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30" : ""
              }`}
              disabled={disabled}
            />
            {pesoDifiere && (
              <span className="text-[10px] text-amber-600 flex items-center gap-0.5">
                <Scale className="w-3 h-3" />
                Teórico: {pesoTeoricoTotal.toFixed(1)}
              </span>
            )}
          </>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </div>

      {/* Lote selector - compact */}
      <div>
        {producto.lotes_disponibles.length > 0 ? (
          <Select
            value={loteSeleccionado || ""}
            onValueChange={setLoteSeleccionado}
            disabled={disabled || producto.cargado}
          >
            <SelectTrigger className="h-10 text-xs">
              <SelectValue placeholder="Lote" />
            </SelectTrigger>
            <SelectContent>
              {producto.lotes_disponibles.map((lote, index) => (
                <SelectItem key={lote.id} value={lote.id} className="py-2">
                  <div className="flex items-center gap-1 flex-wrap">
                    {index === 0 && <Badge variant="secondary" className="text-[9px] px-1 py-0">FIFO</Badge>}
                    <span className="text-xs">{lote.lote_referencia || "Sin ref."}</span>
                    <span className="text-[10px] text-muted-foreground">({lote.cantidad_disponible})</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-xs text-destructive flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Sin lotes
          </span>
        )}
      </div>
    </div>
  );
};
