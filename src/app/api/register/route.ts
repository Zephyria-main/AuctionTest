import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { registrationSchema } from '@/lib/validation'
import { rateLimit } from '@/lib/rateLimit'
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const limit = rateLimit(`register:${ip}`, 5, 60)
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
    )
  }

  const body = await request.json().catch(() => null)
  const parsed = registrationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const { fullName, email, mobile, acceptedTerms, acceptedPrivacy, marketingConsent } = parsed.data
  const supabase = createServerSupabaseClient()

  const redirectBase = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${redirectBase}/auth/callback`,
      data: {
        full_name: fullName,
        mobile,
        accepted_terms: acceptedTerms,
        accepted_privacy: acceptedPrivacy,
        marketing_consent: marketingConsent,
      },
    },
  })

  if (error) {
    logger.error('registration_failed', { reason: error.message })
    return NextResponse.json(
      { error: 'We could not complete registration. Please try again in a moment.' },
      { status: 502 }
    )
  }

  logger.info('registration_otp_sent')
  return NextResponse.json({ ok: true })
}
