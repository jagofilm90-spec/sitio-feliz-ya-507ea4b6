import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useChoferGeolocation } from "@/hooks/useChoferGeolocation";
import { useSystemPresence } from "@/hooks/useSystemPresence";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Truck, MapPin, Package, User, LogOut, Navigation, RefreshCw } from "lucide-react";
import { AlmasaLogo } from "@/components/brand/AlmasaLogo";
import { CentroNotificaciones } from "@/components/CentroNotificaciones";
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
import { buttonVariants } from "@/components/ui/button";
import { NoRutaCard } from "@/components/chofer/NoRutaCard";
import { EntregaCard } from "@/components/chofer/EntregaCard";
import { ResumenRuta } from "@/components/chofer/ResumenRuta";
import { GpsTrackingIndicator } from "@/components/rutas/GpsTrackingIndicator";
// PushNotificationSetup removed - now handled centrally by PushNotificationsGate in App.tsx
import { LiveIndicator } from "@/components/ui/live-indicator";
import { AvatarEmpleadoPopover } from "@/components/almacen/AvatarEmpleadoPopover";
import { LocationPermissionRequest } from "@/components/chofer/LocationPermissionRequest";
import { isNativePlatform } from "@/services/backgroundGeolocation";
import { COMPANY_DATA } from "@/constants/companyData";

