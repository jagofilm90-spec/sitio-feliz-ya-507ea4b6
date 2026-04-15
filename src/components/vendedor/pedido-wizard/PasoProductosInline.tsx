import { useState, useMemo } from "react";
import { Search, Star, Check, Plus, ChevronLeft, ChevronRight, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, cn } from "@/lib/utils";
import { getDisplayName } from "@/lib/productUtils";
import type { Producto, LineaPedido, ClienteConFrecuencia, Sucursal } from "./types";

interface PasoProductosInlineProps {
  productos: Producto[];
  productosFrecuentes: Producto[];
  lineas: LineaPedido[];
  onToggleProducto: (producto: Producto) => void;
  cliente: ClienteConFrecuencia | undefined;
  sucursal: Sucursal | undefined;
  onNext: () => void;
  onBack: () => void;
  onCancelar?: () => void;
}

export function PasoProductosInline({
  productos,
  productosFrecuentes,
  lineas,
  onToggleProducto,
  cliente,
  sucursal,
  onNext,
  onBack,
  onCancelar,
}: PasoProductosInlineProps) {
  const [search, setSearch] = useState("");

  const selectedIds = useMemo(() => new Set(lineas.map((l) => l.producto.id)), [lineas]);

  const frecuenteIds = useMemo(() => new Set(productosFrecuentes.map((p) => p.id)), [productosFrecuentes]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return productos;
    return productos.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        p.codigo.toLowerCase().includes(q) ||
        (p.especificaciones?.toLowerCase() || "").includes(q) ||
        (p.marca?.toLowerCase() || "").includes(q)
    );
  }, [productos, search]);

  const frecuentesFiltered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return productosFrecuentes;
    return productosFrecuentes.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        p.codigo.toLowerCase().includes(q)
    );
  }, [productosFrecuentes, search]);

  const allFiltered = useMemo(() => {
    return filtered.filter((p) => !frecuenteIds.has(p.id));
  }, [filtered, frecuenteIds]);

  const direccion = sucursal?.direccion || cliente?.direccion || cliente?.zona?.nombre || null;

  const renderProductRow = (producto: Producto, isFrecuente: boolean) => {
    const isSelected = selectedIds.has(producto.id);
    const esPorKilo = producto.precio_por_kilo;

    return (
      <button
        key={producto.id}
        type="button"
        onClick={() => onToggleProducto(producto)}
        className={cn(
          "w-full text-left flex items-center gap-3 px-3 py-2.5 border-b border-ink-100 last:border-b-0 transition-colors",
          isSelected ? "bg-crimson-50/50" : "hover:bg-ink-50/50"
        )}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            {isFrecuente && <Star className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />}
            <span className="text-sm font-medium text-ink-800 truncate block min-w-0">{getDisplayName(producto)}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-ink-400">
            <span className="font-mono">{producto.codigo}</span>
            <span className="tabular-nums">
              {formatCurrency(producto.precio_venta)}{esPorKilo ? "/kg" : `/${producto.unidad}`}
            </span>
          </div>
        </div>
        <div
          className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors",
            isSelected
              ? "bg-crimson-500 text-white"
              : "border-2 border-ink-200 text-ink-400 hover:border-ink-300"
          )}
        >
          {isSelected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </div>
      </button>
    );
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
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

      {/* Search */}
      <div className="p-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-400" />
          <Input
            placeholder="Buscar producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10"
          />
        </div>
      </div>

      {/* Product lists — native overflow (Radix ScrollArea clips flex children) */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* Frequent products */}
        {frecuentesFiltered.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-ink-400 bg-amber-50/50">
              <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
              Frecuentes de {cliente?.nombre || "este cliente"}
            </div>
            {frecuentesFiltered.map((p) => renderProductRow(p, true))}
          </div>
        )}

        {/* All products */}
        <div>
          {frecuentesFiltered.length > 0 && (
            <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-ink-400 bg-ink-50/50">
              Todos los productos
            </div>
          )}
          {allFiltered.map((p) => renderProductRow(p, false))}
          {allFiltered.length === 0 && filtered.length === 0 && (
            <div className="text-center py-8 text-ink-400 text-sm">
              No se encontraron productos
            </div>
          )}
        </div>
      </div>

      {/* Floating bar */}
      <div className="shrink-0 border-t border-ink-100 bg-white p-3 flex items-center gap-3">
        <Button variant="outline" onClick={onBack} className="h-11 px-4">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Atrás
        </Button>
        <Button
          onClick={onNext}
          disabled={selectedIds.size === 0}
          className="flex-1 h-11 bg-crimson-500 hover:bg-crimson-600 text-white font-semibold"
        >
          Siguiente: precios y cantidades
          <Badge variant="secondary" className="ml-2 bg-white/20 text-white border-0">
            {selectedIds.size}
          </Badge>
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
