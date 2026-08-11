import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { placeBidSchema } from '@/lib/validation'
import { rateLimit } from '@/lib/rateLimit'
import { logger } from '@/lib/logger'

async function enqueueBidEmails(params: {
  bidId: string
  itemId: string
  itemTitle: string
  amountCents: number
  newBidderId: string
  previousBidderId: string | null
}) {
  const admin = createAdminSupabaseClient()
  const rows: { template_key: string; recipient_bidder_id: string; dedupe_key: string; payload: Record<string, unknown> }[] = [
    {
      template_key: 'bid_confirmation',
      recipient_bidder_id: params.newBidderId,
      dedupe_key: `bid_confirmation:${params.bidId}`,
      payload: { itemId: params.itemId, itemTitle: params.itemTitle, amountCents: params.amountCents },
    },
  ]

  if (params.previousBidderId && params.previousBidderId !== params.newBidderId) {
    rows.push({
      template_key: 'outbid_notification',
      recipient_bidder_id: params.previousBidderId,
      dedupe_key: `outbid_notification:${params.bidId}`,
      payload: { itemId: params.itemId, itemTitle: params.itemTitle, currentAmountCents: params.amountCents },
    })
  }

  const { error } = await admin.from('email_outbox').insert(rows)
  if (error) {
    // Never fail the bid because email enqueueing had a problem — the bid
    // is already committed. Log for follow-up instead.
    logger.error('email_outbox_enqueue_failed', { message: error.message })
  }
}

const ERROR_MESSAGES: Record<string, { status: number; message: string }> = {
  NOT_AUTHENTICATED: { status: 401, message: 'Please sign in again to place a bid.' },
  ITEM_NOT_FOUND: { status: 404, message: 'This item could not be found.' },
  ITEM_PAUSED: { status: 409, message: 'Bidding on this item is paused right now.' },
  ITEM_NOT_OPEN: { status: 409, message: 'This item is not open for bidding.' },
  ITEM_CLOSED: { status: 409, message: 'Sorry, this item has just closed.' },
  BIDDING_PAUSED: { status: 409, message: 'Bidding is paused for the whole auction right now.' },
  INVALID_AMOUNT: { status: 400, message: 'Please enter a valid bid amount.' },
}

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Please sign in to place a bid.' }, { status: 401 })
  }

  const limit = rateLimit(`bid:${user.id}`, 20, 60)
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'You are bidding too quickly. Please wait a moment and try again.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
    )
  }

  const body = await request.json().catch(() => null)
  const parsed = placeBidSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please enter a valid bid amount.' }, { status: 400 })
  }

  const { data, error } = await supabase.rpc('place_bid', {
    p_item_id: parsed.data.itemId,
    p_amount_cents: parsed.data.amountCents,
  })

  if (error) {
    const [code, detail] = error.message.split(':')
    const known = code ? ERROR_MESSAGES[code] : undefined

    if (code === 'BID_TOO_LOW') {
      return NextResponse.json(
        { error: `Your bid is too low. The minimum acceptable bid is now ${detail} cents.`, minimumCents: Number(detail) },
        { status: 409 }
      )
    }

    if (known) {
      return NextResponse.json({ error: known.message }, { status: known.status })
    }

    logger.error('place_bid_unexpected_error', { message: error.message })
    return NextResponse.json(
      { error: 'The auction service is temporarily unavailable. Please try again shortly.' },
      { status: 503 }
    )
  }

  logger.info('bid_placed', { itemId: parsed.data.itemId })

  const result = data?.[0]
  if (result) {
    await enqueueBidEmails({
      bidId: result.bid_id,
      itemId: result.item_id,
      itemTitle: result.item_title,
      amountCents: result.amount_cents,
      newBidderId: user.id,
      previousBidderId: result.previous_bidder_id,
    })
  }

  return NextResponse.json({ ok: true, result })
}
