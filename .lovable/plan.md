
# Plan: Habilitar Notificaciones Push en Background para iOS

## Diagnóstico

Las notificaciones llegan cuando la app está **abierta** (foreground) porque el código web (`handleForegroundNotification`) las muestra como toast. 

Pero cuando la app está **cerrada o en background**, iOS requiere un payload específico de APNs para mostrar las notificaciones en la pantalla de bloqueo. Actualmente falta el campo `content-available` y `mutable-content`.

## Cambio Requerido

**Archivo:** `supabase/functions/send-push-notification/index.ts`

Modificar la configuración de APNs (líneas 217-226) para incluir los campos que iOS necesita para notificaciones en background:

```typescript
// ANTES:
} else if (device.platform === 'ios') {
  message.message.apns = {
    payload: {
      aps: {
        sound: 'default',
        badge: 1,
      }
    }
  };
}

// DESPUÉS:
} else if (device.platform === 'ios') {
  message.message.apns = {
    headers: {
      'apns-priority': '10',        // Alta prioridad - entrega inmediata
      'apns-push-type': 'alert',    // Tipo de push visible
    },
    payload: {
      aps: {
        alert: {
          title: title,
          body: body,
        },
        sound: 'default',
        badge: 1,
        'content-available': 1,     // Permite entrega en background
        'mutable-content': 1,       // Permite modificar la notificación
      }
    }
  };
}
```

## Explicación Técnica

| Campo | Propósito |
|-------|-----------|
| `apns-priority: 10` | Prioridad alta - iOS entrega inmediatamente incluso si el dispositivo está en modo ahorro de energía |
| `apns-push-type: alert` | Indica a iOS que es una notificación visible (no silenciosa) |
| `alert.title/body` | Duplica el contenido dentro del payload APNs para iOS nativo |
| `content-available: 1` | Permite que iOS entregue la notificación aunque la app esté cerrada |
| `mutable-content: 1` | Permite que iOS modifique/procese la notificación antes de mostrarla |

## Verificación Nativa en Xcode

Además del cambio en el código, verifica en Xcode que tengas habilitado:

1. **Signing & Capabilities** → **Background Modes** → ✅ Remote notifications
2. **Signing & Capabilities** → **Push Notifications** → ✅ Habilitado

Si estos no están habilitados, la app no puede recibir notificaciones en background aunque el payload sea correcto.

## Próximos Pasos

1. Implementar el cambio en el edge function (automático)
2. En Xcode: verificar que "Remote notifications" esté habilitado en Background Modes
3. Hacer nuevo build de TestFlight con esa configuración
4. Probar enviando una notificación con el celular bloqueado
