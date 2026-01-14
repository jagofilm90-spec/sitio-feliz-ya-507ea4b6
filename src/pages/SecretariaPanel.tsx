import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useUnreadEmails } from "@/hooks/useUnreadEmails";
import { useSolicitudesVenta } from "@/hooks/useSolicitudesVenta";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CentroNotificaciones } from "@/components/CentroNotificaciones";
import logoAlmasa from "@/assets/logo-almasa.png";
import {
  ClipboardList,
  FileText,
  Store,
  Mail,
  Users,
  Truck,
  Clock,
  AlertCircle,
  LogOut,
  Home,
  Loader2,
} from "lucide-react";
import { SecretariaPedidosTab } from "@/components/secretaria/SecretariaPedidosTab";
import { SecretariaFacturacionTab } from "@/components/secretaria/SecretariaFacturacionTab";
import { SolicitudesAlmacenTab } from "@/components/facturas/SolicitudesAlmacenTab";
import BandejaEntrada from "@/components/correos/BandejaEntrada";
import { useGmailPermisos } from "@/hooks/useGmailPermisos";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface GmailCuenta {
  id: string;
  email: string;
  nombre: string;
  proposito: string;
  activo: boolean;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
}

const SecretariaPanel = () => {
  const [activeTab, setActiveTab] = useState("pedidos");
  const navigate = useNavigate();
  const { roles, isLoading: rolesLoading, hasRole } = useUserRoles();
  const { totalUnread: totalUnreadEmails } = useUnreadEmails();
  const { pendingCount: ventasMostradorPendientes } = useSolicitudesVenta();
  const { filterCuentasByPermiso, isLoading: isLoadingPermisos } = useGmailPermisos();
  const [user, setUser] = useState<any>(null);

  // Verify role and session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });
  }, [navigate]);

  // Get Gmail accounts for email tab
  const { data: cuentas } = useQuery({
    queryKey: ["gmail-cuentas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gmail_cuentas")
        .select("*")
        .order("nombre");
      if (error) throw error;
      return data as GmailCuenta[];
    },
  });

  const isConnected = (cuenta: GmailCuenta) => {
    return !!(cuenta.access_token && cuenta.refresh_token);
  };

  const allConnectedCuentas = cuentas?.filter((c) => isConnected(c) && c.activo) || [];
  const connectedCuentas = filterCuentasByPermiso(allConnectedCuentas);

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

  // KPIs Query - Pedidos pendientes
  const { data: pedidosPendientes = 0 } = useQuery({
    queryKey: ["kpi-pedidos-pendientes"],
    queryFn: async () => {
      const { count } = await supabase
        .from("pedidos")
        .select("*", { count: "exact", head: true })
        .eq("status", "pendiente");
      return count || 0;
    },
    refetchInterval: 30000,
  });

  // KPIs Query - Facturas pendientes (sin timbrar)
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

  // KPIs Query - Entregas del día
  const { data: entregasHoy = 0 } = useQuery({
    queryKey: ["kpi-entregas-hoy"],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { count } = await supabase
        .from("entregas")
        .select("*", { count: "exact", head: true })
        .eq("fecha_entrega", today);
      return count || 0;
    },
    refetchInterval: 60000,
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  // Realtime subscription for new orders
  useEffect(() => {
    const channel = supabase
      .channel("secretaria-pedidos-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "pedidos" },
        () => {
          // Refetch KPIs when new order arrives
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (rolesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const kpis = [
    {
      label: "Por autorizar",
      value: pedidosPorAutorizar,
      icon: Clock,
      color: "text-amber-600",
      bgColor: "bg-amber-50 dark:bg-amber-950/30",
      onClick: () => setActiveTab("pedidos"),
    },
    {
      label: "Pendientes",
      value: pedidosPendientes,
      icon: ClipboardList,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
      onClick: () => setActiveTab("pedidos"),
    },
    {
      label: "Mostrador",
      value: ventasMostradorPendientes,
      icon: Store,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
      onClick: () => setActiveTab("mostrador"),
    },
    {
      label: "Facturas",
      value: facturasPendientes,
      icon: FileText,
      color: "text-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-950/30",
      onClick: () => setActiveTab("facturacion"),
    },
    {
      label: "Correos",
      value: totalUnreadEmails,
      icon: Mail,
      color: "text-rose-600",
      bgColor: "bg-rose-50 dark:bg-rose-950/30",
      onClick: () => setActiveTab("correos"),
    },
    {
      label: "Entregas hoy",
      value: entregasHoy,
      icon: Truck,
      color: "text-violet-600",
      bgColor: "bg-violet-50 dark:bg-violet-950/30",
      onClick: () => {},
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <img src={logoAlmasa} alt="ALMASA" className="h-10" />
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold">Panel Secretaria</h1>
              <p className="text-xs text-muted-foreground">
                {format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <CentroNotificaciones />
            {(hasRole("admin") || roles.length > 1) && (
              <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
                <Home className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Dashboard</span>
              </Button>
            )}
            <span className="text-sm text-muted-foreground hidden md:inline">
              {user?.email}
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Salir
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-4 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <Card
                key={kpi.label}
                className={`cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] ${kpi.bgColor}`}
                onClick={kpi.onClick}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <Icon className={`h-5 w-5 ${kpi.color}`} />
                    {kpi.value > 0 && (
                      <Badge variant="secondary" className="text-lg font-bold">
                        {kpi.value}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-2 text-sm font-medium">{kpi.label}</p>
                  {kpi.value === 0 && (
                    <p className="text-2xl font-bold text-muted-foreground">0</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Alert for pending items */}
        {(pedidosPorAutorizar > 0 || ventasMostradorPendientes > 0) && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
            <div className="text-sm">
              {pedidosPorAutorizar > 0 && (
                <span className="font-medium text-amber-800 dark:text-amber-200">
                  {pedidosPorAutorizar} pedido{pedidosPorAutorizar > 1 ? "s" : ""} esperando autorización.{" "}
                </span>
              )}
              {ventasMostradorPendientes > 0 && (
                <span className="font-medium text-amber-800 dark:text-amber-200">
                  {ventasMostradorPendientes} venta{ventasMostradorPendientes > 1 ? "s" : ""} de mostrador pendiente
                  {ventasMostradorPendientes > 1 ? "s" : ""}.
                </span>
              )}
            </div>
          </div>
        )}

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 h-auto">
            <TabsTrigger value="pedidos" className="gap-2 py-3">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Pedidos</span>
              {pedidosPorAutorizar > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {pedidosPorAutorizar}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="facturacion" className="gap-2 py-3">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Facturación</span>
              {facturasPendientes > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {facturasPendientes}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="mostrador" className="gap-2 py-3">
              <Store className="h-4 w-4" />
              <span className="hidden sm:inline">Mostrador</span>
              {ventasMostradorPendientes > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {ventasMostradorPendientes}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="correos" className="gap-2 py-3">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Correos</span>
              {totalUnreadEmails > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {totalUnreadEmails > 99 ? "99+" : totalUnreadEmails}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="clientes" className="gap-2 py-3">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Clientes</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pedidos" className="mt-6">
            <SecretariaPedidosTab />
          </TabsContent>

          <TabsContent value="facturacion" className="mt-6">
            <SecretariaFacturacionTab />
          </TabsContent>

          <TabsContent value="mostrador" className="mt-6">
            <SolicitudesAlmacenTab />
          </TabsContent>

          <TabsContent value="correos" className="mt-6">
            {isLoadingPermisos ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : connectedCuentas.length > 0 ? (
              <BandejaEntrada cuentas={connectedCuentas} />
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Mail className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No hay cuentas de correo configuradas</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="clientes" className="mt-6">
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Gestión de Clientes</h3>
                <p className="text-muted-foreground mb-4">Accede al módulo completo de clientes</p>
                <Button onClick={() => navigate("/clientes")}>
                  Ir a Clientes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SecretariaPanel;
