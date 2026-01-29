/**
 * Utilidades centralizadas para compresión y manejo de imágenes
 * 
 * CONFIGURACIÓN ESTANDARIZADA:
 * - Evidencias generales: 1200px max, 70% quality (~100-200KB)
 * - Documentos OCR: 1600px max, 80% quality (necesita más detalle)
 * - Thumbnails: 400px max, 60% quality (~20-50KB)
 */

export type ImageCompressionProfile = 'evidence' | 'ocr' | 'thumbnail';

interface CompressionConfig {
  maxWidth: number;
  quality: number;
}

const COMPRESSION_PROFILES: Record<ImageCompressionProfile, CompressionConfig> = {
  // Evidencias de recepción, carga, devoluciones - balance tamaño/calidad
  evidence: { maxWidth: 1200, quality: 0.7 },
  // Documentos que requieren OCR (placas, INE) - más resolución
  ocr: { maxWidth: 1600, quality: 0.8 },
  // Miniaturas para previews rápidos
  thumbnail: { maxWidth: 400, quality: 0.6 },
};

// Timeout para compresión de imágenes (30 segundos)
const COMPRESSION_TIMEOUT_MS = 30000;

/**
 * Implementación interna de compresión de imagen
 */
function compressImageInternal(
  file: File,
  profile: ImageCompressionProfile
): Promise<File> {
  const config = COMPRESSION_PROFILES[profile];
  
  return new Promise((resolve) => {
    // Si no es imagen, retornar original
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    // Validar que el archivo tenga contenido (previene crash en iPad)
    if (file.size === 0) {
      console.warn('compressImageInternal: archivo vacío recibido');
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Escalar si excede maxWidth
        if (width > config.maxWidth) {
          height = Math.round((height * config.maxWidth) / width);
          width = config.maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              // Validar que blob no sea nulo (puede ocurrir en iPads con poca memoria)
              if (blob && blob.size > 0) {
                // Generar nombre con extensión .jpg
                const baseName = file.name.replace(/\.[^.]+$/, '');
                const compressedFile = new File([blob], `${baseName}.jpg`, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                // Blob nulo o vacío - retornar archivo original
                console.warn('compressImageInternal: blob nulo/vacío, retornando original');
                resolve(file);
              }
            },
            'image/jpeg',
            config.quality
          );
        } else {
          resolve(file);
        }
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

/**
 * Comprime una imagen para optimizar almacenamiento en Storage
 * Incluye timeout de seguridad para evitar que la app se cuelgue
 * 
 * @param file - Archivo de imagen original
 * @param profile - Perfil de compresión: 'evidence' | 'ocr' | 'thumbnail'
 * @returns Promise con el archivo comprimido
 * 
 * @example
 * // Para fotos de evidencia general
 * const compressed = await compressImageForUpload(file, 'evidence');
 * 
 * // Para documentos que necesitan OCR (placas, INE)
 * const compressed = await compressImageForUpload(file, 'ocr');
 */
export async function compressImageForUpload(
  file: File,
  profile: ImageCompressionProfile = 'evidence'
): Promise<File> {
  // Validación temprana de archivo vacío
  if (!file || file.size === 0) {
    console.warn('compressImageForUpload: archivo vacío o nulo');
    return file;
  }

  try {
    // Race entre compresión y timeout para evitar que la app se cuelgue
    const result = await Promise.race([
      compressImageInternal(file, profile),
      new Promise<File>((_, reject) =>
        setTimeout(
          () => reject(new Error('Timeout al comprimir imagen')),
          COMPRESSION_TIMEOUT_MS
        )
      ),
    ]);
    return result;
  } catch (error) {
    // Si hay timeout o cualquier error, retornar archivo original
    console.warn('compressImageForUpload: error o timeout, retornando original', error);
    return file;
  }
}

/**
 * Crea URL de preview para una imagen (debe revocarse después con URL.revokeObjectURL)
 */
export function createImagePreview(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Libera memoria de URLs de preview creadas
 */
export function revokeImagePreview(url: string): void {
  URL.revokeObjectURL(url);
}

/**
 * Valida si un archivo es una imagen válida
 */
export function isValidImage(file: File): boolean {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  return validTypes.includes(file.type);
}

/**
 * Obtiene las dimensiones estimadas de compresión para un perfil
 */
export function getCompressionInfo(profile: ImageCompressionProfile): CompressionConfig {
  return COMPRESSION_PROFILES[profile];
}

/**
 * Límite máximo de tamaño de archivo para evitar crash por memoria (50MB)
 */
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

/**
 * Valida que un archivo capturado desde la cámara sea válido para procesamiento.
 * Diseñado para manejar casos edge en iPads donde la cámara puede fallar.
 * 
 * @param file - Archivo capturado desde el input de tipo file
 * @returns Objeto con resultado de validación y mensaje de error si aplica
 * 
 * @example
 * const validation = validateCapturedFile(file);
 * if (!validation.valid) {
 *   toast({ title: validation.errorTitle, description: validation.errorMessage, variant: "destructive" });
 *   return;
 * }
 */
export function validateCapturedFile(file: File | undefined): {
  valid: boolean;
  errorTitle?: string;
  errorMessage?: string;
} {
  // Archivo no proporcionado (cámara no entregó nada)
  if (!file) {
    return {
      valid: false,
      errorTitle: "No se capturó la imagen",
      errorMessage: "La cámara no pudo capturar la imagen. Por favor intenta de nuevo.",
    };
  }

  // Archivo vacío (común en iPads con problemas de memoria)
  if (file.size === 0) {
    return {
      valid: false,
      errorTitle: "Imagen vacía",
      errorMessage: "La cámara no pudo capturar la imagen. Intenta cerrar otras apps y vuelve a intentar.",
    };
  }

  // Archivo muy grande (puede causar crash por memoria)
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      errorTitle: "Imagen muy grande",
      errorMessage: "El archivo es demasiado grande. Por favor toma la foto con menor resolución o selecciona un archivo más pequeño.",
    };
  }

  return { valid: true };
}
