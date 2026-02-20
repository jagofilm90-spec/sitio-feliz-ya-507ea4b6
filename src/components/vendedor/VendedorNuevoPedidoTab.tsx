import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { calcularDesgloseImpuestos, redondear, obtenerPrecioUnitarioVenta } from "@/lib/calculos";
import { captureDeviceInfo, getPublicIP } from "@/lib/auditoria-pedidos";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle2, ExternalLink, FileEdit } from "lucide-react";

// Wizard components
import { StepIndicator } from "./pedido-wizard/StepIndicator";
import { PasoCliente } from "./pedido-wizard/PasoCliente";
import { PasoProductos } from "./pedido-wizard/PasoProductos";
import { PasoCredito } from "./pedido-wizard/PasoCredito";
import { PasoConfirmar } from "./pedido-wizard/PasoConfirmar";
import { SolicitudDescuentoDialog } from "./SolicitudDescuentoDialog";
import type { Cliente, Sucursal, Producto, LineaPedido, CartDraft, TotalesCalculados } from "./pedido-wizard/types";

// Storage key for persistent cart
const CART_STORAGE_KEY = 'vendedor_cart_draft';

interface Props {
  onPedidoCreado: () => void;
  onNavigateToVentas?: () => void;
}

interface PedidoCreadoInfo {
  folio: string;
  total: number;
  cliente: string;
}

