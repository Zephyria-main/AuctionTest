import { describe, it, expect } from 'vitest'
import {
  computeMinimumAcceptableBidCents,
  isBidAcceptable,
  computeExtendedClosingTime,
  nextOutboxState,
} from '@/lib/bidding'

describe('computeMinimumAcceptableBidCents', () => {
  it('uses the opening bid when there is no current bid', () => {
    const result = computeMinimumAcceptableBidCents({
      currentBidCents: null,
      openingBidCents: 10000,
      minIncrementCents: 500,
    })
    expect(result).toBe(10000)
  })

  it('adds the minimum increment to the current bid', () => {
    const result = computeMinimumAcceptableBidCents({
      currentBidCents: 10000,
      openingBidCents: 10000,
      minIncrementCents: 500,
    })
    expect(result).toBe(10500)
  })
})

describe('isBidAcceptable', () => {
  it('accepts a bid exactly at the minimum', () => {
    expect(isBidAcceptable(10500, 10500)).toBe(true)
  })

  it('rejects a bid below the minimum', () => {
    expect(isBidAcceptable(10499, 10500)).toBe(false)
  })

  it('rejects non-integer cent amounts', () => {
    expect(isBidAcceptable(10500.5, 10000)).toBe(false)
  })
})

describe('computeExtendedClosingTime', () => {
  const closingTime = new Date('2026-08-10T10:00:00Z')

  it('does not extend when extensions are disabled', () => {
    const result = computeExtendedClosingTime({
      closingTime,
      now: new Date('2026-08-10T09:59:00Z'),
      extensionsEnabled: false,
      extensionTriggerMinutes: 2,
      extensionMinutes: 2,
    })
    expect(result.wasExtended).toBe(false)
    expect(result.newClosingTime).toEqual(closingTime)
  })

  it('does not extend when the bid arrives outside the trigger window', () => {
    const result = computeExtendedClosingTime({
      closingTime,
      now: new Date('2026-08-10T09:50:00Z'), // 10 minutes before close
      extensionsEnabled: true,
      extensionTriggerMinutes: 2,
      extensionMinutes: 2,
    })
    expect(result.wasExtended).toBe(false)
  })

  it('extends by the configured minutes when a bid lands inside the trigger window', () => {
    const now = new Date('2026-08-10T09:59:00Z') // 1 minute before close
    const result = computeExtendedClosingTime({
      closingTime,
      now,
      extensionsEnabled: true,
      extensionTriggerMinutes: 2,
      extensionMinutes: 2,
    })
    expect(result.wasExtended).toBe(true)
    expect(result.newClosingTime.toISOString()).toBe('2026-08-10T10:01:00.000Z')
  })

  it('never moves the closing time earlier than it already was', () => {
    const now = new Date('2026-08-10T09:59:59Z') // 1 second before close
    const result = computeExtendedClosingTime({
      closingTime,
      now,
      extensionsEnabled: true,
      extensionTriggerMinutes: 2,
      extensionMinutes: 0.01, // pathological tiny extension
    })
    expect(result.newClosingTime.getTime()).toBeGreaterThanOrEqual(closingTime.getTime())
  })
})

describe('nextOutboxState', () => {
  it('marks a job sent on success', () => {
    const result = nextOutboxState({ attempts: 0, maxAttempts: 5, success: true })
    expect(result).toEqual({ status: 'sent', attempts: 1, lastError: null })
  })

  it('keeps a failed job pending for retry while under the attempt cap', () => {
    const result = nextOutboxState({ attempts: 1, maxAttempts: 5, success: false, error: 'boom' })
    expect(result.status).toBe('pending')
    expect(result.attempts).toBe(2)
    expect(result.lastError).toBe('boom')
  })

  it('marks a job permanently failed once the attempt cap is reached', () => {
    const result = nextOutboxState({ attempts: 4, maxAttempts: 5, success: false, error: 'boom' })
    expect(result.status).toBe('failed')
    expect(result.attempts).toBe(5)
  })
})
