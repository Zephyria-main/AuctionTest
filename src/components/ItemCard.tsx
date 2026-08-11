import Link from 'next/link'
import { centsToDisplay } from '@/lib/money'
import { StatusBadge } from './StatusBadge'
import type { PublicItem } from './useLiveItems'

export function ItemCard({ item }: { item: PublicItem }) {
  const closingSoon =
    item.status === 'open' &&
    new Date(item.closing_time).getTime() - Date.now() <= 15 * 60 * 1000
  const displayPrice = item.current_bid_cents ?? item.opening_bid_cents
  const priceLabel = item.current_bid_cents ? 'Current bid' : 'Opening bid'

  return (
    <Link
      href={`/items/${item.id}`}
      className="focus-ring flex flex-col rounded-lg border border-neutral-200 bg-white p-4 transition hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-neutral-900">{item.title}</h3>
        <StatusBadge status={item.status} closingSoon={closingSoon} />
      </div>
      <p className="mt-1 line-clamp-2 text-sm text-neutral-600">{item.short_description}</p>
      <div className="mt-3 flex items-end justify-between">
        <div>
          <p className="text-xs uppercase text-neutral-500">{priceLabel}</p>
          <p className="text-lg font-bold text-brand">{centsToDisplay(displayPrice)}</p>
        </div>
        <p className="text-xs text-neutral-500">Donated by {item.donor_name}</p>
      </div>
    </Link>
  )
}
