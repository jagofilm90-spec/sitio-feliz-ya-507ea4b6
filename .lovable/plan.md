
# Plan: Agregar NSCameraUsageDescription al Info.plist de iOS

## Problema

Apple rechazó/retrasó la app porque crashea al intentar usar la cámara. El crash log indica:

```
"This app has crashed because it attempted to access privacy-sensitive data without a usage description. 
The app's Info.plist must contain an NSCameraUsageDescription key..."
```

Múltiples componentes usan `capture="environment"` para acceder a la cámara:
- `EvidenciaCapture.tsx` - fotos de recepciones
- `VehiculosTab.tsx` - fotos de tarjeta de circulación, pólizas
- `DiagramaDanosVehiculo.tsx` - fotos de daños
- `SellosSection.tsx` / `CargaEvidenciasSection.tsx` - evidencias de carga

## Solucion

### Paso 1: Actualizar MOBILE_BUILD_GUIDE.md

Agregar seccion de **Permisos de Camara y Galeria** en la configuracion de iOS:

```markdown
4. **Configurar Permisos de Cámara y Galería** (Info.plist) - CRÍTICO:
   
   <key>NSCameraUsageDescription</key>
   <string>ALMASA necesita acceso a la cámara para capturar evidencias 
   de carga, fotos de documentos de vehículos y comprobantes de pago.</string>
   
   <key>NSPhotoLibraryUsageDescription</key>
   <string>ALMASA necesita acceso a tu galería para seleccionar 
   fotos de documentos y evidencias.</string>
```

Tambien agregar una seccion de **Troubleshooting** especifica para este error.

### Paso 2: Instrucciones para el desarrollador

Pasos manuales que debes hacer en tu Mac:

1. Abrir proyecto iOS:
   ```bash
   npx cap open ios
   ```

2. En Xcode, ir a `App > App > Info.plist`

3. Click derecho > "Add Row" y agregar:
   - `Privacy - Camera Usage Description`
   - `Privacy - Photo Library Usage Description`

4. Recompilar:
   ```bash
   npm run build && npx cap sync
   ```

5. En Xcode: Product > Archive > Distribute App

## Resultado Esperado

- App ya no crashea al usar camara
- Apple puede probar las funciones de captura de evidencias
- Avanza el proceso de revision para Unlisted App

## Seccion Tecnica

### Archivo a modificar en Lovable
- `MOBILE_BUILD_GUIDE.md` - Agregar documentacion de permisos de camara

### Archivos a modificar manualmente en Xcode (tu Mac)
- `ios/App/App/Info.plist` - Agregar claves NSCameraUsageDescription y NSPhotoLibraryUsageDescription

### Claves XML exactas para Info.plist
```xml
<key>NSCameraUsageDescription</key>
<string>ALMASA necesita acceso a la cámara para capturar evidencias de carga, fotos de documentos de vehículos y comprobantes de pago.</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>ALMASA necesita acceso a tu galería para seleccionar fotos de documentos y evidencias.</string>
```
