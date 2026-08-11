import 'server-only'

/**
 * Minimal in-memory sliding-window rate limiter for a single-instance /
 * low-concurrency Vercel deployment of this size (<=500 bidders, one event).
 * Deliberately simple: for a bigger deployment, swap this for
 * @upstash/ratelimit backed by Upstash Redis without changing call sites.
 */
type Bucket = { count: number; windowStart: number }
const buckets = new Map<string, Bucket>()

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

export function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): RateLimitResult {
  const now = Date.now()
  const windowMs = windowSeconds * 1000
  const existing = buckets.get(key)

  if (!existing || now - existing.windowStart >= windowMs) {
    buckets.set(key, { count: 1, windowStart: now })
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 }
  }

  if (existing.count >= limit) {
    const retryAfterSeconds = Math.ceil((existing.windowStart + windowMs - now) / 1000)
    return { allowed: false, remaining: 0, retryAfterSeconds }
  }

  existing.count += 1
  return { allowed: true, remaining: limit - existing.count, retryAfterSeconds: 0 }
}

// Periodically clear stale buckets so the map does not grow unbounded.
setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000
  for (const [key, bucket] of buckets) {
    if (bucket.windowStart < cutoff) buckets.delete(key)
  }
}, 5 * 60 * 1000).unref?.()
