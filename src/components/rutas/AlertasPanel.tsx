import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertTriangle, Clock, XCircle, AlertCircle, 
  Package, Bell
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type { AlertaMonitoreo } from '@/hooks/useMonitoreoRutas';

interface AlertasPanelProps {
  alertas: AlertaMonitoreo[];
  onAlertaClick?: (alerta: AlertaMonitoreo) => void;
}

const getAlertaIcon = (tipo: AlertaMonitoreo['tipo']) => {
  switch (tipo) {
    case 'carga_retrasada':
      return <Package className="h-4 w-4" />;
    case 'entrega_rechazada':
      return <XCircle className="h-4 w-4" />;
    case 'sin_movimiento':
      return <Clock className="h-4 w-4" />;
    case 'tiempo_excedido':
      return <AlertTriangle className="h-4 w-4" />;
    case 'entrega_parcial':
      return <AlertCircle className="h-4 w-4" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
};

const getAlertaColor = (nivel: AlertaMonitoreo['nivel']) => {
  switch (nivel) {
    case 'error':
      return 'bg-destructive/10 border-destructive/30 text-destructive';
    case 'warning':
      return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-700 dark:text-yellow-400';
    case 'info':
      return 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400';
    default:
      return 'bg-muted border-border text-muted-foreground';
  }
};

const getAlertaBadgeVariant = (nivel: AlertaMonitoreo['nivel']): 'destructive' | 'secondary' | 'outline' => {
  switch (nivel) {
    case 'error':
      return 'destructive';
    case 'warning':
      return 'secondary';
    default:
      return 'outline';
  }
};

const AlertaItem = ({ alerta, onClick }: { alerta: AlertaMonitoreo; onClick?: () => void }) => {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-colors hover:bg-accent/50 ${getAlertaColor(alerta.nivel)}`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          {getAlertaIcon(alerta.tipo)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">{alerta.titulo}</span>
            <Badge variant={getAlertaBadgeVariant(alerta.nivel)} className="text-xs">
              {alerta.ruta_folio}
            </Badge>
          </div>
          <p className="text-sm opacity-80 truncate">{alerta.descripcion}</p>
        </div>
      </div>
    </button>
  );
};

export const AlertasPanel = ({ alertas, onAlertaClick }: AlertasPanelProps) => {
  const alertasError = alertas.filter(a => a.nivel === 'error');
  const alertasWarning = alertas.filter(a => a.nivel === 'warning');
  const alertasInfo = alertas.filter(a => a.nivel === 'info');

  if (alertas.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5" />
            Alertas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Sin alertas activas</p>
            <p className="text-sm">Todo marcha bien</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Alertas Activas
          </div>
          <Badge variant="destructive">{alertas.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="p-4 space-y-4">
            {/* Alertas críticas */}
            {alertasError.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase text-destructive flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  Críticas ({alertasError.length})
                </h4>
                <div className="space-y-2">
                  {alertasError.map((alerta) => (
                    <AlertaItem 
                      key={alerta.id} 
                      alerta={alerta}
                      onClick={() => onAlertaClick?.(alerta)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Advertencias */}
            {alertasWarning.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Advertencias ({alertasWarning.length})
                </h4>
                <div className="space-y-2">
                  {alertasWarning.map((alerta) => (
                    <AlertaItem 
                      key={alerta.id} 
                      alerta={alerta}
                      onClick={() => onAlertaClick?.(alerta)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Informativas */}
            {alertasInfo.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase text-blue-600 dark:text-blue-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Información ({alertasInfo.length})
                </h4>
                <div className="space-y-2">
                  {alertasInfo.map((alerta) => (
                    <AlertaItem 
                      key={alerta.id} 
                      alerta={alerta}
                      onClick={() => onAlertaClick?.(alerta)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
