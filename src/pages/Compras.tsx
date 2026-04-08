import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/Layout";
import { PageHeader } from "@/components/layout/PageHeader";
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
      <div className="space-y-8">
        <PageHeader
          eyebrow="Operaciones"
          title="Tus"
          titleAccent="compras."
          lead="Órdenes a proveedores nacionales e internacionales."
        />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto -mx-4 px-4 pb-2 scrollbar-hide">
            <TabsList className="bg-transparent border-b border-ink-100 rounded-none p-0 h-auto gap-4 sm:gap-6 inline-flex w-max">
              {[
                { value: "proveedores", label: "Proveedores" },
                { value: "ordenes", label: "Órdenes", badge: pendingCount },
                { value: "calendario", label: "Calendario" },
                { value: "devoluciones-faltantes", label: "Dev/Faltantes", badge: devFaltCombinedCount },
                { value: "historial", label: "Historial" },
                { value: "adeudos", label: "Adeudos", badge: adeudosCount, badgeColor: "bg-amber-500" },
                { value: "sugerencias", label: "Sugerencias", badge: sugerenciasCount, badgeColor: "bg-orange-500" },
                { value: "analytics", label: "Analytics" },
              ].map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="px-0 py-3 bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-crimson-500 data-[state=active]:border-b-2 data-[state=active]:border-crimson-500 rounded-none text-ink-500 font-medium text-sm whitespace-nowrap"
                >
                  {tab.label}
                  {tab.badge && tab.badge > 0 && (
                    <Badge className={`ml-1.5 h-5 min-w-5 px-1.5 text-[10px] font-bold text-white ${tab.badgeColor || 'bg-crimson-500'}`}>
                      {tab.badge}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

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
