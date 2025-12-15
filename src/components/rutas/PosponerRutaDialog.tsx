import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, CalendarPlus, AlertTriangle, Bell, Loader2, Truck, User } from "lucide-react";
import { format, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Ruta {
  id: string;
  folio: string;
  fecha_ruta: string;
  chofer_id: string;
  ayudantes_ids?: string[] | null;
  vehiculo_id: string | null;
  notas: string | null;
  chofer_nombre?: string;
  vehiculo?: { nombre: string };
}

interface PosponerRutaDialogProps {
  ruta: Ruta | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const PosponerRutaDialog = ({
  ruta,
  open,
  onOpenChange,
  onSuccess,
}: PosponerRutaDialogProps) => {
  const [nuevaFecha, setNuevaFecha] = useState<Date>(addDays(new Date(), 1));
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handlePosponer = async () => {
    if (!ruta) return;

    setSaving(true);
    try {
      const nuevaFechaStr = format(nuevaFecha, "yyyy-MM-dd");
      const notasActualizadas = ruta.notas 
        ? `${ruta.notas}\n[Pospuesta de ${ruta.fecha_ruta}: ${motivo || "Sin motivo especificado"}]`
        : `[Pospuesta de ${ruta.fecha_ruta}: ${motivo || "Sin motivo especificado"}]`;

      // Update route date
      const { error } = await supabase
        .from("rutas")
        .update({
          fecha_ruta: nuevaFechaStr,
          notas: notasActualizadas,
        })
        .eq("id", ruta.id);

      if (error) throw error;

      // Notify driver about the change
      if (ruta.chofer_id) {
        try {
          await supabase.functions.invoke("send-push-notification", {
            body: {
              user_ids: [ruta.chofer_id],
              title: "Ruta pospuesta",
              body: `La ruta ${ruta.folio} se movió a ${format(nuevaFecha, "EEEE d 'de' MMMM", { locale: es })}`,
              data: { type: "ruta", ruta_id: ruta.id }
            }
          });
        } catch (notifError) {
          console.error("Error sending notification:", notifError);
        }
      }

      // Also notify helpers
      if (ruta.ayudantes_ids && ruta.ayudantes_ids.length > 0) {
        try {
          await supabase.functions.invoke("send-push-notification", {
            body: {
              user_ids: ruta.ayudantes_ids,
              title: "Ruta pospuesta",
              body: `La ruta ${ruta.folio} donde eres ayudante se movió a ${format(nuevaFecha, "EEEE d 'de' MMMM", { locale: es })}`,
              data: { type: "ruta", ruta_id: ruta.id }
            }
          });
        } catch (notifError) {
          console.error("Error sending helper notification:", notifError);
        }
      }

      toast({ 
        title: "Ruta pospuesta", 
        description: `${ruta.folio} movida a ${format(nuevaFecha, "EEEE d 'de' MMMM", { locale: es })}` 
      });
      
      setMotivo("");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!ruta) return null;

  const fechaOriginal = new Date(ruta.fecha_ruta);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5" />
            Posponer Ruta {ruta.folio}
          </DialogTitle>
          <DialogDescription>
            Mover esta ruta a otro día
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current info */}
          <div className="p-3 bg-muted rounded-lg text-sm">
            <p className="text-muted-foreground mb-2">Información actual:</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-3 w-3" />
                <span>Fecha: {format(fechaOriginal, "EEEE d 'de' MMMM", { locale: es })}</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="h-3 w-3" />
                <span>{ruta.vehiculo?.nombre || "Sin vehículo"}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-3 w-3" />
                <span>{ruta.chofer_nombre || "Sin chofer"}</span>
              </div>
            </div>
          </div>

          {/* New date picker */}
          <div className="space-y-2">
            <Label>Nueva fecha</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !nuevaFecha && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(nuevaFecha, "EEEE d 'de' MMMM yyyy", { locale: es })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={nuevaFecha}
                  onSelect={(d) => d && setNuevaFecha(d)}
                  initialFocus
                  locale={es}
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Quick buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNuevaFecha(addDays(new Date(), 1))}
              className="flex-1"
            >
              Mañana
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNuevaFecha(addDays(new Date(), 2))}
              className="flex-1"
            >
              Pasado mañana
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNuevaFecha(addDays(new Date(), 7))}
              className="flex-1"
            >
              +1 semana
            </Button>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label>Motivo (opcional)</Label>
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: Cliente solicitó cambio de fecha, falta de personal..."
              rows={2}
            />
          </div>

          <Alert className="bg-blue-500/10 border-blue-500/20">
            <Bell className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm">
              Se notificará al chofer y ayudante sobre el cambio de fecha
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handlePosponer} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CalendarPlus className="h-4 w-4 mr-2" />
            )}
            {saving ? "Guardando..." : "Posponer Ruta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PosponerRutaDialog;
