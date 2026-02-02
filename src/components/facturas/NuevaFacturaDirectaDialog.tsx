/**
 * ==========================================================
 * Diálogo para crear facturas directas sin pedido previo
 * Soporta Venta de Mostrador (Público en General) y clientes específicos
 * ==========================================================
 */

import { useState, useEffect } from "react";
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
import { Switch } from "@/components/ui/switch";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Search, Store } from "lucide-react";

const RFC_PUBLICO_GENERAL = "XAXX010101000";

const USO_CFDI_OPTIONS = [
  { value: "G01", label: "G01 - Adquisición de mercancías" },
  { value: "G03", label: "G03 - Gastos en general" },
  { value: "S01", label: "S01 - Sin efectos fiscales" },
];

const FORMA_PAGO_OPTIONS = [
  { value: "01", label: "01 - Efectivo" },
  { value: "02", label: "02 - Cheque nominativo" },
  { value: "03", label: "03 - Transferencia electrónica" },
  { value: "04", label: "04 - Tarjeta de crédito" },
  { value: "28", label: "28 - Tarjeta de débito" },
  { value: "99", label: "99 - Por definir" },
];

const METODO_PAGO_OPTIONS = [
  { value: "PUE", label: "PUE - Pago en una sola exhibición" },
  { value: "PPD", label: "PPD - Pago en parcialidades o diferido" },
];

interface LineaFactura {
  id: string;
  producto_id: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  aplica_iva: boolean;
  aplica_ieps: boolean;
}

