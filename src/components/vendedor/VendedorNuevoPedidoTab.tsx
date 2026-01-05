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
import { Search, Plus, Minus, ShoppingCart, Trash2, Loader2, Package, Store } from "lucide-react";
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
  aplica_iva: boolean;
  aplica_ieps: boolean;
  kg_por_unidad: number | null;
  precio_por_kilo: boolean;
  presentacion: string | null;
}

interface LineaPedido {
  producto: Producto;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export function VendedorNuevoPedidoTab({ onPedidoCreado }: Props) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [selectedClienteId, setSelectedClienteId] = useState("");
  const [selectedSucursalId, setSelectedSucursalId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [lineas, setLineas] = useState<LineaPedido[]>([]);
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [notas, setNotas] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedClienteId) {
      fetchSucursales(selectedClienteId);
    } else {
      setSucursales([]);
      setSelectedSucursalId("");
    }
  }, [selectedClienteId]);

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

      // Fetch products
      const { data: productosData } = await supabase
        .from("productos")
        .select("id, codigo, nombre, unidad, precio_venta, stock_actual, aplica_iva, aplica_ieps, kg_por_unidad, precio_por_kilo, presentacion")
        .eq("activo", true)
        .gt("stock_actual", 0)
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

  const productosFiltrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.codigo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const agregarProducto = (producto: Producto) => {
    const existe = lineas.find(l => l.producto.id === producto.id);
    if (existe) {
      actualizarCantidad(producto.id, existe.cantidad + 1);
      return;
    }

    const precio = obtenerPrecioUnitarioVenta({
      precio_venta: producto.precio_venta,
      precio_por_kilo: producto.precio_por_kilo,
      presentacion: producto.presentacion
    });

    setLineas([...lineas, {
      producto,
      cantidad: 1,
      precioUnitario: precio,
      subtotal: precio
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
          notas: notas || null
        })
        .select()
        .single();

      if (pedidoError) throw pedidoError;

      const detallesInsert = lineas.map(l => ({
        pedido_id: pedido.id,
        producto_id: l.producto.id,
        cantidad: l.cantidad,
        precio_unitario: l.precioUnitario,
        subtotal: l.subtotal
      }));

      const { error: detallesError } = await supabase
        .from("pedidos_detalles")
        .insert(detallesInsert);

      if (detallesError) throw detallesError;

      toast.success(`Pedido ${folio} creado exitosamente`);

      // Reset form
      setSelectedClienteId("");
      setSelectedSucursalId("");
      setLineas([]);
      setFechaEntrega("");
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

  return (
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

      {/* Product Search - Larger */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5" />
            Productos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Buscar producto por nombre o código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-14 text-lg"
            />
          </div>

          {/* Search Results */}
          {searchTerm && (
            <ScrollArea className="h-48 border rounded-lg">
              <div className="p-2 space-y-1">
                {productosFiltrados.slice(0, 10).map((producto) => (
                  <div
                    key={producto.id}
                    className="flex items-center justify-between p-4 hover:bg-muted rounded-lg cursor-pointer transition-colors"
                    onClick={() => agregarProducto(producto)}
                  >
                    <div>
                      <p className="font-medium text-base">{producto.nombre}</p>
                      <p className="text-sm text-muted-foreground">{producto.codigo}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{formatCurrency(producto.precio_venta)}</p>
                      <p className="text-sm text-muted-foreground">{producto.stock_actual} disponibles</p>
                    </div>
                  </div>
                ))}
                {productosFiltrados.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">No se encontraron productos</p>
                )}
              </div>
            </ScrollArea>
          )}

          {/* Cart - Larger Items */}
          {lineas.length > 0 && (
            <div className="space-y-3 pt-4 border-t">
              <h4 className="font-medium text-base flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Productos en el pedido ({lineas.length})
              </h4>
              {lineas.map((linea) => (
                <div key={linea.producto.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{linea.producto.nombre}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(linea.precioUnitario)} × {linea.cantidad}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-10 w-10"
                      onClick={() => actualizarCantidad(linea.producto.id, linea.cantidad - 1)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      className="w-16 h-10 text-center text-lg font-medium"
                      value={linea.cantidad}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        actualizarCantidad(linea.producto.id, val);
                      }}
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-10 w-10"
                      onClick={() => actualizarCantidad(linea.producto.id, linea.cantidad + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="font-bold text-lg w-24 text-right">
                    {formatCurrency(linea.subtotal)}
                  </p>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-10 w-10 text-destructive hover:text-destructive"
                    onClick={() => actualizarCantidad(linea.producto.id, 0)}
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              ))}
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
    </div>
  );
}
