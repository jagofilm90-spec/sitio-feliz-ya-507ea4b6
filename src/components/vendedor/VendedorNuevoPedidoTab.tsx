import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { guardarBorradorOffline, obtenerBorradoresOffline, eliminarBorradorOffline, guardarPedidoPendiente, type BorradorOffline } from "@/lib/offlineQueue";
import { Dialog, DialogContent, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { formatCurrency, cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { redondear, obtenerPrecioUnitarioVenta } from "@/lib/calculos";
import { calcularTotalesPedido } from "@/lib/pedidoUtils";
import { captureDeviceInfo, getPublicIP } from "@/lib/auditoria-pedidos";

import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle2, ExternalLink, FileEdit, Trash2, ArrowRight, Store, Clock } from "lucide-react";
// Wizard components (4-step version)
import { StepIndicator } from "./pedido-wizard/StepIndicator";
import { PasoCliente } from "./pedido-wizard/PasoCliente";
import { PasoProductosInline } from "./pedido-wizard/PasoProductosInline";
import { PasoCantidadesPrecios } from "./pedido-wizard/PasoCantidadesPrecios";
import { PasoConfirmar } from "./pedido-wizard/PasoConfirmar";
import { SolicitudDescuentoDialog } from "./SolicitudDescuentoDialog";
import { DatosPedidoPrint } from "@/components/pedidos/PedidoPrintTemplate";
import { getDisplayName } from "@/lib/productUtils";
import type { ClienteConFrecuencia, Sucursal, Producto, LineaPedido, TotalesCalculados, UltimoPrecioCliente } from "./pedido-wizard/types";
import { PageHeader } from "@/components/layout/PageHeader";

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

const AUTOSAVE_DELAY = 1500; // 1.5 seconds

export function VendedorNuevoPedidoTab({ onPedidoCreado, onNavigateToVentas, preSelectedClienteId, onHasActiveOrder, saveDraftRef }: Props) {
  // Data state
  const [clientes, setClientes] = useState<ClienteConFrecuencia[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [productosFrecuentes, setProductosFrecuentes] = useState<Producto[]>([]);
  const [ultimosPrecios, setUltimosPrecios] = useState<Map<string, UltimoPrecioCliente>>(new Map());

  // Loading states
  const [loading, setLoading] = useState(true);
  const [loadingSucursales, setLoadingSucursales] = useState(false);
  const [loadingFrecuentes, setLoadingFrecuentes] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Wizard state (4 steps)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Form state
  const [selectedClienteId, setSelectedClienteId] = useState("");
  const [selectedSucursalId, setSelectedSucursalId] = useState("");
  const [lineas, setLineas] = useState<LineaPedido[]>([]);
  const [terminoCredito, setTerminoCredito] = useState("");
  const [notas, setNotas] = useState("");
  const [notasEntrega, setNotasEntrega] = useState("");
  const [requiereFactura, setRequiereFactura] = useState(false);
  const [vendedorNombre, setVendedorNombre] = useState("Vendedor");

  // Discount authorization dialog
  const [solicitudDialogOpen, setSolicitudDialogOpen] = useState(false);
  const [productoParaSolicitud, setProductoParaSolicitud] = useState<{
    id: string; codigo: string; nombre: string; precioLista: number;
    descuentoMaximo: number; precioSolicitado: number; cantidad: number;
  } | null>(null);

  // Success confirmation dialog
  const [pedidoCreado, setPedidoCreado] = useState<PedidoCreadoInfo | null>(null);

  // ── Autosave borrador state ──
  const [borradorId, setBorradorId] = useState<string | null>(null);
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ── Borradores list ──
  interface BorradorDB {
    id: string; folio: string; cliente_id: string; cliente_nombre: string;
    sucursal_nombre?: string; total: number; notas: string | null;
    created_at: string; updated_at: string; num_productos: number;
  }
  const [borradoresDB, setBorradoresDB] = useState<BorradorDB[]>([]);
  const [borradoresOffline, setBorradoresOffline] = useState<BorradorOffline[]>([]);
  const [loadingBorradores, setLoadingBorradores] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [restoringDraftId, setRestoringDraftId] = useState<string | null>(null);

  // ==================== Borradores ====================

  const fetchBorradoresDB = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from("pedidos")
        .select(`id, folio, cliente_id, total, notas, created_at, updated_at,
          clientes!inner(nombre), cliente_sucursales(nombre), pedidos_detalles(id)`)
        .eq("vendedor_id", user.id)
        .eq("status", "borrador")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      setBorradoresDB(
        (data || []).map((p: any) => ({
          id: p.id, folio: p.folio, cliente_id: p.cliente_id,
          cliente_nombre: p.clientes?.nombre || "—",
          sucursal_nombre: p.cliente_sucursales?.nombre,
          total: p.total || 0, notas: p.notas,
          created_at: p.created_at, updated_at: p.updated_at,
          num_productos: p.pedidos_detalles?.length || 0,
        }))
      );
    } catch (err) {
      console.error("Error fetching borradores:", err);
    }

    // Also load offline borradores from IndexedDB
    try {
      const offline = await obtenerBorradoresOffline();
      setBorradoresOffline(offline);
    } catch { /* IndexedDB may not be available */ }

    setLoadingBorradores(false);
  }, []);

  const handleDeleteBorrador = async () => {
    if (!deleteId) return;
    try {
      await supabase.from("pedidos_detalles").delete().eq("pedido_id", deleteId);
      await supabase.from("pedidos").delete().eq("id", deleteId).eq("status", "borrador");
      setBorradoresDB(prev => prev.filter(b => b.id !== deleteId));
      if (borradorId === deleteId) setBorradorId(null);
      toast.success("Borrador eliminado");
    } catch (err) {
      console.error(err);
      toast.error("No se pudo eliminar el borrador");
    } finally {
      setDeleteId(null);
    }
  };

  // Restore borrador — loads data into memory but KEEPS the borrador in DB
  // (only deleted after successful submit)
  const handleContinuarBorrador = async (borId: string, clienteId: string) => {
    try {
      setRestoringDraftId(borId);
      const { data: pedido } = await supabase
        .from("pedidos")
        .select("id, sucursal_id, notas, termino_credito, requiere_factura, notas_entrega")
        .eq("id", borId).single();
      if (!pedido) throw new Error("Borrador no encontrado");

      const { data: detalles } = await supabase
        .from("pedidos_detalles")
        .select("id, producto_id, cantidad, precio_unitario, subtotal, notas_ajuste")
        .eq("pedido_id", borId);
      if (!detalles || detalles.length === 0) {
        toast.warning("Este borrador no tiene productos para continuar");
        return;
      }

      const productoIds = Array.from(new Set(detalles.map((d: any) => d.producto_id)));
      const { data: productosDB } = await supabase
        .from("productos")
        .select("id, codigo, nombre, especificaciones, marca, contenido_empaque, unidad, precio_venta, stock_actual, stock_minimo, aplica_iva, aplica_ieps, precio_por_kilo, peso_kg, descuento_maximo")
        .in("id", productoIds);

      const productosMap = new Map<string, Producto>();
      (productosDB || []).forEach((p: any) => productosMap.set(p.id, p as Producto));
      productos.forEach((p) => { if (!productosMap.has(p.id)) productosMap.set(p.id, p); });

      setSelectedClienteId(clienteId);
      if (pedido.sucursal_id) setSelectedSucursalId(pedido.sucursal_id);
      setNotas(pedido.notas || "");
      setNotasEntrega((pedido as any).notas_entrega || "");
      setTerminoCredito(pedido.termino_credito || "contado");
      setRequiereFactura(pedido.requiere_factura || false);

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
            producto: prod, cantidad: d.cantidad, precioLista,
            precioUnitario: d.precio_unitario, descuento: descuentoUnitario,
            subtotal: d.subtotal, requiereAutorizacion, autorizacionStatus,
          } as LineaPedido;
        })
        .filter((l): l is LineaPedido => l !== null);

      if (restoredLineas.length === 0) {
        toast.error("No se pudieron cargar los productos del borrador");
        return;
      }

      setLineas(restoredLineas);
      setBorradorId(borId); // Keep reference — DON'T delete from DB
      setBorradoresDB(prev => prev.filter(b => b.id !== borId));
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

  // ── Autosave with debounce 1.5s ──

  const saveBorradorToDB = useCallback(async () => {
    if (lineas.length === 0 && !selectedClienteId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const tots = (() => {
        let sub = 0;
        lineas.forEach(l => { sub += l.subtotal; });
        return { total: redondear(sub) };
      })();

      if (borradorId) {
        // UPDATE existing borrador
        await supabase.from("pedidos").update({
          cliente_id: selectedClienteId || undefined,
          sucursal_id: selectedSucursalId || null,
          total: tots.total,
          notas: notas || null,
          notas_entrega: notasEntrega || null,
          termino_credito: terminoCredito as any,
          requiere_factura: requiereFactura,
          updated_at: new Date().toISOString(),
        } as any).eq("id", borradorId);

        // Replace detalles (DELETE + INSERT — simplest, no diff needed)
        await supabase.from("pedidos_detalles").delete().eq("pedido_id", borradorId);
        if (lineas.length > 0) {
          await supabase.from("pedidos_detalles").insert(
            lineas.map(l => ({
              pedido_id: borradorId,
              producto_id: l.producto.id,
              cantidad: l.cantidad,
              precio_unitario: l.precioUnitario,
              subtotal: l.subtotal,
              notas_ajuste: l.descuento > 0
                ? `Descuento: ${formatCurrency(l.descuento)}${l.autorizacionStatus === 'pendiente' ? ' [PENDIENTE REVISIÓN]' : l.autorizacionStatus === 'aprobado' ? ' [APROBADO]' : ''}`
                : null,
            }))
          );
        }
      } else {
        // INSERT new borrador
        if (!selectedClienteId) return; // need at least a client to create
        const folio = `BOR-V-${Date.now().toString().slice(-6)}`;
        const { data: pedido, error } = await supabase
          .from("pedidos")
          .insert({
            folio,
            cliente_id: selectedClienteId,
            vendedor_id: user.id,
            sucursal_id: selectedSucursalId || null,
            fecha_pedido: new Date().toISOString(),
            total: tots.total,
            status: "borrador",
            notas: notas || null,
            notas_entrega: notasEntrega || null,
            termino_credito: terminoCredito as any,
            requiere_factura: requiereFactura,
          } as any)
          .select("id")
          .single();

        if (error) throw error;
        if (!pedido) return;

        setBorradorId(pedido.id);

        if (lineas.length > 0) {
          await supabase.from("pedidos_detalles").insert(
            lineas.map(l => ({
              pedido_id: pedido.id,
              producto_id: l.producto.id,
              cantidad: l.cantidad,
              precio_unitario: l.precioUnitario,
              subtotal: l.subtotal,
            }))
          );
        }
      }
    } catch (err) {
      // Supabase failed — save to IndexedDB as offline borrador
      console.warn("Autosave offline fallback:", err);
      try {
        const clienteObj = clientes.find(c => c.id === selectedClienteId);
        // Use getSession (localStorage) — works offline unlike getUser (network)
        const { data: { session: offlineSession } } = await supabase.auth.getSession();
        await guardarBorradorOffline({
          id: borradorId || crypto.randomUUID(),
          updated_at: new Date().toISOString(),
          cliente_id: selectedClienteId,
          cliente_nombre: clienteObj?.nombre || "",
          sucursal_id: selectedSucursalId || null,
          vendedor_id: offlineSession?.user?.id || "",
          termino_credito: terminoCredito,
          notas, notas_entrega: notasEntrega,
          requiere_factura: requiereFactura,
          es_directo: false,
          step,
          lineas: lineas.map(l => ({
            producto_id: l.producto.id,
            producto_nombre: l.producto.nombre,
            cantidad: l.cantidad,
            precio_unitario: l.precioUnitario,
            precio_lista: l.precioLista,
          })),
        });
      } catch (offlineErr) {
        console.error("Offline save also failed:", offlineErr);
      }
    }
  }, [borradorId, selectedClienteId, selectedSucursalId, lineas, notas, notasEntrega, terminoCredito, requiereFactura, clientes, step]);

  // Autosave effect: triggers 1.5s after last change
  useEffect(() => {
    if (!selectedClienteId && lineas.length === 0) return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      saveBorradorToDB();
    }, AUTOSAVE_DELAY);
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [selectedClienteId, selectedSucursalId, lineas, terminoCredito, notas, notasEntrega, requiereFactura, saveBorradorToDB]);

  // Expose guardarBorrador to parent via ref
  useEffect(() => {
    if (saveDraftRef) {
      saveDraftRef.current = saveBorradorToDB;
    }
    return () => {
      if (saveDraftRef) saveDraftRef.current = null;
    };
  }, [saveBorradorToDB, saveDraftRef]);

  // ==================== Effects ====================

  useEffect(() => {
    fetchData();
    fetchBorradoresDB();
  }, []);

  useEffect(() => {
    if (selectedClienteId) {
      fetchSucursales(selectedClienteId);
      fetchProductosFrecuentes(selectedClienteId);
      fetchUltimosPreciosCliente(selectedClienteId);
      const cliente = clientes.find(c => c.id === selectedClienteId);
      setTerminoCredito(cliente?.termino_credito || "contado");
    } else {
      setSucursales([]);
      setSelectedSucursalId("");
      setTerminoCredito("");
      setProductosFrecuentes([]);
      setUltimosPrecios(new Map());
    }
  }, [selectedClienteId, clientes]);

  useEffect(() => {
    if (preSelectedClienteId && clientes.length > 0 && !selectedClienteId) {
      const exists = clientes.find(c => c.id === preSelectedClienteId);
      if (exists) setSelectedClienteId(preSelectedClienteId);
    }
  }, [preSelectedClienteId, clientes]);

  useEffect(() => {
    if (loading) return;
    const active = step > 1 || selectedClienteId !== "" || lineas.length > 0;
    onHasActiveOrder?.(active);
  }, [loading, step, selectedClienteId, lineas.length, onHasActiveOrder]);

  // ==================== Data Fetching ====================

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
      setVendedorNombre(profileData?.full_name || "Vendedor");

      // Fetch clients with frequency data
      const { data: clientesRaw } = await supabase
        .from("clientes")
        .select("id, codigo, nombre, direccion, termino_credito, preferencia_facturacion, csf_archivo_url, zona:zonas(nombre, region)")
        .eq("vendedor_asignado", user.id)
        .eq("activo", true)
        .order("nombre");

      // Get frequency data: count + last pedido date per client
      const { data: pedidosFreq } = await supabase
        .from("pedidos")
        .select("cliente_id, fecha_pedido")
        .eq("vendedor_id", user.id)
        .not("status", "in", '("borrador","cancelado")');

      const freqMap = new Map<string, { count: number; last: string | null }>();
      (pedidosFreq || []).forEach((p: any) => {
        const existing = freqMap.get(p.cliente_id);
        if (!existing) {
          freqMap.set(p.cliente_id, { count: 1, last: p.fecha_pedido });
        } else {
          existing.count++;
          if (!existing.last || p.fecha_pedido > existing.last) existing.last = p.fecha_pedido;
        }
      });

      const clientesEnriched: ClienteConFrecuencia[] = (clientesRaw || []).map((c: any) => ({
        ...c,
        numPedidos: freqMap.get(c.id)?.count || 0,
        ultimoPedidoFecha: freqMap.get(c.id)?.last || null,
      }));

      setClientes(clientesEnriched);

      const { data: productosData } = await supabase
        .from("productos")
        .select("id, codigo, nombre, especificaciones, marca, contenido_empaque, unidad, categoria, precio_venta, stock_actual, stock_minimo, aplica_iva, aplica_ieps, precio_por_kilo, peso_kg, descuento_maximo")
        .eq("activo", true)
        .neq("bloqueado_venta", true)
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
    if (data && data.length === 1) setSelectedSucursalId(data[0].id);
    setLoadingSucursales(false);
  };

  const fetchProductosFrecuentes = async (clienteId: string) => {
    try {
      setLoadingFrecuentes(true);
      const { data: pedidosData } = await supabase
        .from("pedidos").select("id")
        .eq("cliente_id", clienteId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (!pedidosData || pedidosData.length === 0) { setProductosFrecuentes([]); return; }

      const { data: detallesData } = await supabase
        .from("pedidos_detalles").select("producto_id")
        .in("pedido_id", pedidosData.map(p => p.id));
      if (!detallesData || detallesData.length === 0) { setProductosFrecuentes([]); return; }

      const frecuencia: Record<string, number> = {};
      detallesData.forEach(d => { frecuencia[d.producto_id] = (frecuencia[d.producto_id] || 0) + 1; });
      const topIds = Object.entries(frecuencia).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([id]) => id);

      const { data: productosFrec } = await supabase
        .from("productos")
        .select("id, codigo, nombre, especificaciones, marca, contenido_empaque, unidad, categoria, precio_venta, stock_actual, stock_minimo, aplica_iva, aplica_ieps, precio_por_kilo, peso_kg, descuento_maximo")
        .in("id", topIds)
        .eq("activo", true)
        .neq("bloqueado_venta", true);

      setProductosFrecuentes(topIds.map(id => productosFrec?.find(p => p.id === id)).filter(Boolean) as Producto[]);
    } catch (error) {
      console.error("Error fetching frequent products:", error);
      setProductosFrecuentes([]);
    } finally {
      setLoadingFrecuentes(false);
    }
  };

  // NEW: Fetch last price per product for the selected client
  const fetchUltimosPreciosCliente = async (clienteId: string) => {
    try {
      const { data } = await supabase
        .from("pedidos_detalles")
        .select("producto_id, precio_unitario, pedidos!inner(fecha_pedido, cliente_id, status)")
        .eq("pedidos.cliente_id", clienteId)
        .not("pedidos.status", "in", '("borrador","cancelado")')
        .order("pedidos(fecha_pedido)", { ascending: false });

      const map = new Map<string, UltimoPrecioCliente>();
      (data || []).forEach((d: any) => {
        if (!map.has(d.producto_id)) {
          map.set(d.producto_id, {
            productoId: d.producto_id,
            precio: d.precio_unitario,
            fecha: d.pedidos?.fecha_pedido || "",
          });
        }
      });
      setUltimosPrecios(map);
    } catch (err) {
      console.error("Error fetching last prices:", err);
    }
  };

  // ==================== Product Actions ====================

  const calcularSubtotalLinea = (producto: Producto, cantidad: number, precioUnitario: number): number => {
    if (producto.precio_por_kilo && producto.peso_kg) {
      return redondear(cantidad * producto.peso_kg * precioUnitario);
    }
    return redondear(cantidad * precioUnitario);
  };

  // Toggle a product in/out of the order (step 2)
  const toggleProducto = (producto: Producto) => {
    const exists = lineas.find(l => l.producto.id === producto.id);
    if (exists) {
      setLineas(lineas.filter(l => l.producto.id !== producto.id));
    } else {
      const precio = producto.precio_por_kilo
        ? producto.precio_venta
        : obtenerPrecioUnitarioVenta({ precio_venta: producto.precio_venta, precio_por_kilo: producto.precio_por_kilo, peso_kg: producto.peso_kg });
      const subtotal = calcularSubtotalLinea(producto, 1, precio);
      setLineas([...lineas, {
        producto, cantidad: 1, precioLista: precio, precioUnitario: precio,
        descuento: 0, subtotal, requiereAutorizacion: false,
      }]);
    }
  };

  const removeProducto = (productoId: string) => {
    setLineas(lineas.filter(l => l.producto.id !== productoId));
  };

  const actualizarCantidad = (productoId: string, cantidad: number) => {
    if (cantidad <= 0) { setLineas(lineas.filter(l => l.producto.id !== productoId)); return; }
    setLineas(lineas.map(l =>
      l.producto.id === productoId
        ? { ...l, cantidad, subtotal: calcularSubtotalLinea(l.producto, cantidad, l.precioUnitario) }
        : l
    ));
  };

  const actualizarPrecio = (productoId: string, precio: number) => {
    setLineas(lineas.map(l => {
      if (l.producto.id !== productoId) return l;
      const descuento = l.precioLista - precio;
      const descuentoMaximo = l.producto.descuento_maximo || 0;
      const requiereAutorizacion = descuento > descuentoMaximo;
      return {
        ...l, precioUnitario: precio, descuento: Math.max(0, descuento),
        subtotal: calcularSubtotalLinea(l.producto, l.cantidad, precio),
        requiereAutorizacion,
        autorizacionStatus: requiereAutorizacion ? l.autorizacionStatus : null,
        solicitudId: requiereAutorizacion ? l.solicitudId : undefined,
      };
    }));
  };

  const handleSolicitarAutorizacion = (linea: LineaPedido) => {
    setProductoParaSolicitud({
      id: linea.producto.id, codigo: linea.producto.codigo, nombre: linea.producto.nombre,
      precioLista: linea.precioLista, descuentoMaximo: linea.producto.descuento_maximo || 0,
      precioSolicitado: linea.precioUnitario, cantidad: linea.cantidad,
    });
    setSolicitudDialogOpen(true);
  };

  const handleAutorizacionAprobada = (productoId: string, precioAprobado: number) => {
    setLineas(lineas.map(l => {
      if (l.producto.id !== productoId) return l;
      return {
        ...l, precioUnitario: precioAprobado, descuento: l.precioLista - precioAprobado,
        subtotal: calcularSubtotalLinea(l.producto, l.cantidad, precioAprobado),
        requiereAutorizacion: false, autorizacionStatus: 'aprobado',
      };
    }));
  };

  const marcarParaRevision = (productoId: string) => {
    setLineas(lineas.map(l => l.producto.id !== productoId ? l : { ...l, autorizacionStatus: 'pendiente' }));
    toast.info("Producto marcado para revisión de precio");
  };

  // ==================== Calculations ====================

  const calcularTotales = (): TotalesCalculados => {
    const base = calcularTotalesPedido(
      lineas.map(l => ({ subtotal: l.subtotal, aplica_iva: l.producto.aplica_iva, aplica_ieps: l.producto.aplica_ieps, nombre: l.producto.nombre }))
    );
    let pesoTotalKg = 0, totalUnidades = 0, ahorroDescuentos = 0;
    lineas.forEach(l => {
      pesoTotalKg += l.cantidad * (l.producto.peso_kg || 0);
      totalUnidades += l.cantidad;
      if (l.descuento > 0) {
        ahorroDescuentos += l.producto.precio_por_kilo && l.producto.peso_kg
          ? l.descuento * l.cantidad * l.producto.peso_kg
          : l.descuento * l.cantidad;
      }
    });
    return {
      ...base,
      pesoTotalKg: redondear(pesoTotalKg), totalUnidades,
      ahorroDescuentos: redondear(ahorroDescuentos),
      productosConIva: lineas.filter(l => l.producto.aplica_iva).length,
      productosConIeps: lineas.filter(l => l.producto.aplica_ieps).length,
    };
  };

  // ==================== Submit ====================

  const handleSubmit = async () => {
    if (submitting) return;
    if (!selectedClienteId) { toast.error("Selecciona un cliente"); return; }
    if (sucursales.length > 0 && !selectedSucursalId) { toast.error("Selecciona una sucursal"); return; }
    if (lineas.length === 0) { toast.error("Agrega al menos un producto"); return; }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      const totales = calcularTotales();
      const { data: folio, error: folioError } = await supabase.rpc("generar_folio_pedido");
      if (folioError || !folio) throw new Error("Error generando folio: " + (folioError?.message || "sin respuesta"));

      // Build price alerts (informational — never blocks the order)
      const alertasPrec: Array<{
        producto_id: string; producto_nombre: string;
        tipo: 'bajo_piso' | 'error_dedo';
        precio_lista: number; precio_pactado: number; piso: number;
      }> = [];
      for (const l of lineas) {
        const piso = l.precioLista - (l.producto.descuento_maximo || 0);
        if (l.precioUnitario < piso) {
          alertasPrec.push({
            producto_id: l.producto.id,
            producto_nombre: l.producto.nombre,
            tipo: l.precioUnitario < l.precioLista * 0.5 ? 'error_dedo' : 'bajo_piso',
            precio_lista: l.precioLista,
            precio_pactado: l.precioUnitario,
            piso,
          });
        }
      }

      // ALL orders go as "pendiente" — never blocked by price
      const { data: pedido, error: pedidoError } = await supabase
        .from("pedidos")
        .insert({
          folio, cliente_id: selectedClienteId, vendedor_id: user.id,
          sucursal_id: selectedSucursalId || null,
          fecha_pedido: new Date().toISOString(), fecha_entrega_estimada: null,
          subtotal: totales.subtotal, impuestos: totales.impuestos, total: totales.total,
          status: "pendiente",
          notas: notas || null, notas_entrega: notasEntrega || null, es_directo: false,
          termino_credito: terminoCredito as any, requiere_factura: requiereFactura,
          peso_total_kg: totales.pesoTotalKg > 0 ? totales.pesoTotalKg : null,
          alertas_precio: alertasPrec.length > 0 ? alertasPrec : [],
        } as any)
        .select()
        .single();
      if (pedidoError) throw pedidoError;

      await supabase.from("pedidos_detalles").insert(
        lineas.map(l => ({
          pedido_id: pedido.id, producto_id: l.producto.id, cantidad: l.cantidad,
          precio_unitario: l.precioUnitario, subtotal: l.subtotal,
          notas_ajuste: l.descuento > 0
            ? `Descuento: ${formatCurrency(l.descuento)} (máx: ${formatCurrency(l.producto.descuento_maximo || 0)})${l.autorizacionStatus === 'pendiente' ? ' [PENDIENTE REVISIÓN]' : l.autorizacionStatus === 'aprobado' ? ' [APROBADO]' : ''}`
            : null
        }))
      );

      // DELETE borrador ONLY after successful submit
      if (borradorId) {
        await supabase.from("pedidos_detalles").delete().eq("pedido_id", borradorId);
        await supabase.from("pedidos").delete().eq("id", borradorId).eq("status", "borrador");
        setBorradorId(null);
      }

      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
      const vNombre = profile?.full_name || "Vendedor";
      const clienteNombre = clientes.find(c => c.id === selectedClienteId)?.nombre || "Cliente";

      // === BACKGROUND TASKS ===
      const backgroundTasks = async () => {
        try {
          const selectedCliente = clientes.find(c => c.id === selectedClienteId);

          const notifPromises: Promise<any>[] = [
            (supabase.from("notificaciones").insert({
              tipo: "nuevo_pedido_vendedor", titulo: `Nuevo pedido ${folio}`,
              descripcion: `${vNombre} creó pedido para ${clienteNombre} - ${formatCurrency(totales.total)}`,
              pedido_id: pedido.id, leida: false,
            }) as unknown as Promise<any>).catch(e => console.error("Notif error:", e)),
          ];

          // Push + email to secretaría (all orders are now "pendiente")
          notifPromises.push(
            supabase.functions.invoke('send-push-notification', {
              body: { roles: ['secretaria'], title: '📦 Nuevo Pedido',
                body: `${vNombre} → ${clienteNombre} - ${formatCurrency(totales.total)}`,
                data: { type: 'nuevo_pedido', pedido_id: pedido.id, folio } }
            }).catch(e => console.error("Push error:", e)),
            supabase.functions.invoke('send-secretary-notification', {
              body: { tipo: 'nuevo_pedido', pedidoId: pedido.id, folio, vendedor: vNombre,
                cliente: clienteNombre, total: totales.total,
                requiereFactura: selectedCliente?.termino_credito !== 'contado' }
            }).catch(e => console.error("Secretary email error:", e))
          );

          // Price alert notification to admin (José)
          if (alertasPrec.length > 0) {
            const alertDesc = alertasPrec.map(a =>
              `${a.producto_nombre}: ${formatCurrency(a.precio_pactado)} (lista ${formatCurrency(a.precio_lista)}, piso ${formatCurrency(a.piso)})`
            ).join("; ");
            const hasErrorDedo = alertasPrec.some(a => a.tipo === 'error_dedo');
            notifPromises.push(
              supabase.from("notificaciones").insert({
                tipo: "precio_modificado_admin",
                titulo: hasErrorDedo
                  ? `🚨 Precio sospechoso en ${folio}`
                  : `⚠️ Precio bajo piso en ${folio}`,
                descripcion: `${vNombre} → ${clienteNombre}: ${alertDesc}`,
                leida: false,
              }).catch(() => {}),
              supabase.functions.invoke('send-push-notification', {
                body: { roles: ['admin'],
                  title: hasErrorDedo ? `🚨 Precio sospechoso — ${folio}` : `⚠️ Bajo piso — ${folio}`,
                  body: `${vNombre} → ${clienteNombre}: ${alertasPrec.length} producto${alertasPrec.length > 1 ? 's' : ''} con precio bajo`,
                  data: { type: 'alerta_precio', pedido_id: pedido.id, folio } }
              }).catch(() => {})
            );
          }

          const datosPrintFinal: DatosPedidoPrint = {
            pedidoId: pedido.id, folio, numeroDia: pedido.numero_dia,
            fecha: new Date().toISOString(),
            vendedor: vNombre,
            terminoCredito: terminoCredito === 'contado' ? 'Contado' : terminoCredito.replace('_', ' '),
            cliente: { nombre: selectedCliente?.nombre || "", telefono: (selectedCliente as any)?.telefono },
            sucursal: (() => { const s = sucursales.find(s => s.id === selectedSucursalId); return s ? { nombre: s.nombre, direccion: s.direccion || undefined } : undefined; })(),
            productos: lineas.map(l => {
              const pesoKg = l.producto.peso_kg || 0;
              return { cantidad: l.cantidad, unidad: l.producto.unidad || 'pieza',
                descripcion: getDisplayName(l.producto), pesoTotal: pesoKg > 0 ? l.cantidad * pesoKg : null,
                precioUnitario: l.precioUnitario, importe: l.subtotal, precioPorKilo: !!l.producto.precio_por_kilo };
            }),
            subtotal: totales.subtotal, iva: totales.iva, ieps: totales.ieps,
            total: totales.total, pesoTotalKg: totales.pesoTotalKg, notas: notas || undefined,
          };

          const { generarNotaInternaPDF, generarConfirmacionClientePDF } = await import("@/lib/generarNotaPDF");
          const pdfPromise = Promise.all([
            generarNotaInternaPDF(datosPrintFinal).then(r => r.base64).catch(() => null),
            generarConfirmacionClientePDF(datosPrintFinal).then(r => r.base64).catch(() => null),
          ]).catch(() => [null, null] as (string | null)[]);

          const [, pdfResults] = await Promise.all([Promise.all(notifPromises), pdfPromise]);
          const [pdfBase64, clientPdfBase64] = pdfResults || [null, null];

          const sucursalObj = sucursales.find(s => s.id === selectedSucursalId);
          const direccionEntrega = sucursalObj?.direccion || selectedCliente?.zona?.nombre || "No especificada";
          const emailPromises: Promise<any>[] = [];

          // Internal email (always — no longer gated by por_autorizar)
          emailPromises.push(
            supabase.functions.invoke("enviar-pedido-interno", {
              body: {
                folio, clienteNombre, vendedorNombre: vNombre, terminoCredito, direccionEntrega,
                sucursalNombre: sucursalObj?.nombre, total: totales.total, subtotal: totales.subtotal,
                impuestos: totales.impuestos, fecha: new Date().toISOString(), pedidoId: pedido.id,
                productos: lineas.map(l => ({ cantidad: l.cantidad, unidad: l.producto.unidad || "pza", nombre: l.producto.nombre, precioUnitario: l.precioUnitario, importe: l.subtotal })),
                pdfBase64: pdfBase64 || undefined, pdfFilename: `Pedido_${folio}.pdf`,
              }
            }).catch(e => console.error("Internal email error:", e))
          );

          // Client notification (always)
          emailPromises.push(
            supabase.functions.invoke('send-client-notification', {
              body: { clienteId: selectedClienteId, tipo: 'pedido_confirmado',
                data: { pedidoFolio: folio, total: totales.total },
                pdfBase64: clientPdfBase64 || undefined, pdfFilename: `Pedido_${folio}.pdf` }
            }).catch(e => console.error("Client email error:", e))
          );

          emailPromises.push(
            (async () => {
              try {
                const deviceInfo = captureDeviceInfo();
                const ipAddress = await getPublicIP();
                await supabase.from("security_audit_log").insert([{
                  user_id: user.id, action: "pedido_creado", table_name: "pedidos", record_id: pedido.id,
                  ip_address: ipAddress,
                  details: { folio, cliente_id: selectedClienteId, cliente_nombre: clienteNombre,
                    total: totales.total, num_productos: lineas.length, termino_credito: terminoCredito,
                    status_inicial: pedido.status, device: JSON.parse(JSON.stringify(deviceInfo)) }
                }]);
              } catch (e) { console.error("Audit log error:", e); }
            })()
          );
          await Promise.all(emailPromises);
        } catch (bgError) {
          console.error("Background tasks error:", bgError);
        }
      };
      backgroundTasks();

      // Reset form
      setSelectedClienteId("");
      setSelectedSucursalId("");
      setLineas([]);
      setTerminoCredito("contado");
      setNotas("");
      setNotasEntrega("");
      setRequiereFactura(false);
      setStep(1);
      setCompletedSteps([]);

      onHasActiveOrder?.(false);
      setPedidoCreado({ folio, total: totales.total, cliente: clienteNombre });
      onPedidoCreado();
    } catch (error: any) {
      console.error("Error:", error);

      // Offline fallback: queue the order locally
      const isNetworkError = !navigator.onLine
        || error?.message?.includes("fetch")
        || error?.message?.includes("network")
        || error?.message?.includes("Failed to fetch")
        || error?.code === "PGRST301";

      if (isNetworkError) {
        try {
          // Use getSession (reads localStorage, works offline) instead of getUser (network request)
          const { data: { session } } = await supabase.auth.getSession();
          const authUserId = session?.user?.id || "";
          const totales = calcularTotales();
          const clienteNombre = clientes.find(c => c.id === selectedClienteId)?.nombre || "";
          await guardarPedidoPendiente({
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
            cliente_id: selectedClienteId,
            cliente_nombre: clienteNombre,
            sucursal_id: selectedSucursalId || null,
            vendedor_id: authUserId,
            termino_credito: terminoCredito,
            notas: notas || "",
            notas_entrega: notasEntrega || "",
            requiere_factura: requiereFactura,
            es_directo: false,
            lineas: lineas.map(l => ({
              producto_id: l.producto.id,
              producto_nombre: l.producto.nombre,
              cantidad: l.cantidad,
              precio_unitario: l.precioUnitario,
              precio_lista: l.precioLista,
              subtotal: l.subtotal,
              aplica_iva: l.producto.aplica_iva,
              aplica_ieps: l.producto.aplica_ieps,
            })),
            totales: {
              subtotal: totales.subtotal,
              iva: totales.iva,
              ieps: totales.ieps,
              total: totales.total,
              peso_total: totales.pesoTotalKg > 0 ? totales.pesoTotalKg : null,
            },
            status: "pendiente_sync",
            intentos_sync: 0,
            ultimo_error: null,
          });
          toast.info("Pedido guardado localmente. Se enviará al recuperar conexión.");
          // Reset wizard so Carlos can continue
          resetWizardState();
          onHasActiveOrder?.(false);
          fetchBorradoresDB();
        } catch (offlineErr) {
          console.error("Offline queue failed:", offlineErr);
          toast.error("Error guardando pedido. Intenta de nuevo.");
        }
      } else {
        toast.error(error.message || "Error al crear pedido");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ==================== Cancel Pedido ====================

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const resetWizardState = () => {
    setSelectedClienteId("");
    setSelectedSucursalId("");
    setLineas([]);
    setTerminoCredito("contado");
    setNotas("");
    setNotasEntrega("");
    setRequiereFactura(false);
    setBorradorId(null);
    setCompletedSteps([]);
    setStep(1);
    setCancelDialogOpen(false);
    onHasActiveOrder?.(false);
  };

  const handleGuardarYSalir = () => {
    resetWizardState();
    fetchBorradoresDB();
    toast.success("Borrador guardado");
  };

  const handleDescartarPedido = async () => {
    if (borradorId) {
      try {
        await supabase.from("pedidos_detalles").delete().eq("pedido_id", borradorId);
        await supabase.from("pedidos").delete().eq("id", borradorId).eq("status", "borrador");
      } catch (e) {
        console.error("Error deleting borrador on discard:", e);
      }
    }
    resetWizardState();
    fetchBorradoresDB();
    toast.success("Pedido descartado");
  };

  // ==================== Navigation ====================

  const handleNextStep = () => {
    if (step < 4) {
      setCompletedSteps(prev => [...new Set([...prev, step])]);
      setStep((step + 1) as 1 | 2 | 3 | 4);
    }
  };

  const handlePrevStep = () => {
    if (step > 1) setStep((step - 1) as 1 | 2 | 3 | 4);
  };

  const handleStepClick = (targetStep: 1 | 2 | 3 | 4) => {
    if (completedSteps.includes(targetStep) || targetStep < step) setStep(targetStep);
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
    <div className="flex flex-col h-[calc(100dvh-3.5rem)] md:h-auto md:min-h-[600px] overflow-hidden max-w-4xl mx-auto">
      {/* Fixed header area */}
      <div className={cn("shrink-0", step === 2 ? "px-2" : "px-4 pt-4")}>
        <PageHeader
          title="Nuevo pedido."
          lead="Captura rápida de orden"
        />

        <StepIndicator
          currentStep={step}
          completedSteps={completedSteps}
          onStepClick={handleStepClick}
        />
      </div>

      {/* Scrollable step content */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">

      {/* Step 1: Client */}
      {step === 1 && (
        <div className="flex-1 min-h-0 overflow-auto px-4 pb-4">
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

          {/* Borradores (Supabase + offline) */}
          {!loadingBorradores && (borradoresDB.length > 0 || borradoresOffline.length > 0) && (
            <div className="space-y-3 mt-6">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                <FileEdit className="h-4 w-4" />
                Pedidos en Borrador ({borradoresDB.length + borradoresOffline.length})
              </h3>

              {/* Offline borradores */}
              {borradoresOffline.map(b => (
                <Card key={`offline-${b.id}`} className="border-l-4 border-l-amber-400">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Store className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="font-semibold text-sm truncate">{b.cliente_nombre}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-amber-300 text-amber-700 bg-amber-50">
                            Offline
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{b.lineas.length} producto{b.lineas.length !== 1 ? "s" : ""}</span>
                          <span>·</span>
                          <span>Paso {b.step}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <Clock className="h-3 w-3" />
                          <span>{formatDistanceToNow(new Date(b.updated_at), { locale: es, addSuffix: true })}</span>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive" onClick={async () => {
                        await eliminarBorradorOffline(b.id);
                        setBorradoresOffline(prev => prev.filter(x => x.id !== b.id));
                        toast.success("Borrador offline eliminado");
                      }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Supabase borradores */}
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
        </div>
      )}

      {/* Step 2: Select products */}
      {step === 2 && (
        <PasoProductosInline
          productos={productos}
          productosFrecuentes={productosFrecuentes}
          lineas={lineas}
          onToggleProducto={toggleProducto}
          cliente={selectedCliente}
          sucursal={selectedSucursal}
          onNext={handleNextStep}
          onBack={handlePrevStep}
          onCancelar={() => setCancelDialogOpen(true)}
        />
      )}

      {/* Step 3: Quantities & prices */}
      {step === 3 && (
        <PasoCantidadesPrecios
          lineas={lineas}
          onActualizarCantidad={actualizarCantidad}
          onActualizarPrecio={actualizarPrecio}
          onRemoveProducto={removeProducto}
          cliente={selectedCliente}
          sucursal={selectedSucursal}
          terminoCredito={terminoCredito}
          onTerminoCreditoChange={setTerminoCredito}
          requiereFactura={requiereFactura}
          onRequiereFacturaChange={setRequiereFactura}
          notasEntrega={notasEntrega}
          onNotasEntregaChange={setNotasEntrega}
          totales={totales}
          ultimosPrecios={ultimosPrecios}
          onGoToStep2={() => { setCompletedSteps(prev => [...new Set([...prev, 3])]); setStep(2); }}
          onNext={handleNextStep}
          onBack={handlePrevStep}
          onCancelar={() => setCancelDialogOpen(true)}
        />
      )}

      {/* Step 4: Confirm */}
      {step === 4 && (
        <PasoConfirmar
          cliente={selectedCliente}
          sucursal={selectedSucursal}
          lineas={lineas}
          terminoCredito={terminoCredito}
          notasEntrega={notasEntrega}
          requiereFactura={requiereFactura}
          totales={totales}
          vendedorNombre={vendedorNombre}
          submitting={submitting}
          onSubmit={handleSubmit}
          onBack={handlePrevStep}
          onCancelar={() => setCancelDialogOpen(true)}
        />
      )}
      </div>{/* end scrollable step content */}

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
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
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

      {/* Cancel pedido confirmation — 3 options */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Salir del pedido?</AlertDialogTitle>
            <AlertDialogDescription>
              Tu progreso quedará guardado como borrador. Puedes retomarlo después desde el paso 1.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="sm:mr-auto">Volver al pedido</AlertDialogCancel>
            <Button variant="ghost" className="text-destructive hover:text-destructive text-sm" onClick={handleDescartarPedido}>
              Descartar pedido
            </Button>
            <AlertDialogAction onClick={handleGuardarYSalir} className="bg-crimson-500 hover:bg-crimson-600">
              Guardar y salir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
