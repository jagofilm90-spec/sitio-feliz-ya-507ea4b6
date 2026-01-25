import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useSystemPresence } from "@/hooks/useSystemPresence";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { toast } from "sonner";
import { Users, ShoppingCart, CreditCard, LogOut, TrendingUp, Calendar, IdCard } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { VendedorMisClientesTab } from "@/components/vendedor/VendedorMisClientesTab";
import { VendedorNuevoPedidoTab } from "@/components/vendedor/VendedorNuevoPedidoTab";
import { VendedorMisVentasTab } from "@/components/vendedor/VendedorMisVentasTab";
import { VendedorComisionesTab } from "@/components/vendedor/VendedorComisionesTab";
import { VendedorSaldosTab } from "@/components/vendedor/VendedorSaldosTab";
import { VendedorListaPreciosTab } from "@/components/vendedor/VendedorListaPreciosTab";
import { VendedorNovedadesTab } from "@/components/vendedor/VendedorNovedadesTab";
import { VendedorSidebar } from "@/components/vendedor/VendedorSidebar";
import { VendedorBienvenidaDialog } from "@/components/vendedor/VendedorBienvenidaDialog";
import PushNotificationSetup from "@/components/PushNotificationSetup";
import logoBlanco from "@/assets/logos/logo-blanco.png";

