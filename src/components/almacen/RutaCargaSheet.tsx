import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { sendPushNotification } from "@/services/pushNotifications";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import {
  Package,
  Truck,
  User,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  Gift,
  MapPin,
  Phone,
  Clock,
  Play,
  Users,
  AlertCircle,
  Timer,
} from "lucide-react";
import { CargaProductosChecklist } from "./CargaProductosChecklist";
import { FirmaDigitalDialog } from "./FirmaDigitalDialog";
import { CargaEvidenciasSection } from "./CargaEvidenciasSection";

interface CargaEvidencia {
  id: string;
  tipo_evidencia: string;
  ruta_storage: string;
  nombre_archivo: string;
  created_at: string;
}

interface Ruta {
  id: string;
  folio: string;
  fecha_ruta: string;
  status: string;
  peso_total_kg: number | null;
  carga_completada: boolean | null;
  carga_iniciada_en?: string | null;
  carga_iniciada_por?: string | null;
  ayudantes_ids?: string[] | null;
  vehiculo: {
    id: string;
    nombre: string;
    placas: string;
  } | null;
  chofer: {
    id: string;
    nombre_completo: string;
  } | null;
  entregas: {
    id: string;
    pedido_id: string;
  }[];
}

interface SucursalInfo {
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  contacto: string | null;
  notas: string | null;
  codigo_sucursal: string | null;
  horario_entrega: string | null;
  razon_social: string | null;
}

interface EntregaConProductos {
  id: string;
  orden_entrega: number;
  pedido: {
    id: string;
    folio: string;
    notas: string | null;
    cliente: {
      nombre: string;
      codigo: string;
      direccion: string | null;
      telefono: string | null;
    };
    sucursal: SucursalInfo | null;
  };
  productos: ProductoCarga[];
}

interface ProductoCarga {
  id: string;
  pedido_detalle_id: string;
  cantidad_solicitada: number;
  cantidad_cargada: number | null;
  cargado: boolean;
  lote_id: string | null;
  es_cortesia: boolean;
  producto: {
    id: string;
    codigo: string;
    nombre: string;
    unidad: string;
  };
  lotes_disponibles: LoteDisponible[];
}

interface LoteDisponible {
  id: string;
  lote_referencia: string | null;
  cantidad_disponible: number;
  fecha_caducidad: string | null;
}

interface AyudanteInfo {
  id: string;
  nombre_completo: string;
}

interface RutaCargaSheetProps {
  ruta: Ruta;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCargaCompletada: () => void;
}

