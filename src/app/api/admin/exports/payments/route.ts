import { NextResponse } from 'next/server'
import { requireAdminForExport } from '@/lib/exportAuth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { toCsv } from '@/lib/csv'

export async function GET() {
  const auth = await requireAdminForExport()
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorised' }, { status: auth.status })

  const admin = createAdminSupabaseClient()
  const { data } = await admin
    .from('payments')
    .select(
      'id, status, amount_cents, is_rehearsal, stripe_checkout_session_id, created_at, updated_at, profiles!payments_winner_bidder_id_fkey(bidder_number, full_name, email)'
    )
    .order('created_at', { ascending: false })

  const csv = toCsv(
    (data ?? []).map((row) => {
      const r = row as unknown as {
        id: string
        status: string
        amount_cents: number
        is_rehearsal: boolean
        stripe_checkout_session_id: string | null
        created_at: string
        updated_at: string
        profiles: { bidder_number: number; full_name: string; email: string } | null
      }
      return {
        payment_id: r.id,
        status: r.status,
        amount_cents: r.amount_cents,
        is_rehearsal: r.is_rehearsal ? 'yes' : 'no',
        stripe_checkout_session_id: r.stripe_checkout_session_id ?? '',
        bidder_number: r.profiles?.bidder_number ?? '',
        bidder_name: r.profiles?.full_name ?? '',
        bidder_email: r.profiles?.email ?? '',
        created_at: r.created_at,
        updated_at: r.updated_at,
      }
    })
  )

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="payments.csv"',
    },
  })
}
