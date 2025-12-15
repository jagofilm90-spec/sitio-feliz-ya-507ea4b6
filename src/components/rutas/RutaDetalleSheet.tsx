import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Truck, User, Package, MapPin, CheckCircle2, XCircle, 
  Clock, AlertTriangle, Scale
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { RutaMonitoreo } from '@/hooks/useMonitoreoRutas';

interface RutaDetalleSheetProps {
  ruta: RutaMonitoreo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RutaDetalleSheet = ({ ruta, open, onOpenChange }: RutaDetalleSheetProps) => {
  if (!ruta) return null;

  const totalProductos = ruta.carga_productos.length;
  const productosCargados = ruta.carga_productos.filter(cp => cp.cargado).length;
  const progresoCarga = totalProductos > 0 ? (productosCargados / totalProductos) * 100 : 0;

  const totalEntregas = ruta.entregas.length;
  const entregasCompletadas = ruta.entregas.filter(
    e => e.status_entrega === 'entregado' || e.status_entrega === 'completo'
  ).length;
  const entregasRechazadas = ruta.entregas.filter(e => e.status_entrega === 'rechazado').length;
  const entregasParciales = ruta.entregas.filter(e => e.status_entrega === 'parcial').length;
  const progresoEntregas = totalEntregas > 0 ? (entregasCompletadas / totalEntregas) * 100 : 0;

  const getStatusBadge = (status: string) => {
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
      <Badge variant={variants[status] || 'default'} className={
        status === 'en_curso' ? 'bg-green-600' : 
        status === 'completada' ? 'bg-blue-600 text-white' : ''
      }>
        {labels[status] || status}
      </Badge>
    );
  };

  const getEntregaStatusBadge = (status: string) => {
    switch (status) {
      case 'entregado':
      case 'completo':
        return <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/30">Entregado</Badge>;
      case 'rechazado':
        return <Badge variant="destructive">Rechazado</Badge>;
      case 'parcial':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-500/30">Parcial</Badge>;
      default:
        return <Badge variant="secondary">Pendiente</Badge>;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span className="text-xl font-bold">{ruta.folio}</span>
            {getStatusBadge(ruta.status)}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-4 pr-4">
          <div className="space-y-6">
            {/* Información General */}
            <section className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Información General
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{format(new Date(ruta.fecha_ruta), "dd MMM yyyy", { locale: es })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={ruta.tipo_ruta === 'local' ? 'secondary' : 'outline'}>
                    {ruta.tipo_ruta === 'local' ? 'Local' : 'Foránea'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <span>{ruta.vehiculo?.nombre || 'Sin vehículo'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-muted-foreground" />
                  <span>{ruta.peso_total_kg?.toLocaleString() || 0} kg</span>
                </div>
              </div>
            </section>

            <Separator />

            {/* Personal */}
            <section className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Personal Asignado
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  <span className="font-medium">Chofer:</span>
                  <span>{ruta.chofer?.full_name || 'Sin asignar'}</span>
                </div>
                {ruta.ayudante && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Ayudante:</span>
                    <span>{ruta.ayudante.full_name}</span>
                  </div>
                )}
              </div>
            </section>

            <Separator />

            {/* Progreso de Carga */}
            <section className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Progreso de Carga
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span>Productos cargados</span>
                  </div>
                  <span className="font-medium">{productosCargados} / {totalProductos}</span>
                </div>
                <Progress value={progresoCarga} className="h-2" />
                <p className="text-xs text-muted-foreground text-right">
                  {Math.round(progresoCarga)}% completado
                </p>
              </div>
            </section>

            <Separator />

            {/* Resumen de Entregas */}
            <section className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Resumen de Entregas
              </h3>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2 rounded-lg bg-muted/50">
                  <p className="text-lg font-bold">{totalEntregas}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div className="p-2 rounded-lg bg-green-500/10">
                  <p className="text-lg font-bold text-green-600">{entregasCompletadas}</p>
                  <p className="text-xs text-green-600">Entregadas</p>
                </div>
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <p className="text-lg font-bold text-yellow-600">{entregasParciales}</p>
                  <p className="text-xs text-yellow-600">Parciales</p>
                </div>
                <div className="p-2 rounded-lg bg-destructive/10">
                  <p className="text-lg font-bold text-destructive">{entregasRechazadas}</p>
                  <p className="text-xs text-destructive">Rechazadas</p>
                </div>
              </div>
              <Progress 
                value={progresoEntregas} 
                className={`h-2 ${entregasRechazadas > 0 ? '[&>div]:bg-yellow-500' : ''}`} 
              />
            </section>

            <Separator />

            {/* Lista de Entregas */}
            <section className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Detalle de Entregas ({totalEntregas})
              </h3>
              <div className="space-y-2">
                {ruta.entregas.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Sin entregas asignadas
                  </p>
                ) : (
                  ruta.entregas.map((entrega, index) => (
                    <div 
                      key={entrega.id} 
                      className="p-3 rounded-lg border bg-card space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                            {entrega.orden_entrega || index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{entrega.cliente_nombre || 'Cliente'}</p>
                            {entrega.sucursal_nombre && (
                              <p className="text-xs text-muted-foreground">{entrega.sucursal_nombre}</p>
                            )}
                          </div>
                        </div>
                        {getEntregaStatusBadge(entrega.status_entrega)}
                      </div>
                      
                      {entrega.hora_entrega_real && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>Entregado: {entrega.hora_entrega_real}</span>
                        </div>
                      )}
                      
                      {entrega.nombre_receptor && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>Recibió: {entrega.nombre_receptor}</span>
                        </div>
                      )}
                      
                      {entrega.motivo_rechazo && (
                        <div className="flex items-start gap-1 text-xs text-destructive bg-destructive/10 p-2 rounded">
                          <AlertTriangle className="h-3 w-3 mt-0.5" />
                          <span>{entrega.motivo_rechazo}</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Timeline de Eventos */}
            {(ruta.fecha_hora_inicio || ruta.fecha_hora_fin) && (
              <>
                <Separator />
                <section className="space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Timeline
                  </h3>
                  <div className="space-y-2 text-sm">
                    {ruta.fecha_hora_inicio && (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span>Inicio: {format(new Date(ruta.fecha_hora_inicio), "dd/MM HH:mm", { locale: es })}</span>
                      </div>
                    )}
                    {ruta.fecha_hora_fin && (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <span>Fin: {format(new Date(ruta.fecha_hora_fin), "dd/MM HH:mm", { locale: es })}</span>
                      </div>
                    )}
                  </div>
                </section>
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};