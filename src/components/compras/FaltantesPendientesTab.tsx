import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format, addDays, isSunday, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { 
  AlertTriangle, 
  Calendar as CalendarIcon, 
  Send, 
  X, 
  Package,
  Loader2,
  Clock,
  CheckCircle2
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { registrarCorreoEnviado } from "@/components/compras/HistorialCorreosOC";
import type { Json } from "@/integrations/supabase/types";

interface ProductoFaltante {
  producto_id: string | null;
  nombre: string;
  cantidad_faltante: number;
}

interface EntregaFaltante {
  id: string;
  orden_compra_id: string;
  numero_entrega: number;
  fecha_programada: string | null;
  status: string;
  notas: string | null;
  productos_faltantes: Json | null;
  ordenes_compra: {
    id: string;
    folio: string;
    proveedor_id: string | null;
    proveedor_nombre_manual: string | null;
    proveedores: {
      id: string;
      nombre: string;
      email: string | null;
    } | null;
  };
}

// Helper to parse productos_faltantes from Json
const parseProductosFaltantes = (json: Json | null): ProductoFaltante[] => {
  if (!json || !Array.isArray(json)) return [];
  return json as unknown as ProductoFaltante[];
};

// Calcula el siguiente día hábil (saltando domingos)
const getNextBusinessDay = (date: Date): Date => {
  const next = addDays(date, 1);
  if (isSunday(next)) {
    return addDays(next, 1);
  }
  return next;
};

export const FaltantesPendientesTab = () => {
  const queryClient = useQueryClient();
  const [selectedEntrega, setSelectedEntrega] = useState<EntregaFaltante | null>(null);
  const [showModificarFechaDialog, setShowModificarFechaDialog] = useState(false);
  const [showCancelarDialog, setShowCancelarDialog] = useState(false);
  const [nuevaFecha, setNuevaFecha] = useState<Date | undefined>();
  const [notaCancelacion, setNotaCancelacion] = useState("");
  const [saving, setSaving] = useState(false);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);

  // Cargar entregas con origen_faltante que estén programadas
  const { data: entregasFaltantes, isLoading } = useQuery({
    queryKey: ["entregas-faltantes-pendientes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ordenes_compra_entregas")
        .select(`
          id,
          orden_compra_id,
          numero_entrega,
          fecha_programada,
          status,
          notas,
          productos_faltantes,
          ordenes_compra (
            id,
            folio,
            proveedor_id,
            proveedor_nombre_manual,
            proveedores (
              id,
              nombre,
              email
            )
          )
        `)
        .eq("origen_faltante", true)
        .in("status", ["programada", "pendiente"])
        .order("fecha_programada", { ascending: true });

      if (error) throw error;
      return (data || []) as EntregaFaltante[];
    },
    refetchInterval: 60000,
  });

  const handleModificarFecha = async () => {
    if (!selectedEntrega || !nuevaFecha) return;

    setSaving(true);
    try {
      const fechaAnterior = selectedEntrega.fecha_programada;
      const nuevaFechaStr = format(nuevaFecha, "yyyy-MM-dd");

      // Actualizar la fecha en la BD
      const { error } = await supabase
        .from("ordenes_compra_entregas")
        .update({ 
          fecha_programada: nuevaFechaStr,
          notas: `${selectedEntrega.notas || ''}\n[MODIFICADO] Fecha cambiada de ${fechaAnterior} a ${nuevaFechaStr}`
        })
        .eq("id", selectedEntrega.id);

      if (error) throw error;

      // Notificar al proveedor
      const proveedor = selectedEntrega.ordenes_compra.proveedores;
      if (proveedor?.email) {
        await supabase.functions.invoke("notificar-faltante-oc", {
          body: {
            tipo: "fecha_modificada",
            entrega_id: selectedEntrega.id,
            orden_folio: selectedEntrega.ordenes_compra.folio,
            proveedor_email: proveedor.email,
            proveedor_nombre: proveedor.nombre,
            fecha_anterior: fechaAnterior,
            fecha_nueva: nuevaFechaStr,
            productos_faltantes: selectedEntrega.productos_faltantes
          }
        });

        await registrarCorreoEnviado({
          tipo: "notificacion_faltante",
          referencia_id: selectedEntrega.orden_compra_id,
          destinatario: proveedor.email,
          asunto: `Cambio de fecha entrega faltante - ${selectedEntrega.ordenes_compra.folio}`,
          contenido_preview: `Fecha cambiada de ${fechaAnterior} a ${nuevaFechaStr}`
        });
      }

      toast({
        title: "Fecha modificada",
        description: proveedor?.email 
          ? "Se notificó al proveedor del cambio"
          : "Fecha actualizada (proveedor sin email configurado)"
      });

      queryClient.invalidateQueries({ queryKey: ["entregas-faltantes-pendientes"] });
      queryClient.invalidateQueries({ queryKey: ["entregas_programadas_calendario"] });
      setShowModificarFechaDialog(false);
      setSelectedEntrega(null);
      setNuevaFecha(undefined);
    } catch (error) {
      console.error("Error modificando fecha:", error);
      toast({
        title: "Error",
        description: "No se pudo modificar la fecha",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelarFaltante = async () => {
    if (!selectedEntrega) return;

    setSaving(true);
    try {
      // Marcar la entrega como cancelada
      const { error } = await supabase
        .from("ordenes_compra_entregas")
        .update({ 
          status: "cancelada",
          notas: `${selectedEntrega.notas || ''}\n[CANCELADO] ${notaCancelacion || 'Producto ya no requerido'}`
        })
        .eq("id", selectedEntrega.id);

      if (error) throw error;

      // Verificar si hay más entregas pendientes de esta OC
      const { data: entregasPendientes } = await supabase
        .from("ordenes_compra_entregas")
        .select("id")
        .eq("orden_compra_id", selectedEntrega.orden_compra_id)
        .in("status", ["programada", "pendiente"]);

      // Si no hay más entregas pendientes, marcar la OC como completada
      if (!entregasPendientes || entregasPendientes.length === 0) {
        await supabase
          .from("ordenes_compra")
          .update({ status: "completada" })
          .eq("id", selectedEntrega.orden_compra_id);
      }

      // Notificar al proveedor
      const proveedor = selectedEntrega.ordenes_compra.proveedores;
      if (proveedor?.email) {
        await supabase.functions.invoke("notificar-faltante-oc", {
          body: {
            tipo: "faltante_cancelado",
            entrega_id: selectedEntrega.id,
            orden_folio: selectedEntrega.ordenes_compra.folio,
            proveedor_email: proveedor.email,
            proveedor_nombre: proveedor.nombre,
            productos_faltantes: selectedEntrega.productos_faltantes,
            motivo_cancelacion: notaCancelacion || "Producto ya no requerido"
          }
        });
      }

      toast({
        title: "Faltante cancelado",
        description: "Ya no se espera esta entrega"
      });

      queryClient.invalidateQueries({ queryKey: ["entregas-faltantes-pendientes"] });
      queryClient.invalidateQueries({ queryKey: ["entregas_programadas_calendario"] });
      setShowCancelarDialog(false);
      setSelectedEntrega(null);
      setNotaCancelacion("");
    } catch (error) {
      console.error("Error cancelando faltante:", error);
      toast({
        title: "Error",
        description: "No se pudo cancelar el faltante",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEnviarRecordatorio = async (entrega: EntregaFaltante) => {
    const proveedor = entrega.ordenes_compra.proveedores;
    if (!proveedor?.email) {
      toast({
        title: "Sin email",
        description: "Este proveedor no tiene email configurado",
        variant: "destructive"
      });
      return;
    }

    setSendingReminder(entrega.id);
    try {
      await supabase.functions.invoke("notificar-faltante-oc", {
        body: {
          tipo: "recordatorio",
          entrega_id: entrega.id,
          orden_folio: entrega.ordenes_compra.folio,
          proveedor_email: proveedor.email,
          proveedor_nombre: proveedor.nombre,
          fecha_programada: entrega.fecha_programada,
          productos_faltantes: entrega.productos_faltantes
        }
      });

      await registrarCorreoEnviado({
        tipo: "recordatorio_faltante",
        referencia_id: entrega.orden_compra_id,
        destinatario: proveedor.email,
        asunto: `Recordatorio entrega pendiente - ${entrega.ordenes_compra.folio}`,
        contenido_preview: `Recordatorio de productos faltantes para ${entrega.fecha_programada}`
      });

      toast({
        title: "Recordatorio enviado",
        description: `Se notificó a ${proveedor.nombre}`
      });
    } catch (error) {
      console.error("Error enviando recordatorio:", error);
      toast({
        title: "Error",
        description: "No se pudo enviar el recordatorio",
        variant: "destructive"
      });
    } finally {
      setSendingReminder(null);
    }
  };

  const getFechaStatus = (fecha: string | null) => {
    if (!fecha) return { label: "Sin fecha", variant: "secondary" as const };
    
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaEntrega = parseISO(fecha);
    fechaEntrega.setHours(0, 0, 0, 0);
    
    if (fechaEntrega < hoy) {
      return { label: "Vencida", variant: "destructive" as const };
    } else if (fechaEntrega.getTime() === hoy.getTime()) {
      return { label: "Hoy", variant: "default" as const };
    } else {
      return { label: format(fechaEntrega, "EEE dd/MM", { locale: es }), variant: "outline" as const };
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Faltantes Pendientes de Entrega
            {entregasFaltantes && entregasFaltantes.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {entregasFaltantes.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!entregasFaltantes || entregasFaltantes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
              <p>No hay productos faltantes pendientes de entrega</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Orden</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Productos Faltantes</TableHead>
                  <TableHead>Fecha Programada</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entregasFaltantes.map((entrega) => {
                  const fechaStatus = getFechaStatus(entrega.fecha_programada);
                  const proveedor = entrega.ordenes_compra.proveedores;
                  const nombreProveedor = proveedor?.nombre || 
                    entrega.ordenes_compra.proveedor_nombre_manual || 
                    "Sin proveedor";

                  return (
                    <TableRow key={entrega.id}>
                      <TableCell className="font-medium">
                        {entrega.ordenes_compra.folio}
                        <span className="text-muted-foreground text-xs ml-1">
                          #{entrega.numero_entrega}
                        </span>
                      </TableCell>
                      <TableCell>{nombreProveedor}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {parseProductosFaltantes(entrega.productos_faltantes).length > 0 ? (
                            parseProductosFaltantes(entrega.productos_faltantes).map((pf, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                <Package className="h-3 w-3 mr-1" />
                                {pf.cantidad_faltante}x {pf.nombre}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              Ver notas
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={fechaStatus.variant}>
                          <Clock className="h-3 w-3 mr-1" />
                          {fechaStatus.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm">
                                <CalendarIcon className="h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                              <Calendar
                                mode="single"
                                selected={entrega.fecha_programada ? parseISO(entrega.fecha_programada) : undefined}
                                onSelect={(date) => {
                                  if (date) {
                                    setSelectedEntrega(entrega);
                                    setNuevaFecha(date);
                                    setShowModificarFechaDialog(true);
                                  }
                                }}
                                disabled={(date) => date < new Date() || isSunday(date)}
                                locale={es}
                              />
                            </PopoverContent>
                          </Popover>
                          
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEnviarRecordatorio(entrega)}
                            disabled={sendingReminder === entrega.id || !proveedor?.email}
                          >
                            {sendingReminder === entrega.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </Button>
                          
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              setSelectedEntrega(entrega);
                              setShowCancelarDialog(true);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Confirmar cambio de fecha */}
      <Dialog open={showModificarFechaDialog} onOpenChange={setShowModificarFechaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar cambio de fecha</DialogTitle>
            <DialogDescription>
              ¿Cambiar la fecha de entrega del faltante de{" "}
              <strong>{selectedEntrega?.ordenes_compra.folio}</strong>?
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-2">
            <p className="text-sm text-muted-foreground">
              Fecha anterior: {selectedEntrega?.fecha_programada 
                ? format(parseISO(selectedEntrega.fecha_programada), "EEEE d 'de' MMMM", { locale: es })
                : "Sin fecha"}
            </p>
            <p className="text-sm font-medium">
              Nueva fecha: {nuevaFecha 
                ? format(nuevaFecha, "EEEE d 'de' MMMM", { locale: es })
                : "—"}
            </p>
            {selectedEntrega?.ordenes_compra.proveedores?.email && (
              <p className="text-xs text-muted-foreground mt-2">
                Se notificará al proveedor por email
              </p>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowModificarFechaDialog(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={handleModificarFecha} disabled={saving || !nuevaFecha}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar cambio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Cancelar faltante */}
      <Dialog open={showCancelarDialog} onOpenChange={setShowCancelarDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar producto faltante</DialogTitle>
            <DialogDescription>
              ¿Ya no se requiere el producto faltante de{" "}
              <strong>{selectedEntrega?.ordenes_compra.folio}</strong>?
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="bg-destructive/10 p-3 rounded-lg text-sm">
              <p className="font-medium text-destructive mb-2">Productos que se cancelarán:</p>
              {parseProductosFaltantes(selectedEntrega?.productos_faltantes || null).map((pf, idx) => (
                <p key={idx} className="text-destructive">
                  • {pf.cantidad_faltante}x {pf.nombre}
                </p>
              ))}
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Motivo de cancelación (opcional)</label>
              <Textarea
                value={notaCancelacion}
                onChange={(e) => setNotaCancelacion(e.target.value)}
                placeholder="Ej: El proveedor no puede entregar, se comprará a otro proveedor..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowCancelarDialog(false);
                setNotaCancelacion("");
              }}
              disabled={saving}
            >
              Volver
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleCancelarFaltante} 
              disabled={saving}
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Cancelar faltante
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FaltantesPendientesTab;
