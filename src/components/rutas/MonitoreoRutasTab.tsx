import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Truck, Package, MapPin, CheckCircle2, XCircle, 
  Clock, RefreshCw, Activity
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useMonitoreoRutas, type RutaMonitoreo } from '@/hooks/useMonitoreoRutas';
import { RutaMonitorCard } from './RutaMonitorCard';
import { AlertasPanel } from './AlertasPanel';
import { RutaDetalleSheet } from './RutaDetalleSheet';

const StatCard = ({ 
  icon: Icon, 
  label, 
  value, 
  subvalue,
  variant = 'default' 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string | number;
  subvalue?: string;
  variant?: 'default' | 'success' | 'warning' | 'error';
}) => {
  const variantClasses = {
    default: 'bg-card',
    success: 'bg-green-500/10 border-green-500/30',
    warning: 'bg-yellow-500/10 border-yellow-500/30',
    error: 'bg-destructive/10 border-destructive/30',
  };

  const iconClasses = {
    default: 'text-muted-foreground',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    error: 'text-destructive',
  };

  return (
    <Card className={`${variantClasses[variant]}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Icon className={`h-8 w-8 ${iconClasses[variant]}`} />
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
            {subvalue && (
              <p className="text-xs text-muted-foreground">{subvalue}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const MonitoreoRutasTab = () => {
  const { rutas, alertas, estadisticas, loading, lastUpdate, refetch } = useMonitoreoRutas();
  const [selectedRuta, setSelectedRuta] = useState<RutaMonitoreo | null>(null);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 grid gap-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  const rutasPorEstado = {
    programadas: rutas.filter(r => r.status === 'programada'),
    enCurso: rutas.filter(r => r.status === 'en_curso'),
    completadas: rutas.filter(r => r.status === 'completada'),
  };

  return (
    <div className="space-y-6">
      {/* Header con última actualización */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Activity className="h-4 w-4 text-green-500 animate-pulse" />
          <span>Monitoreo en tiempo real</span>
          <span>•</span>
          <span>
            Última actualización: {format(lastUpdate, "HH:mm:ss", { locale: es })}
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={refetch}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Estadísticas globales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={Truck}
          label="Rutas del día"
          value={estadisticas.totalRutas}
          subvalue={`${estadisticas.rutasEnCurso} en curso`}
        />
        <StatCard
          icon={MapPin}
          label="Entregas"
          value={`${estadisticas.entregasCompletadas}/${estadisticas.totalEntregas}`}
          subvalue={`${Math.round((estadisticas.entregasCompletadas / Math.max(estadisticas.totalEntregas, 1)) * 100)}% completado`}
          variant={estadisticas.entregasCompletadas === estadisticas.totalEntregas && estadisticas.totalEntregas > 0 ? 'success' : 'default'}
        />
        <StatCard
          icon={CheckCircle2}
          label="Completadas"
          value={estadisticas.entregasCompletadas}
          variant="success"
        />
        <StatCard
          icon={XCircle}
          label="Rechazadas"
          value={estadisticas.entregasRechazadas}
          variant={estadisticas.entregasRechazadas > 0 ? 'error' : 'default'}
        />
      </div>

      {/* Contenido principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel de rutas */}
        <div className="lg:col-span-2 space-y-4">
          {rutas.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Truck className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                <h3 className="text-lg font-medium mb-1">Sin rutas programadas</h3>
                <p className="text-muted-foreground">
                  No hay rutas programadas para hoy
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Rutas en curso (prioridad) */}
              {rutasPorEstado.enCurso.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    En Ruta ({rutasPorEstado.enCurso.length})
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    {rutasPorEstado.enCurso.map((ruta) => (
                      <RutaMonitorCard key={ruta.id} ruta={ruta} onVerDetalles={setSelectedRuta} />
                    ))}
                  </div>
                </div>
              )}

              {/* Rutas programadas */}
              {rutasPorEstado.programadas.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                    Programadas ({rutasPorEstado.programadas.length})
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    {rutasPorEstado.programadas.map((ruta) => (
                      <RutaMonitorCard key={ruta.id} ruta={ruta} onVerDetalles={setSelectedRuta} />
                    ))}
                  </div>
                </div>
              )}

              {/* Rutas completadas */}
              {rutasPorEstado.completadas.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Completadas ({rutasPorEstado.completadas.length})
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    {rutasPorEstado.completadas.map((ruta) => (
                      <RutaMonitorCard key={ruta.id} ruta={ruta} onVerDetalles={setSelectedRuta} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Panel de alertas */}
        <div>
          <AlertasPanel alertas={alertas} />
        </div>
      </div>

      {/* Sheet de detalles */}
      <RutaDetalleSheet 
        ruta={selectedRuta} 
        open={!!selectedRuta} 
        onOpenChange={(open) => !open && setSelectedRuta(null)} 
      />
    </div>
  );
};
