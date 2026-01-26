
## Plan: Corregir Crash al Tomar Foto en Registro de Vehículo

### Problema Identificado

La app crashea en iPad cuando el usuario selecciona "Take Photo" al registrar un vehículo nuevo. El crash ocurre porque:

1. Las fotos del iPad pueden ser muy grandes (12+ megapixels, 5-10MB)
2. El código actual en `VehiculosTab.tsx` procesa las imágenes directamente sin comprimirlas primero
3. Falta manejo de errores robusto en el evento `onChange` del input de archivos
4. El `FileReader` puede fallar en el WebView de Capacitor sin un catch apropiado

### Solución

Agregar compresión de imágenes y manejo defensivo de errores en el formulario de registro de vehículos.

### Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/components/rutas/VehiculosTab.tsx` | Agregar compresión de imágenes antes de subir/procesar, try-catch robusto |

### Cambios Detallados

#### 1. Importar utilidad de compresión de imágenes

```tsx
// Agregar al inicio del archivo
import { compressImageForUpload, isValidImage } from "@/lib/imageUtils";
```

#### 2. Modificar el manejador de archivos para agregar compresión y manejo de errores

El input actual (línea ~777-786):
```tsx
<Input
  type="file"
  accept=".pdf,.jpg,.jpeg,.png,.webp"
  onChange={(e) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file, 'tarjeta', editingVehiculo?.id);
  }}
  disabled={uploadingTarjeta || extractingData}
/>
```

Cambiar a:
```tsx
<Input
  type="file"
  accept=".pdf,.jpg,.jpeg,.png,.webp,image/*"
  capture="environment"
  onChange={async (e) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      
      // Para imágenes, comprimir antes de procesar (evita crash por memoria en iPad)
      let processedFile = file;
      if (file.type.startsWith('image/')) {
        processedFile = await compressImageForUpload(file, 'ocr');
      }
      
      handleFileUpload(processedFile, 'tarjeta', editingVehiculo?.id);
    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: "Error al procesar archivo",
        description: "Intenta de nuevo o selecciona un archivo diferente",
        variant: "destructive",
      });
    }
  }}
  disabled={uploadingTarjeta || extractingData}
/>
```

#### 3. Aplicar el mismo patrón a los otros inputs de archivo

- **Póliza de seguro** (~línea 1077): Agregar try-catch
- **Factura del vehículo** (~línea 1095): Agregar compresión y try-catch

#### 4. Agregar manejo defensivo en funciones de extracción

En `extractTarjetaCirculacionData` y `extractFacturaData`, agregar validación del archivo:

```tsx
const extractTarjetaCirculacionData = async (file: File) => {
  setExtractingData(true);
  try {
    // Validar que el archivo existe y tiene contenido
    if (!file || file.size === 0) {
      throw new Error('Archivo vacío o inválido');
    }
    
    const { data: { session } } = await supabase.auth.getSession();
    // ... resto del código
  } catch (error: any) {
    // ... manejo de errores existente
  }
};
```

### Resultado Esperado

- La app ya no crasheará al tomar fotos desde la cámara del iPad
- Las imágenes grandes se comprimirán automáticamente antes de procesarlas
- Si ocurre algún error, se mostrará un mensaje al usuario en lugar de crashear
- La funcionalidad de extracción de datos con IA seguirá funcionando normalmente

### Notas Importantes

1. **NO reenviar a Apple** hasta recibir el email de confirmación sobre la solicitud "Unlisted"
2. Una vez corregido el crash, deberás:
   - Hacer `git pull` del proyecto
   - Ejecutar `npm run build`
   - Ejecutar `npx cap sync ios`
   - Crear nuevo Archive en Xcode y subir nueva build

### Pruebas Recomendadas

Antes de reenviar a Apple, probar en dispositivo real o simulador:
1. Abrir Rutas → Vehículos → Nuevo Vehículo
2. Tocar el input de Tarjeta de Circulación
3. Seleccionar "Take Photo" y tomar una foto
4. Verificar que la app no crashea y procesa la imagen correctamente
5. Repetir con Póliza y Factura
