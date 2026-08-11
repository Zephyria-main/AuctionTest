/**
 * Pure bid-calculation helpers mirroring the logic inside
 * supabase/migrations/0003_functions.sql `place_bid()`. These are used for
 * instant client-side hints (e.g. the minimum bid shown on the item page)
 * and are unit tested here — but the SQL function is what actually
 * enforces the rules, since a client-side check can always be bypassed.
 */
export function computeMinimumAcceptableBidCents(params: {
  currentBidCents: number | null
  openingBidCents: number
  minIncrementCents: number
}): number {
  if (params.currentBidCents === null) {
    return params.openingBidCents
  }
  return params.currentBidCents + params.minIncrementCents
}

export function isBidAcceptable(amountCents: number, minimumAcceptableCents: number): boolean {
  return Number.isInteger(amountCents) && amountCents >= minimumAcceptableCents
}

export function computeExtendedClosingTime(params: {
  closingTime: Date
  now: Date
  extensionsEnabled: boolean
  extensionTriggerMinutes: number
  extensionMinutes: number
}): { newClosingTime: Date; wasExtended: boolean } {
  if (!params.extensionsEnabled) {
    return { newClosingTime: params.closingTime, wasExtended: false }
  }

  const msUntilClose = params.closingTime.getTime() - params.now.getTime()
  const triggerMs = params.extensionTriggerMinutes * 60 * 1000

  if (msUntilClose > triggerMs) {
    return { newClosingTime: params.closingTime, wasExtended: false }
  }

  const extendedTime = new Date(params.now.getTime() + params.extensionMinutes * 60 * 1000)
  const newClosingTime = extendedTime > params.closingTime ? extendedTime : params.closingTime

  return { newClosingTime, wasExtended: newClosingTime.getTime() > params.closingTime.getTime() }
}

export interface OutboxJobState {
  status: 'pending' | 'sent' | 'failed'
  attempts: number
  lastError: string | null
}

/** Pure state transition for one outbox send attempt — used by the cron processor and unit tested independently of any network/DB call. */
export function nextOutboxState(params: {
  attempts: number
  maxAttempts: number
  success: boolean
  error?: string
}): OutboxJobState {
  const attempts = params.attempts + 1
  if (params.success) {
    return { status: 'sent', attempts, lastError: null }
  }
  return {
    status: attempts >= params.maxAttempts ? 'failed' : 'pending',
    attempts,
    lastError: params.error ?? 'Unknown error',
  }
}
