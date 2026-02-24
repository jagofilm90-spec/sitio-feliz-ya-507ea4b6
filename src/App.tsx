import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import TarjetaDigital from "./pages/TarjetaDigital";
import Privacidad from "./pages/Privacidad";
import Soporte from "./pages/Soporte";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { ErrorBoundary } from "./components/ErrorBoundary";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Productos from "./pages/Productos";
import Clientes from "./pages/Clientes";
import Pedidos from "./pages/Pedidos";
import Inventario from "./pages/Inventario";
import Rutas from "./pages/Rutas";
import Facturas from "./pages/Facturas";
import PortalCliente from "./pages/PortalCliente";
import Usuarios from "./pages/Usuarios";
import Empleados from "./pages/Empleados";
import Chat from "./pages/Chat";
import Compras from "./pages/Compras";
import Rentabilidad from "./pages/Rentabilidad";
import Fumigaciones from "./pages/Fumigaciones";
import CorreosCorporativos from "./pages/CorreosCorporativos";
import GenerateAssets from "./pages/GenerateAssets";
import DisenosCamioneta from "./pages/DisenosCamioneta";
import Permisos from "./pages/Permisos";
import Respaldos from "./pages/Respaldos";
import AlmacenTablet from "./pages/AlmacenTablet";
import AlmacenCargaScan from "./pages/AlmacenCargaScan";
import ChoferPanel from "./pages/ChoferPanel";
import VendedorPanel from "./pages/VendedorPanel";
import VendedorAnalisisVentas from "./pages/VendedorAnalisisVentas";
import SecretariaPanel from "./pages/SecretariaPanel";
import AppMobileGuide from "./pages/AppMobileGuide";
import TestFirma from "./pages/TestFirma";
import Precios from "./pages/Precios";
import Configuracion from "./pages/Configuracion";
import PushDiagnosticsPage from "./pages/PushDiagnosticsPage";

import PushNotificationsGate from "./components/PushNotificationsGate";
import ProtectedRoute from "./components/ProtectedRoute";
import { isNativePlatform } from "./services/pushNotifications";

const queryClient = new QueryClient();

// Componente para aplicar preferencias de accesibilidad globalmente
const AccessibilityPreferencesApplicator = () => {
  useEffect(() => {
    const applyPreferences = () => {
      try {
        const stored = localStorage.getItem('user_preferences');
        if (stored) {
          const prefs = JSON.parse(stored);
          
          // Font size
          if (prefs.fontSize === 'large') {
            document.documentElement.classList.add('font-size-large');
          } else {
            document.documentElement.classList.remove('font-size-large');
          }
          
          // High contrast
          if (prefs.highContrast) {
            document.documentElement.classList.add('high-contrast');
          } else {
            document.documentElement.classList.remove('high-contrast');
          }
        }
      } catch (error) {
        console.error('Error applying preferences:', error);
      }
    };
    
    applyPreferences();
    
    // Escuchar cambios en localStorage (desde otras pestañas)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user_preferences') {
        applyPreferences();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // También escuchar cambios internos via custom event
    const handlePreferenceChange = () => applyPreferences();
    window.addEventListener('user-preferences-changed', handlePreferenceChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('user-preferences-changed', handlePreferenceChange);
    };
  }, []);

  return null;
};

// PushNotificationInitializer removed - logic moved to PushNotificationsGate
// which is rendered inside BrowserRouter for proper route detection

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AccessibilityPreferencesApplicator />
          <BrowserRouter>
            {/* PushNotificationsGate must be inside BrowserRouter to use useLocation */}
            <PushNotificationsGate />
            <Routes>
              <Route path="/" element={<Navigate to="/auth" replace />} />
              <Route path="/auth" element={<Auth />} />
              
              {/* Rutas protegidas - Dashboard requiere roles que NO sean solo almacen/chofer */}
              <Route path="/dashboard" element={
                <ProtectedRoute allowedRoles={['admin', 'secretaria', 'vendedor', 'contadora']} redirectTo="/auth">
                  <Dashboard />
                </ProtectedRoute>
              } />
              
              <Route path="/productos" element={<Productos />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/pedidos" element={<Pedidos />} />
              <Route path="/inventario" element={<Inventario />} />
              <Route path="/rutas" element={<Rutas />} />
              <Route path="/facturas" element={<Facturas />} />
              <Route path="/portal-cliente" element={<PortalCliente />} />
              <Route path="/empleados" element={<Empleados />} />
              <Route path="/usuarios" element={<Usuarios />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/compras" element={<Compras />} />
              <Route path="/rentabilidad" element={<Rentabilidad />} />
              <Route path="/fumigaciones" element={<Fumigaciones />} />
              <Route path="/correos" element={<CorreosCorporativos />} />
              <Route path="/generate-assets" element={<GenerateAssets />} />
              <Route path="/tarjeta" element={<TarjetaDigital />} />
              <Route path="/privacidad" element={<Privacidad />} />
              <Route path="/soporte" element={<Soporte />} />
              <Route path="/disenos-camioneta" element={<DisenosCamioneta />} />
              <Route path="/permisos" element={<Permisos />} />
              <Route path="/respaldos" element={<Respaldos />} />
              <Route path="/almacen-tablet" element={<AlmacenTablet />} />
              <Route path="/almacen-tablet/carga-scan/:pedidoId?" element={<AlmacenCargaScan />} />
              <Route path="/chofer" element={<ChoferPanel />} />
              <Route path="/vendedor" element={<VendedorPanel />} />
              <Route path="/vendedor/analisis" element={<VendedorAnalisisVentas />} />
              <Route path="/secretaria" element={
                <ProtectedRoute allowedRoles={['admin', 'secretaria']} redirectTo="/auth">
                  <SecretariaPanel />
                </ProtectedRoute>
              } />
              <Route path="/app-mobile" element={<AppMobileGuide />} />
              <Route path="/test-firma" element={<TestFirma />} />
              <Route path="/precios" element={<Precios />} />
              <Route path="/configuracion" element={
                <ProtectedRoute allowedRoles={['admin', 'contadora', 'gerente_almacen']} redirectTo="/auth">
                  <Configuracion />
                </ProtectedRoute>
              } />
              {/* TEMPORAL: Sin protección para debug de Capacitor en iOS */}
              <Route path="/push-diagnostics" element={<PushDiagnosticsPage />} />
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
