export function formatMoney(value: number, currency = 'EUR', locale = 'fr-FR', compact = false): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: compact ? 0 : Math.abs(value) >= 1000 ? 0 : 2,
    minimumFractionDigits: 0,
    notation: compact && Math.abs(value) >= 10000 ? 'compact' : 'standard',
  }).format(value);
}

export function formatNumber(value: number, locale = 'fr-FR', digits = 0): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(value);
}

export function formatPercent(value: number, digits = 0): string {
  return `${value >= 0 ? '' : '-'}${Math.abs(value).toFixed(digits)} %`;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
