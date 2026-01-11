import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  Search, Plus, Minus, ShoppingCart, Trash2, Loader2, Package, Store, 
  AlertTriangle, Percent, Lock, Send, Clock, CreditCard, Star, AlertCircle
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { calcularDesgloseImpuestos, redondear, obtenerPrecioUnitarioVenta } from "@/lib/calculos";
import { format, addDays, isWeekend } from "date-fns";
import { es } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SolicitudDescuentoDialog } from "./SolicitudDescuentoDialog";

interface Props {
  onPedidoCreado: () => void;
}

interface Cliente {
  id: string;
  codigo: string;
  nombre: string;
  termino_credito: string;
}

interface Sucursal {
  id: string;
  nombre: string;
  direccion: string | null;
}

interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  unidad: string;
  precio_venta: number;
  stock_actual: number;
  stock_minimo: number | null;
  aplica_iva: boolean;
  aplica_ieps: boolean;
  kg_por_unidad: number | null;
  precio_por_kilo: boolean;
  presentacion: string | null;
  descuento_maximo: number;
}

interface LineaPedido {
  producto: Producto;
  cantidad: number;
  precioLista: number;
  precioUnitario: number;
  descuento: number;
  subtotal: number;
  requiereAutorizacion: boolean;
  autorizacionStatus?: 'pendiente' | 'aprobado' | 'rechazado' | null;
  solicitudId?: string;
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
      <Badge variant="outline" className="text-xs text-amber-600 border-amber-400 bg-amber-50 dark:bg-amber-950/30">
        Stock bajo ({producto.stock_actual})
      </Badge>
    );
  }
  
  return (
    <Badge variant="outline" className="text-xs text-green-600 border-green-400 bg-green-50 dark:bg-green-950/30">
      {producto.stock_actual} disp.
    </Badge>
  );
};

