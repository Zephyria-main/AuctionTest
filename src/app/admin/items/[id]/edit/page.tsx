import { notFound } from 'next/navigation'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { ItemForm } from '../../ItemForm'
import { updateItem } from '../../actions'
import { ImageUploader } from './ImageUploader'
import { BidHistory } from './BidHistory'

export default async function EditItemPage({ params }: { params: { id: string } }) {
  const admin = createAdminSupabaseClient()
  const [{ data: item }, { data: images }, { data: bids }] = await Promise.all([
    admin.from('items').select('*').eq('id', params.id).single(),
    admin.from('item_images').select('id, storage_path, alt_text').eq('item_id', params.id).order('sort_order'),
    admin
      .from('bids')
      .select('id, amount_cents, created_at, voided_at, void_reason, profiles!bids_bidder_id_fkey(bidder_number, full_name)')
      .eq('item_id', params.id)
      .order('created_at', { ascending: false }),
  ])

  if (!item) notFound()

  const boundUpdate = updateItem.bind(null, item.id)

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-neutral-900">Edit item</h1>
      <div className="mt-6">
        <ItemForm
          action={boundUpdate}
          initial={{
            title: item.title,
            shortDescription: item.short_description,
            fullDescription: item.full_description,
            donorName: item.donor_name,
            estimatedValueDollars: String(item.estimated_value_cents / 100),
            openingBidDollars: String(item.opening_bid_cents / 100),
            minIncrementDollars: String(item.min_increment_cents / 100),
            closingTime: item.closing_time.slice(0, 16),
            extensionsEnabled: item.extensions_enabled === null ? 'inherit' : item.extensions_enabled ? 'true' : 'false',
            extensionTriggerMinutes: item.extension_trigger_minutes?.toString() ?? '',
            extensionMinutes: item.extension_minutes?.toString() ?? '',
            displayOrder: String(item.display_order),
          }}
        />
      </div>

      <div className="mt-8">
        <h2 className="font-semibold text-neutral-900">Images</h2>
        <ImageUploader itemId={item.id} existingImages={images ?? []} />
      </div>

      <div className="mt-8">
        <h2 className="font-semibold text-neutral-900">Bid history</h2>
        <BidHistory
          bids={(bids ?? []).map((b) => {
            const profile = b.profiles as unknown as { bidder_number: number; full_name: string } | null
            return {
              id: b.id,
              amount_cents: b.amount_cents,
              created_at: b.created_at,
              voided_at: b.voided_at,
              void_reason: b.void_reason,
              bidder_number: profile?.bidder_number ?? null,
              bidder_name: profile?.full_name ?? null,
            }
          })}
        />
      </div>
    </div>
  )
}
