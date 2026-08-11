import type { ItemStatus } from '@/types/database'

const LABELS: Record<ItemStatus, string> = {
  draft: 'Draft',
  open: 'Open',
  paused: 'Paused',
  closed: 'Closed',
}

const STYLES: Record<ItemStatus, string> = {
  draft: 'bg-neutral-100 text-neutral-600',
  open: 'bg-green-100 text-green-800',
  paused: 'bg-amber-100 text-amber-800',
  closed: 'bg-neutral-200 text-neutral-700',
}

export function StatusBadge({ status, closingSoon }: { status: ItemStatus; closingSoon?: boolean }) {
  if (status === 'open' && closingSoon) {
    return (
      <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
        Closing soon
      </span>
    )
  }
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STYLES[status]}`}>
      {LABELS[status]}
    </span>
  )
}
