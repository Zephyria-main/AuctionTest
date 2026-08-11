import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const admin = createAdminSupabaseClient()
    const { error } = await admin.from('auction_settings').select('id').limit(1)
    if (error) {
      return NextResponse.json({ status: 'degraded', database: 'error' }, { status: 503 })
    }
    return NextResponse.json({ status: 'ok', database: 'ok', timestamp: new Date().toISOString() })
  } catch {
    return NextResponse.json({ status: 'degraded', database: 'unreachable' }, { status: 503 })
  }
}
