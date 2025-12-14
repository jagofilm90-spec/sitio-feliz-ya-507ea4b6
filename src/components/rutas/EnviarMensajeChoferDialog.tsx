import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useRouteNotifications } from "@/hooks/useRouteNotifications";
import { supabase } from "@/integrations/supabase/client";
import { Send, AlertTriangle } from "lucide-react";

interface EnviarMensajeChoferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  choferId: string;
  choferNombre: string;
  rutaId: string;
  rutaFolio: string;
}

const EnviarMensajeChoferDialog = ({
  open,
  onOpenChange,
  choferId,
  choferNombre,
  rutaId,
  rutaFolio,
}: EnviarMensajeChoferDialogProps) => {
  const [mensaje, setMensaje] = useState("");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();
  const { notifyUrgentMessage } = useRouteNotifications();

  const handleSend = async () => {
    if (!mensaje.trim()) {
      toast({
        title: "Error",
        description: "Escribe un mensaje",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      // Obtener nombre del remitente
      const { data: { user } } = await supabase.auth.getUser();
      let remitente = "Oficina";
      
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();
        
        if (profile?.full_name) {
          remitente = profile.full_name;
        }
      }

      await notifyUrgentMessage({
        choferId,
        rutaFolio,
        rutaId,
        mensaje: mensaje.trim(),
        remitente,
      });

      toast({
        title: "Mensaje enviado",
        description: `Mensaje enviado a ${choferNombre}`,
      });

      setMensaje("");
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo enviar el mensaje",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Mensaje Urgente
          </DialogTitle>
          <DialogDescription>
            Enviar mensaje a <strong>{choferNombre}</strong> en ruta {rutaFolio}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mensaje">Mensaje</Label>
            <Textarea
              id="mensaje"
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              placeholder="Escribe tu mensaje urgente..."
              rows={4}
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground text-right">
              {mensaje.length}/200 caracteres
            </p>
          </div>

          <div className="p-3 bg-muted rounded-lg text-sm">
            <p className="text-muted-foreground">
              Este mensaje se enviará como notificación push al dispositivo del chofer.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending || !mensaje.trim()}
            variant="destructive"
          >
            <Send className="h-4 w-4 mr-2" />
            {sending ? "Enviando..." : "Enviar Mensaje"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EnviarMensajeChoferDialog;
