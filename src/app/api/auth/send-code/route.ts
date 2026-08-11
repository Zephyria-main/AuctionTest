import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { emailCodeRequestSchema } from '@/lib/validation'
import { rateLimit } from '@/lib/rateLimit'

/** Sign-in (not registration) for an already-registered bidder or admin. */
export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const limit = rateLimit(`signin:${ip}`, 5, 60)
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
    )
  }

  const body = await request.json().catch(() => null)
  const parsed = emailCodeRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 })
  }

  const supabase = createServerSupabaseClient()
  const redirectBase = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { shouldCreateUser: false, emailRedirectTo: `${redirectBase}/auth/callback` },
  })

  // Always return ok, even if the email is not registered, to avoid
  // leaking which email addresses are registered bidders.
  if (error) {
    return NextResponse.json({ ok: true })
  }
  return NextResponse.json({ ok: true })
}
