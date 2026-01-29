import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/Layout";
import { Package, Truck, Calendar, BarChart3, History, AlertTriangle, PackageX, CreditCard } from "lucide-react";
import ProveedoresTab from "@/components/compras/ProveedoresTab";
import OrdenesCompraTab from "@/components/compras/OrdenesCompraTab";
import CalendarioEntregasTab from "@/components/compras/CalendarioEntregasTab";
import ComprasAnalyticsTab from "@/components/compras/ComprasAnalyticsTab";
import HistorialComprasProductoTab from "@/components/compras/HistorialComprasProductoTab";
import DevolucionesPendientesTab from "@/components/compras/DevolucionesPendientesTab";
import FaltantesPendientesTab from "@/components/compras/FaltantesPendientesTab";
import AdeudosProveedoresTab from "@/components/compras/AdeudosProveedoresTab";
import { supabase } from "@/integrations/supabase/client";

const Compras = () => {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("proveedores");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

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

  // Auto-switch to ordenes tab when ?aprobar= param is present
  useEffect(() => {
    if (searchParams.get("aprobar")) {
      setActiveTab("ordenes");
    }
  }, [searchParams]);

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Compras</h1>
          <p className="text-muted-foreground">
            Gestión de proveedores, órdenes de compra y calendario de entregas
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex w-full overflow-x-auto">
            <TabsTrigger value="proveedores" className="flex items-center gap-2 flex-shrink-0">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Proveedores</span>
              <span className="sm:hidden">Prov.</span>
            </TabsTrigger>
            <TabsTrigger value="ordenes" className="flex items-center gap-2 flex-shrink-0">
              <Truck className="h-4 w-4" />
              <span className="hidden sm:inline">Órdenes de Compra</span>
              <span className="sm:hidden">OC</span>
              {pendingCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="ml-1 h-5 min-w-5 px-1.5 text-xs font-bold animate-pulse"
                >
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="calendario" className="flex items-center gap-2 flex-shrink-0">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Calendario</span>
              <span className="sm:hidden">Cal.</span>
            </TabsTrigger>
            <TabsTrigger value="devoluciones" className="flex items-center gap-2 flex-shrink-0">
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Devoluciones</span>
              <span className="sm:hidden">Dev.</span>
              {devolucionesPendientesCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="ml-1 h-5 min-w-5 px-1.5 text-xs font-bold"
                >
                  {devolucionesPendientesCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="historial" className="flex items-center gap-2 flex-shrink-0">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">Historial</span>
              <span className="sm:hidden">Hist.</span>
            </TabsTrigger>
            <TabsTrigger value="faltantes" className="flex items-center gap-2 flex-shrink-0">
              <PackageX className="h-4 w-4" />
              <span className="hidden sm:inline">Faltantes</span>
              <span className="sm:hidden">Falt.</span>
              {faltantesPendientesCount > 0 && (
                <Badge 
                  variant="secondary" 
                  className="ml-1 h-5 min-w-5 px-1.5 text-xs font-bold bg-orange-500 text-white"
                >
                  {faltantesPendientesCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="adeudos" className="flex items-center gap-2 flex-shrink-0">
              <CreditCard className="h-4 w-4" />
              Adeudos
              {adeudosCount > 0 && (
                <Badge 
                  variant="secondary" 
                  className="ml-1 h-5 min-w-5 px-1.5 text-xs font-bold bg-amber-500 text-white"
                >
                  {adeudosCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2 flex-shrink-0">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="proveedores">
            <ProveedoresTab />
          </TabsContent>

          <TabsContent value="ordenes">
            <OrdenesCompraTab />
          </TabsContent>

          <TabsContent value="calendario">
            <CalendarioEntregasTab />
          </TabsContent>

          <TabsContent value="devoluciones">
            <DevolucionesPendientesTab />
          </TabsContent>

          <TabsContent value="historial">
            <HistorialComprasProductoTab />
          </TabsContent>

          <TabsContent value="faltantes">
            <FaltantesPendientesTab />
          </TabsContent>

          <TabsContent value="adeudos">
            <AdeudosProveedoresTab />
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
