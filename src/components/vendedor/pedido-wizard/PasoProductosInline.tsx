import { useState, useMemo, useRef, useEffect, useCallback } from "react";
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
  const [peekedProductId, setPeekedProductId] = useState<string | null>(null);
  const [showPeekHint, setShowPeekHint] = useState(true);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const selectedIds = useMemo(() => new Set(lineas.map((l) => l.producto.id)), [lineas]);
  const frecuenteIds = useMemo(() => new Set(productosFrecuentes.map((p) => p.id)), [productosFrecuentes]);
  const isSearching = search.trim().length > 0;

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };
  }, []);

  const handleTouchStart = useCallback((productId: string) => {
    longPressTimerRef.current = setTimeout(() => {
      setPeekedProductId(productId);
      if (navigator.vibrate) navigator.vibrate(10);
    }, 450);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setPeekedProductId(null);
  }, []);

  const handleTouchMove = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  // Filtered products for search mode
  const searchResults = useMemo(() => {
    if (!isSearching) return [];
    const q = search.toLowerCase().trim();
    return productos.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        p.codigo.toLowerCase().includes(q) ||
        (p.especificaciones?.toLowerCase() || "").includes(q) ||
        (p.marca?.toLowerCase() || "").includes(q)
    );
  }, [productos, search, isSearching]);

  // Frequent products (filtered if searching)
  const frecuentesFiltered = useMemo(() => {
    if (!isSearching) return productosFrecuentes;
    const q = search.toLowerCase().trim();
    return productosFrecuentes.filter(
      (p) => p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q)
    );
  }, [productosFrecuentes, search, isSearching]);

  // Products grouped by category (only used when NOT searching)
  const productosPorCategoria = useMemo(() => {
    const rest = productos.filter((p) => !frecuenteIds.has(p.id));
    const grupos = new Map<string, Producto[]>();

    for (const prod of rest) {
      const cat = prod.categoria || "Sin categoría";
      if (!grupos.has(cat)) grupos.set(cat, []);
      grupos.get(cat)!.push(prod);
    }

    const sorted = [...grupos.entries()].sort(([a], [b]) => {
      if (a === "Sin categoría") return 1;
      if (b === "Sin categoría") return -1;
      return a.localeCompare(b);
    });

    return sorted;
  }, [productos, frecuenteIds]);

  const direccion = sucursal?.direccion || cliente?.direccion || cliente?.zona?.nombre || null;

  const renderProductRow = (producto: Producto, isFrecuente: boolean) => {
    const isSelected = selectedIds.has(producto.id);
    const esPorKilo = producto.precio_por_kilo;
    const isPeeked = peekedProductId === producto.id;

    return (
      <div
        key={producto.id}
        className={cn(
          "w-full flex items-start gap-3 px-3 py-2.5 border-b border-ink-100 last:border-b-0 transition-all duration-200",
          isPeeked
            ? "bg-crimson-50"
            : isSelected
            ? "bg-crimson-50/50"
            : "hover:bg-ink-50/50"
        )}
        onTouchStart={() => handleTouchStart(producto.id)}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onMouseEnter={() => handleTouchStart(producto.id)}
        onMouseLeave={handleTouchEnd}
      >
        <div className="flex-1 min-w-0 pt-1">
          <div className={cn("flex items-center gap-1.5 min-w-0")}>
            {isFrecuente && <Star className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />}
            <span
              className={cn(
                "text-sm font-medium text-ink-800 block min-w-0",
                !isPeeked && "truncate"
              )}
            >
              {getDisplayName(producto)}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-ink-400">
            <span className="font-mono">{producto.codigo}</span>
            <span className="tabular-nums">
              {formatCurrency(producto.precio_venta)}
              {esPorKilo ? "/kg" : `/${producto.unidad}`}
            </span>
          </div>

          {/* Expanded peek info */}
          {isPeeked && (
            <div className="mt-2 pt-2 border-t border-crimson-100 space-y-1 text-xs text-ink-500">
              {producto.marca && (
                <div>
                  Marca: <span className="font-medium text-ink-700">{producto.marca}</span>
                </div>
              )}
              {producto.contenido_empaque && (
                <div>
                  Empaque: <span className="font-medium text-ink-700">{producto.contenido_empaque}</span>
                </div>
              )}
              {producto.peso_kg != null && producto.peso_kg > 0 && (
                <div>
                  Peso: <span className="font-medium text-ink-700">{producto.peso_kg} kg</span>
                </div>
              )}
              {producto.stock_actual != null && (
                <div>
                  Stock:{" "}
                  <span
                    className={cn(
                      "font-medium",
                      producto.stock_actual <= (producto.stock_minimo || 0)
                        ? "text-red-600"
                        : "text-ink-700"
                    )}
                  >
                    {producto.stock_actual} {producto.unidad}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Toggle button — stopPropagation prevents long-press interference */}
        <button
          type="button"
          onClick={() => onToggleProducto(producto)}
          onTouchStart={(e) => e.stopPropagation()}
          className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors mt-0.5",
            isSelected
              ? "bg-crimson-500 text-white"
              : "border-2 border-ink-200 text-ink-400 hover:border-ink-300"
          )}
        >
          {isSelected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </button>
      </div>
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
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-7 w-7 text-ink-400 hover:text-red-500 shrink-0"
            onClick={onCancelar}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="p-3 pb-2 shrink-0">
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

      {/* Peek hint (dismissible, session only) */}
      {showPeekHint && (
        <div className="flex items-center justify-between px-3 py-2 bg-blue-50 border-b border-blue-200 text-xs text-blue-700 shrink-0">
          <span>Mantén presionado un producto para ver detalles</span>
          <button
            onClick={() => setShowPeekHint(false)}
            className="text-blue-400 hover:text-blue-600 ml-2"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Product lists */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {isSearching ? (
          /* ── Search mode: flat list, no category headers ── */
          <>
            {searchResults.map((p) => renderProductRow(p, frecuenteIds.has(p.id)))}
            {searchResults.length === 0 && (
              <div className="text-center py-8 text-ink-400 text-sm">
                No se encontraron productos
              </div>
            )}
          </>
        ) : (
          /* ── Browse mode: frecuentes + categories with sticky headers ── */
          <>
            {/* Frequent products */}
            {frecuentesFiltered.length > 0 && (
              <div>
                <div className="sticky top-0 z-10 flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border-b border-amber-200 text-center">
                  <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                  Frecuentes de {cliente?.nombre || "este cliente"}
                  <span className="text-amber-500 font-normal ml-1">
                    ({frecuentesFiltered.length})
                  </span>
                </div>
                {frecuentesFiltered.map((p) => renderProductRow(p, true))}
              </div>
            )}

            {/* Products by category */}
            {productosPorCategoria.map(([categoria, prods]) => {
              const selCount = prods.filter((p) => selectedIds.has(p.id)).length;
              return (
                <div key={categoria}>
                  <div className="sticky top-0 z-10 bg-white border-b border-ink-200 px-3 py-2 flex items-center justify-center gap-2 text-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-ink-500">
                      {categoria}
                    </span>
                    <span className="text-xs text-ink-400">({prods.length})</span>
                    {selCount > 0 && (
                      <span className="text-xs text-crimson-500 font-semibold">
                        · {selCount} seleccionado{selCount > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  {prods.map((p) => renderProductRow(p, false))}
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Sticky navigation bar */}
      <div className="shrink-0 border-t border-ink-100 bg-white p-3 flex items-center gap-3 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
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
