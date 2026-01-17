import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { 
  DollarSign, 
  TrendingUp, 
  CreditCard, 
  AlertTriangle, 
  Users, 
  ShoppingCart, 
  Package,
  Clock
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface KPIData {
  ventasMes: number;
  ventasAnio: number;
  porCobrar: number;
  montoVencido: number;
  clientesMorosos: number;
  creditoExcedido: number;
  stockBajo: number;
  pedidosPendientes: number;
}

export const KPICards = () => {
  const [data, setData] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadKPIs();
  }, []);

  const loadKPIs = async () => {
    try {
      const now = new Date();
      const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const inicioAnio = new Date(now.getFullYear(), 0, 1).toISOString();
      const hoy = new Date().toISOString().split('T')[0];

      // Execute queries separately to avoid deep instantiation
      const ventasMesRes = await supabase
        .from("pedidos")
        .select("total")
        .gte("created_at", inicioMes)
        .in("status", ["entregado", "en_ruta"]);
      
      const ventasAnioRes = await supabase
        .from("pedidos")
        .select("total")
        .gte("created_at", inicioAnio)
        .in("status", ["entregado", "en_ruta"]);
      
      const clientesRes = await supabase
        .from("clientes")
        .select("id, saldo_pendiente, limite_credito")
        .gt("saldo_pendiente", 0);
      
      // @ts-expect-error - Supabase deep type instantiation workaround
      const facturasVencidasRes = await supabase
        .from("facturas")
        .select("total, fecha_vencimiento, cliente_id")
        .lt("fecha_vencimiento", hoy)
        .eq("status", "vigente");
      
      const stockBajoRes = await supabase
        .from("productos")
        .select("id", { count: "exact", head: true })
        .filter("stock_actual", "lte", "stock_minimo")
        .eq("activo", true);
      
      const pedidosPendientesRes = await supabase
        .from("pedidos")
        .select("id", { count: "exact", head: true })
        .eq("status", "pendiente");

      // Calcular ventas del mes
      const ventasMes = ventasMesRes.data?.reduce((sum, p) => sum + (p.total || 0), 0) || 0;
      
      // Calcular ventas del año
      const ventasAnio = ventasAnioRes.data?.reduce((sum, p) => sum + (p.total || 0), 0) || 0;
      
      // Por cobrar total
      const porCobrar = clientesRes.data?.reduce((sum, c) => sum + (c.saldo_pendiente || 0), 0) || 0;
      
      // Monto vencido
      const montoVencido = facturasVencidasRes.data?.reduce((sum, f) => sum + (f.total || 0), 0) || 0;
      
      // Clientes morosos (con facturas vencidas > 15 días)
      const clientesMorososIds = new Set<string>();
      facturasVencidasRes.data?.forEach(f => {
        if (f.fecha_vencimiento && f.cliente_id) {
          const diasVencido = Math.floor((Date.now() - new Date(f.fecha_vencimiento).getTime()) / (1000 * 60 * 60 * 24));
          if (diasVencido > 15) {
            clientesMorososIds.add(f.cliente_id);
          }
        }
      });
      
      // Crédito excedido
      const creditoExcedido = clientesRes.data?.filter(c => 
        c.limite_credito && c.saldo_pendiente && c.saldo_pendiente > c.limite_credito
      ).length || 0;

      setData({
        ventasMes,
        ventasAnio,
        porCobrar,
        montoVencido,
        clientesMorosos: clientesMorososIds.size,
        creditoExcedido,
        stockBajo: stockBajoRes.count || 0,
        pedidosPendientes: pedidosPendientesRes.count || 0
      });
    } catch (error) {
      console.error("Error loading KPIs:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toLocaleString()}`;
  };

  const kpis = [
    {
      title: "Ventas del Mes",
      value: data ? formatCurrency(data.ventasMes) : "$0",
      icon: DollarSign,
      description: "Total facturado este mes",
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/30"
    },
    {
      title: "Ventas del Año",
      value: data ? formatCurrency(data.ventasAnio) : "$0",
      icon: TrendingUp,
      description: "Acumulado del año",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/30"
    },
    {
      title: "Por Cobrar",
      value: data ? formatCurrency(data.porCobrar) : "$0",
      icon: CreditCard,
      description: "Saldo pendiente total",
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-950/30"
    },
    {
      title: "Monto Vencido",
      value: data ? formatCurrency(data.montoVencido) : "$0",
      icon: Clock,
      description: "Facturas vencidas",
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-50 dark:bg-red-950/30"
    },
    {
      title: "Clientes Morosos",
      value: data?.clientesMorosos || 0,
      icon: Users,
      description: ">15 días vencidos",
      color: "text-rose-600 dark:text-rose-400",
      bgColor: "bg-rose-50 dark:bg-rose-950/30"
    },
    {
      title: "Crédito Excedido",
      value: data?.creditoExcedido || 0,
      icon: AlertTriangle,
      description: "Superan límite",
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-50 dark:bg-orange-950/30"
    },
    {
      title: "Stock Bajo",
      value: data?.stockBajo || 0,
      icon: Package,
      description: "Bajo mínimo",
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-950/30"
    },
    {
      title: "Pedidos Pendientes",
      value: data?.pedidosPendientes || 0,
      icon: ShoppingCart,
      description: "Por procesar",
      color: "text-cyan-600 dark:text-cyan-400",
      bgColor: "bg-cyan-50 dark:bg-cyan-950/30"
    }
  ];

  if (loading) {
    return (
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="relative overflow-hidden">
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 mb-1" />
              <Skeleton className="h-3 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <Card key={kpi.title} className="relative overflow-hidden hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {kpi.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                <Icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{kpi.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
