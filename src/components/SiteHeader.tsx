import Link from 'next/link'
import { siteConfig } from '@/lib/config'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function SiteHeader() {
  const supabase = createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold text-brand focus-ring rounded">
          <span aria-hidden>🎗️</span>
          <span>{siteConfig.organisationShortName} Silent Auction</span>
        </Link>
        <nav aria-label="Main" className="flex items-center gap-4 text-sm font-medium">
          <Link href="/items" className="focus-ring rounded px-1 py-1">
            Items
          </Link>
          {user ? (
            <Link href="/my-bids" className="focus-ring rounded px-1 py-1">
              My bids
            </Link>
          ) : null}
          {user ? (
            <Link href="/winner" className="focus-ring rounded px-1 py-1">
              Payment
            </Link>
          ) : null}
          {user ? (
            <form action="/api/auth/sign-out" method="post">
              <button type="submit" className="focus-ring rounded px-1 py-1">
                Sign out
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              className="focus-ring rounded bg-brand px-3 py-1.5 text-white hover:bg-brand-dark"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
