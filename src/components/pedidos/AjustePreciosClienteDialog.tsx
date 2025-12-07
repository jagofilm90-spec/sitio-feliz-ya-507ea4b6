import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Users, Package, ArrowRight, Info, RotateCcw, History } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { calcularSubtotalLinea } from "@/lib/calculos";

interface Cliente {
  id: string;
  nombre: string;
  codigo: string;
}

interface Producto {
  id: string;
  nombre: string;
  codigo: string;
  unidad: string;
}

interface LineaPedido {
  id: string;
  pedido_id: string;
  pedido_folio: string;
  fecha_pedido: string;
  cantidad: number;
  precio_unitario: number;
}

interface DistribucionPreview {
  linea_id: string;
  pedido_folio: string;
  cantidad_original: number;
  cantidad_precio_original: number;
  cantidad_precio_nuevo: number;
  precio_original: number;
  precio_nuevo: number;
  requiere_division: boolean;
}

interface AjustePreciosClienteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

interface LineaAjustada {
  id: string;
  pedido_id: string;
  pedido_folio: string;
  producto_nombre: string;
  producto_codigo: string;
  cantidad: number;
  precio_unitario: number;
  precio_original: number;
  fecha_ajuste: string;
  linea_dividida_de: string | null;
  cliente_nombre: string;
}

