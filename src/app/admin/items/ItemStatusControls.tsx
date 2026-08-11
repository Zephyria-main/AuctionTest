'use client'

import { useState, useTransition } from 'react'
import { setItemStatus } from './actions'
import type { ItemStatus } from '@/types/database'

const TRANSITIONS: Record<ItemStatus, { to: ItemStatus; label: string }[]> = {
  draft: [{ to: 'open', label: 'Open' }],
  open: [
    { to: 'paused', label: 'Pause' },
    { to: 'closed', label: 'Close now' },
  ],
  paused: [
    { to: 'open', label: 'Resume' },
    { to: 'closed', label: 'Close now' },
  ],
  closed: [{ to: 'open', label: 'Reopen' }],
}

export function ItemStatusControls({ itemId, status }: { itemId: string; status: ItemStatus }) {
  const [pending, startTransition] = useTransition()
  const [confirmingTo, setConfirmingTo] = useState<ItemStatus | null>(null)
  const [reason, setReason] = useState('')

  function confirm(to: ItemStatus) {
    startTransition(async () => {
      await setItemStatus(itemId, to, reason || `Status changed to ${to} by administrator`)
      setConfirmingTo(null)
      setReason('')
    })
  }

  if (confirmingTo) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-neutral-50 p-2">
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for audit log"
          className="focus-ring rounded border border-neutral-300 px-2 py-1 text-sm"
        />
        <button
          type="button"
          onClick={() => confirm(confirmingTo)}
          disabled={pending}
          className="focus-ring rounded bg-neutral-900 px-3 py-1 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? 'Saving...' : `Confirm: ${confirmingTo}`}
        </button>
        <button type="button" onClick={() => setConfirmingTo(null)} className="focus-ring text-sm text-neutral-600">
          Cancel
        </button>
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      {TRANSITIONS[status].map((t) => (
        <button
          key={t.to}
          type="button"
          onClick={() => setConfirmingTo(t.to)}
          className="focus-ring rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-100"
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
