import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Loader2, RefreshCw } from "lucide-react";
import { NotificacionesSistema } from "@/components/NotificacionesSistema";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

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

const Dashboard = () => {
  const navigate = useNavigate();
  const { roles, isLoading: rolesLoading, isAdmin } = useUserRoles();
  const isMobile = useIsMobile();
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const { data: dashData, loading: dashLoading, refresh, lastRefresh } = useDashboardData(periodo);

  // Track presence in dashboard
  useSystemPresence('dashboard');

  // Redirección inmediata para almacenistas y choferes
  useEffect(() => {
    if (!rolesLoading && roles.length > 0) {
      const isOnlyAlmacen = roles.length === 1 && roles.includes('almacen');
      const isOnlyChofer = roles.length === 1 && roles.includes('chofer');
      
      if (isOnlyAlmacen) {
        navigate('/almacen-tablet', { replace: true });
        return;
      }
      if (isOnlyChofer) {
        navigate('/chofer', { replace: true });
        return;
      }
    }
  }, [roles, rolesLoading, navigate]);

  // Mostrar loader mientras verifica roles
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

  // Si es almacen o chofer, mostrar loader mientras redirige
  const isOnlyAlmacen = roles.length === 1 && roles.includes('almacen');
  const isOnlyChofer = roles.length === 1 && roles.includes('chofer');
  if (isOnlyAlmacen || isOnlyChofer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Layout>
      <div className={`space-y-4 ${isMobile ? 'space-y-3' : 'md:space-y-6'}`}>
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className={`font-bold ${isMobile ? 'text-xl' : 'text-3xl'}`}>Dashboard Ejecutivo</h1>
            <p className="text-muted-foreground text-sm">Control total del negocio</p>
            <p className="text-xs italic text-muted-foreground/70">"{COMPANY_DATA.slogan}"</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => refresh()}
              title="Actualizar datos"
            >
              <RefreshCw className={`h-4 w-4 ${dashLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Period Selector */}
        <ToggleGroup type="single" value={periodo} onValueChange={(v) => v && setPeriodo(v as Periodo)} className="justify-start">
          <ToggleGroupItem value="hoy" className="text-xs h-8 px-3">Hoy</ToggleGroupItem>
          <ToggleGroupItem value="semana" className="text-xs h-8 px-3">Semana</ToggleGroupItem>
          <ToggleGroupItem value="mes" className="text-xs h-8 px-3">Mes</ToggleGroupItem>
          <ToggleGroupItem value="anio" className="text-xs h-8 px-3">Año</ToggleGroupItem>
        </ToggleGroup>

        <NotificacionesSistema />

        {/* Alertas Urgentes - solo si hay */}
        {dashData && <AlertasUrgentes alertas={dashData.alertas} />}

        {/* Empleados con periodo de prueba por vencer */}
        {isAdmin && <EmpleadosPruebaAlert />}

        {/* Cumpleaños y aniversarios */}
        {isAdmin && <CumpleanosWidget />}

        {/* Licencias por vencer */}
        {isAdmin && <LicenciasVencimientoAlert />}

        {/* Descargas en curso + completadas hoy */}
        {(dashData?.kpis?.entregasEnDescarga > 0 || (dashData?.kpis?.entregasCompletadasHoyDetalle?.length || 0) > 0) && (
          <EntregasEnDescargaWidget
            entregas={dashData?.kpis?.entregasEnDescargaDetalle || []}
            completadasHoy={dashData?.kpis?.entregasCompletadasHoyDetalle || []}
          />
        )}

        {/* Resumen del Día - solo admin */}
        {isAdmin && <ResumenDiaWidget />}

        {/* KPIs Principales - 3 rows */}
        <KPICards data={dashData?.kpis ?? null} loading={dashLoading} />

        {/* Estado de Operaciones */}
        {isMobile ? <EstadoOperacionesMobile /> : <EstadoOperacionesPanel />}

        {/* Mapa de Rutas - ahora también en mobile */}
        <MapaRutasWidget />

        {/* Panel de Usuarios Conectados - Solo en desktop y admin */}
        {!isMobile && isAdmin && <UsuariosConectadosPanel />}

        {/* Gráfico de Ventas y Cobranza Crítica */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          <VentasMensualesChart />
          <CobranzaCriticaPanel />
        </div>

        {/* Top Productos y Clientes */}
        {dashData && (
          <TopProductosClientesPanel
            topProductos={dashData.topProductos}
            topClientes={dashData.topClientes}
          />
        )}

        {/* Resumen Financiero */}
        {dashData && <ResumenFinancieroPanel data={dashData.resumenFinanciero} />}

        {/* Crédito Excedido, Vendedores, Entregas e Inventario */}
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <div className="cursor-pointer" onClick={() => navigate('/clientes')}>
            <CreditoExcedidoAlert />
          </div>
          <VendedoresResumen />
          <div className="cursor-pointer" onClick={() => navigate('/rutas')}>
            <EntregasHoyPanel />
          </div>
          <div className="cursor-pointer" onClick={() => navigate('/inventario')}>
            <InventarioResumen />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
