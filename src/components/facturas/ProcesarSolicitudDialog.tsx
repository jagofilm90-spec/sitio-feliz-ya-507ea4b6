import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SolicitudVenta, useSolicitudesVenta } from "@/hooks/useSolicitudesVenta";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Package, Plus, Minus, Loader2, FileText, 
  Search, X, AlertCircle, CheckCircle2
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ProcesarSolicitudDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  solicitud: SolicitudVenta | null;
  onSuccess: () => void;
}

interface ProductoLista {
  producto_id: string;
  nombre: string;
  codigo?: string;
  cantidad: number;
  precio_unitario: number;
}

interface Cliente {
  id: string;
  codigo: string;
  nombre: string;
  rfc: string | null;
}

export const ProcesarSolicitudDialog = ({
  open,
  onOpenChange,
  solicitud,
  onSuccess
}: ProcesarSolicitudDialogProps) => {
  const [productos, setProductos] = useState<ProductoLista[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteId, setClienteId] = useState<string>("");
  const [searchCliente, setSearchCliente] = useState("");
  const [searchProducto, setSearchProducto] = useState("");
  const [productosDisponibles, setProductosDisponibles] = useState<any[]>([]);
  const [usoCfdi, setUsoCfdi] = useState("G03");
  const [metodoPago, setMetodoPago] = useState("PUE");
  const [formaPago, setFormaPago] = useState("01");
  const [procesando, setProcesando] = useState(false);
  const [empleadoId, setEmpleadoId] = useState<string | null>(null);
  const { toast } = useToast();
  const { vincularFactura, actualizarStatus } = useSolicitudesVenta();

  // Load initial data
  useEffect(() => {
    if (open && solicitud) {
      // Set products from solicitud
      setProductos(solicitud.productos_solicitados.map(p => ({
        producto_id: p.producto_id,
        nombre: p.nombre,
        cantidad: p.cantidad,
        precio_unitario: p.precio_unitario || 0
      })));

      // Mark as processing
      actualizarStatus(solicitud.id, 'procesando');

      // Load clientes
      loadClientes();
      
      // Load productos for search
      loadProductos();

      // Get current employee
      loadEmpleado();
    }
  }, [open, solicitud]);

  const loadClientes = async () => {
    const { data } = await supabase
      .from("clientes")
      .select("id, codigo, nombre, rfc")
      .eq("activo", true)
      .order("nombre");
    setClientes(data || []);
  };

  const loadProductos = async () => {
    const { data } = await supabase
      .from("productos")
      .select("id, codigo, nombre, precio_venta")
      .eq("activo", true)
      .order("nombre");
    setProductosDisponibles(data || []);
  };

  const loadEmpleado = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: empleado } = await supabase
        .from("empleados")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (empleado) {
        setEmpleadoId(empleado.id);
      }
    }
  };

  // Filter clientes
  const filteredClientes = clientes.filter(c =>
    c.nombre.toLowerCase().includes(searchCliente.toLowerCase()) ||
    c.codigo.toLowerCase().includes(searchCliente.toLowerCase())
  );

  // Filter productos for adding
  const filteredProductos = productosDisponibles.filter(p =>
    p.codigo.toLowerCase().includes(searchProducto.toLowerCase()) ||
    p.nombre.toLowerCase().includes(searchProducto.toLowerCase())
  );

  // Update quantity
  const actualizarCantidad = (index: number, delta: number) => {
    setProductos(productos.map((p, i) => {
      if (i === index) {
        const nuevaCantidad = p.cantidad + delta;
        return nuevaCantidad > 0 ? { ...p, cantidad: nuevaCantidad } : p;
      }
      return p;
    }));
  };

  // Update price
  const actualizarPrecio = (index: number, precio: number) => {
    setProductos(productos.map((p, i) => 
      i === index ? { ...p, precio_unitario: precio } : p
    ));
  };

  // Remove product
  const quitarProducto = (index: number) => {
    setProductos(productos.filter((_, i) => i !== index));
  };

  // Add product
  const agregarProducto = (producto: any) => {
    const existing = productos.findIndex(p => p.producto_id === producto.id);
    if (existing >= 0) {
      actualizarCantidad(existing, 1);
    } else {
      setProductos([...productos, {
        producto_id: producto.id,
        nombre: `${producto.codigo} - ${producto.nombre}`,
        codigo: producto.codigo,
        cantidad: 1,
        precio_unitario: producto.precio_venta || 0
      }]);
    }
    setSearchProducto("");
  };

  // Calculate total
  const subtotal = productos.reduce((sum, p) => sum + (p.cantidad * p.precio_unitario), 0);
  const iva = subtotal * 0.16;
  const total = subtotal + iva;

  // Process and create factura
  const handleProcesar = async () => {
    if (!solicitud) return;
    
    if (!clienteId) {
      toast({
        title: "Cliente requerido",
        description: "Selecciona un cliente para la factura",
        variant: "destructive"
      });
      return;
    }

    if (productos.length === 0) {
      toast({
        title: "Sin productos",
        description: "Agrega al menos un producto",
        variant: "destructive"
      });
      return;
    }

    setProcesando(true);
    try {
      // Generate folio
      const folioNum = Date.now().toString().slice(-6);
      const folio = `FAC-${format(new Date(), 'yyyyMM')}-${folioNum}`;

      // Create factura
      const { data: factura, error: facturaError } = await supabase
        .from("facturas")
        .insert({
          folio,
          cliente_id: clienteId,
          subtotal,
          impuestos: iva,
          total,
          uso_cfdi: usoCfdi,
          metodo_pago: metodoPago,
          forma_pago: formaPago,
          notas: `Venta mostrador - Solicitud ${solicitud.folio}`
        })
        .select()
        .single();

      if (facturaError) throw facturaError;

      // Create factura_detalles
      const detalles = productos.map(p => ({
        factura_id: factura.id,
        producto_id: p.producto_id,
        cantidad: p.cantidad,
        precio_unitario: p.precio_unitario,
        subtotal: p.cantidad * p.precio_unitario
      }));

      const { error: detallesError } = await supabase
        .from("factura_detalles")
        .insert(detalles);

      if (detallesError) throw detallesError;

      // Link factura to solicitud
      await vincularFactura(solicitud.id, factura.id, total, empleadoId);

      toast({
        title: "Factura creada",
        description: `Folio: ${folio}. Total: $${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
      });

      // Optionally timbrar immediately
      try {
        const { data: timbradoData, error: timbradoError } = await supabase.functions.invoke('timbrar-cfdi', {
          body: { factura_id: factura.id }
        });

        if (timbradoError) {
          console.error("Error timbrado:", timbradoError);
          toast({
            title: "Factura creada sin timbrar",
            description: "La factura se creó pero no se pudo timbrar automáticamente",
            variant: "destructive"
          });
        } else if (timbradoData?.success) {
          toast({
            title: "CFDI Timbrado",
            description: `UUID: ${timbradoData.uuid}`,
          });
        }
      } catch (timbradoErr) {
        console.error("Error en timbrado:", timbradoErr);
      }

      onSuccess();
    } catch (error: any) {
      console.error("Error procesando:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la factura",
        variant: "destructive"
      });
    } finally {
      setProcesando(false);
    }
  };

  if (!solicitud) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Procesar Solicitud {solicitud.folio}
          </DialogTitle>
          <DialogDescription>
            {format(new Date(solicitud.fecha_solicitud), "dd/MM/yyyy HH:mm", { locale: es })}
            {solicitud.solicitante && ` • Solicitó: ${solicitud.solicitante.nombre_completo}`}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 py-4">
            {/* Cliente selection */}
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cliente por nombre o código..."
                  value={searchCliente}
                  onChange={(e) => setSearchCliente(e.target.value)}
                  className="pl-10"
                />
              </div>
              {searchCliente && (
                <div className="border rounded-lg max-h-40 overflow-auto">
                  {filteredClientes.slice(0, 10).map(cliente => (
                    <div
                      key={cliente.id}
                      className={`p-2 hover:bg-muted cursor-pointer flex justify-between ${
                        clienteId === cliente.id ? 'bg-primary/10' : ''
                      }`}
                      onClick={() => {
                        setClienteId(cliente.id);
                        setSearchCliente("");
                      }}
                    >
                      <span>{cliente.codigo} - {cliente.nombre}</span>
                      <span className="text-muted-foreground font-mono text-sm">
                        {cliente.rfc || 'Sin RFC'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {clienteId && (
                <Badge variant="secondary" className="mt-1">
                  {clientes.find(c => c.id === clienteId)?.nombre}
                  <X 
                    className="w-3 h-3 ml-1 cursor-pointer" 
                    onClick={() => setClienteId("")}
                  />
                </Badge>
              )}
            </div>

            {/* CFDI Options */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Uso CFDI</Label>
                <Select value={usoCfdi} onValueChange={setUsoCfdi}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="G01">G01 - Adquisición de mercancías</SelectItem>
                    <SelectItem value="G03">G03 - Gastos en general</SelectItem>
                    <SelectItem value="P01">P01 - Por definir</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Método de Pago</Label>
                <Select value={metodoPago} onValueChange={setMetodoPago}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PUE">PUE - Pago en una sola exhibición</SelectItem>
                    <SelectItem value="PPD">PPD - Pago en parcialidades</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Forma de Pago</Label>
                <Select value={formaPago} onValueChange={setFormaPago}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="01">01 - Efectivo</SelectItem>
                    <SelectItem value="03">03 - Transferencia</SelectItem>
                    <SelectItem value="04">04 - Tarjeta de crédito</SelectItem>
                    <SelectItem value="28">28 - Tarjeta de débito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Products */}
            <div className="space-y-2">
              <Label>Productos</Label>
              
              {/* Add product search */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Agregar producto..."
                  value={searchProducto}
                  onChange={(e) => setSearchProducto(e.target.value)}
                  className="pl-10"
                />
              </div>
              {searchProducto && (
                <div className="border rounded-lg max-h-32 overflow-auto">
                  {filteredProductos.slice(0, 8).map(producto => (
                    <div
                      key={producto.id}
                      className="p-2 hover:bg-muted cursor-pointer flex justify-between"
                      onClick={() => agregarProducto(producto)}
                    >
                      <span>{producto.codigo} - {producto.nombre}</span>
                      <span className="font-medium">${(producto.precio_venta || 0).toLocaleString('es-MX')}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Products list */}
              <div className="border rounded-lg divide-y">
                {productos.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    Sin productos
                  </div>
                ) : (
                  productos.map((producto, index) => (
                    <div key={index} className="p-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{producto.nombre}</p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => actualizarCantidad(index, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center font-medium">{producto.cantidad}</span>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => actualizarCantidad(index, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>

                      <div className="w-24">
                        <Input
                          type="number"
                          value={producto.precio_unitario}
                          onChange={(e) => actualizarPrecio(index, parseFloat(e.target.value) || 0)}
                          className="h-8 text-right"
                        />
                      </div>

                      <div className="w-24 text-right font-medium">
                        ${(producto.cantidad * producto.precio_unitario).toLocaleString('es-MX')}
                      </div>

                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive"
                        onClick={() => quitarProducto(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Totals */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span>IVA (16%):</span>
                <span>${iva.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-xl font-bold border-t pt-2">
                <span>Total:</span>
                <span>${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleProcesar}
            disabled={procesando || !clienteId || productos.length === 0}
          >
            {procesando ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Procesando...</>
            ) : (
              <><FileText className="w-4 h-4 mr-2" /> Crear Factura y Timbrar</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
