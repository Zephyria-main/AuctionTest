import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { getStripeClient, isStripeTestMode } from '@/lib/stripe'
import { logger } from '@/lib/logger'

const bodySchema = z.object({
  itemIds: z.array(z.string().uuid()).min(1).max(15),
})

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !user.email) {
    return NextResponse.json({ error: 'Please sign in to pay for your items.' }, { status: 401 })
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  // Re-fetch and re-verify ownership server-side — never trust the client's
  // list of item ids or amounts for what gets charged.
  const { data: items, error: itemsError } = await supabase
    .from('items')
    .select('id, title, current_bid_cents, status, winner_bidder_id')
    .in('id', parsed.data.itemIds)
    .eq('winner_bidder_id', user.id)
    .eq('status', 'closed')

  if (itemsError || !items || items.length === 0) {
    return NextResponse.json({ error: 'No payable items were found for your account.' }, { status: 400 })
  }

  const admin = createAdminSupabaseClient()

  // Guard against double-charging: exclude any item that already has a
  // paid/offline_paid payment_items row.
  const { data: existingPaid } = await admin
    .from('payment_items')
    .select('item_id, payments!inner(status)')
    .in('item_id', items.map((i) => i.id))

  const alreadyPaidIds = new Set(
    (existingPaid ?? [])
      .filter((row) => {
        const status = (row as unknown as { payments: { status: string } }).payments.status
        return status === 'paid' || status === 'offline_paid'
      })
      .map((row) => row.item_id)
  )
  const payableItems = items.filter((i) => !alreadyPaidIds.has(i.id))

  if (payableItems.length === 0) {
    return NextResponse.json({ error: 'These items have already been paid for.' }, { status: 409 })
  }

  const totalCents = payableItems.reduce((sum, i) => sum + (i.current_bid_cents ?? 0), 0)
  const stripe = getStripeClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin

  let session
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'payment',
      currency: 'aud',
      customer_email: user.email,
      line_items: payableItems.map((item) => ({
        quantity: 1,
        price_data: {
          currency: 'aud',
          unit_amount: item.current_bid_cents ?? 0,
          product_data: { name: item.title },
        },
      })),
      metadata: {
        winner_bidder_id: user.id,
        item_ids: payableItems.map((i) => i.id).join(','),
        app_env: process.env.APP_ENV ?? 'development',
      },
      success_url: `${siteUrl}/winner?paid=1`,
      cancel_url: `${siteUrl}/winner?cancelled=1`,
    })
  } catch (err) {
    logger.error('stripe_checkout_create_failed', { message: err instanceof Error ? err.message : 'unknown' })
    return NextResponse.json(
      { error: 'The payment service is temporarily unavailable. Please try again shortly.' },
      { status: 503 }
    )
  }

  // Remove any stale (non-paid) payment_items rows for these items — e.g.
  // an abandoned earlier checkout attempt — so the one-active-row-per-item
  // unique index doesn't block this new attempt. Rows tied to a paid /
  // offline_paid payment are never touched.
  const { data: stalePaymentItems } = await admin
    .from('payment_items')
    .select('id, payments!inner(status)')
    .in('item_id', payableItems.map((i) => i.id))

  const staleIds = (stalePaymentItems ?? [])
    .filter((row) => {
      const status = (row as unknown as { payments: { status: string } }).payments.status
      return status !== 'paid' && status !== 'offline_paid'
    })
    .map((row) => row.id)

  if (staleIds.length > 0) {
    await admin.from('payment_items').delete().in('id', staleIds)
  }

  const { data: payment, error: paymentError } = await admin
    .from('payments')
    .insert({
      winner_bidder_id: user.id,
      stripe_checkout_session_id: session.id,
      status: 'pending',
      amount_cents: totalCents,
      is_rehearsal: isStripeTestMode(),
    })
    .select('id')
    .single()

  if (paymentError || !payment) {
    logger.error('payment_row_create_failed', { message: paymentError?.message })
    return NextResponse.json({ error: 'Could not start checkout. Please try again.' }, { status: 500 })
  }

  await admin.from('payment_items').insert(
    payableItems.map((item) => ({
      payment_id: payment.id,
      item_id: item.id,
      amount_cents: item.current_bid_cents ?? 0,
    }))
  )

  return NextResponse.json({ url: session.url })
}
