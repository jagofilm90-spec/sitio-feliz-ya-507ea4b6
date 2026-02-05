
Objetivo: que el aviso del iPhone (“ALMASA ERP quiere enviarte notificaciones”) NO aparezca automáticamente al iniciar sesión. Ese aviso solo debe salir cuando el usuario toque explícitamente “Activar Notificaciones” dentro del modal de la app.

## Qué está pasando (según tu captura y tus respuestas)
- Estás en /auth y al iniciar sesión te aparece:
  1) El modal interno “Activar Notificaciones” (tú presionas “Ahora no”)
  2) Aun así, aparece el aviso del iPhone (No permitir / Permitir)
- Ese aviso del iPhone solo puede aparecer si en algún momento se ejecuta `PushNotifications.requestPermissions()`.

En el código actual, `requestPermissions()` vive dentro de `initPushNotifications()`. Aunque “en teoría” solo debería llamarse cuando el usuario toca “Activar Notificaciones”, hoy `initPushNotifications()` también se usa para “inicializar silenciosamente” cuando el sistema cree que ya hay permisos. En iOS esto puede terminar mostrando el prompt en momentos indeseados por diferencias/quirks de estados de permisos (por ejemplo, estados “provisional/prompt” o lecturas inconsistentes).

## Solución (cambio de arquitectura mínimo, pero definitivo)
Separar “registrar y escuchar pushes” de “pedir permiso”.
- Nunca pedir permiso “en automático”.
- Pedir permiso únicamente por acción directa del usuario (botón).

### 1) Refactor del servicio `src/services/pushNotifications.ts`
Crear 2 caminos explícitos:

A) “Silencioso” (NO pide permisos)
- `registerPushNotificationsSilently()`:
  - Solo hace:
    - setup listeners (idempotente, una sola vez)
    - `PushNotifications.register()`
  - Importante: NO llama a `requestPermissions()`
  - Solo se usa cuando el sistema detecta que ya hay permiso otorgado.

B) “Interactivo” (pide permisos y luego registra)
- `requestPushPermissionsAndRegister()`:
  - Llama `PushNotifications.requestPermissions()`
  - Si granted:
    - llama a `registerPushNotificationsSilently()`
  - Si no granted:
    - devuelve `false`

Además:
- Hacer `setupPushListeners()` idempotente con una bandera de módulo (ej. `let listenersReady = false`) para evitar listeners duplicados.

Resultado: aunque el Gate se ejecute en un momento “raro”, jamás disparará el prompt del iPhone por accidente.

### 2) Ajuste del Gate `src/components/PushNotificationsGate.tsx`
Cambios:
- Sustituir `initPushNotifications()` en el branch “Permissions already granted” por `registerPushNotificationsSilently()`.
- Mantener el modal cuando no hay permisos y el usuario no ha visto el prompt interno.
- Agregar una “guardia anti-race” extra:
  - Un `cancelled` flag + un `routeRef` para evitar que un async tardío haga cambios si el usuario ya está en una ruta de auth.
  - Esto evita que un check iniciado “antes” afecte cuando ya estás en /auth.

También corregir la semántica de `initRef`:
- Ya no marcar `initRef.current = true` cuando el usuario presiona “Ahora no”.
- Solo marcar `initRef.current = true` cuando realmente se haya registrado push (para no bloquear registro futuro si el usuario luego decide habilitar).

### 3) Ajuste del modal `src/components/PushNotificationSetup.tsx`
Cambios:
- Cambiar el botón “Activar Notificaciones” para que llame a `requestPushPermissionsAndRegister()` (no a `initPushNotifications()`).
- Mejorar el callback `onComplete` para informar si se habilitó o se omitió, por ejemplo:
  - `onComplete?.({ enabled: boolean })`
- En “Ahora no”:
  - Mantener `localStorage.setItem('push_notification_prompt_seen', 'true')` (para no insistir)
  - Reportar `enabled: false`

### 4) Verificación de backend (solo lectura / sanity check)
Ya revisé que:
- La tabla `device_tokens` tiene RLS habilitado.
- Existe política: “Users can manage own device tokens” con `auth.uid() = user_id`.
Esto significa: cuando el token se reciba (evento `registration`), el upsert debería poder guardarse correctamente si la configuración nativa está bien y el listener se está disparando.

## Cómo vamos a probar (pasos exactos en iPhone)
Caso A: Usuario elige “Ahora no” (no debe salir prompt del iPhone)
1) Instala la nueva build.
2) Inicia sesión.
3) Debe salir el modal interno.
4) Presiona “Ahora no”.
5) Confirmación esperada:
   - No aparece el prompt del iPhone.
   - No se guarda token en `device_tokens`.

Caso B: Usuario habilita (sí debe salir prompt del iPhone, solo al tocar el botón)
1) Borra el flag para pruebas (o reinstala) para volver a ver el modal.
2) Inicia sesión.
3) En el modal presiona “Activar Notificaciones”.
4) Ahora sí debe salir el prompt del iPhone.
5) Presiona “Permitir”.
6) Confirmación esperada:
   - Se dispara el evento `registration`.
   - Se guarda un registro en `device_tokens`.

## Archivos a modificar
- `src/services/pushNotifications.ts`
  - Separar funciones (silencioso vs interactivo)
  - Listeners idempotentes
- `src/components/PushNotificationsGate.tsx`
  - Usar inicialización silenciosa sin pedir permisos
  - Guardias anti-race en async
  - Corregir `initRef` para no marcar “init” en skip
- `src/components/PushNotificationSetup.tsx`
  - Usar función interactiva (request + register)
  - `onComplete` con resultado enabled/false

## Riesgos / Consideraciones
- Si iOS sigue mostrando el prompt aun sin `requestPermissions()`, entonces hay otra fuente que lo dispara (a nivel nativo). Pero con el code search actual, la única llamada está en `pushNotifications.ts`. Esta refactorización elimina por completo cualquier llamada “accidental” desde el Gate.
- Si después de permitir no se guarda token:
  - Siguiente paso será validar el “handshake” nativo (APNs/FCM, capacidades en Xcode) y revisar logs del registro en dispositivo, porque ahí sí ya sería un tema de configuración nativa, no del gating.

## Entregable
- El prompt del iPhone no se mostrará al iniciar sesión si el usuario presiona “Ahora no”.
- El prompt del iPhone solo aparecerá cuando el usuario toque “Activar Notificaciones”.
- La inicialización “silenciosa” no pedirá permisos; solo registrará si ya existen permisos otorgados.
