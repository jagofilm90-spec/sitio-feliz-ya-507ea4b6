
# Plan: Resolver Timeout de Registro Push en iOS

## Diagnóstico del Problema

Los logs muestran claramente el flujo:
```text
22:09:12.545 Llamando PushNotifications.register()...
22:09:12.549 register() completado, esperando evento...
22:09:27.559 ⚠️ Timeout esperando evento de registro (15s)
```

**El problema**: `PushNotifications.register()` se ejecuta pero el evento `registration` nunca llega al JavaScript. Esto ocurre porque **el bridge nativo no está configurado correctamente** para pasar el token de APNs a Capacitor/Firebase.

---

## Causa Raíz

En iOS, el flujo de tokens es:

```text
APNs → AppDelegate.swift → Firebase SDK → Capacitor Plugin → JavaScript
```

Si el evento `registration` no llega, significa que **AppDelegate.swift** no está pasando el token correctamente al Firebase SDK.

---

## Solución: Configurar AppDelegate.swift

Debes abrir el archivo `ios/App/App/AppDelegate.swift` en Xcode y verificar/agregar las siguientes líneas:

### 1. Imports Requeridos (al inicio del archivo)

```swift
import UIKit
import Capacitor
import FirebaseCore
import FirebaseMessaging
```

### 2. En `application(_:didFinishLaunchingWithOptions:)`

Asegúrate de que Firebase se inicialice:

```swift
func application(_ application: UIApplication,
                 didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    // Inicializar Firebase ANTES de todo
    FirebaseApp.configure()
    
    return true
}
```

### 3. Agregar el método crítico para el token

Este es el método que probablemente falta - es **OBLIGATORIO** para que el token llegue a Firebase:

```swift
func application(_ application: UIApplication,
                 didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    // Pasar el token a Firebase Messaging
    Messaging.messaging().apnsToken = deviceToken
    
    // También notificar a Capacitor
    NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, 
                                    object: deviceToken)
}
```

### 4. Agregar manejo de errores

```swift
func application(_ application: UIApplication,
                 didFailToRegisterForRemoteNotificationsWithError error: Error) {
    print("Failed to register for remote notifications: \(error)")
    NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, 
                                    object: error)
}
```

---

## AppDelegate.swift Completo (Referencia)

```swift
import UIKit
import Capacitor
import FirebaseCore
import FirebaseMessaging

@main
class AppDelegate: UIResponder, UIApplicationDelegate {

    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Inicializar Firebase
        FirebaseApp.configure()
        return true
    }

    func application(_ application: UIApplication, 
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        return UISceneConfiguration(name: "Default Configuration", 
                                    sessionRole: connectingSceneSession.role)
    }

    func application(_ application: UIApplication, 
                     didDiscardSceneSessions sceneSessions: Set<UISceneSession>) {
    }

    // CRÍTICO: Pasar token APNs a Firebase
    func application(_ application: UIApplication,
                     didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Messaging.messaging().apnsToken = deviceToken
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, 
                                        object: deviceToken)
    }

    // Manejo de errores de registro
    func application(_ application: UIApplication,
                     didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("Failed to register: \(error)")
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, 
                                        object: error)
    }
}
```

---

## Pasos para Aplicar

1. **Abrir Xcode**:
   ```bash
   npx cap open ios
   ```

2. **Navegar a AppDelegate.swift**:
   - En el navegador izquierdo: `App → App → AppDelegate.swift`

3. **Verificar/agregar los imports** de Firebase

4. **Agregar el método `didRegisterForRemoteNotificationsWithDeviceToken`** si no existe

5. **Compilar y ejecutar**:
   - Product → Clean Build Folder (⇧⌘K)
   - Product → Run (⌘R)

6. **Ejecutar diagnóstico nuevamente** en la app

---

## Verificación

Después de aplicar los cambios, el diagnóstico debería mostrar:

```text
📱 Evento "registration" recibido
Token raw recibido (length=...)
iOS detectado - intentando obtener token FCM...
✅ Token FCM válido obtenido
✅ Token guardado exitosamente en BD
```

---

## Checklist Adicional

- [ ] **GoogleService-Info.plist** está en el target App
- [ ] **Capability "Push Notifications"** está habilitada
- [ ] **Capability "Background Modes" → Remote notifications** está marcada
- [ ] El archivo **.p8 (APNs Key)** está configurado en Firebase Console
