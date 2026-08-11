export function RehearsalBanner() {
  const appEnv = process.env.APP_ENV ?? process.env.NEXT_PUBLIC_APP_ENV ?? 'development'
  if (appEnv !== 'rehearsal') return null

  return (
    <div
      role="status"
      className="bg-accent px-4 py-2 text-center text-sm font-semibold text-neutral-900"
    >
      REHEARSAL MODE — test data only. No real payments are processed and no real bidders are
      emailed.
    </div>
  )
}
