import { useState, useEffect } from "react";
import { format, differenceInMinutes } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
import { ScrollArea } from "@/components/ui/scroll-area";
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
} from "lucide-react";
import { EvidenciaCapture, EvidenciasPreviewGrid } from "@/components/compras/EvidenciaCapture";
import { FirmaDigitalDialog } from "./FirmaDigitalDialog";
import { DevolucionProveedorDialog } from "./DevolucionProveedorDialog";

// Razones de diferencia para cuando la cantidad recibida no coincide con la ordenada
const RAZONES_DIFERENCIA = [
  { value: "roto", label: "Producto roto/dañado" },
  { value: "no_llego", label: "No llegó completo" },
  { value: "error_cantidad", label: "Error del proveedor" },
  { value: "rechazado_calidad", label: "Rechazado por calidad" },
  { value: "otro", label: "Otro" },
];

// Razones que requieren devolución física al chofer
const RAZONES_REQUIEREN_DEVOLUCION = ["roto", "rechazado_calidad"];

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
  orden_compra: {
    id: string;
    folio: string;
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
  const [cantidadesRecibidas, setCantidadesRecibidas] = useState<Record<string, number>>({});
  const [fechasCaducidad, setFechasCaducidad] = useState<Record<string, string>>({});
  const [razonesDiferencia, setRazonesDiferencia] = useState<Record<string, string>>({});
  const [notasDiferencia, setNotasDiferencia] = useState<Record<string, string>>({});
  const [devolucionAlChofer, setDevolucionAlChofer] = useState<Record<string, boolean>>({});
  const [evidencias, setEvidencias] = useState<Evidencia[]>([]);
  const [fotosCaducidad, setFotosCaducidad] = useState<Record<string, { file: File; preview: string } | null>>({});
  const [notas, setNotas] = useState("");
  const [bodegas, setBodegas] = useState<Bodega[]>([]);
  const [bodegaSeleccionada, setBodegaSeleccionada] = useState<string>("");
  
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
      const bodega1 = data.find(b => b.nombre === "Bodega 1");
      if (bodega1) setBodegaSeleccionada(bodega1.id);
    }
  };

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

      const productosData = (data as any[]) || [];
      setProductos(productosData);
      
      const cantidades: Record<string, number> = {};
      const fechas: Record<string, string> = {};
      productosData.forEach(p => {
        const faltante = p.cantidad_ordenada - p.cantidad_recibida;
        cantidades[p.id] = Math.max(0, faltante);
        fechas[p.id] = "";
      });
      setCantidadesRecibidas(cantidades);
      setFechasCaducidad(fechas);
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

  const handleCantidadChange = (detalleId: string, cantidad: number) => {
    setCantidadesRecibidas(prev => ({ ...prev, [detalleId]: cantidad }));
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

  const handleDevolucionChange = (detalleId: string, checked: boolean) => {
    setDevolucionAlChofer(prev => ({ ...prev, [detalleId]: checked }));
  };

  const getProductosConDiferencia = () => {
    return productos.filter(p => {
      const faltante = p.cantidad_ordenada - p.cantidad_recibida;
      const recibiendo = cantidadesRecibidas[p.id] || 0;
      return recibiendo < faltante;
    });
  };

  const getProductosParaDevolucion = () => {
    return productos.filter(p => {
      const faltante = p.cantidad_ordenada - p.cantidad_recibida;
      const recibiendo = cantidadesRecibidas[p.id] || 0;
      const razon = razonesDiferencia[p.id];
      return recibiendo < faltante && 
             RAZONES_REQUIEREN_DEVOLUCION.includes(razon) && 
             devolucionAlChofer[p.id];
    }).map(p => {
      const faltante = p.cantidad_ordenada - p.cantidad_recibida;
      const recibiendo = cantidadesRecibidas[p.id] || 0;
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
      const recibiendo = cantidadesRecibidas[p.id] || 0;
      return recibiendo >= faltante;
    });
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

    const productosConCaducidad = productos.filter(p => 
      p.producto?.maneja_caducidad && (cantidadesRecibidas[p.id] || 0) > 0
    );
    
    const faltaFecha = productosConCaducidad.find(p => !fechasCaducidad[p.id]);
    if (faltaFecha) {
      toast({
        title: "Fecha obligatoria",
        description: `El producto "${faltaFecha.producto?.nombre}" requiere fecha de caducidad`,
        variant: "destructive"
      });
      return false;
    }
    
    const faltaFoto = productosConCaducidad.find(p => !fotosCaducidad[p.id]);
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

      for (const [detalleId, cantidad] of Object.entries(cantidadesRecibidas)) {
        const producto = productos.find(p => p.id === detalleId);
        if (producto) {
          const nuevaCantidadRecibida = producto.cantidad_recibida + cantidad;
          const updateData: any = { cantidad_recibida: nuevaCantidadRecibida };
          
          const faltante = producto.cantidad_ordenada - producto.cantidad_recibida;
          if (cantidad < faltante && razonesDiferencia[detalleId]) {
            updateData.razon_diferencia = razonesDiferencia[detalleId];
            updateData.notas_diferencia = notasDiferencia[detalleId] || null;
          }
          
          await supabase
            .from("ordenes_compra_detalles")
            .update(updateData)
            .eq("id", detalleId);

          if (cantidad > 0) {
            const { data: detalleConPrecio } = await supabase
              .from("ordenes_compra_detalles")
              .select("precio_unitario_compra")
              .eq("id", detalleId)
              .single();
            
            const precioCompra = detalleConPrecio?.precio_unitario_compra || 0;

            const fechaCaducidad = fechasCaducidad[detalleId] || null;
            const { error: loteError } = await supabase
              .from("inventario_lotes")
              .insert({
                producto_id: producto.producto_id,
                cantidad_disponible: cantidad,
                precio_compra: precioCompra,
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

            const { data: productoActual } = await supabase
              .from("productos")
              .select("stock_actual")
              .eq("id", producto.producto_id)
              .single();

            const nuevoStock = (productoActual?.stock_actual || 0) + cantidad;
            await supabase
              .from("productos")
              .update({ stock_actual: nuevoStock })
              .eq("id", producto.producto_id);
          }
        }
      }

      // Actualizar status de la entrega con TODOS los nuevos campos
      const updateEntrega: any = {
        status: "recibida",
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
    const recibiendo = cantidadesRecibidas[p.id] || 0;
    return sum + (faltante - recibiendo);
  }, 0);

  return (
    <>
      <Sheet open={open && !showFirmaDialog && !showDevolucionDialog && !showFirmaChoferConformidadDialog && !showFirmaAlmacenistaDialog} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-xl">
          <SheetHeader>
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

          <ScrollArea className="h-[calc(100vh-180px)] mt-4 pr-4">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
              </div>
            ) : (
              <div className="space-y-6">
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
                      const cantidadActual = cantidadesRecibidas[producto.id] || 0;
                      const faltaFechaCaducidad = requiereCaducidad && cantidadActual > 0 && !fechasCaducidad[producto.id];
                      const faltaFotoCaducidad = requiereCaducidad && cantidadActual > 0 && !fotosCaducidad[producto.id];
                      const tieneDiferencia = cantidadActual < faltante;
                      const faltaRazonDiferencia = tieneDiferencia && !razonesDiferencia[producto.id];
                      const razonActual = razonesDiferencia[producto.id];
                      const esRazonDevolucion = RAZONES_REQUIEREN_DEVOLUCION.includes(razonActual);
                      
                      return (
                        <Card key={producto.id} className={cn(
                          (faltaFechaCaducidad || faltaFotoCaducidad || faltaRazonDiferencia) && "border-destructive"
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
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  Código: {producto.producto?.codigo}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Esperado: {faltante} unidades
                                </p>
                              </div>
                              <div className="w-24">
                                <Label className="text-xs text-muted-foreground">Recibido</Label>
                                <Input
                                  type="number"
                                  min={0}
                                  max={faltante}
                                  value={cantidadesRecibidas[producto.id] || 0}
                                  onChange={(e) => handleCantidadChange(producto.id, Number(e.target.value))}
                                  className="text-center"
                                />
                              </div>
                            </div>
                            
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
                                
                                {razonActual === "otro" && (
                                  <Input
                                    placeholder="Describe la razón..."
                                    value={notasDiferencia[producto.id] || ""}
                                    onChange={(e) => handleNotaDiferenciaChange(producto.id, e.target.value)}
                                    className="bg-background"
                                  />
                                )}
                                
                                {esRazonDevolucion && (
                                  <div className="flex items-center space-x-2 p-2 bg-destructive/10 rounded border border-destructive/20">
                                    <Checkbox
                                      id={`devolucion-${producto.id}`}
                                      checked={devolucionAlChofer[producto.id] || false}
                                      onCheckedChange={(checked) => handleDevolucionChange(producto.id, !!checked)}
                                    />
                                    <label 
                                      htmlFor={`devolucion-${producto.id}`}
                                      className="text-sm font-medium leading-none"
                                    >
                                      Los {faltante - cantidadActual} bultos se devuelven al chofer
                                    </label>
                                  </div>
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

                {/* Bodega destino */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Warehouse className="w-4 h-4" />
                    Bodega destino *
                  </Label>
                  <Select value={bodegaSeleccionada} onValueChange={setBodegaSeleccionada}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona bodega" />
                    </SelectTrigger>
                    <SelectContent>
                      {bodegas.map(bodega => (
                        <SelectItem key={bodega.id} value={bodega.id}>
                          {bodega.nombre} {bodega.es_externa && "(Externa)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

                {/* Evidencias fotográficas (solo las necesarias en Fase 2) */}
                {hayDiferencias && (
                  <div className="space-y-4">
                    <h3 className="font-medium flex items-center gap-2">
                      <Camera className="w-4 h-4" />
                      Fotos de evidencia (diferencias)
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <EvidenciaCapture
                        tipo="producto_danado"
                        onCapture={(file) => handleEvidenciaCapture("producto_danado", file)}
                      />
                      <EvidenciaCapture
                        tipo="documento"
                        onCapture={(file) => handleEvidenciaCapture("documento", file)}
                      />
                    </div>

                    {evidencias.length > 0 && (
                      <EvidenciasPreviewGrid
                        evidencias={evidencias.map((e) => ({
                          tipo: e.tipo as any,
                          file: e.file,
                          preview: e.preview
                        }))}
                        onRemove={handleRemoveEvidencia}
                      />
                    )}
                  </div>
                )}

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
          </ScrollArea>
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
