
## Plan: Corregir el flujo de obtención del token FCM en iOS

### Problema Identificado
El token que se está guardando en la base de datos es el **token APNs nativo** (formato hexadecimal de 64 caracteres), pero Firebase Cloud Messaging requiere un **token FCM** (formato largo con caracteres alfanuméricos).

**Token actual guardado:**
```
14CF17D9462E8A2C222FF3CB1EE183B76978D4A5E2353A385FBDC1D2A245947E
```

**Token FCM esperado (ejemplo):**
```
dQw4w9WgXcQ:APA91bGpzYfR2F8j...
```

### Causa Raíz
Cuando el código llama a `FCM.getToken()` inmediatamente después del registro, Firebase aún no ha completado el mapeo del token APNs al token FCM. Por eso falla y el código cae al fallback que guarda el token APNs incorrecto.

### Solución Propuesta

#### 1. Agregar un delay y reintentos para obtener el token FCM

Modificar la lógica en `src/services/pushNotifications.ts` para:
- Esperar un momento antes de intentar obtener el token FCM
- Implementar reintentos con backoff exponencial
- Solo guardar el token si tiene el formato FCM correcto (no hexadecimal)

```text
// Pseudo-código del cambio
PushNotifications.addListener('registration', async (token: Token) => {
  if (Capacitor.getPlatform() === 'ios') {
    // Esperar a que Firebase procese el token APNs
    await delay(1000);
    
    // Intentar obtener FCM token con reintentos
    for (let i = 0; i < 3; i++) {
      try {
        const fcmToken = await FCM.getToken();
        // Validar que no sea un token APNs (hex)
        if (!isHexToken(fcmToken.token)) {
          await saveDeviceToken(fcmToken.token);
          return;
        }
      } catch (e) {
        await delay(1000 * (i + 1)); // Backoff
      }
    }
    console.error('No se pudo obtener token FCM válido');
  }
});
```

#### 2. Agregar validación de formato de token

Crear una función helper para validar que el token tenga formato FCM y no APNs:

```text
// Tokens APNs son hexadecimales de 64 caracteres
const isApnsToken = (token: string): boolean => {
  return /^[0-9A-Fa-f]{64}$/.test(token);
};
```

#### 3. Limpiar tokens inválidos existentes

Eliminar el token APNs incorrecto de la base de datos para que se registre uno nuevo con el formato correcto.

---

### Pasos de Implementación

| Paso | Descripción |
|------|-------------|
| 1 | Modificar `pushNotifications.ts` para agregar delay y reintentos |
| 2 | Agregar validación de formato de token |
| 3 | Eliminar el token APNs inválido de la base de datos |
| 4 | Publicar cambios y sincronizar con la app nativa |
| 5 | Reinstalar la app y activar notificaciones nuevamente |
| 6 | Verificar que el token FCM correcto se guarde |

---

### Sección Técnica

**Cambios en archivo:**
- `src/services/pushNotifications.ts`: Modificar el listener de registro para iOS

**Dependencias:**
- No se requieren nuevas dependencias

**Prueba de verificación:**
- Después de la implementación, el token guardado debería tener un formato tipo `xxx:APA91b...` en lugar del formato hexadecimal actual