export const AjustePreciosClienteDialog = ({
  open,
  onOpenChange,
  onComplete
}: AjustePreciosClienteDialogProps) => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [lineas, setLineas] = useState<LineaPedido[]>([]);
  
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string>("");
  const [productoSeleccionado, setProductoSeleccionado] = useState<string>("");
  const [cantidadPrecioOriginal, setCantidadPrecioOriginal] = useState<number>(0);
  const [nuevoPrecio, setNuevoPrecio] = useState<number>(0);
  
  const [loading, setLoading] = useState(false);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchCliente, setSearchCliente] = useState("");
  
  const [distribucionPreview, setDistribucionPreview] = useState<DistribucionPreview[]>([]);
  
  // State for reverting tab
  const [activeTab, setActiveTab] = useState<string>("ajustar");
  const [lineasAjustadas, setLineasAjustadas] = useState<LineaAjustada[]>([]);
  const [loadingAjustadas, setLoadingAjustadas] = useState(false);
  const [reverting, setReverting] = useState<string | null>(null);

  const totalCantidad = lineas.reduce((sum, l) => sum + l.cantidad, 0);
  const precioOriginal = lineas.length > 0 ? lineas[0].precio_unitario : 0;
  const cantidadPrecioNuevo = totalCantidad - cantidadPrecioOriginal;
  const productoInfo = productos.find(p => p.id === productoSeleccionado);

  useEffect(() => {
    if (open) {
      loadClientes();
      resetForm();
      setActiveTab("ajustar");
    }
  }, [open]);

  // Load adjusted lines when switching to history tab
  useEffect(() => {
    if (activeTab === "historial") {
      loadLineasAjustadas();
    }
  }, [activeTab]);

  useEffect(() => {
    if (clienteSeleccionado) {
      loadProductosCliente(clienteSeleccionado);
    } else {
      setProductos([]);
      setProductoSeleccionado("");
    }
  }, [clienteSeleccionado]);

  useEffect(() => {
    if (productoSeleccionado && clienteSeleccionado) {
      loadLineasProductoCliente(clienteSeleccionado, productoSeleccionado);
    } else {
      setLineas([]);
    }
  }, [productoSeleccionado, clienteSeleccionado]);

  useEffect(() => {
    if (lineas.length > 0) {
      calcularDistribucion();
    }
  }, [cantidadPrecioOriginal, nuevoPrecio, lineas]);

  const resetForm = () => {
    setClienteSeleccionado("");
    setProductoSeleccionado("");
    setCantidadPrecioOriginal(0);
    setNuevoPrecio(0);
    setLineas([]);
    setProductos([]);
    setDistribucionPreview([]);
    setSearchCliente("");
    setLineasAjustadas([]);
  };

  // Load all adjusted lines (with precio_original != null)
  const loadLineasAjustadas = async () => {
    setLoadingAjustadas(true);
    try {
      const { data, error } = await supabase
        .from("pedidos_detalles")
        .select(`
          id,
          pedido_id,
          cantidad,
          precio_unitario,
          precio_original,
          fecha_ajuste_precio,
          linea_dividida_de,
          producto:productos(id, nombre, codigo),
          pedido:pedidos!inner(id, folio, status, cliente:clientes(id, nombre))
        `)
        .not("precio_original", "is", null)
        .in("pedido.status", ["pendiente", "por_autorizar", "en_ruta"])
        .order("fecha_ajuste_precio", { ascending: false })
        .limit(100);

      if (error) throw error;

      const ajustadas: LineaAjustada[] = (data || [])
        .filter((d: any) => d.precio_original !== d.precio_unitario)
        .map((d: any) => ({
          id: d.id,
          pedido_id: d.pedido_id,
          pedido_folio: d.pedido?.folio || "",
          producto_nombre: d.producto?.nombre || "Producto",
          producto_codigo: d.producto?.codigo || "",
          cantidad: d.cantidad,
          precio_unitario: d.precio_unitario,
          precio_original: d.precio_original,
          fecha_ajuste: d.fecha_ajuste_precio || "",
          linea_dividida_de: d.linea_dividida_de,
          cliente_nombre: d.pedido?.cliente?.nombre || ""
        }));

      setLineasAjustadas(ajustadas);
    } catch (error) {
      console.error("Error loading adjusted lines:", error);
      toast.error("Error al cargar líneas ajustadas");
    } finally {
      setLoadingAjustadas(false);
    }
  };

  // Revert a single adjusted line
  const handleRevertirLinea = async (linea: LineaAjustada) => {
    setReverting(linea.id);
    try {
      if (linea.linea_dividida_de) {
        // Find parent line and merge back
        const { data: parentData } = await supabase
          .from("pedidos_detalles")
          .select("id, cantidad, precio_unitario, subtotal")
          .eq("id", linea.linea_dividida_de)
          .single();

        if (parentData) {
          const nuevaCantidadPadre = parentData.cantidad + linea.cantidad;
          const nuevoSubtotalPadre = calcularSubtotalLinea(nuevaCantidadPadre, parentData.precio_unitario);

          await supabase
            .from("pedidos_detalles")
            .update({
              cantidad: nuevaCantidadPadre,
              subtotal: nuevoSubtotalPadre,
              notas_ajuste: `Línea fusionada: cantidad restaurada`
            })
            .eq("id", parentData.id);

          await supabase
            .from("pedidos_detalles")
            .delete()
            .eq("id", linea.id);

          toast.success("Línea fusionada con la original");
        } else {
          // Parent not found, restore price
          const nuevoSubtotal = calcularSubtotalLinea(linea.cantidad, linea.precio_original);
          await supabase
            .from("pedidos_detalles")
            .update({
              precio_unitario: linea.precio_original,
              subtotal: nuevoSubtotal,
              precio_original: null,
              precio_ajustado_por: null,
              fecha_ajuste_precio: null,
              notas_ajuste: `Precio revertido: $${linea.precio_unitario} → $${linea.precio_original}`
            })
            .eq("id", linea.id);

          toast.success("Precio revertido");
        }
      } else {
        // Regular line, restore original price
        const nuevoSubtotal = calcularSubtotalLinea(linea.cantidad, linea.precio_original);
        await supabase
          .from("pedidos_detalles")
          .update({
            precio_unitario: linea.precio_original,
            subtotal: nuevoSubtotal,
            precio_original: null,
            precio_ajustado_por: null,
            fecha_ajuste_precio: null,
            notas_ajuste: `Precio revertido: $${linea.precio_unitario} → $${linea.precio_original}`
          })
          .eq("id", linea.id);

        toast.success("Precio revertido");
      }

      // Recalculate order totals
      await recalcularTotalesPedido(linea.pedido_id);
      loadLineasAjustadas();
      onComplete();
    } catch (error) {
      console.error("Error reverting:", error);
      toast.error("Error al revertir");
    } finally {
      setReverting(null);
    }
  };

  const recalcularTotalesPedido = async (pedidoId: string) => {
    const { data: detalles } = await supabase
      .from("pedidos_detalles")
      .select("subtotal")
      .eq("pedido_id", pedidoId);

    const subtotal = (detalles || []).reduce((sum, d) => sum + (d.subtotal || 0), 0);
    const impuestos = subtotal * 0.16;
    const total = subtotal + impuestos;

    await supabase
      .from("pedidos")
      .update({ subtotal, impuestos, total })
      .eq("id", pedidoId);
  };

  const loadClientes = async () => {
    try {
      const { data, error } = await supabase
        .from("clientes")
        .select("id, nombre, codigo")
        .eq("activo", true)
        .order("nombre");

      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error("Error loading clients:", error);
    }
  };

  const loadProductosCliente = async (clienteId: string) => {
    setLoadingProductos(true);
    try {
      // Get products from pending orders for this client
      const { data, error } = await supabase
        .from("pedidos_detalles")
        .select(`
          producto:productos(id, nombre, codigo, unidad),
          pedido:pedidos!inner(cliente_id, status)
        `)
        .eq("pedido.cliente_id", clienteId)
        .in("pedido.status", ["pendiente", "por_autorizar", "en_ruta"]);

      if (error) throw error;

      // Get unique products
      const productosMap = new Map<string, Producto>();
      (data || []).forEach((d: any) => {
        if (d.producto && !productosMap.has(d.producto.id)) {
          productosMap.set(d.producto.id, {
            id: d.producto.id,
            nombre: d.producto.nombre,
            codigo: d.producto.codigo,
            unidad: d.producto.unidad
          });
        }
      });

      setProductos(Array.from(productosMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre)));
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      setLoadingProductos(false);
    }
  };

  const loadLineasProductoCliente = async (clienteId: string, productoId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("pedidos_detalles")
        .select(`
          id,
          pedido_id,
          cantidad,
          precio_unitario,
          pedido:pedidos!inner(id, folio, fecha_pedido, cliente_id, status)
        `)
        .eq("producto_id", productoId)
        .eq("pedido.cliente_id", clienteId)
        .in("pedido.status", ["pendiente", "por_autorizar", "en_ruta"])
        .order("pedido(fecha_pedido)", { ascending: true });

      if (error) throw error;

      const lineasFormateadas: LineaPedido[] = (data || []).map((d: any) => ({
        id: d.id,
        pedido_id: d.pedido_id,
        pedido_folio: d.pedido?.folio || "",
        fecha_pedido: d.pedido?.fecha_pedido || "",
        cantidad: d.cantidad,
        precio_unitario: d.precio_unitario
      }));

      setLineas(lineasFormateadas);
      
      // Initialize with all quantity at original price
      const total = lineasFormateadas.reduce((sum, l) => sum + l.cantidad, 0);
      setCantidadPrecioOriginal(total);
      
      if (lineasFormateadas.length > 0) {
        setNuevoPrecio(lineasFormateadas[0].precio_unitario);
      }
    } catch (error) {
      console.error("Error loading lines:", error);
      toast.error("Error al cargar líneas");
    } finally {
      setLoading(false);
    }
  };

  const calcularDistribucion = () => {
    if (lineas.length === 0) {
      setDistribucionPreview([]);
      return;
    }

    const preview: DistribucionPreview[] = [];
    let cantidadRestantePrecioOriginal = cantidadPrecioOriginal;

    // FIFO: first orders get original price
    for (const linea of lineas) {
      if (cantidadRestantePrecioOriginal >= linea.cantidad) {
        // Entire line at original price
        preview.push({
          linea_id: linea.id,
          pedido_folio: linea.pedido_folio,
          cantidad_original: linea.cantidad,
          cantidad_precio_original: linea.cantidad,
          cantidad_precio_nuevo: 0,
          precio_original: linea.precio_unitario,
          precio_nuevo: nuevoPrecio,
          requiere_division: false
        });
        cantidadRestantePrecioOriginal -= linea.cantidad;
      } else if (cantidadRestantePrecioOriginal > 0) {
        // Line needs to be split
        preview.push({
          linea_id: linea.id,
          pedido_folio: linea.pedido_folio,
          cantidad_original: linea.cantidad,
          cantidad_precio_original: cantidadRestantePrecioOriginal,
          cantidad_precio_nuevo: linea.cantidad - cantidadRestantePrecioOriginal,
          precio_original: linea.precio_unitario,
          precio_nuevo: nuevoPrecio,
          requiere_division: true
        });
        cantidadRestantePrecioOriginal = 0;
      } else {
        // Entire line at new price
        preview.push({
          linea_id: linea.id,
          pedido_folio: linea.pedido_folio,
          cantidad_original: linea.cantidad,
          cantidad_precio_original: 0,
          cantidad_precio_nuevo: linea.cantidad,
          precio_original: linea.precio_unitario,
          precio_nuevo: nuevoPrecio,
          requiere_division: false
        });
      }
    }

    setDistribucionPreview(preview);
  };

  const handleAplicarDistribucion = async () => {
    if (cantidadPrecioNuevo <= 0) {
      toast.error("No hay cantidad para ajustar al nuevo precio");
      return;
    }

    if (nuevoPrecio <= 0) {
      toast.error("El nuevo precio debe ser mayor a 0");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      const pedidosAfectados = new Set<string>();
      const clienteNombre = clientes.find(c => c.id === clienteSeleccionado)?.nombre || "";

      for (const dist of distribucionPreview) {
        const linea = lineas.find(l => l.id === dist.linea_id);
        if (!linea) continue;

        if (dist.requiere_division) {
          // Split the line: update original with reduced quantity, create new line with new price
          const nuevoSubtotalOriginal = calcularSubtotalLinea(dist.cantidad_precio_original, dist.precio_original);
          const nuevoSubtotalNuevo = calcularSubtotalLinea(dist.cantidad_precio_nuevo, nuevoPrecio);

          // Update original line with reduced quantity
          await supabase
            .from("pedidos_detalles")
            .update({
              cantidad: dist.cantidad_precio_original,
              subtotal: nuevoSubtotalOriginal,
              notas_ajuste: `Línea dividida: ${dist.cantidad_original} → ${dist.cantidad_precio_original} (${clienteNombre})`
            })
            .eq("id", dist.linea_id);

          // Create new line with new price
          await supabase
            .from("pedidos_detalles")
            .insert({
              pedido_id: linea.pedido_id,
              producto_id: productoSeleccionado,
              cantidad: dist.cantidad_precio_nuevo,
              precio_unitario: nuevoPrecio,
              subtotal: nuevoSubtotalNuevo,
              precio_original: dist.precio_original,
              precio_ajustado_por: user.id,
              fecha_ajuste_precio: new Date().toISOString(),
              notas_ajuste: `Línea creada por división: ${dist.cantidad_precio_nuevo} a $${nuevoPrecio} (de línea con ${dist.cantidad_original})`,
              linea_dividida_de: dist.linea_id
            });

          pedidosAfectados.add(linea.pedido_id);
        } else if (dist.cantidad_precio_nuevo > 0) {
          // Entire line at new price
          const nuevoSubtotal = calcularSubtotalLinea(dist.cantidad_precio_nuevo, nuevoPrecio);
          
          await supabase
            .from("pedidos_detalles")
            .update({
              precio_original: dist.precio_original,
              precio_unitario: nuevoPrecio,
              subtotal: nuevoSubtotal,
              precio_ajustado_por: user.id,
              fecha_ajuste_precio: new Date().toISOString(),
              notas_ajuste: `Ajuste por cliente (${clienteNombre}): $${dist.precio_original} → $${nuevoPrecio}`
            })
            .eq("id", dist.linea_id);

          pedidosAfectados.add(linea.pedido_id);
        }
        // Lines with cantidad_precio_original = full quantity need no update
      }

      // Recalculate totals for affected orders
      for (const pedidoId of pedidosAfectados) {
        const { data: detalles } = await supabase
          .from("pedidos_detalles")
          .select("subtotal")
          .eq("pedido_id", pedidoId);

        const subtotal = (detalles || []).reduce((sum, d) => sum + (d.subtotal || 0), 0);
        const impuestos = subtotal * 0.16;
        const total = subtotal + impuestos;

        await supabase
          .from("pedidos")
          .update({ subtotal, impuestos, total })
          .eq("id", pedidoId);
      }

      toast.success(`Distribución aplicada: ${cantidadPrecioOriginal} al precio original, ${cantidadPrecioNuevo} a $${nuevoPrecio}`);
      onComplete();
      onOpenChange(false);
    } catch (error) {
      console.error("Error applying distribution:", error);
      toast.error("Error al aplicar la distribución");
    } finally {
      setSaving(false);
    }
  };

  const clientesFiltrados = clientes.filter(c => 
    c.nombre.toLowerCase().includes(searchCliente.toLowerCase()) ||
    c.codigo.toLowerCase().includes(searchCliente.toLowerCase())
  );

  const formatCurrency = (value: number) => `$${value.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Ajuste de Precios por Cliente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="ajustar">Ajustar Precios</TabsTrigger>
              <TabsTrigger value="historial">
                <History className="h-4 w-4 mr-2" />
                Ajustes Anteriores
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ajustar" className="space-y-4 mt-4">
              {/* Client selector */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Input
                    placeholder="Buscar cliente..."
                    value={searchCliente}
                    onChange={(e) => setSearchCliente(e.target.value)}
                    className="mb-2"
                  />
                  <Select value={clienteSeleccionado} onValueChange={setClienteSeleccionado}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientesFiltrados.slice(0, 50).map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          <span className="font-mono text-xs mr-2">{c.codigo}</span>
                          {c.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Producto</Label>
                  {loadingProductos ? (
                    <div className="flex items-center justify-center h-10">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : (
                    <Select 
                      value={productoSeleccionado} 
                      onValueChange={setProductoSeleccionado}
                      disabled={!clienteSeleccionado || productos.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={productos.length === 0 ? "Sin productos pendientes" : "Selecciona un producto"} />
                      </SelectTrigger>
                      <SelectContent>
                        {productos.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            <span className="font-mono text-xs mr-2">{p.codigo}</span>
                            {p.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              {/* Summary of pending quantity */}
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : lineas.length > 0 ? (
                <>
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Package className="h-4 w-4" />
                      <span>Resumen de pedidos pendientes</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold">{totalCantidad}</div>
                        <div className="text-sm text-muted-foreground">{productoInfo?.unidad || "unidades"} totales</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{lineas.length}</div>
                        <div className="text-sm text-muted-foreground">pedidos</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{formatCurrency(precioOriginal)}</div>
                        <div className="text-sm text-muted-foreground">precio actual</div>
                      </div>
                    </div>
                  </div>

                  {/* Distribution slider */}
                  <div className="space-y-4 border rounded-lg p-4">
                    <Label className="text-base font-medium">¿Cuántos {productoInfo?.unidad || "unidades"} mantienen el precio original?</Label>
                    <Slider
                      value={[cantidadPrecioOriginal]}
                      onValueChange={([value]) => setCantidadPrecioOriginal(value)}
                      max={totalCantidad}
                      step={1}
                      className="py-4"
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-green-500/10 rounded-lg p-3 text-center">
                        <div className="text-xl font-bold text-green-600">{cantidadPrecioOriginal}</div>
                        <div className="text-sm text-muted-foreground">al precio original ({formatCurrency(precioOriginal)})</div>
                      </div>
                      <div className="bg-orange-500/10 rounded-lg p-3 text-center">
                        <div className="text-xl font-bold text-orange-600">{cantidadPrecioNuevo}</div>
                        <div className="text-sm text-muted-foreground">al nuevo precio</div>
                      </div>
                    </div>
                  </div>

                  {/* New price input */}
                  {cantidadPrecioNuevo > 0 && (
                    <div className="space-y-2">
                      <Label>Nuevo precio para los {cantidadPrecioNuevo} {productoInfo?.unidad || "unidades"} restantes</Label>
                      <Input
                        type="number"
                        value={nuevoPrecio}
                        onChange={(e) => setNuevoPrecio(Number(e.target.value))}
                        step="0.01"
                        min={0}
                        className="max-w-xs"
                      />
                    </div>
                  )}

                  {/* Distribution preview */}
                  {distribucionPreview.length > 0 && cantidadPrecioNuevo > 0 && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        Vista previa de distribución (FIFO por fecha de pedido)
                      </Label>
                      <div className="border rounded-lg overflow-hidden max-h-[200px] overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-muted sticky top-0">
                            <tr>
                              <th className="p-2 text-left">Pedido</th>
                              <th className="p-2 text-center">Cantidad Original</th>
                              <th className="p-2 text-center">Precio Original</th>
                              <th className="p-2 text-center">Precio Nuevo</th>
                              <th className="p-2 text-center">Acción</th>
                            </tr>
                          </thead>
                          <tbody>
                            {distribucionPreview.map((dist) => (
                              <tr key={dist.linea_id} className="border-t">
                                <td className="p-2 font-mono text-xs">{dist.pedido_folio}</td>
                                <td className="p-2 text-center">{dist.cantidad_original}</td>
                                <td className="p-2 text-center">
                                  {dist.cantidad_precio_original > 0 && (
                                    <span className="text-green-600">
                                      {dist.cantidad_precio_original} @ {formatCurrency(dist.precio_original)}
                                    </span>
                                  )}
                                </td>
                                <td className="p-2 text-center">
                                  {dist.cantidad_precio_nuevo > 0 && (
                                    <span className="text-orange-600">
                                      {dist.cantidad_precio_nuevo} @ {formatCurrency(nuevoPrecio)}
                                    </span>
                                  )}
                                </td>
                                <td className="p-2 text-center">
                                  {dist.requiere_division ? (
                                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                                      Dividir línea
                                    </span>
                                  ) : dist.cantidad_precio_nuevo > 0 ? (
                                    <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                                      Cambiar precio
                                    </span>
                                  ) : (
                                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                      Sin cambios
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              ) : clienteSeleccionado && productoSeleccionado ? (
                <div className="text-center py-8 text-muted-foreground">
                  No hay pedidos pendientes para este cliente y producto
                </div>
              ) : clienteSeleccionado ? (
                <div className="text-center py-8 text-muted-foreground">
                  Selecciona un producto para ver los pedidos pendientes
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Selecciona un cliente para comenzar
                </div>
              )}
            </TabsContent>

            <TabsContent value="historial" className="space-y-4 mt-4">
              {loadingAjustadas ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : lineasAjustadas.length > 0 ? (
                <div className="border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="p-2 text-left">Cliente</th>
                        <th className="p-2 text-left">Producto</th>
                        <th className="p-2 text-left">Pedido</th>
                        <th className="p-2 text-center">Cantidad</th>
                        <th className="p-2 text-right">Original</th>
                        <th className="p-2 text-right">Actual</th>
                        <th className="p-2 text-center">Fecha</th>
                        <th className="p-2 w-20"></th>
                      </tr>
                    </thead>
                    <tbody>
                      <TooltipProvider>
                        {lineasAjustadas.map((linea) => (
                          <tr key={linea.id} className="border-t hover:bg-muted/30">
                            <td className="p-2 max-w-[150px] truncate" title={linea.cliente_nombre}>
                              {linea.cliente_nombre}
                            </td>
                            <td className="p-2">
                              <div className="flex items-center gap-1">
                                <span className="font-mono text-xs text-muted-foreground">{linea.producto_codigo}</span>
                                <span className="truncate max-w-[120px]" title={linea.producto_nombre}>{linea.producto_nombre}</span>
                                {linea.linea_dividida_de && (
                                  <span className="text-xs bg-yellow-100 text-yellow-800 px-1 rounded">Dividida</span>
                                )}
                              </div>
                            </td>
                            <td className="p-2 font-mono text-xs">{linea.pedido_folio}</td>
                            <td className="p-2 text-center">{linea.cantidad}</td>
                            <td className="p-2 text-right text-muted-foreground">
                              {formatCurrency(linea.precio_original)}
                            </td>
                            <td className="p-2 text-right font-medium">
                              {formatCurrency(linea.precio_unitario)}
                            </td>
                            <td className="p-2 text-center text-xs text-muted-foreground">
                              {linea.fecha_ajuste && format(new Date(linea.fecha_ajuste), "dd/MM/yy", { locale: es })}
                            </td>
                            <td className="p-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRevertirLinea(linea)}
                                    disabled={reverting === linea.id}
                                    className="text-amber-600 hover:text-amber-700"
                                  >
                                    {reverting === linea.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <RotateCcw className="h-4 w-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Revertir a {formatCurrency(linea.precio_original)}</p>
                                  {linea.linea_dividida_de && (
                                    <p className="text-xs text-amber-600">Se fusionará con línea original</p>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            </td>
                          </tr>
                        ))}
                      </TooltipProvider>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No hay ajustes de precios pendientes de revertir
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          {activeTab === "ajustar" && (
            <Button 
              onClick={handleAplicarDistribucion} 
              disabled={saving || cantidadPrecioNuevo === 0 || nuevoPrecio <= 0}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4 mr-2" />
              )}
              Aplicar Distribución
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
