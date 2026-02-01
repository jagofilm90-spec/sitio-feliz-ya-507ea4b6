

# Guía Completa: Publicar ALMASA ERP en TestFlight

## Información de tu App

| Campo | Valor |
|-------|-------|
| **App ID** | `com.almasa.erp` |
| **Nombre** | ALMASA ERP |
| **Servidor** | `https://erp.almasa.com.mx` |

---

## Requisitos Previos

### Lo que necesitas tener instalado en tu Mac:

- **Xcode 14+** (descargar desde App Store)
- **Xcode Command Line Tools**: Ejecutar en Terminal: `xcode-select --install`
- **CocoaPods**: Ejecutar en Terminal: `sudo gem install cocoapods`
- **Node.js v18+** (verificar con `node -v`)

### Lo que necesitas tener configurado:

- **Cuenta Apple Developer** ($99/año) - Ya la tienes ✓
- **Certificado de Distribución** - Se crea automáticamente en Xcode

---

## PASO 1: Preparar el Código

Abre Terminal y ejecuta estos comandos en orden:

```bash
# 1. Ir a la carpeta del proyecto
cd almasa-erp

# 2. Obtener la última versión del código
git pull origin main

# 3. Instalar dependencias
npm install

# 4. Compilar el proyecto web
npm run build

# 5. Sincronizar con iOS
npx cap sync ios
```

---

## PASO 2: Abrir el Proyecto en Xcode

```bash
npx cap open ios
```

Se abrirá Xcode automáticamente con tu proyecto.

---

## PASO 3: Configurar la Firma de la App

1. En Xcode, en el panel izquierdo, haz clic en **"App"** (el ícono de la carpeta azul)
2. Selecciona el target **"App"** en la lista
3. Ve a la pestaña **"Signing & Capabilities"**
4. Marca la casilla **"Automatically manage signing"**
5. En **"Team"**, selecciona tu cuenta de Apple Developer (ej: "ALMASA Distribuidora...")
6. Verifica que **"Bundle Identifier"** diga: `com.almasa.erp`

Si Xcode muestra un error de certificado, haz clic en "Fix Issue" o "Register Device".

---

## PASO 4: Verificar Permisos (MUY IMPORTANTE)

En Xcode, navega a: **App > App > Info** (o abre `Info.plist`)

Verifica que existan estas claves (si no existen, agrégalas):

| Clave | Valor |
|-------|-------|
| Privacy - Camera Usage Description | ALMASA necesita acceso a la cámara para capturar evidencias de carga, fotos de documentos de vehículos y comprobantes de pago. |
| Privacy - Photo Library Usage Description | ALMASA necesita acceso a tu galería para seleccionar fotos de documentos y evidencias. |
| Privacy - Photo Library Additions Usage Description | ALMASA necesita permiso para guardar fotos de evidencias en tu biblioteca. |
| Privacy - Location When In Use Usage Description | ALMASA necesita tu ubicación para mostrar tu posición en la ruta de entregas. |
| Privacy - Location Always and When In Use Usage Description | ALMASA necesita acceso continuo a tu ubicación para que el administrador pueda monitorear el progreso de tu ruta de entregas en tiempo real. |

**Para agregar una clave:**
1. Haz clic derecho en la lista
2. Selecciona "Add Row"
3. Escribe el nombre de la clave
4. Escribe el valor

---

## PASO 5: Crear el Archive (Compilar para Distribución)

1. En la barra superior de Xcode, junto al botón ▶️, asegúrate de que diga **"Any iOS Device (arm64)"** (NO un simulador)
2. Menú: **Product → Archive**
3. Espera 5-10 minutos mientras compila
4. Cuando termine, se abrirá automáticamente el **Organizer**

---

## PASO 6: Subir a App Store Connect

En la ventana del Organizer:

1. Selecciona el Archive que acabas de crear
2. Haz clic en **"Distribute App"**
3. Selecciona **"App Store Connect"**
4. Selecciona **"Upload"**
5. Deja las opciones por defecto (todas marcadas)
6. Haz clic en **"Next"** → **"Next"** → **"Upload"**
7. Espera 5-10 minutos mientras sube

Cuando veas "Upload Successful", ¡ya está en la nube de Apple!

---

## PASO 7: Configurar en App Store Connect (Web)

