
# Plan: Subir App a TestFlight para Probar Push Notifications

## Resumen
Crearás un archivo (Archive) de la app en Xcode y lo subirás a App Store Connect para distribuirlo via TestFlight. Una vez instalada la nueva build en tu iPhone, podrás probar las push notifications.

---

## Pasos a Seguir en Xcode

### Paso 1: Seleccionar Destino Correcto
1. En la barra superior de Xcode, donde dice el dispositivo, selecciona **"Any iOS Device (arm64)"**
   - Este es el destino correcto para crear un Archive

### Paso 2: Incrementar Versión (Importante)
1. En el navegador izquierdo, click en **App** (ícono azul del proyecto)
2. Selecciona el target **App** en la lista
3. Ve a la pestaña **General**
4. En la sección **Identity**, incrementa:
   - **Version**: Si está en 1.0, cámbialo a 1.1 (o el siguiente número)
   - **Build**: Incrementa en 1 (ej: de 5 a 6)

### Paso 3: Verificar Configuración de Firma
1. Ve a **Signing & Capabilities**
2. Confirma que:
   - **Team**: Tu cuenta de desarrollador está seleccionada
   - **Bundle Identifier**: `com.almasa.erp`
   - **Push Notifications**: Capability está presente
   - **Background Modes**: Remote notifications está marcado

### Paso 4: Crear Archive
1. En el menú: **Product** > **Archive**
2. Espera a que compile (puede tomar 2-5 minutos)
3. Al terminar, se abre automáticamente el **Organizer**

### Paso 5: Subir a App Store Connect
1. En el Organizer, selecciona el archive recién creado
2. Click en **Distribute App**
3. Selecciona **App Store Connect**
4. Click en **Next** > **Upload**
5. Espera a que suba (depende de tu conexión)

### Paso 6: Esperar Procesamiento
1. Ve a [App Store Connect](https://appstoreconnect.apple.com)
2. Navega a tu app **ALMASA ERP**
3. En la sección **TestFlight**, espera que aparezca la nueva build
   - El procesamiento toma entre 10-30 minutos

### Paso 7: Instalar y Probar
1. Abre la app **TestFlight** en tu iPhone
2. Instala la nueva versión de ALMASA ERP
3. Abre la app e inicia sesión
4. Cuando aparezca el diálogo de notificaciones, selecciona **Permitir**

---

## Verificación Final

Una vez que hayas permitido notificaciones en la app instalada desde TestFlight, yo verificaré que el token se registró correctamente en la base de datos y podremos enviar una notificación de prueba.

---

## Sección Técnica

### Checklist Pre-Archive

Antes de hacer Archive, asegúrate de que tu proyecto tenga:

| Archivo/Configuración | Ubicación | Estado |
|----------------------|-----------|--------|
| GoogleService-Info.plist | ios/App/App/ | Debe existir |
| Push Notifications capability | Signing & Capabilities | Habilitado |
| Background Modes > Remote notifications | Signing & Capabilities | Marcado |
| NSCameraUsageDescription | Info.plist | Configurado |
| NSPhotoLibraryUsageDescription | Info.plist | Configurado |

### Tiempo Estimado

| Paso | Duración |
|------|----------|
| Archive | 2-5 minutos |
| Upload | 5-15 minutos |
| Procesamiento App Store | 10-30 minutos |
| Instalación TestFlight | 2 minutos |

