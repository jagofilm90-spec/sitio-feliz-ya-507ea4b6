import { supabase } from '@/integrations/supabase/client';

// Verificar si estamos en plataforma nativa - check safely
export const isNativePlatform = (): boolean => {
  try {
    // Check if Capacitor global exists
    if (typeof window !== 'undefined' && (window as any).Capacitor) {
      return (window as any).Capacitor.isNativePlatform?.() || false;
    }
    return false;
  } catch {
    return false;
  }
};

// Get Capacitor instance safely
const getCapacitor = () => {
  try {
    if (typeof window !== 'undefined' && (window as any).Capacitor) {
      return (window as any).Capacitor;
    }
    return null;
  } catch {
    return null;
  }
};

// Inicializar sistema de notificaciones push
export const initPushNotifications = async (): Promise<boolean> => {
  if (!isNativePlatform()) {
    console.log('Push notifications solo disponibles en plataforma nativa');
    return false;
  }

  try {
    // Dynamic import for Capacitor modules
    const { PushNotifications } = await import('@capacitor/push-notifications');
    
    // Solicitar permisos
    const permissionStatus = await PushNotifications.requestPermissions();
    
    if (permissionStatus.receive !== 'granted') {
      console.log('Permisos de notificaciones no otorgados');
      return false;
    }

    // Registrar para recibir notificaciones
    await PushNotifications.register();

    // Configurar listeners
    await setupPushListeners();

    console.log('Sistema de notificaciones push inicializado');
    return true;
  } catch (error) {
    console.error('Error inicializando push notifications:', error);
    return false;
  }
};

// Configurar listeners para eventos de push
const setupPushListeners = async () => {
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');

    // Cuando se recibe el token de registro
    PushNotifications.addListener('registration', async (token: any) => {
      console.log('Token de push recibido:', token.value);
      await saveDeviceToken(token.value);
    });

    // Error en registro
    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Error en registro de push:', error);
    });

    // Notificación recibida con app en primer plano
    PushNotifications.addListener('pushNotificationReceived', (notification: any) => {
      console.log('Notificación recibida:', notification);
      handleForegroundNotification(notification);
    });

    // Usuario tocó la notificación
    PushNotifications.addListener('pushNotificationActionPerformed', (action: any) => {
      console.log('Acción de notificación:', action);
      handleNotificationTap(action);
    });
  } catch (error) {
    console.error('Error setting up push listeners:', error);
  }
};

// Guardar token del dispositivo en la base de datos
const saveDeviceToken = async (token: string): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('No hay usuario autenticado para guardar token');
      return;
    }

    const capacitor = getCapacitor();
    const platform = capacitor?.getPlatform?.() || 'unknown';
    const deviceName = `${platform}-${Date.now()}`;

    const client = supabase as any;
    const { error } = await client
      .from('device_tokens')
      .upsert({
        user_id: user.id,
        token: token,
        platform: platform,
        device_name: deviceName,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,token'
      });

    if (error) {
      console.error('Error guardando token:', error);
    } else {
      console.log('Token guardado exitosamente');
    }
  } catch (error) {
    console.error('Error en saveDeviceToken:', error);
  }
};

// Manejar notificación recibida en primer plano
const handleForegroundNotification = (notification: any) => {
  import('@/hooks/use-toast').then(({ toast }) => {
    toast({
      title: notification.title || 'Nueva notificación',
      description: notification.body || '',
    });
  });
};

// Manejar tap en notificación
const handleNotificationTap = (action: any) => {
  const data = action.notification?.data as Record<string, string> | undefined;
  
  if (!data?.type) return;

  switch (data.type) {
    case 'nuevo_pedido':
      window.location.href = '/pedidos?tab=por-autorizar';
      break;
    case 'pedido_autorizado':
      window.location.href = '/portal-cliente?tab=pedidos';
      break;
    case 'entrega_programada':
      window.location.href = '/portal-cliente?tab=entregas';
      break;
    case 'stock_bajo':
      window.location.href = '/inventario';
      break;
    case 'oc_pendiente':
      window.location.href = '/compras';
      break;
    case 'cotizacion_pendiente':
      window.location.href = '/pedidos?tab=cotizaciones';
      break;
    default:
      console.log('Tipo de notificación no manejado:', data.type);
  }
};

// Eliminar token del dispositivo (logout)
export const removeDeviceToken = async (): Promise<void> => {
  if (!isNativePlatform()) return;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    const capacitor = getCapacitor();
    const platform = capacitor?.getPlatform?.() || 'unknown';
    const client = supabase as any;

    await client
      .from('device_tokens')
      .delete()
      .eq('user_id', user.id)
      .eq('platform', platform);

    console.log('Token eliminado');
  } catch (error) {
    console.error('Error eliminando token:', error);
  }
};

// Verificar si las notificaciones están habilitadas
export const checkNotificationPermissions = async (): Promise<boolean> => {
  if (!isNativePlatform()) return false;

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const status = await PushNotifications.checkPermissions();
    return status.receive === 'granted';
  } catch {
    return false;
  }
};

// Enviar notificación push (llamar desde el cliente)
export const sendPushNotification = async (params: {
  user_ids?: string[];
  roles?: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: params
    });

    if (error) {
      console.error('Error enviando push notification:', error);
      return false;
    }

    console.log('Push notification enviada:', data);
    return data?.success || false;
  } catch (error) {
    console.error('Error en sendPushNotification:', error);
    return false;
  }
};