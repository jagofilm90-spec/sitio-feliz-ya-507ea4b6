import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { calcularDesgloseImpuestosLegacy, validarTotalesLegacy } from "./calculos";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formatea un número como moneda con separador de miles (comas) y 2 decimales
 * Ejemplo: 9100 -> "9,100.00"
 */
export function formatCurrency(value: number): string {
  return '$' + value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Calcula el desglose de impuestos para productos con precios que incluyen IVA/IEPS
 * NOTA: Esta función ahora usa el sistema centralizado de cálculos (src/lib/calculos.ts)
 * @param precioConImpuestos - Precio total incluyendo impuestos
 * @param aplica_iva - Si el producto tiene IVA (16%)
 * @param aplica_ieps - Si el producto tiene IEPS (8%)
 * @returns { base, iva, ieps, total }
 */
export function calcularDesgloseImpuestos(
  precioConImpuestos: number,
  aplica_iva: boolean,
  aplica_ieps: boolean
) {
  return calcularDesgloseImpuestosLegacy(precioConImpuestos, aplica_iva, aplica_ieps);
}

/**
 * Valida que los totales sean consistentes
 * NOTA: Esta función ahora usa el sistema centralizado de cálculos (src/lib/calculos.ts)
 */
export function validarTotales(subtotal: number, iva: number, ieps: number, total: number): boolean {
  return validarTotalesLegacy(subtotal, iva, ieps, total);
}

/**
 * Abrevia unidades para presentación en PDFs
 * bulto/bultos → BLTS, caja/cajas → CJS, balón/balones → BLS, bolsa/bolsas → BOL, cubeta/cubetas → CBTA
 */
export function abreviarUnidad(presentacion: string): string {
  return presentacion
    .replace(/\bbultos?\b/gi, 'BLTS')
    .replace(/\bcajas?\b/gi, 'CJS')
    .replace(/\bbalones?\b/gi, 'BLS')
    .replace(/\bbalón\b/gi, 'BLS')
    .replace(/\bbalon\b/gi, 'BLS')
    .replace(/\bbolsas?\b/gi, 'BOL')
    .replace(/\bcubetas?\b/gi, 'CBTA');
}

/**
 * Valida que una contraseña cumpla requisitos de seguridad:
 * - Mínimo 12 caracteres
 * - Al menos una mayúscula
 * - Al menos una minúscula
 * - Al menos un número
 * - Al menos un símbolo
 */
export function validateStrongPassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 12) {
    errors.push("Mínimo 12 caracteres");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Al menos una mayúscula");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Al menos una minúscula");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Al menos un número");
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("Al menos un símbolo (!@#$%^&*...)");
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Genera contraseña segura con todos los tipos de caracteres requeridos
 * @param length Longitud de la contraseña (mínimo 12)
 */
export function generateSecurePassword(length: number = 14): string {
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*()_+-=";
  const all = lowercase + uppercase + numbers + symbols;
  
  // Garantizar al menos uno de cada tipo
  let password = "";
  password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
  password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
  password += numbers.charAt(Math.floor(Math.random() * numbers.length));
  password += symbols.charAt(Math.floor(Math.random() * symbols.length));
  
  // Completar el resto
  const finalLength = Math.max(length, 12);
  for (let i = password.length; i < finalLength; i++) {
    password += all.charAt(Math.floor(Math.random() * all.length));
  }
  
  // Mezclar caracteres para no tener patrón predecible
  return password.split('').sort(() => Math.random() - 0.5).join('');
}
