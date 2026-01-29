import { useState, useEffect } from "react";
import { format, differenceInMinutes } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useBodegaAutoDetect } from "@/hooks/useBodegaAutoDetect";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Package,
  Camera,
  CheckCircle2,
  FileText,
  Truck,
  Warehouse,
  CalendarIcon,
  X,
  AlertTriangle,
  PenLine,
  Clock,
  Timer,
  Shield,
  ShieldAlert,
  Eye,
  User,
  Receipt,
  PackageOpen,
  MapPin,
  Loader2,
  RefreshCw,
  Wifi,
} from "lucide-react";
import { EvidenciaCapture, EvidenciasPreviewGrid } from "@/components/compras/EvidenciaCapture";
import { FirmaDigitalDialog } from "./FirmaDigitalDialog";
import { DevolucionProveedorDialog } from "./DevolucionProveedorDialog";
import { registrarCorreoEnviado } from "@/components/compras/HistorialCorreosOC";
import { getEmailsInternos, enviarCopiaInterna } from "@/lib/emailNotificationsUtils";
import { generarRecepcionPDF, generarRecepcionPDFBase64 } from "@/utils/recepcionPdfGenerator";

// Razones de diferencia para cuando la cantidad recibida no coincide con la ordenada
const RAZONES_DIFERENCIA = [
  { value: "roto", label: "Producto roto/dañado" },
  { value: "no_llego", label: "No llegó completo" },
  { value: "rechazado_calidad", label: "Rechazado por calidad" },
];

// Razones que requieren devolución física al chofer
const RAZONES_REQUIEREN_DEVOLUCION = ["roto", "rechazado_calidad"];

// Razones que requieren foto obligatoria del producto
const RAZONES_REQUIEREN_FOTO = ["roto", "rechazado_calidad"];

interface ProductoFaltante {
  producto_id?: string;
  nombre: string;
  cantidad_faltante: number;
  codigo?: string;
}

// Interface para créditos de reposición del proveedor
interface CreditoReposicion {
  id: string;
  producto_id: string;
  producto_nombre: string;
  cantidad: number;
  monto_total: number;
  oc_origen_folio: string;
  motivo: string;
  status: string;
  precio_unitario: number;
}

interface EntregaCompra {
  id: string;
  numero_entrega: number;
  cantidad_bultos: number;
  fecha_programada: string | null;
  fecha_entrega_real: string | null;
  status: string;
  notas: string | null;
  llegada_registrada_en: string | null;
  nombre_chofer_proveedor: string | null;
  placas_vehiculo: string | null;
  numero_sello_llegada: string | null;
  llegada_registrada_por: string | null;
  llegada_registrada_por_profile?: { id: string; full_name: string } | null;
  // Campos para entregas de faltantes
  origen_faltante?: boolean;
  productos_faltantes?: ProductoFaltante[];
  orden_compra: {
    id: string;
    folio: string;
    tipo_pago?: string;
    proveedor_id: string | null;
    proveedor_nombre_manual: string | null;
    proveedor: {
      id: string;
      nombre: string;
    } | null;
  };
}

interface FotoLlegada {
  id: string;
  tipo_evidencia: string;
  ruta_storage: string;
  url?: string;
}

interface ProductoEntrega {
  id: string;
  producto_id: string;
  cantidad_ordenada: number;
  cantidad_recibida: number;
  producto: {
    id: string;
    codigo: string;
    nombre: string;
    maneja_caducidad: boolean;
  };
  // Configuración de lotes del proveedor
  lotesConfig?: {
    dividir_en_lotes: boolean;
    cantidad_lotes: number;
    unidades_por_lote: number;
  };
}

interface LoteInput {
  id: string; // ID único para el input
  numero_lote: string;
  cantidad: number;
  fecha_caducidad: string;
}

interface Evidencia {
  tipo: string;
  file: File;
  preview: string;
}

interface Bodega {
  id: string;
  nombre: string;
  es_externa: boolean;
}

interface AlmacenRecepcionSheetProps {
  entrega: EntregaCompra;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecepcionCompletada: () => void;
}

