import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
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
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// Wizard components
import { StepIndicator } from "./pedido-wizard/StepIndicator";
import { PasoCliente } from "./pedido-wizard/PasoCliente";
import { PasoProductosInline } from "./pedido-wizard/PasoProductosInline";
import { PasoConfirmar } from "./pedido-wizard/PasoConfirmar";
import { SolicitudDescuentoDialog } from "./SolicitudDescuentoDialog";
import { PedidoPrintTemplate, DatosPedidoPrint } from "@/components/pedidos/PedidoPrintTemplate";
import { HojaCargaUnificadaTemplate, DatosHojaCargaUnificada } from "@/components/pedidos/HojaCargaUnificadaTemplate";
import { getDisplayName } from "@/lib/productUtils";
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
  const [vendedorNombre, setVendedorNombre] = useState("Vendedor");
  const confirmPrintRef = useRef<HTMLDivElement>(null);

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
      const { error: detallesError } = await supabase
        .from("pedidos_detalles")
        .delete()
        .eq("pedido_id", deleteId);
      if (detallesError) throw detallesError;

      const { error: pedidoError } = await supabase
        .from("pedidos")
        .delete()
        .eq("id", deleteId)
        .eq("status", "borrador");
      if (pedidoError) throw pedidoError;

      setBorradoresDB(prev => prev.filter(b => b.id !== deleteId));
      toast.success("Borrador eliminado");
    } catch (err) {
      console.error(err);
      toast.error("No se pudo eliminar el borrador");
    } finally {
      setDeleteId(null);
    }
  };

  const [restoringDraftId, setRestoringDraftId] = useState<string | null>(null);

  const handleContinuarBorrador = async (borradorId: string, clienteId: string) => {
    try {
      setRestoringDraftId(borradorId);

      // 1) Cargar encabezado del borrador
      const { data: pedido, error: pedidoError } = await supabase
        .from("pedidos")
        .select("id, sucursal_id, notas, termino_credito, requiere_factura")
        .eq("id", borradorId)
        .single();

      if (pedidoError) throw pedidoError;

      // 2) Cargar líneas sin join para evitar perder filas por filtros de relación
      const { data: detalles, error: detallesError } = await supabase
        .from("pedidos_detalles")
        .select("id, producto_id, cantidad, precio_unitario, subtotal, notas_ajuste")
        .eq("pedido_id", borradorId);

      if (detallesError) throw detallesError;

      if (!detalles || detalles.length === 0) {
        toast.warning("Este borrador no tiene productos para continuar");
        return;
      }

      // 3) Hidratar productos de esas líneas (incluye fallback al catálogo ya cargado)
      const productoIds = Array.from(new Set(detalles.map((d: any) => d.producto_id)));

      const { data: productosDB, error: productosError } = await supabase
        .from("productos")
        .select("id, codigo, nombre, especificaciones, marca, contenido_empaque, unidad, precio_venta, stock_actual, stock_minimo, aplica_iva, aplica_ieps, precio_por_kilo, peso_kg, descuento_maximo")
        .in("id", productoIds);

      if (productosError) throw productosError;

      const productosMap = new Map<string, Producto>();
      (productosDB || []).forEach((p: any) => productosMap.set(p.id, p as Producto));
      productos.forEach((p) => {
        if (!productosMap.has(p.id)) productosMap.set(p.id, p);
      });

      // 4) Restaurar contexto del pedido
      setSelectedClienteId(clienteId);
      if (pedido.sucursal_id) {
        setSelectedSucursalId(pedido.sucursal_id);
      }
      setNotas(pedido.notas || "");
      setTerminoCredito(pedido.termino_credito || "contado");
      setRequiereFactura(pedido.requiere_factura || false);

      // 5) Construir líneas restauradas
      const restoredLineas: LineaPedido[] = (detalles || [])
        .map((d: any) => {
          const prod = productosMap.get(d.producto_id);
          if (!prod) return null;

          const precioLista = prod.precio_venta;
          const descuentoUnitario = Math.max(0, precioLista - d.precio_unitario);
          const requiereAutorizacion = descuentoUnitario > (prod.descuento_maximo || 0);

          let autorizacionStatus: LineaPedido["autorizacionStatus"] = null;
          if (d.notas_ajuste?.includes("[PENDIENTE REVISIÓN]")) autorizacionStatus = "pendiente";
          if (d.notas_ajuste?.includes("[APROBADO]")) autorizacionStatus = "aprobado";

          return {
            producto: prod,
            cantidad: d.cantidad,
            precioLista,
            precioUnitario: d.precio_unitario,
            descuento: descuentoUnitario,
            subtotal: d.subtotal,
            requiereAutorizacion,
            autorizacionStatus,
          } as LineaPedido;
        })
        .filter((l): l is LineaPedido => l !== null);

      if (restoredLineas.length === 0) {
        toast.error("No se pudieron cargar los productos del borrador");
        return;
      }

      setLineas(restoredLineas);

      // 6) Convertir borrador a pedido en memoria y evitar duplicados
      await supabase.from("pedidos_detalles").delete().eq("pedido_id", borradorId);
      await supabase.from("pedidos").delete().eq("id", borradorId);
      setBorradoresDB(prev => prev.filter(b => b.id !== borradorId));

      // 7) Navegar al paso de productos
      setCompletedSteps([1]);
      setStep(2);

      toast.success(`Borrador restaurado (${restoredLineas.length} producto${restoredLineas.length !== 1 ? "s" : ""})`);
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

      // Fetch vendor name
      const { data: profileData } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
      setVendedorNombre(profileData?.full_name || "Vendedor");

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
        if (l.producto.precio_por_kilo && l.producto.peso_kg) {
          ahorroDescuentos += l.descuento * l.cantidad * l.producto.peso_kg;
        } else {
          ahorroDescuentos += l.descuento * l.cantidad;
        }
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

      // === BACKGROUND TASKS (no bloquean la UI) ===
      // Ejecutar notificaciones, PDFs y emails en paralelo sin await
      const backgroundTasks = async () => {
        try {
          // 1. Notificaciones rápidas en paralelo (no dependen de PDF)
          const notifPromises = [
            Promise.resolve(supabase.from("notificaciones").insert({
              tipo: "nuevo_pedido_vendedor",
              titulo: `Nuevo pedido ${folio}`,
              descripcion: `${vendedorNombre} creó pedido para ${clienteNombre} - ${formatCurrency(totales.total)}`,
              pedido_id: pedido.id,
              leida: false,
            })).catch(e => console.error("Notif error:", e)),
            
          ];

          // Push y email a secretaria solo si NO requiere autorización
          // (si requiere, solo se notifica al admin)
          if (pedido.status !== "por_autorizar") {
            notifPromises.push(
              supabase.functions.invoke('send-push-notification', {
                body: {
                  roles: ['secretaria'],
                  title: '📦 Nuevo Pedido',
                  body: `${vendedorNombre} → ${clienteNombre} - ${formatCurrency(totales.total)}`,
                  data: { type: 'nuevo_pedido', pedido_id: pedido.id, folio }
                }
              }).catch(e => console.error("Push error:", e)),
              supabase.functions.invoke('send-secretary-notification', {
                body: {
                  tipo: 'nuevo_pedido',
                  pedidoId: pedido.id,
                  folio,
                  vendedor: vendedorNombre,
                  cliente: clienteNombre,
                  total: totales.total,
                  requiereFactura: selectedCliente?.termino_credito !== 'contado'
                }
              }).catch(e => console.error("Secretary email error:", e))
            );
          }

          // Push adicional a admin si requiere autorización
          if (pedido.status === "por_autorizar") {
            notifPromises.push(
              supabase.functions.invoke('send-push-notification', {
                body: {
                  roles: ['admin'],
                  title: '🔔 Solicitud de autorización de precio',
                  body: `${vendedorNombre} solicita autorización — ${folio} · ${clienteNombre} · ${formatCurrency(totales.total)}`,
                  data: { type: 'solicitud_autorizacion', pedido_id: pedido.id, folio }
                }
              }).catch(e => console.error("Push admin auth error:", e))
            );
          }

          // 2. Generar PDFs en paralelo con las notificaciones
          const datosPrintFinal: DatosPedidoPrint = {
            pedidoId: pedido.id,
            folio,
            numeroDia: pedido.numero_dia,
            fecha: new Date().toISOString(),
            vendedor: vendedorNombre,
            terminoCredito: terminoCredito === 'contado' ? 'Contado' : terminoCredito.replace('_', ' '),
            cliente: {
              nombre: selectedCliente?.nombre || "",
              telefono: (selectedCliente as any)?.telefono || undefined,
            },
            sucursal: (() => {
              const suc = sucursales.find(s => s.id === selectedSucursalId);
              return suc ? { nombre: suc.nombre, direccion: suc.direccion || undefined } : undefined;
            })(),
            productos: lineas.map(l => {
              const pesoKg = l.producto.peso_kg || 0;
              const pesoTotal = pesoKg > 0 ? l.cantidad * pesoKg : null;
              return {
                cantidad: l.cantidad,
                unidad: l.producto.unidad || 'pieza',
                descripcion: getDisplayName(l.producto),
                pesoTotal,
                precioUnitario: l.precioUnitario,
                importe: l.subtotal,
                precioPorKilo: !!l.producto.precio_por_kilo,
              };
            }),
            subtotal: totales.subtotal,
            iva: totales.iva,
            ieps: totales.ieps,
            total: totales.total,
            pesoTotalKg: totales.pesoTotalKg,
            notas: notas || undefined,
          };

          const renderToCanvas = async (element: React.ReactElement, scale = 3): Promise<HTMLCanvasElement> => {
            const container = document.createElement('div');
            container.style.position = 'absolute';
            container.style.left = '-9999px';
            container.style.top = '0';
            container.style.width = '8.5in';
            container.style.backgroundColor = '#ffffff';
            document.body.appendChild(container);

            const root = createRoot(container);
            flushSync(() => { root.render(element); });
            await new Promise(resolve => setTimeout(resolve, 500));

            const canvas = await html2canvas(container, {
              scale, useCORS: true, logging: false, backgroundColor: '#ffffff'
            });

            root.unmount();
            document.body.removeChild(container);
            return canvas;
          };

          const canvasToPage = (pdf: jsPDF, canvas: HTMLCanvasElement, useJpeg = false) => {
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const ratio = Math.min(pdfWidth / canvas.width, pdfHeight / canvas.height);
            const imgX = (pdfWidth - canvas.width * ratio) / 2;
            const format = useJpeg ? 'JPEG' : 'PNG';
            const imgData = useJpeg ? canvas.toDataURL('image/jpeg', 0.85) : canvas.toDataURL('image/png');
            pdf.addImage(imgData, format, imgX, 5, canvas.width * ratio, canvas.height * ratio);
          };

          const generatePdfFromTemplate = async (hideQR: boolean): Promise<string> => {
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
            // Internal PDF uses scale 2 + JPEG to keep file size small (~1-2MB vs ~10MB)
            const isInternal = !hideQR;
            const scale = isInternal ? 2 : 3;

            // Page 1: Remisión
            const canvas1 = await renderToCanvas(<PedidoPrintTemplate datos={datosPrintFinal} hideQR={hideQR} />, scale);
            canvasToPage(pdf, canvas1, isInternal);

            // For internal PDF (hideQR=false): add pages 2, 3, 4
            if (isInternal) {
              const datosHojaCarga: DatosHojaCargaUnificada = {
                pedidoId: pedido.id,
                folio,
                numeroDia: pedido.numero_dia,
                fecha: new Date().toISOString(),
                cliente: { nombre: selectedCliente?.nombre || "" },
                sucursal: (() => {
                  const suc = sucursales.find(s => s.id === selectedSucursalId);
                  return suc ? { nombre: suc.nombre, direccion: suc.direccion || undefined } : undefined;
                })(),
                direccionEntrega: (() => {
                  const suc = sucursales.find(s => s.id === selectedSucursalId);
                  return suc?.direccion || (selectedCliente as any)?.direccion || undefined;
                })(),
                productos: lineas.map(l => ({
                  cantidad: l.cantidad,
                  descripcion: getDisplayName(l.producto),
                  pesoTotal: (l.producto.peso_kg || 0) > 0 ? l.cantidad * (l.producto.peso_kg || 0) : null,
                  unidad: l.producto.unidad || 'PZA',
                })),
                pesoTotalKg: totales.pesoTotalKg,
                total: totales.total,
                notas: notas || undefined,
              };

              // Page 2: ORIGINAL (con QR)
              const canvas2 = await renderToCanvas(<HojaCargaUnificadaTemplate datos={datosHojaCarga} variante="ORIGINAL" />, scale);
              pdf.addPage();
              canvasToPage(pdf, canvas2, true);

              // Page 3: CLIENTE (sin QR)
              const canvas3 = await renderToCanvas(<HojaCargaUnificadaTemplate datos={datosHojaCarga} variante="CLIENTE" />, scale);
              pdf.addPage();
              canvasToPage(pdf, canvas3, true);

              // Page 4: ALMACÉN (sin QR)
              const canvas4 = await renderToCanvas(<HojaCargaUnificadaTemplate datos={datosHojaCarga} variante="ALMACÉN" />, scale);
              pdf.addPage();
              canvasToPage(pdf, canvas4, true);
            }

            return pdf.output('datauristring').split(',')[1];
          };

          // Generar ambos PDFs en paralelo
          console.log("[PDF] Generating internal (4-page) and client PDFs...");
          const pdfPromise = Promise.all([
            generatePdfFromTemplate(false).then(b64 => { console.log(`[PDF] Internal PDF size: ${(b64.length / 1024 / 1024).toFixed(2)}MB`); return b64; }),
            generatePdfFromTemplate(true).then(b64 => { console.log(`[PDF] Client PDF size: ${(b64.length / 1024 / 1024).toFixed(2)}MB`); return b64; }),
          ]).catch(e => { console.error("PDF gen error:", e); return [null, null] as (string | null)[]; });

          // Esperar notificaciones y PDFs en paralelo
          const [, pdfResults] = await Promise.all([
            Promise.all(notifPromises),
            pdfPromise,
          ]);

          const [pdfBase64, clientPdfBase64] = pdfResults || [null, null];

          // 3. Enviar emails con PDFs adjuntos en paralelo
          const sucursalObj = sucursales.find(s => s.id === selectedSucursalId);
          const direccionEntrega = sucursalObj?.direccion || selectedCliente?.zona?.nombre || "No especificada";

          const emailPromises: Promise<any>[] = [];

          // Email interno solo si no requiere autorización
          // (cuando se autorice, PedidosPorAutorizarTab lo enviará)
          const esPorAutorizarFinal = pedido.status === "por_autorizar";
          if (!esPorAutorizarFinal) {
          console.log(`[Email] Sending internal email, PDF attached: ${!!pdfBase64}, size: ${pdfBase64 ? (pdfBase64.length / 1024 / 1024).toFixed(2) + 'MB' : 'none'}`);
          emailPromises.push(
            supabase.functions.invoke("enviar-pedido-interno", {
              body: {
                folio,
                clienteNombre,
                vendedorNombre,
                terminoCredito,
                direccionEntrega,
                total: totales.total,
                pedidoId: pedido.id,
                pdfBase64: pdfBase64 || undefined,
                pdfFilename: `Pedido_${folio}.pdf`,
              }
            }).then(res => {
              if (res.error) console.error("Internal email invoke error:", res.error);
              else console.log("[Email] Internal email sent successfully");
            }).catch(e => console.error("Internal email error:", e))
          );
          } // cierre if (!esPorAutorizarFinal)

          // Email al cliente solo si no requiere autorización
          const esPorAutorizar = lineas.some(l => l.requiereAutorizacion && l.autorizacionStatus === 'pendiente');
          if (!esPorAutorizar) {
            emailPromises.push(
              supabase.functions.invoke('send-client-notification', {
                body: {
                  clienteId: selectedClienteId,
                  tipo: 'pedido_confirmado',
                  data: { pedidoFolio: folio, total: totales.total },
                  pdfBase64: clientPdfBase64 || undefined,
                  pdfFilename: `Pedido_${folio}.pdf`,
                }
              }).then(({ data: notifResponse }) => {
                if (notifResponse?.whatsapp?.sent) {
                  toast.success("📱 WhatsApp enviado al cliente");
                }
              }).catch(e => console.error("Client email error:", e))
            );
          }

          // Audit log
          emailPromises.push(
            (async () => {
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
              } catch (e) {
                console.error("Audit log error:", e);
              }
            })()
          );

          await Promise.all(emailPromises);
        } catch (bgError) {
          console.error("Background tasks error:", bgError);
        }
      };

      // Lanzar tareas en background SIN bloquear la UI
      backgroundTasks();

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
          vendedorNombre={vendedorNombre}
          printRef={confirmPrintRef}
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
