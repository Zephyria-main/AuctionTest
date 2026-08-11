import Link from 'next/link'
import { siteConfig } from '@/lib/config'

export function SiteFooter() {
  return (
    <footer className="border-t border-neutral-200 bg-white py-6 text-sm text-neutral-600">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 sm:flex-row sm:justify-between">
        <p>
          &copy; {new Date().getFullYear()} {siteConfig.organisationName}. All amounts in AUD.
        </p>
        <div className="flex gap-4">
          <Link href="/terms" className="focus-ring rounded underline">
            Auction terms
          </Link>
          <Link href="/privacy" className="focus-ring rounded underline">
            Privacy notice
          </Link>
          <a href={`mailto:${siteConfig.contact.supportEmail}`} className="focus-ring rounded underline">
            Contact support
          </a>
        </div>
      </div>
    </footer>
  )
}
