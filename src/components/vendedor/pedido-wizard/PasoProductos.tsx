import { useState } from "react";
import { Search, Plus, Minus, Star, Package, ChevronRight, ChevronLeft, ShoppingCart, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { formatCurrency } from "@/lib/utils";
import { getDisplayName } from "@/lib/productUtils";
import { Producto, LineaPedido } from "./types";
import { CarritoPanel } from "./CarritoPanel";
import { ProductoItemMobile } from "./ProductoItemMobile";
import { useIsMobile } from "@/hooks/use-mobile";

interface PasoProductosProps {
  productos: Producto[];
  productosFrecuentes: Producto[];
  lineas: LineaPedido[];
  loadingFrecuentes: boolean;
  onAgregarProducto: (producto: Producto, cantidadInicial?: number) => void;
  onActualizarCantidad: (productoId: string, cantidad: number) => void;
  onActualizarDescuento: (productoId: string, descuento: number) => void;
  onSolicitarAutorizacion: (linea: LineaPedido) => void;
  onMarcarParaRevision: (productoId: string) => void;
  totales: { total: number; pesoTotalKg: number; totalUnidades: number };
  onNext: () => void;
  onBack: () => void;
}

// Stock badge component
const StockBadge = ({ producto }: { producto: Producto }) => {
  const stockMinimo = producto.stock_minimo || 10;
  
  if (producto.stock_actual <= 0) {
    return (
      <Badge variant="destructive" className="text-xs gap-1">
        <AlertCircle className="h-3 w-3" />
        Sin stock
      </Badge>
    );
  }
  
  if (producto.stock_actual <= stockMinimo) {
    return (
      <Badge variant="outline" className="text-xs text-amber-600 border-amber-400 bg-amber-50">
        Stock bajo
      </Badge>
    );
  }
  
  return (
    <Badge variant="outline" className="text-xs text-green-600 border-green-400 bg-green-50">
      {producto.stock_actual} disp.
    </Badge>
  );
};

export function PasoProductos({
  productos,
  productosFrecuentes,
  lineas,
  loadingFrecuentes,
  onAgregarProducto,
  onActualizarCantidad,
  onActualizarDescuento,
  onSolicitarAutorizacion,
  onMarcarParaRevision,
  totales,
  onNext,
  onBack,
}: PasoProductosProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [carritoOpen, setCarritoOpen] = useState(false);
  const isMobile = useIsMobile();

  const canContinue = lineas.length > 0;

  // Filter products excluding frequent ones to avoid duplicates
  const productosFiltrados = productos
    .filter(p => {
      const term = searchTerm.toLowerCase();
      return p.nombre.toLowerCase().includes(term) ||
        p.codigo.toLowerCase().includes(term) ||
        (p.especificaciones?.toLowerCase() || "").includes(term) ||
        (p.marca?.toLowerCase() || "").includes(term);
    })
    .filter(p => !productosFrecuentes.some(f => f.id === p.id));

  return (
    <div className="space-y-4">
      {/* Step Header - compact on mobile */}
      {!isMobile && (
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            ¿Qué productos necesita?
          </h2>
          <p className="text-muted-foreground">
            Selecciona los productos y las cantidades
          </p>
        </div>
      )}

      <div className={isMobile ? "space-y-4" : "flex gap-4"}>
        {/* Product Selection Area */}
        <div className={isMobile ? "w-full" : "flex-1"}>
          {/* Frequent Products */}
          {productosFrecuentes.length > 0 && (
            <Card className="mb-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500" />
                  Frecuentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingFrecuentes ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : (
                  <div className={`grid gap-2 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'}`}>
                    {productosFrecuentes.map((producto) => {
                      const yaEnCarrito = lineas.some(l => l.producto.id === producto.id);
                      const cantEnCarrito = lineas.find(l => l.producto.id === producto.id)?.cantidad || 0;
                      return isMobile ? (
                        <ProductoItemMobile
                          key={producto.id}
                          producto={producto}
                          cantidadEnCarrito={cantEnCarrito}
                          onAgregarProducto={onAgregarProducto}
                          onActualizarCantidad={onActualizarCantidad}
                        />
                      ) : (
                        <div
                          key={producto.id}
                          className={`p-2 rounded-lg border transition-all cursor-pointer ${
                            yaEnCarrito 
                              ? 'bg-primary/10 border-primary' 
                              : 'hover:bg-muted hover:border-primary/50'
                          }`}
                          onClick={() => !yaEnCarrito && onAgregarProducto(producto)}
                        >
                          <p className="font-medium text-xs truncate">
                            {getDisplayName(producto)}
                          </p>
                          <p className="text-sm font-bold text-primary">
                            {formatCurrency(producto.precio_venta)}
                          </p>
                          {yaEnCarrito && (
                            <Badge variant="default" className="text-xs mt-1">✓</Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Product Search */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
                Catálogo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar productos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <ScrollArea className={isMobile ? "h-[calc(100vh-320px)]" : "h-[300px] sm:h-[400px]"}>
                <div className={`${isMobile ? 'space-y-2' : 'space-y-1'} pr-2`}>
                  {productosFiltrados.map((producto) => {
                    const lineaEnCarrito = lineas.find(l => l.producto.id === producto.id);
                    const cantidadEnCarrito = lineaEnCarrito?.cantidad || 0;

                    if (isMobile) {
                      return (
                        <ProductoItemMobile
                          key={producto.id}
                          producto={producto}
                          cantidadEnCarrito={cantidadEnCarrito}
                          onAgregarProducto={onAgregarProducto}
                          onActualizarCantidad={onActualizarCantidad}
                        />
                      );
                    }
                    
                    return (
                      <div
                        key={producto.id}
                        className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                          cantidadEnCarrito > 0 
                            ? 'bg-primary/10 border border-primary' 
                            : 'hover:bg-muted border border-transparent'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {getDisplayName(producto)}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-xs text-muted-foreground">{producto.codigo}</p>
                            <StockBadge producto={producto} />
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 ml-2">
                          <span className="font-bold text-sm">{formatCurrency(producto.precio_venta)}</span>
                          
                        <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-7 w-7"
                              onClick={() => cantidadEnCarrito > 0 && onActualizarCantidad(producto.id, cantidadEnCarrito - 1)}
                              disabled={cantidadEnCarrito <= 0}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={cantidadEnCarrito || ""}
                              placeholder="0"
                              className="w-14 h-7 text-center text-sm font-medium px-1 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "") {
                                  onActualizarCantidad(producto.id, 0);
                                  return;
                                }
                                if (/^\d+$/.test(val)) {
                                  const num = parseInt(val, 10);
                                  if (cantidadEnCarrito === 0 && num > 0) {
                                    onAgregarProducto(producto, num);
                                  } else {
                                    onActualizarCantidad(producto.id, num);
                                  }
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-7 w-7"
                              onClick={() => {
                                if (cantidadEnCarrito === 0) {
                                  onAgregarProducto(producto);
                                } else {
                                  onActualizarCantidad(producto.id, cantidadEnCarrito + 1);
                                }
                              }}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {productosFiltrados.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No se encontraron productos</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Cart Panel - Desktop: Side panel, Mobile: Sheet */}
        {!isMobile && (
          <div className="w-80 shrink-0">
            <CarritoPanel
              lineas={lineas}
              totales={totales}
              onActualizarCantidad={onActualizarCantidad}
              onActualizarDescuento={onActualizarDescuento}
              onSolicitarAutorizacion={onSolicitarAutorizacion}
              onMarcarParaRevision={onMarcarParaRevision}
            />
          </div>
        )}
      </div>

      {/* Mobile: Floating Cart Button */}
      {isMobile && lineas.length > 0 && (
        <Sheet open={carritoOpen} onOpenChange={setCarritoOpen}>
          <SheetTrigger asChild>
            <Button 
              className="fixed bottom-24 right-4 h-14 rounded-full shadow-lg z-40 gap-2"
              size="lg"
            >
              <ShoppingCart className="h-5 w-5" />
              <span className="font-bold">{lineas.length}</span>
              <span className="text-sm">• {formatCurrency(totales.total)}</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh]">
            <SheetHeader className="pb-4">
              <SheetTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Carrito ({lineas.length} productos)
              </SheetTitle>
            </SheetHeader>
            <ScrollArea className="h-[calc(80vh-100px)]">
              <CarritoPanel
                lineas={lineas}
                totales={totales}
                onActualizarCantidad={onActualizarCantidad}
                onActualizarDescuento={onActualizarDescuento}
                onSolicitarAutorizacion={onSolicitarAutorizacion}
                onMarcarParaRevision={onMarcarParaRevision}
                compact
              />
            </ScrollArea>
          </SheetContent>
        </Sheet>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onBack} size="lg" className="h-12">
          <ChevronLeft className="h-4 w-4 mr-2" />
          Anterior
        </Button>
        <Button 
          onClick={onNext} 
          disabled={!canContinue}
          size="lg"
          className="flex-1 h-12 font-semibold"
        >
          Continuar
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
