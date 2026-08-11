import { NextResponse } from 'next/server'
import { isAuthorisedCronRequest } from '@/lib/cronAuth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

const WARNING_WINDOW_MINUTES = 15

/** Notifies every bidder who has an active bid on an item closing within the warning window. */
export async function GET(request: Request) {
  if (!isAuthorisedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const admin = createAdminSupabaseClient()
  const windowEnd = new Date(Date.now() + WARNING_WINDOW_MINUTES * 60 * 1000).toISOString()

  const { data: items, error } = await admin
    .from('items')
    .select('id, title, closing_time')
    .eq('status', 'open')
    .lte('closing_time', windowEnd)
    .gt('closing_time', new Date().toISOString())

  if (error) {
    logger.error('closing_soon_query_failed', { message: error.message })
    return NextResponse.json({ error: 'Failed to query items' }, { status: 500 })
  }

  let enqueued = 0
  for (const item of items ?? []) {
    const { data: bidders } = await admin
      .from('bids')
      .select('bidder_id')
      .eq('item_id', item.id)
      .is('voided_at', null)

    const distinctBidderIds = Array.from(new Set((bidders ?? []).map((b) => b.bidder_id)))

    for (const bidderId of distinctBidderIds) {
      const { error: insertError } = await admin.from('email_outbox').insert({
        template_key: 'closing_soon',
        recipient_bidder_id: bidderId,
        dedupe_key: `closing_soon:${item.id}:${bidderId}`,
        payload: { itemId: item.id, itemTitle: item.title, closingTimeIso: item.closing_time },
      })
      // Unique dedupe_key conflicts are expected and fine — already notified.
      if (!insertError) enqueued += 1
    }
  }

  return NextResponse.json({ itemsChecked: items?.length ?? 0, enqueued })
}