export function VendedorNuevoPedidoTab({ onPedidoCreado }: Props) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [productosFrecuentes, setProductosFrecuentes] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingFrecuentes, setLoadingFrecuentes] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [selectedClienteId, setSelectedClienteId] = useState("");
  const [selectedSucursalId, setSelectedSucursalId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [lineas, setLineas] = useState<LineaPedido[]>([]);
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [terminoCredito, setTerminoCredito] = useState("contado");
  const [notas, setNotas] = useState("");

  // Discount authorization dialog
  const [solicitudDialogOpen, setSolicitudDialogOpen] = useState(false);
  const [productoParaSolicitud, setProductoParaSolicitud] = useState<{
    id: string;
    codigo: string;
    nombre: string;
    precioLista: number;
    descuentoMaximo: number;
    precioSolicitado: number;
    cantidad: number;
  } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedClienteId) {
      fetchSucursales(selectedClienteId);
      fetchProductosFrecuentes(selectedClienteId);
      // Pre-fill credit term from client
      const cliente = clientes.find(c => c.id === selectedClienteId);
      if (cliente) {
        setTerminoCredito(cliente.termino_credito);
      }
    } else {
      setSucursales([]);
      setSelectedSucursalId("");
      setTerminoCredito("contado");
      setProductosFrecuentes([]);
    }
  }, [selectedClienteId, clientes]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch my clients
      const { data: clientesData } = await supabase
        .from("clientes")
        .select("id, codigo, nombre, termino_credito")
        .eq("vendedor_asignado", user.id)
        .eq("activo", true)
        .order("nombre");

      setClientes(clientesData || []);

      // Fetch ALL active products (removed stock filter)
      const { data: productosData } = await supabase
        .from("productos")
        .select("id, codigo, nombre, unidad, precio_venta, stock_actual, stock_minimo, aplica_iva, aplica_ieps, kg_por_unidad, precio_por_kilo, presentacion, descuento_maximo")
        .eq("activo", true)
        .order("nombre");

      setProductos(productosData || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  const fetchSucursales = async (clienteId: string) => {
    const { data } = await supabase
      .from("cliente_sucursales")
      .select("id, nombre, direccion")
      .eq("cliente_id", clienteId)
      .eq("activo", true)
      .order("nombre");

    setSucursales(data || []);
    if (data && data.length === 1) {
      setSelectedSucursalId(data[0].id);
    }
  };

  const fetchProductosFrecuentes = async (clienteId: string) => {
    try {
      setLoadingFrecuentes(true);
      
      // Get product IDs from previous orders for this client
      const { data: pedidosData } = await supabase
        .from("pedidos")
        .select("id")
        .eq("cliente_id", clienteId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!pedidosData || pedidosData.length === 0) {
        setProductosFrecuentes([]);
        return;
      }

      const pedidoIds = pedidosData.map(p => p.id);

      // Get product frequency from order details
      const { data: detallesData } = await supabase
        .from("pedidos_detalles")
        .select("producto_id")
        .in("pedido_id", pedidoIds);

      if (!detallesData || detallesData.length === 0) {
        setProductosFrecuentes([]);
        return;
      }

      // Count frequency
      const frecuencia: Record<string, number> = {};
      detallesData.forEach(d => {
        frecuencia[d.producto_id] = (frecuencia[d.producto_id] || 0) + 1;
      });

      // Get top 8 most frequent product IDs
      const topProductoIds = Object.entries(frecuencia)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([id]) => id);

      // Fetch product details for frequent products
      const { data: productosFrec } = await supabase
        .from("productos")
        .select("id, codigo, nombre, unidad, precio_venta, stock_actual, stock_minimo, aplica_iva, aplica_ieps, kg_por_unidad, precio_por_kilo, presentacion, descuento_maximo")
        .in("id", topProductoIds)
        .eq("activo", true);

      // Sort by original frequency order
      const sortedProductos = topProductoIds
        .map(id => productosFrec?.find(p => p.id === id))
        .filter(Boolean) as Producto[];

      setProductosFrecuentes(sortedProductos);
    } catch (error) {
      console.error("Error fetching frequent products:", error);
      setProductosFrecuentes([]);
    } finally {
      setLoadingFrecuentes(false);
    }
  };

  const fechasDisponibles = () => {
    const fechas: string[] = [];
    let date = addDays(new Date(), 1);
    while (fechas.length < 7) {
      if (!isWeekend(date) || date.getDay() === 6) {
        fechas.push(format(date, "yyyy-MM-dd"));
      }
      date = addDays(date, 1);
    }
    return fechas;
  };

  // Filter products excluding frequent ones to avoid duplicates
  const productosFiltrados = productos
    .filter(p =>
      p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.codigo.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter(p => !productosFrecuentes.some(f => f.id === p.id));

  const agregarProducto = (producto: Producto) => {
    const existe = lineas.find(l => l.producto.id === producto.id);
    if (existe) {
      actualizarCantidad(producto.id, existe.cantidad + 1);
      return;
    }

    // Warning for out of stock products
    if (producto.stock_actual <= 0) {
      toast.warning("Producto sin stock disponible", {
        description: "Se agregó al pedido. Se surtirá cuando haya disponibilidad.",
        duration: 4000,
      });
    }

    const precio = obtenerPrecioUnitarioVenta({
      precio_venta: producto.precio_venta,
      precio_por_kilo: producto.precio_por_kilo,
      presentacion: producto.presentacion
    });

    setLineas([...lineas, {
      producto,
      cantidad: 1,
      precioLista: precio,
      precioUnitario: precio,
      descuento: 0,
      subtotal: precio,
      requiereAutorizacion: false,
    }]);
    setSearchTerm("");
  };

  const actualizarCantidad = (productoId: string, cantidad: number) => {
    if (cantidad <= 0) {
      setLineas(lineas.filter(l => l.producto.id !== productoId));
      return;
    }

    setLineas(lineas.map(l => 
      l.producto.id === productoId 
        ? { ...l, cantidad, subtotal: l.precioUnitario * cantidad }
        : l
    ));
  };

  const actualizarDescuento = (productoId: string, descuento: number) => {
    setLineas(lineas.map(l => {
      if (l.producto.id !== productoId) return l;
      
      const descuentoMaximo = l.producto.descuento_maximo || 0;
      const nuevoPrecio = l.precioLista - descuento;
      const requiereAutorizacion = descuento > descuentoMaximo;
      
      return {
        ...l,
        descuento,
        precioUnitario: nuevoPrecio,
        subtotal: nuevoPrecio * l.cantidad,
        requiereAutorizacion,
        // Clear authorization if descuento is now within limits
        autorizacionStatus: requiereAutorizacion ? l.autorizacionStatus : null,
        solicitudId: requiereAutorizacion ? l.solicitudId : undefined,
      };
    }));
  };

  const handleSolicitarAutorizacion = (linea: LineaPedido) => {
    setProductoParaSolicitud({
      id: linea.producto.id,
      codigo: linea.producto.codigo,
      nombre: linea.producto.nombre,
      precioLista: linea.precioLista,
      descuentoMaximo: linea.producto.descuento_maximo || 0,
      precioSolicitado: linea.precioUnitario,
      cantidad: linea.cantidad,
    });
    setSolicitudDialogOpen(true);
  };

  const handleAutorizacionAprobada = (productoId: string, precioAprobado: number) => {
    setLineas(lineas.map(l => {
      if (l.producto.id !== productoId) return l;
      return {
        ...l,
        precioUnitario: precioAprobado,
        descuento: l.precioLista - precioAprobado,
        subtotal: precioAprobado * l.cantidad,
        requiereAutorizacion: false,
        autorizacionStatus: 'aprobado',
      };
    }));
  };

  const marcarParaRevision = (productoId: string) => {
    setLineas(lineas.map(l => {
      if (l.producto.id !== productoId) return l;
      return {
        ...l,
        autorizacionStatus: 'pendiente',
      };
    }));
    toast.info("Producto marcado para revisión de precio", {
      description: "El administrador revisará este descuento al autorizar el pedido",
    });
  };

  const calcularTotales = () => {
    let subtotalNeto = 0;
    let totalIva = 0;
    let totalIeps = 0;

    lineas.forEach((l) => {
      const resultado = calcularDesgloseImpuestos({
        precio_con_impuestos: l.subtotal,
        aplica_iva: l.producto.aplica_iva,
        aplica_ieps: l.producto.aplica_ieps,
        nombre_producto: l.producto.nombre
      });
      subtotalNeto += resultado.base;
      totalIva += resultado.iva;
      totalIeps += resultado.ieps;
    });

    return { 
      subtotal: redondear(subtotalNeto), 
      impuestos: redondear(totalIva + totalIeps), 
      total: redondear(subtotalNeto + totalIva + totalIeps)
    };
  };

  const handleSubmit = async () => {
    if (!selectedClienteId) {
      toast.error("Selecciona un cliente");
      return;
    }

    if (sucursales.length > 0 && !selectedSucursalId) {
      toast.error("Selecciona una sucursal");
      return;
    }

    if (lineas.length === 0) {
      toast.error("Agrega al menos un producto");
      return;
    }

    if (!fechaEntrega) {
      toast.error("Selecciona fecha de entrega");
      return;
    }

    // Check for unauthorized discounts
    const productosConDescuentoNoAutorizado = lineas.filter(
      l => l.requiereAutorizacion && l.autorizacionStatus !== 'aprobado' && l.autorizacionStatus !== 'pendiente'
    );

    if (productosConDescuentoNoAutorizado.length > 0) {
      toast.error("Hay productos con descuentos no autorizados", {
        description: "Solicita autorización o marca para revisión",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      const totales = calcularTotales();
      const timestamp = Date.now().toString().slice(-6);
      const folio = `PED-V-${timestamp}`;

      const { data: pedido, error: pedidoError } = await supabase
        .from("pedidos")
        .insert({
          folio,
          cliente_id: selectedClienteId,
          vendedor_id: user.id,
          sucursal_id: selectedSucursalId || null,
          fecha_pedido: new Date().toISOString(),
          fecha_entrega_estimada: fechaEntrega,
          subtotal: totales.subtotal,
          impuestos: totales.impuestos,
          total: totales.total,
          status: "por_autorizar",
          notas: notas || null,
          termino_credito: terminoCredito as any
        })
        .select()
        .single();

      if (pedidoError) throw pedidoError;

      const detallesInsert = lineas.map(l => ({
        pedido_id: pedido.id,
        producto_id: l.producto.id,
        cantidad: l.cantidad,
        precio_unitario: l.precioUnitario,
        subtotal: l.subtotal,
        // Store discount info for admin review
        notas: l.descuento > 0 
          ? `Descuento: ${formatCurrency(l.descuento)} (máx: ${formatCurrency(l.producto.descuento_maximo || 0)})${l.autorizacionStatus === 'pendiente' ? ' [PENDIENTE REVISIÓN]' : l.autorizacionStatus === 'aprobado' ? ' [APROBADO]' : ''}`
          : null
      }));

      const { error: detallesError } = await supabase
        .from("pedidos_detalles")
        .insert(detallesInsert);

      if (detallesError) throw detallesError;

      // Get vendedor name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      
      const vendedorNombre = profile?.full_name || "Vendedor";
      const clienteNombre = selectedCliente?.nombre || "Cliente";

      // Create internal notification for secretaries
      try {
        await supabase.from("notificaciones").insert({
          tipo: "nuevo_pedido_vendedor",
          titulo: `Nuevo pedido ${folio}`,
          descripcion: `${vendedorNombre} creó pedido para ${clienteNombre} - ${formatCurrency(totales.total)}`,
          pedido_id: pedido.id,
          leida: false,
        });
      } catch (notifError) {
        console.error("Error creating notification:", notifError);
      }

      // Send push notification to secretaries
      try {
        await supabase.functions.invoke('send-push-notification', {
          body: {
            roles: ['Secretaria'],
            title: '📦 Nuevo Pedido',
            body: `${vendedorNombre} → ${clienteNombre} - ${formatCurrency(totales.total)}`,
            data: {
              type: 'nuevo_pedido',
              pedido_id: pedido.id,
              folio: folio,
            }
          }
        });
      } catch (pushError) {
        console.error("Error sending push to secretarias:", pushError);
      }

      // Send email notification to secretaries
      try {
        await supabase.functions.invoke('send-secretary-notification', {
          body: {
            tipo: 'nuevo_pedido',
            pedidoId: pedido.id,
            folio: folio,
            vendedor: vendedorNombre,
            cliente: clienteNombre,
            total: totales.total,
            requiereFactura: selectedCliente?.termino_credito !== 'contado'
          }
        });
      } catch (emailError) {
        console.error("Error sending email to secretarias:", emailError);
      }

      toast.success(`Pedido ${folio} creado exitosamente`);

      // Reset form
      setSelectedClienteId("");
      setSelectedSucursalId("");
      setLineas([]);
      setFechaEntrega("");
      setTerminoCredito("contado");
      setNotas("");

      onPedidoCreado();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Error al crear pedido");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const totales = calcularTotales();
  const selectedCliente = clientes.find(c => c.id === selectedClienteId);
  const tieneDescuentosPendientes = lineas.some(
    l => l.requiereAutorizacion && l.autorizacionStatus !== 'aprobado'
  );

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Client Selection - Larger */}
        <div className="space-y-2">
          <Label className="text-base flex items-center gap-2">
            <Store className="h-4 w-4" />
            Cliente *
          </Label>
          <Select value={selectedClienteId} onValueChange={setSelectedClienteId}>
            <SelectTrigger className="h-14 text-lg">
              <SelectValue placeholder="Seleccionar cliente" />
            </SelectTrigger>
            <SelectContent>
              {clientes.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  No tienes clientes asignados
                </div>
              ) : (
                clientes.map((cliente) => (
                  <SelectItem key={cliente.id} value={cliente.id} className="text-base py-3">
                    <div className="flex items-center justify-between w-full gap-4">
                      <span>{cliente.nombre}</span>
                      <Badge variant="outline" className="text-xs">
                        {cliente.termino_credito === 'contado' ? 'Contado' : cliente.termino_credito.replace('_', ' ')}
                      </Badge>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {selectedCliente && (
            <p className="text-sm text-muted-foreground">
              Crédito: {selectedCliente.termino_credito === 'contado' ? 'Contado' : selectedCliente.termino_credito.replace('_', ' ')}
            </p>
          )}
        </div>

        {/* Branch Selection - Larger */}
        {sucursales.length > 0 && (
          <div className="space-y-2">
            <Label className="text-base">Sucursal de entrega *</Label>
            <Select value={selectedSucursalId} onValueChange={setSelectedSucursalId}>
              <SelectTrigger className="h-14 text-lg">
                <SelectValue placeholder="Seleccionar sucursal" />
              </SelectTrigger>
              <SelectContent>
                {sucursales.map((sucursal) => (
                  <SelectItem key={sucursal.id} value={sucursal.id} className="text-base py-3">
                    <div>
                      <span className="font-medium">{sucursal.nombre}</span>
                      {sucursal.direccion && (
                        <span className="text-muted-foreground"> - {sucursal.direccion}</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Frequent Products Section */}
        {selectedClienteId && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-500" />
                Productos Frecuentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingFrecuentes ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[1, 2, 3, 4].map(i => (
                    <Skeleton key={i} className="h-24" />
                  ))}
                </div>
              ) : productosFrecuentes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Sin historial de pedidos para este cliente
                </p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {productosFrecuentes.map((producto) => {
                    const yaEnCarrito = lineas.some(l => l.producto.id === producto.id);
                    return (
                      <div
                        key={producto.id}
                        className={`p-3 rounded-lg border transition-all cursor-pointer ${
                          yaEnCarrito 
                            ? 'bg-primary/10 border-primary' 
                            : 'hover:bg-muted hover:border-primary/50'
                        } ${producto.stock_actual <= 0 ? 'opacity-75' : ''}`}
                        onClick={() => !yaEnCarrito && agregarProducto(producto)}
                      >
                        <p className="font-medium text-sm truncate mb-1">{producto.nombre}</p>
                        <p className="text-lg font-bold text-primary mb-2">
                          {formatCurrency(producto.precio_venta)}
                        </p>
                        <div className="flex items-center justify-between">
                          <StockBadge producto={producto} />
                          {yaEnCarrito && (
                            <Badge variant="default" className="text-xs">
                              ✓
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Product Search - All Products - Always Visible Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5" />
              Todos los Productos
              <Badge variant="outline" className="ml-2 text-xs">
                {productosFiltrados.length} productos
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Filtrar productos por nombre o código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12"
              />
            </div>

            {/* Always Visible Product Table with Direct Quantity Input */}
            <ScrollArea className="h-[500px] border rounded-lg">
              <div className="p-2 space-y-1">
                {productosFiltrados.map((producto) => {
                  const lineaEnCarrito = lineas.find(l => l.producto.id === producto.id);
                  const cantidadEnCarrito = lineaEnCarrito?.cantidad || 0;
                  
                  return (
                    <div
                      key={producto.id}
                      className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                        cantidadEnCarrito > 0 
                          ? 'bg-primary/10 border border-primary' 
                          : 'hover:bg-muted border border-transparent'
                      } ${producto.stock_actual <= 0 ? 'opacity-75' : ''}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{producto.nombre}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-muted-foreground">{producto.codigo}</p>
                          <StockBadge producto={producto} />
                        </div>
                      </div>

                      {/* Columna: Presentación */}
                      <div className="w-24 text-center hidden sm:block">
                        <p className="text-xs text-muted-foreground truncate">
                          {producto.presentacion || producto.unidad || '-'}
                        </p>
                      </div>

                      {/* Columna: Peso */}
                      <div className="w-16 text-center hidden sm:block">
                        <p className="text-xs text-muted-foreground">
                          {producto.kg_por_unidad ? `${producto.kg_por_unidad} kg` : '-'}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-3 ml-2">
                        <div className="text-right">
                          <p className="font-bold text-sm">{formatCurrency(producto.precio_venta)}</p>
                          {(producto.descuento_maximo || 0) > 0 && (
                            <p className="text-xs text-muted-foreground">
                              -{formatCurrency(producto.descuento_maximo)} máx
                            </p>
                          )}
                        </div>
                        
                        {/* Direct Quantity Input */}
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() => {
                              if (cantidadEnCarrito > 0) {
                                actualizarCantidad(producto.id, cantidadEnCarrito - 1);
                              }
                            }}
                            disabled={cantidadEnCarrito <= 0}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            type="number"
                            min="0"
                            className="h-8 w-16 text-center text-sm font-medium"
                            value={cantidadEnCarrito || ""}
                            placeholder="0"
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              if (val > 0 && cantidadEnCarrito === 0) {
                                // Add new product to cart
                                agregarProducto(producto);
                                if (val > 1) {
                                  setTimeout(() => actualizarCantidad(producto.id, val), 0);
                                }
                              } else if (val === 0 && cantidadEnCarrito > 0) {
                                actualizarCantidad(producto.id, 0);
                              } else if (val > 0) {
                                actualizarCantidad(producto.id, val);
                              }
                            }}
                          />
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() => {
                              if (cantidadEnCarrito === 0) {
                                agregarProducto(producto);
                              } else {
                                actualizarCantidad(producto.id, cantidadEnCarrito + 1);
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
                {productosFiltrados.length > 50 && (
                  <p className="text-center text-muted-foreground py-2 text-sm border-t mt-2 pt-2">
                    Mostrando 50 de {productosFiltrados.length} productos. Usa el filtro para encontrar más.
                  </p>
                )}
              </div>
            </ScrollArea>

            {/* Cart with Discount Control */}
            {lineas.length > 0 && (
              <div className="space-y-3 pt-4 border-t">
                <h4 className="font-medium text-base flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Productos en el pedido ({lineas.length})
                </h4>
                {lineas.map((linea) => {
                  const descuentoMaximo = linea.producto.descuento_maximo || 0;
                  const excedeLimite = linea.descuento > descuentoMaximo;
                  const tieneDescuento = linea.descuento > 0;
                  
                  return (
                    <div 
                      key={linea.producto.id} 
                      className={`p-4 rounded-lg border ${
                        excedeLimite && linea.autorizacionStatus !== 'aprobado' 
                          ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700' 
                          : 'bg-muted/50'
                      }`}
                    >
                      {/* Product header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{linea.producto.nombre}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-muted-foreground">{linea.producto.codigo}</p>
                            <StockBadge producto={linea.producto} />
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                          onClick={() => actualizarCantidad(linea.producto.id, 0)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Price and discount row */}
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        {/* Discount control */}
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground flex items-center gap-1">
                            <Percent className="h-3 w-3" />
                            Descuento (máx: {formatCurrency(descuentoMaximo)})
                          </Label>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              onClick={() => actualizarDescuento(linea.producto.id, Math.max(0, linea.descuento - 5))}
                              disabled={linea.descuento <= 0}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              type="number"
                              className="h-8 w-20 text-center text-sm"
                              value={linea.descuento}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                actualizarDescuento(linea.producto.id, Math.max(0, val));
                              }}
                            />
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              onClick={() => actualizarDescuento(linea.producto.id, linea.descuento + 5)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        {/* Price display */}
                        <div className="space-y-1 text-right">
                          <Label className="text-xs text-muted-foreground">Precio</Label>
                          <div>
                            {tieneDescuento && (
                              <span className="text-xs line-through text-muted-foreground mr-2">
                                {formatCurrency(linea.precioLista)}
                              </span>
                            )}
                            <span className={`font-bold ${tieneDescuento ? 'text-green-600' : ''}`}>
                              {formatCurrency(linea.precioUnitario)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Quantity and subtotal row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() => actualizarCantidad(linea.producto.id, linea.cantidad - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            className="w-14 h-8 text-center text-sm font-medium"
                            value={linea.cantidad}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              actualizarCantidad(linea.producto.id, val);
                            }}
                          />
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() => actualizarCantidad(linea.producto.id, linea.cantidad + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="font-bold text-lg">
                          {formatCurrency(linea.subtotal)}
                        </p>
                      </div>

                      {/* Authorization warning */}
                      {excedeLimite && linea.autorizacionStatus !== 'aprobado' && (
                        <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-700">
                          <div className="flex items-start gap-2 mb-2">
                            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                            <div className="text-sm">
                              <p className="font-medium text-amber-700 dark:text-amber-400">
                                Descuento excede el límite
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Excedente: {formatCurrency(linea.descuento - descuentoMaximo)}
                              </p>
                            </div>
                          </div>
                          
                          {linea.autorizacionStatus === 'pendiente' ? (
                            <Badge variant="outline" className="w-full justify-center py-1">
                              <Clock className="h-3 w-3 mr-1" />
                              Pendiente revisión de admin
                            </Badge>
                          ) : (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                className="flex-1"
                                onClick={() => handleSolicitarAutorizacion(linea)}
                              >
                                <Send className="h-3 w-3 mr-1" />
                                Solicitar ahora
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1"
                                onClick={() => marcarParaRevision(linea.producto.id)}
                              >
                                <Clock className="h-3 w-3 mr-1" />
                                Dejar pendiente
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Approved badge */}
                      {linea.autorizacionStatus === 'aprobado' && (
                        <Badge variant="default" className="mt-2 w-full justify-center bg-green-600">
                          <Lock className="h-3 w-3 mr-1" />
                          Descuento autorizado
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delivery Date - Larger */}
        <div className="space-y-2">
          <Label className="text-base">Fecha de entrega *</Label>
          <Select value={fechaEntrega} onValueChange={setFechaEntrega}>
            <SelectTrigger className="h-14 text-lg">
              <SelectValue placeholder="Seleccionar fecha" />
            </SelectTrigger>
            <SelectContent>
              {fechasDisponibles().map((fecha) => (
                <SelectItem key={fecha} value={fecha} className="text-base py-3">
                  {format(new Date(fecha + 'T12:00:00'), "EEEE d 'de' MMMM", { locale: es })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Credit Term Selector */}
        <div className="space-y-2">
          <Label className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Término de crédito
          </Label>
          <Select value={terminoCredito} onValueChange={setTerminoCredito}>
            <SelectTrigger className="h-14 text-lg">
              <SelectValue placeholder="Seleccionar término" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="contado" className="text-base py-3">Contado</SelectItem>
              <SelectItem value="8_dias" className="text-base py-3">8 días</SelectItem>
              <SelectItem value="15_dias" className="text-base py-3">15 días</SelectItem>
              <SelectItem value="30_dias" className="text-base py-3">30 días</SelectItem>
              <SelectItem value="60_dias" className="text-base py-3">60 días</SelectItem>
            </SelectContent>
          </Select>
          {selectedCliente && selectedCliente.termino_credito !== terminoCredito && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
              Default del cliente: {selectedCliente.termino_credito === 'contado' ? 'Contado' : selectedCliente.termino_credito.replace('_', ' ')}
            </p>
          )}
        </div>

        {/* Notes - Larger */}
        <div className="space-y-2">
          <Label className="text-base">Notas del pedido</Label>
          <Textarea
            placeholder="Instrucciones especiales de entrega, horarios, etc."
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={3}
            className="text-base resize-none"
          />
        </div>

        {/* Totals and Submit - Larger */}
        {lineas.length > 0 && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="space-y-2 text-base mb-6">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(totales.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Impuestos:</span>
                  <span className="font-medium">{formatCurrency(totales.impuestos)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold pt-3 border-t">
                  <span>Total:</span>
                  <span className="text-primary">{formatCurrency(totales.total)}</span>
                </div>
              </div>

              {tieneDescuentosPendientes && (
                <div className="mb-4 p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-sm text-amber-700 dark:text-amber-400 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    Hay productos con descuentos pendientes de autorización. Serán revisados por el administrador.
                  </span>
                </div>
              )}

              <Button 
                onClick={handleSubmit} 
                disabled={submitting} 
                className="w-full h-14 text-lg font-semibold"
                size="lg"
              >
                {submitting && <Loader2 className="h-5 w-5 mr-2 animate-spin" />}
                Crear Pedido
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Solicitud Dialog */}
        <SolicitudDescuentoDialog
          open={solicitudDialogOpen}
          onOpenChange={setSolicitudDialogOpen}
          producto={productoParaSolicitud}
          clienteId={selectedClienteId}
          clienteNombre={selectedCliente?.nombre || ""}
          sucursalId={selectedSucursalId || null}
          onAprobado={handleAutorizacionAprobada}
          onCancelar={() => setProductoParaSolicitud(null)}
        />
      </div>
    </TooltipProvider>
  );
}
