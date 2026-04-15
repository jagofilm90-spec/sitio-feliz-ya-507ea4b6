import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Plus,
  X,
  AlertTriangle,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, cn } from "@/lib/utils";
import { getDisplayName } from "@/lib/productUtils";
import type {
  LineaPedido,
  ClienteConFrecuencia,
  Sucursal,
  TotalesCalculados,
  UltimoPrecioCliente,
} from "./types";
import { CREDIT_OPTIONS } from "./types";

interface PasoCantidadesPreciosProps {
  lineas: LineaPedido[];
  onActualizarCantidad: (productoId: string, cantidad: number) => void;
  onActualizarPrecio: (productoId: string, precio: number) => void;
  onRemoveProducto: (productoId: string) => void;
  cliente: ClienteConFrecuencia | undefined;
  sucursal: Sucursal | undefined;
  terminoCredito: string;
  onTerminoCreditoChange: (term: string) => void;
  requiereFactura: boolean;
  onRequiereFacturaChange: (value: boolean) => void;
  notasEntrega: string;
  onNotasEntregaChange: (value: string) => void;
  totales: TotalesCalculados;
  ultimosPrecios: Map<string, UltimoPrecioCliente>;
  onGoToStep2: () => void;
  onNext: () => void;
  onBack: () => void;
  onCancelar?: () => void;
}

