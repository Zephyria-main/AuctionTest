'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'

export default function RegisterPage() {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'sent' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('submitting')
    setErrorMessage('')

    const form = new FormData(event.currentTarget)
    const payload = {
      fullName: form.get('fullName'),
      email: form.get('email'),
      mobile: form.get('mobile'),
      acceptedTerms: form.get('acceptedTerms') === 'on',
      acceptedPrivacy: form.get('acceptedPrivacy') === 'on',
      marketingConsent: form.get('marketingConsent') === 'on',
    }

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMessage(data.error ?? 'Something went wrong. Please try again.')
        setStatus('error')
        return
      }
      setStatus('sent')
    } catch {
      setErrorMessage('We could not reach the server. Check your connection and try again.')
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <div className="mx-auto max-w-md rounded-lg border border-neutral-200 bg-white p-6 text-center">
        <h1 className="text-xl font-semibold text-neutral-900">Check your email</h1>
        <p className="mt-2 text-neutral-600">
          We&apos;ve sent you a sign-in link and code. Open it on this device to finish registering and
          start bidding.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold text-neutral-900">Register to bid</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Takes less than a minute. You&apos;ll receive a bidder number by email.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate>
        <Field label="Full name" name="fullName" autoComplete="name" required />
        <Field label="Email address" name="email" type="email" autoComplete="email" required />
        <Field label="Mobile number" name="mobile" type="tel" autoComplete="tel" required />

        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="acceptedTerms" required className="mt-1 focus-ring" />
          <span>
            I accept the{' '}
            <Link href="/terms" className="underline" target="_blank">
              auction terms
            </Link>
            .
          </span>
        </label>

        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="acceptedPrivacy" required className="mt-1 focus-ring" />
          <span>
            I have read the{' '}
            <Link href="/privacy" className="underline" target="_blank">
              privacy notice
            </Link>
            .
          </span>
        </label>

        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="marketingConsent" className="mt-1 focus-ring" />
          <span>
            Optional: keep me updated about future {`{organisation}`} news and appeals (separate
            from auction emails).
          </span>
        </label>

        {status === 'error' ? (
          <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={status === 'submitting'}
          className="focus-ring rounded-lg bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {status === 'submitting' ? 'Sending...' : 'Register'}
        </button>
      </form>
    </div>
  )
}

function Field({
  label,
  name,
  type = 'text',
  autoComplete,
  required,
}: {
  label: string
  name: string
  type?: string
  autoComplete?: string
  required?: boolean
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-neutral-800">
      {label}
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        className="focus-ring rounded-lg border border-neutral-300 px-3 py-2 text-base"
      />
    </label>
  )
}
