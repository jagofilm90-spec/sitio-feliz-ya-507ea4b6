import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Sparkles, 
  Truck, 
  Package, 
  AlertTriangle, 
  Check, 
  MapPin, 
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface RutaSugerida {
  vehiculo: {
    id: string;
    nombre: string;
    tipo: string;
    peso_maximo_local_kg: number;
    peso_maximo_foraneo_kg: number;
  };
  tipo_ruta: "local" | "foranea";
  pedidos: any[];
  peso_total: number;
  capacidad_maxima: number;
  porcentaje_carga: number;
  regiones: string[];
  zonas: string[];
}

interface SugerirRutasAIDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRutaCreada: () => void;
  choferes: { id: string; full_name: string }[];
}

const PRIORIDAD_LABELS: Record<string, { label: string; color: string }> = {
  vip_mismo_dia: { label: "VIP", color: "bg-red-500" },
  deadline: { label: "Deadline", color: "bg-orange-500" },
  dia_fijo_recurrente: { label: "Día Fijo", color: "bg-blue-500" },
  fecha_sugerida: { label: "Sugerida", color: "bg-green-500" },
  flexible: { label: "Flexible", color: "bg-gray-500" },
};

export const SugerirRutasAIDialog = ({
  open,
  onOpenChange,
  onRutaCreada,
  choferes,
}: SugerirRutasAIDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [rutasSugeridas, setRutasSugeridas] = useState<RutaSugerida[]>([]);
  const [pedidosSinAsignar, setPedidosSinAsignar] = useState<any[]>([]);
  const [notasAI, setNotasAI] = useState<string | null>(null);
  const [expandedRutas, setExpandedRutas] = useState<Set<number>>(new Set([0]));
  const [creandoRutas, setCreandoRutas] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  const generarSugerencias = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-routes", {
        body: { fecha: format(new Date(), "yyyy-MM-dd") },
      });

      if (error) throw error;

      setRutasSugeridas(data.rutas_sugeridas || []);
      setPedidosSinAsignar(data.pedidos_sin_asignar || []);
      setNotasAI(data.notas_ai);

      if (data.rutas_sugeridas?.length > 0) {
        toast({
          title: `${data.rutas_sugeridas.length} rutas sugeridas`,
          description: data.pedidos_sin_asignar?.length > 0 
            ? `${data.pedidos_sin_asignar.length} pedidos sin asignar`
            : "Todos los pedidos asignados",
        });
      } else {
        toast({
          title: "Sin rutas",
          description: data.mensaje || "No se pudieron generar rutas",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error generating routes:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudieron generar las sugerencias",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedRutas);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRutas(newExpanded);
  };

  const crearRuta = async (ruta: RutaSugerida, index: number) => {
    if (choferes.length === 0) {
      toast({
        title: "Sin choferes",
        description: "No hay choferes disponibles para asignar",
        variant: "destructive",
      });
      return;
    }

    setCreandoRutas(prev => new Set(prev).add(index));

    try {
      // Generate folio
      const { data: lastRuta } = await supabase
        .from("rutas")
        .select("folio")
        .order("created_at", { ascending: false })
        .limit(1);

      const lastNumber = lastRuta?.[0]?.folio 
        ? parseInt(lastRuta[0].folio.replace("RUT-", "")) 
        : 0;
      const newFolio = `RUT-${String(lastNumber + 1).padStart(4, "0")}`;

      // Create route (assign first available driver - user can change later)
      const { data: rutaData, error: rutaError } = await supabase
        .from("rutas")
        .insert([{
          folio: newFolio,
          fecha_ruta: format(new Date(), "yyyy-MM-dd"),
          chofer_id: choferes[0].id,
          vehiculo_id: ruta.vehiculo.id,
          peso_total_kg: ruta.peso_total,
          tipo_ruta: ruta.tipo_ruta,
          status: "programada",
          notas: `Ruta generada por AI. Regiones: ${ruta.regiones.join(", ") || "N/A"}`,
        }])
        .select()
        .single();

      if (rutaError) throw rutaError;

      // Create entregas
      const entregasData = ruta.pedidos.map((pedido, idx) => ({
        ruta_id: rutaData.id,
        pedido_id: pedido.id,
        orden_entrega: idx + 1,
        entregado: false,
      }));

      const { error: entregasError } = await supabase
        .from("entregas")
        .insert(entregasData);

      if (entregasError) throw entregasError;

      // Update pedidos status
      const pedidoIds = ruta.pedidos.map(p => p.id);
      await supabase
        .from("pedidos")
        .update({ status: "en_ruta" })
        .in("id", pedidoIds);

      // Update vehicle status
      await supabase
        .from("vehiculos")
        .update({ status: "en_ruta" })
        .eq("id", ruta.vehiculo.id);

      toast({ title: `Ruta ${newFolio} creada` });

      // Remove from suggestions
      setRutasSugeridas(prev => prev.filter((_, i) => i !== index));
      onRutaCreada();

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCreandoRutas(prev => {
        const newSet = new Set(prev);
        newSet.delete(index);
        return newSet;
      });
    }
  };

  const crearTodasLasRutas = async () => {
    for (let i = 0; i < rutasSugeridas.length; i++) {
      await crearRuta(rutasSugeridas[i], i);
    }
  };

  const getProgressColor = (porcentaje: number) => {
    if (porcentaje > 100) return "bg-destructive";
    if (porcentaje > 90) return "bg-green-500";
    if (porcentaje > 70) return "bg-yellow-500";
    return "bg-blue-500";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Sugerencias de Rutas con AI
          </DialogTitle>
          <DialogDescription>
            El sistema analiza pedidos pendientes y genera rutas óptimas
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col gap-4">
          {/* Generate button */}
          {rutasSugeridas.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Sparkles className="h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground text-center">
                Presiona el botón para generar sugerencias de rutas<br />
                basadas en pedidos pendientes y vehículos disponibles
              </p>
              <Button onClick={generarSugerencias} size="lg">
                <Sparkles className="h-4 w-4 mr-2" />
                Generar Sugerencias
              </Button>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground">Analizando pedidos y optimizando rutas...</p>
            </div>
          )}

          {/* Results */}
          {rutasSugeridas.length > 0 && (
            <>
              <div className="flex items-center justify-between flex-shrink-0">
                <div className="text-sm text-muted-foreground">
                  {rutasSugeridas.length} rutas sugeridas • {pedidosSinAsignar.length} pedidos sin asignar
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={generarSugerencias}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Regenerar
                  </Button>
                  {rutasSugeridas.length > 1 && (
                    <Button size="sm" onClick={crearTodasLasRutas}>
                      <Check className="h-4 w-4 mr-2" />
                      Crear Todas ({rutasSugeridas.length})
                    </Button>
                  )}
                </div>
              </div>

              {notasAI && (
                <Alert className="flex-shrink-0">
                  <Sparkles className="h-4 w-4" />
                  <AlertDescription>{notasAI}</AlertDescription>
                </Alert>
              )}

              <ScrollArea className="flex-1 min-h-0 max-h-[55vh]">
                <div className="space-y-4 pr-4">
                  {rutasSugeridas.map((ruta, index) => (
                    <Card key={index} className="overflow-hidden">
                      <CardHeader 
                        className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => toggleExpanded(index)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Truck className="h-5 w-5 text-primary" />
                            <div>
                              <CardTitle className="text-base flex items-center gap-2">
                                {ruta.vehiculo.nombre}
                                <Badge variant="outline">
                                  {ruta.tipo_ruta === "foranea" ? "Foránea" : "Local"}
                                </Badge>
                                {ruta.porcentaje_carga > 100 && (
                                  <Badge variant="destructive" className="text-xs">
                                    ⚠️ Excede capacidad
                                  </Badge>
                                )}
                              </CardTitle>
                              <p className="text-xs text-muted-foreground">
                                {ruta.zonas.slice(0, 3).join(", ")}
                                {ruta.zonas.length > 3 && ` +${ruta.zonas.length - 3}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-sm font-medium">
                                {ruta.pedidos.length} pedidos
                              </p>
                              <p className={`text-xs ${ruta.porcentaje_carga > 100 ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                                {ruta.peso_total.toLocaleString()} / {ruta.capacidad_maxima.toLocaleString()} kg
                              </p>
                            </div>
                            <div className="w-24">
                              <Progress 
                                value={Math.min(ruta.porcentaje_carga, 100)} 
                                className={`h-2 ${ruta.porcentaje_carga > 100 ? '[&>div]:bg-destructive' : ''}`}
                              />
                              <p className={`text-xs text-center mt-1 ${ruta.porcentaje_carga > 100 ? 'text-destructive font-medium' : ''}`}>
                                {ruta.porcentaje_carga.toFixed(0)}%
                              </p>
                            </div>
                            {expandedRutas.has(index) ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </div>
                      </CardHeader>

                      {expandedRutas.has(index) && (
                        <CardContent className="pt-0">
                          <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                            {ruta.pedidos.map((pedido, pIdx) => (
                              <div key={pedido.id} className="p-2 flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="w-6 h-6 flex items-center justify-center p-0">
                                    {pIdx + 1}
                                  </Badge>
                                  <div>
                                    <p className="font-medium">{pedido.folio}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {pedido.cliente?.nombre || "Sin cliente"}
                                      {pedido.sucursal?.nombre && ` - ${pedido.sucursal.nombre}`}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {pedido.prioridad_entrega && PRIORIDAD_LABELS[pedido.prioridad_entrega] && (
                                    <Badge className={`${PRIORIDAD_LABELS[pedido.prioridad_entrega].color} text-white text-xs`}>
                                      {PRIORIDAD_LABELS[pedido.prioridad_entrega].label}
                                    </Badge>
                                  )}
                                  <span className="text-xs text-muted-foreground">
                                    {(pedido.peso_total_kg || 0).toLocaleString()} kg
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 flex justify-end">
                            <Button 
                              size="sm" 
                              onClick={() => crearRuta(ruta, index)}
                              disabled={creandoRutas.has(index)}
                            >
                              {creandoRutas.has(index) ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4 mr-2" />
                              )}
                              Crear Ruta
                            </Button>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  ))}

                  {/* Unassigned orders */}
                  {pedidosSinAsignar.length > 0 && (
                    <Card className="border-orange-500">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2 text-orange-600">
                          <AlertTriangle className="h-5 w-5" />
                          {pedidosSinAsignar.length} Pedidos Sin Asignar
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                          Requieren vehículos adicionales o reprogramación
                        </p>
                      </CardHeader>
                      <CardContent>
                        <div className="border rounded-lg divide-y max-h-32 overflow-y-auto">
                          {pedidosSinAsignar.slice(0, 10).map((pedido: any) => (
                            <div key={pedido.id} className="p-2 flex items-center justify-between text-sm">
                              <div>
                                <p className="font-medium">{pedido.folio}</p>
                                <p className="text-xs text-muted-foreground">
                                  {pedido.cliente?.nombre || "Sin cliente"}
                                </p>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {(pedido.peso_total_kg || 0).toLocaleString()} kg
                              </span>
                            </div>
                          ))}
                          {pedidosSinAsignar.length > 10 && (
                            <div className="p-2 text-center text-xs text-muted-foreground">
                              +{pedidosSinAsignar.length - 10} más
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