export default function ChoferPanel() {
  const navigate = useNavigate();
  const { isChofer, isAdmin, isLoading: rolesLoading } = useUserRoles();
  
  // Track presence in chofer panel
  useSystemPresence('chofer');
  
  const [loading, setLoading] = useState(true);
  const [ruta, setRuta] = useState<any>(null);
  const [entregas, setEntregas] = useState<any[]>([]);
  const [choferNombre, setChoferNombre] = useState("");
  const [choferId, setChoferId] = useState<string | null>(null);
  const [choferFotoUrl, setChoferFotoUrl] = useState<string | null>(null);
  const [choferEmail, setChoferEmail] = useState<string | null>(null);
  const [showResumen, setShowResumen] = useState(false);
  const [showPermissionRequest, setShowPermissionRequest] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  // GPS Tracking - only enabled when route is in progress and permissions granted
  const isRutaActiva = ruta && ['en_ruta', 'cargada'].includes(ruta.status);
  const shouldTrack = isRutaActiva && (permissionGranted || !isNativePlatform());
  
  const { isTracking, accuracy, error: gpsError, isNative } = useChoferGeolocation({
    rutaId: ruta?.id || null,
    choferId: choferId,
    enabled: shouldTrack,
  });

  // Show permission dialog on native when route becomes active
  useEffect(() => {
    if (isRutaActiva && isNativePlatform() && !permissionGranted && !showPermissionRequest) {
      // Small delay to let the UI settle
      const timer = setTimeout(() => setShowPermissionRequest(true), 500);
      return () => clearTimeout(timer);
    }
  }, [isRutaActiva, permissionGranted, showPermissionRequest]);

  useEffect(() => {
    if (!rolesLoading && !isChofer && !isAdmin) {
      toast.error("No tienes acceso a esta sección");
      navigate("/");
    }
  }, [rolesLoading, isChofer, isAdmin, navigate]);

  useEffect(() => {
    if (!rolesLoading && (isChofer || isAdmin)) {
      fetchRutaDelDia();
    }
  }, [rolesLoading, isChofer, isAdmin]);

  const fetchRutaDelDia = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: empleado } = await supabase
        .from("empleados")
        .select("id, nombre_completo, foto_url, email")
        .eq("user_id", user.id)
        .maybeSingle();

      if (empleado) {
        setChoferId(empleado.id);
        setChoferNombre(empleado.nombre_completo);
        setChoferFotoUrl(empleado.foto_url);
        setChoferEmail(empleado.email);
      }

      const hoy = format(new Date(), "yyyy-MM-dd");

      let query = supabase
        .from("rutas")
        .select(`id, folio, fecha_ruta, status, tipo_ruta, distancia_total_km,
          vehiculo:vehiculos(id, nombre, placa),
          ayudante:empleados!rutas_ayudante_id_fkey(id, nombre_completo),
          ayudante_externo:ayudantes_externos(id, nombre_completo)`)
        .eq("fecha_ruta", hoy)
        .in("status", ["programada", "cargando", "cargada", "en_ruta"]);

      if (!isAdmin && empleado) query = query.eq("chofer_id", empleado.id);

      const { data: rutaData } = await query.limit(1).maybeSingle();
      if (!rutaData) { setRuta(null); setEntregas([]); setLoading(false); return; }

      setRuta(rutaData);

      const { data: entregasData } = await supabase
        .from("entregas")
        .select(`id, orden_entrega, entregado, status_entrega, nombre_receptor, firma_recibido, hora_entrega_real, notas,
          pedido:pedidos(id, folio, peso_total_kg, notas,
            cliente:clientes(id, nombre),
            sucursal:cliente_sucursales(id, nombre, direccion, latitud, longitud, telefono, contacto, horario_entrega),
            detalles:pedidos_detalles(id, cantidad, es_cortesia, producto:productos(id, nombre, unidad)))`)
        .eq("ruta_id", rutaData.id)
        .order("orden_entrega", { ascending: true });

      setEntregas(entregasData || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar la ruta");
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizarRuta = async () => {
    if (!ruta) return;
    const { error } = await supabase.from("rutas").update({ status: "completada" }).eq("id", ruta.id);
    if (error) { toast.error("Error al finalizar"); return; }
    toast.success("¡Ruta finalizada!");
    setShowResumen(false);
    fetchRutaDelDia();
  };

  useEffect(() => {
    if (entregas.length > 0) {
      const todas = entregas.every(e => ["entregado", "rechazado", "parcial"].includes(e.status_entrega));
      if (todas) setShowResumen(true);
    }
  }, [entregas]);

  if (rolesLoading || loading) {
    return <div className="min-h-screen bg-background p-4"><Skeleton className="h-24 w-full mb-4" /><Skeleton className="h-40 w-full" /></div>;
  }

  const completadas = entregas.filter(e => ["entregado", "rechazado", "parcial"].includes(e.status_entrega)).length;
  const progreso = entregas.length > 0 ? Math.round((completadas / entregas.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* PushNotificationSetup removed - handled by PushNotificationsGate */}
      <header className="sticky top-0 z-50 bg-white border-b border-ink-100 px-4 py-3" style={{ borderBottomWidth: '0.5px' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <AlmasaLogo size={32} />
              <div style={{ lineHeight: 1 }}>
                <div className="font-serif text-[20px] font-semibold text-crimson-500 tracking-wide" style={{ lineHeight: 1, letterSpacing: '0.03em' }}>ALMASA</div>
                <div className="text-[9px] uppercase tracking-[0.18em] text-ink-500 mt-1 font-medium">Sistema · 1904</div>
              </div>
            </div>
            <div className="h-10 w-px bg-ink-100" />
            <div>
              <h1 className="font-serif text-[20px] font-medium text-ink-900" style={{ lineHeight: 1.1 }}>Panel del Chofer</h1>
              <p className="text-[12px] text-ink-500">{format(new Date(), "EEEE d 'de' MMMM", { locale: es })}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {choferNombre && (
              <div className="flex items-center gap-2">
                <AvatarEmpleadoPopover
                  empleadoId={choferId}
                  empleadoNombre={choferNombre}
                  empleadoPuesto="Chofer"
                  empleadoEmail={choferEmail || undefined}
                  fotoUrl={choferFotoUrl}
                  onFotoUpdated={(newUrl) => setChoferFotoUrl(newUrl)}
                />
                <span className="text-sm text-ink-700 hidden md:inline">{choferNombre}</span>
              </div>
            )}
            {isRutaActiva && (
              <GpsTrackingIndicator isTracking={isTracking} accuracy={accuracy} error={gpsError} />
            )}
            <CentroNotificaciones />
            <LiveIndicator label="En vivo" className="text-ink-500" />
            <Button variant="ghost" size="icon" onClick={() => setShowLogoutDialog(true)} className="text-ink-500 hover:bg-ink-50">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="p-4 pb-8 md:pb-8 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        {!ruta ? (
          <NoRutaCard onRefresh={fetchRutaDelDia} />
        ) : (
          <div className="max-w-4xl mx-auto">
            <Card className="mb-4">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2"><Navigation className="h-5 w-5 text-primary" />Ruta {ruta.folio}</CardTitle>
                  <Badge variant={ruta.tipo_ruta === "foraneo" ? "secondary" : "outline"}>{ruta.tipo_ruta === "foraneo" ? "Foráneo" : "Local"}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                  <div className="flex items-center gap-2"><Truck className="h-4 w-4 text-muted-foreground" /><span>{ruta.vehiculo?.nombre || "Sin vehículo"} {ruta.vehiculo?.placas && `(${ruta.vehiculo.placas})`}</span></div>
                  {(ruta.ayudante || ruta.ayudante_externo) && <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /><span>Ayudante: {ruta.ayudante?.nombre_completo || ruta.ayudante_externo?.nombre_completo}</span></div>}
                  {ruta.distancia_total_km && <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /><span>{ruta.distancia_total_km} km</span></div>}
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm mb-1"><span className="text-muted-foreground">Progreso</span><span className="font-medium">{completadas}/{entregas.length} entregas</span></div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary transition-all" style={{ width: `${progreso}%` }} /></div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <h2 className="font-semibold flex items-center gap-2"><Package className="h-5 w-5" />Entregas del día ({entregas.length})</h2>
              <ScrollArea className="h-[calc(100vh-340px)] md:h-[calc(100vh-300px)]">
                <div className="space-y-3 pr-2">
                  {entregas.map((entrega) => <EntregaCard key={entrega.id} entrega={entrega} onEntregaActualizada={fetchRutaDelDia} />)}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}
      </main>

      {showResumen && ruta && <ResumenRuta ruta={ruta} entregas={entregas} onFinalizar={handleFinalizarRuta} onCerrar={() => setShowResumen(false)} />}
      
      {/* Location permission request dialog for native apps */}
      <LocationPermissionRequest
        open={showPermissionRequest}
        onPermissionGranted={() => {
          setPermissionGranted(true);
          setShowPermissionRequest(false);
          toast.success('Ubicación activada');
        }}
        onDismiss={() => setShowPermissionRequest(false)}
      />

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cerrar sesión?</AlertDialogTitle>
            <AlertDialogDescription>Se cerrará tu sesión en el sistema</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className={buttonVariants({ variant: "destructive" })} onClick={() => { supabase.auth.signOut(); navigate("/auth"); }}>
              Sí, cerrar sesión
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
