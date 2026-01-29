
# Plan: Corregir Crash de Cámara en Registro de Vehículos (Guideline 2.1)

## ✅ COMPLETADO

### Cambios Aplicados

1. **`src/lib/imageUtils.ts`**:
   - Agregado timeout de 30 segundos con `Promise.race` para evitar que la app se cuelgue
   - Agregada validación de blob nulo/vacío en la compresión
   - Nueva función `validateCapturedFile()` para validar archivos antes de procesarlos
   - Exportada constante `MAX_FILE_SIZE_BYTES` (50MB)

2. **`src/components/rutas/VehiculosTab.tsx`**:
   - Los 3 inputs de archivo (Tarjeta, Póliza, Factura) ahora usan `validateCapturedFile()`
   - Se valida archivo vacío, nulo y tamaño máximo ANTES de procesar
   - Mensajes de error claros para guiar al usuario

3. **`MOBILE_BUILD_GUIDE.md`**:
   - Agregado checklist pre-build con los 3 permisos de cámara obligatorios
   - Documentación mejorada sobre `NSPhotoLibraryAddUsageDescription`

## Pasos para Resubmit a Apple

1. ✅ Cambios de código aplicados
2. Hacer `git pull` en tu Mac
3. Abrir Xcode y verificar/agregar los permisos en Info.plist:
   - `NSCameraUsageDescription`
   - `NSPhotoLibraryUsageDescription`  
   - `NSPhotoLibraryAddUsageDescription`
4. Incrementar Build Number (ej: 1.0 Build 3)
5. Hacer Archive y Upload a App Store Connect
6. **IMPORTANTE**: NO enviar a revisión hasta recibir confirmación del Unlisted App (Guideline 3.2)

## Estado Actual

- **Guideline 2.1 (Crash)**: ✅ Código corregido, pendiente build en Xcode
- **Guideline 3.2 (Business)**: ⏳ Esperando respuesta de Apple sobre Unlisted App

