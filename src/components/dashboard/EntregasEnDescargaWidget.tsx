import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Truck, ChevronRight, ChevronDown, Clock, User, Car, Package, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import logoAlmasa from "@/assets/logo-almasa.png";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface EntregaDescarga {
  id: string;
  numero_entrega: number;
  llegada_registrada_en: string | null;
  trabajando_desde: string | null;
  nombre_chofer_proveedor: string | null;
  placas_vehiculo?: string | null;
  cantidad_bultos: number;
  orden_compra: {
    id: string;
    folio: string;
    proveedor: { nombre: string } | null;
  };
}

interface ProductoDetalle {
  id: string;
  cantidad_ordenada: number;
  producto: {
    codigo: string | null;
    nombre: string;
    unidad: string | null;
    peso_kg: number | null;
  } | null;
}

interface EntregaCompletada {
  id: string;
  numero_entrega: number;
  llegada_registrada_en: string | null;
  recepcion_finalizada_en: string | null;
  nombre_chofer_proveedor: string | null;
  cantidad_bultos: number;
  orden_compra: {
    folio: string;
    proveedor: { nombre: string } | null;
  };
}

interface Props {
  entregas: EntregaDescarga[];
  completadasHoy?: EntregaCompletada[];
}

const MAX_VISIBLE = 5;

const getTimerColor = (segundos: number) => {
  const min = segundos / 60;
  if (min > 120) return "text-red-600 dark:text-red-400";
  if (min > 60) return "text-amber-600 dark:text-amber-400";
  return "text-green-600 dark:text-green-400";
};

const formatMinutos = (minutos: number) => {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return h > 0 ? `${h}h ${m}m` : `${m} min`;
};

