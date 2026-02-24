import { useState } from "react";
import { Search, Star, ChevronRight, ChevronLeft, Package, AlertTriangle, Send, Clock, CheckCircle2, Loader2, CreditCard, FileText, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { getDisplayName } from "@/lib/productUtils";
import { obtenerPrecioUnitarioVenta } from "@/lib/calculos";
import { Producto, LineaPedido, TotalesCalculados } from "./types";
import { useIsMobile } from "@/hooks/use-mobile";

interface PasoProductosInlineProps {
  productos: Producto[];
  productosFrecuentes: Producto[];
  lineas: LineaPedido[];
  loadingFrecuentes: boolean;
  onAgregarProducto: (producto: Producto, cantidadInicial?: number) => void;
  onActualizarCantidad: (productoId: string, cantidad: number) => void;
  onActualizarPrecio: (productoId: string, precio: number) => void;
  onSolicitarAutorizacion: (linea: LineaPedido) => void;
  onMarcarParaRevision: (productoId: string) => void;
  totales: TotalesCalculados;
  // Credit/notes
  terminoCredito: string;
  notas: string;
  clienteDefaultCredito: string;
  onTerminoCreditoChange: (term: string) => void;
  onNotasChange: (notas: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const CREDIT_OPTIONS = [
  { value: "contado", label: "Contado" },
  { value: "8_dias", label: "8 días" },
  { value: "15_dias", label: "15 días" },
  { value: "30_dias", label: "30 días" },
  { value: "60_dias", label: "60 días" },
];

function getPrecioMinimo(producto: Producto): number {
  const precioLista = obtenerPrecioUnitarioVenta({
    precio_venta: producto.precio_venta,
    precio_por_kilo: producto.precio_por_kilo,
    peso_kg: producto.peso_kg,
  });
  const descMax = producto.descuento_maximo || 0;
  return precioLista - descMax;
}

function FilaProducto({
  producto,
  linea,
  isFrecuente,
  onAgregarProducto,
  onActualizarCantidad,
  onActualizarPrecio,
  onSolicitarAutorizacion,
  onMarcarParaRevision,
  isMobile,
}: {
  producto: Producto;
  linea: LineaPedido | undefined;
  isFrecuente: boolean;
  onAgregarProducto: (producto: Producto, cantidadInicial?: number) => void;
  onActualizarCantidad: (productoId: string, cantidad: number) => void;
  onActualizarPrecio: (productoId: string, precio: number) => void;
  onSolicitarAutorizacion: (linea: LineaPedido) => void;
  onMarcarParaRevision: (productoId: string) => void;
  isMobile: boolean;
}) {
  const precioLista = obtenerPrecioUnitarioVenta({
    precio_venta: producto.precio_venta,
    precio_por_kilo: producto.precio_por_kilo,
    peso_kg: producto.peso_kg,
  });
  const descMax = producto.descuento_maximo || 0;
  const precioMinimo = precioLista - descMax;
  const cantidad = linea?.cantidad || 0;
  const precioActual = linea?.precioUnitario ?? precioLista;
  const excedeLimite = linea?.requiereAutorizacion || false;
  const enCarrito = cantidad > 0;

  // Status styling
  let rowBg = "";
  if (linea?.autorizacionStatus === 'aprobado') {
    rowBg = "bg-green-50 dark:bg-green-950/20";
  } else if (excedeLimite && linea?.autorizacionStatus === 'pendiente') {
    rowBg = "bg-amber-50 dark:bg-amber-950/20";
  } else if (excedeLimite) {
    rowBg = "bg-red-50 dark:bg-red-950/20";
  } else if (enCarrito) {
    rowBg = "bg-primary/5";
  }

  if (isMobile) {
    return (
      <div className={cn("p-3 border-b last:border-b-0 space-y-2", rowBg)}>
        {/* Row 1: Name + frecuente badge */}
        <div className="flex items-start gap-2">
          {isFrecuente && <Star className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />}
          <p className="font-medium text-sm leading-snug flex-1">{getDisplayName(producto)}</p>
        </div>
        
        {/* Row 2: Prices info */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          <span>{producto.marca || "—"}</span>
          <span>Lista: <span className="font-medium text-foreground">{formatCurrency(precioLista)}</span></span>
          {descMax > 0 && (
            <span>Mín: <span className="font-medium text-green-600">{formatCurrency(precioMinimo)}</span></span>
          )}
          <span className="text-xs">Desc: {descMax > 0 ? formatCurrency(descMax) : "—"}</span>
        </div>

        {/* Row 3: Quantity + Price inputs */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Input
              type="text"
              inputMode="numeric"
              placeholder="Cant."
              value={cantidad || ""}
              className="h-9 text-center text-sm font-medium"
              onChange={(e) => {
                const val = e.target.value;
                if (val === "") {
                  if (enCarrito) onActualizarCantidad(producto.id, 0);
                  return;
                }
                if (/^\d+$/.test(val)) {
                  const num = parseInt(val, 10);
                  if (!enCarrito && num > 0) {
                    onAgregarProducto(producto, num);
                  } else {
                    onActualizarCantidad(producto.id, num);
                  }
                }
              }}
            />
          </div>
          <div className="flex-1">
            <Input
              type="text"
              inputMode="decimal"
              placeholder={formatCurrency(precioLista)}
              value={enCarrito ? (precioActual || "") : ""}
              className={cn(
                "h-9 text-center text-sm font-medium",
                excedeLimite && "border-red-400 text-red-600"
              )}
              disabled={!enCarrito}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "" || /^\d*\.?\d{0,2}$/.test(val)) {
                  const num = parseFloat(val) || 0;
                  onActualizarPrecio(producto.id, num);
                }
              }}
            />
          </div>
          {enCarrito && (
            <span className="text-sm font-bold text-primary whitespace-nowrap min-w-[70px] text-right">
              {formatCurrency(linea!.subtotal)}
            </span>
          )}
        </div>

        {/* Authorization row */}
        {excedeLimite && linea && linea.autorizacionStatus !== 'aprobado' && (
          <div className="flex items-center gap-2 pt-1">
            <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
            <span className="text-xs text-red-600 flex-1">Excede descuento máximo</span>
            {linea.autorizacionStatus === 'pendiente' ? (
              <Badge variant="outline" className="text-xs text-amber-600 border-amber-400">
                <Clock className="h-3 w-3 mr-1" />Pendiente
              </Badge>
            ) : (
              <div className="flex gap-1">
                <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => onSolicitarAutorizacion(linea)}>
                  <Send className="h-3 w-3 mr-1" />Solicitar
                </Button>
                <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => onMarcarParaRevision(producto.id)}>
                  Revisar
                </Button>
              </div>
            )}
          </div>
        )}
        {linea?.autorizacionStatus === 'aprobado' && (
          <Badge variant="outline" className="text-xs text-green-600 border-green-400">
            <CheckCircle2 className="h-3 w-3 mr-1" />Aprobado
          </Badge>
        )}
      </div>
    );
  }

  // Desktop row
  return (
    <tr className={cn("border-b last:border-b-0 hover:bg-muted/30 transition-colors", rowBg)}>
      <td className="py-2 px-2 truncate">
        <div className="flex items-center gap-1.5">
          {isFrecuente && <Star className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
          <span className="text-sm font-medium truncate">{getDisplayName(producto)}</span>
        </div>
      </td>
      <td className="py-2 px-2 text-xs text-muted-foreground truncate">{producto.marca || "—"}</td>
      <td className="py-2 px-2 text-xs text-center whitespace-nowrap">
        {producto.stock_actual <= 0 ? (
          <span className="text-destructive font-medium">0</span>
        ) : producto.stock_actual <= (producto.stock_minimo || 10) ? (
          <span className="text-amber-600 font-medium">{producto.stock_actual}</span>
        ) : (
          <span className="text-green-600 font-medium">{producto.stock_actual}</span>
        )}
      </td>
      <td className="py-2 px-2 text-sm text-right whitespace-nowrap">{formatCurrency(precioLista)}</td>
      <td className="py-2 px-2 text-xs text-right text-muted-foreground whitespace-nowrap">{descMax > 0 ? formatCurrency(descMax) : "—"}</td>
      <td className="py-2 px-2 text-sm text-right text-green-600 whitespace-nowrap font-medium">{descMax > 0 ? formatCurrency(precioMinimo) : "—"}</td>
      <td className="py-2 px-1">
        <Input
          type="text"
          inputMode="numeric"
          placeholder="0"
          value={cantidad || ""}
          className="h-8 w-full text-center text-sm font-medium px-1 [&::-webkit-inner-spin-button]:appearance-none"
          onChange={(e) => {
            const val = e.target.value;
            if (val === "") {
              if (enCarrito) onActualizarCantidad(producto.id, 0);
              return;
            }
            if (/^\d+$/.test(val)) {
              const num = parseInt(val, 10);
              if (!enCarrito && num > 0) {
                onAgregarProducto(producto, num);
              } else {
                onActualizarCantidad(producto.id, num);
              }
            }
          }}
        />
      </td>
      <td className="py-2 px-1">
        <Input
          type="text"
          inputMode="decimal"
          placeholder={precioLista.toFixed(2)}
          value={enCarrito ? (precioActual || "") : ""}
          className={cn(
            "h-8 w-full text-center text-sm font-medium px-1",
            excedeLimite && "border-red-400 text-red-600 bg-red-50 dark:bg-red-950/20"
          )}
          disabled={!enCarrito}
          onChange={(e) => {
            const val = e.target.value;
            if (val === "" || /^\d*\.?\d{0,2}$/.test(val)) {
              const num = parseFloat(val) || 0;
              onActualizarPrecio(producto.id, num);
            }
          }}
        />
      </td>
      <td className="py-2 px-2 text-sm font-bold text-right text-primary whitespace-nowrap">
        {enCarrito ? formatCurrency(linea!.subtotal) : ""}
      </td>
      <td className="py-2 px-1">
        {excedeLimite && linea && linea.autorizacionStatus !== 'aprobado' && (
          linea.autorizacionStatus === 'pendiente' ? (
            <span aria-label="Pendiente revisión"><Clock className="h-4 w-4 text-amber-500" /></span>
          ) : (
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onSolicitarAutorizacion(linea)} aria-label="Solicitar autorización">
              <Send className="h-3.5 w-3.5 text-destructive" />
            </Button>
          )
        )}
        {linea?.autorizacionStatus === 'aprobado' && (
          <span aria-label="Aprobado"><CheckCircle2 className="h-4 w-4 text-green-500" /></span>
        )}
      </td>
    </tr>
  );
}

