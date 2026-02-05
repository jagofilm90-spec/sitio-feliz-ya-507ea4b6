
# Plan: Corregir Generación de Token FCM en iOS

## Problema Identificado

El token que se genera actualmente en iOS es un **token APNs nativo**, pero el edge function `send-push-notification` usa la API de **Firebase Cloud Messaging (FCM)** que requiere un **token FCM**.

### Flujo Actual (Roto)
```text
iOS Device → APNs Token (crudo) → Se guarda en device_tokens → Edge Function intenta enviar con FCM → ❌ Falla
```

### Flujo Correcto
```text
iOS Device → APNs Token → Firebase SDK convierte a FCM Token → Se guarda en device_tokens → Edge Function envía con FCM → ✅ Funciona
```

---

## Solución Recomendada: Integrar Firebase SDK en iOS

### Pasos Requeridos (100% en el proyecto nativo de Xcode)

#### 1. Instalar el plugin `@capacitor-community/fcm`
Este plugin convierte automáticamente el token APNs a FCM.

```bash
npm install @capacitor-community/fcm
npx cap sync ios
```

#### 2. Agregar Firebase SDK a tu proyecto iOS
En Xcode, agregar el Swift Package de Firebase:
- File → Add Packages
- URL: `https://github.com/firebase/firebase-ios-sdk`
- Seleccionar: `FirebaseMessaging`

#### 3. Modificar `AppDelegate.swift` en Xcode
```swift
import UIKit
import Capacitor
import FirebaseCore
import FirebaseMessaging

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Configurar Firebase
        FirebaseApp.configure()
        
        return true
    }

    // Convertir token APNs a FCM
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Messaging.messaging().apnsToken = deviceToken
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }
}
```

#### 4. Actualizar el código TypeScript para usar FCM
Modificar `src/services/pushNotifications.ts` para obtener el token FCM en lugar del APNs:

```typescript
import { FCM } from '@capacitor-community/fcm';

// En el listener de registration:
PushNotifications.addListener('registration', async (token: Token) => {
  // En iOS, convertir a FCM token
  if (Capacitor.getPlatform() === 'ios') {
    try {
      const fcmToken = await FCM.getToken();
      console.log('[Push] FCM Token (iOS):', fcmToken.token);
      await saveDeviceToken(fcmToken.token);
    } catch (e) {
      console.error('[Push] Error getting FCM token:', e);
    }
  } else {
    // Android ya retorna FCM token directamente
    await saveDeviceToken(token.value);
  }
});
```

#### 5. Subir nuevo build a TestFlight
Después de los cambios nativos:
```bash
npx cap sync ios
```
Luego en Xcode: incrementar version/build, Archive, y subir a TestFlight.

---

## Resumen de Cambios

| Área | Cambio |
|------|--------|
| **package.json** | Agregar `@capacitor-community/fcm` |
| **pushNotifications.ts** | Importar FCM y obtener token FCM en iOS |
| **AppDelegate.swift** (Xcode) | Configurar Firebase y pasar token a Messaging |
| **Xcode Package** | Agregar Firebase iOS SDK |
| **TestFlight** | Nuevo build con cambios nativos |

---

## Notas Técnicas

- El plugin `@capacitor/push-notifications` en iOS solo retorna el token APNs crudo
- Firebase Cloud Messaging API V1 (que usa tu edge function) requiere tokens FCM
- El plugin `@capacitor-community/fcm` hace el "swap" de APNs → FCM automáticamente
- En Android esto no es problema porque el plugin ya retorna FCM tokens directamente
