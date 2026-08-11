import { describe, it, expect } from 'vitest'
import { toCsv } from '@/lib/csv'

describe('toCsv', () => {
  it('returns an empty string for no rows', () => {
    expect(toCsv([])).toBe('')
  })

  it('produces a header row followed by data rows', () => {
    const csv = toCsv([
      { name: 'Alice', amount: 100 },
      { name: 'Bob', amount: 200 },
    ])
    expect(csv).toBe('name,amount\r\nAlice,100\r\nBob,200')
  })

  it('quotes and escapes values containing commas, quotes or newlines', () => {
    const csv = toCsv([{ note: 'Says "hi", then leaves\nnext line' }])
    expect(csv).toBe('note\r\n"Says ""hi"", then leaves\nnext line"')
  })

  it('renders null as an empty field', () => {
    const csv = toCsv([{ value: null }])
    expect(csv).toBe('value\r\n')
  })
})
