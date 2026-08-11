import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { SettingsForm } from './SettingsForm'

export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage() {
  const admin = createAdminSupabaseClient()
  const { data: settings } = await admin.from('auction_settings').select('*').single()

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-neutral-900">Auction settings</h1>
      <p className="mt-1 text-sm text-neutral-600">
        These are the auction-wide defaults. Individual items can override the extension rule.
      </p>
      {settings ? <SettingsForm settings={settings} /> : null}
    </div>
  )
}
