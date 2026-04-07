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
import ResetPassword from "./pages/ResetPassword";
import MiPerfil from "./pages/MiPerfil";
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
import LandingAlmasa from "./pages/LandingAlmasa";
import Configuracion from "./pages/Configuracion";
import Asistencia from "./pages/Asistencia";
import VehiculosPage from "./pages/VehiculosPage";
import PushDiagnosticsPage from "./pages/PushDiagnosticsPage";
import LecarozCotizaciones from "./pages/LecarozCotizaciones";
import LecarozCotizacionEditor from "./pages/LecarozCotizacionEditor";
import LecarozBandeja from "./pages/LecarozBandeja";

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
              <Route path="/landing" element={<LandingAlmasa />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/mi-perfil" element={<ProtectedRoute allowedRoles={['admin','secretaria','vendedor','chofer','almacen','gerente_almacen','contadora']} redirectTo="/auth"><MiPerfil /></ProtectedRoute>} />

              {/* Rutas protegidas - Dashboard requiere roles que NO sean solo almacen/chofer */}
              <Route path="/dashboard" element={
                <ProtectedRoute allowedRoles={['admin', 'secretaria', 'vendedor', 'contadora']} redirectTo="/auth">
                  <Dashboard />
                </ProtectedRoute>
              } />
              
              <Route path="/productos" element={
                <ProtectedRoute allowedRoles={['admin', 'secretaria', 'contadora']} redirectTo="/auth">
                  <Productos />
                </ProtectedRoute>
              } />
              <Route path="/clientes" element={
                <ProtectedRoute allowedRoles={['admin', 'secretaria', 'vendedor']} redirectTo="/auth">
                  <Clientes />
                </ProtectedRoute>
              } />
              <Route path="/pedidos" element={
                <ProtectedRoute allowedRoles={['admin', 'secretaria', 'vendedor']} redirectTo="/auth">
                  <Pedidos />
                </ProtectedRoute>
              } />
              <Route path="/inventario" element={
                <ProtectedRoute allowedRoles={['admin', 'secretaria', 'gerente_almacen', 'almacen']} redirectTo="/auth">
                  <Inventario />
                </ProtectedRoute>
              } />
              <Route path="/rutas" element={
                <ProtectedRoute allowedRoles={['admin', 'secretaria']} redirectTo="/auth">
                  <Rutas />
                </ProtectedRoute>
              } />
              <Route path="/facturas" element={
                <ProtectedRoute allowedRoles={['admin', 'secretaria', 'contadora']} redirectTo="/auth">
                  <Facturas />
                </ProtectedRoute>
              } />
              <Route path="/portal-cliente" element={<PortalCliente />} />
              <Route path="/empleados" element={
                <ProtectedRoute allowedRoles={['admin', 'secretaria', 'contadora']} redirectTo="/auth">
                  <Empleados />
                </ProtectedRoute>
              } />
              <Route path="/asistencia" element={
                <ProtectedRoute allowedRoles={['admin', 'secretaria']} redirectTo="/auth">
                  <Asistencia />
                </ProtectedRoute>
              } />
              <Route path="/vehiculos" element={
                <ProtectedRoute allowedRoles={['admin', 'secretaria', 'gerente_almacen']} redirectTo="/auth">
                  <VehiculosPage />
                </ProtectedRoute>
              } />
              <Route path="/usuarios" element={<Navigate to="/configuracion" replace />} />
              <Route path="/chat" element={
                <ProtectedRoute allowedRoles={['admin', 'secretaria', 'vendedor', 'contadora', 'almacen', 'gerente_almacen']} redirectTo="/auth">
                  <Chat />
                </ProtectedRoute>
              } />
              <Route path="/compras" element={
                <ProtectedRoute allowedRoles={['admin', 'secretaria', 'contadora']} redirectTo="/auth">
                  <Compras />
                </ProtectedRoute>
              } />
              <Route path="/rentabilidad" element={
                <ProtectedRoute allowedRoles={['admin', 'contadora']} redirectTo="/auth">
                  <Rentabilidad />
                </ProtectedRoute>
              } />
              <Route path="/fumigaciones" element={
                <ProtectedRoute allowedRoles={['admin', 'secretaria', 'almacen', 'gerente_almacen']} redirectTo="/auth">
                  <Fumigaciones />
                </ProtectedRoute>
              } />
              <Route path="/correos" element={
                <ProtectedRoute allowedRoles={['admin', 'secretaria']} redirectTo="/auth">
                  <CorreosCorporativos />
                </ProtectedRoute>
              } />
              <Route path="/generate-assets" element={
                <ProtectedRoute allowedRoles={['admin']} redirectTo="/auth">
                  <GenerateAssets />
                </ProtectedRoute>
              } />
              <Route path="/tarjeta" element={<TarjetaDigital />} />
              <Route path="/privacidad" element={<Privacidad />} />
              <Route path="/soporte" element={<Soporte />} />
              <Route path="/disenos-camioneta" element={<DisenosCamioneta />} />
              <Route path="/permisos" element={
                <ProtectedRoute allowedRoles={['admin']} redirectTo="/auth">
                  <Permisos />
                </ProtectedRoute>
              } />
              <Route path="/respaldos" element={
                <ProtectedRoute allowedRoles={['admin']} redirectTo="/auth">
                  <Respaldos />
                </ProtectedRoute>
              } />
              <Route path="/almacen-tablet" element={
                <ProtectedRoute allowedRoles={['admin', 'almacen', 'gerente_almacen']} redirectTo="/auth">
                  <AlmacenTablet />
                </ProtectedRoute>
              } />
              <Route path="/almacen-tablet/carga-scan/:pedidoId?" element={
                <ProtectedRoute allowedRoles={['admin', 'almacen', 'gerente_almacen']} redirectTo="/auth">
                  <AlmacenCargaScan />
                </ProtectedRoute>
              } />
              <Route path="/chofer" element={
                <ProtectedRoute allowedRoles={['admin', 'chofer']} redirectTo="/auth">
                  <ChoferPanel />
                </ProtectedRoute>
              } />
              <Route path="/vendedor" element={
                <ProtectedRoute allowedRoles={['admin', 'vendedor']} redirectTo="/auth">
                  <VendedorPanel />
                </ProtectedRoute>
              } />
              <Route path="/vendedor/analisis" element={
                <ProtectedRoute allowedRoles={['admin', 'vendedor']} redirectTo="/auth">
                  <VendedorAnalisisVentas />
                </ProtectedRoute>
              } />
              <Route path="/precios" element={
                <ProtectedRoute allowedRoles={['admin', 'secretaria', 'vendedor']} redirectTo="/auth">
                  <Precios />
                </ProtectedRoute>
              } />
              <Route path="/secretaria" element={
                <ProtectedRoute allowedRoles={['admin', 'secretaria']} redirectTo="/auth">
                  <SecretariaPanel />
                </ProtectedRoute>
              } />
              <Route path="/app-mobile" element={<AppMobileGuide />} />
              <Route path="/test-firma" element={
                <ProtectedRoute allowedRoles={['admin']} redirectTo="/auth">
                  <TestFirma />
                </ProtectedRoute>
              } />
              <Route path="/configuracion" element={
                <ProtectedRoute allowedRoles={['admin', 'contadora', 'gerente_almacen']} redirectTo="/auth">
                  <Configuracion />
                </ProtectedRoute>
              } />
              <Route path="/push-diagnostics" element={
                <ProtectedRoute allowedRoles={['admin']} redirectTo="/auth">
                  <PushDiagnosticsPage />
                </ProtectedRoute>
              } />
              
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
