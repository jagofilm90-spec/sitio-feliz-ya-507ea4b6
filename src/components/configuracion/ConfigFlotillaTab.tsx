import { useState, useEffect } from "react";
import { AlmasaLoading } from "@/components/brand/AlmasaLoading";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Warehouse,
  Save,
  Loader2,
  Wifi,
  MapPin,
  Settings2,
  Mail,
  Bell,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ConfiguracionBodegaSheet } from "@/components/almacen/ConfiguracionBodegaSheet";

interface Bodega {
  id: string;
  nombre: string;
  wifi_ssids: string[] | null;
  latitud: number | null;
  longitud: number | null;
  radio_deteccion_metros: number | null;
  es_externa: boolean;
}

export function ConfigFlotillaTab() {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [bodegas, setBodegas] = useState<Bodega[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingBodega, setEditingBodega] = useState<Bodega | null>(null);
  const [bodegaSheetOpen, setBodegaSheetOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadConfig(), loadBodegas()]);
    } finally {
      setLoading(false);
    }
  };

  const loadConfig = async () => {
    const { data, error } = await supabase
      .from("configuracion_flotilla")
      .select("clave, valor");

    if (error) {
      console.error("Error loading config:", error);
      return;
    }

    const configMap: Record<string, string> = {};
    (data || []).forEach((item) => {
      configMap[item.clave] = item.valor;
    });
    setConfig(configMap);
  };

  const loadBodegas = async () => {
    const { data, error } = await supabase
      .from("bodegas")
      .select("id, nombre, wifi_ssids, latitud, longitud, radio_deteccion_metros, es_externa")
      .eq("activo", true)
      .order("nombre");

    if (error) {
      console.error("Error loading bodegas:", error);
      return;
    }

    setBodegas(data || []);
  };

  const updateConfig = (key: string, value: string) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const [clave, valor] of Object.entries(config)) {
        const { error } = await supabase
          .from("configuracion_flotilla")
          .upsert({ clave, valor }, { onConflict: "clave" });

        if (error) throw error;
      }

      toast.success("Configuración guardada");
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Error al guardar configuración");
    } finally {
      setSaving(false);
    }
  };

  const getBodegaDetectionStatus = (bodega: Bodega) => {
    const hasWifi = bodega.wifi_ssids && bodega.wifi_ssids.length > 0;
    const hasGps = bodega.latitud && bodega.longitud;

    if (hasWifi && hasGps) {
      return { label: "WiFi + GPS", color: "bg-green-500/10 text-green-600" };
    }
    if (hasWifi) {
      return { label: "Solo WiFi", color: "bg-blue-500/10 text-blue-600" };
    }
    if (hasGps) {
      return { label: "Solo GPS", color: "bg-amber-500/10 text-amber-600" };
    }
    return { label: "Manual", color: "bg-muted text-muted-foreground" };
  };

  const handleEditBodega = (bodega: Bodega) => {
    setEditingBodega(bodega);
    setBodegaSheetOpen(true);
  };

  if (loading) {
    return (
      <AlmasaLoading size={48} />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Configuración"
        title="Flotilla"
        lead="Bodegas, vehículos y alertas de vencimientos"
        actions={
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-crimson-500 hover:bg-crimson-600 text-white"
          >
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Guardar cambios
          </Button>
        }
      />

      {/* Mechanic Email */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Correo del Mecánico
          </CardTitle>
          <CardDescription>
            Los reportes de checkups con fallas se enviarán a este correo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            type="email"
            value={config.email_mecanico || ""}
            onChange={(e) => updateConfig("email_mecanico", e.target.value)}
            placeholder="mecanico@taller.com"
            className="max-w-md"
          />
        </CardContent>
      </Card>

      {/* Alert Thresholds */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Días de Anticipación para Alertas
          </CardTitle>
          <CardDescription>
            Cuántos días antes de vencimiento se muestran las alertas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Licencias de Conducir</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  max="90"
                  value={config.dias_alerta_licencia || "30"}
                  onChange={(e) => updateConfig("dias_alerta_licencia", e.target.value)}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">días</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Verificación Vehicular</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  max="90"
                  value={config.dias_alerta_verificacion || "15"}
                  onChange={(e) => updateConfig("dias_alerta_verificacion", e.target.value)}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">días</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Documentos (Pólizas, etc.)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  max="90"
                  value={config.dias_alerta_documentos || "30"}
                  onChange={(e) => updateConfig("dias_alerta_documentos", e.target.value)}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">días</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warehouse Detection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Warehouse className="h-4 w-4" />
            Detección Automática de Bodegas
          </CardTitle>
          <CardDescription>
            Configura redes WiFi y coordenadas GPS para detectar automáticamente la ubicación
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {bodegas.map((bodega) => {
              const status = getBodegaDetectionStatus(bodega);
              return (
                <div
                  key={bodega.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Warehouse className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{bodega.nombre}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {bodega.wifi_ssids && bodega.wifi_ssids.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Wifi className="h-3 w-3" />
                            {bodega.wifi_ssids.length} redes
                          </span>
                        )}
                        {bodega.latitud && bodega.longitud && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            GPS configurado
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={status.color}>{status.label}</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditBodega(bodega)}
                    >
                      <Settings2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}

            {bodegas.length === 0 && (
              <div className="text-center py-8">
                <p className="font-serif italic text-[18px] text-ink-400">No hay bodegas activas.</p>
                <p className="text-[11px] text-ink-500 mt-2">Crea una bodega para configurar la detección automática.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bodega Sheet */}
      <ConfiguracionBodegaSheet
        bodega={editingBodega}
        open={bodegaSheetOpen}
        onOpenChange={setBodegaSheetOpen}
        onSaved={loadBodegas}
      />
    </div>
  );
}
