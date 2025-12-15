import { useState, useEffect } from "react";
import { format } from "date-fns";
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
  User,
  FileText,
  Truck,
  Hash,
  Warehouse,
  CalendarIcon,
  X,
  AlertTriangle,
  PenLine,
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
  const [nombreEntrega, setNombreEntrega] = useState("");
  const [numeroSello, setNumeroSello] = useState("");
  const [notas, setNotas] = useState("");
  const [bodegas, setBodegas] = useState<Bodega[]>([]);
  const [bodegaSeleccionada, setBodegaSeleccionada] = useState<string>("");
  
  // Estados para firma y devolución
  const [showFirmaDialog, setShowFirmaDialog] = useState(false);
  const [showDevolucionDialog, setShowDevolucionDialog] = useState(false);
  const [firmaChoferDiferencia, setFirmaChoferDiferencia] = useState<string | null>(null);
  
  const { toast } = useToast();

  useEffect(() => {
    if (open && entrega) {
      loadProductos();
      loadBodegas();
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
      // Seleccionar Bodega 1 por defecto
      const bodega1 = data.find(b => b.nombre === "Bodega 1");
      if (bodega1) setBodegaSeleccionada(bodega1.id);
    }
  };

  const loadProductos = async () => {
    setLoading(true);
    try {
      // NOTA: NO consultamos precio_unitario_compra aquí
      // Los almacenistas no deben ver precios - se consulta solo al guardar
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
      
      // Inicializar cantidades con lo que falta por recibir
      const cantidades: Record<string, number> = {};
      const fechas: Record<string, string> = {};
      productosData.forEach(p => {
        const faltante = p.cantidad_ordenada - p.cantidad_recibida;
        cantidades[p.id] = Math.max(0, faltante);
        fechas[p.id] = ""; // Sin fecha de caducidad por defecto
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
    setCantidadesRecibidas(prev => ({
      ...prev,
      [detalleId]: cantidad
    }));
  };

  const handleFechaCaducidadChange = (detalleId: string, fecha: string) => {
    setFechasCaducidad(prev => ({
      ...prev,
      [detalleId]: fecha
    }));
  };

  const handleRazonDiferenciaChange = (detalleId: string, razon: string) => {
    setRazonesDiferencia(prev => ({
      ...prev,
      [detalleId]: razon
    }));
  };

  const handleNotaDiferenciaChange = (detalleId: string, nota: string) => {
    setNotasDiferencia(prev => ({
      ...prev,
      [detalleId]: nota
    }));
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
    setFotosCaducidad(prev => ({
      ...prev,
      [productoId]: { file, preview }
    }));
  };

  const handleRemoveFotoCaducidad = (productoId: string) => {
    setFotosCaducidad(prev => {
      if (prev[productoId]) {
        URL.revokeObjectURL(prev[productoId]!.preview);
      }
      return { ...prev, [productoId]: null };
    });
  };

  const handleDevolucionChange = (detalleId: string, checked: boolean) => {
    setDevolucionAlChofer(prev => ({
      ...prev,
      [detalleId]: checked
    }));
  };

  // Calcular productos con diferencia
  const getProductosConDiferencia = () => {
    return productos.filter(p => {
      const faltante = p.cantidad_ordenada - p.cantidad_recibida;
      const recibiendo = cantidadesRecibidas[p.id] || 0;
      return recibiendo < faltante;
    });
  };

  // Calcular productos para devolución física
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

  // Validar antes de guardar
  const validarRecepcion = (): boolean => {
    if (!nombreEntrega.trim()) {
      toast({
        title: "Datos incompletos",
        description: "Ingresa el nombre de quien entrega",
        variant: "destructive"
      });
      return false;
    }

    if (!bodegaSeleccionada) {
      toast({
        title: "Datos incompletos",
        description: "Selecciona la bodega de destino",
        variant: "destructive"
      });
      return false;
    }

    // Validar productos que requieren caducidad
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

    // Validar que productos con diferencia tengan razón
    const productosConDiferencia = getProductosConDiferencia();
    const faltaRazon = productosConDiferencia.find(p => !razonesDiferencia[p.id]);
    if (faltaRazon) {
      const faltante = faltaRazon.cantidad_ordenada - faltaRazon.cantidad_recibida;
      const recibiendo = cantidadesRecibidas[faltaRazon.id] || 0;
      toast({
        title: "Razón de diferencia requerida",
        description: `Indica por qué "${faltaRazon.producto?.nombre}" tiene diferencia (esperado: ${faltante}, recibido: ${recibiendo})`,
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  // Manejar clic en confirmar recepción
  const handleConfirmarRecepcion = () => {
    if (!validarRecepcion()) return;

    const productosConDiferencia = getProductosConDiferencia();
    const productosParaDevolucion = getProductosParaDevolucion();

    // Si hay productos para devolver físicamente, abrir ese diálogo primero
    if (productosParaDevolucion.length > 0) {
      setShowDevolucionDialog(true);
      return;
    }

    // Si hay diferencias pero no devolución física, pedir firma del chofer
    if (productosConDiferencia.length > 0 && !firmaChoferDiferencia) {
      setShowFirmaDialog(true);
      return;
    }

    // Si no hay diferencias o ya tenemos firma, guardar
    handleGuardarRecepcion();
  };

  // Cuando se completa la firma del chofer
  const handleFirmaConfirmada = (firmaBase64: string) => {
    setFirmaChoferDiferencia(firmaBase64);
    setShowFirmaDialog(false);
    // Proceder a guardar con la firma
    handleGuardarRecepcionConFirma(firmaBase64);
  };

  // Cuando se completa la devolución
  const handleDevolucionCompletada = () => {
    setShowDevolucionDialog(false);
    // Después de registrar devolución, continuar con la recepción normal
    // Las cantidades ya se ajustaron, proceder a pedir firma si hay más diferencias
    const productosConDiferencia = getProductosConDiferencia();
    if (productosConDiferencia.length > 0 && !firmaChoferDiferencia) {
      setShowFirmaDialog(true);
    } else {
      handleGuardarRecepcion();
    }
  };

  const handleGuardarRecepcion = () => {
    handleGuardarRecepcionConFirma(firmaChoferDiferencia);
  };

  const handleGuardarRecepcionConFirma = async (firma: string | null) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      const loteReferencia = `REC-${entrega.orden_compra.folio}-${entrega.numero_entrega}`;
      const proveedorNombre = entrega.orden_compra?.proveedor?.nombre || 
                              entrega.orden_compra?.proveedor_nombre_manual || 
                              'proveedor';

      // 0. Registrar participación - inicio de recepción
      await supabase.from("recepciones_participantes").insert({
        entrega_id: entrega.id,
        user_id: user.id,
        accion: "inicio_recepcion",
        notas: `Inició completar recepción`
      });

      // 1. Actualizar cantidades recibidas y crear lotes en inventario
      for (const [detalleId, cantidad] of Object.entries(cantidadesRecibidas)) {
        const producto = productos.find(p => p.id === detalleId);
        if (producto) {
          // Actualizar cantidad recibida y razón de diferencia
          const nuevaCantidadRecibida = producto.cantidad_recibida + cantidad;
          const updateData: any = { cantidad_recibida: nuevaCantidadRecibida };
          
          // Si hay diferencia, guardar razón y notas
          const faltante = producto.cantidad_ordenada - producto.cantidad_recibida;
          if (cantidad < faltante && razonesDiferencia[detalleId]) {
            updateData.razon_diferencia = razonesDiferencia[detalleId];
            updateData.notas_diferencia = notasDiferencia[detalleId] || null;
          }
          
          await supabase
            .from("ordenes_compra_detalles")
            .update(updateData)
            .eq("id", detalleId);

          // Solo crear lote si cantidad > 0
          if (cantidad > 0) {
            // CONSULTAR PRECIO SOLO AL MOMENTO DE GUARDAR
            const { data: detalleConPrecio } = await supabase
              .from("ordenes_compra_detalles")
              .select("precio_unitario_compra")
              .eq("id", detalleId)
              .single();
            
            const precioCompra = detalleConPrecio?.precio_unitario_compra || 0;

            // CREAR LOTE EN INVENTARIO
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
                notas: `Recibido de ${proveedorNombre} por ${nombreEntrega}`
              });

            if (loteError) {
              console.error("Error creando lote:", loteError);
              throw loteError;
            }

            // ACTUALIZAR STOCK DEL PRODUCTO
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

      // 2. Actualizar status de la entrega (incluir firma si hay diferencias)
      const updateEntrega: any = {
        status: "recibida",
        fecha_entrega_real: new Date().toISOString().split("T")[0],
        recibido_por: user.id,
        notas: `Recibido por: ${nombreEntrega}${numeroSello ? `. Sello: ${numeroSello}` : ""}${notas ? `. ${notas}` : ""}`,
        trabajando_por: null,
        trabajando_desde: null,
      };

      // Guardar firma del chofer si hay diferencias
      if (firma) {
        updateEntrega.firma_chofer_diferencia = firma;
        updateEntrega.firma_chofer_diferencia_fecha = new Date().toISOString();
      }

      await supabase
        .from("ordenes_compra_entregas")
        .update(updateEntrega)
        .eq("id", entrega.id);

      // 2.5 Registrar participación - fin de recepción
      await supabase.from("recepciones_participantes").insert({
        entrega_id: entrega.id,
        user_id: user.id,
        accion: "fin_recepcion",
        notas: `Completó recepción. Recibido por: ${nombreEntrega}`
      });

      // 3. Subir evidencias y registrar en tabla recepciones_evidencias
      for (const evidencia of evidencias) {
        const fileName = `${entrega.orden_compra.id}/${entrega.id}/${Date.now()}-${evidencia.tipo}.jpg`;
        
        const { error: uploadError } = await supabase.storage
          .from("recepciones-evidencias")
          .upload(fileName, evidencia.file);

        if (uploadError) {
          console.error("Error subiendo evidencia:", uploadError);
        } else {
          await supabase
            .from("recepciones_evidencias")
            .insert({
              orden_compra_id: entrega.orden_compra.id,
              orden_compra_entrega_id: entrega.id,
              tipo_evidencia: evidencia.tipo,
              ruta_storage: fileName,
              nombre_archivo: evidencia.file.name,
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

  // Calcular si hay diferencias para mostrar indicador
  const hayDiferencias = getProductosConDiferencia().length > 0;
  const totalDiferencias = getProductosConDiferencia().reduce((sum, p) => {
    const faltante = p.cantidad_ordenada - p.cantidad_recibida;
    const recibiendo = cantidadesRecibidas[p.id] || 0;
    return sum + (faltante - recibiendo);
  }, 0);

  return (
    <>
      <Sheet open={open && !showFirmaDialog && !showDevolucionDialog} onOpenChange={onOpenChange}>
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
              {entrega.nombre_chofer_proveedor && (
                <Badge variant="secondary">Chofer: {entrega.nombre_chofer_proveedor}</Badge>
              )}
            </div>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-180px)] mt-4 pr-4">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
              </div>
            ) : (
              <div className="space-y-6">
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

                {/* Productos a recibir */}
                <div>
                  <h3 className="font-medium mb-3">Productos a recibir</h3>
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
                                  Ordenado: {producto.cantidad_ordenada} | 
                                  Recibido: {producto.cantidad_recibida} | 
                                  Faltante: {faltante}
                                </p>
                              </div>
                              <div className="w-24">
                                <Label className="text-xs text-muted-foreground">Cantidad</Label>
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
                                
                                {/* Checkbox para devolución física si es producto dañado */}
                                {esRazonDevolucion && (
                                  <div className="flex items-center space-x-2 p-2 bg-destructive/10 rounded border border-destructive/20">
                                    <Checkbox
                                      id={`devolucion-${producto.id}`}
                                      checked={devolucionAlChofer[producto.id] || false}
                                      onCheckedChange={(checked) => handleDevolucionChange(producto.id, !!checked)}
                                    />
                                    <label 
                                      htmlFor={`devolucion-${producto.id}`}
                                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                      Los {faltante - cantidadActual} bultos se devuelven al chofer
                                    </label>
                                  </div>
                                )}
                                
                                {faltaRazonDiferencia && (
                                  <span className="text-xs text-destructive">* Indica la razón de la diferencia</span>
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

                {/* Datos de control */}
                <div className="space-y-4">
                  <h3 className="font-medium">Datos de control</h3>
                  
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Nombre de quien entrega *
                    </Label>
                    <Input
                      value={nombreEntrega}
                      onChange={(e) => setNombreEntrega(e.target.value)}
                      placeholder="Nombre del transportista o representante"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Hash className="w-4 h-4" />
                      Número de sello
                    </Label>
                    <Input
                      value={numeroSello}
                      onChange={(e) => setNumeroSello(e.target.value)}
                      placeholder="Número del sello de seguridad"
                    />
                  </div>

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
                </div>

                {/* Evidencias fotográficas */}
                <div className="space-y-4">
                  <h3 className="font-medium flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    Evidencias fotográficas
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <EvidenciaCapture
                      tipo="sello"
                      onCapture={(file) => handleEvidenciaCapture("sello", file)}
                    />
                    <EvidenciaCapture
                      tipo="identificacion"
                      onCapture={(file) => handleEvidenciaCapture("identificacion", file)}
                    />
                    <EvidenciaCapture
                      tipo="documento"
                      onCapture={(file) => handleEvidenciaCapture("documento", file)}
                    />
                    <EvidenciaCapture
                      tipo="vehiculo"
                      onCapture={(file) => handleEvidenciaCapture("vehiculo", file)}
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

                {/* Indicador de firma requerida */}
                {hayDiferencias && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                      <PenLine className="w-5 h-5" />
                      <span className="font-medium">Firma del chofer requerida</span>
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
                  ) : hayDiferencias ? (
                    <>
                      <PenLine className="w-5 h-5 mr-2" />
                      Continuar a firma
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                      Confirmar recepción
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
        titulo={`Firma de ${nombreEntrega || "transportista"} - Confirma que entregó ${totalDiferencias} unidades menos de lo ordenado`}
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
        nombreChofer={nombreEntrega}
        onDevolucionCompletada={handleDevolucionCompletada}
      />
    </>
  );
};
