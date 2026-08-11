/**
 * The database clock (Postgres `now()`) is the single source of truth for
 * "current time" in bidding logic. This module only formats timestamps for
 * display in Australia/Sydney and helps the client compute a clock-skew
 * offset against a server-provided timestamp — the countdown UI must never
 * trust the bidder's device clock alone.
 */
const SYDNEY_TZ = 'Australia/Sydney'

export function formatSydney(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return new Intl.DateTimeFormat('en-AU', {
    timeZone: SYDNEY_TZ,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d)
}

/**
 * Given the server's reported "now" (ISO string, from an API response) and
 * the local Date.now() at the moment it was received, returns the offset
 * (ms) to add to future Date.now() calls to approximate server time.
 */
export function computeClockOffsetMs(serverNowIso: string, receivedAtMs: number): number {
  const serverNowMs = new Date(serverNowIso).getTime()
  return serverNowMs - receivedAtMs
}

export function approxServerNow(offsetMs: number): number {
  return Date.now() + offsetMs
}
