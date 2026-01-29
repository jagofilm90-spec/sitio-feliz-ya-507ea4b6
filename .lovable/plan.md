
# Plan: Corregir Crash de Cámara en Registro de Vehículos (Guideline 2.1)

## Diagnóstico

Apple reporta que la app crashea al seleccionar "Take Photo" durante el registro de un vehículo en iPad Air 11-inch (M3). Después de analizar el código:

1. **El código JavaScript ya tiene protecciones**: Compresión de imágenes y manejo de errores try-catch están implementados en `VehiculosTab.tsx`

2. **El problema es a nivel nativo de iOS**: El crash ocurre ANTES de que el código JavaScript reciba el archivo, cuando iOS intenta abrir la cámara

3. **Causa probable**: Los permisos de cámara en `Info.plist` pueden no estar correctamente configurados o la app no maneja graciosamente cuando iOS deniega el acceso

## Solución Propuesta

### Parte 1: Verificación de Info.plist (Manual en Xcode)

Asegurar que estos permisos están configurados en `ios/App/App/Info.plist`:

```text
┌─────────────────────────────────────────────────────────────────┐
│ NSCameraUsageDescription                                        │
│ "ALMASA ERP necesita acceso a la cámara para fotografiar       │
│ documentos de vehículos y evidencias de entrega."              │
├─────────────────────────────────────────────────────────────────┤
│ NSPhotoLibraryUsageDescription                                  │
│ "ALMASA ERP necesita acceso a tus fotos para subir            │
│ documentos de vehículos y evidencias."                         │
├─────────────────────────────────────────────────────────────────┤
│ NSPhotoLibraryAddUsageDescription                               │
│ "ALMASA ERP necesita permiso para guardar fotos de            │
│ evidencias en tu biblioteca."                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Parte 2: Mejoras Defensivas en el Código

Agregar validación adicional ANTES de intentar procesar archivos para manejar casos edge donde iOS no entrega correctamente el archivo:

**Archivo: `src/components/rutas/VehiculosTab.tsx`**

1. Agregar función helper para validar archivos de cámara con manejo especial para iPad
2. Agregar validación de permisos usando Capacitor Camera API (opcional pero recomendado)
3. Mejorar mensajes de error para guiar al usuario

**Archivo: `src/lib/imageUtils.ts`**

4. Agregar timeout y manejo de errores más robusto en la compresión de imágenes
5. Agregar validación de blob nulo que puede ocurrir en iPads con poca memoria

### Parte 3: Actualizar Guía de Build

**Archivo: `MOBILE_BUILD_GUIDE.md`**

6. Documentar claramente que los tres permisos de cámara/foto son obligatorios
7. Agregar verificación de permisos al checklist pre-upload

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/components/rutas/VehiculosTab.tsx` | Agregar validación defensiva de archivos capturados |
| `src/lib/imageUtils.ts` | Agregar timeout y validación de blob nulo |
| `MOBILE_BUILD_GUIDE.md` | Documentar permisos obligatorios de cámara |

## Sección Técnica

### Cambio Principal en VehiculosTab.tsx

```typescript
// Validación defensiva antes de procesar
const validateCapturedFile = (file: File | undefined): file is File => {
  if (!file) {
    toast({
      title: "No se capturó la imagen",
      description: "Por favor intenta de nuevo",
      variant: "destructive",
    });
    return false;
  }
  
  // iPad puede entregar archivos vacíos si hay problemas de memoria
  if (file.size === 0) {
    toast({
      title: "Imagen vacía",
      description: "La cámara no pudo capturar la imagen. Intenta cerrar otras apps.",
      variant: "destructive",
    });
    return false;
  }
  
  // Validar tamaño máximo (50MB) para prevenir crash por memoria
  const MAX_SIZE = 50 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    toast({
      title: "Imagen muy grande",
      description: "Por favor toma la foto con menor resolución",
      variant: "destructive",
    });
    return false;
  }
  
  return true;
};
```

### Cambio en imageUtils.ts - Timeout de Seguridad

```typescript
export async function compressImageForUpload(
  file: File,
  profile: ImageCompressionProfile = 'evidence'
): Promise<File> {
  const TIMEOUT_MS = 30000; // 30 segundos máximo
  
  return Promise.race([
    compressImageInternal(file, profile),
    new Promise<File>((_, reject) => 
      setTimeout(() => reject(new Error('Timeout al procesar imagen')), TIMEOUT_MS)
    )
  ]).catch(() => file); // Fallback: retornar original si hay error
}
```

## Pasos para Resubmit a Apple

1. Aplicar los cambios de código
2. Hacer git pull en tu Mac
3. Abrir Xcode y verificar/agregar los permisos en Info.plist:
   - `NSCameraUsageDescription`
   - `NSPhotoLibraryUsageDescription`  
   - `NSPhotoLibraryAddUsageDescription`
4. Incrementar Build Number (ej: 1.0 Build 3)
5. Hacer Archive y Upload a App Store Connect
6. **IMPORTANTE**: NO enviar a revisión hasta recibir confirmación del Unlisted App (Guideline 3.2)

## Notas Importantes

- El crash de Guideline 2.1 debe corregirse, pero NO debes reenviar la app hasta que Apple confirme la aprobación del Unlisted App
- Una vez recibas el email de confirmación de Unlisted, podrás subir el nuevo build y enviarlo a revisión
- El nuevo build tendrá tanto la corrección del crash como la configuración de Unlisted App
