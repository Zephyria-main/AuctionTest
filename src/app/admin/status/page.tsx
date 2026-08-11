'use client'

import { useEffect, useState } from 'react'

interface StatusResponse {
  appEnv: string
  rehearsalMode: boolean
  database: { configured: boolean; reachable: boolean }
  stripe: { configured: boolean; testMode: boolean }
  email: { configured: boolean; fromAddress: string | null; pending: number; failed: number }
}

export default function AdminStatusPage() {
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/admin/status')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Failed to load status'))))
      .then(setStatus)
      .catch((err) => setError(err.message))
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">System status</h1>
      {error ? <p className="mt-4 text-red-700">{error}</p> : null}
      {status ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <StatusCard
            title="Environment"
            rows={[
              ['Mode', status.appEnv],
              ['Rehearsal guardrails', status.rehearsalMode ? 'ACTIVE' : 'off'],
            ]}
          />
          <StatusCard
            title="Database"
            rows={[
              ['Configured', status.database.configured ? 'Yes' : 'No'],
              ['Reachable', status.database.reachable ? 'Yes' : 'No'],
            ]}
            ok={status.database.reachable}
          />
          <StatusCard
            title="Stripe"
            rows={[
              ['Configured', status.stripe.configured ? 'Yes' : 'No'],
              ['Mode', status.stripe.testMode ? 'TEST' : 'LIVE'],
            ]}
            ok={status.stripe.configured}
          />
          <StatusCard
            title="Email (Resend)"
            rows={[
              ['Configured', status.email.configured ? 'Yes' : 'No'],
              ['From address', status.email.fromAddress ?? 'not set'],
              ['Pending in outbox', String(status.email.pending)],
              ['Failed in outbox', String(status.email.failed)],
            ]}
            ok={status.email.configured && status.email.failed === 0}
          />
        </div>
      ) : !error ? (
        <p className="mt-4 text-neutral-500">Loading...</p>
      ) : null}
    </div>
  )
}

function StatusCard({ title, rows, ok }: { title: string; rows: [string, string][]; ok?: boolean }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-neutral-900">{title}</h2>
        {ok !== undefined ? (
          <span className={`h-2.5 w-2.5 rounded-full ${ok ? 'bg-green-500' : 'bg-red-500'}`} aria-hidden />
        ) : null}
      </div>
      <dl className="mt-2 flex flex-col gap-1 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between">
            <dt className="text-neutral-500">{k}</dt>
            <dd className="font-medium">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
