/**
 * Rehearsal data generator: creates 100 test bidders (emails under
 * @rehearsal.test, clearly excluded from any real communication) and
 * realistic, staggered bid activity across all seeded auction items.
 *
 * Bids are placed by actually signing in as each test bidder and calling
 * the real place_bid() RPC — the same code path a real bidder's browser
 * uses — so this script doubles as a load/concurrency rehearsal tool.
 *
 * Usage:
 *   APP_ENV=rehearsal npm run seed:test-bidders
 *
 * Safe to re-run: existing @rehearsal.test bidders are reused rather than
 * duplicated (bidder emails are deterministic: bidder001@rehearsal.test..bidder100@rehearsal.test).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { requireEnv, assertNotProduction } from './lib/env'

assertNotProduction()

const SUPABASE_URL = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
const SERVICE_ROLE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
const ANON_KEY = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

const BIDDER_COUNT = 100
const TEST_PASSWORD = 'Rehearsal-Test-Password-2026!' // test accounts only; never used for real bidders
const CONCURRENT_BID_BATCH = 20 // used for the final-five-minutes concurrency rehearsal

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

const FIRST_NAMES = [
  'Olivia', 'Jack', 'Charlotte', 'William', 'Amelia', 'Noah', 'Isla', 'Oliver', 'Mia', 'Lucas',
  'Ava', 'Henry', 'Grace', 'Leo', 'Zoe', 'Thomas', 'Chloe', 'James', 'Ruby', 'Ethan',
]
const LAST_NAMES = [
  'Smith', 'Jones', 'Williams', 'Brown', 'Wilson', 'Taylor', 'Nguyen', 'Kelly', 'Chen', 'Ryan',
  'Walker', 'Robinson', 'Cook', 'Clarke', 'Bell', 'Ward', 'Hughes', 'Kim', 'Patel', 'Murphy',
]

function randomName(seed: number) {
  return `${FIRST_NAMES[seed % FIRST_NAMES.length]} ${LAST_NAMES[Math.floor(seed / FIRST_NAMES.length) % LAST_NAMES.length]}`
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

async function ensureTestBidders() {
  console.log(`Ensuring ${BIDDER_COUNT} rehearsal test bidders exist...`)
  const bidderClients: { index: number; email: string; client: SupabaseClient }[] = []

  for (let i = 1; i <= BIDDER_COUNT; i++) {
    const email = `bidder${String(i).padStart(3, '0')}@rehearsal.test`
    const fullName = `${randomName(i)} [TEST]`
    const mobile = `04${String(10000000 + i).slice(0, 8)}`

    const { data: existingUsers } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const existing = existingUsers?.users.find((u) => u.email === email)

    if (!existing) {
      const { error } = await admin.auth.admin.createUser({
        email,
        password: TEST_PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          mobile,
          accepted_terms: true,
          accepted_privacy: true,
          marketing_consent: false,
        },
      })
      if (error) {
        console.error(`Failed to create ${email}:`, error.message)
        continue
      }
    }

    const client = createClient(SUPABASE_URL, ANON_KEY)
    const { error: signInError } = await client.auth.signInWithPassword({ email, password: TEST_PASSWORD })
    if (signInError) {
      console.error(`Failed to sign in ${email}:`, signInError.message)
      continue
    }

    bidderClients.push({ index: i, email, client })
    if (i % 20 === 0) console.log(`  ...${i}/${BIDDER_COUNT} ready`)
  }

  console.log(`${bidderClients.length} test bidders ready.`)
  return bidderClients
}

async function placeBidActivity(bidderClients: { index: number; client: SupabaseClient }[]) {
  const { data: items, error } = await admin
    .from('items')
    .select('id, title, opening_bid_cents, min_increment_cents, status')
    .order('display_order')

  if (error || !items) {
    console.error('Failed to load items:', error?.message)
    return
  }

  console.log(`Placing realistic bid activity across ${items.length} items...`)

  for (const item of items) {
    if (item.status !== 'open') {
      console.log(`  Skipping "${item.title}" (status: ${item.status})`)
      continue
    }

    const bidCount = randomInt(5, 25)
    let currentCents = item.opening_bid_cents

    for (let round = 0; round < bidCount; round++) {
      const bidder = bidderClients[randomInt(0, bidderClients.length - 1)]
      if (!bidder) continue
      const increment = item.min_increment_cents * randomInt(1, 3)
      currentCents += increment

      const { error: bidError } = await bidder.client.rpc('place_bid', {
        p_item_id: item.id,
        p_amount_cents: currentCents,
      })
      if (bidError) {
        // Expected occasionally if a "concurrent" run already raised the price higher.
        currentCents -= increment
      }
    }
    console.log(`  "${item.title}": ${bidCount} bid attempts, final price ~$${(currentCents / 100).toFixed(2)}`)
  }
}

async function rehearseFinalFiveMinutes(bidderClients: { index: number; client: SupabaseClient }[]) {
  const { data: items } = await admin.from('items').select('id, title, current_bid_cents, min_increment_cents').eq('status', 'open').limit(1)
  const item = items?.[0]
  if (!item) {
    console.log('No open item available for the concurrency rehearsal — skipping.')
    return
  }

  console.log(`\nConcurrency rehearsal: firing ${CONCURRENT_BID_BATCH} simultaneous bids at "${item.title}"...`)
  const base = (item.current_bid_cents ?? 0) + item.min_increment_cents

  const results = await Promise.allSettled(
    Array.from({ length: CONCURRENT_BID_BATCH }, (_, i) => {
      const bidder = bidderClients[randomInt(0, bidderClients.length - 1)]
      if (!bidder) return Promise.resolve({ error: new Error('no bidder available') })
      return bidder.client.rpc('place_bid', { p_item_id: item.id, p_amount_cents: base + i * item.min_increment_cents })
    })
  )

  const succeeded = results.filter((r) => r.status === 'fulfilled' && !(r.value as { error: unknown }).error).length
  console.log(`  ${succeeded}/${CONCURRENT_BID_BATCH} concurrent bids accepted (some rejections are expected and correct).`)
}

async function main() {
  const bidderClients = await ensureTestBidders()
  if (bidderClients.length === 0) {
    console.error('No test bidders available — aborting bid activity.')
    process.exit(1)
  }
  await placeBidActivity(bidderClients)
  await rehearseFinalFiveMinutes(bidderClients)
  console.log('\nDone. Use docs/RECOVERY_GUIDE.md and docs/LAUNCH_CHECKLIST.md rehearsal steps next.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
