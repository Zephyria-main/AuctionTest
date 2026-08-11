import { NextResponse } from 'next/server'
import { requireAdminForExport } from '@/lib/exportAuth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { toCsv } from '@/lib/csv'

export async function GET() {
  const auth = await requireAdminForExport()
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorised' }, { status: auth.status })

  const admin = createAdminSupabaseClient()
  const { data } = await admin
    .from('profiles')
    .select('bidder_number, full_name, email, mobile, marketing_consent, accepted_terms_at, accepted_privacy_at, created_at')
    .eq('role', 'bidder')
    .order('bidder_number')

  const csv = toCsv(
    (data ?? []).map((b) => ({
      bidder_number: b.bidder_number,
      full_name: b.full_name,
      email: b.email,
      mobile: b.mobile,
      // Explicit SupporterHub consent field: only 'yes' may be imported as a marketing contact.
      supporterhub_marketing_consent: b.marketing_consent ? 'yes' : 'no',
      accepted_terms_at: b.accepted_terms_at,
      accepted_privacy_at: b.accepted_privacy_at,
      registered_at: b.created_at,
    }))
  )

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="bidders.csv"',
    },
  })
}
