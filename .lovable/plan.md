
# Plan: Pantalla de Diagnóstico de Push Notifications

## Problema Actual
Las notificaciones push en iOS no están guardando el token en la base de datos. El proceso de depuración actual requiere Safari Web Inspector, que solo funciona con builds de Xcode (debug), no con TestFlight.

## Solución Propuesta
Crear una pantalla de diagnóstico dentro de la app que muestre:
- Estado de cada paso del proceso de registro
- Logs en tiempo real del proceso
- Botón para reintentar el registro
- Estado de permisos del sistema
- Información del token (si existe)

---

## Cambios a Realizar

### 1. Crear componente de diagnóstico
**Archivo:** `src/components/configuracion/PushNotificationDiagnostics.tsx`

Nuevo componente que mostrará:
- Estado de la plataforma (iOS/Android/Web)
- Estado de permisos del sistema
- Token actual guardado en la base de datos (si existe)
- Logs del proceso en tiempo real
- Botón "Probar Registro" que ejecuta el proceso completo y muestra cada paso
- Botón "Limpiar y Reintentar" que borra el flag `push_notification_prompt_seen`

### 2. Agregar servicio de diagnóstico
**Archivo:** `src/services/pushNotifications.ts`

Agregar funciones de diagnóstico:
- `runPushDiagnostics()`: Ejecuta el proceso completo con logs detallados
- `getDiagnosticLogs()`: Retorna los logs acumulados
- `clearDiagnosticLogs()`: Limpia los logs
- `getDeviceTokenFromDb()`: Verifica si hay un token guardado en la BD

### 3. Agregar sección en Configuracion Sistema
**Archivo:** `src/components/configuracion/ConfigSistemaTab.tsx`

Agregar una nueva Card "Notificaciones Push" que:
- Muestra el estado actual (habilitadas/deshabilitadas)
- Enlace a la pantalla de diagnóstico completa
- Solo visible en plataformas nativas (iOS/Android)

---

## Detalles Técnicos

### Estructura del Diagnóstico

```text
+----------------------------------------+
|  DIAGNOSTICO PUSH NOTIFICATIONS        |
+----------------------------------------+
|  Plataforma: iOS                       |
|  Es Nativo: Si                         |
|  Permisos Sistema: Concedidos          |
|  Token en BD: No encontrado     <-- problema
|  Prompt Mostrado: Si                   |
+----------------------------------------+
|  [Ejecutar Diagnostico Completo]       |
|  [Limpiar Flag y Reintentar]           |
+----------------------------------------+
|  LOGS EN TIEMPO REAL:                  |
|  > Iniciando proceso...                |
|  > Permisos: granted                   |
|  > Llamando register()...              |
|  > Registration event recibido         |
|  > Token APNs detectado (invalido)     |
|  > Intentando FCM.getToken()...        |
|  > ERROR: timeout esperando FCM        |
+----------------------------------------+
```

### Flujo del Diagnóstico

1. Verificar si estamos en plataforma nativa
2. Verificar estado de permisos del sistema
3. Verificar si hay token guardado en la BD para el usuario actual
4. Verificar el flag `push_notification_prompt_seen`
5. Al presionar "Ejecutar Diagnóstico":
   - Llamar `PushNotifications.register()`
   - Capturar evento `registration` con el token raw
   - Si es iOS, intentar `FCM.getToken()` y mostrar resultado
   - Intentar guardar en BD y mostrar resultado
   - Mostrar cada paso con timestamps

### Acceso al Diagnóstico
- Desde Configuracion → Sistema → Card "Notificaciones Push"
- Solo visible cuando `isNativePlatform()` retorna true
- Accesible para roles: admin

---

## Resultado Esperado
Con esta herramienta podrás:
1. Ver exactamente en qué paso falla el proceso
2. Determinar si el problema es de permisos, Firebase, o base de datos
3. Reintentar el proceso sin necesidad de reinstalar la app
4. Todo esto sin necesidad de Safari Web Inspector o Xcode

Una vez implementado, podrás tocar "Ejecutar Diagnóstico" y ver en pantalla qué está pasando.
