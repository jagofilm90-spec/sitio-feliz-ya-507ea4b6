import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { 
  Package, 
  Truck, 
  Calendar,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Timer,
} from "lucide-react";
import { AlmacenCargaRutasTab } from "@/components/almacen/AlmacenCargaRutasTab";
import { AlmacenRecepcionTab } from "@/components/almacen/AlmacenRecepcionTab";
import { AlmacenFumigacionesTab } from "@/components/almacen/AlmacenFumigacionesTab";
import { AlmacenInventarioTab } from "@/components/almacen/AlmacenInventarioTab";
import { AlmacenProductosTab } from "@/components/almacen/AlmacenProductosTab";
import { AlmacenVentasMostradorTab } from "@/components/almacen/AlmacenVentasMostradorTab";
import { ReporteRecepcionesDiaTab } from "@/components/almacen/ReporteRecepcionesDiaTab";
import { ReporteCaducidadTab } from "@/components/almacen/ReporteCaducidadTab";
import PersonalFlotillaTab from "@/components/almacen/PersonalFlotillaTab";
import VehiculosTab from "@/components/rutas/VehiculosTab";
import DisponibilidadPersonalTab from "@/components/rutas/DisponibilidadPersonalTab";
import AyudantesExternosTab from "@/components/rutas/AyudantesExternosTab";
import { AlertasFlotillaPanel } from "@/components/almacen/AlertasFlotillaPanel";
import { VehiculoCheckupsTab } from "@/components/almacen/VehiculoCheckupsTab";
import { AlmacenSidebar } from "@/components/almacen/AlmacenSidebar";
import { AlmacenMobileNav } from "@/components/almacen/AlmacenMobileNav";
import { LiveIndicator } from "@/components/ui/live-indicator";
import { UserPreferencesPopover } from "@/components/UserPreferencesPopover";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useSystemPresence } from "@/hooks/useSystemPresence";
import { useShowMobileNav, useIsMobile, useIsTablet, useHasPointer, useIsTabletWithMouse } from "@/hooks/use-mobile";
import { COMPANY_DATA } from "@/constants/companyData";

