import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRoles } from "@/hooks/useUserRoles";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Users, ShoppingCart, BarChart3, CreditCard, LogOut, User, Menu } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { VendedorMisClientesTab } from "@/components/vendedor/VendedorMisClientesTab";
import { VendedorNuevoPedidoTab } from "@/components/vendedor/VendedorNuevoPedidoTab";
import { VendedorMisVentasTab } from "@/components/vendedor/VendedorMisVentasTab";
import { VendedorCobranzaTab } from "@/components/vendedor/VendedorCobranzaTab";
import PushNotificationSetup from "@/components/PushNotificationSetup";
import { cn } from "@/lib/utils";

export default function VendedorPanel() {
  const navigate = useNavigate();
  const { isVendedor, isAdmin, isLoading: rolesLoading } = useUserRoles();
  const [loading, setLoading] = useState(true);
  const [vendedorNombre, setVendedorNombre] = useState("");
  const [activeTab, setActiveTab] = useState("clientes");
  const [stats, setStats] = useState({
    totalClientes: 0,
    ventasMes: 0,
    porCobrar: 0,
    vencido: 0
  });

  useEffect(() => {
    if (!rolesLoading && !isVendedor && !isAdmin) {
      toast.error("No tienes acceso a esta sección");
      navigate("/");
    }
  }, [rolesLoading, isVendedor, isAdmin, navigate]);

  useEffect(() => {
    if (!rolesLoading && (isVendedor || isAdmin)) {
      fetchDashboardData();
    }
  }, [rolesLoading, isVendedor, isAdmin]);

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

      const { data: ventasData } = await supabase
        .from("pedidos")
        .select("total")
        .eq("vendedor_id", user.id)
        .gte("fecha_pedido", inicioMes.toISOString())
        .not("status", "in", "(cancelado,por_autorizar)");

      const ventasMes = (ventasData || []).reduce((sum, p) => sum + (p.total || 0), 0);

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
    { id: "clientes", label: "Mis Clientes", icon: Users },
    { id: "nuevo", label: "Nueva Venta", icon: ShoppingCart },
    { id: "ventas", label: "Mis Ventas", icon: BarChart3 },
    { id: "cobranza", label: "Cobranza", icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      <PushNotificationSetup />
      
      {/* Sidebar for desktop/tablet */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-card border-r">
        {/* Logo/Brand */}
        <div className="flex items-center gap-3 px-6 py-5 border-b">
          <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
            <BarChart3 className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-lg">ALMASA</h1>
            <p className="text-xs text-muted-foreground">Panel de Vendedor</p>
          </div>
        </div>

        {/* User Info */}
        <div className="px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{vendedorNombre}</p>
              <p className="text-xs text-muted-foreground">Vendedor</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors",
                activeTab === item.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={() => { supabase.auth.signOut(); navigate("/auth"); }} 
          >
            <LogOut className="h-5 w-5 mr-3" />
            Cerrar sesión
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 bg-primary text-primary-foreground p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-7 w-7" />
            <div>
              <h1 className="text-lg font-bold">ALMASA</h1>
              <p className="text-xs opacity-90">{vendedorNombre}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => { supabase.auth.signOut(); navigate("/auth"); }} 
            className="text-primary-foreground hover:bg-primary-foreground/20"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64">
        <div className="p-4 lg:p-8 pb-24 lg:pb-8">
          {/* Stats Dashboard - Horizontal on desktop */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Clientes</p>
                    <p className="text-2xl lg:text-3xl font-bold">{stats.totalClientes}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <ShoppingCart className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ventas (mes)</p>
                    <p className="text-xl lg:text-2xl font-bold">{formatCurrency(stats.ventasMes)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <CreditCard className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Por cobrar</p>
                    <p className="text-xl lg:text-2xl font-bold text-amber-600">{formatCurrency(stats.porCobrar)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <CreditCard className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Vencido</p>
                    <p className="text-xl lg:text-2xl font-bold text-destructive">{formatCurrency(stats.vencido)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Content Area - Desktop uses activeTab state */}
          <div className="hidden lg:block">
            <Card>
              <CardContent className="p-6">
                {activeTab === "clientes" && <VendedorMisClientesTab onClienteCreado={fetchDashboardData} />}
                {activeTab === "nuevo" && <VendedorNuevoPedidoTab onPedidoCreado={fetchDashboardData} />}
                {activeTab === "ventas" && <VendedorMisVentasTab />}
                {activeTab === "cobranza" && <VendedorCobranzaTab />}
              </CardContent>
            </Card>
          </div>

      {/* Mobile Tabs - Bottom Navigation */}
      <div className="lg:hidden">
        {/* Content Area */}
        <div className="pb-24">
          {activeTab === "clientes" && <VendedorMisClientesTab onClienteCreado={fetchDashboardData} />}
          {activeTab === "nuevo" && <VendedorNuevoPedidoTab onPedidoCreado={fetchDashboardData} />}
          {activeTab === "ventas" && <VendedorMisVentasTab />}
          {activeTab === "cobranza" && <VendedorCobranzaTab />}
        </div>

        {/* Fixed Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 bg-background border-t safe-area-bottom z-50">
          <div className="grid grid-cols-4">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "flex flex-col items-center justify-center py-3 px-2 transition-colors min-h-[64px]",
                  activeTab === item.id
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <item.icon className={cn("h-6 w-6 mb-1", activeTab === item.id && "text-primary")} />
                <span className="text-xs font-medium truncate max-w-full">
                  {item.label.split(" ")[0]}
                </span>
              </button>
            ))}
          </div>
        </nav>
      </div>
        </div>
      </main>
    </div>
  );
}
