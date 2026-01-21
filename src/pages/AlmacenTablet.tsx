import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Package, 
  Truck, 
  Calendar,
  RefreshCw,
  CheckCircle2,
  Clock,
  LogOut,
  Wifi,
  WifiOff,
  Bug,
  AlertTriangle,
  Boxes,
  ShoppingCart,
  FileText
} from "lucide-react";
import { AlmacenCargaRutasTab } from "@/components/almacen/AlmacenCargaRutasTab";
import { AlmacenRecepcionTab } from "@/components/almacen/AlmacenRecepcionTab";
import { AlmacenFumigacionesTab } from "@/components/almacen/AlmacenFumigacionesTab";
import { AlmacenInventarioTab } from "@/components/almacen/AlmacenInventarioTab";
import { AlmacenProductosTab } from "@/components/almacen/AlmacenProductosTab";
import { AlmacenVentasMostradorTab } from "@/components/almacen/AlmacenVentasMostradorTab";
import { ReporteRecepcionesDiaTab } from "@/components/almacen/ReporteRecepcionesDiaTab";
import { LiveIndicator } from "@/components/ui/live-indicator";

const AlmacenTablet = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [activeTab, setActiveTab] = useState("rutas");
  const [refreshKey, setRefreshKey] = useState(0);
  const [empleadoId, setEmpleadoId] = useState<string | null>(null);
  const navigate = useNavigate();

  // Stats
  const [rutasStats, setRutasStats] = useState({ total: 0, pendientes: 0, completadas: 0, entregas: 0 });
  const [recepcionStats, setRecepcionStats] = useState({ pendientes: 0, recibidas: 0 });
  const [fumigacionStats, setFumigacionStats] = useState({ vencidas: 0, proximas: 0, vigentes: 0 });
  const [ventasStats, setVentasStats] = useState({ pendientes: 0, listas: 0, entregadas: 0 });

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
    
    // Entregas pendientes (programada, en_descarga)
    const { count: pendientes } = await supabase
      .from("ordenes_compra_entregas")
      .select("*", { count: "exact", head: true })
      .in("status", ["programada", "en_descarga"])
      .lte("fecha_programada", today);
    
    // Entregas recibidas hoy
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

  // Cargar stats al iniciar y cuando cambie refreshKey
  useEffect(() => {
    loadRecepcionStats();
  }, [refreshKey]);

  // Realtime subscription para sincronizar stats de recepciones
  useEffect(() => {
    const channel = supabase
      .channel('almacen-tablet-entregas-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ordenes_compra_entregas'
        },
        () => {
          // Actualizar stats cuando hay cambios en entregas
          loadRecepcionStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Almacén
            </h1>
            <LiveIndicator size="md" />
            <Badge variant={isOnline ? "default" : "destructive"} className="h-8 px-3 text-sm">
              {isOnline ? (
                <><Wifi className="w-4 h-4 mr-1" /> Conectado</>
              ) : (
                <><WifiOff className="w-4 h-4 mr-1" /> Sin conexión</>
              )}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1 text-lg">
            <Calendar className="inline-block w-5 h-5 mr-2" />
            {format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="lg"
            onClick={handleRefresh}
            className="h-14 px-6 text-lg"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            Actualizar
          </Button>
          <Button
            variant="ghost"
            size="lg"
            onClick={handleLogout}
            className="h-14 px-6 text-lg text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-5 h-5 mr-2" />
            Salir
          </Button>
        </div>
      </div>

      {/* Stats según tab activo */}
      {activeTab === "rutas" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-3 rounded-full bg-primary/10">
                <Truck className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{rutasStats.total}</p>
                <p className="text-sm text-muted-foreground">Mis Rutas</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-3 rounded-full bg-yellow-500/10">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{rutasStats.pendientes}</p>
                <p className="text-sm text-muted-foreground">Pendientes</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-3 rounded-full bg-green-500/10">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{rutasStats.completadas}</p>
                <p className="text-sm text-muted-foreground">Completadas</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-3 rounded-full bg-muted">
                <Package className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{rutasStats.entregas}</p>
                <p className="text-sm text-muted-foreground">Entregas</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "recepcion" && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-3 rounded-full bg-yellow-500/10">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{recepcionStats.pendientes}</p>
                <p className="text-sm text-muted-foreground">Pendientes</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-3 rounded-full bg-green-500/10">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{recepcionStats.recibidas}</p>
                <p className="text-sm text-muted-foreground">Recibidas hoy</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "fumigaciones" && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-3 rounded-full bg-destructive/10">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{fumigacionStats.vencidas}</p>
                <p className="text-sm text-muted-foreground">Vencidas</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-3 rounded-full bg-yellow-500/10">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{fumigacionStats.proximas}</p>
                <p className="text-sm text-muted-foreground">Próximas</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-3 rounded-full bg-green-500/10">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{fumigacionStats.vigentes}</p>
                <p className="text-sm text-muted-foreground">Vigentes</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-7 h-14 mb-4">
          <TabsTrigger value="rutas" className="text-base h-12 gap-2">
            <Truck className="w-5 h-5" />
            <span className="hidden sm:inline">Mis</span> Rutas
          </TabsTrigger>
          <TabsTrigger value="ventas" className="text-base h-12 gap-2 relative">
            <ShoppingCart className="w-5 h-5" />
            Ventas
            {ventasStats.pendientes > 0 && (
              <span className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs font-bold rounded-full h-5 min-w-5 flex items-center justify-center px-1">
                {ventasStats.pendientes}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="recepcion" className="text-base h-12 gap-2 relative">
            <Package className="w-5 h-5" />
            Recepción
            {recepcionStats.pendientes > 0 && (
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs font-bold rounded-full h-5 min-w-5 flex items-center justify-center px-1">
                {recepcionStats.pendientes}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="reporte" className="text-base h-12 gap-2">
            <FileText className="w-5 h-5" />
            Reporte
          </TabsTrigger>
          <TabsTrigger value="inventario" className="text-base h-12 gap-2">
            <Boxes className="w-5 h-5" />
            Inventario
          </TabsTrigger>
          <TabsTrigger value="productos" className="text-base h-12 gap-2">
            <Package className="w-5 h-5" />
            Productos
          </TabsTrigger>
          <TabsTrigger value="fumigaciones" className="text-base h-12 gap-2">
            <Bug className="w-5 h-5" />
            Fumigaciones
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rutas" className="mt-0">
          <AlmacenCargaRutasTab 
            key={`rutas-${refreshKey}`}
            onStatsUpdate={setRutasStats}
            empleadoId={empleadoId}
          />
        </TabsContent>

        <TabsContent value="ventas" className="mt-0">
          <AlmacenVentasMostradorTab 
            key={`ventas-${refreshKey}`}
            empleadoId={empleadoId}
            onStatsUpdate={setVentasStats}
          />
        </TabsContent>

        <TabsContent value="recepcion" className="mt-0">
          <AlmacenRecepcionTab 
            key={`recepcion-${refreshKey}`}
            onStatsUpdate={setRecepcionStats}
          />
        </TabsContent>

        <TabsContent value="reporte" className="mt-0">
          <ReporteRecepcionesDiaTab key={`reporte-${refreshKey}`} />
        </TabsContent>

        <TabsContent value="inventario" className="mt-0">
          <AlmacenInventarioTab key={`inventario-${refreshKey}`} />
        </TabsContent>

        <TabsContent value="productos" className="mt-0">
          <AlmacenProductosTab key={`productos-${refreshKey}`} />
        </TabsContent>

        <TabsContent value="fumigaciones" className="mt-0">
          <AlmacenFumigacionesTab 
            key={`fumigaciones-${refreshKey}`}
            onStatsUpdate={setFumigacionStats} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AlmacenTablet;