'use client'

import { useEffect, useState } from 'react'
import { computeClockOffsetMs, approxServerNow } from '@/lib/time'

/**
 * Countdown based on server time, calibrated once via /api/server-time and
 * then ticking locally against Date.now() + offset — never the bidder's
 * uncalibrated device clock alone.
 */
export function Countdown({ closingTimeIso }: { closingTimeIso: string }) {
  const [offsetMs, setOffsetMs] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/server-time')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.now) {
          setOffsetMs(computeClockOffsetMs(data.now, Date.now()))
        }
      })
      .catch(() => {
        if (!cancelled) setOffsetMs(0) // fall back to device clock rather than showing nothing
      })
    return () => {
      cancelled = true
    }
  }, [])

  const [, forceTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [])

  if (offsetMs === null) {
    return <span className="text-sm text-neutral-500">Loading countdown...</span>
  }

  const nowMs = approxServerNow(offsetMs)
  const closingMs = new Date(closingTimeIso).getTime()
  const remainingMs = closingMs - nowMs

  if (remainingMs <= 0) {
    return <span className="font-semibold text-neutral-600">Closed</span>
  }

  const totalSeconds = Math.floor(remainingMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const isUrgent = remainingMs <= 5 * 60 * 1000

  const label =
    hours > 0
      ? `${hours}h ${minutes}m ${seconds}s`
      : `${minutes}m ${seconds}s`

  return (
    <span
      className={`font-mono font-semibold ${isUrgent ? 'text-red-700' : 'text-neutral-800'}`}
      aria-live="polite"
    >
      {label} remaining
    </span>
  )
}
