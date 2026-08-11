import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ItemDetail } from './ItemDetail'

export const dynamic = 'force-dynamic'

export default async function ItemDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient()

  const [{ data: item, error }, { data: images }, { data: userData }] = await Promise.all([
    supabase
      .from('items')
      .select(
        'id, title, short_description, full_description, donor_name, estimated_value_cents, opening_bid_cents, min_increment_cents, current_bid_cents, closing_time, status, display_order, extensions_enabled, extension_trigger_minutes, extension_minutes, winner_bidder_id, winning_bid_id, created_at, updated_at'
      )
      .eq('id', params.id)
      .single(),
    supabase.from('item_images').select('id, storage_path, alt_text').eq('item_id', params.id).order('sort_order'),
    supabase.auth.getUser(),
  ])

  if (error || !item) {
    notFound()
  }

  return <ItemDetail item={item} images={images ?? []} isSignedIn={Boolean(userData.user)} />
}
