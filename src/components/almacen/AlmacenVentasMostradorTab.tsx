import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSolicitudesVenta, SolicitudVenta } from "@/hooks/useSolicitudesVenta";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, Plus, Minus, ShoppingCart, Send, 
  Clock, CheckCircle2, CreditCard, Truck, Printer,
  Banknote, Building2, Loader2, Package, X
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { NotaVentaMostradorPrint } from "./NotaVentaMostradorPrint";

interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  precio_venta: number;
  stock_actual: number;
}

interface ProductoCarrito {
  producto_id: string;
  codigo: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
}

interface AlmacenVentasMostradorTabProps {
  empleadoId: string | null;
  onStatsUpdate?: (stats: { pendientes: number; listas: number; entregadas: number }) => void;
}

export const AlmacenVentasMostradorTab = ({ empleadoId, onStatsUpdate }: AlmacenVentasMostradorTabProps) => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [carrito, setCarrito] = useState<ProductoCarrito[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [pagoDialogOpen, setPagoDialogOpen] = useState(false);
  const [solicitudPago, setSolicitudPago] = useState<SolicitudVenta | null>(null);
  const [formaPago, setFormaPago] = useState<'efectivo' | 'transferencia'>('efectivo');
  const [referenciaPago, setReferenciaPago] = useState("");
  const [confirmandoPago, setConfirmandoPago] = useState(false);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [solicitudImprimir, setSolicitudImprimir] = useState<SolicitudVenta | null>(null);
  const { toast } = useToast();

  const { 
    solicitudes, 
    loading: loadingSolicitudes, 
    crearSolicitud, 
    confirmarPago, 
    marcarEntregada 
  } = useSolicitudesVenta();

  // Load productos
  useEffect(() => {
    const loadProductos = async () => {
      const { data } = await supabase
        .from("productos")
        .select("id, codigo, nombre, precio_venta, stock_actual")
        .eq("activo", true)
        .order("nombre");
      setProductos(data || []);
    };
    loadProductos();
  }, []);

  // Update stats
  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const todaySolicitudes = solicitudes.filter(s => 
      s.fecha_solicitud.startsWith(today)
    );
    
    onStatsUpdate?.({
      pendientes: todaySolicitudes.filter(s => s.status === 'pendiente').length,
      listas: todaySolicitudes.filter(s => ['lista', 'pagada'].includes(s.status)).length,
      entregadas: todaySolicitudes.filter(s => s.status === 'entregada').length
    });
  }, [solicitudes, onStatsUpdate]);

  // Filter productos
  const filteredProductos = productos.filter(p =>
    p.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Add to cart
  const agregarAlCarrito = (producto: Producto) => {
    const existing = carrito.find(p => p.producto_id === producto.id);
    if (existing) {
      setCarrito(carrito.map(p => 
        p.producto_id === producto.id 
          ? { ...p, cantidad: p.cantidad + 1 }
          : p
      ));
    } else {
      setCarrito([...carrito, {
        producto_id: producto.id,
        codigo: producto.codigo,
        nombre: producto.nombre,
        cantidad: 1,
        precio_unitario: producto.precio_venta
      }]);
    }
  };

  // Update quantity
  const actualizarCantidad = (productoId: string, delta: number) => {
    setCarrito(carrito.map(p => {
      if (p.producto_id === productoId) {
        const nuevaCantidad = p.cantidad + delta;
        return nuevaCantidad > 0 ? { ...p, cantidad: nuevaCantidad } : p;
      }
      return p;
    }).filter(p => p.cantidad > 0));
  };

  // Remove from cart
  const quitarDelCarrito = (productoId: string) => {
    setCarrito(carrito.filter(p => p.producto_id !== productoId));
  };

  // Send solicitud
  const enviarSolicitud = async () => {
    if (carrito.length === 0) {
      toast({
        title: "Carrito vacío",
        description: "Agrega productos antes de solicitar",
        variant: "destructive"
      });
      return;
    }

    setEnviando(true);
    try {
      await crearSolicitud(
        carrito.map(p => ({
          producto_id: p.producto_id,
          nombre: `${p.codigo} - ${p.nombre}`,
          cantidad: p.cantidad,
          precio_unitario: p.precio_unitario
        })),
        empleadoId,
        undefined
      );
      setCarrito([]);
      setSearchTerm("");
    } finally {
      setEnviando(false);
    }
  };

  // Open payment dialog
  const abrirPagoDialog = (solicitud: SolicitudVenta) => {
    setSolicitudPago(solicitud);
    setFormaPago('efectivo');
    setReferenciaPago("");
    setPagoDialogOpen(true);
  };

  // Confirm payment
  const handleConfirmarPago = async () => {
    if (!solicitudPago) return;
    
    setConfirmandoPago(true);
    try {
      const success = await confirmarPago(
        solicitudPago.id, 
        formaPago, 
        formaPago === 'transferencia' ? referenciaPago : undefined
      );
      if (success) {
        setPagoDialogOpen(false);
      }
    } finally {
      setConfirmandoPago(false);
    }
  };

  // Print and deliver
  const handleImprimirYEntregar = async (solicitud: SolicitudVenta) => {
    setSolicitudImprimir(solicitud);
    setPrintDialogOpen(true);
  };

  const handleMarcarEntregada = async () => {
    if (!solicitudImprimir) return;
    await marcarEntregada(solicitudImprimir.id);
    setPrintDialogOpen(false);
    setSolicitudImprimir(null);
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendiente':
        return <Badge className="bg-yellow-500 text-white"><Clock className="w-3 h-3 mr-1" /> Pendiente</Badge>;
      case 'procesando':
        return <Badge className="bg-blue-500 text-white"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Procesando</Badge>;
      case 'lista':
        return <Badge className="bg-green-500 text-white"><CheckCircle2 className="w-3 h-3 mr-1" /> Lista</Badge>;
      case 'pagada':
        return <Badge className="bg-primary text-primary-foreground"><CreditCard className="w-3 h-3 mr-1" /> Pagada</Badge>;
      case 'entregada':
        return <Badge variant="outline"><Truck className="w-3 h-3 mr-1" /> Entregada</Badge>;
      case 'cancelada':
        return <Badge variant="destructive">Cancelada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Today's solicitudes
  const today = format(new Date(), 'yyyy-MM-dd');
  const solicitudesHoy = solicitudes.filter(s => 
    s.fecha_solicitud.startsWith(today)
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Create new solicitud */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Nueva Venta de Mostrador
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Buscar producto por código o nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 text-lg"
            />
          </div>

          {/* Products list */}
          {searchTerm && (
            <ScrollArea className="h-48 border rounded-lg">
              {filteredProductos.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  No se encontraron productos
                </div>
              ) : (
                filteredProductos.slice(0, 10).map(producto => (
                  <div
                    key={producto.id}
                    className="flex items-center justify-between p-3 hover:bg-muted cursor-pointer border-b last:border-0"
                    onClick={() => agregarAlCarrito(producto)}
                  >
                    <div>
                      <p className="font-medium">{producto.codigo}</p>
                      <p className="text-sm text-muted-foreground">{producto.nombre}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">${producto.precio_venta.toLocaleString('es-MX')}</p>
                      <p className="text-xs text-muted-foreground">Stock: {producto.stock_actual}</p>
                    </div>
                  </div>
                ))
              )}
            </ScrollArea>
          )}

          {/* Cart */}
          <div className="border rounded-lg">
            <div className="p-3 bg-muted/50 font-medium flex items-center gap-2">
              <Package className="w-4 h-4" />
              Productos a solicitar ({carrito.length})
            </div>
            <ScrollArea className="h-48">
              {carrito.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  Busca y selecciona productos para agregar
                </div>
              ) : (
                carrito.map(item => (
                  <div key={item.producto_id} className="flex items-center justify-between p-3 border-b last:border-0">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.codigo}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">{item.nombre}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => actualizarCantidad(item.producto_id, -1)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center font-bold">{item.cantidad}</span>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => actualizarCantidad(item.producto_id, 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive"
                        onClick={() => quitarDelCarrito(item.producto_id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </ScrollArea>
          </div>

          {/* Submit button */}
          <Button 
            className="w-full h-14 text-lg"
            disabled={carrito.length === 0 || enviando}
            onClick={enviarSolicitud}
          >
            {enviando ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Enviando...</>
            ) : (
              <><Send className="w-5 h-5 mr-2" /> SOLICITAR VENTA</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Right: Today's solicitudes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Solicitudes de Hoy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            {loadingSolicitudes ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : solicitudesHoy.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay solicitudes hoy
              </div>
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
                        {' • '}
                        {solicitud.productos_solicitados.length} producto(s)
                      </div>

                      {/* Products summary */}
                      <div className="text-sm space-y-0.5 mb-3">
                        {solicitud.productos_solicitados.slice(0, 3).map((p, i) => (
                          <p key={i} className="truncate">
                            {p.cantidad}x {p.nombre}
                          </p>
                        ))}
                        {solicitud.productos_solicitados.length > 3 && (
                          <p className="text-muted-foreground">
                            +{solicitud.productos_solicitados.length - 3} más...
                          </p>
                        )}
                      </div>

                      {/* Total (when ready) */}
                      {solicitud.total && (
                        <div className="text-xl font-bold text-primary mb-3">
                          Total: ${Number(solicitud.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </div>
                      )}

                      {/* Actions based on status */}
                      {solicitud.status === 'lista' && (
                        <Button 
                          className="w-full h-12"
                          onClick={() => abrirPagoDialog(solicitud)}
                        >
                          <CreditCard className="w-4 h-4 mr-2" />
                          CONFIRMAR PAGO
                        </Button>
                      )}

                      {solicitud.status === 'pagada' && (
                        <Button 
                          className="w-full h-12"
                          variant="secondary"
                          onClick={() => handleImprimirYEntregar(solicitud)}
                        >
                          <Printer className="w-4 h-4 mr-2" />
                          IMPRIMIR Y ENTREGAR
                        </Button>
                      )}

                      {solicitud.status === 'entregada' && solicitud.forma_pago && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {solicitud.forma_pago === 'efectivo' ? (
                            <Banknote className="w-4 h-4" />
                          ) : (
                            <Building2 className="w-4 h-4" />
                          )}
                          {solicitud.forma_pago === 'efectivo' ? 'Efectivo' : `Transferencia: ${solicitud.referencia_pago || ''}`}
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

      {/* Payment Dialog */}
      <Dialog open={pagoDialogOpen} onOpenChange={setPagoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Pago</DialogTitle>
            <DialogDescription>
              Solicitud {solicitudPago?.folio} - Total: ${Number(solicitudPago?.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Forma de pago</label>
              <Select value={formaPago} onValueChange={(v) => setFormaPago(v as any)}>
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">
                    <div className="flex items-center gap-2">
                      <Banknote className="w-4 h-4" />
                      Efectivo
                    </div>
                  </SelectItem>
                  <SelectItem value="transferencia">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Transferencia
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formaPago === 'transferencia' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Referencia de transferencia</label>
                <Input
                  placeholder="Últimos 4 dígitos o referencia"
                  value={referenciaPago}
                  onChange={(e) => setReferenciaPago(e.target.value)}
                  className="h-12"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPagoDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmarPago}
              disabled={confirmandoPago || (formaPago === 'transferencia' && !referenciaPago)}
              className="min-w-[140px]"
            >
              {confirmandoPago ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Confirmar Pago"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Dialog */}
      <Dialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nota de Venta</DialogTitle>
          </DialogHeader>

          {solicitudImprimir && (
            <NotaVentaMostradorPrint 
              solicitud={solicitudImprimir}
              onPrint={() => {}}
            />
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPrintDialogOpen(false)}>
              Cerrar
            </Button>
            <Button onClick={handleMarcarEntregada}>
              <Truck className="w-4 h-4 mr-2" />
              Marcar como Entregada
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
