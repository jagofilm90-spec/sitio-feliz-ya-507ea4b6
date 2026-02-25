import { useState, useEffect, useRef, useCallback } from "react";
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
  Lock,
  CheckCheck,
} from "lucide-react";
import { CargaProductosChecklist } from "./CargaProductosChecklist";
import { CargaResumenFinal } from "./CargaResumenFinal";
import { FirmaDigitalDialog } from "./FirmaDigitalDialog";
import { FirmaChoferDialog } from "./FirmaChoferDialog";
import { CargaEvidenciasSection } from "./CargaEvidenciasSection";
import { SellosSection } from "./SellosSection";

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
  lleva_sellos?: boolean | null;
  numero_sello_salida?: string | null;
  firma_chofer_carga?: string | null;
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

interface LoteDisponible {
  id: string;
  lote_referencia: string | null;
  cantidad_disponible: number;
  fecha_caducidad: string | null;
  bodega_id?: string | null;
  bodega_nombre?: string | null;
}

interface ProductoCarga {
  id: string;
  pedido_detalle_id: string;
  cantidad_solicitada: number;
  cantidad_cargada: number | null;
  cargado: boolean;
  lote_id: string | null;
  peso_real_kg?: number | null;
  es_cortesia: boolean;
  producto: {
    id: string;
    codigo: string;
    nombre: string;
    marca: string | null;
    especificaciones: string | null;
    contenido_empaque: string | null;
    peso_kg: number | null;
    unidad: string;
  };
  lotes_disponibles: LoteDisponible[];
}

interface EntregaConProductos {
  id: string;
  orden_entrega: number;
  carga_confirmada: boolean;
  carga_confirmada_por: string | null;
  carga_confirmada_en: string | null;
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
  const [firmaAlmacenistaOpen, setFirmaAlmacenistaOpen] = useState(false);
  const [firmaChoferOpen, setFirmaChoferOpen] = useState(false);
  
  // Estado para controlar inicio de carga
  const [cargaIniciada, setCargaIniciada] = useState(false);
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState(0);
  const [horaInicio, setHoraInicio] = useState<Date | null>(null);
  const [iniciandoCarga, setIniciandoCarga] = useState(false);
  
  // Estado para sellos
  const [llevaSellos, setLlevaSellos] = useState(ruta.lleva_sellos ?? true);
  const [numeroSello, setNumeroSello] = useState(ruta.numero_sello_salida || "");
  
  
  // Estado para firma del chofer
  const [firmaChoferBase64, setFirmaChoferBase64] = useState<string | null>(ruta.firma_chofer_carga || null);
  const [firmaAlmacenistaBase64, setFirmaAlmacenistaBase64] = useState<string | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Cargar nombres de ayudantes
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

  const loadEntregasYProductos = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      // Query mejorada con info completa de sucursal, cliente y confirmación
      const { data: entregasData, error: entregasError } = await supabase
        .from("entregas")
        .select(`
          id,
          orden_entrega,
          carga_confirmada,
          carga_confirmada_por,
          carga_confirmada_en,
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
            lote_id,
            peso_real_kg
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

        // Cargar info de productos y lotes disponibles con bodega
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
                marca,
                especificaciones,
                contenido_empaque,
                peso_kg,
                unidad
              )
            `)
            .eq("id", cp.pedido_detalle_id)
            .single();

          // Obtener lotes disponibles para FIFO CON BODEGA
          const { data: lotes } = await supabase
            .from("inventario_lotes")
            .select(`
              id, 
              lote_referencia, 
              cantidad_disponible, 
              fecha_caducidad,
              bodega_id,
              bodega:bodegas(nombre)
            `)
            .eq("producto_id", (detalle?.producto as any)?.id)
            .gt("cantidad_disponible", 0)
            .order("fecha_caducidad", { ascending: true, nullsFirst: false });

          // Mapear lotes con nombre de bodega
          const lotesConBodega: LoteDisponible[] = (lotes || []).map(l => ({
            id: l.id,
            lote_referencia: l.lote_referencia,
            cantidad_disponible: l.cantidad_disponible,
            fecha_caducidad: l.fecha_caducidad,
            bodega_id: l.bodega_id,
            bodega_nombre: (l.bodega as any)?.nombre || null,
          }));