export default function VendedorPanel() {
  const navigate = useNavigate();
  const { isVendedor, isAdmin, isLoading: rolesLoading } = useUserRoles();
  
  // Track presence in vendedor panel
  useSystemPresence('vendedor');
  
  const [loading, setLoading] = useState(true);
  const [vendedorNombre, setVendedorNombre] = useState("");
  const [activeTab, setActiveTab] = useState("clientes");
  const [showBienvenida, setShowBienvenida] = useState(false);
  const [stats, setStats] = useState({
    totalClientes: 0,
    ventasMes: 0,
    ventasAnio: 0,
    porCobrar: 0,
    vencido: 0
  });
  const [novedadesCount, setNovedadesCount] = useState(0);

  useEffect(() => {
    if (!rolesLoading && !isVendedor && !isAdmin) {
      toast.error("No tienes acceso a esta sección");
      navigate("/");
    }
  }, [rolesLoading, isVendedor, isAdmin, navigate]);

  useEffect(() => {
    if (!rolesLoading && (isVendedor || isAdmin)) {
      fetchDashboardData();
      fetchNovedadesCount();
      // Mostrar bienvenida solo una vez por sesión
      const yaVisto = sessionStorage.getItem("vendedor_bienvenida_mostrado");
      if (!yaVisto) {
        setShowBienvenida(true);
        sessionStorage.setItem("vendedor_bienvenida_mostrado", "true");
      }
    }
  }, [rolesLoading, isVendedor, isAdmin]);

  const fetchNovedadesCount = async () => {
    try {
      const hace48Horas = new Date();
      hace48Horas.setHours(hace48Horas.getHours() - 48);

      // Contar productos nuevos
      const { count: nuevos } = await supabase
        .from("productos")
        .select("id", { count: "exact", head: true })
        .eq("activo", true)
        .or("solo_uso_interno.is.null,solo_uso_interno.eq.false")
        .gte("created_at", hace48Horas.toISOString());

      // Contar cambios de precio
      const { count: precios } = await supabase
        .from("productos_historial_precios")
        .select("id", { count: "exact", head: true })
        .gte("created_at", hace48Horas.toISOString());

      // Contar productos inhabilitados
      const { count: inhabilitados } = await supabase
        .from("productos_historial_estado")
        .select("id", { count: "exact", head: true })
        .eq("activo_nuevo", false)
        .gte("created_at", hace48Horas.toISOString());

      setNovedadesCount((nuevos || 0) + (precios || 0) + (inhabilitados || 0));
    } catch (error) {
      console.error("Error fetching novedades count:", error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get profile name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();

      if (profile) setVendedorNombre(profile.full_name || "Vendedor");

      // Get client count
      const { count: clientesCount } = await supabase
        .from("clientes")
        .select("id", { count: "exact", head: true })
        .eq("vendedor_asignado", user.id)
        .eq("activo", true);

      // Get current month sales
      const inicioMes = new Date();
      inicioMes.setDate(1);
      inicioMes.setHours(0, 0, 0, 0);

      const { data: ventasMesData } = await supabase
        .from("pedidos")
        .select("total")
        .eq("vendedor_id", user.id)
        .gte("fecha_pedido", inicioMes.toISOString())
        .not("status", "in", "(cancelado,por_autorizar)");

      const ventasMes = (ventasMesData || []).reduce((sum, p) => sum + (p.total || 0), 0);

      // Get current year sales
      const inicioAnio = new Date();
      inicioAnio.setMonth(0, 1);
      inicioAnio.setHours(0, 0, 0, 0);

      const { data: ventasAnioData } = await supabase
        .from("pedidos")
        .select("total")
        .eq("vendedor_id", user.id)
        .gte("fecha_pedido", inicioAnio.toISOString())
        .not("status", "in", "(cancelado,por_autorizar)");

      const ventasAnio = (ventasAnioData || []).reduce((sum, p) => sum + (p.total || 0), 0);

      // Get accounts receivable (facturas pendientes de clientes del vendedor)
      const { data: clientesIds } = await supabase
        .from("clientes")
        .select("id")
        .eq("vendedor_asignado", user.id);

      let porCobrar = 0;
      let vencido = 0;

      if (clientesIds && clientesIds.length > 0) {
        const ids = clientesIds.map(c => c.id);
        
        const { data: facturasPendientes } = await supabase
          .from("facturas")
          .select("total, fecha_vencimiento")
          .in("cliente_id", ids)
          .eq("pagada", false);

        const hoy = new Date();
        (facturasPendientes || []).forEach(f => {
          porCobrar += f.total || 0;
          if (f.fecha_vencimiento && new Date(f.fecha_vencimiento) < hoy) {
            vencido += f.total || 0;
          }
        });
      }

      setStats({
        totalClientes: clientesCount || 0,
        ventasMes,
        ventasAnio,
        porCobrar,
        vencido
      });
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("vendedor_bienvenida_mostrado");
    supabase.auth.signOut();
    navigate("/auth");
  };

  if (rolesLoading || loading) {
    return (
      <div className="min-h-screen bg-background p-4 lg:p-8">
        <Skeleton className="h-16 w-full mb-6" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const navItems = [
    { id: "clientes", label: "Clientes", icon: Users },
    { id: "nuevo", label: "Nuevo Pedido", icon: ShoppingCart },
    { id: "ventas", label: "Mis Ventas", icon: CreditCard },
    { id: "novedades", label: "Novedades", badge: novedadesCount },
    { id: "precios", label: "Precios" },
    { id: "saldos", label: "Saldos" },
    { id: "comisiones", label: "Comisiones" },
  ];

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen bg-background flex flex-col lg:flex-row w-full">
        <PushNotificationSetup />
        
        {/* Dialog de Bienvenida */}
        <VendedorBienvenidaDialog
          open={showBienvenida}
          onOpenChange={setShowBienvenida}
          vendedorNombre={vendedorNombre}
          onIrCobranza={() => setActiveTab("saldos")}
          onIrPedidos={() => setActiveTab("nuevo")}
        />
        
        {/* Sidebar para desktop/tablet */}
        <VendedorSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onLogout={handleLogout}
          onNavigateTarjeta={() => navigate("/tarjeta")}
          onNavigateAnalisis={() => navigate("/vendedor/analisis")}
          vendedorNombre={vendedorNombre}
          novedadesCount={novedadesCount}
        />

        {/* Header móvil */}
        <header className="md:hidden sticky top-0 z-50 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground px-4 py-3 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logoBlanco} alt="ALMASA" className="h-9 object-contain" />
              <div className="border-l border-primary-foreground/30 pl-3">
                <p className="text-sm font-medium opacity-95 truncate max-w-[150px]">{vendedorNombre}</p>
                <p className="text-[10px] opacity-70 font-medium">Ejecutivo de Ventas</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate("/tarjeta")}
                className="text-primary-foreground hover:bg-primary-foreground/20 rounded-full"
                title="Mi Tarjeta"
              >
                <IdCard className="h-5 w-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleLogout}
                className="text-primary-foreground hover:bg-primary-foreground/20 rounded-full"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Contenido principal */}
        <main className="flex-1">
          <div className="p-4 lg:p-8 pb-32 md:pb-8">
            {/* Header con toggle en desktop */}
            <div className="hidden md:flex items-center gap-4 mb-6">
              <div>
                <h1 className="text-xl font-semibold">Panel de Ventas</h1>
                <p className="text-sm text-muted-foreground">Bienvenido, {vendedorNombre}</p>
              </div>
            </div>

            {/* Stats Dashboard - 5 KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4 mb-6">
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-3 lg:p-4">
                  <div className="flex items-center gap-2 lg:gap-3">
                    <div className="h-10 w-10 lg:h-12 lg:w-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                      <Users className="h-5 w-5 lg:h-6 lg:w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs lg:text-sm text-muted-foreground truncate">Clientes</p>
                      <p className="text-xl lg:text-2xl font-bold">{stats.totalClientes}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-3 lg:p-4">
                  <div className="flex items-center gap-2 lg:gap-3">
                    <div className="h-10 w-10 lg:h-12 lg:w-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                      <Calendar className="h-5 w-5 lg:h-6 lg:w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs lg:text-sm text-muted-foreground truncate">Ventas Mes</p>
                      <p className="text-lg lg:text-xl font-bold">{formatCurrency(stats.ventasMes)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow bg-primary/5 border-primary/20">
                <CardContent className="p-3 lg:p-4">
                  <div className="flex items-center gap-2 lg:gap-3">
                    <div className="h-10 w-10 lg:h-12 lg:w-12 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                      <TrendingUp className="h-5 w-5 lg:h-6 lg:w-6 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs lg:text-sm text-muted-foreground truncate">Ventas Año</p>
                      <p className="text-lg lg:text-xl font-bold text-primary">{formatCurrency(stats.ventasAnio)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-3 lg:p-4">
                  <div className="flex items-center gap-2 lg:gap-3">
                    <div className="h-10 w-10 lg:h-12 lg:w-12 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                      <CreditCard className="h-5 w-5 lg:h-6 lg:w-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs lg:text-sm text-muted-foreground truncate">Por Cobrar</p>
                      <p className="text-lg lg:text-xl font-bold text-amber-600">{formatCurrency(stats.porCobrar)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="hover:shadow-md transition-shadow col-span-2 lg:col-span-1">
                <CardContent className="p-3 lg:p-4">
                  <div className="flex items-center gap-2 lg:gap-3">
                    <div className="h-10 w-10 lg:h-12 lg:w-12 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                      <CreditCard className="h-5 w-5 lg:h-6 lg:w-6 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs lg:text-sm text-muted-foreground truncate">Vencido</p>
                      <p className="text-lg lg:text-xl font-bold text-destructive">{formatCurrency(stats.vencido)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Content Area - Desktop/Tablet uses activeTab state */}
            <div className="hidden md:block">
              <Card>
                <CardContent className="p-6">
                  {activeTab === "clientes" && <VendedorMisClientesTab onClienteCreado={fetchDashboardData} />}
                  {activeTab === "nuevo" && <VendedorNuevoPedidoTab onPedidoCreado={fetchDashboardData} onNavigateToVentas={() => setActiveTab("ventas")} />}
                  {activeTab === "ventas" && <VendedorMisVentasTab />}
                  {activeTab === "novedades" && <VendedorNovedadesTab />}
                  {activeTab === "precios" && <VendedorListaPreciosTab />}
                  {activeTab === "saldos" && <VendedorSaldosTab />}
                  {activeTab === "comisiones" && <VendedorComisionesTab />}
                </CardContent>
              </Card>
            </div>

            {/* Mobile Content */}
            <div className="md:hidden">
              {activeTab === "clientes" && <VendedorMisClientesTab onClienteCreado={fetchDashboardData} />}
              {activeTab === "nuevo" && <VendedorNuevoPedidoTab onPedidoCreado={fetchDashboardData} onNavigateToVentas={() => setActiveTab("ventas")} />}
              {activeTab === "ventas" && <VendedorMisVentasTab />}
              {activeTab === "novedades" && <VendedorNovedadesTab />}
              {activeTab === "precios" && <VendedorListaPreciosTab />}
              {activeTab === "saldos" && <VendedorSaldosTab />}
              {activeTab === "comisiones" && <VendedorComisionesTab />}
            </div>
          </div>
        </main>

        {/* Mobile Bottom Navigation - Scrollable */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t z-50 pb-[env(safe-area-inset-bottom)]">
          <div className="flex overflow-x-auto scrollbar-hide">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "flex flex-col items-center justify-center py-2 px-3 transition-colors min-h-[56px] min-w-[60px] relative flex-shrink-0",
                  activeTab === item.id
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <div className="relative">
                  {item.icon && <item.icon className={cn("h-5 w-5 mb-0.5", activeTab === item.id && "text-primary")} />}
                  {!item.icon && <div className="h-5 w-5 mb-0.5" />}
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1.5 h-3.5 w-3.5 flex items-center justify-center bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full">
                      {item.badge > 9 ? "+" : item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium whitespace-nowrap">
                  {item.id === "novedades" ? "Nuevo" : item.label.split(" ")[0]}
                </span>
              </button>
            ))}
            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex flex-col items-center justify-center py-2 px-3 transition-colors min-h-[56px] min-w-[60px] text-destructive hover:bg-destructive/10 flex-shrink-0"
            >
              <LogOut className="h-5 w-5 mb-0.5" />
              <span className="text-[10px] font-medium">Salir</span>
            </button>
          </div>
        </nav>
      </div>
    </SidebarProvider>
  );
}