export const AlmacenRecepcionSheet = ({
  entrega,
  open,
  onOpenChange,
  onRecepcionCompletada
}: AlmacenRecepcionSheetProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [productos, setProductos] = useState<ProductoEntrega[]>([]);
  const [cantidadesRecibidas, setCantidadesRecibidas] = useState<Record<string, number | string>>({});
  const [fechasCaducidad, setFechasCaducidad] = useState<Record<string, string>>({});
  const [razonesDiferencia, setRazonesDiferencia] = useState<Record<string, string>>({});
  const [notasDiferencia, setNotasDiferencia] = useState<Record<string, string>>({});
  const [evidencias, setEvidencias] = useState<Evidencia[]>([]);
  const [fotosCaducidad, setFotosCaducidad] = useState<Record<string, { file: File; preview: string } | null>>({});
  const [fotosDiferencia, setFotosDiferencia] = useState<Record<string, { file: File; preview: string } | null>>({});
  const [notas, setNotas] = useState("");
  const [bodegas, setBodegas] = useState<Bodega[]>([]);
  const [bodegaSeleccionada, setBodegaSeleccionada] = useState<string>("");
  const [mostrarSelectorBodega, setMostrarSelectorBodega] = useState(false);
  
  // Auto-detección de bodega por WiFi/GPS
  const { 
    bodega: bodegaDetectada, 
    distanciaMetros, 
    metodoDeteccion,
    detectando: detectandoBodega, 
    error: errorDeteccion,
    reintentarDeteccion 
  } = useBodegaAutoDetect();
  
  // Estado para múltiples lotes por producto
  const [lotesInputs, setLotesInputs] = useState<Record<string, LoteInput[]>>({});
  
  // Timer para tiempo de descarga
  const [tiempoDescarga, setTiempoDescarga] = useState<string>("");
  const [minutosDescarga, setMinutosDescarga] = useState<number>(0);
  
  // Fotos de llegada
  const [fotosLlegada, setFotosLlegada] = useState<FotoLlegada[]>([]);
  const [showFotosLlegadaDialog, setShowFotosLlegadaDialog] = useState(false);
  const [loadingFotos, setLoadingFotos] = useState(false);
  
  // Estados para firma y devolución
  const [showFirmaDialog, setShowFirmaDialog] = useState(false);
  const [showDevolucionDialog, setShowDevolucionDialog] = useState(false);
  const [firmaChoferDiferencia, setFirmaChoferDiferencia] = useState<string | null>(null);
  
  // Nuevos campos: remisión proveedor, foto caja vacía, firmas conformidad
  const [numeroRemisionProveedor, setNumeroRemisionProveedor] = useState("");
  const [fotoRemisionProveedor, setFotoRemisionProveedor] = useState<{ file: File; preview: string } | null>(null);
  const [fotoCajaVacia, setFotoCajaVacia] = useState<{ file: File; preview: string } | null>(null);
  const [showFirmaChoferConformidadDialog, setShowFirmaChoferConformidadDialog] = useState(false);
  const [showFirmaAlmacenistaDialog, setShowFirmaAlmacenistaDialog] = useState(false);
  const [firmaChoferConformidad, setFirmaChoferConformidad] = useState<string | null>(null);
  const [firmaAlmacenista, setFirmaAlmacenista] = useState<string | null>(null);
  
  // Estado para créditos de reposición (excedentes)
  const [creditosReposicionEsperada, setCreditosReposicionEsperada] = useState<CreditoReposicion[]>([]);
  const [excedentesConfirmados, setExcedentesConfirmados] = useState<Record<string, 'reposicion' | 'aceptar' | 'rechazar' | null>>({});
  
  const { toast } = useToast();

  // Función para formatear tiempo exacto "2h 34min"
  const formatTiempoExacto = (fechaInicio: Date): string => {
    const minutos = differenceInMinutes(new Date(), fechaInicio);
    if (minutos < 60) {
      return `${minutos}min`;
    }
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return mins > 0 ? `${horas}h ${mins}min` : `${horas}h`;
  };

  // Timer effect - actualizar cada minuto con formato exacto
  useEffect(() => {
    if (!open || !entrega?.llegada_registrada_en) return;
    
    const updateTimer = () => {
      const llegada = new Date(entrega.llegada_registrada_en!);
      const tiempo = formatTiempoExacto(llegada);
      const mins = differenceInMinutes(new Date(), llegada);
      setTiempoDescarga(tiempo);
      setMinutosDescarga(mins);
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Actualizar cada minuto
    
    return () => clearInterval(interval);
  }, [open, entrega?.llegada_registrada_en]);

  useEffect(() => {
    if (open && entrega) {
      loadProductos();
      loadBodegas();
      loadFotosLlegada();
    }
  }, [open, entrega]);

  const loadBodegas = async () => {
    const { data } = await supabase
      .from("bodegas")
      .select("id, nombre, es_externa")
      .eq("activo", true)
      .order("nombre");
    
    if (data) {
      setBodegas(data);
      // Ya no seleccionamos Bodega 1 por defecto - lo hará el hook de auto-detección
    }
  };
  
  // Efecto para usar la bodega auto-detectada
  useEffect(() => {
    if (bodegaDetectada && !bodegaSeleccionada) {
      setBodegaSeleccionada(bodegaDetectada.id);
    }
  }, [bodegaDetectada, bodegaSeleccionada]);

  const loadFotosLlegada = async () => {
    if (!entrega?.id) return;
    setLoadingFotos(true);
    try {
      const { data: evidencias, error } = await supabase
        .from("ordenes_compra_entregas_evidencias" as any)
        .select("id, tipo_evidencia, ruta_storage")
        .eq("entrega_id", entrega.id)
        .eq("fase", "llegada");
      
      if (error) throw error;
      
      // Obtener URLs firmadas para las fotos
      const fotosConUrl: FotoLlegada[] = [];
      for (const evidencia of (evidencias as any[]) || []) {
        const { data: signedData } = await supabase.storage
          .from("recepciones-evidencias")
          .createSignedUrl(evidencia.ruta_storage, 3600);
        
        fotosConUrl.push({
          id: evidencia.id,
          tipo_evidencia: evidencia.tipo_evidencia,
          ruta_storage: evidencia.ruta_storage,
          url: signedData?.signedUrl || undefined
        });
      }
      
      setFotosLlegada(fotosConUrl);
    } catch (error) {
      console.error("Error cargando fotos de llegada:", error);
    } finally {
      setLoadingFotos(false);
    }
  };

  const loadProductos = async () => {
    setLoading(true);
    try {
      // Primero obtener datos de la entrega para saber si es faltante
      const { data: entregaData } = await supabase
        .from("ordenes_compra_entregas")
        .select("origen_faltante, productos_faltantes")
        .eq("id", entrega.id)
        .maybeSingle();

      const esEntregaFaltante = entregaData?.origen_faltante === true;
      const productosFaltantes = (Array.isArray(entregaData?.productos_faltantes) 
        ? entregaData.productos_faltantes as unknown as ProductoFaltante[] 
        : []);

      const { data, error } = await supabase
        .from("ordenes_compra_detalles")
        .select(`
          id,
          producto_id,
          cantidad_ordenada,
          cantidad_recibida,
          producto:productos(id, codigo, nombre, maneja_caducidad)
        `)
        .eq("orden_compra_id", entrega.orden_compra.id);

      if (error) throw error;

      let productosData = (data as any[]) || [];
      
      // Si es entrega de faltante, filtrar solo los productos que faltaron
      if (esEntregaFaltante && productosFaltantes.length > 0) {
        const productosFaltantesIds = productosFaltantes
          .map(pf => pf.producto_id)
          .filter(Boolean);
        
        // Filtrar solo los productos que están en la lista de faltantes
        productosData = productosData.filter(p => 
          productosFaltantesIds.includes(p.producto_id) ||
          // Fallback: buscar por nombre si no hay producto_id
          productosFaltantes.some(pf => 
            pf.nombre === p.producto?.nombre
          )
        );
        
        // Ajustar cantidades esperadas según los faltantes
        productosData = productosData.map(p => {
          const faltante = productosFaltantes.find(
            pf => pf.producto_id === p.producto_id || pf.nombre === p.producto?.nombre
          );
          return {
            ...p,
            // Sobreescribir cantidad ordenada con cantidad faltante
            cantidad_ordenada: faltante?.cantidad_faltante || p.cantidad_ordenada,
            // Resetear cantidad_recibida a 0 para esta entrega específica
            cantidad_recibida: 0
          };
        });
      }
      
      // Obtener el proveedor_id de la orden de compra
      const proveedorId = entrega.orden_compra?.proveedor?.id;
      
      // Si hay proveedor, buscar configuración de lotes
      let lotesConfigMap: Record<string, { dividir: boolean; cantidad: number; unidades: number }> = {};
      
      if (proveedorId) {
        const productIds = productosData.map(p => p.producto_id);
        const { data: configData } = await supabase
          .from("proveedor_productos")
          .select("producto_id, dividir_en_lotes_recepcion, cantidad_lotes_default, unidades_por_lote_default")
          .eq("proveedor_id", proveedorId)
          .in("producto_id", productIds);
        
        if (configData) {
          configData.forEach((config: any) => {
            if (config.dividir_en_lotes_recepcion && config.cantidad_lotes_default && config.unidades_por_lote_default) {
              lotesConfigMap[config.producto_id] = {
                dividir: true,
                cantidad: config.cantidad_lotes_default,
                unidades: config.unidades_por_lote_default
              };
            }
          });
        }
      }
      
      // Agregar configuración de lotes a cada producto
      const productosConConfig = productosData.map(p => ({
        ...p,
        lotesConfig: lotesConfigMap[p.producto_id] ? {
          dividir_en_lotes: lotesConfigMap[p.producto_id].dividir,
          cantidad_lotes: lotesConfigMap[p.producto_id].cantidad,
          unidades_por_lote: lotesConfigMap[p.producto_id].unidades
        } : undefined
      }));
      
      setProductos(productosConConfig);
      
      const cantidades: Record<string, number> = {};
      const fechas: Record<string, string> = {};
      const lotesInit: Record<string, LoteInput[]> = {};
      
      productosConConfig.forEach(p => {
        const faltante = p.cantidad_ordenada - p.cantidad_recibida;
        cantidades[p.id] = Math.max(0, faltante);
        fechas[p.id] = "";
        
        // Si tiene configuración de lotes, pre-generar los inputs
        if (p.lotesConfig?.dividir_en_lotes) {
          const lotes: LoteInput[] = [];
          for (let i = 0; i < p.lotesConfig.cantidad_lotes; i++) {
            lotes.push({
              id: `${p.id}-lote-${i}`,
              numero_lote: "",
              cantidad: p.lotesConfig.unidades_por_lote,
              fecha_caducidad: ""
            });
          }
          lotesInit[p.id] = lotes;
        }
      });
      
      setCantidadesRecibidas(cantidades);
      setFechasCaducidad(fechas);
      setLotesInputs(lotesInit);
      
      // Cargar créditos de reposición esperada para este proveedor
      if (proveedorId) {
        const { data: creditosData } = await supabase
          .from("proveedor_creditos_pendientes")
          .select(`
            id, producto_id, producto_nombre, cantidad, precio_unitario, monto_total, motivo, status,
            ordenes_compra:orden_compra_origen_id (folio)
          `)
          .eq("proveedor_id", proveedorId)
          .in("status", ["pendiente", "reposicion_esperada"]);
        
        const creditos = (creditosData || []).map((c: any) => ({
          id: c.id,
          producto_id: c.producto_id,
          producto_nombre: c.producto_nombre,
          cantidad: c.cantidad,
          precio_unitario: c.precio_unitario || 0,
          monto_total: c.monto_total,
          motivo: c.motivo,
          status: c.status,
          oc_origen_folio: c.ordenes_compra?.folio || "Desconocido"
        }));
        setCreditosReposicionEsperada(creditos);
      }
    } catch (error) {
      console.error("Error cargando productos:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los productos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCantidadChange = (detalleId: string, valor: string) => {
    // Permitir campo vacío para mejor UX al escribir
    const cantidad = valor === "" ? "" : Number(valor);
    setCantidadesRecibidas(prev => ({ ...prev, [detalleId]: cantidad }));
  };

  // Helper para obtener valor numérico (trata string vacío como 0)
  const getCantidadNumerica = (detalleId: string): number => {
    const valor = cantidadesRecibidas[detalleId];
    if (typeof valor === "number") return valor;
    return valor === "" || valor === undefined ? 0 : Number(valor);
  };

  const handleFechaCaducidadChange = (detalleId: string, fecha: string) => {
    setFechasCaducidad(prev => ({ ...prev, [detalleId]: fecha }));
  };

  const handleRazonDiferenciaChange = (detalleId: string, razon: string) => {
    setRazonesDiferencia(prev => ({ ...prev, [detalleId]: razon }));
  };

  const handleNotaDiferenciaChange = (detalleId: string, nota: string) => {
    setNotasDiferencia(prev => ({ ...prev, [detalleId]: nota }));
  };

  const handleEvidenciaCapture = (tipo: string, file: File) => {
    const preview = URL.createObjectURL(file);
    setEvidencias(prev => [...prev, { tipo, file, preview }]);
  };

  const handleRemoveEvidencia = (index: number) => {
    setEvidencias(prev => {
      const newEvidencias = [...prev];
      URL.revokeObjectURL(newEvidencias[index].preview);
      newEvidencias.splice(index, 1);
      return newEvidencias;
    });
  };

  const handleFotoCaducidadCapture = (productoId: string, file: File, preview: string) => {
    setFotosCaducidad(prev => ({ ...prev, [productoId]: { file, preview } }));
  };

  const handleRemoveFotoCaducidad = (productoId: string) => {
    setFotosCaducidad(prev => {
      if (prev[productoId]) URL.revokeObjectURL(prev[productoId]!.preview);
      return { ...prev, [productoId]: null };
    });
  };

  const handleFotoDiferenciaCapture = (productoId: string, file: File, preview: string) => {
    setFotosDiferencia(prev => ({ ...prev, [productoId]: { file, preview } }));
  };

  const handleRemoveFotoDiferencia = (productoId: string) => {
    setFotosDiferencia(prev => {
      if (prev[productoId]) URL.revokeObjectURL(prev[productoId]!.preview);
      return { ...prev, [productoId]: null };
    });
  };

  // Funciones para manejar lotes múltiples
  const handleLoteChange = (productoDetalleId: string, loteIndex: number, field: keyof LoteInput, value: string | number) => {
    setLotesInputs(prev => {
      const lotes = [...(prev[productoDetalleId] || [])];
      if (lotes[loteIndex]) {
        lotes[loteIndex] = { ...lotes[loteIndex], [field]: value };
      }
      return { ...prev, [productoDetalleId]: lotes };
    });
  };

  const addLoteInput = (productoDetalleId: string) => {
    setLotesInputs(prev => {
      const lotes = [...(prev[productoDetalleId] || [])];
      lotes.push({
        id: `${productoDetalleId}-lote-${Date.now()}`,
        numero_lote: "",
        cantidad: 0,
        fecha_caducidad: ""
      });
      return { ...prev, [productoDetalleId]: lotes };
    });
  };

  const removeLoteInput = (productoDetalleId: string, loteIndex: number) => {
    setLotesInputs(prev => {
      const lotes = [...(prev[productoDetalleId] || [])];
      lotes.splice(loteIndex, 1);
      return { ...prev, [productoDetalleId]: lotes };
    });
  };

  // Obtener total de lotes para un producto
  const getTotalLotes = (productoDetalleId: string): number => {
    const lotes = lotesInputs[productoDetalleId] || [];
    return lotes.reduce((sum, l) => sum + (l.cantidad || 0), 0);
  };

  const getProductosConDiferencia = () => {
    return productos.filter(p => {
      const faltante = p.cantidad_ordenada - p.cantidad_recibida;
      const recibiendo = getCantidadNumerica(p.id);
      return recibiendo < faltante;
    });
  };

  const getProductosParaDevolucion = () => {
    return productos.filter(p => {
      const faltante = p.cantidad_ordenada - p.cantidad_recibida;
      const recibiendo = getCantidadNumerica(p.id);
      const razon = razonesDiferencia[p.id];
      return recibiendo < faltante && 
             RAZONES_REQUIEREN_DEVOLUCION.includes(razon);
    }).map(p => {
      const faltante = p.cantidad_ordenada - p.cantidad_recibida;
      const recibiendo = getCantidadNumerica(p.id);
      const razon = razonesDiferencia[p.id];
      return {
        detalleId: p.id,
        productoId: p.producto_id,
        productoNombre: p.producto?.nombre || "",
        productoCodigo: p.producto?.codigo || "",
        cantidadDevuelta: faltante - recibiendo,
        razon: razon,
        razonLabel: RAZONES_DIFERENCIA.find(r => r.value === razon)?.label || razon
      };
    });
  };

  // Verificar si descarga completa (sin diferencias)
  const esDescargaCompleta = (): boolean => {
    return productos.every(p => {
      const faltante = p.cantidad_ordenada - p.cantidad_recibida;
      const recibiendo = getCantidadNumerica(p.id);
      return recibiendo >= faltante;
    });
  };

  // ========== FUNCIONES PARA MANEJO DE EXCEDENTES ==========
  
  // Obtener productos con excedente (llegó MÁS de lo esperado)
  const getProductosConExcedente = () => {
    return productos.filter(p => {
      const tieneLotesMultiples = p.lotesConfig?.dividir_en_lotes && lotesInputs[p.id]?.length > 0;
      const cantidadActual = tieneLotesMultiples ? getTotalLotes(p.id) : getCantidadNumerica(p.id);
      const faltante = p.cantidad_ordenada - p.cantidad_recibida;
      return cantidadActual > faltante;
    });
  };

  // Buscar crédito de reposición para un producto específico
  const getCreditoParaProducto = (productoId: string): CreditoReposicion | undefined => {
    return creditosReposicionEsperada.find(
      c => c.producto_id === productoId && 
           (c.status === 'reposicion_esperada' || c.status === 'pendiente')
    );
  };

  // Confirmar que el excedente es una reposición de un crédito pendiente
  const handleConfirmarReposicion = async (producto: ProductoEntrega, credito: CreditoReposicion) => {
    try {
      // Marcar el crédito como "repuesto" en la base de datos
      const { error } = await supabase
        .from("proveedor_creditos_pendientes")
        .update({
          status: "repuesto",
          resolucion_notas: `Repuesto en recepción de ${entrega.orden_compra.folio} entrega #${entrega.numero_entrega}`,
          fecha_aplicacion: new Date().toISOString()
        })
        .eq("id", credito.id);

      if (error) throw error;

      // Remover de la lista local
      setCreditosReposicionEsperada(prev => prev.filter(c => c.id !== credito.id));
      
      // Marcar como confirmado
      setExcedentesConfirmados(prev => ({ ...prev, [producto.id]: 'reposicion' }));
      
      toast({
        title: "Reposición confirmada",
        description: `${credito.cantidad} bulto(s) de reposición de ${credito.oc_origen_folio} registrados correctamente`
      });
    } catch (error) {
      console.error("Error confirmando reposición:", error);
      toast({
        title: "Error",
        description: "No se pudo confirmar la reposición",
        variant: "destructive"
      });
    }
  };

  // Aceptar excedente sin crédito (se pagará extra)
  const handleAceptarExcedenteYPagar = (productoId: string, cantidad: number) => {
    setExcedentesConfirmados(prev => ({ ...prev, [productoId]: 'aceptar' }));
    toast({
      title: "Excedente aceptado",
      description: `Se registrarán ${cantidad} unidades. Recuerda verificar con el proveedor.`,
    });
  };

  // Rechazar excedente - ajustar cantidad al esperado
  const handleRechazarExcedente = (productoId: string, cantidadEsperada: number) => {
    setCantidadesRecibidas(prev => ({ ...prev, [productoId]: cantidadEsperada }));
    setExcedentesConfirmados(prev => ({ ...prev, [productoId]: 'rechazar' }));
    toast({
      title: "Excedente rechazado",
      description: `Se registrarán solo ${cantidadEsperada} unidades esperadas`
    });
  };

  // Formatear moneda
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
  };

  const validarRecepcion = (): boolean => {
    if (!bodegaSeleccionada) {
      toast({
        title: "Datos incompletos",
        description: "Selecciona la bodega de destino",
        variant: "destructive"
      });
      return false;
    }

    // Validar número de remisión proveedor
    if (!numeroRemisionProveedor.trim()) {
      toast({
        title: "Número de remisión requerido",
        description: "Ingresa el número de remisión del proveedor",
        variant: "destructive"
      });
      return false;
    }

    // Validar foto de remisión proveedor
    if (!fotoRemisionProveedor) {
      toast({
        title: "Foto de remisión requerida",
        description: "Captura una foto del documento de remisión del proveedor",
        variant: "destructive"
      });
      return false;
    }

    // Si descarga completa, validar foto de caja vacía
    if (esDescargaCompleta() && !fotoCajaVacia) {
      toast({
        title: "Foto de caja vacía requerida",
        description: "Al recibir toda la mercancía, captura foto de la caja vacía del camión",
        variant: "destructive"
      });
      return false;
    }

    // Validar productos con múltiples lotes
    const productosConLotes = productos.filter(p => p.lotesConfig?.dividir_en_lotes);
    for (const p of productosConLotes) {
      const lotes = lotesInputs[p.id] || [];
      const lotesSinNumero = lotes.filter(l => l.cantidad > 0 && !l.numero_lote.trim());
      if (lotesSinNumero.length > 0) {
        toast({
          title: "Número de lote requerido",
          description: `"${p.producto?.nombre}" requiere número de lote para cada entrada`,
          variant: "destructive"
        });
        return false;
      }
      
      // Validar fechas de caducidad en lotes si el producto maneja caducidad
      if (p.producto?.maneja_caducidad) {
        const lotesSinFecha = lotes.filter(l => l.cantidad > 0 && !l.fecha_caducidad);
        if (lotesSinFecha.length > 0) {
          toast({
            title: "Fecha de caducidad requerida",
            description: `Todos los lotes de "${p.producto?.nombre}" requieren fecha de caducidad`,
            variant: "destructive"
          });
          return false;
        }
      }
    }

    // Validar productos SIN lotes múltiples que manejan caducidad
    const productosConCaducidadSinLotes = productos.filter(p => 
      p.producto?.maneja_caducidad && 
      getCantidadNumerica(p.id) > 0 && 
      !p.lotesConfig?.dividir_en_lotes
    );
    
    const faltaFecha = productosConCaducidadSinLotes.find(p => !fechasCaducidad[p.id]);
    if (faltaFecha) {
      toast({
        title: "Fecha obligatoria",
        description: `El producto "${faltaFecha.producto?.nombre}" requiere fecha de caducidad`,
        variant: "destructive"
      });
      return false;
    }
    
    const faltaFoto = productosConCaducidadSinLotes.find(p => !fotosCaducidad[p.id]);
    if (faltaFoto) {
      toast({
        title: "Foto obligatoria", 
        description: `El producto "${faltaFoto.producto?.nombre}" requiere foto de la etiqueta de caducidad`,
        variant: "destructive"
      });
      return false;
    }

    const productosConDiferencia = getProductosConDiferencia();
    const faltaRazon = productosConDiferencia.find(p => !razonesDiferencia[p.id]);
    if (faltaRazon) {
      toast({
        title: "Razón de diferencia requerida",
        description: `Indica por qué "${faltaRazon.producto?.nombre}" tiene diferencia`,
        variant: "destructive"
      });
      return false;
    }

    // Validar foto obligatoria para productos rotos/dañados
    const productosRotos = productosConDiferencia.filter(p => 
      RAZONES_REQUIEREN_FOTO.includes(razonesDiferencia[p.id]) && !fotosDiferencia[p.id]
    );
    if (productosRotos.length > 0) {
      toast({
        title: "Foto de producto dañado requerida",
        description: `Captura foto del producto "${productosRotos[0].producto?.nombre}" que está roto/dañado`,
        variant: "destructive"
      });
      return false;
    }

    // Validar excedentes no confirmados
    const productosConExcedenteNoConfirmado = productos.filter(p => {
      const tieneLotesMultiples = p.lotesConfig?.dividir_en_lotes && lotesInputs[p.id]?.length > 0;
      const cantidadActual = tieneLotesMultiples ? getTotalLotes(p.id) : getCantidadNumerica(p.id);
      const faltante = p.cantidad_ordenada - p.cantidad_recibida;
      // Si tiene excedente y no se ha confirmado qué hacer con él
      return cantidadActual > faltante && !excedentesConfirmados[p.id];
    });

    if (productosConExcedenteNoConfirmado.length > 0) {
      toast({
        title: "Confirma los excedentes",
        description: `"${productosConExcedenteNoConfirmado[0].producto?.nombre}" tiene más unidades de las esperadas. Confirma si es reposición o acepta el excedente.`,
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleConfirmarRecepcion = () => {
    if (!validarRecepcion()) return;

    const productosConDiferencia = getProductosConDiferencia();
    const productosParaDevolucion = getProductosParaDevolucion();

    if (productosParaDevolucion.length > 0) {
      setShowDevolucionDialog(true);
      return;
    }

    if (productosConDiferencia.length > 0 && !firmaChoferDiferencia) {
      setShowFirmaDialog(true);
      return;
    }

    // Iniciar flujo de firmas de conformidad (chofer primero)
    setShowFirmaChoferConformidadDialog(true);
  };

  const handleFirmaConfirmada = (firmaBase64: string) => {
    setFirmaChoferDiferencia(firmaBase64);
    setShowFirmaDialog(false);
    // Continuar con firma de conformidad del chofer
    setShowFirmaChoferConformidadDialog(true);
  };

  const handleFirmaChoferConformidadConfirmada = (firmaBase64: string) => {
    setFirmaChoferConformidad(firmaBase64);
    setShowFirmaChoferConformidadDialog(false);
    // Ahora pedir firma del almacenista
    setShowFirmaAlmacenistaDialog(true);
  };

  const handleFirmaAlmacenistaConfirmada = (firmaBase64: string) => {
    setFirmaAlmacenista(firmaBase64);
    setShowFirmaAlmacenistaDialog(false);
    // Guardar con todas las firmas
    handleGuardarRecepcionCompleta(firmaBase64);
  };

  const handleDevolucionCompletada = () => {
    setShowDevolucionDialog(false);
    const productosConDiferencia = getProductosConDiferencia();
    if (productosConDiferencia.length > 0 && !firmaChoferDiferencia) {
      setShowFirmaDialog(true);
    } else {
      // Iniciar flujo de firmas de conformidad
      setShowFirmaChoferConformidadDialog(true);
    }
  };

  const handleGuardarRecepcionCompleta = async (firmaAlmacenistaBase64: string) => {
    handleGuardarRecepcionConFirmas(firmaChoferDiferencia, firmaChoferConformidad, firmaAlmacenistaBase64);
  };

  const handleGuardarRecepcionConFirmas = async (
    firmaDiferencia: string | null,
    firmaConformidadChofer: string | null,
    firmaConformidadAlmacenista: string
  ) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      const loteReferencia = `REC-${entrega.orden_compra.folio}-${entrega.numero_entrega}`;
      const proveedorNombre = entrega.orden_compra?.proveedor?.nombre || 
                              entrega.orden_compra?.proveedor_nombre_manual || 
                              'proveedor';

      await supabase.from("recepciones_participantes").insert({
        entrega_id: entrega.id,
        user_id: user.id,
        accion: "inicio_recepcion",
        notas: `Inició completar recepción`
      });

      for (const producto of productos) {
        // Determinar cantidad total recibida (normal o suma de lotes)
        const tieneLotesMultiples = producto.lotesConfig?.dividir_en_lotes && lotesInputs[producto.id]?.length > 0;
        const lotes = lotesInputs[producto.id] || [];
        const cantidadARecibir = tieneLotesMultiples 
          ? lotes.reduce((sum, l) => sum + (l.cantidad || 0), 0)
          : getCantidadNumerica(producto.id);
        
        if (producto) {
          // IMPORTANTE: Para entregas parciales, sumamos a lo ya recibido en entregas anteriores
          // pero para la entrega actual, usamos la cantidad ingresada directamente
          // La cantidad_recibida del producto YA refleja entregas anteriores de la OC
          // Aquí registramos lo recibido en ESTA entrega específica
          const nuevaCantidadRecibida = (producto.cantidad_recibida || 0) + cantidadARecibir;
          const updateData: any = { cantidad_recibida: nuevaCantidadRecibida };
          
          // Registrar diferencia si no se recibió todo lo esperado en esta entrega
          const faltante = producto.cantidad_ordenada - nuevaCantidadRecibida;
          if (faltante > 0 && razonesDiferencia[producto.id]) {
            updateData.razon_diferencia = razonesDiferencia[producto.id];
            updateData.notas_diferencia = notasDiferencia[producto.id] || null;
          }
          
          await supabase
            .from("ordenes_compra_detalles")
            .update(updateData)
            .eq("id", producto.id);

          if (cantidadARecibir > 0) {
            const { data: detalleConPrecio } = await supabase
              .from("ordenes_compra_detalles")
              .select("precio_unitario_compra")
              .eq("id", producto.id)
              .single();
            
            const precioCompra = detalleConPrecio?.precio_unitario_compra || 0;

            // Si tiene lotes múltiples, crear un registro por cada lote
            if (tieneLotesMultiples) {
              for (const lote of lotes) {
                if (lote.cantidad > 0) {
                  const { error: loteError } = await supabase
                    .from("inventario_lotes")
                    .insert({
                      producto_id: producto.producto_id,
                      cantidad_disponible: lote.cantidad,
                      precio_compra: precioCompra,
                      precio_compra_provisional: precioCompra, // Costo OC como provisional
                      conciliado: false, // Pendiente de verificar con factura
                      fecha_entrada: new Date().toISOString(),
                      fecha_caducidad: lote.fecha_caducidad || null,
                      lote_referencia: lote.numero_lote || loteReferencia,
                      orden_compra_id: entrega.orden_compra.id,
                      bodega_id: bodegaSeleccionada,
                      recibido_por: user.id,
                      notas: `Recibido de ${proveedorNombre} - Lote: ${lote.numero_lote}`
                    });

                  if (loteError) {
                    console.error("Error creando lote:", loteError);
                    throw loteError;
                  }
                }
              }
            } else {
              // Comportamiento original: un solo lote
              const fechaCaducidad = fechasCaducidad[producto.id] || null;
              const { error: loteError } = await supabase
                .from("inventario_lotes")
                .insert({
                  producto_id: producto.producto_id,
                  cantidad_disponible: cantidadARecibir,
                  precio_compra: precioCompra,
                  precio_compra_provisional: precioCompra, // Costo OC como provisional
                  conciliado: false, // Pendiente de verificar con factura
                  fecha_entrada: new Date().toISOString(),
                  fecha_caducidad: fechaCaducidad || null,
                  lote_referencia: loteReferencia,
                  orden_compra_id: entrega.orden_compra.id,
                  bodega_id: bodegaSeleccionada,
                  recibido_por: user.id,
                  notas: `Recibido de ${proveedorNombre}`
                });

              if (loteError) {
                console.error("Error creando lote:", loteError);
                throw loteError;
              }
            }

            // Nota: El stock ahora se actualiza automáticamente via trigger SQL (sync_stock_from_lotes)
            // IMPORTANTE: NO actualizar ultimo_costo_compra aquí - se actualiza en conciliación
            // El costo del producto solo se actualizará cuando se verifique con la factura del proveedor
            // Esto garantiza que el catálogo de productos refleje costos confirmados, no provisionales
          }
        }
      }

      // Actualizar status de la entrega con TODOS los nuevos campos
      const updateEntrega: any = {
        status: "recibida",
        status_conciliacion: "por_conciliar", // Marcar como pendiente de verificar costos
        fecha_entrega_real: new Date().toISOString().split("T")[0],
        recibido_por: user.id,
        recepcion_finalizada_en: new Date().toISOString(),
        notas: notas || null,
        trabajando_por: null,
        trabajando_desde: null,
        // Nuevos campos
        numero_remision_proveedor: numeroRemisionProveedor.trim(),
        firma_chofer_conformidad: firmaConformidadChofer,
        firma_chofer_conformidad_fecha: firmaConformidadChofer ? new Date().toISOString() : null,
        firma_almacenista: firmaConformidadAlmacenista,
        firma_almacenista_fecha: new Date().toISOString(),
      };

      if (firmaDiferencia) {
        updateEntrega.firma_chofer_diferencia = firmaDiferencia;
        updateEntrega.firma_chofer_diferencia_fecha = new Date().toISOString();
      }

      await supabase
        .from("ordenes_compra_entregas")
        .update(updateEntrega)
        .eq("id", entrega.id);

      // Detectar productos con "no_llego" y cantidad pendiente
      const productosFaltantes = productos.filter(p => {
        const cantRecibida = getCantidadNumerica(p.id);
        const razon = razonesDiferencia[p.id];
        return razon === 'no_llego' && cantRecibida < p.cantidad_ordenada;
      });

      // Si hay faltantes, crear entrega automática para el siguiente día hábil
      if (productosFaltantes.length > 0) {
        // Calcular siguiente día hábil (saltar domingos)
        const hoy = new Date();
        let siguienteDia = new Date(hoy);
        siguienteDia.setDate(siguienteDia.getDate() + 1);
        if (siguienteDia.getDay() === 0) siguienteDia.setDate(siguienteDia.getDate() + 1); // Skip Sunday

        const fechaSiguiente = siguienteDia.toISOString().split("T")[0];

        // Obtener el siguiente número de entrega
        const { data: ultimaEntrega } = await supabase
          .from("ordenes_compra_entregas")
          .select("numero_entrega")
          .eq("orden_compra_id", entrega.orden_compra.id)
          .order("numero_entrega", { ascending: false })
          .limit(1)
          .single();

        const siguienteNumero = (ultimaEntrega?.numero_entrega || entrega.numero_entrega) + 1;

        const productosFaltantesData = productosFaltantes.map(p => ({
          producto_id: p.producto_id,
          nombre: p.producto?.nombre || "Producto",
          cantidad_faltante: p.cantidad_ordenada - getCantidadNumerica(p.id),
          codigo: p.producto?.codigo
        }));

        // Crear nueva entrega para faltantes
        await supabase.from("ordenes_compra_entregas").insert({
          orden_compra_id: entrega.orden_compra.id,
          numero_entrega: siguienteNumero,
          fecha_programada: fechaSiguiente,
          status: "programada",
          cantidad_bultos: productosFaltantesData.reduce((sum, p) => sum + p.cantidad_faltante, 0),
          notas: `[FALTANTE] De entrega #${entrega.numero_entrega}: ${productosFaltantesData.map(p => `${p.cantidad_faltante}x ${p.nombre}`).join(", ")}`,
          origen_faltante: true,
          productos_faltantes: productosFaltantesData
        });

        // Marcar orden como parcial
        await supabase
          .from("ordenes_compra")
          .update({ status: "parcial" })
          .eq("id", entrega.orden_compra.id);

        // Notificar al proveedor (obtener email del proveedor)
        const { data: proveedorData } = await supabase
          .from("proveedores")
          .select("email, nombre")
          .eq("id", entrega.orden_compra?.proveedor?.id)
          .single();
        if (proveedorData?.email) {
          await supabase.functions.invoke("notificar-faltante-oc", {
            body: {
              tipo: "faltante_creado",
              entrega_id: entrega.id,
              orden_folio: entrega.orden_compra.folio,
              proveedor_email: proveedorData.email,
              proveedor_nombre: entrega.orden_compra?.proveedor?.nombre || "Proveedor",
              fecha_programada: fechaSiguiente,
              productos_faltantes: productosFaltantesData
            }
          });
        }
      } else {
        // Verificar si TODAS las entregas de esta orden ya están recibidas
        const { data: entregasPendientes } = await supabase
          .from("ordenes_compra_entregas")
          .select("id")
          .eq("orden_compra_id", entrega.orden_compra.id)
          .neq("status", "recibida");

        // Si no hay entregas pendientes, marcar la orden como completada
        if (!entregasPendientes || entregasPendientes.length === 0) {
          await supabase
            .from("ordenes_compra")
            .update({ 
              status: "completada",
              fecha_entrega_programada: new Date().toISOString().split("T")[0]
            })
            .eq("id", entrega.orden_compra.id);

          // === VERIFICACIÓN DE BALANCE PARA OC ANTICIPADAS ===
          // Si es pago anticipado, verificar que se recibió todo lo pagado
          if (entrega.orden_compra.tipo_pago === 'anticipado') {
            try {
              // Obtener todos los detalles de la OC
              const { data: detallesOC } = await supabase
                .from("ordenes_compra_detalles")
                .select("producto_id, cantidad_ordenada, cantidad_recibida, precio_unitario_compra")
                .eq("orden_compra_id", entrega.orden_compra.id);

              // Calcular diferencias por producto
              const productosConSaldo = (detallesOC || []).filter(d => 
                (d.cantidad_ordenada || 0) > (d.cantidad_recibida || 0)
              );

              if (productosConSaldo.length > 0) {
                // Obtener nombres de productos
                const productIds = productosConSaldo.map(p => p.producto_id);
                const { data: productosInfo } = await supabase
                  .from("productos")
                  .select("id, nombre, codigo")
                  .in("id", productIds);
                
                const productosMap = new Map(
                  (productosInfo || []).map(p => [p.id, p])
                );

                // Verificar créditos ya existentes para evitar duplicados
                const { data: creditosExistentes } = await supabase
                  .from("proveedor_creditos_pendientes")
                  .select("producto_id, cantidad")
                  .eq("orden_compra_origen_id", entrega.orden_compra.id)
                  .in("status", ["pendiente", "aplicado"]);

                const creditosExistentesMap = new Map<string, number>();
                (creditosExistentes || []).forEach(c => {
                  const actual = creditosExistentesMap.get(c.producto_id) || 0;
                  creditosExistentesMap.set(c.producto_id, actual + c.cantidad);
                });

                // Crear créditos solo por la diferencia no cubierta
                const creditosACrear = productosConSaldo
                  .map(detalle => {
                    const diferencia = (detalle.cantidad_ordenada || 0) - (detalle.cantidad_recibida || 0);
                    const yaCreditado = creditosExistentesMap.get(detalle.producto_id) || 0;
                    const pendiente = diferencia - yaCreditado;
                    
                    if (pendiente <= 0) return null;
                    
                    const productoInfo = productosMap.get(detalle.producto_id);
                    return {
                      proveedor_id: entrega.orden_compra.proveedor?.id || null,
                      proveedor_nombre_manual: entrega.orden_compra.proveedor_nombre_manual || null,
                      orden_compra_origen_id: entrega.orden_compra.id,
                      entrega_id: entrega.id,
                      producto_id: detalle.producto_id,
                      producto_nombre: productoInfo?.nombre || "Producto",
                      cantidad: pendiente,
                      precio_unitario: detalle.precio_unitario_compra || 0,
                      monto_total: pendiente * (detalle.precio_unitario_compra || 0),
                      motivo: "saldo_oc_anticipada",
                      status: "pendiente",
                      notas: `Saldo automático al completar ${entrega.orden_compra.folio}`
                    };
                  })
                  .filter(Boolean);

                // Insertar créditos
                if (creditosACrear.length > 0) {
                  await supabase
                    .from("proveedor_creditos_pendientes")
                    .insert(creditosACrear);

                  // Calcular total de créditos generados
                  const totalCredito = creditosACrear.reduce((sum, c) => sum + (c?.monto_total || 0), 0);

                  // Notificar por email al proveedor
                  try {
                    await supabase.functions.invoke("notificar-faltante-anticipado", {
                      body: {
                        orden_compra_id: entrega.orden_compra.id,
                        faltantes: creditosACrear.map(c => ({
                          producto_id: c?.producto_id,
                          producto_nombre: c?.producto_nombre,
                          cantidad_faltante: c?.cantidad,
                          precio_unitario: c?.precio_unitario,
                          monto_total: c?.monto_total,
                          motivo: "saldo_final"
                        })),
                        entrega_id: entrega.id
                      }
                    });
                  } catch (emailError) {
                    console.error("Error enviando notificación de saldo:", emailError);
                  }

                  // Mostrar notificación al usuario
                  toast({
                    title: "Saldo registrado",
                    description: `Se registró crédito pendiente por ${creditosACrear.length} producto(s) con valor de ${formatCurrency(totalCredito)}`,
                    variant: "default"
                  });
                }
              }
            } catch (balanceError) {
              console.error("Error verificando balance de OC anticipada:", balanceError);
            }
          }
        }
      }

      await supabase.from("recepciones_participantes").insert({
        entrega_id: entrega.id,
        user_id: user.id,
        accion: "fin_recepcion",
        notas: `Completó recepción. Tiempo de descarga: ${tiempoDescarga}`
      });

      // Subir evidencias regulares
      for (const evidencia of evidencias) {
        const fileName = `${entrega.orden_compra.id}/${entrega.id}/${Date.now()}-${evidencia.tipo}.jpg`;
        
        const { error: uploadError } = await supabase.storage
          .from("recepciones-evidencias")
          .upload(fileName, evidencia.file);

        if (!uploadError) {
          await supabase
            .from("ordenes_compra_entregas_evidencias" as any)
            .insert({
              entrega_id: entrega.id,
              tipo_evidencia: evidencia.tipo,
              fase: "recepcion",
              ruta_storage: fileName,
              nombre_archivo: evidencia.file.name,
              capturado_por: user.id
            });
        }
      }

      // Subir foto de remisión del proveedor
      if (fotoRemisionProveedor) {
        const fileNameRemision = `${entrega.orden_compra.id}/${entrega.id}/${Date.now()}-remision_proveedor.jpg`;
        const { error: uploadErrorRemision } = await supabase.storage
          .from("recepciones-evidencias")
          .upload(fileNameRemision, fotoRemisionProveedor.file);

        if (!uploadErrorRemision) {
          await supabase
            .from("ordenes_compra_entregas_evidencias" as any)
            .insert({
              entrega_id: entrega.id,
              tipo_evidencia: "remision_proveedor",
              fase: "recepcion",
              ruta_storage: fileNameRemision,
              nombre_archivo: fotoRemisionProveedor.file.name,
              capturado_por: user.id
            });
        }
      }

      // Subir foto de caja vacía (si existe)
      if (fotoCajaVacia) {
        const fileNameCaja = `${entrega.orden_compra.id}/${entrega.id}/${Date.now()}-caja_vacia.jpg`;
        const { error: uploadErrorCaja } = await supabase.storage
          .from("recepciones-evidencias")
          .upload(fileNameCaja, fotoCajaVacia.file);

        if (!uploadErrorCaja) {
          await supabase
            .from("ordenes_compra_entregas_evidencias" as any)
            .insert({
              entrega_id: entrega.id,
              tipo_evidencia: "caja_vacia",
              fase: "recepcion",
              ruta_storage: fileNameCaja,
              nombre_archivo: fotoCajaVacia.file.name,
              capturado_por: user.id
            });
        }
      }

      toast({
        title: "Recepción registrada",
        description: "Mercancía ingresada al inventario correctamente"
      });

      // Notificar al contacto de logística del proveedor (si existe)
      // Generamos el PDF para adjuntarlo al correo
      let pdfBase64Data: { base64: string; fileName: string } | null = null;
      
      try {
        const proveedorId = entrega.orden_compra?.proveedor?.id;
        const nombreProveedor = entrega.orden_compra.proveedor?.nombre 
          || entrega.orden_compra.proveedor_nombre_manual 
          || "Proveedor";

        // Obtener el usuario actual para el nombre del almacenista
        const { data: { user } } = await supabase.auth.getUser();
        let currentUserName = "Almacenista";
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", user.id)
            .single();
          if (profile?.full_name) currentUserName = profile.full_name;
        }

        // Cargar las evidencias fotográficas con URLs firmadas para el PDF
        const { data: evidenciasDB } = await supabase
          .from("ordenes_compra_entregas_evidencias" as any)
          .select("tipo_evidencia, ruta_storage")
          .eq("entrega_id", entrega.id);
        
        const evidenciasConTipos: { url: string; tipo: string }[] = [];
        if (evidenciasDB) {
          for (const ev of evidenciasDB as any[]) {
            const { data: signedData } = await supabase.storage
              .from("recepciones-evidencias")
              .createSignedUrl(ev.ruta_storage, 3600);
            if (signedData?.signedUrl) {
              evidenciasConTipos.push({
                url: signedData.signedUrl,
                tipo: ev.tipo_evidencia
              });
            }
          }
        }

        // Preparar datos de productos para el PDF
        const productosParaPDF = productos.map(p => ({
          id: p.id,
          cantidad_ordenada: p.cantidad_ordenada,
          cantidad_recibida: getCantidadNumerica(p.id),
          razon_diferencia: razonesDiferencia[p.id] || null,
          notas_diferencia: notasDiferencia[p.id] || null,
          producto: {
            codigo: p.producto.codigo,
            nombre: p.producto.nombre,
            marca: (p.producto as any).marca || null,
            especificaciones: (p.producto as any).especificaciones || null,
            contenido_empaque: (p.producto as any).contenido_empaque || null,
            peso_kg: (p.producto as any).peso_kg || null
          }
        }));

        // Generar PDF como base64 para adjuntar al correo
        console.log("Generando PDF de recepción para adjuntar al correo...");
        pdfBase64Data = await generarRecepcionPDFBase64({
          recepcion: {
            id: entrega.id,
            numero_entrega: entrega.numero_entrega,
            cantidad_bultos: entrega.cantidad_bultos || 0,
            fecha_programada: entrega.fecha_programada,
            fecha_entrega_real: new Date().toISOString(),
            status: "completada",
            notas: notas || null,
            firma_chofer_conformidad: firmaChoferConformidad,
            firma_almacenista: firmaAlmacenista,
            recibido_por_profile: { full_name: currentUserName },
            orden_compra: {
              id: entrega.orden_compra.id,
              folio: entrega.orden_compra.folio,
              proveedor: entrega.orden_compra.proveedor,
              proveedor_nombre_manual: entrega.orden_compra.proveedor_nombre_manual
            }
          },
          productos: productosParaPDF,
          evidenciasConTipos: evidenciasConTipos,
          firmaChofer: firmaChoferConformidad,
          firmaAlmacenista: firmaAlmacenista,
          llegadaRegistradaEn: entrega.llegada_registrada_en,
          recepcionFinalizadaEn: new Date().toISOString(),
          placasVehiculo: entrega.placas_vehiculo,
          nombreChoferProveedor: entrega.nombre_chofer_proveedor,
          numeroRemisionProveedor: (entrega as any).numero_remision_proveedor || numeroRemisionProveedor || null
        });
        console.log("PDF generado:", pdfBase64Data.fileName);

        if (proveedorId && entrega.llegada_registrada_en) {
          const { data: contactoLogistica } = await supabase
            .from("proveedor_contactos")
            .select("nombre, email")
            .eq("proveedor_id", proveedorId)
            .eq("recibe_logistica", true)
            .not("email", "is", null)
            .limit(1)
            .single();

          if (contactoLogistica?.email) {
            const horaInicio = format(new Date(entrega.llegada_registrada_en), "HH:mm", { locale: es });
            const horaFin = format(new Date(), "HH:mm", { locale: es });
            const duracionMinutos = differenceInMinutes(new Date(), new Date(entrega.llegada_registrada_en));
            const duracionFormateada = duracionMinutos < 60 
              ? `${duracionMinutos} minutos` 
              : `${Math.floor(duracionMinutos / 60)}h ${duracionMinutos % 60}min`;
            
            const asunto = `✅ Descarga completada - OC ${entrega.orden_compra.folio} - ${nombreProveedor}`;
            const htmlBody = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #16a34a;">✅ Descarga Completada</h2>
                <p>Estimado(a) ${contactoLogistica.nombre},</p>
                <p>Le informamos que la descarga de su unidad ha finalizado exitosamente.</p>
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                  <tr style="background: #f3f4f6;">
                    <td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Proveedor:</strong></td>
                    <td style="padding: 8px; border: 1px solid #e5e7eb;">${nombreProveedor}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Orden de Compra:</strong></td>
                    <td style="padding: 8px; border: 1px solid #e5e7eb;">${entrega.orden_compra.folio}</td>
                  </tr>
                  <tr style="background: #f3f4f6;">
                    <td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Hora de inicio:</strong></td>
                    <td style="padding: 8px; border: 1px solid #e5e7eb;">${horaInicio}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Hora de finalización:</strong></td>
                    <td style="padding: 8px; border: 1px solid #e5e7eb;">${horaFin}</td>
                  </tr>
                  <tr style="background: #f3f4f6;">
                    <td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Duración total:</strong></td>
                    <td style="padding: 8px; border: 1px solid #e5e7eb;">${duracionFormateada}</td>
                  </tr>
                </table>
                <p><strong>Su unidad puede retirarse.</strong></p>
                <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
                  Este es un correo automático del sistema de ALMASA. Adjunto encontrará el comprobante de recepción con evidencias fotográficas y firmas.
                </p>
              </div>
            `;

            // Enviar email CON PDF adjunto
            const { data: emailData, error: emailError } = await supabase.functions.invoke("gmail-api", {
              body: {
                action: "send",
                email: "compras@almasa.com.mx",
                to: contactoLogistica.email,
                subject: asunto,
                body: htmlBody,
                attachments: pdfBase64Data ? [{
                  filename: pdfBase64Data.fileName,
                  content: pdfBase64Data.base64,
                  mimeType: "application/pdf"
                }] : undefined
              }
            });

            await registrarCorreoEnviado({
              tipo: "logistica_fin",
              referencia_id: entrega.orden_compra.id,
              destinatario: contactoLogistica.email,
              asunto: asunto,
              gmail_message_id: emailData?.messageId || null,
              error: emailError?.message || null
            });

            if (!emailError) {
              console.log("Notificación de fin de descarga con PDF enviada a:", contactoLogistica.email);
              toast({
                title: "📧 Correo enviado al proveedor",
                description: `Se notificó a ${contactoLogistica.email} con el PDF de recepción (fotos y firmas incluidas)`,
              });
            } else {
              console.error("Error enviando correo de logística:", emailError);
              toast({
                title: "Error al enviar correo",
                description: `No se pudo notificar a ${contactoLogistica.email}. La recepción se guardó correctamente.`,
                variant: "destructive"
              });
            }

            // Enviar copia a usuarios internos (admin y secretaria)
            const emailsInternos = await getEmailsInternos();
            if (emailsInternos.length > 0) {
              await enviarCopiaInterna({
                asunto: asunto,
                htmlBody: htmlBody,
                emailsDestinatarios: emailsInternos,
                attachments: pdfBase64Data ? [{
                  filename: pdfBase64Data.fileName,
                  content: pdfBase64Data.base64,
                  mimeType: "application/pdf"
                }] : undefined
              });
              console.log("Copias internas de logística (fin) con PDF enviadas a:", emailsInternos.length, "usuarios");
            }
          }
        }
      } catch (emailErr) {
        console.error("Error enviando notificación de logística:", emailErr);
        // No bloqueamos el flujo principal por error de email
      }

      // ========== NOTIFICACIÓN DE DEVOLUCIONES/FALTANTES ==========
      try {
        const productosConDiferencia = getProductosConDiferencia();
        if (productosConDiferencia.length > 0) {
          const proveedorId = entrega.orden_compra?.proveedor?.id;
          const nombreProveedor = entrega.orden_compra?.proveedor?.nombre 
            || entrega.orden_compra?.proveedor_nombre_manual 
            || "Proveedor";

          // Buscar contacto que recibe devoluciones
          let emailDevoluciones: string | null = null;
          if (proveedorId) {
            const { data: contactoDevol } = await supabase
              .from("proveedor_contactos")
              .select("nombre, email")
              .eq("proveedor_id", proveedorId)
              .eq("recibe_devoluciones", true)
              .not("email", "is", null)
              .limit(1)
              .single();
            emailDevoluciones = contactoDevol?.email || null;
          }

          // Construir tabla de diferencias
          const tablaProductos = productosConDiferencia.map(p => {
            const faltante = p.cantidad_ordenada - p.cantidad_recibida;
            const recibido = getCantidadNumerica(p.id);
            const diferencia = faltante - recibido;
            const razon = razonesDiferencia[p.id] || "No especificada";
            const razonLabel = RAZONES_DIFERENCIA.find(r => r.value === razon)?.label || razon;
            
            return `
              <tr>
                <td style="padding: 8px; border: 1px solid #e5e7eb;">${p.producto.nombre}</td>
                <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">${faltante}</td>
                <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">${recibido}</td>
                <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center; color: #dc2626; font-weight: bold;">${diferencia}</td>
                <td style="padding: 8px; border: 1px solid #e5e7eb;">${razonLabel}</td>
              </tr>
            `;
          }).join("");

          const asuntoDevoluciones = `⚠️ Devolución/Faltante - OC ${entrega.orden_compra.folio} - ${nombreProveedor}`;
          const htmlBodyDevoluciones = `
            <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
              <h2 style="color: #dc2626;">⚠️ Notificación de Devolución/Faltante</h2>
              <p>Se registró una recepción con diferencias en la siguiente orden de compra:</p>
              
              <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
                <p><strong>Proveedor:</strong> ${nombreProveedor}</p>
                <p><strong>Orden de Compra:</strong> ${entrega.orden_compra.folio}</p>
                <p><strong>Entrega #:</strong> ${entrega.numero_entrega}</p>
                <p><strong>Fecha de recepción:</strong> ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}</p>
              </div>

              <h3 style="color: #374151;">Productos con Diferencia:</h3>
              <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
                <thead>
                  <tr style="background: #f3f4f6;">
                    <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: left;">Producto</th>
                    <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: center;">Esperados</th>
                    <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: center;">Recibidos</th>
                    <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: center;">Diferencia</th>
                    <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: left;">Razón</th>
                  </tr>
                </thead>
                <tbody>${tablaProductos}</tbody>
              </table>

              <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
                Este es un correo automático del sistema de ALMASA. Adjunto encontrará el comprobante de recepción con evidencias fotográficas y firmas.
              </p>
            </div>
          `;

          // Enviar al proveedor si tiene contacto de devoluciones
          if (emailDevoluciones) {
            const { data: emailDevData, error: emailDevError } = await supabase.functions.invoke("gmail-api", {
              body: {
                action: "send",
                email: "compras@almasa.com.mx",
                to: emailDevoluciones,
                subject: asuntoDevoluciones,
                body: htmlBodyDevoluciones,
                attachments: pdfBase64Data ? [{
                  filename: pdfBase64Data.fileName,
                  content: pdfBase64Data.base64,
                  mimeType: "application/pdf"
                }] : undefined
              }
            });

            await registrarCorreoEnviado({
              tipo: "devolucion_proveedor",
              referencia_id: entrega.orden_compra.id,
              destinatario: emailDevoluciones,
              asunto: asuntoDevoluciones,
              gmail_message_id: emailDevData?.messageId || null,
              error: emailDevError?.message || null
            });

            if (!emailDevError) {
              console.log("Notificación de devolución con PDF enviada a proveedor:", emailDevoluciones);
              toast({
                title: "📧 Notificación de diferencias enviada",
                description: `Se informó al proveedor (${emailDevoluciones}) sobre faltantes/devoluciones con PDF adjunto`,
              });
            } else {
              console.error("Error enviando correo de devoluciones:", emailDevError);
              toast({
                title: "Error al notificar diferencias",
                description: "No se pudo enviar la notificación de faltantes al proveedor",
                variant: "destructive"
              });
            }
          }

          // Enviar copia a usuarios internos (admin y secretaria)
          const emailsInternos = await getEmailsInternos();
          if (emailsInternos.length > 0) {
            await enviarCopiaInterna({
              asunto: asuntoDevoluciones,
              htmlBody: htmlBodyDevoluciones,
              emailsDestinatarios: emailsInternos,
              attachments: pdfBase64Data ? [{
                filename: pdfBase64Data.fileName,
                content: pdfBase64Data.base64,
                mimeType: "application/pdf"
              }] : undefined
            });
            console.log("Copias internas de devolución con PDF enviadas a:", emailsInternos.length, "usuarios");
          }
        }
      } catch (devolErr) {
        console.error("Error enviando notificación de devoluciones:", devolErr);
      }

      onRecepcionCompletada();
    } catch (error) {
      console.error("Error guardando recepción:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar la recepción",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const hayDiferencias = getProductosConDiferencia().length > 0;
  const totalDiferencias = getProductosConDiferencia().reduce((sum, p) => {
    const faltante = p.cantidad_ordenada - p.cantidad_recibida;
    const recibiendo = getCantidadNumerica(p.id);
    return sum + (faltante - recibiendo);
  }, 0);

  return (
    <>
      <Sheet open={open && !showFirmaDialog && !showDevolucionDialog && !showFirmaChoferConformidadDialog && !showFirmaAlmacenistaDialog} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col overflow-hidden">
          <SheetHeader className="flex-shrink-0">
            <SheetTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Completar Recepción: {entrega.orden_compra?.folio}
            </SheetTitle>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Truck className="w-4 h-4" />
              {entrega.orden_compra?.proveedor?.nombre || entrega.orden_compra?.proveedor_nombre_manual}
              <Badge variant="outline">Entrega #{entrega.numero_entrega}</Badge>
            </div>
          </SheetHeader>

          {/* Scroll nativo para mejor soporte en tablets */}
          <div className="flex-1 mt-4 pr-4 -mr-2 overflow-y-auto overscroll-contain">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
              </div>
            ) : (
              <div className="space-y-6 pb-8">
                {/* Info de llegada - datos ya capturados en Fase 1 */}
                <div className="p-3 bg-muted/50 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Clock className="w-4 h-4" />
                      Datos de llegada (Fase 1)
                    </div>
                    {fotosLlegada.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowFotosLlegadaDialog(true)}
                        className="gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        Ver fotos ({fotosLlegada.length})
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Chofer:</span>{" "}
                      <span className="font-medium">{entrega.nombre_chofer_proveedor || "-"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Placas:</span>{" "}
                      <span className="font-medium">{entrega.placas_vehiculo || "-"}</span>
                    </div>
                    {entrega.llegada_registrada_en && (
                      <div>
                        <span className="text-muted-foreground">Llegó:</span>{" "}
                        <span className="font-medium">
                          {format(new Date(entrega.llegada_registrada_en), "HH:mm 'del' dd/MM", { locale: es })}
                        </span>
                      </div>
                    )}
                    {entrega.llegada_registrada_por_profile && (
                      <div>
                        <span className="text-muted-foreground">Registró:</span>{" "}
                        <span className="font-medium flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {entrega.llegada_registrada_por_profile.full_name}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Status de sellos */}
                  <div className="pt-2 border-t">
                    {entrega.numero_sello_llegada === "SIN SELLOS - FIRMADO" ? (
                      <div className="flex items-center gap-2 text-amber-600">
                        <ShieldAlert className="w-4 h-4" />
                        <span className="text-sm font-medium">Sin sellos - Chofer firmó responsiva</span>
                      </div>
                    ) : entrega.numero_sello_llegada ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <Shield className="w-4 h-4" />
                        <span className="text-sm font-medium">Sellos verificados: {entrega.numero_sello_llegada}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Shield className="w-4 h-4" />
                        <span className="text-sm">Sin información de sellos</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Timer de tiempo de descarga */}
                {entrega.llegada_registrada_en && (
                  <div className={cn(
                    "p-4 border rounded-lg",
                    minutosDescarga > 180 
                      ? "bg-amber-100 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800" 
                      : "bg-primary/10 border-primary/30"
                  )}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Timer className={cn(
                          "w-5 h-5",
                          minutosDescarga > 180 ? "text-amber-600" : "text-primary"
                        )} />
                        <span className="font-medium">Tiempo de descarga</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={minutosDescarga > 180 ? "destructive" : "secondary"} 
                          className="text-lg font-mono"
                        >
                          {tiempoDescarga || "calculando..."}
                        </Badge>
                        {minutosDescarga > 180 && (
                          <Badge variant="outline" className="text-amber-600 border-amber-400">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Excedido
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Productos a recibir - PRIMERA SECCIÓN DESPUÉS DEL TIMER */}
                <div>
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Productos a recibir
                  </h3>
                  <div className="space-y-3">
                    {productos.map((producto) => {
                      const faltante = producto.cantidad_ordenada - producto.cantidad_recibida;
                      const requiereCaducidad = producto.producto?.maneja_caducidad;
                      const tieneLotesMultiples = producto.lotesConfig?.dividir_en_lotes;
                      const lotes = lotesInputs[producto.id] || [];
                      const totalLotes = getTotalLotes(producto.id);
                      const cantidadActual = tieneLotesMultiples ? totalLotes : getCantidadNumerica(producto.id);
                      const faltaFechaCaducidad = requiereCaducidad && cantidadActual > 0 && !tieneLotesMultiples && !fechasCaducidad[producto.id];
                      const faltaFotoCaducidad = requiereCaducidad && cantidadActual > 0 && !tieneLotesMultiples && !fotosCaducidad[producto.id];
                      const tieneDiferencia = cantidadActual < faltante;
                      const tieneExcedente = cantidadActual > faltante;
                      const excedenteConfirmado = excedentesConfirmados[producto.id];
                      const creditoParaProducto = tieneExcedente ? getCreditoParaProducto(producto.producto_id) : undefined;
                      const faltaRazonDiferencia = tieneDiferencia && !razonesDiferencia[producto.id];
                      const faltaConfirmarExcedente = tieneExcedente && !excedenteConfirmado;
                      const razonActual = razonesDiferencia[producto.id];
                      const esRazonDevolucion = RAZONES_REQUIEREN_DEVOLUCION.includes(razonActual);
                      
                      return (
                        <Card key={producto.id} className={cn(
                          (faltaFechaCaducidad || faltaFotoCaducidad || faltaRazonDiferencia || faltaConfirmarExcedente) && "border-destructive",
                          tieneExcedente && excedenteConfirmado === 'reposicion' && "border-green-500"
                        )}>
                          <CardContent className="p-3 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-medium truncate">{producto.producto?.nombre}</p>
                                  {requiereCaducidad && (
                                    <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">
                                      <CalendarIcon className="h-3 w-3 mr-1" />
                                      Requiere caducidad
                                    </Badge>
                                  )}
                                  {tieneLotesMultiples && (
                                    <Badge variant="outline" className="text-xs border-primary text-primary">
                                      <Package className="h-3 w-3 mr-1" />
                                      {producto.lotesConfig?.cantidad_lotes} lotes
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  Código: {producto.producto?.codigo}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Esperado: {faltante} unidades
                                </p>
                              </div>
                              
                              {/* Si NO tiene lotes múltiples, mostrar input normal */}
                              {!tieneLotesMultiples && (
                                <div className="w-24">
                                  <Label className="text-xs text-muted-foreground">Recibido</Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    value={cantidadesRecibidas[producto.id] ?? ""}
                                    onChange={(e) => handleCantidadChange(producto.id, e.target.value)}
                                    className="text-center"
                                  />
                                </div>
                              )}
                              
                              {/* Si tiene lotes múltiples, mostrar total calculado */}
                              {tieneLotesMultiples && (
                                <div className="text-right">
                                  <Label className="text-xs text-muted-foreground">Total</Label>
                                  <div className={cn(
                                    "text-lg font-semibold",
                                    totalLotes === faltante ? "text-green-600" : totalLotes > faltante ? "text-destructive" : "text-amber-600"
                                  )}>
                                    {totalLotes.toLocaleString()}
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* UI para múltiples lotes */}
                            {tieneLotesMultiples && (
                              <div className="space-y-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium flex items-center gap-1">
                                    <Package className="h-4 w-4" />
                                    Lotes a registrar
                                  </span>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addLoteInput(producto.id)}
                                    className="h-7 text-xs"
                                  >
                                    + Agregar lote
                                  </Button>
                                </div>
                                
                                <div className="space-y-2">
                                  {lotes.map((lote, index) => (
                                    <div key={lote.id} className="flex items-end gap-2 p-2 bg-background rounded border">
                                      <div className="flex-1 min-w-0">
                                        <Label className="text-xs">Lote #{index + 1}</Label>
                                        <Input
                                          placeholder="Número de lote"
                                          value={lote.numero_lote}
                                          onChange={(e) => handleLoteChange(producto.id, index, "numero_lote", e.target.value)}
                                          className={cn("h-8 text-sm", !lote.numero_lote && lote.cantidad > 0 && "border-destructive")}
                                        />
                                      </div>
                                      <div className="w-20">
                                        <Label className="text-xs">Cantidad</Label>
                                        <Input
                                          type="number"
                                          min={0}
                                          value={lote.cantidad || ""}
                                          onChange={(e) => handleLoteChange(producto.id, index, "cantidad", parseInt(e.target.value) || 0)}
                                          className="h-8 text-sm text-center"
                                        />
                                      </div>
                                      {requiereCaducidad && (
                                        <div className="w-32">
                                          <Label className="text-xs">Caducidad</Label>
                                          <Popover>
                                            <PopoverTrigger asChild>
                                              <Button
                                                variant="outline"
                                                className={cn(
                                                  "h-8 w-full justify-start text-left font-normal text-xs",
                                                  !lote.fecha_caducidad && "text-muted-foreground",
                                                  !lote.fecha_caducidad && lote.cantidad > 0 && "border-destructive"
                                                )}
                                              >
                                                <CalendarIcon className="mr-1 h-3 w-3" />
                                                {lote.fecha_caducidad 
                                                  ? format(new Date(lote.fecha_caducidad), "dd/MM/yy")
                                                  : "Fecha"}
                                              </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0 z-50" align="start">
                                              <Calendar
                                                mode="single"
                                                selected={lote.fecha_caducidad ? new Date(lote.fecha_caducidad) : undefined}
                                                onSelect={(date) => handleLoteChange(producto.id, index, "fecha_caducidad", date ? format(date, "yyyy-MM-dd") : "")}
                                                initialFocus
                                                className="pointer-events-auto"
                                                locale={es}
                                              />
                                            </PopoverContent>
                                          </Popover>
                                        </div>
                                      )}
                                      {lotes.length > 1 && (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => removeLoteInput(producto.id, index)}
                                          className="h-8 w-8 p-0 text-destructive"
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                                
                                {/* Resumen de lotes */}
                                <div className={cn(
                                  "text-xs p-2 rounded",
                                  totalLotes === faltante 
                                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" 
                                    : totalLotes > faltante
                                    ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                                    : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                                )}>
                                  <span className="font-medium">
                                    {lotes.filter(l => l.cantidad > 0).length} lotes = {totalLotes.toLocaleString()} unidades
                                  </span>
                                  {totalLotes !== faltante && (
                                    <span> (esperado: {faltante.toLocaleString()})</span>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* Razón de diferencia */}
                            {tieneDiferencia && (
                              <div className="space-y-2 p-2 bg-amber-50 dark:bg-amber-950/20 rounded-md border border-amber-200 dark:border-amber-800">
                                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm font-medium">
                                  <AlertTriangle className="w-4 h-4" />
                                  Diferencia de {faltante - cantidadActual} unidades
                                </div>
                                <Select 
                                  value={razonesDiferencia[producto.id] || ""} 
                                  onValueChange={(v) => handleRazonDiferenciaChange(producto.id, v)}
                                >
                                  <SelectTrigger className={cn(
                                    "bg-background",
                                    faltaRazonDiferencia && "border-destructive"
                                  )}>
                                    <SelectValue placeholder="Selecciona razón *" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {RAZONES_DIFERENCIA.map(r => (
                                      <SelectItem key={r.value} value={r.value}>
                                        {r.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                
                                {/* Foto obligatoria para producto dañado o rechazado por calidad */}
                                {RAZONES_REQUIEREN_FOTO.includes(razonActual) && (
                                  <div className="space-y-2 p-2 bg-amber-100 dark:bg-amber-950/30 rounded border border-amber-300 dark:border-amber-700">
                                    <Label className="text-sm text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1">
                                      <Camera className="w-4 h-4" />
                                      {razonActual === "roto" ? "Foto del producto dañado *" : "Foto del producto rechazado *"}
                                    </Label>
                                    {fotosDiferencia[producto.id] ? (
                                      <div className="flex items-center gap-2">
                                        <img 
                                          src={fotosDiferencia[producto.id]!.preview} 
                                          alt="Producto dañado"
                                          className="h-14 w-20 object-cover rounded border"
                                        />
                                        <span className="text-xs text-muted-foreground flex-1">Foto capturada</span>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleRemoveFotoDiferencia(producto.id)}
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <EvidenciaCapture
                                        tipo="producto_danado"
                                        onCapture={(file, preview) => handleFotoDiferenciaCapture(producto.id, file, preview)}
                                        className="border-amber-400"
                                      />
                                    )}
                                  </div>
                                )}
                                
                                {esRazonDevolucion && (
                                  <div className="flex items-center gap-2 p-2 bg-amber-100 dark:bg-amber-950/30 rounded border border-amber-300 dark:border-amber-700">
                                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                    <span className="text-sm text-amber-700 dark:text-amber-400">
                                      Los {faltante - getCantidadNumerica(producto.id)} bultos serán devueltos al chofer
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* ========== SECCIÓN DE EXCEDENTE (llegó MÁS de lo esperado) ========== */}
                            {tieneExcedente && (
                              <div className={cn(
                                "space-y-2 p-3 rounded-md border",
                                excedenteConfirmado === 'reposicion' 
                                  ? "bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-800"
                                  : excedenteConfirmado === 'aceptar'
                                  ? "bg-blue-50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-800"
                                  : "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
                              )}>
                                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 text-sm font-medium">
                                  <Package className="w-4 h-4" />
                                  Excedente de {cantidadActual - faltante} unidades
                                </div>
                                
                                {/* Si ya se confirmó */}
                                {excedenteConfirmado && (
                                  <div className={cn(
                                    "p-2 rounded text-sm",
                                    excedenteConfirmado === 'reposicion' && "bg-green-100 dark:bg-green-900/30",
                                    excedenteConfirmado === 'aceptar' && "bg-blue-100 dark:bg-blue-900/30"
                                  )}>
                                    {excedenteConfirmado === 'reposicion' && (
                                      <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span className="font-medium">✓ Confirmado como reposición</span>
                                      </div>
                                    )}
                                    {excedenteConfirmado === 'aceptar' && (
                                      <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span className="font-medium">✓ Excedente aceptado - se pagará</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                {/* Si no se ha confirmado, mostrar opciones */}
                                {!excedenteConfirmado && (
                                  <>
                                    {/* Hay crédito de reposición pendiente */}
                                    {creditoParaProducto ? (
                                      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded text-sm">
                                        <p className="text-green-700 dark:text-green-400 font-medium">
                                          ✓ Posible reposición de faltante anterior
                                        </p>
                                        <p className="text-green-600 dark:text-green-500 text-xs mt-1">
                                          De <span className="font-mono">{creditoParaProducto.oc_origen_folio}</span>: {creditoParaProducto.cantidad} bulto(s) 
                                          {creditoParaProducto.motivo && ` (${creditoParaProducto.motivo})`}
                                        </p>
                                        <p className="text-green-600 dark:text-green-500 text-xs">
                                          Valor: {formatCurrency(creditoParaProducto.monto_total)}
                                        </p>
                                        <div className="flex gap-2 mt-2">
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="border-green-500 text-green-700 hover:bg-green-100"
                                            onClick={() => handleConfirmarReposicion(producto, creditoParaProducto)}
                                          >
                                            <CheckCircle2 className="w-3 h-3 mr-1" />
                                            Confirmar como reposición
                                          </Button>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="text-muted-foreground"
                                            onClick={() => handleAceptarExcedenteYPagar(producto.id, cantidadActual)}
                                          >
                                            No, es otra cosa
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      /* NO hay crédito pendiente - el proveedor puede estar equivocado */
                                      <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded text-sm">
                                        <div className="flex items-start gap-2">
                                          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                          <div>
                                            <p className="text-amber-700 dark:text-amber-400 font-medium">
                                              ⚠️ Sin crédito pendiente registrado
                                            </p>
                                            <p className="text-amber-600 dark:text-amber-500 text-xs mt-1">
                                              El proveedor envió {cantidadActual - faltante} extra pero no hay faltante previo registrado en el sistema.
                                              Si aceptas, se pagarán <strong>{cantidadActual}</strong> unidades en vez de {faltante}.
                                            </p>
                                          </div>
                                        </div>
                                        <div className="flex gap-2 mt-3">
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="border-green-500 text-green-700 hover:bg-green-100"
                                            onClick={() => handleAceptarExcedenteYPagar(producto.id, cantidadActual)}
                                          >
                                            <CheckCircle2 className="w-3 h-3 mr-1" />
                                            Aceptar y pagar extra
                                          </Button>
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="border-amber-500 text-amber-700 hover:bg-amber-100"
                                            onClick={() => handleRechazarExcedente(producto.id, faltante)}
                                          >
                                            Solo recibir {faltante}
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            )}
                            
                            {/* Fecha de caducidad */}
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      className={cn(
                                        "flex-1 justify-start text-left font-normal",
                                        !fechasCaducidad[producto.id] && "text-muted-foreground",
                                        faltaFechaCaducidad && "border-destructive"
                                      )}
                                    >
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {fechasCaducidad[producto.id] 
                                        ? format(new Date(fechasCaducidad[producto.id]), "PPP", { locale: es })
                                        : requiereCaducidad ? "Fecha caducidad *" : "Fecha caducidad (opcional)"}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0 z-50" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={fechasCaducidad[producto.id] ? new Date(fechasCaducidad[producto.id]) : undefined}
                                      onSelect={(date) => handleFechaCaducidadChange(producto.id, date ? format(date, "yyyy-MM-dd") : "")}
                                      initialFocus
                                      className="pointer-events-auto"
                                      locale={es}
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>
                              {faltaFechaCaducidad && (
                                <span className="text-xs text-destructive">* Fecha requerida</span>
                              )}
                            </div>
                            
                            {/* Foto de caducidad */}
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                {fotosCaducidad[producto.id] ? (
                                  <div className="relative flex items-center gap-2">
                                    <img 
                                      src={fotosCaducidad[producto.id]!.preview} 
                                      alt="Foto caducidad" 
                                      className="h-12 w-16 object-cover rounded border"
                                    />
                                    <span className="text-xs text-muted-foreground">Foto caducidad</span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveFotoCaducidad(producto.id)}
                                      className="p-1 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <EvidenciaCapture
                                    tipo="caducidad"
                                    onCapture={(file, preview) => handleFotoCaducidadCapture(producto.id, file, preview)}
                                    className={cn(faltaFotoCaducidad && "border-destructive")}
                                  />
                                )}
                              </div>
                              {faltaFotoCaducidad && (
                                <span className="text-xs text-destructive">* Foto requerida</span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                {/* Bodega destino - con auto-detección GPS */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Warehouse className="w-4 h-4" />
                    Bodega destino *
                  </Label>
                  
                  {/* Estado de detección */}
                  {detectandoBodega ? (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">Detectando ubicación...</span>
                    </div>
                  ) : bodegaDetectada && !mostrarSelectorBodega ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                        <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <div className="flex-1">
                          <span className="font-medium text-green-700 dark:text-green-300">
                            {bodegaDetectada.nombre}
                          </span>
                          <span className="text-xs text-green-600 dark:text-green-400 ml-2">
                            {metodoDeteccion === 'wifi' ? (
                              <>
                                <Wifi className="w-3 h-3 inline mr-1" />
                                Detectado por WiFi
                              </>
                            ) : (
                              <>
                                <MapPin className="w-3 h-3 inline mr-1" />
                                Detectado por GPS ({distanciaMetros}m)
                              </>
                            )}
                          </span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setMostrarSelectorBodega(true)}
                          className="text-xs"
                        >
                          Cambiar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {errorDeteccion && !mostrarSelectorBodega && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          <span className="text-sm text-amber-700 dark:text-amber-300 flex-1">
                            {errorDeteccion}
                          </span>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={reintentarDeteccion}
                            className="text-xs"
                          >
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Reintentar
                          </Button>
                        </div>
                      )}
                      <Select value={bodegaSeleccionada} onValueChange={setBodegaSeleccionada}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona bodega manualmente" />
                        </SelectTrigger>
                        <SelectContent>
                          {bodegas.map(bodega => (
                            <SelectItem key={bodega.id} value={bodega.id}>
                              {bodega.nombre} {bodega.es_externa && "(Externa)"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {mostrarSelectorBodega && (
                        <Button 
                          variant="link" 
                          size="sm" 
                          onClick={() => {
                            setMostrarSelectorBodega(false);
                            if (bodegaDetectada) {
                              setBodegaSeleccionada(bodegaDetectada.id);
                            }
                          }}
                          className="text-xs p-0 h-auto"
                        >
                          ← Usar bodega detectada
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Documento del Proveedor */}
                <div className="space-y-3 p-4 border rounded-lg bg-blue-50/50 dark:bg-blue-950/20">
                  <h3 className="font-medium flex items-center gap-2 text-blue-700 dark:text-blue-400">
                    <Receipt className="w-4 h-4" />
                    Documento del Proveedor
                  </h3>
                  
                  <div className="space-y-2">
                    <Label>Número de remisión *</Label>
                    <Input
                      value={numeroRemisionProveedor}
                      onChange={(e) => setNumeroRemisionProveedor(e.target.value)}
                      placeholder="Ej: REM-12345"
                      className={cn(!numeroRemisionProveedor && "border-destructive")}
                    />
                    {!numeroRemisionProveedor && (
                      <span className="text-xs text-destructive">* Campo obligatorio</span>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Foto del documento *</Label>
                    {fotoRemisionProveedor ? (
                      <div className="flex items-center gap-3">
                        <img 
                          src={fotoRemisionProveedor.preview} 
                          alt="Remisión proveedor" 
                          className="h-16 w-20 object-cover rounded border"
                        />
                        <span className="text-sm text-muted-foreground flex-1">Documento capturado</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            URL.revokeObjectURL(fotoRemisionProveedor.preview);
                            setFotoRemisionProveedor(null);
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <EvidenciaCapture
                          tipo="documento"
                          onCapture={(file, preview) => setFotoRemisionProveedor({ file, preview })}
                          className={cn(!fotoRemisionProveedor && "border-destructive")}
                        />
                        {!fotoRemisionProveedor && (
                          <span className="text-xs text-destructive">* Foto obligatoria</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Foto de Caja Vacía - Solo si descarga completa */}
                {esDescargaCompleta() && (
                  <div className="space-y-3 p-4 border rounded-lg bg-green-50/50 dark:bg-green-950/20">
                    <h3 className="font-medium flex items-center gap-2 text-green-700 dark:text-green-400">
                      <PackageOpen className="w-4 h-4" />
                      Evidencia de Descarga Completa
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Captura foto de la caja vacía del camión para confirmar el vaciado total.
                    </p>
                    
                    {fotoCajaVacia ? (
                      <div className="flex items-center gap-3">
                        <img 
                          src={fotoCajaVacia.preview} 
                          alt="Caja vacía" 
                          className="h-16 w-20 object-cover rounded border"
                        />
                        <span className="text-sm text-muted-foreground flex-1">Caja vacía verificada</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            URL.revokeObjectURL(fotoCajaVacia.preview);
                            setFotoCajaVacia(null);
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <EvidenciaCapture
                          tipo="caja_vacia"
                          onCapture={(file, preview) => setFotoCajaVacia({ file, preview })}
                          className={cn(!fotoCajaVacia && "border-destructive")}
                        />
                        {!fotoCajaVacia && (
                          <span className="text-xs text-destructive">* Foto obligatoria para descarga completa</span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Notas adicionales */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Notas adicionales
                  </Label>
                  <Textarea
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    placeholder="Observaciones de la recepción"
                    rows={2}
                  />
                </div>

                {/* Indicador de firmas requeridas */}
                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                    <PenLine className="w-5 h-5" />
                    <span className="font-medium">Firmas de conformidad requeridas</span>
                  </div>
                  <p className="text-sm text-blue-600 dark:text-blue-500 mt-1">
                    El chofer del proveedor y el almacenista firmarán confirmando la recepción.
                  </p>
                </div>

                {/* Indicador adicional si hay diferencias */}
                {hayDiferencias && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                      <AlertTriangle className="w-5 h-5" />
                      <span className="font-medium">Hay diferencias en la entrega</span>
                    </div>
                    <p className="text-sm text-amber-600 dark:text-amber-500 mt-1">
                      Hay {totalDiferencias} unidades de diferencia. El chofer firmará confirmando que entregó menos de lo ordenado.
                    </p>
                  </div>
                )}

                {/* Botón guardar */}
                <Button
                  onClick={handleConfirmarRecepcion}
                  disabled={saving}
                  className="w-full h-14 text-lg"
                  size="lg"
                >
                  {saving ? (
                    "Guardando..."
                  ) : (
                    <>
                      <PenLine className="w-5 h-5 mr-2" />
                      Continuar a firmas
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Diálogo de firma para diferencias */}
      <FirmaDigitalDialog
        open={showFirmaDialog}
        onOpenChange={setShowFirmaDialog}
        onConfirm={handleFirmaConfirmada}
        titulo={`Firma de ${entrega.nombre_chofer_proveedor || "transportista"} - Confirma que entregó ${totalDiferencias} unidades menos de lo ordenado`}
        loading={saving}
      />

      {/* Diálogo de devolución de mercancía dañada */}
      <DevolucionProveedorDialog
        open={showDevolucionDialog}
        onOpenChange={setShowDevolucionDialog}
        ordenCompraId={entrega.orden_compra?.id}
        ordenCompraFolio={entrega.orden_compra?.folio}
        entregaId={entrega.id}
        productosDevolucion={getProductosParaDevolucion()}
        nombreChofer={entrega.nombre_chofer_proveedor || ""}
        onDevolucionCompletada={handleDevolucionCompletada}
      />

      {/* Diálogo de firma de conformidad del chofer */}
      <FirmaDigitalDialog
        open={showFirmaChoferConformidadDialog}
        onOpenChange={setShowFirmaChoferConformidadDialog}
        onConfirm={handleFirmaChoferConformidadConfirmada}
        titulo={`Firma de conformidad - ${entrega.nombre_chofer_proveedor || "Chofer del proveedor"}`}
        loading={saving}
      />

      {/* Diálogo de firma del almacenista */}
      <FirmaDigitalDialog
        open={showFirmaAlmacenistaDialog}
        onOpenChange={setShowFirmaAlmacenistaDialog}
        onConfirm={handleFirmaAlmacenistaConfirmada}
        titulo="Firma del almacenista - Confirmo haber recibido la mercancía"
        loading={saving}
      />

      {/* Diálogo para ver fotos de llegada */}
      <Dialog open={showFotosLlegadaDialog} onOpenChange={setShowFotosLlegadaDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Fotos de llegada (Fase 1)
            </DialogTitle>
          </DialogHeader>
          
          {loadingFotos ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full rounded-lg" />)}
            </div>
          ) : fotosLlegada.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No hay fotos de llegada registradas
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {fotosLlegada.map((foto) => (
                <div key={foto.id} className="space-y-1">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-lg border bg-muted">
                    {foto.url ? (
                      <img
                        src={foto.url}
                        alt={foto.tipo_evidencia}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        <Camera className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-center text-muted-foreground capitalize">
                    {foto.tipo_evidencia.replace(/_/g, " ")}
                  </p>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => setShowFotosLlegadaDialog(false)}>
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
