import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Settings, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { supportsHaptic, triggerHaptic } from "@/utils/hapticFeedback";

export function UserPreferencesPopover() {
  const { isHapticEnabled, toggleHaptic } = useUserPreferences();
  const deviceSupportsHaptic = supportsHaptic();

  // Solo mostrar en dispositivos con soporte de haptic
  if (!deviceSupportsHaptic) return null;

  const handleToggle = () => {
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
      <PopoverContent className="w-72" align="end">
        <div className="space-y-4">
          <h4 className="font-medium text-sm border-b pb-2">Preferencias</h4>
          
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
              onCheckedChange={handleToggle}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
