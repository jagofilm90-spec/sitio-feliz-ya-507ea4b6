
# Plan de Diagnóstico y Corrección: Registro de Tokens Push en iOS

## Resumen del Problema

El usuario intenta activar notificaciones push pero recibe el error "No se pudieron activar". A pesar de que iOS tiene los permisos correctamente habilitados, el token del dispositivo **no se está guardando en la base de datos**.

## Análisis Técnico

### Lo que está funcionando
| Componente | Estado | Verificación |
|------------|--------|--------------|
| Permisos iOS | ✅ Correcto | Captura de pantalla muestra todos los switches activos |
| Tabla `device_tokens` | ✅ Existe | Esquema verificado con columnas correctas |
| RLS Policies | ✅ Correctas | `auth.uid() = user_id` para usuarios propios |
| Edge Function | ✅ Desplegada | `send-push-notification` con FCM V1 |
| Firebase Secret | ✅ Configurado | `FIREBASE_SERVICE_ACCOUNT` existe |

### Lo que está fallando
| Componente | Estado | Evidencia |
|------------|--------|-----------|
| Tabla `device_tokens` | ❌ Vacía | Query retorna 0 registros |
| Token FCM | ❌ No obtenido | El flujo falla antes de guardar |

### Punto de falla probable

El código en `pushNotifications.ts` líneas 101-112 intenta:
1. Detectar iOS → Llamar `FCM.getToken()` con reintentos
2. Si falla después de 3 intentos → Llama `notifyTokenSaved(false)` → UI muestra error

El problema está en **la configuración nativa del proyecto Xcode** que no está correctamente sincronizada para el bridge APNs → FCM.

---

## Correcciones Requeridas

### Parte 1: Verificación del Proyecto Nativo (Xcode - Manual)

El usuario debe verificar en su máquina local que el proyecto iOS tenga:

1. **GoogleService-Info.plist**
   - Ubicación: Raíz del proyecto iOS en Xcode
   - Origen: Firebase Console → Project Settings → iOS app → Descargar

2. **Firebase SDK instalado**
   - Xcode → File → Add Package Dependencies
   - URL: `https://github.com/firebase/firebase-ios-sdk`
   - Paquetes requeridos: `FirebaseCore`, `FirebaseMessaging`

3. **AppDelegate.swift modificado**
   ```swift
   import UIKit
   import Capacitor
   import FirebaseCore
   import FirebaseMessaging

   @UIApplicationMain
   class AppDelegate: UIResponder, UIApplicationDelegate {
       
       func application(_ application: UIApplication, 
                        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
           FirebaseApp.configure()
           return true
       }
       
       // CRÍTICO: Mapear token APNs a FCM
       func application(_ application: UIApplication, 
                        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
           Messaging.messaging().apnsToken = deviceToken
       }
   }
   ```

4. **Capabilities en Xcode**
   - Signing & Capabilities → Push Notifications ✅
   - Signing & Capabilities → Background Modes → Remote notifications ✅

---

### Parte 2: Mejora del Código (Lovable)

Agregar **logging más detallado** para identificar exactamente dónde falla el flujo en dispositivos reales.

#### Archivo: `src/services/pushNotifications.ts`

Cambios propuestos:

1. **Mejorar logs en `getFcmTokenWithRetry`** para mostrar errores específicos de iOS
2. **Agregar timeout más largo** para el primer intento (iOS a veces tarda más en el handshake inicial)
3. **Agregar fallback de diagnóstico** que muestre en consola qué paso exacto falló

```text
// Cambios específicos:
// Línea 51-52: Aumentar delay inicial a 2s para primer intento
// Línea 55-70: Agregar try-catch más específico con mensaje del error nativo
// Línea 97-112: Agregar logging del token crudo recibido para diagnóstico
```

---

### Parte 3: Checklist de Diagnóstico

Después de aplicar los cambios, el usuario debe:

1. **Reconstruir la app nativa**
   ```bash
   npm run build
   npx cap sync ios
   npx cap open ios
   ```

2. **Incrementar versión** en Xcode (General → Version y Build)

3. **Archivar y subir** a TestFlight

4. **Probar en dispositivo físico** (simulador no soporta push)

5. **Revisar logs** en Xcode Console durante la activación

---

## Resumen de Acciones

| # | Acción | Responsable | Tipo |
|---|--------|-------------|------|
| 1 | Verificar GoogleService-Info.plist en Xcode | Usuario | Manual |
| 2 | Verificar Firebase SDK instalado | Usuario | Manual |
| 3 | Verificar AppDelegate.swift con Firebase init | Usuario | Manual |
| 4 | Mejorar logging en pushNotifications.ts | Lovable | Código |
| 5 | Reconstruir y subir nueva versión a TestFlight | Usuario | Manual |
| 6 | Probar activación y revisar logs de Xcode | Usuario | Manual |

---

## Pregunta Crítica

**Antes de proceder con cambios de código**, necesito confirmar:

¿El proyecto de Xcode tiene estos elementos configurados?
- [ ] GoogleService-Info.plist importado
- [ ] Firebase SDK agregado via Swift Package Manager
- [ ] AppDelegate.swift con `FirebaseApp.configure()` y `Messaging.messaging().apnsToken = deviceToken`

Si alguno falta, ese es el origen del problema y debe corregirse en el proyecto nativo primero.
