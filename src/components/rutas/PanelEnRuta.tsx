/**
 * Panel lateral que muestra sucursales organizadas en "De Ida" y "De Regreso"
 * para el modo "En Ruta" del mapa global
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  MapPin, Navigation, ArrowUp, ArrowDown, AlertTriangle, 
  Building2, Package, X, Warehouse
} from "lucide-react";
import { SucursalConRuta, BODEGA_COORDS } from "./hooks/useEnRutaCalculations";

interface PanelEnRutaProps {
  ancla: SucursalConRuta | null;
  sucursalesIda: SucursalConRuta[];
  sucursalesRegreso: SucursalConRuta[];
  sucursalesFueraRuta: SucursalConRuta[];
  soloConPedidos: boolean;
  onSoloConPedidosChange: (value: boolean) => void;
  onSucursalClick: (sucursal: SucursalConRuta) => void;
  onNavigate: (sucursal: SucursalConRuta) => void;
  onClearAncla: () => void;
  loading: boolean;
}

export const PanelEnRuta = ({
  ancla,
  sucursalesIda,
  sucursalesRegreso,
  sucursalesFueraRuta,
  soloConPedidos,
  onSoloConPedidosChange,
  onSucursalClick,
  onNavigate,
  onClearAncla,
  loading
}: PanelEnRutaProps) => {
  
  // Filtrar por pedidos pendientes si está activo
  const filtrarPorPedidos = (lista: SucursalConRuta[]) => 
    soloConPedidos ? lista.filter(s => s.tienePedidoPendiente) : lista;

  const idaFiltradas = filtrarPorPedidos(sucursalesIda);
  const regresoFiltradas = filtrarPorPedidos(sucursalesRegreso);
  const fueraFiltradas = filtrarPorPedidos(sucursalesFueraRuta);

  const totalConPedidos = [...sucursalesIda, ...sucursalesRegreso].filter(s => s.tienePedidoPendiente).length;

  const renderSucursalItem = (sucursal: SucursalConRuta, showDesviacion = true) => (
    <div
      key={sucursal.id}
      className="p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors border border-transparent hover:border-border"
      onClick={() => onSucursalClick(sucursal)}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm truncate">{sucursal.nombre}</p>
            {sucursal.tienePedidoPendiente && (
              <Package className="h-3.5 w-3.5 text-orange-500 shrink-0" />
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{sucursal.cliente_nombre}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {sucursal.distanciaDesdeBodega?.toFixed(1)} km
            </Badge>
            {showDesviacion && sucursal.desviacionKm !== undefined && sucursal.desviacionKm > 0 && (
              <Badge variant="secondary" className="text-xs">
                +{sucursal.desviacionKm.toFixed(1)} km desvío
              </Badge>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(sucursal);
          }}
        >
          <Navigation className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  if (!ancla) {
    return (
      <Card className="lg:col-span-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Modo En Ruta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Selecciona una sucursal como destino (ancla)</p>
            <p className="text-xs mt-1">para ver qué sucursales quedan en ruta</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="lg:col-span-1">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            En Ruta
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClearAncla}>
            <X className="h-4 w-4 mr-1" />
            Limpiar
          </Button>
        </div>
        
        {/* Ancla seleccionada */}
        <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 mt-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">⭐</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{ancla.nombre}</p>
              <p className="text-xs text-muted-foreground truncate">{ancla.cliente_nombre}</p>
            </div>
            {ancla.tienePedidoPendiente && (
              <Package className="h-4 w-4 text-orange-500" />
            )}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Badge className="bg-primary/20 text-primary-foreground">
              {ancla.distanciaDesdeBodega?.toFixed(1)} km desde bodega
            </Badge>
          </div>
        </div>

        {/* Filtro de pedidos pendientes */}
        <div className="flex items-center gap-2 mt-3 p-2 bg-muted/50 rounded-lg">
          <Checkbox
            id="solo-pedidos"
            checked={soloConPedidos}
            onCheckedChange={(checked) => onSoloConPedidosChange(!!checked)}
          />
          <label htmlFor="solo-pedidos" className="text-sm cursor-pointer flex-1">
            Solo con pedidos pendientes
          </label>
          {totalConPedidos > 0 && (
            <Badge variant="secondary" className="text-xs">
              {totalConPedidos}
            </Badge>
          )}
        </div>

        {/* Resumen */}
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="outline" className="flex-1 justify-center py-1">
            <ArrowUp className="h-3 w-3 mr-1" />
            {idaFiltradas.length} ida
          </Badge>
          <Badge variant="outline" className="flex-1 justify-center py-1">
            <ArrowDown className="h-3 w-3 mr-1" />
            {regresoFiltradas.length} regreso
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-[320px] lg:h-[380px]">
          <div className="p-3 space-y-4">
            
            {/* Bodega origen */}
            <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900">
              <Warehouse className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Bodega Principal</p>
                <p className="text-xs text-blue-600 dark:text-blue-400">Punto de partida</p>
              </div>
            </div>

            {/* Sucursales de ida */}
            {idaFiltradas.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ArrowUp className="h-4 w-4 text-green-600" />
                  <h4 className="text-sm font-semibold text-green-700 dark:text-green-400">DE IDA</h4>
                  <span className="text-xs text-muted-foreground">hacia {ancla.nombre}</span>
                </div>
                <div className="space-y-1 pl-2 border-l-2 border-green-300 dark:border-green-800">
                  {idaFiltradas.map(s => renderSucursalItem(s))}
                </div>
              </div>
            )}

            {/* Ancla (destino) */}
            <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-300 dark:border-amber-800">
              <span className="text-lg">⭐</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100 truncate">{ancla.nombre}</p>
                <p className="text-xs text-amber-600 dark:text-amber-400">ANCLA - Punto más lejano</p>
              </div>
            </div>

            {/* Sucursales de regreso */}
            {regresoFiltradas.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ArrowDown className="h-4 w-4 text-blue-600" />
                  <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-400">DE REGRESO</h4>
                  <span className="text-xs text-muted-foreground">hacia bodega</span>
                </div>
                <div className="space-y-1 pl-2 border-l-2 border-blue-300 dark:border-blue-800">
                  {regresoFiltradas.map(s => renderSucursalItem(s))}
                </div>
              </div>
            )}

            {/* Bodega destino */}
            <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900">
              <Warehouse className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Bodega Principal</p>
                <p className="text-xs text-blue-600 dark:text-blue-400">Punto de retorno</p>
              </div>
            </div>

            {/* Fuera de ruta */}
            {fueraFiltradas.length > 0 && (
              <div className="mt-4 pt-3 border-t">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <h4 className="text-sm font-medium text-muted-foreground">
                    FUERA DE RUTA ({fueraFiltradas.length})
                  </h4>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  Requieren &gt;15km de desviación
                </p>
                <div className="space-y-1 opacity-60">
                  {fueraFiltradas.slice(0, 5).map(s => renderSucursalItem(s))}
                  {fueraFiltradas.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center py-1">
                      +{fueraFiltradas.length - 5} más...
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Sin resultados */}
            {idaFiltradas.length === 0 && regresoFiltradas.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  {soloConPedidos 
                    ? "No hay sucursales con pedidos pendientes en esta ruta"
                    : "No hay sucursales en el corredor de esta ruta"}
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
