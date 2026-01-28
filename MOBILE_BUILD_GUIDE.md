# ALMASA ERP - Guía de Compilación de Apps Móviles

## Descripción General

Este proyecto usa **Capacitor** para compilar apps nativas de iOS y Android a partir del código web existente. La misma base de código genera tres experiencias diferentes según el rol del usuario:

| Dispositivo | Plataforma | Rol | Ruta Principal |
|-------------|------------|-----|----------------|
| iPad (Admin) | iOS | Administrador | `/dashboard` |
| Galaxy Tab | Android | Almacenista | `/almacen-tablet` |
| Celulares | Android | Choferes | `/chofer` |

---

## Requisitos Previos

### Software Requerido

- **Node.js** v18 o superior
- **npm** o **yarn**
- **Git**

### Para iOS (obligatorio Mac)

- **macOS** (Monterey o superior recomendado)
- **Xcode** 14+ (desde App Store)
- **Xcode Command Line Tools**: `xcode-select --install`
- **CocoaPods**: `sudo gem install cocoapods`

### Para Android

- **Android Studio** (última versión estable)
- **Android SDK** (se instala con Android Studio)
- **Java Development Kit (JDK)** 11 o superior

---

## Configuración Inicial (Primera Vez)

### 1. Clonar el Repositorio

```bash
git clone https://github.com/tu-usuario/almasa-erp.git
cd almasa-erp
```

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Agregar Plataformas

```bash
# Para iOS
npx cap add ios

# Para Android
npx cap add android
```

### 4. Compilar el Proyecto Web

```bash
npm run build
```

### 5. Sincronizar con Plataformas Nativas

```bash
npx cap sync
```

---

## Compilación iOS

### Abrir en Xcode

```bash
npx cap open ios
```

### Configuración en Xcode

1. **Seleccionar Team**: 
   - Ve a `App` en el navegador del proyecto
   - En "Signing & Capabilities", selecciona tu Apple Developer Team

3. **Configurar Bundle Identifier**:
   - Debe coincidir con `com.almasa.erp`

4. **Configurar Permisos de Cámara y Galería** (Info.plist) - **CRÍTICO**:
   
   > ⚠️ **Sin estos permisos, la app crasheará al intentar tomar fotos y Apple rechazará la app.**
   
   ```xml
   <key>NSCameraUsageDescription</key>
   <string>ALMASA necesita acceso a la cámara para capturar evidencias de carga, fotos de documentos de vehículos y comprobantes de pago.</string>
   
   <key>NSPhotoLibraryUsageDescription</key>
   <string>ALMASA necesita acceso a tu galería para seleccionar fotos de documentos y evidencias.</string>
   ```

5. **Configurar Permisos de Ubicación** (Info.plist):
   ```xml
   <key>NSLocationWhenInUseUsageDescription</key>
   <string>ALMASA necesita tu ubicación para mostrar tu posición en la ruta de entregas.</string>
   
   <key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
   <string>ALMASA necesita acceso continuo a tu ubicación para que el administrador pueda monitorear el progreso de tu ruta de entregas en tiempo real, incluso cuando cambies de app o bloquees la pantalla.</string>
   ```

6. **Configurar Background Modes** (Info.plist):
   ```xml
   <key>UIBackgroundModes</key>
   <array>
     <string>location</string>
     <string>remote-notification</string>
   </array>
   ```

7. **Habilitar Push Notifications**:
   - En "Signing & Capabilities", click en "+ Capability"
   - Agregar "Push Notifications"
   - Agregar "Background Modes" → marcar "Remote notifications" y "Location updates"

### Ejecutar en Dispositivo

1. Conectar iPad vía USB
2. Seleccionar el iPad en la barra de dispositivos
3. Presionar ▶ (Cmd + R)

### Generar Build de Distribución

1. Product → Archive
2. En Organizer: Distribute App → App Store Connect / Ad Hoc

---

## Compilación Android

### Abrir en Android Studio

```bash
npx cap open android
```

### Configuración en Android Studio

1. **Esperar sincronización de Gradle** (puede tardar varios minutos la primera vez)

2. **Verificar Permisos** (AndroidManifest.xml - ya incluidos):
   ```xml
   <!-- Permisos de ubicación -->
   <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
   <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
   <uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
   
   <!-- Permisos para servicio en primer plano (requerido para GPS en segundo plano) -->
   <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
   <uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
   
   <!-- Internet -->
   <uses-permission android:name="android.permission.INTERNET" />
   ```

3. **Configurar Firebase** (para Push Notifications):
   - Crear proyecto en Firebase Console
   - Descargar `google-services.json`
   - Colocar en `android/app/google-services.json`

### Habilitar Developer Mode en Dispositivo

1. Ir a Configuración → Acerca del teléfono
2. Tocar "Número de compilación" 7 veces
3. Volver a Configuración → Opciones de desarrollador
4. Habilitar "Depuración USB"

### Ejecutar en Dispositivo

1. Conectar dispositivo vía USB
2. Aceptar solicitud de depuración en el dispositivo
3. Seleccionar dispositivo en Android Studio
4. Presionar ▶ Run 'app'

### Generar APK de Debug

```bash
cd android
./gradlew assembleDebug
```

APK generado en: `android/app/build/outputs/apk/debug/app-debug.apk`

### Generar APK de Release (Firmado)

1. Build → Generate Signed Bundle / APK
2. Seleccionar APK
3. Crear o seleccionar keystore
4. Completar información de firma
5. Seleccionar "release" build variant

---

## Flujo de Actualización

Cada vez que hay cambios en el código y quieres actualizar las apps:

```bash
# 1. Obtener últimos cambios
git pull origin main

# 2. Instalar nuevas dependencias (si las hay)
npm install

# 3. Compilar proyecto web
npm run build

# 4. Sincronizar con plataformas nativas
npx cap sync

# 5. Abrir y compilar en IDE
npx cap open ios    # o android
```

