import { NextResponse } from 'next/server'
import { requireAdminForExport } from '@/lib/exportAuth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { toCsv } from '@/lib/csv'

export async function GET() {
  const auth = await requireAdminForExport()
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorised' }, { status: auth.status })

  const admin = createAdminSupabaseClient()
  const { data } = await admin
    .from('bids')
    .select(
      'id, created_at, amount_cents, voided_at, void_reason, items(title), profiles!bids_bidder_id_fkey(bidder_number, full_name)'
    )
    .order('created_at', { ascending: false })

  const csv = toCsv(
    (data ?? []).map((row) => {
      const r = row as unknown as {
        id: string
        created_at: string
        amount_cents: number
        voided_at: string | null
        void_reason: string | null
        items: { title: string } | null
        profiles: { bidder_number: number; full_name: string } | null
      }
      return {
        bid_id: r.id,
        item_title: r.items?.title ?? '',
        bidder_number: r.profiles?.bidder_number ?? '',
        bidder_name: r.profiles?.full_name ?? '',
        amount_cents: r.amount_cents,
        placed_at: r.created_at,
        voided: r.voided_at ? 'yes' : 'no',
        void_reason: r.void_reason ?? '',
      }
    })
  )

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="bids.csv"',
    },
  })
}
