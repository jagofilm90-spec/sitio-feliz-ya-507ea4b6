import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import TarjetaDigital from "./pages/TarjetaDigital";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { ErrorBoundary } from "@/components/ErrorBoundary";
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
import { supabase } from "./integrations/supabase/client";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
    },
  },
});

// Componente seguro para inicializar push notifications - usa imports dinámicos
const PushNotificationInitializer = () => {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (initialized) return;

    const initPush = async () => {
      try {
        // Importar dinámicamente para evitar errores en navegador web
        const pushService = await import('./services/pushNotifications');
        
        // Solo inicializar si estamos en plataforma nativa
        if (!pushService.isNativePlatform()) {
          setInitialized(true);
          return;
        }

        // Esperar a que haya una sesión activa
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await pushService.initPushNotifications();
        }

        // Escuchar cambios de autenticación
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
          if (event === 'SIGNED_IN') {
            try {
              await pushService.initPushNotifications();
            } catch (error) {
              console.log("Push notifications not available:", error);
            }
          }
        });

        setInitialized(true);

        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        // Silently fail - push notifications not critical for web
        console.log("Push notifications not available:", error);
        setInitialized(true);
      }
    };

    initPush();
  }, [initialized]);

  return null;
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <PushNotificationInitializer />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Navigate to="/auth" replace />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<Dashboard />} />
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
              <Route path="/disenos-camioneta" element={<DisenosCamioneta />} />
              <Route path="/permisos" element={<Permisos />} />
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
