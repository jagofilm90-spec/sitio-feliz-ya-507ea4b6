import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/Layout";
import { Package, Truck, Calendar, BarChart3, History, AlertTriangle, CreditCard, Lightbulb } from "lucide-react";
import ProveedoresTab from "@/components/compras/ProveedoresTab";
import OrdenesCompraTab from "@/components/compras/OrdenesCompraTab";
import CalendarioEntregasTab from "@/components/compras/CalendarioEntregasTab";
import ComprasAnalyticsTab from "@/components/compras/ComprasAnalyticsTab";
import HistorialComprasProductoTab from "@/components/compras/HistorialComprasProductoTab";
import DevolucionesFaltantesTab from "@/components/compras/DevolucionesFaltantesTab";
import AdeudosProveedoresTab from "@/components/compras/AdeudosProveedoresTab";
import SugerenciasReabastecimientoTab from "@/components/compras/SugerenciasReabastecimientoTab";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";

const Compras = () => {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("proveedores");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  // Get current user
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    fetchUser();
  }, []);

  // Fetch count of authorized OCs pending to send (for current user)
  const { data: pendingCount = 0 } = useQuery({
    queryKey: ["oc-pending-send-count", currentUserId],
    queryFn: async () => {
      if (!currentUserId) return 0;

      const { count, error } = await supabase
        .from("ordenes_compra")
        .select("*", { count: "exact", head: true })
        .eq("creado_por", currentUserId)
        .eq("status", "autorizada");

      if (error) {
        console.error("Error fetching pending OC count:", error);
        return 0;
      }

      return count || 0;
    },
    enabled: !!currentUserId,
    refetchInterval: 30000,
  });

  // Fetch count of pending devoluciones
  const { data: devolucionesPendientesCount = 0 } = useQuery({
    queryKey: ["devoluciones-pendientes-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("devoluciones_proveedor")
        .select("*", { count: "exact", head: true })
        .eq("status", "pendiente");

      if (error) {
        console.error("Error fetching devoluciones count:", error);
        return 0;
      }

      return count || 0;
    },
    refetchInterval: 60000,
  });

  // Fetch count of pending faltantes
  const { data: faltantesPendientesCount = 0 } = useQuery({
    queryKey: ["faltantes-pendientes-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("ordenes_compra_entregas")
        .select("*", { count: "exact", head: true })
        .eq("origen_faltante", true)
        .in("status", ["programada", "pendiente"]);

      if (error) {
        console.error("Error fetching faltantes count:", error);
        return 0;
      }

      return count || 0;
    },
    refetchInterval: 60000,
  });

  // Fetch count of OCs with pending payments
  const { data: adeudosCount = 0 } = useQuery({
    queryKey: ["adeudos-pendientes-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("ordenes_compra")
        .select("*", { count: "exact", head: true })
        .in("status_pago", ["pendiente", "parcial"])
        .or('status.in.(recibida,completada,cerrada,parcial),tipo_pago.eq.anticipado');

      if (error) {
        console.error("Error fetching adeudos count:", error);
        return 0;
      }

      return count || 0;
    },
    refetchInterval: 60000,
  });

  // Fetch count of products needing restock
  const { data: sugerenciasCount = 0 } = useQuery({
    queryKey: ["sugerencias-reabastecimiento-count"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("productos")
        .select("id, stock_actual, stock_minimo")
        .eq("activo", true)
        .or("solo_uso_interno.is.null,solo_uso_interno.eq.false");

      if (error) return 0;
      return (data || []).filter(p => (p.stock_actual ?? 0) <= (p.stock_minimo ?? 0)).length;
    },
    refetchInterval: 60000,
  });

  // Combined count for Devoluciones/Faltantes tab
  const devFaltCombinedCount = devolucionesPendientesCount + faltantesPendientesCount;

  // Auto-switch tabs based on URL params
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && ["proveedores", "ordenes", "calendario", "devoluciones-faltantes", "historial", "adeudos", "analytics", "sugerencias"].includes(tabParam)) {
      setActiveTab(tabParam);
    } else if (searchParams.get("aprobar")) {
      setActiveTab("ordenes");
    }
  }, [searchParams]);

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold">Compras</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Gestión de proveedores, órdenes de compra y calendario de entregas
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {isMobile ? (
            <div className="overflow-x-auto -mx-4 px-4 pb-2 scrollbar-hide">
              <TabsList className="inline-flex w-max gap-1 h-9">
                <TabsTrigger value="proveedores" className="flex items-center gap-1 px-2.5 text-xs">
                  <Package className="h-3.5 w-3.5" />
                  Prov
                </TabsTrigger>
                <TabsTrigger value="ordenes" className="flex items-center gap-1 px-2.5 text-xs">
                  <Truck className="h-3.5 w-3.5" />
                  OC
                  {pendingCount > 0 && (
                    <Badge variant="destructive" className="ml-0.5 h-4 min-w-4 px-1 text-[10px] font-bold animate-pulse">
                      {pendingCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="calendario" className="flex items-center gap-1 px-2.5 text-xs">
                  <Calendar className="h-3.5 w-3.5" />
                  Cal
                </TabsTrigger>
                <TabsTrigger value="devoluciones-faltantes" className="flex items-center gap-1 px-2.5 text-xs">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Dev/Falt
                  {devFaltCombinedCount > 0 && (
                    <Badge variant="destructive" className="ml-0.5 h-4 min-w-4 px-1 text-[10px] font-bold">
                      {devFaltCombinedCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="historial" className="flex items-center gap-1 px-2.5 text-xs">
                  <History className="h-3.5 w-3.5" />
                  Hist
                </TabsTrigger>
                <TabsTrigger value="adeudos" className="flex items-center gap-1 px-2.5 text-xs">
                  <CreditCard className="h-3.5 w-3.5" />
                  Adeudos
                  {adeudosCount > 0 && (
                    <Badge className="ml-0.5 h-4 min-w-4 px-1 text-[10px] font-bold bg-amber-500 text-white">
                      {adeudosCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="sugerencias" className="flex items-center gap-1 px-2.5 text-xs">
                  <Lightbulb className="h-3.5 w-3.5" />
                  Sug
                  {sugerenciasCount > 0 && (
                    <Badge className="ml-0.5 h-4 min-w-4 px-1 text-[10px] font-bold bg-orange-500 text-white">
                      {sugerenciasCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex items-center gap-1 px-2.5 text-xs">
                  <BarChart3 className="h-3.5 w-3.5" />
                  Anal
                </TabsTrigger>
              </TabsList>
            </div>
          ) : (
            <TabsList className="w-full grid grid-cols-8">
              <TabsTrigger value="proveedores" className="flex items-center gap-1.5">
                <Package className="h-4 w-4" />
                Proveedores
              </TabsTrigger>
              <TabsTrigger value="ordenes" className="flex items-center gap-1.5">
                <Truck className="h-4 w-4" />
                Órdenes
                {pendingCount > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1.5 text-xs font-bold animate-pulse">
                    {pendingCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="calendario" className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                Calendario
              </TabsTrigger>
              <TabsTrigger value="devoluciones-faltantes" className="flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" />
                Dev/Falt
                {devFaltCombinedCount > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1.5 text-xs font-bold">
                    {devFaltCombinedCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="historial" className="flex items-center gap-1.5">
                <History className="h-4 w-4" />
                Historial
              </TabsTrigger>
              <TabsTrigger value="adeudos" className="flex items-center gap-1.5">
                <CreditCard className="h-4 w-4" />
                Adeudos
                {adeudosCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-xs font-bold bg-amber-500 text-white">
                    {adeudosCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="sugerencias" className="flex items-center gap-1.5">
                <Lightbulb className="h-4 w-4" />
                Sugerencias
                {sugerenciasCount > 0 && (
                  <Badge className="ml-1 h-5 min-w-5 px-1.5 text-xs font-bold bg-orange-500 text-white">
                    {sugerenciasCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-1.5">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="proveedores">
            <ProveedoresTab />
          </TabsContent>

          <TabsContent value="ordenes">
            <OrdenesCompraTab />
          </TabsContent>

          <TabsContent value="calendario">
            <CalendarioEntregasTab />
          </TabsContent>

          <TabsContent value="devoluciones-faltantes">
            <DevolucionesFaltantesTab />
          </TabsContent>

          <TabsContent value="historial">
            <HistorialComprasProductoTab />
          </TabsContent>

          <TabsContent value="adeudos">
            <AdeudosProveedoresTab />
          </TabsContent>

          <TabsContent value="sugerencias">
            <SugerenciasReabastecimientoTab />
          </TabsContent>

          <TabsContent value="analytics">
            <ComprasAnalyticsTab />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Compras;
