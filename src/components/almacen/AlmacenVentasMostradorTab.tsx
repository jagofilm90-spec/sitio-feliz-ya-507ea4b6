import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSolicitudesVenta, SolicitudVenta } from "@/hooks/useSolicitudesVenta";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Search, Plus, Minus, ShoppingCart, Clock, CheckCircle2, CreditCard, Truck, Printer,
  Banknote, Building2, Loader2, Package, X, DollarSign, AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { NotaVentaMostradorPrint } from "./NotaVentaMostradorPrint";
import { cn } from "@/lib/utils";

interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  precio_venta: number;
  stock_actual: number;
  aplica_iva: boolean;
  aplica_ieps: boolean;
  unidad: string;
}

interface ProductoCarrito {
  producto_id: string;
  codigo: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  aplica_iva: boolean;
  aplica_ieps: boolean;
  unidad: string;
  stock_disponible: number;
}

interface AlmacenVentasMostradorTabProps {
  empleadoId: string | null;
  onStatsUpdate?: (stats: { pendientes: number; listas: number; entregadas: number }) => void;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(v);

export const AlmacenVentasMostradorTab = ({ empleadoId, onStatsUpdate }: AlmacenVentasMostradorTabProps) => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [carrito, setCarrito] = useState<ProductoCarrito[]>([]);
  const [cobrarDialogOpen, setCobrarDialogOpen] = useState(false);
  const [formaPago, setFormaPago] = useState<"efectivo" | "transferencia">("efectivo");
  const [referenciaPago, setReferenciaPago] = useState("");
  const [efectivoRecibido, setEfectivoRecibido] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [pasoCobranza, setPasoCobranza] = useState("");
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [solicitudImprimir, setSolicitudImprimir] = useState<SolicitudVenta | null>(null);
  const { toast } = useToast();

  const { solicitudes, loading: loadingSolicitudes, crearSolicitud, confirmarPago, marcarEntregada } = useSolicitudesVenta();

  // Load productos with IVA/IEPS info
  useEffect(() => {
    const loadProductos = async () => {
      const { data } = await supabase
        .from("productos")
        .select("id, codigo, nombre, precio_venta, stock_actual, aplica_iva, aplica_ieps, unidad")
        .eq("activo", true)
        .neq("bloqueado_venta", true)
        .or("solo_uso_interno.is.null,solo_uso_interno.eq.false")
        .order("nombre");
      setProductos(data || []);
    };
    loadProductos();
  }, []);