const formatSegundos = (segundos: number) => {
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = segundos % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const TimerEnVivo = ({ inicio }: { inicio: string }) => {
  const [segundos, setSegundos] = useState(0);
  useEffect(() => {
    const inicioMs = new Date(inicio).getTime();
    const calcular = () => setSegundos(Math.floor((Date.now() - inicioMs) / 1000));
    calcular();
    const interval = setInterval(calcular, 1000);
    return () => clearInterval(interval);
  }, [inicio]);

  return (
    <span className={cn("font-mono font-bold text-3xl", getTimerColor(segundos))}>
      {formatSegundos(segundos)}
    </span>
  );
};

export const EntregasEnDescargaWidget = ({ entregas, completadasHoy = [] }: Props) => {
  const [, setTick] = useState(0);
  const [selectedEntrega, setSelectedEntrega] = useState<EntregaDescarga | null>(null);
  const [productos, setProductos] = useState<ProductoDetalle[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [showAllEnCurso, setShowAllEnCurso] = useState(false);
  const [showAllCompletadas, setShowAllCompletadas] = useState(false);

  useEffect(() => {
    if (entregas.length === 0) return;
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, [entregas.length]);

  useEffect(() => {
    if (!selectedEntrega) { setProductos([]); return; }
    const load = async () => {
      setLoadingProductos(true);
      try {
        const { data } = await supabase
          .from("ordenes_compra_detalles")
          .select(`id, cantidad_ordenada, producto:productos(codigo, nombre, unidad, peso_kg)`)
          .eq("orden_compra_id", selectedEntrega.orden_compra.id);
        setProductos((data as any[]) || []);
      } catch (e) { console.error("Error cargando productos:", e); }
      finally { setLoadingProductos(false); }
    };
    load();
  }, [selectedEntrega?.id]);

  if (entregas.length === 0 && completadasHoy.length === 0) return null;

  const entregasVisibles = showAllEnCurso ? entregas : entregas.slice(0, MAX_VISIBLE);
  const completadasVisibles = showAllCompletadas ? completadasHoy : completadasHoy.slice(0, MAX_VISIBLE);

  return (
    <>
      {/* En descarga */}
      {entregas.length > 0 && (
        <Card className="border-orange-500/50 bg-orange-50/50 dark:bg-orange-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400 text-base">
              <Truck className="h-5 w-5 animate-pulse" />
              {entregas.length} descarga{entregas.length > 1 ? "s" : ""} en curso
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-0">
              {entregasVisibles.map((e) => {
                const inicio = new Date(e.trabajando_desde || e.llegada_registrada_en || Date.now());
                const minutos = Math.floor((Date.now() - inicio.getTime()) / 60000);
                const colorTiempo = getTimerColor(minutos * 60);
                return (
                  <div key={e.id} className="flex items-center justify-between py-2.5 border-b last:border-0 border-orange-200/50 dark:border-orange-800/30 cursor-pointer hover:bg-orange-100/50 dark:hover:bg-orange-900/20 rounded transition-colors -mx-2 px-2" onClick={() => setSelectedEntrega(e)}>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{e.orden_compra?.proveedor?.nombre || "Sin proveedor"}</p>
                      <p className="text-xs text-muted-foreground">{e.orden_compra?.folio} · Entrega #{e.numero_entrega} · {e.cantidad_bultos} bultos</p>
                      {e.nombre_chofer_proveedor && (
                        <p className="text-xs text-muted-foreground">Chofer: {e.nombre_chofer_proveedor}{e.placas_vehiculo ? ` · ${e.placas_vehiculo}` : ""}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      <div className="text-right">
                        <p className={cn("font-bold text-lg", colorTiempo)}>{formatMinutos(minutos)}</p>
                        <p className="text-xs text-muted-foreground">en descarga</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                );
              })}
            </div>
            {entregas.length > MAX_VISIBLE && (
              <Button variant="ghost" size="sm" className="w-full mt-2 text-orange-700 dark:text-orange-400" onClick={() => setShowAllEnCurso(!showAllEnCurso)}>
                <ChevronDown className={cn("h-4 w-4 mr-1 transition-transform", showAllEnCurso && "rotate-180")} />
                {showAllEnCurso ? "Mostrar menos" : `Ver todas (${entregas.length})`}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog de detalle */}
      <Dialog open={!!selectedEntrega} onOpenChange={(open) => { if (!open) setSelectedEntrega(null); }}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Detalle de descarga</DialogTitle>
          </DialogHeader>

          {selectedEntrega && (
            <>
              {/* Header — fijo */}
              <div className="p-5 border-b bg-orange-50 dark:bg-orange-950/20 flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <img src={logoAlmasa} alt="ALMASA" className="h-7 object-contain" />
                  <Badge className="bg-orange-500 text-white gap-1">
                    <Truck className="h-3 w-3" />
                    EN DESCARGA
                  </Badge>
                </div>
                <p className="font-bold text-xl">{selectedEntrega.orden_compra?.proveedor?.nombre || "Sin proveedor"}</p>
                <p className="text-sm text-muted-foreground mt-1">{selectedEntrega.orden_compra?.folio} · Entrega #{selectedEntrega.numero_entrega}</p>
                <div className="mt-4 flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <TimerEnVivo inicio={selectedEntrega.trabajando_desde || selectedEntrega.llegada_registrada_en || new Date().toISOString()} />
                </div>
              </div>

              {/* Info transporte — fijo */}
              <div className="p-4 border-b flex-shrink-0">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div><p className="text-xs text-muted-foreground">Chofer</p><p className="font-medium">{selectedEntrega.nombre_chofer_proveedor || "—"}</p></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div><p className="text-xs text-muted-foreground">Placas</p><p className="font-medium font-mono">{selectedEntrega.placas_vehiculo || "—"}</p></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div><p className="text-xs text-muted-foreground">Inicio</p><p className="font-medium">{selectedEntrega.llegada_registrada_en ? format(new Date(selectedEntrega.llegada_registrada_en), "HH:mm", { locale: es }) : "—"}</p></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div><p className="text-xs text-muted-foreground">Bultos</p><p className="font-medium">{selectedEntrega.cantidad_bultos.toLocaleString()}</p></div>
                  </div>
                </div>
              </div>

              {/* Productos — scrollable */}
              <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                <div className="px-4 pt-4 pb-2 flex-shrink-0 flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Productos esperados ({productos.length})
                  </h3>
                  {productos.length > 10 && (
                    <span className="text-xs text-muted-foreground">Desliza para ver todos</span>
                  )}
                </div>

                {/* Tabla header — fijo */}
                {productos.length > 0 && !loadingProductos && (
                  <div className="px-4 flex-shrink-0">
                    <div className="grid grid-cols-[1fr_auto_auto] gap-2 text-xs font-medium text-muted-foreground border-b pb-1.5">
                      <span>Producto</span>
                      <span className="w-16 text-right">Cantidad</span>
                      <span className="w-20 text-right">Peso</span>
                    </div>
                  </div>
                )}

                <ScrollArea className="flex-1 min-h-0">
                  <div className="px-4 pb-4">
                    {loadingProductos ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">Cargando productos...</div>
                    ) : productos.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">Sin productos disponibles</div>
                    ) : (
                      <div className="space-y-0">
                        {productos.map((p) => {
                          const pesoTotal = p.producto?.peso_kg ? p.cantidad_ordenada * p.producto.peso_kg : null;
                          return (
                            <div key={p.id} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center py-2 border-b border-dashed last:border-0 text-sm">
                              <div className="min-w-0">
                                {p.producto?.codigo && <span className="font-mono text-xs text-muted-foreground">{p.producto.codigo} · </span>}
                                <span>{p.producto?.nombre || "—"}</span>
                              </div>
                              <span className="w-16 text-right font-bold">
                                {p.cantidad_ordenada} <span className="text-xs font-normal text-muted-foreground">{p.producto?.unidad || ""}</span>
                              </span>
                              <span className="w-20 text-right text-muted-foreground text-xs">
                                {pesoTotal ? `${pesoTotal.toLocaleString("es-MX")} kg` : "—"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Footer — fijo */}
              <div className="p-4 border-t bg-muted/30 text-center flex-shrink-0">
                <p className="text-xs text-muted-foreground">Se le notificará cuando la descarga haya finalizado</p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Completadas hoy */}
      {completadasHoy.length > 0 && (
        <Card className="border-green-500/50 bg-green-50/50 dark:bg-green-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400 text-base">
              <CheckCircle2 className="h-5 w-5" />
              {completadasHoy.length} recepción{completadasHoy.length > 1 ? "es" : ""} completada{completadasHoy.length > 1 ? "s" : ""} hoy
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-0">
              {completadasVisibles.map((e) => {
                const inicio = e.llegada_registrada_en ? new Date(e.llegada_registrada_en).getTime() : 0;
                const fin = e.recepcion_finalizada_en ? new Date(e.recepcion_finalizada_en).getTime() : 0;
                const minutos = inicio && fin ? Math.floor((fin - inicio) / 60000) : 0;
                const duracion = minutos >= 60 ? `${Math.floor(minutos / 60)}h ${minutos % 60}min` : `${minutos} min`;
                return (
                  <div key={e.id} className="flex items-center justify-between py-2.5 border-b last:border-0 border-green-200/50 dark:border-green-800/30">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{e.orden_compra?.proveedor?.nombre || "Sin proveedor"}</p>
                      <p className="text-xs text-muted-foreground">{e.orden_compra?.folio} · Entrega #{e.numero_entrega} · {e.cantidad_bultos} bultos</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="text-sm font-bold text-green-600 dark:text-green-400">{duracion}</p>
                      <p className="text-xs text-muted-foreground">descarga</p>
                    </div>
                  </div>
                );
              })}
            </div>
            {completadasHoy.length > MAX_VISIBLE && (
              <Button variant="ghost" size="sm" className="w-full mt-2 text-green-700 dark:text-green-400" onClick={() => setShowAllCompletadas(!showAllCompletadas)}>
                <ChevronDown className={cn("h-4 w-4 mr-1 transition-transform", showAllCompletadas && "rotate-180")} />
                {showAllCompletadas ? "Mostrar menos" : `Ver todas (${completadasHoy.length})`}
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
};
