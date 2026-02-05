
# Plan: Mejorar el Flujo de Registro de Push Notifications en iOS

## Problema Identificado

El flujo actual tiene un **bug de timing crítico**: la función `requestPushPermissionsAndRegister()` retorna `true` inmediatamente después de llamar `PushNotifications.register()`, pero el proceso real de obtener y guardar el token FCM ocurre de forma **asíncrona** en un listener (`'registration'`) que toma entre 7-10 segundos en iOS debido al exponential backoff.

```text
Flujo Actual (Problemático):
┌─────────────────────────────────────────────────────────────────────────┐
│  Usuario toca "Activar"                                                 │
│          ↓                                                              │
│  requestPermissions() → granted                                         │
│          ↓                                                              │
│  register() ← RETORNA TRUE AQUÍ (inmediato)                             │
│          ↓                                                              │
│  UI muestra "Notificaciones activadas" ✓                                │
│          ↓                                                              │
│  Diálogo se cierra, usuario navega a otra parte                         │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────┐      │
│  │  MIENTRAS TANTO (en background, 7-10s después):               │      │
│  │  'registration' event → getFcmTokenWithRetry() → saveToken()  │      │
│  │  ...pero el usuario ya no está esperando                      │      │
│  └───────────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────┘
```

## Solución Propuesta

Rediseñar el flujo para que la función **espere activamente** a que el token se guarde antes de retornar éxito. Usaremos un patrón de **Promise con resolver externo** que el listener de `'registration'` puede completar.

```text
Flujo Corregido:
┌─────────────────────────────────────────────────────────────────────────┐
│  Usuario toca "Activar"                                                 │
│          ↓                                                              │
│  UI muestra "Activando..." (loading spinner)                            │
│          ↓                                                              │
│  requestPermissions() → granted                                         │
│          ↓                                                              │
│  register() + waitForTokenSaved() ← ESPERA AQUÍ                         │
│          ↓                                                              │
│  'registration' event dispara                                           │
│          ↓                                                              │
│  getFcmTokenWithRetry() (1s + 2s + 4s = ~7s)                            │
│          ↓                                                              │
│  saveDeviceToken() → éxito en DB                                        │
│          ↓                                                              │
│  Promise se resuelve → RETORNA TRUE                                     │
│          ↓                                                              │
│  UI muestra "Notificaciones activadas" ✓                                │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Cambios a Implementar

### 1. Modificar `src/services/pushNotifications.ts`

**a) Agregar sistema de callback para el registro:**

```typescript
// Resolver para esperar que el token se guarde
let tokenSavedResolver: ((success: boolean) => void) | null = null;
let tokenSaveTimeout: ReturnType<typeof setTimeout> | null = null;

// Función que crea una promesa que se resuelve cuando el token se guarda
const waitForTokenSaved = (timeoutMs: number = 15000): Promise<boolean> => {
  return new Promise((resolve) => {
    tokenSavedResolver = resolve;
    
    // Timeout de seguridad
    tokenSaveTimeout = setTimeout(() => {
      console.error('[Push] Token save timeout - no token saved within', timeoutMs, 'ms');
      tokenSavedResolver = null;
      resolve(false);
    }, timeoutMs);
  });
};

// Notificar que el token se guardó exitosamente
const notifyTokenSaved = (success: boolean) => {
  if (tokenSaveTimeout) {
    clearTimeout(tokenSaveTimeout);
    tokenSaveTimeout = null;
  }
  if (tokenSavedResolver) {
    tokenSavedResolver(success);
    tokenSavedResolver = null;
  }
};
```

**b) Modificar `saveDeviceToken` para notificar al completar:**

```typescript
const saveDeviceToken = async (token: string): Promise<boolean> => {
  try {
    // ... código existente de guardado ...
    
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
```

**c) Modificar el listener de `'registration'` para manejar errores:**

```typescript
PushNotifications.addListener('registration', async (token: Token) => {
  // ... código existente ...
  
  if (Capacitor.getPlatform() === 'ios') {
    const fcmToken = await getFcmTokenWithRetry(3);
    
    if (fcmToken) {
      await saveDeviceToken(fcmToken);
    } else {
      console.error('[Push] Could not obtain valid FCM token for iOS');
      notifyTokenSaved(false); // ← AGREGAR: notificar fallo
    }
  } else {
    // Android
    if (token.value && !isApnsToken(token.value)) {
      await saveDeviceToken(token.value);
    } else {
      console.error('[Push] Invalid token format on Android');
      notifyTokenSaved(false); // ← AGREGAR: notificar fallo
    }
  }
});
```

**d) Modificar `requestPushPermissionsAndRegister` para esperar:**

```typescript
export const requestPushPermissionsAndRegister = async (): Promise<boolean> => {
  if (!isNativePlatform()) {
    return false;
  }

  try {
    const permissionStatus = await PushNotifications.requestPermissions();
    
    if (permissionStatus.receive !== 'granted') {
      console.log('[Push] Permissions not granted');
      return false;
    }

    console.log('[Push] Permissions granted, setting up registration');
    setupPushListeners();
    
    // Iniciar la espera ANTES de llamar register()
    const tokenPromise = waitForTokenSaved(20000); // 20s timeout para iOS
    
    // Registrar el dispositivo
    await PushNotifications.register();
    console.log('[Push] Register called, waiting for token to be saved...');
    
    // Esperar a que el token se guarde
    const success = await tokenPromise;
    console.log('[Push] Token save result:', success);
    
    return success;
  } catch (error) {
    console.error('[Push] Interactive registration error:', error);
    return false;
  }
};
```

### 2. Actualizar `src/components/PushNotificationSetup.tsx`

Agregar mejor feedback visual durante la espera (el spinner ya existe pero el mensaje puede ser más claro):

```typescript
// El componente ya tiene isLoading, solo mejorar el texto
<Button 
  onClick={handleEnableNotifications} 
  disabled={isLoading}
  className="w-full"
>
  {isLoading ? 'Configurando... (puede tomar unos segundos)' : 'Activar Notificaciones'}
</Button>
```

---

## Detalles Técnicos

| Aspecto | Detalle |
|---------|---------|
| **Timeout** | 20 segundos para iOS (exponential backoff: 1s + 2s + 4s = 7s mínimo, más tiempo de red) |
| **Patrón** | Promise con resolver externo, similar a Event Emitters |
| **Limpieza** | El timeout se limpia automáticamente al resolver |
| **Thread Safety** | JavaScript es single-threaded, no hay race conditions |

---

## Flujo de Éxito Esperado

1. Usuario toca "Activar Notificaciones"
2. UI muestra "Configurando... (puede tomar unos segundos)"
3. Se solicitan permisos iOS → Usuario acepta
4. Se llama `register()` + se inicia espera de 20s
5. Event `'registration'` dispara con APNs token
6. `getFcmTokenWithRetry` intenta 3 veces (1s, 2s, 4s delays)
7. Token FCM válido obtenido
8. `saveDeviceToken` guarda en DB → éxito
9. `notifyTokenSaved(true)` resuelve la promesa
10. Función retorna `true`
11. UI muestra "Notificaciones activadas" ✓

---

## Beneficios

- **Feedback honesto**: El mensaje de éxito solo aparece cuando el token está realmente guardado
- **Mejor debugging**: Si falla, el usuario ve el error apropiado
- **Timeout de seguridad**: Si algo falla en el proceso nativo, no se queda esperando infinitamente
- **Sin cambios en UX**: El usuario solo espera ~10 segundos una vez, con feedback visual
