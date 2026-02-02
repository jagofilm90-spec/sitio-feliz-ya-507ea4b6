import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Settings, Mail, Bell, MapPin, Wifi, ChevronRight, Warehouse } from "lucide-react";
import { ConfiguracionBodegaSheet } from "./ConfiguracionBodegaSheet";

interface Bodega {
  id: string;
  nombre: string;
  wifi_ssids: string[] | null;
  latitud: number | null;
  longitud: number | null;
  radio_deteccion_metros: number | null;
  es_externa: boolean;
}

interface ConfiguracionFlotillaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ConfiguracionFlotillaDialog = ({ open, onOpenChange }: ConfiguracionFlotillaDialogProps) => {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [bodegas, setBodegas] = useState<Bodega[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedBodega, setSelectedBodega] = useState<Bodega | null>(null);
  const [bodegaSheetOpen, setBodegaSheetOpen] = useState(false);

  useEffect(() => {
    if (open) {
      loadConfig();
      loadBodegas();
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

  const loadBodegas = async () => {
    try {
      const { data, error } = await supabase
        .from("bodegas")
        .select("id, nombre, wifi_ssids, latitud, longitud, radio_deteccion_metros, es_externa")
        .eq("activo", true)
        .order("nombre");

      if (error) throw error;
      setBodegas(data || []);
    } catch (error) {
      console.error("Error cargando bodegas:", error);
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

  const handleEditBodega = (bodega: Bodega) => {
    setSelectedBodega(bodega);
    setBodegaSheetOpen(true);
  };

  const getBodegaDetectionStatus = (bodega: Bodega) => {
    const hasWifi = bodega.wifi_ssids && bodega.wifi_ssids.length > 0;
    const hasGPS = bodega.latitud !== null && bodega.longitud !== null;

    if (bodega.es_externa) {
      return { label: "Manual", color: "secondary" as const };
    }
    if (hasWifi && hasGPS) {
      return { label: "WiFi + GPS", color: "default" as const };
    }
    if (hasWifi) {
      return { label: "Solo WiFi", color: "default" as const };
    }
    if (hasGPS) {
      return { label: "Solo GPS", color: "outline" as const };
    }
    return { label: "Sin configurar", color: "destructive" as const };
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden">
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

              {/* Detección de Bodegas */}
              <div className="space-y-3 p-4 rounded-lg border bg-muted/50">
                <Label className="flex items-center gap-2 text-base font-semibold">
                  <Warehouse className="h-4 w-4" />
                  Detección Automática de Bodegas
                </Label>
                <p className="text-sm text-muted-foreground">
                  Configura las redes WiFi y coordenadas GPS para detectar automáticamente la bodega
                </p>

                <div className="space-y-2">
                  {bodegas.map((bodega) => {
                    const status = getBodegaDetectionStatus(bodega);
                    return (
                      <button
                        key={bodega.id}
                        type="button"
                        onClick={() => handleEditBodega(bodega)}
                        disabled={bodega.es_externa}
                        className={`w-full flex items-center justify-between p-3 rounded-lg border bg-background hover:bg-accent/50 transition-colors text-left ${
                          bodega.es_externa ? 'opacity-60 cursor-not-allowed' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            {bodega.wifi_ssids && bodega.wifi_ssids.length > 0 && (
                              <Wifi className="h-4 w-4 text-primary" />
                            )}
                            {bodega.latitud !== null && bodega.longitud !== null && (
                              <MapPin className="h-4 w-4 text-primary" />
                            )}
                            {(!bodega.wifi_ssids || bodega.wifi_ssids.length === 0) && 
                             bodega.latitud === null && !bodega.es_externa && (
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{bodega.nombre}</p>
                            {bodega.wifi_ssids && bodega.wifi_ssids.length > 0 && (
                              <p className="text-xs text-muted-foreground">
                                WiFi: {bodega.wifi_ssids.join(", ")}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={status.color}>{status.label}</Badge>
                          {!bodega.es_externa && (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </button>
                    );
                  })}
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

      <ConfiguracionBodegaSheet
        bodega={selectedBodega}
        open={bodegaSheetOpen}
        onOpenChange={setBodegaSheetOpen}
        onSaved={loadBodegas}
      />
    </>
  );
};
