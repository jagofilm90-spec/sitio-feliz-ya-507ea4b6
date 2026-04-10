import { ReactNode, useEffect, useState, useMemo, lazy, Suspense } from "react";
import { AlmasaLoading } from "@/components/brand/AlmasaLoading";
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

import { UserPreferencesPopover } from "@/components/UserPreferencesPopover";
import { AlmasaLogo } from "@/components/brand/AlmasaLogo";
import { GlobalSearch } from "@/components/GlobalSearch";
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
  Scale,
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
        { icon: Scale, label: "Modo de cobro", path: "/productos/modo-cobro" },
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
      <div key={category.label}>
        {/* Nav group label */}
        <div
          className="text-[9px] uppercase tracking-[0.22em] text-ink-400 font-medium px-3 mb-2"
          style={{ marginTop: categoryIndex === 0 ? 0 : '20px' }}
        >
          — {category.label.toUpperCase()}
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
              className={`
                flex items-center gap-3 px-3 py-[9px] text-[13.5px] rounded-md transition-all duration-150 mb-0.5
                ${isActive 
                  ? 'bg-crimson-100 text-crimson-700 font-medium' 
                  : 'text-ink-700 font-normal hover:bg-ink-50 hover:text-ink-900'}
              `}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {showBadge && (
                <Badge 
                  variant="destructive" 
                  className="h-5 min-w-5 flex items-center justify-center px-1.5"
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Badge>
              )}
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
        <AlmasaLoading size={56} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-white border-b border-ink-100 pt-[env(safe-area-inset-top)]" style={{ borderBottomWidth: '0.5px' }}>
        <div className="flex h-14 items-center justify-between px-4 sm:px-8">
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
            <GlobalSearch />
          </div>
          <div className="flex items-center gap-2">
            <UserPreferencesPopover />
            <CentroNotificaciones />
            <Link to="/mi-perfil" className="hidden lg:flex items-center gap-2 rounded-full bg-bg-soft border border-ink-100 py-1 pl-1 pr-3 hover:opacity-80" style={{ borderWidth: '0.5px' }}>
              {userFoto ? (
                <img src={userFoto} className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
                  {user?.email?.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-xs text-ink-700 font-medium max-w-[130px] truncate">{user?.email}</span>
            </Link>
            <Button variant="outline" size="icon" className="sm:hidden" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="hidden sm:flex text-ink-500 hover:text-ink-900" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar - Desktop */}
        <aside className="hidden md:flex md:w-56 lg:w-64 flex-shrink-0 bg-bg-soft border-r border-ink-100 overflow-y-auto" style={{ borderRightWidth: '0.5px' }}>
          <nav className="flex flex-col w-full py-6 px-4">
            {/* Brand header */}
            <div className="flex items-center gap-3.5 px-3 pb-6 mb-5 border-b border-ink-100" style={{ borderBottomWidth: '0.5px' }}>
              <AlmasaLogo size={36} />
              <div style={{ lineHeight: 1 }}>
                <div className="font-serif text-[22px] font-semibold text-crimson-500 tracking-wide" style={{ lineHeight: 1, letterSpacing: '0.03em' }}>
                  ALMASA
                </div>
                <div className="text-[9px] uppercase tracking-[0.18em] text-ink-500 mt-1.5 font-medium">
                  Sistema · 1904
                </div>
              </div>
            </div>
            {renderMenuItems(false)}
            {/* Correos después de las categorías */}
            {canViewEmails && (
              <div className="mt-1">
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
        <main className="flex-1 px-6 sm:px-8 lg:px-12 py-8 lg:py-10 overflow-auto min-h-0">{children}</main>
      </div>
    </div>
  );
};

export default Layout;