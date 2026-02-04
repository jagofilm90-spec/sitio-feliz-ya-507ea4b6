import { useState, useEffect, useRef } from 'react';
import { Bell, BellOff, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  initPushNotifications, 
  isNativePlatform, 
  checkNotificationPermissions 
} from '@/services/pushNotifications';
import { supabase } from '@/integrations/supabase/client';

interface PushNotificationSetupProps {
  onComplete?: () => void;
}

/**
 * Dialog component for requesting push notification permissions.
 * 
 * IMPORTANT: This component should be controlled by PushNotificationsGate
 * which handles all the route and auth checks. This component now only
 * manages the dialog UI and permission request flow.
 */
export const PushNotificationSetup = ({ onComplete }: PushNotificationSetupProps) => {
  const [showDialog, setShowDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const { toast } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    
    const checkAndShowDialog = async () => {
      // Skip if not native platform
      if (!isNativePlatform()) {
        return;
      }

      // STRICT CHECK: Block on auth routes using startsWith
      const currentPath = window.location.pathname;
      if (
        currentPath === '/' ||
        currentPath.startsWith('/auth') ||
        currentPath.startsWith('/login')
      ) {
        console.log('[PushSetup] Blocked: on auth route', currentPath);
        return;
      }

      // Verify session exists with valid user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        console.log('[PushSetup] Blocked: no valid session');
        return;
      }

      // Check if already has permissions
      const permitted = await checkNotificationPermissions();
      if (!mountedRef.current) return;
      
      setHasPermission(permitted);

      if (permitted) {
        console.log('[PushSetup] Already has permission');
        return;
      }

      // Check if user already dismissed
      const hasSeenPrompt = localStorage.getItem('push_notification_prompt_seen');
      if (hasSeenPrompt) {
        console.log('[PushSetup] User already dismissed prompt');
        return;
      }

      // Show dialog after delay (only if still mounted)
      console.log('[PushSetup] Scheduling dialog display');
      timeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          console.log('[PushSetup] Showing dialog');
          setShowDialog(true);
        }
      }, 1500);
    };

    // Small initial delay for stability
    const initialDelay = setTimeout(() => {
      checkAndShowDialog();
    }, 500);

    return () => {
      mountedRef.current = false;
      clearTimeout(initialDelay);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  const handleEnableNotifications = async () => {
    setIsLoading(true);
    
    try {
      const success = await initPushNotifications();
      
      if (success) {
        setHasPermission(true);
        toast({
          title: 'Notificaciones activadas',
          description: 'Recibirás alertas de nuevos pedidos y actualizaciones importantes.',
        });
      } else {
        toast({
          title: 'No se pudieron activar',
          description: 'Por favor habilita las notificaciones en la configuración de tu dispositivo.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error activando notificaciones:', error);
      toast({
        title: 'Error',
        description: 'Ocurrió un error al activar las notificaciones.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setShowDialog(false);
      localStorage.setItem('push_notification_prompt_seen', 'true');
      onComplete?.();
    }
  };

  const handleSkip = () => {
    setShowDialog(false);
    localStorage.setItem('push_notification_prompt_seen', 'true');
    onComplete?.();
  };

  // No mostrar nada si no es plataforma nativa
  if (!isNativePlatform()) {
    return null;
  }

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Bell className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-center">Activar Notificaciones</DialogTitle>
          <DialogDescription className="text-center">
            Recibe alertas instantáneas cuando:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <Smartphone className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium">Nuevos pedidos</p>
              <p className="text-xs text-muted-foreground">
                Clientes envían pedidos desde el portal
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
              <Bell className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium">Autorizaciones pendientes</p>
              <p className="text-xs text-muted-foreground">
                Órdenes de compra y cotizaciones por aprobar
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
              <BellOff className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-medium">Alertas de inventario</p>
              <p className="text-xs text-muted-foreground">
                Stock bajo y productos por caducar
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button 
            onClick={handleEnableNotifications} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Activando...' : 'Activar Notificaciones'}
          </Button>
          <Button 
            variant="ghost" 
            onClick={handleSkip}
            className="w-full"
          >
            Ahora no
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PushNotificationSetup;
