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
} from "lucide-react";
import { format } from "date-fns";

interface PedidoEnCola {
  pedidoId: string;
  folio: string;
  clienteNombre: string;
  clienteId: string;
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

  // Ruta
  const [rutaId, setRutaId] = useState<string | null>(null);
  const [rutaFolio, setRutaFolio] = useState("");
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
        .select("chofer_id, vehiculo_id, entregas(id)")
        .eq("fecha_ruta", fechaHoy)
        .not("status", "eq", "cancelada");

      const rutasConCarga = (rutasHoy || []).filter(r => r.entregas && r.entregas.length > 0);
      const choferesEnRuta = new Set(rutasConCarga.map(r => r.chofer_id).filter(Boolean));
      const vehiculosEnRuta = new Set(rutasConCarga.map(r => r.vehiculo_id).filter(Boolean));

      const [empleadosRes, vehiculosRes] = await Promise.all([
        supabase.from("empleados").select("id, nombre_completo, puesto")
          .in("puesto", ["Chofer", "Ayudante de Chofer"]).eq("activo", true).order("nombre_completo"),
        supabase.from("vehiculos").select("id, nombre, placa, tipo, chofer_asignado_id")
          .eq("activo", true).order("nombre"),
      ]);

      const all = empleadosRes.data || [];
      setChoferes(all.filter(e => e.puesto === "Chofer" && !choferesEnRuta.has(e.id)));
      setAyudantes(all.filter(e => e.puesto === "Ayudante de Chofer" && !choferesEnRuta.has(e.id)));
      setVehiculos((vehiculosRes.data || []).filter(v => !vehiculosEnRuta.has(v.id)));
      setLoadingOptions(false);
    };
    load();
  }, []);

  // Create route and move to scanning
  const handleCrearRutaYEscanear = async () => {
    if (!choferId || !vehiculoId) {
      toast.error("Selecciona chofer y vehículo");
      return;
    }

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
          carga_iniciada_en: new Date().toISOString(),
          carga_iniciada_por: user.id,
        })
        .select("id, folio").single();

      if (error) throw error;

      await supabase.from("vehiculos").update({ status: "en_ruta" }).eq("id", vehiculoId);

      setRutaId(ruta.id);
      setRutaFolio(ruta.folio);
      setHoraInicio(new Date());
      setCameraActive(true);
      setPaso("escaneo");
      toast.success(`Ruta ${ruta.folio} creada. Escanea los pedidos.`);
    } catch (err: any) {
      toast.error(`Error: ${err?.message || "intenta de nuevo"}`);
    }
  };

  // QR processing
  const processScanInput = async (input: string) => {
    const almasaMatch = input.match(/^almasa:carga:([a-f0-9-]+)$/i);
    const urlMatch = input.match(/carga-scan\/([a-f0-9-]+)/i);
    const uuidMatch = input.match(/^[a-f0-9-]{36}$/i);
    const folioMatch = input.match(/^(PED-[A-Z]?-?\d+)$/i);
    let id = almasaMatch?.[1] || urlMatch?.[1] || (uuidMatch ? input : null);

    if (!id && folioMatch) {
      const { data } = await supabase.from("pedidos").select("id").eq("folio", folioMatch[1].toUpperCase()).maybeSingle();
      if (data) id = data.id;
    }
    if (!id && input.toUpperCase().startsWith("PED")) {
      const { data } = await supabase.from("pedidos").select("id").eq("folio", input.toUpperCase().trim()).maybeSingle();
      if (data) id = data.id;
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
        .from("pedidos").select("id, folio, cliente_id, cliente:clientes(nombre)").eq("id", id).single();
      if (error || !data) { toast.error("Pedido no encontrado"); return; }

      setCola(prev => [...prev, {
        pedidoId: data.id,
        folio: data.folio,
        clienteNombre: (data.cliente as any)?.nombre || "Sin cliente",
        clienteId: data.cliente_id,
      }]);

      // Create/link entrega
      if (rutaId) {
        let { data: entrega } = await supabase
          .from("entregas").select("id").eq("pedido_id", data.id).limit(1).maybeSingle();

        if (!entrega) {
          await supabase.from("entregas").insert({
            pedido_id: data.id, ruta_id: rutaId, orden_entrega: cola.length + 1,
          });
        } else {
          await supabase.from("entregas").update({ ruta_id: rutaId, orden_entrega: cola.length + 1 }).eq("id", entrega.id);
        }
      }

      toast.success(`Pedido ${data.folio} agregado`);
    } catch {
      toast.error("Error al buscar pedido");
    }
  };

  // Cancel route
  const handleCancelarRuta = async () => {
    if (!rutaId) return;
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
      await supabase.from("rutas").delete().eq("id", rutaId);
      toast.success("Ruta eliminada");
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

      for (const item of cola) {
        await supabase.from("pedidos").update({ status: "en_ruta", updated_at: new Date().toISOString() }).eq("id", item.pedidoId);
        try {
          await supabase.functions.invoke("send-client-notification", {
            body: { clienteId: item.clienteId, tipo: "en_ruta", data: { pedidoFolio: item.folio, choferNombre: chofer?.nombre_completo || "Chofer" } },
          });
        } catch {}
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

            <Button onClick={handleCrearRutaYEscanear} disabled={!choferId || !vehiculoId} size="lg" className="w-full h-14 text-lg font-bold mt-4">
              <QrCode className="h-5 w-5 mr-2" />
              Escanear QR de Pedidos
            </Button>
          </div>
        )}
      </div>
    );
  }

  // ─── PASO 2: Escaneo de pedidos ───
  if (paso === "escaneo") {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">{rutaFolio}</h2>
              <Badge variant="outline">
                <Timer className="h-3 w-3 mr-1" />{formatTiempo(tiempoSeg)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">Escanea los códigos QR de los pedidos impresos</p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={cancelling}>
                {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
                Cancelar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar ruta {rutaFolio}?</AlertDialogTitle>
                <AlertDialogDescription>Se eliminará la ruta y todos los pedidos escaneados.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>No</AlertDialogCancel>
                <AlertDialogAction onClick={handleCancelarRuta} className="bg-destructive text-destructive-foreground">Sí, eliminar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Camera */}
        {cameraActive && (
          <CameraQrScanner active={cameraActive} onScan={(text) => processScanInput(text)} onClose={() => setCameraActive(false)} />
        )}

        {/* Scan controls - Input manual prominente */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-4 space-y-3">
            <p className="text-sm font-medium text-foreground">Escribe o pega el folio del pedido (ej: PED-V-384128)</p>
            <div className="flex gap-2">
              <Input 
                placeholder="Folio del pedido..." 
                value={scanInput}
                onChange={e => setScanInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && scanInput.trim()) { processScanInput(scanInput.trim()); setScanInput(""); } }}
                className="h-14 text-lg font-mono"
                autoFocus
              />
              <Button 
                onClick={() => { if (scanInput.trim()) { processScanInput(scanInput.trim()); setScanInput(""); } }} 
                size="lg" 
                className="h-14 px-6 text-base font-bold shrink-0"
                disabled={!scanInput.trim()}
              >
                <QrCode className="h-5 w-5 mr-2" />Agregar
              </Button>
            </div>
            <Button 
              variant={cameraActive ? "destructive" : "outline"} 
              size="sm"
              onClick={() => setCameraActive(!cameraActive)}
              className="gap-2"
            >
              <Camera className="h-4 w-4" />
              {cameraActive ? "Cerrar Cámara" : "Usar Cámara QR"}
            </Button>
          </CardContent>
        </Card>

        {/* Scanned orders list */}
        {cola.length === 0 ? (
          <div className="text-center py-8 space-y-3">
            <div className="mx-auto w-16 h-16 bg-primary/5 border-2 border-dashed border-primary/30 rounded-2xl flex items-center justify-center">
              <QrCode className="h-8 w-8 text-primary/50" />
            </div>
            <p className="text-muted-foreground">Escribe el folio del pedido arriba y presiona "Agregar"</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{cola.length} pedido{cola.length > 1 ? "s" : ""} escaneado{cola.length > 1 ? "s" : ""}:</p>
            {cola.map((c, i) => (
              <Card key={c.pedidoId}>
                <CardContent className="py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">{i + 1}</div>
                  <div className="flex-1">
                    <p className="font-semibold">{c.folio}</p>
                    <p className="text-sm text-muted-foreground">{c.clienteNombre}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"
                    onClick={() => setCola(prev => prev.filter(x => x.pedidoId !== c.pedidoId))}>
                    <X className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}

            <Button onClick={() => setPaso("hoja_carga")} size="lg" className="w-full h-14 text-lg font-bold mt-4">
              <Package className="h-5 w-5 mr-2" />
              Empezar a Cargar ({cola.length} pedido{cola.length > 1 ? "s" : ""})
            </Button>
          </div>
        )}
      </div>
    );
  }

  // ─── PASO 3: Hoja de carga interactiva ───
  if (paso === "hoja_carga") {
    return (
      <CargaHojaInteractiva
        rutaId={rutaId!}
        rutaFolio={rutaFolio}
        pedidos={cola}
        tiempoSeg={tiempoSeg}
        formatTiempo={formatTiempo}
        onFinalizar={handleFinalizarCarga}
        onCancelar={handleCancelarRuta}
        cancelling={cancelling}
      />
    );
  }

  // ─── FINALIZADO ───
  return (
    <div className="flex items-center justify-center py-12">
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
            <p className="text-sm">Los clientes han sido notificados por correo 📧</p>
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
          <Button onClick={() => { onRutaCreada(); onClose(); }} size="lg" className="w-full mt-4">
            Volver a Rutas
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
