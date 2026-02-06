import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { FCM } from '@capacitor-community/fcm';
import { supabase } from '@/integrations/supabase/client';

// Diagnostic log storage
let diagnosticLogs: Array<{ timestamp: string; message: string; type: 'info' | 'success' | 'error' | 'warning' }> = [];
let logListeners: Array<(logs: typeof diagnosticLogs) => void> = [];

// Add a log entry
const addLog = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
  const now = new Date();
  const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
  const entry = {
    timestamp,
    message,
    type
  };
  diagnosticLogs.push(entry);
  console.log(`[PushDiag] ${type.toUpperCase()}: ${message}`);
  
  // Notify listeners
  logListeners.forEach(listener => listener([...diagnosticLogs]));
};

// Subscribe to log updates
export const subscribeToLogs = (callback: (logs: typeof diagnosticLogs) => void) => {
  logListeners.push(callback);
  return () => {
    logListeners = logListeners.filter(l => l !== callback);
  };
};

// Get current logs
export const getDiagnosticLogs = () => [...diagnosticLogs];

// Clear logs
export const clearDiagnosticLogs = () => {
  diagnosticLogs = [];
  logListeners.forEach(listener => listener([]));
};

// Check if platform is native
export const getPlatformInfo = () => ({
  platform: Capacitor.getPlatform(),
  isNative: Capacitor.isNativePlatform(),
});

// Check permission status
export const checkPermissionStatus = async (): Promise<string> => {
  if (!Capacitor.isNativePlatform()) {
    return 'not_native';
  }
  
  try {
    const status = await PushNotifications.checkPermissions();
    return status.receive;
  } catch (error: any) {
    return `error: ${error?.message || 'unknown'}`;
  }
};

// Check if prompt was shown
export const getPromptStatus = () => ({
  promptSeen: localStorage.getItem('push_notification_prompt_seen') === 'true',
});

// Get device token from database
export const getDeviceTokenFromDb = async (): Promise<{ found: boolean; token?: string; platform?: string; updatedAt?: string }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { found: false };
    }

    const client = supabase as any;
    const { data, error } = await client
      .from('device_tokens')
      .select('token, platform, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return { found: false };
    }

    return {
      found: true,
      token: data.token,
      platform: data.platform,
      updatedAt: data.updated_at
    };
  } catch (error) {
    return { found: false };
  }
};

// Helper to wait for a specific time
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Validate if token is a raw APNs token (should NOT be saved)
const isApnsToken = (token: string): boolean => {
  return /^[0-9A-Fa-f]{64}$/.test(token);
};

