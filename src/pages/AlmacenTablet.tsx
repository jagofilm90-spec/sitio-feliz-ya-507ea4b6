import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Package, 
  Truck, 
  Calendar,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { AlmacenCargaRutasTab } from "@/components/almacen/AlmacenCargaRutasTab";
import { AlmacenRecepcionTab } from "@/components/almacen/AlmacenRecepcionTab";
import { AlmacenFumigacionesTab } from "@/components/almacen/AlmacenFumigacionesTab";
import { AlmacenInventarioTab } from "@/components/almacen/AlmacenInventarioTab";
import { AlmacenProductosTab } from "@/components/almacen/AlmacenProductosTab";
import { AlmacenVentasMostradorTab } from "@/components/almacen/AlmacenVentasMostradorTab";
import { ReporteRecepcionesDiaTab } from "@/components/almacen/ReporteRecepcionesDiaTab";
import PersonalFlotillaTab from "@/components/almacen/PersonalFlotillaTab";
import VehiculosTab from "@/components/rutas/VehiculosTab";
import DisponibilidadPersonalTab from "@/components/rutas/DisponibilidadPersonalTab";
import AyudantesExternosTab from "@/components/rutas/AyudantesExternosTab";
import { AlertasFlotillaPanel } from "@/components/almacen/AlertasFlotillaPanel";
import { VehiculoCheckupsTab } from "@/components/almacen/VehiculoCheckupsTab";
import { AlmacenSidebar } from "@/components/almacen/AlmacenSidebar";
import { AlmacenMobileNav } from "@/components/almacen/AlmacenMobileNav";
import { LiveIndicator } from "@/components/ui/live-indicator";
import { useUserRoles } from "@/hooks/useUserRoles";

const AlmacenTablet = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [activeTab, setActiveTab] = useState("rutas");
  const [refreshKey, setRefreshKey] = useState(0);
  const [empleadoId, setEmpleadoId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { isGerenteAlmacen, isAdmin } = useUserRoles();

  // El gerente de almacén ve tabs adicionales de flotilla
  const showFlotillaTabs = isGerenteAlmacen || isAdmin;

  // Stats
  const [rutasStats, setRutasStats] = useState({ total: 0, pendientes: 0, completadas: 0, entregas: 0 });
  const [recepcionStats, setRecepcionStats] = useState({ pendientes: 0, recibidas: 0 });
  const [fumigacionStats, setFumigacionStats] = useState({ vencidas: 0, proximas: 0, vigentes: 0 });
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

  // Obtener el empleado_id del usuario actual
  useEffect(() => {
    const loadEmpleadoId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: empleado } = await supabase
          .from("empleados")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        
        if (empleado) {
          setEmpleadoId(empleado.id);
        }
      }
    };
    loadEmpleadoId();
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
      case "alertas":
        return showFlotillaTabs ? <AlertasFlotillaPanel key={`alertas-${refreshKey}`} /> : null;
      case "checkups":
        return showFlotillaTabs && empleadoId ? <VehiculoCheckupsTab empleadoId={empleadoId} refreshKey={refreshKey} /> : null;
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
      alertas: "Alertas de Flotilla",
      checkups: "Checkups de Vehículos",
      vehiculos: "Vehículos",
      personal: "Personal de Flotilla",
      disponibilidad: "Disponibilidad",
      externos: "Ayudantes Externos"
    };
    return titles[activeTab] || "Almacén";
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar - visible en lg+ */}
      <AlmacenSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        showFlotillaTabs={showFlotillaTabs}
        counters={counters}
        isOnline={isOnline}
        onLogout={handleLogout}
      />
      
      {/* Contenido Principal */}
      <main className="flex-1 lg:ml-64 p-4 md:p-6 pb-40 lg:pb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                {getTabTitle()}
              </h1>
              <LiveIndicator size="md" className="lg:hidden" />
            </div>
            <p className="text-muted-foreground mt-1 text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Badge de conexión solo en móvil */}
            <Badge 
              variant={isOnline ? "default" : "destructive"} 
              className="lg:hidden h-8 px-3 text-sm"
            >
              {isOnline ? "Online" : "Offline"}
            </Badge>
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
      
      {/* Navegación móvil - visible en < lg */}
      <AlmacenMobileNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        showFlotillaTabs={showFlotillaTabs}
        counters={counters}
      />
    </div>
  );
};

export default AlmacenTablet;