const AlmacenTablet = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [activeTab, setActiveTab] = useState("rutas");
  const [refreshKey, setRefreshKey] = useState(0);
  const [empleadoId, setEmpleadoId] = useState<string | null>(null);
  const [empleadoNombre, setEmpleadoNombre] = useState<string>("");
  const [empleadoPuesto, setEmpleadoPuesto] = useState<string>("");
  const [empleadoEmail, setEmpleadoEmail] = useState<string>("");
  const [empleadoFotoUrl, setEmpleadoFotoUrl] = useState<string | null>(null);
  const navigate = useNavigate();
  const { isGerenteAlmacen, isAdmin, isLoading: rolesLoading } = useUserRoles();
  
  // Track presence in almacen
  useSystemPresence('almacen');

  // El gerente de almacén ve tabs adicionales de flotilla
  // IMPORTANTE: Solo evaluar después de que los roles hayan cargado
  const showFlotillaTabs = !rolesLoading && (isGerenteAlmacen || isAdmin);

  // Stats
  const [rutasStats, setRutasStats] = useState({ total: 0, pendientes: 0, completadas: 0, entregas: 0 });
  const [recepcionStats, setRecepcionStats] = useState({ pendientes: 0, recibidas: 0 });
  const [fumigacionStats, setFumigacionStats] = useState({ vencidas: 0, proximas: 0, vigentes: 0 });
  const [caducidadStats, setCaducidadStats] = useState({ vencidos: 0, criticos: 0 });
  const [ventasStats, setVentasStats] = useState({ pendientes: 0, listas: 0, entregadas: 0 });
  const [alertasCount, setAlertasCount] = useState(0);

  // Monitor de conexión
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Obtener el empleado_id y datos del usuario actual
  const loadEmpleadoData = async (userId: string, userEmail?: string) => {
    // Buscar en empleados primero
    const { data: empleado } = await supabase
      .from("empleados")
      .select("id, nombre, primer_apellido, puesto, email, foto_url")
      .eq("user_id", userId)
      .maybeSingle();
    
    let displayName = "";
    
    if (empleado) {
      setEmpleadoId(empleado.id);
      displayName = [empleado.nombre, empleado.primer_apellido]
        .filter(Boolean)
        .join(" ");
      setEmpleadoPuesto(empleado.puesto || "");
      setEmpleadoEmail(empleado.email || userEmail || "");
      setEmpleadoFotoUrl(empleado.foto_url || null);
    }
    
    // Si no hay nombre de empleado, buscar en profiles como fallback
    if (!displayName) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", userId)
        .maybeSingle();
      
      displayName = profile?.full_name || "Usuario";
    }
    
    setEmpleadoNombre(displayName);
  };

  useEffect(() => {
    // Load on mount
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) loadEmpleadoData(user.id, user.email ?? undefined);
    });

    // Re-load when auth state changes (session refresh, token restore)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        loadEmpleadoData(session.user.id, session.user.email ?? undefined);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Cargar stats de recepción
  const loadRecepcionStats = async () => {
    const today = new Date().toISOString().split('T')[0];
    
    const { count: pendientes } = await supabase
      .from("ordenes_compra_entregas")
      .select("*", { count: "exact", head: true })
      .in("status", ["programada", "en_descarga"])
      .lte("fecha_programada", today);
    
    const { count: recibidas } = await supabase
      .from("ordenes_compra_entregas")
      .select("*", { count: "exact", head: true })
      .eq("status", "recibida")
      .gte("fecha_entrega_real", today);
    
    setRecepcionStats({
      pendientes: pendientes || 0,
      recibidas: recibidas || 0
    });
  };

  useEffect(() => {
    loadRecepcionStats();
  }, [refreshKey]);

  useEffect(() => {
    const channel = supabase
      .channel('almacen-tablet-entregas-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ordenes_compra_entregas' }, () => {
        loadRecepcionStats();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  const handleRefresh = () => setRefreshKey(prev => prev + 1);

  // Counters para sidebar/nav
  const counters = {
    rutas: rutasStats.pendientes,
    ventas: ventasStats.pendientes,
    recepcion: recepcionStats.pendientes,
    alertas: alertasCount
  };

  // Renderizar stats según tab activo
  const renderStats = () => {
    switch (activeTab) {
      case "rutas":
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-3 rounded-full bg-primary/10"><Truck className="w-6 h-6 text-primary" /></div><div><p className="text-2xl font-bold">{rutasStats.total}</p><p className="text-sm text-muted-foreground">Mis Rutas</p></div></CardContent></Card>
            <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-3 rounded-full bg-accent/50"><Clock className="w-6 h-6 text-accent-foreground" /></div><div><p className="text-2xl font-bold">{rutasStats.pendientes}</p><p className="text-sm text-muted-foreground">Pendientes</p></div></CardContent></Card>
            <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-3 rounded-full bg-primary/10"><CheckCircle2 className="w-6 h-6 text-primary" /></div><div><p className="text-2xl font-bold">{rutasStats.completadas}</p><p className="text-sm text-muted-foreground">Completadas</p></div></CardContent></Card>
            <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-3 rounded-full bg-muted"><Package className="w-6 h-6 text-muted-foreground" /></div><div><p className="text-2xl font-bold">{rutasStats.entregas}</p><p className="text-sm text-muted-foreground">Entregas</p></div></CardContent></Card>
          </div>
        );
      case "recepcion":
        return (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-3 rounded-full bg-accent/50"><Clock className="w-6 h-6 text-accent-foreground" /></div><div><p className="text-2xl font-bold">{recepcionStats.pendientes}</p><p className="text-sm text-muted-foreground">Pendientes</p></div></CardContent></Card>
            <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-3 rounded-full bg-primary/10"><CheckCircle2 className="w-6 h-6 text-primary" /></div><div><p className="text-2xl font-bold">{recepcionStats.recibidas}</p><p className="text-sm text-muted-foreground">Recibidas hoy</p></div></CardContent></Card>
          </div>
        );
      case "fumigaciones":
        return (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-3 rounded-full bg-destructive/10"><AlertTriangle className="w-6 h-6 text-destructive" /></div><div><p className="text-2xl font-bold">{fumigacionStats.vencidas}</p><p className="text-sm text-muted-foreground">Vencidas</p></div></CardContent></Card>
            <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-3 rounded-full bg-accent/50"><Clock className="w-6 h-6 text-accent-foreground" /></div><div><p className="text-2xl font-bold">{fumigacionStats.proximas}</p><p className="text-sm text-muted-foreground">Próximas</p></div></CardContent></Card>
            <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-3 rounded-full bg-primary/10"><CheckCircle2 className="w-6 h-6 text-primary" /></div><div><p className="text-2xl font-bold">{fumigacionStats.vigentes}</p><p className="text-sm text-muted-foreground">Vigentes</p></div></CardContent></Card>
          </div>
        );
      case "caducidad":
        return (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Card className="border-destructive/30"><CardContent className="p-4 flex items-center gap-3"><div className="p-3 rounded-full bg-destructive/10"><AlertTriangle className="w-6 h-6 text-destructive" /></div><div><p className="text-2xl font-bold">{caducidadStats.vencidos}</p><p className="text-sm text-muted-foreground">Vencidos</p></div></CardContent></Card>
            <Card className="border-orange-500/30"><CardContent className="p-4 flex items-center gap-3"><div className="p-3 rounded-full bg-orange-500/10"><Timer className="w-6 h-6 text-orange-500" /></div><div><p className="text-2xl font-bold">{caducidadStats.criticos}</p><p className="text-sm text-muted-foreground">Críticos (≤7d)</p></div></CardContent></Card>
          </div>
        );
      default:
        return null;
    }
  };

  // Renderizar contenido del tab activo
  const renderTabContent = () => {
    switch (activeTab) {
      case "rutas":
        return <AlmacenCargaRutasTab key={`rutas-${refreshKey}`} onStatsUpdate={setRutasStats} empleadoId={empleadoId} />;
      case "ventas":
        return <AlmacenVentasMostradorTab key={`ventas-${refreshKey}`} empleadoId={empleadoId} onStatsUpdate={setVentasStats} />;
      case "recepcion":
        return <AlmacenRecepcionTab key={`recepcion-${refreshKey}`} onStatsUpdate={setRecepcionStats} />;
      case "reporte":
        return <ReporteRecepcionesDiaTab key={`reporte-${refreshKey}`} />;
      case "inventario":
        return <AlmacenInventarioTab key={`inventario-${refreshKey}`} />;
      case "productos":
        return <AlmacenProductosTab key={`productos-${refreshKey}`} />;
      case "fumigaciones":
        return <AlmacenFumigacionesTab key={`fumigaciones-${refreshKey}`} onStatsUpdate={setFumigacionStats} />;
      case "caducidad":
        return <ReporteCaducidadTab key={`caducidad-${refreshKey}`} onStatsUpdate={setCaducidadStats} />;
      case "alertas":
        return showFlotillaTabs ? <AlertasFlotillaPanel key={`alertas-${refreshKey}`} /> : null;
      case "checkups":
        return showFlotillaTabs ? (
          empleadoId ? (
            <VehiculoCheckupsTab empleadoId={empleadoId} refreshKey={refreshKey} />
          ) : (
            <Card className="p-8 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
              <h3 className="text-lg font-semibold">Configuración Incompleta</h3>
              <p className="text-muted-foreground mt-2">
                Tu usuario no está vinculado a un registro de empleado. 
                Contacta al administrador para completar la configuración.
              </p>
            </Card>
          )
        ) : null;
      case "vehiculos":
        return showFlotillaTabs ? <VehiculosTab key={`vehiculos-${refreshKey}`} /> : null;
      case "personal":
        return showFlotillaTabs ? <PersonalFlotillaTab key={`personal-${refreshKey}`} /> : null;
      case "disponibilidad":
        return showFlotillaTabs ? <DisponibilidadPersonalTab key={`disp-${refreshKey}`} /> : null;
      case "externos":
        return showFlotillaTabs ? <AyudantesExternosTab key={`externos-${refreshKey}`} /> : null;
      default:
        return null;
    }
  };

  // Obtener título del tab activo
  const getTabTitle = () => {
    const titles: Record<string, string> = {
      rutas: "Carga de Rutas",
      ventas: "Ventas Mostrador",
      recepcion: "Recepción de Mercancía",
      reporte: "Reporte del Día",
      inventario: "Inventario",
      productos: "Productos",
      fumigaciones: "Fumigaciones",
      caducidad: "Reporte Caducidad (FEFO)",
      alertas: "Alertas de Flotilla",
      checkups: "Checkups de Vehículos",
      vehiculos: "Vehículos",
      personal: "Personal de Flotilla",
      disponibilidad: "Disponibilidad",
      externos: "Ayudantes Externos"
    };
    return titles[activeTab] || "Almacén";
  };

  // Detectar tipo de dispositivo para navegación
  const showMobileNav = useShowMobileNav();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const hasPointer = useHasPointer();
  const isTabletWithMouse = useIsTabletWithMouse();


  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex bg-background w-full">
        {/* Sidebar - solo visible en desktop con mouse */}
        {!showMobileNav && (
          <AlmacenSidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            showFlotillaTabs={showFlotillaTabs}
            counters={counters}
            isOnline={isOnline}
            onLogout={handleLogout}
            empleadoNombre={empleadoNombre}
            empleadoId={empleadoId}
            empleadoPuesto={empleadoPuesto}
            empleadoEmail={empleadoEmail}
            empleadoFotoUrl={empleadoFotoUrl}
            onFotoUpdated={setEmpleadoFotoUrl}
          />
        )}
        
        {/* Contenido Principal */}
        <main className="flex-1 p-4 md:p-6 pb-44 md:pb-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              {/* SidebarTrigger solo si hay sidebar visible */}
              {!showMobileNav && (
                <SidebarTrigger className="h-10 w-10" />
              )}
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                    {getTabTitle()}
                  </h1>
                  <LiveIndicator size="md" className={showMobileNav ? "" : "hidden"} />
                </div>
                <p className="text-muted-foreground mt-1 text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  {format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })}
                </p>
                <p className="text-xs italic text-muted-foreground/70 mt-0.5">"{COMPANY_DATA.slogan}"</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Badge de conexión solo cuando hay nav móvil */}
              {showMobileNav && (
                <Badge 
                  variant={isOnline ? "default" : "destructive"} 
                  className="h-8 px-3 text-sm"
                >
                  {isOnline ? "Online" : "Offline"}
                </Badge>
              )}
              <UserPreferencesPopover />
              <Button variant="outline" size="lg" onClick={handleRefresh} className="h-12 px-4 text-base">
                <RefreshCw className="w-5 h-5 mr-2" /> Actualizar
              </Button>
            </div>
          </div>

          {/* Stats cards según tab activo */}
          {renderStats()}

          {/* Contenido del tab */}
          {renderTabContent()}
        </main>
        
        {/* Navegación móvil - visible en phones y tablets sin mouse */}
        {showMobileNav && (
          <AlmacenMobileNav
            activeTab={activeTab}
            onTabChange={setActiveTab}
            showFlotillaTabs={showFlotillaTabs}
            counters={counters}
            onLogout={handleLogout}
          />
        )}
      </div>
    </SidebarProvider>
  );
};

export default AlmacenTablet;
