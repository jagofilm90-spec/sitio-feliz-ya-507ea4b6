import { useState, useEffect, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { COMPANY_DATA } from "@/constants/companyData";
import { formatDireccionFiscal } from "@/lib/proveedorUtils";
import { htmlToPdfBase64 } from "@/lib/htmlToPdfBase64";
import { getRegimenDescripcion } from "@/constants/catalogoSAT";
import { CalendarioOcupacion } from "./CalendarioOcupacion";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  DialogFooter,
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
import { 
  Plus, Trash2, Loader2, Truck, ArrowRight, ArrowLeft, Check, 
  Calendar as CalendarIcon, CreditCard, ChevronDown, ChevronUp, Package, Mail, Gift, DollarSign, AlertTriangle
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// Helper para parsear fechas evitando problemas de zona horaria
const parseDateLocal = (dateStr: string) => {
  if (!dateStr) return new Date();
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};
import { formatCurrency } from "@/lib/utils";
import { sendPushNotification } from "@/services/pushNotifications";
import { registrarCorreoEnviado } from "@/components/compras/HistorialCorreosOC";

// Interfaz para créditos pendientes del proveedor
interface CreditoPendiente {
  id: string;
  producto_id: string | null;
  producto_nombre: string;
  cantidad: number;
  precio_unitario: number;
  monto_total: number;
  motivo: string;
  orden_compra_origen_id: string;
  ordenes_compra?: { folio: string } | null;
}

interface CreditoSeleccion {
  id: string;
  tipo: 'descuento' | 'reposicion' | null;
  monto: number;
  cantidad: number;
  producto_nombre: string;
  oc_origen_folio: string;
  producto_id: string | null;
}

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
  precio_incluye_ieps: boolean;
}

interface EntregaProgramada {
  numero_entrega: number;
  cantidad_bultos: number;
  fecha_programada: string;
}

interface Proveedor {
  id: string;
  nombre: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  rfc?: string;
  regimen_fiscal?: string;
  calle?: string;
  numero_exterior?: string;
  numero_interior?: string;
  colonia?: string;
  municipio?: string;
  estado?: string;
  codigo_postal?: string;
}

interface Producto {
  id: string;
  nombre: string;
  codigo?: string;
  marca?: string;
  ultimo_costo_compra?: number;
  aplica_iva?: boolean;
  aplica_ieps?: boolean;
  kg_por_unidad?: number;
  peso_kg?: number;
  precio_por_kilo?: boolean;
  unidad?: string;
  puede_tener_promocion?: boolean;
  categoria?: string;
  contenido_empaque?: string;
  requiere_fumigacion?: boolean;
  // Campos adicionales para herencia completa en variantes promocionales
  codigo_sat?: string;
  unidad_sat?: string;
  descuento_maximo?: number;
  proveedor_preferido_id?: string;
  maneja_caducidad?: boolean;
  piezas_por_unidad?: number;
  especificaciones?: string;
  solo_uso_interno?: boolean;
  precio_venta?: number;
  precio_compra?: number;
}

// Calcula precio de venta sugerido manteniendo el mismo margen del producto base
function calcularPrecioVentaSugerido(productoBase: Producto, costoPromo: string): number {
  const costo = parseFloat(costoPromo);
  if (isNaN(costo) || costo <= 0) return 0;
  
  // Si el producto base tiene precio de venta y costo, calcular el margen
  const precioVentaBase = productoBase.precio_venta || 0;
  const costoBase = productoBase.precio_compra || productoBase.ultimo_costo_compra || 0;
  
  if (precioVentaBase > 0 && costoBase > 0) {
    const margenPorcentaje = (precioVentaBase - costoBase) / costoBase;
    // Aplicar el mismo margen al costo promocional
    return Math.round(costo * (1 + margenPorcentaje) * 100) / 100;
  }
  
  // Si no hay datos suficientes, usar el mismo precio de venta del base
  return precioVentaBase;
}

interface ProveedorConfig {
  producto_id: string;
  tipo_vehiculo_estandar?: string;
  capacidad_vehiculo_bultos?: number;
  capacidad_vehiculo_kg?: number;
  permite_combinacion?: boolean;
  es_capacidad_fija?: boolean;
  precio_por_kilo_compra?: boolean | null;
  costo_proveedor?: number | null;
}

interface ProveedorManual {
  nombre: string;
  telefono: string;
  notas: string;
}

interface CrearOrdenCompraWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proveedores: Proveedor[];
  productos: Producto[];
  proveedoresManuales: ProveedorManual[];
}