export function PasoCantidadesPrecios({
  lineas,
  onActualizarCantidad,
  onActualizarPrecio,
  onRemoveProducto,
  cliente,
  sucursal,
  terminoCredito,
  onTerminoCreditoChange,
  requiereFactura,
  onRequiereFacturaChange,
  notasEntrega,
  onNotasEntregaChange,
  totales,
  ultimosPrecios,
  onGoToStep2,
  onNext,
  onBack,
  onCancelar,
}: PasoCantidadesPreciosProps) {
  const direccion = sucursal?.direccion || cliente?.direccion || cliente?.zona?.nombre || null;

  const bajoPisoCount = lineas.filter((l) => {
    const piso = l.precioLista - (l.producto.descuento_maximo || 0);
    return l.precioUnitario < piso;
  }).length;

  const canContinue = lineas.length > 0 && !!terminoCredito;

  return (
    <div className="flex flex-col h-full">
      {/* Client bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-ink-50/80 border-b border-ink-100 text-sm shrink-0">
        <MapPin className="h-3.5 w-3.5 text-ink-500 shrink-0" />
        <span className="font-medium text-ink-700 truncate">{cliente?.nombre || ""}</span>
        {direccion && (
          <span className="text-ink-400 truncate hidden sm:inline">— {direccion}</span>
        )}
        {onCancelar && (
          <Button variant="ghost" size="icon" className="ml-auto h-7 w-7 text-ink-400 hover:text-red-500 shrink-0" onClick={onCancelar}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-4">
        {/* Products header */}
        <div className="text-xs font-semibold uppercase tracking-wider text-ink-400">
          {lineas.length} producto{lineas.length !== 1 ? "s" : ""} seleccionado{lineas.length !== 1 ? "s" : ""}
        </div>

        {/* Product cards */}
        {lineas.map((linea) => (
          <ProductoCard
            key={linea.producto.id}
            linea={linea}
            ultimoPrecio={ultimosPrecios.get(linea.producto.id)}
            onActualizarCantidad={onActualizarCantidad}
            onActualizarPrecio={onActualizarPrecio}
            onRemoveProducto={onRemoveProducto}
          />
        ))}

        {/* Add another product */}
        <Button
          type="button"
          variant="outline"
          className="w-full h-10 text-sm text-ink-500 border-dashed"
          onClick={onGoToStep2}
        >
          <Plus className="h-4 w-4 mr-2" />
          Agregar otro producto
        </Button>

        {/* Plazo de pago */}
        <div className="space-y-2 pt-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-ink-400">
            Plazo de pago <span className="text-crimson-500">*</span>
          </Label>
          <div className="flex flex-wrap gap-2">
            {CREDIT_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                type="button"
                variant={terminoCredito === opt.value ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-9 px-4",
                  terminoCredito === opt.value && "bg-crimson-500 hover:bg-crimson-600"
                )}
                onClick={() => onTerminoCreditoChange(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Toggle factura */}
        <div className="flex items-center gap-3">
          <Switch
            checked={requiereFactura}
            onCheckedChange={onRequiereFacturaChange}
            id="factura"
          />
          <Label htmlFor="factura" className="text-sm">
            Requiere factura
          </Label>
        </div>

        {/* Notas de entrega */}
        <div className="space-y-1.5">
          <Label
            htmlFor="notas-entrega"
            className="text-sm flex items-center gap-1.5 font-medium text-ink-600"
          >
            <Truck className="h-3.5 w-3.5" />
            Notas para el chofer
          </Label>
          <Textarea
            id="notas-entrega"
            value={notasEntrega}
            onChange={(e) => onNotasEntregaChange(e.target.value)}
            placeholder="Ej. Recibe de 3 a 4 pm, no recibe viernes por tianguis"
            className="min-h-[60px] resize-none text-sm"
          />
        </div>
      </div>

      {/* Floating bar */}
      <div className="shrink-0 border-t border-ink-100 bg-white p-3">
        <div className="flex items-center justify-between text-sm mb-2">
          <div className="flex items-center gap-3 text-ink-600">
            <span className="tabular-nums font-semibold">{formatCurrency(totales.total)}</span>
            <span className="text-ink-400">·</span>
            <span className="tabular-nums text-ink-400">{totales.pesoTotalKg.toFixed(2)} kg</span>
          </div>
          {bajoPisoCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {bajoPisoCount} bajo piso
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack} className="h-11 px-4">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Atrás
          </Button>
          <Button
            onClick={onNext}
            disabled={!canContinue}
            className="flex-1 h-11 bg-crimson-500 hover:bg-crimson-600 text-white font-semibold"
          >
            Siguiente
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Sub-component with local input state for qty/price ──

function ProductoCard({
  linea,
  ultimoPrecio,
  onActualizarCantidad,
  onActualizarPrecio,
  onRemoveProducto,
}: {
  linea: LineaPedido;
  ultimoPrecio: UltimoPrecioCliente | undefined;
  onActualizarCantidad: (productoId: string, cantidad: number) => void;
  onActualizarPrecio: (productoId: string, precio: number) => void;
  onRemoveProducto: (productoId: string) => void;
}) {
  const prod = linea.producto;
  const piso = linea.precioLista - (prod.descuento_maximo || 0);
  const esBajoPiso = linea.precioUnitario < piso;
  const esErrorDedo = linea.precioUnitario > 0 && linea.precioUnitario < linea.precioLista * 0.5;
  const esPorKilo = prod.precio_por_kilo;
  const pesoTotal = esPorKilo && prod.peso_kg ? linea.cantidad * prod.peso_kg : null;

  // Local string state so the user can clear the field and type freely
  const [localQty, setLocalQty] = useState(String(linea.cantidad));
  const [localPrice, setLocalPrice] = useState(linea.precioUnitario.toFixed(2));
  const [qtyFocused, setQtyFocused] = useState(false);
  const [priceFocused, setPriceFocused] = useState(false);

  // Sync local from parent when it changes externally
  useEffect(() => {
    if (!qtyFocused) setLocalQty(String(linea.cantidad));
  }, [linea.cantidad, qtyFocused]);
  useEffect(() => {
    if (!priceFocused) setLocalPrice(linea.precioUnitario.toFixed(2));
  }, [linea.precioUnitario, priceFocused]);

  const handleQtyBlur = () => {
    setQtyFocused(false);
    const val = parseInt(localQty) || 1;
    const clamped = Math.max(1, val);
    setLocalQty(String(clamped));
    onActualizarCantidad(prod.id, clamped);
  };

  const handlePriceBlur = () => {
    setPriceFocused(false);
    const val = parseFloat(localPrice) || 0;
    setLocalPrice(val.toFixed(2));
    onActualizarPrecio(prod.id, val);
  };

  return (
    <Card className={cn("border overflow-hidden", esBajoPiso && "border-red-300 bg-red-50/30")}>
      <CardContent className="p-3 space-y-3">
        {/* Header */}
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-sm text-ink-800">{getDisplayName(prod)}</span>
              {esBajoPiso && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
                  <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                  bajo piso
                </Badge>
              )}
            </div>
            <div className="text-xs text-ink-400 mt-0.5">
              <span className="font-mono">{prod.codigo}</span>
              {pesoTotal != null && (
                <span className="ml-2 tabular-nums">{pesoTotal.toFixed(2)} kg</span>
              )}
            </div>
          </div>
          <span className="text-sm font-bold text-crimson-500 tabular-nums shrink-0">
            {formatCurrency(linea.subtotal)}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-ink-400 hover:text-red-500"
            onClick={() => onRemoveProducto(prod.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-ink-400 font-medium">
              Cantidad
            </Label>
            <Input
              type="text"
              inputMode="numeric"
              value={localQty}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "" || /^\d+$/.test(v)) setLocalQty(v);
              }}
              onFocus={() => { setQtyFocused(true); setLocalQty(String(linea.cantidad)); }}
              onBlur={handleQtyBlur}
              className="h-10 text-center text-base font-semibold tabular-nums"
            />
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-ink-400 font-medium">
              Precio pactado
            </Label>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-ink-400 text-sm">$</span>
              <Input
                type="text"
                inputMode="decimal"
                value={localPrice}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "" || /^\d*\.?\d{0,2}$/.test(v)) setLocalPrice(v);
                }}
                onFocus={() => { setPriceFocused(true); }}
                onBlur={handlePriceBlur}
                className={cn(
                  "h-10 pl-5 text-center text-base font-semibold tabular-nums",
                  linea.precioUnitario !== linea.precioLista && "border-crimson-300",
                  esBajoPiso && "border-red-500 bg-red-50"
                )}
              />
            </div>
          </div>
        </div>

        {/* Reference prices */}
        <div className="flex items-center gap-3 text-[11px] text-ink-400 flex-wrap">
          <span>Lista <span className="font-semibold text-ink-600 tabular-nums">{formatCurrency(linea.precioLista)}</span></span>
          <span>Piso <span className={cn("font-semibold tabular-nums", esBajoPiso ? "text-red-600" : "text-ink-600")}>{formatCurrency(piso)}</span></span>
          {ultimoPrecio && (
            <span>Última <span className="font-semibold text-emerald-600 tabular-nums">{formatCurrency(ultimoPrecio.precio)}</span></span>
          )}
        </div>

        {/* Fat finger warning: price < 50% of list */}
        {esErrorDedo && (
          <div className="flex items-start gap-2 p-2 rounded bg-red-100 border border-red-300 text-xs text-red-800">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>
              <strong>¿Es correcto?</strong> Este precio es menos de la mitad del precio de lista ({formatCurrency(linea.precioLista)}).
              Verifica que no sea un error de captura.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
