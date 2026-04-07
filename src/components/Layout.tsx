import { ReactNode, useEffect, useState, useMemo, lazy, Suspense } from "react";
import { useNavigate, Link, useLocation, Navigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useUnreadEmails } from "@/hooks/useUnreadEmails";
import { useUserRoles, useUserModulePermissions } from "@/hooks/useUserRoles";
import { CentroNotificaciones } from "@/components/CentroNotificaciones";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserPreferencesPopover } from "@/components/UserPreferencesPopover";
import logoAlmasa from "@/assets/logo-almasa.png";
import { GlobalSearch } from "@/components/GlobalSearch";
import { QuickActions } from "@/components/QuickActions";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Package,
  Users,
  ShoppingCart,
  Warehouse,
  Truck,
  FileText,
  LogOut,
  Menu,
  X,
  Home,
  MessageCircle,
  ShoppingBag,
  PieChart,
  Bug,
  Mail,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Smartphone,
  ArrowLeft,
  DollarSign,
  Settings,
  UserCog,
  Clock,
  LucideIcon,
  Store,
} from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

interface MenuItem {
  icon: LucideIcon;
  label: string;
  path: string;
}

interface MenuCategory {
  label: string;
  items: MenuItem[];
}

const CumpleanosBannerComponent = lazy(() => import("./CumpleanosBanner").then(m => ({ default: m.CumpleanosBanner })));
const CumpleanosBannerLazy = () => <Suspense fallback={null}><CumpleanosBannerComponent /></Suspense>;

