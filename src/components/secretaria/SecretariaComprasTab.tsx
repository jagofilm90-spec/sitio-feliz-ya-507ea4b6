import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Calendar, Building2, History, CreditCard } from "lucide-react";
import ProveedoresTab from "@/components/compras/ProveedoresTab";
import OrdenesCompraTab from "@/components/compras/OrdenesCompraTab";
import CalendarioEntregasTab from "@/components/compras/CalendarioEntregasTab";
import HistorialComprasProductoTab from "@/components/compras/HistorialComprasProductoTab";
import AdeudosProveedoresTab from "@/components/compras/AdeudosProveedoresTab";
import { supabase } from "@/integrations/supabase/client";

export const SecretariaComprasTab = () => {
  const [activeTab, setActiveTab] = useState("ordenes");

  // Fetch count of OCs with pending payments
  const { data: adeudosCount = 0 } = useQuery({
    queryKey: ["adeudos-pendientes-count-secretaria"],
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-crimson-500" />
          Módulo de Compras
        </h2>
        <p className="text-sm text-muted-foreground">
          Gestión de proveedores, órdenes de compra y entregas
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-5">
          <TabsTrigger value="ordenes" className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">Órdenes de Compra</span>
            <span className="sm:hidden">OC</span>
          </TabsTrigger>
          <TabsTrigger value="proveedores" className="gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Proveedores</span>
            <span className="sm:hidden">Provs</span>
          </TabsTrigger>
          <TabsTrigger value="calendario" className="gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Calendario</span>
            <span className="sm:hidden">Cal</span>
          </TabsTrigger>
          <TabsTrigger value="adeudos" className="gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Adeudos</span>
            <span className="sm:hidden">Adeu</span>
            {adeudosCount > 0 && (
              <Badge 
                variant="secondary" 
                className="ml-1 h-5 min-w-5 px-1.5 text-xs font-bold bg-amber-500 text-white"
              >
                {adeudosCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="historial" className="gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Historial</span>
            <span className="sm:hidden">Hist</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ordenes" className="mt-4">
          <OrdenesCompraTab />
        </TabsContent>

        <TabsContent value="proveedores" className="mt-4">
          <ProveedoresTab />
        </TabsContent>

        <TabsContent value="calendario" className="mt-4">
          <CalendarioEntregasTab />
        </TabsContent>

        <TabsContent value="adeudos" className="mt-4">
          <AdeudosProveedoresTab />
        </TabsContent>

        <TabsContent value="historial" className="mt-4">
          <HistorialComprasProductoTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};
