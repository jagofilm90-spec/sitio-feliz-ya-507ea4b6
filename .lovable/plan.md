
# Plan: Corregir Fallo de Registro FCM y Permitir Reintentos

## Diagnóstico

El error "No se pudieron activar" indica que el flujo falló en algún punto después de otorgar el permiso iOS:

```text
Usuario toca "Activar" → iOS prompt → Permitir ✅
        ↓
register() llamado ✅
        ↓
waitForTokenSaved(20s) iniciado
        ↓
?? El evento 'registration' nunca disparó notifyTokenSaved() ??
        ↓
Timeout de 20s expiró → retorna false
        ↓
Toast: "No se pudieron activar" ❌
        ↓
localStorage.setItem('push_notification_prompt_seen', 'true') ← PROBLEMA
```

**Causas probables:**
1. El evento `'registration'` de Capacitor no se disparó (problema de configuración nativa)
2. `FCM.getToken()` falló en los 3 reintentos (Firebase SDK no inicializado correctamente)
3. `saveDeviceToken()` falló al escribir en Supabase (problema de red/auth)

**Problema adicional:** El código marca `'push_notification_prompt_seen'` como `'true'` incluso cuando falla, impidiendo reintentos.

---

## Cambios a Implementar

### 1. Permitir Reintentos cuando Falla

**Archivo:** `src/components/PushNotificationSetup.tsx`

Solo marcar como "visto" cuando:
- El usuario **rechaza** explícitamente (botón "Ahora no")
- O el registro es **exitoso**

NO marcar como visto cuando falla técnicamente.

```typescript
// ANTES (líneas 46-53):
} else {
  toast({ ... });
  localStorage.setItem('push_notification_prompt_seen', 'true'); // ← QUITAR
  onComplete?.({ enabled: false });
}

// DESPUÉS:
} else {
  toast({ ... });
  // NO marcar como visto - permitir reintento en próximo login
  onComplete?.({ enabled: false });
}
```

Mismo cambio en el bloque `catch` (línea 62).

### 2. Agregar Más Logging para Diagnóstico

**Archivo:** `src/services/pushNotifications.ts`

Agregar logs detallados para identificar dónde falla exactamente en iOS:

```typescript
// En requestPushPermissionsAndRegister():
console.log('[Push] About to call PushNotifications.register()');
await PushNotifications.register();
console.log('[Push] register() completed, now waiting for registration event...');
```

### 3. Aumentar el Timeout a 30 segundos

El handshake Firebase-APNs puede tomar más tiempo en redes lentas o primera ejecución.

```typescript
// En requestPushPermissionsAndRegister():
const tokenPromise = waitForTokenSaved(30000); // Aumentar a 30s
```

### 4. Agregar Listener de Error de Registro

Capturar errores del evento `'registrationError'` y notificar al resolver:

```typescript
// En setupPushListeners():
PushNotifications.addListener('registrationError', (error) => {
  console.error('[Push] Registration error:', error);
  notifyTokenSaved(false); // ← AGREGAR: notificar fallo inmediatamente
});
```

---

## Resumen de Cambios

| Archivo | Cambio |
|---------|--------|
| `PushNotificationSetup.tsx` | Quitar `localStorage.setItem` en caso de fallo técnico (solo en skip/éxito) |
| `pushNotifications.ts` | Aumentar timeout a 30s |
| `pushNotifications.ts` | Agregar `notifyTokenSaved(false)` en listener de `'registrationError'` |
| `pushNotifications.ts` | Agregar más logs diagnósticos |

---

## Próximos Pasos de Diagnóstico

Después de implementar estos cambios y crear un nuevo build de TestFlight:

1. **Revisar los logs de Safari Web Inspector** conectado al iPhone
2. Buscar mensajes como:
   - `[Push] Registration event received` → El evento sí se disparó
   - `[Push] Attempt X: FCM returned empty token` → Firebase no respondió
   - `[Push] Token save timeout` → Ningún evento resolvió la promesa
   - `[Push] Registration error:` → Error explícito del sistema

3. Si el evento `'registration'` nunca aparece, el problema está en la configuración nativa (Xcode/Firebase) y no en el código web.
