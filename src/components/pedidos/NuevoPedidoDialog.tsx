import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Search, ShoppingCart, Building2, AlertTriangle, Gift } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { calcularSubtotal, calcularDesgloseImpuestos, validarAntesDeGuardar, redondear, LineaPedido, obtenerPrecioUnitarioVenta } from "@/lib/calculos";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getDisplayName } from "@/lib/productUtils";
import { useIsMobile } from "@/hooks/use-mobile";

interface NuevoPedidoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPedidoCreated: () => void;
}

interface Cliente {
  id: string;
  codigo: string;
  nombre: string;
  preferencia_facturacion: string;
}

interface Sucursal {
  id: string;
  nombre: string;
  direccion: string;
  rfc: string | null;
  razon_social: string | null;
}

interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  especificaciones: string | null;
  marca: string | null;
  contenido_empaque: string | null;
  precio_venta: number;
  unidad: string;
  aplica_iva: boolean;
  aplica_ieps: boolean;
  stock_actual: number;
  precio_por_kilo: boolean;
  peso_kg: number | null;
}

interface DetallePedido {
  producto_id: string;
  producto: Producto;
  cantidad: number;
  kilos_totales: number | null; // cantidad × peso_kg para productos precio_por_kilo
  precio_unitario: number; // precio por kg si precio_por_kilo, sino precio por unidad
  subtotal: number;
  es_cortesia: boolean;
}

interface CortesiaDefault {
  id: string;
  producto_id: string;
  cantidad: number;
  notas: string | null;
  producto: Producto;
}

