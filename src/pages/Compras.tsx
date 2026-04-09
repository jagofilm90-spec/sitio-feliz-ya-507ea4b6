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

interface ComprasProps {
  mode?: "admin" | "secretaria";
}

const Compras = ({ mode = "admin" }: ComprasProps) => {
  const [searchParams] = useSearchParams();
  const isAdmin = mode === "admin";
  const [activeTab, setActiveTab] = useState(isAdmin ? "proveedores" : "ordenes");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  // Get current user (admin only — for pendingCount)
  useEffect(() => {
    if (!isAdmin) return;
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    fetchUser();
  }, [isAdmin]);

  // Fetch count of authorized OCs pending to send (admin only)
  const { data: pendingCount = 0 } = useQuery({
    queryKey: ["oc-pending-send-count", currentUserId],
    queryFn: async () => {
      if (!currentUserId) return 0;
      const { count, error } = await supabase
        .from("ordenes_compra")
        .select("*", { count: "exact", head: true })
        .eq("creado_por", currentUserId)
        .eq("status", "autorizada");
      if (error) return 0;
      return count || 0;
    },
    enabled: isAdmin && !!currentUserId,
    refetchInterval: 30000,
  });

  // Fetch count of pending devoluciones (admin only)
  const { data: devolucionesPendientesCount = 0 } = useQuery({
    queryKey: ["devoluciones-pendientes-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("devoluciones_proveedor")
        .select("*", { count: "exact", head: true })
        .eq("status", "pendiente");
      if (error) return 0;
      return count || 0;
    },
    enabled: isAdmin,
    refetchInterval: 60000,
  });

  // Fetch count of pending faltantes (admin only)
  const { data: faltantesPendientesCount = 0 } = useQuery({
    queryKey: ["faltantes-pendientes-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("ordenes_compra_entregas")
        .select("*", { count: "exact", head: true })
        .eq("origen_faltante", true)
        .in("status", ["programada", "pendiente"]);
      if (error) return 0;
      return count || 0;
    },
    enabled: isAdmin,
    refetchInterval: 60000,
  });

  // Fetch count of OCs with pending payments (both roles)
  const { data: adeudosCount = 0 } = useQuery({
    queryKey: ["adeudos-pendientes-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("ordenes_compra")
        .select("*", { count: "exact", head: true })
        .in("status_pago", ["pendiente", "parcial"])
        .or('status.in.(recibida,completada,cerrada,parcial),tipo_pago.eq.anticipado');
      if (error) return 0;
      return count || 0;
    },
    refetchInterval: 60000,
  });

  // Fetch count of products needing restock (admin only)
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
    enabled: isAdmin,
    refetchInterval: 60000,
  });

  const devFaltCombinedCount = devolucionesPendientesCount + faltantesPendientesCount;

  // Auto-switch tabs based on URL params (admin only)
  useEffect(() => {
    if (!isAdmin) return;
    const tabParam = searchParams.get("tab");
    if (tabParam && ["proveedores", "ordenes", "calendario", "devoluciones-faltantes", "historial", "adeudos", "analytics", "sugerencias"].includes(tabParam)) {
      setActiveTab(tabParam);
    } else if (searchParams.get("aprobar")) {
      setActiveTab("ordenes");
    }
  }, [searchParams, isAdmin]);

  // Tabs config filtered by mode
  const allTabs = [
    { value: "proveedores", label: "Proveedores", roles: ["admin", "secretaria"] },
    { value: "ordenes", label: "Órdenes", badge: isAdmin ? pendingCount : 0, roles: ["admin", "secretaria"] },
    { value: "calendario", label: "Calendario", roles: ["admin", "secretaria"] },
    { value: "devoluciones-faltantes", label: "Dev/Faltantes", badge: devFaltCombinedCount, roles: ["admin"] },
    { value: "historial", label: "Historial", roles: ["admin", "secretaria"] },
    { value: "adeudos", label: "Adeudos", badge: adeudosCount, badgeColor: "bg-amber-500", roles: ["admin", "secretaria"] },
    { value: "sugerencias", label: "Sugerencias", badge: sugerenciasCount, badgeColor: "bg-orange-500", roles: ["admin"] },
    { value: "analytics", label: "Analytics", roles: ["admin"] },
  ];
  const visibleTabs = allTabs.filter(t => t.roles.includes(mode));

  // Tab content map
  const tabContent: Record<string, React.ReactNode> = {
    proveedores: <ProveedoresTab />,
    ordenes: <OrdenesCompraTab />,
    calendario: <CalendarioEntregasTab />,
    "devoluciones-faltantes": <DevolucionesFaltantesTab />,
    historial: <HistorialComprasProductoTab />,
    adeudos: <AdeudosProveedoresTab />,
    sugerencias: <SugerenciasReabastecimientoTab />,
    analytics: <ComprasAnalyticsTab />,
  };

  const content = (
    <div className="space-y-8">
      <PageHeader
        {...(isAdmin
          ? { eyebrow: "Operaciones", title: "Tus", titleAccent: "compras.", lead: "Órdenes a proveedores nacionales e internacionales." }
          : { title: "Compras.", lead: "Órdenes, recepciones y proveedores" }
        )}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto -mx-4 px-4 pb-2 scrollbar-hide">
          <TabsList className="bg-transparent border-b border-ink-100 rounded-none p-0 h-auto gap-4 sm:gap-6 inline-flex w-max">
            {visibleTabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="px-0 py-3 bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-crimson-500 data-[state=active]:border-b-2 data-[state=active]:border-crimson-500 rounded-none text-ink-500 font-medium text-sm whitespace-nowrap"
              >
                {tab.label}
                {typeof tab.badge === 'number' && tab.badge > 0 && (
                  <Badge className={`ml-1.5 h-5 min-w-5 px-1.5 text-[10px] font-bold text-white ${tab.badgeColor || 'bg-crimson-500'}`}>
                    {tab.badge}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {visibleTabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            {tabContent[tab.value]}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );

  return isAdmin ? <Layout>{content}</Layout> : content;
};

export default Compras;
