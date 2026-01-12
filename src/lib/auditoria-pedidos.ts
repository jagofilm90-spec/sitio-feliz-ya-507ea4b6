/**
 * Utilidades para auditoría de pedidos
 * Captura información del dispositivo y contexto del usuario
 */

export interface DeviceInfo {
  userAgent: string;
  platform: string;
  language: string;
  screenResolution: string;
  timezone: string;
  isMobile: boolean;
  vendor: string;
  cookiesEnabled: boolean;
  onLine: boolean;
}

/**
 * Captura información del dispositivo del usuario
 */
export function captureDeviceInfo(): DeviceInfo {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    isMobile: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent),
    vendor: navigator.vendor || 'unknown',
    cookiesEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine,
  };
}

/**
 * Obtiene la IP pública del usuario usando un servicio externo
 * Retorna null si no se puede obtener (no bloquea el flujo principal)
 */
export async function getPublicIP(): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
    
    const response = await fetch('https://api.ipify.org?format=json', {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return data.ip || null;
  } catch {
    // Silently fail - IP is optional for audit
    return null;
  }
}