const NuevoPedidoDialog = ({ open, onOpenChange, onPedidoCreated }: NuevoPedidoDialogProps) => {
  const isMobile = useIsMobile();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [selectedClienteId, setSelectedClienteId] = useState<string>("");
  const [selectedSucursalId, setSelectedSucursalId] = useState<string>("");
  const [requiereFactura, setRequiereFactura] = useState(false);
  const [notas, setNotas] = useState("");
  const [detalles, setDetalles] = useState<DetallePedido[]>([]);
  const [cortesias, setCortesias] = useState<DetallePedido[]>([]);
  const [searchProducto, setSearchProducto] = useState("");
  const [searchCortesia, setSearchCortesia] = useState("");
  const [showCortesiaSearch, setShowCortesiaSearch] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadClientes();
      loadProductos();
    }
  }, [open]);

  useEffect(() => {
    if (selectedClienteId) {
      loadSucursales(selectedClienteId);
      loadCortesiasDefault(selectedClienteId);
      // Set default factura preference based on client
      const cliente = clientes.find(c => c.id === selectedClienteId);
      if (cliente) {
        setRequiereFactura(cliente.preferencia_facturacion === "siempre_factura");
      }
    } else {
      setSucursales([]);
      setSelectedSucursalId("");
      setCortesias([]);
    }
  }, [selectedClienteId]);

  const loadClientes = async () => {
    const { data, error } = await supabase
      .from("clientes")
      .select("id, codigo, nombre, preferencia_facturacion")
      .eq("activo", true)
      .order("nombre");

    if (!error && data) {
      setClientes(data);
    }
  };

  const loadSucursales = async (clienteId: string) => {
    const { data, error } = await supabase
      .from("cliente_sucursales")
      .select("id, nombre, direccion, rfc, razon_social")
      .eq("cliente_id", clienteId)
      .eq("activo", true)
      .order("nombre");

    if (!error && data) {
      setSucursales(data);
      if (data.length === 1) {
        setSelectedSucursalId(data[0].id);
      }
    }
  };

  const loadProductos = async () => {
    const { data, error } = await supabase
      .from("productos")
      .select("id, codigo, nombre, especificaciones, marca, contenido_empaque, precio_venta, unidad, aplica_iva, aplica_ieps, stock_actual, precio_por_kilo, peso_kg")
      .eq("activo", true)
      .neq("bloqueado_venta", true)
      .order("nombre");

    if (!error && data) {
      setProductos(data);
    }
  };

  const loadCortesiasDefault = async (clienteId: string) => {
    const { data, error } = await supabase
      .from("cliente_cortesias_default")
      .select(`
        id,
        producto_id,
        cantidad,
        notas,
        producto:productos(id, codigo, nombre, precio_venta, unidad, aplica_iva, aplica_ieps, stock_actual, peso_kg)
      `)
      .eq("cliente_id", clienteId)
      .eq("activo", true);

    if (!error && data) {
      const cortesiasFromDb = data.map((c: any) => ({
        producto_id: c.producto_id,
        producto: c.producto as Producto,
        cantidad: c.cantidad,
        kilos_totales: null,
        precio_unitario: 0,
        subtotal: 0,
        es_cortesia: true,
      }));
      setCortesias(cortesiasFromDb);
    }
  };

  const filteredProductos = productos.filter(p => {
    const term = searchProducto.toLowerCase();
    return !detalles.some(d => d.producto_id === p.id) &&
      !cortesias.some(c => c.producto_id === p.id) &&
      (p.nombre.toLowerCase().includes(term) ||
       p.codigo.toLowerCase().includes(term) ||
       (p.especificaciones?.toLowerCase() || "").includes(term) ||
       (p.marca?.toLowerCase() || "").includes(term));
  });

  const filteredCortesias = productos.filter(p => {
    const term = searchCortesia.toLowerCase();
    return !detalles.some(d => d.producto_id === p.id) &&
      !cortesias.some(c => c.producto_id === p.id) &&
      (p.nombre.toLowerCase().includes(term) ||
       p.codigo.toLowerCase().includes(term) ||
       (p.especificaciones?.toLowerCase() || "").includes(term) ||
       (p.marca?.toLowerCase() || "").includes(term));
  });

  const addProducto = (producto: Producto) => {
    // Para productos precio_por_kilo: mantener precio original (por kg)
    // El subtotal se calcula como: kilos_totales × precio_por_kg
    const cantidad = 1;
    let kilosTotales: number | null = null;
    let precioUnitario = producto.precio_venta;
    let subtotal: number;

    if (producto.precio_por_kilo && producto.peso_kg) {
      const kgPorUnidad = producto.peso_kg;
      kilosTotales = cantidad * kgPorUnidad;
      precioUnitario = producto.precio_venta; // Precio por kg
      subtotal = kilosTotales * precioUnitario;
    } else {
      // Producto normal: precio ya está por unidad
      precioUnitario = obtenerPrecioUnitarioVenta({
        precio_venta: producto.precio_venta,
        precio_por_kilo: producto.precio_por_kilo,
        peso_kg: producto.peso_kg
      });
      subtotal = precioUnitario;
    }
    
    setDetalles([...detalles, {
      producto_id: producto.id,
      producto,
      cantidad,
      kilos_totales: kilosTotales,
      precio_unitario: precioUnitario,
      subtotal,
      es_cortesia: false,
    }]);
    setSearchProducto("");
  };

  const addCortesia = (producto: Producto) => {
    setCortesias([...cortesias, {
      producto_id: producto.id,
      producto,
      cantidad: 1,
      kilos_totales: null,
      precio_unitario: 0,
      subtotal: 0,
      es_cortesia: true,
    }]);
    setSearchCortesia("");
    setShowCortesiaSearch(false);
  };

  const updateDetalle = (index: number, field: "cantidad" | "precio_unitario", value: number) => {
    const newDetalles = [...detalles];
    const detalle = newDetalles[index];
    detalle[field] = value;
    
    // Recalcular kilos y subtotal según tipo de producto
    if (detalle.producto.precio_por_kilo && detalle.producto.peso_kg) {
      const kgPorUnidad = detalle.producto.peso_kg;
      detalle.kilos_totales = detalle.cantidad * kgPorUnidad;
      detalle.subtotal = detalle.kilos_totales * detalle.precio_unitario;
    } else {
      detalle.kilos_totales = null;
      detalle.subtotal = detalle.cantidad * detalle.precio_unitario;
    }
    
    setDetalles(newDetalles);
  };

  const updateCortesiaCantidad = (index: number, value: number) => {
    const newCortesias = [...cortesias];
    newCortesias[index].cantidad = value;
    setCortesias(newCortesias);
  };

  const removeDetalle = (index: number) => {
    setDetalles(detalles.filter((_, i) => i !== index));
  };

  const removeCortesia = (index: number) => {
    setCortesias(cortesias.filter((_, i) => i !== index));
  };

  // Convertir detalles a formato LineaPedido para validación (solo productos con precio, no cortesías)
  const getLineasPedido = (): LineaPedido[] => {
    return detalles.filter(d => !d.es_cortesia).map(d => ({
      producto_id: d.producto_id,
      nombre_producto: d.producto.nombre,
      cantidad: d.cantidad,
      precio_unitario: d.precio_unitario,
      aplica_iva: d.producto.aplica_iva,
      aplica_ieps: d.producto.aplica_ieps
    }));
  };

  // Validación antes de guardar
  const validacionPedido = detalles.length > 0 ? validarAntesDeGuardar(getLineasPedido()) : null;

  const calcularTotales = () => {
    let subtotalGeneral = 0;
    let ivaTotal = 0;
    let iepsTotal = 0;

    detalles.forEach(d => {
      const resultado = calcularDesgloseImpuestos({
        precio_con_impuestos: d.subtotal,
        aplica_iva: d.producto.aplica_iva,
        aplica_ieps: d.producto.aplica_ieps,
        nombre_producto: d.producto.nombre
      });
      subtotalGeneral += resultado.base;
      ivaTotal += resultado.iva;
      iepsTotal += resultado.ieps;
    });

    return {
      subtotal: redondear(subtotalGeneral),
      iva: redondear(ivaTotal),
      ieps: redondear(iepsTotal),
      total: redondear(subtotalGeneral + ivaTotal + iepsTotal),
    };
  };

  const calcularPesoTotal = () => {
    let pesoTotal = 0;
    detalles.forEach(d => {
      if (d.producto.peso_kg) {
        pesoTotal += d.cantidad * d.producto.peso_kg;
      }
    });
    return pesoTotal;
  };

  const handleCrearPedido = async () => {
    if (!selectedClienteId) {
      toast({ title: "Selecciona un cliente", variant: "destructive" });
      return;
    }
    if (sucursales.length > 0 && !selectedSucursalId) {
      toast({ title: "Selecciona una sucursal", variant: "destructive" });
      return;
    }
    if (detalles.length === 0) {
      toast({ title: "Agrega al menos un producto", variant: "destructive" });
      return;
    }

    // VALIDACIÓN OBLIGATORIA antes de guardar
    const validacion = validarAntesDeGuardar(getLineasPedido());
    if (!validacion.puede_guardar) {
      toast({ 
        title: "Error en cálculos", 
        description: validacion.errores.join(". "),
        variant: "destructive" 
      });
      return;
    }

    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("No autenticado");

      const totales = calcularTotales();
      const pesoTotal = calcularPesoTotal();
      const timestamp = Date.now();
      const folio = `PED-${timestamp}`;

      // Create pedido
      const { data: pedido, error: pedidoError } = await supabase
        .from("pedidos")
        .insert({
          folio,
          cliente_id: selectedClienteId,
          sucursal_id: selectedSucursalId || null,
          vendedor_id: userData.user.id,
          subtotal: totales.subtotal,
          impuestos: totales.iva + totales.ieps,
          total: totales.total,
          peso_total_kg: pesoTotal > 0 ? pesoTotal : null,
          requiere_factura: requiereFactura,
          notas: notas || null,
          status: "pendiente",
        })
        .select()
        .single();

      if (pedidoError) throw pedidoError;

      // Create detalles (productos normales)
      const detallesInsert = detalles.map(d => ({
        pedido_id: pedido.id,
        producto_id: d.producto_id,
        cantidad: d.cantidad,
        kilos_totales: d.kilos_totales,
        precio_unitario: d.precio_unitario,
        subtotal: d.subtotal,
        es_cortesia: false,
      }));

      // Create cortesias (productos sin cargo)
      const cortesiasInsert = cortesias.map(c => ({
        pedido_id: pedido.id,
        producto_id: c.producto_id,
        cantidad: c.cantidad,
        precio_unitario: 0,
        subtotal: 0,
        es_cortesia: true,
      }));

      const allDetalles = [...detallesInsert, ...cortesiasInsert];

      const { error: detallesError } = await supabase
        .from("pedidos_detalles")
        .insert(allDetalles);

      if (detallesError) throw detallesError;

      toast({ title: "Pedido creado", description: `Folio: ${folio}` });
      resetForm();
      onPedidoCreated();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedClienteId("");
    setSelectedSucursalId("");
    setSucursales([]);
    setDetalles([]);
    setCortesias([]);
    setNotas("");
    setRequiereFactura(false);
    setSearchProducto("");
    setSearchCortesia("");
    setShowCortesiaSearch(false);
  };

  const totales = calcularTotales();
  const selectedSucursal = sucursales.find(s => s.id === selectedSucursalId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-4xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Nuevo Pedido
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Cliente y Sucursal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Select value={selectedClienteId} onValueChange={setSelectedClienteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="font-mono text-xs mr-2">{c.codigo}</span>
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Sucursal de entrega {sucursales.length > 0 && "*"}</Label>
              <Select 
                value={selectedSucursalId} 
                onValueChange={setSelectedSucursalId}
                disabled={!selectedClienteId || sucursales.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    !selectedClienteId 
                      ? "Primero selecciona cliente" 
                      : sucursales.length === 0 
                        ? "Sin sucursales" 
                        : "Seleccionar sucursal..."
                  } />
                </SelectTrigger>
                <SelectContent>
                  {sucursales.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3 w-3" />
                        {s.nombre}
                        {s.rfc && (
                          <Badge variant="outline" className="text-xs ml-1">
                            RFC propio
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedSucursal?.rfc && (
                <p className="text-xs text-muted-foreground">
                  Facturación: {selectedSucursal.razon_social} ({selectedSucursal.rfc})
                </p>
              )}
            </div>
          </div>

          {/* Opciones */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch 
                checked={requiereFactura} 
                onCheckedChange={setRequiereFactura}
                id="requiere-factura"
              />
              <Label htmlFor="requiere-factura">Requiere factura</Label>
            </div>
          </div>

          {/* Productos */}
          <div className="space-y-3">
            <Label>Productos</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar producto por nombre o código..."
                value={searchProducto}
                onChange={(e) => setSearchProducto(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {searchProducto && filteredProductos.length > 0 && (
              <div className="border rounded-md max-h-40 overflow-y-auto">
                {filteredProductos.slice(0, 10).map(p => (
                   <button
                     key={p.id}
                     onClick={() => addProducto(p)}
                     className="w-full px-3 py-2 text-left hover:bg-muted flex justify-between items-center"
                   >
                     <div>
                       <span>
                         <span className="font-mono text-xs mr-2">{p.codigo}</span>
                         {getDisplayName(p)}
                       </span>
                       <span className="text-xs text-muted-foreground ml-2">— Stock: {p.stock_actual}</span>
                     </div>
                     <span className="text-sm text-muted-foreground">
                       {formatCurrency(p.precio_venta)} / {p.unidad}
                     </span>
                   </button>
                ))}
              </div>
            )}

            {detalles.length > 0 && (
              isMobile ? (
                <div className="space-y-3">
                  {detalles.map((d, idx) => {
                    const esPorKilo = d.producto.precio_por_kilo && d.producto.peso_kg;
                    const kgPorUnidad = esPorKilo ? d.producto.peso_kg! : null;
                    return (
                      <Card key={idx} className="border">
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm leading-tight">{getDisplayName(d.producto)}</p>
                              <p className="font-mono text-xs text-muted-foreground">{d.producto.codigo}</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {esPorKilo && (
                                  <Badge variant="secondary" className="text-xs">{kgPorUnidad} kg/{d.producto.unidad}</Badge>
                                )}
                                {d.producto.aplica_iva && <Badge variant="outline" className="text-xs">IVA</Badge>}
                                {d.producto.aplica_ieps && <Badge variant="outline" className="text-xs">IEPS</Badge>}
                              </div>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeDetalle(idx)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs text-muted-foreground">Cantidad</Label>
                              <div className="flex items-center gap-1">
                                <Input type="number" min={1} value={d.cantidad} onChange={(e) => updateDetalle(idx, "cantidad", Number(e.target.value))} className="h-8" />
                                <span className="text-xs text-muted-foreground shrink-0">{d.producto.unidad}</span>
                              </div>
                              {d.cantidad > d.producto.stock_actual && (
                                <p className="text-xs text-destructive mt-0.5">⚠️ Stock: {d.producto.stock_actual}</p>
                              )}
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Precio</Label>
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground text-sm">$</span>
                                <Input type="number" min={0} step={0.01} value={d.precio_unitario} onChange={(e) => updateDetalle(idx, "precio_unitario", Number(e.target.value))} className="h-8" />
                                <span className="text-xs text-muted-foreground shrink-0">{esPorKilo ? '/kg' : `/${d.producto.unidad}`}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t">
                            {esPorKilo && d.kilos_totales !== null ? (
                              <span className="text-sm font-medium text-blue-600">{d.kilos_totales.toLocaleString('es-MX')} kg</span>
                            ) : (
                              <span />
                            )}
                            <span className="font-mono font-bold text-primary">{formatCurrency(d.subtotal)}</span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="w-24">Cantidad</TableHead>
                      <TableHead className="w-20">Kilos</TableHead>
                      <TableHead className="w-32">Precio</TableHead>
                      <TableHead className="w-32 text-right">Subtotal</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detalles.map((d, idx) => {
                      const esPorKilo = d.producto.precio_por_kilo && d.producto.peso_kg;
                      const kgPorUnidad = esPorKilo ? d.producto.peso_kg! : null;
                      
                      return (
                        <TableRow key={idx}>
                          <TableCell>
                            <div>
                              <span className="font-mono text-xs mr-2">{d.producto.codigo}</span>
                              {getDisplayName(d.producto)}
                            </div>
                            <div className="text-xs text-muted-foreground space-x-1">
                              {esPorKilo && (
                                <Badge variant="secondary" className="text-xs">
                                  {kgPorUnidad} kg/{d.producto.unidad}
                                </Badge>
                              )}
                              {d.producto.aplica_iva && <Badge variant="outline" className="text-xs">IVA</Badge>}
                              {d.producto.aplica_ieps && <Badge variant="outline" className="text-xs">IEPS</Badge>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                min={1}
                                value={d.cantidad}
                                onChange={(e) => updateDetalle(idx, "cantidad", Number(e.target.value))}
                                className="w-16"
                              />
                              <span className="text-xs text-muted-foreground">{d.producto.unidad}</span>
                            </div>
                            {d.cantidad > d.producto.stock_actual && (
                              <p className="text-xs text-destructive">⚠️ Solo hay {d.producto.stock_actual} en stock</p>
                            )}
                          </TableCell>
                          <TableCell>
                            {esPorKilo && d.kilos_totales !== null ? (
                              <span className="font-medium text-blue-600">
                                {d.kilos_totales.toLocaleString('es-MX')} kg
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">$</span>
                              <Input
                                type="number"
                                min={0}
                                step={0.01}
                                value={d.precio_unitario}
                                onChange={(e) => updateDetalle(idx, "precio_unitario", Number(e.target.value))}
                                className="w-20"
                              />
                              <span className="text-xs text-muted-foreground">
                                {esPorKilo ? '/kg' : `/${d.producto.unidad}`}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium">
                            {formatCurrency(d.subtotal)}
                            {esPorKilo && (
                              <div className="text-xs text-muted-foreground font-normal">
                                {d.kilos_totales?.toLocaleString('es-MX')} × ${d.precio_unitario.toFixed(2)}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeDetalle(idx)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )
            )}
          </div>

          {/* Cortesías Sin Cargo */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Gift className="h-4 w-4 text-amber-500" />
                Cortesías Sin Cargo
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowCortesiaSearch(!showCortesiaSearch)}
                className="text-amber-600 border-amber-300 hover:bg-amber-50"
              >
                <Plus className="h-4 w-4 mr-1" />
                Agregar Cortesía
              </Button>
            </div>

            {showCortesiaSearch && (
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar producto para agregar como cortesía..."
                  value={searchCortesia}
                  onChange={(e) => setSearchCortesia(e.target.value)}
                  className="pl-10 border-amber-300 focus:border-amber-500"
                />
                {searchCortesia && filteredCortesias.length > 0 && (
                  <div className="border border-amber-200 rounded-md max-h-40 overflow-y-auto mt-1 bg-amber-50">
                    {filteredCortesias.slice(0, 10).map(p => (
                      <button
                        key={p.id}
                        onClick={() => addCortesia(p)}
                        className="w-full px-3 py-2 text-left hover:bg-amber-100 flex justify-between items-center"
                      >
                        <span>
                          <span className="font-mono text-xs mr-2">{p.codigo}</span>
                          {p.nombre}
                          {p.especificaciones && (
                            <span className="text-muted-foreground ml-1">{p.especificaciones}</span>
                          )}
                        </span>
                        <Badge className="bg-amber-500 text-white">Sin Cargo</Badge>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {cortesias.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                {cortesias.map((c, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 bg-white p-2 rounded border border-amber-100">
                    <div className="flex items-center gap-2 flex-1 flex-wrap">
                      <Gift className="h-4 w-4 text-amber-500 shrink-0" />
                      <span className="font-mono text-xs">{c.producto.codigo}</span>
                      <span className="text-sm">
                        {c.producto.nombre}
                        {c.producto.especificaciones && (
                          <span className="text-muted-foreground ml-1">{c.producto.especificaciones}</span>
                        )}
                      </span>
                      <Badge className="bg-amber-500 text-white text-xs">CORTESÍA</Badge>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <Input
                        type="number"
                        min={1}
                        value={c.cantidad}
                        onChange={(e) => updateCortesiaCantidad(idx, Number(e.target.value))}
                        className="w-16 h-8 text-center"
                      />
                      <span className="text-sm text-muted-foreground">{c.producto.unidad}</span>
                      <span className="font-mono text-amber-600">$0.00</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCortesia(idx)}
                        className="h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <Textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Notas adicionales para el pedido..."
              rows={2}
            />
          </div>

          {/* Totales */}
          {detalles.length > 0 && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span className="font-mono">{formatCurrency(totales.subtotal)}</span>
              </div>
              {totales.iva > 0 && (
                <div className="flex justify-between text-sm">
                  <span>IVA (16%):</span>
                  <span className="font-mono">{formatCurrency(totales.iva)}</span>
                </div>
              )}
              {totales.ieps > 0 && (
                <div className="flex justify-between text-sm">
                  <span>IEPS (8%):</span>
                  <span className="font-mono">{formatCurrency(totales.ieps)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span className="font-mono">{formatCurrency(totales.total)}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button onClick={handleCrearPedido} disabled={loading} className="w-full sm:w-auto">
              {loading ? "Creando..." : "Crear Pedido"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NuevoPedidoDialog;
