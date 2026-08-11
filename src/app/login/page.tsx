'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'

export default function LoginPage() {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'sent'>('idle')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('submitting')
    const email = new FormData(event.currentTarget).get('email')
    await fetch('/api/auth/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    setStatus('sent')
  }

  if (status === 'sent') {
    return (
      <div className="mx-auto max-w-md rounded-lg border border-neutral-200 bg-white p-6 text-center">
        <h1 className="text-xl font-semibold text-neutral-900">Check your email</h1>
        <p className="mt-2 text-neutral-600">
          If that address is registered, a sign-in link is on its way. Open it on this device.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold text-neutral-900">Sign in</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Not registered yet?{' '}
        <Link href="/register" className="underline">
          Register here
        </Link>
        .
      </p>
      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-800">
          Email address
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="focus-ring rounded-lg border border-neutral-300 px-3 py-2 text-base"
          />
        </label>
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="focus-ring rounded-lg bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {status === 'submitting' ? 'Sending...' : 'Email me a sign-in link'}
        </button>
      </form>
    </div>
  )
}
