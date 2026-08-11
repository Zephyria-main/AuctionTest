import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

/**
 * Server-side Supabase client bound to the request's cookies, used in
 * Server Components, Route Handlers and Server Actions. Runs as the calling
 * user, so RLS still applies — this is NOT a service-role bypass.
 */
export function createServerSupabaseClient() {
  const cookieStore = cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // Called from a Server Component without a mutable response;
            // middleware refreshes the session cookie instead.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // See note above.
          }
        },
      },
    }
  )
}
