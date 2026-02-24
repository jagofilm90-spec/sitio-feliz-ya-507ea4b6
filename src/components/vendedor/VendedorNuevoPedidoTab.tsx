import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { formatCurrency, cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { calcularDesgloseImpuestos, redondear, obtenerPrecioUnitarioVenta } from "@/lib/calculos";
import { captureDeviceInfo, getPublicIP } from "@/lib/auditoria-pedidos";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle2, ExternalLink, FileEdit, Trash2, ArrowRight, Store, Clock } from "lucide-react";

// Wizard components
import { StepIndicator } from "./pedido-wizard/StepIndicator";
import { PasoCliente } from "./pedido-wizard/PasoCliente";
import { PasoProductosInline } from "./pedido-wizard/PasoProductosInline";
import { PasoConfirmar } from "./pedido-wizard/PasoConfirmar";
import { SolicitudDescuentoDialog } from "./SolicitudDescuentoDialog";
import type { Cliente, Sucursal, Producto, LineaPedido, TotalesCalculados } from "./pedido-wizard/types";


interface Props {
  onPedidoCreado: () => void;
  onNavigateToVentas?: () => void;
  preSelectedClienteId?: string;
  onHasActiveOrder?: (hasOrder: boolean) => void;
  saveDraftRef?: React.MutableRefObject<(() => Promise<void>) | null>;
}

interface PedidoCreadoInfo {
  folio: string;
  total: number;
  cliente: string;
}

