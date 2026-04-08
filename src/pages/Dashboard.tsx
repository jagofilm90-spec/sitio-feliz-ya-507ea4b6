import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { AlmasaLoading } from "@/components/brand/AlmasaLoading";
import { NotificacionesSistema } from "@/components/NotificacionesSistema";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

import { UsuariosConectadosPanel } from "@/components/admin/UsuariosConectadosPanel";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useSystemPresence } from "@/hooks/useSystemPresence";
import { useIsMobile } from "@/hooks/use-mobile";
import { KPICards } from "@/components/dashboard/KPICards";
import { EstadoOperacionesPanel } from "@/components/dashboard/EstadoOperacionesPanel";
import { EstadoOperacionesMobile } from "@/components/dashboard/EstadoOperacionesMobile";
import { MapaRutasWidget } from "@/components/dashboard/MapaRutasWidget";
import { VentasMensualesChart } from "@/components/dashboard/VentasMensualesChart";
import { CobranzaCriticaPanel } from "@/components/dashboard/CobranzaCriticaPanel";
import { CreditoExcedidoAlert } from "@/components/dashboard/CreditoExcedidoAlert";
import { VendedoresResumen } from "@/components/dashboard/VendedoresResumen";
import { EntregasHoyPanel } from "@/components/dashboard/EntregasHoyPanel";
import { InventarioResumen } from "@/components/dashboard/InventarioResumen";
import { AlertasUrgentes } from "@/components/dashboard/AlertasUrgentes";
import { TopProductosClientesPanel } from "@/components/dashboard/TopProductosClientesPanel";
import { ResumenFinancieroPanel } from "@/components/dashboard/ResumenFinancieroPanel";
import { useDashboardData, type Periodo } from "@/components/dashboard/useDashboardData";
import { EntregasEnDescargaWidget } from "@/components/dashboard/EntregasEnDescargaWidget";
import { ResumenDiaWidget } from "@/components/dashboard/ResumenDiaWidget";
import { COMPANY_DATA } from "@/constants/companyData";
import { EmpleadosPruebaAlert } from "@/components/dashboard/EmpleadosPruebaAlert";
import { CumpleanosWidget } from "@/components/dashboard/CumpleanosWidget";
import { LicenciasVencimientoAlert } from "@/components/dashboard/LicenciasVencimientoAlert";
import { VacacionesHoyWidget } from "@/components/dashboard/VacacionesHoyWidget";
import { AsistenciaHoyWidget } from "@/components/dashboard/AsistenciaHoyWidget";
import { VentasBajoCostoWidget } from "@/components/dashboard/VentasBajoCostoWidget";
import { PageHeader } from "@/components/layout/PageHeader";
import { supabase } from "@/integrations/supabase/client";