### Comando Rápido (Todo en Uno)

```bash
git pull && npm install && npm run build && npx cap sync
```

---

## Configuración de Capacitor

El archivo `capacitor.config.ts` contiene la configuración principal:

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.almasa.erp',
  appName: 'ALMASA ERP',
  webDir: 'dist',
  server: {
    // Hot reload desde servidor de desarrollo
    url: 'https://0a4fe6f2-67d5-4980-a499-e679897a2f15.lovableproject.com?forceHideBadge=true',
    cleartext: true
  }
};

export default config;
```

### Para Build de Producción (Sin Hot Reload)

Comentar o eliminar la sección `server` para que la app use los archivos locales:

```typescript
const config: CapacitorConfig = {
  appId: 'com.almasa.erp',
  appName: 'ALMASA ERP',
  webDir: 'dist',
  // server: { ... } // Comentado para producción
};
```

---

## Push Notifications

### Configuración Firebase (Android)

1. Crear proyecto en [Firebase Console](https://console.firebase.google.com/)
2. Agregar app Android con package name: `com.almasa.erp`
3. Descargar `google-services.json`
4. Colocar en `android/app/`
5. Obtener Server Key para usar en Edge Functions

### Configuración APNs (iOS)

1. En Apple Developer Portal, crear Push Notification Key
2. Descargar archivo .p8
3. Configurar en Firebase o servidor de push

---

## Solución de Problemas

### Error: Crash al usar cámara (NSCameraUsageDescription) - **CRÍTICO**

Si la app crashea al intentar tomar fotos o Apple rechaza la app con este mensaje:

```
"This app has crashed because it attempted to access privacy-sensitive data 
without a usage description. The app's Info.plist must contain an 
NSCameraUsageDescription key..."
```

**Solución:**
1. Abrir el proyecto en Xcode: `npx cap open ios`
2. Ir a `App > App > Info.plist`
3. Click derecho > "Add Row"
4. Agregar `Privacy - Camera Usage Description` con valor:
   - "ALMASA necesita acceso a la cámara para capturar evidencias de carga, fotos de documentos de vehículos y comprobantes de pago."
5. Agregar `Privacy - Photo Library Usage Description` con valor:
   - "ALMASA necesita acceso a tu galería para seleccionar fotos de documentos y evidencias."
6. Recompilar: `npm run build && npx cap sync`
7. En Xcode: Product > Archive > Distribute App

### Error: "Could not find a storyboard..."

```bash
cd ios/App
pod install
```

### Error: Gradle sync failed

```bash
cd android
./gradlew clean
./gradlew build
```

### Error: Device not found

- Verificar que el dispositivo esté conectado
- Verificar que USB Debugging esté habilitado
- Probar diferente cable USB

### Error: Code signing

- Verificar Team seleccionado en Xcode
- Verificar que el Bundle ID coincida con el registrado en Apple Developer

---

## GPS Tracking en Segundo Plano (v1.1+)

A partir de la versión 1.1, la app utiliza `@capacitor-community/background-geolocation` para tracking GPS continuo de los choferes, incluso cuando la app está en segundo plano.

### Características

| Característica | Descripción |
|----------------|-------------|
| **Tracking continuo** | Funciona con la app minimizada o pantalla bloqueada |
| **Notificación persistente** | Android muestra notificación mientras tracking está activo |
| **Bajo consumo** | Solo actualiza cuando hay movimiento significativo (50m) |
| **Permisos claros** | Solicita permisos con explicación del propósito |

### Configuración Requerida

#### iOS

En `Info.plist`, asegurarse de tener:
- `NSLocationAlwaysAndWhenInUseUsageDescription` - Justificación para Apple
- `UIBackgroundModes` con `location` habilitado

#### Android

En `AndroidManifest.xml`, asegurarse de tener:
- `ACCESS_BACKGROUND_LOCATION` - Para Android 10+
- `FOREGROUND_SERVICE_LOCATION` - Para Android 14+

### Flujo de Usuario

1. Chofer abre la app y tiene ruta asignada
2. App muestra diálogo explicando por qué necesita ubicación
3. Chofer acepta → tracking inicia automáticamente
4. Notificación aparece (Android) indicando tracking activo
5. Al finalizar ruta → tracking se detiene automáticamente

### Solución de Problemas GPS

#### "Ubicación no disponible"
- Verificar que GPS del dispositivo esté encendido
- Salir a un área abierta (mejor señal GPS)

#### "Permiso denegado"
- Ir a Configuración > Apps > ALMASA ERP > Permisos > Ubicación
- Seleccionar "Permitir siempre"

#### Tracking no funciona en segundo plano
- iOS: Verificar que "Background App Refresh" esté habilitado
- Android: Desactivar optimización de batería para ALMASA ERP

---

## Rutas de la Aplicación

| Ruta | Descripción | Rol Requerido |
|------|-------------|---------------|
| `/auth` | Login | Público |
| `/dashboard` | Panel principal | Admin, Secretaria |
| `/almacen-tablet` | Interfaz de carga | Almacén |
| `/chofer` | Panel del chofer | Chofer |
| `/pedidos` | Gestión de pedidos | Admin, Secretaria |
| `/rutas` | Planificación de rutas | Admin, Secretaria |
| `/inventario` | Gestión de inventario | Admin, Almacén |

---

## Contacto y Soporte

Para problemas con la compilación, consultar:
- [Documentación de Capacitor](https://capacitorjs.com/docs)
- [Foro de Ionic/Capacitor](https://forum.ionicframework.com/)
- [Plugin Background Geolocation](https://github.com/capacitor-community/background-geolocation)