// Run full diagnostic
export const runPushDiagnostics = async (): Promise<boolean> => {
  clearDiagnosticLogs();
  
  addLog('=== INICIANDO DIAGNÓSTICO COMPLETO ===', 'info');
  
  // Step 1: Platform check
  const platformInfo = getPlatformInfo();
  addLog(`Plataforma: ${platformInfo.platform}`, 'info');
  addLog(`Es nativo: ${platformInfo.isNative ? 'Sí' : 'No'}`, platformInfo.isNative ? 'success' : 'warning');
  
  if (!platformInfo.isNative) {
    addLog('❌ No es plataforma nativa, no se pueden usar push notifications', 'error');
    return false;
  }
  
  // Step 2: Check current permissions
  addLog('Verificando permisos del sistema...', 'info');
  const permStatus = await checkPermissionStatus();
  addLog(`Estado de permisos: ${permStatus}`, permStatus === 'granted' ? 'success' : 'warning');
  
  // Step 3: Check localStorage flag
  const promptStatus = getPromptStatus();
  addLog(`Flag prompt_seen en localStorage: ${promptStatus.promptSeen ? 'true' : 'false'}`, 'info');
  
  // Step 4: Check database token
  addLog('Buscando token en base de datos...', 'info');
  const dbToken = await getDeviceTokenFromDb();
  if (dbToken.found) {
    addLog(`✅ Token encontrado en BD`, 'success');
    addLog(`  Platform: ${dbToken.platform}`, 'info');
    addLog(`  Token (primeros 40): ${dbToken.token?.substring(0, 40)}...`, 'info');
    addLog(`  Actualizado: ${dbToken.updatedAt}`, 'info');
  } else {
    addLog('⚠️ No hay token guardado en la base de datos', 'warning');
  }
  
  // Step 5: Request permissions if not granted
  if (permStatus !== 'granted') {
    addLog('Solicitando permisos de notificaciones...', 'info');
    try {
      const result = await PushNotifications.requestPermissions();
      addLog(`Resultado de solicitud: ${result.receive}`, result.receive === 'granted' ? 'success' : 'error');
      
      if (result.receive !== 'granted') {
        addLog('❌ Usuario no concedió permisos', 'error');
        return false;
      }
    } catch (error: any) {
      addLog(`❌ Error solicitando permisos: ${error?.message || 'unknown'}`, 'error');
      return false;
    }
  }
  
  // Step 6: Register for push
  addLog('Llamando PushNotifications.register()...', 'info');
  
  // Create a promise to wait for registration
  let registrationResolver: ((value: { success: boolean; token?: string }) => void) | null = null;
  const registrationPromise = new Promise<{ success: boolean; token?: string }>((resolve) => {
    registrationResolver = resolve;
    
    // Timeout after 15 seconds
    setTimeout(() => {
      if (registrationResolver) {
        addLog('⚠️ Timeout esperando evento de registro (15s)', 'warning');
        resolve({ success: false });
      }
    }, 15000);
  });
  
  // Set up one-time listener for registration
  const registrationListener = await PushNotifications.addListener('registration', async (token) => {
    addLog('📱 Evento "registration" recibido', 'success');
    addLog(`Token raw recibido (length=${token.value?.length || 0})`, 'info');
    addLog(`Token (primeros 50): ${token.value?.substring(0, 50)}...`, 'info');
    
    // Check if it's an APNs token
    if (token.value && isApnsToken(token.value)) {
      addLog('⚠️ Token es APNs crudo (64 hex chars) - necesita conversión FCM', 'warning');
    } else {
      addLog('Token parece ser FCM válido (no es APNs hex)', 'info');
    }
    
    // For iOS, try to get FCM token
    if (platformInfo.platform === 'ios') {
      addLog('iOS detectado - intentando obtener token FCM...', 'info');
      
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const waitTime = attempt === 1 ? 2000 : 1000 * Math.pow(2, attempt);
          addLog(`Intento ${attempt}/3: esperando ${waitTime}ms...`, 'info');
          await delay(waitTime);
          
          addLog(`Intento ${attempt}/3: llamando FCM.getToken()...`, 'info');
          const fcmResult = await FCM.getToken();
          
          if (!fcmResult.token) {
            addLog(`Intento ${attempt}/3: FCM retornó token vacío/null`, 'warning');
            continue;
          }
          
          addLog(`Intento ${attempt}/3: FCM token recibido (length=${fcmResult.token.length})`, 'info');
          addLog(`FCM Token (primeros 50): ${fcmResult.token.substring(0, 50)}...`, 'info');
          
          // Validate it's not still an APNs token
          if (isApnsToken(fcmResult.token)) {
            addLog(`Intento ${attempt}/3: Token sigue siendo APNs - Firebase bridge no listo`, 'warning');
            continue;
          }
          
          addLog(`✅ Token FCM válido obtenido en intento ${attempt}`, 'success');
          
          // Try to save to database
          addLog('Intentando guardar token en BD...', 'info');
          const saved = await saveTokenToDb(fcmResult.token, platformInfo.platform);
          
          if (saved) {
            addLog('✅ Token guardado exitosamente en BD', 'success');
            registrationResolver?.({ success: true, token: fcmResult.token });
          } else {
            addLog('❌ Error guardando token en BD', 'error');
            registrationResolver?.({ success: false });
          }
          
          registrationListener.remove();
          return;
        } catch (error: any) {
          addLog(`Intento ${attempt}/3 ERROR: ${error?.message || JSON.stringify(error)}`, 'error');
        }
      }
      
      addLog('❌ No se pudo obtener token FCM válido después de 3 intentos', 'error');
      registrationResolver?.({ success: false });
    } else {
      // Android - use token directly
      addLog('Android detectado - usando token directo', 'info');
      
      if (token.value && !isApnsToken(token.value)) {
        addLog('Intentando guardar token en BD...', 'info');
        const saved = await saveTokenToDb(token.value, platformInfo.platform);
        
        if (saved) {
          addLog('✅ Token guardado exitosamente en BD', 'success');
          registrationResolver?.({ success: true, token: token.value });
        } else {
          addLog('❌ Error guardando token en BD', 'error');
          registrationResolver?.({ success: false });
        }
      } else {
        addLog('❌ Token Android inválido', 'error');
        registrationResolver?.({ success: false });
      }
    }
    
    registrationListener.remove();
  });
  
  // Set up error listener
  const errorListener = await PushNotifications.addListener('registrationError', (error) => {
    addLog(`❌ Evento "registrationError" recibido`, 'error');
    addLog(`Error: ${JSON.stringify(error)}`, 'error');
    registrationResolver?.({ success: false });
    errorListener.remove();
  });
  
  try {
    await PushNotifications.register();
    addLog('register() completado, esperando evento...', 'info');
  } catch (error: any) {
    addLog(`❌ Error en register(): ${error?.message || 'unknown'}`, 'error');
    registrationListener.remove();
    errorListener.remove();
    return false;
  }
  
  // Wait for registration result
  const result = await registrationPromise;
  
  // Cleanup listeners
  registrationListener.remove();
  errorListener.remove();
  
  addLog('=== DIAGNÓSTICO COMPLETADO ===', result.success ? 'success' : 'error');
  addLog(`Resultado: ${result.success ? 'ÉXITO' : 'FALLO'}`, result.success ? 'success' : 'error');
  
  return result.success;
};

// Helper to save token to database
const saveTokenToDb = async (token: string, platform: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      addLog('Error: No hay usuario autenticado', 'error');
      return false;
    }

    const deviceName = `${platform}-${Date.now()}`;
    addLog(`Guardando para user_id: ${user.id.substring(0, 8)}...`, 'info');
    addLog(`Device name: ${deviceName}`, 'info');

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
      addLog(`Error BD: ${JSON.stringify(error)}`, 'error');
      return false;
    }

    return true;
  } catch (error: any) {
    addLog(`Excepción: ${error?.message || 'unknown'}`, 'error');
    return false;
  }
};

// Reset and allow re-prompting
export const resetPushPromptFlag = () => {
  localStorage.removeItem('push_notification_prompt_seen');
  addLog('Flag push_notification_prompt_seen eliminado de localStorage', 'success');
};
