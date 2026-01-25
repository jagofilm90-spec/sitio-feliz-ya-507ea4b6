import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useSystemPresence } from "@/hooks/useSystemPresence";
import { useUnreadEmails } from "@/hooks/useUnreadEmails";
import { useSolicitudesVenta } from "@/hooks/useSolicitudesVenta";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CentroNotificaciones } from "@/components/CentroNotificaciones";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Loader2, LogOut, Home } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import logoAlmasa from "@/assets/logo-almasa.png";

// Sidebar & Navigation
import { SecretariaSidebar } from "@/components/secretaria/SecretariaSidebar";
import { SecretariaMobileNav } from "@/components/secretaria/SecretariaMobileNav";
import { SecretariaBienvenidaDialog } from "@/components/secretaria/SecretariaBienvenidaDialog";

// Tab Components
import { SecretariaProductosTab } from "@/components/secretaria/SecretariaProductosTab";
import { SecretariaCostosTab } from "@/components/secretaria/SecretariaCostosTab";
import { SecretariaListaPreciosTab } from "@/components/secretaria/SecretariaListaPreciosTab";
import { SecretariaPedidosTab } from "@/components/secretaria/SecretariaPedidosTab";
import { SecretariaComprasTab } from "@/components/secretaria/SecretariaComprasTab";
import { SecretariaInventarioTab } from "@/components/secretaria/SecretariaInventarioTab";
import { SecretariaFacturacionTab } from "@/components/secretaria/SecretariaFacturacionTab";
import { SecretariaChatTab } from "@/components/secretaria/SecretariaChatTab";
import { SecretariaCorreosTab } from "@/components/secretaria/SecretariaCorreosTab";
import { SecretariaClientesTab } from "@/components/secretaria/SecretariaClientesTab";
import { SolicitudesAlmacenTab } from "@/components/facturas/SolicitudesAlmacenTab";

const SecretariaPanel = () => {
  const [activeTab, setActiveTab] = useState("pedidos");
  const [user, setUser] = useState<any>(null);
  const [userName, setUserName] = useState("");
  const [showBienvenida, setShowBienvenida] = useState(false);
  const navigate = useNavigate();
  const { roles, isLoading: rolesLoading, hasRole } = useUserRoles();
  
  // Track presence in secretaria panel
  useSystemPresence('secretaria');
  
  const { totalUnread: totalUnreadEmails } = useUnreadEmails();
  const { pendingCount: ventasMostradorPendientes } = useSolicitudesVenta();
  const chatUnreadCount = useUnreadMessages();

  // Verify session and show welcome dialog
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        // Get profile name
        supabase
          .from("profiles")
          .select("full_name")
          .eq("id", session.user.id)
          .single()
          .then(({ data }) => {
            const name = data?.full_name || session.user.email?.split("@")[0] || "Secretaria";
            setUserName(name);
            
            // Check if should show welcome dialog (first visit of the day)
            const today = new Date().toDateString();
            const lastVisit = localStorage.getItem("secretaria_last_visit");
            if (lastVisit !== today) {
              setShowBienvenida(true);
              localStorage.setItem("secretaria_last_visit", today);
            }
          });
      }
    });
  }, [navigate]);

  // KPIs Query - Pedidos por autorizar
  const { data: pedidosPorAutorizar = 0 } = useQuery({
    queryKey: ["kpi-pedidos-por-autorizar"],
    queryFn: async () => {
      const { count } = await supabase
        .from("pedidos")
        .select("*", { count: "exact", head: true })
        .eq("status", "por_autorizar");
      return count || 0;
    },
    refetchInterval: 30000,
  });

  // KPIs Query - Facturas pendientes
  const { data: facturasPendientes = 0 } = useQuery({
    queryKey: ["kpi-facturas-pendientes"],
    queryFn: async () => {
      const { count } = await supabase
        .from("facturas")
        .select("*", { count: "exact", head: true })
        .is("cfdi_uuid", null);
      return count || 0;
    },
    refetchInterval: 30000,
  });

  // KPIs Query - OC por enviar
  const { data: comprasPendientes = 0 } = useQuery({
    queryKey: ["kpi-compras-pendientes"],
    queryFn: async () => {
      const { count } = await supabase
        .from("ordenes_compra")
        .select("*", { count: "exact", head: true })
        .eq("status", "autorizada");
      return count || 0;
    },
    refetchInterval: 30000,
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (rolesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-pink-600" />
      </div>
    );
  }

  const counters = {
    pedidos: pedidosPorAutorizar,
    mostrador: ventasMostradorPendientes,
    facturas: facturasPendientes,
    chat: chatUnreadCount,
    correos: totalUnreadEmails,
    compras: comprasPendientes,
  };

  const hasMultipleRoles = hasRole("admin") || roles.length > 1;

  // Render active tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case "productos":
        return <SecretariaProductosTab />;
      case "costos":
        return <SecretariaCostosTab />;
      case "precios":
        return <SecretariaListaPreciosTab />;
      case "pedidos":
        return <SecretariaPedidosTab />;
      case "mostrador":
        return <SolicitudesAlmacenTab />;
      case "compras":
        return <SecretariaComprasTab />;
      case "inventario":
        return <SecretariaInventarioTab />;
      case "facturacion":
        return <SecretariaFacturacionTab />;
      case "chat":
        return <SecretariaChatTab />;
      case "correos":
        return <SecretariaCorreosTab />;
      case "clientes":
        return <SecretariaClientesTab />;
      default:
        return <SecretariaPedidosTab />;
    }
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen bg-background flex w-full">
        {/* Desktop Sidebar */}
        <SecretariaSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onLogout={handleLogout}
          onNavigateDashboard={() => navigate("/dashboard")}
          userName={userName}
          counters={counters}
          hasMultipleRoles={hasMultipleRoles}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-screen">
          {/* Mobile Header */}
          <header className="md:hidden sticky top-0 z-40 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-4 py-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={logoAlmasa} alt="ALMASA" className="h-8 brightness-0 invert" />
                <div className="border-l border-white/30 pl-3">
                  <p className="text-sm font-medium truncate max-w-[120px]">{userName}</p>
                  <p className="text-[10px] opacity-70">Secretaria</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <ThemeToggle />
                <CentroNotificaciones />
                {hasMultipleRoles && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate("/dashboard")}
                    className="text-white hover:bg-white/20"
                  >
                    <Home className="h-5 w-5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  className="text-white hover:bg-white/20"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </header>

          {/* Desktop/Tablet Header */}
          <header className="hidden md:flex sticky top-0 z-40 bg-background/95 backdrop-blur border-b px-6 py-4 items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-xl font-semibold text-foreground">Panel Secretaria</h1>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <CentroNotificaciones />
              <span className="text-sm text-muted-foreground">{user?.email}</span>
            </div>
          </header>

          {/* Content Area */}
          <main className="flex-1 p-4 md:p-6 pb-40 md:pb-6">
            {renderTabContent()}
          </main>
        </div>

        {/* Mobile Bottom Navigation */}
        <SecretariaMobileNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          counters={counters}
          onLogout={handleLogout}
        />

        {/* Welcome Dialog */}
        <SecretariaBienvenidaDialog
          open={showBienvenida}
          onOpenChange={setShowBienvenida}
          secretariaNombre={userName}
          onNavigate={setActiveTab}
        />
      </div>
    </SidebarProvider>
  );
};

export default SecretariaPanel;
