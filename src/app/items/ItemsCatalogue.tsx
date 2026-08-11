'use client'

import { useMemo, useState } from 'react'
import { useLiveItems, type PublicItem } from '@/components/useLiveItems'
import { ItemCard } from '@/components/ItemCard'

type Filter = 'all' | 'open' | 'closing_soon' | 'won' | 'closed'

export function ItemsCatalogue({ initialItems }: { initialItems: PublicItem[] }) {
  const { items, connectionState } = useLiveItems(initialItems)
  const [filter, setFilter] = useState<Filter>('all')

  const filtered = useMemo(() => {
    const now = Date.now()
    return items.filter((item) => {
      switch (filter) {
        case 'open':
          return item.status === 'open'
        case 'closing_soon':
          return (
            item.status === 'open' &&
            new Date(item.closing_time).getTime() - now <= 15 * 60 * 1000
          )
        case 'won':
          return item.status === 'closed' && Boolean(item.winner_bidder_id)
        case 'closed':
          return item.status === 'closed'
        default:
          return true
      }
    })
  }, [items, filter])

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-neutral-900">Auction items</h1>
        {connectionState === 'disconnected' ? (
          <span className="rounded bg-amber-100 px-2 py-1 text-xs text-amber-800" role="status">
            Live updates paused — reconnecting. Prices shown may be a few seconds behind.
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter items">
        {(
          [
            ['all', 'All'],
            ['open', 'Open'],
            ['closing_soon', 'Closing soon'],
            ['won', 'Won'],
            ['closed', 'Closed'],
          ] as [Filter, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            aria-pressed={filter === value}
            className={`focus-ring rounded-full border px-3 py-1.5 text-sm font-medium ${
              filter === value
                ? 'border-brand bg-brand text-white'
                : 'border-neutral-300 bg-white text-neutral-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-8 text-center text-neutral-500">No items match this filter yet.</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
