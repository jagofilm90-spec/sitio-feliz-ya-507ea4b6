import { useState, useEffect, useRef, useCallback } from "react";
import { CameraQrScanner } from "@/components/almacen/CameraQrScanner";
import { CargaHojaInteractiva } from "@/components/almacen/CargaHojaInteractiva";
import { supabase } from "@/integrations/supabase/client";
import { recalcularTotalesPedido } from "@/lib/recalcularTotalesPedido";
import { calcularTotalesConImpuestos } from "@/lib/calculos";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  QrCode, Truck, User, Loader2, Camera, X, ArrowLeft, CheckCircle2, Timer, Trash2, Package,
  ChevronUp, ChevronDown, AlertCircle,
} from "lucide-react";
import { format } from "date-fns";


interface PedidoEnCola {
  pedidoId: string;
  folio: string;
  clienteNombre: string;
  clienteId: string;
  sucursalNombre: string | null;
  direccion: string | null;
  zonaNombre: string | null;
  pesoKg: number;
  total: number;
  latitud: number | null;
  longitud: number | null;
}

interface ChoferOption {
  id: string;
  nombre_completo: string;
  puesto: string;
}

interface VehiculoOption {
  id: string;
  nombre: string;
  placa: string | null;
  tipo: string | null;
  chofer_asignado_id: string | null;
  peso_maximo_local_kg: number | null;
}

interface CargaRutaInlineFlowProps {
  onClose: () => void;
  onRutaCreada: () => void;
}