export function PasoProductosInline({
  productos,
  productosFrecuentes,
  lineas,
  loadingFrecuentes,
  onAgregarProducto,
  onActualizarCantidad,
  onActualizarPrecio,
  onSolicitarAutorizacion,
  onMarcarParaRevision,
  totales,
  terminoCredito,
  notas,
  clienteDefaultCredito,
  onTerminoCreditoChange,
  onNotasChange,
  onNext,
  onBack,
}: PasoProductosInlineProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [notasOpen, setNotasOpen] = useState(false);
  const isMobile = useIsMobile();

  const canContinue = lineas.length > 0;

  // Build combined list: frecuentes first (marked), then rest
  const frecuenteIds = new Set(productosFrecuentes.map(p => p.id));
  
  const productosFiltrados = productos.filter(p => {
    const term = searchTerm.toLowerCase();
    return p.nombre.toLowerCase().includes(term) ||
      p.codigo.toLowerCase().includes(term) ||
      (p.especificaciones?.toLowerCase() || "").includes(term) ||
      (p.marca?.toLowerCase() || "").includes(term);
  });

  // Sort: frecuentes first, then alphabetical
  const productosOrdenados = [...productosFiltrados].sort((a, b) => {
    const aFrec = frecuenteIds.has(a.id) ? 0 : 1;
    const bFrec = frecuenteIds.has(b.id) ? 0 : 1;
    if (aFrec !== bFrec) return aFrec - bFrec;
    return a.nombre.localeCompare(b.nombre);
  });

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar producto, código o marca..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-11"
        />
      </div>

      {/* Product Table */}
      <Card>
        <ScrollArea className={isMobile ? "h-[calc(100vh-380px)]" : "h-[500px] lg:h-[600px]"}>
          {isMobile ? (
            <div>
              {productosOrdenados.map((producto) => (
                <FilaProducto
                  key={producto.id}
                  producto={producto}
                  linea={lineas.find(l => l.producto.id === producto.id)}
                  isFrecuente={frecuenteIds.has(producto.id)}
                  onAgregarProducto={onAgregarProducto}
                  onActualizarCantidad={onActualizarCantidad}
                  onActualizarPrecio={onActualizarPrecio}
                  onSolicitarAutorizacion={onSolicitarAutorizacion}
                  onMarcarParaRevision={onMarcarParaRevision}
                  isMobile
                />
              ))}
              {productosOrdenados.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No se encontraron productos</p>
              )}
            </div>
          ) : (
              <table className="w-full table-fixed">
                <colgroup>
                  <col className="w-[30%]" />
                  <col className="w-[8%]" />
                  <col className="w-[5%]" />
                  <col className="w-[10%]" />
                  <col className="w-[8%]" />
                  <col className="w-[9%]" />
                  <col className="w-[8%]" />
                  <col className="w-[9%]" />
                  <col className="w-[10%]" />
                  <col className="w-[3%]" />
                </colgroup>
                <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
                  <tr className="text-xs text-muted-foreground uppercase tracking-wider">
                    <th className="py-2 px-2 text-left font-medium">Producto</th>
                    <th className="py-2 px-2 text-left font-medium">Marca</th>
                    <th className="py-2 px-2 text-center font-medium">Stock</th>
                    <th className="py-2 px-2 text-right font-medium">P. Lista</th>
                    <th className="py-2 px-2 text-right font-medium">Desc. Máx</th>
                    <th className="py-2 px-2 text-right font-medium">P. Mínimo</th>
                    <th className="py-2 px-2 text-center font-medium">Cant.</th>
                    <th className="py-2 px-2 text-center font-medium">P. Pactado</th>
                    <th className="py-2 px-2 text-right font-medium">Subtotal</th>
                    <th className="py-2 px-1"></th>
                  </tr>
                </thead>
                <tbody>
                  {productosOrdenados.map((producto) => (
                    <FilaProducto
                      key={producto.id}
                      producto={producto}
                      linea={lineas.find(l => l.producto.id === producto.id)}
                      isFrecuente={frecuenteIds.has(producto.id)}
                      onAgregarProducto={onAgregarProducto}
                      onActualizarCantidad={onActualizarCantidad}
                      onActualizarPrecio={onActualizarPrecio}
                      onSolicitarAutorizacion={onSolicitarAutorizacion}
                      onMarcarParaRevision={onMarcarParaRevision}
                      isMobile={false}
                    />
                  ))}
                  {productosOrdenados.length === 0 && (
                    <tr>
                      <td colSpan={10} className="text-center text-muted-foreground py-8">
                        No se encontraron productos
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
          )}
        </ScrollArea>
      </Card>

      {/* Credit + Notes collapsible */}
      <Collapsible open={notasOpen} onOpenChange={setNotasOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between h-10">
            <span className="flex items-center gap-2 text-sm">
              <CreditCard className="h-4 w-4" />
              Crédito: {CREDIT_OPTIONS.find(o => o.value === terminoCredito)?.label || terminoCredito.replace('_', ' ')}
              {notas && <Badge variant="secondary" className="text-xs ml-2">Con notas</Badge>}
            </span>
            <ChevronDown className={cn("h-4 w-4 transition-transform", notasOpen && "rotate-180")} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-3">
          <div className="flex flex-wrap gap-2">
            {CREDIT_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant={terminoCredito === opt.value ? "default" : "outline"}
                size="sm"
                className="h-8"
                onClick={() => onTerminoCreditoChange(opt.value)}
              >
                {opt.label}
                {clienteDefaultCredito === opt.value && (
                  <Badge variant="secondary" className="text-xs ml-1 scale-75">Default</Badge>
                )}
              </Button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Notas de entrega
            </Label>
            <Textarea
              placeholder="Instrucciones especiales..."
              value={notas}
              onChange={(e) => onNotasChange(e.target.value)}
              className="min-h-[60px] resize-none text-sm"
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Fixed Summary Footer */}
      <Card className="bg-muted/30 border-primary/20">
        <CardContent className="py-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{lineas.length} productos</span>
              <span>{totales.totalUnidades} uds</span>
              <span>{totales.pesoTotalKg.toLocaleString()} kg</span>
              {totales.ahorroDescuentos > 0 && (
                <span className="text-green-600">-{formatCurrency(totales.ahorroDescuentos)}</span>
              )}
            </div>
            <span className="text-xl font-bold text-primary">{formatCurrency(totales.total)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex gap-3 pt-1">
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
          Revisar Pedido
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
