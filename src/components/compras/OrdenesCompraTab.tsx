import { useState, useEffect, useMemo } from "react";
import { useUserRoles } from "@/hooks/useUserRoles";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Search, MoreVertical, Loader2, Truck, Send, CalendarCheck, CalendarX, RefreshCw, Calendar as CalendarIcon, Receipt, Check, CreditCard, Clock, FileCheck, Hash, Upload, ExternalLink, X, PackageX } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import OrdenAccionesDialog from "./OrdenAccionesDialog";
import ReenviarOCDialog from "./ReenviarOCDialog";
import AutorizacionOCDialog from "./AutorizacionOCDialog";
import OCAutorizadaAlert from "./OCAutorizadaAlert";
import EntregasPopover from "./EntregasPopover";
import ProveedorFacturasDialog from "./ProveedorFacturasDialog";
import { MarcarPagadoDialog } from "./MarcarPagadoDialog";
import { ProcesarPagoOCDialog } from "./ProcesarPagoOCDialog";
import CrearOrdenCompraWizard from "./CrearOrdenCompraWizard";
import NotificarCambiosOCDialog, { CambioDetectado } from "./NotificarCambiosOCDialog";
import { formatCurrency } from "@/lib/utils";
import { sendPushNotification } from "@/services/pushNotifications";
import { registrarCorreoEnviado } from "./HistorialCorreosOC";
import { COMPANY_DATA } from "@/constants/companyData";
import logoAlmasa from "@/assets/logo-almasa.png";
import { LiveIndicator } from "@/components/ui/live-indicator";

// Helper function to convert image to base64
const getLogoBase64 = async (): Promise<string> => {
  try {
    const response = await fetch(logoAlmasa);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error loading logo:', error);
    return '';
  }
};

interface ProductoEnOrden {
  producto_id: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  ultimo_costo?: number;
  subtotal: number;
  aplica_iva: boolean;
  aplica_ieps: boolean;
  precio_incluye_iva: boolean;
}

interface EntregaProgramada {
  numero_entrega: number;
  cantidad_bultos: number;
  fecha_programada: string;
}

const OrdenesCompraTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin } = useUserRoles();
  const [searchParams, setSearchParams] = useSearchParams();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [accionesDialogOpen, setAccionesDialogOpen] = useState(false);
  const [autorizacionDialogOpen, setAutorizacionDialogOpen] = useState(false);
  const [ordenSeleccionada, setOrdenSeleccionada] = useState<any>(null);
  const [reenviarDialogOpen, setReenviarDialogOpen] = useState(false);
  const [ordenParaReenvio, setOrdenParaReenvio] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingOrdenId, setEditingOrdenId] = useState<string | null>(null);
  
  // Form state
  const [tipoProveedor, setTipoProveedor] = useState<'catalogo' | 'manual'>('catalogo');
  const [proveedorId, setProveedorId] = useState("");
  const [proveedorNombreManual, setProveedorNombreManual] = useState("");
  const [proveedorTelefonoManual, setProveedorTelefonoManual] = useState("");
  const [notasProveedorManual, setNotasProveedorManual] = useState("");
  const [showProveedorSuggestions, setShowProveedorSuggestions] = useState(false);
  const [folio, setFolio] = useState("");
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [notas, setNotas] = useState("");
  const [productosEnOrden, setProductosEnOrden] = useState<ProductoEnOrden[]>([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [precioUnitario, setPrecioUnitario] = useState("");
  const [precioIncluyeIva, setPrecioIncluyeIva] = useState(false);
  const [generatingFolio, setGeneratingFolio] = useState(false);
  
  // Conversion precio por kg state
  const [usarPrecioPorKg, setUsarPrecioPorKg] = useState(false);
  const [precioPorKg, setPrecioPorKg] = useState("");
  const [kgPorUnidad, setKgPorUnidad] = useState("");
  
  // Auto-calculate precio unitario when using precio por kg
  const precioUnitarioCalculado = usarPrecioPorKg && precioPorKg && kgPorUnidad
    ? (parseFloat(precioPorKg) * parseFloat(kgPorUnidad)).toFixed(2)
    : "";
  
  // Multiple deliveries state
  const [entregasMultiples, setEntregasMultiples] = useState(false);
  const [bultosPorEntrega, setBultosPorEntrega] = useState("");
  const [entregasProgramadas, setEntregasProgramadas] = useState<EntregaProgramada[]>([]);
  
  // REMOVED: enviandoRecordatorioId state - confirmation system deprecated
  
  // Estado para envío de recordatorio
  const [enviandoRecordatorioId, setEnviandoRecordatorioId] = useState<string | null>(null);
  
  // Estado para dialog de facturas del proveedor
  const [facturasDialogOpen, setFacturasDialogOpen] = useState(false);
  const [ordenParaFacturas, setOrdenParaFacturas] = useState<any>(null);

  // Estado para dialog de marcar como pagado (anticipado)
  const [marcarPagadoDialogOpen, setMarcarPagadoDialogOpen] = useState(false);
  const [ordenParaPago, setOrdenParaPago] = useState<{
    id: string;
    folio: string;
    proveedor_id: string | null;
    proveedor_nombre: string;
    proveedor_email: string | null;
    total: number;
    monto_devoluciones?: number | null;
    total_ajustado?: number | null;
  } | null>(null);

  // Estado para dialog de procesar pago (OC completada)
  const [procesarPagoDialogOpen, setProcesarPagoDialogOpen] = useState(false);
  const [ordenParaProcesarPago, setOrdenParaProcesarPago] = useState<{
    id: string;
    folio: string;
    proveedor_id: string | null;
    proveedor_nombre: string;
    total: number;
    monto_devoluciones?: number | null;
    total_ajustado?: number | null;
    fecha_creacion?: string;
  } | null>(null);

  // Estado para modo "Por Vehículos"
  const [modoCreacion, setModoCreacion] = useState<'manual' | 'vehiculos'>('manual');
  const [numeroVehiculos, setNumeroVehiculos] = useState("");

  // Estado para tipo de pago
  const [tipoPago, setTipoPago] = useState<'contra_entrega' | 'anticipado'>('contra_entrega');
  const [statusPago, setStatusPago] = useState<'pendiente' | 'pagado'>('pendiente');
  const [fechaPago, setFechaPago] = useState("");
  const [referenciaPago, setReferenciaPago] = useState("");
  const [comprobantePagoUrl, setComprobantePagoUrl] = useState("");
  const [uploadingComprobante, setUploadingComprobante] = useState(false);

  // Estado para notificación de cambios post-edición
  const [notificarCambiosOpen, setNotificarCambiosOpen] = useState(false);
  const [cambiosDetectados, setCambiosDetectados] = useState<CambioDetectado[]>([]);
  const [ordenEditadaInfo, setOrdenEditadaInfo] = useState<{
    id: string;
    folio: string;
    proveedorId: string | null;
    proveedorNombre: string;
    statusAnterior: string;
  } | null>(null);
  const [ordenAnteriorSnapshot, setOrdenAnteriorSnapshot] = useState<{
    productosEnOrden: ProductoEnOrden[];
    fechaEntrega: string;
    entregasProgramadas: EntregaProgramada[];
  } | null>(null);

  // Estado para eliminar OC
  const [confirmarEliminacionOpen, setConfirmarEliminacionOpen] = useState(false);
  const [ordenParaEliminar, setOrdenParaEliminar] = useState<any>(null);
  const [eliminandoOrden, setEliminandoOrden] = useState(false);

  // Función para detectar cambios entre versión anterior y nueva de la OC
  const detectarCambiosOC = (
    anterior: { productosEnOrden: ProductoEnOrden[]; fechaEntrega: string; entregasProgramadas: EntregaProgramada[] },
    nuevo: { productosEnOrden: ProductoEnOrden[]; fechaEntrega: string; entregasProgramadas: EntregaProgramada[] }
  ): CambioDetectado[] => {
    const cambios: CambioDetectado[] = [];

    // Detectar cambios en fecha de entrega (única)
    if (anterior.fechaEntrega && nuevo.fechaEntrega && anterior.fechaEntrega !== nuevo.fechaEntrega) {
      const formatFecha = (f: string) => {
        if (!f) return '-';
        const [y, m, d] = f.split('-').map(Number);
        return new Date(y, m - 1, d).toLocaleDateString('es-MX');
      };
      cambios.push({
        tipo: 'fecha',
        descripcion: 'Fecha de entrega modificada',
        valorAnterior: formatFecha(anterior.fechaEntrega),
        valorNuevo: formatFecha(nuevo.fechaEntrega),
      });
    }

    // Detectar cambios en fechas de entregas múltiples
    if (anterior.entregasProgramadas.length > 0 || nuevo.entregasProgramadas.length > 0) {
      anterior.entregasProgramadas.forEach(ea => {
        const en = nuevo.entregasProgramadas.find(e => e.numero_entrega === ea.numero_entrega);
        if (en && ea.fecha_programada !== en.fecha_programada) {
          const formatFecha = (f: string) => {
            if (!f) return 'Sin fecha';
            const [y, m, d] = f.split('-').map(Number);
            return new Date(y, m - 1, d).toLocaleDateString('es-MX');
          };
          cambios.push({
            tipo: 'fecha',
            descripcion: `Entrega #${ea.numero_entrega}: fecha modificada`,
            valorAnterior: formatFecha(ea.fecha_programada),
            valorNuevo: formatFecha(en.fecha_programada),
          });
        }
      });
    }

    // Crear mapas de productos por ID para comparación
    const productosAnteriores = new Map(anterior.productosEnOrden.map(p => [p.producto_id, p]));
    const productosNuevos = new Map(nuevo.productosEnOrden.map(p => [p.producto_id, p]));

    // Detectar productos eliminados
    anterior.productosEnOrden.forEach(pa => {
      if (!productosNuevos.has(pa.producto_id)) {
        cambios.push({
          tipo: 'producto_eliminado',
          producto: pa.nombre,
          descripcion: `Producto eliminado: ${pa.nombre}`,
          valorAnterior: `${pa.cantidad} unidades`,
          valorNuevo: '0',
        });
      }
    });

    // Detectar productos agregados y cambios en cantidad/precio
    nuevo.productosEnOrden.forEach(pn => {
      const pa = productosAnteriores.get(pn.producto_id);
      
      if (!pa) {
        // Producto agregado
        cambios.push({
          tipo: 'producto_agregado',
          producto: pn.nombre,
          descripcion: `Producto agregado: ${pn.nombre}`,
          valorAnterior: '0',
          valorNuevo: `${pn.cantidad} unidades`,
        });
      } else {
        // Detectar cambio de cantidad
        if (pa.cantidad !== pn.cantidad) {
          cambios.push({
            tipo: 'cantidad',
            producto: pn.nombre,
            descripcion: `Cantidad modificada: ${pn.nombre}`,
            valorAnterior: pa.cantidad,
            valorNuevo: pn.cantidad,
          });
        }
        // Detectar cambio de precio
        if (Math.abs(pa.precio_unitario - pn.precio_unitario) > 0.01) {
          cambios.push({
            tipo: 'precio',
            producto: pn.nombre,
            descripcion: `Precio modificado: ${pn.nombre}`,
            valorAnterior: `$${pa.precio_unitario.toFixed(2)}`,
            valorNuevo: `$${pn.precio_unitario.toFixed(2)}`,
          });
        }
      }
    });

    return cambios;
  };

  const generateNextFolio = async () => {
    setGeneratingFolio(true);
    try {
      const { data, error } = await supabase.rpc("generar_folio_orden_compra");
      if (error) throw error;
      setFolio(data);
    } catch (error: any) {
      toast({
        title: "Error al generar folio",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGeneratingFolio(false);
    }
  };

  // Open wizard for new order (simplified flow)
  const handleNewOrder = () => {
    setWizardOpen(true);
  };

  // Open dialog for editing (keeps full form)
  const handleNewOrderLegacy = async () => {
    resetForm();
    setDialogOpen(true);
    await generateNextFolio();
  };

  // Fetch proveedores
  const { data: proveedores = [] } = useQuery({
    queryKey: ["proveedores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proveedores")
        .select("*")
        .eq("activo", true)
        .order("nombre");
      if (error) throw error;
      return data;
    },
  });

  // Fetch productos
  const { data: productos = [] } = useQuery({
    queryKey: ["productos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("productos")
        .select("*")
        .eq("activo", true)
        .order("nombre");
      if (error) throw error;
      return data;
    },
  });

  // Fetch productos asociados al proveedor seleccionado con config de transporte
  const { data: productosProveedorConfig = [] } = useQuery({
    queryKey: ["proveedor-productos-config", proveedorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proveedor_productos")
        .select(`
          producto_id,
          tipo_vehiculo_estandar,
          capacidad_vehiculo_bultos,
          capacidad_vehiculo_kg,
          permite_combinacion,
          es_capacidad_fija
        `)
        .eq("proveedor_id", proveedorId);
      if (error) throw error;
      return data;
    },
    enabled: !!proveedorId,
  });
  
  // Extract just product IDs for filtering
  const productosProveedor = productosProveedorConfig.map(p => p.producto_id);
  
  // Check if proveedor has any product with transport config
  const proveedorTieneTransportConfig = productosProveedorConfig.some(
    p => p.capacidad_vehiculo_bultos && p.capacidad_vehiculo_bultos > 0
  );
  
  // Get transport config for selected product
  const configTransporteProducto = productosProveedorConfig.find(
    p => p.producto_id === productoSeleccionado
  );

  // Filter products: if proveedor has associated products, show only those; otherwise show all
  // For manual providers, show all products
  const productosDisponibles = tipoProveedor === 'manual' 
    ? productos
    : (proveedorId && productosProveedor.length > 0
        ? productos.filter(p => productosProveedor.includes(p.id))
        : productos);

  // Fetch ordenes de compra
  const { data: ordenes = [] } = useQuery({
    queryKey: ["ordenes_compra"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ordenes_compra")
        .select(`
          *,
          status_conciliacion,
          proveedores (
            id, nombre, rfc, regimen_fiscal,
            calle, numero_exterior, numero_interior,
            colonia, municipio, estado, codigo_postal,
            direccion, email, telefono
          ),
          ordenes_compra_detalles (
            *,
            productos (nombre, codigo)
          )
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch unique previous manual providers for autocomplete
  const { data: proveedoresManuales = [] } = useQuery({
    queryKey: ["proveedores-manuales-autocomplete"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ordenes_compra")
        .select("proveedor_nombre_manual, proveedor_telefono_manual, notas_proveedor_manual")
        .not("proveedor_nombre_manual", "is", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      
      // Get unique providers by name
      const uniqueProviders = new Map<string, { nombre: string; telefono: string; notas: string }>();
      data.forEach(row => {
        if (row.proveedor_nombre_manual && !uniqueProviders.has(row.proveedor_nombre_manual.toLowerCase())) {
          uniqueProviders.set(row.proveedor_nombre_manual.toLowerCase(), {
            nombre: row.proveedor_nombre_manual,
            telefono: row.proveedor_telefono_manual || "",
            notas: row.notas_proveedor_manual || "",
          });
        }
      });
      
      return Array.from(uniqueProviders.values());
    },
  });

  // Filter suggestions based on input
  const proveedorSuggestions = proveedoresManuales.filter(p => 
    p.nombre.toLowerCase().includes(proveedorNombreManual.toLowerCase()) && 
    proveedorNombreManual.length > 0
  );

  // Fetch count of pending faltantes per OC
  const { data: faltantesPorOC = {} } = useQuery({
    queryKey: ["faltantes-pendientes-por-oc"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ordenes_compra_entregas")
        .select("orden_compra_id")
        .eq("origen_faltante", true)
        .in("status", ["programada", "pendiente"]);
      
      if (error) throw error;
      
      // Agrupar por orden_compra_id y contar
      const conteo: Record<string, number> = {};
      (data || []).forEach((item: any) => {
        conteo[item.orden_compra_id] = (conteo[item.orden_compra_id] || 0) + 1;
      });
      return conteo;
    },
    refetchInterval: 60000, // Actualizar cada minuto
  });

  // REMOVED: confirmaciones query - confirmation system deprecated

  // Fetch entregas to know scheduling status per order
  const { data: todasEntregas = [] } = useQuery({
    queryKey: ["ordenes_compra_entregas_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ordenes_compra_entregas")
        .select("id, orden_compra_id, numero_entrega, cantidad_bultos, fecha_programada, status, recepcion_finalizada_en");
      if (error) throw error;
      return data;
    },
  });

  // Realtime subscription to sync delivery status updates from warehouse
  useEffect(() => {
    const channel = supabase
      .channel('ordenes-entregas-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ordenes_compra_entregas'
        },
        () => {
          // Invalidate queries to refresh delivery statuses
          queryClient.invalidateQueries({ queryKey: ["ordenes_compra_entregas_all"] });
          queryClient.invalidateQueries({ queryKey: ["ordenes_compra"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Create a map of order ID to scheduling status { total, programadas, recibidas }
  const entregasStatusPorOrden = useMemo(() => {
    const mapa: Record<string, { total: number; programadas: number; recibidas: number }> = {};
    todasEntregas.forEach((e) => {
      if (!mapa[e.orden_compra_id]) {
        mapa[e.orden_compra_id] = { total: 0, programadas: 0, recibidas: 0 };
      }
      mapa[e.orden_compra_id].total++;
      // Considerar como recibida si tiene status "recibida" o recepcion_finalizada_en
      if (e.status === "recibida" || e.recepcion_finalizada_en) {
        mapa[e.orden_compra_id].recibidas++;
      } else if (e.fecha_programada) {
        mapa[e.orden_compra_id].programadas++;
      }
    });
    return mapa;
  }, [todasEntregas]);

  // Handle ?aprobar= URL parameter to auto-open order for authorization
  useEffect(() => {
    const aprobarId = searchParams.get("aprobar");
    if (aprobarId && ordenes.length > 0) {
      const ordenParaAprobar = ordenes.find((o: any) => o.id === aprobarId);
      if (ordenParaAprobar) {
        setOrdenSeleccionada(ordenParaAprobar);
        setAutorizacionDialogOpen(true);
        // Clear the URL parameter
        setSearchParams({});
      }
    }
  }, [searchParams, ordenes]);

  // Calculate deliveries based on total quantity and bultos per delivery
  const calcularEntregas = () => {
    const cantidadTotal = productosEnOrden.reduce((sum, p) => sum + p.cantidad, 0);
    const bultosPorTrailer = parseInt(bultosPorEntrega) || 0;
    
    if (cantidadTotal <= 0 || bultosPorTrailer <= 0) {
      setEntregasProgramadas([]);
      return;
    }
    
    const numEntregas = Math.ceil(cantidadTotal / bultosPorTrailer);
    const entregas: EntregaProgramada[] = [];
    let bultosRestantes = cantidadTotal;
    
    for (let i = 1; i <= numEntregas; i++) {
      const bultosEntrega = Math.min(bultosPorTrailer, bultosRestantes);
      entregas.push({
        numero_entrega: i,
        cantidad_bultos: bultosEntrega,
        fecha_programada: "",
      });
      bultosRestantes -= bultosEntrega;
    }
    
    setEntregasProgramadas(entregas);
  };

  const updateFechaEntrega = (index: number, fecha: string) => {
    setEntregasProgramadas(prev => 
      prev.map((e, i) => i === index ? { ...e, fecha_programada: fecha } : e)
    );
  };

  const updateCantidadEntrega = (index: number, cantidad: number) => {
    setEntregasProgramadas(prev => 
      prev.map((e, i) => i === index ? { ...e, cantidad_bultos: cantidad } : e)
    );
  };

  // Create orden de compra
  const createOrden = useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      // Calculate totals with proper IVA handling
      let subtotalBase = 0;
      let ivaAmount = 0;
      let iepsAmount = 0;

      for (const p of productosEnOrden) {
        if (p.aplica_iva && p.precio_incluye_iva) {
          // Price includes IVA, extract base
          const base = p.subtotal / 1.16;
          subtotalBase += base;
          ivaAmount += p.subtotal - base;
        } else if (p.aplica_iva && !p.precio_incluye_iva) {
          // Price doesn't include IVA, add it
          subtotalBase += p.subtotal;
          ivaAmount += p.subtotal * 0.16;
        } else {
          // No IVA applies
          subtotalBase += p.subtotal;
        }
        
        // IEPS calculation (always on base)
        if (p.aplica_ieps) {
          const baseForIeps = p.aplica_iva && p.precio_incluye_iva 
            ? p.subtotal / 1.16 
            : p.subtotal;
          iepsAmount += baseForIeps * 0.08;
        }
      }

      const impuestos = ivaAmount + iepsAmount;
      const total = subtotalBase + impuestos;

      // Create orden
      const { data: orden, error: ordenError } = await supabase
        .from("ordenes_compra")
        .insert({
          folio,
          proveedor_id: tipoProveedor === 'catalogo' ? proveedorId : null,
          proveedor_nombre_manual: tipoProveedor === 'manual' ? proveedorNombreManual : null,
          proveedor_telefono_manual: tipoProveedor === 'manual' ? proveedorTelefonoManual || null : null,
          notas_proveedor_manual: tipoProveedor === 'manual' ? notasProveedorManual || null : null,
          fecha_entrega_programada: entregasMultiples ? null : (fechaEntrega || null),
          subtotal: subtotalBase,
          impuestos,
          total,
          notas,
          creado_por: user.id,
          status: "pendiente",
          entregas_multiples: entregasMultiples,
          tipo_pago: tipoPago,
          status_pago: tipoPago === 'anticipado' ? statusPago : 'pendiente',
          fecha_pago: tipoPago === 'anticipado' && statusPago === 'pagado' && fechaPago ? fechaPago : null,
          referencia_pago: tipoPago === 'anticipado' && statusPago === 'pagado' ? referenciaPago || null : null,
          comprobante_pago_url: tipoPago === 'anticipado' && statusPago === 'pagado' ? comprobantePagoUrl || null : null,
        })
        .select()
        .single();

      if (ordenError) throw ordenError;

      // Create detalles
      const detalles = productosEnOrden.map((p) => ({
        orden_compra_id: orden.id,
        producto_id: p.producto_id,
        cantidad_ordenada: p.cantidad,
        precio_unitario_compra: p.precio_unitario,
        subtotal: p.subtotal,
      }));

      const { error: detallesError } = await supabase
        .from("ordenes_compra_detalles")
        .insert(detalles);

      if (detallesError) throw detallesError;

      // Create deliveries - either multiple or single automatic
      if (entregasMultiples && entregasProgramadas.length > 0) {
        // Multiple deliveries
        const entregas = entregasProgramadas.map((e) => ({
          orden_compra_id: orden.id,
          numero_entrega: e.numero_entrega,
          cantidad_bultos: e.cantidad_bultos,
          fecha_programada: e.fecha_programada || null,
          status: e.fecha_programada ? "programada" : "pendiente_fecha",
        }));

        const { error: entregasError } = await supabase
          .from("ordenes_compra_entregas")
          .insert(entregas);

        if (entregasError) throw entregasError;
      } else if (!entregasMultiples && fechaEntrega) {
        // Single delivery - auto-create one entry for simple orders
        const cantidadTotalBultos = productosEnOrden.reduce((sum, p) => sum + p.cantidad, 0);
        
        const { error: entregaError } = await supabase
          .from("ordenes_compra_entregas")
          .insert({
            orden_compra_id: orden.id,
            numero_entrega: 1,
            cantidad_bultos: cantidadTotalBultos,
            fecha_programada: fechaEntrega,
            status: "programada",
          });

        if (entregaError) throw entregaError;
      }

      // Update productos with last purchase info
      for (const p of productosEnOrden) {
        await supabase
          .from("productos")
          .update({
            ultimo_costo_compra: p.precio_unitario,
            fecha_ultima_compra: new Date().toISOString(),
          })
          .eq("id", p.producto_id);
      }

      return orden;
    },
    onSuccess: async (orden) => {
      queryClient.invalidateQueries({ queryKey: ["ordenes_compra"] });
      queryClient.invalidateQueries({ queryKey: ["ordenes_calendario"] });
      queryClient.invalidateQueries({ queryKey: ["productos"] });
      queryClient.invalidateQueries({ queryKey: ["proveedores-manuales-autocomplete"] });
      toast({
        title: "Orden creada",
        description: entregasMultiples 
          ? `Orden creada con ${entregasProgramadas.length} entregas programadas`
          : "La orden de compra se ha creado exitosamente",
      });
      
      // Send push notification to almacenistas if there's a scheduled delivery
      const tieneEntregaProgramada = fechaEntrega || entregasProgramadas.some(e => e.fecha_programada);
      if (tieneEntregaProgramada) {
        const proveedorNombreNotif = tipoProveedor === 'catalogo' 
          ? proveedores.find(p => p.id === proveedorId)?.nombre || 'Proveedor'
          : proveedorNombreManual || 'Proveedor';
        
        const fechaEntregaReal = fechaEntrega || entregasProgramadas[0]?.fecha_programada;
        const esParaHoy = fechaEntregaReal && 
          format(new Date(fechaEntregaReal), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
        
        const fechaNotif = fechaEntregaReal 
          ? format(new Date(fechaEntregaReal), "dd/MM/yyyy", { locale: es })
          : '';
        
        sendPushNotification({
          roles: ['almacen'],
          title: esParaHoy ? '🔴 ENTREGA HOY' : '🚚 Nueva entrega programada',
          body: `${orden.folio} - ${proveedorNombreNotif}${fechaNotif ? ` - ${fechaNotif}` : ''}`,
          data: {
            type: 'recepcion_programada',
            orden_id: orden.id,
            folio: orden.folio
          }
        });
      }
      
      resetForm();
      setDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Agregar producto en modo "Por Vehículos"
  const agregarProductoPorVehiculos = () => {
    const precioFinal = usarPrecioPorKg ? precioUnitarioCalculado : precioUnitario;
    
    if (!productoSeleccionado || !numeroVehiculos || !precioFinal) {
      toast({
        title: "Campos incompletos",
        description: "Selecciona un producto, número de vehículos y precio",
        variant: "destructive",
      });
      return;
    }
    
    if (!configTransporteProducto?.capacidad_vehiculo_bultos) {
      toast({
        title: "Sin configuración de transporte",
        description: "Este producto no tiene capacidad por vehículo configurada",
        variant: "destructive",
      });
      return;
    }

    const producto = productosDisponibles.find((p) => p.id === productoSeleccionado);
    if (!producto) return;

    const numVehiculos = parseInt(numeroVehiculos);
    const capacidad = configTransporteProducto.capacidad_vehiculo_bultos;
    const cantidadTotal = capacidad * numVehiculos;
    const precioNum = parseFloat(precioFinal);
    const subtotal = cantidadTotal * precioNum;

    // Agregar producto con cantidad total calculada
    setProductosEnOrden([
      ...productosEnOrden,
      {
        producto_id: producto.id,
        nombre: producto.nombre,
        cantidad: cantidadTotal,
        precio_unitario: precioNum,
        ultimo_costo: producto.ultimo_costo_compra,
        subtotal,
        aplica_iva: producto.aplica_iva ?? false,
        aplica_ieps: producto.aplica_ieps ?? false,
        precio_incluye_iva: precioIncluyeIva,
      },
    ]);

    // Auto-activar entregas múltiples
    setEntregasMultiples(true);
    
    // Auto-generar entregas (una por vehículo)
    const tipoVehiculo = configTransporteProducto.tipo_vehiculo_estandar || 'trailer';
    const entregas: EntregaProgramada[] = Array.from({ length: numVehiculos }, (_, i) => ({
      numero_entrega: i + 1,
      cantidad_bultos: capacidad,
      fecha_programada: "",
    }));
    setEntregasProgramadas(entregas);
    setBultosPorEntrega(capacidad.toString());

    // Reset form
    setProductoSeleccionado("");
    setNumeroVehiculos("");
    setPrecioUnitario("");
    setPrecioIncluyeIva(false);
    setUsarPrecioPorKg(false);
    setPrecioPorKg("");
    setKgPorUnidad("");
    
    toast({
      title: "Producto agregado",
      description: `${numVehiculos} ${tipoVehiculo === 'trailer' ? 'tráilers' : 'vehículos'} de ${producto.nombre} (${cantidadTotal.toLocaleString()} unidades)`,
    });
  };

  const agregarProducto = () => {
    // Si está en modo vehículos, usar esa función
    if (modoCreacion === 'vehiculos') {
      agregarProductoPorVehiculos();
      return;
    }
    
    const precioFinal = usarPrecioPorKg ? precioUnitarioCalculado : precioUnitario;
    
    if (!productoSeleccionado || !cantidad || !precioFinal) {
      toast({
        title: "Campos incompletos",
        description: usarPrecioPorKg 
          ? "Selecciona un producto, cantidad, precio/kg y kg/unidad"
          : "Selecciona un producto, cantidad y precio",
        variant: "destructive",
      });
      return;
    }

    const producto = productosDisponibles.find((p) => p.id === productoSeleccionado);
    if (!producto) return;

    const cantidadNum = parseInt(cantidad);
    const precioNum = parseFloat(precioFinal);
    const subtotal = cantidadNum * precioNum;

    setProductosEnOrden([
      ...productosEnOrden,
      {
        producto_id: producto.id,
        nombre: producto.nombre,
        cantidad: cantidadNum,
        precio_unitario: precioNum,
        ultimo_costo: producto.ultimo_costo_compra,
        subtotal,
        aplica_iva: producto.aplica_iva ?? false,
        aplica_ieps: producto.aplica_ieps ?? false,
        precio_incluye_iva: precioIncluyeIva,
      },
    ]);

    setProductoSeleccionado("");
    setCantidad("");
    setPrecioUnitario("");
    setPrecioIncluyeIva(false);
    setUsarPrecioPorKg(false);
    setPrecioPorKg("");
    setKgPorUnidad("");
  };

  const eliminarProducto = (index: number) => {
    setProductosEnOrden(productosEnOrden.filter((_, i) => i !== index));
    // Recalculate deliveries if multiple deliveries enabled
    if (entregasMultiples) {
      setTimeout(calcularEntregas, 0);
    }
  };

  const resetForm = () => {
    setTipoProveedor('catalogo');
    setProveedorId("");
    setProveedorNombreManual("");
    setProveedorTelefonoManual("");
    setNotasProveedorManual("");
    setShowProveedorSuggestions(false);
    setFolio("");
    setFechaEntrega("");
    setNotas("");
    setProductosEnOrden([]);
    setProductoSeleccionado("");
    setCantidad("");
    setPrecioUnitario("");
    setPrecioIncluyeIva(false);
    setEditingOrdenId(null);
    setEntregasMultiples(false);
    setBultosPorEntrega("");
    setEntregasProgramadas([]);
    setUsarPrecioPorKg(false);
    setPrecioPorKg("");
    setKgPorUnidad("");
    setModoCreacion('manual');
    setNumeroVehiculos("");
    setTipoPago('contra_entrega');
    setStatusPago('pendiente');
    setFechaPago("");
    setReferenciaPago("");
    setComprobantePagoUrl("");
  };

  // Update orden de compra
  const updateOrden = useMutation({
    mutationFn: async () => {
      if (!editingOrdenId) throw new Error("No order to update");

      // Calculate totals with proper IVA handling
      let subtotalBase = 0;
      let ivaAmount = 0;
      let iepsAmount = 0;

      for (const p of productosEnOrden) {
        if (p.aplica_iva && p.precio_incluye_iva) {
          const base = p.subtotal / 1.16;
          subtotalBase += base;
          ivaAmount += p.subtotal - base;
        } else if (p.aplica_iva && !p.precio_incluye_iva) {
          subtotalBase += p.subtotal;
          ivaAmount += p.subtotal * 0.16;
        } else {
          subtotalBase += p.subtotal;
        }
        
        if (p.aplica_ieps) {
          const baseForIeps = p.aplica_iva && p.precio_incluye_iva 
            ? p.subtotal / 1.16 
            : p.subtotal;
          iepsAmount += baseForIeps * 0.08;
        }
      }

      const impuestos = ivaAmount + iepsAmount;
      const total = subtotalBase + impuestos;

      // Update orden
      const { error: ordenError } = await supabase
        .from("ordenes_compra")
        .update({
          folio,
          proveedor_id: tipoProveedor === 'catalogo' ? proveedorId : null,
          proveedor_nombre_manual: tipoProveedor === 'manual' ? proveedorNombreManual : null,
          proveedor_telefono_manual: tipoProveedor === 'manual' ? proveedorTelefonoManual || null : null,
          notas_proveedor_manual: tipoProveedor === 'manual' ? notasProveedorManual || null : null,
          fecha_entrega_programada: entregasMultiples ? null : (fechaEntrega || null),
          subtotal: subtotalBase,
          impuestos,
          total,
          notas,
          entregas_multiples: entregasMultiples,
          tipo_pago: tipoPago,
          status_pago: tipoPago === 'anticipado' ? statusPago : 'pendiente',
          fecha_pago: tipoPago === 'anticipado' && statusPago === 'pagado' && fechaPago ? fechaPago : null,
          referencia_pago: tipoPago === 'anticipado' && statusPago === 'pagado' ? referenciaPago || null : null,
          comprobante_pago_url: tipoPago === 'anticipado' && statusPago === 'pagado' ? comprobantePagoUrl || null : null,
        })
        .eq("id", editingOrdenId);

      if (ordenError) throw ordenError;

      // Delete existing detalles
      const { error: deleteError } = await supabase
        .from("ordenes_compra_detalles")
        .delete()
        .eq("orden_compra_id", editingOrdenId);

      if (deleteError) throw deleteError;

      // Create new detalles
      const detalles = productosEnOrden.map((p) => ({
        orden_compra_id: editingOrdenId,
        producto_id: p.producto_id,
        cantidad_ordenada: p.cantidad,
        precio_unitario_compra: p.precio_unitario,
        subtotal: p.subtotal,
      }));

      const { error: detallesError } = await supabase
        .from("ordenes_compra_detalles")
        .insert(detalles);

      if (detallesError) throw detallesError;

      // Handle multiple deliveries
      if (entregasMultiples) {
        // Delete existing entregas
        await supabase
          .from("ordenes_compra_entregas")
          .delete()
          .eq("orden_compra_id", editingOrdenId);

        // Create new entregas
        if (entregasProgramadas.length > 0) {
          const entregas = entregasProgramadas.map((e) => ({
            orden_compra_id: editingOrdenId,
            numero_entrega: e.numero_entrega,
            cantidad_bultos: e.cantidad_bultos,
            fecha_programada: e.fecha_programada,
            status: "programada",
          }));

          const { error: entregasError } = await supabase
            .from("ordenes_compra_entregas")
            .insert(entregas);

          if (entregasError) throw entregasError;
        }
      }

      return editingOrdenId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ordenes_compra"] });
      queryClient.invalidateQueries({ queryKey: ["ordenes_calendario"] });
      queryClient.invalidateQueries({ queryKey: ["proveedores-manuales-autocomplete"] });
      
      // Detectar cambios si la orden ya fue enviada al proveedor
      if (ordenAnteriorSnapshot && ordenEditadaInfo) {
        const cambios = detectarCambiosOC(
          ordenAnteriorSnapshot,
          {
            productosEnOrden,
            fechaEntrega,
            entregasProgramadas,
          }
        );

        if (cambios.length > 0) {
          setCambiosDetectados(cambios);
          setNotificarCambiosOpen(true);
          // El toast se mostrará después de cerrar el diálogo de notificación
        } else {
          toast({
            title: "Orden actualizada",
            description: "La orden de compra se ha actualizado exitosamente",
          });
        }
      } else {
        toast({
          title: "Orden actualizada",
          description: "La orden de compra se ha actualizado exitosamente",
        });
      }
      
      resetForm();
      setDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEditOrden = async (orden: any) => {
    setEditingOrdenId(orden.id);
    setFolio(orden.folio);
    
    // Handle hybrid provider type
    if (orden.proveedor_id) {
      setTipoProveedor('catalogo');
      setProveedorId(orden.proveedor_id);
      setProveedorNombreManual("");
      setProveedorTelefonoManual("");
    } else {
      setTipoProveedor('manual');
      setProveedorId("");
      setProveedorNombreManual(orden.proveedor_nombre_manual || "");
      setProveedorTelefonoManual(orden.proveedor_telefono_manual || "");
      setNotasProveedorManual(orden.notas_proveedor_manual || "");
    }
    
    setFechaEntrega(orden.fecha_entrega_programada || "");
    setNotas(orden.notas || "");
    setEntregasMultiples(orden.entregas_multiples || false);
    setTipoPago(orden.tipo_pago || 'contra_entrega');
    setStatusPago(orden.status_pago || 'pendiente');
    setFechaPago(orden.fecha_pago || "");
    setReferenciaPago(orden.referencia_pago || "");
    setComprobantePagoUrl(orden.comprobante_pago_url || "");
    
    // Load products from order details
    const productos = (orden.ordenes_compra_detalles || []).map((d: any) => ({
      producto_id: d.producto_id,
      nombre: d.productos?.nombre || "Producto",
      cantidad: d.cantidad_ordenada,
      precio_unitario: d.precio_unitario_compra,
      subtotal: d.subtotal,
      aplica_iva: false,
      aplica_ieps: false,
      precio_incluye_iva: false,
    }));
    setProductosEnOrden(productos);
    
    // Load entregas if multiple
    let entregasData: EntregaProgramada[] = [];
    if (orden.entregas_multiples) {
      const { data: entregas } = await supabase
        .from("ordenes_compra_entregas")
        .select("*")
        .eq("orden_compra_id", orden.id)
        .order("numero_entrega");
      
      if (entregas && entregas.length > 0) {
        entregasData = entregas.map(e => ({
          numero_entrega: e.numero_entrega,
          cantidad_bultos: e.cantidad_bultos,
          fecha_programada: e.fecha_programada,
        }));
        setEntregasProgramadas(entregasData);
      }
    }

    // Guardar snapshot de la orden original ANTES de editar
    // Solo si la orden ya fue enviada al proveedor
    if (orden.status === 'enviada' || orden.status === 'confirmada') {
      setOrdenEditadaInfo({
        id: orden.id,
        folio: orden.folio,
        proveedorId: orden.proveedor_id,
        proveedorNombre: orden.proveedores?.nombre || orden.proveedor_nombre_manual || "Proveedor",
        statusAnterior: orden.status,
      });
      setOrdenAnteriorSnapshot({
        productosEnOrden: productos,
        fechaEntrega: orden.fecha_entrega_programada || "",
        entregasProgramadas: entregasData,
      });
    } else {
      setOrdenEditadaInfo(null);
      setOrdenAnteriorSnapshot(null);
    }
    
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate provider based on type
    if (tipoProveedor === 'catalogo' && !proveedorId) {
      toast({
        title: "Selecciona un proveedor",
        description: "Selecciona un proveedor del catálogo",
        variant: "destructive",
      });
      return;
    }
    
    if (tipoProveedor === 'manual' && !proveedorNombreManual.trim()) {
      toast({
        title: "Ingresa el proveedor",
        description: "Ingresa el nombre del proveedor",
        variant: "destructive",
      });
      return;
    }
    
    if (!folio || productosEnOrden.length === 0) {
      toast({
        title: "Campos incompletos",
        description: "Completa todos los campos requeridos",
        variant: "destructive",
      });
      return;
    }
    
    // Validar fecha de entrega cuando no hay entregas múltiples
    if (!entregasMultiples && !fechaEntrega) {
      toast({
        title: "Fecha requerida",
        description: "Selecciona una fecha de entrega programada",
        variant: "destructive",
      });
      return;
    }
    
    if (editingOrdenId) {
      updateOrden.mutate();
    } else {
      createOrden.mutate();
    }
  };

  // Calculate totals for display
  const calcularTotalesOrden = () => {
    let subtotalBase = 0;
    let ivaAmount = 0;
    let iepsAmount = 0;

    for (const p of productosEnOrden) {
      if (p.aplica_iva && p.precio_incluye_iva) {
        const base = p.subtotal / 1.16;
        subtotalBase += base;
        ivaAmount += p.subtotal - base;
      } else if (p.aplica_iva && !p.precio_incluye_iva) {
        subtotalBase += p.subtotal;
        ivaAmount += p.subtotal * 0.16;
      } else {
        subtotalBase += p.subtotal;
      }
      
      if (p.aplica_ieps) {
        const baseForIeps = p.aplica_iva && p.precio_incluye_iva 
          ? p.subtotal / 1.16 
          : p.subtotal;
        iepsAmount += baseForIeps * 0.08;
      }
    }

    return {
      subtotal: subtotalBase,
      iva: ivaAmount,
      ieps: iepsAmount,
      impuestos: ivaAmount + iepsAmount,
      total: subtotalBase + ivaAmount + iepsAmount,
    };
  };

  const totalesOrden = calcularTotalesOrden();
  const cantidadTotalBultos = productosEnOrden.reduce((sum, p) => sum + p.cantidad, 0);

  // REMOVED: handleEnviarRecordatorio function - confirmation system deprecated

  // Función para eliminar OC con notificación al proveedor
  const handleEliminarOrden = async () => {
    if (!ordenParaEliminar) return;
    
    setEliminandoOrden(true);
    
    try {
      const orden = ordenParaEliminar;
      
      const nombreProveedor = orden?.proveedores?.nombre || orden?.proveedor_nombre_manual || '';
      const folio = orden?.folio || '';
      
      // Detectar si es OC de prueba
      const esOCPruebaLocal = nombreProveedor.toLowerCase().includes('prueba') || 
                              nombreProveedor.toLowerCase().includes('test') ||
                              folio.toUpperCase().includes('TEST') ||
                              folio.toUpperCase().includes('PRUEBA');
      
      // Block deletion of completed/received orders unless it's a test OC and user is admin
      if ((orden.status === 'completada' || orden.status === 'recibida') && !esOCPruebaLocal) {
        throw new Error(
          "No se puede eliminar una orden que ya fue recibida. El inventario ya fue afectado. " +
          "Contacte al administrador para realizar ajustes de inventario si es necesario."
        );
      }
      
      // Si es OC recibida de prueba, eliminar también los lotes de inventario en cascada
      if ((orden.status === 'completada' || orden.status === 'recibida') && esOCPruebaLocal) {
        console.log("🧹 Eliminando OC de prueba con datos de inventario:", orden.folio);
        
        // 1. Eliminar lotes de inventario asociados (trigger actualizará stock)
        const { error: lotesError } = await supabase
          .from("inventario_lotes")
          .delete()
          .eq("orden_compra_id", orden.id);
        
        if (lotesError) {
          console.error("Error eliminando lotes:", lotesError);
          throw new Error("Error al eliminar lotes de inventario: " + lotesError.message);
        }
        
        // 2. Eliminar entregas programadas
        const { error: entregasError } = await supabase
          .from("ordenes_compra_entregas")
          .delete()
          .eq("orden_compra_id", orden.id);
        
        if (entregasError) {
          console.error("Error eliminando entregas:", entregasError);
        }
        
        // 3. Eliminar recepciones participantes (si existen)
        const { data: recepciones } = await (supabase as any)
          .from("ordenes_compra_recepciones")
          .select("id")
          .eq("orden_compra_id", orden.id);
        
        if (recepciones && recepciones.length > 0) {
          const recepcionIds = recepciones.map((r: any) => r.id);
          
          await (supabase as any)
            .from("recepciones_participantes")
            .delete()
            .in("recepcion_id", recepcionIds);
          
          await (supabase as any)
            .from("ordenes_compra_recepciones")
            .delete()
            .eq("orden_compra_id", orden.id);
        }
        
        console.log("✅ Datos de inventario y recepciones eliminados para OC de prueba:", orden.folio);
      }

      const emailDestinatario = orden?.proveedores?.email || orden?.proveedor_email_manual;
      const proveedorNombre = orden?.proveedores?.nombre || orden?.proveedor_nombre_manual || 'Proveedor';
      
      // Si la orden fue enviada, notificar al proveedor
      if (emailDestinatario && (orden.status === 'enviada' || orden.status === 'confirmada')) {
        try {
          const logoBase64 = await getLogoBase64();
          
          // Construir tabla de productos
          const detalles = orden.ordenes_compra_detalles || [];
          const productosHTML = detalles.map((d: any) => 
            `<tr>
              <td style="padding: 10px; border: 1px solid #ddd;">${d.productos?.codigo || '-'}</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${d.productos?.nombre || 'Producto'}</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${d.cantidad_ordenada}</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">$${d.precio_unitario_compra?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">$${d.subtotal?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
            </tr>`
          ).join('');

          // Formato de fecha de entrega
          let fechaEntregaStr = 'Por confirmar';
          if (orden.fecha_entrega_programada) {
            const [year, month, day] = orden.fecha_entrega_programada.split('-').map(Number);
            const fechaLocal = new Date(year, month - 1, day);
            fechaEntregaStr = fechaLocal.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
          }

          // Construir email de cancelación
          const htmlBody = `
            <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 20px;">
                ${logoBase64 ? `<img src="${logoBase64}" alt="ALMASA" style="height: 60px;" />` : '<h1 style="color: #B22234;">ALMASA</h1>'}
              </div>
              
              <div style="background-color: #FEE2E2; border: 2px solid #EF4444; border-radius: 8px; padding: 20px; margin-bottom: 20px; text-align: center;">
                <h2 style="color: #DC2626; margin: 0;">❌ ORDEN CANCELADA: ${orden.folio}</h2>
              </div>
              
              <div style="background-color: #f8f9fa; border-left: 4px solid #1e3a5f; padding: 15px; margin-bottom: 20px;">
                <h4 style="margin: 0 0 8px 0; color: #1e3a5f;">🏢 ${COMPANY_DATA.razonSocial}</h4>
                <p style="margin: 3px 0; font-size: 13px;">RFC: ${COMPANY_DATA.rfc}</p>
                <p style="margin: 3px 0; font-size: 13px;">${COMPANY_DATA.direccionCompletaMayusculas}</p>
                <p style="margin: 3px 0; font-size: 13px;">Tel: ${COMPANY_DATA.telefonosFormateados} | ${COMPANY_DATA.emails.compras}</p>
              </div>

              <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin-bottom: 20px;">
                <h4 style="margin: 0 0 8px 0; color: #dc2626;">📦 Proveedor: ${proveedorNombre.toUpperCase()}</h4>
                ${orden.proveedores?.rfc ? `<p style="margin: 3px 0; font-size: 13px;">RFC: ${orden.proveedores.rfc}</p>` : ''}
              </div>

              <div style="background-color: #fee2e2; border: 2px solid #ef4444; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="margin: 0; font-size: 16px; color: #dc2626; text-align: center;">
                  <strong>⚠️ IMPORTANTE: Esta orden ha sido CANCELADA y ya NO debe ser procesada.</strong>
                </p>
              </div>

              <h4 style="color: #1e3a5f; border-bottom: 2px solid #1e3a5f; padding-bottom: 5px;">📋 Productos que estaban en la orden:</h4>
              <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
                <thead>
                  <tr style="background-color: #6b7280; color: white;">
                    <th style="padding: 10px; border: 1px solid #6b7280;">Código</th>
                    <th style="padding: 10px; border: 1px solid #6b7280;">Producto</th>
                    <th style="padding: 10px; border: 1px solid #6b7280; text-align: center;">Cantidad</th>
                    <th style="padding: 10px; border: 1px solid #6b7280; text-align: right;">P. Unit.</th>
                    <th style="padding: 10px; border: 1px solid #6b7280; text-align: right;">Subtotal</th>
                  </tr>
                </thead>
                <tbody style="color: #6b7280;">
                  ${productosHTML}
                </tbody>
              </table>

              <div style="display: flex; justify-content: flex-end; margin: 20px 0;">
                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; min-width: 200px; color: #6b7280;">
                  <div style="display: flex; justify-content: space-between; margin: 5px 0; text-decoration: line-through;">
                    <span>Subtotal:</span>
                    <span>$${orden.subtotal?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin: 5px 0; text-decoration: line-through;">
                    <span>IVA (16%):</span>
                    <span>$${orden.impuestos?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin: 8px 0; padding-top: 8px; border-top: 2px solid #9ca3af; text-decoration: line-through;">
                    <span>TOTAL:</span>
                    <span>$${orden.total?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              <p style="color: #666; margin-top: 30px;">
                Si tiene alguna duda sobre esta cancelación, favor de comunicarse con nuestro departamento de compras.
              </p>
              
              <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;" />
              <p style="color: #666; font-size: 12px; text-align: center;">
                Este correo fue enviado automáticamente desde el sistema de ${COMPANY_DATA.razonSocial}.<br/>
                Para cualquier duda, favor de comunicarse al ${COMPANY_DATA.emails.compras}
              </p>
            </div>
          `;

          const asunto = `❌ ORDEN CANCELADA: ${orden.folio} - ${proveedorNombre.toUpperCase()}`;

          // Enviar correo de cancelación
          const { error: emailError } = await supabase.functions.invoke('gmail-api', {
            body: {
              action: 'send',
              email: 'compras@almasa.com.mx',
              to: emailDestinatario,
              subject: asunto,
              body: htmlBody,
            },
          });

          // Registrar correo en historial
          await registrarCorreoEnviado({
            tipo: "cancelacion_oc",
            referencia_id: orden.id,
            destinatario: emailDestinatario,
            asunto: asunto,
            error: emailError?.message || null,
          });

          if (emailError) {
            console.error('Error sending cancellation email:', emailError);
          }
        } catch (emailErr) {
          console.error('Error preparing cancellation email:', emailErr);
          // Continuar con la eliminación aunque falle el email
        }
      }

      // Eliminar notificaciones relacionadas
      await supabase
        .from("notificaciones")
        .delete()
        .eq("orden_compra_id", orden.id);

      // Eliminar entregas múltiples
      await supabase
        .from("ordenes_compra_entregas")
        .delete()
        .eq("orden_compra_id", orden.id);

      // Eliminar detalles de la orden
      const { error: detallesError } = await supabase
        .from("ordenes_compra_detalles")
        .delete()
        .eq("orden_compra_id", orden.id);
      if (detallesError) throw detallesError;

      // Finalmente eliminar la orden
      const { error } = await supabase
        .from("ordenes_compra")
        .delete()
        .eq("id", orden.id);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["ordenes_compra"] });
      queryClient.invalidateQueries({ queryKey: ["ordenes_calendario"] });
      
      toast({
        title: "Orden eliminada",
        description: orden.status === 'enviada' || orden.status === 'confirmada'
          ? "La orden de compra se eliminó y se notificó al proveedor"
          : "La orden de compra se eliminó correctamente",
      });
      
      setConfirmarEliminacionOpen(false);
      setOrdenParaEliminar(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar la orden",
        variant: "destructive",
      });
    } finally {
      setEliminandoOrden(false);
    }
  };

  const filteredOrdenes = ordenes.filter(
    (orden) => {
      const proveedorNombre = orden.proveedor_id 
        ? orden.proveedores?.nombre 
        : orden.proveedor_nombre_manual;
      return orden.folio.toLowerCase().includes(searchTerm.toLowerCase()) ||
        proveedorNombre?.toLowerCase().includes(searchTerm.toLowerCase());
    }
  );

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: any; className?: string }> = {
      pendiente: { label: "Pendiente", variant: "secondary" },
      pendiente_pago: { label: "💳 Pend. Pago", variant: "outline", className: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800" },
      pendiente_autorizacion: { label: "Por Autorizar", variant: "outline" },
      autorizada: { label: "Autorizada", variant: "default" },
      rechazada: { label: "Rechazada", variant: "destructive" },
      enviada: { label: "Enviada", variant: "default" },
      parcial: { label: "Recep. Parcial", variant: "secondary" },
      recibida: { label: "Recibida", variant: "default" },
      devuelta: { label: "Devuelta", variant: "destructive" },
    };
    const config = statusConfig[status] || { label: status, variant: "secondary" };
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
  };

  // Calcular porcentaje de recepción de una OC
  const calcularPorcentajeRecepcion = (orden: any): number => {
    const detalles = orden.ordenes_compra_detalles || [];
    if (detalles.length === 0) return 0;
    
    const totalOrdenado = detalles.reduce((sum: number, d: any) => 
      sum + (d.cantidad_ordenada || 0), 0);
    const totalRecibido = detalles.reduce((sum: number, d: any) => 
      sum + (d.cantidad_recibida || 0), 0);
    
    if (totalOrdenado === 0) return 0;
    return Math.round((totalRecibido / totalOrdenado) * 100);
  };

  // Obtener color según porcentaje de recepción
  const getProgressColor = (porcentaje: number): string => {
    if (porcentaje === 0) return "bg-gray-400";
    if (porcentaje < 50) return "bg-orange-500";
    if (porcentaje < 100) return "bg-blue-500";
    return "bg-green-500";
  };

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-2xl font-bold">Órdenes de Compra</h2>
            <LiveIndicator />
          </div>
          <p className="text-muted-foreground">
            Gestiona tus órdenes de compra y recepciones
          </p>
        </div>
        <Button onClick={handleNewOrder}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Orden de Compra
        </Button>
      </div>

      {/* Alert for authorized OCs ready to send */}
      <OCAutorizadaAlert 
        onNavigateToOC={(ordenId) => {
          const orden = ordenes.find(o => o.id === ordenId);
          if (orden) {
            setOrdenSeleccionada(orden);
            setAccionesDialogOpen(true);
          }
        }}
      />

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por folio o proveedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Folio</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Total</TableHead>
              <TableHead className="w-32">Recepción</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Pago</TableHead>
              <TableHead>Programación</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrdenes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  No hay órdenes de compra registradas
                </TableCell>
              </TableRow>
            ) : (
              filteredOrdenes.map((orden) => {
                const entregasStatus = entregasStatusPorOrden[orden.id];

                return (
                  <TableRow key={orden.id}>
                    <TableCell className="font-medium">{orden.folio}</TableCell>
                    <TableCell>
                      {orden.proveedor_id ? (
                        orden.proveedores?.nombre
                      ) : (
                        <span className="flex items-center gap-2">
                          {orden.proveedor_nombre_manual}
                          <Badge variant="outline" className="text-xs">Manual</Badge>
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {format(new Date(orden.fecha_orden), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell>{formatCurrency(orden.total)}</TableCell>
                    <TableCell>
                      {(() => {
                        const porcentaje = calcularPorcentajeRecepcion(orden);
                        const colorClass = getProgressColor(porcentaje);
                        
                        return (
                          <div className="flex items-center gap-2 min-w-[100px]">
                            <div className="flex-1">
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full transition-all ${colorClass}`}
                                  style={{ width: `${porcentaje}%` }}
                                />
                              </div>
                            </div>
                            <span className={`text-xs font-medium min-w-[32px] text-right ${
                              porcentaje === 100 
                                ? 'text-green-600 dark:text-green-400' 
                                : porcentaje > 0 
                                  ? 'text-blue-600 dark:text-blue-400' 
                                  : 'text-muted-foreground'
                            }`}>
                              {porcentaje}%
                            </span>
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 flex-wrap">
                        {getStatusBadge(orden.status)}
                        {/* Badge de faltantes pendientes */}
                        {(faltantesPorOC as Record<string, number>)[orden.id] > 0 && (
                          <Badge 
                            variant="outline" 
                            className="bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800 text-xs"
                            title={`${(faltantesPorOC as Record<string, number>)[orden.id]} entrega(s) de faltantes pendientes`}
                          >
                            <PackageX className="h-3 w-3 mr-1" />
                            Faltante
                          </Badge>
                        )}
                        {/* Badge de conciliación pendiente */}
                        {(orden as any).status_conciliacion === 'por_conciliar' && (
                          <Badge 
                            variant="outline" 
                            className="bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800 text-xs"
                            title="Costo pendiente de verificar con factura"
                          >
                            <Receipt className="h-3 w-3 mr-1" />
                            Por Conciliar
                          </Badge>
                        )}
                        {(orden as any).status_conciliacion === 'conciliada' && (orden.status === 'parcial' || orden.status === 'completada') && (
                          <Badge 
                            variant="outline" 
                            className="bg-green-100 text-green-700 border-green-300 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800 text-xs"
                            title="Costos verificados con factura"
                          >
                            <FileCheck className="h-3 w-3 mr-1" />
                            Conciliada
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {orden.tipo_pago === 'anticipado' ? (
                        orden.status_pago === 'pagado' ? (
                          <Badge className="bg-green-100 text-green-700 border-green-300 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800">
                            💳 Anticipado ✓
                          </Badge>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800">
                              💳 Pendiente
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-xs text-primary hover:text-primary"
                              onClick={() => {
                                setOrdenParaPago({
                                  id: orden.id,
                                  folio: orden.folio,
                                  proveedor_id: orden.proveedor_id || null,
                                  proveedor_nombre: orden.proveedor_id ? orden.proveedores?.nombre : orden.proveedor_nombre_manual,
                                  proveedor_email: orden.proveedor_id ? orden.proveedores?.email : null,
                                  total: orden.total,
                                  monto_devoluciones: orden.monto_devoluciones || null,
                                  total_ajustado: orden.total_ajustado || null,
                                });
                                setMarcarPagadoDialogOpen(true);
                              }}
                            >
                              <CreditCard className="h-3 w-3 mr-1" />
                              Pagar
                            </Button>
                          </div>
                        )
                      ) : (
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-muted-foreground">
                            🚚 Contra Entrega
                          </Badge>
                          {/* Botón procesar pago para OC completadas/parciales */}
                          {(orden.status === 'completada' || orden.status === 'parcial') && 
                           orden.status_pago !== 'pagado' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-xs text-primary hover:text-primary"
                              onClick={() => {
                                setOrdenParaProcesarPago({
                                  id: orden.id,
                                  folio: orden.folio,
                                  proveedor_id: orden.proveedor_id || null,
                                  proveedor_nombre: orden.proveedor_id ? orden.proveedores?.nombre : orden.proveedor_nombre_manual,
                                  total: orden.total,
                                  monto_devoluciones: orden.monto_devoluciones || null,
                                  total_ajustado: orden.total_ajustado || null,
                                  fecha_creacion: orden.fecha_orden,
                                });
                                setProcesarPagoDialogOpen(true);
                              }}
                            >
                              <CreditCard className="h-3 w-3 mr-1" />
                              Pagar
                            </Button>
                          )}
                          {orden.status_pago === 'pagado' && (
                            <Badge className="bg-green-100 text-green-700 border-green-300 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800 text-xs">
                              ✓ Pagado
                            </Badge>
                          )}
                          {orden.status_pago === 'parcial' && (
                            <Badge 
                              className="bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800 text-xs cursor-pointer"
                              onClick={() => {
                                setOrdenParaFacturas({
                                  id: orden.id,
                                  folio: orden.folio,
                                  proveedor_nombre: orden.proveedor_id ? orden.proveedores?.nombre : orden.proveedor_nombre_manual,
                                  total: orden.total,
                                });
                                setFacturasDialogOpen(true);
                              }}
                            >
                              🟡 Pago Parcial
                              {(orden as any).monto_pagado > 0 && (
                                <span className="ml-1">
                                  (${((orden as any).monto_pagado || 0).toLocaleString("es-MX", { minimumFractionDigits: 0 })})
                                </span>
                              )}
                            </Badge>
                          )}
                        </div>
                      )}
                    </TableCell>
                    {/* REMOVED: Confirmation column - confirmation system deprecated */}
                    <TableCell>
                      <EntregasPopover 
                        orden={orden} 
                        entregas={todasEntregas} 
                        entregasStatus={entregasStatus}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Facturas del proveedor"
                          onClick={() => {
                            setOrdenParaFacturas({
                              id: orden.id,
                              folio: orden.folio,
                              proveedor_nombre: orden.proveedor_id ? orden.proveedores?.nombre : orden.proveedor_nombre_manual,
                              total: orden.total,
                            });
                            setFacturasDialogOpen(true);
                          }}
                        >
                          <Receipt className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Reenviar OC"
                          onClick={() => {
                            setOrdenParaReenvio(orden);
                            setReenviarDialogOpen(true);
                          }}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                        {/* REMOVED: Bell reminder button - confirmation system deprecated */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Eliminar OC"
                          onClick={() => {
                            setOrdenParaEliminar(orden);
                            setConfirmarEliminacionOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setOrdenSeleccionada(orden);
                            setAccionesDialogOpen(true);
                          }}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingOrdenId ? "Editar Orden de Compra" : "Nueva Orden de Compra"}</DialogTitle>
            <DialogDescription>
              {editingOrdenId 
                ? "Modifica los detalles de la orden de compra."
                : "Crea una nueva orden de compra. Los precios quedarán registrados como historial."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Folio *</Label>
                <div className="relative">
                  <Input
                    value={folio}
                    onChange={(e) => setFolio(e.target.value)}
                    placeholder="OC-YYYYMM-0001"
                    required
                    disabled={generatingFolio || !editingOrdenId}
                    className={!editingOrdenId ? "bg-muted" : ""}
                  />
                  {generatingFolio && (
                    <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                {!editingOrdenId && (
                  <p className="text-xs text-muted-foreground mt-1">Auto-generado</p>
                )}
              </div>
              <div className="col-span-2">
                <Label>Proveedor *</Label>
                <div className="space-y-2">
                  {/* Tipo de proveedor toggle */}
                  <div className="flex items-center gap-4 text-sm">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="tipoProveedor"
                        checked={tipoProveedor === 'catalogo'}
                        onChange={() => {
                          setTipoProveedor('catalogo');
                          setProveedorNombreManual("");
                          setProveedorTelefonoManual("");
                        }}
                        className="accent-primary"
                      />
                      <span>Del catálogo</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="tipoProveedor"
                        checked={tipoProveedor === 'manual'}
                        onChange={() => {
                          setTipoProveedor('manual');
                          setProveedorId("");
                          setProductoSeleccionado("");
                        }}
                        className="accent-primary"
                      />
                      <span>No registrado</span>
                    </label>
                  </div>
                  
                  {tipoProveedor === 'catalogo' ? (
                    <Select 
                      value={proveedorId} 
                      onValueChange={(value) => {
                        setProveedorId(value);
                        setProductoSeleccionado(""); // Reset product when proveedor changes
                        setPrecioUnitario("");
                      }} 
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar proveedor" />
                      </SelectTrigger>
                      <SelectContent>
                        {proveedores.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <Input
                          value={proveedorNombreManual}
                          onChange={(e) => {
                            setProveedorNombreManual(e.target.value);
                            setShowProveedorSuggestions(true);
                          }}
                          onFocus={() => setShowProveedorSuggestions(true)}
                          onBlur={() => setTimeout(() => setShowProveedorSuggestions(false), 200)}
                          placeholder="Nombre del proveedor *"
                          autoComplete="off"
                        />
                        {showProveedorSuggestions && proveedorSuggestions.length > 0 && (
                          <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-auto">
                            {proveedorSuggestions.map((p, i) => (
                              <button
                                key={i}
                                type="button"
                                className="w-full px-3 py-2 text-left hover:bg-accent text-sm flex items-center justify-between"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setProveedorNombreManual(p.nombre);
                                  setProveedorTelefonoManual(p.telefono);
                                  setNotasProveedorManual(p.notas);
                                  setShowProveedorSuggestions(false);
                                }}
                              >
                                <span className="font-medium">{p.nombre}</span>
                                {p.telefono && (
                                  <span className="text-muted-foreground text-xs">{p.telefono}</span>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <Input
                        value={proveedorTelefonoManual}
                        onChange={(e) => setProveedorTelefonoManual(e.target.value)}
                        placeholder="Teléfono (opcional)"
                      />
                      <Input
                        value={notasProveedorManual}
                        onChange={(e) => setNotasProveedorManual(e.target.value)}
                        placeholder="Notas del proveedor (ej: solo efectivo, viene los miércoles)"
                      />
                      <p className="text-xs text-muted-foreground">
                        Los proveedores manuales muestran todos los productos
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Payment Type Section - Full Width, Simplified */}
            <div className="border rounded-lg p-4 bg-muted/30">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">Tipo de Pago:</span>
                </div>
                
                <div className="flex items-center gap-4">
                  <label 
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                      tipoPago === 'contra_entrega' 
                        ? 'border-primary bg-primary/10 text-primary' 
                        : 'border-border hover:border-muted-foreground/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="tipoPago"
                      checked={tipoPago === 'contra_entrega'}
                      onChange={() => {
                        setTipoPago('contra_entrega');
                        setStatusPago('pendiente');
                        setFechaPago("");
                        setReferenciaPago("");
                        setComprobantePagoUrl("");
                      }}
                      className="sr-only"
                    />
                    <Truck className="h-4 w-4" />
                    <span className="text-sm font-medium">Contra Entrega</span>
                  </label>
                  
                  <label 
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                      tipoPago === 'anticipado' 
                        ? 'border-primary bg-primary/10 text-primary' 
                        : 'border-border hover:border-muted-foreground/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="tipoPago"
                      checked={tipoPago === 'anticipado'}
                      onChange={() => setTipoPago('anticipado')}
                      className="sr-only"
                    />
                    <CreditCard className="h-4 w-4" />
                    <span className="text-sm font-medium">Pago Anticipado</span>
                  </label>
                </div>

                {/* Anticipado inline options */}
                {tipoPago === 'anticipado' && (
                  <div className="flex items-center gap-4 ml-4 pl-4 border-l">
                    <span className="text-sm text-muted-foreground">Estado:</span>
                    <label 
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border cursor-pointer text-sm transition-all ${
                        statusPago === 'pendiente' 
                          ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400' 
                          : 'border-border hover:border-muted-foreground/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="statusPago"
                        checked={statusPago === 'pendiente'}
                        onChange={() => setStatusPago('pendiente')}
                        className="sr-only"
                      />
                      <Clock className="h-3.5 w-3.5" />
                      Pendiente
                    </label>
                    
                    <label 
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border cursor-pointer text-sm transition-all ${
                        statusPago === 'pagado' 
                          ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400' 
                          : 'border-border hover:border-muted-foreground/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="statusPago"
                        checked={statusPago === 'pagado'}
                        onChange={() => setStatusPago('pagado')}
                        className="sr-only"
                      />
                      <Check className="h-3.5 w-3.5" />
                      Ya pagado
                    </label>
                  </div>
                )}
              </div>

              {/* Payment details row - only if paid */}
              {tipoPago === 'anticipado' && statusPago === 'pagado' && (
                <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Fecha de pago</Label>
                    <Input
                      type="date"
                      value={fechaPago}
                      onChange={(e) => setFechaPago(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Referencia</Label>
                    <Input
                      value={referenciaPago}
                      onChange={(e) => setReferenciaPago(e.target.value)}
                      placeholder="Ej: Transferencia #12345"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Comprobante (opcional)</Label>
                    {!comprobantePagoUrl ? (
                      <div className="relative mt-1">
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            
                            setUploadingComprobante(true);
                            try {
                              const fileName = `comprobantes/${Date.now()}-${file.name}`;
                              const { error: uploadError } = await supabase.storage
                                .from('proveedor-facturas')
                                .upload(fileName, file);
                              
                              if (uploadError) throw uploadError;
                              
                              const { data: urlData } = supabase.storage
                                .from('proveedor-facturas')
                                .getPublicUrl(fileName);
                              
                              setComprobantePagoUrl(urlData.publicUrl);
                              toast({
                                title: "Comprobante subido",
                              });
                            } catch (error: any) {
                              toast({
                                title: "Error al subir",
                                description: error.message,
                                variant: "destructive",
                              });
                            } finally {
                              setUploadingComprobante(false);
                            }
                          }}
                          disabled={uploadingComprobante}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className={`flex items-center justify-center gap-2 px-3 py-2 border border-dashed rounded-md text-sm ${
                          uploadingComprobante ? 'bg-muted' : 'hover:border-primary/50 hover:bg-primary/5'
                        }`}>
                          {uploadingComprobante ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Upload className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Subir archivo</span>
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-1">
                        <FileCheck className="h-4 w-4 text-green-600" />
                        <a
                          href={comprobantePagoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Ver
                        </a>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setComprobantePagoUrl("")}
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Fecha de Entrega */}
            {!entregasMultiples && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Fecha de Entrega Programada *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !fechaEntrega && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {fechaEntrega 
                          ? format(new Date(fechaEntrega + "T12:00:00"), "dd/MM/yyyy") 
                          : "Seleccionar fecha"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={fechaEntrega ? new Date(fechaEntrega + "T12:00:00") : undefined}
                        onSelect={(date) => setFechaEntrega(date ? format(date, "yyyy-MM-dd") : "")}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}

            <div>
              <Label>Notas</Label>
              <Textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Notas adicionales..."
                rows={2}
              />
            </div>

            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Agregar Productos</h3>
                <div className="flex items-center gap-3">
                  {proveedorId && productosProveedor.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {productosDisponibles.length} productos de este proveedor
                    </Badge>
                  )}
                </div>
              </div>
              
              {/* Modo de creación toggle - solo mostrar si hay config de transporte */}
              {proveedorId && proveedorTieneTransportConfig && tipoProveedor === 'catalogo' && (
                <div className="flex items-center gap-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <Truck className="h-5 w-5 text-primary" />
                  <div className="flex items-center gap-4 text-sm">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="modoCreacion"
                        checked={modoCreacion === 'vehiculos'}
                        onChange={() => setModoCreacion('vehiculos')}
                        className="accent-primary"
                      />
                      <span className="font-medium">Por Vehículos (rápido)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="modoCreacion"
                        checked={modoCreacion === 'manual'}
                        onChange={() => setModoCreacion('manual')}
                        className="accent-primary"
                      />
                      <span>Manual (detallado)</span>
                    </label>
                  </div>
                </div>
              )}
              
              <div className="space-y-3">
                {/* Row 1: Product and Quantity/Vehicles */}
                <div className="grid grid-cols-12 gap-2">
                  <div className={modoCreacion === 'vehiculos' ? "col-span-6" : "col-span-7"}>
                    <Label>Producto</Label>
                    <Select
                      value={productoSeleccionado}
                      onValueChange={(value) => {
                        setProductoSeleccionado(value);
                        const prod = productosDisponibles.find((p) => p.id === value);
                        if (prod?.ultimo_costo_compra) {
                          setPrecioUnitario(prod.ultimo_costo_compra.toString());
                        }
                        // Auto-fill kg_por_unidad from peso_kg if product has it
                        if (prod?.peso_kg) {
                          setKgPorUnidad(prod.peso_kg.toString());
                        } else {
                          setKgPorUnidad("");
                        }
                      }}
                      disabled={tipoProveedor === 'catalogo' && !proveedorId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={
                          tipoProveedor === 'catalogo' 
                            ? (proveedorId ? "Seleccionar" : "Primero selecciona proveedor")
                            : "Seleccionar producto"
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {productosDisponibles.map((p) => {
                          const config = productosProveedorConfig.find(c => c.producto_id === p.id);
                          const tieneConfig = config?.capacidad_vehiculo_bultos && config.capacidad_vehiculo_bultos > 0;
                          return (
                            <SelectItem key={p.id} value={p.id}>
                              <div className="flex items-center gap-2">
                                {p.nombre}
                                {p.marca && <span className="text-xs text-muted-foreground">({p.marca})</span>}
                                {tieneConfig && modoCreacion === 'vehiculos' && (
                                  <Badge variant="secondary" className="text-xs">
                                    {config.capacidad_vehiculo_bultos} u/{config.tipo_vehiculo_estandar || 'tráiler'}
                                  </Badge>
                                )}
                                {p.ultimo_costo_compra && (
                                  <span className="text-xs text-muted-foreground">
                                    - Último: ${p.ultimo_costo_compra}
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          );
                        })}
                        {productosDisponibles.length === 0 && proveedorId && (
                          <div className="p-2 text-sm text-muted-foreground">
                            No hay productos asociados a este proveedor
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Config detected panel for vehicles mode */}
                  {modoCreacion === 'vehiculos' && productoSeleccionado && configTransporteProducto?.capacidad_vehiculo_bultos ? (
                    <div className="col-span-4 space-y-1">
                      <div className="flex items-center gap-2 text-sm bg-green-50 dark:bg-green-900/20 p-2 rounded border border-green-200 dark:border-green-800">
                        <Truck className="h-4 w-4 text-green-600" />
                        <span className="text-green-700 dark:text-green-400 font-medium">
                          {configTransporteProducto.tipo_vehiculo_estandar === 'trailer' ? 'Tráiler' : 
                           configTransporteProducto.tipo_vehiculo_estandar === 'torton' ? 'Tortón' : 
                           configTransporteProducto.tipo_vehiculo_estandar === 'rabon' ? 'Rabón' : 'Vehículo'} de {configTransporteProducto.capacidad_vehiculo_bultos.toLocaleString()} unidades
                          {configTransporteProducto.es_capacidad_fija && (
                            <span className="text-xs ml-1">(fija)</span>
                          )}
                        </span>
                      </div>
                      <Label>¿Cuántos vehículos?</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={numeroVehiculos}
                        onChange={(e) => setNumeroVehiculos(e.target.value.replace(/\D/g, ''))}
                        placeholder="Ej: 5"
                        className="font-bold text-lg"
                      />
                      {numeroVehiculos && (
                        <p className="text-xs text-muted-foreground">
                          Total: {(parseInt(numeroVehiculos) * configTransporteProducto.capacidad_vehiculo_bultos).toLocaleString()} unidades
                        </p>
                      )}
                    </div>
                  ) : modoCreacion === 'vehiculos' && productoSeleccionado ? (
                    <div className="col-span-4 flex items-center">
                      <div className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-2 rounded border border-amber-200 dark:border-amber-800">
                        ⚠️ Este producto no tiene configuración de transporte. Usa el modo manual.
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="col-span-3">
                        <Label>Cantidad (unidades)</Label>
                        <Input
                          type="number"
                          value={cantidad}
                          onChange={(e) => setCantidad(e.target.value)}
                          placeholder="0"
                          min="1"
                        />
                      </div>
                      <div className="col-span-2 flex flex-col gap-1">
                        <Label className="text-xs">Precio por kg</Label>
                        <div className="flex items-center gap-2 h-10">
                          <Switch
                            checked={usarPrecioPorKg}
                            onCheckedChange={(checked) => {
                              setUsarPrecioPorKg(checked);
                              if (checked) {
                                setPrecioUnitario("");
                              } else {
                                setPrecioPorKg("");
                                setKgPorUnidad("");
                              }
                            }}
                          />
                          <span className="text-xs text-muted-foreground">
                            {usarPrecioPorKg ? "Sí" : "No"}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                  
                  {modoCreacion === 'vehiculos' && (
                    <div className="col-span-2 flex flex-col gap-1">
                      <Label className="text-xs">Precio por kg</Label>
                      <div className="flex items-center gap-2 h-10">
                        <Switch
                          checked={usarPrecioPorKg}
                          onCheckedChange={(checked) => {
                            setUsarPrecioPorKg(checked);
                            if (checked) {
                              setPrecioUnitario("");
                            } else {
                              setPrecioPorKg("");
                              setKgPorUnidad("");
                            }
                          }}
                        />
                        <span className="text-xs text-muted-foreground">
                          {usarPrecioPorKg ? "Sí" : "No"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Row 2: Pricing fields */}
                <div className="grid grid-cols-12 gap-2 items-end">
                  {usarPrecioPorKg ? (
                    <>
                      <div className="col-span-3">
                        <Label>Precio por kg (proveedor)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={precioPorKg}
                          onChange={(e) => setPrecioPorKg(e.target.value)}
                          placeholder="$/kg"
                          min="0"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Kg por unidad</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={kgPorUnidad}
                          onChange={(e) => setKgPorUnidad(e.target.value)}
                          placeholder="5"
                          min="0"
                        />
                      </div>
                      <div className="col-span-3">
                        <Label>Precio por unidad (calculado)</Label>
                        <Input
                          type="text"
                          value={precioUnitarioCalculado ? `$${parseFloat(precioUnitarioCalculado).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : ""}
                          disabled
                          className="bg-muted font-medium"
                          placeholder="Auto"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="col-span-4">
                      <Label>Precio Unitario</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={precioUnitario}
                        onChange={(e) => setPrecioUnitario(e.target.value)}
                        placeholder="0.00"
                        min="0"
                      />
                    </div>
                  )}
                  <div className="col-span-2 flex flex-col gap-1">
                    <Label className="text-xs">IVA incluido</Label>
                    <div className="flex items-center gap-2 h-10">
                      <Switch
                        checked={precioIncluyeIva}
                        onCheckedChange={setPrecioIncluyeIva}
                      />
                      <span className="text-xs text-muted-foreground">
                        {precioIncluyeIva ? "Sí" : "No"}
                      </span>
                    </div>
                  </div>
                  <div className={usarPrecioPorKg ? "col-span-2" : "col-span-6"}>
                    <Button type="button" onClick={agregarProducto} className="w-full">
                      <Plus className="h-4 w-4 mr-1" /> Agregar
                    </Button>
                  </div>
                </div>
              </div>

              {productosEnOrden.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead>Cantidad</TableHead>
                        <TableHead>Precio</TableHead>
                        <TableHead>IVA</TableHead>
                        <TableHead>Subtotal</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productosEnOrden.map((p, index) => (
                        <TableRow key={index}>
                          <TableCell>{p.nombre}</TableCell>
                          <TableCell>{p.cantidad.toLocaleString()}</TableCell>
                          <TableCell>${formatCurrency(p.precio_unitario)}</TableCell>
                          <TableCell>
                            {p.aplica_iva ? (
                              <Badge variant={p.precio_incluye_iva ? "default" : "outline"} className="text-xs">
                                {p.precio_incluye_iva ? "Incluido" : "+16%"}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">N/A</span>
                            )}
                          </TableCell>
                          <TableCell>${formatCurrency(p.subtotal)}</TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => eliminarProducto(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

      <ReenviarOCDialog
        open={reenviarDialogOpen}
        onOpenChange={setReenviarDialogOpen}
        orden={ordenParaReenvio}
      />
            {/* Multiple Deliveries Section */}
            {productosEnOrden.length > 0 && (
              <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Truck className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <h3 className="font-semibold">Múltiples Entregas (Tráilers)</h3>
                      <p className="text-sm text-muted-foreground">
                        Divide la orden en varias entregas con fechas diferentes
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={entregasMultiples}
                    onCheckedChange={(checked) => {
                      setEntregasMultiples(checked);
                      if (!checked) {
                        setEntregasProgramadas([]);
                        setBultosPorEntrega("");
                      }
                    }}
                  />
                </div>

                {entregasMultiples && (
                  <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-3 gap-4 items-end">
                      <div>
                        <Label>Total de bultos en la orden</Label>
                        <Input
                          value={cantidadTotalBultos.toLocaleString()}
                          disabled
                          className="bg-muted"
                        />
                      </div>
                      <div>
                        <Label>Bultos por tráiler/entrega</Label>
                        <Input
                          type="number"
                          value={bultosPorEntrega}
                          onChange={(e) => setBultosPorEntrega(e.target.value)}
                          placeholder="Ej: 1200"
                          min="1"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={calcularEntregas}
                        disabled={!bultosPorEntrega || cantidadTotalBultos <= 0}
                      >
                        Calcular Entregas
                      </Button>
                    </div>

                    {entregasProgramadas.length > 0 && (
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Entrega #</TableHead>
                              <TableHead>Bultos</TableHead>
                              <TableHead>Fecha Programada</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {entregasProgramadas.map((entrega, index) => (
                              <TableRow key={index}>
                                <TableCell>
                                  <Badge variant="outline">
                                    Tráiler {entrega.numero_entrega}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    value={entrega.cantidad_bultos}
                                    onChange={(e) => updateCantidadEntrega(index, parseInt(e.target.value) || 0)}
                                    className="w-24"
                                    min="1"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="date"
                                    value={entrega.fecha_programada}
                                    onChange={(e) => updateFechaEntrega(index, e.target.value)}
                                    placeholder="Pendiente"
                                  />
                                  {!entrega.fecha_programada && (
                                    <span className="text-xs text-amber-600 mt-1 block">Pendiente de programar</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        <div className="p-2 bg-muted text-sm text-muted-foreground text-center">
                          Total: {entregasProgramadas.reduce((sum, e) => sum + e.cantidad_bultos, 0).toLocaleString()} bultos en {entregasProgramadas.length} entregas
                          {entregasProgramadas.some(e => !e.fecha_programada) && (
                            <span className="text-amber-600 ml-2">
                              ({entregasProgramadas.filter(e => !e.fecha_programada).length} pendientes de fecha)
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {productosEnOrden.length > 0 && (
              <div className="border rounded-lg p-4 bg-muted/50">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${formatCurrency(totalesOrden.subtotal)}</span>
                  </div>
                  {totalesOrden.iva > 0 && (
                    <div className="flex justify-between">
                      <span>IVA (16%):</span>
                      <span>${formatCurrency(totalesOrden.iva)}</span>
                    </div>
                  )}
                  {totalesOrden.ieps > 0 && (
                    <div className="flex justify-between">
                      <span>IEPS (8%):</span>
                      <span>${formatCurrency(totalesOrden.ieps)}</span>
                    </div>
                  )}
                  {totalesOrden.iva === 0 && totalesOrden.ieps === 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Impuestos:</span>
                      <span>$0.00</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>${formatCurrency(totalesOrden.total)}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createOrden.isPending || updateOrden.isPending}>
                {(createOrden.isPending || updateOrden.isPending) 
                  ? "Guardando..." 
                  : editingOrdenId ? "Guardar Cambios" : "Crear Orden"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <OrdenAccionesDialog
        open={accionesDialogOpen}
        onOpenChange={setAccionesDialogOpen}
        orden={ordenSeleccionada}
        onEdit={handleEditOrden}
      />

      <ReenviarOCDialog
        open={reenviarDialogOpen}
        onOpenChange={setReenviarDialogOpen}
        orden={ordenParaReenvio}
      />

      <AutorizacionOCDialog
        open={autorizacionDialogOpen}
        onOpenChange={setAutorizacionDialogOpen}
        orden={ordenSeleccionada}
      />

      <ProveedorFacturasDialog
        open={facturasDialogOpen}
        onOpenChange={setFacturasDialogOpen}
        ordenCompra={ordenParaFacturas}
      />

      <MarcarPagadoDialog
        open={marcarPagadoDialogOpen}
        onOpenChange={setMarcarPagadoDialogOpen}
        orden={ordenParaPago}
      />

      <ProcesarPagoOCDialog
        open={procesarPagoDialogOpen}
        onOpenChange={setProcesarPagoDialogOpen}
        orden={ordenParaProcesarPago}
        onOpenFacturas={() => {
          if (ordenParaProcesarPago) {
            setOrdenParaFacturas({
              id: ordenParaProcesarPago.id,
              folio: ordenParaProcesarPago.folio,
              proveedor_nombre: ordenParaProcesarPago.proveedor_nombre,
              total: ordenParaProcesarPago.total,
            });
            setFacturasDialogOpen(true);
          }
        }}
      />

      <CrearOrdenCompraWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        proveedores={proveedores}
        productos={productos}
        proveedoresManuales={proveedoresManuales}
      />

      <NotificarCambiosOCDialog
        open={notificarCambiosOpen}
        onOpenChange={setNotificarCambiosOpen}
        ordenId={ordenEditadaInfo?.id || ""}
        folio={ordenEditadaInfo?.folio || ""}
        proveedorId={ordenEditadaInfo?.proveedorId || null}
        proveedorNombre={ordenEditadaInfo?.proveedorNombre || ""}
        cambios={cambiosDetectados}
        onNotificacionEnviada={() => {
          setOrdenAnteriorSnapshot(null);
          setOrdenEditadaInfo(null);
          setCambiosDetectados([]);
          toast({
            title: "Orden actualizada",
            description: "La orden de compra se ha actualizado y el proveedor fue notificado",
          });
        }}
      />

      {/* AlertDialog para confirmar eliminación de OC */}
      <AlertDialog open={confirmarEliminacionOpen} onOpenChange={setConfirmarEliminacionOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              ¿Eliminar Orden de Compra?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Estás a punto de eliminar la orden <strong>{ordenParaEliminar?.folio}</strong> 
                  {" "}del proveedor <strong>{ordenParaEliminar?.proveedores?.nombre || ordenParaEliminar?.proveedor_nombre_manual}</strong>.
                </p>
                {(ordenParaEliminar?.status === 'enviada' || ordenParaEliminar?.status === 'confirmada') && (
                  <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                    <p className="text-amber-700 dark:text-amber-400 text-sm font-medium">
                      ⚠️ Una vez eliminada, se le notificará al proveedor por correo electrónico 
                      que esta orden ha sido cancelada.
                    </p>
                  </div>
                )}
                <p className="text-muted-foreground text-sm">
                  Esta acción no se puede deshacer.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminandoOrden}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEliminarOrden}
              disabled={eliminandoOrden}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {eliminandoOrden ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {(ordenParaEliminar?.status === 'enviada' || ordenParaEliminar?.status === 'confirmada') 
                    ? "Eliminar y Notificar" 
                    : "Eliminar"}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default OrdenesCompraTab;
