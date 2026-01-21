import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Loader2 } from "lucide-react";
import { NotificacionesSistema } from "@/components/NotificacionesSistema";
import { SolicitudesDescuentoPanel } from "@/components/admin/SolicitudesDescuentoPanel";
import { UsuariosConectadosPanel } from "@/components/admin/UsuariosConectadosPanel";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useSystemPresence } from "@/hooks/useSystemPresence";
import { KPICards } from "@/components/dashboard/KPICards";
import { VentasMensualesChart } from "@/components/dashboard/VentasMensualesChart";
import { CobranzaCriticaPanel } from "@/components/dashboard/CobranzaCriticaPanel";
import { CreditoExcedidoAlert } from "@/components/dashboard/CreditoExcedidoAlert";
import { VendedoresResumen } from "@/components/dashboard/VendedoresResumen";
import { EntregasHoyPanel } from "@/components/dashboard/EntregasHoyPanel";
import { InventarioResumen } from "@/components/dashboard/InventarioResumen";

const Dashboard = () => {
  const navigate = useNavigate();
  const { roles, isLoading: rolesLoading, isAdmin } = useUserRoles();
  
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
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Ejecutivo</h1>
          <p className="text-muted-foreground">Control total del negocio</p>
        </div>

        <NotificacionesSistema />
        <SolicitudesDescuentoPanel />

        {/* KPIs Principales */}
        <KPICards />

        {/* Panel de Usuarios Conectados (solo admin) */}
        {isAdmin && <UsuariosConectadosPanel />}

        {/* Gráfico de Ventas y Cobranza Crítica */}
        <div className="grid gap-4 lg:grid-cols-2">
          <VentasMensualesChart />
          <CobranzaCriticaPanel />
        </div>

        {/* Crédito Excedido, Vendedores, Entregas e Inventario */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
