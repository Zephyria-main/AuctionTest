import Link from 'next/link'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { centsToDisplay } from '@/lib/money'
import { ItemStatusControls } from './ItemStatusControls'

export const dynamic = 'force-dynamic'

export default async function AdminItemsPage() {
  const admin = createAdminSupabaseClient()
  const { data: items } = await admin
    .from('items')
    .select('id, title, status, current_bid_cents, opening_bid_cents, closing_time, display_order')
    .order('display_order')

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Items</h1>
        <Link
          href="/admin/items/new"
          className="focus-ring rounded-lg bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-dark"
        >
          Add item
        </Link>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {items?.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white p-4">
            <div>
              <Link href={`/admin/items/${item.id}/edit`} className="font-semibold text-brand underline">
                {item.title}
              </Link>
              <p className="text-sm text-neutral-500">
                {item.current_bid_cents ? centsToDisplay(item.current_bid_cents) : `Opening ${centsToDisplay(item.opening_bid_cents)}`}
                {' · '}Closes {new Date(item.closing_time).toLocaleString('en-AU')}
              </p>
            </div>
            <ItemStatusControls itemId={item.id} status={item.status} />
          </div>
        ))}
      </div>
    </div>
  )
}
