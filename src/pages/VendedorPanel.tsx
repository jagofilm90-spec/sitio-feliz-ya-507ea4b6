import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRoles } from "@/hooks/useUserRoles";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Users, ShoppingCart, BarChart3, CreditCard, LogOut, User } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { VendedorMisClientesTab } from "@/components/vendedor/VendedorMisClientesTab";
import { VendedorNuevoPedidoTab } from "@/components/vendedor/VendedorNuevoPedidoTab";
import { VendedorMisVentasTab } from "@/components/vendedor/VendedorMisVentasTab";
import { VendedorCobranzaTab } from "@/components/vendedor/VendedorCobranzaTab";
import PushNotificationSetup from "@/components/PushNotificationSetup";

export default function VendedorPanel() {
  const navigate = useNavigate();
  const { isVendedor, isAdmin, isLoading: rolesLoading } = useUserRoles();
  const [loading, setLoading] = useState(true);
  const [vendedorNombre, setVendedorNombre] = useState("");
  const [stats, setStats] = useState({
    totalClientes: 0,
    ventasMes: 0,
    porCobrar: 0,
    vencido: 0
  });

  useEffect(() => {
    if (!rolesLoading && !isVendedor && !isAdmin) {
      toast.error("No tienes acceso a esta sección");
      navigate("/");
    }
  }, [rolesLoading, isVendedor, isAdmin, navigate]);

  useEffect(() => {
    if (!rolesLoading && (isVendedor || isAdmin)) {
      fetchDashboardData();
    }
  }, [rolesLoading, isVendedor, isAdmin]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get profile name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();

      if (profile) setVendedorNombre(profile.full_name || "Vendedor");

      // Get client count
      const { count: clientesCount } = await supabase
        .from("clientes")
        .select("id", { count: "exact", head: true })
        .eq("vendedor_asignado", user.id)
        .eq("activo", true);

      // Get current month sales
      const inicioMes = new Date();
      inicioMes.setDate(1);
      inicioMes.setHours(0, 0, 0, 0);

      const { data: ventasData } = await supabase
        .from("pedidos")
        .select("total")
        .eq("vendedor_id", user.id)
        .gte("fecha_pedido", inicioMes.toISOString())
        .not("status", "in", "(cancelado,por_autorizar)");

      const ventasMes = (ventasData || []).reduce((sum, p) => sum + (p.total || 0), 0);

      // Get accounts receivable (facturas pendientes de clientes del vendedor)
      const { data: clientesIds } = await supabase
        .from("clientes")
        .select("id")
        .eq("vendedor_asignado", user.id);

      let porCobrar = 0;
      let vencido = 0;

      if (clientesIds && clientesIds.length > 0) {
        const ids = clientesIds.map(c => c.id);
        
        const { data: facturasPendientes } = await supabase
          .from("facturas")
          .select("total, fecha_vencimiento")
          .in("cliente_id", ids)
          .eq("pagada", false);

        const hoy = new Date();
        (facturasPendientes || []).forEach(f => {
          porCobrar += f.total || 0;
          if (f.fecha_vencimiento && new Date(f.fecha_vencimiento) < hoy) {
            vencido += f.total || 0;
          }
        });
      }

      setStats({
        totalClientes: clientesCount || 0,
        ventasMes,
        porCobrar,
        vencido
      });
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  if (rolesLoading || loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Skeleton className="h-24 w-full mb-4" />
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PushNotificationSetup />
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-8 w-8" />
            <div>
              <h1 className="text-lg font-bold">Panel de Vendedor</h1>
              <p className="text-sm opacity-90">ALMASA</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => { supabase.auth.signOut(); navigate("/auth"); }} 
            className="text-primary-foreground hover:bg-primary-foreground/20"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
        {vendedorNombre && (
          <div className="flex items-center gap-2 mt-2 text-sm">
            <User className="h-4 w-4" />
            <span>{vendedorNombre}</span>
          </div>
        )}
      </header>

      <main className="p-4 pb-24">
        {/* Stats Dashboard */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Users className="h-4 w-4" />
                <span className="text-xs">Clientes</span>
              </div>
              <p className="text-2xl font-bold">{stats.totalClientes}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <ShoppingCart className="h-4 w-4" />
                <span className="text-xs">Ventas (mes)</span>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(stats.ventasMes)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <CreditCard className="h-4 w-4" />
                <span className="text-xs">Por cobrar</span>
              </div>
              <p className="text-2xl font-bold text-amber-600">{formatCurrency(stats.porCobrar)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <CreditCard className="h-4 w-4" />
                <span className="text-xs">Vencido</span>
              </div>
              <p className="text-2xl font-bold text-destructive">{formatCurrency(stats.vencido)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="clientes" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="clientes" className="text-xs">
              <Users className="h-4 w-4 mr-1 hidden sm:inline" />
              Clientes
            </TabsTrigger>
            <TabsTrigger value="nuevo" className="text-xs">
              <ShoppingCart className="h-4 w-4 mr-1 hidden sm:inline" />
              Venta
            </TabsTrigger>
            <TabsTrigger value="ventas" className="text-xs">
              <BarChart3 className="h-4 w-4 mr-1 hidden sm:inline" />
              Ventas
            </TabsTrigger>
            <TabsTrigger value="cobranza" className="text-xs">
              <CreditCard className="h-4 w-4 mr-1 hidden sm:inline" />
              Cobranza
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clientes">
            <VendedorMisClientesTab onClienteCreado={fetchDashboardData} />
          </TabsContent>

          <TabsContent value="nuevo">
            <VendedorNuevoPedidoTab onPedidoCreado={fetchDashboardData} />
          </TabsContent>

          <TabsContent value="ventas">
            <VendedorMisVentasTab />
          </TabsContent>

          <TabsContent value="cobranza">
            <VendedorCobranzaTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
