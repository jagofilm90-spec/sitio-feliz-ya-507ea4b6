import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Settings, Mail, Bell } from "lucide-react";

interface ConfiguracionFlotillaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ConfiguracionFlotillaDialog = ({ open, onOpenChange }: ConfiguracionFlotillaDialogProps) => {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      loadConfig();
    }
  }, [open]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("configuracion_flotilla")
        .select("clave, valor");

      if (error) throw error;

      const configMap: Record<string, string> = {};
      (data || []).forEach(item => {
        configMap[item.clave] = item.valor;
      });
      setConfig(configMap);
    } catch (error) {
      console.error("Error cargando configuración:", error);
      toast.error("Error al cargar configuración");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const [clave, valor] of Object.entries(config)) {
        const { error } = await supabase
          .from("configuracion_flotilla")
          .update({ valor })
          .eq("clave", clave);

        if (error) throw error;
      }

      toast.success("Configuración guardada correctamente");
      onOpenChange(false);
    } catch (error) {
      console.error("Error guardando configuración:", error);
      toast.error("Error al guardar configuración");
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (clave: string, valor: string) => {
    setConfig(prev => ({ ...prev, [clave]: valor }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuración de Flotilla
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">
            Cargando configuración...
          </div>
        ) : (
          <div className="space-y-6">
            {/* Email del mecánico */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Correo del Mecánico
              </Label>
              <Input
                type="email"
                value={config.email_mecanico || ''}
                onChange={(e) => updateConfig('email_mecanico', e.target.value)}
                placeholder="mecanico@taller.com"
              />
              <p className="text-xs text-muted-foreground">
                Los reportes de checkups con fallas se enviarán a este correo
              </p>
            </div>

            {/* Días de anticipación */}
            <div className="space-y-4 p-4 rounded-lg border bg-muted/50">
              <Label className="flex items-center gap-2 text-base font-semibold">
                <Bell className="h-4 w-4" />
                Días de anticipación para alertas
              </Label>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Licencias</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="1"
                      max="90"
                      value={config.dias_alerta_licencia || '30'}
                      onChange={(e) => updateConfig('dias_alerta_licencia', e.target.value)}
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">días</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Verificación</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="1"
                      max="90"
                      value={config.dias_alerta_verificacion || '15'}
                      onChange={(e) => updateConfig('dias_alerta_verificacion', e.target.value)}
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">días</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Documentos</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="1"
                      max="90"
                      value={config.dias_alerta_documentos || '30'}
                      onChange={(e) => updateConfig('dias_alerta_documentos', e.target.value)}
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">días</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
