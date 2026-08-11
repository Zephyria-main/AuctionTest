'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { centsToDisplay } from '@/lib/money'
import { formatSydney } from '@/lib/time'
import { StatusBadge } from '@/components/StatusBadge'
import { Countdown } from '@/components/Countdown'
import { itemImageUrl } from '@/lib/storage'
import { computeMinimumAcceptableBidCents } from '@/lib/bidding'
import type { PublicItem } from '@/components/useLiveItems'

interface ItemImage {
  id: string
  storage_path: string
  alt_text: string
}

export function ItemDetail({
  item: initialItem,
  images,
  isSignedIn,
}: {
  item: PublicItem
  images: ItemImage[]
  isSignedIn: boolean
}) {
  const [item, setItem] = useState(initialItem)
  const [isLeading, setIsLeading] = useState<boolean | null>(null)
  const [bidAmount, setBidAmount] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const minAcceptable = computeMinimumAcceptableBidCents({
    currentBidCents: item.current_bid_cents,
    openingBidCents: item.opening_bid_cents,
    minIncrementCents: item.min_increment_cents,
  })

  const refreshLeadingStatus = useCallback(async () => {
    if (!isSignedIn) return
    const supabase = createClient()
    const { data } = await supabase.rpc('my_bids')
    const mine = data?.find((row) => row.item_id === item.id)
    setIsLeading(mine?.is_leading ?? null)
  }, [isSignedIn, item.id])

  useEffect(() => {
    refreshLeadingStatus()
  }, [refreshLeadingStatus])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`item-${item.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'items', filter: `id=eq.${item.id}` },
        (payload) => {
          setItem((prev) => ({ ...prev, ...(payload.new as PublicItem) }))
          refreshLeadingStatus()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [item.id, refreshLeadingStatus])

  async function submitBid() {
    setSubmitting(true)
    setFeedback(null)
    const amountCents = Math.round(parseFloat(bidAmount) * 100)

    try {
      const res = await fetch('/api/bids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id, amountCents }),
      })
      const data = await res.json()
      if (!res.ok) {
        setFeedback({ type: 'error', message: data.error ?? 'Your bid could not be placed.' })
      } else {
        setFeedback({ type: 'success', message: 'Your bid was placed successfully.' })
        setBidAmount('')
        refreshLeadingStatus()
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network problem — your bid was not sent. Please try again.' })
    } finally {
      setSubmitting(false)
      setConfirming(false)
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div>
        {images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage image, intentionally not using next/image
          <img
            src={itemImageUrl(images[0].storage_path)}
            alt={images[0].alt_text}
            className="aspect-[4/3] w-full rounded-lg border border-neutral-200 object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex aspect-[4/3] w-full items-center justify-center rounded-lg border border-neutral-200 bg-neutral-100 text-neutral-400">
            Image coming soon
          </div>
        )}
      </div>

      <div>
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-2xl font-bold text-neutral-900">{item.title}</h1>
          <StatusBadge status={item.status} />
        </div>
        <p className="mt-1 text-sm text-neutral-500">Donated by {item.donor_name}</p>
        <p className="mt-4 text-neutral-700">{item.full_description}</p>

        <dl className="mt-6 grid grid-cols-2 gap-4 rounded-lg border border-neutral-200 bg-white p-4 text-sm">
          <div>
            <dt className="text-neutral-500">Estimated value</dt>
            <dd className="font-semibold">{centsToDisplay(item.estimated_value_cents)}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">{item.current_bid_cents ? 'Current bid' : 'Opening bid'}</dt>
            <dd className="font-semibold text-brand">
              {centsToDisplay(item.current_bid_cents ?? item.opening_bid_cents)}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">Minimum increment</dt>
            <dd className="font-semibold">{centsToDisplay(item.min_increment_cents)}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Closes</dt>
            <dd className="font-semibold">{formatSydney(item.closing_time)}</dd>
          </div>
        </dl>

        {item.status === 'open' ? (
          <div className="mt-4">
            <Countdown closingTimeIso={item.closing_time} />
          </div>
        ) : null}

        {isLeading !== null ? (
          <p
            className={`mt-3 rounded px-3 py-2 text-sm font-medium ${
              isLeading ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'
            }`}
          >
            {isLeading ? "You're currently winning this item." : "You've been outbid on this item."}
          </p>
        ) : null}

        {item.status === 'closed' ? (
          <p className="mt-4 rounded bg-neutral-100 px-3 py-2 text-sm text-neutral-700">
            This item is closed. {item.winner_bidder_id ? 'A winner has been determined.' : 'No bids were received.'}
          </p>
        ) : item.status === 'paused' ? (
          <p className="mt-4 rounded bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Bidding on this item is temporarily paused by the auction team.
          </p>
        ) : !isSignedIn ? (
          <div className="mt-6 rounded-lg border border-neutral-200 bg-white p-4">
            <p className="text-sm text-neutral-700">
              <Link href="/register" className="font-semibold text-brand underline">
                Register
              </Link>{' '}
              or{' '}
              <Link href="/login" className="font-semibold text-brand underline">
                sign in
              </Link>{' '}
              to place a bid.
            </p>
          </div>
        ) : (
          <div className="mt-6 rounded-lg border border-neutral-200 bg-white p-4">
            <label className="flex flex-col gap-1 text-sm font-medium text-neutral-800">
              Your bid (AUD) — minimum {centsToDisplay(minAcceptable)}
              <input
                type="number"
                inputMode="decimal"
                min={minAcceptable / 100}
                step="0.01"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                className="focus-ring rounded-lg border border-neutral-300 px-3 py-2 text-base"
              />
            </label>

            {feedback ? (
              <p
                role="alert"
                className={`mt-2 rounded px-3 py-2 text-sm ${
                  feedback.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                }`}
              >
                {feedback.message}
              </p>
            ) : null}

            {!confirming ? (
              <button
                type="button"
                disabled={!bidAmount || Number.isNaN(parseFloat(bidAmount))}
                onClick={() => setConfirming(true)}
                className="focus-ring mt-3 w-full rounded-lg bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
              >
                Place bid
              </button>
            ) : (
              <div className="mt-3 rounded-lg bg-neutral-50 p-3">
                <p className="text-sm text-neutral-800">
                  Confirm your bid of <strong>{centsToDisplay(Math.round(parseFloat(bidAmount) * 100))}</strong> on{' '}
                  <strong>{item.title}</strong>?
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={submitBid}
                    disabled={submitting}
                    className="focus-ring flex-1 rounded-lg bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
                  >
                    {submitting ? 'Placing bid...' : 'Confirm bid'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming(false)}
                    className="focus-ring flex-1 rounded-lg border border-neutral-300 px-4 py-2 font-semibold text-neutral-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
