import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DollarSign, TrendingUp, CreditCard, Clock,
  Truck, CheckCircle2, Package, ShoppingCart,
  AlertTriangle, AlertOctagon, FileWarning, CalendarClock
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrencyCompact } from "@/lib/formatDashboard";
import type { DashboardKPIs } from "./useDashboardData";

interface Props {
  data: DashboardKPIs | null;
  loading: boolean;
}

export const KPICards = ({ data, loading }: Props) => {
  const navigate = useNavigate();

  const rows = [
    {
      label: "Dinero",
      kpis: [
        {
          title: "Ventas del Día",
          value: data ? formatCurrencyCompact(data.ventasDia) : "$0",
          icon: DollarSign,
          color: "text-emerald-600 dark:text-emerald-400",
          bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
          route: "/pedidos",
          description: "Hoy",
        },
        {
          title: "Ventas del Mes",
          value: data ? formatCurrencyCompact(data.ventasMes) : "$0",
          icon: TrendingUp,
          color: "text-blue-600 dark:text-blue-400",
          bgColor: "bg-blue-50 dark:bg-blue-950/30",
          route: "/pedidos",
          description: data ? `${data.variacionMes >= 0 ? '+' : ''}${data.variacionMes.toFixed(1)}% vs mes ant.` : "",
          descColor: data && data.variacionMes >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive",
        },
        {
          title: "Cobros de Hoy",
          value: data ? formatCurrencyCompact(data.cobrosHoy) : "$0",
          icon: CheckCircle2,
          color: "text-emerald-600 dark:text-emerald-400",
          bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
          route: "/facturas",
          description: "Recibidos hoy",
        },
        {
          title: "Por Cobrar",
          value: data ? formatCurrencyCompact(data.porCobrar) : "$0",
          icon: CreditCard,
          color: "text-amber-600 dark:text-amber-400",
          bgColor: "bg-amber-50 dark:bg-amber-950/30",
          route: "/facturas",
          description: "Saldo pendiente",
        },
        {
          title: "Total Vencido",
          value: data ? formatCurrencyCompact(data.totalVencido) : "$0",
          icon: Clock,
          color: "text-red-600 dark:text-red-400",
          bgColor: "bg-red-50 dark:bg-red-950/30",
          route: "/facturas",
          description: "Sin pagar",
        },
      ],
    },
    {
      label: "Operación de Hoy",
      kpis: [
        {
          title: "En Calle",
          value: data?.pedidosEnCalle ?? 0,
          icon: Truck,
          color: "text-blue-600 dark:text-blue-400",
          bgColor: "bg-blue-50 dark:bg-blue-950/30",
          route: "/rutas?tab=monitoreo",
          description: "Pedidos en ruta",
        },
        {
          title: "Entregados Hoy",
          value: data?.entregasCompletadasHoy ?? 0,
          icon: CheckCircle2,
          color: "text-emerald-600 dark:text-emerald-400",
          bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
          route: "/rutas",
          description: "Completados",
        },
        {
          title: "Pendientes Hoy",
          value: data?.entregasPendientesHoy ?? 0,
          icon: Package,
          color: "text-amber-600 dark:text-amber-400",
          bgColor: "bg-amber-50 dark:bg-amber-950/30",
          route: "/rutas",
          description: "Por entregar",
        },
        {
          title: "Por Surtir",
          value: data?.pedidosPorSurtir ?? 0,
          icon: ShoppingCart,
          color: "text-cyan-600 dark:text-cyan-400",
          bgColor: "bg-cyan-50 dark:bg-cyan-950/30",
          route: "/almacen-tablet",
          description: "En almacén",
        },
      ],
    },
    {
      label: "Alertas",
      kpis: [
        {
          title: "Crédito Excedido",
          value: data?.creditoExcedido ?? 0,
          icon: AlertOctagon,
          color: "text-red-600 dark:text-red-400",
          bgColor: "bg-red-50 dark:bg-red-950/30",
          route: "/clientes",
          description: "Clientes",
          alertWhen: (v: number) => v > 0,
          alertColor: "border-destructive/50",
        },
        {
          title: "Stock Bajo",
          value: data?.stockBajo ?? 0,
          icon: AlertTriangle,
          color: "text-orange-600 dark:text-orange-400",
          bgColor: "bg-orange-50 dark:bg-orange-950/30",
          route: "/inventario",
          description: "Productos",
          alertWhen: (v: number) => v > 0,
          alertColor: "border-orange-500/50",
        },
        {
          title: "Sin Autorizar",
          value: data?.pedidosSinAutorizar24h ?? 0,
          icon: FileWarning,
          color: "text-red-600 dark:text-red-400",
          bgColor: "bg-red-50 dark:bg-red-950/30",
          route: "/pedidos?tab=por-autorizar",
          description: "> 24 horas",
          alertWhen: (v: number) => v > 0,
          alertColor: "border-destructive/50",
        },
        {
          title: "Vencen Semana",
          value: data?.facturasVencenSemana ?? 0,
          icon: CalendarClock,
          color: "text-yellow-600 dark:text-yellow-400",
          bgColor: "bg-yellow-50 dark:bg-yellow-950/30",
          route: "/facturas",
          description: "Facturas",
          alertWhen: (v: number) => v > 0,
          alertColor: "border-yellow-500/50",
        },
      ],
    },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        {[0, 1, 2].map(r => (
          <div key={r} className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
                <CardContent><Skeleton className="h-8 w-20 mb-1" /><Skeleton className="h-3 w-16" /></CardContent>
              </Card>
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <div key={row.label}>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{row.label}</h3>
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            {row.kpis.map((kpi) => {
              const Icon = kpi.icon;
              const numVal = typeof kpi.value === 'number' ? kpi.value : 0;
              const isAlert = (kpi as any).alertWhen?.(numVal);
              return (
                <Card
                  key={kpi.title}
                  className={`cursor-pointer hover:shadow-md transition-shadow ${isAlert ? (kpi as any).alertColor : ''}`}
                  onClick={() => navigate(kpi.route)}
                >
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">{kpi.title}</CardTitle>
                    <div className={`p-1.5 sm:p-2 rounded-lg ${kpi.bgColor}`}>
                      <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${kpi.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-xl sm:text-2xl font-bold">{kpi.value}</div>
                    <p className={`text-xs mt-1 ${(kpi as any).descColor || 'text-muted-foreground'}`}>{kpi.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
