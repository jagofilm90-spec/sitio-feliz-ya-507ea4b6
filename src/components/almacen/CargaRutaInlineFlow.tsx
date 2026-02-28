import { useState, useEffect, useRef, useCallback } from "react";
import { CameraQrScanner } from "@/components/almacen/CameraQrScanner";
import { CargaHojaInteractiva } from "@/components/almacen/CargaHojaInteractiva";
import { supabase } from "@/integrations/supabase/client";
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
  ChevronUp, ChevronDown,
} from "lucide-react";
import { format } from "date-fns";
import { openWhatsApp } from "@/lib/whatsappUtils";

interface PedidoEnCola {
  pedidoId: string;
  folio: string;
  clienteNombre: string;
  clienteId: string;
  sucursalNombre: string | null;
  direccion: string | null;
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
}

interface CargaRutaInlineFlowProps {
  onClose: () => void;
  onRutaCreada: () => void;
}

export const CargaRutaInlineFlow = ({ onClose, onRutaCreada }: CargaRutaInlineFlowProps) => {
  const [paso, setPaso] = useState<"seleccion" | "escaneo" | "hoja_carga" | "finalizado">("seleccion");

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

  // Auto-proceed when exactly 1 pedido is scanned (single-order shortcut)
  useEffect(() => {
    if (paso === "escaneo" && cola.length === 1 && !creatingRoute) {
      autoStartRef.current = setTimeout(() => {
        handleCrearRutaYCargar();
      }, 800);
    }
    return () => { if (autoStartRef.current) clearTimeout(autoStartRef.current); };
  }, [cola.length, paso]);

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
        supabase.from("vehiculos").select("id, nombre, placa, tipo, chofer_asignado_id")
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
  const handleIrAEscaneo = () => {
    if (!choferId || !vehiculoId) {
      toast.error("Selecciona chofer y vehículo");
      return;
    }
    setPaso("escaneo");
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
        .select("id, folio, cliente_id, cliente:clientes(nombre, direccion), sucursal:cliente_sucursales(nombre, direccion, latitud, longitud)")
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

      const whatsappPendientes: { folio: string; clienteNombre: string; phones: string[]; message: string }[] = [];
      for (const item of cola) {
        await supabase.from("pedidos").update({ status: "en_ruta", updated_at: new Date().toISOString() }).eq("id", item.pedidoId);
        try {
          const { data: notifResponse } = await supabase.functions.invoke("send-client-notification", {
            body: { clienteId: item.clienteId, tipo: "en_ruta", data: { pedidoFolio: item.folio, choferNombre: chofer?.nombre_completo || "Chofer" } },
          });
          if (notifResponse?.whatsapp?.pending && notifResponse.whatsapp.phones?.length) {
            whatsappPendientes.push({ folio: item.folio, clienteNombre: item.clienteNombre, phones: notifResponse.whatsapp.phones, message: notifResponse.whatsapp.message });
          }
        } catch {}
      }

      // Open WhatsApp links sequentially for pending notifications
      if (whatsappPendientes.length > 0) {
        for (const wp of whatsappPendientes) {
          openWhatsApp(wp.phones, wp.message);
          toast.info(`📱 WhatsApp pendiente: ${wp.clienteNombre} (${wp.folio})`);
        }
      }

      setPaso("finalizado");
      if (timerRef.current) clearInterval(timerRef.current);
      toast.success("¡Carga completada!");
    } catch (err: any) {
      toast.error("Error al finalizar: " + (err?.message || ""));
    }
  };

  // ─── PASO 1: Selección de personal ───
  if (paso === "seleccion") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-xl font-bold">Preparar Nueva Carga</h2>
            <p className="text-sm text-muted-foreground">Selecciona chofer, ayudantes y vehículo</p>
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

            <Button onClick={handleIrAEscaneo} disabled={!choferId || !vehiculoId} size="lg" className="w-full h-14 text-lg font-bold mt-4">
              <QrCode className="h-5 w-5 mr-2" />
              Escanear QR de Pedidos
            </Button>
          </div>
        )}
      </div>
    );
  }

  // ─── PASO 2: Escaneo de pedidos (SIN ruta creada aún) ───
  if (paso === "escaneo") {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setPaso("seleccion")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h2 className="text-xl font-bold">Escanear Pedidos</h2>
            <p className="text-sm text-muted-foreground">Escanea los códigos QR de los pedidos impresos</p>
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
            <span className="pl-3 text-base font-semibold text-muted-foreground select-none whitespace-nowrap">PED-V-</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="número..."
              value={scanInput}
              onChange={e => setScanInput(e.target.value.replace(/[^0-9]/g, ""))}
              onKeyDown={e => {
                if (e.key === "Enter" && scanInput.trim()) {
                  processScanInput(`PED-V-${scanInput.trim()}`);
                  setScanInput("");
                }
              }}
              className="flex-1 h-full bg-transparent text-base font-semibold outline-none px-1"
            />
          </div>
          <Button onClick={() => { if (scanInput.trim()) { processScanInput(`PED-V-${scanInput.trim()}`); setScanInput(""); } }} size="lg" className="h-12 px-4"
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
            <p className="text-sm font-medium text-muted-foreground">{cola.length} pedido{cola.length > 1 ? "s" : ""} escaneado{cola.length > 1 ? "s" : ""}:</p>
            {cola.length > 1 && (
              <p className="text-xs text-muted-foreground italic">Usa las flechas para definir el orden de entrega (arriba = se carga primero)</p>
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
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-base uppercase truncate">{c.clienteNombre}</p>
                    <p className="text-xs text-muted-foreground">{c.folio}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"
                    onClick={() => setCola(prev => prev.filter(x => x.pedidoId !== c.pedidoId))}>
                    <X className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}

            <Button onClick={handleCrearRutaYCargar} disabled={creatingRoute} size="lg" className="w-full h-14 text-lg font-bold mt-4">
              {creatingRoute ? (
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              ) : (
                <Package className="h-5 w-5 mr-2" />
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
          <div className="space-y-2 pt-2">
            {cola.map((c, i) => (
              <div key={i} className="flex items-center gap-2 text-sm justify-center">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="font-medium">{c.folio}</span>
                <span className="text-muted-foreground">— {c.clienteNombre}</span>
              </div>
            ))}
          </div>
          <Button onClick={() => { onRutaCreada(); onClose(); }} size="lg" className="w-full mt-4">
            Volver a Rutas
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
