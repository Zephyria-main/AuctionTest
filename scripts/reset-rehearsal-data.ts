/**
 * Final production data reset: removes rehearsal bidders, their bids,
 * payments and outbox emails, while leaving item configuration (titles,
 * descriptions, images, values, closing times) untouched — ready for real
 * registrations to begin.
 *
 * Deletes everything matching the rehearsal email pattern (default:
 * %@rehearsal.test) from both public.profiles (via the reset_rehearsal_data
 * SQL function) and the corresponding auth.users rows (via the admin API,
 * since auth schema isn't reachable from SQL functions here).
 *
 * Usage:
 *   npm run reset:rehearsal
 *   npm run reset:rehearsal -- --pattern="%@rehearsal.test" --yes
 */
import { createClient } from '@supabase/supabase-js'
import { requireEnv } from './lib/env'

const SUPABASE_URL = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
const SERVICE_ROLE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY')

const args = process.argv.slice(2)
const patternArg = args.find((a) => a.startsWith('--pattern='))
const pattern: string = patternArg ? (patternArg.split('=')[1] ?? '%@rehearsal.test') : '%@rehearsal.test'
const confirmed = args.includes('--yes')

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

async function main() {
  console.log(`This will permanently delete all bidders (and their bids/payments) matching: ${pattern}`)
  console.log('Item configuration (titles, descriptions, images, values) is NOT affected.')

  if (!confirmed) {
    console.log('\nRe-run with --yes to proceed, e.g.:')
    console.log(`  npm run reset:rehearsal -- --pattern="${pattern}" --yes`)
    process.exit(0)
  }

  const { data: profilesToDelete } = await admin.from('profiles').select('id').eq('role', 'bidder').ilike('email', pattern)

  const { data: result, error } = await admin.rpc('reset_rehearsal_data', { p_email_pattern: pattern })
  if (error) {
    console.error('Reset failed:', error.message)
    process.exit(1)
  }

  console.log('Database rows removed:', result?.[0])

  // Also remove the corresponding auth.users so the same test emails can
  // be reused next rehearsal without conflicting with the unique email index.
  let authDeleted = 0
  for (const profile of profilesToDelete ?? []) {
    const { error: authError } = await admin.auth.admin.deleteUser(profile.id)
    if (!authError) authDeleted += 1
  }
  console.log(`Removed ${authDeleted} matching auth.users accounts.`)
  console.log('\nDone. Items and their configuration were left untouched.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
