import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Truck, User, Clock, Package, MapPin, Phone, CheckCircle2, 
  XCircle, AlertTriangle, Navigation, MessageSquare
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type { RutaMonitoreo } from '@/hooks/useMonitoreoRutas';
import { useChoferUbicacionRealtime } from '@/hooks/useChoferUbicacionRealtime';
import { MapaRutaEnVivo } from './MapaRutaEnVivo';
import EnviarMensajeChoferDialog from './EnviarMensajeChoferDialog';

interface RutaMonitorCardProps {
  ruta: RutaMonitoreo;
  onVerDetalles?: (ruta: RutaMonitoreo) => void;
}

const StatusTimeline = ({ status }: { status: string }) => {
  const estados = [
    { key: 'programada', label: 'Prog.' },
    { key: 'cargando', label: 'Carg.' },
    { key: 'cargada', label: 'Lista' },
    { key: 'en_curso', label: 'Ruta' },
    { key: 'completada', label: 'Fin' },
  ];

  const getEstadoIndex = () => {
    switch (status) {
      case 'programada': return 0;
      case 'cargando': return 1;
      case 'cargada': return 2;
      case 'en_curso': return 3;
      case 'completada': return 4;
      default: return 0;
    }
  };

  const currentIndex = getEstadoIndex();

  return (
    <div className="flex items-center gap-1 w-full">
      {estados.map((estado, idx) => (
        <div key={estado.key} className="flex items-center flex-1">
          <div className="flex flex-col items-center flex-1">
            <div
              className={`w-3 h-3 rounded-full ${
                idx < currentIndex
                  ? 'bg-primary'
                  : idx === currentIndex
                  ? 'bg-primary ring-2 ring-primary/30'
                  : 'bg-muted'
              }`}
            />
            <span className={`text-[10px] mt-1 ${
              idx <= currentIndex ? 'text-foreground' : 'text-muted-foreground'
            }`}>
              {estado.label}
            </span>
          </div>
          {idx < estados.length - 1 && (
            <div
              className={`h-0.5 flex-1 -mx-1 ${
                idx < currentIndex ? 'bg-primary' : 'bg-muted'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export const RutaMonitorCard = ({ ruta, onVerDetalles }: RutaMonitorCardProps) => {
  const [showMapa, setShowMapa] = useState(false);
  const [showMensaje, setShowMensaje] = useState(false);
  
  const { getUbicacionByRuta, isLocationStale } = useChoferUbicacionRealtime({
    rutaIds: [ruta.id],
    enabled: ruta.status === 'en_curso',
  });

  const ubicacionChofer = getUbicacionByRuta(ruta.id);
  const hasActiveGps = ubicacionChofer && !isLocationStale(ruta.id);

  const totalProductos = ruta.carga_productos.length;
  const productosCargados = ruta.carga_productos.filter(cp => cp.cargado).length;
  const progresoCarga = totalProductos > 0 ? (productosCargados / totalProductos) * 100 : 0;

  const totalEntregas = ruta.entregas.length;
  const entregasCompletadas = ruta.entregas.filter(
    e => e.status_entrega === 'entregado' || e.status_entrega === 'completo'
  ).length;
  const entregasRechazadas = ruta.entregas.filter(e => e.status_entrega === 'rechazado').length;
  const progresoEntregas = totalEntregas > 0 ? (entregasCompletadas / totalEntregas) * 100 : 0;

  const tieneRechazos = entregasRechazadas > 0;
  const tieneProblemas = tieneRechazos;

  const getStatusBadge = () => {
    const variants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
      programada: 'secondary',
      cargando: 'outline',
      cargada: 'outline',
      en_curso: 'default',
      completada: 'outline',
    };

    const labels: Record<string, string> = {
      programada: 'Programada',
      cargando: 'Cargando',
      cargada: 'Cargada',
      en_curso: 'En Ruta',
      completada: 'Completada',
    };

    return (
      <Badge variant={variants[ruta.status] || 'default'} className={
        ruta.status === 'en_curso' ? 'bg-green-600' : 
        ruta.status === 'completada' ? 'bg-blue-600 text-white' : ''
      }>
        {labels[ruta.status] || ruta.status}
      </Badge>
    );
  };

  return (
    <Card className={`relative ${tieneProblemas ? 'border-destructive/50' : ''}`}>
      {tieneProblemas && (
        <div className="absolute top-2 right-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </TooltipTrigger>
              <TooltipContent>
                {entregasRechazadas} entrega(s) rechazada(s)
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-bold text-lg">{ruta.folio}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Truck className="h-3 w-3" />
              <span>{ruta.vehiculo?.nombre || 'Sin vehículo'}</span>
            </div>
          </div>
          <div className="text-right">
            {getStatusBadge()}
            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(ruta.updated_at), { 
                addSuffix: true, 
                locale: es 
              })}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Personal */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3 text-muted-foreground" />
            <span className="font-medium">{ruta.chofer?.full_name || 'Sin chofer'}</span>
          </div>
          {ruta.ayudante && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <User className="h-3 w-3" />
              <span>{ruta.ayudante.full_name}</span>
            </div>
          )}
        </div>

        {/* Timeline */}
        <StatusTimeline status={ruta.status} />

        {/* Progreso de Carga */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1">
              <Package className="h-3 w-3 text-muted-foreground" />
              <span>Carga</span>
            </div>
            <span className="text-muted-foreground">
              {productosCargados}/{totalProductos} productos ({Math.round(progresoCarga)}%)
            </span>
          </div>
          <Progress value={progresoCarga} className="h-2" />
        </div>

        {/* Progreso de Entregas */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3 text-muted-foreground" />
              <span>Entregas</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-600" />
                {entregasCompletadas}
              </span>
              {entregasRechazadas > 0 && (
                <span className="flex items-center gap-1 text-destructive">
                  <XCircle className="h-3 w-3" />
                  {entregasRechazadas}
                </span>
              )}
              <span>/ {totalEntregas}</span>
            </div>
          </div>
          <Progress 
            value={progresoEntregas} 
            className={`h-2 ${entregasRechazadas > 0 ? '[&>div]:bg-yellow-500' : ''}`} 
          />
        </div>

        {/* Peso */}
        <div className="text-sm text-muted-foreground">
          Peso total: <span className="font-medium text-foreground">
            {ruta.peso_total_kg?.toLocaleString() || 0} kg
          </span>
        </div>

        {/* Acciones */}
        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => onVerDetalles?.(ruta)}
          >
            Ver detalles
          </Button>
          {(ruta.status === 'en_curso' || ruta.status === 'cargada') && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant={hasActiveGps ? 'default' : 'outline'} 
                    size="sm"
                    className={hasActiveGps ? 'bg-green-600 hover:bg-green-700' : ''}
                    onClick={() => setShowMapa(true)}
                  >
                    <Navigation className="h-4 w-4 mr-1" />
                    {hasActiveGps && <span className="w-1.5 h-1.5 rounded-full bg-green-300 animate-pulse mr-1" />}
                    Mapa
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {hasActiveGps ? 'GPS activo - Ver ubicación en tiempo real' : 'Ver ruta en mapa'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {ruta.chofer && (ruta.status === 'en_curso' || ruta.status === 'cargada') && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => setShowMensaje(true)}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Enviar mensaje urgente</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {ruta.chofer && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Phone className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Llamar a {ruta.chofer.full_name}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </CardContent>

      {/* Mapa Dialog */}
      <MapaRutaEnVivo 
        ruta={ruta} 
        open={showMapa} 
        onOpenChange={setShowMapa} 
      />

      {/* Mensaje Urgente Dialog */}
      {ruta.chofer && (
        <EnviarMensajeChoferDialog
          open={showMensaje}
          onOpenChange={setShowMensaje}
          choferId={ruta.chofer.id}
          choferNombre={ruta.chofer.full_name}
          rutaId={ruta.id}
          rutaFolio={ruta.folio}
        />
      )}
    </Card>
  );
};
