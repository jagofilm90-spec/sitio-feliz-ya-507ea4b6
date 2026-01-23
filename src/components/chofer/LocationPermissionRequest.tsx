import { useState } from 'react';
import { MapPin, Shield, Navigation, Settings } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { requestLocationPermissions, openLocationSettings, isNativePlatform } from '@/services/backgroundGeolocation';

interface LocationPermissionRequestProps {
  open: boolean;
  onPermissionGranted: () => void;
  onDismiss: () => void;
}

export function LocationPermissionRequest({
  open,
  onPermissionGranted,
  onDismiss,
}: LocationPermissionRequestProps) {
  const [requesting, setRequesting] = useState(false);
  const [showDeniedHelp, setShowDeniedHelp] = useState(false);

  const handleRequestPermission = async () => {
    setRequesting(true);
    try {
      const granted = await requestLocationPermissions();
      if (granted) {
        onPermissionGranted();
      } else {
        setShowDeniedHelp(true);
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      setShowDeniedHelp(true);
    } finally {
      setRequesting(false);
    }
  };

  const handleOpenSettings = async () => {
    await openLocationSettings();
  };

  if (showDeniedHelp) {
    return (
      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
              <Settings className="h-6 w-6 text-destructive" />
            </div>
            <DialogTitle className="text-center">Permiso de ubicación requerido</DialogTitle>
            <DialogDescription className="text-center">
              Para compartir tu ubicación durante las rutas, necesitas habilitar el permiso de ubicación manualmente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
              <p className="font-medium">Pasos para habilitar:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Abre la configuración de tu dispositivo</li>
                <li>Busca "ALMASA ERP" en la lista de apps</li>
                <li>Selecciona "Permisos" o "Ubicación"</li>
                <li>Elige "Permitir siempre" o "Siempre"</li>
              </ol>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {isNativePlatform() && (
              <Button onClick={handleOpenSettings} className="w-full">
                <Settings className="h-4 w-4 mr-2" />
                Abrir configuración
              </Button>
            )}
            <Button variant="outline" onClick={() => { setShowDeniedHelp(false); onDismiss(); }}>
              Continuar sin GPS
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Navigation className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Compartir ubicación</DialogTitle>
          <DialogDescription className="text-center">
            ALMASA necesita tu ubicación para que el administrador pueda monitorear el progreso de tu ruta en tiempo real.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium">Tracking continuo</p>
              <p className="text-muted-foreground">Tu ubicación se comparte incluso cuando la app está en segundo plano</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <Shield className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium">Solo durante rutas activas</p>
              <p className="text-muted-foreground">El tracking se detiene automáticamente al finalizar la ruta</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button onClick={handleRequestPermission} disabled={requesting} className="w-full">
            {requesting ? 'Solicitando...' : 'Permitir ubicación'}
          </Button>
          <Button variant="ghost" onClick={onDismiss} disabled={requesting}>
            Ahora no
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
