import { NextResponse } from 'next/server'
import { isAuthorisedCronRequest } from '@/lib/cronAuth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

/**
 * Sweeps items whose closing_time has passed while still 'open', closes
 * them and determines winners (via close_expired_items()), then enqueues
 * winner-notification and payment-request emails. Intended to run every
 * minute via Vercel Cron; see vercel.json.
 */
export async function GET(request: Request) {
  if (!isAuthorisedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const admin = createAdminSupabaseClient()
  const { data: closedItems, error } = await admin.rpc('close_expired_items')

  if (error) {
    logger.error('close_expired_items_failed', { message: error.message })
    return NextResponse.json({ error: 'Failed to close items' }, { status: 500 })
  }

  const winners = (closedItems ?? []).filter((item) => item.winner_bidder_id)

  for (const item of winners) {
    if (!item.winner_bidder_id) continue

    await admin.from('email_outbox').insert({
      template_key: 'winner_notification',
      recipient_bidder_id: item.winner_bidder_id,
      dedupe_key: `winner_notification:${item.id}`,
      payload: { itemTitles: [item.title], totalDueCents: item.current_bid_cents ?? 0 },
    })

    // Recompute the bidder's full outstanding total across ALL their won,
    // unpaid items so each payment_request reflects the running total —
    // the winner page itself always shows the fully consolidated amount
    // regardless of how many of these reminders have gone out.
    const { data: wonItems } = await admin
      .from('items')
      .select('id, current_bid_cents')
      .eq('winner_bidder_id', item.winner_bidder_id)
      .eq('status', 'closed')

    const totalDueCents = (wonItems ?? []).reduce((sum, i) => sum + (i.current_bid_cents ?? 0), 0)

    await admin.from('email_outbox').insert({
      template_key: 'payment_request',
      recipient_bidder_id: item.winner_bidder_id,
      dedupe_key: `payment_request:${item.winner_bidder_id}:${item.id}`,
      payload: { totalDueCents },
    })
  }

  logger.info('close_expired_items_run', { closedCount: closedItems?.length ?? 0, winnerCount: winners.length })
  return NextResponse.json({ closed: closedItems?.length ?? 0, winners: winners.length })
}
