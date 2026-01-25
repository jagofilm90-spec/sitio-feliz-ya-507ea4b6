import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Settings, Smartphone, Bell, Type, Contrast } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useUserPreferences, FontSize } from "@/hooks/useUserPreferences";
import { supportsHaptic, triggerHaptic } from "@/utils/hapticFeedback";
import { Separator } from "@/components/ui/separator";

export function UserPreferencesPopover() {
  const { 
    isHapticEnabled, 
    toggleHaptic,
    isSoundEnabled,
    toggleSound,
    fontSize,
    setFontSize,
    isHighContrast,
    toggleHighContrast,
  } = useUserPreferences();
  
  const deviceSupportsHaptic = supportsHaptic();

  const handleHapticToggle = () => {
    toggleHaptic();
    // Si se está activando, dar feedback inmediato
    if (!isHapticEnabled) {
      setTimeout(() => triggerHaptic('medium'), 100);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Settings className="h-4 w-4" />
          <span className="sr-only">Preferencias</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <h4 className="font-medium text-sm border-b pb-2">Preferencias</h4>
          
          {/* Sección: Feedback */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Feedback
            </p>
            
            {/* Vibración táctil - solo si el dispositivo lo soporta */}
            {deviceSupportsHaptic && (
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-muted">
                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="space-y-0.5">
                    <Label htmlFor="haptic-toggle" className="text-sm font-medium cursor-pointer">
                      Vibración táctil
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Vibra al tocar botones
                    </p>
                  </div>
                </div>
                <Switch
                  id="haptic-toggle"
                  checked={isHapticEnabled}
                  onCheckedChange={handleHapticToggle}
                />
              </div>
            )}
            
            {/* Sonidos de notificación */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-muted">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="space-y-0.5">
                  <Label htmlFor="sound-toggle" className="text-sm font-medium cursor-pointer">
                    Sonidos
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Alertas de notificación
                  </p>
                </div>
              </div>
              <Switch
                id="sound-toggle"
                checked={isSoundEnabled}
                onCheckedChange={toggleSound}
              />
            </div>
          </div>
          
          <Separator />
          
          {/* Sección: Accesibilidad */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Accesibilidad
            </p>
            
            {/* Tamaño de fuente */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-muted">
                  <Type className="h-4 w-4 text-muted-foreground" />
                </div>
                <Label className="text-sm font-medium">Tamaño de fuente</Label>
              </div>
              <ToggleGroup 
                type="single" 
                value={fontSize} 
                onValueChange={(value) => value && setFontSize(value as FontSize)}
                className="justify-start"
              >
                <ToggleGroupItem value="normal" aria-label="Fuente normal" className="flex-1">
                  Normal
                </ToggleGroupItem>
                <ToggleGroupItem value="large" aria-label="Fuente grande" className="flex-1">
                  Grande
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            
            {/* Alto contraste */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-muted">
                  <Contrast className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="space-y-0.5">
                  <Label htmlFor="contrast-toggle" className="text-sm font-medium cursor-pointer">
                    Alto contraste
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Mejora visibilidad
                  </p>
                </div>
              </div>
              <Switch
                id="contrast-toggle"
                checked={isHighContrast}
                onCheckedChange={toggleHighContrast}
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
