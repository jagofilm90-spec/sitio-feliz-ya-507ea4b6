import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Calendar, Gift, Warehouse, Scale, Check, X } from "lucide-react";
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
  peso_confirmado?: boolean;
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
  onPesoConfirmado?: (cargaId: string, confirmado: boolean) => void;
  disabled?: boolean;
  isCortesia?: boolean;
  entregaConfirmada?: boolean;
}

export const CargaProductosChecklist = ({
  productos,
  onToggle,
  onDesmarcar,
  onPesoChange,
  onPesoConfirmado,
  disabled = false,
  isCortesia = false,
  entregaConfirmada = false,
}: CargaProductosChecklistProps) => {
  const totalProductos = productos.length;
  const productosCargados = productos.filter(p => p.cargado).length;
  const porcentaje = totalProductos > 0 ? Math.round((productosCargados / totalProductos) * 100) : 0;

  return (
    <div className="space-y-2">
      {/* Progress bar */}
      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold">
              Carga: {productosCargados}/{totalProductos} productos
            </span>
            <span className={`text-sm font-bold ${porcentaje === 100 ? "text-green-600" : ""}`}>
              {porcentaje}%
            </span>
          </div>
          <Progress value={porcentaje} className="h-2.5" />
        </div>
      </div>

      {productos.map((producto) => (
        <ProductoRow
          key={producto.id}
          producto={producto}
          onToggle={onToggle}
          onPesoChange={onPesoChange}
          onPesoConfirmado={onPesoConfirmado}
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
  onPesoConfirmado,
  disabled,
  isCortesia = false,
}: {
  producto: ProductoCarga;
  onToggle: CargaProductosChecklistProps["onToggle"];
  onPesoChange?: CargaProductosChecklistProps["onPesoChange"];
  onPesoConfirmado?: CargaProductosChecklistProps["onPesoConfirmado"];
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
  const [pesoConfirmadoLocal, setPesoConfirmadoLocal] = useState(producto.peso_confirmado || false);

  useEffect(() => {
    setCantidadCargada(producto.cantidad_cargada || producto.cantidad_solicitada);
  }, [producto.cantidad_cargada, producto.cantidad_solicitada]);

  useEffect(() => {
    setPesoConfirmadoLocal(producto.peso_confirmado || false);
  }, [producto.peso_confirmado]);

  const pesoTeoricoTotal = pesoTeoricoUnitario * cantidadCargada;
  const esVentaPorKg = producto.producto.unidad === 'kg';
  const tienePeso = esVentaPorKg && pesoTeoricoUnitario > 0;

  const cantidadDifiere = cantidadCargada !== producto.cantidad_solicitada;
  const pesoDifiere = tienePeso && Math.abs(pesoReal - pesoTeoricoTotal) > 0.1;

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
      setPesoConfirmadoLocal(false);
      if (onPesoConfirmado) onPesoConfirmado(producto.id, false);
      if (onPesoChange) onPesoChange(producto.id, nuevoPeso);
    }
  };

  const handleCantidadBlur = () => {
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

  const handleConfirmarPeso = () => {
    setPesoConfirmadoLocal(true);
    if (onPesoConfirmado) onPesoConfirmado(producto.id, true);
    if (onPesoChange && pesoReal !== producto.peso_real_kg) {
      onPesoChange(producto.id, pesoReal);
    }
  };

  const handleDesconfirmarPeso = () => {
    setPesoConfirmadoLocal(false);
    if (onPesoConfirmado) onPesoConfirmado(producto.id, false);
  };

  const borderColor = producto.cargado
    ? isCortesia
      ? "border-l-amber-500 bg-amber-50/50"
      : "border-l-green-500 bg-green-50/50"
    : "border-l-muted-foreground/30";

  return (
    <div className={`border rounded-lg overflow-hidden border-l-4 ${borderColor}`}>
      {/* Main row: checkbox + product name */}
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
            {tienePeso && pesoConfirmadoLocal && (
              <Badge className="bg-blue-600 text-white text-[10px] px-1.5 py-0 gap-0.5">
                <Scale className="w-2.5 h-2.5" />PESO OK
              </Badge>
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

      {/* Controls row: Quantity, Weight + confirm, Expiry */}
      <div className="flex items-center gap-2 px-3 pb-3 pl-14">
        {/* Quantity + Unit */}
        <div className="flex flex-col items-center gap-0.5">
          <label className="text-[10px] text-muted-foreground font-medium uppercase">
            {producto.producto.unidad === 'kg' ? 'Cant.' : producto.producto.unidad || 'Cant.'}
          </label>
          <Input
            type="number"
            inputMode="numeric"
            value={cantidadCargada}
            onChange={(e) => handleCantidadChange(e.target.value)}
            onBlur={handleCantidadBlur}
            className={`h-9 w-20 text-center text-sm font-semibold ${
              cantidadDifiere ? "border-amber-400 bg-amber-50" : ""
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

        {/* Weight + Confirm button */}
        {tienePeso && (
          <div className="flex flex-col items-center gap-0.5">
            <label className="text-[10px] text-muted-foreground font-medium uppercase flex items-center gap-0.5">
              <Scale className="w-3 h-3" />Peso kg
            </label>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                inputMode="decimal"
                step="0.1"
                value={pesoReal || ""}
                onChange={(e) => handlePesoChange(e.target.value)}
                onBlur={handlePesoBlur}
                placeholder={pesoTeoricoTotal.toFixed(1)}
                className={`h-9 w-20 text-center text-sm font-semibold ${
                  pesoConfirmadoLocal
                    ? "border-blue-400 bg-blue-50"
                    : pesoDifiere
                    ? "border-amber-400 bg-amber-50"
                    : ""
                }`}
                disabled={disabled || pesoConfirmadoLocal}
              />
              {!pesoConfirmadoLocal ? (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0 border-green-400 text-green-600 hover:bg-green-50"
                  onClick={handleConfirmarPeso}
                  disabled={disabled || !pesoReal}
                  title="Confirmar peso"
                >
                  <Check className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0 border-muted-foreground/30 text-muted-foreground hover:bg-muted"
                  onClick={handleDesconfirmarPeso}
                  disabled={disabled}
                  title="Editar peso"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {pesoDifiere && !pesoConfirmadoLocal && (
              <span className="text-[10px] text-amber-600 flex items-center gap-0.5">
                <Scale className="w-3 h-3" />
                T: {pesoTeoricoTotal.toFixed(1)}
              </span>
            )}
          </div>
        )}

        {/* Expiry date */}
        {loteActual?.fecha_caducidad && (
          <div className="flex flex-col items-center gap-0.5">
            <label className="text-[10px] text-muted-foreground font-medium uppercase">Caduc.</label>
            <span className="text-xs font-medium flex items-center gap-1 h-9">
              <Calendar className="w-3 h-3 text-muted-foreground" />
              {format(new Date(loteActual.fecha_caducidad), "dd/MMM/yy", { locale: es })}
            </span>
          </div>
        )}

        {/* No lots available */}
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