          productosConInfo.push({
            id: cp.id,
            pedido_detalle_id: cp.pedido_detalle_id,
            cantidad_solicitada: cp.cantidad_solicitada,
            cantidad_cargada: cp.cantidad_cargada,
            cargado: cp.cargado || false,
            lote_id: cp.lote_id,
            peso_real_kg: (cp as any).peso_real_kg || null,
            es_cortesia: (detalle as any)?.es_cortesia || false,
            producto: (detalle?.producto as any) || {
              id: "",
              codigo: "N/A",
              nombre: "Producto no encontrado",
              marca: null,
              especificaciones: null,
              contenido_empaque: null,
              peso_kg: null,
              unidad: "unidad",
            },
            lotes_disponibles: lotesConBodega,
          });
        }

        entregasConProductos.push({
          id: entrega.id,
          orden_entrega: entrega.orden_entrega,
          carga_confirmada: entrega.carga_confirmada || false,
          carga_confirmada_por: entrega.carga_confirmada_por,
          carga_confirmada_en: entrega.carga_confirmada_en,
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
      if (showLoading) setLoading(false);
    }
  };

  // Verificar si ya se inició la carga anteriormente
  const verificarEstadoCarga = async () => {
    const { data } = await supabase
      .from("rutas")
      .select("carga_iniciada_en, carga_iniciada_por, status, lleva_sellos, numero_sello_salida, firma_chofer_carga")
      .eq("id", ruta.id)
      .single();

    if (data?.carga_iniciada_en) {
      setCargaIniciada(true);
      const inicio = new Date(data.carga_iniciada_en);
      setHoraInicio(inicio);
      const ahora = new Date();
      const diferencia = Math.floor((ahora.getTime() - inicio.getTime()) / 1000);
      setTiempoTranscurrido(diferencia);
    } else {
      setCargaIniciada(false);
      setHoraInicio(null);
      setTiempoTranscurrido(0);
    }
    
    // Cargar estado de sellos y firma
    setLlevaSellos(data?.lleva_sellos ?? true);
    setNumeroSello(data?.numero_sello_salida || "");
    setFirmaChoferBase64(data?.firma_chofer_carga || null);
  };

  // Función para iniciar carga
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

  // Timer effect
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

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (selloDebounceRef.current) {
        clearTimeout(selloDebounceRef.current);
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

      const productoActual = entregas
        .flatMap(e => e.productos)
        .find(p => p.id === cargaId);

      if (!productoActual) {
        throw new Error("Producto no encontrado");
      }

      // MARCAR COMO CARGADO
      if (cargado && loteId) {
        if (productoActual.cargado) {
          toast({
            title: "Producto ya cargado",
            description: "Desmarque primero para modificar",
          });
          return;
        }

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

        const { error: decrementError } = await supabase.rpc("decrementar_lote", {
          p_lote_id: loteId,
          p_cantidad: cantidadCargada,
        });

        if (decrementError) throw decrementError;

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

        // Optimistic UI update
        setEntregas(prev => prev.map(e => ({
          ...e,
          productos: e.productos.map(p => 
            p.id === cargaId ? { ...p, cargado: true, cantidad_cargada: cantidadCargada, lote_id: loteId } : p
          ),
        })));

        toast({
          title: "Producto cargado",
          description: `Stock descontado del lote`,
        });
      } 
      // DESMARCAR - Revertir inventario
      else if (!cargado && productoActual.cargado) {
        // Obtener datos previos del producto cargado
        const { data: cargaPrevia, error: previaError } = await supabase
          .from("carga_productos")
          .select("lote_id, cantidad_cargada, movimiento_inventario_id")
          .eq("id", cargaId)
          .single();

        if (previaError) throw previaError;

        // Revertir si hay lote y cantidad previa
        if (cargaPrevia?.lote_id && cargaPrevia?.cantidad_cargada) {
          const { error: incrementError } = await supabase.rpc("incrementar_lote", {
            p_lote_id: cargaPrevia.lote_id,
            p_cantidad: cargaPrevia.cantidad_cargada,
          });

          if (incrementError) throw incrementError;

          // Eliminar movimiento de inventario
          if (cargaPrevia.movimiento_inventario_id) {
            await supabase
              .from("inventario_movimientos")
              .delete()
              .eq("id", cargaPrevia.movimiento_inventario_id);
          }
        }

        // Actualizar carga_productos
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
          description: "Stock restaurado al inventario",
        });

        // Optimistic UI update
        setEntregas(prev => prev.map(e => ({
          ...e,
          productos: e.productos.map(p => 
            p.id === cargaId ? { ...p, cargado: false, cantidad_cargada: 0, lote_id: null } : p
          ),
        })));
      }
    } catch (error) {
      console.error("Error actualizando producto:", error);
      // On error, reload to get correct state
      await loadEntregasYProductos(false);
      toast({
        title: "Error",
        description: "No se pudo actualizar el producto",
        variant: "destructive",
      });
    }
  };

  // Guardar peso real de un producto
  const handlePesoChange = async (cargaId: string, pesoKg: number) => {
    try {
      const { error } = await supabase
        .from("carga_productos")
        .update({ peso_real_kg: pesoKg })
        .eq("id", cargaId);

      if (error) throw error;

      // Update local state
      setEntregas(prev => prev.map(e => ({
        ...e,
        productos: e.productos.map(p => 
          p.id === cargaId ? { ...p, peso_real_kg: pesoKg } : p
        ),
      })));
    } catch (error) {
      console.error("Error guardando peso:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar el peso",
        variant: "destructive",
      });
    }
  };

  // Confirmar entrega individual
  const handleConfirmarEntrega = async (entregaId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("entregas")
        .update({
          carga_confirmada: true,
          carga_confirmada_por: user?.id,
          carga_confirmada_en: new Date().toISOString(),
        })
        .eq("id", entregaId);

      if (error) throw error;

      // Optimistic UI update
      setEntregas(prev => prev.map(e => 
        e.id === entregaId ? { ...e, carga_confirmada: true } : e
      ));

      toast({
        title: "Entrega confirmada",
        description: "Los productos de esta entrega están bloqueados",
      });
    } catch (error) {
      console.error("Error confirmando entrega:", error);
      toast({
        title: "Error",
        description: "No se pudo confirmar la entrega",
        variant: "destructive",
      });
    }
  };

  // Guardar firma del chofer
  const handleFirmaChofer = async (firmaBase64: string) => {
    try {
      const { error } = await supabase
        .from("rutas")
        .update({
          firma_chofer_carga: firmaBase64,
          firma_chofer_carga_fecha: new Date().toISOString(),
        })
        .eq("id", ruta.id);

      if (error) throw error;

      setFirmaChoferBase64(firmaBase64);
      setFirmaChoferOpen(false);
      
      toast({
        title: "Firma del chofer guardada",
        description: "El chofer ha confirmado la carga",
      });
    } catch (error) {
      console.error("Error guardando firma:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar la firma",
        variant: "destructive",
      });
    }
  };

  // Guardar estado de sellos
  const handleLlevaSellosChange = async (value: boolean) => {
    setLlevaSellos(value);
    await supabase
      .from("rutas")
      .update({ lleva_sellos: value })
      .eq("id", ruta.id);
  };

  // Debounce para no guardar en cada tecla y evitar que realtime recargue todo
  const selloDebounceRef = useRef<NodeJS.Timeout | null>(null);
  
  const handleNumeroSelloChange = useCallback((value: string) => {
    setNumeroSello(value);
    
    if (selloDebounceRef.current) {
      clearTimeout(selloDebounceRef.current);
    }
    
    selloDebounceRef.current = setTimeout(async () => {
      await supabase
        .from("rutas")
        .update({ numero_sello_salida: value })
        .eq("id", ruta.id);
    }, 800);
  }, [ruta.id]);

  // Validaciones para completar carga
  const todosLosProdutosCargados = entregas.every((e) =>
    e.productos.every((p) => p.cargado)
  );
  
  const todasEntregasConfirmadas = entregas.every(e => e.carga_confirmada);
  
  const selloEvidencia = evidencias.find(e => e.tipo_evidencia === "sello_salida_1");
  const sellosValidos = !llevaSellos || (llevaSellos && selloEvidencia);
  
  const puedeCompletar = todosLosProdutosCargados && 
                         todasEntregasConfirmadas && 
                         sellosValidos && 
                         firmaChoferBase64;

  const totalProductos = entregas.reduce((acc, e) => acc + e.productos.length, 0);
  const productosCargados = entregas.reduce(
    (acc, e) => acc + e.productos.filter((p) => p.cargado).length,
    0
  );
  const porcentajeCarga = totalProductos > 0 
    ? Math.round((productosCargados / totalProductos) * 100) 
    : 0;

  const formatearTiempo = (segundos: number) => {
    const horas = Math.floor(segundos / 3600);
    const minutos = Math.floor((segundos % 3600) / 60);
    const segs = segundos % 60;
    return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}:${segs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    const minutos = tiempoTranscurrido / 60;
    if (minutos < 30) return "text-green-600 bg-green-50 border-green-200";
    if (minutos < 60) return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const handleCompletarCarga = async (firmaBase64: string) => {
    setSaving(true);
    setFirmaAlmacenistaBase64(firmaBase64);
    try {
      const { data: { user } } = await supabase.auth.getUser();

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

      // Enviar notificación push al chofer
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
      setFirmaAlmacenistaOpen(false);
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

          {/* Panel de estado de carga con temporizador */}
          {!loading && (
            <div className="p-4 border-b">
              {!cargaIniciada && !ruta.carga_completada ? (
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

          <ScrollArea className="h-[calc(100vh-400px)]">
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
                  const direccionEntrega = sucursal?.direccion || cliente?.direccion;
                  const telefonoEntrega = sucursal?.telefono || cliente?.telefono;
                  
                  const todosProductosCargadosEntrega = entrega.productos.every(p => p.cargado);
                  
                  return (
                    <Card key={entrega.id} className={`overflow-hidden ${entrega.carga_confirmada ? 'ring-2 ring-green-500' : ''}`}>
                      {/* Header de entrega con info completa */}
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
                              {entrega.carga_confirmada && (
                                <Badge className="bg-green-600 text-xs">
                                  <Lock className="w-3 h-3 mr-1" />
                                  Confirmada
                                </Badge>
                              )}
                            </div>
                            
                            {sucursal && (
                              <div className="text-sm text-muted-foreground mb-2">
                                <span className="font-medium">{sucursal.nombre}</span>
                                {sucursal.codigo_sucursal && (
                                  <span className="ml-1 text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                                    {sucursal.codigo_sucursal}
                                  </span>
                                )}
                              </div>
                            )}
                            
                            {direccionEntrega && (
                              <div className="flex items-start gap-2 text-sm mb-1">
                                <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" />
                                <span className="text-muted-foreground">{direccionEntrega}</span>
                              </div>
                            )}
                            
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
                        {productosNormales.length > 0 && (
                          <CargaProductosChecklist
                            productos={productosNormales}
                            onToggle={handleProductoToggle}
                            onPesoChange={handlePesoChange}
                            disabled={!cargaIniciada || ruta.carga_completada || false}
                            entregaConfirmada={entrega.carga_confirmada}
                          />
                        )}
                        
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
                              onPesoChange={handlePesoChange}
                              disabled={!cargaIniciada || ruta.carga_completada || false}
                              entregaConfirmada={entrega.carga_confirmada}
                              isCortesia
                            />
                          </div>
                        )}

                        {/* Botón de confirmar entrega */}
                        {cargaIniciada && !entrega.carga_confirmada && !ruta.carga_completada && (
                          <div className="mt-4 pt-4 border-t">
                            <Button
                              className="w-full h-12"
                              variant={todosProductosCargadosEntrega ? "default" : "outline"}
                              disabled={!todosProductosCargadosEntrega}
                              onClick={() => handleConfirmarEntrega(entrega.id)}
                            >
                              <CheckCheck className="w-5 h-5 mr-2" />
                              {todosProductosCargadosEntrega 
                                ? `Confirmar entrega #${entrega.orden_entrega}`
                                : `Faltan productos por cargar`
                              }
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}

                {/* Sección de sellos */}
                {cargaIniciada && !ruta.carga_completada && (
                  <SellosSection
                    rutaId={ruta.id}
                    evidencias={evidencias}
                    onEvidenciaAdded={loadEvidencias}
                    disabled={ruta.carga_completada || false}
                    llevaSellos={llevaSellos}
                    onLlevaSellosChange={handleLlevaSellosChange}
                    numeroSello={numeroSello}
                    onNumeroSelloChange={handleNumeroSelloChange}
                  />
                )}

                {/* Sección de firma del chofer */}
                {cargaIniciada && todasEntregasConfirmadas && !ruta.carga_completada && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Truck className="w-5 h-5 text-primary" />
                          <span className="font-medium">Firma del Chofer</span>
                        </div>
                        {firmaChoferBase64 ? (
                          <Badge className="bg-green-600">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Firmado
                          </Badge>
                        ) : (
                          <Button onClick={() => setFirmaChoferOpen(true)}>
                            Solicitar firma
                          </Button>
                        )}
                      </div>
                      {firmaChoferBase64 && (
                        <div className="mt-3 p-2 bg-muted rounded-lg">
                          <img 
                            src={firmaChoferBase64} 
                            alt="Firma del chofer" 
                            className="h-16 object-contain"
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Sección de evidencias fotográficas */}
                <CargaEvidenciasSection
                  rutaId={ruta.id}
                  evidencias={evidencias}
                  onEvidenciaAdded={loadEvidencias}
                  disabled={!cargaIniciada || ruta.carga_completada || false}
                />

                {/* Resumen final cuando la carga está completada */}
                {ruta.carga_completada && (
                  <CargaResumenFinal
                    tiempoTranscurrido={tiempoTranscurrido}
                    totalProductos={totalProductos}
                    productosCargados={productosCargados}
                    pesoTotalTeorico={entregas.reduce((acc, e) => 
                      acc + e.productos.reduce((pacc, p) => 
                        pacc + (p.producto.peso_kg || 0) * (p.cantidad_cargada || p.cantidad_solicitada), 0
                      ), 0
                    )}
                    pesoTotalReal={entregas.reduce((acc, e) => 
                      acc + e.productos.reduce((pacc, p) => 
                        pacc + (p.peso_real_kg || (p.producto.peso_kg || 0) * (p.cantidad_cargada || p.cantidad_solicitada)), 0
                      ), 0
                    )}
                    totalUnidades={entregas.reduce((acc, e) => 
                      acc + e.productos.reduce((pacc, p) => 
                        pacc + (p.cantidad_cargada || p.cantidad_solicitada), 0
                      ), 0
                    )}
                    firmaAlmacenista={firmaAlmacenistaBase64}
                    firmaChofer={firmaChoferBase64}
                    choferNombre={ruta.chofer?.nombre_completo}
                  />
                )}
              </div>
            )}
          </ScrollArea>

          {/* Footer con botón de completar */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background">
            <Button
              size="lg"
              className="w-full h-14 text-lg"
              disabled={!puedeCompletar || ruta.carga_completada || saving}
              onClick={() => setFirmaAlmacenistaOpen(true)}
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
            
            {/* Mensajes de validación */}
            {cargaIniciada && !ruta.carga_completada && (
              <div className="mt-2 space-y-1 text-center text-sm">
                {!todasEntregasConfirmadas && (
                  <p className="text-amber-600">
                    ⚠️ Confirma todas las entregas para continuar
                  </p>
                )}
                {todasEntregasConfirmadas && !firmaChoferBase64 && (
                  <p className="text-amber-600">
                    ⚠️ Falta la firma del chofer
                  </p>
                )}
                {llevaSellos && !selloEvidencia && (
                  <p className="text-amber-600">
                    ⚠️ Falta foto del sello de salida
                  </p>
                )}
              </div>
            )}
            
            {!cargaIniciada && !ruta.carga_completada && (
              <p className="text-center text-sm text-amber-600 mt-2">
                ⚠️ Presiona "INICIAR CARGA" para habilitar los checkboxes
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>


      {/* Diálogo de firma del chofer */}
      <FirmaChoferDialog
        open={firmaChoferOpen}
        onOpenChange={setFirmaChoferOpen}
        onConfirm={handleFirmaChofer}
        choferNombre={ruta.chofer?.nombre_completo || "Chofer"}
        rutaFolio={ruta.folio}
      />

      {/* Diálogo de firma del almacenista */}
      <FirmaDigitalDialog
        open={firmaAlmacenistaOpen}
        onOpenChange={setFirmaAlmacenistaOpen}
        onConfirm={handleCompletarCarga}
        titulo={`Confirmar carga de ${ruta.folio}`}
        loading={saving}
      />
    </>
  );
};
