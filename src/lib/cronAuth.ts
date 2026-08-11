import 'server-only'

/** Vercel Cron sends this header; also accepted as a Bearer token for manual/CI triggering. */
export function isAuthorisedCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const authHeader = request.headers.get('authorization')
  return authHeader === `Bearer ${secret}`
}
