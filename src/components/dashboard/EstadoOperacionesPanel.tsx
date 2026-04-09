import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { LiveIndicator } from "@/components/ui/live-indicator";
import { useEstadoOperaciones } from "@/hooks/useEstadoOperaciones";
import { 
  Shield, 
  Package, 
  Truck, 
  AlertTriangle,
  ChevronRight,
  Clock,
  CheckCircle2,
  Loader2,
  FileCheck,
  ShoppingCart,
  Percent
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export const EstadoOperacionesPanel = () => {
  const navigate = useNavigate();
  const { autorizaciones, recepciones, rutas, alertas, lastUpdate, loading } = useEstadoOperaciones();

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Cargando estado de operaciones...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            📊 Estado de Operaciones
          </CardTitle>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              Actualizado: {format(lastUpdate, "HH:mm:ss", { locale: es })}
            </span>
            <LiveIndicator size="sm" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Autorizaciones Pendientes */}
          <Card className="border-l-4 border-l-amber-500 bg-amber-50/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-amber-100">
                    <Shield className="h-5 w-5 text-amber-600" />
                  </div>
                  <span className="font-medium text-sm">Autorizaciones</span>
                </div>
                {autorizaciones.total > 0 && (
                  <Badge variant="destructive" className="animate-pulse">
                    {autorizaciones.total}
                  </Badge>
                )}
              </div>
              
              <div className="space-y-2 text-sm">
                {autorizaciones.descuentos > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Percent className="h-3.5 w-3.5" />
                      Descuentos
                    </span>
                    <Badge variant="secondary">{autorizaciones.descuentos}</Badge>
                  </div>
                )}
                {autorizaciones.cotizaciones > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <FileCheck className="h-3.5 w-3.5" />
                      Cotizaciones
                    </span>
                    <Badge variant="secondary">{autorizaciones.cotizaciones}</Badge>
                  </div>
                )}
                {autorizaciones.ordenesCompra > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <ShoppingCart className="h-3.5 w-3.5" />
                      Órdenes Compra
                    </span>
                    <Badge variant="secondary">{autorizaciones.ordenesCompra}</Badge>
                  </div>
                )}
                {autorizaciones.total === 0 && (
                  <p className="text-muted-foreground text-center py-2">
                    ✓ Sin pendientes
                  </p>
                )}
              </div>

              {autorizaciones.total > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full mt-3 text-amber-600 hover:text-amber-700"
                  onClick={() => navigate("/pedidos?tab=por-autorizar")}
                >
                  Ver pendientes <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Recepciones del Día */}
          <Card className="border-l-4 border-l-blue-500 bg-blue-50/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <Package className="h-5 w-5 text-blue-600" />
                  </div>
                  <span className="font-medium text-sm">Recepciones</span>
                </div>
                <Badge variant="outline">{recepciones.total} hoy</Badge>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    Programadas
                  </span>
                  <span className="font-medium">{recepciones.programadas}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5" />
                    En Descarga
                  </span>
                  <span className="font-medium text-blue-600">{recepciones.enDescarga}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Completadas
                  </span>
                  <span className="font-medium text-green-600">{recepciones.completadas}</span>
                </div>
              </div>

              {recepciones.total > 0 && (
                <Progress 
                  value={(recepciones.completadas / recepciones.total) * 100} 
                  className="mt-3 h-2"
                />
              )}

              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full mt-3 text-blue-600 hover:text-blue-700"
                onClick={() => navigate("/compras?tab=calendario")}
              >
                Ver calendario <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </CardContent>
          </Card>

          {/* Rutas Activas */}
          <Card className="border-l-4 border-l-green-500 bg-green-50/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-green-100">
                    <Truck className="h-5 w-5 text-green-600" />
                  </div>
                  <span className="font-medium text-sm">Rutas</span>
                </div>
                {rutas.activas > 0 && (
                  <Badge className="bg-green-600">
                    {rutas.activas} activas
                  </Badge>
                )}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Programadas</span>
                  <span className="font-medium">{rutas.programadas}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">En Curso</span>
                  <span className="font-medium text-green-600">{rutas.activas}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Completadas</span>
                  <span className="font-medium">{rutas.completadas}</span>
                </div>
              </div>

              {rutas.activas > 0 && (
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">
                      Entregas: {rutas.entregasCompletadas}/{rutas.entregasTotales}
                    </span>
                    <span className="font-medium">{rutas.progresoPromedio}%</span>
                  </div>
                  <Progress value={rutas.progresoPromedio} className="h-2" />
                </div>
              )}

              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full mt-3 text-green-600 hover:text-green-700"
                onClick={() => navigate("/rutas?tab=monitoreo")}
              >
                Ver monitoreo <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </CardContent>
          </Card>

          {/* Alertas Críticas */}
          <Card className={`border-l-4 ${alertas.total > 0 ? 'border-l-red-500 bg-red-50/50' : 'border-l-gray-300 bg-gray-50/50'}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${alertas.total > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
                    <AlertTriangle className={`h-5 w-5 ${alertas.total > 0 ? 'text-red-600' : 'text-gray-500'}`} />
                  </div>
                  <span className="font-medium text-sm">Alertas</span>
                </div>
                {alertas.total > 0 && (
                  <Badge variant="destructive" className="animate-pulse">
                    {alertas.total}
                  </Badge>
                )}
              </div>

              <div className="space-y-2 text-sm">
                {alertas.stockBajo > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Stock Bajo</span>
                    <Badge variant="outline" className="border-red-300 text-red-600">
                      {alertas.stockBajo}
                    </Badge>
                  </div>
                )}
                {alertas.caducidadProxima > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Por Caducar</span>
                    <Badge variant="outline" className="border-amber-300 text-amber-600">
                      {alertas.caducidadProxima}
                    </Badge>
                  </div>
                )}
                {alertas.licenciasVencer > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Licencias</span>
                    <Badge variant="outline" className="border-orange-300 text-orange-600">
                      {alertas.licenciasVencer}
                    </Badge>
                  </div>
                )}
                {alertas.vehiculosCheckup > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Checkups</span>
                    <Badge variant="outline" className="border-purple-300 text-purple-600">
                      {alertas.vehiculosCheckup}
                    </Badge>
                  </div>
                )}
                {alertas.total === 0 && (
                  <p className="text-muted-foreground text-center py-2">
                    ✓ Sin alertas activas
                  </p>
                )}
              </div>

              {alertas.total > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full mt-3 text-red-600 hover:text-red-700"
                  onClick={() => navigate("/inventario")}
                >
                  Ver alertas <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
};
