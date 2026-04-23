import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { FCM } from '@capacitor-community/fcm';
import { supabase } from '@/integrations/supabase/client';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

let tokenSavedResolver: ((success: boolean) => void) | null = null;
let tokenSaveTimeout: ReturnType<typeof setTimeout> | null = null;

const waitForTokenSaved = (timeoutMs: number = 30000): Promise<boolean> => {
  return new Promise((resolve) => {
    tokenSavedResolver = resolve;
    tokenSaveTimeout = setTimeout(() => {
      console.error('[Push] Token save timeout after', timeoutMs, 'ms');
      tokenSavedResolver = null;
      resolve(false);
    }, timeoutMs);
  });
};

const notifyTokenSaved = (success: boolean) => {
  if (tokenSaveTimeout) { clearTimeout(tokenSaveTimeout); tokenSaveTimeout = null; }
  if (tokenSavedResolver) { tokenSavedResolver(success); tokenSavedResolver = null; }
};

const isApnsToken = (token: string): boolean => /^[0-9A-Fa-f]{64}$/.test(token);

const getFcmTokenWithRetry = async (maxRetries: number = 3): Promise<string | null> => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const waitTime = attempt === 0 ? 2000 : 1000 * Math.pow(2, attempt);
      await delay(waitTime);

      const fcmToken = await FCM.getToken();

      if (!fcmToken.token) continue;
      if (isApnsToken(fcmToken.token)) continue;

      return fcmToken.token;
    } catch (error: any) {
      console.error(`[Push] Attempt ${attempt + 1} failed:`, error?.message || error);
    }
  }

  console.error('[Push] Could not get FCM token after', maxRetries, 'attempts');
  return null;
};

export const isNativePlatform = () => Capacitor.isNativePlatform();

let listenersReady = false;

const setupPushListeners = () => {
  if (listenersReady) return;
  listenersReady = true;

  PushNotifications.addListener('registration', async (token: Token) => {
    if (Capacitor.getPlatform() === 'ios') {
      const fcmToken = await getFcmTokenWithRetry(3);
      if (fcmToken) {
        await saveDeviceToken(fcmToken);
      } else {
        console.error('[Push] iOS: Could not obtain FCM token');
        notifyTokenSaved(false);
      }
    } else {
      if (token.value && !isApnsToken(token.value)) {
        await saveDeviceToken(token.value);
      } else {
        console.error('[Push] Android: Invalid token format');
        notifyTokenSaved(false);
      }
    }
  });

  PushNotifications.addListener('registrationError', (error) => {
    console.error('[Push] Registration error:', (error as any)?.message || error);
    notifyTokenSaved(false);
  });

  PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
    handleForegroundNotification(notification);
  });

  PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
    handleNotificationTap(action);
  });
};

export const registerPushNotificationsSilently = async (): Promise<boolean> => {
  if (!isNativePlatform()) return false;
  try {
    setupPushListeners();
    await PushNotifications.register();
    return true;
  } catch (error) {
    console.error('[Push] Silent registration error:', error);
    return false;
  }
};

export const requestPushPermissionsAndRegister = async (): Promise<boolean> => {
  if (!isNativePlatform()) return false;
  try {
    const permissionStatus = await PushNotifications.requestPermissions();
    if (permissionStatus.receive !== 'granted') return false;

    setupPushListeners();
    const tokenPromise = waitForTokenSaved(30000);
    await PushNotifications.register();
    return await tokenPromise;
  } catch (error) {
    console.error('[Push] Interactive registration error:', error);
    return false;
  }
};

/** @deprecated Use requestPushPermissionsAndRegister instead. */
export const initPushNotifications = async (): Promise<boolean> => {
  return requestPushPermissionsAndRegister();
};

const saveDeviceToken = async (token: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { notifyTokenSaved(false); return false; }

    const platform = Capacitor.getPlatform();
    const client = supabase as any;
    const { error } = await client
      .from('device_tokens')
      .upsert({
        user_id: user.id, token, platform,
        device_name: `${platform}-${Date.now()}`,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,token' });

    if (error) {
      console.error('[Push] Error saving token:', error);
      notifyTokenSaved(false);
      return false;
    }
    notifyTokenSaved(true);
    return true;
  } catch (error) {
    console.error('[Push] Error in saveDeviceToken:', error);
    notifyTokenSaved(false);
    return false;
  }
};

const handleForegroundNotification = (notification: PushNotificationSchema) => {
  import('@/hooks/use-toast').then(({ toast }) => {
    toast({
      title: notification.title || 'Nueva notificación',
      description: notification.body || '',
    });
  });
};

const handleNotificationTap = (action: ActionPerformed) => {
  const data = action.notification.data as Record<string, string> | undefined;
  if (!data?.type) return;

  switch (data.type) {
    case 'nuevo_pedido': window.location.href = '/pedidos?tab=por-autorizar'; break;
    case 'pedido_autorizado': window.location.href = '/portal-cliente?tab=pedidos'; break;
    case 'entrega_programada': window.location.href = '/portal-cliente?tab=entregas'; break;
    case 'stock_bajo': window.location.href = '/inventario'; break;
    case 'oc_pendiente': window.location.href = '/compras'; break;
    case 'cotizacion_pendiente': window.location.href = '/pedidos?tab=cotizaciones'; break;
    case 'solicitud_descuento':
    case 'solicitud_autorizacion':
      window.location.href = `/pedidos?tab=por-autorizar${data.pedido_id ? `&pedido_id=${data.pedido_id}` : ''}`;
      break;
    case 'carga_completa': case 'ruta_asignada': case 'ruta_modificada':
    case 'ruta_cancelada': case 'entrega_agregada': case 'entrega_removida':
    case 'mensaje_urgente':
      window.location.href = '/chofer'; break;
  }
};

export const removeDeviceToken = async (): Promise<void> => {
  if (!isNativePlatform()) return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const client = supabase as any;
    await client.from('device_tokens').delete().eq('user_id', user.id).eq('platform', Capacitor.getPlatform());
    localStorage.removeItem('push_notification_prompt_seen');
  } catch (error) {
    console.error('[Push] Error removing token:', error);
  }
};

export const checkNotificationPermissions = async (): Promise<boolean> => {
  if (!isNativePlatform()) return false;
  try {
    const status = await PushNotifications.checkPermissions();
    return status.receive === 'granted';
  } catch { return false; }
};

export const sendPushNotification = async (params: {
  user_ids?: string[]; roles?: string[]; title: string; body: string; data?: Record<string, string>;
}): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('send-push-notification', { body: params });
    if (error) { console.error('[Push] Error sending notification:', error); return false; }
    return data?.success || false;
  } catch (error) {
    console.error('[Push] Error in sendPushNotification:', error);
    return false;
  }
};
