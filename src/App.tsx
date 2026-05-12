import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import TarjetaDigital from "./pages/TarjetaDigital";
import Privacidad from "./pages/Privacidad";
import Soporte from "./pages/Soporte";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

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
import NuevaOCv3 from "./pages/NuevaOCv3";
import ProveedoresV3 from "./pages/ProveedoresV3";
import ProveedorDetalle from "./pages/ProveedorDetalle";
import Rentabilidad from "./pages/Rentabilidad";
import Fumigaciones from "./pages/Fumigaciones";
import CorreosCorporativos from "./pages/CorreosCorporativos";
import CorreosV2 from "./pages/CorreosV2";
import Permisos from "./pages/Permisos";
import Respaldos from "./pages/Respaldos";
import AlmacenTablet from "./pages/AlmacenTablet";
import AlmacenCargaScan from "./pages/AlmacenCargaScan";
import ChoferPanel from "./pages/ChoferPanel";
import VendedorPanel from "./pages/VendedorPanel";
import VendedorAnalisisVentas from "./pages/VendedorAnalisisVentas";
import SecretariaPanel from "./pages/SecretariaPanel";
import AppMobileGuide from "./pages/AppMobileGuide";
import Precios from "./pages/Precios";
import ProductosModoCobro from "./pages/ProductosModoCobro";
import ProductosHistorialPrecios from "./pages/ProductosHistorialPrecios";
import LandingAlmasa from "./pages/LandingAlmasa";
import Configuracion from "./pages/Configuracion";
import Asistencia from "./pages/Asistencia";
import VehiculosPage from "./pages/VehiculosPage";
import LecarozCotizaciones from "./pages/LecarozCotizaciones";
import LecarozCotizacionEditor from "./pages/LecarozCotizacionEditor";
import LecarozBandeja from "./pages/LecarozBandeja";
import NuevoCliente from "./pages/clientes/NuevoCliente";
import DetalleCliente from "./pages/clientes/DetalleCliente";
import EditarCliente from "./pages/clientes/EditarCliente";
import CartasPorte from "./pages/CartasPorte";
import CartaPorteDetalle from "./pages/CartaPorteDetalle";
import LaCorona from "./pages/LaCorona";
import SurtirPedido from "./pages/almacen/SurtirPedido";
import ConteosCiegos from "./pages/ConteosCiegos";
import RealizarConteo from "./pages/RealizarConteo";
import NotasCredito from "./pages/NotasCredito";
import ComplementosPago from "./pages/ComplementosPago";
import Cobranza from "./pages/Cobranza";
import DashboardEjecutivo from "./pages/DashboardEjecutivo";
import MiRutaHoy from "./pages/chofer/MiRutaHoy";
import Josan from "./pages/Josan";
import EntregaDetalle from "./pages/chofer/EntregaDetalle";

