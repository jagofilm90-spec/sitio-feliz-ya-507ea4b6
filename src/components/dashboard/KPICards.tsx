import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrencyCompact } from "@/lib/formatDashboard";
import type { DashboardKPIs } from "./useDashboardData";

interface Props {
  data: DashboardKPIs | null;
  loading: boolean;
}

export const KPICards = ({ data, loading }: Props) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="space-y-6">
        {[0, 1, 2, 3].map(r => (
          <div key={r}>
            <Skeleton className="h-3 w-24 mb-3" />
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="rounded-xl border border-ink-100 bg-white p-5">
                  <Skeleton className="h-3 w-20 mb-3" />
                  <Skeleton className="h-8 w-24 mb-2" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const variacionMes = data?.variacionMes ?? 0;
  const trend: 'up' | 'down' | 'neutral' = variacionMes > 0 ? 'up' : variacionMes < 0 ? 'down' : 'neutral';

  const sections = [
    {
      label: "Dinero",
      cards: [
        {
          label: "Ventas del Día",
          value: data ? formatCurrencyCompact(data.ventasDia) : "$0",
          meta: "Hoy",
          route: "/pedidos",
        },
        {
          label: "Ventas del Mes",
          value: data ? formatCurrencyCompact(data.ventasMes) : "$0",
          trend,
          trendValue: `${Math.abs(variacionMes).toFixed(1)}% vs mes ant.`,
          route: "/pedidos",
        },
        {
          label: "Cobros de Hoy",
          value: data ? formatCurrencyCompact(data.cobrosHoy) : "$0",
          meta: "Recibidos hoy",
          route: "/facturas",
        },
        {
          label: "Por Cobrar",
          value: data ? formatCurrencyCompact(data.porCobrar) : "$0",
          meta: "Saldo pendiente",
          route: "/facturas",
        },
        {
          label: "Total Vencido",
          value: data ? formatCurrencyCompact(data.totalVencido) : "$0",
          meta: "Sin pagar",
          route: "/facturas",
        },
      ],
    },
    {
      label: "Operación de hoy",
      cards: [
        {
          label: "En Calle",
          value: data?.pedidosEnCalle ?? 0,
          meta: "Pedidos en ruta",
          route: "/rutas?tab=monitoreo",
        },
        {
          label: "Entregados Hoy",
          value: data?.entregasCompletadasHoy ?? 0,
          meta: "Completados",
          route: "/rutas",
        },
        {
          label: "Pendientes Hoy",
          value: data?.entregasPendientesHoy ?? 0,
          meta: "Por entregar",
          route: "/rutas",
        },
        {
          label: "Por Surtir",
          value: data?.pedidosPorSurtir ?? 0,
          meta: "En almacén",
          route: "/almacen-tablet",
        },
      ],
    },
    {
      label: "Alertas",
      cards: [
        {
          label: "Crédito Excedido",
          value: data?.creditoExcedido ?? 0,
          meta: "Clientes",
          route: "/clientes",
          alert: (data?.creditoExcedido ?? 0) > 0,
        },
        {
          label: "Stock Bajo",
          value: data?.stockBajo ?? 0,
          meta: "Productos",
          route: "/inventario",
          alert: (data?.stockBajo ?? 0) > 0,
        },
        {
          label: "Sin Autorizar",
          value: data?.pedidosSinAutorizar24h ?? 0,
          meta: "> 24 horas",
          route: "/pedidos?tab=por-autorizar",
          alert: (data?.pedidosSinAutorizar24h ?? 0) > 0,
        },
        {
          label: "Vencen Semana",
          value: data?.facturasVencenSemana ?? 0,
          meta: "Facturas",
          route: "/facturas",
          alert: (data?.facturasVencenSemana ?? 0) > 0,
        },
      ],
    },
    {
      label: "Compras",
      cards: [
        {
          label: "Anticipos en Curso",
          value: data ? formatCurrencyCompact(data.anticiposPendientes) : "$0",
          meta: "OCs pagadas sin recibir",
          route: "/compras?tab=adeudos",
        },
        {
          label: "Créditos a Favor",
          value: data ? formatCurrencyCompact(data.creditosProveedores) : "$0",
          meta: "Proveedores nos deben",
          route: "/compras?tab=devoluciones-faltantes",
        },
        {
          label: "Entregas Atrasadas",
          value: data?.entregasComprasAtrasadas ?? 0,
          meta: "Sin recibir de días anteriores",
          route: "/almacen-tablet",
          alert: (data?.entregasComprasAtrasadas ?? 0) > 0,
        },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <div key={section.label}>
          <div className="text-[9px] uppercase tracking-[0.22em] text-ink-400 font-medium mb-3">
            — {section.label}
          </div>
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            {section.cards.map((card) => (
              <div
                key={card.label}
                className="cursor-pointer"
                onClick={() => navigate((card as any).route)}
              >
                <StatCard
                  label={card.label}
                  value={card.value}
                  meta={<span>{(card as any).meta}</span>}
                  trend={(card as any).trend}
                  trendValue={(card as any).trendValue}
                  className={(card as any).alert ? "border-crimson-500/30" : undefined}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
