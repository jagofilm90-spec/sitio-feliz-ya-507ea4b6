import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Truck, CheckCircle2, Clock, Package } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

interface EntregasStats {
  rutasActivas: number;
  totalEntregas: number;
  entregadas: number;
  pendientes: number;
  valorTotal: number;
  porcentajeCompletado: number;
}

export const EntregasHoyPanel = () => {
  const [stats, setStats] = useState<EntregasStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEntregasHoy();
  }, []);

  const loadEntregasHoy = async () => {
    try {
      const hoy = new Date().toISOString().split('T')[0];

      // Obtener rutas de hoy
      const { data: rutas, error: rutasError } = await supabase
        .from("rutas")
        .select("id, status")
        .eq("fecha_ruta", hoy);

      if (rutasError) throw rutasError;

      if (!rutas || rutas.length === 0) {
        setStats({
          rutasActivas: 0,
          totalEntregas: 0,
          entregadas: 0,
          pendientes: 0,
          valorTotal: 0,
          porcentajeCompletado: 0
        });
        setLoading(false);
        return;
      }

      const rutaIds = rutas.map(r => r.id);

      // Obtener entregas de las rutas de hoy
      const { data: entregas, error: entregasError } = await supabase
        .from("entregas")
        .select(`
          id,
          status_entrega,
          pedido_id,
          pedidos (
            total
          )
        `)
        .in("ruta_id", rutaIds);

      if (entregasError) throw entregasError;

      const totalEntregas = entregas?.length || 0;
      const entregadas = entregas?.filter(e => e.status_entrega === 'entregado').length || 0;
      const pendientes = totalEntregas - entregadas;
      const valorTotal = entregas?.reduce((sum, e) => sum + ((e.pedidos as any)?.total || 0), 0) || 0;
      const porcentajeCompletado = totalEntregas > 0 ? Math.round((entregadas / totalEntregas) * 100) : 0;

      setStats({
        rutasActivas: rutas.filter(r => r.status === 'en_ruta').length,
        totalEntregas,
        entregadas,
        pendientes,
        valorTotal,
        porcentajeCompletado
      });
    } catch (error) {
      console.error("Error loading entregas hoy:", error);
    } finally {
      setLoading(false);
    }
  };

  const fmtCurrency = (value: number) => `$${value.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.totalEntregas === 0) {
    return (
      <Card className="bg-muted/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Truck className="h-5 w-5 text-muted-foreground" />
            Entregas de Hoy
          </CardTitle>
          <CardDescription>
            Sin rutas programadas para hoy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>No hay entregas programadas</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Truck className="h-5 w-5 text-primary" />
          Entregas de Hoy
          {stats.rutasActivas > 0 && (
            <Badge variant="default" className="ml-2 animate-pulse">
              {stats.rutasActivas} en ruta
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Progreso de entregas del día
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Barra de progreso principal */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progreso</span>
            <span className="font-semibold">{stats.porcentajeCompletado}%</span>
          </div>
          <Progress value={stats.porcentajeCompletado} className="h-3" />
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-emerald-600 dark:text-emerald-400 mb-1">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs font-medium">Entregadas</span>
            </div>
            <span className="text-2xl font-bold">{stats.entregadas}</span>
          </div>
          
          <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-amber-600 dark:text-amber-400 mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-medium">Pendientes</span>
            </div>
            <span className="text-2xl font-bold">{stats.pendientes}</span>
          </div>
        </div>

        {/* Resumen total */}
        <div className="border-t pt-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total entregas</span>
            <span className="font-medium">{stats.totalEntregas}</span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-sm text-muted-foreground">Valor a entregar</span>
            <span className="font-bold text-primary">{fmtCurrency(stats.valorTotal)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
