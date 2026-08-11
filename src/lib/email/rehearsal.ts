import 'server-only'

/**
 * Rehearsal mode guardrails: when APP_ENV=rehearsal, every outbound email
 * subject is prefixed and, unless an explicit rehearsal recipient override
 * is set, delivery is redirected to REHEARSAL_EMAIL_OVERRIDE so no real
 * bidder ever receives a rehearsal message. This function is called from
 * the outbox processor before handing a message to the EmailProvider.
 */
export function applyRehearsalGuardrails(
  originalTo: string,
  subject: string
): { to: string; subject: string } {
  const appEnv = process.env.APP_ENV ?? 'development'
  if (appEnv !== 'rehearsal') {
    return { to: originalTo, subject }
  }

  const override = process.env.REHEARSAL_EMAIL_OVERRIDE
  const labelledSubject = `[REHEARSAL - TEST ONLY] ${subject}`

  if (override) {
    return { to: override, subject: labelledSubject }
  }

  // No override configured: refuse to send rather than risk emailing a
  // real address. The outbox processor treats this as a hard failure.
  throw new Error(
    'APP_ENV=rehearsal requires REHEARSAL_EMAIL_OVERRIDE to be set before any email is sent'
  )
}

export function isRehearsalMode(): boolean {
  return (process.env.APP_ENV ?? 'development') === 'rehearsal'
}
