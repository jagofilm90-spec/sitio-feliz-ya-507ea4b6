// Push Notifications Service - Safe for web browsers
// Uses dynamic imports to avoid crashing on non-native platforms

import { supabase } from '@/integrations/supabase/client';

// Variables para módulos cargados dinámicamente
let CapacitorCore: any = null;
let PushNotificationsModule: any = null;
let modulesLoaded = false;

// Verificar si estamos en plataforma nativa de forma segura
export const isNativePlatform = (): boolean => {
  try {
    // Verificar si Capacitor está disponible en window
    if (typeof window !== 'undefined' && (window as any).Capacitor) {
      return (window as any).Capacitor.isNativePlatform?.() ?? false;
    }
    return false;
  } catch {
    return false;
  }
};

// Cargar módulos de Capacitor dinámicamente (solo en plataforma nativa)
const loadCapacitorModules = async (): Promise<boolean> => {
  if (modulesLoaded) return true;
  if (!isNativePlatform()) return false;
  
  try {
    const [coreModule, pushModule] = await Promise.all([
      import('@capacitor/core'),
      import('@capacitor/push-notifications')
    ]);
    
    CapacitorCore = coreModule.Capacitor;
    PushNotificationsModule = pushModule.PushNotifications;
    modulesLoaded = true;
    return true;
  } catch (error) {
    console.log('Capacitor modules not available (running in web browser)');
    return false;
  }
};

// Inicializar sistema de notificaciones push
export const initPushNotifications = async (): Promise<boolean> => {
  if (!isNativePlatform()) {
    console.log('Push notifications solo disponibles en plataforma nativa');
    return false;
  }

  try {
    const loaded = await loadCapacitorModules();
    if (!loaded || !PushNotificationsModule) {
      return false;
    }

    // Solicitar permisos
    const permissionStatus = await PushNotificationsModule.requestPermissions();
    
    if (permissionStatus.receive !== 'granted') {
      console.log('Permisos de notificaciones no otorgados');
      return false;
    }

    // Registrar para recibir notificaciones
    await PushNotificationsModule.register();

    // Configurar listeners
    setupPushListeners();

    console.log('Sistema de notificaciones push inicializado');
    return true;
  } catch (error) {
    console.error('Error inicializando push notifications:', error);
    return false;
  }
};

// Configurar listeners para eventos de push
const setupPushListeners = () => {
  if (!PushNotificationsModule) return;

  try {
    // Cuando se recibe el token de registro
    PushNotificationsModule.addListener('registration', async (token: { value: string }) => {
      console.log('Token de push recibido:', token.value);
      await saveDeviceToken(token.value);
    });

    // Error en registro
    PushNotificationsModule.addListener('registrationError', (error: any) => {
      console.error('Error en registro de push:', error);
    });

    // Notificación recibida con app en primer plano
    PushNotificationsModule.addListener('pushNotificationReceived', (notification: any) => {
      console.log('Notificación recibida:', notification);
      handleForegroundNotification(notification);
    });

    // Usuario tocó la notificación
    PushNotificationsModule.addListener('pushNotificationActionPerformed', (action: any) => {
      console.log('Acción de notificación:', action);
      handleNotificationTap(action);
    });
  } catch (error) {
    console.error('Error configurando push listeners:', error);
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

    const platform = CapacitorCore?.getPlatform?.() ?? 'unknown';
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
  try {
    import('@/hooks/use-toast').then(({ toast }) => {
      toast({
        title: notification.title || 'Nueva notificación',
        description: notification.body || '',
      });
    }).catch(() => {
      // Silently fail if toast is not available
    });
  } catch {
    // Silently fail
  }
};

// Manejar tap en notificación
const handleNotificationTap = (action: any) => {
  try {
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
  } catch (error) {
    console.error('Error handling notification tap:', error);
  }
};

// Eliminar token del dispositivo (logout)
export const removeDeviceToken = async (): Promise<void> => {
  if (!isNativePlatform()) return;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    const platform = CapacitorCore?.getPlatform?.() ?? 'unknown';
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
    const loaded = await loadCapacitorModules();
    if (!loaded || !PushNotificationsModule) {
      return false;
    }

    const status = await PushNotificationsModule.checkPermissions();
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
