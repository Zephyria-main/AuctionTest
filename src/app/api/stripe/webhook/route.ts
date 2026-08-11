import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripeClient } from '@/lib/stripe'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { notifyAdmin } from '@/lib/email/adminAlert'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs' // needs the raw body for signature verification

async function enqueuePaymentConfirmation(paymentId: string) {
  const admin = createAdminSupabaseClient()

  const { data: payment } = await admin
    .from('payments')
    .select('id, winner_bidder_id, amount_cents, payment_items(item_id, items(title))')
    .eq('id', paymentId)
    .single()

  if (!payment) return

  const itemTitles = (
    payment as unknown as { payment_items: { items: { title: string } }[] }
  ).payment_items.map((pi) => pi.items.title)

  await admin.from('email_outbox').insert({
    template_key: 'payment_confirmation',
    recipient_bidder_id: payment.winner_bidder_id,
    dedupe_key: `payment_confirmation:${paymentId}`,
    payload: { itemTitles, totalPaidCents: payment.amount_cents },
  })
}

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  const rawBody = await request.text()
  const stripe = getStripeClient()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err) {
    logger.warn('stripe_webhook_signature_invalid', { message: err instanceof Error ? err.message : 'unknown' })
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const admin = createAdminSupabaseClient()

  // Idempotency: the event id is the primary key, so a duplicate delivery
  // (Stripe retries, or the same event replayed) hits a conflict and we
  // return 200 immediately without reprocessing anything.
  const { error: insertError } = await admin
    .from('webhook_events')
    .insert({ id: event.id, type: event.type, payload: event as unknown as Record<string, unknown> })

  if (insertError) {
    logger.info('stripe_webhook_duplicate_ignored', { eventId: event.id, type: event.type })
    return NextResponse.json({ received: true, duplicate: true })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const { data: updated } = await admin
          .from('payments')
          .update({
            status: 'paid',
            stripe_payment_intent_id:
              typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_checkout_session_id', session.id)
          .neq('status', 'paid') // idempotent: no-op if already marked paid
          .select('id')
          .maybeSingle()

        if (updated) {
          await enqueuePaymentConfirmation(updated.id)
        }
        break
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session
        await admin
          .from('payments')
          .update({ status: 'failed', updated_at: new Date().toISOString() })
          .eq('stripe_checkout_session_id', session.id)
          .eq('status', 'pending')
        break
      }

      case 'payment_intent.payment_failed': {
        const intent = event.data.object as Stripe.PaymentIntent
        await admin
          .from('payments')
          .update({ status: 'failed', updated_at: new Date().toISOString() })
          .eq('stripe_payment_intent_id', intent.id)
          .neq('status', 'paid')
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        const intentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id
        if (intentId) {
          await admin
            .from('payments')
            .update({ status: 'refunded', updated_at: new Date().toISOString() })
            .eq('stripe_payment_intent_id', intentId)
        }
        break
      }

      default:
        // Unhandled event types are acknowledged but not acted on.
        break
    }
  } catch (err) {
    logger.error('stripe_webhook_processing_error', {
      eventId: event.id,
      type: event.type,
      message: err instanceof Error ? err.message : 'unknown',
    })
    // Mark received but not processed so it's visible in admin/status
    // tooling; return 500 so Stripe retries.
    await notifyAdmin(
      'Stripe webhook processing failed',
      `Event ${event.id} (${event.type}) failed to process: ${err instanceof Error ? err.message : 'unknown error'}. Stripe will retry automatically.`
    )
    return NextResponse.json({ error: 'Processing error' }, { status: 500 })
  }

  await admin.from('webhook_events').update({ processed_at: new Date().toISOString() }).eq('id', event.id)

  return NextResponse.json({ received: true })
}