const Layout = ({ children }: LayoutProps) => {
  const [user, setUser] = useState<any>(null);
  const [userFoto, setUserFoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [emailMenuOpen, setEmailMenuOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const unreadCount = useUnreadMessages();
  const { counts: emailCounts, cuentas: emailCuentas, totalUnread: totalUnreadEmails } = useUnreadEmails();
  const { roles, isLoading: rolesLoading } = useUserRoles();
  const { allowedPaths, isLoading: permissionsLoading, checkAccess } = useUserModulePermissions();

  useEffect(() => {
    let refreshAttempted = false;

    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        setLoading(false);
        // Load user photo
        try {
          const empRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/empleados?user_id=eq.${session.user.id}&select=id,foto_url&limit=1`, {
            headers: { "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, "Authorization": `Bearer ${session.access_token}` },
          });
          const emps = await empRes.json();
          if (Array.isArray(emps) && emps[0]) {
            // Priority 1: Use foto_url from DB (public URL from empleados-fotos bucket)
            if (emps[0].foto_url) {
              setUserFoto(emps[0].foto_url);
            } else {
              // Priority 2: Try empleados-documentos bucket
              const { data: blob } = await supabase.storage.from("empleados-documentos").download(`${emps[0].id}/foto.jpg`);
              if (blob) setUserFoto(URL.createObjectURL(blob));
            }
          } else {
            const { data: blob } = await supabase.storage.from("empleados-documentos").download(`profiles/${session.user.id}/foto.jpg`);
            if (blob) setUserFoto(URL.createObjectURL(blob));
          }
        } catch {}
      } else if (!refreshAttempted) {
        refreshAttempted = true;
        const { data: refreshed } = await supabase.auth.refreshSession();
        if (refreshed.session) {
          setUser(refreshed.session.user);
          setLoading(false);
        } else {
          setLoading(false);
          await supabase.auth.signOut();
          navigate("/auth");
        }
      } else {
        setLoading(false);
        navigate("/auth");
      }
    };
    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        navigate("/auth");
      } else if (event === "TOKEN_REFRESHED" && session) {
        refreshAttempted = false;
        setUser(session.user);
        console.log("[Layout] Token refreshed — invalidating all queries");
        queryClient.invalidateQueries();
      } else if (event === "SIGNED_IN" && session) {
        refreshAttempted = false;
        setUser(session.user);
      } else if (!session && event !== "INITIAL_SESSION") {
        // Token refresh falló → forzar logout (una sola vez)
        if (refreshAttempted) return;
        refreshAttempted = true;
        console.warn("[Layout] Session lost — forcing logout");
        await supabase.auth.signOut();
        navigate("/auth");
        toast({
          title: "Sesión expirada",
          description: "Por favor inicia sesión nuevamente",
          variant: "destructive",
        });
      } else if (session) {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Verificar sesión cada 30 minutos (protección contra expiración silenciosa)
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn("[Layout] Periodic check: no active session");
        navigate("/auth");
      }
    };

    const interval = setInterval(checkSession, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [navigate]);

  // Detectar si usuario es solo almacen
  const isOnlyAlmacen = useMemo(() => {
    return roles.length === 1 && roles.includes("almacen");
  }, [roles]);

  // Detectar si usuario es solo gerente almacén
  const isOnlyGerenteAlmacen = useMemo(() => {
    return roles.length === 1 && roles.includes("gerente_almacen");
  }, [roles]);

  // Detectar si usuario es solo secretaria (sin admin)
  const isOnlySecretaria = useMemo(() => {
    return roles.includes("secretaria") && !roles.includes("admin");
  }, [roles]);

  // Detectar si usuario es solo vendedor (sin admin ni secretaria)
  const isOnlyVendedor = useMemo(() => {
    return roles.includes("vendedor") && !roles.includes("admin") && !roles.includes("secretaria");
  }, [roles]);

  // Detectar si usuario es solo chofer
  const isOnlyChofer = useMemo(() => {
    return roles.length === 1 && roles.includes("chofer");
  }, [roles]);

  const allowedPagesForAlmacen = ["/almacen-tablet", "/almacen-tablet/carga-scan", "/chat"];
  const allowedPagesForSecretaria = ["/secretaria", "/chat"];
  const allowedPagesForVendedor = ["/vendedor", "/vendedor/analisis", "/chat", "/precios"];
  const allowedPagesForChofer = ["/chofer", "/chat"];

  // Menú organizado por categorías
  const menuCategories: MenuCategory[] = useMemo(() => [
    {
      label: "Principal",
      items: [
        { icon: Home, label: "Dashboard", path: "/dashboard" },
      ]
    },
    {
      label: "Catálogos",
      items: [
        { icon: Package, label: "Productos", path: "/productos" },
        { icon: DollarSign, label: "Lista de Precios", path: "/precios" },
        { icon: Bug, label: "Fumigaciones", path: "/fumigaciones" },
      ]
    },
    {
      label: "Operaciones",
      items: [
        { icon: Users, label: "Clientes", path: "/clientes" },
        { icon: ShoppingCart, label: "Pedidos", path: "/pedidos" },
        { icon: ShoppingBag, label: "Compras", path: "/compras" },
        { icon: Warehouse, label: "Inventario", path: "/inventario" },
      ]
    },
    {
      label: "Lecaroz",
      items: [
        { icon: FileText, label: "Cotizaciones", path: "/lecaroz/cotizaciones" },
        { icon: Store, label: "Bandeja", path: "/lecaroz/bandeja" },
      ]
    },
    {
      label: "Logística",
      items: [
        { icon: Truck, label: "Rutas y Entregas", path: "/rutas" },
      ]
    },
    {
      label: "Finanzas",
      items: [
        { icon: FileText, label: "Facturación", path: "/facturas" },
        { icon: PieChart, label: "Rentabilidad", path: "/rentabilidad" },
      ]
    },
    {
      label: "RRHH",
      items: [
        { icon: UserCog, label: "Empleados", path: "/empleados" },
        { icon: Clock, label: "Asistencia", path: "/asistencia" },
        { icon: Truck, label: "Vehículos", path: "/vehiculos" },
      ]
    },
    {
      label: "Comunicación",
      items: [
        { icon: MessageCircle, label: "Chat", path: "/chat" },
      ]
    },
    {
      label: "Sistema",
      items: [
        { icon: Settings, label: "Configuración", path: "/configuracion" },
        { icon: Smartphone, label: "App Móvil", path: "/generate-assets" },
        { icon: Warehouse, label: "Almacén Tablet", path: "/almacen-tablet" },
      ]
    },
  ], []);

  // Filtrar categorías y items según permisos del usuario
  const filteredCategories = useMemo(() => {
    if (permissionsLoading || allowedPaths.length === 0) return menuCategories;
    
    return menuCategories.map(category => ({
      ...category,
      items: category.items.filter(item => {
        // Ocultar /precios para secretarias (ya lo tienen en su panel dedicado)
        if (item.path === '/precios' && isOnlySecretaria) {
          return false;
        }
        return checkAccess(item.path);
      })
    })).filter(category => category.items.length > 0);
  }, [allowedPaths, permissionsLoading, checkAccess, isOnlySecretaria, menuCategories]);

  // Verificar si el usuario puede ver correos
  const canViewEmails = useMemo(() => {
    return checkAccess('/correos');
  }, [checkAccess]);

  // Redirección automática por rol (después de todos los hooks)
  if (!rolesLoading && isOnlyAlmacen && !allowedPagesForAlmacen.some(p => location.pathname.startsWith(p))) {
    return <Navigate to="/almacen-tablet" replace />;
  }

  if (!rolesLoading && isOnlyGerenteAlmacen && !allowedPagesForAlmacen.some(p => location.pathname.startsWith(p)) && location.pathname !== "/configuracion") {
    return <Navigate to="/almacen-tablet" replace />;
  }

  if (!rolesLoading && isOnlySecretaria && !allowedPagesForSecretaria.includes(location.pathname)) {
    return <Navigate to="/secretaria" replace />;
  }

  if (!rolesLoading && isOnlyVendedor && !allowedPagesForVendedor.includes(location.pathname)) {
    return <Navigate to="/vendedor" replace />;
  }

  if (!rolesLoading && isOnlyChofer && !allowedPagesForChofer.includes(location.pathname)) {
    return <Navigate to="/chofer" replace />;
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Sesión cerrada",
      description: "Has cerrado sesión correctamente",
    });
  };

  const handleEmailAccountClick = (email: string, isMobile: boolean) => {
    navigate(`/correos?cuenta=${encodeURIComponent(email)}`);
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  const renderEmailMenuItem = (isMobile: boolean = false) => {
    const isActive = location.pathname === "/correos";
    
    return (
      <Collapsible open={emailMenuOpen} onOpenChange={setEmailMenuOpen}>
        <div className="space-y-1">
          <div className="flex items-center">
            <Link 
              to="/correos" 
              className="flex-1"
              onClick={isMobile ? () => setMobileMenuOpen(false) : undefined}
            >
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className="w-full justify-start"
              >
                <Mail className="h-4 w-4 mr-2" />
                Correos
                {totalUnreadEmails > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="ml-auto mr-2 h-5 min-w-5 flex items-center justify-center px-1.5"
                  >
                    {totalUnreadEmails > 99 ? "99+" : totalUnreadEmails}
                  </Badge>
                )}
              </Button>
            </Link>
            {emailCuentas.length > 0 && (
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  {emailMenuOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            )}
          </div>
          <CollapsibleContent className="pl-6 space-y-1">
            {emailCuentas.map((cuenta) => (
              <div 
                key={cuenta.id} 
                onClick={() => handleEmailAccountClick(cuenta.email, isMobile)}
                className="flex items-center justify-between py-1.5 px-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors cursor-pointer"
              >
                <span className="truncate max-w-[140px]" title={cuenta.email}>
                  {cuenta.nombre}
                </span>
                {(emailCounts[cuenta.email] || 0) > 0 && (
                  <Badge 
                    variant="secondary" 
                    className="h-5 min-w-5 flex items-center justify-center px-1.5 bg-primary/10 text-primary"
                  >
                    {emailCounts[cuenta.email]}
                  </Badge>
                )}
              </div>
            ))}
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  };

  // Renderizar items del menú con categorías
  const renderMenuItems = (isMobile: boolean = false) => {
    return filteredCategories.map((category, categoryIndex) => (
      <div key={category.label} className="mb-1">
        {/* Separador visual entre categorías (excepto la primera) */}
        {categoryIndex > 0 && (
          <div className="h-px bg-border my-3" />
        )}
        {/* Label de categoría */}
        <div className="px-3 py-1.5 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
            {category.label}
          </span>
        </div>
        {/* Items de la categoría */}
        {category.items.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          const showBadge = item.path === "/chat" && unreadCount > 0;
          return (
            <Link 
              key={item.path} 
              to={item.path}
              onClick={isMobile ? () => setMobileMenuOpen(false) : undefined}
            >
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className="w-full justify-start relative group hover:bg-accent/80 hover:translate-x-1 transition-all duration-200 mb-0.5"
              >
                <Icon className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-200" />
                {item.label}
                {showBadge && (
                  <Badge 
                    variant="destructive" 
                    className="ml-auto h-5 min-w-5 flex items-center justify-center px-1.5"
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Badge>
                )}
              </Button>
            </Link>
          );
        })}
      </div>
    ));
  };

  // Mostrar loader mientras carga sesión O roles
  if (loading || rolesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pt-[env(safe-area-inset-top)]">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            {/* Botón regresar - solo móvil y no en dashboard */}
            {location.pathname !== '/dashboard' && (
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <Link to="/dashboard" className="flex items-center gap-3">
              <img src={logoAlmasa} alt="ALMASA" className="h-10" />
              <span className="text-sm text-muted-foreground hidden lg:inline">
                Abarrotes la Manita SA de CV
              </span>
            </Link>
            <QuickActions />
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <GlobalSearch />
            <ThemeToggle className="hidden sm:flex" />
            <UserPreferencesPopover />
            <CentroNotificaciones />
            <Link to="/tarjeta" className="hidden sm:block">
              <Button variant="ghost" size="sm">
                <CreditCard className="h-4 w-4 mr-2" />
                Mi Tarjeta
              </Button>
            </Link>
            <Link to="/mi-perfil" className="hidden lg:flex items-center gap-2 hover:opacity-80">
              {userFoto ? (
                <img src={userFoto} className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
                  {user?.email?.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-sm text-muted-foreground max-w-[130px] truncate">{user?.email}</span>
            </Link>
            <Button variant="outline" size="icon" className="sm:hidden" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="hidden sm:flex" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Salir
            </Button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar - Desktop (más angosto en tablets) */}
        <aside className="hidden md:flex md:w-52 lg:w-64 min-h-[calc(100vh-4rem)] border-r bg-card flex-shrink-0">
          <nav className="flex flex-col w-full p-3 lg:p-4 overflow-y-auto">
            {renderMenuItems(false)}
            {/* Correos después de las categorías */}
            {canViewEmails && (
              <div className="mt-1">
                <div className="h-px bg-border my-3" />
                {renderEmailMenuItem(false)}
              </div>
            )}
          </nav>
        </aside>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div 
            className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          >
            <aside 
              className="fixed left-0 top-[calc(4rem+env(safe-area-inset-top))] bottom-0 w-72 border-r bg-card shadow-2xl overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <span className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Menú</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <nav className="flex flex-col p-4 pb-24">
                {renderMenuItems(true)}
                {canViewEmails && (
                  <div className="mt-1">
                    <div className="h-px bg-border my-3" />
                    {renderEmailMenuItem(true)}
                  </div>
                )}
              </nav>
            </aside>
          </div>
        )}

        {/* Birthday Banner */}
        <CumpleanosBannerLazy />
        {/* Main Content */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 xl:px-10 py-4 sm:py-6 lg:py-8 overflow-auto min-h-0">{children}</main>
      </div>
    </div>
  );
};

export default Layout;