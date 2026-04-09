import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Package, DollarSign, TrendingUp, Receipt } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/layout/PageHeader";

interface VentaMensual {
  mes: string;
  mesCorto: string;
  total: number;
}

const chartConfig = {
  total: { label: "Ventas", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

export function VendedorMisVentasTab({ onDashboardRefresh }: { onDashboardRefresh?: () => void } = {}) {
  const [loading, setLoading] = useState(true);
  const [ventasMensuales, setVentasMensuales] = useState<VentaMensual[]>([]);
  const [stats, setStats] = useState({
    totalVentas: 0, totalPedidos: 0, ticketPromedio: 0, comisionEstimada: 0
  });

  useEffect(() => {
    fetchStats();
    fetchVentasMensuales();

    const channel = supabase
      .channel('vendedor-ventas-stats-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' },
        (payload) => {
          const isStatusChange = payload.eventType === 'UPDATE' && payload.new && payload.old && payload.new.status !== payload.old.status;
          const isDeleteOrInsert = payload.eventType === 'DELETE' || payload.eventType === 'INSERT';
          if (isStatusChange || isDeleteOrInsert) {
            fetchStats();
            fetchVentasMensuales();
            onDashboardRefresh?.();
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchVentasMensuales = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const meses: VentaMensual[] = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const fecha = subMonths(now, i);
        const { data } = await supabase
          .from("pedidos")
          .select("total")
          .eq("vendedor_id", user.id)
          .gte("fecha_pedido", startOfMonth(fecha).toISOString())
          .lte("fecha_pedido", endOfMonth(fecha).toISOString())
          .not("status", "in", "(cancelado,por_autorizar)");
        meses.push({
          mes: format(fecha, "MMMM yyyy", { locale: es }),
          mesCorto: format(fecha, "MMM", { locale: es }).toUpperCase(),
          total: (data || []).reduce((sum, p) => sum + (p.total || 0), 0),
        });
      }
      setVentasMensuales(meses);
    } catch (error) {
      console.error("Error fetching monthly sales:", error);
    }
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("pedidos")
        .select("total")
        .eq("vendedor_id", user.id)
        .neq("status", "cancelado");

      if (error) throw error;

      const totalVentas = (data || []).reduce((sum, p) => sum + (p.total || 0), 0);
      const totalPedidos = (data || []).length;
      setStats({
        totalVentas,
        totalPedidos,
        ticketPromedio: totalPedidos > 0 ? totalVentas / totalPedidos : 0,
        comisionEstimada: totalVentas * 0.01,
      });
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar estadísticas");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mis ventas."
        lead="Histórico y performance del mes"
      />
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total vendido (año)", value: formatCurrency(stats.totalVentas) },
          { label: "Pedidos activos", value: String(stats.totalPedidos) },
          { label: "Ticket promedio", value: formatCurrency(stats.ticketPromedio) },
          { label: "Comisión (1%)", value: formatCurrency(stats.comisionEstimada) },
        ].map((kpi, i) => (
          <Card key={i} className="bg-white border border-ink-100 rounded-xl">
            <CardContent className="p-5">
              <p className="font-serif text-[32px] font-medium tabular-nums text-ink-900 leading-none">{kpi.value}</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-500 mt-2">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gráfica */}
      {ventasMensuales.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Ventas últimos 6 meses</h3>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <BarChart data={ventasMensuales} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <XAxis dataKey="mesCorto" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} fontSize={10} width={44} />
                <ChartTooltip content={<ChartTooltipContent />} formatter={(v: number) => [formatCurrency(v), "Ventas"]} labelFormatter={(l, p) => (p?.[0]?.payload as VentaMensual | undefined)?.mes || l} />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
