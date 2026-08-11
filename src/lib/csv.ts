/** Minimal RFC 4180 CSV serialiser — no external dependency needed for this data volume. */
export function toCsv(rows: Record<string, string | number | boolean | null>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0]!)
  const escape = (value: string | number | boolean | null): string => {
    if (value === null || value === undefined) return ''
    const str = String(value)
    if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`
    return str
  }
  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h] ?? null)).join(','))
  }
  return lines.join('\r\n')
}
