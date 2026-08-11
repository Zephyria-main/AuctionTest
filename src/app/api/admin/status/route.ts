import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { isStripeTestMode } from '@/lib/stripe'
import { isRehearsalMode } from '@/lib/email/rehearsal'

/**
 * Admin-only status summary. Reports whether each integration is
 * configured/reachable without ever returning the underlying secret
 * values.
 */
export async function GET() {
  const supabase = createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminSupabaseClient()

  const dbCheck = await admin.from('auction_settings').select('id').limit(1)
  const { count: pendingEmailCount } = await admin
    .from('email_outbox')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')
  const { count: failedEmailCount } = await admin
    .from('email_outbox')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'failed')

  return NextResponse.json({
    appEnv: process.env.APP_ENV ?? 'development',
    rehearsalMode: isRehearsalMode(),
    database: { configured: true, reachable: !dbCheck.error },
    stripe: { configured: Boolean(process.env.STRIPE_SECRET_KEY), testMode: isStripeTestMode() },
    email: {
      configured: Boolean(process.env.RESEND_API_KEY),
      fromAddress: process.env.EMAIL_FROM_ADDRESS ?? null,
      pending: pendingEmailCount ?? 0,
      failed: failedEmailCount ?? 0,
    },
  })
}
