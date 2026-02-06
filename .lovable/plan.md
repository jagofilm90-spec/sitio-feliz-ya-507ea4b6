
# Plan: Restaurar Assets Nativos en Xcode

Ya tienes los archivos descargados. Ahora necesitas agregarlos manualmente en Xcode.

---

## Paso 1: Agregar App Icon

1. Abre Xcode con tu proyecto (usa `npx cap open ios`)
2. En el navegador izquierdo, ve a: **App → Assets.xcassets → AppIcon**
3. Verás varios cuadros vacíos para diferentes tamaños
4. **Opción rápida**: Arrastra el ícono de 1024x1024 (AppStore.png) al cuadro más grande
5. Xcode generará automáticamente los demás tamaños

---

## Paso 2: Configurar Splash Screen

El splash en iOS se configura en **LaunchScreen.storyboard**:

1. En Xcode, abre: **App → App → LaunchScreen.storyboard**
2. Selecciona el **ImageView** existente (o agrégalo desde la biblioteca)
3. En el inspector derecho, configura:
   - **Image**: Agrega tu splash.png a Assets.xcassets primero
   - **Content Mode**: Aspect Fit
   - **Background**: White Color

**Para agregar la imagen**:
1. Click derecho en **Assets.xcassets** → New Image Set
2. Nómbralo "SplashLogo"
3. Arrastra splash.png al cuadro "1x" o "Universal"
4. En LaunchScreen.storyboard, selecciona "SplashLogo" como imagen

---

## Paso 3: Restaurar GoogleService-Info.plist (Push Notifications)

1. Localiza tu archivo `GoogleService-Info.plist` (descargado de Firebase Console)
2. En Xcode, arrastra el archivo a la carpeta **App** (donde está Info.plist)
3. Asegúrate de marcar:
   - ☑️ Copy items if needed
   - ☑️ Add to targets: App
4. Verifica que el archivo aparezca en **Build Phases → Copy Bundle Resources**

---

## Paso 4: Compilar y Probar

```bash
cd ~/Documents/sitio-feliz-ya
npm run build
npx cap sync ios
npx cap open ios
```

Luego en Xcode: **Product → Run** (⌘R)

---

## Resumen de archivos necesarios

| Asset | Archivo | Ubicación en Xcode |
|-------|---------|-------------------|
| App Icon | AppStore.png (1024x1024) | Assets.xcassets → AppIcon |
| Splash Logo | splash.png | Assets.xcassets → SplashLogo |
| Firebase | GoogleService-Info.plist | Raíz del target App |

---

## Sección Técnica

### Estructura de Assets.xcassets
```text
Assets.xcassets/
├── AppIcon.appiconset/
│   ├── Contents.json
│   └── AppStore.png (1024x1024)
└── SplashLogo.imageset/
    ├── Contents.json
    └── splash.png
```

### LaunchScreen.storyboard - Estructura
El storyboard usa Auto Layout con constraints para centrar la imagen:
- ImageView centrado horizontal y verticalmente
- Width/Height constraints opcionales (o usar Aspect Fit)
- Background del View Controller: System Background Color (blanco)
