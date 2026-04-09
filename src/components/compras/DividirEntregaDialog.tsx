import { useState, useMemo } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Scissors, Plus, Trash2, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";

interface EntregaExistente {
  id: string;
  numero_entrega: number;
  cantidad_bultos: number;
  fecha_programada: string | null;
  status: string;
}

interface ParteDivision {
  cantidad: number;
  fecha: string | null;
}

interface DividirEntregaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orden: any;
}

const DividirEntregaDialog = ({ open, onOpenChange, orden }: DividirEntregaDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [entregaSeleccionadaId, setEntregaSeleccionadaId] = useState<string | null>(null);
  const [partes, setPartes] = useState<ParteDivision[]>([
    { cantidad: 0, fecha: null },
    { cantidad: 0, fecha: null },
  ]);
  const [parteEditandoFecha, setParteEditandoFecha] = useState<number | null>(null);
  const [mesActual, setMesActual] = useState(new Date());

  // Fetch existing deliveries for this order
  const { data: entregasExistentes = [], isLoading: loadingEntregas } = useQuery({
    queryKey: ["entregas-orden", orden?.id],
    queryFn: async () => {
      if (!orden?.id) return [];
      const { data, error } = await supabase
        .from("ordenes_compra_entregas")
        .select("*")
        .eq("orden_compra_id", orden.id)
        .order("numero_entrega");
      if (error) throw error;
      return data as EntregaExistente[];
    },
    enabled: !!orden?.id && open,
  });

  // Fetch all scheduled deliveries for calendar indicators
  const { data: todasEntregasProgramadas = [] } = useQuery({
    queryKey: ["entregas_programadas_calendario"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ordenes_compra_entregas")
        .select(`
          *,
          ordenes_compra (
            id,
            folio,
            tipo_pago,
            status_pago,
            proveedor_id,
            proveedor_nombre_manual,
            proveedores (nombre)
          )
        `)
        .not("fecha_programada", "is", null)
        .order("fecha_programada");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Map deliveries by date for calendar indicators
  const entregasPorFecha = useMemo(() => {
    const mapa: Record<string, any[]> = {};
    todasEntregasProgramadas.forEach((entrega: any) => {
      if (entrega.fecha_programada) {
        const fechaKey = entrega.fecha_programada.split('T')[0];
        if (!mapa[fechaKey]) {
          mapa[fechaKey] = [];
        }
        mapa[fechaKey].push(entrega);
      }
    });
    return mapa;
  }, [todasEntregasProgramadas]);

  // Calendar helpers
  const diasDelMes = useMemo(() => {
    const inicio = startOfWeek(startOfMonth(mesActual), { locale: es });
    const fin = endOfWeek(endOfMonth(mesActual), { locale: es });
    return eachDayOfInterval({ start: inicio, end: fin });
  }, [mesActual]);

  const diasSemana = ["L", "M", "M", "J", "V", "S", "D"];

  const entregaSeleccionada = entregasExistentes.find(e => e.id === entregaSeleccionadaId);

  const getEntregasDelDia = (dia: Date) => {
    const key = format(dia, "yyyy-MM-dd");
    return entregasPorFecha[key] || [];
  };

  const tieneAnticipoPagado = (entrega: any) => {
    return entrega?.ordenes_compra?.tipo_pago === 'anticipado' && 
           entrega?.ordenes_compra?.status_pago === 'pagado';
  };

  const handleSelectEntrega = (id: string) => {
    setEntregaSeleccionadaId(id);
    const entrega = entregasExistentes.find(e => e.id === id);
    if (entrega) {
      const mitad = Math.floor(entrega.cantidad_bultos / 2);
      setPartes([
        { cantidad: mitad, fecha: entrega.fecha_programada },
        { cantidad: entrega.cantidad_bultos - mitad, fecha: null },
      ]);
    }
  };

  const handleCantidadChange = (index: number, value: number) => {
    const nuevasPartes = [...partes];
    nuevasPartes[index].cantidad = value;
    setPartes(nuevasPartes);
  };

  const handleFechaChange = (index: number, fecha: Date) => {
    const nuevasPartes = [...partes];
    nuevasPartes[index].fecha = format(fecha, "yyyy-MM-dd");
    setPartes(nuevasPartes);
    setParteEditandoFecha(null);
  };

  const handleAgregarParte = () => {
    if (partes.length >= 5) return;
    setPartes([...partes, { cantidad: 0, fecha: null }]);
  };

  const handleQuitarParte = (index: number) => {
    if (partes.length <= 2) return;
    setPartes(partes.filter((_, i) => i !== index));
  };

  const sumaPartes = partes.reduce((acc, p) => acc + (p.cantidad || 0), 0);
  const esValido = entregaSeleccionada && sumaPartes === entregaSeleccionada.cantidad_bultos && 
                   partes.every(p => p.cantidad > 0 && p.fecha);

  const dividirMutation = useMutation({
    mutationFn: async () => {
      if (!entregaSeleccionada) throw new Error("Selecciona una entrega");

      // Update the original delivery with first part
      const { error: updateError } = await supabase
        .from("ordenes_compra_entregas")
        .update({
          cantidad_bultos: partes[0].cantidad,
          fecha_programada: partes[0].fecha,
        })
        .eq("id", entregaSeleccionada.id);
      if (updateError) throw updateError;

      // Get max numero_entrega for renumbering
      const maxNumero = Math.max(...entregasExistentes.map(e => e.numero_entrega));

      // Insert new deliveries for remaining parts
      for (let i = 1; i < partes.length; i++) {
        const { error: insertError } = await supabase
          .from("ordenes_compra_entregas")
          .insert({
            orden_compra_id: orden.id,
            numero_entrega: maxNumero + i,
            cantidad_bultos: partes[i].cantidad,
            fecha_programada: partes[i].fecha,
            status: "programada",
          });
        if (insertError) throw insertError;
      }

      // Renumber all deliveries in order by fecha_programada
      const { data: allEntregas } = await supabase
        .from("ordenes_compra_entregas")
        .select("id, fecha_programada")
        .eq("orden_compra_id", orden.id)
        .order("fecha_programada", { ascending: true, nullsFirst: false });

      if (allEntregas) {
        for (let i = 0; i < allEntregas.length; i++) {
          await supabase
            .from("ordenes_compra_entregas")
            .update({ numero_entrega: i + 1 })
            .eq("id", allEntregas[i].id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entregas-orden"] });
      queryClient.invalidateQueries({ queryKey: ["ordenes_compra"] });
      queryClient.invalidateQueries({ queryKey: ["entregas_programadas_calendario"] });
      toast({
        title: "Entrega dividida",
        description: `Se dividió en ${partes.length} entregas correctamente`,
      });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error al dividir",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setEntregaSeleccionadaId(null);
    setPartes([{ cantidad: 0, fecha: null }, { cantidad: 0, fecha: null }]);
    setParteEditandoFecha(null);
    setMesActual(new Date());
  };

  const handleClose = (open: boolean) => {
    if (!open) resetForm();
    onOpenChange(open);
  };

  const entregasPendientes = entregasExistentes.filter(
    e => e.status !== "recibida" && e.status !== "rechazada"
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="h-5 w-5" />
            Dividir Entrega - {orden?.folio}
          </DialogTitle>
          <DialogDescription>
            Divide una entrega existente en múltiples entregas con diferentes fechas
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Step 1: Select delivery to split */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">1. Selecciona la entrega a dividir</Label>
              
              {loadingEntregas ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando entregas...
                </div>
              ) : entregasPendientes.length === 0 ? (
                <div className="text-muted-foreground text-sm p-4 bg-muted/50 rounded-lg">
                  No hay entregas pendientes para dividir.
                </div>
              ) : (
                <RadioGroup 
                  value={entregaSeleccionadaId || ""} 
                  onValueChange={handleSelectEntrega}
                  className="space-y-2"
                >
                  {entregasPendientes.map((entrega) => (
                    <div
                      key={entrega.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                        entregaSeleccionadaId === entrega.id 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:bg-muted/50"
                      )}
                    >
                      <RadioGroupItem value={entrega.id} id={entrega.id} />
                      <label htmlFor={entrega.id} className="flex-1 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            Tráiler #{entrega.numero_entrega}
                          </span>
                          <Badge variant="secondary">
                            {entrega.cantidad_bultos.toLocaleString()} bultos
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {entrega.fecha_programada 
                            ? format(new Date(entrega.fecha_programada + 'T12:00:00'), "EEEE dd/MM/yyyy", { locale: es })
                            : "Sin fecha programada"
                          }
                        </div>
                      </label>
                    </div>
                  ))}
                </RadioGroup>
              )}
            </div>

            {/* Step 2: Configure split */}
            {entregaSeleccionada && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">2. Configura la división</Label>
                  <span className="text-sm text-muted-foreground">
                    Total original: <strong>{entregaSeleccionada.cantidad_bultos.toLocaleString()}</strong> bultos
                  </span>
                </div>

                <div className="space-y-4">
                  {partes.map((parte, index) => (
                    <div 
                      key={index} 
                      className="p-4 border rounded-lg space-y-3 bg-muted/30"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">Parte {index + 1}</span>
                        {partes.length > 2 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleQuitarParte(index)}
                            className="h-7 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs">Cantidad (bultos)</Label>
                          <Input
                            type="number"
                            min={1}
                            value={parte.cantidad || ""}
                            onChange={(e) => handleCantidadChange(index, parseInt(e.target.value) || 0)}
                            placeholder="Cantidad"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs">Fecha de entrega</Label>
                          <Button
                            variant="outline"
                            className="w-full justify-start"
                            onClick={() => setParteEditandoFecha(parteEditandoFecha === index ? null : index)}
                          >
                            {parte.fecha 
                              ? format(new Date(parte.fecha + 'T12:00:00'), "dd/MM/yyyy")
                              : "Seleccionar fecha"
                            }
                          </Button>
                        </div>
                      </div>

                      {/* Calendar for this part */}
                      {parteEditandoFecha === index && (
                        <div className="mt-3 p-3 border rounded-lg bg-background">
                          {/* Calendar header */}
                          <div className="flex items-center justify-between mb-3">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setMesActual(subMonths(mesActual, 1))}
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="font-medium capitalize text-sm">
                              {format(mesActual, "MMMM yyyy", { locale: es })}
                            </span>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setMesActual(addMonths(mesActual, 1))}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>

                          {/* Calendar grid */}
                          <div className="grid grid-cols-7 gap-1">
                            {diasSemana.map((dia, i) => (
                              <div key={i} className="text-center py-1 text-xs font-medium text-muted-foreground">
                                {dia}
                              </div>
                            ))}

                            {diasDelMes.map((dia, i) => {
                              const entregas = getEntregasDelDia(dia);
                              const esHoy = isSameDay(dia, new Date());
                              const esDelMes = isSameMonth(dia, mesActual);
                              const tieneEntregas = entregas.length > 0;
                              const esSeleccionado = parte.fecha && isSameDay(new Date(parte.fecha + 'T12:00:00'), dia);

                              return (
                                <div
                                  key={i}
                                  onClick={() => handleFechaChange(index, dia)}
                                  className={cn(
                                    "min-h-[44px] p-1 text-center rounded transition-colors cursor-pointer relative",
                                    esDelMes ? "bg-background hover:bg-accent" : "bg-muted/30 text-muted-foreground",
                                    esHoy && "ring-1 ring-primary",
                                    esSeleccionado && "bg-primary text-primary-foreground hover:bg-primary"
                                  )}
                                >
                                  <span className="text-xs">{format(dia, "d")}</span>
                                  
                                  {/* Delivery indicators */}
                                  {tieneEntregas && !esSeleccionado && (
                                    <div className="flex justify-center gap-0.5 mt-0.5">
                                      {entregas.slice(0, 3).map((entrega, idx) => (
                                        <span
                                          key={idx}
                                          className={cn(
                                            "w-1.5 h-1.5 rounded-full",
                                            tieneAnticipoPagado(entrega) ? "bg-green-500" : "bg-rose-500"
                                          )}
                                        />
                                      ))}
                                      {entregas.length > 3 && (
                                        <span className="text-[8px] text-muted-foreground">+</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Legend */}
                          <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-green-500" />
                              <span>Anticipado</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-rose-500" />
                              <span>Contra entrega</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {partes.length < 5 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAgregarParte}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar otra parte
                    </Button>
                  )}
                </div>

                {/* Validation */}
                <div className={cn(
                  "p-3 rounded-lg text-sm",
                  sumaPartes === entregaSeleccionada.cantidad_bultos 
                    ? "bg-green-50 text-green-700"
                    : "bg-amber-50 text-amber-700"
                )}>
                  <div className="flex items-center justify-between">
                    <span>Suma de partes:</span>
                    <span className="font-semibold">{sumaPartes.toLocaleString()} bultos</span>
                  </div>
                  {sumaPartes !== entregaSeleccionada.cantidad_bultos && (
                    <div className="text-xs mt-1">
                      {sumaPartes < entregaSeleccionada.cantidad_bultos 
                        ? `Faltan ${(entregaSeleccionada.cantidad_bultos - sumaPartes).toLocaleString()} bultos`
                        : `Sobran ${(sumaPartes - entregaSeleccionada.cantidad_bultos).toLocaleString()} bultos`
                      }
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={() => dividirMutation.mutate()}
            disabled={!esValido || dividirMutation.isPending}
          >
            {dividirMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Dividiendo...
              </>
            ) : (
              <>
                <Scissors className="h-4 w-4 mr-2" />
                Dividir y Guardar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DividirEntregaDialog;
