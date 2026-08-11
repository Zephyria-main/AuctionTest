import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * Service-role Supabase client. Bypasses RLS entirely — use ONLY in trusted
 * server contexts (route handlers, cron jobs, admin server actions) that
 * have already authorised the caller. Never import this module in a file
 * that can end up in a client bundle; the `server-only` import throws a
 * build error if that happens.
 */
let adminClient: SupabaseClient<Database> | null = null

export function createAdminSupabaseClient(): SupabaseClient<Database> {
  if (adminClient) return adminClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Supabase service role credentials are not configured')
  }

  adminClient = createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return adminClient
}
