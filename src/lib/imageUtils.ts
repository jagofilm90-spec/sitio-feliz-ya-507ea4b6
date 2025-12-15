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

/**
 * Comprime una imagen para optimizar almacenamiento en Storage
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
  const config = COMPRESSION_PROFILES[profile];
  
  return new Promise((resolve) => {
    // Si no es imagen, retornar original
    if (!file.type.startsWith('image/')) {
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
              if (blob) {
                // Generar nombre con extensión .jpg
                const baseName = file.name.replace(/\.[^.]+$/, '');
                const compressedFile = new File([blob], `${baseName}.jpg`, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
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
