import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

/** Lets the client calibrate a clock-skew offset against the database clock. */
export async function GET() {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase.rpc('server_now')
  if (error) {
    return NextResponse.json({ error: 'unavailable' }, { status: 503 })
  }
  return NextResponse.json({ now: data }, { headers: { 'Cache-Control': 'no-store' } })
}
