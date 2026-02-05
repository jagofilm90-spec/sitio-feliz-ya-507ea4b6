import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { FCM } from '@capacitor-community/fcm';
import { supabase } from '@/integrations/supabase/client';

// Helper function for delays
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Token saved callback system for synchronous registration flow
let tokenSavedResolver: ((success: boolean) => void) | null = null;
let tokenSaveTimeout: ReturnType<typeof setTimeout> | null = null;

// Creates a promise that resolves when the token is saved
const waitForTokenSaved = (timeoutMs: number = 30000): Promise<boolean> => {
  return new Promise((resolve) => {
    tokenSavedResolver = resolve;
    
    // Safety timeout
    tokenSaveTimeout = setTimeout(() => {
      console.error('[Push] Token save timeout - no token saved within', timeoutMs, 'ms');
      tokenSavedResolver = null;
      resolve(false);
    }, timeoutMs);
  });
};

// Notify that the token was saved (or failed)
const notifyTokenSaved = (success: boolean) => {
  if (tokenSaveTimeout) {
    clearTimeout(tokenSaveTimeout);
    tokenSaveTimeout = null;
  }
  if (tokenSavedResolver) {
    console.log('[Push] Notifying token save result:', success);
    tokenSavedResolver(success);
    tokenSavedResolver = null;
  }
};

// Validate if token is a raw APNs token (hexadecimal, 64 chars)
// APNs tokens should NOT be saved - we need the FCM token
const isApnsToken = (token: string): boolean => {
  return /^[0-9A-Fa-f]{64}$/.test(token);
};

// Get FCM token with retries and validation
const getFcmTokenWithRetry = async (maxRetries: number = 3): Promise<string | null> => {
  console.log('[Push] === Starting FCM Token Retrieval ===');
  console.log('[Push] Platform:', Capacitor.getPlatform());
  console.log('[Push] Is native:', Capacitor.isNativePlatform());
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Wait before attempting (longer initial delay for iOS handshake)
      const waitTime = attempt === 0 ? 2000 : 1000 * Math.pow(2, attempt); // 2s, 2s, 4s
      console.log(`[Push] Attempt ${attempt + 1}/${maxRetries}: waiting ${waitTime}ms before getting FCM token`);
      await delay(waitTime);
      
      console.log(`[Push] Attempt ${attempt + 1}: Calling FCM.getToken()...`);
      const fcmToken = await FCM.getToken();
      console.log(`[Push] Attempt ${attempt + 1}: FCM.getToken() returned`);
      
      if (!fcmToken.token) {
        console.log(`[Push] Attempt ${attempt + 1}: FCM returned empty/null token object:`, JSON.stringify(fcmToken));
        continue;
      }
      
      console.log(`[Push] Attempt ${attempt + 1}: Token received, length=${fcmToken.token.length}, first30=${fcmToken.token.substring(0, 30)}...`);
      
      // Validate it's not a raw APNs token
      if (isApnsToken(fcmToken.token)) {
        console.log(`[Push] Attempt ${attempt + 1}: Token is raw APNs (64 hex chars) - Firebase bridge not ready, retrying...`);
        continue;
      }
      
      console.log(`[Push] ✅ Successfully got valid FCM token on attempt ${attempt + 1}`);
      return fcmToken.token;
    } catch (error: any) {
      console.error(`[Push] ❌ Attempt ${attempt + 1} EXCEPTION:`, {
        message: error?.message || 'No message',
        code: error?.code || 'No code',
        name: error?.name || 'No name',
        stack: error?.stack?.substring(0, 200) || 'No stack',
        fullError: JSON.stringify(error)
      });
    }
  }
  
  console.error('[Push] ❌ FAILED: Could not get valid FCM token after', maxRetries, 'attempts');
  console.error('[Push] Possible causes: 1) GoogleService-Info.plist missing, 2) Firebase SDK not initialized, 3) APNs key not configured in Firebase Console');
  return null;
};

// Verificar si estamos en plataforma nativa
export const isNativePlatform = () => Capacitor.isNativePlatform();

// Module-level flag to ensure listeners are set up only once
let listenersReady = false;

// Configurar listeners para eventos de push (idempotente)
const setupPushListeners = () => {
  if (listenersReady) {
    console.log('[Push] Listeners already configured, skipping');
    return;
  }
  
  listenersReady = true;
  console.log('[Push] Setting up push listeners');

  // Cuando se recibe el token de registro
  PushNotifications.addListener('registration', async (token: Token) => {
    console.log('[Push] === Registration Event Received ===');
    console.log('[Push] Raw token value:', token.value ? `${token.value.substring(0, 40)}... (length: ${token.value.length})` : 'NULL/EMPTY');
    console.log('[Push] Token type check - isApnsToken:', token.value ? isApnsToken(token.value) : 'N/A');
    
    // En iOS, necesitamos obtener el token FCM (no el APNs crudo)
    if (Capacitor.getPlatform() === 'ios') {
      console.log('[Push] iOS platform detected - initiating FCM token retrieval with retries');
      
      const fcmToken = await getFcmTokenWithRetry(3);
      
      if (fcmToken) {
        console.log('[Push] ✅ iOS FCM Token obtained successfully');
        console.log('[Push] Token preview:', fcmToken.substring(0, 40) + '...');
        await saveDeviceToken(fcmToken);
      } else {
        console.error('[Push] ❌ iOS: Could NOT obtain valid FCM token');
        console.error('[Push] Check Xcode console for native errors');
        notifyTokenSaved(false);
      }
    } else {
      // Android ya retorna FCM token directamente
      console.log('[Push] Android platform - using direct token');
      console.log('[Push] Token preview:', token.value?.substring(0, 40) + '...');
      
      // Validate even Android tokens
      if (token.value && !isApnsToken(token.value)) {
        await saveDeviceToken(token.value);
      } else {
        console.error('[Push] ❌ Android: Invalid token format received');
        notifyTokenSaved(false);
      }
    }
  });

  // Error en registro
  PushNotifications.addListener('registrationError', (error) => {
    console.error('[Push] ❌ Registration ERROR event:', {
      message: (error as any)?.message || 'No message',
      code: (error as any)?.code || 'No code',
      fullError: JSON.stringify(error)
    });
    console.error('[Push] This usually means: APNs certificate issue, or app not properly signed for push');
    notifyTokenSaved(false); // Notificar fallo inmediatamente
  });

  // Notificación recibida con app en primer plano
  PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
    console.log('[Push] Notification received:', notification);
    handleForegroundNotification(notification);
  });

  // Usuario tocó la notificación
  PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
    console.log('[Push] Notification action:', action);
    handleNotificationTap(action);
  });
};

