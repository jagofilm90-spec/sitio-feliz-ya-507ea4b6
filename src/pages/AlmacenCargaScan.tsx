import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  QrCode,
  Package,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  Loader2,
  Timer,
  Printer,
  Scale,
  Trash2,
  Truck,
  User,
} from "lucide-react";
import { CargaProductosChecklist } from "@/components/almacen/CargaProductosChecklist";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { format } from "date-fns";

// ─── Types ────────────────────────────────────────────────
interface PedidoEnCola {
  pedidoId: string;
  folio: string;
  clienteNombre: string;
  clienteId: string;
  completado: boolean;
}

interface ProductoCargaScan {
  id: string;
  pedido_detalle_id: string;
  cantidad_solicitada: number;
  cantidad_cargada: number | null;
  cargado: boolean;
  lote_id: string | null;
  peso_real_kg: number | null;
  producto: {
    id: string;
    codigo: string;
    nombre: string;
    marca: string | null;
    especificaciones: string | null;
    contenido_empaque: string | null;
    peso_kg: number | null;
    unidad: string;
    precio_por_kilo: boolean;
  };
  lotes_disponibles: {
    id: string;
    lote_referencia: string | null;
    cantidad_disponible: number;
    fecha_caducidad: string | null;
    bodega_id?: string | null;
    bodega_nombre?: string | null;
  }[];
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
}

