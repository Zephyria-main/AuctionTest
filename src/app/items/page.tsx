import { ItemsCatalogue } from './ItemsCatalogue'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function ItemsPage() {
  const supabase = createServerSupabaseClient()
  const { data: items, error } = await supabase
    .from('items')
    .select(
      'id, title, short_description, full_description, donor_name, estimated_value_cents, opening_bid_cents, min_increment_cents, current_bid_cents, closing_time, status, display_order, extensions_enabled, extension_trigger_minutes, extension_minutes, winner_bidder_id, winning_bid_id, created_at, updated_at'
    )
    .order('display_order', { ascending: true })

  if (error) {
    return (
      <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-800">
        We couldn&apos;t load the catalogue right now. Please refresh the page in a moment.
      </div>
    )
  }

  return <ItemsCatalogue initialItems={items ?? []} />
}
