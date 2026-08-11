import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

/**
 * TEST-ONLY password sign-in for Playwright e2e specs, so end-to-end tests
 * can authenticate without driving the email magic-link flow through a
 * real inbox. Disabled outside development/rehearsal/test — this route
 * must never exist in a production deployment.
 */
export async function POST(request: Request) {
  const appEnv = process.env.APP_ENV ?? 'development'
  if (appEnv === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await request.json().catch(() => null)
  if (!body?.email || !body?.password) {
    return NextResponse.json({ error: 'email and password required' }, { status: 400 })
  }

  const supabase = createServerSupabaseClient()
  const { error } = await supabase.auth.signInWithPassword({ email: body.email, password: body.password })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }
  return NextResponse.json({ ok: true })
}
