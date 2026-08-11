import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export const supabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export function adminClient(): SupabaseClient<Database> {
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

let counter = 0

/** Creates a fresh, unique test bidder and returns a signed-in client for them. */
export async function createTestBidder(prefix = 'itest'): Promise<{ id: string; client: SupabaseClient<Database> }> {
  counter += 1
  const email = `${prefix}-${Date.now()}-${counter}@integration.test`
  const password = 'Integration-Test-Password-1!'
  const admin = adminClient()

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `Integration Test ${counter}`, mobile: '0400000000', accepted_terms: true, accepted_privacy: true },
  })
  if (error || !data.user) throw new Error(`Failed to create test bidder: ${error?.message}`)

  const client = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { error: signInError } = await client.auth.signInWithPassword({ email, password })
  if (signInError) throw new Error(`Failed to sign in test bidder: ${signInError.message}`)

  return { id: data.user.id, client }
}

export async function createTestItem(
  overrides: Partial<Database['public']['Tables']['items']['Insert']> = {}
): Promise<string> {
  const admin = adminClient()
  const { data, error } = await admin
    .from('items')
    .insert({
      title: `Integration test item ${Date.now()}`,
      short_description: 'Test',
      full_description: 'Test',
      donor_name: 'Test donor',
      estimated_value_cents: 10000,
      opening_bid_cents: 5000,
      min_increment_cents: 500,
      closing_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      status: 'open',
      ...overrides,
    })
    .select('id')
    .single()
  if (error || !data) throw new Error(`Failed to create test item: ${error?.message}`)
  return data.id
}

export async function cleanupTestData(itemIds: string[], bidderIds: string[]) {
  const admin = adminClient()
  await admin.from('bids').delete().in('item_id', itemIds)
  await admin.from('items').delete().in('id', itemIds)
  for (const id of bidderIds) {
    await admin.auth.admin.deleteUser(id).catch(() => undefined)
  }
}
