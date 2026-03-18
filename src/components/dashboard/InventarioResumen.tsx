import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Package, TrendingUp, TrendingDown, ArrowRightLeft } from "lucide-react";
import { formatCurrencyCompact } from "@/lib/formatDashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from "recharts";

interface MovimientoData {
  tipo: string;
  cantidad: number;
  color: string;
}

interface InventarioStats {
  valorInventario: number;
  entradasMes: number;
  salidasMes: number;
  movimientosDia: MovimientoData[];
}

export const InventarioResumen = () => {
  const [stats, setStats] = useState<InventarioStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInventario();
  }, []);

  const loadInventario = async () => {
    try {
      const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const hace7Dias = new Date();
      hace7Dias.setDate(hace7Dias.getDate() - 7);

      const [productosRes, movimientosMesRes, movimientos7DiasRes] = await Promise.all([
        // Valor del inventario
        supabase
          .from("productos")
          .select("stock_actual, precio_venta, ultimo_costo_compra")
          .eq("activo", true)
          .gt("stock_actual", 0),
        
        // Movimientos del mes
        supabase
          .from("inventario_movimientos")
          .select("tipo_movimiento, cantidad")
          .gte("created_at", inicioMes),
        
        // Movimientos últimos 7 días para gráfico
        supabase
          .from("inventario_movimientos")
          .select("tipo_movimiento, cantidad, created_at")
          .gte("created_at", hace7Dias.toISOString())
      ]);

      // Calcular valor del inventario
      const valorInventario = productosRes.data?.reduce((sum, p) => {
        const costo = p.ultimo_costo_compra || (p.precio_venta * 0.7); // Estimación si no hay costo
        return sum + (p.stock_actual * costo);
      }, 0) || 0;

      // Movimientos del mes
      const entradasMes = movimientosMesRes.data
        ?.filter(m => m.tipo_movimiento === 'entrada')
        .reduce((sum, m) => sum + m.cantidad, 0) || 0;
      
      const salidasMes = movimientosMesRes.data
        ?.filter(m => m.tipo_movimiento === 'salida')
        .reduce((sum, m) => sum + m.cantidad, 0) || 0;

      // Agrupar movimientos por día para gráfico
      const porDia: Record<string, { entradas: number; salidas: number }> = {};
      
      movimientos7DiasRes.data?.forEach(m => {
        const dia = new Date(m.created_at).toLocaleDateString('es-MX', { weekday: 'short' });
        if (!porDia[dia]) {
          porDia[dia] = { entradas: 0, salidas: 0 };
        }
        if (m.tipo_movimiento === 'entrada') {
          porDia[dia].entradas += m.cantidad;
        } else if (m.tipo_movimiento === 'salida') {
          porDia[dia].salidas += m.cantidad;
        }
      });

      const movimientosDia = Object.entries(porDia).map(([dia, data]) => ({
        tipo: dia,
        cantidad: data.entradas - data.salidas, // Neto
        color: data.entradas - data.salidas >= 0 ? '#10b981' : '#ef4444'
      }));

      setStats({
        valorInventario,
        entradasMes,
        salidasMes,
        movimientosDia
      });
    } catch (error) {
      console.error("Error loading inventario:", error);
    } finally {
      setLoading(false);
    }
  };

  // formatCurrency removed - using formatCurrencyCompact from shared lib

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Package className="h-5 w-5 text-primary" />
          Inventario
        </CardTitle>
        <CardDescription>
          Valor y movimientos del mes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Valor del inventario */}
        <div className="text-center p-4 bg-muted/50 rounded-lg">
          <span className="text-sm text-muted-foreground">Valor del Inventario</span>
          <div className="text-3xl font-bold text-primary mt-1">
            {formatCurrencyCompact(stats?.valorInventario || 0)}
          </div>
        </div>

        {/* Entradas y salidas del mes */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
            <div>
              <div className="text-xs text-muted-foreground">Entradas</div>
              <div className="font-semibold">{stats?.entradasMes.toLocaleString()} uds</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
            <TrendingDown className="h-5 w-5 text-red-600" />
            <div>
              <div className="text-xs text-muted-foreground">Salidas</div>
              <div className="font-semibold">{stats?.salidasMes.toLocaleString()} uds</div>
            </div>
          </div>
        </div>

        {/* Gráfico de movimientos netos */}
        {stats && stats.movimientosDia.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
              <ArrowRightLeft className="h-4 w-4" />
              Movimiento neto (7 días)
            </div>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={stats.movimientosDia}>
                <XAxis dataKey="tipo" tick={{ fontSize: 10 }} />
                <Tooltip 
                  formatter={(value: number) => [
                    `${value > 0 ? '+' : ''}${value} uds`,
                    'Neto'
                  ]}
                />
                <Bar dataKey="cantidad" radius={[4, 4, 0, 0]}>
                  {stats.movimientosDia.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
