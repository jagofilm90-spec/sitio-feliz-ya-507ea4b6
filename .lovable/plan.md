

# Plan de Corrección: Error "No such module 'Capacitor'" en Xcode

## Diagnóstico del Problema

El error **"No such module 'Capacitor'"** en la línea 2 del `AppDelegate.swift` indica que:

1. **CocoaPods no se instaló correctamente**, o
2. **Se está abriendo el archivo incorrecto** (.xcodeproj en lugar de .xcworkspace)

---

## Solución Paso a Paso

Ejecuta estos comandos **exactamente en este orden** desde la carpeta raíz del proyecto en Terminal:

### Paso 1: Cerrar Xcode completamente
Antes de hacer cualquier cosa, cierra Xcode por completo (Cmd + Q).

### Paso 2: Limpiar y reinstalar dependencias nativas

```bash
# Ir a la carpeta del proyecto iOS
cd ios/App

# Limpiar caché de CocoaPods
pod deintegrate
pod cache clean --all

# Reinstalar Pods
pod install --repo-update

# Volver a la raíz
cd ../..
```

### Paso 3: Sincronizar Capacitor nuevamente

```bash
npx cap sync ios
```

### Paso 4: Abrir el proyecto CORRECTO

```bash
npx cap open ios
```

**CRÍTICO**: Este comando abre el archivo `.xcworkspace` (no `.xcodeproj`). 

En la barra de título de Xcode debe decir: **"App.xcworkspace"** (NO "App.xcodeproj")

### Paso 5: En Xcode - Limpiar y construir

1. **Product → Clean Build Folder** (Shift + Cmd + K)
2. Esperar 10 segundos
3. **Product → Build** (Cmd + B)

---

## Si CocoaPods no está instalado

Si recibes error al ejecutar `pod install`, primero instala CocoaPods:

```bash
sudo gem install cocoapods
pod setup
```

---

## Verificación Visual

Cuando abras Xcode correctamente, en el panel izquierdo deberías ver:
- 📁 **App** (tu proyecto)
- 📁 **Pods** (dependencias de CocoaPods) ← **Si esto NO aparece, los Pods no están instalados**

---

## Resumen de Comandos

```bash
# Ejecutar en orden:
cd ios/App
pod deintegrate
pod cache clean --all
pod install --repo-update
cd ../..
npx cap sync ios
npx cap open ios
```

---

## Próximos Pasos

Una vez que compile sin errores:
1. Incrementar Version/Build en Xcode
2. Product → Archive → Distribute App
3. Probar en TestFlight y revisar logs de `[Push]`

