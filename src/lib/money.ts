/**
 * All monetary values are stored and passed around the server as integer
 * cents (AUD). Never do currency arithmetic in floating point.
 */
export function centsToDisplay(cents: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

export function dollarsToCents(dollars: number): number {
  if (!Number.isFinite(dollars)) throw new Error('Invalid amount')
  return Math.round(dollars * 100)
}

export function isPositiveIntegerCents(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}
