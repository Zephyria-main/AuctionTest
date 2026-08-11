'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { centsToDisplay } from '@/lib/money'
import { useRouter } from 'next/navigation'

interface BidRow {
  id: string
  amount_cents: number
  created_at: string
  voided_at: string | null
  void_reason: string | null
  bidder_number: number | null
  bidder_name: string | null
}

export function BidHistory({ bids }: { bids: BidRow[] }) {
  const router = useRouter()
  const [voidingId, setVoidingId] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')

  function voidBid(bidId: string) {
    if (!reason.trim()) {
      setError('A reason is required to void a bid.')
      return
    }
    startTransition(async () => {
      const supabase = createClient()
      const { error: rpcError } = await supabase.rpc('admin_void_bid', { p_bid_id: bidId, p_reason: reason })
      if (rpcError) {
        setError(rpcError.message)
        return
      }
      setVoidingId(null)
      setReason('')
      setError('')
      router.refresh()
    })
  }

  return (
    <div className="mt-3 overflow-x-auto rounded-lg border border-neutral-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-neutral-200 text-neutral-500">
          <tr>
            <th className="p-3">When</th>
            <th className="p-3">Bidder</th>
            <th className="p-3">Amount</th>
            <th className="p-3">Status</th>
            <th className="p-3" />
          </tr>
        </thead>
        <tbody>
          {bids.map((bid) => (
            <tr key={bid.id} className="border-b border-neutral-100 last:border-0 align-top">
              <td className="whitespace-nowrap p-3">{new Date(bid.created_at).toLocaleString('en-AU')}</td>
              <td className="p-3">
                #{bid.bidder_number} {bid.bidder_name}
              </td>
              <td className="p-3">{centsToDisplay(bid.amount_cents)}</td>
              <td className="p-3">
                {bid.voided_at ? (
                  <span className="text-red-700">Voided: {bid.void_reason}</span>
                ) : (
                  <span className="text-green-700">Active</span>
                )}
              </td>
              <td className="p-3">
                {!bid.voided_at &&
                  (voidingId === bid.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Reason"
                        className="focus-ring rounded border border-neutral-300 px-2 py-1"
                      />
                      <button
                        type="button"
                        onClick={() => voidBid(bid.id)}
                        disabled={pending}
                        className="focus-ring rounded bg-red-700 px-2 py-1 text-white disabled:opacity-50"
                      >
                        Confirm void
                      </button>
                      <button type="button" onClick={() => setVoidingId(null)} className="focus-ring text-neutral-600">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setVoidingId(bid.id)}
                      className="focus-ring rounded border border-red-300 px-2 py-1 text-red-700 hover:bg-red-50"
                    >
                      Void
                    </button>
                  ))}
              </td>
            </tr>
          ))}
          {bids.length === 0 ? (
            <tr>
              <td colSpan={5} className="p-3 text-neutral-500">
                No bids yet.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
      {error ? <p className="p-3 text-sm text-red-700">{error}</p> : null}
    </div>
  )
}