export function VendedorNuevoPedidoTab({ onPedidoCreado, onNavigateToVentas }: Props) {
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
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  
  // Form state
  const [selectedClienteId, setSelectedClienteId] = useState("");
  const [selectedSucursalId, setSelectedSucursalId] = useState("");
  const [lineas, setLineas] = useState<LineaPedido[]>([]);
  const [terminoCredito, setTerminoCredito] = useState("contado");
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
  
  // Draft restoration flag
  const [hasDraft, setHasDraft] = useState(false);
  const [isRestoringDraft, setIsRestoringDraft] = useState(false);
  
  // Success confirmation dialog
  const [pedidoCreado, setPedidoCreado] = useState<PedidoCreadoInfo | null>(null);

  // ==================== Cart Persistence Functions ====================
  
  const saveCartDraft = useCallback(() => {
    if (isRestoringDraft || (lineas.length === 0 && !selectedClienteId)) {
      return;
    }
    
    const draft: CartDraft = {
      clienteId: selectedClienteId,
      sucursalId: selectedSucursalId,
      lineas: lineas.map(l => ({
        productoId: l.producto.id,
        cantidad: l.cantidad,
        precioLista: l.precioLista,
        precioUnitario: l.precioUnitario,
        descuento: l.descuento,
        requiereAutorizacion: l.requiereAutorizacion,
        autorizacionStatus: l.autorizacionStatus,
      })),
      terminoCredito,
      notas,
      savedAt: new Date().toISOString(),
    };
    
    sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(draft));
    setHasDraft(lineas.length > 0 || !!selectedClienteId);
  }, [lineas, selectedClienteId, selectedSucursalId, terminoCredito, notas, isRestoringDraft]);

  const loadCartDraft = useCallback((): CartDraft | null => {
    try {
      const saved = sessionStorage.getItem(CART_STORAGE_KEY);
      if (!saved) return null;
      return JSON.parse(saved) as CartDraft;
    } catch {
      return null;
    }
  }, []);

  const clearCartDraft = useCallback(() => {
    sessionStorage.removeItem(CART_STORAGE_KEY);
    setHasDraft(false);
  }, []);

  // ==================== Effects ====================

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedClienteId) {
      fetchSucursales(selectedClienteId);
      fetchProductosFrecuentes(selectedClienteId);
      if (!isRestoringDraft) {
        const cliente = clientes.find(c => c.id === selectedClienteId);
        if (cliente) {
          setTerminoCredito(cliente.termino_credito);
        }
      }
    } else {
      setSucursales([]);
      setSelectedSucursalId("");
      setTerminoCredito("contado");
      setProductosFrecuentes([]);
    }
  }, [selectedClienteId, clientes, isRestoringDraft]);

  // Auto-save cart on changes
  useEffect(() => {
    if (!loading) {
      saveCartDraft();
    }
  }, [saveCartDraft, loading]);

  // Restore cart on component mount
  useEffect(() => {
    if (loading || productos.length === 0) return;
    
    const draft = loadCartDraft();
    if (!draft || (draft.lineas.length === 0 && !draft.clienteId)) return;
    
    const savedTime = new Date(draft.savedAt).getTime();
    const now = Date.now();
    const fourHoursMs = 4 * 60 * 60 * 1000;
    
    if (now - savedTime > fourHoursMs) {
      clearCartDraft();
      return;
    }
    
    const restoredLineas: LineaPedido[] = [];
    draft.lineas.forEach(saved => {
      const producto = productos.find(p => p.id === saved.productoId);
      if (producto) {
        restoredLineas.push({
          producto,
          cantidad: saved.cantidad,
          precioLista: saved.precioLista,
          precioUnitario: saved.precioUnitario,
          descuento: saved.descuento,
          subtotal: saved.precioUnitario * saved.cantidad,
          requiereAutorizacion: saved.requiereAutorizacion,
          autorizacionStatus: saved.autorizacionStatus,
        });
      }
    });
    
    if (restoredLineas.length > 0 || draft.clienteId) {
      setIsRestoringDraft(true);
      
      toast.info("Borrador de pedido recuperado", {
        description: `${restoredLineas.length} producto(s) - guardado ${formatDistanceToNow(new Date(draft.savedAt), { locale: es, addSuffix: true })}`,
        action: {
          label: "Descartar",
          onClick: () => {
            clearCartDraft();
            setLineas([]);
            setSelectedClienteId("");
            setSelectedSucursalId("");
            setTerminoCredito("contado");
            setNotas("");
            setHasDraft(false);
            setStep(1);
            setCompletedSteps([]);
          }
        },
        duration: 8000,
      });
      
      setSelectedClienteId(draft.clienteId);
      setSelectedSucursalId(draft.sucursalId);
      setLineas(restoredLineas);
      setTerminoCredito(draft.terminoCredito);
      setNotas(draft.notas);
      setHasDraft(true);
      
      // If draft has client, start at step 2
      if (draft.clienteId && restoredLineas.length > 0) {
        setStep(2);
        setCompletedSteps([1]);
      }
      
      setTimeout(() => setIsRestoringDraft(false), 500);
    }
  }, [loading, productos]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // ==================== Product Actions ====================

  const agregarProducto = (producto: Producto) => {
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

    const precio = obtenerPrecioUnitarioVenta({
      precio_venta: producto.precio_venta,
      precio_por_kilo: producto.precio_por_kilo,
      peso_kg: producto.peso_kg
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
            session_draft_restored: hasDraft
          }
        }]);
      } catch (auditError) {
        console.error("Error creating audit log:", auditError);
      }

      // Clear draft and reset
      clearCartDraft();
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
    if (step < 4) {
      setCompletedSteps(prev => [...new Set([...prev, step])]);
      setStep((step + 1) as 1 | 2 | 3 | 4);
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep((step - 1) as 1 | 2 | 3 | 4);
    }
  };

  const handleStepClick = (targetStep: 1 | 2 | 3 | 4) => {
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
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      {/* Draft indicator */}
      {hasDraft && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg py-2">
          <FileEdit className="h-4 w-4" />
          <span>Borrador guardado automáticamente</span>
        </div>
      )}

      {/* Step Indicator */}
      <StepIndicator
        currentStep={step}
        completedSteps={completedSteps}
        onStepClick={handleStepClick}
      />

      {/* Step Content */}
      {step === 1 && (
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
      )}

      {step === 2 && (
        <PasoProductos
          productos={productos}
          productosFrecuentes={productosFrecuentes}
          lineas={lineas}
          loadingFrecuentes={loadingFrecuentes}
          onAgregarProducto={agregarProducto}
          onActualizarCantidad={actualizarCantidad}
          onActualizarDescuento={actualizarDescuento}
          onSolicitarAutorizacion={handleSolicitarAutorizacion}
          onMarcarParaRevision={marcarParaRevision}
          totales={totales}
          onNext={handleNextStep}
          onBack={handlePrevStep}
        />
      )}

      {step === 3 && (
        <PasoCredito
          terminoCredito={terminoCredito}
          notas={notas}
          clienteDefaultCredito={selectedCliente?.termino_credito || "contado"}
          totales={totales}
          onTerminoCreditoChange={setTerminoCredito}
          onNotasChange={setNotas}
          onNext={handleNextStep}
          onBack={handlePrevStep}
        />
      )}

      {step === 4 && (
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
    </div>
  );
}
