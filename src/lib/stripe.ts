import 'server-only'
import Stripe from 'stripe'

let stripeClient: Stripe | null = null

/**
 * Server-only Stripe client. The secret key never reaches the browser.
 * Rehearsal mode simply points STRIPE_SECRET_KEY at a Stripe *test mode*
 * key (sk_test_...) — the code path is identical to production.
 */
export function getStripeClient(): Stripe {
  if (stripeClient) return stripeClient
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured')
  stripeClient = new Stripe(key, {
    apiVersion: '2025-02-24.acacia',
    typescript: true,
  })
  return stripeClient
}

export function isStripeTestMode(): boolean {
  return (process.env.STRIPE_SECRET_KEY ?? '').startsWith('sk_test_')
}