const CrearOrdenCompraWizard = ({
  open,
  onOpenChange,
  proveedores,
  productos,
  proveedoresManuales,
}: CrearOrdenCompraWizardProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Wizard state - now 4 steps
  const [step, setStep] = useState(1);
  const [pasoCreacion, setPasoCreacion] = useState("");
  
  // Step 1: Proveedor y Pago
  const [tipoProveedor, setTipoProveedor] = useState<'catalogo' | 'manual'>('catalogo');
  const [proveedorId, setProveedorId] = useState("");
  const [proveedorNombreManual, setProveedorNombreManual] = useState("");
  const [proveedorEmailManual, setProveedorEmailManual] = useState("");
  const [proveedorTelefonoManual, setProveedorTelefonoManual] = useState("");
  const [notasProveedorManual, setNotasProveedorManual] = useState("");
  const [showProveedorSuggestions, setShowProveedorSuggestions] = useState(false);
  const [tipoPago, setTipoPago] = useState<'contra_entrega' | 'anticipado'>('contra_entrega');
  
  // AlertDialog for missing email confirmation
  const [showEmailWarning, setShowEmailWarning] = useState(false);
  
  // Advanced options (collapsed by default)
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [notas, setNotas] = useState("");
  
  // Step 2: Productos
  const [productosEnOrden, setProductosEnOrden] = useState<ProductoEnOrden[]>([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [precioUnitario, setPrecioUnitario] = useState("");
  const [precioIncluyeIva, setPrecioIncluyeIva] = useState(true);
  const [precioIncluyeIeps, setPrecioIncluyeIeps] = useState(true);
  
  // Precio por kg (heredado del proveedor-producto o manual)
  const [usaPrecioPorKg, setUsaPrecioPorKg] = useState(false);
  const [showOverridePrecioUnidad, setShowOverridePrecioUnidad] = useState(false);
  const [precioPorKg, setPrecioPorKg] = useState("");
  const [kgPorUnidad, setKgPorUnidad] = useState("");
  
  // State for asking the user about precio por kilo when not configured
  const [showPreguntaPrecioKg, setShowPreguntaPrecioKg] = useState(false);
  const [guardarPreferenciaPrecioKg, setGuardarPreferenciaPrecioKg] = useState(true);
  // Vehicle mode
  const [modoCreacion, setModoCreacion] = useState<'manual' | 'vehiculos'>('manual');
  const [numeroVehiculos, setNumeroVehiculos] = useState("");
  
  // Step 3: Programar Entregas
  const [tipoEntrega, setTipoEntrega] = useState<'unica' | 'multiple'>('unica');
  const [fechaEntregaUnica, setFechaEntregaUnica] = useState("");
  const [bultosPorEntrega, setBultosPorEntrega] = useState("");
  const [entregasProgramadas, setEntregasProgramadas] = useState<EntregaProgramada[]>([]);
  const [entregaEnEdicion, setEntregaEnEdicion] = useState<number | null>(null);
  
  // Folio (auto-generated)
  const [folio, setFolio] = useState("");
  const [generatingFolio, setGeneratingFolio] = useState(false);
  
  // Promotional variant flow state
  const [showPromoDialog, setShowPromoDialog] = useState(false);
  const [pendingProductForPromo, setPendingProductForPromo] = useState<Producto | null>(null);
  const [promoDescripcion, setPromoDescripcion] = useState("");
  const [promoPrecio, setPromoPrecio] = useState("");
  const [promoBloqueado, setPromoBloqueado] = useState(false);
  const [creatingPromoVariant, setCreatingPromoVariant] = useState(false);
  
  // Proveedor productos config
  const [productosProveedorConfig, setProductosProveedorConfig] = useState<ProveedorConfig[]>([]);
  
  // Créditos pendientes del proveedor
  const [creditosPendientes, setCreditosPendientes] = useState<CreditoPendiente[]>([]);
  const [creditosSeleccionados, setCreditosSeleccionados] = useState<Map<string, CreditoSeleccion>>(new Map());
  const [loadingCreditos, setLoadingCreditos] = useState(false);
  
  // Auto-calculate precio unitario when using precio por kg
  const precioUnitarioCalculado = usaPrecioPorKg && precioPorKg && kgPorUnidad
    ? (parseFloat(precioPorKg) * parseFloat(kgPorUnidad)).toFixed(2)
    : "";
  
  // Track if current product uses precio_por_kilo from catalog (moved after productosDisponibles)
  
  // Filter products based on provider
  const productosProveedor = productosProveedorConfig.map(p => p.producto_id);
  
  const proveedorTieneTransportConfig = productosProveedorConfig.some(
    p => p.capacidad_vehiculo_bultos && p.capacidad_vehiculo_bultos > 0
  );
  
  const configTransporteProducto = productosProveedorConfig.find(
    p => p.producto_id === productoSeleccionado
  );
  
  const productosDisponibles = tipoProveedor === 'manual' 
    ? productos
    : (proveedorId && productosProveedor.length > 0
        ? productos.filter(p => productosProveedor.includes(p.id))
        : productos);

  // Track if current product uses precio_por_kilo from proveedor config
  const productoSeleccionadoData = productosDisponibles.find(p => p.id === productoSeleccionado);
  const productoEsDeCatalogo = tipoProveedor === 'catalogo' && productoSeleccionadoData;
  
  // Get precio_por_kilo_compra from proveedor-producto config
  const configPrecioCompra = productosProveedorConfig.find(p => p.producto_id === productoSeleccionado);
  const precioPorKiloCompraConfigurado = configPrecioCompra?.precio_por_kilo_compra;
  
  // Fallback to product catalog if proveedor-producto doesn't have config
  const productoPrecioPorKgCatalogo = productoEsDeCatalogo ? productoSeleccionadoData?.precio_por_kilo : undefined;
        
  // Filter suggestions based on input
  const proveedorSuggestions = proveedoresManuales.filter(p => 
    p.nombre.toLowerCase().includes(proveedorNombreManual.toLowerCase()) && 
    proveedorNombreManual.length > 0
  );

  // Generate folio on open
  useEffect(() => {
    if (open) {
      generateNextFolio();
    }
  }, [open]);
  
  // Load proveedor products config
  useEffect(() => {
    const loadConfig = async () => {
      if (proveedorId) {
        const { data, error } = await supabase
          .from("proveedor_productos")
          .select(`
            producto_id,
            tipo_vehiculo_estandar,
            capacidad_vehiculo_bultos,
            capacidad_vehiculo_kg,
            permite_combinacion,
            es_capacidad_fija,
            precio_por_kilo_compra,
            costo_proveedor
          `)
          .eq("proveedor_id", proveedorId);
        if (!error && data) {
          setProductosProveedorConfig(data);
        }
      } else {
        setProductosProveedorConfig([]);
      }
    };
    loadConfig();
  }, [proveedorId]);

  // Load pending credits for selected provider
  useEffect(() => {
    const loadCreditos = async () => {
      // Reset credits when no provider selected
      if (!proveedorId && tipoProveedor === 'catalogo') {
        setCreditosPendientes([]);
        setCreditosSeleccionados(new Map());
        return;
      }
      
      // For manual providers, we don't have credits tracking yet
      if (tipoProveedor === 'manual') {
        setCreditosPendientes([]);
        setCreditosSeleccionados(new Map());
        return;
      }
      
      setLoadingCreditos(true);
      try {
        const { data, error } = await supabase
          .from("proveedor_creditos_pendientes")
          .select(`
            id, producto_id, producto_nombre, cantidad, precio_unitario, monto_total,
            motivo, orden_compra_origen_id
          `)
          .eq("proveedor_id", proveedorId)
          .eq("status", "pendiente");
        
        if (!error && data) {
          // Fetch folios separately to avoid the relationship conflict
          const creditosWithFolios: CreditoPendiente[] = [];
          for (const credito of data) {
            let folio = 'N/A';
            if (credito.orden_compra_origen_id) {
              const { data: ocData } = await supabase
                .from("ordenes_compra")
                .select("folio")
                .eq("id", credito.orden_compra_origen_id)
                .maybeSingle();
              if (ocData?.folio) {
                folio = ocData.folio;
              }
            }
            creditosWithFolios.push({
              ...credito,
              ordenes_compra: { folio }
            });
          }
          setCreditosPendientes(creditosWithFolios);
        } else {
          setCreditosPendientes([]);
        }
      } catch (err) {
        console.error("Error loading credits:", err);
        setCreditosPendientes([]);
      } finally {
        setLoadingCreditos(false);
      }
    };
    loadCreditos();
  }, [proveedorId, tipoProveedor]);

  // Helper functions for credit selection
  const seleccionarCredito = (credito: CreditoPendiente, tipo: 'descuento' | 'reposicion') => {
    const newMap = new Map(creditosSeleccionados);
    newMap.set(credito.id, {
      id: credito.id,
      tipo,
      monto: credito.monto_total,
      cantidad: credito.cantidad,
      producto_nombre: credito.producto_nombre,
      oc_origen_folio: credito.ordenes_compra?.folio || 'N/A',
      producto_id: credito.producto_id
    });
    setCreditosSeleccionados(newMap);
  };

  const deseleccionarCredito = (creditoId: string) => {
    const newMap = new Map(creditosSeleccionados);
    newMap.delete(creditoId);
    setCreditosSeleccionados(newMap);
  };

  // Calculate totals for selected credits
  const totalDescuentoSeleccionado = useMemo(() => {
    let total = 0;
    for (const seleccion of creditosSeleccionados.values()) {
      if (seleccion.tipo === 'descuento') {
        total += seleccion.monto;
      }
    }
    return total;
  }, [creditosSeleccionados]);

  const totalReposicionBultos = useMemo(() => {
    let total = 0;
    for (const seleccion of creditosSeleccionados.values()) {
      if (seleccion.tipo === 'reposicion') {
        total += seleccion.cantidad;
      }
    }
    return total;
  }, [creditosSeleccionados]);

  const totalCreditosPendientes = useMemo(() => {
    return creditosPendientes.reduce((sum, c) => sum + c.monto_total, 0);
  }, [creditosPendientes]);

  const motivoLabels: Record<string, string> = {
    'faltante': 'Faltante',
    'devolucion': 'Devolución',
    'danado': 'Dañado',
    'rechazado_calidad': 'Rechazado',
    'no_llego': 'No llegó'
  };

  const motivoColors: Record<string, string> = {
    'faltante': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    'devolucion': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    'danado': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    'rechazado_calidad': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    'no_llego': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
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
  
  // Calculate totals
  const calcularTotalesOrden = () => {
    let subtotalBase = 0;
    let ivaAmount = 0;
    let iepsAmount = 0;

    for (const p of productosEnOrden) {
      // Calculate base and taxes considering both IVA and IEPS included status
      let base = p.subtotal;
      let divisor = 1;
      
      if (p.aplica_iva && p.precio_incluye_iva) {
        divisor *= 1.16;
      }
      if (p.aplica_ieps && p.precio_incluye_ieps) {
        divisor *= 1.08;
      }
      
      base = p.subtotal / divisor;
      subtotalBase += base;
      
      if (p.aplica_iva) {
        if (p.precio_incluye_iva) {
          ivaAmount += base * 0.16;
        } else {
          ivaAmount += p.subtotal * 0.16;
        }
      }
      
      if (p.aplica_ieps) {
        if (p.precio_incluye_ieps) {
          iepsAmount += base * 0.08;
        } else {
          const baseForIeps = p.aplica_iva && !p.precio_incluye_iva ? p.subtotal : base;
          iepsAmount += baseForIeps * 0.08;
        }
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

  // Calculate deliveries for multiple mode
  const calcularEntregas = () => {
    const bultosPorTrailer = parseInt(bultosPorEntrega) || 0;
    
    if (cantidadTotalBultos <= 0 || bultosPorTrailer <= 0) {
      setEntregasProgramadas([]);
      return;
    }
    
    const numEntregas = Math.ceil(cantidadTotalBultos / bultosPorTrailer);
    const entregas: EntregaProgramada[] = [];
    let bultosRestantes = cantidadTotalBultos;
    
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
  
  // Auto-advance to next delivery without a date when entregasProgramadas changes
  // This useEffect ensures we use the updated state instead of stale closure
  useEffect(() => {
    if (entregaEnEdicion === null) return;
    
    // Check if the current delivery now has a date
    const currentEntrega = entregasProgramadas[entregaEnEdicion];
    if (!currentEntrega?.fecha_programada) return; // Still needs a date, don't advance
    
    // Find next delivery without a date (after current index)
    const siguienteSinFecha = entregasProgramadas.findIndex(
      (e, i) => i > entregaEnEdicion && !e.fecha_programada
    );
    
    if (siguienteSinFecha >= 0) {
      setEntregaEnEdicion(siguienteSinFecha);
    } else {
      // Check if there's any without date before current
      const anteriorSinFecha = entregasProgramadas.findIndex(
        (e) => !e.fecha_programada
      );
      setEntregaEnEdicion(anteriorSinFecha >= 0 ? anteriorSinFecha : null);
    }
  }, [entregasProgramadas]);

  // Initialize single delivery date when entering step 3
  useEffect(() => {
    if (step === 3 && tipoEntrega === 'unica' && !fechaEntregaUnica) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setFechaEntregaUnica(format(tomorrow, "yyyy-MM-dd"));
    }
  }, [step, tipoEntrega]);
  
  // Save precio_por_kilo_compra preference
  const guardarPreferenciaPrecioKgEnDB = async (productoId: string, precioPorKg: boolean) => {
    if (!proveedorId) return;
    
    try {
      await supabase
        .from("proveedor_productos")
        .update({ 
          precio_por_kilo_compra: precioPorKg,
          updated_at: new Date().toISOString()
        })
        .eq("proveedor_id", proveedorId)
        .eq("producto_id", productoId);
    } catch (error) {
      console.error("Error saving precio_por_kilo_compra preference:", error);
    }
  };
  
  // Add product
  const agregarProducto = async () => {
    if (modoCreacion === 'vehiculos') {
      agregarProductoPorVehiculos();
      return;
    }
    
    const precioFinal = usaPrecioPorKg ? precioUnitarioCalculado : precioUnitario;
    
    if (!productoSeleccionado || !cantidad || !precioFinal) {
      toast({
        title: "Campos incompletos",
        description: usaPrecioPorKg 
          ? "Selecciona un producto, cantidad, precio/kg y kg/unidad"
          : "Selecciona un producto, cantidad y precio",
        variant: "destructive",
      });
      return;
    }

    const producto = productosDisponibles.find((p) => p.id === productoSeleccionado);
    if (!producto) return;

    // Save preference if user answered the question and wants to remember
    if (showPreguntaPrecioKg && guardarPreferenciaPrecioKg && tipoProveedor === 'catalogo') {
      await guardarPreferenciaPrecioKgEnDB(productoSeleccionado, usaPrecioPorKg);
      // Refresh the config
      queryClient.invalidateQueries({ queryKey: ["proveedor-productos-config", proveedorId] });
    }

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
        precio_incluye_ieps: precioIncluyeIeps,
      },
    ]);

    resetProductoForm();
  };
  
  const agregarProductoPorVehiculos = async () => {
    const precioFinal = usaPrecioPorKg ? precioUnitarioCalculado : precioUnitario;
    
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

    // Save preference if user answered the question and wants to remember
    if (showPreguntaPrecioKg && guardarPreferenciaPrecioKg && tipoProveedor === 'catalogo') {
      await guardarPreferenciaPrecioKgEnDB(productoSeleccionado, usaPrecioPorKg);
      queryClient.invalidateQueries({ queryKey: ["proveedor-productos-config", proveedorId] });
    }

    const numVehiculos = parseInt(numeroVehiculos);
    const capacidad = configTransporteProducto.capacidad_vehiculo_bultos;
    const cantidadTotal = capacidad * numVehiculos;
    const precioNum = parseFloat(precioFinal);
    const subtotal = cantidadTotal * precioNum;

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
        precio_incluye_ieps: precioIncluyeIeps,
      },
    ]);

    // Auto-activate multiple deliveries
    setTipoEntrega('multiple');
    
    // Auto-generate deliveries (one per vehicle)
    const entregas: EntregaProgramada[] = Array.from({ length: numVehiculos }, (_, i) => ({
      numero_entrega: i + 1,
      cantidad_bultos: capacidad,
      fecha_programada: "",
    }));
    setEntregasProgramadas(entregas);
    setBultosPorEntrega(capacidad.toString());

    resetProductoForm();
    
    toast({
      title: "Producto agregado",
      description: `${numVehiculos} vehículos de ${producto.nombre} (${cantidadTotal.toLocaleString()} unidades)`,
    });
  };

  const resetProductoForm = () => {
    setProductoSeleccionado("");
    setCantidad("");
    setPrecioUnitario("");
    setPrecioIncluyeIva(true);
    setPrecioIncluyeIeps(true);
    setUsaPrecioPorKg(false);
    setShowOverridePrecioUnidad(false);
    setShowPreguntaPrecioKg(false);
    setGuardarPreferenciaPrecioKg(true);
    setPrecioPorKg("");
    setKgPorUnidad("");
    setNumeroVehiculos("");
  };

  const resetPromoForm = () => {
    setShowPromoDialog(false);
    setPendingProductForPromo(null);
    setPromoDescripcion("");
    setPromoPrecio("");
    setPromoBloqueado(false);
  };

  // Handle product selection - check if promotion dialog is needed
  const handleProductSelect = (productId: string) => {
    setProductoSeleccionado(productId);
    setShowOverridePrecioUnidad(false);
    setShowPreguntaPrecioKg(false);
    
    const prod = productosDisponibles.find(p => p.id === productId);
    const provConfig = productosProveedorConfig.find(pc => pc.producto_id === productId);
    
    // Use costo_proveedor if available, otherwise fallback to ultimo_costo_compra
    if (provConfig?.costo_proveedor) {
      setPrecioUnitario(provConfig.costo_proveedor.toString());
    } else if (prod?.ultimo_costo_compra) {
      setPrecioUnitario(prod.ultimo_costo_compra.toString());
    } else {
      setPrecioUnitario("");
    }
    
    if (prod?.kg_por_unidad) {
      setKgPorUnidad(prod.kg_por_unidad.toString());
    }
    
    // Check proveedor-producto config for precio por kilo
    if (tipoProveedor === 'catalogo' && provConfig) {
      if (provConfig.precio_por_kilo_compra !== null && provConfig.precio_por_kilo_compra !== undefined) {
        setUsaPrecioPorKg(provConfig.precio_por_kilo_compra);
      } else {
        setShowPreguntaPrecioKg(true);
        setUsaPrecioPorKg(false);
      }
    } else if (tipoProveedor === 'manual') {
      setUsaPrecioPorKg(false);
    }
    
    // Check if product can have promotions and show dialog
    if (prod?.puede_tener_promocion) {
      setPendingProductForPromo(prod);
      setPromoPrecio(provConfig?.costo_proveedor?.toString() || prod?.ultimo_costo_compra?.toString() || "");
      setShowPromoDialog(true);
    }
  };

  // Handle user choosing "No promotion"
  const handleNoPromotion = () => {
    resetPromoForm();
    // Product is already selected, user continues normally
  };

  // Handle user choosing "Yes, has promotion" - create variant
  const handleCreatePromoVariant = async () => {
    if (!pendingProductForPromo || !promoDescripcion.trim() || !promoPrecio) {
      toast({
        title: "Datos incompletos",
        description: "Ingresa la descripción de la promoción y el precio",
        variant: "destructive",
      });
      return;
    }

    setCreatingPromoVariant(true);
    
    try {
      // Generate promo code
      const baseCode = pendingProductForPromo.codigo || pendingProductForPromo.id.slice(0, 6).toUpperCase();
      const promoCode = `${baseCode}-PROMO-${Date.now().toString(36).toUpperCase().slice(-4)}`;
      
      // Create the promotional variant product with full field inheritance
      const precioVentaSugerido = calcularPrecioVentaSugerido(pendingProductForPromo, promoPrecio);
      
      const { data: newVariant, error } = await supabase
        .from("productos")
        .insert({
          // Identificación
          codigo: promoCode,
          nombre: promoDescripcion.trim(),
          
          // Herencia de características básicas
          marca: pendingProductForPromo.marca,
          categoria: pendingProductForPromo.categoria,
          contenido_empaque: pendingProductForPromo.contenido_empaque,
          especificaciones: pendingProductForPromo.especificaciones,
          unidad: pendingProductForPromo.unidad as any,
          peso_kg: pendingProductForPromo.peso_kg || pendingProductForPromo.kg_por_unidad,
          piezas_por_unidad: pendingProductForPromo.piezas_por_unidad,
          
          // Herencia de configuración fiscal (SAT)
          codigo_sat: pendingProductForPromo.codigo_sat,
          unidad_sat: pendingProductForPromo.unidad_sat,
          aplica_iva: pendingProductForPromo.aplica_iva ?? false,
          aplica_ieps: pendingProductForPromo.aplica_ieps ?? false,
          
          // Herencia de configuración operativa
          requiere_fumigacion: pendingProductForPromo.requiere_fumigacion ?? false,
          precio_por_kilo: pendingProductForPromo.precio_por_kilo ?? false,
          maneja_caducidad: pendingProductForPromo.maneja_caducidad,
          proveedor_preferido_id: pendingProductForPromo.proveedor_preferido_id,
          descuento_maximo: pendingProductForPromo.descuento_maximo,
          solo_uso_interno: pendingProductForPromo.solo_uso_interno ?? false,
          
          // Costos y precios
          ultimo_costo_compra: parseFloat(promoPrecio),
          precio_compra: parseFloat(promoPrecio),
          precio_venta: precioVentaSugerido, // Calculado con mismo margen del base
          
          // Stock
          stock_actual: 0, // Se actualiza al recibir
          stock_minimo: 0, // Las promos no necesitan mínimo
          
          // Identificación como variante promocional
          producto_base_id: pendingProductForPromo.id,
          es_promocion: true,
          descripcion_promocion: promoDescripcion.trim(),
          bloqueado_venta: promoBloqueado,
          activo: true,
        })
        .select()
        .single();

      if (error) throw error;

      // Update the selected product to use the new variant
      setProductoSeleccionado(newVariant.id);
      setPrecioUnitario(promoPrecio);
      
      // Refresh products in query cache
      queryClient.invalidateQueries({ queryKey: ["productos"] });

      toast({
        title: "✅ Variante promocional creada",
        description: `"${promoDescripcion}" vinculada a ${pendingProductForPromo.nombre}`,
      });

      resetPromoForm();
    } catch (error: any) {
      console.error("Error creating promo variant:", error);
      toast({
        title: "Error al crear variante",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCreatingPromoVariant(false);
    }
  };

  const eliminarProducto = (index: number) => {
    setProductosEnOrden(productosEnOrden.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setStep(1);
    setTipoProveedor('catalogo');
    setProveedorId("");
    setProveedorNombreManual("");
    setProveedorEmailManual("");
    setProveedorTelefonoManual("");
    setNotasProveedorManual("");
    setShowProveedorSuggestions(false);
    setTipoPago('contra_entrega');
    setShowAdvanced(false);
    setShowEmailWarning(false);
    setNotas("");
    setProductosEnOrden([]);
    resetProductoForm();
    setTipoEntrega('unica');
    setFechaEntregaUnica("");
    setBultosPorEntrega("");
    setEntregasProgramadas([]);
    setModoCreacion('manual');
    setFolio("");
    // Reset credits
    setCreditosPendientes([]);
    setCreditosSeleccionados(new Map());
  };
  
  // Create orden mutation
  const createOrden = useMutation({
    mutationFn: async () => {
      setPasoCreacion("Creando orden...");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

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

      const entregasMultiples = tipoEntrega === 'multiple';
      const fechaEntrega = tipoEntrega === 'unica' ? fechaEntregaUnica : null;

      // Create orden
      const { data: orden, error: ordenError } = await supabase
        .from("ordenes_compra")
        .insert({
          folio,
          proveedor_id: tipoProveedor === 'catalogo' ? proveedorId : null,
          proveedor_nombre_manual: tipoProveedor === 'manual' ? proveedorNombreManual : null,
          proveedor_email_manual: tipoProveedor === 'manual' ? proveedorEmailManual || null : null,
          proveedor_telefono_manual: tipoProveedor === 'manual' ? proveedorTelefonoManual || null : null,
          notas_proveedor_manual: tipoProveedor === 'manual' ? notasProveedorManual || null : null,
          fecha_entrega_programada: fechaEntrega,
          subtotal: subtotalBase,
          impuestos,
          total,
          notas,
          creado_por: user.id,
          // Si es pago anticipado, la OC queda pendiente de pago; sino, pendiente de autorización
          status: tipoPago === 'anticipado' ? "pendiente_pago" : "pendiente",
          entregas_multiples: entregasMultiples,
          tipo_pago: tipoPago,
          status_pago: 'pendiente',
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

      // Create deliveries
      if (entregasMultiples && entregasProgramadas.length > 0) {
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
      } else if (!entregasMultiples && fechaEntregaUnica) {
        const cantidadTotalBultos = productosEnOrden.reduce((sum, p) => sum + p.cantidad, 0);
        
        const { error: entregaError } = await supabase
          .from("ordenes_compra_entregas")
          .insert({
            orden_compra_id: orden.id,
            numero_entrega: 1,
            cantidad_bultos: cantidadTotalBultos,
            fecha_programada: fechaEntregaUnica,
            status: "programada",
          });

        if (entregaError) throw entregaError;
      }

      // NOTE: ultimo_costo_compra is NOT updated here.
      // Cost updates only happen at conciliation (ConciliarFacturaDialog / ConciliacionRapidaDialog)
      // to ensure ultimo_costo_compra reflects verified financial data.

      // Apply selected credits to the OC
      if (creditosSeleccionados.size > 0) {
        const creditosDescuento: any[] = [];
        const creditosReposicion: any[] = [];
        let totalDescuento = 0;
        
        for (const [creditoId, seleccion] of creditosSeleccionados) {
          if (seleccion.tipo === 'descuento') {
            creditosDescuento.push({
              credito_id: creditoId,
              monto: seleccion.monto,
              producto: seleccion.producto_nombre,
              oc_origen_folio: seleccion.oc_origen_folio
            });
            totalDescuento += seleccion.monto;
            
            // Mark credit as applied
            await supabase
              .from("proveedor_creditos_pendientes")
              .update({
                status: "aplicado",
                tipo_resolucion: "descuento_oc",
                orden_compra_aplicada_id: orden.id,
                fecha_aplicacion: new Date().toISOString(),
                resolucion_notas: `Aplicado como descuento en ${folio}`
              })
              .eq("id", creditoId);
              
          } else if (seleccion.tipo === 'reposicion') {
            creditosReposicion.push({
              credito_id: creditoId,
              cantidad: seleccion.cantidad,
              producto: seleccion.producto_nombre,
              oc_origen_folio: seleccion.oc_origen_folio
            });
            
            // Mark credit as pending replacement
            await supabase
              .from("proveedor_creditos_pendientes")
              .update({
                status: "reposicion_esperada",
                tipo_resolucion: "reposicion_producto",
                orden_compra_aplicada_id: orden.id,
                resolucion_notas: `Reposición esperada en entregas de ${folio}`
              })
              .eq("id", creditoId);
          }
        }
        
        // Update OC with applied credits
        if (totalDescuento > 0 || creditosReposicion.length > 0) {
          await supabase
            .from("ordenes_compra")
            .update({
              creditos_aplicados: totalDescuento,
              creditos_aplicados_detalle: {
                descuentos: creditosDescuento,
                reposiciones: creditosReposicion
              },
              // Adjust total if there are discounts
              total_ajustado: total - totalDescuento
            })
            .eq("id", orden.id);
        }
      }

      return orden;
    },
    onSuccess: async (orden) => {
      queryClient.invalidateQueries({ queryKey: ["ordenes_compra"] });
      queryClient.invalidateQueries({ queryKey: ["ordenes_calendario"] });
      queryClient.invalidateQueries({ queryKey: ["productos"] });
      queryClient.invalidateQueries({ queryKey: ["proveedores-manuales-autocomplete"] });
      // Invalidate credits cache so they're refreshed next time
      queryClient.invalidateQueries({ queryKey: ["proveedor-creditos-pendientes"] });
      toast({
        title: "Orden creada",
        description: tipoEntrega === 'multiple' 
          ? `Orden creada con ${entregasProgramadas.length} entregas programadas`
          : "La orden de compra se ha creado exitosamente",
      });
      
      // Send push notification
      const fechaEntregaReal = tipoEntrega === 'unica' 
        ? fechaEntregaUnica 
        : entregasProgramadas[0]?.fecha_programada;
      
      const proveedorNombreNotif = tipoProveedor === 'catalogo' 
        ? proveedores.find(p => p.id === proveedorId)?.nombre || 'Proveedor'
        : proveedorNombreManual || 'Proveedor';
      
      if (fechaEntregaReal) {
        const esParaHoy = format(new Date(fechaEntregaReal), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
        
        const fechaNotif = format(new Date(fechaEntregaReal), "dd/MM/yyyy", { locale: es });
        
        sendPushNotification({
          roles: ['almacen'],
          title: esParaHoy ? '🔴 ENTREGA HOY' : '🚚 Nueva entrega programada',
          body: `${orden.folio} - ${proveedorNombreNotif} - ${fechaNotif}`,
          data: {
            type: 'recepcion_programada',
            orden_id: orden.id,
            folio: orden.folio
          }
        });
      }
      
      // ========== ENVIAR CORREO AUTOMÁTICO AL PROVEEDOR CON PDF ADJUNTO ==========
      setPasoCreacion("Preparando email al proveedor...");
      try {
        // Determinar email del proveedor
        let emailProveedor: string | null = null;
        
        if (tipoProveedor === 'catalogo' && proveedorId) {
          // Buscar contacto con recibe_ordenes = true primero
          let { data: contacto } = await supabase
            .from("proveedor_contactos")
            .select("email")
            .eq("proveedor_id", proveedorId)
            .eq("recibe_ordenes", true)
            .not("email", "is", null)
            .limit(1)
            .single();
          
          // Fallback al contacto principal si no hay recibe_ordenes
          if (!contacto?.email) {
            const { data: contactoPrincipal } = await supabase
              .from("proveedor_contactos")
              .select("email")
              .eq("proveedor_id", proveedorId)
              .eq("es_principal", true)
              .not("email", "is", null)
              .limit(1)
              .single();
            contacto = contactoPrincipal;
          }
          emailProveedor = contacto?.email || null;
        } else if (tipoProveedor === 'manual') {
          emailProveedor = proveedorEmailManual || null;
        }

        if (emailProveedor) {
          // 0. Obtener nombre del creador
          let nombreCreador = '';
          try {
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            if (currentUser) {
              const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", currentUser.id).single();
              nombreCreador = profile?.full_name || '';
            }
          } catch { /* ignore */ }

          // 1. Obtener logo en Base64
          let logoBase64 = '';
          try {
            const response = await fetch('/logo-almasa-pdf.png');
            const blob = await response.blob();
            logoBase64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
          } catch (logoErr) {
            console.warn("No se pudo cargar el logo para el PDF:", logoErr);
          }

          // 2. Construir tabla de productos para el PDF
          const productosTableRows = productosEnOrden.map(p => {
            const productoData = productos.find(pr => pr.id === p.producto_id);
            return `
              <tr>
                <td style="border: 1px solid #e2e8f0; padding: 8px;">${productoData?.unidad || '-'}</td>
                <td style="border: 1px solid #e2e8f0; padding: 8px;">${p.nombre}</td>
                <td style="border: 1px solid #e2e8f0; padding: 8px; text-align: center;">${p.cantidad.toLocaleString('es-MX')}</td>
                <td style="border: 1px solid #e2e8f0; padding: 8px; text-align: right;">$${p.precio_unitario.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                <td style="border: 1px solid #e2e8f0; padding: 8px; text-align: right;">$${p.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
              </tr>
            `;
          }).join('');

          // 3. Construir sección de entregas
          let entregasSection = '';
          if (tipoEntrega === 'multiple' && entregasProgramadas.length > 0) {
            const entregasRows = entregasProgramadas.map(e => `
              <tr>
                <td style="border: 1px solid #e2e8f0; padding: 6px; text-align: center;">Entrega ${e.numero_entrega}</td>
                <td style="border: 1px solid #e2e8f0; padding: 6px; text-align: center;">${e.cantidad_bultos.toLocaleString('es-MX')} bultos</td>
                <td style="border: 1px solid #e2e8f0; padding: 6px; text-align: center;">${e.fecha_programada ? format(parseDateLocal(e.fecha_programada), "dd/MM/yyyy") : 'Por confirmar'}</td>
              </tr>
            `).join('');
            entregasSection = `
              <div style="margin-top: 20px;">
                <h3 style="color: #2e7d32; margin-bottom: 10px;">Programa de Entregas</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                  <thead>
                    <tr style="background: #f0f0f0;">
                      <th style="border: 1px solid #e2e8f0; padding: 8px;">Entrega</th>
                      <th style="border: 1px solid #e2e8f0; padding: 8px;">Cantidad</th>
                      <th style="border: 1px solid #e2e8f0; padding: 8px;">Fecha Programada</th>
                    </tr>
                  </thead>
                  <tbody>${entregasRows}</tbody>
                </table>
              </div>
            `;
          }

          // 4. Generar PDF HTML completo
          const pdfHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; color: #333; }
                .header { display: flex; justify-content: space-between; margin-bottom: 20px; border-bottom: 2px solid #C8102E; padding-bottom: 15px; }
                .logo img { max-height: 60px; }
                .company-info { text-align: right; font-size: 10px; color: #666; }
                .title { text-align: center; margin: 20px 0; }
                .title h1 { color: #C8102E; font-size: 18px; margin: 0; }
                .info-box { background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 15px 0; }
                .info-row { display: flex; justify-content: space-between; margin: 5px 0; }
                table { width: 100%; border-collapse: collapse; margin: 15px 0; }
                th { background: #C8102E; color: white; padding: 10px; text-align: left; }
                td { border: 1px solid #e2e8f0; padding: 8px; }
                .totals { text-align: right; margin-top: 15px; }
                .totals-row { margin: 5px 0; }
                .total-final { font-size: 16px; font-weight: bold; color: #C8102E; }
                .footer { margin-top: 40px; display: flex; justify-content: space-around; }
                .signature-box { text-align: center; width: 200px; }
                .signature-line { border-top: 1px solid #333; margin-top: 50px; padding-top: 5px; }
              </style>
            </head>
            <body>
              <div class="header">
                <div class="logo">
                  ${logoBase64 ? `<img src="${logoBase64}" alt="Almasa">` : '<strong>ALMASA</strong>'}
                </div>
                <div class="company-info">
                  <strong>${COMPANY_DATA.razonSocial}</strong><br>
                  RFC: ${COMPANY_DATA.rfc}<br>
                  ${COMPANY_DATA.direccionCompletaMayusculas}<br>
                  Tel: ${COMPANY_DATA.telefonosFormateados}
                </div>
              </div>

              <div class="title">
                <h1>ORDEN DE COMPRA</h1>
              </div>

              <div class="info-box">
                <div class="info-row">
                  <span><strong>Folio:</strong> ${orden.folio}</span>
                  <span><strong>Fecha:</strong> ${format(new Date(), "dd/MM/yyyy", { locale: es })}</span>
                </div>
                <div class="info-row">
                  <span><strong>Tipo Pago:</strong> ${tipoPago === 'anticipado' ? 'Pago Anticipado' : 'Contra Entrega'}</span>
                </div>
                ${tipoEntrega === 'unica' && fechaEntregaUnica ? `
                  <div class="info-row">
                    <span><strong>Fecha de Entrega:</strong> ${format(parseDateLocal(fechaEntregaUnica), "EEEE dd 'de' MMMM yyyy", { locale: es })}</span>
                  </div>
                ` : ''}
              </div>

              ${tipoProveedor === 'catalogo' ? (() => {
                const proveedorData = proveedores.find(p => p.id === proveedorId);
                const direccionFiscal = proveedorData ? formatDireccionFiscal(proveedorData) : '';
                const regimenDesc = proveedorData?.regimen_fiscal ? getRegimenDescripcion(proveedorData.regimen_fiscal) : '';
                return `
                  <div class="info-box" style="background: #f0f9ff;">
                    <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #0369a1;">🏢 Proveedor</h3>
                    <p style="margin: 0; font-weight: bold; font-size: 13px;">${proveedorData?.nombre || proveedorNombreNotif}</p>
                    ${proveedorData?.rfc ? `<p style="margin: 4px 0 0 0;"><strong>RFC:</strong> ${proveedorData.rfc}</p>` : ''}
                    ${regimenDesc ? `<p style="margin: 2px 0 0 0; font-size: 10px;"><strong>Régimen:</strong> ${regimenDesc}</p>` : ''}
                    ${direccionFiscal ? `<p style="margin: 6px 0 0 0; font-size: 10px;">${direccionFiscal}</p>` : ''}
                    ${proveedorData?.telefono ? `<p style="margin: 4px 0 0 0;">📞 ${proveedorData.telefono}</p>` : ''}
                    ${proveedorData?.email ? `<p style="margin: 2px 0 0 0;">📧 ${proveedorData.email}</p>` : ''}
                  </div>
                `;
              })() : `
                <div class="info-box" style="background: #f0f9ff;">
                  <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #0369a1;">🏢 Proveedor</h3>
                  <p style="margin: 0; font-weight: bold;">${proveedorNombreManual || 'Proveedor manual'}</p>
                  ${proveedorTelefonoManual ? `<p style="margin: 4px 0 0 0;">📞 ${proveedorTelefonoManual}</p>` : ''}
                  ${proveedorEmailManual ? `<p style="margin: 4px 0 0 0;">📧 ${proveedorEmailManual}</p>` : ''}
                </div>
              `}

              <table>
                <thead>
                  <tr>
                    <th>Unidad</th>
                    <th>Producto</th>
                    <th style="text-align: center;">Cantidad</th>
                    <th style="text-align: right;">P. Unitario</th>
                    <th style="text-align: right;">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${productosTableRows}
                </tbody>
              </table>

              <div class="totals">
                <div class="totals-row"><strong>Subtotal:</strong> $${totalesOrden.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div>
                ${totalesOrden.iva > 0 ? `<div class="totals-row"><strong>IVA (16%):</strong> $${totalesOrden.iva.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div>` : ''}
                ${totalesOrden.ieps > 0 ? `<div class="totals-row"><strong>IEPS (8%):</strong> $${totalesOrden.ieps.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div>` : ''}
                <div class="totals-row total-final"><strong>TOTAL:</strong> $${totalesOrden.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div>
              </div>

              ${entregasSection}

              ${notas ? `
                <div style="margin-top: 20px; padding: 10px; background: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 4px;">
                  <strong>Notas:</strong> ${notas}
                </div>
              ` : ''}

              <div class="footer" style="justify-content: center;">
                <div class="signature-box">
                  ${nombreCreador ? `<div style="text-align: center; font-size: 12px; margin-bottom: 4px;">${nombreCreador}</div>` : ''}
                  <div class="signature-line">Departamento de Compras</div>
                </div>
              </div>
            </body>
            </html>
          `;

          // 5. Convertir HTML a PDF real de alta calidad
          setPasoCreacion("Generando PDF...");
          const pdfBase64 = await htmlToPdfBase64(pdfHtml);

          // 6. Construir fechas para el email
          const fechasEntregaHtml = tipoEntrega === 'multiple'
            ? `<ul style="margin: 10px 0; padding-left: 20px;">${entregasProgramadas.map(e => 
                `<li style="margin: 5px 0;">${e.fecha_programada ? format(parseDateLocal(e.fecha_programada), "EEEE dd 'de' MMMM yyyy", { locale: es }) : 'Por confirmar'} - ${e.cantidad_bultos.toLocaleString()} bultos</li>`
              ).join('')}</ul>`
            : fechaEntregaUnica 
              ? `<p style="margin: 10px 0; font-size: 16px;"><strong>${format(parseDateLocal(fechaEntregaUnica), "EEEE dd 'de' MMMM yyyy", { locale: es })}</strong></p>`
              : '<p>Por confirmar</p>';

          // 8. HTML del correo
          const htmlBody = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:30px 20px;">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">

  <tr><td style="background:#C8102E;padding:30px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td>
        <div style="color:white;font-size:26px;font-weight:bold;letter-spacing:2px;">ALMASA</div>
        <div style="color:#ffcccc;font-size:13px;margin-top:4px;">Abarrotes la Manita S.A. de C.V.</div>
      </td>
      <td align="right">
        <div style="color:white;font-size:12px;text-align:right;">
          <strong>Departamento de Compras</strong><br>
          compras@almasa.com.mx<br>
          ${COMPANY_DATA.telefonosFormateados}
        </div>
      </td>
    </tr></table>
  </td></tr>

  <tr><td style="background:#f8f8f8;padding:20px 40px;border-bottom:3px solid #C8102E;">
    <h1 style="margin:0;color:#C8102E;font-size:20px;">Nueva Orden de Compra</h1>
    <p style="margin:5px 0 0;color:#666;font-size:14px;">Folio: <strong>${orden.folio}</strong></p>
  </td></tr>

  <tr><td style="padding:25px 40px 15px;">
    <p style="margin:0;color:#333;font-size:15px;">Estimado(a) <strong>${proveedorNombreNotif}</strong>,</p>
    <p style="margin:10px 0 0;color:#555;font-size:14px;line-height:1.6;">
      Por medio del presente, le comunicamos que hemos generado una nueva orden de compra a su empresa.
      Adjunto encontrará el documento con el detalle completo de los productos solicitados.
    </p>
  </td></tr>

  <tr><td style="padding:15px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f8f8;border-radius:6px;border:1px solid #e0e0e0;">
      <tr>
        <td style="padding:15px 20px;border-bottom:1px solid #e0e0e0;">
          <span style="color:#888;font-size:13px;">Folio</span><br>
          <strong style="color:#333;font-size:15px;">${orden.folio}</strong>
        </td>
        <td style="padding:15px 20px;border-bottom:1px solid #e0e0e0;">
          <span style="color:#888;font-size:13px;">Total</span><br>
          <strong style="color:#C8102E;font-size:15px;">${formatCurrency(orden.total || 0)}</strong>
        </td>
        <td style="padding:15px 20px;border-bottom:1px solid #e0e0e0;">
          <span style="color:#888;font-size:13px;">Tipo de Pago</span><br>
          <strong style="color:#333;font-size:15px;">${tipoPago === 'anticipado' ? 'Pago Anticipado' : 'Contra Entrega'}</strong>
        </td>
      </tr>
      <tr>
        <td colspan="3" style="padding:15px 20px;">
          <span style="color:#888;font-size:13px;">📅 Fecha(s) de Entrega Programada(s)</span><br>
          <div style="margin-top:8px;color:#333;font-size:14px;">${fechasEntregaHtml}</div>
        </td>
      </tr>
    </table>
  </td></tr>

  <tr><td style="padding:15px 40px;">
    <div style="background:#fff8e1;border-left:4px solid #f59e0b;padding:12px 15px;border-radius:4px;">
      <p style="margin:0;color:#555;font-size:13px;">
        📎 <strong>Adjunto:</strong> Encontrará el documento completo de la orden de compra con el detalle de productos, cantidades y precios.
      </p>
    </div>
  </td></tr>

  <tr><td style="padding:15px 40px 25px;">
    <div style="background:#f8fafc;border-left:4px solid #C8102E;padding:15px;border-radius:4px;">
      <p style="margin:0 0 8px;color:#333;font-size:14px;"><strong>Para cualquier aclaración:</strong></p>
      <p style="margin:0;color:#555;font-size:13px;line-height:1.8;">
        📞 ${COMPANY_DATA.telefonosFormateados}<br>
        📧 compras@almasa.com.mx
      </p>
    </div>
  </td></tr>

  <tr><td style="background:#2d2d2d;padding:20px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td>
        <div style="color:#fff;font-size:13px;font-weight:bold;">ALMASA — Abarrotes la Manita S.A. de C.V.</div>
        <div style="color:#aaa;font-size:12px;margin-top:4px;">${COMPANY_DATA.razonSocial}<br>RFC: ${COMPANY_DATA.rfc}</div>
      </td>
      <td align="right">
        <div style="color:#aaa;font-size:11px;text-align:right;">
          <strong style="color:#fff;">Departamento de Compras</strong><br>
          Este es un correo automático.<br>
          Por favor no responda a este mensaje.
        </div>
      </td>
    </tr></table>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;

          // 9. Preparar adjunto PDF
          const attachments = [{
            filename: `Orden_Compra_${orden.folio}.pdf`,
            content: pdfBase64,
            mimeType: 'application/pdf'
          }];

          // 10. Enviar correo via gmail-api
          setPasoCreacion("Enviando email al proveedor...");
          const { data: emailResult, error: emailError } = await supabase.functions.invoke('gmail-api', {
            body: {
              action: 'send',
              email: 'compras@almasa.com.mx',
              to: emailProveedor,
              subject: `Nueva Orden de Compra ${orden.folio} - Abarrotes La Manita`,
              body: htmlBody,
              attachments: attachments,
            }
          });

          // 11. Registrar en correos_enviados
          await registrarCorreoEnviado({
            tipo: "orden_compra",
            referencia_id: orden.id,
            destinatario: emailProveedor,
            asunto: `Nueva Orden de Compra ${orden.folio} - Abarrotes La Manita`,
            gmail_message_id: emailResult?.messageId || null,
            error: emailError?.message || null,
          });

          if (!emailError) {
            // Actualizar status a "enviada" automáticamente
            await supabase
              .from("ordenes_compra")
              .update({ status: "enviada" })
              .eq("id", orden.id);
            
            toast({
              title: "📧 OC enviada al proveedor",
              description: `Se notificó a ${emailProveedor} y la orden quedó como "enviada"`,
            });

            // Notificar a admins sobre la nueva OC
            try {
              const { data: adminRoles } = await supabase
                .from("user_roles")
                .select("user_id")
                .eq("role", "admin");
              
              if (adminRoles && adminRoles.length > 0) {
                const provNombre = tipoProveedor === 'catalogo' 
                  ? proveedores.find(p => p.id === proveedorId)?.nombre 
                  : proveedorNombreManual;
                
                for (const admin of adminRoles) {
                  await supabase.functions.invoke('send-push-notification', {
                    body: {
                      user_ids: [admin.user_id],
                      title: "Nueva OC Enviada",
                      body: `${orden.folio} - ${provNombre} - $${orden.total?.toLocaleString('es-MX')}`,
                      data: { type: 'orden_compra', url: `/compras?ver=${orden.id}` }
                    }
                  });
                }
              }
            } catch (pushErr) {
              console.error("Error enviando push a admins:", pushErr);
              // No bloquear - la OC ya se envió exitosamente
            }
          } else {
            console.error("Error enviando correo al proveedor:", emailError);
            toast({
              title: "Advertencia",
              description: "La OC se creó pero hubo un error al enviar el correo",
              variant: "destructive",
            });
          }
        } else {
          // No hay email configurado
          toast({
            title: "OC creada sin notificación",
            description: "El proveedor no tiene email configurado para recibir la orden",
          });
        }
      } catch (emailErr) {
        console.error("Error en envío automático de correo:", emailErr);
        // No bloquear - la OC ya se creó exitosamente
      }
      // ========== FIN ENVÍO AUTOMÁTICO ==========

      setPasoCreacion("");
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      setPasoCreacion("");
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Validation for each step
  const canProceedStep1 = () => {
    if (tipoProveedor === 'catalogo' && !proveedorId) return false;
    if (tipoProveedor === 'manual' && !proveedorNombreManual.trim()) return false;
    return true;
  };

  const canProceedStep2 = () => {
    return productosEnOrden.length > 0;
  };

  const canProceedStep3 = () => {
    if (tipoEntrega === 'unica') {
      return !!fechaEntregaUnica;
    } else {
      // At least one delivery with a date
      return entregasProgramadas.length > 0 && entregasProgramadas.some(e => e.fecha_programada);
    }
  };

  const handleNextStep = () => {
    if (step === 1 && canProceedStep1()) {
      // Check if manual supplier without email - show warning
      if (tipoProveedor === 'manual' && !proveedorEmailManual.trim()) {
        setShowEmailWarning(true);
        return;
      }
      setStep(2);
    } else if (step === 2 && canProceedStep2()) {
      setStep(3);
    } else if (step === 3 && canProceedStep3()) {
      setStep(4);
    }
  };
  
  const handleConfirmNoEmail = () => {
    setShowEmailWarning(false);
    setStep(2);
  };

  const handlePrevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleCreate = () => {
    createOrden.mutate();
  };

  const getProveedorNombre = () => {
    if (tipoProveedor === 'catalogo') {
      return proveedores.find(p => p.id === proveedorId)?.nombre || '';
    }
    return proveedorNombreManual;
  };

  // Sum of multiple deliveries
  const sumaBultosEntregas = entregasProgramadas.reduce((sum, e) => sum + e.cantidad_bultos, 0);
  const entregasValidas = tipoEntrega === 'multiple' 
    ? sumaBultosEntregas === cantidadTotalBultos
    : true;

  return (
    <>
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-3xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Nueva Orden de Compra</span>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                    s === step 
                      ? "bg-primary text-primary-foreground" 
                      : s < step 
                        ? "bg-primary/20 text-primary" 
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {s < step ? <Check className="h-4 w-4" /> : s}
                </div>
              ))}
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Proveedor y Pago */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center pb-4 border-b">
              <h3 className="text-lg font-semibold">¿A quién le compras?</h3>
              <p className="text-sm text-muted-foreground">Selecciona el proveedor y tipo de pago</p>
            </div>

            <div className="space-y-4">
              {/* Proveedor */}
              <div>
                <Label className="text-base">Proveedor</Label>
                <div className="flex gap-4 mt-2 mb-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={tipoProveedor === 'catalogo'}
                      onChange={() => {
                        setTipoProveedor('catalogo');
                        setProveedorNombreManual("");
                        setProveedorTelefonoManual("");
                      }}
                      className="accent-primary"
                    />
                    <span className="text-sm">Del catálogo</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={tipoProveedor === 'manual'}
                      onChange={() => {
                        setTipoProveedor('manual');
                        setProveedorId("");
                      }}
                      className="accent-primary"
                    />
                    <span className="text-sm">No registrado</span>
                  </label>
                </div>
                
                {tipoProveedor === 'catalogo' ? (
                  <Select value={proveedorId} onValueChange={async (id) => {
                    setProveedorId(id);
                    // Auto-configurar tipo_pago desde termino_pago del proveedor
                    try {
                      const { data: prov } = await supabase
                        .from("proveedores")
                        .select("termino_pago")
                        .eq("id", id)
                        .single();
                      if (prov?.termino_pago === "anticipado") {
                        setTipoPago("anticipado");
                      } else {
                        setTipoPago("contra_entrega");
                      }
                    } catch { /* fallback: keep current */ }
                  }}>
                    <SelectTrigger className="text-base">
                      <SelectValue placeholder="Selecciona un proveedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {proveedores.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="space-y-3">
                    <div className="relative">
                      <Input
                        value={proveedorNombreManual}
                        onChange={(e) => {
                          setProveedorNombreManual(e.target.value);
                          setShowProveedorSuggestions(true);
                        }}
                        onFocus={() => setShowProveedorSuggestions(true)}
                        placeholder="Nombre del proveedor"
                        className="text-base"
                      />
                      {showProveedorSuggestions && proveedorSuggestions.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {proveedorSuggestions.slice(0, 5).map((sugg, i) => (
                            <button
                              key={i}
                              type="button"
                              className="w-full px-3 py-2 text-left hover:bg-accent text-sm"
                              onClick={() => {
                                setProveedorNombreManual(sugg.nombre);
                                setProveedorTelefonoManual(sugg.telefono);
                                setNotasProveedorManual(sugg.notas);
                                setShowProveedorSuggestions(false);
                              }}
                            >
                              {sugg.nombre}
                              {sugg.telefono && <span className="text-muted-foreground ml-2">· {sugg.telefono}</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Email field for manual supplier - visible by default */}
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="email"
                        value={proveedorEmailManual}
                        onChange={(e) => setProveedorEmailManual(e.target.value)}
                        placeholder="correo@proveedor.com (opcional)"
                        className="pl-9 text-base"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Tipo de pago - ahora visible directamente */}
              <div>
                <Label className="text-base">¿Cómo pagarás?</Label>
                <div className="flex gap-3 mt-2">
                  <label 
                    className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all flex-1 ${
                      tipoPago === 'contra_entrega' 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border hover:border-muted-foreground/50'
                    }`}
                  >
                    <input
                      type="radio"
                      checked={tipoPago === 'contra_entrega'}
                      onChange={() => setTipoPago('contra_entrega')}
                      className="sr-only"
                    />
                    <Truck className="h-5 w-5" />
                    <span>Contra Entrega</span>
                  </label>
                  <label 
                    className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all flex-1 ${
                      tipoPago === 'anticipado' 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border hover:border-muted-foreground/50'
                    }`}
                  >
                    <input
                      type="radio"
                      checked={tipoPago === 'anticipado'}
                      onChange={() => setTipoPago('anticipado')}
                      className="sr-only"
                    />
                    <CreditCard className="h-5 w-5" />
                    <span>Pago Anticipado</span>
                  </label>
                </div>
              </div>

              {/* Créditos pendientes del proveedor */}
              {tipoProveedor === 'catalogo' && proveedorId && (
                loadingCreditos ? (
                  <div className="flex items-center gap-2 p-4 rounded-lg border border-dashed">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Verificando créditos pendientes...</span>
                  </div>
                ) : creditosPendientes.length > 0 ? (
                  <div className="p-4 rounded-lg border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                      <span className="font-medium text-amber-800 dark:text-amber-200">
                        Este proveedor tiene créditos pendientes
                      </span>
                      <Badge variant="outline" className="text-amber-700 border-amber-400 dark:text-amber-300 dark:border-amber-600">
                        {formatCurrency(totalCreditosPendientes)}
                      </Badge>
                    </div>
                    
                    <div className="space-y-3">
                      {creditosPendientes.map((credito) => (
                        <div key={credito.id} className="p-3 bg-background rounded-lg border">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <Badge variant="outline" className="font-mono text-xs">
                                {credito.ordenes_compra?.folio || 'N/A'}
                              </Badge>
                              <p className="font-medium mt-1">{credito.producto_nombre}</p>
                              <p className="text-sm text-muted-foreground">
                                {credito.cantidad} bulto{credito.cantidad !== 1 ? 's' : ''} × ${credito.precio_unitario.toLocaleString()} = 
                                <span className="text-amber-600 font-bold ml-1">{formatCurrency(credito.monto_total)}</span>
                              </p>
                            </div>
                            <Badge className={motivoColors[credito.motivo] || 'bg-muted text-muted-foreground'}>
                              {motivoLabels[credito.motivo] || credito.motivo}
                            </Badge>
                          </div>
                          
                          <RadioGroup
                            value={creditosSeleccionados.get(credito.id)?.tipo || 'none'}
                            onValueChange={(value) => {
                              if (value === 'none') {
                                deseleccionarCredito(credito.id);
                              } else {
                                seleccionarCredito(credito, value as 'descuento' | 'reposicion');
                              }
                            }}
                            className="flex flex-wrap gap-3 mt-2"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="descuento" id={`descuento-${credito.id}`} />
                              <Label htmlFor={`descuento-${credito.id}`} className="text-sm cursor-pointer">
                                Aplicar descuento ({formatCurrency(credito.monto_total)})
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="reposicion" id={`reposicion-${credito.id}`} />
                              <Label htmlFor={`reposicion-${credito.id}`} className="text-sm cursor-pointer">
                                Esperar reposición ({credito.cantidad} bultos)
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="none" id={`none-${credito.id}`} />
                              <Label htmlFor={`none-${credito.id}`} className="text-sm text-muted-foreground cursor-pointer">
                                No aplicar
                              </Label>
                            </div>
                          </RadioGroup>
                        </div>
                      ))}
                    </div>
                    
                    {/* Resumen de selección */}
                    {(totalDescuentoSeleccionado > 0 || totalReposicionBultos > 0) && (
                      <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-700">
                        {totalDescuentoSeleccionado > 0 && (
                          <div className="flex justify-between text-sm">
                            <span>Descuento a aplicar:</span>
                            <span className="font-bold text-green-600">-{formatCurrency(totalDescuentoSeleccionado)}</span>
                          </div>
                        )}
                        {totalReposicionBultos > 0 && (
                          <div className="flex justify-between text-sm mt-1">
                            <span>Bultos pendientes de reposición:</span>
                            <span className="font-bold text-blue-600">+{totalReposicionBultos} bultos</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : null
              )}

              {/* Advanced options - collapsed */}
              <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground py-2">
                  {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  Opciones avanzadas
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-2">
                  {/* Notas */}
                  <div>
                    <Label>Notas</Label>
                    <Textarea
                      value={notas}
                      onChange={(e) => setNotas(e.target.value)}
                      placeholder="Notas adicionales..."
                      rows={2}
                      className="mt-2"
                    />
                  </div>

                  {/* Teléfono (solo manual) */}
                  {tipoProveedor === 'manual' && (
                    <div>
                      <Label>Teléfono del proveedor</Label>
                      <Input
                        value={proveedorTelefonoManual}
                        onChange={(e) => setProveedorTelefonoManual(e.target.value)}
                        placeholder="(opcional)"
                        className="mt-2"
                      />
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button 
                onClick={handleNextStep} 
                disabled={!canProceedStep1()}
                className="gap-2"
              >
                Siguiente
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Productos */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center pb-4 border-b">
              <h3 className="text-lg font-semibold">¿Qué productos?</h3>
              <p className="text-sm text-muted-foreground">
                Agrega los productos a la orden de {getProveedorNombre()}
              </p>
            </div>

            <div className="space-y-4">
              {/* Vehicle mode toggle */}
              {proveedorId && proveedorTieneTransportConfig && tipoProveedor === 'catalogo' && (
                <div className="flex items-center gap-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <Truck className="h-5 w-5 text-primary" />
                  <div className="flex items-center gap-4 text-sm">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={modoCreacion === 'vehiculos'}
                        onChange={() => setModoCreacion('vehiculos')}
                        className="accent-primary"
                      />
                      <span className="font-medium">Por Vehículos (rápido)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={modoCreacion === 'manual'}
                        onChange={() => setModoCreacion('manual')}
                        className="accent-primary"
                      />
                      <span>Manual</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Product form */}
              <div className="grid grid-cols-12 gap-3 items-end">
                <div className="col-span-4">
                  <Label>Producto</Label>
                  <Select value={productoSeleccionado} onValueChange={handleProductSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona..." />
                    </SelectTrigger>
                    <SelectContent>
                      {productosDisponibles.map((p) => {
                        const provConfig = productosProveedorConfig.find(pc => pc.producto_id === p.id);
                        return (
                          <SelectItem key={p.id} value={p.id}>
                            <div className="flex items-center gap-2">
                              <span>{p.nombre}</span>
                              {p.marca && <span className="text-muted-foreground">({p.marca})</span>}
                              {p.puede_tener_promocion && (
                                <span className="text-amber-500" title="Puede venir con promoción">🎁</span>
                              )}
                              {provConfig?.costo_proveedor && (
                                <span className="text-xs text-muted-foreground">
                                  ${provConfig.costo_proveedor.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {modoCreacion === 'vehiculos' ? (
                  <div className="col-span-3">
                    <Label>Vehículos</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={numeroVehiculos}
                        onChange={(e) => setNumeroVehiculos(e.target.value)}
                        placeholder="Ej: 3"
                        min="1"
                      />
                      {configTransporteProducto?.capacidad_vehiculo_bultos && (
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          ×{configTransporteProducto.capacidad_vehiculo_bultos.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="col-span-3">
                    <Label>Cantidad</Label>
                    <Input
                      type="number"
                      value={cantidad}
                      onChange={(e) => setCantidad(e.target.value)}
                      placeholder="Ej: 1200"
                    />
                  </div>
                )}

                <div className="col-span-3">
                  <Label>Precio Unitario</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={usaPrecioPorKg ? precioUnitarioCalculado : precioUnitario}
                    onChange={(e) => setPrecioUnitario(e.target.value)}
                    placeholder="$0.00"
                    disabled={usaPrecioPorKg}
                  />
                </div>

                <div className="col-span-2">
                  <Button type="button" onClick={agregarProducto} className="w-full">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Pregunta para configurar precio por kg - primera vez */}
              {productoSeleccionado && showPreguntaPrecioKg && tipoProveedor === 'catalogo' && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg space-y-3">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-medium">
                    ⚠️ ¿Cómo te cobra el proveedor este producto?
                  </div>
                  <div className="flex gap-3">
                    <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                      usaPrecioPorKg ? 'border-primary bg-primary/10' : 'border-border hover:border-muted-foreground/50'
                    }`}>
                      <input
                        type="radio"
                        checked={usaPrecioPorKg}
                        onChange={() => setUsaPrecioPorKg(true)}
                        className="sr-only"
                      />
                      <span>Por kilo</span>
                    </label>
                    <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                      !usaPrecioPorKg ? 'border-primary bg-primary/10' : 'border-border hover:border-muted-foreground/50'
                    }`}>
                      <input
                        type="radio"
                        checked={!usaPrecioPorKg}
                        onChange={() => setUsaPrecioPorKg(false)}
                        className="sr-only"
                      />
                      <span>Por bulto/caja</span>
                    </label>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={guardarPreferenciaPrecioKg}
                      onChange={(e) => setGuardarPreferenciaPrecioKg(e.target.checked)}
                      className="accent-primary"
                    />
                    Recordar para futuras compras
                  </label>
                </div>
              )}
              
              {/* Indicador de precio por kg - cuando ya está configurado */}
              {productoSeleccionado && !showPreguntaPrecioKg && (
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Badge informativo según configuración del proveedor-producto */}
                  {tipoProveedor === 'catalogo' && precioPorKiloCompraConfigurado !== null && precioPorKiloCompraConfigurado !== undefined && (
                    <Badge 
                      variant="secondary" 
                      className={precioPorKiloCompraConfigurado ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" : ""}
                    >
                      {precioPorKiloCompraConfigurado ? "💰 Precio por kg" : "📦 Precio por bulto"}
                    </Badge>
                  )}
                  
                  {/* Para proveedores manuales o para cambiar la unidad */}
                  {(tipoProveedor === 'manual' || showOverridePrecioUnidad) && (
                    <button
                      type="button"
                      onClick={() => setUsaPrecioPorKg(!usaPrecioPorKg)}
                      className="text-xs text-primary hover:underline"
                    >
                      {usaPrecioPorKg ? "Usar precio por unidad" : "¿Precio por kg?"}
                    </button>
                  )}
                  
                  {/* Link para sobrescribir (solo catálogo) */}
                  {tipoProveedor === 'catalogo' && !showOverridePrecioUnidad && precioPorKiloCompraConfigurado !== null && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowOverridePrecioUnidad(true);
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      ¿Comprar diferente?
                    </button>
                  )}
                </div>
              )}

              {/* Campos de precio por kg (visible si está activo) */}
              {usaPrecioPorKg && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-muted/50 rounded-lg">
                  <div>
                    <Label className="text-xs">Precio por kg</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={precioPorKg}
                      onChange={(e) => setPrecioPorKg(e.target.value)}
                      placeholder="$0.00"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Kg por unidad</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={kgPorUnidad}
                      onChange={(e) => setKgPorUnidad(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              )}

              {/* Impuestos que grava el producto y checkboxes dinámicos */}
              {productoSeleccionado && productoSeleccionadoData && (productoSeleccionadoData.aplica_iva || productoSeleccionadoData.aplica_ieps) && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                      💰 Este producto grava: {[
                        productoSeleccionadoData.aplica_iva && "IVA (16%)",
                        productoSeleccionadoData.aplica_ieps && "IEPS (8%)"
                      ].filter(Boolean).join(" + ")}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-xs text-blue-700 dark:text-blue-400">El precio del proveedor YA incluye:</p>
                    <div className="flex flex-wrap gap-4">
                      {productoSeleccionadoData.aplica_iva && (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={precioIncluyeIva}
                            onChange={(e) => setPrecioIncluyeIva(e.target.checked)}
                            className="accent-primary"
                          />
                          <span className="text-sm">IVA (16%)</span>
                        </label>
                      )}
                      {productoSeleccionadoData.aplica_ieps && (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={precioIncluyeIeps}
                            onChange={(e) => setPrecioIncluyeIeps(e.target.checked)}
                            className="accent-primary"
                          />
                          <span className="text-sm">IEPS (8%)</span>
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Desglose en tiempo real */}
                  {precioUnitario && parseFloat(precioUnitario) > 0 && (
                    <div className="mt-3 p-2 bg-white dark:bg-background rounded border text-xs space-y-1">
                      <p className="font-medium text-muted-foreground">📊 Desglose del precio capturado:</p>
                      {(() => {
                        const precio = parseFloat(precioUnitario);
                        let divisor = 1;
                        if (productoSeleccionadoData.aplica_iva && precioIncluyeIva) divisor *= 1.16;
                        if (productoSeleccionadoData.aplica_ieps && precioIncluyeIeps) divisor *= 1.08;
                        const base = precio / divisor;
                        const iva = productoSeleccionadoData.aplica_iva ? (precioIncluyeIva ? base * 0.16 : precio * 0.16) : 0;
                        const ieps = productoSeleccionadoData.aplica_ieps ? (precioIncluyeIeps ? base * 0.08 : base * 0.08) : 0;
                        const total = precioIncluyeIva && precioIncluyeIeps ? precio : base + iva + ieps;
                        
                        return (
                          <>
                            <div className="flex justify-between">
                              <span>Base:</span>
                              <span className="font-medium">{formatCurrency(base)}</span>
                            </div>
                            {productoSeleccionadoData.aplica_iva && (
                              <div className="flex justify-between text-blue-600 dark:text-blue-400">
                                <span>IVA (16%) {precioIncluyeIva ? "incluido" : ""}:</span>
                                <span>{formatCurrency(iva)}</span>
                              </div>
                            )}
                            {productoSeleccionadoData.aplica_ieps && (
                              <div className="flex justify-between text-amber-600 dark:text-amber-400">
                                <span>IEPS (8%) {precioIncluyeIeps ? "incluido" : ""}:</span>
                                <span>{formatCurrency(ieps)}</span>
                              </div>
                            )}
                            <div className="flex justify-between border-t pt-1 font-semibold">
                              <span>Total:</span>
                              <span>{formatCurrency(total)}</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* Products table */}
              {productosEnOrden.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead className="text-right">Cantidad</TableHead>
                        <TableHead className="text-right">Precio</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productosEnOrden.map((p, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span>{p.nombre}</span>
                              {(p.aplica_iva || p.aplica_ieps) && (
                                <div className="flex gap-1 flex-wrap">
                                  {p.aplica_iva && p.precio_incluye_iva && (
                                    <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                      IVA incl.
                                    </Badge>
                                  )}
                                  {p.aplica_ieps && p.precio_incluye_ieps && (
                                    <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                                      IEPS incl.
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{p.cantidad.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{formatCurrency(p.precio_unitario)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(p.subtotal)}</TableCell>
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

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={handlePrevStep} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Atrás
              </Button>
              <Button 
                onClick={handleNextStep} 
                disabled={!canProceedStep2()}
                className="gap-2"
              >
                Programar Entregas
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Programar Entregas (NUEVO) */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center pb-4 border-b">
              <h3 className="text-lg font-semibold">¿Cuándo te llega?</h3>
              <p className="text-sm text-muted-foreground">
                Programa la(s) fecha(s) de entrega
              </p>
            </div>

            <div className="space-y-4">
              {/* Resumen de productos */}
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                <Package className="h-6 w-6 text-primary" />
                <div>
                  <p className="font-semibold">{cantidadTotalBultos.toLocaleString()} bultos</p>
                  <p className="text-sm text-muted-foreground">
                    {productosEnOrden.length} producto(s) de {getProveedorNombre()}
                  </p>
                </div>
              </div>

              {/* Tipo de entrega */}
              <div>
                <Label className="text-base">¿Cómo deseas recibir la mercancía?</Label>
                <div className="flex gap-3 mt-2">
                  <label 
                    className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all flex-1 ${
                      tipoEntrega === 'unica' 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border hover:border-muted-foreground/50'
                    }`}
                  >
                    <input
                      type="radio"
                      checked={tipoEntrega === 'unica'}
                      onChange={() => setTipoEntrega('unica')}
                      className="sr-only"
                    />
                    <CalendarIcon className="h-5 w-5" />
                    <div>
                      <span className="font-medium">Una sola entrega</span>
                      <p className="text-xs text-muted-foreground">Todo en una fecha</p>
                    </div>
                  </label>
                  <label 
                    className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all flex-1 ${
                      tipoEntrega === 'multiple' 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border hover:border-muted-foreground/50'
                    }`}
                  >
                    <input
                      type="radio"
                      checked={tipoEntrega === 'multiple'}
                      onChange={() => setTipoEntrega('multiple')}
                      className="sr-only"
                    />
                    <Truck className="h-5 w-5" />
                    <div>
                      <span className="font-medium">Múltiples entregas</span>
                      <p className="text-xs text-muted-foreground">Dividir en varias fechas</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Una sola entrega */}
              {tipoEntrega === 'unica' && (
                <div className="p-4 border rounded-lg space-y-3">
                  <Label>Fecha de Entrega</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal text-base",
                          !fechaEntregaUnica && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {fechaEntregaUnica 
                          ? format(new Date(fechaEntregaUnica + "T12:00:00"), "dd 'de' MMMM, yyyy", { locale: es }) 
                          : "Seleccionar fecha"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={fechaEntregaUnica ? new Date(fechaEntregaUnica + "T12:00:00") : undefined}
                        onSelect={(date) => setFechaEntregaUnica(date ? format(date, "yyyy-MM-dd") : "")}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {/* Múltiples entregas */}
              {tipoEntrega === 'multiple' && (
                <div className="p-4 border rounded-lg space-y-4">
                  {/* Bultos por entrega calculator */}
                  <div className="grid grid-cols-3 gap-4 items-end">
                    <div>
                      <Label>Total bultos</Label>
                      <Input value={cantidadTotalBultos.toLocaleString()} disabled className="bg-muted" />
                    </div>
                    <div>
                      <Label>Bultos por entrega</Label>
                      <Input
                        type="number"
                        value={bultosPorEntrega}
                        onChange={(e) => setBultosPorEntrega(e.target.value)}
                        placeholder="Ej: 1200"
                      />
                    </div>
                    <Button type="button" variant="secondary" onClick={() => {
                      calcularEntregas();
                      // Auto-select first delivery for assignment
                      setEntregaEnEdicion(0);
                    }}>
                      Calcular
                    </Button>
                  </div>

                  {entregasProgramadas.length > 0 && (
                    <>
                      {/* Two-column layout: Calendar + Delivery list */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Left column: Occupancy calendar */}
                        <div>
                          <Label className="text-sm text-muted-foreground mb-2 block">
                            Haz click en un día para asignar la entrega seleccionada:
                          </Label>
                          <CalendarioOcupacion
                            selectedDate={
                              entregaEnEdicion !== null && entregasProgramadas[entregaEnEdicion]?.fecha_programada
                                ? parseISO(entregasProgramadas[entregaEnEdicion].fecha_programada)
                                : undefined
                            }
                            onDateSelect={(date) => {
                              if (entregaEnEdicion !== null) {
                                updateFechaEntrega(entregaEnEdicion, format(date, "yyyy-MM-dd"));
                                // Auto-advance is now handled by useEffect to avoid stale closure
                              }
                            }}
                            entregasLocales={entregasProgramadas}
                            proveedorNombre={tipoProveedor === 'catalogo' ? proveedores.find(p => p.id === proveedorId)?.nombre : proveedorNombreManual}
                          />
                        </div>
                        
                        {/* Right column: Delivery list */}
                        <div className="space-y-2">
                          <Label className="text-sm text-muted-foreground block">
                            Selecciona una entrega y asígnale fecha:
                          </Label>
                          {entregasProgramadas.map((entrega, index) => (
                            <div 
                              key={index}
                              onClick={() => setEntregaEnEdicion(index)}
                              className={cn(
                                "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all",
                                entregaEnEdicion === index 
                                  ? "border-primary bg-primary/10 ring-2 ring-primary/20" 
                                  : "border-border hover:border-muted-foreground/50",
                                entrega.fecha_programada 
                                  ? "bg-green-50 dark:bg-green-950/20" 
                                  : "bg-amber-50 dark:bg-amber-950/20"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <Badge variant="outline" className="font-mono">
                                  #{entrega.numero_entrega}
                                </Badge>
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="number"
                                    value={entrega.cantidad_bultos}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      updateCantidadEntrega(index, parseInt(e.target.value) || 0);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-20 h-8 text-sm"
                                  />
                                  <span className="text-sm text-muted-foreground">bultos</span>
                                </div>
                              </div>
                              {entrega.fecha_programada ? (
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-green-700 dark:text-green-400">
                                    {format(parseISO(entrega.fecha_programada), "dd MMM", { locale: es })}
                                  </span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateFechaEntrega(index, "");
                                      setEntregaEnEdicion(index);
                                    }}
                                  >
                                    ×
                                  </Button>
                                </div>
                              ) : (
                                <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                                  Sin fecha
                                </Badge>
                              )}
                            </div>
                          ))}
                          
                          {/* Pending deliveries warning */}
                          {entregasProgramadas.filter(e => !e.fecha_programada).length > 0 && (
                            <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
                              <AlertDescription className="text-amber-700 dark:text-amber-300 text-sm">
                                {entregasProgramadas.filter(e => !e.fecha_programada).length} entrega(s) 
                                quedarán pendientes de programar
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      </div>

                      {/* Validation message */}
                      {!entregasValidas && (
                        <div className="text-sm text-destructive flex items-center gap-2">
                          <span>⚠️</span>
                          La suma de bultos ({sumaBultosEntregas.toLocaleString()}) no coincide con el total ({cantidadTotalBultos.toLocaleString()})
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={handlePrevStep} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Atrás
              </Button>
              <Button 
                onClick={handleNextStep} 
                disabled={!canProceedStep3() || !entregasValidas}
                className="gap-2"
              >
                Revisar
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Revisión */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="text-center pb-4 border-b">
              <h3 className="text-lg font-semibold">Revisa tu orden</h3>
              <p className="text-sm text-muted-foreground">
                Verifica los datos antes de crear
              </p>
            </div>

            <div className="space-y-4">
              {/* Resumen */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Folio</p>
                  <p className="font-semibold flex items-center gap-2">
                    {generatingFolio ? <Loader2 className="h-4 w-4 animate-spin" /> : folio}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Proveedor</p>
                  <p className="font-semibold">{getProveedorNombre()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tipo de Pago</p>
                  <p className="font-semibold">
                    {tipoPago === 'contra_entrega' ? 'Contra Entrega' : 'Anticipado'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Bultos</p>
                  <p className="font-semibold">{cantidadTotalBultos.toLocaleString()}</p>
                </div>
              </div>

              {/* Alerta de Pago Anticipado */}
              {tipoPago === 'anticipado' && (
                <div className="p-4 rounded-lg border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700">
                  <div className="flex items-start gap-3">
                    <CreditCard className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-amber-800 dark:text-amber-200">
                        ⚠️ Orden con Pago Anticipado
                      </h4>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                        Esta orden requiere <strong>pago antes de la entrega</strong>. 
                        Las entregas quedarán <strong>pendientes de programar</strong> hasta que registres el pago en el sistema.
                      </p>
                      <ul className="text-xs text-amber-600 dark:text-amber-400 mt-2 space-y-1">
                        <li>• La OC se creará con status "Pendiente de Pago"</li>
                        <li>• Almacén no verá las entregas hasta confirmar el pago</li>
                        <li>• Al registrar el pago, podrás programar las fechas de entrega</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              <div className="border rounded-lg p-4 bg-primary/5">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  Entregas Programadas
                </h4>
                {tipoEntrega === 'unica' ? (
                  <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                    <span>Entrega única</span>
                    <span className="font-semibold">
                      {format(new Date(fechaEntregaUnica + "T12:00:00"), "dd/MM/yyyy")}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {entregasProgramadas.map((entrega, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-background rounded-lg">
                        <span className="flex items-center gap-2">
                          <Badge variant="outline">#{entrega.numero_entrega}</Badge>
                          {entrega.cantidad_bultos.toLocaleString()} bultos
                        </span>
                        <span className="font-semibold">
                          {entrega.fecha_programada 
                            ? format(new Date(entrega.fecha_programada + "T12:00:00"), "dd/MM/yyyy")
                            : <span className="text-muted-foreground">Sin fecha</span>
                          }
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Productos */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productosEnOrden.map((p, index) => (
                      <TableRow key={index}>
                        <TableCell>{p.nombre}</TableCell>
                        <TableCell className="text-right">{p.cantidad.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{formatCurrency(p.precio_unitario)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(p.subtotal)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Totales */}
              <div className="border rounded-lg p-4 bg-primary/5">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(totalesOrden.subtotal)}</span>
                  </div>
                  {totalesOrden.iva > 0 && (
                    <div className="flex justify-between">
                      <span>IVA (16%):</span>
                      <span>{formatCurrency(totalesOrden.iva)}</span>
                    </div>
                  )}
                  {totalesOrden.ieps > 0 && (
                    <div className="flex justify-between">
                      <span>IEPS (8%):</span>
                      <span>{formatCurrency(totalesOrden.ieps)}</span>
                    </div>
                  )}
                  {/* Show applied credits if any */}
                  {totalDescuentoSeleccionado > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Créditos aplicados:</span>
                      <span>-{formatCurrency(totalDescuentoSeleccionado)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-xl pt-2 border-t">
                    <span>Total:</span>
                    <span className="text-primary">
                      {formatCurrency(totalesOrden.total - totalDescuentoSeleccionado)}
                    </span>
                  </div>
                  {totalReposicionBultos > 0 && (
                    <div className="flex justify-between text-blue-600 text-sm pt-1">
                      <span>Bultos esperados (reposición):</span>
                      <span>+{totalReposicionBultos} bultos</span>
                    </div>
                  )}
                </div>
              </div>

              {notas && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">Notas:</p>
                  <p className="text-sm">{notas}</p>
                </div>
              )}
            </div>

            <div className="space-y-2 pt-4 border-t">
              <div className="flex justify-between">
                <Button variant="outline" onClick={handlePrevStep} className="gap-2" disabled={createOrden.isPending || !!pasoCreacion}>
                  <ArrowLeft className="h-4 w-4" />
                  Editar
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={createOrden.isPending || !!pasoCreacion}
                  className="gap-2"
                >
                  {(createOrden.isPending || pasoCreacion) ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {pasoCreacion || "Creando..."}
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Crear Orden
                    </>
                  )}
                </Button>
              </div>
              {pasoCreacion && (
                <p className="text-xs text-center text-muted-foreground animate-pulse">{pasoCreacion}</p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
    
    {/* AlertDialog for missing email confirmation */}
    <AlertDialog open={showEmailWarning} onOpenChange={setShowEmailWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-amber-500" />
            Sin correo electrónico
          </AlertDialogTitle>
          <AlertDialogDescription>
            No has ingresado un correo para este proveedor. 
            No podrás enviar la orden de compra por correo electrónico.
            <br /><br />
            ¿Deseas continuar?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmNoEmail}>
            Continuar sin correo
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    
    {/* Dialog for promotional variant creation */}
    <Dialog open={showPromoDialog} onOpenChange={(open) => {
      if (!open) {
        resetPromoForm();
      }
    }}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-amber-500" />
            ¿Viene con promoción?
          </DialogTitle>
          <DialogDescription>
            {pendingProductForPromo?.nombre} puede venir con promoción del proveedor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={handleNoPromotion}
            >
              No, viene normal
            </Button>
            <Button 
              variant="default" 
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
              onClick={() => {
                // Just close and show form below
              }}
              disabled={promoDescripcion.length > 0}
            >
              🎁 Sí, tiene promoción
            </Button>
          </div>

          {/* Promo details form */}
          <div className="space-y-4 pt-4 border-t">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-800 dark:text-amber-300 font-medium mb-3">
                💡 Escribe cómo viene el producto tal cual lo pondrás en la OC:
              </p>
              <Input
                placeholder="Ej: CatChow 20kg + 3kg gratis"
                value={promoDescripcion}
                onChange={(e) => setPromoDescripcion(e.target.value)}
                className="bg-background"
              />
            </div>

            <div>
              <Label>Precio de compra (con promoción)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="$0.00"
                value={promoPrecio}
                onChange={(e) => setPromoPrecio(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Switch
                id="bloquear-venta"
                checked={promoBloqueado}
                onCheckedChange={setPromoBloqueado}
              />
              <Label htmlFor="bloquear-venta" className="flex flex-col gap-0.5">
                <span className="font-medium">Bloquear venta</span>
                <span className="text-xs text-muted-foreground">
                  Requiere autorización para vender este producto
                </span>
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleNoPromotion}>
            Cancelar
          </Button>
          <Button 
            onClick={handleCreatePromoVariant}
            disabled={creatingPromoVariant || !promoDescripcion.trim() || !promoPrecio}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            {creatingPromoVariant ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creando...
              </>
            ) : (
              <>
                <Gift className="h-4 w-4 mr-2" />
                Crear variante promocional
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default CrearOrdenCompraWizard;
