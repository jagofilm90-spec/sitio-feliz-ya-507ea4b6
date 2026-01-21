import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useAlertasFlotilla } from "@/hooks/useAlertasFlotilla";
import { 
  AlertTriangle, 
  FileWarning, 
  IdCard, 
  Car, 
  RefreshCw, 
  Wrench,
  Clock,
  CheckCircle2
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export const AlertasFlotillaPanel = () => {
  const { 
    alertasLicencias, 
    alertasVerificaciones, 
    alertasDocumentos, 
    checkupsPendientes,
    loading, 
    recargar 
  } = useAlertasFlotilla();

  const getBadgeVariant = (diasRestantes: number, vencido?: boolean): "destructive" | "secondary" | "outline" => {
    if (vencido || diasRestantes < 0) return "destructive";
    if (diasRestantes <= 7) return "destructive";
    if (diasRestantes <= 15) return "secondary";
    return "outline";
  };

  const getPrioridadBadge = (prioridad: string) => {
    switch (prioridad) {
      case 'urgente':
        return <Badge variant="destructive">Urgente</Badge>;
      case 'alta':
        return <Badge className="bg-orange-600 text-white">Alta</Badge>;
      case 'media':
        return <Badge variant="secondary">Media</Badge>;
      default:
        return <Badge variant="outline">Baja</Badge>;
    }
  };

  const formatDias = (dias: number, vencido?: boolean) => {
    if (vencido || dias < 0) {
      return `VENCIDO hace ${Math.abs(dias)} días`;
    }
    if (dias === 0) return "VENCE HOY";
    if (dias === 1) return "Vence mañana";
    return `Vence en ${dias} días`;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          Panel de Alertas de Flotilla
        </h2>
        <Button variant="outline" size="sm" onClick={recargar}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Licencias */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <IdCard className="h-4 w-4" />
              Licencias de Conducir
              {alertasLicencias.length > 0 && (
                <Badge variant="destructive">{alertasLicencias.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alertasLicencias.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Todas las licencias están vigentes
              </div>
            ) : (
              <ScrollArea className="h-48">
                <div className="space-y-3">
                  {alertasLicencias.map((alerta) => (
                    <div 
                      key={alerta.id} 
                      className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{alerta.empleado_nombre}</p>
                          <p className="text-sm text-muted-foreground">{alerta.empleado_puesto}</p>
                          {alerta.vehiculo_asignado && (
                            <p className="text-xs text-muted-foreground">
                              Asignado a: {alerta.vehiculo_asignado}
                            </p>
                          )}
                        </div>
                        <Badge variant={getBadgeVariant(alerta.dias_restantes, alerta.vencida)}>
                          {formatDias(alerta.dias_restantes, alerta.vencida)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(alerta.fecha_vencimiento), "dd MMM yyyy", { locale: es })}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Verificaciones */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileWarning className="h-4 w-4" />
              Verificaciones Vehiculares
              {alertasVerificaciones.length > 0 && (
                <Badge className="bg-orange-500 text-white border-orange-500">{alertasVerificaciones.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alertasVerificaciones.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Sin verificaciones pendientes
              </div>
            ) : (
              <ScrollArea className="h-48">
                <div className="space-y-3">
                  {alertasVerificaciones.map((alerta) => (
                    <div 
                      key={alerta.id} 
                      className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{alerta.vehiculo_nombre}</p>
                          <p className="text-sm text-muted-foreground">{alerta.vehiculo_placa}</p>
                        </div>
                        <Badge variant={alerta.en_periodo ? "destructive" : "secondary"}>
                          {alerta.en_periodo ? "EN PERÍODO" : `En ${alerta.dias_restantes} días`}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Período: {format(new Date(alerta.periodo_inicio), "MMM", { locale: es })} - {format(new Date(alerta.periodo_fin), "MMM yyyy", { locale: es })}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Documentos (Pólizas y Tarjetas) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Car className="h-4 w-4" />
              Documentos Vehiculares
              {alertasDocumentos.length > 0 && (
                <Badge variant="destructive">{alertasDocumentos.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alertasDocumentos.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Todos los documentos están vigentes
              </div>
            ) : (
              <ScrollArea className="h-48">
                <div className="space-y-3">
                  {alertasDocumentos.map((alerta) => (
                    <div 
                      key={alerta.id} 
                      className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{alerta.vehiculo_nombre}</p>
                          <p className="text-sm text-muted-foreground">
                            {alerta.tipo === 'poliza' ? 'Póliza de Seguro' : 'Tarjeta de Circulación'}
                          </p>
                          <p className="text-xs text-muted-foreground">{alerta.vehiculo_placa}</p>
                        </div>
                        <Badge variant={getBadgeVariant(alerta.dias_restantes, alerta.vencido)}>
                          {formatDias(alerta.dias_restantes, alerta.vencido)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(alerta.fecha_vencimiento), "dd MMM yyyy", { locale: es })}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Checkups Pendientes */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Checkups con Fallas
              {checkupsPendientes.length > 0 && (
                <Badge variant="destructive">{checkupsPendientes.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {checkupsPendientes.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Sin reparaciones pendientes
              </div>
            ) : (
              <ScrollArea className="h-48">
                <div className="space-y-3">
                  {checkupsPendientes.map((checkup) => (
                    <div 
                      key={checkup.id} 
                      className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{checkup.vehiculo_nombre}</p>
                          <p className="text-sm text-muted-foreground">{checkup.vehiculo_placa}</p>
                          <p className="text-xs text-destructive mt-1">
                            {checkup.items_fallados} items con falla
                          </p>
                        </div>
                        {getPrioridadBadge(checkup.prioridad)}
                      </div>
                      {checkup.fallas_detectadas && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                          {checkup.fallas_detectadas}
                        </p>
                      )}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(checkup.fecha_checkup), "dd MMM yyyy HH:mm", { locale: es })}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
