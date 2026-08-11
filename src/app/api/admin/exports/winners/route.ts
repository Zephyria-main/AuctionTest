import { NextResponse } from 'next/server'
import { requireAdminForExport } from '@/lib/exportAuth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { toCsv } from '@/lib/csv'

export async function GET() {
  const auth = await requireAdminForExport()
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorised' }, { status: auth.status })

  const admin = createAdminSupabaseClient()
  const { data } = await admin
    .from('items')
    .select('title, current_bid_cents, closing_time, profiles!items_winner_bidder_id_fkey(bidder_number, full_name, email, mobile)')
    .eq('status', 'closed')
    .not('winner_bidder_id', 'is', null)
    .order('title')

  const csv = toCsv(
    (data ?? []).map((row) => {
      const r = row as unknown as {
        title: string
        current_bid_cents: number | null
        closing_time: string
        profiles: { bidder_number: number; full_name: string; email: string; mobile: string } | null
      }
      return {
        item_title: r.title,
        winning_amount_cents: r.current_bid_cents ?? 0,
        closed_at: r.closing_time,
        bidder_number: r.profiles?.bidder_number ?? '',
        bidder_name: r.profiles?.full_name ?? '',
        bidder_email: r.profiles?.email ?? '',
        bidder_mobile: r.profiles?.mobile ?? '',
      }
    })
  )

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="winners.csv"',
    },
  })
}
