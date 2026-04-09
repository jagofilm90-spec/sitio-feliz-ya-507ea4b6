import { Badge } from "@/components/ui/badge";

/** Props for getCaducidadBadge */
export interface CaducidadBadgeProps {
  fecha: string | null;
}

/** Props for getStockStatusBadge */
export interface StockStatusBadgeProps {
  actual: number;
  minimo: number;
}

/**
 * Renders a caducidad badge based on the remaining days until expiration.
 * - Expired: crimson destructive badge
 * - <=30 days: outline with crimson-500 border
 * - >30 days: secondary with formatted date
 */
export function getCaducidadBadge(fecha: string | null) {
  if (!fecha) return null;

  const fechaCad = new Date(fecha);
  const diasRestantes = Math.ceil((fechaCad.getTime() - Date.now()) / 86400000);

  if (diasRestantes < 0) {
    return <Badge variant="destructive">Vencido hace {Math.abs(diasRestantes)}d</Badge>;
  }
  if (diasRestantes <= 30) {
    return <Badge variant="outline" className="border-orange-500 text-orange-600">Vence en {diasRestantes}d</Badge>;
  }
  return <Badge variant="secondary">{fechaCad.toLocaleDateString("es-MX")}</Badge>;
}

/**
 * Renders a stock status badge.
 * - Zero stock: crimson destructive
 * - Below minimum: outline with crimson accent
 * - OK: outline with ink-500 (neutral)
 */
export function getStockStatusBadge(actual: number, minimo: number) {
  if (actual <= 0) {
    return <Badge variant="destructive">Sin stock</Badge>;
  }
  if (minimo > 0 && actual <= minimo) {
    return <Badge variant="outline" className="border-amber-500 text-amber-600">Stock bajo</Badge>;
  }
  return <Badge variant="outline" className="border-green-500 text-green-600">Disponible</Badge>;
}