1. Abre el navegador y ve a: **https://appstoreconnect.apple.com**
2. Inicia sesión con tu Apple ID de desarrollador
3. Ve a **"My Apps"**

### Si es la primera vez (no existe la app):

1. Haz clic en el botón **"+"** → **"New App"**
2. Completa el formulario:
   - **Platform**: iOS
   - **Name**: ALMASA ERP
   - **Primary Language**: Spanish (Mexico)
   - **Bundle ID**: com.almasa.erp
   - **SKU**: almasa-erp-2024
3. Haz clic en **"Create"**

### Si la app ya existe:

1. Haz clic en **"ALMASA ERP"** para abrirla

---

## PASO 8: Habilitar TestFlight

1. En App Store Connect, con tu app seleccionada
2. Haz clic en la pestaña **"TestFlight"** (arriba)
3. Espera 5-30 minutos - Apple procesa el build automáticamente
4. Cuando el estado cambie de "Processing" a **"Ready to Submit"**, continúa

### Llenar información de cumplimiento:

Apple te preguntará sobre encriptación. Responde:
- **"Does your app use encryption?"** → Selecciona **"No"** (solo usamos HTTPS estándar)

---

## PASO 9: Agregar Testers (Usuarios de Prueba)

### Método A: Testers Internos (tu equipo inmediato)

1. En TestFlight → **"Internal Testing"**
2. Haz clic en **"+"** junto a "App Store Connect Users"
3. Agrega los correos de tus usuarios internos (máximo 100)
4. Les llegará un email para descargar TestFlight

### Método B: Testers Externos (empleados de ALMASA)

1. En TestFlight → **"External Testing"**
2. Haz clic en **"+"** → **"Create New Group"**
3. Nombre del grupo: "Equipo ALMASA"
4. Haz clic en **"+"** → **"Add Testers"**
5. Puedes agregar hasta 10,000 correos electrónicos
6. Haz clic en **"Submit for Review"**

Para testing externo, Apple hace una revisión rápida (24-48 horas) antes de aprobar.

---

## PASO 10: Instalación en Dispositivos

### Los testers recibirán un email con estas instrucciones:

1. **Descargar TestFlight** desde la App Store (gratis)
2. Abrir el **email de invitación** de Apple
3. Hacer clic en **"View in TestFlight"**
4. En TestFlight, hacer clic en **"Install"** junto a ALMASA ERP
5. La app aparecerá en la pantalla de inicio

---

## Actualizaciones Futuras

Cada vez que quieras subir una nueva versión:

```bash
# En Terminal
git pull origin main
npm install
npm run build
npx cap sync ios
npx cap open ios
```

En Xcode:
1. **Product → Archive**
2. **Distribute App → App Store Connect → Upload**

En App Store Connect:
1. El nuevo build aparecerá automáticamente en TestFlight
2. Selecciónalo y haz clic en "Add to Testing"

Los testers verán la actualización automáticamente en TestFlight.

---

## Checklist Final (Antes de Subir)

- [ ] `npm run build` ejecutado sin errores
- [ ] `npx cap sync ios` ejecutado
- [ ] Team configurado en Xcode
- [ ] Bundle ID: `com.almasa.erp`
- [ ] Permisos de cámara en Info.plist
- [ ] Permisos de galería en Info.plist  
- [ ] Permisos de ubicación en Info.plist
- [ ] Dispositivo seleccionado: "Any iOS Device"
- [ ] Archive creado exitosamente
- [ ] Upload completado

---

## Solución de Problemas Comunes

### "No signing certificate found"
→ En Xcode: Preferences → Accounts → Download Manual Profiles

### "App could not be verified"
→ En el iPhone: Settings → General → VPN & Device Management → Trust

### "Processing" en App Store Connect por más de 1 hora
→ Es normal la primera vez. Si pasa más de 4 horas, contacta a Apple

### Los testers no reciben el email
→ Verificar carpeta de spam
→ Reenviar invitación desde App Store Connect

---

## Notas Importantes

1. **Los builds de TestFlight expiran en 90 días** - Sube nuevas versiones regularmente
2. **Push Notifications** funcionarán automáticamente si ya configuraste APNs
3. **Los testers pueden dar feedback** directamente desde TestFlight
4. Cuando Apple apruebe "Unlisted", podrás mover la app al App Store sin perder los testers

