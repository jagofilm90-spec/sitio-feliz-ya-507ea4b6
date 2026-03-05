import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Loader2 } from "lucide-react";
import { NotificacionesSistema } from "@/components/NotificacionesSistema";

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
import { COMPANY_DATA } from "@/constants/companyData";

const Dashboard = () => {
  const navigate = useNavigate();
  const { roles, isLoading: rolesLoading, isAdmin } = useUserRoles();
  const isMobile = useIsMobile();
  
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
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
      <div className="space-y-4 md:space-y-6">
        <div>
          <h1 className={`font-bold ${isMobile ? 'text-xl' : 'text-3xl'}`}>Dashboard Ejecutivo</h1>
          <p className="text-muted-foreground text-sm">Control total del negocio</p>
          <p className="text-xs italic text-muted-foreground/70">"{COMPANY_DATA.slogan}"</p>
        </div>

        <NotificacionesSistema />
        

        {/* KPIs Principales */}
        <KPICards />

        {/* Estado de Operaciones - Carrusel en móvil, Panel en desktop */}
        {isMobile ? <EstadoOperacionesMobile /> : <EstadoOperacionesPanel />}

        {/* Mapa de Rutas Activas - Solo en desktop/tablet */}
        {!isMobile && <MapaRutasWidget />}

        {/* Panel de Usuarios Conectados - Solo en desktop y admin */}
        {!isMobile && isAdmin && <UsuariosConectadosPanel />}

        {/* Gráfico de Ventas y Cobranza Crítica - Stack vertical en móvil */}
        <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'lg:grid-cols-2'}`}>
          <VentasMensualesChart />
          <CobranzaCriticaPanel />
        </div>

        {/* Crédito Excedido, Vendedores, Entregas e Inventario - 2 cols en móvil */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <CreditoExcedidoAlert />
          <VendedoresResumen />
          <EntregasHoyPanel />
          <InventarioResumen />
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
