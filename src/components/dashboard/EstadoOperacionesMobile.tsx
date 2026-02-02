import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { LiveIndicator } from "@/components/ui/live-indicator";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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

export const EstadoOperacionesMobile = () => {
  const navigate = useNavigate();
  const { autorizaciones, recepciones, rutas, alertas, lastUpdate, loading } = useEstadoOperaciones();

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-sm font-medium flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando...
          </span>
        </div>
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-3 pb-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-36 w-[260px] flex-shrink-0" />
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    );
  }

  const cards = [
    // Autorizaciones
    {
      id: 'autorizaciones',
      title: 'Autorizaciones',
      icon: Shield,
      color: 'amber',
      badge: autorizaciones.total > 0 ? autorizaciones.total : null,
      badgePulse: true,
      onClick: () => navigate("/pedidos"),
      content: (
        <div className="space-y-1.5 text-xs">
          {autorizaciones.descuentos > 0 && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Percent className="h-3 w-3" /> Descuentos
              </span>
              <Badge variant="secondary" className="text-[10px] px-1.5 h-5">{autorizaciones.descuentos}</Badge>
            </div>
          )}
          {autorizaciones.cotizaciones > 0 && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <FileCheck className="h-3 w-3" /> Cotizaciones
              </span>
              <Badge variant="secondary" className="text-[10px] px-1.5 h-5">{autorizaciones.cotizaciones}</Badge>
            </div>
          )}
          {autorizaciones.ordenesCompra > 0 && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <ShoppingCart className="h-3 w-3" /> OC
              </span>
              <Badge variant="secondary" className="text-[10px] px-1.5 h-5">{autorizaciones.ordenesCompra}</Badge>
            </div>
          )}
          {autorizaciones.total === 0 && (
            <p className="text-muted-foreground text-center py-1">✓ Sin pendientes</p>
          )}
        </div>
      )
    },
    // Recepciones
    {
      id: 'recepciones',
      title: 'Recepciones',
      icon: Package,
      color: 'blue',
      badge: `${recepciones.total} hoy`,
      badgePulse: false,
      onClick: () => navigate("/compras?tab=calendario"),
      content: (
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-3 w-3" /> Programadas
            </span>
            <span className="font-medium">{recepciones.programadas}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Loader2 className="h-3 w-3" /> En Descarga
            </span>
            <span className="font-medium text-blue-600">{recepciones.enDescarga}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <CheckCircle2 className="h-3 w-3" /> Completadas
            </span>
            <span className="font-medium text-green-600">{recepciones.completadas}</span>
          </div>
          {recepciones.total > 0 && (
            <Progress value={(recepciones.completadas / recepciones.total) * 100} className="mt-2 h-1.5" />
          )}
        </div>
      )
    },
    // Rutas
    {
      id: 'rutas',
      title: 'Rutas',
      icon: Truck,
      color: 'green',
      badge: rutas.activas > 0 ? `${rutas.activas} activas` : null,
      badgePulse: false,
      onClick: () => navigate("/rutas?tab=monitoreo"),
      content: (
        <div className="space-y-1.5 text-xs">
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
          {rutas.activas > 0 && (
            <div className="mt-2">
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                <span>Entregas: {rutas.entregasCompletadas}/{rutas.entregasTotales}</span>
                <span>{rutas.progresoPromedio}%</span>
              </div>
              <Progress value={rutas.progresoPromedio} className="h-1.5" />
            </div>
          )}
        </div>
      )
    },
    // Alertas
    {
      id: 'alertas',
      title: 'Alertas',
      icon: AlertTriangle,
      color: alertas.total > 0 ? 'red' : 'gray',
      badge: alertas.total > 0 ? alertas.total : null,
      badgePulse: alertas.total > 0,
      onClick: () => navigate("/inventario"),
      content: (
        <div className="space-y-1.5 text-xs">
          {alertas.stockBajo > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Stock Bajo</span>
              <Badge variant="outline" className="text-[10px] px-1.5 h-5 border-red-300 text-red-600">{alertas.stockBajo}</Badge>
            </div>
          )}
          {alertas.caducidadProxima > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Por Caducar</span>
              <Badge variant="outline" className="text-[10px] px-1.5 h-5 border-amber-300 text-amber-600">{alertas.caducidadProxima}</Badge>
            </div>
          )}
          {alertas.licenciasVencer > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Licencias</span>
              <Badge variant="outline" className="text-[10px] px-1.5 h-5 border-orange-300 text-orange-600">{alertas.licenciasVencer}</Badge>
            </div>
          )}
          {alertas.vehiculosCheckup > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Checkups</span>
              <Badge variant="outline" className="text-[10px] px-1.5 h-5 border-purple-300 text-purple-600">{alertas.vehiculosCheckup}</Badge>
            </div>
          )}
          {alertas.total === 0 && (
            <p className="text-muted-foreground text-center py-1">✓ Sin alertas</p>
          )}
        </div>
      )
    }
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'amber':
        return { border: 'border-l-amber-500', bg: 'bg-amber-50/50 dark:bg-amber-950/20', icon: 'bg-amber-100 dark:bg-amber-900/50', iconText: 'text-amber-600 dark:text-amber-400', button: 'text-amber-600' };
      case 'blue':
        return { border: 'border-l-blue-500', bg: 'bg-blue-50/50 dark:bg-blue-950/20', icon: 'bg-blue-100 dark:bg-blue-900/50', iconText: 'text-blue-600 dark:text-blue-400', button: 'text-blue-600' };
      case 'green':
        return { border: 'border-l-green-500', bg: 'bg-green-50/50 dark:bg-green-950/20', icon: 'bg-green-100 dark:bg-green-900/50', iconText: 'text-green-600 dark:text-green-400', button: 'text-green-600' };
      case 'red':
        return { border: 'border-l-red-500', bg: 'bg-red-50/50 dark:bg-red-950/20', icon: 'bg-red-100 dark:bg-red-900/50', iconText: 'text-red-600 dark:text-red-400', button: 'text-red-600' };
      default:
        return { border: 'border-l-gray-300', bg: 'bg-gray-50/50 dark:bg-gray-900/20', icon: 'bg-gray-100 dark:bg-gray-800', iconText: 'text-gray-500', button: 'text-gray-600' };
    }
  };

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-medium">📊 Estado de Operaciones</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">
            {format(lastUpdate, "HH:mm", { locale: es })}
          </span>
          <LiveIndicator size="sm" />
        </div>
      </div>

      {/* Carrusel horizontal */}
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-3 pb-3">
          {cards.map((card) => {
            const colors = getColorClasses(card.color);
            const Icon = card.icon;
            
            return (
              <Card 
                key={card.id}
                className={`border-l-4 ${colors.border} ${colors.bg} w-[240px] flex-shrink-0`}
              >
                <CardContent className="p-3">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${colors.icon}`}>
                        <Icon className={`h-4 w-4 ${colors.iconText}`} />
                      </div>
                      <span className="font-medium text-sm">{card.title}</span>
                    </div>
                    {card.badge && (
                      <Badge 
                        variant={card.color === 'red' || (card.id === 'autorizaciones' && card.badge) ? 'destructive' : 'outline'}
                        className={card.badgePulse ? 'animate-pulse' : ''}
                      >
                        {card.badge}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="min-h-[70px]">
                    {card.content}
                  </div>
                  
                  {/* Action button */}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={`w-full mt-2 h-7 text-xs ${colors.button}`}
                    onClick={card.onClick}
                  >
                    Ver más <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};
