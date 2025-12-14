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

2. **Configurar Bundle Identifier**:
   - Debe coincidir con `com.almasa.erp`

3. **Configurar Permisos** (Info.plist):
   ```xml
   <key>NSLocationWhenInUseUsageDescription</key>
   <string>ALMASA necesita tu ubicación para mostrar tu posición en la ruta de entregas.</string>
   
   <key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
   <string>ALMASA necesita tu ubicación en segundo plano para tracking continuo de rutas.</string>
   ```

4. **Habilitar Push Notifications**:
   - En "Signing & Capabilities", click en "+ Capability"
   - Agregar "Push Notifications"
   - Agregar "Background Modes" → marcar "Remote notifications"

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

2. **Configurar Permisos** (ya incluidos en AndroidManifest.xml):
   ```xml
   <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
   <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
   <uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
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