import PushNotificationsGate from "./components/PushNotificationsGate";
import ProtectedRoute from "./components/ProtectedRoute";
import ClienteProtectedRoute from "./components/ClienteProtectedRoute";
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
              <Route path="/dashboard-ejecutivo" element={
                <ProtectedRoute allowedRoles={['admin', 'contadora']} redirectTo="/auth">
                  <DashboardEjecutivo />
                </ProtectedRoute>
              } />
              <Route path="/josan" element={
                <ProtectedRoute allowedRoles={['admin', 'secretaria', 'contadora']} redirectTo="/auth">
                  <Josan />
                </ProtectedRoute>
              } />
              
              <Route path="/productos" element={
                <ProtectedRoute allowedRoles={['admin', 'secretaria', 'contadora']} redirectTo="/auth">
                  <Productos />
                </ProtectedRoute>
              } />
              <Route path="/productos/modo-cobro" element={
                <ProtectedRoute allowedRoles={['admin']} redirectTo="/auth">
                  <ProductosModoCobro />
                </ProtectedRoute>
              } />
              <Route path="/productos/historial-precios" element={
                <ProtectedRoute allowedRoles={['admin']} redirectTo="/auth">
                  <ProductosHistorialPrecios />
                </ProtectedRoute>
              } />
              <Route path="/clientes" element={
                <ProtectedRoute allowedRoles={['admin', 'secretaria', 'vendedor']} redirectTo="/auth">
                  <Clientes />
                </ProtectedRoute>
              } />
              <Route path="/clientes/nuevo" element={
                <ProtectedRoute allowedRoles={['admin', 'secretaria', 'vendedor']} redirectTo="/auth">
                  <NuevoCliente />
                </ProtectedRoute>
              } />
              <Route path="/clientes/:id" element={
                <ProtectedRoute allowedRoles={['admin', 'secretaria', 'vendedor']} redirectTo="/auth">
                  <DetalleCliente />
                </ProtectedRoute>
              } />
              <Route path="/clientes/:id/editar" element={
                <ProtectedRoute allowedRoles={['admin', 'secretaria', 'vendedor']} redirectTo="/auth">
                  <EditarCliente />
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
              <Route path="/cartas-porte" element={
                <ProtectedRoute allowedRoles={['admin', 'secretaria']} redirectTo="/auth">
                  <CartasPorte />
                </ProtectedRoute>
              } />
              <Route path="/cartas-porte/:id" element={
                <ProtectedRoute allowedRoles={['admin', 'secretaria']} redirectTo="/auth">
                  <CartaPorteDetalle />
                </ProtectedRoute>
              } />
              <Route path="/la-corona" element={
                <ProtectedRoute allowedRoles={['admin']} redirectTo="/auth">
                  <LaCorona />
                </ProtectedRoute>
              } />
              <Route path="/conteos-ciegos" element={
                <ProtectedRoute allowedRoles={['admin', 'almacen', 'gerente_almacen']} redirectTo="/auth">
                  <ConteosCiegos />
                </ProtectedRoute>
              } />
              <Route path="/conteos-ciegos/:conteoId" element={
                <ProtectedRoute allowedRoles={['admin', 'almacen', 'gerente_almacen']} redirectTo="/auth">
                  <RealizarConteo />
                </ProtectedRoute>
              } />
              <Route path="/facturas" element={
                <ProtectedRoute allowedRoles={['admin', 'secretaria', 'contadora']} redirectTo="/auth">
                  <Facturas />
                </ProtectedRoute>
              } />
              <Route path="/notas-credito" element={
                <ProtectedRoute allowedRoles={['admin', 'secretaria', 'contadora']} redirectTo="/auth">
                  <NotasCredito />
                </ProtectedRoute>
              } />
              <Route path="/complementos-pago" element={
                <ProtectedRoute allowedRoles={['admin', 'secretaria', 'contadora']} redirectTo="/auth">
                  <ComplementosPago />
                </ProtectedRoute>
              } />
              <Route path="/cobranza" element={
                <ProtectedRoute allowedRoles={['admin', 'secretaria', 'contadora']} redirectTo="/auth">
                  <Cobranza />
                </ProtectedRoute>
              } />
              <Route path="/portal-cliente" element={
                <ClienteProtectedRoute>
                  <PortalCliente />
                </ClienteProtectedRoute>
              } />
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
              <Route path="/compras/nueva-oc-v3" element={
                <ProtectedRoute allowedRoles={['admin', 'secretaria']} redirectTo="/auth">
                  <NuevaOCv3 />
                </ProtectedRoute>
              } />
              <Route path="/compras/proveedores-v3" element={
                <ProtectedRoute allowedRoles={['admin', 'secretaria', 'contadora']} redirectTo="/auth">
                  <ProveedoresV3 />
                </ProtectedRoute>
              } />
              <Route path="/compras/proveedores-v3/:id" element={
                <ProtectedRoute allowedRoles={['admin', 'secretaria', 'contadora']} redirectTo="/auth">
                  <ProveedorDetalle />
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
                  <CorreosV2 />
                </ProtectedRoute>
              } />
              <Route path="/correos/config" element={
                <ProtectedRoute allowedRoles={['admin', 'secretaria']} redirectTo="/auth">
                  <CorreosCorporativos />
                </ProtectedRoute>
              } />
              <Route path="/tarjeta" element={<TarjetaDigital />} />
              <Route path="/privacidad" element={<Privacidad />} />
              <Route path="/soporte" element={<Soporte />} />
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
              <Route path="/almacen-tablet/surtir/:pedidoId" element={
                <ProtectedRoute allowedRoles={['admin', 'almacen', 'gerente_almacen']} redirectTo="/auth">
                  <SurtirPedido />
                </ProtectedRoute>
              } />
              <Route path="/chofer" element={
                <ProtectedRoute allowedRoles={['admin', 'chofer']} redirectTo="/auth">
                  <ChoferPanel />
                </ProtectedRoute>
              } />
              <Route path="/chofer/mi-ruta" element={
                <ProtectedRoute allowedRoles={['admin', 'chofer']} redirectTo="/auth">
                  <MiRutaHoy />
                </ProtectedRoute>
              } />
              <Route path="/chofer/entrega/:hojaId" element={
                <ProtectedRoute allowedRoles={['admin', 'chofer']} redirectTo="/auth">
                  <EntregaDetalle />
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
              <Route path="/configuracion" element={
                <ProtectedRoute allowedRoles={['admin', 'contadora', 'gerente_almacen']} redirectTo="/auth">
                  <Configuracion />
                </ProtectedRoute>
              } />
              
              {/* Lecaroz routes */}
              <Route path="/lecaroz/cotizaciones" element={
                <ProtectedRoute allowedRoles={['admin', 'secretaria', 'vendedor', 'contadora']} redirectTo="/auth">
                  <LecarozCotizaciones />
                </ProtectedRoute>
              } />
              <Route path="/lecaroz/cotizaciones/:id" element={
                <ProtectedRoute allowedRoles={['admin', 'secretaria', 'vendedor', 'contadora']} redirectTo="/auth">
                  <LecarozCotizacionEditor />
                </ProtectedRoute>
              } />
              <Route path="/lecaroz/bandeja" element={
                <ProtectedRoute allowedRoles={['admin', 'secretaria', 'vendedor']} redirectTo="/auth">
                  <LecarozBandeja />
                </ProtectedRoute>
              } />
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