  // Update stats
  useEffect(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    const todaySolicitudes = solicitudes.filter(s => s.fecha_solicitud?.startsWith(today));
    onStatsUpdate?.({
      pendientes: todaySolicitudes.filter(s => s.status === "pendiente").length,
      listas: todaySolicitudes.filter(s => ["lista", "pagada"].includes(s.status)).length,
      entregadas: todaySolicitudes.filter(s => s.status === "entregada").length,
    });
  }, [solicitudes, onStatsUpdate]);

  // Filtered products
  const filteredProductos = searchTerm.length >= 2
    ? productos.filter(p =>
        p.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 10)
    : [];

  // Cart totals
  const totales = useMemo(() => {
    let subtotal = 0;
    let iva = 0;
    let ieps = 0;
    carrito.forEach(item => {
      const lineTotal = item.cantidad * item.precio_unitario;
      subtotal += lineTotal;
      if (item.aplica_iva) iva += lineTotal * 0.16;
      if (item.aplica_ieps) ieps += lineTotal * 0.08;
    });
    return { subtotal, iva, ieps, total: subtotal + iva + ieps };
  }, [carrito]);

  const cambio = useMemo(() => {
    const recibido = parseFloat(efectivoRecibido) || 0;
    return recibido - totales.total;
  }, [efectivoRecibido, totales.total]);

  // Add to cart with stock validation
  const agregarAlCarrito = (producto: Producto) => {
    if (producto.stock_actual <= 0) {
      toast({ title: "Sin stock", description: `${producto.nombre} no tiene stock disponible`, variant: "destructive" });
      return;
    }

    const existing = carrito.find(p => p.producto_id === producto.id);
    const cantidadActual = existing?.cantidad || 0;

    if (cantidadActual >= producto.stock_actual) {
      toast({ title: "Stock insuficiente", description: `Solo hay ${producto.stock_actual} ${producto.unidad || "unidades"} disponibles`, variant: "destructive" });
      return;
    }

    if (existing) {
      setCarrito(carrito.map(p => p.producto_id === producto.id ? { ...p, cantidad: p.cantidad + 1 } : p));
    } else {
      setCarrito([...carrito, {
        producto_id: producto.id,
        codigo: producto.codigo,
        nombre: producto.nombre,
        cantidad: 1,
        precio_unitario: producto.precio_venta,
        aplica_iva: producto.aplica_iva || false,
        aplica_ieps: producto.aplica_ieps || false,
        unidad: producto.unidad || "pza",
        stock_disponible: producto.stock_actual,
      }]);
    }
  };

  const actualizarCantidad = (productoId: string, delta: number) => {
    setCarrito(carrito.map(p => {
      if (p.producto_id !== productoId) return p;
      const nueva = p.cantidad + delta;
      if (nueva <= 0) return p;
      if (delta > 0 && nueva > p.stock_disponible) {
        toast({ title: "Stock insuficiente", description: `Máximo: ${p.stock_disponible}`, variant: "destructive" });
        return p;
      }
      return { ...p, cantidad: nueva };
    }).filter(p => p.cantidad > 0));
  };

  const quitarDelCarrito = (productoId: string) => {
    setCarrito(carrito.filter(p => p.producto_id !== productoId));
  };

  // Direct checkout — no office dependency
  const handleCobrar = async () => {
    if (carrito.length === 0) return;
    if (formaPago === "transferencia" && !referenciaPago.trim()) {
      toast({ title: "Referencia requerida", variant: "destructive" });
      return;
    }
    if (formaPago === "efectivo" && cambio < 0) {
      toast({ title: "Efectivo insuficiente", variant: "destructive" });
      return;
    }

    setProcesando(true);
    try {
      // 1. Create solicitud with total pre-calculated
      setPasoCobranza("Registrando venta...");
      const productosData = carrito.map(p => ({
        producto_id: p.producto_id,
        nombre: `${p.codigo} - ${p.nombre}`,
        cantidad: p.cantidad,
        precio_unitario: p.precio_unitario,
      }));

      const ventaData = await crearSolicitud(productosData, empleadoId);
      if (!ventaData) throw new Error("No se pudo crear la venta");

      // 2. Update with total and mark as paid immediately
      setPasoCobranza("Procesando pago...");
      const { data: { user } } = await supabase.auth.getUser();

      await supabase
        .from("solicitudes_venta_mostrador")
        .update({
          total: totales.total,
          status: "pagada",
          procesado_por: empleadoId,
          forma_pago: formaPago,
          referencia_pago: formaPago === "transferencia" ? referenciaPago : null,
          fecha_procesado: new Date().toISOString(),
          fecha_pagado: new Date().toISOString(),
        })
        .eq("id", ventaData.id);

      // 3. Decrement inventory FEFO
      setPasoCobranza("Actualizando inventario...");
      for (const item of carrito) {
        const { data: lotes } = await supabase
          .from("inventario_lotes")
          .select("id, cantidad_disponible, fecha_caducidad")
          .eq("producto_id", item.producto_id)
          .gt("cantidad_disponible", 0)
          .order("fecha_caducidad", { ascending: true });

        let cantidadRestante = item.cantidad;
        for (const lote of lotes || []) {
          if (cantidadRestante <= 0) break;
          const descontar = Math.min(lote.cantidad_disponible, cantidadRestante);

          await supabase
            .from("inventario_lotes")
            .update({ cantidad_disponible: lote.cantidad_disponible - descontar })
            .eq("id", lote.id);

          await supabase
            .from("inventario_movimientos")
            .insert({
              producto_id: item.producto_id,
              cantidad: descontar,
              tipo_movimiento: "salida",
              referencia: ventaData.folio,
              notas: "Venta mostrador",
              usuario_id: user?.id || "",
            });

          cantidadRestante -= descontar;
        }
      }

      // 4. Show print dialog
      setPasoCobranza("");
      const { data: ventaCompleta } = await supabase
        .from("solicitudes_venta_mostrador")
        .select("*")
        .eq("id", ventaData.id)
        .single();

      if (ventaCompleta) {
        const parsed = {
          ...ventaCompleta,
          productos_solicitados: typeof ventaCompleta.productos_solicitados === "string"
            ? JSON.parse(ventaCompleta.productos_solicitados)
            : ventaCompleta.productos_solicitados || [],
        } as SolicitudVenta;
        setSolicitudImprimir(parsed);
        setPrintDialogOpen(true);
      }

      setCarrito([]);
      setSearchTerm("");
      setCobrarDialogOpen(false);
      setEfectivoRecibido("");
      setReferenciaPago("");

      toast({ title: "Venta registrada", description: `${ventaData.folio} — ${formatCurrency(totales.total)}` });

      // Reload products to refresh stock
      const { data: refreshed } = await supabase
        .from("productos")
        .select("id, codigo, nombre, precio_venta, stock_actual, aplica_iva, aplica_ieps, unidad")
        .eq("activo", true)
        .neq("bloqueado_venta", true)
        .or("solo_uso_interno.is.null,solo_uso_interno.eq.false")
        .order("nombre");
      setProductos(refreshed || []);
    } catch (error: any) {
      console.error("Error en venta:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setProcesando(false);
      setPasoCobranza("");
    }
  };

  const handleMarcarEntregada = async () => {
    if (!solicitudImprimir) return;
    await marcarEntregada(solicitudImprimir.id);
    setPrintDialogOpen(false);
    setSolicitudImprimir(null);
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { icon: any; label: string; className: string }> = {
      pendiente: { icon: Clock, label: "Pendiente", className: "bg-yellow-500 text-white" },
      pagada: { icon: CreditCard, label: "Pagada", className: "bg-primary text-primary-foreground" },
      entregada: { icon: Truck, label: "Entregada", className: "" },
    };
    const c = config[status] || { icon: Clock, label: status, className: "" };
    const Icon = c.icon;
    return <Badge variant={status === "entregada" ? "outline" : "default"} className={c.className}><Icon className="w-3 h-3 mr-1" />{c.label}</Badge>;
  };

  const today = format(new Date(), "yyyy-MM-dd");
  const solicitudesHoy = solicitudes.filter(s => s.fecha_solicitud?.startsWith(today));

  return (
    <div className="space-y-4">
    <PageHeader
      title="Mostrador."
      lead="Ventas directas al público"
    />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: POS */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Nueva Venta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Buscar por código o nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 text-lg"
              autoComplete="off"
            />
          </div>

          {/* Product results */}
          {filteredProductos.length > 0 && (
            <ScrollArea className="h-48 border rounded-lg">
              {filteredProductos.map(producto => {
                const sinStock = producto.stock_actual <= 0;
                return (
                  <button
                    key={producto.id}
                    disabled={sinStock}
                    className={cn(
                      "w-full flex items-center justify-between p-3 border-b last:border-0 text-left transition-colors",
                      sinStock ? "opacity-40 cursor-not-allowed" : "hover:bg-muted cursor-pointer"
                    )}
                    onClick={() => !sinStock && agregarAlCarrito(producto)}
                  >
                    <div>
                      <p className="font-medium">{producto.codigo}</p>
                      <p className="text-sm text-muted-foreground">{producto.nombre}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(producto.precio_venta)}</p>
                      <p className={cn("text-xs", sinStock ? "text-destructive font-medium" : producto.stock_actual <= 5 ? "text-amber-600" : "text-muted-foreground")}>
                        {sinStock ? "Sin stock" : `Stock: ${producto.stock_actual}`}
                      </p>
                    </div>
                  </button>
                );
              })}
            </ScrollArea>
          )}

          {/* Cart */}
          <div className="border rounded-lg">
            <div className="p-3 bg-muted/50 font-medium flex items-center gap-2">
              <Package className="w-4 h-4" />
              Carrito ({carrito.length})
            </div>
            <ScrollArea className="max-h-64">
              {carrito.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">Busca y selecciona productos</div>
              ) : (
                carrito.map(item => (
                  <div key={item.producto_id} className="flex items-center justify-between p-3 border-b last:border-0">
                    <div className="flex-1 min-w-0 mr-2">
                      <p className="font-medium text-sm truncate">{item.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(item.precio_unitario)}/{item.unidad}
                        {" · "}
                        <span className="font-medium">{formatCurrency(item.cantidad * item.precio_unitario)}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => actualizarCantidad(item.producto_id, -1)}>
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-10 text-center font-bold text-lg">{item.cantidad}</span>
                      <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => actualizarCantidad(item.producto_id, 1)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive" onClick={() => quitarDelCarrito(item.producto_id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </ScrollArea>

            {/* Totals */}
            {carrito.length > 0 && (
              <div className="p-3 border-t bg-muted/30 space-y-1">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatCurrency(totales.subtotal)}</span>
                </div>
                {totales.iva > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>IVA 16%</span>
                    <span>{formatCurrency(totales.iva)}</span>
                  </div>
                )}
                {totales.ieps > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>IEPS 8%</span>
                    <span>{formatCurrency(totales.ieps)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-bold pt-1 border-t">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(totales.total)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Checkout button */}
          <Button
            className="w-full h-16 text-xl"
            disabled={carrito.length === 0}
            onClick={() => { setFormaPago("efectivo"); setEfectivoRecibido(""); setReferenciaPago(""); setCobrarDialogOpen(true); }}
          >
            <DollarSign className="w-6 h-6 mr-2" />
            COBRAR {carrito.length > 0 ? formatCurrency(totales.total) : ""}
          </Button>
        </CardContent>
      </Card>

      {/* Right: Today's sales */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Ventas de Hoy ({solicitudesHoy.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            {loadingSolicitudes ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : solicitudesHoy.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No hay ventas hoy</div>
            ) : (
              <div className="space-y-3">
                {solicitudesHoy.map(solicitud => (
                  <Card key={solicitud.id} className="overflow-hidden">
                    <div className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono font-bold">{solicitud.folio}</span>
                        {getStatusBadge(solicitud.status)}
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        {format(new Date(solicitud.fecha_solicitud), "HH:mm", { locale: es })}
                        {" · "}
                        {solicitud.productos_solicitados.length} producto(s)
                      </div>
                      {solicitud.total && (
                        <div className="text-xl font-bold text-primary mb-3">
                          {formatCurrency(Number(solicitud.total))}
                        </div>
                      )}
                      {solicitud.status === "pagada" && (
                        <Button className="w-full h-12" variant="secondary" onClick={() => { setSolicitudImprimir(solicitud); setPrintDialogOpen(true); }}>
                          <Printer className="w-4 h-4 mr-2" /> IMPRIMIR Y ENTREGAR
                        </Button>
                      )}
                      {solicitud.status === "entregada" && solicitud.forma_pago && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {solicitud.forma_pago === "efectivo" ? <Banknote className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                          {solicitud.forma_pago === "efectivo" ? "Efectivo" : `Transferencia: ${solicitud.referencia_pago || ""}`}
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Checkout Dialog */}
      <Dialog open={cobrarDialogOpen} onOpenChange={setCobrarDialogOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md overflow-x-hidden">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <DollarSign className="h-6 w-6" />
              Cobrar {formatCurrency(totales.total)}
            </DialogTitle>
            <DialogDescription>{carrito.length} producto(s)</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Payment method */}
            <div className="grid grid-cols-2 gap-3">
              <button
                className={cn("p-4 rounded-lg border-2 text-center transition-all", formaPago === "efectivo" ? "border-primary bg-primary/10" : "border-border hover:border-muted-foreground/50")}
                onClick={() => setFormaPago("efectivo")}
              >
                <Banknote className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <span className="font-medium">Efectivo</span>
              </button>
              <button
                className={cn("p-4 rounded-lg border-2 text-center transition-all", formaPago === "transferencia" ? "border-primary bg-primary/10" : "border-border hover:border-muted-foreground/50")}
                onClick={() => setFormaPago("transferencia")}
              >
                <Building2 className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                <span className="font-medium">Transferencia</span>
              </button>
            </div>

            {formaPago === "efectivo" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">¿Con cuánto paga?</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="$0.00"
                  value={efectivoRecibido}
                  onChange={(e) => setEfectivoRecibido(e.target.value)}
                  className="h-14 text-2xl text-center font-bold"
                  autoFocus
                />
                {parseFloat(efectivoRecibido) > 0 && (
                  <div className={cn("text-center p-3 rounded-lg text-lg font-bold", cambio >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                    {cambio >= 0 ? `Cambio: ${formatCurrency(cambio)}` : `Faltan: ${formatCurrency(Math.abs(cambio))}`}
                  </div>
                )}
              </div>
            )}

            {formaPago === "transferencia" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Referencia</label>
                <Input placeholder="Últimos 4 dígitos" value={referenciaPago} onChange={(e) => setReferenciaPago(e.target.value)} className="h-12" />
              </div>
            )}
          </div>

          <DialogFooter className="flex-col items-stretch gap-2">
            <Button
              className="h-14 text-lg"
              disabled={procesando || (formaPago === "efectivo" && cambio < 0) || (formaPago === "transferencia" && !referenciaPago.trim())}
              onClick={handleCobrar}
            >
              {procesando ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" />{pasoCobranza || "Procesando..."}</>
              ) : (
                <><CheckCircle2 className="w-5 h-5 mr-2" /> CONFIRMAR COBRO</>
              )}
            </Button>
            {pasoCobranza && <p className="text-xs text-center text-muted-foreground animate-pulse">{pasoCobranza}</p>}
            <Button variant="outline" onClick={() => setCobrarDialogOpen(false)} disabled={procesando}>Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Dialog */}
      <Dialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-2xl overflow-x-hidden">
          <DialogHeader><DialogTitle>Nota de Venta</DialogTitle></DialogHeader>
          {solicitudImprimir && <NotaVentaMostradorPrint solicitud={solicitudImprimir} onPrint={() => {}} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrintDialogOpen(false)}>Cerrar</Button>
            <Button onClick={handleMarcarEntregada}>
              <Truck className="w-4 h-4 mr-2" /> Marcar como Entregada
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </div>
  );
};
