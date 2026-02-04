

# Plan: Corregir Flujo de Registro de Push Notifications

## Problema Identificado

El diálogo de "Activar Notificaciones" aparece en la pantalla de login (ANTES de autenticarse). Cuando el usuario da clic en "Activar", el token FCM no se puede guardar porque no hay usuario autenticado.

```
Estado Actual (Incorrecto):
+------------------+     +----------------------+     +------------------+
| Pantalla Login   | --> | Diálogo Activar      | --> | saveDeviceToken  |
| (sin sesión)     |     | Notificaciones       |     | FALLA: !user     |
+------------------+     +----------------------+     +------------------+
                                                            |
                                                            v
                                                      Token perdido
```

---

## Solución

### Cambio 1: Verificar Sesión Antes de Mostrar Diálogo

Modificar `PushNotificationSetup.tsx` para que solo muestre el diálogo si hay usuario autenticado.

**Archivo**: `src/components/PushNotificationSetup.tsx`

```typescript
// AGREGAR: import de supabase
import { supabase } from '@/integrations/supabase/client';

// MODIFICAR: useEffect para verificar sesión
useEffect(() => {
  const checkPermissions = async () => {
    if (!isNativePlatform()) {
      setHasPermission(null);
      return;
    }

    // NUEVO: Verificar que hay usuario autenticado
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      // No mostrar diálogo si no hay sesión
      return;
    }

    const permitted = await checkNotificationPermissions();
    setHasPermission(permitted);

    if (!permitted) {
      const hasSeenPrompt = localStorage.getItem('push_notification_prompt_seen');
      if (!hasSeenPrompt) {
        setTimeout(() => setShowDialog(true), 2000);
      }
    }
  };

  checkPermissions();
  
  // NUEVO: Escuchar cambios de autenticación
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Re-verificar permisos cuando el usuario inicia sesión
        checkPermissions();
      }
    }
  );

  return () => subscription.unsubscribe();
}, []);
```

### Cambio 2: Limpiar Flag al Cerrar Sesión (Opcional)

Para que el diálogo vuelva a aparecer en la próxima sesión si el usuario no activó antes.

**Archivo**: `src/services/pushNotifications.ts` en función `removeDeviceToken`

```typescript
export const removeDeviceToken = async (): Promise<void> => {
  // ... código existente ...
  
  // AGREGAR: Limpiar flag para que se pregunte de nuevo
  localStorage.removeItem('push_notification_prompt_seen');
};
```

---

## Flujo Corregido

```
Flujo Corregido:
+------------------+     +------------------+     +----------------------+     +------------------+
| Pantalla Login   | --> | Usuario Inicia   | --> | Diálogo Activar      | --> | saveDeviceToken  |
|                  |     | Sesión           |     | Notificaciones       |     | EXITO: user.id   |
+------------------+     +------------------+     +----------------------+     +------------------+
                                                                                      |
                                                                                      v
                                                                               Token guardado
                                                                               en device_tokens
```

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/PushNotificationSetup.tsx` | Verificar sesión antes de mostrar diálogo + escuchar auth changes |
| `src/services/pushNotifications.ts` | Limpiar flag al cerrar sesión (opcional) |

---

## Prueba Después de la Corrección

1. Cerrar la app completamente
2. Abrir la app (estarás en pantalla de login - NO debería aparecer el diálogo)
3. Iniciar sesión con tu cuenta admin
4. El diálogo debería aparecer 2 segundos después del login
5. Dar clic en "Activar Notificaciones"
6. Verificar en la base de datos que el token se guardó

---

## Beneficio Adicional

Una vez que esto funcione, las próximas solicitudes de descuento que hagan los vendedores llegarán como push notification a tu dispositivo, incluso con la pantalla bloqueada.

