import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format, eachDayOfInterval, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface ChartDataPoint {
  fecha: string;
  ventas: number;
  pedidos: number;
}

export function VendedorVentasChart() {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalMes, setTotalMes] = useState(0);

  useEffect(() => {
    fetchVentasDiarias();
  }, []);

  const fetchVentasDiarias = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const inicioMes = startOfMonth(new Date());
      const finMes = endOfMonth(new Date());
      const hoy = new Date();

      const { data: pedidos } = await supabase
        .from("pedidos")
        .select("fecha_pedido, total")
        .eq("vendedor_id", user.id)
        .gte("fecha_pedido", inicioMes.toISOString())
        .lte("fecha_pedido", finMes.toISOString())
        .not("status", "in", "(cancelado,por_autorizar)");

      // Crear estructura para días transcurridos del mes
      const diasTranscurridos = eachDayOfInterval({ start: inicioMes, end: hoy });

      const datosPorDia = diasTranscurridos.map(dia => {
        const diaStr = format(dia, "yyyy-MM-dd");
        const ventasDelDia = (pedidos || []).filter(p => 
          format(new Date(p.fecha_pedido), "yyyy-MM-dd") === diaStr
        );

        return {
          fecha: format(dia, "d"),
          ventas: ventasDelDia.reduce((sum, p) => sum + (p.total || 0), 0),
          pedidos: ventasDelDia.length
        };
      });

      const total = datosPorDia.reduce((sum, d) => sum + d.ventas, 0);
      setTotalMes(total);
      setChartData(datosPorDia);
    } catch (error) {
      console.error("Error fetching ventas diarias:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[180px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const mesActual = format(new Date(), "MMMM yyyy", { locale: es });
  const mesCapitalizado = mesActual.charAt(0).toUpperCase() + mesActual.slice(1);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <CardTitle className="text-base font-semibold">Ventas del Mes</CardTitle>
        </div>
        <div className="text-right">
          <span className="text-sm text-muted-foreground block">{mesCapitalizado}</span>
          <span className="text-sm font-semibold text-primary">{formatCurrency(totalMes)}</span>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorVentasVendedor" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" vertical={false} />
            <XAxis 
              dataKey="fecha" 
              fontSize={11} 
              tickLine={false} 
              axisLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              interval="preserveStartEnd"
            />
            <YAxis 
              tickFormatter={(val) => val >= 1000 ? `$${(val/1000).toFixed(0)}k` : `$${val}`} 
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              width={50}
            />
            <Tooltip 
              formatter={(value: number) => [formatCurrency(value), "Ventas"]}
              labelFormatter={(label) => `Día ${label}`}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
              labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
            />
            <Area 
              type="monotone" 
              dataKey="ventas" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorVentasVendedor)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
