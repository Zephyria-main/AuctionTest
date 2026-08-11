'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function PauseControl({ paused }: { paused: boolean }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function toggle() {
    setBusy(true)
    setError('')
    const supabase = createClient()
    const { error: rpcError } = await supabase.rpc('admin_set_bidding_paused', {
      p_paused: !paused,
      p_reason: reason || (paused ? 'Resumed by administrator' : 'Paused by administrator'),
    })
    setBusy(false)
    if (rpcError) {
      setError(rpcError.message)
      return
    }
    setConfirming(false)
    setReason('')
    router.refresh()
  }

  return (
    <div
      className={`rounded-lg border p-4 ${paused ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50'}`}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold">
            Bidding is currently {paused ? 'PAUSED for the whole auction' : 'active'}
          </p>
          <p className="text-sm text-neutral-600">
            Pausing immediately blocks every new bid, on every item, until resumed.
          </p>
        </div>
        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className={`focus-ring rounded-lg px-4 py-2 font-semibold text-white ${
              paused ? 'bg-green-700 hover:bg-green-800' : 'bg-red-700 hover:bg-red-800'
            }`}
          >
            {paused ? 'Resume bidding' : 'Pause all bidding'}
          </button>
        ) : null}
      </div>

      {confirming ? (
        <div className="mt-3 flex flex-col gap-2">
          <label className="text-sm font-medium">
            Reason (recorded in the audit log)
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="focus-ring mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2"
              placeholder={paused ? 'e.g. Issue resolved, resuming bidding' : 'e.g. Suspected system fault'}
            />
          </label>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={toggle}
              disabled={busy}
              className="focus-ring rounded-lg bg-neutral-900 px-4 py-2 font-semibold text-white disabled:opacity-50"
            >
              {busy ? 'Confirming...' : `Confirm ${paused ? 'resume' : 'pause'}`}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="focus-ring rounded-lg border border-neutral-300 px-4 py-2"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