export const CargaRutaInlineFlow = ({ onClose, onRutaCreada }: CargaRutaInlineFlowProps) => {
  const [paso, setPaso] = useState<"escaneo" | "seleccion" | "hoja_carga" | "finalizado">("escaneo");

  // Paso 1: Selección
  const [choferId, setChoferId] = useState("");
  const [ayudantesIds, setAyudantesIds] = useState<string[]>([]);
  const [vehiculoId, setVehiculoId] = useState("");
  const [choferes, setChoferes] = useState<ChoferOption[]>([]);
  const [ayudantes, setAyudantes] = useState<ChoferOption[]>([]);
  const [vehiculos, setVehiculos] = useState<VehiculoOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  // Paso 2: Escaneo
  const [cola, setCola] = useState<PedidoEnCola[]>([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [scanInput, setScanInput] = useState("");
  const lastScannedRef = useRef<string>("");
  const scanCooldownRef = useRef<NodeJS.Timeout | null>(null);
  const autoStartRef = useRef<NodeJS.Timeout | null>(null);

  // Ruta (se crea al confirmar, NO al escanear)
  const [rutaId, setRutaId] = useState<string | null>(null);
  const [rutaFolio, setRutaFolio] = useState("");
  const [creatingRoute, setCreatingRoute] = useState(false);
  const [horaInicio, setHoraInicio] = useState<Date | null>(null);
  const [tiempoSeg, setTiempoSeg] = useState(0);
  const [cancelling, setCancelling] = useState(false);
  const [pedidosModificados, setPedidosModificados] = useState<Set<string>>(new Set());
  const [generandoPDF, setGenerandoPDF] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer
  useEffect(() => {
    if (horaInicio && paso !== "finalizado") {
      timerRef.current = setInterval(() => {
        setTiempoSeg(Math.floor((Date.now() - horaInicio.getTime()) / 1000));
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [horaInicio, paso]);

  // Al entrar al paso de escaneo, abrir cámara automáticamente
  useEffect(() => {
    if (paso === "escaneo") {
      setCameraActive(true);
    }
  }, [paso]);


  const formatTiempo = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // Load options
  useEffect(() => {
    const load = async () => {
      setLoadingOptions(true);
      const fechaHoy = format(new Date(), "yyyy-MM-dd");

      const { data: rutasHoy } = await supabase
        .from("rutas")
        .select("chofer_id, vehiculo_id, ayudantes_ids, entregas(id)")
        .eq("fecha_ruta", fechaHoy)
        .not("status", "eq", "cancelada");

      const rutasConCarga = (rutasHoy || []).filter(r => r.entregas && r.entregas.length > 0);
      const choferesEnRuta = new Set(rutasConCarga.map(r => r.chofer_id).filter(Boolean));
      const vehiculosEnRuta = new Set(rutasConCarga.map(r => r.vehiculo_id).filter(Boolean));
      const ayudantesEnRuta = new Set(rutasConCarga.flatMap(r => r.ayudantes_ids || []).filter(Boolean));

      const [empleadosRes, vehiculosRes] = await Promise.all([
        supabase.from("empleados").select("id, nombre_completo, puesto")
          .in("puesto", ["Chofer", "Ayudante de Chofer"]).eq("activo", true).order("nombre_completo"),
        supabase.from("vehiculos").select("id, nombre, placa, tipo, chofer_asignado_id, peso_maximo_local_kg")
          .eq("activo", true).order("nombre"),
      ]);

      const all = empleadosRes.data || [];
      setChoferes(all.filter(e => e.puesto === "Chofer" && !choferesEnRuta.has(e.id)));
      setAyudantes(all.filter(e => e.puesto === "Ayudante de Chofer" && !ayudantesEnRuta.has(e.id)));
      setVehiculos((vehiculosRes.data || []).filter(v => !vehiculosEnRuta.has(v.id)));
      setLoadingOptions(false);
    };
    load();
  }, []);

  // Paso 1 → Paso 2: solo ir a escaneo, SIN crear ruta
  const handleIrASeleccion = () => {
    if (cola.length === 0) {
      toast.error("Escanea al menos un pedido primero");
      return;
    }
    setCameraActive(false);
    setPaso("seleccion");
  };

  const handleIrACrearRuta = () => {
    if (!choferId || !vehiculoId) {
      toast.error("Selecciona chofer y vehículo");
      return;
    }
    handleCrearRutaYCargar();
  };

  // QR processing with dedup
  const processScanInput = async (input: string) => {
    // Prevent duplicate scans within 2 seconds
    if (lastScannedRef.current === input) return;
    lastScannedRef.current = input;
    if (scanCooldownRef.current) clearTimeout(scanCooldownRef.current);
    scanCooldownRef.current = setTimeout(() => { lastScannedRef.current = ""; }, 2000);

    const almasaMatch = input.match(/^almasa:carga:([a-f0-9-]+)$/i);
    const urlMatch = input.match(/carga-scan\/([a-f0-9-]+)/i);
    const uuidMatch = input.match(/^[a-f0-9-]{36}$/i);
    const folioMatch = input.match(/^(PED-[A-Z]?-?\d+)$/i);
    let id = almasaMatch?.[1] || urlMatch?.[1] || (uuidMatch ? input : null);

    if (!id && folioMatch) {
      const { data } = await supabase.from("pedidos").select("id").eq("folio", folioMatch[1].toUpperCase()).maybeSingle();
      if (data) id = data.id;
      else { toast.error(`Pedido ${folioMatch[1].toUpperCase()} no encontrado`); return; }
    }
    // Partial match: if input is just digits, search as suffix (e.g. "1234" matches "PED-V-1234")
    if (!id && /^\d+$/.test(input.trim())) {
      const { data } = await supabase.from("pedidos").select("id, folio").ilike("folio", `%${input.trim()}`).eq("status", "pendiente" as any).limit(5);
      if (data && data.length === 1) {
        id = data[0].id;
      } else if (data && data.length > 1) {
        toast.error(`Varios pedidos coinciden (${data.map(d => d.folio).join(", ")}). Escribe más dígitos.`);
        return;
      } else {
        toast.error(`No se encontró pedido terminado en ${input.trim()}`);
        return;
      }
    }
    if (!id && input.toUpperCase().startsWith("PED")) {
      const { data } = await supabase.from("pedidos").select("id").eq("folio", input.toUpperCase().trim()).maybeSingle();
      if (data) id = data.id;
      else { toast.error(`Pedido ${input.toUpperCase().trim()} no encontrado`); return; }
    }

    if (id) {
      await agregarPedidoACola(id);
    } else {
      toast.error("Código QR no válido");
    }
  };

  const agregarPedidoACola = async (id: string) => {
    if (cola.find(c => c.pedidoId === id)) {
      toast.info("Este pedido ya está en la cola");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("pedidos")
        .select("id, folio, cliente_id, total, peso_total_kg, cliente:clientes(nombre, direccion), sucursal:cliente_sucursales(nombre, direccion, latitud, longitud, zona:zonas(nombre))")
        .eq("id", id).single();
      if (error || !data) { toast.error("Pedido no encontrado"); return; }

      const suc = data.sucursal as any;
      const cli = data.cliente as any;
      const newItem: PedidoEnCola = {
        pedidoId: data.id,
        folio: data.folio,
        clienteNombre: cli?.nombre || "Sin cliente",
        clienteId: data.cliente_id,
        sucursalNombre: suc?.nombre || null,
        direccion: suc?.direccion || cli?.direccion || null,
        zonaNombre: suc?.zona?.nombre || null,
        pesoKg: data.peso_total_kg || 0,
        total: data.total || 0,
        latitud: suc?.latitud || null,
        longitud: suc?.longitud || null,
      };

      setCola(prev => [...prev, newItem]);

      toast.success(`Pedido ${data.folio} agregado`);
    } catch {
      toast.error("Error al buscar pedido");
    }
  };

  // Crear ruta y entregas, luego ir a hoja de carga
  const handleCrearRutaYCargar = async () => {
    if (cola.length === 0) {
      toast.error("Escanea al menos un pedido primero");
      return;
    }

    setCreatingRoute(true);
    try {
      const { data: lastRuta } = await supabase
        .from("rutas").select("folio").ilike("folio", "RUT-%")
        .order("folio", { ascending: false }).limit(1);

      const lastNumber = lastRuta?.[0]?.folio ? parseInt(lastRuta[0].folio.replace("RUT-", "")) : 0;
      const newFolio = `RUT-${String(lastNumber + 1).padStart(4, "0")}`;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Sesión expirada"); return; }

      const { data: empleadoActual } = await supabase
        .from("empleados").select("id").eq("user_id", user.id).maybeSingle();

      const { data: ruta, error } = await supabase
        .from("rutas")
        .insert({
          folio: newFolio,
          fecha_ruta: format(new Date(), "yyyy-MM-dd"),
          chofer_id: choferId,
          vehiculo_id: vehiculoId,
          tipo_ruta: "local",
          status: "programada",
          almacenista_id: empleadoActual?.id || null,
          ayudantes_ids: ayudantesIds.length > 0 ? ayudantesIds : null,
          carga_iniciada_en: new Date().toISOString(),
          carga_iniciada_por: user.id,
        })
        .select("id, folio").single();

      if (error) throw error;

      await supabase.from("vehiculos").update({ status: "en_ruta" }).eq("id", vehiculoId);

      // Crear entregas para cada pedido escaneado
      for (let i = 0; i < cola.length; i++) {
        const item = cola[i];
        const { data: existingEntrega } = await supabase
          .from("entregas").select("id").eq("pedido_id", item.pedidoId).limit(1).maybeSingle();

        if (!existingEntrega) {
          await supabase.from("entregas").insert({
            pedido_id: item.pedidoId, ruta_id: ruta.id, orden_entrega: i + 1,
          });
        } else {
          await supabase.from("entregas").update({ ruta_id: ruta.id, orden_entrega: i + 1 }).eq("id", existingEntrega.id);
        }
      }

      setRutaId(ruta.id);
      setRutaFolio(ruta.folio);
      setHoraInicio(new Date());
      setCameraActive(false);
      setPaso("hoja_carga");
      toast.success(`Ruta ${ruta.folio} creada con ${cola.length} pedido${cola.length > 1 ? "s" : ""}`);
    } catch (err: any) {
      toast.error(`Error al crear ruta: ${err?.message || "intenta de nuevo"}`);
    } finally {
      setCreatingRoute(false);
    }
  };

  // Cancel route (solo si ya existe)
  const handleCancelarRuta = async () => {
    if (!rutaId) {
      // Si no hay ruta creada aún, simplemente cerrar
      onClose();
      return;
    }
    setCancelling(true);
    try {
      const { data: entregasRuta } = await supabase.from("entregas").select("id").eq("ruta_id", rutaId);
      if (entregasRuta && entregasRuta.length > 0) {
        const eIds = entregasRuta.map(e => e.id);
        const { data: cargaProds } = await supabase
          .from("carga_productos").select("id, cargado, lote_id, cantidad_cargada").in("entrega_id", eIds);
        for (const cp of cargaProds || []) {
          if (cp.cargado && cp.lote_id && cp.cantidad_cargada) {
            await supabase.rpc("incrementar_lote", { p_lote_id: cp.lote_id, p_cantidad: cp.cantidad_cargada });
          }
        }
        await supabase.from("carga_productos").delete().in("entrega_id", eIds);
      }
      await supabase.from("entregas").delete().eq("ruta_id", rutaId);
      if (vehiculoId) await supabase.from("vehiculos").update({ status: "disponible" }).eq("id", vehiculoId);
      
      // Regresar pedidos a status "proceso_entrega" para que queden disponibles de nuevo
      for (const item of cola) {
        await supabase.from("pedidos").update({ status: "pendiente" as any, updated_at: new Date().toISOString() }).eq("id", item.pedidoId);
      }
      
      await supabase.from("rutas").delete().eq("id", rutaId);
      toast.success("Ruta eliminada — los pedidos volvieron a quedar disponibles");
      onClose();
    } catch (err: any) {
      toast.error("Error: " + (err?.message || ""));
    } finally {
      setCancelling(false);
    }
  };

  // Finalize
  const handleFinalizarCarga = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const chofer = choferes.find(c => c.id === choferId);

      if (rutaId) {
        await supabase.from("rutas").update({
          carga_completada: true,
          carga_completada_por: user?.id,
          carga_completada_en: new Date().toISOString(),
          status: "cargada",
        }).eq("id", rutaId);
      }

      // Sync carga → pedidos and detect modifications before notifying
      const cambiosPorPedido: Record<string, { modificaciones: { producto: string; cantidadOriginal: number; cantidadNueva: number }[]; totalAnterior: number; totalNuevo: number }> = {};

      if (rutaId) {
        // Get entregas for this ruta
        const { data: entregasRuta } = await supabase
          .from("entregas")
          .select("id, pedido_id")
          .eq("ruta_id", rutaId);

        for (const entrega of entregasRuta || []) {
          const pedidoId = entrega.pedido_id;
          const modificaciones: { producto: string; cantidadOriginal: number; cantidadNueva: number }[] = [];

          const { data: pedidoAnterior } = await supabase
            .from("pedidos")
            .select("total")
            .eq("id", pedidoId)
            .single();
          const totalAnterior = pedidoAnterior?.total || 0;

          const { data: cargaItems } = await supabase
            .from("carga_productos")
            .select("pedido_detalle_id, cantidad_cargada, peso_real_kg, cargado")
            .eq("entrega_id", entrega.id);

          for (const cp of cargaItems || []) {
            if (!cp.cargado || !cp.cantidad_cargada) continue;

            const { data: detalle } = await supabase
              .from("pedidos_detalles")
              .select("precio_unitario, cantidad, kilos_totales, producto:productos(peso_kg, precio_por_kilo, nombre)")
              .eq("id", cp.pedido_detalle_id)
              .single();

            if (!detalle) continue;
            const prod = detalle.producto as any;

            const cantidadCambio = detalle.cantidad !== cp.cantidad_cargada;
            const pesoTeoricoKg = prod?.peso_kg ? cp.cantidad_cargada * prod.peso_kg : null;
            const pesoCambio = cp.peso_real_kg && pesoTeoricoKg && Math.abs(cp.peso_real_kg - pesoTeoricoKg) > 0.1;

            if (cantidadCambio || pesoCambio) {
              if (cantidadCambio) {
                modificaciones.push({
                  producto: prod?.nombre || "Producto",
                  cantidadOriginal: detalle.cantidad,
                  cantidadNueva: cp.cantidad_cargada,
                });
              }

              const newSubtotal = prod?.precio_por_kilo && cp.peso_real_kg
                ? cp.peso_real_kg * detalle.precio_unitario
                : prod?.precio_por_kilo && prod?.peso_kg
                ? cp.cantidad_cargada * prod.peso_kg * detalle.precio_unitario
                : cp.cantidad_cargada * detalle.precio_unitario;

              await supabase.from("pedidos_detalles").update({
                cantidad: cp.cantidad_cargada,
                subtotal: newSubtotal,
                kilos_totales: cp.peso_real_kg || pesoTeoricoKg || detalle.kilos_totales,
              }).eq("id", cp.pedido_detalle_id);
            }
          }

          // Recalculate pedido totals with proper tax breakdown
          const { data: { user } } = await supabase.auth.getUser();
          const result = await recalcularTotalesPedido(pedidoId, modificaciones.length > 0 ? {
            tipoCambio: "almacen_carga",
            cambiosJson: { modificaciones },
            totalAnterior,
            usuarioId: user?.id,
          } : undefined);

          if (modificaciones.length > 0) {
            cambiosPorPedido[pedidoId] = { modificaciones, totalAnterior, totalNuevo: result.total };
          }
        }
      }

      // Track which pedidos were modified for the finalizado screen
      const modifiedIds = new Set(Object.keys(cambiosPorPedido));
      setPedidosModificados(modifiedIds);

      // Notify admin/vendedor for modified pedidos
      for (const [pedidoId, cambios] of Object.entries(cambiosPorPedido)) {
        const item = cola.find(c => c.pedidoId === pedidoId);
        if (!item) continue;
        try {
          // Get vendedor_id to notify
          const { data: pedidoData } = await supabase.from("pedidos").select("vendedor_id").eq("id", pedidoId).single();
          const desc = cambios.modificaciones.map(m => `${m.producto}: ${m.cantidadOriginal}→${m.cantidadNueva}`).join(", ");
          // Notify vendedor
          if (pedidoData?.vendedor_id) {
            await supabase.from("notificaciones").insert({ tipo: "pedido_autorizado", titulo: `⚠️ Pedido ${item.folio} modificado en carga`, descripcion: desc, pedido_id: pedidoId, leida: false });
            await supabase.functions.invoke("send-push-notification", { body: { user_ids: [pedidoData.vendedor_id], title: `⚠️ ${item.folio} modificado en carga`, body: desc } }).catch(() => {});
          }
          // Notify admins
          await supabase.functions.invoke("send-push-notification", { body: { roles: ["admin"], title: `⚠️ ${item.folio} modificado en carga`, body: desc } }).catch(() => {});
          // Mark pedido as modified in carga via notas
          const { data: pedidoNotas } = await supabase.from("pedidos").select("notas").eq("id", pedidoId).single();
          const notasActuales = pedidoNotas?.notas || "";
          await supabase.from("pedidos").update({ notas: `[MODIFICADO EN CARGA] ${desc}\n${notasActuales}`.trim() }).eq("id", pedidoId);
        } catch {}
      }

      const vehiculoObj = vehiculos.find(v => v.id === vehiculoId);
      const ayudantesNombres = ayudantesIds.map(aId => ayudantes.find(a => a.id === aId)?.nombre_completo || "").filter(Boolean);

      const whatsappPendientes: { folio: string; clienteNombre: string; phones: string[]; message: string }[] = [];
      for (const item of cola) {
        await supabase.from("pedidos").update({ status: "en_ruta", updated_at: new Date().toISOString() }).eq("id", item.pedidoId);

        // Generate PDF with real quantities for the client
        let pdfBase64: string | undefined;
        let pdfFilename: string | undefined;
        try {
          const { generarConfirmacionClientePDF } = await import("@/lib/generarNotaPDF");
          const { data: pedidoData } = await supabase
            .from("pedidos")
            .select("total, termino_credito, sucursal:cliente_sucursales(nombre, direccion)")
            .eq("id", item.pedidoId).single();
          const { data: detalles } = await supabase
            .from("pedidos_detalles")
            .select("cantidad, precio_unitario, subtotal, producto:productos(nombre, unidad, peso_kg, precio_por_kilo, aplica_iva, aplica_ieps)")
            .eq("pedido_id", item.pedidoId);

          const productos = (detalles || []).map((d: any) => {
            const pesoKg = d.producto?.peso_kg || 0;
            const kgTotales = pesoKg > 0 ? d.cantidad * pesoKg : null;
            return { cantidad: d.cantidad, unidad: d.producto?.unidad || "pza", descripcion: d.producto?.nombre || "Producto", pesoTotal: kgTotales, precioUnitario: d.precio_unitario, importe: d.subtotal, precioPorKilo: d.producto?.precio_por_kilo || false };
          });
          const pesoTotal = productos.reduce((s: number, p: any) => s + (p.pesoTotal || 0), 0);
          const suc = pedidoData?.sucursal as any;
          const taxItems = (detalles || []).map((d: any) => ({ subtotal: d.subtotal || 0, aplica_iva: d.producto?.aplica_iva ?? true, aplica_ieps: d.producto?.aplica_ieps ?? false }));
          const imp = calcularTotalesConImpuestos(taxItems);

          const cpdf = await generarConfirmacionClientePDF({
            pedidoId: item.pedidoId, folio: item.folio, fecha: new Date().toISOString(),
            vendedor: chofer?.nombre_completo || "Chofer",
            terminoCredito: pedidoData?.termino_credito || "Contado",
            cliente: { nombre: item.clienteNombre },
            sucursal: suc ? { nombre: suc.nombre, direccion: suc.direccion } : undefined,
            productos, subtotal: imp.subtotal, iva: imp.iva, ieps: imp.ieps, total: imp.total, pesoTotalKg: pesoTotal,
          });
          pdfBase64 = cpdf.base64;
          pdfFilename = cpdf.filename;
        } catch (e) { console.error("Error generando PDF en_ruta:", e); }

        try {
          const cambios = cambiosPorPedido[item.pedidoId];
          const { data: notifResponse } = await supabase.functions.invoke("send-client-notification", {
            body: {
              clienteId: item.clienteId,
              tipo: "en_ruta",
              data: {
                pedidoFolio: item.folio,
                choferNombre: chofer?.nombre_completo || "Chofer",
                vehiculoNombre: vehiculoObj ? `${vehiculoObj.nombre}${vehiculoObj.placa ? ` (${vehiculoObj.placa})` : ""}` : undefined,
                ...(cambios ? {
                  modificaciones: cambios.modificaciones,
                  totalAnterior: cambios.totalAnterior,
                  totalNuevo: cambios.totalNuevo,
                } : {}),
              },
              pdfBase64,
              pdfFilename,
            },
          });
          if (notifResponse?.whatsapp?.pending && notifResponse.whatsapp.phones?.length) {
            whatsappPendientes.push({ folio: item.folio, clienteNombre: item.clienteNombre, phones: notifResponse.whatsapp.phones, message: notifResponse.whatsapp.message });
          }
        } catch {}
      }

      // WhatsApp is now sent automatically by the backend via Twilio
      if (whatsappPendientes.length > 0) {
        toast.success(`📱 WhatsApp enviado a ${whatsappPendientes.length} cliente(s)`);
      }

      setPaso("finalizado");
      if (timerRef.current) clearInterval(timerRef.current);
      toast.success("¡Carga completada!");
    } catch (err: any) {
      toast.error("Error al finalizar: " + (err?.message || ""));
    }
  };

  // Totals for scanned orders
  const pesoTotalCola = cola.reduce((s, c) => s + c.pesoKg, 0);
  const montoTotalCola = cola.reduce((s, c) => s + c.total, 0);

  // ─── PASO 1: Escaneo de pedidos (PRIMERO) ───
  if (paso === "escaneo") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h2 className="text-xl font-bold">Escanear Hojas de Carga</h2>
            <p className="text-sm text-muted-foreground">Escanea los QR de los pedidos impresos</p>
          </div>
        </div>

        {/* Camera */}
        {cameraActive && (
          <CameraQrScanner active={cameraActive} onScan={(text) => processScanInput(text)} onClose={() => setCameraActive(false)} />
        )}

        {/* Scan controls */}
        <div className="flex gap-2">
          <Button variant={cameraActive ? "destructive" : "secondary"} size="lg" className="h-12 px-3 shrink-0"
            onClick={() => setCameraActive(!cameraActive)}>
            <Camera className="h-5 w-5" />
          </Button>
          <div className="flex-1 flex items-center h-12 border rounded-md bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
            <input
              type="text"
              placeholder="Folio o últimos dígitos..."
              value={scanInput}
              onChange={e => setScanInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && scanInput.trim()) {
                  processScanInput(scanInput.trim());
                  setScanInput("");
                }
              }}
              className="flex-1 h-full bg-transparent text-base font-semibold outline-none px-3"
            />
          </div>
          <Button onClick={() => { if (scanInput.trim()) { processScanInput(scanInput.trim()); setScanInput(""); } }} size="lg" className="h-12 px-4"
            disabled={!scanInput.trim()}>
            <QrCode className="h-5 w-5 mr-1" />Agregar
          </Button>
        </div>

        {/* Scanned orders list */}
        {cola.length === 0 ? (
          <div className="text-center py-8 space-y-3">
            <div className="mx-auto w-16 h-16 bg-primary/5 border-2 border-dashed border-primary/30 rounded-2xl flex items-center justify-center">
              <QrCode className="h-8 w-8 text-primary/50" />
            </div>
            <p className="text-muted-foreground">Escanea o escribe el folio de cada pedido para agregarlo</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Summary bar */}
            <div className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2 border">
              <span className="text-sm font-medium">{cola.length} pedido{cola.length > 1 ? "s" : ""}</span>
              <div className="flex items-center gap-4 text-sm">
                <span className="font-mono">{Math.round(pesoTotalCola).toLocaleString()} kg</span>
                <span className="font-bold">${Math.round(montoTotalCola).toLocaleString()}</span>
              </div>
            </div>

            {cola.length > 1 && (
              <p className="text-xs text-muted-foreground italic">Orden de entrega: #1 se entrega primero (se carga al último). Usa flechas para reordenar.</p>
            )}

            {cola.map((c, i) => (
              <Card key={c.pedidoId}>
                <CardContent className="py-3 flex items-center gap-2">
                  {cola.length > 1 && (
                    <div className="flex flex-col gap-0.5">
                      <Button variant="ghost" size="icon" className="h-7 w-7" disabled={i === 0}
                        onClick={() => setCola(prev => {
                          const arr = [...prev];
                          [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
                          return arr;
                        })}>
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" disabled={i === cola.length - 1}
                        onClick={() => setCola(prev => {
                          const arr = [...prev];
                          [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
                          return arr;
                        })}>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">#{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm uppercase truncate">{c.clienteNombre}</p>
                      {c.zonaNombre && <Badge variant="outline" className="text-[10px] shrink-0">{c.zonaNombre}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{c.folio} · {c.direccion || "Sin dirección"}</p>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                      <span className="font-mono">{Math.round(c.pesoKg)} kg</span>
                      <span className="font-bold text-foreground">${Math.round(c.total).toLocaleString()}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive shrink-0"
                    onClick={() => setCola(prev => prev.filter(x => x.pedidoId !== c.pedidoId))}>
                    <X className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}

            <Button onClick={handleIrASeleccion} size="lg" className="w-full h-14 text-lg font-bold mt-4">
              <Truck className="h-5 w-5 mr-2" />
              Siguiente: Asignar chofer y unidad
            </Button>
          </div>
        )}
      </div>
    );
  }

  // ─── PASO 2: Selección de personal ───
  if (paso === "seleccion") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setPaso("escaneo")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-xl font-bold">Asignar Personal y Unidad</h2>
            <p className="text-sm text-muted-foreground">{cola.length} pedido{cola.length > 1 ? "s" : ""} · {Math.round(pesoTotalCola).toLocaleString()} kg · ${Math.round(montoTotalCola).toLocaleString()}</p>
          </div>
        </div>

        {loadingOptions ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 max-w-lg">
            {/* Chofer */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2"><User className="h-4 w-4" />Chofer</label>
              <Select value={choferId} onValueChange={(val) => {
                setChoferId(val);
                const v = vehiculos.find(v => v.chofer_asignado_id === val);
                if (v) setVehiculoId(v.id);
              }}>
                <SelectTrigger className="h-12 text-base"><SelectValue placeholder="Selecciona un chofer..." /></SelectTrigger>
                <SelectContent>
                  {choferes.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">No hay choferes disponibles</div>}
                  {choferes.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre_completo}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Vehículo */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2"><Truck className="h-4 w-4" />Vehículo / Unidad</label>
              <Select value={vehiculoId} onValueChange={setVehiculoId}>
                <SelectTrigger className="h-12 text-base"><SelectValue placeholder="Selecciona un vehículo..." /></SelectTrigger>
                <SelectContent>
                  {vehiculos.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">No hay vehículos disponibles</div>}
                  {vehiculos.map(v => <SelectItem key={v.id} value={v.id}>{v.nombre} {v.placa ? `(${v.placa})` : ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Overweight warning */}
            {(() => {
              const veh = vehiculos.find(v => v.id === vehiculoId);
              const maxKg = veh?.peso_maximo_local_kg;
              if (!maxKg || pesoTotalCola <= maxKg) return null;
              const exceso = Math.round(pesoTotalCola - maxKg);
              return (
                <div className="border-2 border-destructive rounded-lg p-3 bg-destructive/5">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-destructive text-sm">Sobrepeso: +{exceso.toLocaleString()} kg</p>
                      <p className="text-xs text-muted-foreground mt-0.5">La carga ({Math.round(pesoTotalCola).toLocaleString()} kg) excede la capacidad del vehículo ({maxKg.toLocaleString()} kg)</p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Ayudantes */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4" />Ayudantes <span className="text-muted-foreground font-normal">(opcional)</span>
              </label>
              {ayudantesIds.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {ayudantesIds.map(aId => {
                    const a = ayudantes.find(x => x.id === aId);
                    return (
                      <Badge key={aId} variant="secondary" className="text-sm py-1 px-3 gap-1">
                        {a?.nombre_completo || "..."}
                        <button type="button" onClick={() => setAyudantesIds(prev => prev.filter(id => id !== aId))} className="ml-1 hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
              <Select value="" onValueChange={val => { if (val && !ayudantesIds.includes(val)) setAyudantesIds(prev => [...prev, val]); }}>
                <SelectTrigger className="h-12 text-base"><SelectValue placeholder="Agregar ayudante..." /></SelectTrigger>
                <SelectContent>
                  {ayudantes.filter(a => !ayudantesIds.includes(a.id)).length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">No hay más ayudantes</div>}
                  {ayudantes.filter(a => !ayudantesIds.includes(a.id)).map(a => <SelectItem key={a.id} value={a.id}>{a.nombre_completo}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleIrACrearRuta} disabled={!choferId || !vehiculoId || creatingRoute} size="lg" className="w-full h-14 text-lg font-bold mt-4">
              {creatingRoute ? (
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-5 w-5 mr-2" />
              )}
              {creatingRoute ? "Creando ruta..." : `Empezar a Cargar (${cola.length} pedido${cola.length > 1 ? "s" : ""})`}
            </Button>
          </div>
        )}
      </div>
    );
  }

  // ─── PASO 3: Hoja de carga interactiva ───
  if (paso === "hoja_carga") {
    const choferObj = choferes.find(c => c.id === choferId);
    const vehiculoObj = vehiculos.find(v => v.id === vehiculoId);
    const ayudantesNombres = ayudantesIds.map(aId => ayudantes.find(a => a.id === aId)?.nombre_completo || "").filter(Boolean);

    return (
      <CargaHojaInteractiva
        rutaId={rutaId!}
        rutaFolio={rutaFolio}
        pedidos={cola}
        tiempoSeg={tiempoSeg}
        formatTiempo={formatTiempo}
        onFinalizar={handleFinalizarCarga}
        onCancelar={handleCancelarRuta}
        onClose={onClose}
        cancelling={cancelling}
        personal={{
          choferNombre: choferObj?.nombre_completo || "",
          ayudantesNombres,
          vehiculoNombre: vehiculoObj?.nombre || "",
          vehiculoPlaca: vehiculoObj?.placa || "",
        }}
      />
    );
  }

  // Reprint handler for modified pedidos
  const handleReimprimir = async (pedidoId: string, folio: string) => {
    setGenerandoPDF(pedidoId);
    try {
      const { generarNotaInternaPDF } = await import("@/lib/generarNotaPDF");
      const { data: ped } = await supabase.from("pedidos").select("total, termino_credito, sucursal:cliente_sucursales(nombre, direccion), vendedor:profiles!pedidos_vendedor_id_fkey(full_name)").eq("id", pedidoId).single();
      const { data: det } = await supabase.from("pedidos_detalles").select("cantidad, precio_unitario, subtotal, producto:productos(nombre, unidad, peso_kg, precio_por_kilo, aplica_iva, aplica_ieps)").eq("pedido_id", pedidoId);
      const cli = cola.find(c => c.pedidoId === pedidoId);
      const productos = (det || []).map((d: any) => {
        const pesoKg = d.producto?.peso_kg || 0;
        const kgTotales = pesoKg > 0 ? d.cantidad * pesoKg : null;
        return { cantidad: d.cantidad, unidad: d.producto?.unidad || "pza", descripcion: d.producto?.nombre || "Producto", pesoTotal: kgTotales, precioUnitario: d.precio_unitario, importe: d.subtotal, precioPorKilo: d.producto?.precio_por_kilo || false };
      });
      const pesoTotal = productos.reduce((s: number, p: any) => s + (p.pesoTotal || 0), 0);
      const suc = ped?.sucursal as any;
      const taxItems2 = (det || []).map((d: any) => ({ subtotal: d.subtotal || 0, aplica_iva: d.producto?.aplica_iva ?? true, aplica_ieps: d.producto?.aplica_ieps ?? false }));
      const imp2 = calcularTotalesConImpuestos(taxItems2);
      const pdf = await generarNotaInternaPDF({
        pedidoId, folio, fecha: new Date().toISOString(),
        vendedor: (ped?.vendedor as any)?.full_name || "Vendedor",
        terminoCredito: ped?.termino_credito || "Contado",
        cliente: { nombre: cli?.clienteNombre || "Cliente" },
        sucursal: suc ? { nombre: suc.nombre, direccion: suc.direccion } : undefined,
        productos, subtotal: imp2.subtotal, iva: imp2.iva, ieps: imp2.ieps, total: imp2.total, pesoTotalKg: pesoTotal,
      });
      // Download the PDF
      const link = document.createElement("a");
      link.href = `data:application/pdf;base64,${pdf.base64}`;
      link.download = pdf.filename;
      link.click();
      toast.success(`PDF ${folio} descargado`);
    } catch (e) {
      console.error("Error reimprimiendo:", e);
      toast.error("Error al generar PDF");
    } finally {
      setGenerandoPDF(null);
    }
  };

  // ─── FINALIZADO ───
  return (
    <div className="flex items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center space-y-4">
          <CheckCircle2 className="h-16 w-16 text-primary mx-auto" />
          <h2 className="text-2xl font-bold">¡Carga completada!</h2>
          <div className="space-y-2 text-muted-foreground">
            <p className="text-lg">{cola.length} pedido{cola.length > 1 ? "s" : ""} cargado{cola.length > 1 ? "s" : ""}</p>
            <div className="flex items-center justify-center gap-2 text-lg">
              <Timer className="h-5 w-5" />
              <span>Tiempo total: <strong className="text-foreground">{formatTiempo(tiempoSeg)}</strong></span>
            </div>
            <p className="text-sm">Los clientes han sido notificados por correo 📧</p>
          </div>

          {pedidosModificados.size > 0 && (
            <div className="border border-amber-300 dark:border-amber-700 rounded-lg p-3 bg-amber-50 dark:bg-amber-950/30 text-left">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-200 mb-1">
                ⚠️ {pedidosModificados.size} pedido{pedidosModificados.size > 1 ? "s" : ""} modificado{pedidosModificados.size > 1 ? "s" : ""} — reimprimir hoja de carga
              </p>
            </div>
          )}

          <div className="space-y-2 pt-2">
            {cola.map((c, i) => {
              const modificado = pedidosModificados.has(c.pedidoId);
              return (
                <div key={i} className="flex items-center gap-2 text-sm justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span className="font-medium">{c.folio}</span>
                    <span className="text-muted-foreground">— {c.clienteNombre}</span>
                    {modificado && <Badge className="text-[10px] bg-amber-500">Modificado</Badge>}
                  </div>
                  {modificado && (
                    <Button variant="outline" size="sm" className="h-7 text-xs" disabled={generandoPDF === c.pedidoId}
                      onClick={() => handleReimprimir(c.pedidoId, c.folio)}>
                      {generandoPDF === c.pedidoId ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                      Reimprimir
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
          <Button onClick={() => { onRutaCreada(); onClose(); }} size="lg" className="w-full mt-4">
            Volver a Rutas
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
