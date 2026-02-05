
# Guía Completa: Configurar Push Notifications para iOS

## Resumen del Problema
Tu backend (Lovable) ya está listo: el código web guarda tokens y la Edge Function `send-push-notification` usa Firebase FCM V1. El problema es que **la app iOS no genera tokens** porque falta la configuración nativa de Firebase + APNs en Xcode.

---

## Lo Que Ya Tienes ✅

| Componente | Estado |
|------------|--------|
| Edge Function `send-push-notification` | ✅ Funcionando |
| Secret `FIREBASE_SERVICE_ACCOUNT` | ✅ Configurado |
| Tabla `device_tokens` en BD | ✅ Existe (pero vacía) |
| Código web para guardar tokens | ✅ Implementado |
| Capability "Push Notifications" en Xcode | ✅ Activado |
| `MOBILE_BUILD_GUIDE.md` con instrucciones | ✅ Existe |

---

## Lo Que Falta ❌ (Configuración en Xcode/Apple/Firebase)

```text
┌────────────────────────────────────────────────────────────────┐
│                    PASOS PENDIENTES                            │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│   PASO 1: Apple Developer Portal                              │
│   ├─ Crear APNs Authentication Key (.p8)                      │
│   └─ Descargar el archivo (solo 1 vez)                        │
│                                                                │
│   PASO 2: Firebase Console                                    │
│   ├─ Verificar/crear app iOS (Bundle: com.almasa.erp)         │
│   ├─ Subir APNs Key (.p8) a Cloud Messaging                   │
│   └─ Descargar GoogleService-Info.plist                       │
│                                                                │
│   PASO 3: Xcode                                               │
│   ├─ Agregar GoogleService-Info.plist al proyecto             │
│   ├─ Verificar Background Modes: Remote notifications         │
│   └─ Recompilar y subir a TestFlight                          │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## Instrucciones Detalladas

### PASO 1: Crear APNs Key en Apple Developer

1. Ir a [Apple Developer - Keys](https://developer.apple.com/account/resources/authkeys/list)
2. Click en el botón azul **"+"** para crear una nueva key
3. Configurar:
   - **Key Name**: `ALMASA Push Key`
   - **Enable**: ✅ Apple Push Notifications service (APNs)
4. Click **Continue** → **Register**
5. **IMPORTANTE**: Descargar el archivo `.p8` (solo puedes descargarlo UNA vez)
6. Anotar estos datos:
   - **Key ID**: (10 caracteres, ej: `ABC123DEFG`)
   - **Team ID**: (lo ves en la esquina superior derecha de Apple Developer)

---

### PASO 2: Configurar Firebase

#### 2A. Verificar/Crear App iOS en Firebase

1. Ir a [Firebase Console](https://console.firebase.google.com/)
2. Seleccionar tu proyecto (el mismo del `FIREBASE_SERVICE_ACCOUNT`)
3. Click en el ícono de engranaje ⚙️ → **Project Settings**
4. En la sección **Your apps**, buscar la app iOS
   - Si NO existe: Click **Add app** → iOS → Bundle ID: `com.almasa.erp`
   - Si SÍ existe: Verificar que el Bundle ID sea `com.almasa.erp`

#### 2B. Subir APNs Key a Firebase

1. En Project Settings → **Cloud Messaging** (pestaña)
2. Scroll a **Apple app configuration**
3. En **APNs Authentication Key**, click **Upload**
4. Subir:
   - El archivo `.p8` que descargaste
   - El **Key ID** (10 caracteres)
   - Tu **Team ID**

#### 2C. Descargar GoogleService-Info.plist

1. En Project Settings → **General** (pestaña)
2. En tu app iOS, click el botón **GoogleService-Info.plist**
3. Descargar el archivo

---

### PASO 3: Configurar Xcode

#### 3A. Agregar GoogleService-Info.plist

1. Abrir el proyecto iOS:
   ```bash
   npx cap open ios
   ```
2. En Xcode, arrastrar `GoogleService-Info.plist` a la carpeta `App/App` (junto a Info.plist)
3. En el diálogo que aparece:
   - ✅ Copy items if needed
   - ✅ Add to targets: App
4. Click **Finish**

#### 3B. Verificar Capabilities

En Xcode → Target `App` → **Signing & Capabilities**:

| Capability | Estado Requerido |
|------------|------------------|
| Push Notifications | ✅ Agregado |
| Background Modes | ✅ Agregado |
| → Remote notifications | ✅ Marcado |
| → Location updates | ✅ Marcado (para GPS) |

#### 3C. Verificar Info.plist

Asegurarse de que `Info.plist` tenga:

```xml
<key>UIBackgroundModes</key>
<array>
  <string>location</string>
  <string>remote-notification</string>
</array>
```

---

### PASO 4: Recompilar y Subir a TestFlight

```bash
# En tu Mac
git pull
npm install
npm run build
npx cap sync ios
npx cap open ios
```

En Xcode:
1. Incrementar Version y Build number
2. Product → Archive
3. Distribute App → App Store Connect
4. Esperar procesamiento en TestFlight

---

## Verificación Final

Una vez instalada la nueva build desde TestFlight:

1. **En /auth (login)**: NO debe aparecer el cuadro "Activar Notificaciones"
2. **Después de login**: Aparece el cuadro pidiendo activar
3. **Al aceptar**: iOS pide permiso del sistema
4. **Verificar token guardado**: Yo puedo revisar la tabla `device_tokens` para confirmar

---

## Resumen de Archivos Necesarios

| Archivo | Origen | Destino |
|---------|--------|---------|
| APNs Key (.p8) | Apple Developer | Firebase Console |
| GoogleService-Info.plist | Firebase Console | Xcode (App/App/) |

---

## Sección Técnica

### Por qué no funcionan sin esto

El flujo de push notifications en iOS es:

```text
App inicia → Capacitor PushNotifications.register()
    ↓
iOS verifica GoogleService-Info.plist
    ↓
iOS contacta APNs usando la Key (.p8) registrada en Firebase
    ↓
APNs devuelve un token único para este dispositivo
    ↓
Capacitor dispara evento 'registration' con el token
    ↓
Tu código guarda el token en device_tokens
    ↓
Edge Function usa FCM V1 + FIREBASE_SERVICE_ACCOUNT para enviar
```

**Sin GoogleService-Info.plist**: iOS no sabe con qué proyecto de Firebase comunicarse → no genera token.

**Sin APNs Key en Firebase**: Firebase no puede autenticarse con APNs → los mensajes no llegan.

---

## Checklist Final

- [ ] APNs Key (.p8) creada en Apple Developer
- [ ] APNs Key (.p8) subida a Firebase Console
- [ ] GoogleService-Info.plist descargado de Firebase
- [ ] GoogleService-Info.plist agregado al proyecto Xcode
- [ ] Push Notifications capability habilitada
- [ ] Background Modes → Remote notifications habilitado
- [ ] Build incrementado y subido a TestFlight
- [ ] Nueva build instalada en iPhone/iPad
- [ ] Token aparece en tabla device_tokens después de aceptar permisos
