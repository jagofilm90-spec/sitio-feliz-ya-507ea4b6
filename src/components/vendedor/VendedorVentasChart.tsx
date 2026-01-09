import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, CartesianGrid 
} from "recharts";
import { 
  format, eachDayOfInterval, startOfMonth, endOfMonth, 
  subMonths, startOfYear, eachMonthOfInterval 
} from "date-fns";
import { es } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, BarChart3, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface ChartDataPoint {
  fecha: string;
  ventas: number;
  pedidos: number;
}

interface MonthDataPoint {
  mes: string;
  ventas: number;
  pedidos: number;
}

type VistaActiva = 'mes' | 'comparativa' | 'anual';

export function VendedorVentasChart() {
  const [vistaActiva, setVistaActiva] = useState<VistaActiva>('mes');
  const [datosMes, setDatosMes] = useState<ChartDataPoint[]>([]);
  const [datosComparativa, setDatosComparativa] = useState<MonthDataPoint[]>([]);
  const [datosAnual, setDatosAnual] = useState<MonthDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalMes, setTotalMes] = useState(0);
  const [promedioMensual, setPromedioMensual] = useState(0);
  const [totalAnual, setTotalAnual] = useState(0);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const hoy = new Date();
      const inicioMes = startOfMonth(hoy);
      const finMes = endOfMonth(hoy);
      const inicioAnio = startOfYear(hoy);
      const inicio6Meses = subMonths(hoy, 5);

      // Fetch all orders for the year (covers all views)
      const { data: pedidosAnio } = await supabase
        .from("pedidos")
        .select("fecha_pedido, total")
        .eq("vendedor_id", user.id)
        .gte("fecha_pedido", inicioAnio.toISOString())
        .lte("fecha_pedido", finMes.toISOString())
        .not("status", "in", "(cancelado,por_autorizar)");

      // Process data for each view
      procesarDatosMes(pedidosAnio || [], inicioMes, hoy);
      procesarDatosComparativa(pedidosAnio || [], inicio6Meses, hoy);
      procesarDatosAnual(pedidosAnio || [], inicioAnio, hoy);
    } catch (error) {
      console.error("Error fetching ventas data:", error);
    } finally {
      setLoading(false);
    }
  };

  const procesarDatosMes = (pedidos: any[], inicioMes: Date, hoy: Date) => {
    const diasTranscurridos = eachDayOfInterval({ start: inicioMes, end: hoy });

    const datosPorDia = diasTranscurridos.map(dia => {
      const diaStr = format(dia, "yyyy-MM-dd");
      const ventasDelDia = pedidos.filter(p => 
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
    setDatosMes(datosPorDia);
  };

  const procesarDatosComparativa = (pedidos: any[], inicio6Meses: Date, hoy: Date) => {
    const meses = eachMonthOfInterval({ start: startOfMonth(inicio6Meses), end: hoy });

    const datosPorMes = meses.map(mes => {
      const mesStr = format(mes, "yyyy-MM");
      const ventasDelMes = pedidos.filter(p => 
        format(new Date(p.fecha_pedido), "yyyy-MM") === mesStr
      );

      return {
        mes: format(mes, "MMM", { locale: es }),
        ventas: ventasDelMes.reduce((sum, p) => sum + (p.total || 0), 0),
        pedidos: ventasDelMes.length
      };
    });

    const promedio = datosPorMes.length > 0 
      ? datosPorMes.reduce((sum, d) => sum + d.ventas, 0) / datosPorMes.length 
      : 0;
    setPromedioMensual(promedio);
    setDatosComparativa(datosPorMes);
  };

  const procesarDatosAnual = (pedidos: any[], inicioAnio: Date, hoy: Date) => {
    const meses = eachMonthOfInterval({ start: inicioAnio, end: hoy });

    const datosPorMes = meses.map(mes => {
      const mesStr = format(mes, "yyyy-MM");
      const ventasDelMes = pedidos.filter(p => 
        format(new Date(p.fecha_pedido), "yyyy-MM") === mesStr
      );

      return {
        mes: format(mes, "MMM", { locale: es }),
        ventas: ventasDelMes.reduce((sum, p) => sum + (p.total || 0), 0),
        pedidos: ventasDelMes.length
      };
    });

    const total = datosPorMes.reduce((sum, d) => sum + d.ventas, 0);
    setTotalAnual(total);
    setDatosAnual(datosPorMes);
  };

  const getTotalActivo = () => {
    switch (vistaActiva) {
      case 'mes': return totalMes;
      case 'comparativa': return promedioMensual;
      case 'anual': return totalAnual;
    }
  };

  const getEtiquetaTotal = () => {
    switch (vistaActiva) {
      case 'mes': return 'Total del mes';
      case 'comparativa': return 'Promedio mensual';
      case 'anual': return 'Total del año';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full mb-4" />
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const mesActual = format(new Date(), "MMMM yyyy", { locale: es });
  const anioActual = format(new Date(), "yyyy");

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <CardTitle className="text-base font-semibold">Análisis de Ventas</CardTitle>
        </div>
        <div className="text-right">
          <span className="text-xs text-muted-foreground block">{getEtiquetaTotal()}</span>
          <span className="text-sm font-semibold text-primary">{formatCurrency(getTotalActivo())}</span>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <Tabs value={vistaActiva} onValueChange={(v) => setVistaActiva(v as VistaActiva)}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="mes" className="text-xs gap-1">
              <Calendar className="h-3 w-3" />
              <span className="hidden sm:inline">Mes</span>
            </TabsTrigger>
            <TabsTrigger value="comparativa" className="text-xs gap-1">
              <BarChart3 className="h-3 w-3" />
              <span className="hidden sm:inline">6 Meses</span>
            </TabsTrigger>
            <TabsTrigger value="anual" className="text-xs gap-1">
              <TrendingUp className="h-3 w-3" />
              <span className="hidden sm:inline">Anual</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mes" className="mt-0">
            <div className="text-xs text-muted-foreground mb-2 capitalize">{mesActual}</div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={datosMes} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVentasMes" x1="0" y1="0" x2="0" y2="1">
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
                  fill="url(#colorVentasMes)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="comparativa" className="mt-0">
            <div className="text-xs text-muted-foreground mb-2">Últimos 6 meses</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={datosComparativa} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" vertical={false} />
                <XAxis 
                  dataKey="mes" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
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
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                />
                <Bar 
                  dataKey="ventas" 
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="anual" className="mt-0">
            <div className="text-xs text-muted-foreground mb-2">Año {anioActual}</div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={datosAnual} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVentasAnual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" vertical={false} />
                <XAxis 
                  dataKey="mes" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
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
                  stroke="hsl(var(--chart-2))" 
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorVentasAnual)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
