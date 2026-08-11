/**
 * Structured logger. Deliberately avoids logging personal information
 * (names, emails, phone numbers, raw bid amounts tied to an identity) —
 * log bidder_id / item_id references instead, per the data-minimisation
 * requirement in docs/ASSUMPTIONS.md.
 */
type Level = 'info' | 'warn' | 'error'

function log(level: Level, event: string, fields: Record<string, unknown> = {}) {
  const entry = {
    level,
    event,
    timestamp: new Date().toISOString(),
    ...fields,
  }
  const line = JSON.stringify(entry)
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

export const logger = {
  info: (event: string, fields?: Record<string, unknown>) => log('info', event, fields),
  warn: (event: string, fields?: Record<string, unknown>) => log('warn', event, fields),
  error: (event: string, fields?: Record<string, unknown>) => log('error', event, fields),
}
