
# Plan: Arreglar el Plugin FCM en el Proyecto iOS Nativo

## Problema Identificado

El plugin `@capacitor-community/fcm` fue agregado al `package.json` DESPUÉS de que creaste el proyecto iOS. Por eso, aunque existe en npm, nunca se sincronizó al proyecto nativo de Xcode. El `pod install` no puede instalarlo porque Capacitor nunca registró el plugin en el proyecto iOS.

## Solución

Hay dos opciones, ordenadas por recomendación:

---

## Opción A: Regenerar el proyecto iOS (Recomendada)

Esta es la forma más limpia de asegurar que TODOS los plugins estén correctamente enlazados.

### Pasos en tu Mac:

```text
Paso 1: Navegar a la raíz del proyecto
----------------------------------------
cd /ruta/a/sitio-feliz-ya


Paso 2: Eliminar la carpeta iOS actual
----------------------------------------
rm -rf ios


Paso 3: Asegurar que todo está actualizado
----------------------------------------
git pull
npm install


Paso 4: Compilar el proyecto web
----------------------------------------
npm run build


Paso 5: Re-agregar la plataforma iOS
----------------------------------------
npx cap add ios


Paso 6: Sincronizar plugins
----------------------------------------
npx cap sync ios


Paso 7: Verificar que FCM está instalado
----------------------------------------
Deberías ver en la salida:
"Installing CapacitorCommunityFcm"
```

### Después de regenerar:

1. Abrir Xcode con `npx cap open ios`
2. Volver a configurar:
   - Team de firma (Signing & Capabilities)
   - Bundle ID: `com.almasa.erp`
   - Agregar `GoogleService-Info.plist` al proyecto
   - Habilitar capability "Push Notifications"
   - Habilitar capability "Background Modes" (Remote notifications)
3. Los permisos de Info.plist (cámara, ubicación) se pierden y deben reconfigurarse

---

## Opción B: Agregar FCM manualmente al proyecto existente

Si prefieres mantener tu proyecto iOS actual para no perder configuraciones:

### Pasos:

```text
Paso 1: Desde la raíz del proyecto
----------------------------------------
npm install @capacitor-community/fcm
npx cap sync ios


Paso 2: Verificar el Podfile
----------------------------------------
Abrir ios/App/Podfile y verificar que contenga:
pod 'CapacitorCommunityFcm', :path => '../../node_modules/@capacitor-community/fcm'


Paso 3: Si no aparece, agregarlo manualmente
----------------------------------------
Editar ios/App/Podfile y agregar antes del "end":
pod 'CapacitorCommunityFcm', :path => '../../node_modules/@capacitor-community/fcm'


Paso 4: Reinstalar pods
----------------------------------------
cd ios/App
pod deintegrate
pod install --repo-update


Paso 5: Limpiar y rebuild en Xcode
----------------------------------------
- Cmd+Shift+K (Clean Build Folder)
- Correr la app
```

---

## Configuración Adicional Requerida (Ambas Opciones)

Una vez que FCM esté instalado correctamente, necesitas configurar el AppDelegate para que Firebase pueda convertir tokens APNs a FCM:

### Archivo: ios/App/App/AppDelegate.swift

Debe incluir la inicialización de Firebase:

```swift
import UIKit
import Capacitor
import FirebaseCore
import FirebaseMessaging

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Inicializar Firebase
        FirebaseApp.configure()
        
        return true
    }
    
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        // Pasar el token APNs a Firebase para conversión a FCM
        Messaging.messaging().apnsToken = deviceToken
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }
    
    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }
    
    // ... resto de métodos existentes
}
```

---

## Verificación de GoogleService-Info.plist

Asegúrate de que el archivo `GoogleService-Info.plist` de Firebase:
1. Esté agregado al proyecto en Xcode (no solo en la carpeta)
2. Esté incluido en el target "App"
3. Contenga el Bundle ID correcto: `com.almasa.erp`

---

## Después de Implementar

1. **Compilar y ejecutar** en un dispositivo físico (simulador no soporta push)
2. **Ir a la pantalla de diagnóstico** (`/push-diagnostics`)
3. **Correr el diagnóstico** - ahora debería mostrar:
   - "Token FCM válido obtenido"
   - "Token guardado exitosamente en BD"

---

## Tiempo Estimado

| Tarea | Tiempo |
|-------|--------|
| Opción A (regenerar iOS) | 15-20 min |
| Opción B (agregar manual) | 10-15 min |
| Reconfigurar Xcode | 10-15 min |
| Probar en dispositivo | 5 min |

---

## Recomendación

**Usa la Opción A** (regenerar proyecto iOS). Es más limpia y garantiza que todos los plugins estén correctamente enlazados. Perderás las configuraciones de Xcode pero son fáciles de restaurar siguiendo la guía `MOBILE_BUILD_GUIDE.md`.
