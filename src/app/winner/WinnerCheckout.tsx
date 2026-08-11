'use client'

import { useState } from 'react'
import { centsToDisplay } from '@/lib/money'

interface WonItem {
  id: string
  title: string
  current_bid_cents: number | null
}

export function WinnerCheckout({ unpaidItems, paidItems }: { unpaidItems: WonItem[]; paidItems: WonItem[] }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const total = unpaidItems.reduce((sum, item) => sum + (item.current_bid_cents ?? 0), 0)

  async function payNow() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds: unpaidItems.map((i) => i.id) }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) {
        setError(data.error ?? 'We could not start checkout. Please try again.')
        setLoading(false)
        return
      }
      window.location.href = data.url
    } catch {
      setError('Network problem starting checkout. Please try again.')
      setLoading(false)
    }
  }

  if (unpaidItems.length === 0 && paidItems.length === 0) {
    return (
      <p className="mt-6 rounded-lg border border-dashed border-neutral-300 p-8 text-center text-neutral-500">
        You don&apos;t have any won items yet. Once the auction closes, anything you&apos;ve won will
        appear here.
      </p>
    )
  }

  return (
    <div className="mt-6 flex flex-col gap-6">
      {unpaidItems.length > 0 ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-5">
          <h2 className="font-semibold text-neutral-900">Payment due</h2>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {unpaidItems.map((item) => (
              <li key={item.id} className="flex justify-between">
                <span>{item.title}</span>
                <span className="font-medium">{centsToDisplay(item.current_bid_cents ?? 0)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-between border-t border-neutral-200 pt-3 font-bold">
            <span>Total due</span>
            <span>{centsToDisplay(total)}</span>
          </div>
          {error ? (
            <p role="alert" className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          ) : null}
          <button
            type="button"
            onClick={payNow}
            disabled={loading}
            className="focus-ring mt-4 w-full rounded-lg bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {loading ? 'Starting secure checkout...' : `Pay ${centsToDisplay(total)} now`}
          </button>
          <p className="mt-2 text-center text-xs text-neutral-500">
            You&apos;ll be taken to Stripe&apos;s secure checkout. We never see or store your card details.
          </p>
        </div>
      ) : null}

      {paidItems.length > 0 ? (
        <div className="rounded-lg border border-green-200 bg-green-50 p-5">
          <h2 className="font-semibold text-green-900">Paid</h2>
          <ul className="mt-3 flex flex-col gap-2 text-sm text-green-900">
            {paidItems.map((item) => (
              <li key={item.id} className="flex justify-between">
                <span>{item.title}</span>
                <span className="font-medium">{centsToDisplay(item.current_bid_cents ?? 0)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
