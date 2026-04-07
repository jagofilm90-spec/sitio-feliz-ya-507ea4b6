export const SYSTEM_CURRENCY = 'MXN' as const;
export const SYSTEM_LOCALE = 'es-MX' as const;

export const formatCurrency = (
  value: number | null | undefined,
  options?: { showSymbol?: boolean; decimals?: number }
): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return '';
  }
  return new Intl.NumberFormat(SYSTEM_LOCALE, {
    style: options?.showSymbol === false ? 'decimal' : 'currency',
    currency: SYSTEM_CURRENCY,
    minimumFractionDigits: options?.decimals ?? 2,
    maximumFractionDigits: options?.decimals ?? 2,
  }).format(value);
};

export const formatCurrencyWhileTyping = (
  value: number | null | undefined
): string => {
  if (value === null || value === undefined || isNaN(value) || value === 0) {
    return '';
  }
  return new Intl.NumberFormat(SYSTEM_LOCALE, {
    style: 'currency',
    currency: SYSTEM_CURRENCY,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
};

export const parseCurrency = (value: string): number => {
  if (!value) return 0;
  const cleaned = value.replace(/[^\d.-]/g, '');
  return parseFloat(cleaned) || 0;
};
