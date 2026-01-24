import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Json } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { 
  Bell, 
  Save, 
  Loader2, 
  Package,
  Calendar,
  AlertTriangle,
  Mail
} from "lucide-react";

interface AlertasConfig {
  stock_bajo_umbral: number;
  stock_bajo_notificar: boolean;
  caducidad_dias_alerta: number;
  caducidad_notificar: boolean;
  fumigacion_dias_alerta: number;
  fumigacion_notificar: boolean;
  email_alertas_inventario: string;
}

const defaultConfig: AlertasConfig = {
  stock_bajo_umbral: 100,
  stock_bajo_notificar: true,
  caducidad_dias_alerta: 30,
  caducidad_notificar: true,
  fumigacion_dias_alerta: 7,
  fumigacion_notificar: true,
  email_alertas_inventario: "",
};

export function ConfigAlertasTab() {
  const [config, setConfig] = useState<AlertasConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("configuracion_empresa")
        .select("valor")
        .eq("clave", "alertas_inventario")
        .maybeSingle();

      if (error) throw error;

      if (data?.valor) {
        setConfig({
          ...defaultConfig,
          ...(data.valor as unknown as AlertasConfig),
        });
      }
    } catch (error) {
      console.error("Error loading config:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("configuracion_empresa")
        .select("id")
        .eq("clave", "alertas_inventario")
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("configuracion_empresa")
          .update({
            valor: config as unknown as Json,
          })
          .eq("clave", "alertas_inventario");
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("configuracion_empresa")
          .insert({
            clave: "alertas_inventario",
            valor: config as unknown as Json,
          });
        if (error) throw error;
      }

      toast({
        title: "Guardado",
        description: "Configuración de alertas actualizada",
      });
    } catch (error) {
      console.error("Error saving:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = <K extends keyof AlertasConfig>(
    key: K,
    value: AlertasConfig[K]
  ) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Alertas y Notificaciones
          </h2>
          <p className="text-sm text-muted-foreground">
            Configura umbrales y notificaciones del sistema
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Guardar Cambios
        </Button>
      </div>

      <Separator />

      {/* Stock Bajo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            Stock Bajo
          </CardTitle>
          <CardDescription>
            Alerta cuando el inventario está por debajo del umbral
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="stock-notify">Activar alertas de stock bajo</Label>
            <Switch
              id="stock-notify"
              checked={config.stock_bajo_notificar}
              onCheckedChange={(v) => updateConfig("stock_bajo_notificar", v)}
            />
          </div>
          <div className="space-y-2">
            <Label>Umbral de stock bajo (unidades)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="1"
                value={config.stock_bajo_umbral}
                onChange={(e) =>
                  updateConfig("stock_bajo_umbral", parseInt(e.target.value) || 100)
                }
                className="w-32"
                disabled={!config.stock_bajo_notificar}
              />
              <span className="text-sm text-muted-foreground">unidades</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Se mostrará alerta cuando el stock sea menor a este valor
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Caducidad */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Caducidad de Productos
          </CardTitle>
          <CardDescription>
            Alerta cuando productos están próximos a vencer
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="caducidad-notify">Activar alertas de caducidad</Label>
            <Switch
              id="caducidad-notify"
              checked={config.caducidad_notificar}
              onCheckedChange={(v) => updateConfig("caducidad_notificar", v)}
            />
          </div>
          <div className="space-y-2">
            <Label>Días de anticipación</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="1"
                max="90"
                value={config.caducidad_dias_alerta}
                onChange={(e) =>
                  updateConfig("caducidad_dias_alerta", parseInt(e.target.value) || 30)
                }
                className="w-32"
                disabled={!config.caducidad_notificar}
              />
              <span className="text-sm text-muted-foreground">
                días antes de vencimiento
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fumigación */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Fumigación de Lotes
          </CardTitle>
          <CardDescription>
            Alerta cuando lotes requieren fumigación
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="fumigacion-notify">Activar alertas de fumigación</Label>
            <Switch
              id="fumigacion-notify"
              checked={config.fumigacion_notificar}
              onCheckedChange={(v) => updateConfig("fumigacion_notificar", v)}
            />
          </div>
          <div className="space-y-2">
            <Label>Días de anticipación</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="1"
                max="30"
                value={config.fumigacion_dias_alerta}
                onChange={(e) =>
                  updateConfig("fumigacion_dias_alerta", parseInt(e.target.value) || 7)
                }
                className="w-32"
                disabled={!config.fumigacion_notificar}
              />
              <span className="text-sm text-muted-foreground">
                días antes de vencer fumigación
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email de alertas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Notificaciones por Email
          </CardTitle>
          <CardDescription>
            Correo donde se enviarán alertas críticas de inventario
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Email para alertas</Label>
            <Input
              type="email"
              value={config.email_alertas_inventario}
              onChange={(e) =>
                updateConfig("email_alertas_inventario", e.target.value)
              }
              placeholder="alertas@empresa.com"
              className="max-w-md"
            />
            <p className="text-xs text-muted-foreground">
              Deja vacío para desactivar notificaciones por email
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