/**
 * SILENT registration - Does NOT request permissions.
 * Only sets up listeners and calls register().
 * Use when permissions are already granted.
 */
export const registerPushNotificationsSilently = async (): Promise<boolean> => {
  if (!isNativePlatform()) {
    console.log('[Push] Silent registration: not native platform');
    return false;
  }

  try {
    console.log('[Push] Silent registration: setting up listeners and registering');
    setupPushListeners();
    await PushNotifications.register();
    console.log('[Push] Silent registration complete');
    return true;
  } catch (error) {
    console.error('[Push] Silent registration error:', error);
    return false;
  }
};

/**
 * INTERACTIVE registration - Requests permissions first.
 * Only call this from a direct user action (button tap).
 * This is the ONLY function that triggers the iOS system prompt.
 */
export const requestPushPermissionsAndRegister = async (): Promise<boolean> => {
  if (!isNativePlatform()) {
    console.log('[Push] Interactive registration: not native platform');
    return false;
  }

  try {
    console.log('[Push] Interactive registration: requesting permissions');
    const permissionStatus = await PushNotifications.requestPermissions();
    
    if (permissionStatus.receive !== 'granted') {
      console.log('[Push] Permissions not granted');
      return false;
    }

    console.log('[Push] Permissions granted, setting up registration');
    setupPushListeners();
    
    // Start waiting BEFORE calling register()
    const tokenPromise = waitForTokenSaved(30000); // 30s timeout for iOS
    
    // Register the device
    console.log('[Push] About to call PushNotifications.register()');
    await PushNotifications.register();
    console.log('[Push] register() completed, now waiting for registration event...');
    
    // Wait for the token to be saved
    const success = await tokenPromise;
    console.log('[Push] Token save result:', success);
    
    return success;
  } catch (error) {
    console.error('[Push] Interactive registration error:', error);
    return false;
  }
};

/**
 * @deprecated Use registerPushNotificationsSilently or requestPushPermissionsAndRegister instead.
 * Kept for backward compatibility but should not be used.
 */
export const initPushNotifications = async (): Promise<boolean> => {
  console.warn('[Push] initPushNotifications is deprecated, use requestPushPermissionsAndRegister instead');
  return requestPushPermissionsAndRegister();
};

// Guardar token del dispositivo en la base de datos usando SQL directo
const saveDeviceToken = async (token: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('No hay usuario autenticado para guardar token');
      notifyTokenSaved(false);
      return false;
    }

    const platform = Capacitor.getPlatform();
    const deviceName = `${platform}-${Date.now()}`;

    // Usar inserción directa con la tabla device_tokens
    // La tabla existe pero los tipos no están regenerados aún
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
      notifyTokenSaved(false);
      return false;
    } else {
      console.log('Token guardado exitosamente');
      notifyTokenSaved(true);
      return true;
    }
  } catch (error) {
    console.error('Error en saveDeviceToken:', error);
    notifyTokenSaved(false);
    return false;
  }
};

// Manejar notificación recibida en primer plano
const handleForegroundNotification = (notification: PushNotificationSchema) => {
  import('@/hooks/use-toast').then(({ toast }) => {
    toast({
      title: notification.title || 'Nueva notificación',
      description: notification.body || '',
    });
  });
};

// Manejar tap en notificación
const handleNotificationTap = (action: ActionPerformed) => {
  const data = action.notification.data as Record<string, string> | undefined;
  
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
    case 'solicitud_descuento':
      window.location.href = '/pedidos?tab=por-autorizar';
      break;
    case 'carga_completa':
    case 'ruta_asignada':
    case 'ruta_modificada':
    case 'ruta_cancelada':
    case 'entrega_agregada':
    case 'entrega_removida':
    case 'mensaje_urgente':
      window.location.href = '/chofer';
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

    const platform = Capacitor.getPlatform();
    const client = supabase as any;

    await client
      .from('device_tokens')
      .delete()
      .eq('user_id', user.id)
      .eq('platform', platform);

    // Limpiar flag para que se pregunte de nuevo en próximo login
    localStorage.removeItem('push_notification_prompt_seen');

    console.log('Token eliminado');
  } catch (error) {
    console.error('Error eliminando token:', error);
  }
};

// Verificar si las notificaciones están habilitadas
export const checkNotificationPermissions = async (): Promise<boolean> => {
  if (!isNativePlatform()) return false;

  try {
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
