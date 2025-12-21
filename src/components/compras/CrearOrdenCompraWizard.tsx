import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
  Calendar as CalendarIcon, CreditCard, ChevronDown, ChevronUp, Package, Mail
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatCurrency } from "@/lib/utils";
import { sendPushNotification } from "@/services/pushNotifications";

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
}

interface Producto {
  id: string;
  nombre: string;
  marca?: string;
  ultimo_costo_compra?: number;
  aplica_iva?: boolean;
  aplica_ieps?: boolean;
  kg_por_unidad?: number;
  precio_por_kilo?: boolean;
  unidad?: string;
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
  
  // Folio (auto-generated)
  const [folio, setFolio] = useState("");
  const [generatingFolio, setGeneratingFolio] = useState(false);
  
  // Proveedor productos config
  const [productosProveedorConfig, setProductosProveedorConfig] = useState<ProveedorConfig[]>([]);
  
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
  };
  
  // Create orden mutation
  const createOrden = useMutation({
    mutationFn: async () => {
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
          status: "pendiente",
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
        description: tipoEntrega === 'multiple' 
          ? `Orden creada con ${entregasProgramadas.length} entregas programadas`
          : "La orden de compra se ha creado exitosamente",
      });
      
      // Send push notification
      const fechaEntregaReal = tipoEntrega === 'unica' 
        ? fechaEntregaUnica 
        : entregasProgramadas[0]?.fecha_programada;
      
      if (fechaEntregaReal) {
        const proveedorNombreNotif = tipoProveedor === 'catalogo' 
          ? proveedores.find(p => p.id === proveedorId)?.nombre || 'Proveedor'
          : proveedorNombreManual || 'Proveedor';
        
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
      
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
                  <Select value={proveedorId} onValueChange={setProveedorId}>
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
                  <Select value={productoSeleccionado} onValueChange={(v) => {
                    setProductoSeleccionado(v);
                    setShowOverridePrecioUnidad(false);
                    setShowPreguntaPrecioKg(false);
                    
                    const prod = productosDisponibles.find(p => p.id === v);
                    const provConfig = productosProveedorConfig.find(pc => pc.producto_id === v);
                    
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
                  }}>
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
                              {provConfig?.costo_proveedor && (
                                <span className="text-xs text-green-600 dark:text-green-400">
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
                              <span className="font-medium">${formatCurrency(base)}</span>
                            </div>
                            {productoSeleccionadoData.aplica_iva && (
                              <div className="flex justify-between text-blue-600 dark:text-blue-400">
                                <span>IVA (16%) {precioIncluyeIva ? "incluido" : ""}:</span>
                                <span>${formatCurrency(iva)}</span>
                              </div>
                            )}
                            {productoSeleccionadoData.aplica_ieps && (
                              <div className="flex justify-between text-amber-600 dark:text-amber-400">
                                <span>IEPS (8%) {precioIncluyeIeps ? "incluido" : ""}:</span>
                                <span>${formatCurrency(ieps)}</span>
                              </div>
                            )}
                            <div className="flex justify-between border-t pt-1 font-semibold">
                              <span>Total:</span>
                              <span>${formatCurrency(total)}</span>
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
                          <TableCell className="text-right">${formatCurrency(p.precio_unitario)}</TableCell>
                          <TableCell className="text-right">${formatCurrency(p.subtotal)}</TableCell>
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
                    <Button type="button" variant="secondary" onClick={calcularEntregas}>
                      Calcular
                    </Button>
                  </div>

                  {entregasProgramadas.length > 0 && (
                    <>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-16">#</TableHead>
                              <TableHead>Bultos</TableHead>
                              <TableHead>Fecha</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {entregasProgramadas.map((entrega, index) => (
                              <TableRow key={index}>
                                <TableCell>
                                  <Badge variant="outline">{entrega.numero_entrega}</Badge>
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    value={entrega.cantidad_bultos}
                                    onChange={(e) => updateCantidadEntrega(index, parseInt(e.target.value) || 0)}
                                    className="w-24"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="date"
                                    value={entrega.fecha_programada}
                                    onChange={(e) => updateFechaEntrega(index, e.target.value)}
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
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

              {/* Entregas programadas */}
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
                        <TableCell className="text-right">${formatCurrency(p.precio_unitario)}</TableCell>
                        <TableCell className="text-right">${formatCurrency(p.subtotal)}</TableCell>
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
                  <div className="flex justify-between font-bold text-xl pt-2 border-t">
                    <span>Total:</span>
                    <span className="text-primary">${formatCurrency(totalesOrden.total)}</span>
                  </div>
                </div>
              </div>

              {notas && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">Notas:</p>
                  <p className="text-sm">{notas}</p>
                </div>
              )}
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={handlePrevStep} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Editar
              </Button>
              <Button 
                onClick={handleCreate}
                disabled={createOrden.isPending}
                className="gap-2"
              >
                {createOrden.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Crear Orden
                  </>
                )}
              </Button>
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
    </>
  );
};

export default CrearOrdenCompraWizard;