export const RutaCargaSheet = ({
  ruta,
  open,
  onOpenChange,
  onCargaCompletada,
}: RutaCargaSheetProps) => {
  const [entregas, setEntregas] = useState<EntregaConProductos[]>([]);
  const [evidencias, setEvidencias] = useState<CargaEvidencia[]>([]);
  const [ayudantes, setAyudantes] = useState<AyudanteInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [firmaDialogOpen, setFirmaDialogOpen] = useState(false);
  
  // *** NUEVO: Estado para controlar inicio de carga ***
  const [cargaIniciada, setCargaIniciada] = useState(false);
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState(0);
  const [horaInicio, setHoraInicio] = useState<Date | null>(null);
  const [iniciandoCarga, setIniciandoCarga] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // *** Cargar nombres de ayudantes ***
  const loadAyudantes = async () => {
    const ayudantesIds = ruta.ayudantes_ids || [];
    if (ayudantesIds.length === 0) {
      setAyudantes([]);
      return;
    }

    const { data } = await supabase
      .from("empleados")
      .select("id, nombre_completo")
      .in("id", ayudantesIds);

    setAyudantes(data || []);
  };

  const loadEvidencias = async () => {
    const { data } = await supabase
      .from("carga_evidencias")
      .select("id, tipo_evidencia, ruta_storage, nombre_archivo, created_at")
      .eq("ruta_id", ruta.id)
      .order("created_at", { ascending: false });
    
    setEvidencias(data || []);
  };

  const loadEntregasYProductos = async () => {
    setLoading(true);
    try {
      // *** Query mejorada con info completa de sucursal y cliente ***
      const { data: entregasData, error: entregasError } = await supabase
        .from("entregas")
        .select(`
          id,
          orden_entrega,
          pedido:pedidos(
            id,
            folio,
            notas,
            cliente:clientes(nombre, codigo, direccion, telefono),
            sucursal:cliente_sucursales(
              nombre,
              direccion,
              telefono,
              contacto,
              notas,
              codigo_sucursal,
              horario_entrega,
              razon_social
            )
          )
        `)
        .eq("ruta_id", ruta.id)
        .order("orden_entrega");

      if (entregasError) throw entregasError;

      // Para cada entrega, cargar productos de carga_productos o crearlos
      const entregasConProductos: EntregaConProductos[] = [];

      for (const entrega of entregasData || []) {
        // Buscar productos en carga_productos
        let { data: cargaProductos, error: cargaError } = await supabase
          .from("carga_productos")
          .select(`
            id,
            pedido_detalle_id,
            cantidad_solicitada,
            cantidad_cargada,
            cargado,
            lote_id
          `)
          .eq("entrega_id", entrega.id);

        if (cargaError) throw cargaError;

        // Si no hay registros, crearlos desde pedidos_detalles
        if (!cargaProductos || cargaProductos.length === 0) {
          const { data: detalles, error: detallesError } = await supabase
            .from("pedidos_detalles")
            .select("id, cantidad, producto_id, es_cortesia")
            .eq("pedido_id", (entrega.pedido as any).id);

          if (detallesError) throw detallesError;

          if (detalles && detalles.length > 0) {
            const nuevosRegistros = detalles.map((d) => ({
              entrega_id: entrega.id,
              pedido_detalle_id: d.id,
              cantidad_solicitada: d.cantidad,
              cantidad_cargada: 0,
              cargado: false,
            }));

            const { data: insertados, error: insertError } = await supabase
              .from("carga_productos")
              .insert(nuevosRegistros)
              .select();

            if (insertError) throw insertError;
            cargaProductos = insertados;
          }
        }

        // Cargar info de productos y lotes disponibles
        const productosConInfo: ProductoCarga[] = [];

        for (const cp of cargaProductos || []) {
          // Obtener info del producto desde pedidos_detalles
          const { data: detalle } = await supabase
            .from("pedidos_detalles")
            .select(`
              es_cortesia,
            producto:productos(
                id,
                codigo,
                nombre,
                unidad
              )
            `)
            .eq("id", cp.pedido_detalle_id)
            .single();

          // Obtener lotes disponibles para FIFO
          const { data: lotes } = await supabase
            .from("inventario_lotes")
            .select("id, lote_referencia, cantidad_disponible, fecha_caducidad")
            .eq("producto_id", (detalle?.producto as any)?.id)
            .gt("cantidad_disponible", 0)
            .order("fecha_caducidad", { ascending: true, nullsFirst: false });

          productosConInfo.push({
            id: cp.id,
            pedido_detalle_id: cp.pedido_detalle_id,
            cantidad_solicitada: cp.cantidad_solicitada,
            cantidad_cargada: cp.cantidad_cargada,
            cargado: cp.cargado || false,
            lote_id: cp.lote_id,
            es_cortesia: (detalle as any)?.es_cortesia || false,
            producto: (detalle?.producto as any) || {
              id: "",
              codigo: "N/A",
              nombre: "Producto no encontrado",
              unidad: "unidad",
            },
            lotes_disponibles: lotes || [],
          });
        }

        entregasConProductos.push({
          id: entrega.id,
          orden_entrega: entrega.orden_entrega,
          pedido: entrega.pedido as any,
          productos: productosConInfo,
        });
      }

      setEntregas(entregasConProductos);
    } catch (error) {
      console.error("Error cargando entregas:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los productos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // *** Verificar si ya se inició la carga anteriormente ***
  const verificarEstadoCarga = async () => {
    const { data } = await supabase
      .from("rutas")
      .select("carga_iniciada_en, carga_iniciada_por, status")
      .eq("id", ruta.id)
      .single();

    if (data?.carga_iniciada_en) {
      setCargaIniciada(true);
      const inicio = new Date(data.carga_iniciada_en);
      setHoraInicio(inicio);
      // Calcular tiempo transcurrido desde el inicio
      const ahora = new Date();
      const diferencia = Math.floor((ahora.getTime() - inicio.getTime()) / 1000);
      setTiempoTranscurrido(diferencia);
    } else {
      setCargaIniciada(false);
      setHoraInicio(null);
      setTiempoTranscurrido(0);
    }
  };

  // *** NUEVO: Función para iniciar carga (reemplaza auto-registro) ***
  const handleIniciarCarga = async () => {
    setIniciandoCarga(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const ahora = new Date();

      const { error } = await supabase
        .from("rutas")
        .update({
          carga_iniciada_en: ahora.toISOString(),
          carga_iniciada_por: user?.id,
          status: "cargando"
        })
        .eq("id", ruta.id);

      if (error) throw error;

      setCargaIniciada(true);
      setHoraInicio(ahora);
      setTiempoTranscurrido(0);

      toast({
        title: "Carga iniciada",
        description: "Ahora puedes marcar los productos como cargados",
      });

      console.log("Inicio de carga registrado para ruta:", ruta.folio);
    } catch (error) {
      console.error("Error iniciando carga:", error);
      toast({
        title: "Error",
        description: "No se pudo iniciar la carga",
        variant: "destructive",
      });
    } finally {
      setIniciandoCarga(false);
    }
  };

  // *** Timer effect ***
  useEffect(() => {
    if (cargaIniciada && !ruta.carga_completada) {
      timerRef.current = setInterval(() => {
        setTiempoTranscurrido(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [cargaIniciada, ruta.carga_completada]);

  useEffect(() => {
    if (open && ruta.id) {
      loadEntregasYProductos();
      loadEvidencias();
      loadAyudantes();
      verificarEstadoCarga();
    }

    // Cleanup timer when sheet closes
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [open, ruta.id]);

  const handleProductoToggle = async (
    cargaId: string,
    cargado: boolean,
    cantidadCargada: number,
    loteId: string | null
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Buscar el producto actual para obtener info necesaria
      const productoActual = entregas
        .flatMap(e => e.productos)
        .find(p => p.id === cargaId);

      if (!productoActual) {
        throw new Error("Producto no encontrado");
      }

      // ===== MARCAR COMO CARGADO =====
      if (cargado && loteId) {
        // *** BUG FIX: Verificar si ya está cargado para evitar descuento duplicado ***
        if (productoActual.cargado) {
          console.log("⚠️ Producto ya cargado, ignorando toggle duplicado");
          toast({
            title: "Producto ya cargado",
            description: "Use la opción de desmarcar para modificar",
          });
          return;
        }

        // 1. Validar stock disponible en el lote
        const { data: lote, error: loteError } = await supabase
          .from("inventario_lotes")
          .select("cantidad_disponible")
          .eq("id", loteId)
          .single();

        if (loteError) throw loteError;

        if (!lote || lote.cantidad_disponible < cantidadCargada) {
          toast({
            title: "Stock insuficiente",
            description: `Disponible: ${lote?.cantidad_disponible || 0}, Solicitado: ${cantidadCargada}`,
            variant: "destructive",
          });
          return;
        }

        // 2. Decrementar del lote usando RPC atómico
        const { error: decrementError } = await supabase.rpc("decrementar_lote", {
          p_lote_id: loteId,
          p_cantidad: cantidadCargada,
        });

        if (decrementError) throw decrementError;

        // 3. Crear movimiento de salida (trigger actualiza productos.stock_actual)
        const { data: movimiento, error: movimientoError } = await supabase
          .from("inventario_movimientos")
          .insert({
            producto_id: productoActual.producto.id,
            tipo_movimiento: "salida",
            cantidad: cantidadCargada,
            referencia: `CARGA-${ruta.folio}`,
            notas: `Cargado para ruta ${ruta.folio}`,
            usuario_id: user?.id,
            lote: loteId,
          })
          .select("id")
          .single();

        if (movimientoError) throw movimientoError;

        // 4. Actualizar carga_productos con referencia al movimiento
        const { error: updateError } = await supabase
          .from("carga_productos")
          .update({
            cargado: true,
            cantidad_cargada: cantidadCargada,
            lote_id: loteId,
            cargado_por: user?.id,
            cargado_en: new Date().toISOString(),
            movimiento_inventario_id: movimiento.id,
          })
          .eq("id", cargaId);

        if (updateError) throw updateError;

        toast({
          title: "Producto cargado",
          description: `Stock descontado del lote`,
        });
      }
      // ===== DESMARCAR (REVERTIR) =====
      else if (!cargado) {
        // 1. Obtener datos previos del producto cargado
        const { data: cargaPrevia, error: previaError } = await supabase
          .from("carga_productos")
          .select("lote_id, cantidad_cargada, movimiento_inventario_id")
          .eq("id", cargaId)
          .single();

        if (previaError) throw previaError;

        // 2. Revertir si hay lote y cantidad previa
        if (cargaPrevia?.lote_id && cargaPrevia?.cantidad_cargada) {
          // Incrementar lote usando RPC atómico
          const { error: incrementError } = await supabase.rpc("incrementar_lote", {
            p_lote_id: cargaPrevia.lote_id,
            p_cantidad: cargaPrevia.cantidad_cargada,
          });

          if (incrementError) throw incrementError;

          // Eliminar movimiento (trigger restaura stock automáticamente)
          if (cargaPrevia.movimiento_inventario_id) {
            await supabase
              .from("inventario_movimientos")
              .delete()
              .eq("id", cargaPrevia.movimiento_inventario_id);
          }
        }

        // 3. Actualizar carga_productos
        const { error: updateError } = await supabase
          .from("carga_productos")
          .update({
            cargado: false,
            cantidad_cargada: 0,
            lote_id: null,
            cargado_por: null,
            cargado_en: null,
            movimiento_inventario_id: null,
          })
          .eq("id", cargaId);

        if (updateError) throw updateError;

        toast({
          title: "Producto desmarcado",
          description: "Stock restaurado al lote",
        });
      }

      // Actualizar estado local y refrescar lotes disponibles
      await loadEntregasYProductos();
    } catch (error) {
      console.error("Error actualizando producto:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el producto",
        variant: "destructive",
      });
    }
  };

  const todosLosProdutosCargados = entregas.every((e) =>
    e.productos.every((p) => p.cargado)
  );

  const totalProductos = entregas.reduce((acc, e) => acc + e.productos.length, 0);
  const productosCargados = entregas.reduce(
    (acc, e) => acc + e.productos.filter((p) => p.cargado).length,
    0
  );
  const porcentajeCarga = totalProductos > 0 
    ? Math.round((productosCargados / totalProductos) * 100) 
    : 0;

  // *** Formatear tiempo transcurrido ***
  const formatearTiempo = (segundos: number) => {
    const horas = Math.floor(segundos / 3600);
    const minutos = Math.floor((segundos % 3600) / 60);
    const segs = segundos % 60;
    return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}:${segs.toString().padStart(2, '0')}`;
  };

  // *** Color del timer según duración ***
  const getTimerColor = () => {
    const minutos = tiempoTranscurrido / 60;
    if (minutos < 30) return "text-green-600 bg-green-50 border-green-200";
    if (minutos < 60) return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const handleCompletarCarga = async (firmaBase64: string) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Actualizar ruta como carga completada
      const { error: rutaError } = await supabase
        .from("rutas")
        .update({
          carga_completada: true,
          carga_completada_por: user?.id,
          carga_completada_en: new Date().toISOString(),
          status: "cargada",
        })
        .eq("id", ruta.id);

      if (rutaError) throw rutaError;

      // Enviar notificación push al chofer con duración
      if (ruta.chofer?.id) {
        const duracionMinutos = Math.round(tiempoTranscurrido / 60);
        await sendPushNotification({
          user_ids: [ruta.chofer.id],
          title: "🚚 Ruta lista para salir",
          body: `La carga de ${ruta.folio} está completa (${duracionMinutos} min). ¡Tu camión está listo!`,
          data: {
            type: "carga_completa",
            ruta_id: ruta.id,
            folio: ruta.folio,
          },
        });
      }

      toast({
        title: "Carga completada",
        description: `El chofer ha sido notificado. Duración: ${formatearTiempo(tiempoTranscurrido)}`,
      });

      onCargaCompletada();
    } catch (error) {
      console.error("Error completando carga:", error);
      toast({
        title: "Error",
        description: "No se pudo completar la carga",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
      setFirmaDialogOpen(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-0">
          <SheetHeader className="p-4 border-b bg-muted/30">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex-1">
                <SheetTitle className="text-xl">{ruta.folio}</SheetTitle>
                {/* *** Info completa del vehículo y personal *** */}
                <div className="flex flex-col gap-1 text-sm text-muted-foreground mt-1">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Truck className="w-4 h-4" />
                      {ruta.vehiculo?.nombre} 
                      {ruta.vehiculo?.placas && (
                        <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                          {ruta.vehiculo.placas}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    <span className="font-medium">{ruta.chofer?.nombre_completo || "Sin chofer"}</span>
                  </div>
                  {ayudantes.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>Ayudantes: {ayudantes.map(a => a.nombre_completo).join(", ")}</span>
                    </div>
                  )}
                </div>
              </div>
              <Badge variant={ruta.carga_completada ? "default" : "secondary"}>
                {porcentajeCarga}% cargado
              </Badge>
            </div>
          </SheetHeader>

          {/* Progress bar */}
          <div className="h-2 bg-muted">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${porcentajeCarga}%` }}
            />
          </div>

          {/* *** NUEVO: Panel de estado de carga con temporizador *** */}
          {!loading && (
            <div className="p-4 border-b">
              {!cargaIniciada && !ruta.carga_completada ? (
                // *** Botón INICIAR CARGA ***
                <div className="flex flex-col items-center gap-3 py-4">
                  <AlertCircle className="w-12 h-12 text-amber-500" />
                  <p className="text-center text-muted-foreground">
                    Los checkboxes están bloqueados hasta iniciar la carga
                  </p>
                  <Button
                    size="lg"
                    className="w-full h-16 text-xl bg-green-600 hover:bg-green-700"
                    onClick={handleIniciarCarga}
                    disabled={iniciandoCarga}
                  >
                    {iniciandoCarga ? (
                      <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                    ) : (
                      <Play className="w-6 h-6 mr-2" />
                    )}
                    INICIAR CARGA
                  </Button>
                </div>
              ) : (
                // *** Temporizador visible ***
                <div className={`rounded-lg border p-4 ${getTimerColor()}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Timer className="w-5 h-5" />
                      <span className="font-medium">
                        {ruta.carga_completada ? "Carga finalizada" : "Carga en progreso"}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-mono font-bold">
                        {formatearTiempo(tiempoTranscurrido)}
                      </div>
                      {horaInicio && (
                        <div className="text-xs opacity-75">
                          Iniciada: {horaInicio.toLocaleTimeString('es-MX', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <ScrollArea className="h-[calc(100vh-320px)]">
            {loading ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : (
              <div className="p-4 space-y-6">
                {entregas.map((entrega) => {
                  const productosNormales = entrega.productos.filter(p => !p.es_cortesia);
                  const cortesias = entrega.productos.filter(p => p.es_cortesia);
                  const sucursal = entrega.pedido.sucursal;
                  const cliente = entrega.pedido.cliente;
                  
                  // Determinar dirección a mostrar (sucursal o cliente)
                  const direccionEntrega = sucursal?.direccion || cliente?.direccion;
                  const telefonoEntrega = sucursal?.telefono || cliente?.telefono;
                  
                  return (
                    <Card key={entrega.id} className="overflow-hidden">
                      {/* *** Header de entrega con info completa *** */}
                      <div className="bg-muted/50 p-4 border-b">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs shrink-0">
                                #{entrega.orden_entrega}
                              </Badge>
                              <span className="font-semibold text-lg truncate">
                                {cliente.nombre}
                              </span>
                            </div>
                            
                            {/* Sucursal */}
                            {sucursal && (
                              <div className="text-sm text-muted-foreground mb-2">
                                <span className="font-medium">{sucursal.nombre}</span>
                                {sucursal.codigo_sucursal && (
                                  <span className="ml-1 text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                                    {sucursal.codigo_sucursal}
                                  </span>
                                )}
                                {sucursal.razon_social && sucursal.razon_social !== cliente.nombre && (
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    {sucursal.razon_social}
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* Dirección */}
                            {direccionEntrega && (
                              <div className="flex items-start gap-2 text-sm mb-1">
                                <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" />
                                <span className="text-muted-foreground">{direccionEntrega}</span>
                              </div>
                            )}
                            
                            {/* Teléfono y contacto */}
                            <div className="flex flex-wrap gap-4 text-sm">
                              {telefonoEntrega && (
                                <div className="flex items-center gap-1">
                                  <Phone className="w-4 h-4 text-muted-foreground" />
                                  <span>{telefonoEntrega}</span>
                                </div>
                              )}
                              {sucursal?.contacto && (
                                <div className="flex items-center gap-1">
                                  <User className="w-4 h-4 text-muted-foreground" />
                                  <span>{sucursal.contacto}</span>
                                </div>
                              )}
                              {sucursal?.horario_entrega && (
                                <div className="flex items-center gap-1">
                                  <Clock className="w-4 h-4 text-muted-foreground" />
                                  <span>{sucursal.horario_entrega}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <Badge variant="secondary" className="shrink-0 text-xs">
                            {entrega.pedido.folio}
                          </Badge>
                        </div>
                        
                        {/* Notas especiales */}
                        {(sucursal?.notas || entrega.pedido.notas) && (
                          <div className="mt-3 p-2 bg-amber-100 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-md">
                            <div className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-200">
                              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                              <span>{sucursal?.notas || entrega.pedido.notas}</span>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <CardContent className="p-4">
                        {/* Productos normales */}
                        {productosNormales.length > 0 && (
                          <CargaProductosChecklist
                            productos={productosNormales}
                            onToggle={handleProductoToggle}
                            disabled={!cargaIniciada || ruta.carga_completada || false}
                          />
                        )}
                        
                        {/* Cortesías sin cargo */}
                        {cortesias.length > 0 && (
                          <div className="mt-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-3">
                              <Gift className="h-5 w-5 text-amber-600" />
                              <span className="font-semibold text-amber-800 dark:text-amber-200">CORTESÍAS A INCLUIR</span>
                              <Badge className="bg-amber-500 text-white text-xs">Sin Cargo</Badge>
                            </div>
                            <CargaProductosChecklist
                              productos={cortesias}
                              onToggle={handleProductoToggle}
                              disabled={!cargaIniciada || ruta.carga_completada || false}
                              isCortesia
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}

                {/* Sección de evidencias fotográficas */}
                <CargaEvidenciasSection
                  rutaId={ruta.id}
                  evidencias={evidencias}
                  onEvidenciaAdded={loadEvidencias}
                  disabled={!cargaIniciada || ruta.carga_completada || false}
                />
              </div>
            )}
          </ScrollArea>

          {/* Footer con botón de completar */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background">
            <Button
              size="lg"
              className="w-full h-14 text-lg"
              disabled={!cargaIniciada || !todosLosProdutosCargados || ruta.carga_completada || saving}
              onClick={() => setFirmaDialogOpen(true)}
            >
              {saving ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-5 h-5 mr-2" />
              )}
              {ruta.carga_completada
                ? "Carga completada"
                : "Firmar y completar carga"}
            </Button>
            {!cargaIniciada && !ruta.carga_completada && (
              <p className="text-center text-sm text-amber-600 mt-2">
                ⚠️ Presiona "INICIAR CARGA" para habilitar los checkboxes
              </p>
            )}
            {cargaIniciada && !todosLosProdutosCargados && !ruta.carga_completada && (
              <p className="text-center text-sm text-muted-foreground mt-2">
                Marca todos los productos como cargados para continuar
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <FirmaDigitalDialog
        open={firmaDialogOpen}
        onOpenChange={setFirmaDialogOpen}
        onConfirm={handleCompletarCarga}
        titulo={`Confirmar carga de ${ruta.folio}`}
        loading={saving}
      />
    </>
  );
};
