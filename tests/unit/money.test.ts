import { describe, it, expect } from 'vitest'
import { centsToDisplay, dollarsToCents, isPositiveIntegerCents } from '@/lib/money'

describe('centsToDisplay', () => {
  it('formats whole dollars without decimals', () => {
    expect(centsToDisplay(10000)).toBe('$100')
  })

  it('formats cents with two decimal places', () => {
    expect(centsToDisplay(10050)).toBe('$100.50')
  })
})

describe('dollarsToCents', () => {
  it('converts dollars to integer cents', () => {
    expect(dollarsToCents(100.5)).toBe(10050)
  })

  it('rounds to the nearest cent', () => {
    expect(dollarsToCents(10.005)).toBe(1001) // rounds 1000.5 -> 1001 via Math.round half-up
  })

  it('throws on non-finite input', () => {
    expect(() => dollarsToCents(NaN)).toThrow()
  })
})

describe('isPositiveIntegerCents', () => {
  it('accepts positive integers', () => {
    expect(isPositiveIntegerCents(500)).toBe(true)
  })

  it('rejects zero, negatives and non-integers', () => {
    expect(isPositiveIntegerCents(0)).toBe(false)
    expect(isPositiveIntegerCents(-5)).toBe(false)
    expect(isPositiveIntegerCents(5.5)).toBe(false)
    expect(isPositiveIntegerCents('500')).toBe(false)
  })
})
