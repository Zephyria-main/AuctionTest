'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

/**
 * Browser Supabase client. Uses only the public anon key — RLS policies
 * enforce what a signed-in bidder may read or write. Never import the
 * service role key here.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