// Collapsible section helper
function DashSection({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button className="flex items-center justify-between w-full py-2 group cursor-pointer">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">{title}</h2>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { roles, isLoading: rolesLoading, isAdmin } = useUserRoles();
  const isMobile = useIsMobile();
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [dashTab, setDashTab] = useState("general");
  const { data: dashData, loading: dashLoading, refresh, lastRefresh } = useDashboardData(periodo);
  const [userName, setUserName] = useState<string>('');

  useSystemPresence('dashboard');

  // Get user's first name
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: emp } = await supabase
          .from('empleados')
          .select('nombre, nombre_completo')
          .eq('user_id', user.id)
          .maybeSingle();
        if (emp) {
          setUserName((emp.nombre || emp.nombre_completo?.split(' ')[0] || '').trim());
        }
      }
    };
    getUser();
  }, []);

  // Redirect almacen/chofer
  useEffect(() => {
    if (!rolesLoading && roles.length > 0) {
      if (roles.length === 1 && roles.includes('almacen')) {
        navigate('/almacen-tablet', { replace: true });
        return;
      }
      if (roles.length === 1 && roles.includes('chofer')) {
        navigate('/chofer', { replace: true });
        return;
      }
    }
  }, [roles, rolesLoading, navigate]);

  if (rolesLoading) {
    return (
      <Layout>
        <div className="space-y-4 md:space-y-6">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="p-4 space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-3 w-16" />
              </Card>
            ))}
          </div>
          <Skeleton className="h-[300px] w-full rounded-lg" />
        </div>
      </Layout>
    );
  }

  const isOnlyAlmacen = roles.length === 1 && roles.includes('almacen');
  const isOnlyChofer = roles.length === 1 && roles.includes('chofer');
  if (isOnlyAlmacen || isOnlyChofer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <AlmasaLoading size={48} text="Cargando..." />
      </div>
    );
  }

  return (
    <Layout>
      <div className={`space-y-4 ${isMobile ? 'space-y-3' : 'md:space-y-5'}`}>
        {/* Header */}
        <PageHeader
          eyebrow="Hoy"
          title="Buenos días,"
          titleAccent={`${userName || 'Jose'}.`}
          lead="Aquí está cómo va ALMASA hoy."
          actions={
            <div className="flex items-center gap-2">
              <ToggleGroup type="single" value={periodo} onValueChange={(v) => v && setPeriodo(v as Periodo)} className="hidden sm:flex">
                <ToggleGroupItem value="hoy" className="text-xs h-8 px-3">Hoy</ToggleGroupItem>
                <ToggleGroupItem value="semana" className="text-xs h-8 px-3">Semana</ToggleGroupItem>
                <ToggleGroupItem value="mes" className="text-xs h-8 px-3">Mes</ToggleGroupItem>
                <ToggleGroupItem value="anio" className="text-xs h-8 px-3">Año</ToggleGroupItem>
              </ToggleGroup>
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => refresh()} title="Actualizar">
                <RefreshCw className={`h-4 w-4 ${dashLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          }
        />

        {/* Mobile period selector */}
        <ToggleGroup type="single" value={periodo} onValueChange={(v) => v && setPeriodo(v as Periodo)} className="sm:hidden justify-start">
          <ToggleGroupItem value="hoy" className="text-xs h-8 px-3">Hoy</ToggleGroupItem>
          <ToggleGroupItem value="semana" className="text-xs h-8 px-3">Semana</ToggleGroupItem>
          <ToggleGroupItem value="mes" className="text-xs h-8 px-3">Mes</ToggleGroupItem>
          <ToggleGroupItem value="anio" className="text-xs h-8 px-3">Año</ToggleGroupItem>
        </ToggleGroup>

        <NotificacionesSistema />

        {/* ALERTAS URGENTES — Always on top */}
        {dashData && <AlertasUrgentes alertas={dashData.alertas} />}

        {/* Entregas en descarga */}
        {(dashData?.kpis?.entregasEnDescarga > 0 || (dashData?.kpis?.entregasCompletadasHoyDetalle?.length || 0) > 0) && (
          <EntregasEnDescargaWidget
            entregas={dashData?.kpis?.entregasEnDescargaDetalle || []}
            completadasHoy={dashData?.kpis?.entregasCompletadasHoyDetalle || []}
          />
        )}

        {/* Admin tabs: General | RRHH | Finanzas */}
        {isAdmin ? (
          <Tabs value={dashTab} onValueChange={setDashTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="general" className="text-xs">General</TabsTrigger>
              <TabsTrigger value="rrhh" className="text-xs">RRHH</TabsTrigger>
              <TabsTrigger value="finanzas" className="text-xs">Finanzas</TabsTrigger>
            </TabsList>

            {/* ==================== TAB: GENERAL ==================== */}
            <TabsContent value="general" className="space-y-4 mt-0">
              {/* KPIs */}
              <KPICards data={dashData?.kpis ?? null} loading={dashLoading} />

              {/* Operations */}
              <DashSection title="Operaciones">
                {isMobile ? <EstadoOperacionesMobile /> : <EstadoOperacionesPanel />}
                <MapaRutasWidget />
                {!isMobile && <UsuariosConectadosPanel />}
              </DashSection>

              {/* Quick metrics */}
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
                <AsistenciaHoyWidget />
                <div className="cursor-pointer" onClick={() => navigate('/clientes')}><CreditoExcedidoAlert /></div>
                <VendedoresResumen />
                <div className="cursor-pointer" onClick={() => navigate('/rutas')}><EntregasHoyPanel /></div>
                <div className="cursor-pointer" onClick={() => navigate('/inventario')}><InventarioResumen /></div>
              </div>

              {/* Ventas bajo costo */}
              <VentasBajoCostoWidget />
            </TabsContent>

            {/* ==================== TAB: RRHH ==================== */}
            <TabsContent value="rrhh" className="space-y-4 mt-0">
              <EmpleadosPruebaAlert />
              <CumpleanosWidget />
              <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                <VacacionesHoyWidget />
                <LicenciasVencimientoAlert />
              </div>
              <AsistenciaHoyWidget />
            </TabsContent>

            {/* ==================== TAB: FINANZAS ==================== */}
            <TabsContent value="finanzas" className="space-y-4 mt-0">
              <ResumenDiaWidget />
              <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                <VentasMensualesChart />
                <CobranzaCriticaPanel />
              </div>
              {dashData && (
                <TopProductosClientesPanel
                  topProductos={dashData.topProductos}
                  topClientes={dashData.topClientes}
                />
              )}
              {dashData && <ResumenFinancieroPanel data={dashData.resumenFinanciero} />}
            </TabsContent>
          </Tabs>
        ) : (
          /* Non-admin: simple layout without tabs */
          <div className="space-y-4">
            <KPICards data={dashData?.kpis ?? null} loading={dashLoading} />
            {isMobile ? <EstadoOperacionesMobile /> : <EstadoOperacionesPanel />}
            <MapaRutasWidget />
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
              <VentasMensualesChart />
              <CobranzaCriticaPanel />
            </div>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
              <div className="cursor-pointer" onClick={() => navigate('/clientes')}><CreditoExcedidoAlert /></div>
              <VendedoresResumen />
              <div className="cursor-pointer" onClick={() => navigate('/rutas')}><EntregasHoyPanel /></div>
              <div className="cursor-pointer" onClick={() => navigate('/inventario')}><InventarioResumen /></div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;