interface NuevaFacturaDirectaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const NuevaFacturaDirectaDialog = ({
  open,
  onOpenChange,
  onSuccess,
}: NuevaFacturaDirectaDialogProps) => {
  const [esVentaMostrador, setEsVentaMostrador] = useState(true);
  const [clienteId, setClienteId] = useState<string>("");
  const [clientes, setClientes] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [lineas, setLineas] = useState<LineaFactura[]>([]);
  const [usoCfdi, setUsoCfdi] = useState("S01");
  const [formaPago, setFormaPago] = useState("01");
  const [metodoPago, setMetodoPago] = useState("PUE");
  const [generando, setGenerando] = useState(false);
  const [searchProducto, setSearchProducto] = useState("");
  const [loadingClientes, setLoadingClientes] = useState(false);
  const { toast } = useToast();

  // Cargar clientes y productos al abrir
  useEffect(() => {
    if (open) {
      loadClientes();
      loadProductos();
      // Reset form
      setLineas([]);
      setEsVentaMostrador(true);
      setUsoCfdi("S01");
      setFormaPago("01");
      setMetodoPago("PUE");
      setClienteId("");
    }
  }, [open]);

  // Ajustar valores cuando cambia tipo de venta
  useEffect(() => {
    if (esVentaMostrador) {
      setUsoCfdi("S01");
      setFormaPago("01");
    } else {
      setUsoCfdi("G03");
      setFormaPago("99");
    }
  }, [esVentaMostrador]);

  const loadClientes = async () => {
    setLoadingClientes(true);
    try {
      const { data, error } = await supabase
        .from("clientes")
        .select("id, nombre, rfc, razon_social")
        .eq("activo", true)
        .neq("rfc", RFC_PUBLICO_GENERAL)
        .order("nombre");

      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error("Error cargando clientes:", error);
    } finally {
      setLoadingClientes(false);
    }
  };

  const loadProductos = async () => {
    try {
      const { data, error } = await supabase
        .from("productos")
        .select("id, nombre, codigo, precio_venta, aplica_iva, aplica_ieps, unidad")
        .eq("activo", true)
        .order("nombre");

      if (error) throw error;
      setProductos(data || []);
    } catch (error) {
      console.error("Error cargando productos:", error);
    }
  };

  const agregarProducto = (producto: any) => {
    const existe = lineas.find((l) => l.producto_id === producto.id);
    if (existe) {
      // Incrementar cantidad
      setLineas(
        lineas.map((l) =>
          l.producto_id === producto.id
            ? {
                ...l,
                cantidad: l.cantidad + 1,
                subtotal: (l.cantidad + 1) * l.precio_unitario,
              }
            : l
        )
      );
    } else {
      // Agregar nueva línea
      const nuevaLinea: LineaFactura = {
        id: crypto.randomUUID(),
        producto_id: producto.id,
        nombre: producto.nombre,
        cantidad: 1,
        precio_unitario: producto.precio_venta || 0,
        subtotal: producto.precio_venta || 0,
        aplica_iva: producto.aplica_iva || false,
        aplica_ieps: producto.aplica_ieps || false,
      };
      setLineas([...lineas, nuevaLinea]);
    }
    setSearchProducto("");
  };

  const actualizarCantidad = (id: string, cantidad: number) => {
    if (cantidad < 1) return;
    setLineas(
      lineas.map((l) =>
        l.id === id ? { ...l, cantidad, subtotal: cantidad * l.precio_unitario } : l
      )
    );
  };

  const actualizarPrecio = (id: string, precio: number) => {
    if (precio < 0) return;
    setLineas(
      lineas.map((l) =>
        l.id === id ? { ...l, precio_unitario: precio, subtotal: l.cantidad * precio } : l
      )
    );
  };

  const eliminarLinea = (id: string) => {
    setLineas(lineas.filter((l) => l.id !== id));
  };

  // Calcular totales
  const calcularTotales = () => {
    let subtotal = 0;
    let iva = 0;
    let ieps = 0;

    lineas.forEach((linea) => {
      // Los precios ya incluyen impuestos, debemos desagregarlos
      const precioConImpuestos = linea.subtotal;
      let divisor = 1;
      if (linea.aplica_iva) divisor += 0.16;
      if (linea.aplica_ieps) divisor += 0.08;

      const base = precioConImpuestos / divisor;
      subtotal += base;
      if (linea.aplica_iva) iva += base * 0.16;
      if (linea.aplica_ieps) ieps += base * 0.08;
    });

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      iva: Math.round(iva * 100) / 100,
      ieps: Math.round(ieps * 100) / 100,
      total: Math.round((subtotal + iva + ieps) * 100) / 100,
    };
  };

  const totales = calcularTotales();

  // Generar folio secuencial
  const generarFolio = async (): Promise<string> => {
    const currentYearMonth = new Date().toISOString().slice(0, 7).replace("-", "");
    const prefix = `FAC-${currentYearMonth}-`;

    const { data } = await supabase
      .from("facturas")
      .select("folio")
      .like("folio", `${prefix}%`)
      .order("folio", { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      const lastNumber = parseInt(data[0].folio.slice(-4), 10);
      return `${prefix}${String(lastNumber + 1).padStart(4, "0")}`;
    }
    return `${prefix}0001`;
  };

  const handleGenerarFactura = async () => {
    if (lineas.length === 0) {
      toast({
        title: "Sin productos",
        description: "Agrega al menos un producto a la factura",
        variant: "destructive",
      });
      return;
    }

    if (!esVentaMostrador && !clienteId) {
      toast({
        title: "Cliente requerido",
        description: "Selecciona un cliente para la factura",
        variant: "destructive",
      });
      return;
    }

    setGenerando(true);
    try {
      let clienteIdFactura = clienteId;

      // Si es venta de mostrador, buscar o crear cliente PÚBLICO EN GENERAL
      if (esVentaMostrador) {
        const { data: clientePublico, error: errorBuscar } = await supabase
          .from("clientes")
          .select("id")
          .eq("rfc", RFC_PUBLICO_GENERAL)
          .single();

        if (errorBuscar || !clientePublico) {
          toast({
            title: "Error",
            description: "No se encontró el cliente PÚBLICO EN GENERAL. Créalo primero.",
            variant: "destructive",
          });
          setGenerando(false);
          return;
        }
        clienteIdFactura = clientePublico.id;
      }

      const folio = await generarFolio();

      // Insertar factura (pedido_id es null para facturas directas)
      const { data: factura, error: errorFactura } = await supabase
        .from("facturas")
        .insert({
          folio,
          cliente_id: clienteIdFactura,
          pedido_id: null, // Factura directa sin pedido asociado
          subtotal: totales.subtotal,
          impuestos: totales.iva + totales.ieps,
          total: totales.total,
          uso_cfdi: usoCfdi,
          forma_pago: formaPago,
          metodo_pago: metodoPago,
          cfdi_estado: "pendiente",
          notas: esVentaMostrador ? "Venta de mostrador" : null,
        })
        .select()
        .single();

      if (errorFactura) throw errorFactura;

      // Insertar detalles de la factura (productos)
      const detalles = lineas.map((linea) => ({
        factura_id: factura.id,
        producto_id: linea.producto_id,
        cantidad: linea.cantidad,
        precio_unitario: linea.precio_unitario,
        subtotal: linea.subtotal,
      }));

      const { error: errorDetalles } = await supabase
        .from("factura_detalles")
        .insert(detalles);

      if (errorDetalles) throw errorDetalles;

      toast({
        title: "Factura creada",
        description: `Folio: ${folio}. Lista para timbrar.`,
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error creando factura:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la factura",
        variant: "destructive",
      });
    } finally {
      setGenerando(false);
    }
  };

  const productosFiltrados = productos.filter(
    (p) =>
      p.nombre.toLowerCase().includes(searchProducto.toLowerCase()) ||
      p.codigo?.toLowerCase().includes(searchProducto.toLowerCase())
  );

  const clienteSeleccionado = clientes.find((c) => c.id === clienteId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>Nueva Factura Directa</DialogTitle>
          <DialogDescription>
            Crea una factura sin pedido previo. Ideal para ventas de mostrador.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {/* Tipo de venta */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
            <div className="flex items-center gap-3">
              <Store className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label className="text-base">Venta de Mostrador</Label>
                <p className="text-sm text-muted-foreground">
                  RFC: XAXX010101000 - Público en General
                </p>
              </div>
            </div>
            <Switch checked={esVentaMostrador} onCheckedChange={setEsVentaMostrador} />
          </div>

          {/* Selección de cliente (si no es mostrador) */}
          {!esVentaMostrador && (
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={clienteId} onValueChange={setClienteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {loadingClientes ? (
                    <div className="p-2 text-center">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                    </div>
                  ) : (
                    clientes.map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        <div className="flex flex-col">
                          <span>{cliente.nombre}</span>
                          {cliente.rfc && (
                            <span className="text-xs text-muted-foreground font-mono">
                              {cliente.rfc}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {clienteSeleccionado && (
                <p className="text-sm text-muted-foreground">
                  RFC: {clienteSeleccionado.rfc || "Sin RFC"}
                </p>
              )}
            </div>
          )}

          {/* Datos CFDI */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Uso CFDI</Label>
              <Select value={usoCfdi} onValueChange={setUsoCfdi}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {USO_CFDI_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
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
                  {FORMA_PAGO_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
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
                  {METODO_PAGO_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Búsqueda de productos */}
          <div className="space-y-2">
            <Label>Agregar productos</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar producto por nombre o código..."
                value={searchProducto}
                onChange={(e) => setSearchProducto(e.target.value)}
                className="pl-10"
              />
            </div>
            {searchProducto && (
              <ScrollArea className="h-40 border rounded-md">
                <div className="p-2 space-y-1">
                  {productosFiltrados.slice(0, 10).map((producto) => (
                    <button
                      key={producto.id}
                      onClick={() => agregarProducto(producto)}
                      className="w-full text-left p-2 hover:bg-muted rounded-md flex justify-between items-center"
                    >
                      <div>
                        <span className="font-medium">{producto.nombre}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          ({producto.codigo})
                        </span>
                      </div>
                      <Badge variant="outline">
                        ${producto.precio_venta?.toLocaleString("es-MX", {
                          minimumFractionDigits: 2,
                        }) || "0.00"}
                      </Badge>
                    </button>
                  ))}
                  {productosFiltrados.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">
                      No se encontraron productos
                    </p>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Tabla de líneas */}
          {lineas.length > 0 && (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="w-24">Cantidad</TableHead>
                    <TableHead className="w-32">Precio Unit.</TableHead>
                    <TableHead className="w-32 text-right">Subtotal</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineas.map((linea) => (
                    <TableRow key={linea.id}>
                      <TableCell>
                        <span className="font-medium">{linea.nombre}</span>
                        <div className="flex gap-1 mt-1">
                          {linea.aplica_iva && (
                            <Badge variant="outline" className="text-xs">
                              IVA
                            </Badge>
                          )}
                          {linea.aplica_ieps && (
                            <Badge variant="outline" className="text-xs">
                              IEPS
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          value={linea.cantidad}
                          onChange={(e) =>
                            actualizarCantidad(linea.id, parseInt(e.target.value) || 1)
                          }
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={linea.precio_unitario}
                          onChange={(e) =>
                            actualizarPrecio(linea.id, parseFloat(e.target.value) || 0)
                          }
                          className="w-28"
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${linea.subtotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => eliminarLinea(linea.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Resumen de totales */}
          {lineas.length > 0 && (
            <div className="flex justify-end">
              <div className="w-64 space-y-2 p-4 border rounded-lg bg-muted/30">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>
                    ${totales.subtotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {totales.iva > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>IVA (16%):</span>
                    <span>
                      ${totales.iva.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                {totales.ieps > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>IEPS (8%):</span>
                    <span>
                      ${totales.ieps.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total:</span>
                  <span>
                    ${totales.total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={generando}>
            Cancelar
          </Button>
          <Button onClick={handleGenerarFactura} disabled={generando || lineas.length === 0}>
            {generando ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Crear Factura
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