export function VendedorNuevoPedidoTab({ onPedidoCreado, onNavigateToVentas, preSelectedClienteId, onHasActiveOrder, saveDraftRef }: Props) {
  // Data state
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [productosFrecuentes, setProductosFrecuentes] = useState<Producto[]>([]);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [loadingSucursales, setLoadingSucursales] = useState(false);
  const [loadingFrecuentes, setLoadingFrecuentes] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Wizard state
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  
  // Form state
  const [selectedClienteId, setSelectedClienteId] = useState("");
  const [selectedSucursalId, setSelectedSucursalId] = useState("");
  const [lineas, setLineas] = useState<LineaPedido[]>([]);
  const [terminoCredito, setTerminoCredito] = useState("");
  const [notas, setNotas] = useState("");
  const [requiereFactura, setRequiereFactura] = useState(false);

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
  
  
  // Success confirmation dialog
  const [pedidoCreado, setPedidoCreado] = useState<PedidoCreadoInfo | null>(null);

  // Borradores (drafts from DB)
  interface BorradorDB {
    id: string;
    folio: string;
    cliente_id: string;
    cliente_nombre: string;
    sucursal_nombre?: string;
    total: number;
    notas: string | null;
    created_at: string;
    updated_at: string;
    num_productos: number;
  }
  const [borradoresDB, setBorradoresDB] = useState<BorradorDB[]>([]);
  const [loadingBorradores, setLoadingBorradores] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);


  // ==================== Borradores ====================

  const fetchBorradoresDB = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("pedidos")
        .select(`
          id, folio, cliente_id, total, notas, created_at, updated_at,
          clientes!inner(nombre),
          cliente_sucursales(nombre),
          pedidos_detalles(id)
        `)
        .eq("vendedor_id", user.id)
        .eq("status", "borrador")
        .order("updated_at", { ascending: false });

      if (error) throw error;

      setBorradoresDB(
        (data || []).map((p: any) => ({
          id: p.id,
          folio: p.folio,
          cliente_id: p.cliente_id,
          cliente_nombre: p.clientes?.nombre || "—",
          sucursal_nombre: p.cliente_sucursales?.nombre,
          total: p.total || 0,
          notas: p.notas,
          created_at: p.created_at,
          updated_at: p.updated_at,
          num_productos: p.pedidos_detalles?.length || 0,
        }))
      );
    } catch (err) {
      console.error("Error fetching borradores:", err);
    } finally {
      setLoadingBorradores(false);
    }
  }, []);

  const handleDeleteBorrador = async () => {
    if (!deleteId) return;
    try {
      await supabase.from("pedidos_detalles").delete().eq("pedido_id", deleteId);
      await supabase.from("pedidos").delete().eq("id", deleteId);
      setBorradoresDB(prev => prev.filter(b => b.id !== deleteId));
      toast.success("Borrador eliminado");
    } catch (err) {
      console.error(err);
      toast.error("Error al eliminar borrador");
    } finally {
      setDeleteId(null);
    }
  };

  const [restoringDraftId, setRestoringDraftId] = useState<string | null>(null);

  const handleContinuarBorrador = async (borradorId: string, clienteId: string) => {
    try {
      setRestoringDraftId(borradorId);

      // 1. Load draft header
      const { data: pedido, error: pedidoError } = await supabase
        .from("pedidos")
        .select("id, sucursal_id, notas, termino_credito, requiere_factura")
        .eq("id", borradorId)
        .single();

      if (pedidoError) throw pedidoError;

      // 2. Load draft line items with product data
      const { data: detalles, error: detallesError } = await supabase
        .from("pedidos_detalles")
        .select(`
          id, producto_id, cantidad, precio_unitario, subtotal, notas_ajuste,
          productos!inner(id, codigo, nombre, especificaciones, marca, contenido_empaque, unidad, precio_venta, stock_actual, stock_minimo, aplica_iva, aplica_ieps, precio_por_kilo, peso_kg, descuento_maximo)
        `)
        .eq("pedido_id", borradorId);

      if (detallesError) throw detallesError;

      // 3. Set client (triggers sucursal/frecuentes fetch)
      setSelectedClienteId(clienteId);
      if (pedido.sucursal_id) {
        setSelectedSucursalId(pedido.sucursal_id);
      }
      setNotas(pedido.notas || "");
      setTerminoCredito(pedido.termino_credito || "contado");
      setRequiereFactura(pedido.requiere_factura || false);

      // 4. Build lineas from detalles
      const restoredLineas: LineaPedido[] = (detalles || []).map((d: any) => {
        const prod = d.productos as Producto;
        const descuento = prod.precio_venta - d.precio_unitario;
        return {
          producto: prod,
          cantidad: d.cantidad,
          precioLista: prod.precio_venta,
          precioUnitario: d.precio_unitario,
          descuento: Math.max(0, descuento),
          subtotal: d.subtotal,
          requiereAutorizacion: descuento > (prod.descuento_maximo || 0),
        };
      });
      setLineas(restoredLineas);

      // 5. Delete the draft from DB (it's now "in memory")
      await supabase.from("pedidos_detalles").delete().eq("pedido_id", borradorId);
      await supabase.from("pedidos").delete().eq("id", borradorId);
      setBorradoresDB(prev => prev.filter(b => b.id !== borradorId));

      // 6. Navigate to step 2
      setCompletedSteps([1]);
      setStep(2);

      toast.success("Borrador restaurado — continúa tu pedido");
    } catch (err) {
      console.error("Error restoring draft:", err);
      toast.error("Error al restaurar borrador");
    } finally {
      setRestoringDraftId(null);
    }
  };

  // ==================== Guardar Borrador en BD ====================

  const guardarBorradorEnDB = useCallback(async () => {
    if (lineas.length === 0 || !selectedClienteId) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      const totales = calcularTotales();
      const timestamp = Date.now().toString().slice(-6);
      const folio = `BOR-V-${timestamp}`;

      const { data: pedido, error: pedidoError } = await supabase
        .from("pedidos")
        .insert({
          folio,
          cliente_id: selectedClienteId,
          vendedor_id: user.id,
          sucursal_id: selectedSucursalId || null,
          fecha_pedido: new Date().toISOString(),
          subtotal: totales.subtotal,
          impuestos: totales.impuestos,
          total: totales.total,
          status: "borrador",
          notas: notas || null,
          termino_credito: terminoCredito as any,
          requiere_factura: requiereFactura,
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
        notas_ajuste: l.descuento > 0
          ? `Descuento: ${formatCurrency(l.descuento)}`
          : null
      }));

      const { error: detallesError } = await supabase
        .from("pedidos_detalles")
        .insert(detallesInsert);

      if (detallesError) throw detallesError;

      // Reset form
      setSelectedClienteId("");
      setSelectedSucursalId("");
      setLineas([]);
      setTerminoCredito("contado");
      setNotas("");
      setRequiereFactura(false);
      setStep(1);
      setCompletedSteps([]);

      toast.success("Borrador guardado exitosamente");
      fetchBorradoresDB();
    } catch (error: any) {
      console.error("Error saving draft:", error);
      toast.error(error.message || "Error al guardar borrador");
    }
  }, [selectedClienteId, selectedSucursalId, lineas, notas, terminoCredito, requiereFactura]);

  // Expose guardarBorrador to parent via ref
  useEffect(() => {
    if (saveDraftRef) {
      saveDraftRef.current = guardarBorradorEnDB;
    }
    return () => {
      if (saveDraftRef) {
        saveDraftRef.current = null;
      }
    };
  }, [guardarBorradorEnDB, saveDraftRef]);

  // ==================== Effects ====================

  useEffect(() => {
    fetchData();
    fetchBorradoresDB();
  }, []);

  useEffect(() => {
    if (selectedClienteId) {
      fetchSucursales(selectedClienteId);
      fetchProductosFrecuentes(selectedClienteId);
      const cliente = clientes.find(c => c.id === selectedClienteId);
      setTerminoCredito(cliente?.termino_credito || "contado");
    } else {
      setSucursales([]);
      setSelectedSucursalId("");
      setTerminoCredito("");
      setProductosFrecuentes([]);
    }
  }, [selectedClienteId, clientes]);

  // Auto-select pre-selected client
  useEffect(() => {
    if (preSelectedClienteId && clientes.length > 0 && !selectedClienteId) {
      const exists = clientes.find(c => c.id === preSelectedClienteId);
      if (exists) {
        setSelectedClienteId(preSelectedClienteId);
      }
    }
  }, [preSelectedClienteId, clientes]);

  // Notify parent about active order - only when there are products in cart
  useEffect(() => {
    if (!loading) {
      onHasActiveOrder?.(lineas.length > 0);
    }
  }, [loading, lineas.length]);

  // ==================== Data Fetching ====================

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: clientesData } = await supabase
        .from("clientes")
        .select("id, codigo, nombre, termino_credito, preferencia_facturacion, csf_archivo_url, zona:zonas(nombre, region)")
        .eq("vendedor_asignado", user.id)
        .eq("activo", true)
        .order("nombre");

      setClientes(clientesData || []);

      const { data: productosData } = await supabase
        .from("productos")
        .select("id, codigo, nombre, especificaciones, marca, contenido_empaque, unidad, precio_venta, stock_actual, stock_minimo, aplica_iva, aplica_ieps, precio_por_kilo, peso_kg, descuento_maximo")
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
    setLoadingSucursales(true);
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
    setLoadingSucursales(false);
  };

  const fetchProductosFrecuentes = async (clienteId: string) => {
    try {
      setLoadingFrecuentes(true);
      
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

      const { data: detallesData } = await supabase
        .from("pedidos_detalles")
        .select("producto_id")
        .in("pedido_id", pedidoIds);

      if (!detallesData || detallesData.length === 0) {
        setProductosFrecuentes([]);
        return;
      }

      const frecuencia: Record<string, number> = {};
      detallesData.forEach(d => {
        frecuencia[d.producto_id] = (frecuencia[d.producto_id] || 0) + 1;
      });

      const topProductoIds = Object.entries(frecuencia)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([id]) => id);

      const { data: productosFrec } = await supabase
        .from("productos")
        .select("id, codigo, nombre, especificaciones, marca, contenido_empaque, unidad, precio_venta, stock_actual, stock_minimo, aplica_iva, aplica_ieps, precio_por_kilo, peso_kg, descuento_maximo")
        .in("id", topProductoIds)
        .eq("activo", true);

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

  /**
   * Calcula subtotal correcto según tipo de precio:
   * - precio_por_kilo: cantidad × peso_kg × precio_por_kg
   * - precio por unidad: cantidad × precio_unitario
   */
  const calcularSubtotalLinea = (producto: Producto, cantidad: number, precioUnitario: number): number => {
    if (producto.precio_por_kilo && producto.peso_kg) {
      return redondear(cantidad * producto.peso_kg * precioUnitario);
    }
    return redondear(cantidad * precioUnitario);
  };

  // ==================== Product Actions ====================

  const agregarProducto = (producto: Producto, cantidadInicial: number = 1) => {
    const existe = lineas.find(l => l.producto.id === producto.id);
    if (existe) {
      actualizarCantidad(producto.id, existe.cantidad + 1);
      return;
    }

    if (producto.stock_actual <= 0) {
      toast.warning("Producto sin stock disponible", {
        description: "Se agregó al pedido. Se surtirá cuando haya disponibilidad.",
        duration: 4000,
      });
    }

    // For precio_por_kilo products, use raw $/kg price
    // For unit products, use obtenerPrecioUnitarioVenta (which is just precio_venta)
    const precio = producto.precio_por_kilo
      ? producto.precio_venta // raw $/kg
      : obtenerPrecioUnitarioVenta({
          precio_venta: producto.precio_venta,
          precio_por_kilo: producto.precio_por_kilo,
          peso_kg: producto.peso_kg
        });

    const qty = Math.max(1, cantidadInicial);
    const subtotal = calcularSubtotalLinea(producto, qty, precio);
    setLineas([...lineas, {
      producto,
      cantidad: qty,
      precioLista: precio,
      precioUnitario: precio,
      descuento: 0,
      subtotal,
      requiereAutorizacion: false,
    }]);
  };

  const actualizarCantidad = (productoId: string, cantidad: number) => {
    if (cantidad <= 0) {
      setLineas(lineas.filter(l => l.producto.id !== productoId));
      return;
    }

    setLineas(lineas.map(l => 
      l.producto.id === productoId 
        ? { ...l, cantidad, subtotal: calcularSubtotalLinea(l.producto, cantidad, l.precioUnitario) }
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
        subtotal: calcularSubtotalLinea(l.producto, l.cantidad, nuevoPrecio),
        requiereAutorizacion,
        autorizacionStatus: requiereAutorizacion ? l.autorizacionStatus : null,
        solicitudId: requiereAutorizacion ? l.solicitudId : undefined,
      };
    }));
  };

  const actualizarPrecio = (productoId: string, precio: number) => {
    setLineas(lineas.map(l => {
      if (l.producto.id !== productoId) return l;
      
      const descuento = l.precioLista - precio;
      const descuentoMaximo = l.producto.descuento_maximo || 0;
      const requiereAutorizacion = descuento > descuentoMaximo;
      
      return {
        ...l,
        precioUnitario: precio,
        descuento: Math.max(0, descuento),
        subtotal: calcularSubtotalLinea(l.producto, l.cantidad, precio),
        requiereAutorizacion,
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
        subtotal: calcularSubtotalLinea(l.producto, l.cantidad, precioAprobado),
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

  // ==================== Calculations ====================

  const calcularTotales = (): TotalesCalculados => {
    let subtotalNeto = 0;
    let totalIva = 0;
    let totalIeps = 0;
    let pesoTotalKg = 0;
    let totalUnidades = 0;
    let ahorroDescuentos = 0;

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
      
      const pesoUnitario = l.producto.peso_kg || 0;
      pesoTotalKg += l.cantidad * pesoUnitario;
      totalUnidades += l.cantidad;
      
      if (l.descuento > 0) {
        ahorroDescuentos += l.descuento * l.cantidad;
      }
    });

    return { 
      subtotal: redondear(subtotalNeto), 
      iva: redondear(totalIva),
      ieps: redondear(totalIeps),
      impuestos: redondear(totalIva + totalIeps), 
      total: redondear(subtotalNeto + totalIva + totalIeps),
      pesoTotalKg: redondear(pesoTotalKg),
      totalUnidades,
      ahorroDescuentos: redondear(ahorroDescuentos),
      productosConIva: lineas.filter(l => l.producto.aplica_iva).length,
      productosConIeps: lineas.filter(l => l.producto.aplica_ieps).length,
    };
  };

  // ==================== Submit ====================

  const handleSubmit = async () => {
    if (submitting) return;
    
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

    // Auto-mark products needing authorization as 'pendiente'
    const productosNecesitanAutorizacion = lineas.filter(
      l => l.requiereAutorizacion && l.autorizacionStatus !== 'aprobado'
    );
    if (productosNecesitanAutorizacion.length > 0) {
      setLineas(prev => prev.map(l => 
        l.requiereAutorizacion && l.autorizacionStatus !== 'aprobado'
          ? { ...l, autorizacionStatus: 'pendiente' as const }
          : l
      ));
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
          fecha_entrega_estimada: null,
          subtotal: totales.subtotal,
          impuestos: totales.impuestos,
          total: totales.total,
          status: lineas.some(l => l.requiereAutorizacion && l.autorizacionStatus === 'pendiente') 
            ? "por_autorizar" 
            : "pendiente",
          notas: notas || null,
          termino_credito: terminoCredito as any,
          requiere_factura: requiereFactura,
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
        notas_ajuste: l.descuento > 0 
          ? `Descuento: ${formatCurrency(l.descuento)} (máx: ${formatCurrency(l.producto.descuento_maximo || 0)})${l.autorizacionStatus === 'pendiente' ? ' [PENDIENTE REVISIÓN]' : l.autorizacionStatus === 'aprobado' ? ' [APROBADO]' : ''}`
          : null
      }));

      const { error: detallesError } = await supabase
        .from("pedidos_detalles")
        .insert(detallesInsert);

      if (detallesError) throw detallesError;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      
      const vendedorNombre = profile?.full_name || "Vendedor";
      const clienteNombre = selectedCliente?.nombre || "Cliente";

      // Notifications (fire and forget)
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

      try {
        await supabase.functions.invoke('send-push-notification', {
          body: {
            roles: ['secretaria'],
            title: '📦 Nuevo Pedido',
            body: `${vendedorNombre} → ${clienteNombre} - ${formatCurrency(totales.total)}`,
            data: { type: 'nuevo_pedido', pedido_id: pedido.id, folio }
          }
        });
      } catch (pushError) {
        console.error("Error sending push:", pushError);
      }

      try {
        await supabase.functions.invoke('send-secretary-notification', {
          body: {
            tipo: 'nuevo_pedido',
            pedidoId: pedido.id,
            folio,
            vendedor: vendedorNombre,
            cliente: clienteNombre,
            total: totales.total,
            requiereFactura: selectedCliente?.termino_credito !== 'contado'
          }
        });
      } catch (emailError) {
        console.error("Error sending email:", emailError);
      }

      try {
        await supabase.functions.invoke('send-client-notification', {
          body: {
            clienteId: selectedClienteId,
            tipo: 'pedido_confirmado',
            data: { pedidoFolio: folio, total: totales.total }
          }
        });
      } catch (clientEmailError) {
        console.error("Error sending client email:", clientEmailError);
      }

      // Audit log
      try {
        const deviceInfo = captureDeviceInfo();
        const ipAddress = await getPublicIP();
        
        await supabase.from("security_audit_log").insert([{
          user_id: user.id,
          action: "pedido_creado",
          table_name: "pedidos",
          record_id: pedido.id,
          ip_address: ipAddress,
          details: {
            folio,
            cliente_id: selectedClienteId,
            cliente_nombre: clienteNombre,
            total: totales.total,
            num_productos: lineas.length,
            termino_credito: terminoCredito,
            status_inicial: pedido.status,
            device: JSON.parse(JSON.stringify(deviceInfo)),
            session_draft_restored: false
          }
        }]);
      } catch (auditError) {
        console.error("Error creating audit log:", auditError);
      }

      // Reset form
      setSelectedClienteId("");
      setSelectedSucursalId("");
      setLineas([]);
      setTerminoCredito("contado");
      setNotas("");
      setRequiereFactura(false);
      setStep(1);
      setCompletedSteps([]);

      setPedidoCreado({
        folio,
        total: totales.total,
        cliente: clienteNombre,
      });

      onPedidoCreado();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Error al crear pedido");
    } finally {
      setSubmitting(false);
    }
  };

  // ==================== Navigation ====================

  const handleNextStep = () => {
    if (step < 3) {
      setCompletedSteps(prev => [...new Set([...prev, step])]);
      setStep((step + 1) as 1 | 2 | 3);
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep((step - 1) as 1 | 2 | 3);
    }
  };

  const handleStepClick = (targetStep: 1 | 2 | 3) => {
    if (completedSteps.includes(targetStep) || targetStep < step) {
      setStep(targetStep);
    }
  };

  // ==================== Render ====================

  if (loading) {
    return (
      <div className="space-y-6 p-4">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const totales = calcularTotales();
  const selectedCliente = clientes.find(c => c.id === selectedClienteId);
  const selectedSucursal = sucursales.find(s => s.id === selectedSucursalId);

  return (
    <div className={cn("mx-auto space-y-4", step === 2 ? "px-2" : "max-w-4xl p-4")}>

      {/* Step Indicator */}
      <StepIndicator
        currentStep={step}
        completedSteps={completedSteps}
        onStepClick={handleStepClick}
      />

      {/* Step Content */}
      {step === 1 && (
        <>
          <PasoCliente
            clientes={clientes}
            sucursales={sucursales}
            selectedClienteId={selectedClienteId}
            selectedSucursalId={selectedSucursalId}
            loading={loadingSucursales}
            onClienteChange={setSelectedClienteId}
            onSucursalChange={setSelectedSucursalId}
            onNext={handleNextStep}
          />

          {/* Borradores inline */}
          {!loadingBorradores && borradoresDB.length > 0 && (
            <div className="space-y-3 mt-6">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                <FileEdit className="h-4 w-4" />
                Pedidos en Borrador ({borradoresDB.length})
              </h3>
              {borradoresDB.map(b => (
                <Card key={b.id} className="border-l-4 border-l-muted-foreground/40">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Store className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="font-semibold text-sm truncate">{b.cliente_nombre}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-mono">{b.folio}</span>
                          <span>·</span>
                          <span>{b.num_productos} producto{b.num_productos !== 1 ? "s" : ""}</span>
                          <span>·</span>
                          <span className="font-semibold text-foreground">{formatCurrency(b.total)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <Clock className="h-3 w-3" />
                          <span>{formatDistanceToNow(new Date(b.updated_at), { locale: es, addSuffix: true })}</span>
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <Button size="sm" className="h-7 text-xs" disabled={restoringDraftId === b.id} onClick={() => handleContinuarBorrador(b.id, b.cliente_id)}>
                          {restoringDraftId === b.id ? "Cargando..." : "Continuar"} <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => setDeleteId(b.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {step === 2 && (
        <PasoProductosInline
          productos={productos}
          productosFrecuentes={productosFrecuentes}
          lineas={lineas}
          loadingFrecuentes={loadingFrecuentes}
          onAgregarProducto={agregarProducto}
          onActualizarCantidad={actualizarCantidad}
          onActualizarPrecio={actualizarPrecio}
          onSolicitarAutorizacion={handleSolicitarAutorizacion}
          onMarcarParaRevision={marcarParaRevision}
          totales={totales}
          terminoCredito={terminoCredito}
          notas={notas}
          clienteDefaultCredito={selectedCliente?.termino_credito || "contado"}
          clienteNombre={selectedCliente?.nombre}
          onTerminoCreditoChange={setTerminoCredito}
          onNotasChange={setNotas}
          onNext={handleNextStep}
          onBack={handlePrevStep}
        />
      )}

      {step === 3 && (
        <PasoConfirmar
          cliente={selectedCliente}
          sucursal={selectedSucursal}
          lineas={lineas}
          terminoCredito={terminoCredito}
          notas={notas}
          totales={totales}
          submitting={submitting}
          requiereFactura={requiereFactura}
          onRequiereFacturaChange={setRequiereFactura}
          onSubmit={handleSubmit}
          onBack={handlePrevStep}
        />
      )}

      {/* Discount Authorization Dialog */}
      <SolicitudDescuentoDialog
        open={solicitudDialogOpen}
        onOpenChange={setSolicitudDialogOpen}
        producto={productoParaSolicitud}
        clienteId={selectedClienteId}
        clienteNombre={selectedCliente?.nombre || ""}
        onAprobado={(productoId, precioAprobado) => {
          handleAutorizacionAprobada(productoId, precioAprobado);
          setSolicitudDialogOpen(false);
        }}
      />

      {/* Success Dialog */}
      <Dialog open={!!pedidoCreado} onOpenChange={() => setPedidoCreado(null)}>
        <DialogContent className="text-center">
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <DialogTitle className="text-2xl">¡Pedido Creado!</DialogTitle>
            <div className="space-y-1">
              <p className="text-lg font-semibold">{pedidoCreado?.folio}</p>
              <p className="text-muted-foreground">{pedidoCreado?.cliente}</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(pedidoCreado?.total || 0)}</p>
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button onClick={() => { setPedidoCreado(null); onNavigateToVentas?.(); }} className="w-full">
              <ExternalLink className="h-4 w-4 mr-2" />
              Ver mis pedidos
            </Button>
            <Button variant="outline" onClick={() => setPedidoCreado(null)} className="w-full">
              Crear otro pedido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete borrador confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar borrador?</AlertDialogTitle>
            <AlertDialogDescription>
              Este borrador se eliminará permanentemente. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBorrador} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