// ─── Component ────────────────────────────────────────────
export default function AlmacenCargaScan() {
  const { pedidoId } = useParams<{ pedidoId: string }>();
  const navigate = useNavigate();

  // Pre-scan step: chofer + vehículo selection
  const [paso, setPaso] = useState<"seleccion" | "escaneo">("seleccion");
  const [choferId, setChoferId] = useState<string>("");
  const [vehiculoId, setVehiculoId] = useState<string>("");
  const [choferes, setChoferes] = useState<ChoferOption[]>([]);
  const [vehiculos, setVehiculos] = useState<VehiculoOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [rutaId, setRutaId] = useState<string | null>(null);

  const [cola, setCola] = useState<PedidoEnCola[]>([]);
  const [indiceCola, setIndiceCola] = useState(0);
  const [productos, setProductos] = useState<ProductoCargaScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [horaInicio, setHoraInicio] = useState<Date | null>(null);
  const [tiempoSeg, setTiempoSeg] = useState(0);
  const [finalizado, setFinalizado] = useState(false);
  const [entregaId, setEntregaId] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load choferes and vehículos for selection step
  useEffect(() => {
    const loadOptions = async () => {
      setLoadingOptions(true);
      const [choferesRes, vehiculosRes] = await Promise.all([
        supabase
          .from("empleados")
          .select("id, nombre_completo, puesto")
          .in("puesto", ["Chofer", "Ayudante de Chofer"])
          .eq("activo", true)
          .order("nombre_completo"),
        supabase
          .from("vehiculos")
          .select("id, nombre, placa, tipo")
          .eq("activo", true)
          .eq("status", "disponible")
          .order("nombre"),
      ]);
      setChoferes(choferesRes.data || []);
      setVehiculos(vehiculosRes.data || []);
      setLoadingOptions(false);
    };
    loadOptions();
  }, []);

  // If we arrived via QR with a single pedidoId, skip to scanning after selection
  const pendingPedidoId = useRef(pedidoId || null);

  // Timer
  useEffect(() => {
    if (horaInicio && !finalizado) {
      timerRef.current = setInterval(() => {
        setTiempoSeg(Math.floor((Date.now() - horaInicio.getTime()) / 1000));
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [horaInicio, finalizado]);

  const formatTiempo = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // ─── Start loading: create route and proceed ───
  const handleEmpezarCarga = async () => {
    if (!choferId || !vehiculoId) {
      toast.error("Selecciona chofer y vehículo antes de continuar");
      return;
    }

    try {
      // Generate folio
      const { data: lastRuta } = await supabase
        .from("rutas")
        .select("folio")
        .ilike("folio", "RUT-%")
        .order("folio", { ascending: false })
        .limit(1);

      const lastNumber = lastRuta?.[0]?.folio
        ? parseInt(lastRuta[0].folio.replace("RUT-", ""))
        : 0;
      const newFolio = `RUT-${String(lastNumber + 1).padStart(4, "0")}`;

      const { data: { user } } = await supabase.auth.getUser();

      // Create route
      const { data: ruta, error: rutaError } = await supabase
        .from("rutas")
        .insert({
          folio: newFolio,
          fecha_ruta: format(new Date(), "yyyy-MM-dd"),
          chofer_id: choferId,
          vehiculo_id: vehiculoId,
          tipo_ruta: "local",
          status: "programada",
          almacenista_id: user?.id || null,
          carga_iniciada_en: new Date().toISOString(),
          carga_iniciada_por: user?.id || null,
        })
        .select("id, folio")
        .single();

      if (rutaError) throw rutaError;

      setRutaId(ruta.id);

      // Update vehicle status
      await supabase
        .from("vehiculos")
        .update({ status: "en_ruta" })
        .eq("id", vehiculoId);

      setPaso("escaneo");
      toast.success(`Ruta ${ruta.folio} creada. Empieza a escanear pedidos.`);

      // If we had a pending QR pedidoId, add it now
      if (pendingPedidoId.current) {
        setTimeout(() => agregarPedidoACola(pendingPedidoId.current!), 300);
        pendingPedidoId.current = null;
      }
    } catch (err) {
      console.error(err);
      toast.error("Error al crear la ruta");
    }
  };

  // ─── Add pedido to queue ───
  const agregarPedidoACola = async (id: string) => {
    if (cola.find((c) => c.pedidoId === id)) {
      toast.info("Este pedido ya está en la cola");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("pedidos")
        .select("id, folio, cliente_id, cliente:clientes(nombre)")
        .eq("id", id)
        .single();

      if (error || !data) {
        toast.error("Pedido no encontrado");
        return;
      }

      const nuevo: PedidoEnCola = {
        pedidoId: data.id,
        folio: data.folio,
        clienteNombre: (data.cliente as any)?.nombre || "Sin cliente",
        clienteId: data.cliente_id,
        completado: false,
      };

      setCola((prev) => [...prev, nuevo]);

      // Start timer on first add
      if (!horaInicio) setHoraInicio(new Date());

      // If this is the first or we're idle, load it
      if (cola.length === 0) {
        loadProductosPedido(data.id);
      }

      // Link entrega to the route
      if (rutaId) {
        const { data: entrega } = await supabase
          .from("entregas")
          .select("id")
          .eq("pedido_id", data.id)
          .limit(1)
          .maybeSingle();

        if (entrega) {
          await supabase
            .from("entregas")
            .update({ ruta_id: rutaId, orden_entrega: cola.length + 1 })
            .eq("id", entrega.id);
        }
      }

      toast.success(`Pedido ${data.folio} agregado a la cola`);
    } catch {
      toast.error("Error al buscar pedido");
    }
  };

  // ─── Load products for a pedido via entrega ───
  const loadProductosPedido = async (pedId: string) => {
    setLoading(true);
    try {
      const { data: entrega, error: entregaErr } = await supabase
        .from("entregas")
        .select("id")
        .eq("pedido_id", pedId)
        .limit(1)
        .single();

      if (entregaErr || !entrega) {
        toast.error("No se encontró la entrega para este pedido");
        setLoading(false);
        return;
      }

      setEntregaId(entrega.id);

      let { data: cargaProds, error: cargaErr } = await supabase
        .from("carga_productos")
        .select("id, pedido_detalle_id, cantidad_solicitada, cantidad_cargada, cargado, lote_id, peso_real_kg")
        .eq("entrega_id", entrega.id);

      if (cargaErr) throw cargaErr;

      if (!cargaProds || cargaProds.length === 0) {
        const { data: detalles } = await supabase
          .from("pedidos_detalles")
          .select("id, cantidad")
          .eq("pedido_id", pedId);

        if (detalles && detalles.length > 0) {
          const nuevos = detalles.map((d) => ({
            entrega_id: entrega.id,
            pedido_detalle_id: d.id,
            cantidad_solicitada: d.cantidad,
            cantidad_cargada: 0,
            cargado: false,
          }));

          const { data: insertados } = await supabase
            .from("carga_productos")
            .insert(nuevos)
            .select("id, pedido_detalle_id, cantidad_solicitada, cantidad_cargada, cargado, lote_id, peso_real_kg");

          cargaProds = insertados;
        }
      }

      const enriched: ProductoCargaScan[] = [];
      for (const cp of cargaProds || []) {
        const { data: detalle } = await supabase
          .from("pedidos_detalles")
          .select("producto:productos(id, codigo, nombre, marca, especificaciones, contenido_empaque, peso_kg, unidad, precio_por_kilo)")
          .eq("id", cp.pedido_detalle_id)
          .single();

        const prod = (detalle?.producto as any) || {
          id: "", codigo: "N/A", nombre: "N/A", marca: null,
          especificaciones: null, contenido_empaque: null,
          peso_kg: null, unidad: "unidad", precio_por_kilo: false,
        };

        const { data: lotes } = await supabase
          .from("inventario_lotes")
          .select("id, lote_referencia, cantidad_disponible, fecha_caducidad, bodega_id, bodega:bodegas(nombre)")
          .eq("producto_id", prod.id)
          .gt("cantidad_disponible", 0)
          .order("fecha_caducidad", { ascending: true, nullsFirst: false });

        enriched.push({
          ...cp,
          peso_real_kg: cp.peso_real_kg ?? null,
          producto: prod,
          lotes_disponibles: (lotes || []).map((l) => ({
            id: l.id,
            lote_referencia: l.lote_referencia,
            cantidad_disponible: l.cantidad_disponible,
            fecha_caducidad: l.fecha_caducidad,
            bodega_id: l.bodega_id,
            bodega_nombre: (l.bodega as any)?.nombre || null,
          })),
        });
      }

      setProductos(enriched);
    } catch (err) {
      console.error(err);
      toast.error("Error al cargar productos");
    } finally {
      setLoading(false);
    }
  };

  // ─── Handle toggle from checklist ───
  const handleToggle = async (cargaId: string, cargado: boolean, cantidadCargada: number, loteId: string | null) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (cargado && loteId) {
        const prod = productos.find((p) => p.id === cargaId);
        if (!prod) return;

        await supabase.rpc("decrementar_lote", { p_lote_id: loteId, p_cantidad: cantidadCargada });

        await supabase.from("inventario_movimientos").insert({
          producto_id: prod.producto.id,
          tipo_movimiento: "salida",
          cantidad: cantidadCargada,
          motivo: "Carga de pedido (escaneo QR)",
          lote_id: loteId,
          referencia_id: entregaId,
          usuario_id: user?.id,
        });

        await supabase.from("carga_productos").update({
          cargado: true,
          cantidad_cargada: cantidadCargada,
          lote_id: loteId,
          cargado_en: new Date().toISOString(),
          cargado_por: user?.id,
        }).eq("id", cargaId);
      } else if (!cargado) {
        const prod = productos.find((p) => p.id === cargaId);
        if (prod?.lote_id && prod.cantidad_cargada) {
          await supabase.rpc("incrementar_lote", { p_lote_id: prod.lote_id, p_cantidad: prod.cantidad_cargada });
        }

        await supabase.from("carga_productos").update({
          cargado: false,
          cantidad_cargada: 0,
          lote_id: null,
          cargado_en: null,
          cargado_por: null,
        }).eq("id", cargaId);
      }

      setProductos((prev) =>
        prev.map((p) =>
          p.id === cargaId
            ? { ...p, cargado, cantidad_cargada: cargado ? cantidadCargada : 0, lote_id: cargado ? loteId : null }
            : p
        )
      );
    } catch (err) {
      console.error(err);
      toast.error("Error al actualizar producto");
    }
  };

  // ─── Handle peso real change ───
  const handlePesoRealChange = async (cargaId: string, pesoReal: number | null) => {
    await supabase.from("carga_productos").update({ peso_real_kg: pesoReal }).eq("id", cargaId);
    setProductos((prev) =>
      prev.map((p) => (p.id === cargaId ? { ...p, peso_real_kg: pesoReal } : p))
    );
  };

  // ─── Save current pedido and advance ───
  const guardarYSiguiente = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (entregaId) {
        await supabase.from("entregas").update({
          carga_confirmada: true,
          carga_confirmada_por: user?.id,
          carga_confirmada_en: new Date().toISOString(),
        }).eq("id", entregaId);
      }

      // Mark current item as complete
      setCola((prev) =>
        prev.map((c, i) => (i === indiceCola ? { ...c, completado: true } : c))
      );

      const siguiente = indiceCola + 1;
      if (siguiente < cola.length) {
        setIndiceCola(siguiente);
        await loadProductosPedido(cola[siguiente].pedidoId);
      } else {
        // All done — finalize
        await finalizarCarga();
      }

      toast.success("Pedido guardado");
    } catch (err) {
      console.error(err);
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  // ─── Finalize: update statuses + send emails ───
  const finalizarCarga = async () => {
    setFinalizado(true);
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Get chofer name for email
      const chofer = choferes.find(c => c.id === choferId);
      const choferNombre = chofer?.nombre_completo || "Chofer";

      // Mark route as loaded
      if (rutaId) {
        await supabase.from("rutas").update({
          carga_completada: true,
          carga_completada_por: user?.id,
          carga_completada_en: new Date().toISOString(),
          status: "cargada",
        }).eq("id", rutaId);
      }

      // Update each pedido to "en_ruta" and send notification
      for (const item of cola) {
        // Update pedido status
        await supabase
          .from("pedidos")
          .update({ status: "en_ruta", updated_at: new Date().toISOString() })
          .eq("id", item.pedidoId);

        // Send "en_ruta" notification email to client
        try {
          await supabase.functions.invoke("send-client-notification", {
            body: {
              clienteId: item.clienteId,
              tipo: "en_ruta",
              data: {
                pedidoFolio: item.folio,
                choferNombre,
              },
            },
          });
          console.log(`Email en_ruta enviado para pedido ${item.folio}`);
        } catch (emailErr) {
          console.error(`Error enviando email para ${item.folio}:`, emailErr);
        }
      }
    } catch (err) {
      console.error("Error al finalizar carga:", err);
      toast.error("Error al actualizar estados");
    }
  };

  // ─── QR scan input (manual fallback) ───
  const [scanInput, setScanInput] = useState("");
  const handleScanSubmit = () => {
    const input = scanInput.trim();
    const almasaMatch = input.match(/^almasa:carga:([a-f0-9-]+)$/i);
    const urlMatch = input.match(/carga-scan\/([a-f0-9-]+)/i);
    const uuidMatch = input.match(/^[a-f0-9-]{36}$/i);
    const id = almasaMatch?.[1] || urlMatch?.[1] || (uuidMatch ? input : null);
    if (id) {
      agregarPedidoACola(id);
      setScanInput("");
    } else {
      toast.error("Código QR no válido. Escanea un pedido de ALMASA.");
    }
  };

  const pedidoActual = cola[indiceCola];
  const todosCargados = productos.length > 0 && productos.every((p) => p.cargado);
  const cargados = productos.filter((p) => p.cargado).length;
  const progreso = productos.length > 0 ? (cargados / productos.length) * 100 : 0;

  // ─── Step 1: Chofer + Vehicle selection ───
  if (paso === "seleccion") {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-background border-b p-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/almacen-tablet")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-bold text-lg">Preparar Carga</h1>
          </div>
        </div>

        <div className="p-4 space-y-6 max-w-md mx-auto">
          <div className="text-center space-y-2 py-4">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Truck className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold">Selecciona Chofer y Unidad</h2>
            <p className="text-muted-foreground text-sm">
              Antes de escanear, asigna el chofer y el vehículo para esta carga
            </p>
          </div>

          {loadingOptions ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Chofer */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Chofer
                </label>
                <Select value={choferId} onValueChange={setChoferId}>
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue placeholder="Selecciona un chofer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {choferes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nombre_completo} ({c.puesto})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Vehículo */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Vehículo / Unidad
                </label>
                <Select value={vehiculoId} onValueChange={setVehiculoId}>
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue placeholder="Selecciona un vehículo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vehiculos.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.nombre} {v.placa ? `(${v.placa})` : ""} {v.tipo ? `— ${v.tipo}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleEmpezarCarga}
                disabled={!choferId || !vehiculoId}
                size="lg"
                className="w-full h-14 text-lg font-bold mt-4"
              >
                <QrCode className="h-5 w-5 mr-2" />
                Empezar a Cargar
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Finalized summary ───
  if (finalizado) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold">¡Carga completada!</h2>
            <div className="space-y-2 text-muted-foreground">
              <p className="text-lg">{cola.length} pedido{cola.length > 1 ? "s" : ""} cargado{cola.length > 1 ? "s" : ""}</p>
              <div className="flex items-center justify-center gap-2 text-lg">
                <Timer className="h-5 w-5" />
                <span>Tiempo total: <strong className="text-foreground">{formatTiempo(tiempoSeg)}</strong></span>
              </div>
              <p className="text-sm">
                Los clientes han sido notificados por correo 📧
              </p>
            </div>
            <div className="space-y-2 pt-2">
              {cola.map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-sm justify-center">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="font-medium">{c.folio}</span>
                  <span className="text-muted-foreground">— {c.clienteNombre}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => navigate("/almacen-tablet")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
              <Button className="flex-1" onClick={() => toast.info("PDFs corregidos disponibles pronto")}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimir PDFs
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Step 2: Scanning + Loading ───
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b p-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/almacen-tablet")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-bold text-lg">Carga por Escaneo</h1>
            {horaInicio && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Timer className="h-3.5 w-3.5" />
                {formatTiempo(tiempoSeg)}
                <span>•</span>
                <span>{cola.filter((c) => c.completado).length}/{cola.length} pedidos</span>
              </div>
            )}
          </div>
        </div>

        {/* Scan input */}
        <div className="flex gap-2 mt-2">
          <Input
            placeholder="Escanea código QR del pedido..."
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleScanSubmit()}
            className="h-12 text-base"
          />
          <Button onClick={handleScanSubmit} size="lg" className="h-12 px-4">
            <QrCode className="h-5 w-5 mr-1" />
            Agregar
          </Button>
        </div>

        {/* Queue pills */}
        {cola.length > 1 && (
          <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
            {cola.map((c, i) => (
              <Badge
                key={i}
                variant={i === indiceCola ? "default" : c.completado ? "secondary" : "outline"}
                className={`whitespace-nowrap text-xs ${c.completado ? "line-through opacity-60" : ""}`}
              >
                {i + 1}. {c.folio}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Main content */}
      {!pedidoActual ? (
        <div className="flex flex-col items-center justify-center p-12 text-center gap-6">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl scale-150" />
            <div className="relative bg-primary/5 border-2 border-dashed border-primary/30 rounded-3xl p-8">
              <QrCode className="h-20 w-20 text-primary/60" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">¡Listo para cargar!</h2>
            <p className="text-lg text-muted-foreground max-w-sm">
              Escanea el <strong className="text-foreground">código QR</strong> de cada pedido impreso en el orden que necesitas cargar
            </p>
          </div>
          <div className="bg-muted/50 rounded-xl p-4 max-w-sm space-y-3">
            <p className="text-sm font-medium text-foreground">📋 Pasos:</p>
            <ol className="text-sm text-muted-foreground space-y-2 text-left">
              <li className="flex gap-2">
                <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0">1</span>
                <span>Pide al chofer el <strong>orden de entrega</strong></span>
              </li>
              <li className="flex gap-2">
                <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0">2</span>
                <span>Escanea primero el pedido que va <strong>al fondo</strong> del camión</span>
              </li>
              <li className="flex gap-2">
                <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0">3</span>
                <span>Confirma peso y cantidad de cada producto</span>
              </li>
              <li className="flex gap-2">
                <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0">4</span>
                <span>Al terminar, se notifica al cliente y se genera la ruta</span>
              </li>
            </ol>
          </div>
          <p className="text-xs text-muted-foreground">También puedes pegar la URL o ID del pedido en el campo de arriba</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="p-3 space-y-3">
          {/* Current order header */}
          <Card>
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Pedido {indiceCola + 1} de {cola.length}
                  </p>
                  <p className="font-bold text-lg">{pedidoActual.folio}</p>
                  <p className="text-sm text-muted-foreground">{pedidoActual.clienteNombre}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{cargados}/{productos.length}</p>
                  <Progress value={progreso} className="w-24 h-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Products with peso real */}
          <div className="space-y-2">
            {productos.map((prod) => (
              <ProductoCargaConPeso
                key={prod.id}
                producto={prod}
                onToggle={handleToggle}
                onPesoRealChange={handlePesoRealChange}
              />
            ))}
          </div>

          {/* Action button */}
          <Button
            onClick={guardarYSiguiente}
            disabled={!todosCargados || saving}
            size="lg"
            className="w-full h-14 text-lg font-bold"
          >
            {saving ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : indiceCola < cola.length - 1 ? (
              <>
                Guardar y Siguiente
                <ChevronRight className="h-5 w-5 ml-2" />
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5 mr-2" />
                Finalizar Carga
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Product item with peso real field ───
function ProductoCargaConPeso({
  producto,
  onToggle,
  onPesoRealChange,
}: {
  producto: ProductoCargaScan;
  onToggle: (id: string, cargado: boolean, cantidad: number, loteId: string | null) => void;
  onPesoRealChange: (id: string, peso: number | null) => void;
}) {
  const [cantidadCargada, setCantidadCargada] = useState(
    producto.cantidad_cargada || producto.cantidad_solicitada
  );
  const [pesoReal, setPesoReal] = useState<string>(
    producto.peso_real_kg?.toString() || ""
  );
  const [loteId, setLoteId] = useState(
    producto.lote_id || producto.lotes_disponibles[0]?.id || null
  );

  const esPorKilo = producto.producto.precio_por_kilo;
  const pesoTeorico = esPorKilo && producto.producto.peso_kg
    ? cantidadCargada * producto.producto.peso_kg
    : null;

  const handleCargar = () => {
    if (!loteId) {
      toast.error("Selecciona un lote");
      return;
    }
    onToggle(producto.id, true, cantidadCargada, loteId);

    if (esPorKilo && pesoReal) {
      onPesoRealChange(producto.id, parseFloat(pesoReal));
    }
  };

  const handleDescargar = () => {
    onToggle(producto.id, false, 0, null);
    onPesoRealChange(producto.id, null);
    setPesoReal("");
  };

  return (
    <Card className={producto.cargado ? "border-green-300 bg-green-50 dark:bg-green-950/20" : ""}>
      <CardContent className="py-3 space-y-2">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${producto.cargado ? "bg-green-500" : "bg-muted"}`} />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">
              {producto.producto.codigo} — {producto.producto.nombre}
            </p>
            <p className="text-xs text-muted-foreground">
              {producto.cantidad_solicitada} {producto.producto.unidad} solicitados
              {pesoTeorico != null && (
                <span> • Peso teórico: {pesoTeorico.toFixed(1)} kg</span>
              )}
            </p>
          </div>
          {producto.cargado && <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />}
        </div>

        {!producto.cargado ? (
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-3">
              <label className="text-sm text-muted-foreground w-24">Cantidad:</label>
              <Input
                type="number"
                inputMode="numeric"
                value={cantidadCargada}
                onChange={(e) => setCantidadCargada(parseFloat(e.target.value) || 0)}
                className="w-24 h-10 text-center font-medium"
              />
            </div>

            {esPorKilo && (
              <div className="flex items-center gap-3">
                <label className="text-sm text-muted-foreground w-24 flex items-center gap-1">
                  <Scale className="h-3.5 w-3.5" />
                  Peso real:
                </label>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder={pesoTeorico ? `${pesoTeorico.toFixed(1)} teórico` : "kg"}
                  value={pesoReal}
                  onChange={(e) => setPesoReal(e.target.value)}
                  className="w-28 h-10 text-center font-medium"
                />
                <span className="text-sm text-muted-foreground">kg</span>
              </div>
            )}

            {producto.lotes_disponibles.length > 0 ? (
              <div className="flex items-center gap-3">
                <label className="text-sm text-muted-foreground w-24">Lote:</label>
                <select
                  value={loteId || ""}
                  onChange={(e) => setLoteId(e.target.value)}
                  className="flex-1 h-10 rounded-md border bg-background px-3 text-sm"
                >
                  {producto.lotes_disponibles.map((l, i) => (
                    <option key={l.id} value={l.id}>
                      {i === 0 ? "⭐ " : ""}
                      {l.lote_referencia || "Sin ref"} — {l.cantidad_disponible} disp.
                      {l.bodega_nombre ? ` (${l.bodega_nombre})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <p className="text-xs text-destructive">⚠ Sin lotes disponibles</p>
            )}

            <Button onClick={handleCargar} className="w-full h-12 text-base" disabled={!loteId}>
              <Package className="h-4 w-4 mr-2" />
              Confirmar Carga
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between pt-1">
            <div className="text-xs text-muted-foreground">
              Cargado: {producto.cantidad_cargada} {producto.producto.unidad}
              {producto.peso_real_kg != null && ` • ${producto.peso_real_kg} kg reales`}
            </div>
            <Button variant="ghost" size="sm" onClick={handleDescargar} className="text-destructive">
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Desmarcar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
