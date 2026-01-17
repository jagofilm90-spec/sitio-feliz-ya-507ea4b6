import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, TrendingDown } from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface VentaMensual {
  mes: string;
  mesCorto: string;
  ventas: number;
  anioAnterior: number;
}

export const VentasMensualesChart = () => {
  const [data, setData] = useState<VentaMensual[]>([]);
  const [loading, setLoading] = useState(true);
  const [totales, setTotales] = useState({ actual: 0, anterior: 0, variacion: 0 });

  useEffect(() => {
    loadVentas();
  }, []);

  const loadVentas = async () => {
    try {
      const now = new Date();
      const anioActual = now.getFullYear();
      const anioAnterior = anioActual - 1;

      // Obtener pedidos de los últimos 2 años
      const inicioAnioAnterior = new Date(anioAnterior, 0, 1).toISOString();
      
      const { data: pedidos, error } = await supabase
        .from("pedidos")
        .select("total, created_at")
        .gte("created_at", inicioAnioAnterior)
        .in("status", ["entregado", "en_ruta"]);

      if (error) throw error;

      // Agrupar por mes
      const mesesData: Record<string, { actual: number; anterior: number }> = {};
      
      // Inicializar todos los meses del año actual
      for (let i = 0; i < 12; i++) {
        const fecha = new Date(anioActual, i, 1);
        const key = `${anioActual}-${String(i + 1).padStart(2, '0')}`;
        mesesData[key] = { actual: 0, anterior: 0 };
      }

      pedidos?.forEach(p => {
        const fecha = new Date(p.created_at);
        const anio = fecha.getFullYear();
        const mes = fecha.getMonth();
        
        if (anio === anioActual) {
          const key = `${anioActual}-${String(mes + 1).padStart(2, '0')}`;
          if (mesesData[key]) {
            mesesData[key].actual += p.total || 0;
          }
        } else if (anio === anioAnterior) {
          const key = `${anioActual}-${String(mes + 1).padStart(2, '0')}`;
          if (mesesData[key]) {
            mesesData[key].anterior += p.total || 0;
          }
        }
      });

      const nombresMeses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      
      const chartData = Object.entries(mesesData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, values]) => {
          const mesNum = parseInt(key.split('-')[1]) - 1;
          return {
            mes: key,
            mesCorto: nombresMeses[mesNum],
            ventas: Math.round(values.actual),
            anioAnterior: Math.round(values.anterior)
          };
        });

      // Solo mostrar hasta el mes actual
      const mesActual = now.getMonth();
      const dataFiltrada = chartData.slice(0, mesActual + 1);

      // Calcular totales
      const totalActual = dataFiltrada.reduce((sum, m) => sum + m.ventas, 0);
      const totalAnterior = dataFiltrada.reduce((sum, m) => sum + m.anioAnterior, 0);
      const variacion = totalAnterior > 0 ? ((totalActual - totalAnterior) / totalAnterior) * 100 : 0;

      setData(dataFiltrada);
      setTotales({ actual: totalActual, anterior: totalAnterior, variacion });
    } catch (error) {
      console.error("Error loading ventas:", error);
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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const isPositive = totales.variacion >= 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Ventas Mensuales
            </CardTitle>
            <CardDescription>Comparativa año actual vs anterior</CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{formatCurrency(totales.actual)}</div>
            <div className={`flex items-center justify-end gap-1 text-sm ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
              {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {isPositive ? '+' : ''}{totales.variacion.toFixed(1)}% vs año anterior
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorAnterior" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="mesCorto" 
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => formatCurrency(value)}
              className="text-muted-foreground"
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                formatCurrency(value),
                name === 'ventas' ? 'Este año' : 'Año anterior'
              ]}
              labelFormatter={(label) => `Mes: ${label}`}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Area
              type="monotone"
              dataKey="anioAnterior"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={1}
              strokeDasharray="5 5"
              fillOpacity={1}
              fill="url(#colorAnterior)"
            />
            <Area
              type="monotone"
              dataKey="ventas"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorVentas)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
